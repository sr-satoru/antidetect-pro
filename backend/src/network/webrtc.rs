use std::collections::HashMap;

/// Prepara a estrutura do CAMOU_CONFIG que o Camoufox lê na inicialização
/// através de MaskConfig.hpp e browser-init.js.
pub fn build_camou_config(
    proxy_ip: Option<&str>,
    addon_paths: &[String],
) -> HashMap<String, serde_json::Value> {
    let mut config = HashMap::new();

    // 1. Spoofing de IP no WebRTC para não vazar a operadora real
    if let Some(ip) = proxy_ip {
        let clean_ip = ip.trim();
        if !clean_ip.is_empty() {
            config.insert("webrtc:ipv4".to_string(), serde_json::Value::String(clean_ip.to_string()));
        }
    }

    // 2. Extensões extras a serem injetadas pelo Camoufox via installTemporaryAddon
    if !addon_paths.is_empty() {
        let json_arr = addon_paths
            .iter()
            .map(|p| serde_json::Value::String(p.clone()))
            .collect();
        config.insert("addons".to_string(), serde_json::Value::Array(json_arr));
    }

    config
}
