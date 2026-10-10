use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use rusqlite::{params, Connection};
use tracing::info;
use crate::extraction_session::{ImportCookieResult, UnifiedCookie, UnifiedSession};

const UNIX_TO_CHROMIUM_EPOCH_MICROS: i64 = 11_644_473_600_000_000;

/// Converte Unix timestamp (segundos) para Chromium timestamp (microssegundos desde 1601-01-01)
fn unix_to_chromium_time(unix_sec: i64) -> i64 {
    if unix_sec <= 0 {
        0
    } else {
        (unix_sec.saturating_mul(1_000_000)).saturating_add(UNIX_TO_CHROMIUM_EPOCH_MICROS)
    }
}

/// Converte Chromium timestamp (microssegundos) para Unix timestamp (segundos)
fn chromium_to_unix_time(chromium_micros: i64) -> Option<i64> {
    if chromium_micros <= 0 {
        None
    } else {
        let sec = (chromium_micros.saturating_sub(UNIX_TO_CHROMIUM_EPOCH_MICROS)) / 1_000_000;
        Some(sec)
    }
}

/// Retorna o caminho do banco SQLite de cookies do Chromium (prioriza Default/Network/Cookies do Chromium moderno)
pub fn get_chromium_cookie_db_path(profile_dir: &Path) -> PathBuf {
    let p_net = profile_dir.join("Default").join("Network").join("Cookies");
    let p_root = profile_dir.join("Default").join("Cookies");
    if p_net.exists() {
        p_net
    } else if p_root.exists() {
        p_root
    } else {
        p_net
    }
}

/// Garante que o schema da tabela cookies e meta v24 existam no banco SQLite do Chromium
pub fn ensure_chromium_cookie_db(db_path: &Path) -> Result<(), String> {
    if let Some(parent) = db_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Falha ao criar diretório do banco de cookies: {e}"))?;
    }

    let conn = Connection::open(db_path)
        .map_err(|e| format!("Falha ao abrir SQLite de cookies do Chromium: {e}"))?;

    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS meta (key TEXT NOT NULL UNIQUE PRIMARY KEY, value TEXT);
         INSERT OR IGNORE INTO meta (key, value) VALUES ('version', '24');
         INSERT OR IGNORE INTO meta (key, value) VALUES ('last_compatible_version', '24');
         CREATE TABLE IF NOT EXISTS cookies (
            creation_utc INTEGER NOT NULL,
            host_key TEXT NOT NULL,
            top_frame_site_key TEXT NOT NULL DEFAULT '',
            name TEXT NOT NULL,
            value TEXT NOT NULL,
            encrypted_value BLOB NOT NULL DEFAULT X'',
            path TEXT NOT NULL,
            expires_utc INTEGER NOT NULL,
            is_secure INTEGER NOT NULL,
            is_httponly INTEGER NOT NULL,
            last_access_utc INTEGER NOT NULL,
            has_expires INTEGER NOT NULL,
            is_persistent INTEGER NOT NULL,
            priority INTEGER NOT NULL DEFAULT 1,
            samesite INTEGER NOT NULL DEFAULT -1,
            source_scheme INTEGER NOT NULL DEFAULT 0,
            source_port INTEGER NOT NULL DEFAULT -1,
            last_update_utc INTEGER NOT NULL DEFAULT 0,
            source_type INTEGER NOT NULL DEFAULT 0,
            has_cross_site_ancestor INTEGER NOT NULL DEFAULT 0,
            CONSTRAINT cookie_unique UNIQUE (host_key, top_frame_site_key, name, path)
        );
        CREATE INDEX IF NOT EXISTS num_cookies_index ON cookies (host_key);",
    )
    .map_err(|e| format!("Falha ao inicializar tabela cookies do Chromium: {e}"))?;

    Ok(())
}

