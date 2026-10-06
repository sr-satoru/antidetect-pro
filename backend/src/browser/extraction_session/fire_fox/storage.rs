use rusqlite::{Connection, OpenFlags};
use std::collections::HashMap;
use std::path::Path;
use tracing::warn;

use crate::extraction_session::{UnifiedSession, fire_fox::cookies::{extract_cookies, format_sqlite_uri}};

/// Converte o nome de diretório de partição do Firefox/Camoufox para uma URL de origem legível
/// Ex: "https+++discord.com" -> "https://discord.com"
/// Ex: "http+++localhost+3000" -> "http://localhost:3000"
pub fn unescape_firefox_origin(dir_name: &str) -> String {
    // Remove qualquer atributo de contexto extra após '^' (ex: ^userContextId=1)
    let base = dir_name.split('^').next().unwrap_or(dir_name);
    
    if let Some((scheme, rest)) = base.split_once("+++") {
        let host_port = rest.replace('+', ":");
        format!("{scheme}://{host_port}")
    } else {
        base.to_string()
    }
}

/// Converte uma URL de origem para o padrão de pasta do Firefox/Camoufox
/// Ex: "https://discord.com" -> "https+++discord.com"
/// Ex: "http://localhost:3000" -> "http+++localhost+3000"
pub fn escape_firefox_origin(origin: &str) -> String {
    if let Some((scheme, rest)) = origin.split_once("://") {
        let encoded_host = rest.replace(':', "+");
        format!("{scheme}+++{encoded_host}")
    } else {
        origin.replace([':', '/', '.'], "+")
    }
}

/// Extrai todos os pares de chave/valor do LocalStorage armazenados no perfil do Camoufox
/// Mapeamento retornado: Origem (ex: "https://discord.com") -> (Chave -> Valor)
pub fn extract_local_storage(profile_dir: &Path) -> Result<HashMap<String, HashMap<String, String>>, String> {
    let mut storage_map: HashMap<String, HashMap<String, String>> = HashMap::new();
    let storage_default = profile_dir.join("storage").join("default");

    // 1. Varre o diretório moderno storage/default/*/ls/data.sqlite do Camoufox/Gecko
    if storage_default.is_dir() {
        if let Ok(entries) = std::fs::read_dir(&storage_default) {
            for entry in entries.flatten() {
                let path = entry.path();
                if !path.is_dir() {
                    continue;
                }

                let dir_name = path
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or_default();

                let ls_db = path.join("ls").join("data.sqlite");
                if !ls_db.exists() {
                    continue;
                }

                let origin = unescape_firefox_origin(dir_name);
                let origin_items = read_ls_data_sqlite(&ls_db);
                if !origin_items.is_empty() {
                    storage_map
                        .entry(origin)
                        .or_default()
                        .extend(origin_items);
                }
            }
        }
    }

    // 2. Fallback para webappsstore.sqlite (caso perfis antigos ou domínios legados utilizem)
    let legacy_db = profile_dir.join("webappsstore.sqlite");
    if legacy_db.exists() {
        if let Ok(legacy_items) = read_legacy_webappsstore(&legacy_db) {
            for (origin, items) in legacy_items {
                storage_map
                    .entry(origin)
                    .or_default()
                    .extend(items);
            }
        }
    }

    Ok(storage_map)
}

/// Lê a tabela `data` do arquivo `ls/data.sqlite` de uma origem
fn read_ls_data_sqlite(db_path: &Path) -> HashMap<String, String> {
    let mut items = HashMap::new();
    let flags = OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_URI;
    let uri = format_sqlite_uri(db_path);

    let conn = match Connection::open_with_flags(&uri, flags)
        .or_else(|_| Connection::open_with_flags(db_path, flags))
    {
        Ok(c) => c,
        Err(e) => {
            warn!("Não foi possível abrir {:?}: {}", db_path, e);
            return items;
        }
    };

    let mut stmt = match conn.prepare("SELECT key, value FROM data") {
        Ok(s) => s,
        Err(_) => return items,
    };

    let rows = stmt.query_map([], |row| {
        let key: String = row.get(0).unwrap_or_default();
        // Em algumas versões do Gecko, o valor pode ser texto ou BLOB (UTF-16)
        let value: String = if let Ok(val_str) = row.get::<_, String>(1) {
            val_str
        } else if let Ok(val_blob) = row.get::<_, Vec<u8>>(1) {
            // Tenta decodificar como UTF-8 ou fallback UTF-16
            String::from_utf8(val_blob.clone()).unwrap_or_else(|_| {
                let u16_vec: Vec<u16> = val_blob
                    .chunks_exact(2)
                    .map(|chunk| u16::from_le_bytes([chunk[0], chunk[1]]))
                    .collect();
                String::from_utf16_lossy(&u16_vec)
            })
        } else {
            String::new()
        };

        Ok((key, value))
    });

    if let Ok(iter) = rows {
        for item in iter.flatten() {
            if !item.0.is_empty() {
                items.insert(item.0, item.1);
            }
        }
    }

    items
}

/// Lê o banco legado webappsstore.sqlite
fn read_legacy_webappsstore(db_path: &Path) -> Result<HashMap<String, HashMap<String, String>>, String> {
    let mut result: HashMap<String, HashMap<String, String>> = HashMap::new();
    let flags = OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_URI;
    let uri = format_sqlite_uri(db_path);

    let conn = Connection::open_with_flags(&uri, flags)
        .or_else(|_| Connection::open_with_flags(db_path, flags))
        .map_err(|e| format!("Erro ao abrir webappsstore.sqlite: {e}"))?;

    let mut stmt = match conn.prepare("SELECT scope, key, value FROM webappsstore2") {
        Ok(s) => s,
        Err(_) => return Ok(result),
    };

    let rows = stmt
        .query_map([], |row| {
            let scope: String = row.get(0).unwrap_or_default();
            let key: String = row.get(1).unwrap_or_default();
            let value: String = row.get(2).unwrap_or_default();
            Ok((scope, key, value))
        })
        .map_err(|e| format!("Erro ao consultar webappsstore2: {e}"))?;

    for item in rows.flatten() {
        let (scope, key, value) = item;
        // Scope no Firefox é formatado com domínio invertido (ex: moc.drocsid.:https:443)
        let origin = parse_reversed_scope(&scope);
        result.entry(origin).or_default().insert(key, value);
    }

    Ok(result)
}

/// Reverte o escopo invertido do Firefox para uma origem padrão
fn parse_reversed_scope(scope: &str) -> String {
    if let Some((rev_domain, rest)) = scope.split_once(':') {
        let domain: String = rev_domain.chars().rev().collect();
        let clean_domain = domain.trim_start_matches('.');
        format!("{rest}://{clean_domain}")
    } else {
        scope.to_string()
    }
}

/// Extrai a sessão unificada completa: Cookies + LocalStorage
pub fn extract_unified_session(profile_dir: &Path) -> Result<UnifiedSession, String> {
    let cookie_stats = extract_cookies(profile_dir)?;
    let local_storage = extract_local_storage(profile_dir)?;

    let total_cookies = cookie_stats.total_count;
    let total_storage_items = local_storage.values().map(|m| m.len()).sum();

    Ok(UnifiedSession {
        cookies: cookie_stats.cookies,
        local_storage,
        total_cookies,
        total_storage_items,
    })
}
