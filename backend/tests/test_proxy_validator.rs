use star_multlogin_backend::proxy_validator::ProxyValidator;

#[tokio::test]
async fn test_empty_host_fails() {
    let res = ProxyValidator::validate("socks5", "", 8080, None, None).await;
    assert_eq!(res.status, "error");
    assert!(res.message.contains("Host do proxy não pode ser vazio"));
}

#[tokio::test]
async fn test_unreachable_proxy_fails() {
    // Testa conexão a uma porta fechada local (espera erro de conexão ou timeout)
    let res = ProxyValidator::validate("socks5", "127.0.0.1", 59999, None, None).await;
    assert!(res.status == "connection_error" || res.status == "error" || res.status == "timeout");
}

#[test]
fn test_extract_ip() {
    assert_eq!(
        ProxyValidator::extract_ip(r#"{"ip": "189.10.20.30"}"#),
        Some("189.10.20.30".to_string())
    );
    assert_eq!(
        ProxyValidator::extract_ip("189.10.20.30"),
        Some("189.10.20.30".to_string())
    );
}
