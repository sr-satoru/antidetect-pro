use axum::{extract::Query, response::IntoResponse, Json};
use rand::seq::SliceRandom;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::LazyLock;

static PRESETS_V150: LazyLock<HashMap<String, Vec<Value>>> = LazyLock::new(|| {
    let json_str = include_str!("../../../presets/firefox/fingerprint-presets-v150.json");
    let val: Value = serde_json::from_str(json_str).unwrap_or(Value::Null);
    if let Some(obj) = val.get("presets").and_then(|p| p.as_object()) {
        let mut map = HashMap::new();
        for (k, v) in obj {
            if let Some(arr) = v.as_array() {
                map.insert(k.clone(), arr.clone());
            }
        }
        map
    } else {
        HashMap::new()
    }
});

static CHROMIUM_PRESETS: LazyLock<HashMap<String, Vec<Value>>> = LazyLock::new(|| {
    let json_str = include_str!("../../../presets/chromium/fingerprint-presets.json");
    let val: Value = serde_json::from_str(json_str).unwrap_or(Value::Null);
    if let Some(obj) = val.get("presets").and_then(|p| p.as_object()) {
        let mut map = HashMap::new();
        for (k, v) in obj {
            if let Some(arr) = v.as_array() {
                map.insert(k.clone(), arr.clone());
            }
        }
        map
    } else {
        HashMap::new()
    }
});

static ESSENTIAL_FONTS: LazyLock<HashMap<String, Vec<String>>> = LazyLock::new(|| {
    let json_str = include_str!("../../../presets/firefox/essential-fonts.json");
    serde_json::from_str(json_str).unwrap_or_default()
});

static ALL_FONTS: LazyLock<HashMap<String, Vec<String>>> = LazyLock::new(|| {
    let json_str = include_str!("../../../presets/firefox/fonts.json");
    serde_json::from_str(json_str).unwrap_or_default()
});

static MEDIA_DEVICES: LazyLock<Value> = LazyLock::new(|| {
    let json_str = include_str!("../../../presets/common/media-devices.json");
    serde_json::from_str(json_str).unwrap_or(Value::Null)
});

#[derive(Debug, Deserialize)]
pub struct OsQuery {
    pub os: Option<String>,
    pub kernel: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct CoherentPresetDto {
    pub os: String,
    pub os_version: String,
    pub user_agent: String,
    pub screen_width: u32,
    pub screen_height: u32,
    pub avail_width: u32,
    pub avail_height: u32,
    pub color_depth: u32,
    pub device_pixel_ratio: f64,
    pub cpu_cores: u32,
    pub max_touch_points: u32,
    pub webgl_vendor: String,
    pub webgl_renderer: String,
    pub speech_voices: Vec<String>,
    pub essential_fonts: Vec<String>,
}

fn normalize_os(os: Option<&str>) -> &'static str {
    match os.map(|s| s.to_lowercase()).as_deref() {
        Some("windows") | Some("win") => "windows",
        Some("macos") | Some("mac") => "macos",
        Some("linux") | Some("lin") => "linux",
        _ => "windows",
    }
}

fn is_chromium_kernel(kernel: Option<&str>) -> bool {
    let k = kernel.unwrap_or("").trim().to_lowercase();
    k.contains("astrobrowser") || k.contains("chrom") || k.contains("blink") || k.contains("clear")
}

