use star_multlogin_backend::camoufox::common::{build_camou_config_map, build_camou_prefs};
use star_multlogin_backend::models::{Profile, ProfileProxyConfig};
use star_multlogin_backend::network::NetworkSetupResult;

#[test]
fn test_windows_fingerprint_translation() {
    let profile = Profile {
        id: "test-prof-windows".to_string(),
        name: "Test Windows".to_string(),
        group: "Default".to_string(),
        tags: vec![],
        notes: "".to_string(),
        status: "ready".to_string(),
        kernel: "Camoufox".to_string(),
        browser_version: "150".to_string(),
        os: "windows".to_string(),
        created_at: 100,
        updated_at: 100,
        last_launch: None,
        is_deleted: false,
        deleted_at: None,
        proxy: ProfileProxyConfig::default(),
        fingerprint_json: serde_json::json!({
            "os": "windows",
            "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:150.0) Gecko/20100101 Firefox/150.0",
            "cpu_cores": 16,
            "custom_screen_width": 2560,
            "custom_screen_height": 1440,
            "webgl_vendor": "Google Inc. (NVIDIA)",
            "webgl_renderer": "ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "canvas_seed": "1CCAE86B",
            "custom_timezone": "America/Sao_Paulo",
            "custom_language": "pt-BR,pt;q=0.9,en-US;q=0.8"
        }),
        extension_mode: None,
        extension_category: None,
        extensions: None,
    };

    let cfg = build_camou_config_map(&profile, Some("192.168.1.50"), &[]);
    let net_setup = NetworkSetupResult::default();
    let prefs = build_camou_prefs(&profile, None, &net_setup);

    assert_eq!(cfg.get("navigator.platform").unwrap(), "Win32");
    assert_eq!(cfg.get("navigator.oscpu").unwrap(), "Windows NT 10.0; Win64; x64");
    assert_eq!(cfg.get("navigator.hardwareConcurrency").unwrap(), 16);
    assert_eq!(cfg.get("screen.width").unwrap(), 2560);
    assert_eq!(cfg.get("screen.height").unwrap(), 1440);
    assert_eq!(cfg.get("screen.availHeight").unwrap(), 1400); // 1440 - 40 taskbar
    assert_eq!(cfg.get("webGl:vendor").unwrap(), "Google Inc. (NVIDIA)");
    assert_eq!(cfg.get("timezone").unwrap(), "America/Sao_Paulo");
    assert_eq!(cfg.get("webrtc:ipv4").unwrap(), "192.168.1.50");

    // Seed hexadecimal "1CCAE86B" convertida para inteiro positivo
    let seed = cfg.get("canvas:seed").unwrap().as_u64().unwrap();
    assert_eq!(seed, 0x1CCAE86B);

    // Valida injeção nativa em memória no CAMOU_PREFS (zero user.js)
    assert_eq!(prefs.get("dom.maxHardwareConcurrency").unwrap(), &serde_json::Value::Number(16.into()));
    assert_eq!(prefs.get("intl.locale.requested").unwrap(), "pt-BR");
    assert_eq!(prefs.get("privacy.resistFingerprinting").unwrap(), &serde_json::Value::Bool(false));
}

#[test]
fn test_macos_fingerprint_translation() {
    let profile = Profile {
        id: "test-prof-mac".to_string(),
        name: "Test Mac".to_string(),
        group: "Default".to_string(),
        tags: vec![],
        notes: "".to_string(),
        status: "ready".to_string(),
        kernel: "Camoufox".to_string(),
        browser_version: "150".to_string(),
        os: "macos".to_string(),
        created_at: 100,
        updated_at: 100,
        last_launch: None,
        is_deleted: false,
        deleted_at: None,
        proxy: ProfileProxyConfig::default(),
        fingerprint_json: serde_json::json!({
            "os": "macos",
            "cpu_cores": 10,
            "webgl_vendor": "Apple",
            "webgl_renderer": "Apple M2"
        }),
        extension_mode: None,
        extension_category: None,
        extensions: None,
    };

    let cfg = build_camou_config_map(&profile, None, &[]);
    let net_setup = NetworkSetupResult::default();
    let prefs = build_camou_prefs(&profile, None, &net_setup);

    assert_eq!(cfg.get("navigator.platform").unwrap(), "MacIntel");
    assert_eq!(cfg.get("navigator.oscpu").unwrap(), "Intel Mac OS X 10.15");
    assert_eq!(cfg.get("navigator.hardwareConcurrency").unwrap(), 10);
    assert_eq!(cfg.get("webGl:vendor").unwrap(), "Apple");
    assert_eq!(cfg.get("webGl:renderer").unwrap(), "Apple M2");
    assert_eq!(prefs.get("dom.maxHardwareConcurrency").unwrap(), &serde_json::Value::Number(10.into()));
}

