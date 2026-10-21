use std::path::PathBuf;
use serde_json::json;
use star_multlogin_backend::browser::engines::clearcote::flags::build_clearcote_flags;
use star_multlogin_backend::camoufox::common::build_camou_config_map;
use star_multlogin_backend::models::{Profile, ProfileProxyConfig};
use star_multlogin_backend::network::country_to_locale_and_languages;

fn create_matrix_profile(id: &str, os: &str, fp_override: serde_json::Value) -> Profile {
    let mut base_fp = json!({
        "os": os,
        "cpu_cores": 8,
        "device_memory": 16,
        "custom_screen_width": 1920,
        "custom_screen_height": 1080,
        "color_depth": 24,
        "device_pixel_ratio": 1.0,
        "webgl_vendor": "Google Inc. (NVIDIA)",
        "webgl_renderer": "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)",
        "custom_timezone": "America/New_York",
        "custom_language": "en-US,en;q=0.9",
        "location_mode": "custom",
        "custom_latitude": 40.7128,
        "custom_longitude": -74.0060,
        "custom_accuracy": 20.0,
        "webrtc_mode": "substitute"
    });

    if let (Some(base_obj), Some(over_obj)) = (base_fp.as_object_mut(), fp_override.as_object()) {
        for (k, v) in over_obj {
            base_obj.insert(k.clone(), v.clone());
        }
    }

    Profile {
        id: id.to_string(),
        name: format!("Parity Profile {}", id),
        group: "Matrix".to_string(),
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
        fingerprint_json: base_fp,
        extension_mode: None,
        extension_category: None,
        extensions: None,
    }
}

// 1..5 Hardware Concurrency (CPU Cores) Matrix for Clearcote
#[test]
fn test_matrix_cpu_cores_clearcote_2_to_64() {
    for cores in [2, 4, 6, 8, 12, 16, 24, 32, 64] {
        let profile = create_matrix_profile("cores_cc", "windows", json!({ "cpu_cores": cores }));
        let flags = build_clearcote_flags(&PathBuf::from("/tmp/p"), &profile, None, None, &[], None, None);
        assert!(flags.contains(&format!("--fingerprint-hardware-concurrency={}", cores)));
    }
}

// 6..10 Hardware Concurrency (CPU Cores) Matrix for Camoufox
#[test]
fn test_matrix_cpu_cores_camoufox_2_to_64() {
    for cores in [2, 4, 6, 8, 12, 16, 24, 32, 64] {
        let profile = create_matrix_profile("cores_cf", "windows", json!({ "cpu_cores": cores }));
        let config = build_camou_config_map(&profile, None, &[], None);
        assert_eq!(config.get("navigator.hardwareConcurrency").unwrap().as_u64().unwrap(), cores);
    }
}

// 11. Device Memory Matrix for Clearcote
#[test]
fn test_matrix_device_memory_clearcote() {
    for ram in [2, 4, 8, 16, 32, 64] {
        let profile = create_matrix_profile("mem_cc", "windows", json!({ "device_memory": ram }));
        let flags = build_clearcote_flags(&PathBuf::from("/tmp/p"), &profile, None, None, &[], None, None);
        assert!(flags.contains(&format!("--fingerprint-device-memory={}", ram)));
    }
}

// 12. Screen Resolution Matrix for Clearcote (Windows 40px taskbar subtraction)
#[test]
fn test_matrix_screen_resolution_clearcote_windows_taskbar() {
    let resolutions = [
        (1366, 768, 728),
        (1440, 900, 860),
        (1600, 900, 860),
        (1920, 1080, 1040),
        (2560, 1440, 1400),
        (3840, 2160, 2120),
    ];

    for (w, h, expected_avail_h) in resolutions {
        let profile = create_matrix_profile("res_win", "windows", json!({
            "custom_screen_width": w,
            "custom_screen_height": h
        }));
        let flags = build_clearcote_flags(&PathBuf::from("/tmp/p"), &profile, None, None, &[], None, None);
        assert!(flags.contains(&format!("--fingerprint-screen-width={}", w)));
        assert!(flags.contains(&format!("--fingerprint-screen-height={}", h)));
        assert!(flags.contains(&format!("--fingerprint-avail-width={}", w)));
        assert!(flags.contains(&format!("--fingerprint-avail-height={}", expected_avail_h)));
    }
}

