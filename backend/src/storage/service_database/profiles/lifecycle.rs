use rusqlite::{params, Connection, OpenFlags};
use crate::launcher::ProcessManager;
use crate::models::Profile;
use crate::service_database::Vault;
use std::path::Path;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

fn now_secs() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

/// Formata uma URI SQLite válida em modo somente-leitura imutável
fn format_sqlite_uri(path: &Path) -> String {
    let p_str = path.to_string_lossy().replace('\\', "/");
    if p_str.starts_with('/') {
        format!("file:{}?mode=ro&immutable=1", p_str)
    } else {
        format!("file:///{}?mode=ro&immutable=1", p_str)
    }
}

/// Extrai o domínio base de uma URL (ex: "https://x.com/home" -> "x.com", "www.facebook.com" -> "facebook.com")
pub fn extract_domain_from_url(url: &str) -> Option<String> {
    let clean = url.trim();
    if clean.is_empty() {
        return None;
    }

    let no_proto = if let Some(stripped) = clean.strip_prefix("https://") {
        stripped
    } else if let Some(stripped) = clean.strip_prefix("http://") {
        stripped
    } else if clean.starts_with("about:") {
        return None;
    } else {
        clean
    };

    let host = no_proto
        .split(&['/', '?', ':', '#'][..])
        .next()
        .unwrap_or("")
        .trim();

    if host.is_empty() {
        return None;
    }

    let domain = if let Some(stripped) = host.strip_prefix("www.") {
        stripped
    } else {
        host
    };

    if domain.is_empty() {
        None
    } else {
        Some(domain.to_lowercase())
    }
}

/// Retorna termos de busca para histórico (ex: "accounts.google.com" -> ["accounts.google.com", "google.com"])
pub fn get_search_terms(url: &str) -> Vec<String> {
    let mut terms = Vec::new();
    if let Some(domain) = extract_domain_from_url(url) {
        terms.push(domain.clone());
        if domain == "accounts.google.com" {
            terms.push("google.com".to_string());
        }
    }
    terms
}

/// Verifica se um termo existe na tabela SQLite especificada em modo somente-leitura
fn check_sqlite_history(db_path: &Path, search_term: &str, table: &str, col: &str) -> bool {
    if !db_path.exists() {
        return false;
    }

    let flags = OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_URI;
    let uri = format_sqlite_uri(db_path);
    let conn = match Connection::open_with_flags(&uri, flags)
        .or_else(|_| Connection::open_with_flags(db_path, OpenFlags::SQLITE_OPEN_READ_ONLY))
    {
        Ok(c) => c,
        Err(e) => {
            tracing::debug!("Não foi possível abrir banco de histórico em {:?}: {e}", db_path);
            return false;
        }
    };

    let query = format!("SELECT 1 FROM {} WHERE {} LIKE ?1 LIMIT 1", table, col);
    let pattern = format!("%{}%", search_term);
    let mut stmt = match conn.prepare(&query) {
        Ok(s) => s,
        Err(e) => {
            tracing::debug!("Tabela {} não encontrada ou consulta falhou em {:?}: {e}", table, db_path);
            return false;
        }
    };

    stmt.query_row(params![pattern], |_| Ok(())).is_ok()
}

/// Verifica se a URL alvo já foi visitada no histórico do perfil (Chromium ou Firefox)
pub fn is_url_in_browser_history(profile_dir: &Path, kernel: &str, target_url: &str) -> bool {
    let terms = get_search_terms(target_url);
    if terms.is_empty() {
        return false;
    }

    let is_chromium = kernel == "AstroBrowser";

    for term in &terms {
        if is_chromium {
            let default_history = profile_dir.join("Default").join("History");
            if check_sqlite_history(&default_history, term, "urls", "url") {
                return true;
            }
            let root_history = profile_dir.join("History");
            if check_sqlite_history(&root_history, term, "urls", "url") {
                return true;
            }
        } else {
            let places = profile_dir.join("places.sqlite");
            if check_sqlite_history(&places, term, "moz_places", "url") {
                return true;
            }
        }
    }

    false
}

/// Dispara o navegador Camoufox para o perfil com montagem efêmera de sessão do Vault
pub async fn launch_with_cdp(
    vault: &Arc<Vault>,
    process_manager: &ProcessManager,
    data_dir: &Path,
    profile_dir: &Path,
    profile: &mut Profile,
    cdp: bool,
) -> Result<(u32, Option<u16>, Option<String>), String> {
    launch_with_options(vault, process_manager, data_dir, profile_dir, profile, cdp, None).await
}

fn normalize_url(url: &str) -> String {
    let trimmed = url.trim();
    if trimmed.starts_with("http://") || trimmed.starts_with("https://") || trimmed.starts_with("about:") {
        trimmed.to_string()
    } else {
        format!("https://{}", trimmed)
    }
}

