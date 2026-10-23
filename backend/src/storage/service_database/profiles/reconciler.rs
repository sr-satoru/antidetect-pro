//! Módulo 100% desacoplado de auto-reconciliação e saneamento de perfis no Star Vault.
//!
//! Este módulo é responsável por identificar perfis que possuam strings antigas ou
//! incongruentes (como versões futuras sintéticas Chrome/150, Client Hints 19.0.0 ou
//! User-Agents sem redução) e disparar uma reconciliação assíncrona não bloqueante
//! no banco de dados SQLite, mantendo os dados persistidos limpos e consistentes.

use std::sync::Arc;
use crate::models::Profile;
use crate::service_database::Vault;
use super::repository;

pub struct ProfileReconciler;

impl ProfileReconciler {
    /// Inspeciona o perfil e, se contiver dados legados incongruentes,
    /// dispara uma tarefa assíncrona de auto-reconciliação no Star Vault (SQLite).
    /// Retorna `true` se a reconciliação foi enfileirada, ou `false` se o perfil já estava íntegro.
    pub fn reconcile_async(vault: Arc<Vault>, profile: &Profile) -> bool {
        if let Some(updated) = Self::sanitize_legacy_fields(profile) {
            tokio::spawn(async move {
                if let Err(e) = repository::save_to_db(&vault, &updated) {
                    tracing::warn!(
                        "⚠️ [ProfileReconciler] Falha ao persistir auto-reconciliação do perfil '{}' ({}): {}",
                        updated.name, updated.id, e
                    );
                } else {
                    tracing::info!(
                        "✨ [ProfileReconciler] Perfil '{}' ({}) reconciliado assincronamente com sucesso no Star Vault (v135).",
                        updated.name, updated.id
                    );
                }
            });
            true
        } else {
            false
        }
    }

