use rusqlite::{Connection, OpenFlags};
use std::path::Path;

/// Abre ou cria a conexão SQLite do cofre Star Vault com WAL mode e tabela inicializada
pub fn open_vault_connection(data_dir: &Path) -> Result<Connection, rusqlite::Error> {
    let db_dir = data_dir.join("data");
    let _ = std::fs::create_dir_all(&db_dir);
    let db_path = db_dir.join("star_vault.db");

    let conn = Connection::open_with_flags(
        &db_path,
        OpenFlags::SQLITE_OPEN_READ_WRITE
            | OpenFlags::SQLITE_OPEN_CREATE
            | OpenFlags::SQLITE_OPEN_NO_MUTEX,
    )?;

    // Configurações de alta performance e integridade concorrente
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA synchronous = NORMAL;
         PRAGMA foreign_keys = ON;
         PRAGMA busy_timeout = 5000;",
    )?;

    super::schema::init_tables(&conn)?;

    Ok(conn)
}
