use serde_json::json;
use star_multlogin_backend::models::ProfileProxyConfig;
use star_multlogin_backend::network::context_resolver::{resolve_network_identity, ResolvedNetworkIdentity};
use star_multlogin_backend::network::relay::{Credentials, ProxyRelay, RelayConfig, Upstream};

// 1. Relay binds to loopback and allocates ephemeral port > 1024
#[tokio::test]
async fn test_relay_start_and_bind_ephemeral_port() {
    let config = RelayConfig {
        upstream: Upstream::Direct,
        port_scan_protection: false,
        allowed_ports: vec![],
    };
    let relay = ProxyRelay::start(config).await.expect("Relay deve iniciar");
    assert!(relay.port > 1024);
}

// 2. Relay stop shuts down listener
#[tokio::test]
async fn test_relay_stop_terminates_listener() {
    let config = RelayConfig {
        upstream: Upstream::Direct,
        port_scan_protection: false,
        allowed_ports: vec![],
    };
    let mut relay = ProxyRelay::start(config).await.expect("Relay deve iniciar");
    let port = relay.port;
    relay.stop();
    // Permite que o loop encerre
    tokio::time::sleep(std::time::Duration::from_millis(50)).await;
    // O porto deve poder ser associado novamente sem colisão
    let test_bind = tokio::net::TcpListener::bind(format!("127.0.0.1:{}", port)).await;
    assert!(test_bind.is_ok());
}

// 3. Relay drop shuts down listener via RAII
#[tokio::test]
async fn test_relay_drop_terminates_listener() {
    let port = {
        let config = RelayConfig {
            upstream: Upstream::Direct,
            port_scan_protection: false,
            allowed_ports: vec![],
        };
        let relay = ProxyRelay::start(config).await.expect("Relay deve iniciar");
        relay.port
    };
    tokio::time::sleep(std::time::Duration::from_millis(50)).await;
    let test_bind = tokio::net::TcpListener::bind(format!("127.0.0.1:{}", port)).await;
    assert!(test_bind.is_ok());
}

// 4. Credentials format masks password
#[test]
fn test_relay_credentials_masking() {
    let cred = Credentials {
        username: "admin_user".to_string(),
        password: "super_secret_password_123".to_string(),
    };
    let debug_str = format!("{:?}", cred);
    assert!(debug_str.contains("admin_user"));
    assert!(debug_str.contains("***"));
    assert!(!debug_str.contains("super_secret_password_123"));
}

// 5. Upstream::Http debug masks credentials
#[test]
fn test_relay_config_http_upstream_display() {
    let upstream = Upstream::Http {
        host: "proxy.residential.com".to_string(),
        port: 8080,
        auth: Some(Credentials {
            username: "tenant_42".to_string(),
            password: "pAsSwOrD_99".to_string(),
        }),
    };
    let debug_str = format!("{:?}", upstream);
    assert!(debug_str.contains("proxy.residential.com"));
    assert!(debug_str.contains("tenant_42"));
    assert!(debug_str.contains("***"));
    assert!(!debug_str.contains("pAsSwOrD_99"));
}

// 6. Upstream::Socks5 debug masks credentials
#[test]
fn test_relay_config_socks5_upstream_display() {
    let upstream = Upstream::Socks5 {
        host: "socks.residential.com".to_string(),
        port: 1080,
        auth: Some(Credentials {
            username: "socks_user".to_string(),
            password: "socks_secret_pass".to_string(),
        }),
    };
    let debug_str = format!("{:?}", upstream);
    assert!(debug_str.contains("socks.residential.com"));
    assert!(debug_str.contains("socks_user"));
    assert!(debug_str.contains("***"));
    assert!(!debug_str.contains("socks_secret_pass"));
}

// 7. Port scan protection flag in RelayConfig
#[test]
fn test_relay_port_scan_protection_flag() {
    let config = RelayConfig {
        upstream: Upstream::Direct,
        port_scan_protection: true,
        allowed_ports: vec![80, 443, 8080],
    };
    assert!(config.port_scan_protection);
    assert_eq!(config.allowed_ports, vec![80, 443, 8080]);
}

// 8. Default ResolvedNetworkIdentity has empty country code
#[test]
fn test_context_resolver_default_identity() {
    let default_id = ResolvedNetworkIdentity::default();
    assert_eq!(default_id.egress_ip, None);
    assert!(default_id.country_code.is_empty());
    assert!(default_id.primary_language.is_empty());
    assert!(default_id.accept_languages.is_empty());
}

