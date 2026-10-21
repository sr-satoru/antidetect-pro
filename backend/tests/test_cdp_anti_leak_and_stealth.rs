use std::path::PathBuf;
use serde_json::json;
use star_multlogin_backend::browser::engines::clearcote::flags::build_clearcote_flags;
use star_multlogin_backend::browser::engines::clearcote::preferences::setup_chromium_preferences;
use star_multlogin_backend::camoufox::common::{build_camou_config_map, build_camou_prefs};
use star_multlogin_backend::models::{Profile, ProfileProxyConfig};
use star_multlogin_backend::network::{NetworkSetupResult, ResolvedNetworkIdentity};

fn create_stealth_profile(id: &str, os: &str) -> Profile {
    Profile {
        id: id.to_string(),
        name: format!("Stealth Profile {}", id),
        group: "Security".to_string(),
        tags: vec![],
        notes: String::new(),
        status: "ready".to_string(),
        kernel: "Clearcote".to_string(),
        browser_version: "150".to_string(),
        os: os.to_string(),
        created_at: 1000,
        updated_at: 1000,
        last_launch: None,
        is_deleted: false,
        deleted_at: None,
        proxy: ProfileProxyConfig::default(),
        fingerprint_json: json!({
            "os": os,
            "cpu_cores": 8,
            "device_memory": 16,
            "custom_screen_width": 1920,
            "custom_screen_height": 1080,
            "color_depth": 24,
            "device_pixel_ratio": 1.0,
            "webgl_vendor": "Google Inc. (NVIDIA)",
            "webgl_renderer": "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "custom_timezone": "Europe/London",
            "custom_language": "en-GB,en;q=0.9",
            "location_mode": "custom",
            "custom_latitude": 51.5074,
            "custom_longitude": -0.1278,
            "custom_accuracy": 20.0,
            "webrtc_mode": "substitute"
        }),
        extension_mode: None,
        extension_category: None,
        extensions: None,
    }
}

fn create_mock_network_identity(ip: &str, tz: &str, lat: f64, lon: f64, country: &str) -> ResolvedNetworkIdentity {
    ResolvedNetworkIdentity {
        egress_ip: Some(ip.to_string()),
        timezone: tz.to_string(),
        latitude: lat,
        longitude: lon,
        country_code: country.to_string(),
        primary_language: "de-DE".to_string(),
        accept_languages: "de-DE,de;q=0.9,en;q=0.8".to_string(),
    }
}

// 1. CDP Remote Debugging Address strictly bound to loopback (never 0.0.0.0)
#[test]
fn test_cdp_address_bound_strictly_to_loopback() {
    let profile = create_stealth_profile("cdp_01", "windows");
    let flags = build_clearcote_flags(&PathBuf::from("/tmp/p1"), &profile, Some(9222), None, &[], None, None);
    assert!(flags.contains(&"--remote-debugging-address=127.0.0.1".to_string()));
    assert!(!flags.iter().any(|f| f.contains("0.0.0.0")));
}

// 2. AutomationControlled feature is disabled to suppress navigator.webdriver
#[test]
fn test_cdp_automation_controlled_disabled() {
    let profile = create_stealth_profile("cdp_02", "windows");
    let flags = build_clearcote_flags(&PathBuf::from("/tmp/p2"), &profile, Some(9222), None, &[], None, None);
    assert!(flags.contains(&"--disable-blink-features=AutomationControlled".to_string()));
}

// 3. --enable-automation flag is strictly forbidden
#[test]
fn test_cdp_enable_automation_strictly_forbidden() {
    let profile = create_stealth_profile("cdp_03", "windows");
    let flags = build_clearcote_flags(&PathBuf::from("/tmp/p3"), &profile, Some(9222), None, &[], None, None);
    assert!(!flags.iter().any(|f| f == "--enable-automation" || f.contains("enable-automation")));
}

// 4. No test-type or webdriver flag present
#[test]
fn test_cdp_no_webdriver_or_test_type_flags() {
    let profile = create_stealth_profile("cdp_04", "windows");
    let flags = build_clearcote_flags(&PathBuf::from("/tmp/p4"), &profile, Some(9222), None, &[], None, None);
    assert!(!flags.iter().any(|f| f == "--test-type" || f == "--webdriver"));
}

// 5. Remote allow origins wildcard enabled for local tooling
#[test]
fn test_cdp_remote_allow_origins_wildcard() {
    let profile = create_stealth_profile("cdp_05", "windows");
    let flags = build_clearcote_flags(&PathBuf::from("/tmp/p5"), &profile, Some(9222), None, &[], None, None);
    assert!(flags.contains(&"--remote-allow-origins=*".to_string()));
}

