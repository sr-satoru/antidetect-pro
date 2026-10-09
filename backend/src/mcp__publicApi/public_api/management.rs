use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::{json, Value};
use std::sync::Arc;

use crate::service_database::ProfileStorage;
use crate::mcp_public_api::auth::get_mcp_urls;
use crate::mcp_public_api::error::McpError;
use crate::mcp_public_api::types::{McpInfoResponse, McpStatusResponse};

/// Retorna as credenciais ativas do MCP: GET /mcp/info
pub async fn get_mcp_info(
    State(storage): State<Arc<ProfileStorage>>,
) -> Json<Value> {
    let token = storage.get_mcp_token();
    let (server_url, mcp_url) = get_mcp_urls(&token);
    let resp = McpInfoResponse {
        token,
        server_url,
        mcp_url,
    };
    Json(serde_json::to_value(resp).unwrap_or(json!({})))
}

/// Rotaciona o token MCP no banco SQLite: POST /mcp/rotate-token
pub async fn rotate_mcp_token_handler(
    State(storage): State<Arc<ProfileStorage>>,
) -> Response {
    match storage.rotate_mcp_token() {
        Ok(new_token) => {
            let (server_url, mcp_url) = get_mcp_urls(&new_token);
            (
                StatusCode::OK,
                Json(json!({
                    "ok": true,
                    "token": new_token,
                    "server_url": server_url,
                    "mcp_url": mcp_url,
                    "message": "Token MCP rotacionado com sucesso!"
                })),
            ).into_response()
        }
        Err(err) => McpError::Internal(err).into_response(),
    }
}

/// Retorna o status operacional do motor: GET /api/v1/status
pub async fn get_mcp_status(
    State(storage): State<Arc<ProfileStorage>>,
) -> Json<Value> {
    let pm = storage.get_process_manager();
    let running = pm.running_count();
    let resp = McpStatusResponse {
        ok: true,
        status: "ready".to_string(),
        engine: "AstroFox / AstroBrowser".to_string(),
        version: "2.1.0".to_string(),
        running_count: running,
        loopback_only: true,
    };
    Json(serde_json::to_value(resp).unwrap_or(json!({})))
}