/// Resolve todas as URLs iniciais configuradas no perfil:
/// 1. Prioridade explícita: explicit_url passado na chamada (se houver)
/// 2. Abas configuradas no perfil (todas as linhas válidas de open_tabs_urls)
/// 3. TODAS as contas de plataformas vinculadas (platform_accounts)
/// 4. Fallback: platform_url legado se nenhuma conta for encontrada
pub fn resolve_all_initial_urls(profile: &Profile, explicit_url: Option<&str>) -> Vec<String> {
    if let Some(u) = explicit_url {
        let trimmed = u.trim();
        if !trimmed.is_empty() {
            return trimmed.split_whitespace().map(normalize_url).collect();
        }
    }

    let mut urls = Vec::new();
    let fp = &profile.fingerprint_json;

    // 1. Abas configuradas no perfil (open_tabs_urls)
    if let Some(open_tabs) = fp.get("open_tabs_urls").and_then(|v| v.as_str()) {
        for line in open_tabs.lines() {
            let trimmed = line.trim();
            if !trimmed.is_empty() {
                let norm = normalize_url(trimmed);
                if !urls.contains(&norm) {
                    urls.push(norm);
                }
            }
        }
    }

    // 2. TODAS as contas de plataformas vinculadas (platform_accounts)
    if let Some(accounts) = fp.get("platform_accounts").and_then(|v| v.as_array()) {
        for acc in accounts {
            let domain_opt = acc.get("customDomain")
                .and_then(|v| v.as_str())
                .map(|s| s.trim())
                .filter(|s| !s.is_empty());

            let domain_to_use = match domain_opt {
                Some(d) => Some(d.to_string()),
                None => {
                    // Fallback para preset se customDomain não foi informado
                    acc.get("platform").and_then(|v| v.as_str()).and_then(|p| {
                        let mapped = match p.to_lowercase().as_str() {
                            "facebook" => "facebook.com",
                            "amazon" => "amazon.com",
                            "linkedin" => "linkedin.com",
                            "x" => "x.com",
                            "paypal" => "paypal.com",
                            "google" => "accounts.google.com",
                            "outlook" => "outlook.com",
                            "vinted" => "vinted.fr",
                            "instagram" => "instagram.com",
                            "tiktok" => "tiktok.com",
                            "ebay" => "ebay.com",
                            _ => "",
                        };
                        if !mapped.is_empty() {
                            Some(mapped.to_string())
                        } else if p.contains('.') {
                            Some(p.to_string())
                        } else {
                            None
                        }
                    })
                }
            };

            if let Some(d) = domain_to_use {
                let norm = normalize_url(&d);
                if !urls.contains(&norm) {
                    urls.push(norm);
                }
            }
        }
    }

    // 3. Fallback: platform_url legado se nenhuma conta gerou URL
    if urls.is_empty() {
        if let Some(plat_url) = fp.get("platform_url").and_then(|v| v.as_str()) {
            let trimmed = plat_url.trim();
            if !trimmed.is_empty() {
                let norm = normalize_url(trimmed);
                if !urls.contains(&norm) {
                    urls.push(norm);
                }
            }
        }
    }

    urls
}

/// Helper para retrocompatibilidade que retorna a primeira URL resolvida (se houver)
pub fn resolve_initial_url(profile: &Profile, explicit_url: Option<&str>) -> Option<String> {
    resolve_all_initial_urls(profile, explicit_url).into_iter().next()
}

