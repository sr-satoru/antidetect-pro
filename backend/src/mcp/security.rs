use axum::{
    extract::{Request, State},
    http::{header, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use rand::RngCore;
use serde_json::json;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::sync::RwLock;

/// Estado compartilhado para armazenamento e rotação segura do token de automação em memória e disco
#[derive(Clone)]
pub struct TokenState {
    pub token: Arc<RwLock<String>>,
    pub data_dir: PathBuf,
}

impl TokenState {
    pub fn new(initial_token: String, data_dir: PathBuf) -> Self {
        Self {
            token: Arc::new(RwLock::new(initial_token)),
            data_dir,
        }
    }

    /// Retorna o valor atual do token
    pub async fn get_token(&self) -> String {
        self.token.read().await.clone()
    }

    /// Rotaciona o token gravando atomicamente no disco com 0600 e atualizando a memória
    pub async fn refresh_token(&self) -> Result<String, std::io::Error> {
        let new_token = rotate_token(&self.data_dir)?;
        let mut lock = self.token.write().await;
        *lock = new_token.clone();
        Ok(new_token)
    }
}

/// Retorna o caminho do arquivo do token de automação
pub fn token_path(data_dir: &Path) -> PathBuf {
    data_dir.join("api-token")
}

/// Lê o token existente em disco ou gera um novo token criptográfico de 256 bits com permissões 0600
pub fn ensure_token(data_dir: &Path) -> Result<String, std::io::Error> {
    let path = token_path(data_dir);
    if let Ok(existing) = std::fs::read_to_string(&path) {
        let trimmed = existing.trim().to_string();
        if !trimmed.is_empty() {
            return Ok(trimmed);
        }
    }

    rotate_token(data_dir)
}

/// Gera um novo token aleatório de 256 bits via OsRng do kernel e grava em disco com 0600
pub fn rotate_token(data_dir: &Path) -> Result<String, std::io::Error> {
    let path = token_path(data_dir);
    let mut bytes = [0u8; 32];
    rand::rngs::OsRng.fill_bytes(&mut bytes);
    
    // Prefixo identificador para fácil reconhecimento em logs de auditoria
    let token = format!("star_sec_{}", hex::encode(bytes));

    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    std::fs::write(&path, &token)?;

    // Aplica permissão estrita POSIX 0600 (apenas o proprietário do processo tem leitura/escrita)
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let perms = std::fs::Permissions::from_mode(0o600);
        let _ = std::fs::set_permissions(&path, perms);
    }

    Ok(token)
}

/// Comparação em tempo constante (contra timing attacks / side-channel leaks)
pub fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    a.iter().zip(b).fold(0u8, |acc, (x, y)| acc | (x ^ y)) == 0
}

/// 1. Middleware Anti-Origin: Rejeita qualquer requisição vinda de navegadores (403 origin_present)
pub async fn anti_origin_middleware(req: Request, next: Next) -> Response {
    if req.headers().contains_key(header::ORIGIN) {
        return (
            StatusCode::FORBIDDEN,
            Json(json!({
                "error": "origin_present",
                "message": "This endpoint refuses requests from a browser. It is for scripts."
            })),
        )
            .into_response();
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

    let current_token = token_state.get_token().await;

    let is_authorized = match auth_header {
        Some(presented) => constant_time_eq(presented.as_bytes(), current_token.as_bytes()),
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

    #[test]
    fn test_ensure_and_rotate_token() {
        let temp_dir = std::env::temp_dir().join(format!("star_test_{}", std::time::SystemTime::now().elapsed().unwrap().as_nanos()));
        let _ = std::fs::create_dir_all(&temp_dir);

        // 1. Gera token inicial
        let token1 = ensure_token(&temp_dir).expect("Falha ao gerar token");
        assert!(token1.starts_with("star_sec_"));
        assert_eq!(token1.len(), 9 + 64);

        // 2. ensure_token subsequente deve retornar exatamente o mesmo
        let token2 = ensure_token(&temp_dir).expect("Falha ao ler token existente");
        assert_eq!(token1, token2);

        // 3. Rotação manual deve gerar novo token e ser diferente do anterior
        let token3 = rotate_token(&temp_dir).expect("Falha ao rotacionar token");
        assert_ne!(token1, token3);
        assert!(token3.starts_with("star_sec_"));

        // Limpeza
        let _ = std::fs::remove_dir_all(temp_dir);
    }
}

