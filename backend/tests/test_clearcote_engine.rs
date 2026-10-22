use std::path::PathBuf;
use star_multlogin_backend::browser::engines::{
    get_engine, normalize_kernel, KernelKind,
};
use star_multlogin_backend::browser::engines::clearcote::flags::build_clearcote_flags;
use star_multlogin_backend::browser::engines::clearcote::preferences::setup_chromium_preferences;
use star_multlogin_backend::browser::engines::clearcote::cookies::{
    ensure_chromium_cookie_db, extract_chromium_session, inject_chromium_cookies,
};
use star_multlogin_backend::extraction_session::UnifiedCookie;
use star_multlogin_backend::models::{Profile, ProfileProxyConfig};

fn create_mock_profile(id: &str, kernel: &str, os: &str) -> Profile {
    Profile {
        id: id.to_string(),
        name: format!("Perfil {}", id),
        group: "Testes".to_string(),
        tags: vec![],
        notes: String::new(),
        status: "ready".to_string(),
        kernel: kernel.to_string(),
        browser_version: "150".to_string(),
        os: os.to_string(),
        created_at: 1000,
        updated_at: 1000,
        last_launch: None,
        is_deleted: false,
        deleted_at: None,
        proxy: ProfileProxyConfig::default(),
        fingerprint_json: serde_json::json!({
            "cpu_cores": 8,
            "device_memory": 16,
            "custom_screen_width": 1920,
            "custom_screen_height": 1080,
            "color_depth": 24,
            "device_pixel_ratio": 1.0,
            "webgl_vendor": "Google Inc. (NVIDIA)",
            "webgl_renderer": "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "locale": {
                "primary_language": "pt-BR",
                "languages": ["pt-BR", "en-US"]
            },
            "timezone": {
                "timezone_id": "America/Sao_Paulo"
            }
        }),
        extension_mode: None,
        extension_category: None,
        extensions: None,
    }
}

#[test]
fn test_kernel_normalization_and_registry() {
    assert_eq!(normalize_kernel("AstroBrowser"), KernelKind::Chromium);
    assert_eq!(normalize_kernel("astrobrowser"), KernelKind::Chromium);
    assert_eq!(normalize_kernel("Chromium"), KernelKind::Chromium);
    assert_eq!(normalize_kernel("blink"), KernelKind::Chromium);

    assert_eq!(normalize_kernel("AstroFox"), KernelKind::Firefox);
    assert_eq!(normalize_kernel("Firefox"), KernelKind::Firefox);
    assert_eq!(normalize_kernel("gecko"), KernelKind::Firefox);

    let engine_chrome = get_engine("AstroBrowser");
    assert_eq!(engine_chrome.kernel_name(), "AstroBrowser");

    let engine_fox = get_engine("AstroFox");
    assert_eq!(engine_fox.kernel_name(), "AstroFox");
}

fn get_temp_test_dir(name: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!(
        "star_{}_{}_{}",
        name,
        std::process::id(),
        std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos()
    ));
    let _ = std::fs::create_dir_all(&dir);
    dir
}

