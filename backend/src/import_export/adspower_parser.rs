use std::collections::HashMap;
use super::models::ImportProfileItem;

/// Decodifica bytes brutos tratando UTF-8, UTF-8 com BOM e UTF-16 LE/BE (com ou sem BOM)
pub fn decode_export_bytes(bytes: &[u8]) -> String {
    if bytes.len() >= 3 && bytes[0] == 0xef && bytes[1] == 0xbb && bytes[2] == 0xbf {
        return String::from_utf8_lossy(&bytes[3..]).to_string();
    }
    if bytes.len() >= 2 && bytes[0] == 0xff && bytes[1] == 0xfe {
        // UTF-16LE com BOM
        let u16s: Vec<u16> = bytes[2..]
            .chunks_exact(2)
            .map(|chunk| u16::from_le_bytes([chunk[0], chunk[1]]))
            .collect();
        return String::from_utf16_lossy(&u16s);
    }
    if bytes.len() >= 2 && bytes[0] == 0xfe && bytes[1] == 0xff {
        // UTF-16BE com BOM
        let u16s: Vec<u16> = bytes[2..]
            .chunks_exact(2)
            .map(|chunk| u16::from_be_bytes([chunk[0], chunk[1]]))
            .collect();
        return String::from_utf16_lossy(&u16s);
    }

    // Heurística para UTF-16 sem BOM (comum em exports Windows do AdsPower)
    let n = bytes.len().min(512);
    let mut even_nul = 0;
    let mut odd_nul = 0;
    for i in 0..n {
        if bytes[i] == 0 {
            if i % 2 == 0 {
                even_nul += 1;
            } else {
                odd_nul += 1;
            }
        }
    }
    if (even_nul + odd_nul) > n / 4 && n >= 2 {
        let is_le = odd_nul >= even_nul;
        let u16s: Vec<u16> = bytes
            .chunks_exact(2)
            .map(|chunk| {
                if is_le {
                    u16::from_le_bytes([chunk[0], chunk[1]])
                } else {
                    u16::from_be_bytes([chunk[0], chunk[1]])
                }
            })
            .collect();
        return String::from_utf16_lossy(&u16s);
    }

    String::from_utf8_lossy(bytes).trim_start_matches('\u{feff}').to_string()
}

/// Faz o parse de um bloco individual `key=value`, respeitando valores que contenham `=`
pub fn parse_block(block: &str) -> HashMap<String, String> {
    let mut map = HashMap::new();
    for raw_line in block.lines() {
        let line = raw_line.trim_end_matches('\r').trim();
        if line.is_empty() {
            continue;
        }
        if let Some(eq_idx) = line.find('=') {
            let key = line[..eq_idx].trim().to_lowercase();
            let value = line[eq_idx + 1..].trim().to_string();
            map.insert(key, value);
        }
    }
    map
}

/// Divide o texto completo exportado em múltiplos blocos delimitados por asteriscos (***)
pub fn split_records(text: &str) -> Vec<HashMap<String, String>> {
    let mut records = Vec::new();
    let mut current_block = String::new();

    for line in text.lines() {
        let trimmed = line.trim();
        // Separador AdsPower: linha formada por 3 ou mais asteriscos (ex: ******************)
        if trimmed.starts_with("***") && trimmed.chars().all(|c| c == '*') {
            if !current_block.trim().is_empty() {
                let map = parse_block(&current_block);
                // Aceita blocos que tenham id ou name
                if map.contains_key("id") || map.contains_key("name") {
                    records.push(map);
                }
                current_block.clear();
            }
        } else {
            current_block.push_str(line);
            current_block.push('\n');
        }
    }

    if !current_block.trim().is_empty() {
        let map = parse_block(&current_block);
        if map.contains_key("id") || map.contains_key("name") {
            records.push(map);
        }
    }

    records
}

