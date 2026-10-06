use rusqlite::Connection;

/// Schema único e centralizado de todas as tabelas do banco de dados SQLite (Star Vault).
/// Mantém as definições de tabela isoladas e unificadas em um único lugar.
pub fn init_tables(conn: &Connection) -> Result<(), rusqlite::Error> {
    conn.execute_batch(
        "-- Metadados gerais do banco de dados
        CREATE TABLE IF NOT EXISTS vault_meta (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        -- Tabela isolada de perfis de navegadores antidetect (Camoufox / Chromium)
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

        -- Tabela isolada de proxies com credenciais criptografadas em AES-256-GCM
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

        -- Tabela isolada de tags de organização e cores (ID autoincremento e cor obrigatória)
        CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            color TEXT NOT NULL DEFAULT '#1677FF',
            created_at INTEGER NOT NULL
        );


        -- Tabela isolada de extensões salvas da equipe
        CREATE TABLE IF NOT EXISTS extensions (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            payload TEXT NOT NULL,
            created_at INTEGER NOT NULL
        );

        -- Tabela isolada de sessão e autenticação na nuvem
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

        -- Tabela isolada de categorias e kits de extensões
        CREATE TABLE IF NOT EXISTS extension_categories (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            extensions_json TEXT NOT NULL DEFAULT '[]',
            is_default INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        );

        -- Tabela isolada de sessões efêmeras criptografadas em repouso (Zero-Trace)
        CREATE TABLE IF NOT EXISTS profile_sessions (
            profile_id TEXT PRIMARY KEY,
            session_enc BLOB NOT NULL,
            total_cookies INTEGER NOT NULL DEFAULT 0,
            total_storage INTEGER NOT NULL DEFAULT 0,
            updated_at INTEGER NOT NULL,
            FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
        );

        INSERT OR IGNORE INTO vault_meta (key, value) VALUES ('version', '1');
        INSERT OR IGNORE INTO vault_meta (key, value) VALUES ('cipher', 'AES-256-GCM');
        INSERT OR IGNORE INTO extension_categories (id, name, description, extensions_json, is_default, created_at, updated_at)
        VALUES ('kit_basico', 'kit basico', 'Extensões padrão essenciais para o perfil', '[]', 1, strftime('%s','now'), strftime('%s','now'));",
    )?;

    // Migrações incrementais seguras para a tabela profiles
    let _ = conn.execute("ALTER TABLE profiles ADD COLUMN version INTEGER DEFAULT 1", []);
    let _ = conn.execute("ALTER TABLE profiles ADD COLUMN cloud_hash TEXT", []);
    let _ = conn.execute("ALTER TABLE profiles ADD COLUMN server_id INTEGER", []);

    // Limpeza de tabelas legadas/obsoletas
    let _ = conn.execute("DROP TABLE IF EXISTS profile_tags", []);

    Ok(())
}