#[test]
fn test_clearcote_flags_generation() {
    let temp_dir = get_temp_test_dir("flags");
    let profile = create_mock_profile("test-01", "AstroBrowser", "windows");

    let flags = build_clearcote_flags(
        &temp_dir,
        &profile,
        Some(9222),
        Some("http://127.0.0.1:8080"),
        Some("198.51.100.1"),
        &["/path/to/ext1".to_string()],
        Some("https://example.com"),
    );

    assert!(flags.iter().any(|f| f.starts_with("--user-data-dir=")));
    assert!(flags.iter().any(|f| f == "--no-first-run"));
    assert!(flags.iter().any(|f| f == "--password-store=basic"));
    assert!(flags.iter().any(|f| f.starts_with("--fingerprint=")));
    assert!(flags.iter().any(|f| f == "--fingerprint-platform=windows"));
    assert!(flags.iter().any(|f| f == "--fingerprint-brand=chrome"));
    assert!(flags.iter().any(|f| f == "--fingerprint-brand-version=150"));
    assert!(flags.iter().any(|f| f == "--fingerprint-tls-profile=chrome-150"));
    assert!(flags.iter().any(|f| f.starts_with("--fingerprint-storage-quota=")));
    assert!(flags.iter().any(|f| f == "--webrtc-ip=198.51.100.1"));
    assert!(flags.iter().any(|f| f == "--force-webrtc-ip-handling-policy=disable_non_proxied_udp"));
    assert!(flags.iter().any(|f| f == "--fingerprint-hardware-concurrency=8"));
    assert!(flags.iter().any(|f| f == "--fingerprint-device-memory=16"));
    assert!(flags.iter().any(|f| f == "--fingerprint-screen-width=1920"));
    assert!(flags.iter().any(|f| f == "--fingerprint-screen-height=1080"));
    assert!(flags.iter().any(|f| f == "--proxy-server=http://127.0.0.1:8080"));
    assert!(flags.iter().any(|f| f == "--disable-quic"));
    assert!(flags.iter().any(|f| f == "--remote-debugging-port=9222"));
    assert!(flags.iter().any(|f| f == "--load-extension=/path/to/ext1"));
    assert!(flags.iter().any(|f| f == "https://example.com"));

    let _ = std::fs::remove_dir_all(temp_dir);
}

#[test]
fn test_clearcote_preferences_injection() {
    let temp_dir = get_temp_test_dir("prefs");
    let profile = create_mock_profile("test-02", "AstroBrowser", "windows");

    let res = setup_chromium_preferences(&temp_dir, &profile);
    assert!(res.is_ok());

    let prefs_file = temp_dir.join("Default").join("Preferences");
    assert!(prefs_file.exists());

    let content = std::fs::read_to_string(&prefs_file).unwrap();
    let json: serde_json::Value = serde_json::from_str(&content).unwrap();

    assert_eq!(json["translate"]["enabled"], false);
    assert_eq!(json["credentials_enable_service"], false);
    assert_eq!(json["profile"]["password_manager_enabled"], false);
    assert!(json["intl"]["accept_languages"].as_str().unwrap().contains("pt-BR"));

    let _ = std::fs::remove_dir_all(temp_dir);
}

#[test]
fn test_clearcote_cookies_injection_and_extraction() {
    let temp_dir = get_temp_test_dir("cookies");
    let db_path = temp_dir.join("Default").join("Network").join("Cookies");

    let ensure_res = ensure_chromium_cookie_db(&db_path);
    assert!(ensure_res.is_ok());

    let cookies = vec![
        UnifiedCookie {
            name: "session_id".to_string(),
            value: "xyz123".to_string(),
            domain: ".google.com".to_string(),
            path: "/".to_string(),
            expiry: Some(1800000000),
            is_secure: true,
            is_http_only: true,
            same_site: "Lax".to_string(),
        },
        UnifiedCookie {
            name: "auth_token".to_string(),
            value: "secret_abc".to_string(),
            domain: "example.com".to_string(),
            path: "/api".to_string(),
            expiry: Some(1850000000),
            is_secure: false,
            is_http_only: false,
            same_site: "Strict".to_string(),
        },
    ];

    let inject_res = inject_chromium_cookies(&temp_dir, &cookies);
    assert!(inject_res.is_ok());
    let report = inject_res.unwrap();
    assert_eq!(report.imported, 2);
    assert_eq!(report.skipped, 0);

    let session_res = extract_chromium_session(&temp_dir);
    assert!(session_res.is_ok());
    let session = session_res.unwrap();
    assert_eq!(session.total_cookies, 2);

    let session_cookie = session.cookies.iter().find(|c| c.name == "session_id").unwrap();
    assert_eq!(session_cookie.value, "xyz123");
    assert!(session_cookie.is_secure);
    assert!(session_cookie.is_http_only);

    let _ = std::fs::remove_dir_all(temp_dir);
}