/// Normaliza cookies: filtra extensões do AdsPower (ex: browserext.adspower.net)
/// e ajusta sameSite / secure
pub fn normalize_cookies(raw_json: &str) -> Vec<serde_json::Value> {
    let parsed: serde_json::Value = match serde_json::from_str(raw_json) {
        Ok(v) => v,
        Err(_) => return Vec::new(),
    };

    let arr = match parsed.as_array() {
        Some(a) => a,
        None => return Vec::new(),
    };

    let mut result = Vec::new();
    for item in arr {
        if let Some(obj) = item.as_object() {
            let domain = obj.get("domain").and_then(|v| v.as_str()).unwrap_or("");
            if domain.contains("adspower.net") || domain.contains("browserext") {
                // Descarta cookie proprietário da extensão do AdsPower
                continue;
            }

            let mut clean_obj = obj.clone();
            
            // Normalização de sameSite
            if let Some(same_site) = obj.get("sameSite").and_then(|v| v.as_str()) {
                let ss_lower = same_site.to_lowercase();
                if ss_lower == "no_restriction" || ss_lower == "none" {
                    clean_obj.insert("sameSite".to_string(), serde_json::json!("None"));
                    clean_obj.insert("secure".to_string(), serde_json::json!(true));
                } else if ss_lower == "lax" {
                    clean_obj.insert("sameSite".to_string(), serde_json::json!("Lax"));
                } else if ss_lower == "strict" {
                    clean_obj.insert("sameSite".to_string(), serde_json::json!("Strict"));
                } else if ss_lower == "unspecified" {
                    clean_obj.remove("sameSite");
                }
            }

            // Cookies de sessão não devem possuir expiry fixo
            if let Some(session) = obj.get("session").and_then(|v| v.as_bool()) {
                if session {
                    clean_obj.remove("expires");
                }
            }

            result.push(serde_json::Value::Object(clean_obj));
        }
    }
    result
}

/// Extrai dados de proxy (tipo, host, porta, usuário, senha)
/// Preserva senhas que contenham dois pontos (ex: host:port:user:pa:ss:word)
pub fn parse_proxy_string(
    proxy_type_raw: Option<&str>,
    proxy_str_raw: Option<&str>,
) -> (Option<String>, Option<String>, Option<u16>, Option<String>, Option<String>) {
    let p_str = match proxy_str_raw {
        Some(s) if !s.trim().is_empty() => s.trim(),
        _ => return (None, None, None, None, None),
    };

    // Remove eventual prefixo de protocolo na string (ex: http:// ou socks5://)
    let (detected_type, clean_endpoint) = if let Some(idx) = p_str.find("://") {
        let proto = &p_str[..idx];
        let rest = &p_str[idx + 3..];
        (Some(proto.to_lowercase()), rest)
    } else {
        (None, p_str)
    };

    let p_type = detected_type
        .or_else(|| proxy_type_raw.map(|t| t.trim().to_lowercase()))
        .unwrap_or_else(|| "http".to_string());

    let norm_type = match p_type.as_str() {
        "socks5" | "socks" => "socks5",
        "https" => "https",
        _ => "http",
    }
    .to_string();

    // Suporta formato de URL com @ (ex: user:pass@host:port)
    if clean_endpoint.contains('@') {
        if let Some((auth_part, host_part)) = clean_endpoint.split_once('@') {
            let (user, pass) = auth_part.split_once(':').map(|(u, p)| (Some(u.to_string()), Some(p.to_string()))).unwrap_or((Some(auth_part.to_string()), None));
            let (host, port) = host_part.split_once(':').map(|(h, p)| (h.to_string(), p.parse::<u16>().ok())).unwrap_or((host_part.to_string(), None));
            return (Some(norm_type), Some(host), port, user, pass);
        }
    }

    // Suporta formato padrão AdsPower: host:port[:user[:password]]
    let parts: Vec<&str> = clean_endpoint.split(':').collect();
    if parts.is_empty() {
        return (None, None, None, None, None);
    }

    let host = parts[0].trim().to_string();
    if host.is_empty() {
        return (None, None, None, None, None);
    }

    let port = if parts.len() > 1 {
        parts[1].trim().parse::<u16>().ok()
    } else {
        None
    };

    let user = if parts.len() > 2 {
        Some(parts[2].trim().to_string())
    } else {
        None
    };

    // Junta o restante das partes como senha para permitir senhas com `:`
    let pass = if parts.len() > 3 {
        Some(parts[3..].join(":").trim().to_string())
    } else {
        None
    };

    (Some(norm_type), Some(host), port, user, pass)
}