// 13. Screen Resolution Matrix for Camoufox (Windows 40px taskbar subtraction)
#[test]
fn test_matrix_screen_resolution_camoufox_windows_taskbar() {
    let resolutions = [
        (1366, 768, 728),
        (1920, 1080, 1040),
        (2560, 1440, 1400),
    ];

    for (w, h, expected_avail_h) in resolutions {
        let profile = create_matrix_profile("res_cf_win", "windows", json!({
            "custom_screen_width": w,
            "custom_screen_height": h
        }));
        let config = build_camou_config_map(&profile, None, &[], None);
        assert_eq!(config.get("screen.width").unwrap().as_u64().unwrap(), w);
        assert_eq!(config.get("screen.height").unwrap().as_u64().unwrap(), h);
        assert_eq!(config.get("screen.availHeight").unwrap().as_u64().unwrap(), expected_avail_h);
    }
}

// 14. Screen Resolution Matrix for macOS (No 40px taskbar deduction on macOS)
#[test]
fn test_matrix_screen_resolution_clearcote_macos_full_height() {
    let profile = create_matrix_profile("res_mac", "macos", json!({
        "custom_screen_width": 2560,
        "custom_screen_height": 1600
    }));
    let flags = build_clearcote_flags(&PathBuf::from("/tmp/p"), &profile, None, None, &[], None, None);
    assert!(flags.contains(&"--fingerprint-screen-width=2560".to_string()));
    assert!(flags.contains(&"--fingerprint-screen-height=1600".to_string()));
    assert!(flags.contains(&"--fingerprint-avail-height=1600".to_string()));
}

// 15. Device Pixel Ratio Matrix
#[test]
fn test_matrix_device_pixel_ratio() {
    for (dpr, formatted) in [(1.0, "1.00"), (1.25, "1.25"), (1.5, "1.50"), (2.0, "2.00")] {
        let profile = create_matrix_profile("dpr", "windows", json!({ "device_pixel_ratio": dpr }));
        let flags = build_clearcote_flags(&PathBuf::from("/tmp/p"), &profile, None, None, &[], None, None);
        assert!(flags.contains(&format!("--fingerprint-device-pixel-ratio={}", formatted)));
    }
}

// 16. Color Depth Matrix
#[test]
fn test_matrix_color_depth() {
    for depth in [24, 30, 32] {
        let profile = create_matrix_profile("depth", "windows", json!({ "color_depth": depth }));
        let flags = build_clearcote_flags(&PathBuf::from("/tmp/p"), &profile, None, None, &[], None, None);
        assert!(flags.contains(&format!("--fingerprint-color-depth={}", depth)));
    }
}

// 17. Max Touch Points Matrix
#[test]
fn test_matrix_max_touch_points() {
    for tp in [0, 1, 5, 10] {
        let profile = create_matrix_profile("touch", "windows", json!({ "max_touch_points": tp }));
        let flags = build_clearcote_flags(&PathBuf::from("/tmp/p"), &profile, None, None, &[], None, None);
        assert!(flags.contains(&format!("--fingerprint-max-touch-points={}", tp)));
    }
}

// 18. WebGL NVIDIA GeForce on Windows
#[test]
fn test_matrix_webgl_nvidia_windows() {
    let profile = create_matrix_profile("gpu_nv", "windows", json!({
        "webgl_vendor": "Google Inc. (NVIDIA)",
        "webgl_renderer": "ANGLE (NVIDIA, NVIDIA GeForce RTX 4090 Direct3D11 vs_5_0 ps_5_0, D3D11)"
    }));
    let flags = build_clearcote_flags(&PathBuf::from("/tmp/p"), &profile, None, None, &[], None, None);
    assert!(flags.contains(&"--fingerprint-gpu-vendor=Google Inc. (NVIDIA)".to_string()));
    assert!(flags.contains(&"--fingerprint-gpu-renderer=ANGLE (NVIDIA, NVIDIA GeForce RTX 4090 Direct3D11 vs_5_0 ps_5_0, D3D11)".to_string()));
}

// 19. WebGL Apple Metal on macOS
#[test]
fn test_matrix_webgl_apple_macos() {
    let profile = create_matrix_profile("gpu_apple", "macos", json!({
        "webgl_vendor": "Apple",
        "webgl_renderer": "Apple M3 Pro"
    }));
    let flags = build_clearcote_flags(&PathBuf::from("/tmp/p"), &profile, None, None, &[], None, None);
    assert!(flags.contains(&"--fingerprint-gpu-vendor=Apple".to_string()));
    assert!(flags.contains(&"--fingerprint-gpu-renderer=Apple M3 Pro".to_string()));
}