#[test]
fn test_android_fingerprint_translation() {
    let profile = Profile {
        id: "test-prof-android".to_string(),
        name: "Test Android".to_string(),
        group: "Default".to_string(),
        tags: vec![],
        notes: "".to_string(),
        status: "ready".to_string(),
        kernel: "Camoufox".to_string(),
        browser_version: "150".to_string(),
        os: "android".to_string(),
        created_at: 100,
        updated_at: 100,
        last_launch: None,
        is_deleted: false,
        deleted_at: None,
        proxy: ProfileProxyConfig::default(),
        fingerprint_json: serde_json::json!({
            "os": "android",
            "user_agent": "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Mobile Safari/537.36",
            "cpu_cores": 8
        }),
        extension_mode: None,
        extension_category: None,
        extensions: None,
    };

    let cfg = build_camou_config_map(&profile, None, &[]);

    assert_eq!(cfg.get("navigator.platform").unwrap(), "Linux armv8l");
    assert_eq!(cfg.get("navigator.oscpu").unwrap(), "Linux armv8l");
    assert_eq!(cfg.get("navigator.maxTouchPoints").unwrap(), 5);
    assert_eq!(cfg.get("webGl:vendor").unwrap(), "Qualcomm");
}

#[test]
fn test_ios_fingerprint_translation() {
    let profile = Profile {
        id: "test-prof-ios".to_string(),
        name: "Test iOS".to_string(),
        group: "Default".to_string(),
        tags: vec![],
        notes: "".to_string(),
        status: "ready".to_string(),
        kernel: "Camoufox".to_string(),
        browser_version: "150".to_string(),
        os: "ios".to_string(),
        created_at: 100,
        updated_at: 100,
        last_launch: None,
        is_deleted: false,
        deleted_at: None,
        proxy: ProfileProxyConfig::default(),
        fingerprint_json: serde_json::json!({
            "os": "ios",
            "user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
            "cpu_cores": 6
        }),
        extension_mode: None,
        extension_category: None,
        extensions: None,
    };

    let cfg = build_camou_config_map(&profile, None, &[]);

    assert_eq!(cfg.get("navigator.platform").unwrap(), "iPhone");
    assert_eq!(cfg.get("navigator.oscpu").unwrap(), "");
    assert_eq!(cfg.get("navigator.maxTouchPoints").unwrap(), 5);
    assert_eq!(cfg.get("webGl:vendor").unwrap(), "Apple");
}

#[test]
fn test_webrtc_mode_and_ipv4_validation() {
    let base_profile = Profile {
        id: "test-prof-webrtc".to_string(),
        name: "Test WebRTC".to_string(),
        group: "Default".to_string(),
        tags: vec![],
        notes: "".to_string(),
        status: "ready".to_string(),
        kernel: "Camoufox".to_string(),
        browser_version: "150".to_string(),
        os: "windows".to_string(),
        created_at: 100,
        updated_at: 100,
        last_launch: None,
        is_deleted: false,
        deleted_at: None,
        proxy: ProfileProxyConfig::default(),
        fingerprint_json: serde_json::json!({
            "webrtc_mode": "substitute"
        }),
        extension_mode: None,
        extension_category: None,
        extensions: None,
    };

    // 1. IP válido (IPv4) com substitute: deve injetar no webrtc:ipv4
    let cfg_valid = build_camou_config_map(&base_profile, Some("185.220.101.5"), &[]);
    assert_eq!(cfg_valid.get("webrtc:ipv4").unwrap(), "185.220.101.5");

    // 2. Hostname/domínio (não é IPv4): NUNCA deve injetar string inválida que quebra o C++ inet_pton
    let cfg_domain = build_camou_config_map(&base_profile, Some("proxy.provider.com"), &[]);
    assert!(cfg_domain.get("webrtc:ipv4").is_none());

    // 3. webrtc_mode == disabled: não deve injetar no CAMOU_CONFIG
    let mut disabled_profile = base_profile.clone();
    disabled_profile.fingerprint_json = serde_json::json!({ "webrtc_mode": "disabled" });
    let cfg_disabled = build_camou_config_map(&disabled_profile, Some("185.220.101.5"), &[]);
    assert!(cfg_disabled.get("webrtc:ipv4").is_none());
}