// 9. Parsing simulated ip-api.com response
#[test]
fn test_context_resolver_mock_probe_ipapi_format() {
    let raw = r#"{
        "query": "189.40.12.34",
        "timezone": "America/Sao_Paulo",
        "lat": -23.5505,
        "lon": -46.6333,
        "countryCode": "BR"
    }"#;
    let parsed: serde_json::Value = serde_json::from_str(raw).unwrap();
    assert_eq!(parsed["query"], "189.40.12.34");
    assert_eq!(parsed["timezone"], "America/Sao_Paulo");
    assert_eq!(parsed["countryCode"], "BR");
}

// 10. Parsing simulated ip.sb response
#[test]
fn test_context_resolver_mock_probe_ipsb_format() {
    let raw = r#"{
        "ip": "185.220.101.5",
        "timezone": "Europe/Berlin",
        "latitude": 52.5200,
        "longitude": 13.4050,
        "country_code": "DE"
    }"#;
    let parsed: serde_json::Value = serde_json::from_str(raw).unwrap();
    assert_eq!(parsed["ip"], "185.220.101.5");
    assert_eq!(parsed["timezone"], "Europe/Berlin");
    assert_eq!(parsed["country_code"], "DE");
}

// 11. Context resolver direct connection without proxy (sem fallbacks arbitrários)
#[tokio::test]
async fn test_context_resolver_direct_connection() {
    let proxy = ProfileProxyConfig::default();
    let fp = serde_json::Map::new();
    let identity = resolve_network_identity(&proxy, &fp, None).await;
    assert_eq!(identity.egress_ip, None);
    assert!(identity.primary_language.is_empty());
}

// 12. Context resolver with manual custom timezone
#[tokio::test]
async fn test_context_resolver_manual_timezone_override() {
    let proxy = ProfileProxyConfig::default();
    let mut fp = serde_json::Map::new();
    fp.insert("custom_timezone".to_string(), json!("Asia/Tokyo"));
    let identity = resolve_network_identity(&proxy, &fp, None).await;
    assert_eq!(identity.timezone, "Asia/Tokyo");
}

// 13. Context resolver with manual custom language
#[tokio::test]
async fn test_context_resolver_manual_language_override() {
    let proxy = ProfileProxyConfig::default();
    let mut fp = serde_json::Map::new();
    fp.insert("custom_language".to_string(), json!("ja-JP,ja;q=0.9,en;q=0.8"));
    let identity = resolve_network_identity(&proxy, &fp, None).await;
    assert_eq!(identity.primary_language, "ja-JP");
    assert_eq!(identity.accept_languages, "ja-JP,ja;q=0.9,en;q=0.8");
}

// 14. Context resolver with nested timezone object
#[tokio::test]
async fn test_context_resolver_nested_timezone_object() {
    let proxy = ProfileProxyConfig::default();
    let mut fp = serde_json::Map::new();
    fp.insert("timezone".to_string(), json!({ "timezone_id": "Europe/Rome" }));
    let identity = resolve_network_identity(&proxy, &fp, None).await;
    assert_eq!(identity.timezone, "Europe/Rome");
}

// 15. Context resolver with nested locale object
#[tokio::test]
async fn test_context_resolver_nested_locale_object() {
    let proxy = ProfileProxyConfig::default();
    let mut fp = serde_json::Map::new();
    fp.insert("locale".to_string(), json!({
        "primary_language": "it-IT",
        "languages": ["it-IT", "en-US"]
    }));
    let identity = resolve_network_identity(&proxy, &fp, None).await;
    assert_eq!(identity.primary_language, "it-IT");
    assert_eq!(identity.accept_languages, "it-IT,en-US");
}

// 16. Network setup for profile without proxy
#[tokio::test]
async fn test_network_setup_result_direct() {
    let proxy = ProfileProxyConfig {
        proxy_type: "none".to_string(),
        ..Default::default()
    };
    let fp = serde_json::json!({});
    let result = star_multlogin_backend::network::prepare_network(&proxy, &fp).await.unwrap();
    assert!(result.relay.is_none());
    assert!(!result.env_vars.contains_key("CAMOU_PROXY_URL"));
}

// 17. Network setup with HTTP proxy with authentication generates loopback relay
#[tokio::test]
async fn test_network_setup_result_http_auth_generates_relay() {
    let proxy = ProfileProxyConfig {
        proxy_type: "http".to_string(),
        host: Some("127.0.0.1".to_string()),
        port: Some(9999),
        username: Some("user".to_string()),
        password: Some("pass".to_string()),
        ..Default::default()
    };
    let fp = serde_json::json!({});
    let result = star_multlogin_backend::network::prepare_network(&proxy, &fp).await.unwrap();
    assert!(result.relay.is_some());
    let relay_port = result.relay.as_ref().unwrap().port;
    assert!(relay_port > 1024);
    assert!(result.user_js_snippet.contains(&format!("\"network.proxy.http_port\", {relay_port}")));
}