// 20. WebGL Linux Mesa normalization with ", or similar" suffix in Camoufox
#[test]
fn test_matrix_webgl_linux_camoufox_normalization() {
    let profile = create_matrix_profile("gpu_lin", "linux", json!({
        "webgl_vendor": "Google Inc. (Intel)",
        "webgl_renderer": "Mesa Intel(R) Xe Graphics (TGL GT2)"
    }));
    let config = build_camou_config_map(&profile, None, &[], None);
    let renderer = config.get("webGl:renderer").unwrap().as_str().unwrap();
    assert!(renderer.ends_with(", or similar"));
}

// 21. Audio Sample Rate Matrix (44100 vs 48000)
#[test]
fn test_matrix_audio_sample_rate() {
    for rate in [44100, 48000, 96000] {
        let profile = create_matrix_profile("audio_rate", "windows", json!({ "audio_sample_rate": rate }));
        let config = build_camou_config_map(&profile, None, &[], None);
        assert_eq!(config.get("AudioContext:sampleRate").unwrap().as_u64().unwrap(), rate);
    }
}

// 22. Client Rects Seed to Font Spacing Seed
#[test]
fn test_matrix_client_rects_seed() {
    let profile = create_matrix_profile("rects", "windows", json!({ "client_rects_seed": "AABBCCDD" }));
    let config = build_camou_config_map(&profile, None, &[], None);
    assert!(config.contains_key("fonts:spacing_seed"));
}

// 23. Media Devices Counts
#[test]
fn test_matrix_media_devices_counts() {
    let profile = create_matrix_profile("media_dev", "windows", json!({
        "micros_count": 2,
        "speakers_count": 2,
        "webcams_count": 1
    }));
    let config = build_camou_config_map(&profile, None, &[], None);
    assert_eq!(config.get("mediaDevices:micros").unwrap().as_u64().unwrap(), 2);
    assert_eq!(config.get("mediaDevices:speakers").unwrap().as_u64().unwrap(), 2);
    assert_eq!(config.get("mediaDevices:webcams").unwrap().as_u64().unwrap(), 1);
    assert!(config.get("mediaDevices:microLabels").unwrap().as_array().unwrap().len() >= 2);
    assert!(config.get("mediaDevices:speakerLabels").unwrap().as_array().unwrap().len() >= 2);
}

// 24. Hardware Noise Gating: Canvas disabled
#[test]
fn test_matrix_hardware_noise_canvas_disabled() {
    let profile = create_matrix_profile("noise_c_off", "windows", json!({
        "hardware_noise": { "canvas": false, "audio_context": true, "media_devices": true }
    }));
    let config = build_camou_config_map(&profile, None, &[], None);
    assert!(!config.contains_key("canvas:seed"));
}

// 25. Hardware Noise Gating: Audio disabled
#[test]
fn test_matrix_hardware_noise_audio_disabled() {
    let profile = create_matrix_profile("noise_a_off", "windows", json!({
        "hardware_noise": { "canvas": true, "audio_context": false, "media_devices": true }
    }));
    let config = build_camou_config_map(&profile, None, &[], None);
    assert!(!config.contains_key("audio:seed"));
}

// 26. Hardware Noise Gating: Media Devices disabled
#[test]
fn test_matrix_hardware_noise_media_disabled() {
    let profile = create_matrix_profile("noise_m_off", "windows", json!({
        "hardware_noise": { "canvas": true, "audio_context": true, "media_devices": false }
    }));
    let config = build_camou_config_map(&profile, None, &[], None);
    assert_eq!(config.get("mediaDevices:enabled").unwrap().as_bool().unwrap(), false);
}

// 27. Font allowlist subset for Windows
#[test]
fn test_matrix_font_allowlist_windows() {
    let profile = create_matrix_profile("fonts_win", "windows", json!({}));
    let config = build_camou_config_map(&profile, None, &[], None);
    let fonts = config.get("fonts").unwrap().as_array().unwrap();
    let font_names: Vec<&str> = fonts.iter().filter_map(|v| v.as_str()).collect();
    assert!(font_names.contains(&"Arial") || font_names.contains(&"Segoe UI"));
}

// 28. Font allowlist subset for macOS
#[test]
fn test_matrix_font_allowlist_macos() {
    let profile = create_matrix_profile("fonts_mac", "macos", json!({}));
    let config = build_camou_config_map(&profile, None, &[], None);
    let fonts = config.get("fonts").unwrap().as_array().unwrap();
    let font_names: Vec<&str> = fonts.iter().filter_map(|v| v.as_str()).collect();
    assert!(font_names.contains(&"Helvetica") || font_names.contains(&"Monaco") || font_names.contains(&"Apple Color Emoji"));
}

