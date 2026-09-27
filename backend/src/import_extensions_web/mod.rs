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

    // 1. Identifica a lista de extensões que devem ser instaladas
    let mut targets: Vec<ExtensionTarget> = Vec::new();

    // Se o perfil possui uma lista explícita salva em profile.extensions (via avancado.tsx ou categorias)
    if let Some(ref exts_val) = profile.extensions {
        if let Some(arr) = exts_val.as_array() {
            for item in arr {
                // Se a extensão tiver a propriedade enabled explicitamente falsa, ignora
                let enabled = item
                    .get("enabled")
                    .and_then(|e| e.as_bool())
                    .unwrap_or(true);
                if !enabled {
                    continue;
                }

                let name = item
                    .get("name")
                    .and_then(|n| n.as_str())
                    .unwrap_or("Extensão")
                    .to_string();
                let url = item
                    .get("provider_url")
                    .or_else(|| item.get("providerUrl"))
                    .and_then(|u| u.as_str())
                    .map(|s| s.to_string());
                let guid = item
                    .get("id")
                    .and_then(|i| i.as_str())
                    .map(|s| s.to_string());

                targets.push(ExtensionTarget {
                    name,
                    provider_url: url,
                    guid_hint: guid,
                });
            }
        }
    }

    // Se não houver extensões na lista própria do perfil e o modo for 'team' ou 'category',
    // carrega as extensões ativas cadastradas na equipe (<data_dir>/extensions/*.json)
    if targets.is_empty() && (mode == "team" || mode == "category") {
        let team_dir = root_dir.join("extensions");
        if let Ok(entries) = fs::read_dir(team_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().map(|e| e == "json").unwrap_or(false) {
                    if let Ok(content) = fs::read_to_string(path) {
                        if let Ok(ext) = serde_json::from_str::<ExtensionItem>(&content) {
                            if ext.enabled {
                                targets.push(ExtensionTarget {
                                    name: ext.name,
                                    provider_url: ext.provider_url,
                                    guid_hint: None,
                                });
                            }
                        }
                    }
                }
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

    // 2. Para cada extensão alvo, garante o download no cache e a cópia para o perfil
    for target in targets {
        let url_str = target.provider_url.as_deref().unwrap_or("");
        if url_str.trim().is_empty() || url_str == "#" {
            continue;
        }

        match downloader::download_and_cache_xpi(url_str, &cache_dir, client).await {
            Ok((cached_xpi, api_guid)) => {
                // Determina o Gecko Add-on ID oficial
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

                let dest_file = extensions_dir.join(format!("{}.xpi", addon_id));
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

                info!(
                    "✅ Extensão '{}' instalada no perfil: {} -> {}",
                    target.name, addon_id, absolute_path
                );

                installed_paths.push(absolute_path);
            }
            Err(err) => {
                warn!(
                    "⚠️ Não foi possível carregar extensão '{}' ({}): {}",
                    target.name, url_str, err
                );
            }
        }
    }

    Ok(installed_paths)
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
        let temp_dir = std::env::temp_dir().join("test_fury_none");
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
}