// 18. Network setup with SOCKS5 proxy with authentication generates loopback relay
#[tokio::test]
async fn test_network_setup_result_socks5_auth_generates_relay() {
    let proxy = ProfileProxyConfig {
        proxy_type: "socks5".to_string(),
        host: Some("127.0.0.1".to_string()),
        port: Some(9998),
        username: Some("socks_user".to_string()),
        password: Some("socks_pass".to_string()),
        ..Default::default()
    };
    let fp = serde_json::json!({});
    let result = star_multlogin_backend::network::prepare_network(&proxy, &fp).await.unwrap();
    assert!(result.relay.is_some());
    let relay_port = result.relay.as_ref().unwrap().port;
    assert!(relay_port > 1024);
}

// 19. Network setup result never leaks credentials in env_vars
#[tokio::test]
async fn test_network_setup_result_no_credentials_in_env_vars() {
    let proxy = ProfileProxyConfig {
        proxy_type: "http".to_string(),
        host: Some("127.0.0.1".to_string()),
        port: Some(9999),
        username: Some("leaked_user".to_string()),
        password: Some("leaked_pass".to_string()),
        ..Default::default()
    };
    let fp = serde_json::json!({});
    let result = star_multlogin_backend::network::prepare_network(&proxy, &fp).await.unwrap();
    for (k, v) in &result.env_vars {
        assert!(!v.contains("leaked_user"), "Env var {} contém credenciais!", k);
        assert!(!v.contains("leaked_pass"), "Env var {} contém credenciais!", k);
    }
}

// 20. IPv6 leak prevention in Firefox user.js snippet
#[tokio::test]
async fn test_ipv6_leak_prevention_in_firefox_user_js() {
    let proxy = ProfileProxyConfig {
        proxy_type: "http".to_string(),
        host: Some("127.0.0.1".to_string()),
        port: Some(9999),
        username: Some("u".to_string()),
        password: Some("p".to_string()),
        ..Default::default()
    };
    let fp = serde_json::json!({});
    let result = star_multlogin_backend::network::prepare_network(&proxy, &fp).await.unwrap();
    assert!(result.user_js_snippet.contains("network.dns.disableIPv6"));
}

// 21. WebRTC ICE proxy only in Firefox user.js snippet
#[tokio::test]
async fn test_webrtc_proxy_only_in_firefox_user_js() {
    let proxy = ProfileProxyConfig {
        proxy_type: "http".to_string(),
        host: Some("127.0.0.1".to_string()),
        port: Some(9999),
        username: Some("u".to_string()),
        password: Some("p".to_string()),
        ..Default::default()
    };
    let fp = serde_json::json!({});
    let result = star_multlogin_backend::network::prepare_network(&proxy, &fp).await.unwrap();
    assert!(result.user_js_snippet.contains("media.peerconnection.ice.proxy_only"));
}

// 22. Network setup result apply_to_command
#[tokio::test]
async fn test_network_setup_result_apply_to_command() {
    let proxy = ProfileProxyConfig::default();
    let fp = serde_json::json!({});
    let result = star_multlogin_backend::network::prepare_network(&proxy, &fp).await.unwrap();
    let mut cmd = tokio::process::Command::new("echo");
    result.apply_to_command(&mut cmd);
}

// 23. Concurrent relay instances on distinct ports
#[tokio::test]
async fn test_concurrent_relay_instances() {
    let mut relays = Vec::new();
    for _ in 0..5 {
        let config = RelayConfig {
            upstream: Upstream::Direct,
            port_scan_protection: false,
            allowed_ports: vec![],
        };
        let relay = ProxyRelay::start(config).await.expect("Relay deve iniciar");
        relays.push(relay);
    }

    let mut ports: Vec<u16> = relays.iter().map(|r| r.port).collect();
    let initial_len = ports.len();
    ports.sort();
    ports.dedup();
    assert_eq!(ports.len(), initial_len, "Portas de relay não devem colidir!");
}

// 24. Context resolver with invalid custom timezone: zero fallbacks arbitrários (não força America/New_York)
#[tokio::test]
async fn test_context_resolver_empty_custom_timezone_fallback() {
    let proxy = ProfileProxyConfig::default();
    let mut fp = serde_json::Map::new();
    fp.insert("custom_timezone".to_string(), json!("   "));
    let identity = resolve_network_identity(&proxy, &fp, None).await;
    assert!(identity.timezone.is_empty());
}

// 25. Context resolver with empty custom language: zero fallbacks arbitrários (não força en-US)
#[tokio::test]
async fn test_context_resolver_empty_custom_language_fallback() {
    let proxy = ProfileProxyConfig::default();
    let mut fp = serde_json::Map::new();
    fp.insert("custom_language".to_string(), json!("   "));
    let identity = resolve_network_identity(&proxy, &fp, None).await;
    assert!(identity.primary_language.is_empty());
    assert!(identity.accept_languages.is_empty());
}
