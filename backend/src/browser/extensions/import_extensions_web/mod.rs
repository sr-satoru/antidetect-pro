pub mod downloader;
pub mod manifest;

use std::fs;
use std::path::Path;
use tracing::{info, warn};

use crate::models::{ExtensionItem, Profile};

/// Informação de uma extensão que deve ser instalada
#[derive(Debug, Clone)]
pub struct ExtensionTarget {
    pub name: String,
    pub provider_url: Option<String>,
    pub guid_hint: Option<String>,
}

/// Módulo desacoplado de importação e sideloading de extensões Web (AMO/Firefox).
/// Processa o modo de extensões do perfil ('team', 'category', 'none' ou lista manual),
/// baixa e faz cache dos pacotes .xpi e os copia para a pasta isolada do perfil.
///
/// Retorna a lista dos caminhos absolutos de todos os pacotes .xpi prontos para
/// serem injetados no CAMOU_CONFIG["addons"] do Camoufox.
pub async fn import_profile_extensions(
    profile: &Profile,
    profile_dir: &Path,
    data_dir: &Path,
    client: &reqwest::Client,
    engine_type: &str,
) -> Result<Vec<String>, String> {
    let mode = profile.extension_mode.as_deref().unwrap_or("team");
    if mode == "none" {
        info!("Perfil {} configurado sem extensões ('none').", profile.id);
        return Ok(Vec::new());
    }

    let is_chromium = engine_type.eq_ignore_ascii_case("clearcote")
        || engine_type.eq_ignore_ascii_case("chromium")
        || engine_type.eq_ignore_ascii_case("astrobrowser");

    let extensions_dir = profile_dir.join("extensions");
    fs::create_dir_all(&extensions_dir)
        .map_err(|e| format!("Erro ao criar pasta extensions do perfil: {e}"))?;

    let root_dir = if data_dir.ends_with("profiles") {
        data_dir.parent().unwrap_or(data_dir)
    } else {
        data_dir
    };

    let cache_dir = root_dir.join("cache").join("extensions");
    let _ = fs::create_dir_all(&cache_dir);
    let storage_base = root_dir.join("extensions").join("storage");
    let _ = fs::create_dir_all(&storage_base);

    // 1. Identifica a biblioteca da equipe para enriquecimento (<data_dir>/extensions/*.json)
    let team_library = load_team_library(&root_dir.join("extensions"));

    // 2. Identifica as extensões que devem ser instaladas
    let mut targets: Vec<ExtensionTarget> = Vec::new();

    if let Some(ref exts_val) = profile.extensions {
        if let Some(arr) = exts_val.as_array() {
            for item in arr {
                let enabled = item.get("enabled").and_then(|e| e.as_bool()).unwrap_or(true);
                if !enabled {
                    continue;
                }

                let name = item
                    .get("name")
                    .and_then(|n| n.as_str())
                    .unwrap_or("Extensão")
                    .to_string();

                let raw_url = item
                    .get("provider_url")
                    .or_else(|| item.get("providerUrl"))
                    .and_then(|u| u.as_str());

                let guid = item
                    .get("id")
                    .and_then(|i| i.as_str().map(String::from).or_else(|| i.as_u64().map(|n| n.to_string())));

                let resolved_url = resolve_extension_url(raw_url, guid.as_deref(), &name, &team_library);

                targets.push(ExtensionTarget {
                    name,
                    provider_url: resolved_url,
                    guid_hint: guid,
                });
            }
        }
    }

    // Se a lista própria estiver vazia e o modo for 'team' ou 'category', usa as extensões ativas da equipe
    if targets.is_empty() && (mode == "team" || mode == "category") {
        for ext in &team_library {
            if ext.enabled {
                targets.push(ExtensionTarget {
                    name: ext.name.clone(),
                    provider_url: ext.provider_url.clone(),
                    guid_hint: Some(ext.id.to_string()),
                });
            }
        }
    }

    if targets.is_empty() {
        info!("Nenhuma extensão ativa para o perfil {}.", profile.id);
        return Ok(Vec::new());
    }

    info!(
        "📦 Processando {} extensão(ões) para o perfil '{}' ({}) no motor '{}'",
        targets.len(),
        profile.name,
        profile.id,
        engine_type
    );

    let mut installed_paths: Vec<String> = Vec::new();

    // 3. Para cada extensão alvo, prepara os arquivos adequados para a engine
    for target in targets {
        let matched_team_ext = target.guid_hint.as_deref().and_then(|gid| {
            team_library.iter().find(|t| t.id.to_string() == gid)
        }).or_else(|| {
            team_library.iter().find(|t| t.name.eq_ignore_ascii_case(&target.name))
        });

        let target_storage_dir = if let Some(m) = matched_team_ext {
            storage_base.join(m.id.to_string())
        } else if let Some(gid) = target.guid_hint.as_deref().filter(|g| g.parse::<u64>().is_ok()) {
            storage_base.join(gid)
        } else {
            let slug = target.name.to_lowercase().replace(' ', "-");
            storage_base.join(&slug)
        };

        let unpacked_dir = target_storage_dir.join("unpacked");
        let package_xpi = target_storage_dir.join("package.xpi");

        // Se a extensão já está pronta no storage central
        let is_ready = unpacked_dir.join("manifest.json").is_file() && package_xpi.is_file();

        if !is_ready {
            // Tenta obter o binário via URL da Chrome Web Store ou Firefox AMO
            let url_opt = target.provider_url.as_deref().or_else(|| {
                matched_team_ext.and_then(|m| m.provider_url.as_deref())
            });

            if let Some(url_str) = url_opt.filter(|u| !u.trim().is_empty() && *u != "#") {
                if let Some(cws_id) = crate::browser::extensions::universal::extract_cws_id(url_str) {
                    if let Ok(bytes) = crate::browser::extensions::universal::download_cws_crx(&cws_id, client).await {
                        let _ = crate::browser::extensions::universal::process_extension_binary(&bytes, &target_storage_dir, &cws_id);
                    }
                } else if let Ok((cached_xpi, _)) = downloader::download_and_cache_xpi(url_str, &cache_dir, client).await {
                    if let Ok(bytes) = fs::read(&cached_xpi) {
                        let slug = downloader::extract_amo_slug(url_str).unwrap_or_else(|| "ext".to_string());
                        let _ = crate::browser::extensions::universal::process_extension_binary(&bytes, &target_storage_dir, &slug);
                    }
                }
            } else if let Some(gid) = target.guid_hint.as_deref() {
                // Tenta inferir pelo slug
                if let Ok((cached_xpi, _)) = downloader::download_and_cache_xpi(gid, &cache_dir, client).await {
                    if let Ok(bytes) = fs::read(&cached_xpi) {
                        let _ = crate::browser::extensions::universal::process_extension_binary(&bytes, &target_storage_dir, gid);
                    }
                }
            }
        }

        if is_chromium {
            // 4A. CHROMIUM / CLEARCOTE: Exige diretório descompactado contendo manifest.json
            if unpacked_dir.join("manifest.json").is_file() {
                let abs_unpacked = unpacked_dir
                    .canonicalize()
                    .unwrap_or(unpacked_dir)
                    .to_string_lossy()
                    .to_string();
                info!("✅ [Chromium] Extensão '{}' pronta (unpacked): {abs_unpacked}", target.name);
                installed_paths.push(abs_unpacked);
            } else {
                warn!("⚠️ [Chromium] Extensão '{}' não possui diretório unpacked com manifest.json válido", target.name);
            }
        } else {
            // 4B. FIREFOX / CAMOUFOX: Exige arquivo .xpi com Gecko ID presente
            if package_xpi.is_file() {
                let gecko_id = manifest::extract_addon_id_from_xpi(&package_xpi)
                    .or_else(|| target.guid_hint.clone())
                    .unwrap_or_else(|| format!("{}@star-multilogin.local", target.name.to_lowercase().replace(' ', "-")));

                let dest_file = extensions_dir.join(format!("{gecko_id}.xpi"));
                if !dest_file.exists() {
                    let _ = fs::copy(&package_xpi, &dest_file);
                }

                let absolute_path = dest_file
                    .canonicalize()
                    .unwrap_or(dest_file)
                    .to_string_lossy()
                    .to_string();

                info!("✅ [Firefox] Extensão '{}' instalada no perfil: {gecko_id} -> {absolute_path}", target.name);
                installed_paths.push(absolute_path);
            } else {
                warn!("⚠️ [Firefox] Pacote .xpi não encontrado para extensão '{}'", target.name);
            }
        }
    }

    Ok(installed_paths)
}