/// Extrai dimensões de tela aceitando tanto `1680*1050` quanto `1920x1080`
pub fn parse_resolution(res_str: &str) -> (Option<u32>, Option<u32>) {
    let clean = res_str.replace('*', "x").replace('_', "x");
    if let Some((w_s, h_s)) = clean.split_once('x') {
        if let (Ok(w), Ok(h)) = (w_s.trim().parse::<u32>(), h_s.trim().parse::<u32>()) {
            if w > 0 && h > 0 {
                return (Some(w), Some(h));
            }
        }
    }
    (None, None)
}

/// Identifica o motor de navegação correspondente (AstroBrowser / AstroFox)
pub fn detect_kernel(record: &HashMap<String, String>) -> String {
    // 1. Verificação explícita em campos conhecidos do AdsPower
    for key in &["kernel", "engine", "browsertype", "core"] {
        if let Some(val) = record.get(*key).filter(|s| !s.trim().is_empty()) {
            let lower = val.to_lowercase();
            if lower.contains("flower") || lower.contains("fox") || lower.contains("gecko") {
                return "AstroFox".to_string();
            }
            if lower.contains("sun") || lower.contains("chrom") || lower.contains("blink") || lower.contains("clear") {
                return "AstroBrowser".to_string();
            }
        }
    }

    // 2. Heurística via User-Agent
    if let Some(ua) = record.get("ua").or_else(|| record.get("useragent")) {
        let ua_lower = ua.to_lowercase();
        // Firefox no iOS (FxiOS) ou Firefox desktop/Android
        if ua_lower.contains("firefox") || ua_lower.contains("fxios") || (ua_lower.contains("gecko/") && !ua_lower.contains("like gecko")) {
            return "AstroFox".to_string();
        }
        // Chromium, Chrome, Edge, Brave, Opera
        if ua_lower.contains("chrome") || ua_lower.contains("chromium") || ua_lower.contains("crios") || ua_lower.contains("edg") || ua_lower.contains("opr") {
            return "AstroBrowser".to_string();
        }
    }

    "AstroBrowser".to_string()
}

/// Identifica o sistema operacional do perfil
pub fn detect_os(record: &HashMap<String, String>) -> String {
    for key in &["platform_os", "os", "operatingsystem", "platformos"] {
        if let Some(val) = record.get(*key).filter(|s| !s.trim().is_empty()) {
            let lower = val.to_lowercase();
            if lower.contains("win") {
                return "windows".to_string();
            }
            if lower.contains("mac") || lower.contains("darwin") || lower.contains("ios") || lower.contains("iphone") || lower.contains("ipad") {
                return "macos".to_string();
            }
            if lower.contains("linux") || lower.contains("android") {
                return "linux".to_string();
            }
        }
    }

    if let Some(ua) = record.get("ua").or_else(|| record.get("useragent")) {
        let ua_lower = ua.to_lowercase();
        if ua_lower.contains("windows") || ua_lower.contains("win32") || ua_lower.contains("win64") {
            return "windows".to_string();
        }
        if ua_lower.contains("mac os") || ua_lower.contains("macintosh") || ua_lower.contains("iphone") || ua_lower.contains("ipad") || ua_lower.contains("darwin") {
            return "macos".to_string();
        }
        if ua_lower.contains("linux") || ua_lower.contains("android") || ua_lower.contains("x11") {
            return "linux".to_string();
        }
    }

    "windows".to_string()
}

/// Extrai a versão principal do navegador presente no User-Agent
pub fn detect_browser_version(record: &HashMap<String, String>) -> String {
    if let Some(ua) = record.get("ua").or_else(|| record.get("useragent")) {
        for prefix in &["Chrome/", "Chromium/", "Firefox/", "FxiOS/", "Version/"] {
            if let Some(pos) = ua.find(prefix) {
                let rest = &ua[pos + prefix.len()..];
                let version_digits: String = rest.chars().take_while(|c| c.is_ascii_digit()).collect();
                if !version_digits.is_empty() {
                    return version_digits;
                }
            }
        }
    }
    "150".to_string()
}

