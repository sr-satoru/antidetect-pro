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

use crate::storage::vault::traits::McpRepository;

/// Estado compartilhado para armazenamento e rotação segura do token de automação em memória e no Star Secure Vault
#[derive(Clone)]
pub struct TokenState {
    pub token: Arc<RwLock<String>>,
    pub mcp_repo: Arc<dyn McpRepository>,
    pub data_dir: PathBuf,
}

impl TokenState {
    pub fn new(initial_token: String, mcp_repo: Arc<dyn McpRepository>, data_dir: PathBuf) -> Self {
        Self {
            token: Arc::new(RwLock::new(initial_token)),
            mcp_repo,
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
        let new_token = rotate_token(self.mcp_repo.clone())?;
        let mut lock = self.token.write().await;
        *lock = new_token.clone();
        Ok(new_token)
    }
}

/// Obtém o token ativo do cofre seguro ou gera um novo com alta entropia
pub fn ensure_token(mcp_repo: Arc<dyn McpRepository>) -> Result<String, std::io::Error> {
    if let Ok(Some(token)) = mcp_repo.get_token() {
        let trimmed = token.trim().to_string();
        if !trimmed.is_empty() {
            return Ok(trimmed);
        }
    }

    rotate_token(mcp_repo)
}

/// Gera um novo token aleatório de 256 bits via OsRng do kernel e grava no cofre protegido
pub fn rotate_token(mcp_repo: Arc<dyn McpRepository>) -> Result<String, std::io::Error> {
    let mut bytes = [0u8; 32];
    rand::rngs::OsRng.fill_bytes(&mut bytes);

    let token = format!("star_sec_{}", hex::encode(bytes));
    mcp_repo
        .save_token(&token)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;

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

    struct MockMcpRepo {
        token: std::sync::Mutex<Option<String>>,
    }

    impl MockMcpRepo {
        fn new() -> Self {
            Self {
                token: std::sync::Mutex::new(None),
            }
        }
    }

    impl McpRepository for MockMcpRepo {
        fn get_token(&self) -> Result<Option<String>, String> {
            Ok(self.token.lock().unwrap().clone())
        }

        fn save_token(&self, token: &str) -> Result<(), String> {
            *self.token.lock().unwrap() = Some(token.to_string());
            Ok(())
        }
    }

    #[test]
    fn test_vault_token_lifecycle() {
        let repo = Arc::new(MockMcpRepo::new());

        // 1. Gera token inicial
        let token1 = ensure_token(repo.clone()).expect("Falha ao gerar token");
        assert!(token1.starts_with("star_sec_"));
        assert_eq!(token1.len(), 9 + 64);

        // 2. ensure_token subsequente deve retornar exatamente o mesmo token
        let token2 = ensure_token(repo.clone()).expect("Falha ao obter token existente");
        assert_eq!(token1, token2);

        // 3. Rotação manual deve gerar novo token e ser diferente do anterior
        let token3 = rotate_token(repo.clone()).expect("Falha ao rotacionar token");
        assert_ne!(token1, token3);
        assert!(token3.starts_with("star_sec_"));

        // 4. TokenState deve refletir a validação
        let state = TokenState::new(token3.clone(), repo.clone(), PathBuf::from("/tmp"));
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            assert!(state.is_valid_token(&token3).await);
            assert!(!state.is_valid_token("invalid_token").await);
        });
    }
}
