use std::path::Path;
use crate::models::Profile;
use crate::fingerprint::translator::{
    extract_fingerprint_map, parse_opt_f64, parse_opt_u32, parse_seed_with_fallback, resolve_os,
};

/// Compilador de argumentos CLI nativos para o Clearcote Chromium C++.
/// Todas as opções stealth e coerência de identidade são entregues via switches C++.
pub fn build_clearcote_flags(
    profile_dir: &Path,
    profile: &Profile,
    debug_port: Option<u16>,
    proxy_url: Option<&str>,
    addon_paths: &[String],
    initial_url: Option<&str>,
    network: Option<&crate::network::ResolvedNetworkIdentity>,
) -> Vec<String> {
    let mut flags = Vec::new();
    let fp = extract_fingerprint_map(&profile.fingerprint_json);
    let os = resolve_os(profile, &fp);

    // 1. Isolamento de Perfil e Comportamento Básico do Chromium
    flags.push(format!("--user-data-dir={}", profile_dir.display()));
    flags.push("--no-first-run".to_string());
    flags.push("--no-default-browser-check".to_string());
    flags.push("--password-store=basic".to_string());
    flags.push("--portable-profile".to_string());
    flags.push("--allow-third-party-cookies".to_string());
    flags.push("--hide-crash-restore-bubble".to_string());
    flags.push("--disable-blink-features=AutomationControlled".to_string());
    flags.push("--disable-background-mode".to_string());
    flags.push("--disable-renderer-backgrounding".to_string());
    if os == "macos" {
        flags.push("--use-mock-keychain".to_string());
    }

    // 2. Desativação de Privacy Sandbox invasivo em runtime (Chromium Features)
    let privacy_sandbox_disabled = [
        "BrowsingTopics",
        "BrowsingTopicsDocumentAPI",
        "Fledge",
        "InterestGroupStorage",
        "PrivateAggregationApi",
        "SharedStorageAPI",
        "FencedFrames",
    ];

    let webrtc_mode = fp
        .get("webrtc_mode")
        .and_then(|v| v.as_str())
        .unwrap_or("substitute");

    let mut disabled_features = privacy_sandbox_disabled
        .iter()
        .map(|s| s.to_string())
        .collect::<Vec<_>>();

    if webrtc_mode == "off" || webrtc_mode == "disabled" {
        disabled_features.push("WebRtcHideLocalIpsWithMdns".to_string());
    }

    let valid_addons = addon_paths
        .iter()
        .filter(|p| !p.trim().is_empty())
        .map(|p| p.trim().to_string())
        .collect::<Vec<_>>();

    if !valid_addons.is_empty() {
        disabled_features.push("ExtensionManifestV2Deprecation".to_string());
    }

    flags.push(format!("--disable-features={}", disabled_features.join(",")));

    // 3. Semente Farble e Identidade Clearcote
    let id_hash = profile.id.bytes().fold(0u64, |acc, b| acc.wrapping_mul(37).wrapping_add(b as u64));
    let base_seed = if id_hash == 0 { 414797776u64 } else { id_hash };
    let seed = parse_seed_with_fallback(fp.get("canvas_seed").or_else(|| fp.get("fingerprint_seed")), ((base_seed ^ 0xCA11BA5) & 0xFFFFFFFF) as u32);
    flags.push(format!("--fingerprint={}", seed));

    // 4. Plataforma e Marca (Chrome coerente)
    let platform = match os.as_str() {
        "windows" => "windows",
        "macos" => "macos",
        _ => "linux",
    };
    flags.push(format!("--fingerprint-platform={}", platform));
    flags.push("--fingerprint-brand=chrome".to_string());
    flags.push("--fingerprint-brand-version=150".to_string());

    // 5. Hardware e Concorrência
    let cpu_cores = parse_opt_u32(fp.get("cpu_cores")).unwrap_or(8);
    flags.push(format!("--fingerprint-hardware-concurrency={}", cpu_cores));

    let device_memory = parse_opt_u32(fp.get("device_memory")).unwrap_or(8);
    flags.push(format!("--fingerprint-device-memory={}", device_memory));

    // 6. Tela, Resolução e DPR
    let screen_w = parse_opt_u32(fp.get("custom_screen_width")).unwrap_or(1920);
    let screen_h = parse_opt_u32(fp.get("custom_screen_height")).unwrap_or(1080);
    let color_depth = parse_opt_u32(fp.get("color_depth")).unwrap_or(24);
    let dpr = parse_opt_f64(fp.get("device_pixel_ratio")).unwrap_or(1.0);

    let avail_h = if os == "windows" && screen_h > 40 {
        screen_h - 40
    } else {
        screen_h
    };

    flags.push(format!("--fingerprint-screen-width={}", screen_w));
    flags.push(format!("--fingerprint-screen-height={}", screen_h));
    flags.push(format!("--fingerprint-avail-width={}", screen_w));
    flags.push(format!("--fingerprint-avail-height={}", avail_h));
    flags.push(format!("--fingerprint-color-depth={}", color_depth));
    flags.push(format!("--fingerprint-device-pixel-ratio={:.2}", dpr));

    let touch_points = parse_opt_u32(fp.get("max_touch_points")).unwrap_or(0);
    flags.push(format!("--fingerprint-max-touch-points={}", touch_points));

    // 7. GPU / WebGL
    let default_webgl = match os.as_str() {
        "windows" => (
            "Google Inc. (NVIDIA)",
            "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)",
        ),
        "macos" => ("Apple", "Apple M2"),
        _ => (
            "Google Inc. (Intel)",
            "ANGLE (Intel, Mesa Intel(R) Xe Graphics (TGL GT2), OpenGL 4.6)",
        ),
    };

    let webgl_vendor = fp
        .get("webgl_vendor")
        .and_then(|v| v.as_str())
        .filter(|s| !s.trim().is_empty())
        .unwrap_or(default_webgl.0);

    let webgl_renderer = fp
        .get("webgl_renderer")
        .and_then(|v| v.as_str())
        .filter(|s| !s.trim().is_empty())
        .unwrap_or(default_webgl.1);

    flags.push(format!("--fingerprint-gpu-vendor={}", webgl_vendor));
    flags.push(format!("--fingerprint-gpu-renderer={}", webgl_renderer));

    // 8. Localização e Idioma Nativos (sem fallbacks arbitrários prejudiciais)
    let resolved_lang = if let Some(net) = network.filter(|n| !n.country_code.is_empty() && !n.primary_language.trim().is_empty()) {
        Some((net.primary_language.clone(), net.accept_languages.clone()))
    } else if let Some(custom_l) = fp.get("custom_language").and_then(|v| v.as_str()).map(|s| s.trim()).filter(|s| !s.is_empty()) {
        let primary = custom_l.split(',').next().and_then(|s| s.split(';').next()).map(|s| s.trim()).filter(|s| !s.is_empty()).unwrap_or(custom_l);
        Some((primary.to_string(), custom_l.to_string()))
    } else if let Some(locale_obj) = fp.get("locale") {
        if let Some(p) = locale_obj.get("primary_language").and_then(|v| v.as_str()).map(|s| s.trim()).filter(|s| !s.is_empty()) {
            let a = locale_obj
                .get("languages")
                .and_then(|v| v.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|x| x.as_str().map(|s| s.split(';').next().unwrap_or("").trim()))
                        .filter(|s| !s.is_empty())
                        .collect::<Vec<_>>()
                        .join(",")
                })
                .unwrap_or_else(|| p.to_string());
            Some((p.to_string(), a))
        } else {
            None
        }
    } else {
        None
    };

    if let Some((primary_lang, accept_languages)) = resolved_lang {
        if !accept_languages.is_empty() {
            flags.push(format!("--accept-lang={}", accept_languages));
        }
        let ui_lang = primary_lang.split('-').next().unwrap_or(&primary_lang);
        if !ui_lang.is_empty() {
            flags.push(format!("--lang={}", ui_lang));
        }
    }

    // Injeção C++ nativa no ICU/V8: NUNCA usar fallback fake para New York
    let resolved_tz = if let Some(net) = network.filter(|n| !n.country_code.is_empty() && !n.timezone.trim().is_empty()) {
        Some(net.timezone.trim().to_string())
    } else {
        fp.get("custom_timezone")
            .and_then(|v| v.as_str())
            .or_else(|| fp.get("timezone").and_then(|t| t.get("timezone_id")).and_then(|v| v.as_str()))
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty() && s != "auto" && s != "Automatic")
    };

    if let Some(tz) = resolved_tz {
        flags.push(format!("--timezone={}", tz));
    }

    // Injeção C++ nativa no Mojo Geolocation: NUNCA usar fallback fake para coordenadas de Manhattan
    let resolved_loc = if let Some(net) = network.filter(|n| !n.country_code.is_empty() && (n.latitude != 0.0 || n.longitude != 0.0)) {
        Some((net.latitude, net.longitude))
    } else {
        let lat = fp.get("custom_latitude")
            .and_then(|v| v.as_f64().or_else(|| v.as_str().and_then(|s| s.parse::<f64>().ok())));
        let lon = fp.get("custom_longitude")
            .and_then(|v| v.as_f64().or_else(|| v.as_str().and_then(|s| s.parse::<f64>().ok())));
        match (lat, lon) {
            (Some(la), Some(lo)) if la != 0.0 || lo != 0.0 => Some((la, lo)),
            _ => None,
        }
    };

    if let Some((lat, lon)) = resolved_loc {
        flags.push(format!("--fingerprint-location={:.6},{:.6}", lat, lon));
    }

    // Injeção C++ nativa no BoringSSL TLS JA3/JA4 persona
    flags.push("--fingerprint-tls-profile=chrome-150".to_string());

    // 9. WebRTC e Rede
    if let Some(proxy) = proxy_url {
        flags.push(format!("--proxy-server={}", proxy));
        flags.push("--disable-quic".to_string());
        // Força WebRTC a trafegar apenas por dentro da rota do proxy, bloqueando vazamento na placa de rede real
        flags.push("--force-webrtc-ip-handling-policy=disable_non_proxied_udp".to_string());
    }

    // Injeção C++ nativa de STUN srflx do WebRTC (suprime candidatos locais e responde IP do proxy)
    if let Some(net) = network {
        if let Some(ref egress_ip) = net.egress_ip {
            let clean = egress_ip.trim();
            if !clean.is_empty() {
                flags.push(format!("--webrtc-ip={}", clean));
            }
        }
    }

    // 10. Porta CDP
    if let Some(port) = debug_port {
        flags.push(format!("--remote-debugging-port={}", port));
        flags.push("--remote-debugging-address=127.0.0.1".to_string());
        flags.push("--remote-allow-origins=*".to_string());
    }

    // 11. Extensões Unpacked do Chromium
    let valid_addons = addon_paths
        .iter()
        .filter(|p| !p.trim().is_empty())
        .map(|p| p.trim().to_string())
        .collect::<Vec<_>>();
    if !valid_addons.is_empty() {
        flags.push(format!("--load-extension={}", valid_addons.join(",")));
    }

    // 12. Hook personalizado se especificado
    if let Some(hook) = fp.get("launch_hook").and_then(|v| v.as_str()) {
        for arg in hook.split_whitespace() {
            if !arg.is_empty() {
                flags.push(arg.to_string());
            }
        }
    }

    // 13. URLs Iniciais (suporta uma ou múltiplas URLs passadas)
    if let Some(url) = initial_url.filter(|s| !s.trim().is_empty()) {
        for u in url.split_whitespace() {
            if !u.is_empty() {
                flags.push(u.to_string());
            }
        }
    }

    flags
}
