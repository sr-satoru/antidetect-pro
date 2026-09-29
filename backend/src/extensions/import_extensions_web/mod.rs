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
) -> Result<Vec<String>, String> {
    let mode = profile.extension_mode.as_deref().unwrap_or("team");
    if mode == "none" {
        info!("Perfil {} configurado sem extensões ('none').", profile.id);
        return Ok(Vec::new());
    }

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
        "📦 Processando {} extensão(ões) para o perfil '{}' ({})",
        targets.len(),
        profile.name,
        profile.id
    );

    let mut installed_paths: Vec<String> = Vec::new();

    // 3. Para cada extensão alvo, garante download no cache e cópia para a pasta do perfil
    for target in targets {
        let url_str = target
            .provider_url
            .as_deref()
            .map(str::trim)
            .filter(|u| !u.is_empty() && *u != "#")
            .map(String::from)
            .or_else(|| {
                target
                    .guid_hint
                    .as_deref()
                    .map(str::trim)
                    .filter(|gid| !gid.is_empty() && !gid.starts_with("local_") && gid.parse::<u64>().is_err())
                    .map(String::from)
            });

        let Some(target_source) = url_str else {
            warn!("⚠️ Extensão '{}' ignorada: nenhuma URL ou slug do AMO encontrado.", target.name);
            continue;
        };

        match downloader::download_and_cache_xpi(&target_source, &cache_dir, client).await {
            Ok((cached_xpi, api_guid)) => {
                let addon_id = api_guid
                    .or_else(|| manifest::extract_addon_id_from_xpi(&cached_xpi))
                    .or(target.guid_hint)
                    .unwrap_or_else(|| {
                        cached_xpi
                            .file_stem()
                            .and_then(|s| s.to_str())
                            .unwrap_or("ext")
                            .to_string()
                    });

                let dest_file = extensions_dir.join(format!("{addon_id}.xpi"));
                if !dest_file.exists() {
                    if let Err(e) = fs::copy(&cached_xpi, &dest_file) {
                        warn!("Falha ao copiar extensão '{}' para o perfil: {}", target.name, e);
                        continue;
                    }
                }

                let absolute_path = dest_file
                    .canonicalize()
                    .unwrap_or(dest_file)
                    .to_string_lossy()
                    .to_string();

                info!("✅ Extensão '{}' instalada no perfil: {addon_id} -> {absolute_path}", target.name);
                installed_paths.push(absolute_path);
            }
            Err(err) => {
                warn!("⚠️ Não foi possível carregar extensão '{}' ({target_source}): {err}", target.name);
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{Profile, ProfileProxyConfig};

    #[test]
    fn test_extract_amo_slug_variations() {
        assert_eq!(
            downloader::extract_amo_slug("https://addons.mozilla.org/pt-BR/firefox/addon/ublock-origin/"),
            Some("ublock-origin".to_string())
        );
        assert_eq!(
            downloader::extract_amo_slug("https://addons.mozilla.org/en-US/firefox/addon/darkreader/?utm_source=test"),
            Some("darkreader".to_string())
        );
        assert_eq!(
            downloader::extract_amo_slug("canvasblocker"),
            Some("canvasblocker".to_string())
        );
        assert_eq!(downloader::extract_amo_slug("   "), None);
    }

    #[tokio::test]
    async fn test_import_extensions_mode_none() {
        let temp_dir = std::env::temp_dir().join("test_star_none");
        let _ = fs::create_dir_all(&temp_dir);

        let profile = Profile {
            id: "test-none".to_string(),
            name: "Test None".to_string(),
            group: "Default".to_string(),
            tags: vec![],
            notes: "".to_string(),
            status: "ready".to_string(),
            kernel: "Camoufox".to_string(),
            browser_version: "150".to_string(),
            os: "windows".to_string(),
            created_at: 100,
            updated_at: 100,
            last_launch: None,
            is_deleted: false,
            deleted_at: None,
            proxy: ProfileProxyConfig::default(),
            fingerprint_json: serde_json::json!({}),
            extension_mode: Some("none".to_string()),
            extension_category: None,
            extensions: None,
        };

        let client = reqwest::Client::new();
        let result = import_profile_extensions(&profile, &temp_dir, &temp_dir, &client).await.unwrap();
        assert!(result.is_empty());

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[tokio::test]
    async fn test_import_extensions_fallback_enrichment() {
        let temp_dir = std::env::temp_dir().join("test_star_enrichment");
        let extensions_dir = temp_dir.join("extensions");
        let _ = fs::create_dir_all(&extensions_dir);

        let sample_team_ext = ExtensionItem {
            id: 9999,
            name: "Test AdBlocker".to_string(),
            icon_type: None,
            icon_url: None,
            icon_bg: None,
            enabled: true,
            status: "available".to_string(),
            description: "Test".to_string(),
            provider: "Firefox Add-ons".to_string(),
            provider_url: Some("https://addons.mozilla.org/pt-BR/firefox/addon/ublock-origin/".to_string()),
            tab: "team".to_string(),
            version: None,
        };
        let _ = fs::write(
            extensions_dir.join("9999.json"),
            serde_json::to_string(&sample_team_ext).unwrap(),
        );

        let profile = Profile {
            id: "test-category".to_string(),
            name: "Test Category".to_string(),
            group: "Default".to_string(),
            tags: vec![],
            notes: "".to_string(),
            status: "ready".to_string(),
            kernel: "Camoufox".to_string(),
            browser_version: "150".to_string(),
            os: "windows".to_string(),
            created_at: 100,
            updated_at: 100,
            last_launch: None,
            is_deleted: false,
            deleted_at: None,
            proxy: ProfileProxyConfig::default(),
            fingerprint_json: serde_json::json!({}),
            extension_mode: Some("category".to_string()),
            extension_category: Some("cat_custom".to_string()),
            extensions: Some(serde_json::json!([
                {
                    "id": "9999",
                    "name": "Test AdBlocker"
                }
            ])),
        };

        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_millis(500))
            .build()
            .unwrap_or_default();
        let _ = import_profile_extensions(&profile, &temp_dir, &temp_dir, &client).await;

        let _ = fs::remove_dir_all(&temp_dir);
    }
}
