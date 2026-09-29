use std::sync::Arc;

use super::crypto::rotate_token;
use crate::security::database::descrypto::decrypt_payload;
use crate::service_database::Vault;

/// Obtém o token ativo do cofre seguro descriptografando-o ou gera um novo caso não exista
pub fn ensure_token(vault: Arc<Vault>) -> Result<String, std::io::Error> {
    let conn = vault.conn();
    if let Ok(conn_guard) = conn.lock() {
        let token_enc_opt: Option<Vec<u8>> = conn_guard
            .query_row(
                "SELECT token_enc FROM mcp_tokens WHERE id = 'active' OR id = 'primary' ORDER BY created_at DESC LIMIT 1",
                [],
                |row| row.get(0),
            )
            .ok();

        if let Some(token_enc) = token_enc_opt {
            if let Ok(dec) = decrypt_payload(vault.key().as_ref(), &token_enc) {
                if let Ok(s) = String::from_utf8(dec) {
                    let trimmed = s.trim().to_string();
                    if !trimmed.is_empty() {
                        return Ok(trimmed);
                    }
                }
            }
        }
    }

    rotate_token(vault)
}
