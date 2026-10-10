use rusqlite::{params, Connection};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use tracing::info;

use crate::extraction_session::{
    fire_fox::{escape_firefox_origin, parse_cookies_input},
    ImportCookieResult, UnifiedCookie,
};

/// Obtém o caminho do banco de cookies do perfil Firefox/Camoufox
pub fn get_cookie_db_path(profile_dir: &Path) -> PathBuf {
    profile_dir.join("cookies.sqlite")
}

/// Garante que o banco e o schema moz_cookies existam caso o perfil seja novo
pub fn ensure_cookie_db_schema(db_path: &Path) -> Result<(), String> {
    if let Some(parent) = db_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let conn = Connection::open(db_path)
        .map_err(|e| format!("Falha ao abrir/criar banco de cookies: {e}"))?;

    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS moz_meta (
            key TEXT NOT NULL PRIMARY KEY,
            value TEXT
        );
        INSERT OR IGNORE INTO moz_meta (key, value) VALUES ('version', '14');
        CREATE TABLE IF NOT EXISTS moz_cookies (
            id INTEGER PRIMARY KEY,
            originAttributes TEXT NOT NULL DEFAULT '',
            name TEXT,
            value TEXT,
            host TEXT,
            path TEXT,
            expiry INTEGER,
            lastAccessed INTEGER,
            creationTime INTEGER,
            isSecure INTEGER,
            isHttpOnly INTEGER,
            inBrowserElement INTEGER DEFAULT 0,
            sameSite INTEGER DEFAULT 0,
            schemeMap INTEGER DEFAULT 0,
            isPartitionedAttributeSet INTEGER DEFAULT 0,
            updateTime INTEGER,
            CONSTRAINT moz_uniqueid UNIQUE (name, host, path, originAttributes)
        );
        CREATE INDEX IF NOT EXISTS moz_basedomain ON moz_cookies (host);",
    )
    .map_err(|e| format!("Falha ao inicializar tabela moz_cookies e moz_meta: {e}"))?;

    Ok(())
}

/// Injeta cookies diretamente no banco de dados SQLite moz_cookies do Camoufox
pub fn inject_cookies(
    profile_dir: &Path,
    cookies: &[UnifiedCookie],
) -> Result<ImportCookieResult, String> {
    if cookies.is_empty() {
        return Ok(ImportCookieResult::default());
    }

    let db_path = get_cookie_db_path(profile_dir);
    ensure_cookie_db_schema(&db_path)?;

    let mut conn = Connection::open(&db_path)
        .map_err(|e| format!("Falha ao conectar no banco para escrita: {e}"))?;

    let now_micros = chrono::Utc::now().timestamp_micros();

    let tx = conn
        .transaction()
        .map_err(|e| format!("Falha ao iniciar transação SQLite: {e}"))?;

    let mut imported = 0;
    let mut skipped = 0;
    let mut errors = Vec::new();

    for cookie in cookies {
        let expiry = cookie.expiry.unwrap_or(0);
        let same_site_int = match cookie.same_site.to_lowercase().as_str() {
            "lax" => 1,
            "strict" => 2,
            _ => 0,
        };

        let res = tx.execute(
            "INSERT OR REPLACE INTO moz_cookies (
                originAttributes, name, value, host, path, expiry, lastAccessed, creationTime,
                isSecure, isHttpOnly, inBrowserElement, sameSite, schemeMap, isPartitionedAttributeSet, updateTime
            ) VALUES (
                '', ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 0, ?10, 0, 0, ?6
            )",
            params![
                cookie.name,
                cookie.value,
                cookie.domain,
                cookie.path,
                expiry,
                now_micros,
                now_micros,
                if cookie.is_secure { 1 } else { 0 },
                if cookie.is_http_only { 1 } else { 0 },
                same_site_int,
            ],
        );

        match res {
            Ok(_) => imported += 1,
            Err(e) => {
                skipped += 1;
                errors.push(format!("Erro ao inserir {}: {}", cookie.name, e));
            }
        }
    }

    tx.commit()
        .map_err(|e| format!("Falha ao commitar transação de cookies: {e}"))?;

    info!(
        "🍪 Cookies injetados no Camoufox ({:?}): {} inseridos, {} ignorados",
        profile_dir, imported, skipped
    );

    Ok(ImportCookieResult {
        imported,
        skipped,
        errors,
    })
}

