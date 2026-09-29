use crate::security::ProtectedKey;
use crate::storage::vault::crypto::{decrypt_payload, encrypt_payload};
use crate::storage::vault::traits::McpRepository;
use rusqlite::{params, Connection};
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

fn now_secs() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

pub struct SqliteMcpRepository {
    conn: Arc<Mutex<Connection>>,
    key: Arc<ProtectedKey>,
}

impl SqliteMcpRepository {
    pub fn new(conn: Arc<Mutex<Connection>>, key: Arc<ProtectedKey>) -> Self {
        Self { conn, key }
    }
}

impl McpRepository for SqliteMcpRepository {
    fn get_token(&self) -> Result<Option<String>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT token_enc FROM mcp_tokens WHERE id = 'primary' LIMIT 1")
            .map_err(|e| e.to_string())?;
        let mut rows = stmt.query([]).map_err(|e| e.to_string())?;

        if let Some(row) = rows.next().map_err(|e| e.to_string())? {
            let token_enc: Vec<u8> = row.get(0).map_err(|e| e.to_string())?;
            let decrypted = decrypt_payload(self.key.as_bytes(), &token_enc)?;
            let token = String::from_utf8(decrypted).map_err(|e| e.to_string())?;
            Ok(Some(token))
        } else {
            Ok(None)
        }
    }

    fn save_token(&self, token: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let token_enc = encrypt_payload(self.key.as_bytes(), token.as_bytes())?;
        let now = now_secs();

        conn.execute(
            "INSERT INTO mcp_tokens (id, token_enc, created_at) VALUES ('primary', ?1, ?2)
             ON CONFLICT(id) DO UPDATE SET token_enc = excluded.token_enc",
            params![token_enc, now],
        )
        .map_err(|e| e.to_string())?;

        Ok(())
    }
}