// 6. WebRTC IP rewriting switch present with resolved egress IP
#[test]
fn test_cdp_webrtc_ip_rewriting_present() {
    let profile = create_stealth_profile("cdp_06", "windows");
    let net = create_mock_network_identity("185.220.101.5", "Europe/Berlin", 52.52, 13.405, "DE");
    let flags = build_clearcote_flags(&PathBuf::from("/tmp/p6"), &profile, Some(9222), None, &[], None, Some(&net));
    assert!(flags.contains(&"--webrtc-ip=185.220.101.5".to_string()));
}

// 7. WebRTC UDP policy disables non-proxied UDP to prevent STUN leak
#[test]
fn test_cdp_webrtc_udp_disabled_on_proxy() {
    let profile = create_stealth_profile("cdp_07", "windows");
    let flags = build_clearcote_flags(&PathBuf::from("/tmp/p7"), &profile, Some(9222), Some("http://127.0.0.1:1080"), &[], None, None);
    assert!(flags.contains(&"--force-webrtc-ip-handling-policy=disable_non_proxied_udp".to_string()));
}

// 8. QUIC is disabled on proxy to prevent UDP bypass
#[test]
fn test_cdp_quic_disabled_on_proxy() {
    let profile = create_stealth_profile("cdp_08", "windows");
    let flags = build_clearcote_flags(&PathBuf::from("/tmp/p8"), &profile, Some(9222), Some("http://127.0.0.1:1080"), &[], None, None);
    assert!(flags.contains(&"--disable-quic".to_string()));
}

// 9. Timezone switch receives exact IANA timezone
#[test]
fn test_cdp_timezone_icu_switch() {
    let profile = create_stealth_profile("cdp_09", "windows");
    let net = create_mock_network_identity("185.220.101.5", "Europe/Berlin", 52.52, 13.405, "DE");
    let flags = build_clearcote_flags(&PathBuf::from("/tmp/p9"), &profile, Some(9222), None, &[], None, Some(&net));
    assert!(flags.contains(&"--timezone=Europe/Berlin".to_string()));
}

// 10. Geolocation switch formats coordinates properly
#[test]
fn test_cdp_geolocation_mojo_switch() {
    let profile = create_stealth_profile("cdp_10", "windows");
    let net = create_mock_network_identity("185.220.101.5", "Europe/Berlin", 52.5200, 13.4050, "DE");
    let flags = build_clearcote_flags(&PathBuf::from("/tmp/p10"), &profile, Some(9222), None, &[], None, Some(&net));
    assert!(flags.contains(&"--fingerprint-location=52.520000,13.405000".to_string()));
}

// 11. TLS BoringSSL profile switch set to modern Chrome
#[test]
fn test_cdp_tls_profile_switch() {
    let profile = create_stealth_profile("cdp_11", "windows");
    let flags = build_clearcote_flags(&PathBuf::from("/tmp/p11"), &profile, Some(9222), None, &[], None, None);
    assert!(flags.contains(&"--fingerprint-tls-profile=chrome-150".to_string()));
}

