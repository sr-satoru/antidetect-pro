use rusqlite::{Connection, OpenFlags};
use std::collections::HashMap;
use std::path::{Path, PathBuf};

use crate::extraction_session::{CookieStats, DomainSummary, UnifiedCookie};

/// Caminho do banco de cookies do perfil Firefox/Camoufox
pub fn get_cookie_db_path(profile_dir: &Path) -> PathBuf {
    profile_dir.join("cookies.sqlite")
}

/// Formata uma URI válida do SQLite compatível com Windows e Unix em modo somente-leitura imutável
pub fn format_sqlite_uri(path: &Path) -> String {
    let p_str = path.to_string_lossy().replace('\\', "/");
    if p_str.starts_with('/') {
        format!("file:{}?mode=ro&immutable=1", p_str)
    } else {
        format!("file:///{}?mode=ro&immutable=1", p_str)
    }
}

/// Lê e extrai todos os cookies do perfil do Camoufox (mesmo com navegador aberto)
pub fn extract_cookies(profile_dir: &Path) -> Result<CookieStats, String> {
    let db_path = get_cookie_db_path(profile_dir);
    if !db_path.exists() {
        return Ok(CookieStats {
            total_count: 0,
            domains: vec![],
            cookies: vec![],
        });
    }

    let flags = OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_URI;
    let uri = format_sqlite_uri(&db_path);
    let conn = Connection::open_with_flags(&uri, flags)
        .or_else(|_| Connection::open_with_flags(&db_path, flags))
        .map_err(|e| format!("Não foi possível abrir cookies.sqlite: {e}"))?;

    let mut stmt = conn
        .prepare(
            "SELECT name, value, host, path, expiry, isSecure, isHttpOnly, sameSite 
             FROM moz_cookies 
             ORDER BY host ASC, name ASC",
        )
        .map_err(|e| format!("Erro ao preparar consulta de cookies: {e}"))?;

    let mut cookies = Vec::new();
    let mut domain_counts: HashMap<String, usize> = HashMap::new();

    let rows = stmt
        .query_map([], |row| {
            let same_site_int: i32 = row.get(7).unwrap_or(0);
            let same_site_str = match same_site_int {
                1 => "Lax",
                2 => "Strict",
                _ => "None",
            };

            let raw_expiry: Option<i64> = row.get(4).ok();
            let expiry = match raw_expiry {
                Some(0) => None,
                other => other,
            };

            Ok(UnifiedCookie {
                name: row.get(0).unwrap_or_default(),
                value: row.get(1).unwrap_or_default(),
                domain: row.get(2).unwrap_or_default(),
                path: row.get(3).unwrap_or_default(),
                expiry,
                is_secure: row.get::<_, i32>(5).unwrap_or(0) == 1,
                is_http_only: row.get::<_, i32>(6).unwrap_or(0) == 1,
                same_site: same_site_str.to_string(),
            })
        })
        .map_err(|e| format!("Erro ao ler cookies: {e}"))?;

    for cookie_result in rows {
        if let Ok(cookie) = cookie_result {
            *domain_counts.entry(cookie.domain.clone()).or_insert(0) += 1;
            cookies.push(cookie);
        }
    }

    let mut domains: Vec<DomainSummary> = domain_counts
        .into_iter()
        .map(|(domain, count)| DomainSummary { domain, count })
        .collect();
    domains.sort_by(|a, b| b.count.cmp(&a.count).then_with(|| a.domain.cmp(&b.domain)));

    let total_count = cookies.len();
    Ok(CookieStats {
        total_count,
        domains,
        cookies,
    })
}
