use rand::RngCore;
use std::sync::Arc;

use crate::security::database::crypto::encrypt_payload;
use crate::service_database::Vault;

/// Gera um novo token aleatório de 256 bits via OsRng do kernel e grava criptografado no cofre protegido
pub fn rotate_token(vault: Arc<Vault>) -> Result<String, std::io::Error> {
    let mut bytes = [0u8; 32];
    rand::rngs::OsRng.fill_bytes(&mut bytes);

    let token = format!("star_sec_{}", hex_encode(bytes));
    let token_enc = encrypt_payload(vault.key().as_ref(), token.as_bytes())
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;

    let conn = vault.conn();
    let conn_guard = conn
        .lock()
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))?;

    conn_guard
        .execute(
            "INSERT INTO mcp_tokens (id, token_enc, created_at) VALUES ('active', ?1, ?2)
             ON CONFLICT(id) DO UPDATE SET token_enc = excluded.token_enc, created_at = excluded.created_at",
            rusqlite::params![token_enc, now],
        )
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))?;

    Ok(token)
}

/// Função utilitária para encode hexadecimal sem dependência externa
pub fn hex_encode(bytes: [u8; 32]) -> String {
    let mut s = String::with_capacity(64);
    for b in bytes {
        use std::fmt::Write;
        let _ = write!(s, "{:02x}", b);
    }
    s
}
