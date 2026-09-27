use crate::models::ProfileProxyConfig;

/// Gera as linhas de configuração estritas de rede e proxy para o arquivo user.js do Camoufox.
///
/// Proteções incluídas:
/// - network.proxy.share_proxy_settings: Garante que HTTPS trafegue pelo proxy HTTP configurado.
/// - network.trr.mode = 5: Desativa completamente o DoH (DNS-over-HTTPS) do Firefox,
///   impedindo vazamento de DNS para a Cloudflare e forçando resolução pelo túnel do proxy.
/// - network.proxy.socks_remote_dns: Garante que queries DNS passem pelo SOCKS5 remoto.
/// - media.peerconnection.ice.*: Previne vazamentos do IP real da máquina em conexões WebRTC.
pub fn build_proxy_prefs(proxy: &ProfileProxyConfig, override_host: Option<&str>, override_port: Option<u16>) -> String {
    let mut prefs = String::new();

    if proxy.proxy_type == "none" || proxy.host.as_deref().unwrap_or("").trim().is_empty() {
        prefs.push_str("user_pref(\"network.proxy.type\", 0);\n");
        return prefs;
    }

    let raw_host = override_host.unwrap_or_else(|| proxy.host.as_deref().unwrap_or("127.0.0.1"));
    let host = raw_host.trim();
    let port = override_port.unwrap_or_else(|| proxy.port.unwrap_or(8080));

    prefs.push_str("// --- Configurações de Rede e Proxy Isolado Fury ---\n");
    prefs.push_str("user_pref(\"network.proxy.type\", 1);\n");
    prefs.push_str("user_pref(\"network.proxy.share_proxy_settings\", true);\n");
    prefs.push_str("user_pref(\"network.proxy.no_proxies_on\", \"\");\n");
    prefs.push_str("user_pref(\"network.proxy.allow_hijacking_localhost\", true);\n");

    // Desativa DNS-over-HTTPS (DoH) nativo para que o DNS siga estritamente o túnel do proxy
    prefs.push_str("user_pref(\"network.trr.mode\", 5);\n");
    prefs.push_str("user_pref(\"signon.autologin.proxy\", true);\n");

    match proxy.proxy_type.to_lowercase().as_str() {
        "socks5" | "socks4" => {
            let version = if proxy.proxy_type.to_lowercase() == "socks4" { 4 } else { 5 };
            prefs.push_str(&format!("user_pref(\"network.proxy.socks\", \"{host}\");\n"));
            prefs.push_str(&format!("user_pref(\"network.proxy.socks_port\", {port});\n"));
            prefs.push_str(&format!("user_pref(\"network.proxy.socks_version\", {version});\n"));

            if proxy.socks_remote_dns {
                prefs.push_str("user_pref(\"network.proxy.socks_remote_dns\", true);\n");
            }

            // Hardening WebRTC contra vazamento do IP real
            prefs.push_str("user_pref(\"media.peerconnection.ice.proxy_only_if_behind_proxy\", true);\n");
            prefs.push_str("user_pref(\"media.peerconnection.ice.default_address_only\", true);\n");
        }
        "http" | "https" => {
            prefs.push_str(&format!("user_pref(\"network.proxy.http\", \"{host}\");\n"));
            prefs.push_str(&format!("user_pref(\"network.proxy.http_port\", {port});\n"));
            prefs.push_str(&format!("user_pref(\"network.proxy.ssl\", \"{host}\");\n"));
            prefs.push_str(&format!("user_pref(\"network.proxy.ssl_port\", {port});\n"));

            // WebRTC hardening para HTTP/HTTPS proxy
            prefs.push_str("user_pref(\"media.peerconnection.ice.proxy_only_if_behind_proxy\", true);\n");
            prefs.push_str("user_pref(\"media.peerconnection.ice.default_address_only\", true);\n");
        }
        _ => {
            prefs.push_str("user_pref(\"network.proxy.type\", 0);\n");
        }
    }

    prefs
}