/// Formata o nome de exibição de uma plataforma detectada
pub fn format_platform_name(raw: &str) -> String {
    let lower = raw.trim().to_lowercase();
    if lower.contains("instagram") {
        "Instagram".to_string()
    } else if lower.contains("facebook") {
        "Facebook".to_string()
    } else if lower.contains("tiktok") {
        "TikTok".to_string()
    } else if lower.contains("twitter") || lower.contains("x.com") {
        "X (Twitter)".to_string()
    } else if lower.contains("google") || lower.contains("gmail") {
        "Google".to_string()
    } else if lower.contains("amazon") {
        "Amazon".to_string()
    } else if lower.contains("shopee") {
        "Shopee".to_string()
    } else if lower.contains("mercado") {
        "Mercado Livre".to_string()
    } else if lower.contains("discord") {
        "Discord".to_string()
    } else {
        let mut chars = raw.trim().chars();
        match chars.next() {
            Some(c) => c.to_uppercase().collect::<String>() + chars.as_str(),
            None => "".to_string(),
        }
    }
}

/// Resolve a chave canônica da plataforma e o domínio correspondente
pub fn resolve_platform(raw_platform: Option<&str>, tab: Option<&str>) -> (String, String) {
    let p = raw_platform.unwrap_or("").trim().to_lowercase();
    let t = tab.unwrap_or("").trim().to_lowercase();
    let combined = format!("{} {}", p, t);

    if combined.contains("instagram") {
        ("instagram".to_string(), "instagram.com".to_string())
    } else if combined.contains("facebook") || combined.contains("fb.com") || combined.contains("meta") {
        ("facebook".to_string(), "facebook.com".to_string())
    } else if combined.contains("tiktok") {
        ("tiktok".to_string(), "tiktok.com".to_string())
    } else if combined.contains("twitter") || combined.contains("x.com") || p == "x" {
        ("x".to_string(), "x.com".to_string())
    } else if combined.contains("google") || combined.contains("gmail") {
        ("google".to_string(), "accounts.google.com".to_string())
    } else if combined.contains("amazon") {
        ("amazon".to_string(), "amazon.com".to_string())
    } else if combined.contains("linkedin") {
        ("linkedin".to_string(), "linkedin.com".to_string())
    } else if combined.contains("paypal") {
        ("paypal".to_string(), "paypal.com".to_string())
    } else if combined.contains("outlook") || combined.contains("hotmail") {
        ("outlook".to_string(), "outlook.com".to_string())
    } else if combined.contains("vinted") {
        ("vinted".to_string(), "vinted.fr".to_string())
    } else if combined.contains("ebay") {
        ("ebay".to_string(), "ebay.com".to_string())
    } else if combined.contains("discord") {
        ("discord".to_string(), "discord.com".to_string())
    } else if combined.contains("telegram") {
        ("telegram".to_string(), "telegram.org".to_string())
    } else if combined.contains("shopee") {
        ("shopee".to_string(), "shopee.com".to_string())
    } else if combined.contains("mercado") {
        ("mercadolivre".to_string(), "mercadolivre.com.br".to_string())
    } else if !p.is_empty() {
        let domain = if p.contains('.') { p.clone() } else { format!("{}.com", p) };
        (p, domain)
    } else {
        ("".to_string(), "".to_string())
    }
}

/// Identifica a plataforma a partir do campo platform ou das abas abertas
pub fn detect_platform(record: &HashMap<String, String>) -> Option<String> {
    let (plat_key, _) = resolve_platform(
        record.get("platform").map(|s| s.as_str()),
        record.get("tab").map(|s| s.as_str()),
    );
    if !plat_key.is_empty() {
        Some(plat_key)
    } else {
        None
    }
}

