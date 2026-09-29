pub mod connection;
pub mod crypto;
pub mod purge;
pub mod repositories;
pub mod traits;

use crate::security::derive_vault_key;
use connection::open_vault_connection;
use purge::clean_slate_purge_legacy_files;
use repositories::{
    SqliteAuthRepository, SqliteMcpRepository, SqliteProfileRepository, SqliteProxyRepository,
    SqliteTagRepository,
};
pub use traits::{AuthRepository, McpRepository, ProfileRepository, ProxyRepository, TagRepository};

use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

/// Facade central do cofre criptografado Star Secure Vault
#[derive(Clone)]
pub struct StarVault {
    data_dir: PathBuf,
    profiles: Arc<dyn ProfileRepository>,
    proxies: Arc<dyn ProxyRepository>,
    tags: Arc<dyn TagRepository>,
    auth: Arc<dyn AuthRepository>,
    mcp: Arc<dyn McpRepository>,
}

impl StarVault {
    /// Inicializa o cofre com chave vinculada à máquina, WAL mode e repositórios desacoplados
    pub fn new(data_dir: &Path) -> Result<Self, String> {
        // 1. Executa a purga Clean Slate dos arquivos legados
        clean_slate_purge_legacy_files(data_dir);

        // 2. Deriva a chave de 256 bits protegida
        let key = derive_vault_key(data_dir)
            .map_err(|e| format!("Falha na derivação da chave do cofre: {e}"))?;
        let protected_key = Arc::new(key);

        // 3. Abre a conexão SQLite configurada em WAL mode
        let conn = open_vault_connection(data_dir)
            .map_err(|e| format!("Falha ao conectar no star_vault.db: {e}"))?;
        let shared_conn = Arc::new(Mutex::new(conn));

        // 4. Instancia os repositórios desacoplados
        let profiles = Arc::new(SqliteProfileRepository::new(
            shared_conn.clone(),
            protected_key.clone(),
        ));
        let proxies = Arc::new(SqliteProxyRepository::new(
            shared_conn.clone(),
            protected_key.clone(),
        ));
        let tags = Arc::new(SqliteTagRepository::new(shared_conn.clone()));
        let auth = Arc::new(SqliteAuthRepository::new(
            shared_conn.clone(),
            protected_key.clone(),
        ));
        let mcp = Arc::new(SqliteMcpRepository::new(
            shared_conn.clone(),
            protected_key.clone(),
        ));

        tracing::info!("🔒 Star Secure Vault inicializado com sucesso (TDE SQLite WAL)");

        Ok(Self {
            data_dir: data_dir.to_path_buf(),
            profiles,
            proxies,
            tags,
            auth,
            mcp,
        })
    }

    pub fn data_dir(&self) -> &Path {
        &self.data_dir
    }

    pub fn profiles(&self) -> Arc<dyn ProfileRepository> {
        self.profiles.clone()
    }

    pub fn proxies(&self) -> Arc<dyn ProxyRepository> {
        self.proxies.clone()
    }

    pub fn tags(&self) -> Arc<dyn TagRepository> {
        self.tags.clone()
    }

    pub fn auth(&self) -> Arc<dyn AuthRepository> {
        self.auth.clone()
    }

    pub fn mcp(&self) -> Arc<dyn McpRepository> {
        self.mcp.clone()
    }
}

#[cfg(test)]
mod tests;

