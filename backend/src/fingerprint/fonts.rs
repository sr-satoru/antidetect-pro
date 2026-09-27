/// Listas essenciais de fontes autênticas por sistema operacional para spoofing no Camoufox.
/// O Camoufox possui um patch C++ (FontAllowlist em additions/camoucfg/MaskConfig.hpp)
/// que restringe a consulta de fontes apenas às fontes permitidas no CAMOU_CONFIG["fonts"].
/// Isso impede que páginas (via CSS Font Loading API ou canvas text measuring) detectem o SO real do host.

pub fn get_os_fonts(os: &str) -> Vec<String> {
    match os.to_lowercase().as_str() {
        "windows" => vec![
            "Arial".to_string(),
            "Times New Roman".to_string(),
            "Courier New".to_string(),
            "Verdana".to_string(),
            "Georgia".to_string(),
            "Trebuchet MS".to_string(),
            "Tahoma".to_string(),
            "Segoe UI".to_string(),
            "Calibri".to_string(),
            "Cambria Math".to_string(),
            "Nirmala UI".to_string(),
            "Consolas".to_string(),
        ],
        "macos" => vec![
            "Arial".to_string(),
            "Helvetica".to_string(),
            "Times New Roman".to_string(),
            "Courier New".to_string(),
            "Verdana".to_string(),
            "Georgia".to_string(),
            "Trebuchet MS".to_string(),
            "Tahoma".to_string(),
            "Helvetica Neue".to_string(),
            "Lucida Grande".to_string(),
            "Menlo".to_string(),
            "Monaco".to_string(),
            "Geneva".to_string(),
            "PingFang HK".to_string(),
            "PingFang SC".to_string(),
            "PingFang TC".to_string(),
        ],
        "android" => vec![
            "Roboto".to_string(),
            "Noto Sans".to_string(),
            "Droid Sans".to_string(),
            "sans-serif".to_string(),
        ],
        "ios" => vec![
            "-apple-system".to_string(),
            "San Francisco".to_string(),
            "Helvetica Neue".to_string(),
            "Helvetica".to_string(),
            "Arial".to_string(),
            "PingFang SC".to_string(),
            "PingFang HK".to_string(),
            "PingFang TC".to_string(),
        ],
        _ => vec![
            "Arial".to_string(),
            "Times New Roman".to_string(),
            "Courier New".to_string(),
            "Verdana".to_string(),
            "Georgia".to_string(),
            "Arimo".to_string(),
            "Cousine".to_string(),
            "Tinos".to_string(),
            "Twemoji Mozilla".to_string(),
            "Liberation Sans".to_string(),
            "DejaVu Sans".to_string(),
        ],
    }
}
