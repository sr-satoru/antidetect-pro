use std::collections::HashMap;
use std::fs;
use star_multlogin_backend::extraction_session::{
    fire_fox::{
        escape_firefox_origin, extract_cookies, extract_local_storage, extract_unified_session,
        parse_cookies_input, unescape_firefox_origin,
    },
    UnifiedCookie,
};
use star_multlogin_backend::launcher::engine::injection::{
    clear_profile_cookies, clear_profile_storage, inject_cookies, inject_local_storage,
};

#[test]
fn test_firefox_origin_escaping_roundtrip() {
    let origin = "https://discord.com";
    let escaped = escape_firefox_origin(origin);
    assert_eq!(escaped, "https+++discord.com");
    let unescaped = unescape_firefox_origin(&escaped);
    assert_eq!(unescaped, origin);

    let origin_port = "http://localhost:3000";
    let escaped_port = escape_firefox_origin(origin_port);
    assert_eq!(escaped_port, "http+++localhost+3000");
    let unescaped_port = unescape_firefox_origin(&escaped_port);
    assert_eq!(unescaped_port, origin_port);
}

#[test]
fn test_parse_json_and_netscape_cookies() {
    // 1. JSON
    let json_raw = r#"[
        {
            "name": "session_token",
            "value": "secret_abc_123",
            "domain": ".example.com",
            "path": "/",
            "secure": true,
            "httpOnly": true,
            "sameSite": "Lax"
        }
    ]"#;
    let parsed = parse_cookies_input(json_raw).expect("Falha ao analisar JSON de cookies");
    assert_eq!(parsed.len(), 1);
    assert_eq!(parsed[0].name, "session_token");
    assert_eq!(parsed[0].value, "secret_abc_123");
    assert!(parsed[0].is_secure);
    assert!(parsed[0].is_http_only);
    assert_eq!(parsed[0].same_site, "Lax");

    // 2. Netscape
    let netscape_raw = ".twitter.com\tTRUE\t/\tTRUE\t1999999999\tauth_token\txyz_token_999\n";
    let parsed_netscape = parse_cookies_input(netscape_raw).expect("Falha ao analisar Netscape");
    assert_eq!(parsed_netscape.len(), 1);
    assert_eq!(parsed_netscape[0].name, "auth_token");
    assert_eq!(parsed_netscape[0].value, "xyz_token_999");
    assert_eq!(parsed_netscape[0].domain, ".twitter.com");
    assert!(parsed_netscape[0].is_secure);
}

#[test]
fn test_module1_cookie_injection_extraction_and_clear() {
    let temp_dir = std::env::temp_dir().join(format!("star_cookie_test_{}", uuid::Uuid::new_v4()));
    fs::create_dir_all(&temp_dir).unwrap();
    let profile_dir = &temp_dir;

    let cookies = vec![
        UnifiedCookie {
            name: "cf_clearance".to_string(),
            value: "camoufox_token".to_string(),
            domain: ".camoufox.com".to_string(),
            path: "/".to_string(),
            expiry: Some(1800000000),
            is_secure: true,
            is_http_only: true,
            same_site: "Lax".to_string(),
        },
        UnifiedCookie {
            name: "user_session".to_string(),
            value: "usr_998877".to_string(),
            domain: ".camoufox.com".to_string(),
            path: "/".to_string(),
            expiry: Some(1800000000),
            is_secure: true,
            is_http_only: false,
            same_site: "Strict".to_string(),
        },
    ];

    // Injeção
    let result = inject_cookies(profile_dir, &cookies).expect("Falha ao injetar cookies");
    assert_eq!(result.imported, 2);
    assert_eq!(result.skipped, 0);

    // Extração
    let stats = extract_cookies(profile_dir).expect("Falha ao extrair cookies");
    assert_eq!(stats.total_count, 2);
    assert_eq!(stats.domains.len(), 1);
    assert_eq!(stats.domains[0].domain, ".camoufox.com");
    assert_eq!(stats.domains[0].count, 2);

    // Limpeza
    let deleted = clear_profile_cookies(profile_dir).expect("Falha ao limpar cookies");
    assert_eq!(deleted, 2);

    let stats_after = extract_cookies(profile_dir).expect("Falha ao extrair pós limpeza");
    assert_eq!(stats_after.total_count, 0);

    let _ = fs::remove_dir_all(&temp_dir);
}

#[test]
fn test_module2_local_storage_injection_and_extraction() {
    let temp_dir = std::env::temp_dir().join(format!("star_storage_test_{}", uuid::Uuid::new_v4()));
    fs::create_dir_all(&temp_dir).unwrap();
    let profile_dir = &temp_dir;

    let mut discord_storage = HashMap::new();
    discord_storage.insert("token".to_string(), "\"mfa.XYZ123AuthJwt\"".to_string());
    discord_storage.insert("user_id".to_string(), "\"123456789\"".to_string());

    let mut telegram_storage = HashMap::new();
    telegram_storage.insert("dc_id".to_string(), "2".to_string());

    // Injeção Módulo 2
    let inserted_discord = inject_local_storage(profile_dir, "https://discord.com", &discord_storage)
        .expect("Falha ao injetar discord local_storage");
    assert_eq!(inserted_discord, 2);

    let inserted_tg = inject_local_storage(profile_dir, "https://web.telegram.org", &telegram_storage)
        .expect("Falha ao injetar telegram local_storage");
    assert_eq!(inserted_tg, 1);

    // Extração Módulo 2
    let extracted_storage = extract_local_storage(profile_dir).expect("Falha ao extrair local_storage");
    assert_eq!(extracted_storage.len(), 2);
    assert_eq!(
        extracted_storage.get("https://discord.com").and_then(|m| m.get("token")),
        Some(&"\"mfa.XYZ123AuthJwt\"".to_string())
    );
    assert_eq!(
        extracted_storage.get("https://web.telegram.org").and_then(|m| m.get("dc_id")),
        Some(&"2".to_string())
    );

    // Teste de Sessão Unificada Completa (Cookies + LocalStorage)
    let session = extract_unified_session(profile_dir).expect("Falha ao extrair sessão unificada");
    assert_eq!(session.total_cookies, 0);
    assert_eq!(session.total_storage_items, 3);

    // Limpeza
    clear_profile_storage(profile_dir).expect("Falha ao limpar storage");
    let storage_after = extract_local_storage(profile_dir).expect("Falha ao ler pós limpeza");
    assert!(storage_after.is_empty());

    let _ = fs::remove_dir_all(&temp_dir);
}