// 12. Preferences JSON disables password manager
#[test]
fn test_cdp_password_manager_disabled_in_preferences() {
    let temp_dir = std::env::temp_dir().join(format!("test_cdp_pm_{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&temp_dir);
    let profile = create_stealth_profile("cdp_12", "windows");
    let net = ResolvedNetworkIdentity::default();

    setup_chromium_preferences(&temp_dir, &profile, &net).unwrap();
    let prefs_file = temp_dir.join("Default").join("Preferences");
    let content = std::fs::read_to_string(&prefs_file).unwrap();
    let val: serde_json::Value = serde_json::from_str(&content).unwrap();

    assert_eq!(val["profile"]["password_manager_enabled"], false);
    let _ = std::fs::remove_dir_all(&temp_dir);
}

// 13. Preferences JSON allows third-party cookies (essential for OAuth/Google SSO)
#[test]
fn test_cdp_cookie_controls_mode_allows_third_party() {
    let temp_dir = std::env::temp_dir().join(format!("test_cdp_cc_{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&temp_dir);
    let profile = create_stealth_profile("cdp_13", "windows");
    let net = ResolvedNetworkIdentity::default();

    setup_chromium_preferences(&temp_dir, &profile, &net).unwrap();
    let prefs_file = temp_dir.join("Default").join("Preferences");
    let content = std::fs::read_to_string(&prefs_file).unwrap();
    let val: serde_json::Value = serde_json::from_str(&content).unwrap();

    assert_eq!(val["profile"]["cookie_controls_mode"], 0);
    let _ = std::fs::remove_dir_all(&temp_dir);
}

// 14. macOS uses mock keychain to prevent keychain dialogs
#[test]
fn test_cdp_mock_keychain_on_macos() {
    let profile = create_stealth_profile("cdp_14", "macos");
    let flags = build_clearcote_flags(&PathBuf::from("/tmp/p14"), &profile, Some(9222), None, &[], None, None);
    assert!(flags.contains(&"--use-mock-keychain".to_string()));
}

// 15. Background mode and renderer backgrounding are disabled
#[test]
fn test_cdp_background_mode_disabled() {
    let profile = create_stealth_profile("cdp_15", "windows");
    let flags = build_clearcote_flags(&PathBuf::from("/tmp/p15"), &profile, Some(9222), None, &[], None, None);
    assert!(flags.contains(&"--disable-background-mode".to_string()));
    assert!(flags.contains(&"--disable-renderer-backgrounding".to_string()));
}

// 16. Privacy sandbox invasive features are disabled
#[test]
fn test_cdp_privacy_sandbox_features_disabled() {
    let profile = create_stealth_profile("cdp_16", "windows");
    let flags = build_clearcote_flags(&PathBuf::from("/tmp/p16"), &profile, Some(9222), None, &[], None, None);
    let disabled = flags.iter().find(|f| f.starts_with("--disable-features=")).unwrap();
    assert!(disabled.contains("BrowsingTopics"));
    assert!(disabled.contains("Fledge"));
    assert!(disabled.contains("InterestGroupStorage"));
    assert!(disabled.contains("PrivateAggregationApi"));
}

// 17. Proxy URL is clean and never leaks plaintext credentials in command line
#[test]
fn test_cdp_credentials_never_in_command_line() {
    let profile = create_stealth_profile("cdp_17", "windows");
    let flags = build_clearcote_flags(&PathBuf::from("/tmp/p17"), &profile, Some(9222), Some("http://127.0.0.1:41234"), &[], None, None);
    let proxy_flag = flags.iter().find(|f| f.starts_with("--proxy-server=")).unwrap();
    assert_eq!(proxy_flag, "--proxy-server=http://127.0.0.1:41234");
    assert!(!proxy_flag.contains('@'));
}

// 18. Ephemeral port allocation is respected in flags
#[test]
fn test_cdp_ephemeral_port_allocation() {
    let profile1 = create_stealth_profile("cdp_18_a", "windows");
    let profile2 = create_stealth_profile("cdp_18_b", "windows");
    let flags1 = build_clearcote_flags(&PathBuf::from("/tmp/p18a"), &profile1, Some(9222), None, &[], None, None);
    let flags2 = build_clearcote_flags(&PathBuf::from("/tmp/p18b"), &profile2, Some(9223), None, &[], None, None);
    assert!(flags1.contains(&"--remote-debugging-port=9222".to_string()));
    assert!(flags2.contains(&"--remote-debugging-port=9223".to_string()));
}

// 19. User data dir isolation
#[test]
fn test_cdp_user_data_dir_isolation() {
    let profile1 = create_stealth_profile("cdp_19_a", "windows");
    let profile2 = create_stealth_profile("cdp_19_b", "windows");
    let flags1 = build_clearcote_flags(&PathBuf::from("/tmp/dir_a"), &profile1, Some(9222), None, &[], None, None);
    let flags2 = build_clearcote_flags(&PathBuf::from("/tmp/dir_b"), &profile2, Some(9223), None, &[], None, None);
    assert!(flags1.contains(&"--user-data-dir=/tmp/dir_a".to_string()));
    assert!(flags2.contains(&"--user-data-dir=/tmp/dir_b".to_string()));
}

// 20. Portable profile flag is present
#[test]
fn test_cdp_portable_profile_flag() {
    let profile = create_stealth_profile("cdp_20", "windows");
    let flags = build_clearcote_flags(&PathBuf::from("/tmp/p20"), &profile, Some(9222), None, &[], None, None);
    assert!(flags.contains(&"--portable-profile".to_string()));
}

// 21. Hide crash restore bubble flag is present
#[test]
fn test_cdp_hide_crash_restore_bubble() {
    let profile = create_stealth_profile("cdp_21", "windows");
    let flags = build_clearcote_flags(&PathBuf::from("/tmp/p21"), &profile, Some(9222), None, &[], None, None);
    assert!(flags.contains(&"--hide-crash-restore-bubble".to_string()));
}

// 22. Camoufox build_camou_config_map injects webrtc:ipv4
#[test]
fn test_camoufox_webrtc_ipv4_environment() {
    let profile = create_stealth_profile("cdp_22", "windows");
    let net = create_mock_network_identity("185.220.101.5", "Europe/Berlin", 52.52, 13.405, "DE");
    let config = build_camou_config_map(&profile, Some("185.220.101.5"), &[], Some(&net));
    assert_eq!(config.get("webrtc:ipv4").unwrap().as_str().unwrap(), "185.220.101.5");
}

// 23. Camoufox build_camou_config_map injects timezone
#[test]
fn test_camoufox_timezone_environment() {
    let profile = create_stealth_profile("cdp_23", "windows");
    let net = create_mock_network_identity("185.220.101.5", "Europe/Berlin", 52.52, 13.405, "DE");
    let config = build_camou_config_map(&profile, Some("185.220.101.5"), &[], Some(&net));
    assert_eq!(config.get("timezone").unwrap().as_str().unwrap(), "Europe/Berlin");
}

// 24. Camoufox build_camou_config_map injects geolocation coordinates
#[test]
fn test_camoufox_geolocation_environment() {
    let profile = create_stealth_profile("cdp_24", "windows");
    let net = create_mock_network_identity("185.220.101.5", "Europe/Berlin", 52.52, 13.405, "DE");
    let config = build_camou_config_map(&profile, Some("185.220.101.5"), &[], Some(&net));
    // Since location_mode is "custom" in create_stealth_profile, custom takes precedence
    assert_eq!(config.get("geolocation:latitude").unwrap().as_f64().unwrap(), 51.5074);
    assert_eq!(config.get("geolocation:longitude").unwrap().as_f64().unwrap(), -0.1278);
}

// 25. Camoufox build_camou_prefs injects requested locale
#[test]
fn test_camoufox_prefs_requested_locale() {
    let profile = create_stealth_profile("cdp_25", "windows");
    let mut net_setup = NetworkSetupResult::default();
    net_setup.resolved_network = create_mock_network_identity("185.220.101.5", "Europe/Berlin", 52.52, 13.405, "DE");
    let prefs = build_camou_prefs(&profile, Some(9222), &net_setup);
    assert_eq!(prefs.get("intl.locale.requested").unwrap().as_str().unwrap(), "de-DE");
    assert_eq!(prefs.get("intl.accept_languages").unwrap().as_str().unwrap(), "de-DE,de;q=0.9,en;q=0.8");
}

// 26. Camoufox build_camou_prefs session restore enabled
#[test]
fn test_camoufox_prefs_session_restore() {
    let profile = create_stealth_profile("cdp_26", "windows");
    let net_setup = NetworkSetupResult::default();
    let prefs = build_camou_prefs(&profile, Some(9222), &net_setup);
    assert_eq!(prefs.get("browser.sessionstore.resume_from_crash").unwrap().as_bool().unwrap(), true);
    assert_eq!(prefs.get("browser.startup.page").unwrap().as_i64().unwrap(), 3);
}

// 27. Camoufox overlay scrollbars on Windows 10 vs Windows 11
#[test]
fn test_camoufox_prefs_overlay_scrollbars_win10() {
    let mut profile = create_stealth_profile("cdp_27", "windows");
    profile.fingerprint_json["user_agent"] = json!("Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:152.0) Gecko/20100101 Firefox/152.0");
    let net_setup = NetworkSetupResult::default();
    let prefs = build_camou_prefs(&profile, Some(9222), &net_setup);
    assert_eq!(prefs.get("ui.useOverlayScrollbars").unwrap().as_i64().unwrap(), 0);
}

// 28. Camoufox overlay scrollbars on Windows 11
#[test]
fn test_camoufox_prefs_overlay_scrollbars_win11() {
    let mut profile = create_stealth_profile("cdp_28", "windows");
    profile.fingerprint_json["user_agent"] = json!("Mozilla/5.0 (Windows NT 10.0; Win64; x64; Windows 11; rv:152.0) Gecko/20100101 Firefox/152.0");
    let net_setup = NetworkSetupResult::default();
    let prefs = build_camou_prefs(&profile, Some(9222), &net_setup);
    assert_eq!(prefs.get("ui.useOverlayScrollbars").unwrap().as_i64().unwrap(), 1);
}

// 29. Camoufox bundled fonts activated
#[test]
fn test_camoufox_prefs_bundled_fonts_activated() {
    let profile = create_stealth_profile("cdp_29", "windows");
    let net_setup = NetworkSetupResult::default();
    let prefs = build_camou_prefs(&profile, Some(9222), &net_setup);
    assert_eq!(prefs.get("gfx.bundled-fonts.activate").unwrap().as_i64().unwrap(), 1);
}

// 30. Camoufox linux font fallback async disabled to prevent missing glyphs
#[test]
fn test_camoufox_linux_font_fallback_async_disabled() {
    let profile = create_stealth_profile("cdp_30", "linux");
    let net_setup = NetworkSetupResult::default();
    let prefs = build_camou_prefs(&profile, Some(9222), &net_setup);
    assert_eq!(prefs.get("gfx.font_rendering.fallback.async").unwrap().as_bool().unwrap(), false);
}

// 31. Password manager prompt disabled in Camoufox prefs
#[test]
fn test_camoufox_prefs_silent_dialogs() {
    let profile = create_stealth_profile("cdp_31", "windows");
    let net_setup = NetworkSetupResult::default();
    let prefs = build_camou_prefs(&profile, Some(9222), &net_setup);
    assert_eq!(prefs.get("browser.shell.checkDefaultBrowser").unwrap().as_bool().unwrap(), false);
    assert_eq!(prefs.get("browser.warnOnQuit").unwrap().as_bool().unwrap(), false);
    assert_eq!(prefs.get("browser.aboutwelcome.enabled").unwrap().as_bool().unwrap(), false);
    assert_eq!(prefs.get("browser.tabs.warnOnClose").unwrap().as_bool().unwrap(), false);
}

// 32. Simulated CDP /json/version endpoint deserialization
#[test]
fn test_cdp_json_version_endpoint_structure() {
    let raw = r#"{
        "Browser": "Chrome/150.0.7871.114",
        "Protocol-Version": "1.3",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
        "V8-Version": "12.8.374.16",
        "WebKit-Version": "537.36 (@d4b31a54b9d0)",
        "webSocketDebuggerUrl": "ws://127.0.0.1:9222/devtools/browser/a89f-1234"
    }"#;
    let val: serde_json::Value = serde_json::from_str(raw).unwrap();
    let ws_url = val["webSocketDebuggerUrl"].as_str().unwrap();
    assert!(ws_url.starts_with("ws://127.0.0.1:"));
    assert!(ws_url.contains("/devtools/browser/"));
}

// 33. Simulated CDP /json/list endpoint deserialization
#[test]
fn test_cdp_json_list_endpoint_structure() {
    let raw = r#"[{
        "description": "",
        "devtoolsFrontendUrl": "/devtools/inspector.html?ws=127.0.0.1:9222/devtools/page/D5F4",
        "id": "D5F4",
        "title": "about:blank",
        "type": "page",
        "url": "about:blank",
        "webSocketDebuggerUrl": "ws://127.0.0.1:9222/devtools/page/D5F4"
    }]"#;
    let list: Vec<serde_json::Value> = serde_json::from_str(raw).unwrap();
    assert_eq!(list.len(), 1);
    assert_eq!(list[0]["type"], "page");
    assert_eq!(list[0]["url"], "about:blank");
}

// 34. Clearcote Farble seed determinism
#[test]
fn test_cdp_farble_seed_determinism() {
    let profile = create_stealth_profile("deterministic_seed", "windows");
    let flags1 = build_clearcote_flags(&PathBuf::from("/tmp/p34_1"), &profile, Some(9222), None, &[], None, None);
    let flags2 = build_clearcote_flags(&PathBuf::from("/tmp/p34_2"), &profile, Some(9222), None, &[], None, None);
    let seed1 = flags1.iter().find(|f| f.starts_with("--fingerprint=")).unwrap();
    let seed2 = flags2.iter().find(|f| f.starts_with("--fingerprint=")).unwrap();
    assert_eq!(seed1, seed2);
}

// 35. Stealth flags order consistency
#[test]
fn test_cdp_stealth_flags_order_consistency() {
    let profile = create_stealth_profile("order_check", "windows");
    let flags = build_clearcote_flags(&PathBuf::from("/tmp/p35"), &profile, Some(9222), None, &[], None, None);
    let user_data_idx = flags.iter().position(|f| f.starts_with("--user-data-dir=")).unwrap();
    let cdp_port_idx = flags.iter().position(|f| f.starts_with("--remote-debugging-port=")).unwrap();
    let cdp_addr_idx = flags.iter().position(|f| f.starts_with("--remote-debugging-address=")).unwrap();
    assert!(user_data_idx < cdp_port_idx);
    assert_eq!(cdp_port_idx + 1, cdp_addr_idx);
}
