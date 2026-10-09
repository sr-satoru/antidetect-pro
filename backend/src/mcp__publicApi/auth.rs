use axum::http::{header, HeaderMap};
use crate::service_database::ProfileStorage;
use super::error::McpError;
use super::types::McpQueryParams;

/// Newtype para representar um token MCP devidamente validado
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct McpToken(String);

impl McpToken {
    pub fn new(token: impl Into<String>) -> Self {
        Self(token.into())
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }

    pub fn into_inner(self) -> String {
        self.0
    }
}

impl std::fmt::Display for McpToken {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// Obtém a porta padrão do servidor para montagem das URLs canônicas
pub fn get_backend_port() -> u16 {
    std::env::var("STAR_BACKEND_PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(12540)
}

/// Retorna as URLs canônicas (server_url, mcp_url) para o token informado
pub fn get_mcp_urls(token: &str) -> (String, String) {
    let port = get_backend_port();
    let server_url = format!("http://127.0.0.1:{}", port);
    let mcp_url = format!("http://127.0.0.1:{}/mcp/{}/sse", port, token);
    (server_url, mcp_url)
}

/// Extrai e valida o token MCP com empréstimo otimizado (zero-copy), checando
/// Query parameter (?token=), Header Authorization (Bearer), x-mcp-token e Path da rota
pub(crate) fn authenticate_mcp(
    storage: &ProfileStorage,
    path_token: Option<&str>,
    headers: &HeaderMap,
    query: &McpQueryParams,
) -> Result<McpToken, McpError> {
    // 1. Query parameter: ?token=...
    if let Some(ref t) = query.token {
        let trimmed = t.trim();
        if !trimmed.is_empty() && storage.verify_mcp_token(trimmed) {
            return Ok(McpToken(trimmed.to_string()));
        }
    }

    // 2. Header Authorization: Bearer <token>
    if let Some(auth_val) = headers.get(header::AUTHORIZATION).and_then(|h| h.to_str().ok()) {
        let trimmed = auth_val.trim();
        let candidate = if let Some(stripped) = trimmed.strip_prefix("Bearer ") {
            stripped.trim()
        } else if !trimmed.contains(' ') {
            trimmed
        } else {
            ""
        };
        if !candidate.is_empty() && storage.verify_mcp_token(candidate) {
            return Ok(McpToken(candidate.to_string()));
        }
    }

    // 3. Header x-mcp-token
    if let Some(val) = headers.get("x-mcp-token").and_then(|h| h.to_str().ok()) {
        let candidate = val.trim();
        if !candidate.is_empty() && storage.verify_mcp_token(candidate) {
            return Ok(McpToken(candidate.to_string()));
        }
    }

    // 4. Token passado no path da rota (/mcp/{token}/...)
    if let Some(pt) = path_token {
        let candidate = pt.trim();
        if !candidate.is_empty()
            && !matches!(candidate, "messages" | "profiles" | "sse" | "info" | "rotate-token")
            && storage.verify_mcp_token(candidate)
        {
            return Ok(McpToken(candidate.to_string()));
        }
    }

    Err(McpError::Unauthorized)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mcp_token_newtype() {
        let token = McpToken::new("star_sec_12345");
        assert_eq!(token.as_str(), "star_sec_12345");
        assert_eq!(token.to_string(), "star_sec_12345");
        assert_eq!(token.into_inner(), "star_sec_12345");
    }

    #[test]
    fn test_canonical_urls() {
        let (server_url, mcp_url) = get_mcp_urls("my_test_token");
        assert!(server_url.starts_with("http://127.0.0.1:"));
        assert!(mcp_url.contains("/mcp/my_test_token/sse"));
    }
}
