use crate::extraction_session::UnifiedCookie;

/// Analisa entrada de texto contendo cookies nos formatos JSON (Puppeteer / EditThisCookie) ou Netscape cookies.txt
pub fn parse_cookies_input(raw_content: &str) -> Result<Vec<UnifiedCookie>, String> {
    let mut parsed_cookies = Vec::new();
    let trimmed = raw_content.trim();

    if trimmed.is_empty() {
        return Err("Conteúdo de cookies fornecido está vazio".to_string());
    }

    // 1. Tenta analisar como JSON (Puppeteer / EditThisCookie / Cookie-Editor)
    if trimmed.starts_with('[') {
        if let Ok(val) = serde_json::from_str::<serde_json::Value>(trimmed) {
            if let Some(arr) = val.as_array() {
                for item in arr {
                    let name = item
                        .get("name")
                        .and_then(|v| v.as_str())
                        .unwrap_or_default()
                        .to_string();
                    let value = item
                        .get("value")
                        .and_then(|v| v.as_str())
                        .unwrap_or_default()
                        .to_string();
                    let domain = item
                        .get("domain")
                        .or_else(|| item.get("host"))
                        .and_then(|v| v.as_str())
                        .unwrap_or_default()
                        .to_string();
                    let path = item
                        .get("path")
                        .and_then(|v| v.as_str())
                        .unwrap_or("/")
                        .to_string();

                    let expiry = item
                        .get("expirationDate")
                        .or_else(|| item.get("expires"))
                        .and_then(|v| {
                            v.as_i64()
                                .or_else(|| v.as_f64().map(|f| f as i64))
                        });

                    let is_secure = item
                        .get("secure")
                        .and_then(|v| v.as_bool())
                        .unwrap_or(false);
                    let is_http_only = item
                        .get("httpOnly")
                        .and_then(|v| v.as_bool())
                        .unwrap_or(false);

                    let same_site = item
                        .get("sameSite")
                        .and_then(|v| v.as_str())
                        .unwrap_or("None")
                        .to_string();

                    if !name.is_empty() && !domain.is_empty() {
                        parsed_cookies.push(UnifiedCookie {
                            name,
                            value,
                            domain,
                            path,
                            expiry,
                            is_secure,
                            is_http_only,
                            same_site,
                        });
                    }
                }
            }
        }
    }

    // 2. Se não parseou como JSON, tenta como Netscape cookies.txt
    if parsed_cookies.is_empty() {
        for line in trimmed.lines() {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') {
                continue;
            }
            let parts: Vec<&str> = line.split('\t').collect();
            if parts.len() >= 7 {
                let domain = parts[0].to_string();
                let path = parts[2].to_string();
                let is_secure = parts[3].eq_ignore_ascii_case("TRUE");
                let expiry = parts[4].parse::<i64>().ok();
                let name = parts[5].to_string();
                let value = parts[6].to_string();

                if !name.is_empty() && !domain.is_empty() {
                    parsed_cookies.push(UnifiedCookie {
                        name,
                        value,
                        domain,
                        path,
                        expiry,
                        is_secure,
                        is_http_only: false,
                        same_site: "None".to_string(),
                    });
                }
            }
        }
    }

    if parsed_cookies.is_empty() {
        return Err("Nenhum cookie válido encontrado no formato JSON ou Netscape".to_string());
    }

    Ok(parsed_cookies)
}
