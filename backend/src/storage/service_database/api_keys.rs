use super::data::Vault;
use rand::RngCore;
use rusqlite::params;
use std::sync::Arc;

pub const MCP_TOKEN_META_KEY: &str = "mcp_token";
pub const TOKEN_PREFIX: &str = "star_sec_";

/// Módulo de gerenciamento de chaves de autenticação do Star Multlogin (MCP e API).
/// Gera chaves únicas criptograficamente seguras e persiste no cofre SQLite (vault_meta).
#[derive(Clone)]
pub struct ApiKeyService {
    vault: Arc<Vault>,
}

impl ApiKeyService {
    pub fn new(vault: Arc<Vault>) -> Self {
        Self { vault }
    }

    /// Gera uma nova chave criptográfica no formato star_sec_<48_hex_chars>
    pub fn generate_token() -> String {
        let mut random_bytes = [0u8; 24]; // 24 bytes -> 48 caracteres hexadecimais
        rand::thread_rng().fill_bytes(&mut random_bytes);
        let hex: String = random_bytes.iter().map(|b| format!("{:02x}", b)).collect();
        format!("{TOKEN_PREFIX}{hex}")
    }

    /// Obtém o token existente no banco de dados SQLite ou gera e persiste um novo se ainda não existir
    pub fn get_or_create_token(&self) -> Result<String, String> {
        let conn = self.vault.conn();
        let conn_guard = conn.lock().map_err(|e| format!("Lock error: {e}"))?;

        // 1. Tenta carregar token existente
        let existing: Option<String> = conn_guard
            .query_row(
                "SELECT value FROM vault_meta WHERE key = ?1",
                params![MCP_TOKEN_META_KEY],
                |row| row.get(0),
            )
            .ok();

        if let Some(token) = existing {
            if token.starts_with(TOKEN_PREFIX) && token.len() >= 20 {
                return Ok(token);
            }
        }

        // 2. Se não existir ou for inválido, gera um novo e persiste
        let new_token = Self::generate_token();
        conn_guard
            .execute(
                "INSERT INTO vault_meta (key, value) VALUES (?1, ?2)
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                params![MCP_TOKEN_META_KEY, &new_token],
            )
            .map_err(|e| format!("Erro ao salvar novo token no banco: {e}"))?;

        tracing::info!("🔑 Novo token de autenticação MCP gerado e armazenado com sucesso no Star Vault");
        Ok(new_token)
    }

    /// Rotaciona/regenera o token e salva no banco de dados SQLite
    pub fn rotate_token(&self) -> Result<String, String> {
        let new_token = Self::generate_token();
        let conn = self.vault.conn();
        let conn_guard = conn.lock().map_err(|e| format!("Lock error: {e}"))?;

        conn_guard
            .execute(
                "INSERT INTO vault_meta (key, value) VALUES (?1, ?2)
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                params![MCP_TOKEN_META_KEY, &new_token],
            )
            .map_err(|e| format!("Erro ao atualizar token no banco: {e}"))?;

        tracing::info!("🔄 Token de autenticação MCP rotacionado com sucesso no Star Vault");
        Ok(new_token)
    }

    /// Valida um token fornecido contra o token ativo no banco de dados
    /// Utiliza comparação em tempo constante para evitar ataques de temporização (timing attacks)
    pub fn verify_token(&self, candidate: &str) -> bool {
        if candidate.is_empty() {
            return false;
        }

        let current = match self.get_or_create_token() {
            Ok(t) => t,
            Err(_) => return false,
        };

        crate::security::constant_time_eq(candidate.as_bytes(), current.as_bytes())
    }
}