fn map_preset_value(os: &str, raw: &Value, is_chromium: bool) -> CoherentPresetDto {
    let nav = raw.get("navigator");
    let screen = raw.get("screen");
    let webgl = raw.get("webgl");
    let voices = raw.get("speechVoices");

    let ua = nav
        .and_then(|n| n.get("userAgent"))
        .and_then(|v| v.as_str())
        .unwrap_or(if is_chromium {
            match os {
                "windows" => "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
                "macos" => "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
                "android" => "Mozilla/5.0 (Linux; Android 14; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
                _ => "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
            }
        } else {
            match os {
                "windows" => "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0",
                "macos" => "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:135.0) Gecko/20100101 Firefox/135.0",
                "android" => "Mozilla/5.0 (Android 14; Mobile; rv:135.0) Gecko/135.0 Firefox/135.0",
                "ios" => "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/135.0 Mobile/15E148 Safari/605.1.15",
                _ => "Mozilla/5.0 (X11; Linux x86_64; rv:135.0) Gecko/20100101 Firefox/135.0",
            }
        })
        .to_string();

    let os_version = match os {
        "windows" => "Windows NT 10.0; Win64; x64".to_string(),
        "macos" => "Intel Mac OS X 10.15".to_string(),
        "android" => "Android 14".to_string(),
        "ios" => "iOS 17.5".to_string(),
        _ => "Linux x86_64".to_string(),
    };

    let cpu_cores = nav
        .and_then(|n| n.get("hardwareConcurrency"))
        .and_then(|v| v.as_u64())
        .map(|n| n as u32)
        .unwrap_or(8);

    let max_touch_points = nav
        .and_then(|n| n.get("maxTouchPoints"))
        .and_then(|v| v.as_u64())
        .map(|n| n as u32)
        .unwrap_or(0);

    let screen_width = screen
        .and_then(|s| s.get("width"))
        .and_then(|v| v.as_u64())
        .map(|n| n as u32)
        .unwrap_or(1920);

    let screen_height = screen
        .and_then(|s| s.get("height"))
        .and_then(|v| v.as_u64())
        .map(|n| n as u32)
        .unwrap_or(1080);

    let avail_width = screen
        .and_then(|s| s.get("availWidth"))
        .and_then(|v| v.as_u64())
        .map(|n| n as u32)
        .unwrap_or(screen_width);

    let avail_height = screen
        .and_then(|s| s.get("availHeight"))
        .and_then(|v| v.as_u64())
        .map(|n| n as u32)
        .unwrap_or(if os == "windows" { screen_height.saturating_sub(40) } else { screen_height });

    let color_depth = screen
        .and_then(|s| s.get("colorDepth"))
        .and_then(|v| v.as_u64())
        .map(|n| n as u32)
        .unwrap_or(24);

    let device_pixel_ratio = screen
        .and_then(|s| s.get("devicePixelRatio"))
        .and_then(|v| v.as_f64())
        .unwrap_or(1.0);

    let webgl_vendor = webgl
        .and_then(|w| w.get("unmaskedVendor"))
        .and_then(|v| v.as_str())
        .unwrap_or(match os {
            "windows" => "Google Inc. (NVIDIA)",
            "macos" => "Apple",
            _ => "Google Inc. (Intel)",
        })
        .to_string();

    let webgl_renderer = webgl
        .and_then(|w| w.get("unmaskedRenderer"))
        .and_then(|v| v.as_str())
        .unwrap_or(match os {
            "windows" => "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "macos" => "Apple M2",
            _ => "ANGLE (Intel, Mesa Intel(R) Xe Graphics (TGL GT2), OpenGL 4.6)",
        })
        .to_string();

    let speech_voices: Vec<String> = voices
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|item| item.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();

    let font_key = match os {
        "windows" => "win",
        "macos" => "mac",
        _ => "lin",
    };
    let essential_fonts = ESSENTIAL_FONTS
        .get(font_key)
        .cloned()
        .unwrap_or_default();

    CoherentPresetDto {
        os: os.to_string(),
        os_version,
        user_agent: ua,
        screen_width,
        screen_height,
        avail_width,
        avail_height,
        color_depth,
        device_pixel_ratio,
        cpu_cores,
        max_touch_points,
        webgl_vendor,
        webgl_renderer,
        speech_voices,
        essential_fonts,
    }
}

/// GET /api/fingerprints/random?os=windows&kernel=AstroBrowser
pub async fn get_random_preset(Query(query): Query<OsQuery>) -> impl IntoResponse {
    let os = normalize_os(query.os.as_deref());
    let is_chrom = is_chromium_kernel(query.kernel.as_deref());
    let mut rng = rand::thread_rng();

    let presets_source = if is_chrom {
        &*CHROMIUM_PRESETS
    } else {
        &*PRESETS_V150
    };

    if let Some(presets) = presets_source.get(os) {
        if let Some(picked) = presets.choose(&mut rng) {
            return Json(map_preset_value(os, picked, is_chrom)).into_response();
        }
    }

    // Caso o array esteja vazio por algum motivo, gera fallback coerente
    Json(map_preset_value(os, &Value::Null, is_chrom)).into_response()
}

/// GET /api/fingerprints/presets?os=windows&kernel=AstroBrowser
pub async fn list_presets(Query(query): Query<OsQuery>) -> impl IntoResponse {
    let is_chrom = is_chromium_kernel(query.kernel.as_deref());
    let presets_source = if is_chrom {
        &*CHROMIUM_PRESETS
    } else {
        &*PRESETS_V150
    };

    if let Some(requested_os) = query.os {
        let os = normalize_os(Some(&requested_os));
        let list: Vec<CoherentPresetDto> = presets_source
            .get(os)
            .map(|arr| arr.iter().map(|item| map_preset_value(os, item, is_chrom)).collect())
            .unwrap_or_default();
        return Json(list).into_response();
    }

    // Todos os presets organizados por SO
    let mut all: Vec<CoherentPresetDto> = Vec::new();
    for (os, arr) in presets_source.iter() {
        for item in arr {
            all.push(map_preset_value(os, item, is_chrom));
        }
    }
    Json(all).into_response()
}

/// GET /api/fingerprints/fonts?os=windows
pub async fn get_fonts(Query(query): Query<OsQuery>) -> impl IntoResponse {
    let os = normalize_os(query.os.as_deref());
    let font_key = match os {
        "windows" => "win",
        "macos" => "mac",
        _ => "lin",
    };

    let essential = ESSENTIAL_FONTS.get(font_key).cloned().unwrap_or_default();
    let all = ALL_FONTS.get(font_key).cloned().unwrap_or_default();

    #[derive(Serialize)]
    struct FontsResponse {
        os: String,
        essential: Vec<String>,
        all: Vec<String>,
    }

    Json(FontsResponse {
        os: os.to_string(),
        essential,
        all,
    })
    .into_response()
}

/// GET /api/fingerprints/media-devices?os=windows
pub async fn get_media_devices(Query(query): Query<OsQuery>) -> impl IntoResponse {
    let os = normalize_os(query.os.as_deref());
    let dev_key = match os {
        "windows" => "win",
        "macos" => "mac",
        _ => "lin",
    };

    let dev_data = MEDIA_DEVICES.get(dev_key).cloned().unwrap_or(Value::Null);
    Json(dev_data).into_response()
}
