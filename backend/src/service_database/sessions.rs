use rusqlite::params;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tracing::info;

use super::data::{crypto::decrypt_payload, crypto::encrypt_payload, Vault};
use crate::extraction_session::UnifiedSession;

fn now_secs() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

/// Serviço de gerenciamento de sessões efêmeras criptografadas em repouso no Star Vault
#[derive(Clone)]
pub struct SessionService {
    vault: Arc<Vault>,
}

impl SessionService {
    pub fn new(vault: Arc<Vault>) -> Self {
        Self { vault }
    }

    /// Salva ou atualiza a sessão do perfil de forma criptografada (AES-256-GCM) no Vault
    pub fn save_session(&self, profile_id: &str, session: &UnifiedSession) -> Result<(), String> {
        let serialized = serde_json::to_vec(session)
            .map_err(|e| format!("Falha ao serializar sessão unificada: {e}"))?;

        let session_enc = encrypt_payload(self.vault.key().as_ref(), &serialized)
            .map_err(|e| format!("Falha ao criptografar sessão para o Vault: {e}"))?;

        let total_cookies = session.cookies.len();
        let total_storage: usize = session.local_storage.values().map(|m| m.len()).sum();
        let updated_at = now_secs();

        let conn = self.vault.conn();
        let conn_guard = conn
            .lock()
            .map_err(|e| format!("Erro de concorrência ao acessar banco do Vault: {e}"))?;

        conn_guard
            .execute(
                "INSERT OR REPLACE INTO profile_sessions (
                    profile_id, session_enc, total_cookies, total_storage, updated_at
                ) VALUES (?1, ?2, ?3, ?4, ?5)",
                params![profile_id, session_enc, total_cookies, total_storage, updated_at],
            )
            .map_err(|e| format!("Erro ao salvar sessão criptografada no banco: {e}"))?;

        info!(
            "🔒 Sessão do perfil {} criptografada e salva no Star Vault ({} cookies, {} chaves de storage)",
            profile_id, total_cookies, total_storage
        );

        Ok(())
    }

    /// Carrega e descriptografa a sessão do perfil do Vault
    pub fn load_session(&self, profile_id: &str) -> Result<Option<UnifiedSession>, String> {
        let conn = self.vault.conn();
        let conn_guard = conn
            .lock()
            .map_err(|e| format!("Erro de concorrência ao acessar banco do Vault: {e}"))?;

        let mut stmt = conn_guard
            .prepare("SELECT session_enc FROM profile_sessions WHERE profile_id = ?1")
            .map_err(|e| format!("Erro ao preparar consulta de sessão: {e}"))?;

        let mut rows = stmt
            .query(params![profile_id])
            .map_err(|e| format!("Erro ao consultar sessão: {e}"))?;

        if let Some(row) = rows.next().map_err(|e| format!("Erro ao ler linha: {e}"))? {
            let session_enc: Vec<u8> = row.get(0).map_err(|e| format!("Erro ao ler blob: {e}"))?;
            let decrypted = decrypt_payload(self.vault.key().as_ref(), &session_enc)
                .map_err(|e| format!("Falha ao descriptografar sessão do Vault: {e}"))?;

            let session = serde_json::from_slice::<UnifiedSession>(&decrypted)
                .map_err(|e| format!("Falha ao desserializar sessão descriptografada: {e}"))?;

            Ok(Some(session))
        } else {
            Ok(None)
        }
    }

    /// Remove a sessão criptografada do Vault
    pub fn delete_session(&self, profile_id: &str) -> Result<bool, String> {
        let conn = self.vault.conn();
        let conn_guard = conn
            .lock()
            .map_err(|e| format!("Erro de concorrência ao acessar banco do Vault: {e}"))?;

        let affected = conn_guard
            .execute("DELETE FROM profile_sessions WHERE profile_id = ?1", params![profile_id])
            .map_err(|e| format!("Erro ao deletar sessão: {e}"))?;

        Ok(affected > 0)
    }

    /// Retorna estatísticas de contagem da sessão salva sem precisar desserializar tudo
    pub fn get_session_stats(&self, profile_id: &str) -> Result<Option<(usize, usize, i64)>, String> {
        let conn = self.vault.conn();
        let conn_guard = conn
            .lock()
            .map_err(|e| format!("Erro de concorrência ao acessar banco do Vault: {e}"))?;

        let mut stmt = conn_guard
            .prepare("SELECT total_cookies, total_storage, updated_at FROM profile_sessions WHERE profile_id = ?1")
            .map_err(|e| format!("Erro ao preparar consulta: {e}"))?;

        let mut rows = stmt
            .query(params![profile_id])
            .map_err(|e| format!("Erro ao consultar: {e}"))?;

        if let Some(row) = rows.next().map_err(|e| format!("Erro ao ler linha: {e}"))? {
            let total_cookies: usize = row.get(0).unwrap_or(0);
            let total_storage: usize = row.get(1).unwrap_or(0);
            let updated_at: i64 = row.get(2).unwrap_or(0);
            Ok(Some((total_cookies, total_storage, updated_at)))
        } else {
            Ok(None)
        }
    }
}