/// Analisa e injeta cookies a partir de texto bruto (JSON ou Netscape)
pub fn import_raw_cookies(
    profile_dir: &Path,
    raw_content: &str,
) -> Result<ImportCookieResult, String> {
    let cookies = parse_cookies_input(raw_content)?;
    inject_cookies(profile_dir, &cookies)
}

/// Injeta pares de chave/valor de LocalStorage na pasta nativa de partição do Camoufox
/// (storage/default/<escaped_origin>/ls/data.sqlite)
pub fn inject_local_storage(
    profile_dir: &Path,
    origin: &str,
    items: &HashMap<String, String>,
) -> Result<usize, String> {
    if items.is_empty() {
        return Ok(0);
    }

    let escaped_origin = escape_firefox_origin(origin);
    let ls_dir = profile_dir
        .join("storage")
        .join("default")
        .join(escaped_origin)
        .join("ls");

    std::fs::create_dir_all(&ls_dir)
        .map_err(|e| format!("Falha ao criar diretório de storage: {e}"))?;

    let db_path = ls_dir.join("data.sqlite");
    let mut conn = Connection::open(&db_path)
        .map_err(|e| format!("Falha ao abrir banco data.sqlite para injeção: {e}"))?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS data (
            key TEXT PRIMARY KEY,
            value TEXT
        )",
        [],
    )
    .map_err(|e| format!("Erro ao criar tabela data de LocalStorage: {e}"))?;

    let tx = conn
        .transaction()
        .map_err(|e| format!("Erro ao iniciar transação de LocalStorage: {e}"))?;

    let mut count = 0;
    for (k, v) in items {
        tx.execute(
            "INSERT OR REPLACE INTO data (key, value) VALUES (?1, ?2)",
            params![k, v],
        )
        .map_err(|e| format!("Erro ao inserir item de LocalStorage (chave: {k}): {e}"))?;
        count += 1;
    }

    tx.commit()
        .map_err(|e| format!("Erro ao commitar transação de LocalStorage: {e}"))?;

    info!(
        "💾 LocalStorage injetado no Camoufox para origem {}: {} chaves",
        origin, count
    );

    Ok(count)
}

/// Limpa todos os cookies do perfil no Camoufox
pub fn clear_profile_cookies(profile_dir: &Path) -> Result<usize, String> {
    let db_path = get_cookie_db_path(profile_dir);
    if !db_path.exists() {
        return Ok(0);
    }

    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Erro ao abrir cookies.sqlite: {e}"))?;

    let count = conn
        .execute("DELETE FROM moz_cookies", [])
        .map_err(|e| format!("Erro ao limpar cookies: {e}"))?;

    Ok(count)
}

/// Limpa todo o LocalStorage armazenado no perfil do Camoufox
pub fn clear_profile_storage(profile_dir: &Path) -> Result<(), String> {
    let storage_dir = profile_dir.join("storage").join("default");
    if storage_dir.exists() {
        let _ = std::fs::remove_dir_all(&storage_dir);
    }

    let legacy_db = profile_dir.join("webappsstore.sqlite");
    if legacy_db.exists() {
        let _ = std::fs::remove_file(&legacy_db);
    }

    Ok(())
}

/// Remove completamente os arquivos físicos temporários de cookies e LocalStorage do disco (Zero-Trace)
pub fn purge_ephemeral_session_files(profile_dir: &Path) {
    let _ = std::fs::remove_file(profile_dir.join("cookies.sqlite"));
    let _ = std::fs::remove_file(profile_dir.join("cookies.sqlite-wal"));
    let _ = std::fs::remove_file(profile_dir.join("cookies.sqlite-shm"));
    let storage_dir = profile_dir.join("storage").join("default");
    if storage_dir.exists() {
        let _ = std::fs::remove_dir_all(&storage_dir);
    }
    let legacy_db = profile_dir.join("webappsstore.sqlite");
    if legacy_db.exists() {
        let _ = std::fs::remove_file(&legacy_db);
    }
}

