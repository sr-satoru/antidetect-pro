use std::collections::HashMap;
use serde_json::Value;
use crate::models::Profile;
use super::fonts::get_os_fonts_subset;
use super::media_devices;

/// Helper para extrair o mapa de propriedades de fingerprint_json,
/// aceitando tanto objeto nativo serde quanto string JSON escapada salva no disco.
pub fn extract_fingerprint_map(val: &Value) -> serde_json::Map<String, Value> {
    if let Some(obj) = val.as_object() {
        return obj.clone();
    }
    if let Some(s) = val.as_str() {
        if let Ok(Value::Object(map)) = serde_json::from_str(s) {
            return map;
        }
    }
    serde_json::Map::new()
}

/// Converte strings hexadecimais (ex: "1CCAE86B") ou inteiros em u32 válido para o Camoufox C++.
/// O C++ do Camoufox (MaskConfig.hpp) exige inteiros unsigned estritos para canvas:seed e audio:seed.
pub fn parse_seed(val: Option<&Value>) -> u32 {
    parse_seed_with_fallback(val, 429496729)
}

pub fn parse_seed_with_fallback(val: Option<&Value>, fallback: u32) -> u32 {
    if let Some(v) = val {
        if let Some(n) = v.as_u64() {
            if n > 0 && n <= u32::MAX as u64 {
                return n as u32;
            }
        }
        if let Some(s) = v.as_str() {
            let clean = s.trim().trim_start_matches("0x").trim_start_matches("0X");
            if let Ok(n) = u32::from_str_radix(clean, 16) {
                if n > 0 {
                    return n;
                }
            }
            if let Ok(n) = s.parse::<u32>() {
                if n > 0 {
                    return n;
                }
            }
        }
    }
    if fallback == 0 { 429496729 } else { fallback }
}

/// Extrai u32 suportando tanto números quanto strings vindas de formulários
pub fn parse_opt_u32(val: Option<&Value>) -> Option<u32> {
    if let Some(v) = val {
        if let Some(n) = v.as_u64() {
            return Some(n as u32);
        }
        if let Some(s) = v.as_str() {
            if let Ok(n) = s.trim().parse::<u32>() {
                return Some(n);
            }
        }
    }
    None
}

/// Extrai f64 suportando tanto números quanto strings vindas de formulários (ex: coordenadas)
pub fn parse_opt_f64(val: Option<&Value>) -> Option<f64> {
    if let Some(v) = val {
        if let Some(n) = v.as_f64() {
            return Some(n);
        }
        if let Some(s) = v.as_str() {
            if let Ok(n) = s.trim().parse::<f64>() {
                return Some(n);
            }
        }
    }
    None
}

/// Extrai e normaliza o SO alvo ("windows", "macos", "linux", "android" ou "ios")
pub fn resolve_os(profile: &Profile, fp_map: &serde_json::Map<String, Value>) -> String {
    let raw = fp_map
        .get("os")
        .and_then(|v| v.as_str())
        .unwrap_or(&profile.os)
        .to_lowercase();

    if raw.contains("win") {
        "windows".to_string()
    } else if raw.contains("mac") || raw.contains("darwin") || raw.contains("apple") {
        "macos".to_string()
    } else if raw.contains("android") {
        "android".to_string()
    } else if raw.contains("ios") || raw.contains("iphone") || raw.contains("ipad") {
        "ios".to_string()
    } else {
        "linux".to_string()
    }
}

/// Constrói o User-Agent padrão para o SO caso o perfil não especifique um
pub fn resolve_user_agent(os: &str, fp_map: &serde_json::Map<String, Value>) -> String {
    if let Some(ua) = fp_map.get("user_agent").and_then(|v| v.as_str()) {
        let trimmed = ua.trim();
        if !trimmed.is_empty() {
            return trimmed.to_string();
        }
    }

    match os {
        "windows" => "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:150.0) Gecko/20100101 Firefox/150.0".to_string(),
        "macos" => "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:150.0) Gecko/20100101 Firefox/150.0".to_string(),
        "android" => "Mozilla/5.0 (Android 14; Mobile; rv:150.0) Gecko/150.0 Firefox/150.0".to_string(),
        "ios" => "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/150.0 Mobile/15E148 Safari/605.1.15".to_string(),
        _ => "Mozilla/5.0 (X11; Linux x86_64; rv:150.0) Gecko/20100101 Firefox/150.0".to_string(),
    }
}

