pub mod connection;
pub mod crypto;
pub mod schema;

use crate::security::ProtectedKey;
use rusqlite::Connection;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

/// Cofre seguro e conexão central com o banco SQLite.
/// Responsabilidade: Manter o pool de conexões e executar o schema.rs único.
#[derive(Clone)]
pub struct Vault {
    data_dir: PathBuf,
    conn: Arc<Mutex<Connection>>,
    key: Arc<ProtectedKey>,
}

impl Vault {
    pub fn new(data_dir: &Path) -> Result<Self, String> {
        let key = crate::security::derive_vault_key(data_dir)
            .map_err(|e| format!("Falha na derivação da chave do banco: {e}"))?;
        let conn = connection::open_vault_connection(data_dir)
            .map_err(|e| format!("Falha ao conectar no star_vault.db: {e}"))?;

        tracing::info!("🔒 Star Vault inicializado com sucesso em service_database/data (SQLite WAL mode)");

        Ok(Self {
            data_dir: data_dir.to_path_buf(),
            conn: Arc::new(Mutex::new(conn)),
            key: Arc::new(key),
        })
    }

    pub fn conn(&self) -> Arc<Mutex<Connection>> {
        self.conn.clone()
    }

    pub fn key(&self) -> Arc<ProtectedKey> {
        self.key.clone()
    }

    pub fn data_dir(&self) -> &Path {
        &self.data_dir
    }

    pub fn encrypt(&self, data: &[u8]) -> Result<Vec<u8>, String> {
        crate::security::encrypt_payload(self.key.as_ref(), data)
    }

    pub fn decrypt(&self, data: &[u8]) -> Result<Vec<u8>, String> {
        crate::security::decrypt_payload(self.key.as_ref(), data)
    }

    pub fn encrypt_payload(key: impl AsRef<[u8]>, data: &[u8]) -> Result<Vec<u8>, String> {
        crate::security::encrypt_payload(key, data)
    }

    pub fn decrypt_payload(key: impl AsRef<[u8]>, data: &[u8]) -> Result<Vec<u8>, String> {
        crate::security::decrypt_payload(key, data)
    }
}
