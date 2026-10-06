use star_multlogin_backend::models::ProfileProxyConfig;
use star_multlogin_backend::network::prepare_network;
use star_multlogin_backend::network::relay::{is_blocked_target, is_local_target};

#[tokio::test]
async fn test_proxy_none() {
    let proxy = ProfileProxyConfig {
        proxy_type: "none".to_string(),
        ..Default::default()
    };

    let res = prepare_network(&proxy, &serde_json::json!({})).await.unwrap();
    assert!(res.user_js_snippet.contains("user_pref(\"network.proxy.type\", 0);"));
    assert!(res.relay.is_none());
    assert!(res.env_vars.is_empty());
}

#[tokio::test]
async fn test_http_proxy_with_auth_uses_relay() {
    let proxy = ProfileProxyConfig {
        mode: "custom".to_string(),
        proxy_type: "http".to_string(),
        host: Some("192.168.1.100".to_string()),
        port: Some(8080),
        username: Some("user_test".to_string()),
        password: Some("pass_secret".to_string()),
        socks_remote_dns: true,
        ..Default::default()
    };

    let res = prepare_network(&proxy, &serde_json::json!({})).await.unwrap();
    assert!(res.user_js_snippet.contains("user_pref(\"network.proxy.type\", 1);"));
    assert!(res.user_js_snippet.contains("user_pref(\"network.proxy.http\", \"127.0.0.1\");"));
    assert!(res.user_js_snippet.contains("user_pref(\"network.proxy.share_proxy_settings\", true);"));
    assert!(res.user_js_snippet.contains("user_pref(\"network.trr.mode\", 5);"));
    assert!(res.user_js_snippet.contains("user_pref(\"network.http.http3.enable\", false);"));

    // O relay ativo deve estar presente
    assert!(res.relay.is_some());
    let relay_port = res.relay.unwrap().port;
    assert!(relay_port > 0);
    assert!(res.user_js_snippet.contains(&format!("\"network.proxy.http_port\", {relay_port}")));

    // Nenhuma extensão de auto-auth em disco!
    assert!(res.addon_paths.is_empty());
}

#[test]
fn test_is_local_target() {
    assert!(is_local_target("127.0.0.1"));
    assert!(is_local_target("localhost"));
    assert!(is_local_target("app.localhost"));
    assert!(is_local_target("192.168.1.1"));
    assert!(is_local_target("10.0.0.5"));
    assert!(is_local_target("172.16.0.1"));
    assert!(is_local_target("::1"));
    assert!(!is_local_target("google.com"));
    assert!(!is_local_target("8.8.8.8"));
    assert!(!is_local_target("1.1.1.1"));
}

#[test]
fn test_is_blocked_target() {
    // Proteção ativa: bloqueia loopback
    assert!(is_blocked_target("127.0.0.1", 8080, true, &[]));
    // Porta permitida
    assert!(!is_blocked_target("127.0.0.1", 8080, true, &[8080]));
    // Proteção inativa: permite
    assert!(!is_blocked_target("127.0.0.1", 8080, false, &[]));
    // Alvo externo: sempre permitido pelo filtro local
    assert!(!is_blocked_target("1.1.1.1", 443, true, &[]));
}