/// Capta o nome do perfil do txt; se name= estiver vazio, adota o username do txt
pub fn detect_profile_name(record: &HashMap<String, String>, _detected_platform: Option<&str>) -> String {
    // 1. Campo `name` explícito no arquivo txt
    if let Some(n) = record.get("name").filter(|s| !s.trim().is_empty()) {
        return n.trim().to_string();
    }
    // 2. Se name estiver vazio, usa o `username` do txt diretamente (ex: "elfordamyt")
    if let Some(u) = record.get("username").filter(|s| !s.trim().is_empty()) {
        return u.trim().to_string();
    }
    // 3. Fallback para id ou acc_id
    if let Some(id) = record.get("id").filter(|s| !s.trim().is_empty()) {
        return id.trim().to_string();
    }
    if let Some(acc_id) = record.get("acc_id").filter(|s| !s.trim().is_empty()) {
        return format!("Perfil #{}", acc_id.trim());
    }
    "Perfil AdsPower".to_string()
}

/// Remove aspas envoltórias de senhas (ex: `"ESz3cYP5"` -> `ESz3cYP5`)
pub fn clean_password(raw: &str) -> String {
    let trimmed = raw.trim();
    if (trimmed.starts_with('"') && trimmed.ends_with('"') && trimmed.len() >= 2)
        || (trimmed.starts_with('\'') && trimmed.ends_with('\'') && trimmed.len() >= 2)
    {
        trimmed[1..trimmed.len() - 1].to_string()
    } else {
        trimmed.to_string()
    }
}

/// Extrai URLs válidas a partir do campo `tab` do AdsPower
pub fn extract_initial_urls(record: &HashMap<String, String>) -> Vec<String> {
    let mut urls = Vec::new();
    if let Some(tab) = record.get("tab").filter(|s| !s.trim().is_empty()) {
        for item in tab.split(',') {
            let trimmed = item.trim();
            if trimmed.is_empty() || trimmed.starts_with("about:sessionrestore") || trimmed == "about:blank" {
                continue;
            }
            if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
                if !urls.contains(&trimmed.to_string()) {
                    urls.push(trimmed.to_string());
                }
            }
        }
    }
    urls
}

/// Converte um bloco de chave-valor em um `ImportProfileItem` com detecção automática rica
pub fn map_record_to_item(record: &HashMap<String, String>) -> ImportProfileItem {
    let id = record.get("id").filter(|s| !s.is_empty()).cloned();
    let detected_kernel = detect_kernel(record);
    let detected_os = detect_os(record);
    let detected_version = detect_browser_version(record);
    let detected_platform = detect_platform(record);
    let name = detect_profile_name(record, detected_platform.as_deref());

    let group = record.get("group").filter(|s| !s.is_empty() && *s != "0").cloned();
    let notes = record.get("remark").or_else(|| record.get("notes")).cloned();
    let username = record.get("username").filter(|s| !s.is_empty()).cloned();
    let password = record.get("password").filter(|s| !s.is_empty()).map(|p| clean_password(p));
    let twofa = record.get("fakey").or_else(|| record.get("twofa")).filter(|s| !s.is_empty()).cloned();
    let user_agent = record.get("ua").or_else(|| record.get("useragent")).cloned();

    let (proxy_type, proxy_host, proxy_port, proxy_username, proxy_password) = parse_proxy_string(
        record.get("proxytype").map(|s| s.as_str()),
        record.get("proxy").map(|s| s.as_str()),
    );

    let (screen_width, screen_height) = record
        .get("resolution")
        .map(|r| parse_resolution(r))
        .unwrap_or((None, None));

    let cookies = record
        .get("cookie")
        .map(|c| normalize_cookies(c))
        .unwrap_or_default();

    let initial_urls = extract_initial_urls(record);

    ImportProfileItem {
        id,
        name: Some(name),
        group,
        notes,
        username,
        password,
        twofa,
        kernel: Some(detected_kernel),
        os: Some(detected_os),
        proxy_type,
        proxy_host,
        proxy_port,
        proxy_username,
        proxy_password,
        screen_width,
        screen_height,
        user_agent,
        browser_version: Some(detected_version),
        platform: detected_platform,
        initial_urls: if initial_urls.is_empty() { None } else { Some(initial_urls) },
        cookies,
    }
}

/// Realiza o parse do texto bruto do AdsPower em uma lista de `ImportProfileItem`
pub fn parse_adspower_text(text: &str) -> Vec<ImportProfileItem> {
    let records = split_records(text);
    records.iter().map(map_record_to_item).collect()
}