/// Traduz as configurações do Perfil e Fingerprint para a estrutura exata exigida
/// pelo Camoufox C++ através da variável de ambiente CAMOU_CONFIG (MaskConfig.hpp).
pub fn build_camou_config(
    profile: &Profile,
    proxy_ip: Option<&str>,
    addon_paths: &[String],
    network: Option<&crate::network::ResolvedNetworkIdentity>,
) -> HashMap<String, Value> {
    let fp = extract_fingerprint_map(&profile.fingerprint_json);
    let os = resolve_os(profile, &fp);
    let ua = resolve_user_agent(&os, &fp);

    let mut config: HashMap<String, Value> = HashMap::new();

    // Semente estável derivada do perfil para garantir determinismo nas escolhas pseudo-aleatórias
    let id_hash = profile.id.bytes().fold(0u64, |acc, b| acc.wrapping_mul(37).wrapping_add(b as u64));
    let base_seed = if id_hash == 0 { 429496729u64 } else { id_hash };

    let canvas_seed = parse_seed_with_fallback(fp.get("canvas_seed"), ((base_seed ^ 0xCA11BA5) & 0xFFFFFFFF) as u32);
    let audio_seed = parse_seed_with_fallback(fp.get("audio_seed"), ((base_seed ^ 0xA0D105) & 0xFFFFFFFF) as u32);
    let client_rects_seed = parse_seed_with_fallback(fp.get("client_rects_seed"), ((base_seed ^ 0xC11E47) & 0xFFFFFFFF) as u32);

    let profile_seed = (audio_seed as u64)
        ^ ((client_rects_seed as u64) << 16)
        ^ base_seed;

    // 1. Identificação do Navegador e Sistema Operacional (OS Spoofing)
    config.insert("navigator.userAgent".to_string(), Value::String(ua.clone()));
    config.insert("headers.User-Agent".to_string(), Value::String(ua.clone()));

    let (platform, oscpu, app_version, default_touch_points) = match os.as_str() {
        "windows" => (
            "Win32",
            "Windows NT 10.0; Win64; x64",
            "5.0 (Windows)",
            0,
        ),
        "macos" => (
            "MacIntel",
            "Intel Mac OS X 10.15",
            "5.0 (Macintosh)",
            0,
        ),
        "android" => (
            "Linux armv8l",
            "Linux armv8l",
            "5.0 (Linux; Android 14)",
            5,
        ),
        "ios" => (
            "iPhone",
            "",
            "5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)",
            5,
        ),
        _ => (
            "Linux x86_64",
            "Linux x86_64",
            "5.0 (X11)",
            0,
        ),
    };

    config.insert("navigator.platform".to_string(), Value::String(platform.to_string()));
    config.insert("navigator.oscpu".to_string(), Value::String(oscpu.to_string()));
    config.insert("navigator.appVersion".to_string(), Value::String(app_version.to_string()));

    // 2. Hardware: CPU Cores (hardwareConcurrency) e Touch Points
    let cpu_cores = parse_opt_u32(fp.get("cpu_cores")).unwrap_or(8);
    config.insert("navigator.hardwareConcurrency".to_string(), Value::Number(cpu_cores.into()));

    let touch_points = parse_opt_u32(fp.get("max_touch_points")).unwrap_or(default_touch_points);
    config.insert("navigator.maxTouchPoints".to_string(), Value::Number(touch_points.into()));

    // 3. Resolução de Tela (Screen & Window)
    let screen_w = parse_opt_u32(fp.get("custom_screen_width")).unwrap_or(1920);
    let screen_h = parse_opt_u32(fp.get("custom_screen_height")).unwrap_or(1080);
    let color_depth = parse_opt_u32(fp.get("color_depth")).unwrap_or(24);
    let dpr = parse_opt_f64(fp.get("device_pixel_ratio")).unwrap_or(1.0);

    let avail_h = if os == "windows" && screen_h > 40 {
        screen_h - 40 // Espaço ocupado pela barra de tarefas do Windows
    } else {
        screen_h
    };

    config.insert("screen.width".to_string(), Value::Number(screen_w.into()));
    config.insert("screen.height".to_string(), Value::Number(screen_h.into()));
    config.insert("screen.availLeft".to_string(), Value::Number(0.into()));
    config.insert("screen.availTop".to_string(), Value::Number(0.into()));
    config.insert("screen.availWidth".to_string(), Value::Number(screen_w.into()));
    config.insert("screen.availHeight".to_string(), Value::Number(avail_h.into()));
    config.insert("screen.colorDepth".to_string(), Value::Number(color_depth.into()));
    config.insert("screen.pixelDepth".to_string(), Value::Number(color_depth.into()));
    if let Some(dpr_num) = serde_json::Number::from_f64(dpr) {
        config.insert("window.devicePixelRatio".to_string(), Value::Number(dpr_num));
    }

    // 4. GPU & WebGL Spoofing (Vendor & Renderer)
    let default_webgl = match os.as_str() {
        "windows" => (
            "Google Inc. (NVIDIA)",
            "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)",
        ),
        "macos" => ("Apple", "Apple M2"),
        "android" => ("Qualcomm", "Adreno (TM) 750"),
        "ios" => ("Apple", "Apple GPU"),
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

    let normalized_renderer = if (os == "linux" || os == "lin")
        && !webgl_renderer.ends_with(", or similar")
        && webgl_renderer != "Generic Renderer"
        && webgl_renderer != "Mozilla"
    {
        format!("{}, or similar", webgl_renderer)
    } else {
        webgl_renderer.to_string()
    };

    config.insert("webGl:vendor".to_string(), Value::String(webgl_vendor.to_string()));
    config.insert("webGl:renderer".to_string(), Value::String(normalized_renderer));

    // 5. Anti-Fingerprint Seeds com Gating por hardware_noise
    let noise_obj = fp.get("hardware_noise");
    let noise_canvas = noise_obj.and_then(|o| o.get("canvas")).and_then(|b| b.as_bool()).unwrap_or(true);
    let noise_audio = noise_obj.and_then(|o| o.get("audio_context")).and_then(|b| b.as_bool()).unwrap_or(true);
    let noise_client_rects = noise_obj.and_then(|o| o.get("client_rects")).and_then(|b| b.as_bool()).unwrap_or(true);
    let noise_media = noise_obj.and_then(|o| o.get("media_devices")).and_then(|b| b.as_bool()).unwrap_or(true);

    if noise_canvas {
        config.insert("canvas:seed".to_string(), Value::Number(canvas_seed.into()));
    }

    if noise_audio {
        config.insert("audio:seed".to_string(), Value::Number(audio_seed.into()));
        let sample_rate = fp
            .get("audio_sample_rate")
            .and_then(|v| v.as_u64())
            .map(|n| n as u32)
            .unwrap_or(48000);
        config.insert("AudioContext:sampleRate".to_string(), Value::Number(sample_rate.into()));
    }

    if noise_client_rects {
        config.insert("fonts:spacing_seed".to_string(), Value::Number(client_rects_seed.into()));
    }

    // 6. Fuso Horário (Timezone nativo do Camoufox)
    let timezone = if let Some(net) = network.filter(|n| !n.country_code.is_empty()) {
        Some(net.timezone.as_str())
    } else {
        fp.get("custom_timezone").and_then(|v| v.as_str())
    };
    if let Some(tz) = timezone {
        let clean = tz.trim();
        if !clean.is_empty() {
            config.insert("timezone".to_string(), Value::String(clean.to_string()));
        }
    }

    // 7. Idioma e Localidade (Language & Locale coerentes)
    let (custom_lang, primary_lang) = if let Some(net) = network.filter(|n| !n.country_code.is_empty()) {
        (net.accept_languages.as_str(), net.primary_language.as_str())
    } else {
        let l = fp.get("custom_language").and_then(|v| v.as_str()).unwrap_or("en-US,en;q=0.9");
        let p = l.split(',').next().map(|s| s.split(';').next().unwrap_or("en-US").trim()).unwrap_or("en-US");
        (l, p)
    };

    config.insert("headers.Accept-Language".to_string(), Value::String(custom_lang.to_string()));
    config.insert("navigator.language".to_string(), Value::String(primary_lang.to_string()));

    if let Some(dash) = primary_lang.find('-') {
        let lang = &primary_lang[..dash];
        let reg = &primary_lang[dash + 1..];
        config.insert("locale:language".to_string(), Value::String(lang.to_string()));
        config.insert("locale:region".to_string(), Value::String(reg.to_string()));
    } else {
        config.insert("locale:language".to_string(), Value::String(primary_lang.to_string()));
    }

    // 8. Dispositivos de Mídia Realistas (Media Devices com Rótulos e GroupIds)
    if noise_media {
        let desired_micros = parse_opt_u32(fp.get("micros_count"));
        let desired_webcams = parse_opt_u32(fp.get("webcams_count"));
        let desired_speakers = parse_opt_u32(fp.get("speakers_count"));

        let dev = media_devices::generate_media_devices(
            &os,
            profile_seed,
            desired_micros,
            desired_speakers,
            desired_webcams,
        );

        config.insert("mediaDevices:enabled".to_string(), Value::Bool(true));
        config.insert("mediaDevices:micros".to_string(), Value::Number(dev.micros_count.into()));
        config.insert("mediaDevices:speakers".to_string(), Value::Number(dev.speakers_count.into()));
        config.insert("mediaDevices:webcams".to_string(), Value::Number(dev.webcams_count.into()));

        config.insert(
            "mediaDevices:microLabels".to_string(),
            Value::Array(dev.micro_labels.into_iter().map(Value::String).collect()),
        );
        config.insert(
            "mediaDevices:microGroups".to_string(),
            Value::Array(dev.micro_groups.into_iter().map(Value::String).collect()),
        );
        config.insert(
            "mediaDevices:speakerLabels".to_string(),
            Value::Array(dev.speaker_labels.into_iter().map(Value::String).collect()),
        );
        config.insert(
            "mediaDevices:speakerGroups".to_string(),
            Value::Array(dev.speaker_groups.into_iter().map(Value::String).collect()),
        );
        config.insert(
            "mediaDevices:webcamLabels".to_string(),
            Value::Array(dev.webcam_labels.into_iter().map(Value::String).collect()),
        );
        config.insert(
            "mediaDevices:webcamGroups".to_string(),
            Value::Array(dev.webcam_groups.into_iter().map(Value::String).collect()),
        );
    } else {
        config.insert("mediaDevices:enabled".to_string(), Value::Bool(false));
    }

    // 9. Geolocalização (formato exato do C++ MaskConfig: geolocation:latitude/longitude/accuracy)
    let location_mode = fp.get("location_mode").and_then(|v| v.as_str()).unwrap_or("ip");
    let (lat, lng, acc) = if location_mode == "custom" {
        (
            parse_opt_f64(fp.get("custom_latitude")).unwrap_or(0.0),
            parse_opt_f64(fp.get("custom_longitude")).unwrap_or(0.0),
            parse_opt_f64(fp.get("custom_accuracy")).unwrap_or(50.0),
        )
    } else if let Some(net) = network {
        (net.latitude, net.longitude, 50.0)
    } else {
        (0.0, 0.0, 50.0)
    };

    if lat != 0.0 || lng != 0.0 {
        if let Some(n) = serde_json::Number::from_f64(lat) {
            config.insert("geolocation:latitude".to_string(), Value::Number(n));
        }
        if let Some(n) = serde_json::Number::from_f64(lng) {
            config.insert("geolocation:longitude".to_string(), Value::Number(n));
        }
        if let Some(n) = serde_json::Number::from_f64(acc) {
            config.insert("geolocation:accuracy".to_string(), Value::Number(n));
        }
    }

    // 10. WebGPU Mode
    let webgpu_mode = fp.get("webgpu_mode").and_then(|v| v.as_str()).unwrap_or("real");
    if webgpu_mode == "block" {
        config.insert("webgpu:enabled".to_string(), Value::Bool(false));
    }

    // 11. Subconjunto Determinístico de Fontes por SO (FontAllowlist do Camoufox)
    let os_fonts = get_os_fonts_subset(&os, profile_seed);
    let fonts_arr: Vec<Value> = os_fonts.into_iter().map(Value::String).collect();
    config.insert("fonts".to_string(), Value::Array(fonts_arr));

    // 12. Spoofing de IPv4 no WebRTC (apenas se webrtc_mode for "substitute" e o IP for um IPv4 estrito)
    let webrtc_mode = fp.get("webrtc_mode").and_then(|v| v.as_str()).unwrap_or("substitute");
    if webrtc_mode == "substitute" {
        let candidate_ip = proxy_ip.or_else(|| network.and_then(|n| n.egress_ip.as_deref()));
        if let Some(ip) = candidate_ip {
            let clean = ip.trim();
            // Camoufox C++ inet_pton exige estritamente formato IPv4
            if clean.parse::<std::net::Ipv4Addr>().is_ok() {
                config.insert("webrtc:ipv4".to_string(), Value::String(clean.to_string()));
            }
        }
    }

    // 13. Extensões extras sideloaded
    if !addon_paths.is_empty() {
        let arr: Vec<Value> = addon_paths.iter().map(|p| Value::String(p.clone())).collect();
        config.insert("addons".to_string(), Value::Array(arr));
    }

    config
}