#[test]
fn test_hardware_noise_gating() {
    let mut profile = Profile {
        id: "test-prof-noise".to_string(),
        name: "Test Noise".to_string(),
        group: "Default".to_string(),
        tags: vec![],
        notes: "".to_string(),
        status: "ready".to_string(),
        kernel: "Camoufox".to_string(),
        browser_version: "150".to_string(),
        os: "windows".to_string(),
        created_at: 100,
        updated_at: 100,
        last_launch: None,
        is_deleted: false,
        deleted_at: None,
        proxy: ProfileProxyConfig::default(),
        fingerprint_json: serde_json::json!({
            "hardware_noise": {
                "canvas": false,
                "audio_context": false,
                "client_rects": false,
                "media_devices": false
            }
        }),
        extension_mode: None,
        extension_category: None,
        extensions: None,
    };

    let cfg = build_camou_config_map(&profile, None, &[]);

    // Com noise desativado, seeds não devem ser injetadas
    assert!(cfg.get("canvas:seed").is_none());
    assert!(cfg.get("audio:seed").is_none());
    assert!(cfg.get("fonts:spacing_seed").is_none());
    assert_eq!(cfg.get("mediaDevices:enabled").unwrap(), false);

    // Agora com noise ativado
    profile.fingerprint_json = serde_json::json!({
        "hardware_noise": {
            "canvas": true,
            "audio_context": true,
            "client_rects": true,
            "media_devices": true
        }
    });
    let cfg_enabled = build_camou_config_map(&profile, None, &[]);
    assert!(cfg_enabled.get("canvas:seed").is_some());
    assert!(cfg_enabled.get("audio:seed").is_some());
    assert!(cfg_enabled.get("fonts:spacing_seed").is_some());
    assert_eq!(cfg_enabled.get("mediaDevices:enabled").unwrap(), true);
}

#[test]
fn test_advanced_segmentations() {
    let profile = Profile {
        id: "test-prof-seg".to_string(),
        name: "Test Segmentations".to_string(),
        group: "Default".to_string(),
        tags: vec![],
        notes: "".to_string(),
        status: "ready".to_string(),
        kernel: "Camoufox".to_string(),
        browser_version: "150".to_string(),
        os: "windows".to_string(),
        created_at: 100,
        updated_at: 100,
        last_launch: None,
        is_deleted: false,
        deleted_at: None,
        proxy: ProfileProxyConfig::default(),
        fingerprint_json: serde_json::json!({
            "webgpu_mode": "block",
            "battery_mode": "block",
            "location_mode": "custom",
            "custom_latitude": -23.5505,
            "custom_longitude": -46.6333,
            "custom_accuracy": 20.0,
            "do_not_track_mode": "open",
            "disable_tls_features": "open"
        }),
        extension_mode: None,
        extension_category: None,
        extensions: None,
    };

    let cfg = build_camou_config_map(&profile, None, &[]);
    let net_setup = NetworkSetupResult::default();
    let prefs = build_camou_prefs(&profile, None, &net_setup);

    // Preferências em memória CAMOU_PREFS
    assert_eq!(prefs.get("dom.webgpu.enabled").unwrap(), &serde_json::Value::Bool(false));
    assert_eq!(prefs.get("dom.battery.enabled").unwrap(), &serde_json::Value::Bool(false));
    assert_eq!(prefs.get("privacy.donottrackheader.enabled").unwrap(), &serde_json::Value::Bool(true));
    assert_eq!(prefs.get("security.tls.enable_0rtt_data").unwrap(), &serde_json::Value::Bool(false));
    assert_eq!(prefs.get("privacy.resistFingerprinting").unwrap(), &serde_json::Value::Bool(false));

    // Geolocation plana no C++ CAMOU_CONFIG
    assert_eq!(cfg.get("geolocation:latitude").unwrap(), -23.5505);
    assert_eq!(cfg.get("geolocation:longitude").unwrap(), -46.6333);
    assert_eq!(cfg.get("geolocation:accuracy").unwrap(), 20.0);
    assert_eq!(prefs.get("permissions.default.geo").unwrap(), &serde_json::Value::Number(1.into()));
}