#[test]
fn test_clearcote_binary_resolution() {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let data_dir = manifest_dir.join("app-data");

    let engine = get_engine("AstroBrowser");
    let resolved = engine.resolve_binary(&data_dir);

    assert!(resolved.is_ok(), "Binário do Clearcote deve ser localizado em app-data/binaries/.engine-chromium: {:?}", resolved.err());
    let path = resolved.unwrap();
    assert!(path.exists(), "Executável deve existir fisicamente");
    assert!(path.to_string_lossy().contains("chrome"));
}

#[test]
fn test_clearcote_antidetect_stealth_matrix() {
    let temp_dir = get_temp_test_dir("stealth_matrix");
    let profile = create_mock_profile("stealth-01", "AstroBrowser", "windows");

    let flags = build_clearcote_flags(
        &temp_dir,
        &profile,
        None,
        None,
        None,
        &[],
        None,
    );

    // 1. Ausência de switches inexistentes ou indicadores de automação
    assert!(!flags.iter().any(|f| f == "--portable-profile"), "Switch inexistente --portable-profile deve ser removido");
    assert!(!flags.iter().any(|f| f.starts_with("--webrtc-ip=")), "Sem proxy não deve fabricar webrtc-ip");

    // 2. Coerência de TLS do Chrome 150 (patch 210)
    assert!(flags.iter().any(|f| f == "--fingerprint-tls-profile=chrome-150"));

    // 3. Cota de armazenamento determinística e realista (patch 145)
    let quota_flag = flags.iter().find(|f| f.starts_with("--fingerprint-storage-quota="));
    assert!(quota_flag.is_some(), "Deve conter flag de storage quota");
    let quota_val: u64 = quota_flag.unwrap().split('=').nth(1).unwrap().parse().unwrap();
    assert!(quota_val >= 100_000 && quota_val <= 500_000, "Cota deve simular disco real entre 100GB e 500GB");

    // 4. Limitação estrita de cache de disco e GPU
    assert!(flags.iter().any(|f| f == "--disk-cache-size=20971520"));
    assert!(flags.iter().any(|f| f == "--ignore-gpu-blocklist"));
    assert!(flags.iter().any(|f| f == "--disable-background-mode"));

    // 5. Política padrão de WebRTC quando sem proxy
    assert!(flags.iter().any(|f| f == "--force-webrtc-ip-handling-policy=default_public_interface_only"));

    let _ = std::fs::remove_dir_all(temp_dir);
}

#[test]
fn test_clearcote_webrtc_leak_hardening() {
    let temp_dir = get_temp_test_dir("webrtc_leak");
    let profile = create_mock_profile("leak-01", "AstroBrowser", "windows");

    // Caso A: Proxy com IP público válido de saída
    let flags_with_proxy = build_clearcote_flags(
        &temp_dir,
        &profile,
        Some(9333),
        Some("http://127.0.0.1:8080"),
        Some("198.51.100.99"),
        &[],
        None,
    );
    assert!(flags_with_proxy.iter().any(|f| f == "--webrtc-ip=198.51.100.99"));
    assert!(flags_with_proxy.iter().any(|f| f == "--force-webrtc-ip-handling-policy=disable_non_proxied_udp"));
    assert!(flags_with_proxy.iter().any(|f| f == "--remote-debugging-port=9333"));
    assert!(flags_with_proxy.iter().any(|f| f == "--remote-debugging-address=127.0.0.1"));

    // Caso B: Proxy sem IP numérico direto (ex: string malformatada ou vazia)
    let flags_bad_ip = build_clearcote_flags(
        &temp_dir,
        &profile,
        None,
        Some("http://127.0.0.1:8080"),
        Some("invalid-ip-string"),
        &[],
        None,
    );
    assert!(!flags_bad_ip.iter().any(|f| f.starts_with("--webrtc-ip=")), "IP inválido não deve gerar switch");
    assert!(flags_bad_ip.iter().any(|f| f == "--force-webrtc-ip-handling-policy=disable_non_proxied_udp"));

    let _ = std::fs::remove_dir_all(temp_dir);
}