/// Carrega a biblioteca de equipe a partir de arquivos JSON em `<data_dir>/extensions/`
fn load_team_library(team_dir: &Path) -> Vec<ExtensionItem> {
    let mut library = Vec::new();
    if let Ok(entries) = fs::read_dir(team_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().map_or(false, |e| e == "json") {
                if let Ok(content) = fs::read_to_string(&path) {
                    if let Ok(ext) = serde_json::from_str::<ExtensionItem>(&content) {
                        library.push(ext);
                    }
                }
            }
        }
    }
    library
}

/// Resolve a melhor URL/Slug disponível para a extensão utilizando fallback em cascata
fn resolve_extension_url(
    raw_url: Option<&str>,
    guid: Option<&str>,
    name: &str,
    team_library: &[ExtensionItem],
) -> Option<String> {
    // 1. URL explícita já válida
    if let Some(u) = raw_url.map(str::trim).filter(|u| !u.is_empty() && *u != "#") {
        return Some(u.to_string());
    }

    // 2. Busca na biblioteca de equipe pelo ID numérico / GUID
    if let Some(gid) = guid.map(str::trim).filter(|g| !g.is_empty()) {
        if let Some(matched) = team_library.iter().find(|t| t.id.to_string() == gid) {
            if let Some(u) = matched.provider_url.as_deref().map(str::trim).filter(|u| !u.is_empty() && *u != "#") {
                return Some(u.to_string());
            }
        }
    }

    // 3. Busca na biblioteca de equipe pelo Nome
    if let Some(matched) = team_library.iter().find(|t| t.name.eq_ignore_ascii_case(name)) {
        if let Some(u) = matched.provider_url.as_deref().map(str::trim).filter(|u| !u.is_empty() && *u != "#") {
            return Some(u.to_string());
        }
    }

    // 4. Inferência direta do Mozilla AMO via slug no guid
    if let Some(gid) = guid.map(str::trim).filter(|g| !g.is_empty()) {
        if !gid.starts_with("local_") && !gid.contains('/') && gid.parse::<u64>().is_err() {
            return Some(format!("https://addons.mozilla.org/firefox/addon/{gid}/"));
        }
    }

    // 5. Fallback a partir do nome
    let slug = name.trim().to_lowercase().replace(' ', "-");
    if !slug.is_empty() && slug != "extensão" {
        return Some(format!("https://addons.mozilla.org/firefox/addon/{slug}/"));
    }

    None
}
