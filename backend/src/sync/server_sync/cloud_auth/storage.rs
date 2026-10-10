use super::types::{AuthSession, EncryptedSessionTokens};
use crate::models::CloudUser;
use crate::service_database::Vault;
use std::sync::Arc;

/// Módulo de persistência no cofre local Star Vault (SQLite cifrado).
/// Totalmente isolado de rede e regras de PKCE.
pub struct VaultSessionStorage;

impl VaultSessionStorage {
    /// Carrega e decifra a sessão salva no cofre SQLite
    pub fn load_session(vault: &Arc<Vault>) -> Result<Option<AuthSession>, String> {
        let conn = vault.conn();
        let conn_guard = conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn_guard
            .prepare(
                "SELECT user_id, email, name, plan, max_profiles, profile_count, session_enc, expires_at FROM auth_sessions LIMIT 1",
            )
            .map_err(|e| e.to_string())?;
        let mut rows = stmt.query([]).map_err(|e| e.to_string())?;

        if let Some(row) = rows.next().map_err(|e| e.to_string())? {
            let user_id: String = row.get(0).map_err(|e| e.to_string())?;
            let email: String = row.get(1).map_err(|e| e.to_string())?;
            let name: Option<String> = row.get(2).map_err(|e| e.to_string())?;
            let plan: String = row.get(3).map_err(|e| e.to_string())?;
            let max_profiles: i64 = row.get(4).unwrap_or(10);
            let profile_count: i64 = row.get(5).unwrap_or(0);
            let session_enc: Vec<u8> = row.get(6).map_err(|e| e.to_string())?;
            let expires_at: i64 = row.get(7).unwrap_or(0);

            let decrypted = crate::service_database::data::crypto::decrypt_payload(
                vault.key().as_ref(),
                &session_enc,
            )?;
            let tokens = serde_json::from_slice::<EncryptedSessionTokens>(&decrypted)
                .map_err(|e| e.to_string())?;

            Ok(Some(AuthSession {
                user: CloudUser {
                    id: user_id,
                    email,
                    name,
                    plan,
                    max_profiles,
                    profile_count,
                },
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expires_at: if tokens.expires_at > 0 { tokens.expires_at } else { expires_at },
            }))
        } else {
            Ok(None)
        }
    }

    /// Cifra e persiste a sessão no cofre SQLite
    pub fn save_session(vault: &Arc<Vault>, session: &AuthSession) -> Result<(), String> {
        let conn = vault.conn();
        let conn_guard = conn.lock().map_err(|e| e.to_string())?;

        let tokens = EncryptedSessionTokens {
            access_token: session.access_token.clone(),
            refresh_token: session.refresh_token.clone(),
            expires_at: session.expires_at,
        };
        let serialized = serde_json::to_vec(&tokens).map_err(|e| e.to_string())?;
        let session_enc = crate::service_database::data::crypto::encrypt_payload(
            vault.key().as_ref(),
            &serialized,
        )?;

        let now = chrono::Utc::now().timestamp();

        conn_guard
            .execute(
                "INSERT INTO auth_sessions (
                    user_id, email, name, plan, max_profiles, profile_count, session_enc, expires_at, updated_at
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
                ON CONFLICT(user_id) DO UPDATE SET
                    email = excluded.email,
                    name = excluded.name,
                    plan = excluded.plan,
                    max_profiles = excluded.max_profiles,
                    profile_count = excluded.profile_count,
                    session_enc = excluded.session_enc,
                    expires_at = excluded.expires_at,
                    updated_at = excluded.updated_at",
                rusqlite::params![
                    session.user.id,
                    session.user.email,
                    session.user.name,
                    session.user.plan,
                    session.user.max_profiles,
                    session.user.profile_count,
                    session_enc,
                    session.expires_at,
                    now,
                ],
            )
            .map_err(|e| format!("Erro ao salvar sessão no Star Vault: {e}"))?;

        Ok(())
    }

    /// Purga todos os registros de sessão (Logout)
    pub fn purge_session(vault: &Arc<Vault>) -> Result<(), String> {
        let conn = vault.conn();
        let guard = conn.lock().map_err(|e| e.to_string())?;
        let _ = guard.execute("DELETE FROM auth_sessions", []);
        Ok(())
    }
}
