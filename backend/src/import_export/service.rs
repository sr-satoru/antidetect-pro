use std::collections::HashMap;
use std::sync::Arc;
use serde_json::Value;

use crate::core::models::CreateProfileDto;
use crate::extraction_session::UnifiedSession;
use crate::service_database::{ProfileStorage, SessionService};
use super::adspower_parser::parse_adspower_text;
use super::models::{ImportBatchDto, ImportBatchResult};

pub struct ImportExportService;

impl ImportExportService {
    pub async fn import_profiles(
        storage: Arc<ProfileStorage>,
        dto: ImportBatchDto,
    ) -> Result<ImportBatchResult, String> {
        let mut items = dto.profiles;

        // Se houver texto bruto (ex: colado do AdsPower ou arquivo TXT enviado no corpo)
        if let Some(ref raw_text) = dto.raw_text {
            if !raw_text.trim().is_empty() {
                let parsed_items = parse_adspower_text(raw_text);
                items.extend(parsed_items);
            }
        }

        let total = items.len();
        let mut imported = 0;
        let mut failed = 0;
        let mut imported_ids = Vec::new();
        let mut errors = Vec::new();

        let session_svc = SessionService::new(storage.vault().clone());

        for item in items {
            let name = item.name.unwrap_or_else(|| "Perfil Importado".to_string());
            let group = item
                .group
                .or_else(|| dto.default_group.clone())
                .filter(|s| !s.trim().is_empty() && s != "0");

            // Se o usuário selecionou 'auto' ou não especificou, usa o motor auto-detectado do perfil
            let kernel = match dto.default_kernel.as_deref() {
                Some("AstroFox") => "AstroFox".to_string(),
                Some("AstroBrowser") => "AstroBrowser".to_string(),
                _ => item.kernel.unwrap_or_else(|| "AstroBrowser".to_string()),
            };

            let os = item.os.unwrap_or_else(|| "windows".to_string());

            // Estratégia de proxy do lote (keep, none/direct, override)
            let strategy = dto.proxy_strategy.as_deref().unwrap_or("keep");
            let (proxy_type, proxy_host, proxy_port, proxy_username, proxy_password) = match strategy {
                "none" | "direct" => (Some("none".to_string()), None, None, None, None),
                "override" => (
                    dto.default_proxy_type.clone().or_else(|| Some("http".to_string())),
                    dto.default_proxy_host.clone(),
                    dto.default_proxy_port,
                    dto.default_proxy_username.clone(),
                    dto.default_proxy_password.clone(),
                ),
                _ => (
                    item.proxy_type,
                    item.proxy_host,
                    item.proxy_port,
                    item.proxy_username,
                    item.proxy_password,
                ),
            };

            let mut fp_map = serde_json::Map::new();
            if let Some(w) = item.screen_width {
                fp_map.insert("custom_screen_width".to_string(), serde_json::json!(w));
            }
            if let Some(h) = item.screen_height {
                fp_map.insert("custom_screen_height".to_string(), serde_json::json!(h));
            }
            if let Some(ref ua) = item.user_agent {
                fp_map.insert("user_agent".to_string(), serde_json::json!(ua));
            }
            if let Some(ref urls) = item.initial_urls {
                fp_map.insert("open_tabs_urls".to_string(), serde_json::json!(urls.join("\n")));
            }
            if let Some(ref plat) = item.platform {
                fp_map.insert("platform".to_string(), serde_json::json!(plat));
            }
            fp_map.insert("webrtc_mode".to_string(), serde_json::json!("substitute"));
            fp_map.insert("port_scan_protection".to_string(), serde_json::json!("close"));

            let browser_version = item.browser_version.unwrap_or_else(|| "150".to_string());

            let create_dto = CreateProfileDto {
                id: item.id.clone(),
                name: Some(name.clone()),
                group,
                tags: None,
                tag_ids: None,
                notes: item.notes.or_else(|| item.platform.clone()).or_else(|| dto.default_platform.clone()),
                status: Some("ready".to_string()),
                kernel: Some(kernel),
                browser_version: Some(browser_version),
                os: Some(os),
                proxy_type,
                proxy_host,
                proxy_port,
                proxy_username,
                proxy_password,
                fingerprint_json: Some(Value::Object(fp_map)),
                extension_mode: None,
                extension_category: None,
                extensions: None,
            };

            match storage.create(create_dto) {
                Ok(created_profile) => {
                    let pid = created_profile.id.clone();
                    imported_ids.push(pid.clone());

                    // Se houver cookies normalizados, persiste na sessão criptografada (Star Vault)
                    if !item.cookies.is_empty() {
                        let mut unified_cookies = Vec::new();
                        for c in &item.cookies {
                            if let Ok(json_str) = serde_json::to_string(c) {
                                if let Ok(parsed) = crate::browser::extraction_session::fire_fox::parser::parse_cookies_input(&json_str) {
                                    unified_cookies.extend(parsed);
                                }
                            }
                        }

                        if !unified_cookies.is_empty() {
                            let session = UnifiedSession {
                                cookies: unified_cookies.clone(),
                                local_storage: HashMap::new(),
                                total_cookies: unified_cookies.len(),
                                total_storage_items: 0,
                            };
                            let _ = session_svc.save_session(&pid, &session);
                        }
                    }

                    imported += 1;
                }
                Err(err) => {
                    failed += 1;
                    errors.push(format!("Falha ao criar '{}': {}", name, err));
                }
            }
        }

        Ok(ImportBatchResult {
            total,
            imported,
            failed,
            imported_ids,
            errors,
        })
    }
}
