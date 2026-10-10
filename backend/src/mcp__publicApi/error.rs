use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::{json, Value};

/// Erros estruturados do domínio MCP e APIs Públicas
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum McpError {
    Unauthorized,
    ProfileNotFound(String),
    LaunchFailed { id: String, reason: String },
    StopFailed { id: String, reason: String },
    InvalidJsonRpc(String),
    MethodNotFound(String),
    ToolNotFound(String),
    InvalidToolArguments { tool: String, details: String },
    Internal(String),
}

impl std::fmt::Display for McpError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Unauthorized => write!(f, "Token de autenticação MCP inválido ou não autorizado."),
            Self::ProfileNotFound(id) => write!(f, "Perfil '{id}' não encontrado no banco de dados local."),
            Self::LaunchFailed { id, reason } => write!(f, "Falha ao iniciar perfil '{id}': {reason}"),
            Self::StopFailed { id, reason } => write!(f, "Falha ao parar perfil '{id}': {reason}"),
            Self::InvalidJsonRpc(msg) => write!(f, "JSON-RPC inválido: {msg}"),
            Self::MethodNotFound(m) => write!(f, "Método JSON-RPC '{m}' não suportado."),
            Self::ToolNotFound(t) => write!(f, "Ferramenta '{t}' não encontrada."),
            Self::InvalidToolArguments { tool, details } => {
                write!(f, "Parâmetros inválidos para ferramenta '{tool}': {details}")
            }
            Self::Internal(msg) => write!(f, "Erro interno: {msg}"),
        }
    }
}

impl std::error::Error for McpError {}

impl IntoResponse for McpError {
    fn into_response(self) -> Response {
        let (status, code) = match &self {
            Self::Unauthorized => (StatusCode::UNAUTHORIZED, "MCP_UNAUTHORIZED"),
            Self::ProfileNotFound(_) => (StatusCode::NOT_FOUND, "PROFILE_NOT_FOUND"),
            Self::LaunchFailed { .. } => (StatusCode::BAD_REQUEST, "LAUNCH_FAILED"),
            Self::StopFailed { .. } => (StatusCode::NOT_FOUND, "STOP_FAILED"),
            Self::InvalidJsonRpc(_) | Self::InvalidToolArguments { .. } => (StatusCode::BAD_REQUEST, "BAD_REQUEST"),
            Self::MethodNotFound(_) | Self::ToolNotFound(_) => (StatusCode::NOT_FOUND, "NOT_FOUND"),
            Self::Internal(_) => (StatusCode::INTERNAL_SERVER_ERROR, "INTERNAL_ERROR"),
        };

        (
            status,
            Json(json!({
                "error": self.to_string(),
                "code": code
            })),
        ).into_response()
    }
}

impl McpError {
    /// Mapeia o erro para o formato padrão de erro da especificação JSON-RPC 2.0
    pub fn to_jsonrpc_error(&self, id: Value) -> Value {
        let (code, msg) = match self {
            Self::Unauthorized => (-32001, self.to_string()),
            Self::MethodNotFound(_) => (-32601, self.to_string()),
            Self::ToolNotFound(_) => (-32601, self.to_string()),
            Self::InvalidJsonRpc(_) | Self::InvalidToolArguments { .. } => (-32602, self.to_string()),
            _ => (-32000, self.to_string()),
        };
        json!({
            "jsonrpc": "2.0",
            "id": id,
            "error": {
                "code": code,
                "message": msg
            }
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_into_response() {
        let unauth = McpError::Unauthorized;
        let resp = unauth.into_response();
        assert_eq!(resp.status(), StatusCode::UNAUTHORIZED);

        let not_found = McpError::ProfileNotFound("prof_404".to_string());
        let resp_nf = not_found.into_response();
        assert_eq!(resp_nf.status(), StatusCode::NOT_FOUND);

        let launch_err = McpError::LaunchFailed {
            id: "1".into(),
            reason: "engine failed".into(),
        };
        assert_eq!(launch_err.into_response().status(), StatusCode::BAD_REQUEST);
    }

    #[test]
    fn test_jsonrpc_error_codes() {
        let id = json!(42);

        let unauth_rpc = McpError::Unauthorized.to_jsonrpc_error(id.clone());
        assert_eq!(unauth_rpc["error"]["code"], -32001);
        assert_eq!(unauth_rpc["id"], 42);

        let method_rpc = McpError::MethodNotFound("bad_method".into()).to_jsonrpc_error(id.clone());
        assert_eq!(method_rpc["error"]["code"], -32601);

        let invalid_args_rpc = McpError::InvalidToolArguments {
            tool: "star_launch_profile".into(),
            details: "missing id".into(),
        }.to_jsonrpc_error(id.clone());
        assert_eq!(invalid_args_rpc["error"]["code"], -32602);

        let exec_rpc = McpError::LaunchFailed {
            id: "1".into(),
            reason: "falha".into(),
        }.to_jsonrpc_error(id);
        assert_eq!(exec_rpc["error"]["code"], -32000);
    }
}