/// Injeta uma lista de UnifiedCookies no banco SQLite nativo do Chromium
pub fn inject_chromium_cookies(
    profile_dir: &Path,
    cookies: &[UnifiedCookie],
) -> Result<ImportCookieResult, String> {
    if cookies.is_empty() {
        return Ok(ImportCookieResult::default());
    }

    let db_path = get_chromium_cookie_db_path(profile_dir);
    ensure_chromium_cookie_db(&db_path)?;

    let mut conn = Connection::open(&db_path)
        .map_err(|e| format!("Falha ao conectar no banco de cookies do Chromium: {e}"))?;

    let now_micros = unix_to_chromium_time(chrono::Utc::now().timestamp());

    let tx = conn
        .transaction()
        .map_err(|e| format!("Falha ao abrir transação SQLite: {e}"))?;

    let mut imported = 0;
    let mut skipped = 0;
    let mut errors = Vec::new();

    for cookie in cookies {
        let host_key = if cookie.domain.starts_with('.') || cookie.domain.starts_with("http") {
            cookie.domain.clone()
        } else {
            format!(".{}", cookie.domain)
        };

        let expires_utc = cookie.expiry.map(unix_to_chromium_time).unwrap_or(0);
        let has_expires = if expires_utc > 0 { 1 } else { 0 };
        let is_persistent = has_expires;

        let samesite_val = match cookie.same_site.to_lowercase().as_str() {
            "strict" => 2,
            "lax" => 1,
            "none" => 0,
            _ => -1,
        };

        let source_scheme = if cookie.is_secure { 2 } else { 1 };

        let res = tx.execute(
            "INSERT OR REPLACE INTO cookies (
                creation_utc, host_key, top_frame_site_key, name, value, encrypted_value,
                path, expires_utc, is_secure, is_httponly, last_access_utc, has_expires,
                is_persistent, priority, samesite, source_scheme, source_port, last_update_utc,
                source_type, has_cross_site_ancestor
            ) VALUES (
                ?1, ?2, '', ?3, ?4, X'', ?5, ?6, ?7, ?8, ?1, ?9, ?10, 1, ?11, ?12, -1, ?1, 0, 0
            )",
            params![
                now_micros,
                host_key,
                cookie.name,
                cookie.value,
                cookie.path,
                expires_utc,
                if cookie.is_secure { 1 } else { 0 },
                if cookie.is_http_only { 1 } else { 0 },
                has_expires,
                is_persistent,
                samesite_val,
                source_scheme,
            ],
        );

        match res {
            Ok(_) => imported += 1,
            Err(e) => {
                skipped += 1;
                errors.push(format!("Cookie {}: {}", cookie.name, e));
            }
        }
    }

    tx.commit()
        .map_err(|e| format!("Falha ao confirmar injeção de cookies no Chromium: {e}"))?;

    info!("🍪 [Clearcote] Injetados {} cookies com sucesso no perfil Chromium", imported);

    Ok(ImportCookieResult {
        imported,
        skipped,
        errors,
    })
}

/// Extrai a sessão completa de cookies do banco de dados SQLite do Chromium
pub fn extract_chromium_session(profile_dir: &Path) -> Result<UnifiedSession, String> {
    let db_path = get_chromium_cookie_db_path(profile_dir);
    if !db_path.exists() {
        return Ok(UnifiedSession::default());
    }

    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Falha ao conectar no SQLite de cookies do Chromium: {e}"))?;

    let mut stmt = conn
        .prepare(
            "SELECT name, value, host_key, path, expires_utc, is_secure, is_httponly, samesite 
             FROM cookies",
        )
        .map_err(|e| format!("Falha ao preparar consulta de cookies: {e}"))?;

    let rows = stmt
        .query_map([], |row| {
            let name: String = row.get(0)?;
            let value: String = row.get(1)?;
            let host_key: String = row.get(2)?;
            let path: String = row.get(3)?;
            let expires_utc: i64 = row.get(4)?;
            let is_secure: i64 = row.get(5)?;
            let is_httponly: i64 = row.get(6)?;
            let samesite: i64 = row.get(7)?;

            let same_site_str = match samesite {
                2 => "Strict".to_string(),
                1 => "Lax".to_string(),
                0 => "None".to_string(),
                _ => "Unspecified".to_string(),
            };

            let expiry = chromium_to_unix_time(expires_utc);

            Ok(UnifiedCookie {
                name,
                value,
                domain: host_key,
                path,
                expiry,
                is_secure: is_secure == 1,
                is_http_only: is_httponly == 1,
                same_site: same_site_str,
            })
        })
        .map_err(|e| format!("Falha ao iterar cookies: {e}"))?;

    let mut cookies = Vec::new();
    for r in rows {
        if let Ok(c) = r {
            if !c.value.is_empty() {
                cookies.push(c);
            }
        }
    }

    let total_cookies = cookies.len();
    Ok(UnifiedSession {
        cookies,
        local_storage: HashMap::new(),
        total_cookies,
        total_storage_items: 0,
    })
}

/// Extrai a sessão conectando via CDP probe rápido quando o perfil possui cookies criptografados pelo Chromium
pub async fn extract_chromium_session_cdp_probe(
    binary_path: &Path,
    profile_dir: &Path,
) -> Result<UnifiedSession, String> {
    let port = crate::launcher::engine::cdp::pick_available_port();
    let mut cmd = tokio::process::Command::new(binary_path);
    cmd.arg("--headless=new")
        .arg(format!("--user-data-dir={}", profile_dir.display()))
        .arg(format!("--remote-debugging-port={port}"))
        .arg("--remote-debugging-address=127.0.0.1")
        .arg("--remote-allow-origins=*")
        .arg("--no-sandbox")
        .arg("about:blank")
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null());

    let mut child = cmd.spawn().map_err(|e| format!("Falha ao disparar probe CDP: {e}"))?;
    let client = reqwest::Client::new();
    let ws_url_opt = crate::launcher::engine::cdp::wait_for_devtools_endpoint(port, &client, true).await;

    let res = if let Some(ws_url) = ws_url_opt {
        crate::launcher::engine::cdp::fetch_cookies_via_cdp(&ws_url).await
    } else {
        Err("CDP probe não respondeu a tempo".to_string())
    };

    let _ = child.kill().await;

    let cookies = res?;
    let total_cookies = cookies.len();
    Ok(UnifiedSession {
        cookies,
        local_storage: HashMap::new(),
        total_cookies,
        total_storage_items: 0,
    })
}
