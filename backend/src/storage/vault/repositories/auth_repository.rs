use crate::cloud_auth::service::PersistedAuthSession;
use crate::models::CloudUser;
use crate::security::ProtectedKey;
use crate::storage::vault::crypto::{decrypt_payload, encrypt_payload};
use crate::storage::vault::traits::AuthRepository;
use rusqlite::{params, Connection};
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

fn now_secs() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

#[derive(serde::Serialize, serde::Deserialize)]
struct EncryptedSessionTokens {
    access_token: String,
    refresh_token: String,
    expires_at: i64,
}

pub struct SqliteAuthRepository {
    conn: Arc<Mutex<Connection>>,
    key: Arc<ProtectedKey>,
}

impl SqliteAuthRepository {
    pub fn new(conn: Arc<Mutex<Connection>>, key: Arc<ProtectedKey>) -> Self {
        Self { conn, key }
    }
}

impl AuthRepository for SqliteAuthRepository {
    fn get(&self) -> Result<Option<PersistedAuthSession>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT user_id, email, name, plan, max_profiles, profile_count, session_enc FROM auth_sessions LIMIT 1")
            .map_err(|e| e.to_string())?;
        let mut rows = stmt.query([]).map_err(|e| e.to_string())?;

        if let Some(row) = rows.next().map_err(|e| e.to_string())? {
            let user_id: String = row.get(0).map_err(|e| e.to_string())?;
            let email: String = row.get(1).map_err(|e| e.to_string())?;
            let name: Option<String> = row.get(2).map_err(|e| e.to_string())?;
            let plan: String = row.get(3).map_err(|e| e.to_string())?;
            let max_profiles: i64 = row.get(4).map_err(|e| e.to_string())?;
            let profile_count: i64 = row.get(5).map_err(|e| e.to_string())?;
            let session_enc: Vec<u8> = row.get(6).map_err(|e| e.to_string())?;

            let decrypted = decrypt_payload(self.key.as_bytes(), &session_enc)?;
            let tokens = serde_json::from_slice::<EncryptedSessionTokens>(&decrypted).map_err(|e| e.to_string())?;

            Ok(Some(PersistedAuthSession {
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
                expires_at: tokens.expires_at,
            }))
        } else {
            Ok(None)
        }
    }

    fn save(&self, session: &PersistedAuthSession) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let tokens = EncryptedSessionTokens {
            access_token: session.access_token.clone(),
            refresh_token: session.refresh_token.clone(),
            expires_at: session.expires_at,
        };
        let tokens_bytes = serde_json::to_vec(&tokens).map_err(|e| e.to_string())?;
        let session_enc = encrypt_payload(self.key.as_bytes(), &tokens_bytes)?;
        let now = now_secs();

        conn.execute(
            "INSERT INTO auth_sessions (user_id, email, name, plan, max_profiles, profile_count, session_enc, expires_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
             ON CONFLICT(user_id) DO UPDATE SET
                email = excluded.email,
                name = excluded.name,
                plan = excluded.plan,
                max_profiles = excluded.max_profiles,
                profile_count = excluded.profile_count,
                session_enc = excluded.session_enc,
                expires_at = excluded.expires_at,
                updated_at = excluded.updated_at",
            params![
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
        .map_err(|e| e.to_string())?;

        Ok(())
    }

    fn clear(&self) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM auth_sessions", [])
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}
