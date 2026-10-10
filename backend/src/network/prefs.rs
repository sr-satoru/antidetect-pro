use crate::models::ProfileProxyConfig;

/// Gera as linhas de configuração estritas de rede e proxy para o arquivo user.js do Camoufox.
///
/// Proteções incluídas:
/// - network.proxy.share_proxy_settings: Garante que HTTPS trafegue pelo proxy HTTP configurado.
/// - network.trr.mode = 5: Desativa completamente o DoH (DNS-over-HTTPS) do Firefox,
///   impedindo vazamento de DNS para a Cloudflare e forçando resolução pelo túnel do proxy.
/// - network.http.http3.enable = false: Desativa QUIC/HTTP3 para evitar vazamento via UDP fora do TCP proxy relay.
/// - media.peerconnection.ice.*: Previne vazamentos do IP real da máquina em conexões WebRTC.
pub fn build_proxy_prefs(
    proxy: &ProfileProxyConfig,
    override_host: Option<&str>,
    override_port: Option<u16>,
    webrtc_mode: Option<&str>,
) -> String {
    let mut prefs = String::new();

    // Se WebRTC estiver desativado nas impressões digitais, desativa o peerconnection
    if webrtc_mode == Some("disabled") {
        prefs.push_str("user_pref(\"media.peerconnection.enabled\", false);\n");
    } else {
        prefs.push_str("user_pref(\"media.peerconnection.enabled\", true);\n");
        prefs.push_str("user_pref(\"media.peerconnection.ice.proxy_only_if_behind_proxy\", true);\n");
        prefs.push_str("user_pref(\"media.peerconnection.ice.default_address_only\", true);\n");
    }

    if proxy.proxy_type == "none" || proxy.host.as_deref().unwrap_or("").trim().is_empty() {
        prefs.push_str("user_pref(\"network.proxy.type\", 0);\n");
        return prefs;
    }

    let raw_host = override_host.unwrap_or_else(|| proxy.host.as_deref().unwrap_or("127.0.0.1"));
    let host = raw_host.trim();
    let port = override_port.unwrap_or_else(|| proxy.port.unwrap_or(8080));

    prefs.push_str("// --- Configurações de Rede e Proxy Isolado Star Multlogin ---\n");
    prefs.push_str("user_pref(\"network.proxy.type\", 1);\n");
    prefs.push_str("user_pref(\"network.proxy.share_proxy_settings\", true);\n");
    prefs.push_str("user_pref(\"network.proxy.no_proxies_on\", \"\");\n");
    prefs.push_str("user_pref(\"network.proxy.allow_hijacking_localhost\", true);\n");

    // Desativa DNS-over-HTTPS (DoH) nativo para que o DNS siga estritamente o túnel do proxy
    prefs.push_str("user_pref(\"network.trr.mode\", 5);\n");
    prefs.push_str("user_pref(\"signon.autologin.proxy\", true);\n");

    // Desativa HTTP/3 (QUIC) para evitar vazamento de pacotes UDP por fora do túnel TCP do proxy
    prefs.push_str("user_pref(\"network.http.http3.enable\", false);\n");
    prefs.push_str("user_pref(\"network.http.http3.alt-svc-mapping-for-testing\", false);\n");

    // Desativa prefetching de DNS e páginas para evitar vazamentos de DNS antes do clique do usuário
    prefs.push_str("user_pref(\"network.dns.disablePrefetch\", true);\n");
    prefs.push_str("user_pref(\"network.dns.disablePrefetchFromHTTPS\", true);\n");
    prefs.push_str("user_pref(\"network.prefetch-next\", false);\n");
    prefs.push_str("user_pref(\"network.proxy.socks_remote_dns\", true);\n");

    // Com o ProxyRelay em loopback, o Firefox sempre envia CONNECT para 127.0.0.1:<port>
    prefs.push_str(&format!("user_pref(\"network.proxy.http\", \"{host}\");\n"));
    prefs.push_str(&format!("user_pref(\"network.proxy.http_port\", {port});\n"));
    prefs.push_str(&format!("user_pref(\"network.proxy.ssl\", \"{host}\");\n"));
    prefs.push_str(&format!("user_pref(\"network.proxy.ssl_port\", {port});\n"));

    prefs
}
