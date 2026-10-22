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

/// Converte um bloco de chave-valor em um `ImportProfileItem`
pub fn map_record_to_item(record: &HashMap<String, String>) -> ImportProfileItem {
    let id = record.get("id").filter(|s| !s.is_empty()).cloned();
    let name = record.get("name").filter(|s| !s.is_empty()).cloned();
    let group = record.get("group").filter(|s| !s.is_empty() && *s != "0").cloned();
    let notes = record.get("remark").or_else(|| record.get("notes")).cloned();
    let username = record.get("username").filter(|s| !s.is_empty()).cloned();
    let password = record.get("password").filter(|s| !s.is_empty()).cloned();
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

    ImportProfileItem {
        id,
        name,
        group,
        notes,
        username,
        password,
        twofa,
        kernel: None,
        os: None,
        proxy_type,
        proxy_host,
        proxy_port,
        proxy_username,
        proxy_password,
        screen_width,
        screen_height,
        user_agent,
        cookies,
    }
}

/// Realiza o parse do texto bruto do AdsPower em uma lista de `ImportProfileItem`
pub fn parse_adspower_text(text: &str) -> Vec<ImportProfileItem> {
    let records = split_records(text);
    records.iter().map(map_record_to_item).collect()
}