    /// Lógica pura e determinística de saneamento de campos legados.
    /// Retorna `Some(Profile)` com as correções aplicadas se alguma string foi alterada,
    /// ou `None` caso o perfil já esteja em conformidade.
    pub fn sanitize_legacy_fields(profile: &Profile) -> Option<Profile> {
        let mut modified = false;
        let mut clone = profile.clone();

        // 1. Reconciliação do browser_version do perfil
        if clone.browser_version == "150"
            || clone.browser_version.parse::<u32>().map(|v| v >= 145).unwrap_or(false)
        {
            clone.browser_version = "135".to_string();
            modified = true;
        }

        // 2. Reconciliação das chaves internas de fingerprint_json
        if let Some(obj) = clone.fingerprint_json.as_object_mut() {
            // 2.1 User-Agent (User-Agent Reduction e eliminação do Chrome 150)
            if let Some(ua_val) = obj.get("user_agent").and_then(|v| v.as_str()) {
                if ua_val.contains("Chrome/150")
                    || ua_val.contains("Firefox/150")
                    || ua_val.contains(".7871.")
                {
                    let clean_ua = if ua_val.contains("Chrome/") {
                        if let Some(pos) = ua_val.find("Chrome/") {
                            let before = &ua_val[..pos + 7];
                            let rest = &ua_val[pos + 7..];
                            let end_ver = rest.find(' ').unwrap_or(rest.len());
                            let after = &rest[end_ver..];
                            format!("{}135.0.0.0{}", before, after)
                        } else {
                            ua_val.to_string()
                        }
                    } else if ua_val.contains("Firefox/") {
                        ua_val
                            .replace("rv:150.0", "rv:135.0")
                            .replace("Firefox/150.0", "Firefox/135.0")
                    } else {
                        ua_val.to_string()
                    };

                    if clean_ua != ua_val {
                        obj.insert("user_agent".to_string(), serde_json::Value::String(clean_ua));
                        modified = true;
                    }
                }
            }

            // 2.2 kernel_version interno
            if let Some(kv) = obj.get("kernel_version").and_then(|v| v.as_str()) {
                if kv == "150" || kv.parse::<u32>().map(|v| v >= 145).unwrap_or(false) {
                    obj.insert(
                        "kernel_version".to_string(),
                        serde_json::Value::String("135".to_string()),
                    );
                    modified = true;
                }
            }

            // 2.3 userAgentData (Client Hints)
            if let Some(uad) = obj.get_mut("userAgentData") {
                if let Some(uad_obj) = uad.as_object_mut() {
                    // Corrige versão 19.0.0 de Windows para 15.0.0 (Windows 11)
                    if let Some(pv) = uad_obj.get("platformVersion").and_then(|v| v.as_str()) {
                        if pv == "19.0.0" {
                            uad_obj.insert(
                                "platformVersion".to_string(),
                                serde_json::Value::String("15.0.0".to_string()),
                            );
                            modified = true;
                        }
                    }

                    // Corrige marcas de versão em Sec-CH-UA
                    if let Some(brands) = uad_obj.get_mut("brands").and_then(|v| v.as_array_mut()) {
                        for b in brands.iter_mut() {
                            if let Some(b_obj) = b.as_object_mut() {
                                if let Some(ver) = b_obj.get("version").and_then(|v| v.as_str()) {
                                    if ver == "150" {
                                        b_obj.insert(
                                            "version".to_string(),
                                            serde_json::Value::String("135".to_string()),
                                        );
                                        modified = true;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        if modified {
            Some(clone)
        } else {
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_sanitizes_legacy_profile_v150() {
        let profile = Profile {
            id: "test-001".to_string(),
            name: "Perfil Teste".to_string(),
            group: "G1".to_string(),
            tags: vec![],
            notes: "".to_string(),
            status: "ready".to_string(),
            kernel: "AstroBrowser".to_string(),
            browser_version: "150".to_string(),
            os: "windows".to_string(),
            created_at: 0,
            updated_at: 0,
            last_launch: None,
            is_deleted: false,
            deleted_at: None,
            proxy: crate::models::ProfileProxyConfig::default(),
            fingerprint_json: json!({
                "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.7871.114 Safari/537.36",
                "kernel_version": "150",
                "userAgentData": {
                    "platformVersion": "19.0.0",
                    "brands": [
                        { "brand": "Google Chrome", "version": "150" }
                    ]
                }
            }),
            extension_mode: None,
            extension_category: None,
            extensions: None,
        };

        let sanitized = ProfileReconciler::sanitize_legacy_fields(&profile);
        assert!(sanitized.is_some());
        let updated = sanitized.unwrap();

        assert_eq!(updated.browser_version, "135");
        let fp = updated.fingerprint_json;
        assert_eq!(
            fp["user_agent"],
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36"
        );
        assert_eq!(fp["kernel_version"], "135");
        assert_eq!(fp["userAgentData"]["platformVersion"], "15.0.0");
        assert_eq!(fp["userAgentData"]["brands"][0]["version"], "135");
    }

    #[test]
    fn test_noop_for_already_compliant_profile() {
        let profile = Profile {
            id: "test-002".to_string(),
            name: "Perfil Compliant".to_string(),
            group: "G1".to_string(),
            tags: vec![],
            notes: "".to_string(),
            status: "ready".to_string(),
            kernel: "AstroBrowser".to_string(),
            browser_version: "135".to_string(),
            os: "windows".to_string(),
            created_at: 0,
            updated_at: 0,
            last_launch: None,
            is_deleted: false,
            deleted_at: None,
            proxy: crate::models::ProfileProxyConfig::default(),
            fingerprint_json: json!({
                "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
                "kernel_version": "135",
                "userAgentData": {
                    "platformVersion": "15.0.0",
                    "brands": [
                        { "brand": "Google Chrome", "version": "135" }
                    ]
                }
            }),
            extension_mode: None,
            extension_category: None,
            extensions: None,
        };

        let sanitized = ProfileReconciler::sanitize_legacy_fields(&profile);
        assert!(sanitized.is_none());
    }
}