#[test]
fn test_media_devices_and_labels() {
    let profile = Profile {
        id: "test-prof-media".to_string(),
        name: "Test Media Devices".to_string(),
        group: "Default".to_string(),
        tags: vec![],
        notes: "".to_string(),
        status: "ready".to_string(),
        kernel: "Camoufox".to_string(),
        browser_version: "150".to_string(),
        os: "windows".to_string(),
        created_at: 100,
        updated_at: 100,
        last_launch: None,
        is_deleted: false,
        deleted_at: None,
        proxy: ProfileProxyConfig::default(),
        fingerprint_json: serde_json::json!({
            "hardware_noise": {
                "media_devices": true
            },
            "micros_count": 2,
            "speakers_count": 2,
            "webcams_count": 1
        }),
        extension_mode: None,
        extension_category: None,
        extensions: None,
    };

    let cfg = build_camou_config_map(&profile, None, &[]);

    assert_eq!(cfg.get("mediaDevices:enabled").unwrap(), true);
    assert_eq!(cfg.get("mediaDevices:micros").unwrap().as_u64().unwrap(), 2);
    assert_eq!(cfg.get("mediaDevices:speakers").unwrap().as_u64().unwrap(), 2);
    assert_eq!(cfg.get("mediaDevices:webcams").unwrap().as_u64().unwrap(), 1);

    // Valida que os rótulos e groupIds não estão vazios
    let micro_labels = cfg.get("mediaDevices:microLabels").unwrap().as_array().unwrap();
    let micro_groups = cfg.get("mediaDevices:microGroups").unwrap().as_array().unwrap();
    let speaker_labels = cfg.get("mediaDevices:speakerLabels").unwrap().as_array().unwrap();
    let speaker_groups = cfg.get("mediaDevices:speakerGroups").unwrap().as_array().unwrap();
    let webcam_labels = cfg.get("mediaDevices:webcamLabels").unwrap().as_array().unwrap();
    let webcam_groups = cfg.get("mediaDevices:webcamGroups").unwrap().as_array().unwrap();

    assert_eq!(micro_labels.len(), 2);
    assert_eq!(micro_groups.len(), 2);
    assert_eq!(speaker_labels.len(), 2);
    assert_eq!(speaker_groups.len(), 2);
    assert_eq!(webcam_labels.len(), 1);
    assert_eq!(webcam_groups.len(), 1);

    // Rótulos de áudio reais no Windows (ex: Realtek / High Definition Audio)
    let spk_0 = speaker_labels[0].as_str().unwrap();
    assert!(spk_0.contains("Audio") || spk_0.contains("Speakers"));
}

#[test]
fn test_font_subset_determinism() {
    let profile_a = Profile {
        id: "profile-alpha-123".to_string(),
        name: "Profile Alpha".to_string(),
        group: "Default".to_string(),
        tags: vec![],
        notes: "".to_string(),
        status: "ready".to_string(),
        kernel: "Camoufox".to_string(),
        browser_version: "150".to_string(),
        os: "windows".to_string(),
        created_at: 100,
        updated_at: 100,
        last_launch: None,
        is_deleted: false,
        deleted_at: None,
        proxy: ProfileProxyConfig::default(),
        fingerprint_json: serde_json::json!({ "os": "windows" }),
        extension_mode: None,
        extension_category: None,
        extensions: None,
    };

    let cfg_a1 = build_camou_config_map(&profile_a, None, &[]);
    let cfg_a2 = build_camou_config_map(&profile_a, None, &[]);

    let fonts_a1 = cfg_a1.get("fonts").unwrap().as_array().unwrap();
    let fonts_a2 = cfg_a2.get("fonts").unwrap().as_array().unwrap();

    // 1. O mesmo perfil sempre gera a MESMA lista de fontes (determinismo 100%)
    assert_eq!(fonts_a1, fonts_a2);

    // 2. Perfis diferentes geram listas diferentes de fontes
    let mut profile_b = profile_a.clone();
    profile_b.id = "profile-beta-999".to_string();
    let cfg_b = build_camou_config_map(&profile_b, None, &[]);
    let fonts_b = cfg_b.get("fonts").unwrap().as_array().unwrap();

    assert_ne!(fonts_a1, fonts_b);

    // 3. Mas ambos contêm fontes base essenciais de UI do Windows
    let fonts_a_set: std::collections::HashSet<_> = fonts_a1.iter().filter_map(|v| v.as_str()).collect();
    assert!(fonts_a_set.contains("Arial"));
    assert!(fonts_a_set.contains("Segoe UI"));
    assert!(fonts_a_set.contains("Calibri"));
}

