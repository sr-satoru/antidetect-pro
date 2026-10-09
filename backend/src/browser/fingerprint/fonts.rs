use std::collections::{HashMap, HashSet};
use std::sync::LazyLock;

/// Listas essenciais de fontes autênticas por sistema operacional para spoofing no Camoufox.
/// Carregadas a partir do catálogo oficial do Camoufox (presets/firefox/essential-fonts.json).
/// O Camoufox possui um patch C++ (FontAllowlist em additions/camoucfg/MaskConfig.hpp)
/// que restringe a consulta de fontes apenas às fontes permitidas no CAMOU_CONFIG["fonts"].
static ESSENTIAL_FONTS: LazyLock<HashMap<String, Vec<String>>> = LazyLock::new(|| {
    let json_str = include_str!("../../../presets/firefox/essential-fonts.json");
    serde_json::from_str(json_str).unwrap_or_default()
});

fn font_hash(font: &str, seed: u64) -> u64 {
    let mut h = seed.wrapping_mul(0x517cc1b727220a95);
    for b in font.bytes() {
        h = h.wrapping_mul(31).wrapping_add(b as u64);
    }
    h
}

/// Retorna uma amostra determinística realista (entre 50% e 75%) das fontes do SO,
/// garantindo a presença das fontes base essenciais de interface para evitar quebras visuais.
pub fn get_os_fonts_subset(os: &str, seed: u64) -> Vec<String> {
    let key = match os.to_lowercase().as_str() {
        "windows" | "win" => "win",
        "macos" | "mac" | "darwin" | "ios" => "mac",
        _ => "lin",
    };

    let all_fonts = if let Some(fonts) = ESSENTIAL_FONTS.get(key) {
        if !fonts.is_empty() {
            fonts.clone()
        } else {
            get_fallback_fonts(key)
        }
    } else {
        get_fallback_fonts(key)
    };

    // Fontes base essenciais que todo SO real dessa família possui e que a web precisa
    let base_fonts: HashSet<&str> = match key {
        "win" => [
            "Arial", "Calibri", "Segoe UI", "Times New Roman", "Tahoma",
            "Verdana", "Georgia", "Comic Sans MS", "Impact", "Trebuchet MS",
            "Courier New", "Consolas", "Segoe UI Emoji", "MS Sans Serif",
        ].into_iter().collect(),
        "mac" => [
            "Helvetica Neue", "Helvetica", "Arial", "Menlo", "Times New Roman",
            "Courier New", "Georgia", "Verdana", "Monaco", "Apple Color Emoji",
            "Avenir", "Geneva", "Lucida Grande",
        ].into_iter().collect(),
        _ => [
            "Noto Sans", "DejaVu Sans", "Liberation Sans", "Ubuntu",
            "DejaVu Sans Mono", "Liberation Mono", "Times New Roman", "Courier New",
        ].into_iter().collect(),
    };

    let mut subset = Vec::new();
    for font in all_fonts {
        if base_fonts.contains(font.as_str()) {
            subset.push(font);
        } else {
            // Sorteio determinístico: inclui ~60% das fontes opcionais
            let h = font_hash(&font, seed);
            if (h % 100) < 60 {
                subset.push(font);
            }
        }
    }

    subset
}

/// Retorna a lista completa padrão de fontes do SO
pub fn get_os_fonts(os: &str) -> Vec<String> {
    get_os_fonts_subset(os, 0)
}

fn get_fallback_fonts(key: &str) -> Vec<String> {
    match key {
        "win" => vec![
            "Arial".to_string(),
            "Calibri".to_string(),
            "Segoe UI".to_string(),
            "Times New Roman".to_string(),
        ],
        "mac" => vec![
            "Helvetica Neue".to_string(),
            "Arial".to_string(),
            "Menlo".to_string(),
        ],
        _ => vec![
            "Noto Sans".to_string(),
            "DejaVu Sans".to_string(),
            "Liberation Sans".to_string(),
        ],
    }
}