/// Dispara o navegador para o perfil com montagem efêmera de sessão do Vault e URLs iniciais opcionais
pub async fn launch_with_options(
    vault: &Arc<Vault>,
    process_manager: &ProcessManager,
    data_dir: &Path,
    profile_dir: &Path,
    profile: &mut Profile,
    cdp: bool,
    initial_url: Option<&str>,
) -> Result<(u32, Option<u16>, Option<String>), String> {
    // 1. Descriptografa e monta a sessão do Vault (ou do formulário se for inicial) nos arquivos temporários
    let session_svc = crate::service_database::sessions::SessionService::new(vault.clone());
    let engine = crate::browser::engines::get_engine(&profile.kernel);
    let mut session_to_inject = session_svc.load_session(&profile.id).ok().flatten();

    // Se o Vault ainda não possuir cookies para este perfil, verifica se há cookies no formulário/fingerprint_json
    if session_to_inject.as_ref().map(|s| s.total_cookies == 0).unwrap_or(true) {
        if let Some(raw_cookies) = profile.fingerprint_json.get("cookies").and_then(|v| {
            if let Some(s) = v.as_str() {
                Some(s.to_string())
            } else if v.is_array() || v.is_object() {
                Some(v.to_string())
            } else {
                None
            }
        }) {
            if !raw_cookies.trim().is_empty() {
                if let Ok(parsed_cookies) = crate::extraction_session::fire_fox::parse_cookies_input(&raw_cookies) {
                    if !parsed_cookies.is_empty() {
                        tracing::info!(
                            "🍪 [Lifecycle] Ingerindo {} cookies fornecidos no formulário para o perfil {}",
                            parsed_cookies.len(), profile.id
                        );
                        let count = parsed_cookies.len();
                        let initial_session = crate::extraction_session::UnifiedSession {
                            cookies: parsed_cookies,
                            local_storage: std::collections::HashMap::new(),
                            total_cookies: count,
                            total_storage_items: 0,
                        };
                        let _ = session_svc.save_session(&profile.id, &initial_session);
                        session_to_inject = Some(initial_session);
                    }
                }
            }
        }
    }

    if let Some(session) = session_to_inject {
        tracing::info!(
            "🔓 Descriptografando e montando sessão efêmera do Vault para perfil {} ({} cookies, {} storage)",
            profile.id, session.total_cookies, session.total_storage_items
        );
        let _ = engine.inject_session(profile_dir, &session.cookies);
        if profile.kernel != "AstroBrowser" {
            for (origin, items) in &session.local_storage {
                let _ = crate::launcher::engine::injection::inject_local_storage(profile_dir, origin, items);
            }
        }
    }

    // 2. Resolve todas as URLs iniciais (abas e TODAS as plataformas selecionadas)
    let candidate_urls = resolve_all_initial_urls(profile, initial_url);
    let mut urls_to_launch: Vec<String> = Vec::new();

    if initial_url.is_some() {
        // Inicialização com URL explícita (automação/API): honra estritamente as URLs passadas
        urls_to_launch = candidate_urls;
    } else {
        // Inicialização padrão pela UI: se a URL/domínio já constar no histórico do navegador,
        // omitimos da CLI para permitir que a restauração de sessão do navegador
        // cuide das abas sem criar novas abas duplicadas a cada inicialização.
        for u in candidate_urls {
            if is_url_in_browser_history(profile_dir, &profile.kernel, &u) {
                tracing::info!(
                    "🔄 Domínio de '{}' já existe no histórico do perfil '{}' - omitindo da linha de comando para restauração automática de sessão",
                    u,
                    profile.name
                );
            } else {
                urls_to_launch.push(u);
            }
        }
    }

    let final_url_param = if urls_to_launch.is_empty() {
        None
    } else {
        Some(urls_to_launch.join(" "))
    };

    if let Some(ref u) = final_url_param {
        tracing::info!(
            "🌐 URLs iniciais passadas na linha de comando para o perfil '{}' ({}): {}",
            profile.name,
            profile.id,
            u
        );
    }

    // 3. Dispara o processo do navegador
    let (pid, debug_port, ws_endpoint) = process_manager
        .launch_with_options(profile, data_dir, cdp, final_url_param.as_deref())
        .await?;

    let now = now_secs();
    profile.status = "running".to_string();
    profile.last_launch = Some(now);
    profile.updated_at = now;

    // Dispara auto-reconciliação assíncrona desacoplada de dados legados do perfil no Star Vault
    super::reconciler::ProfileReconciler::reconcile_async(vault.clone(), profile);

    Ok((pid, debug_port, ws_endpoint))
}

/// Encerra o navegador, extrai sessão atualizada para o Vault e expurga arquivos temporários
pub fn stop(
    vault: &Arc<Vault>,
    process_manager: &ProcessManager,
    profile_dir: &Path,
    profile: &mut Profile,
) -> Result<(), String> {
    // 1. Encerra o processo do navegador
    process_manager.stop(&profile.id)?;

    // 2. Extrai a sessão atualizada, criptografa no Vault e limpa o disco temporário
    let session_svc = crate::service_database::sessions::SessionService::new(vault.clone());
    let engine = crate::browser::engines::get_engine(&profile.kernel);
    if let Ok(fresh_session) = engine.extract_session(profile_dir) {
        if fresh_session.total_cookies > 0 || fresh_session.total_storage_items > 0 {
            tracing::info!(
                "🔒 Criptografando e salvando sessão no Vault para perfil {} via stop API ({} cookies, {} storage)",
                profile.id, fresh_session.total_cookies, fresh_session.total_storage_items
            );
            let _ = session_svc.save_session(&profile.id, &fresh_session);
        }
    }
    if profile.kernel == "AstroBrowser" {
        crate::browser::engines::clearcote::metadata::ChromiumMetadataManager::purge_ephemeral_cache(profile_dir);
    } else {
        engine.clear_profile_locks(profile_dir);
    }

    let now = now_secs();
    profile.status = "ready".to_string();
    profile.updated_at = now;

    Ok(())
}
