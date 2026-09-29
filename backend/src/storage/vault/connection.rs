use rusqlite::Connection;
use std::path::{Path, PathBuf};

pub fn vault_db_path(data_dir: &Path) -> PathBuf {
    data_dir.join("star_vault.db")
}

pub fn open_vault_connection(data_dir: &Path) -> Result<Connection, rusqlite::Error> {
    let db_path = vault_db_path(data_dir);
    if let Some(parent) = db_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    let conn = Connection::open(&db_path)?;

    // Aplica permissão estrita POSIX 0600 no arquivo do banco
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let perms = std::fs::Permissions::from_mode(0o600);
        let _ = std::fs::set_permissions(&db_path, perms);
    }

    // Configurações de alta performance e resiliência ACID
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA synchronous = NORMAL;
         PRAGMA foreign_keys = ON;
         PRAGMA busy_timeout = 5000;",
    )?;

    init_schema(&conn)?;

    Ok(conn)
}

fn init_schema(conn: &Connection) -> Result<(), rusqlite::Error> {
    conn.execute_batch(
        "-- Tabela de integridade e metadados do cofre
        CREATE TABLE IF NOT EXISTS vault_meta (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        -- Tabela de perfis do navegador (Camoufox / Antidetect)
        CREATE TABLE IF NOT EXISTS profiles (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            group_name TEXT NOT NULL DEFAULT 'Desagrupado',
            status TEXT NOT NULL DEFAULT 'ready',
            kernel TEXT NOT NULL DEFAULT 'Camoufox',
            browser_version TEXT NOT NULL DEFAULT '150',
            os TEXT NOT NULL DEFAULT 'linux',
            payload_enc BLOB NOT NULL,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            last_launch INTEGER,
            is_deleted INTEGER NOT NULL DEFAULT 0,
            deleted_at INTEGER
        );

        -- Tabela de proxies com credenciais (usuário e senha) criptografados com AES-256-GCM
        CREATE TABLE IF NOT EXISTS proxies (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            proxy_type TEXT NOT NULL,
            host TEXT NOT NULL,
            port TEXT NOT NULL,
            credentials_enc BLOB NOT NULL,
            ip TEXT,
            country TEXT,
            status TEXT NOT NULL DEFAULT 'active',
            created_at INTEGER NOT NULL
        );

        -- Tabela de tags de organização
        CREATE TABLE IF NOT EXISTS tags (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            color TEXT NOT NULL,
            created_at INTEGER NOT NULL
        );

        -- Tabela de sessão da nuvem com JWT curto e refresh token de 30 dias criptografados
        CREATE TABLE IF NOT EXISTS auth_sessions (
            user_id TEXT PRIMARY KEY,
            email TEXT NOT NULL,
            name TEXT,
            plan TEXT NOT NULL DEFAULT 'free',
            max_profiles INTEGER NOT NULL DEFAULT 10,
            profile_count INTEGER NOT NULL DEFAULT 0,
            session_enc BLOB NOT NULL,
            expires_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        -- Tabela de token de automação do protocolo MCP
        CREATE TABLE IF NOT EXISTS mcp_tokens (
            id TEXT PRIMARY KEY,
            token_enc BLOB NOT NULL,
            created_at INTEGER NOT NULL
        );

        INSERT OR IGNORE INTO vault_meta (key, value) VALUES ('version', '1');
        INSERT OR IGNORE INTO vault_meta (key, value) VALUES ('cipher', 'AES-256-GCM');
        INSERT OR IGNORE INTO vault_meta (key, value) VALUES ('kdf', 'PBKDF2-HMAC-SHA256');",
    )?;

    Ok(())
}
