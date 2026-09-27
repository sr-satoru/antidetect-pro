use std::collections::HashMap;
use serde_json::Value;
use crate::models::Profile;
use super::fonts::get_os_fonts;

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
    // Semente pseudo-aleatória determinística baseada no tempo atual (1..u32::MAX)
    let nanos = chrono::Utc::now().timestamp_nanos_opt().unwrap_or(12345678);
    let s = (nanos.abs() % (u32::MAX as i64 - 1)) as u32;
    if s == 0 { 429496729 } else { s }
}

/// Extrai e normaliza o SO alvo ("windows", "macos" ou "linux")
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
        _ => "Mozilla/5.0 (X11; Linux x86_64; rv:150.0) Gecko/20100101 Firefox/150.0".to_string(),
    }
}

/// Traduz as configurações do Perfil e Fingerprint para a estrutura exata exigida
/// pelo Camoufox C++ através da variável de ambiente CAMOU_CONFIG (MaskConfig.hpp).
pub fn build_camou_config(
    profile: &Profile,
    proxy_ip: Option<&str>,
    addon_paths: &[String],
) -> HashMap<String, Value> {
    let fp = extract_fingerprint_map(&profile.fingerprint_json);
    let os = resolve_os(profile, &fp);
    let ua = resolve_user_agent(&os, &fp);

    let mut config: HashMap<String, Value> = HashMap::new();

    // 1. Identificação do Navegador e Sistema Operacional (OS Spoofing)
    config.insert("navigator.userAgent".to_string(), Value::String(ua.clone()));
    config.insert("headers.User-Agent".to_string(), Value::String(ua.clone()));

    let (platform, oscpu, app_version) = match os.as_str() {
        "windows" => (
            "Win32",
            "Windows NT 10.0; Win64; x64",
            "5.0 (Windows)",
        ),
        "macos" => (
            "MacIntel",
            "Intel Mac OS X 10.15",
            "5.0 (Macintosh)",
        ),
        _ => (
            "Linux x86_64",
            "Linux x86_64",
            "5.0 (X11)",
        ),
    };

    config.insert("navigator.platform".to_string(), Value::String(platform.to_string()));
    config.insert("navigator.oscpu".to_string(), Value::String(oscpu.to_string()));
    config.insert("navigator.appVersion".to_string(), Value::String(app_version.to_string()));

    // 2. Hardware: CPU Cores (hardwareConcurrency)
    let cpu_cores = fp
        .get("cpu_cores")
        .and_then(|v| v.as_u64())
        .map(|n| n as u32)
        .unwrap_or(8);
    config.insert("navigator.hardwareConcurrency".to_string(), Value::Number(cpu_cores.into()));
    config.insert("navigator.maxTouchPoints".to_string(), Value::Number(0.into()));

    // 3. Resolução de Tela (Screen & Window)
    let screen_w = fp
        .get("custom_screen_width")
        .and_then(|v| v.as_u64())
        .map(|n| n as u32)
        .unwrap_or(1920);
    let screen_h = fp
        .get("custom_screen_height")
        .and_then(|v| v.as_u64())
        .map(|n| n as u32)
        .unwrap_or(1080);
    let color_depth = fp
        .get("color_depth")
        .and_then(|v| v.as_u64())
        .map(|n| n as u32)
        .unwrap_or(24);
    let dpr = fp
        .get("device_pixel_ratio")
        .and_then(|v| v.as_f64())
        .unwrap_or(1.0);

    let avail_h = if os == "windows" && screen_h > 40 {
        screen_h - 40 // Espaço ocupado pela barra de tarefas do Windows
    } else {
        screen_h
    };

    config.insert("screen.width".to_string(), Value::Number(screen_w.into()));
    config.insert("screen.height".to_string(), Value::Number(screen_h.into()));
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

    config.insert("webGl:vendor".to_string(), Value::String(webgl_vendor.to_string()));
    config.insert("webGl:renderer".to_string(), Value::String(webgl_renderer.to_string()));

    // 5. Anti-Fingerprint Seeds (Canvas, Audio e Font Spacing)
    let canvas_seed = parse_seed(fp.get("canvas_seed"));
    let audio_seed = parse_seed(fp.get("audio_seed"));
    let font_seed = parse_seed(fp.get("client_rects_seed"));

    config.insert("canvas:seed".to_string(), Value::Number(canvas_seed.into()));
    config.insert("audio:seed".to_string(), Value::Number(audio_seed.into()));
    config.insert("fonts:spacing_seed".to_string(), Value::Number(font_seed.into()));

    // 6. AudioContext Sample Rate
    let sample_rate = fp
        .get("audio_sample_rate")
        .and_then(|v| v.as_u64())
        .map(|n| n as u32)
        .unwrap_or(48000);
    config.insert("AudioContext:sampleRate".to_string(), Value::Number(sample_rate.into()));

    // 7. Fuso Horário (Timezone)
    if let Some(tz) = fp.get("custom_timezone").and_then(|v| v.as_str()) {
        let clean = tz.trim();
        if !clean.is_empty() {
            config.insert("timezone".to_string(), Value::String(clean.to_string()));
        }
    }

    // 8. Idioma e Localidade (Language & Locale)
    let custom_lang = fp
        .get("custom_language")
        .and_then(|v| v.as_str())
        .unwrap_or("pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7");

    config.insert("headers.Accept-Language".to_string(), Value::String(custom_lang.to_string()));

    // Extrai o primeiro código de idioma (ex: "pt-BR")
    let primary_lang = custom_lang
        .split(',')
        .next()
        .map(|s| s.split(';').next().unwrap_or("pt-BR").trim())
        .unwrap_or("pt-BR");

    config.insert("navigator.language".to_string(), Value::String(primary_lang.to_string()));

    // navigator.languages array
    let langs_arr: Vec<Value> = custom_lang
        .split(',')
        .map(|s| s.split(';').next().unwrap_or("").trim())
        .filter(|s| !s.is_empty())
        .map(|s| Value::String(s.to_string()))
        .collect();
    config.insert("navigator.languages".to_string(), Value::Array(langs_arr));

    if let Some(dash) = primary_lang.find('-') {
        let lang = &primary_lang[..dash];
        let reg = &primary_lang[dash + 1..];
        config.insert("locale:language".to_string(), Value::String(lang.to_string()));
        config.insert("locale:region".to_string(), Value::String(reg.to_string()));
    } else {
        config.insert("locale:language".to_string(), Value::String(primary_lang.to_string()));
    }

    // 9. Dispositivos de Mídia Falsos (Media Devices)
    let micros = fp.get("micros_count").and_then(|v| v.as_u64()).map(|n| n as u32).unwrap_or(1);
    let webcams = fp.get("webcams_count").and_then(|v| v.as_u64()).map(|n| n as u32).unwrap_or(1);
    let speakers = fp.get("speakers_count").and_then(|v| v.as_u64()).map(|n| n as u32).unwrap_or(2);

    config.insert("mediaDevices:micros".to_string(), Value::Number(micros.into()));
    config.insert("mediaDevices:webcams".to_string(), Value::Number(webcams.into()));
    config.insert("mediaDevices:speakers".to_string(), Value::Number(speakers.into()));
    config.insert("mediaDevices:enabled".to_string(), Value::Bool(true));

    // 10. Lista de Fontes por SO (FontAllowlist do Camoufox)
    let os_fonts = get_os_fonts(&os);
    let fonts_arr: Vec<Value> = os_fonts.into_iter().map(Value::String).collect();
    config.insert("fonts".to_string(), Value::Array(fonts_arr));

    // 11. Spoofing de IP no WebRTC (se houver proxy configurado)
    if let Some(ip) = proxy_ip {
        let clean = ip.trim();
        if !clean.is_empty() {
            config.insert("webrtc:ipv4".to_string(), Value::String(clean.to_string()));
        }
    }

    // 12. Extensões extras sideloaded
    if !addon_paths.is_empty() {
        let arr: Vec<Value> = addon_paths.iter().map(|p| Value::String(p.clone())).collect();
        config.insert("addons".to_string(), Value::Array(arr));
    }

    config
}
