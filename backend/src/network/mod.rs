pub mod prefs;
pub mod relay;
pub mod validator;

pub use validator as proxy_validator;

use crate::models::ProfileProxyConfig;
use std::collections::HashMap;

pub struct NetworkSetupResult {
    /// Trecho de configuração a ser concatenado no user.js
    pub user_js_snippet: String,
    /// Variáveis de ambiente a serem injetadas no processo do Camoufox (ex: CAMOU_CONFIG)
    pub env_vars: HashMap<String, String>,
    /// Universal Proxy Relay ativo em loopback, mantido vivo durante a execução do perfil
    pub relay: Option<relay::ProxyRelay>,
    /// Caminhos das extensões de rede injetadas
    pub addon_paths: Vec<String>,
}

impl NetworkSetupResult {
    /// Aplica as variáveis de ambiente necessárias ao comando de execução
    pub fn apply_to_command(&self, cmd: &mut tokio::process::Command) {
        for (k, v) in &self.env_vars {
            cmd.env(k, v);
        }
    }
}

impl Default for NetworkSetupResult {
    fn default() -> Self {
        Self {
            user_js_snippet: String::new(),
            env_vars: HashMap::new(),
            relay: None,
            addon_paths: Vec::new(),
        }
    }
}

/// Prepara toda a infraestrutura de rede, Universal Proxy Relay (HTTP/SOCKS5 com Kill-Switch)
/// e preferências anti-vazamento (HTTP/3 disabled, WebRTC hardening).
pub async fn prepare_network(
    proxy: &ProfileProxyConfig,
    fingerprint_json: &serde_json::Value,
) -> Result<NetworkSetupResult, String> {
    let fp_map = crate::fingerprint::translator::extract_fingerprint_map(fingerprint_json);

    let webrtc_mode = fp_map
        .get("webrtc_mode")
        .and_then(|v| v.as_str())
        .unwrap_or("substitute");

    // 1. Perfil sem proxy configurado
    if proxy.proxy_type == "none" || proxy.host.as_deref().unwrap_or("").trim().is_empty() {
        return Ok(NetworkSetupResult {
            user_js_snippet: prefs::build_proxy_prefs(proxy, None, None, Some(webrtc_mode)),
            env_vars: HashMap::new(),
            relay: None,
            addon_paths: Vec::new(),
        });
    }

    let host = proxy.host.as_deref().unwrap_or("").trim().to_string();
    let port = proxy.port.unwrap_or(8080);
    let username = proxy.username.as_deref().unwrap_or("").trim();
    let password = proxy.password.as_deref().unwrap_or("").trim();
    let auth = if !username.is_empty() && !password.is_empty() {
        Some(relay::Credentials {
            username: username.to_string(),
            password: password.to_string(),
        })
    } else {
        None
    };

    let p_type = proxy.proxy_type.to_lowercase();
    let upstream = if p_type == "socks5" || p_type == "socks4" {
        relay::Upstream::Socks5 { host, port, auth }
    } else {
        relay::Upstream::Http { host, port, auth }
    };

    // Port scan protection: "close" significa proteção ativa (bloqueia loopback/LAN não permitidos)
    let port_scan_mode = fp_map
        .get("port_scan_protection")
        .and_then(|v| v.as_str())
        .unwrap_or("close");
    let port_scan_protection = port_scan_mode == "close";

    let allowed_ports: Vec<u16> = fp_map
        .get("port_scan_allowed_ports")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|x| x.as_u64().map(|p| p as u16))
                .collect()
        })
        .unwrap_or_default();

    let relay_config = relay::RelayConfig {
        upstream,
        port_scan_protection,
        allowed_ports,
    };

    // Inicia o Universal Proxy Relay em 127.0.0.1:0
    let active_relay = relay::ProxyRelay::start(relay_config)
        .await
        .map_err(|e| format!("Falha ao inicializar Universal Proxy Relay: {}", e))?;

    let relay_port = active_relay.port;

    // Configura o user.js do Firefox para encaminhar todo o tráfego HTTP/HTTPS para o relay
    let user_js_snippet = prefs::build_proxy_prefs(
        proxy,
        Some("127.0.0.1"),
        Some(relay_port),
        Some(webrtc_mode),
    );

    Ok(NetworkSetupResult {
        user_js_snippet,
        env_vars: HashMap::new(),
        relay: Some(active_relay),
        addon_paths: Vec::new(),
    })
}
