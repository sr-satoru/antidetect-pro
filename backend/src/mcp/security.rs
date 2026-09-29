use axum::{
    extract::{Request, State},
    http::{header, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use rand::RngCore;
use serde_json::json;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::service_database::Vault;

/// Estado compartilhado para armazenamento e rotação segura do token de automação em memória e no Star Vault
#[derive(Clone)]
pub struct TokenState {
    pub token: Arc<RwLock<String>>,
    pub vault: Arc<Vault>,
    pub data_dir: PathBuf,
}

impl TokenState {
    pub fn new(initial_token: String, vault: Arc<Vault>, data_dir: PathBuf) -> Self {
        Self {
            token: Arc::new(RwLock::new(initial_token)),
            vault,
            data_dir,
        }
    }

    /// Retorna o valor atual do token decifrado em memória
    pub async fn get_token(&self) -> String {
        self.token.read().await.clone()
    }

    /// Valida se um token fornecido (ex: via URL ou header) é idêntico ao ativo em tempo constante
    pub async fn is_valid_token(&self, candidate: &str) -> bool {
        let current = self.get_token().await;
        constant_time_eq(current.as_bytes(), candidate.as_bytes())
    }

    /// Rotaciona o token gravando no cofre e atualizando a memória RAM
    pub async fn refresh_token(&self) -> Result<String, std::io::Error> {
        let new_token = rotate_token(self.vault.clone())?;
        let mut lock = self.token.write().await;
        *lock = new_token.clone();
        Ok(new_token)
    }
}

/// Obtém o token ativo do cofre seguro ou gera um novo com alta entropia
pub fn ensure_token(vault: Arc<Vault>) -> Result<String, std::io::Error> {
    let conn = vault.conn();
    if let Ok(conn_guard) = conn.lock() {
        let token_enc_opt: Option<Vec<u8>> = conn_guard
            .query_row(
                "SELECT token_enc FROM mcp_tokens WHERE id = 'active' LIMIT 1",
                [],
                |row| row.get(0),
            )
            .ok();

        if let Some(token_enc) = token_enc_opt {
            if let Ok(dec) = crate::service_database::vault::decrypt_payload(vault.key().as_ref(), &token_enc) {
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

/// Gera um novo token aleatório de 256 bits via OsRng do kernel e grava no cofre protegido
pub fn rotate_token(vault: Arc<Vault>) -> Result<String, std::io::Error> {
    let mut bytes = [0u8; 32];
    rand::rngs::OsRng.fill_bytes(&mut bytes);

    let token = format!("star_sec_{}", hex::encode(bytes));
    let token_enc = crate::service_database::vault::encrypt_payload(vault.key().as_ref(), token.as_bytes())
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;

    let conn = vault.conn();
    let conn_guard = conn.lock().map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))?;

    conn_guard
        .execute(
            "INSERT INTO mcp_tokens (id, token_enc, created_at) VALUES ('active', ?1, ?2)
             ON CONFLICT(id) DO UPDATE SET token_enc = excluded.token_enc, created_at = excluded.created_at",
            rusqlite::params![token_enc, now],
        )
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))?;

    Ok(token)
}

/// Comparação em tempo constante (contra timing attacks / side-channel leaks)
pub fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    a.iter().zip(b).fold(0u8, |acc, (x, y)| acc | (x ^ y)) == 0
}

/// 1. Middleware Anti-Origin: Rejeita qualquer requisição vinda de sites externos da internet (403 origin_present)
pub async fn anti_origin_middleware(req: Request, next: Next) -> Response {
    if let Some(origin) = req.headers().get(header::ORIGIN).and_then(|h| h.to_str().ok()) {
        let is_local_origin = origin.starts_with("http://localhost:")
            || origin.starts_with("http://127.0.0.1:")
            || origin.starts_with("tauri://")
            || origin.starts_with("app://")
            || origin == "null";

        if !is_local_origin {
            return (
                StatusCode::FORBIDDEN,
                Json(json!({
                    "error": "origin_present",
                    "message": "This endpoint refuses requests from external websites."
                })),
            )
                .into_response();
        }
    }

    next.run(req).await
}

/// 2. Middleware Anti-DNS Rebinding: Valida estritamente se o Host é endereço de loopback (403 bad_host)
pub async fn host_validation_middleware(req: Request, next: Next) -> Response {
    let host_ok = req
        .headers()
        .get(header::HOST)
        .and_then(|h| h.to_str().ok())
        .map(|h| {
            let name = h.rsplit_once(':').map(|(n, _)| n).unwrap_or(h);
            name == "127.0.0.1" || name == "localhost" || name == "[::1]"
        })
        .unwrap_or(false);

    if !host_ok {
        return (
            StatusCode::FORBIDDEN,
            Json(json!({
                "error": "bad_host",
                "message": "Address this by its loopback address."
            })),
        )
            .into_response();
    }

    next.run(req).await
}

/// 3. Middleware Bearer Auth: Valida o token local em tempo constante (401 unauthenticated)
pub async fn bearer_auth_middleware(
    State(token_state): State<TokenState>,
    req: Request,
    next: Next,
) -> Response {
    let auth_header = req
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "))
        .map(|token| token.trim());

    let is_authorized = match auth_header {
        Some(presented) => token_state.is_valid_token(presented).await,
        None => false,
    };

    if !is_authorized {
        return (
            StatusCode::UNAUTHORIZED,
            Json(json!({
                "error": "unauthenticated",
                "message": "Send the token from the api-token file as a bearer token."
            })),
        )
            .into_response();
    }

    next.run(req).await
}

/// Função utilitária simples para encode hexadecimal sem dependência externa
mod hex {
    pub fn encode(bytes: [u8; 32]) -> String {
        let mut s = String::with_capacity(64);
        for b in bytes {
            use std::fmt::Write;
            let _ = write!(s, "{:02x}", b);
        }
        s
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_constant_time_eq_matching() {
        let a = b"star_sec_1234567890abcdef1234567890abcdef";
        let b = b"star_sec_1234567890abcdef1234567890abcdef";
        assert!(constant_time_eq(a, b));
    }

    #[test]
    fn test_constant_time_eq_different() {
        let a = b"star_sec_1234567890abcdef1234567890abcdef";
        let b = b"star_sec_1234567890abcdef1234567890abcdeg";
        assert!(!constant_time_eq(a, b));
    }

    #[test]
    fn test_constant_time_eq_different_lengths() {
        let a = b"star_sec_short";
        let b = b"star_sec_much_longer_token";
        assert!(!constant_time_eq(a, b));
    }
}