#[test]
fn test_network_ipv6_leak_prevention() {
    let profile = Profile {
        id: "test-prof-proxy".to_string(),
        name: "Test Proxy".to_string(),
        group: "Default".to_string(),
        tags: vec![],
        notes: "".to_string(),
        status: "ready".to_string(),
        kernel: "Camoufox".to_string(),
        browser_version: "150".to_string(),
        os: "windows".to_string(),
        created_at: 100,
        updated_at: 100,
        last_launch: None,
        is_deleted: false,
        deleted_at: None,
        proxy: ProfileProxyConfig {
            mode: "custom".to_string(),
            proxy_type: "http".to_string(),
            host: Some("1.2.3.4".to_string()),
            port: Some(8080),
            username: None,
            password: None,
            rotation_url: None,
            ip_checker: None,
            socks_remote_dns: true,
        },
        fingerprint_json: serde_json::json!({}),
        extension_mode: None,
        extension_category: None,
        extensions: None,
    };

    let net_setup = NetworkSetupResult::default();
    let prefs = build_camou_prefs(&profile, None, &net_setup);

    // Proteção contra vazamento de IPv6 ativada
    assert_eq!(prefs.get("network.dns.disableIPv6").unwrap(), &serde_json::Value::Bool(true));
}

#[test]
fn test_scrollbar_and_linux_font_fallback() {
    // Windows 10 clássico -> ui.useOverlayScrollbars = 0
    let win10_profile = Profile {
        id: "test-prof-win10".to_string(),
        name: "Test Win10".to_string(),
        group: "Default".to_string(),
        tags: vec![],
        notes: "".to_string(),
        status: "ready".to_string(),
        kernel: "Camoufox".to_string(),
        browser_version: "150".to_string(),
        os: "windows".to_string(),
        created_at: 100,
        updated_at: 100,
        last_launch: None,
        is_deleted: false,
        deleted_at: None,
        proxy: ProfileProxyConfig::default(),
        fingerprint_json: serde_json::json!({
            "os": "windows",
            "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:150.0) Gecko/20100101 Firefox/150.0"
        }),
        extension_mode: None,
        extension_category: None,
        extensions: None,
    };

    let net_setup = NetworkSetupResult::default();
    let prefs_win10 = build_camou_prefs(&win10_profile, None, &net_setup);
    assert_eq!(prefs_win10.get("ui.useOverlayScrollbars").unwrap(), &serde_json::Value::Number(0.into()));

    // Linux -> gfx.font_rendering.fallback.async = false e ui.useOverlayScrollbars = 1
    let mut linux_profile = win10_profile.clone();
    linux_profile.os = "linux".to_string();
    linux_profile.fingerprint_json = serde_json::json!({
        "os": "linux",
        "user_agent": "Mozilla/5.0 (X11; Linux x86_64; rv:150.0) Gecko/20100101 Firefox/150.0"
    });

    let prefs_linux = build_camou_prefs(&linux_profile, None, &net_setup);
    assert_eq!(prefs_linux.get("ui.useOverlayScrollbars").unwrap(), &serde_json::Value::Number(1.into()));
    assert_eq!(prefs_linux.get("gfx.font_rendering.fallback.async").unwrap(), &serde_json::Value::Bool(false));
}
