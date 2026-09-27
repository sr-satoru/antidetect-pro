pub mod fonts;
pub mod prefs;
pub mod translator;

use std::collections::HashMap;
use serde_json::Value;
use crate::models::Profile;

pub struct FingerprintSetupResult {
    /// Snippet de preferências a ser adicionado ao user.js do Firefox
    pub user_js_snippet: String,
    /// Mapa completo de variáveis que formam o CAMOU_CONFIG JSON
    pub camou_config: HashMap<String, Value>,
}

impl FingerprintSetupResult {
    /// Serializa o CAMOU_CONFIG em JSON para ser injetado como variável de ambiente
    pub fn to_camou_config_json(&self) -> String {
        serde_json::to_string(&self.camou_config).unwrap_or_else(|_| "{}".to_string())
    }
}

/// Prepara a impressão digital completa do perfil (Gecko user.js + Camoufox C++ CAMOU_CONFIG)
pub fn prepare_fingerprint(
    profile: &Profile,
    proxy_ip: Option<&str>,
    addon_paths: &[String],
) -> FingerprintSetupResult {
    let fp_map = translator::extract_fingerprint_map(&profile.fingerprint_json);
    let os = translator::resolve_os(profile, &fp_map);
    let ua = translator::resolve_user_agent(&os, &fp_map);

    let (platform, oscpu) = match os.as_str() {
        "windows" => ("Win32", "Windows NT 10.0; Win64; x64"),
        "macos" => ("MacIntel", "Intel Mac OS X 10.15"),
        _ => ("Linux x86_64", "Linux x86_64"),
    };

    let languages = fp_map
        .get("custom_language")
        .and_then(|v| v.as_str())
        .unwrap_or("pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7");

    let cpu_cores = fp_map
        .get("cpu_cores")
        .and_then(|v| v.as_u64())
        .map(|n| n as u32)
        .unwrap_or(8);

    let user_js_snippet = prefs::build_fingerprint_prefs(&ua, platform, oscpu, languages, cpu_cores);
    let camou_config = translator::build_camou_config(profile, proxy_ip, addon_paths);

    FingerprintSetupResult {
        user_js_snippet,
        camou_config,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{Profile, ProfileProxyConfig};

    #[test]
    fn test_windows_fingerprint_translation() {
        let profile = Profile {
            id: "test-prof-windows".to_string(),
            name: "Test Windows".to_string(),
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
            fingerprint_json: serde_json::json!({
                "os": "windows",
                "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:150.0) Gecko/20100101 Firefox/150.0",
                "cpu_cores": 16,
                "custom_screen_width": 2560,
                "custom_screen_height": 1440,
                "webgl_vendor": "Google Inc. (NVIDIA)",
                "webgl_renderer": "ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0, D3D11)",
                "canvas_seed": "1CCAE86B",
                "custom_timezone": "America/Sao_Paulo",
                "custom_language": "pt-BR,pt;q=0.9,en-US;q=0.8"
            }),
            extension_mode: None,
            extension_category: None,
            extensions: None,
        };

        let res = prepare_fingerprint(&profile, Some("192.168.1.50"), &[]);
        let cfg = res.camou_config;

        assert_eq!(cfg.get("navigator.platform").unwrap(), "Win32");
        assert_eq!(cfg.get("navigator.oscpu").unwrap(), "Windows NT 10.0; Win64; x64");
        assert_eq!(cfg.get("navigator.hardwareConcurrency").unwrap(), 16);
        assert_eq!(cfg.get("screen.width").unwrap(), 2560);
        assert_eq!(cfg.get("screen.height").unwrap(), 1440);
        assert_eq!(cfg.get("screen.availHeight").unwrap(), 1400); // 1440 - 40 taskbar
        assert_eq!(cfg.get("webGl:vendor").unwrap(), "Google Inc. (NVIDIA)");
        assert_eq!(cfg.get("timezone").unwrap(), "America/Sao_Paulo");
        assert_eq!(cfg.get("webrtc:ipv4").unwrap(), "192.168.1.50");

        // Seed hexadecimal "1CCAE86B" convertida para inteiro positivo
        let seed = cfg.get("canvas:seed").unwrap().as_u64().unwrap();
        assert_eq!(seed, 0x1CCAE86B);

        // Verifica user.js snippet
        assert!(res.user_js_snippet.contains("general.platform.override\", \"Win32\""));
        assert!(res.user_js_snippet.contains("dom.maxHardwareConcurrency\", 16"));
    }

    #[test]
    fn test_macos_fingerprint_translation() {
        let profile = Profile {
            id: "test-prof-mac".to_string(),
            name: "Test Mac".to_string(),
            group: "Default".to_string(),
            tags: vec![],
            notes: "".to_string(),
            status: "ready".to_string(),
            kernel: "Camoufox".to_string(),
            browser_version: "150".to_string(),
            os: "macos".to_string(),
            created_at: 100,
            updated_at: 100,
            last_launch: None,
            is_deleted: false,
            deleted_at: None,
            proxy: ProfileProxyConfig::default(),
            fingerprint_json: serde_json::json!({
                "os": "macos",
                "cpu_cores": 10,
                "webgl_vendor": "Apple",
                "webgl_renderer": "Apple M2"
            }),
            extension_mode: None,
            extension_category: None,
            extensions: None,
        };

        let res = prepare_fingerprint(&profile, None, &[]);
        let cfg = res.camou_config;

        assert_eq!(cfg.get("navigator.platform").unwrap(), "MacIntel");
        assert_eq!(cfg.get("navigator.oscpu").unwrap(), "Intel Mac OS X 10.15");
        assert_eq!(cfg.get("navigator.hardwareConcurrency").unwrap(), 10);
        assert_eq!(cfg.get("webGl:vendor").unwrap(), "Apple");
        assert_eq!(cfg.get("webGl:renderer").unwrap(), "Apple M2");
        assert!(res.user_js_snippet.contains("general.platform.override\", \"MacIntel\""));
    }
}