// 29. Font allowlist subset for Linux
#[test]
fn test_matrix_font_allowlist_linux() {
    let profile = create_matrix_profile("fonts_lin", "linux", json!({}));
    let config = build_camou_config_map(&profile, None, &[], None);
    let fonts = config.get("fonts").unwrap().as_array().unwrap();
    let font_names: Vec<&str> = fonts.iter().filter_map(|v| v.as_str()).collect();
    assert!(font_names.contains(&"Liberation Sans") || font_names.contains(&"DejaVu Sans") || font_names.contains(&"Ubuntu"));
}

// 30..45 Country code to Locale and Languages Matrix
#[test]
fn test_matrix_locale_brazil() {
    let (primary, accept) = country_to_locale_and_languages("BR");
    assert_eq!(primary, "pt-BR");
    assert!(accept.starts_with("pt-BR,pt;q=0.9"));
}

#[test]
fn test_matrix_locale_germany() {
    let (primary, accept) = country_to_locale_and_languages("DE");
    assert_eq!(primary, "de-DE");
    assert!(accept.starts_with("de-DE,de;q=0.9"));
}

#[test]
fn test_matrix_locale_france() {
    let (primary, accept) = country_to_locale_and_languages("FR");
    assert_eq!(primary, "fr-FR");
    assert!(accept.starts_with("fr-FR,fr;q=0.9"));
}

#[test]
fn test_matrix_locale_uk() {
    let (primary, accept) = country_to_locale_and_languages("GB");
    assert_eq!(primary, "en-GB");
    assert!(accept.starts_with("en-GB,en;q=0.9"));
}

#[test]
fn test_matrix_locale_japan() {
    let (primary, accept) = country_to_locale_and_languages("JP");
    assert_eq!(primary, "ja-JP");
    assert!(accept.starts_with("ja-JP,ja;q=0.9"));
}

#[test]
fn test_matrix_locale_us() {
    let (primary, accept) = country_to_locale_and_languages("US");
    assert_eq!(primary, "en-US");
    assert_eq!(accept, "en-US,en;q=0.9");
}

#[test]
fn test_matrix_locale_canada() {
    let (primary, accept) = country_to_locale_and_languages("CA");
    assert_eq!(primary, "en-CA");
    assert!(accept.starts_with("en-CA"));
}

#[test]
fn test_matrix_locale_australia() {
    let (primary, accept) = country_to_locale_and_languages("AU");
    assert_eq!(primary, "en-AU");
    assert!(accept.starts_with("en-AU"));
}

#[test]
fn test_matrix_locale_italy() {
    let (primary, accept) = country_to_locale_and_languages("IT");
    assert_eq!(primary, "it-IT");
    assert!(accept.starts_with("it-IT,it;q=0.9"));
}

#[test]
fn test_matrix_locale_spain() {
    let (primary, accept) = country_to_locale_and_languages("ES");
    assert_eq!(primary, "es-ES");
    assert!(accept.starts_with("es-ES,es;q=0.9"));
}

#[test]
fn test_matrix_locale_netherlands() {
    let (primary, accept) = country_to_locale_and_languages("NL");
    assert_eq!(primary, "nl-NL");
    assert!(accept.starts_with("nl-NL,nl;q=0.9"));
}

#[test]
fn test_matrix_locale_russia() {
    let (primary, accept) = country_to_locale_and_languages("RU");
    assert_eq!(primary, "ru-RU");
    assert!(accept.starts_with("ru-RU,ru;q=0.9"));
}

#[test]
fn test_matrix_locale_china() {
    let (primary, accept) = country_to_locale_and_languages("CN");
    assert_eq!(primary, "zh-CN");
    assert!(accept.starts_with("zh-CN,zh;q=0.9"));
}

#[test]
fn test_matrix_locale_india() {
    let (primary, accept) = country_to_locale_and_languages("IN");
    assert_eq!(primary, "en-IN");
    assert!(accept.starts_with("en-IN,en;q=0.9"));
}

#[test]
fn test_matrix_locale_argentina() {
    let (primary, accept) = country_to_locale_and_languages("AR");
    assert_eq!(primary, "es-AR");
    assert!(accept.starts_with("es-AR,es;q=0.9"));
}

#[test]
fn test_matrix_locale_mexico() {
    let (primary, accept) = country_to_locale_and_languages("MX");
    assert_eq!(primary, "es-MX");
    assert!(accept.starts_with("es-MX,es;q=0.9"));
}
