use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use serde_json::{json, Value};
use std::sync::Arc;

use crate::service_database::ProfileStorage;
use crate::mcp_public_api::auth::authenticate_mcp;
use crate::mcp_public_api::error::McpError;
use crate::mcp_public_api::types::McpQueryParams;
use super::tools::{execute_tool, list_tools_spec, ToolKind};

/// Enum representando métodos suportados pelo protocolo MCP 2024-11-05
#[derive(Debug, PartialEq, Eq)]
pub enum McpMethod<'a> {
    Initialize,
    NotificationsInitialized,
    ToolsList,
    ToolsCall { name: &'a str, args: &'a Value },
    Unknown(&'a str),
}

impl<'a> McpMethod<'a> {
    pub fn parse(method_str: &'a str, params: &'a Value) -> Self {
        match method_str {
            "initialize" => Self::Initialize,
            "notifications/initialized" => Self::NotificationsInitialized,
            "tools/list" => Self::ToolsList,
            "tools/call" => {
                let name = params.get("name").and_then(Value::as_str).unwrap_or("");
                let args = params.get("arguments").unwrap_or(&Value::Null);
                Self::ToolsCall { name, args }
            }
            other => Self::Unknown(other),
        }
    }
}

/// Recebe JSON-RPC com token no path: POST /mcp/{token} ou POST /mcp/{token}/messages
pub async fn handle_mcp_jsonrpc(
    State(storage): State<Arc<ProfileStorage>>,
    Path(token): Path<String>,
    headers: HeaderMap,
    Query(query): Query<McpQueryParams>,
    Json(payload): Json<Value>,
) -> Response {
    handle_mcp_jsonrpc_inner(&storage, Some(&token), &headers, &query, payload).await
}

/// Recebe JSON-RPC com Bearer token: POST /mcp/messages ou POST /mcp
pub async fn handle_mcp_messages_bearer(
    State(storage): State<Arc<ProfileStorage>>,
    headers: HeaderMap,
    Query(query): Query<McpQueryParams>,
    Json(payload): Json<Value>,
) -> Response {
    handle_mcp_jsonrpc_inner(&storage, None, &headers, &query, payload).await
}

async fn handle_mcp_jsonrpc_inner(
    storage: &ProfileStorage,
    path_token: Option<&str>,
    headers: &HeaderMap,
    query: &McpQueryParams,
    payload: Value,
) -> Response {
    let id = payload.get("id").cloned().unwrap_or(json!(1));

    if authenticate_mcp(storage, path_token, headers, query).is_err() {
        return (
            StatusCode::UNAUTHORIZED,
            Json(McpError::Unauthorized.to_jsonrpc_error(id)),
        ).into_response();
    }

    let method_str = payload.get("method").and_then(Value::as_str).unwrap_or("");
    let empty_params = json!({});
    let params = payload.get("params").unwrap_or(&empty_params);
    let method = McpMethod::parse(method_str, params);

    match method {
        McpMethod::Initialize => {
            Json(json!({
                "jsonrpc": "2.0",
                "id": id,
                "result": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {
                        "tools": {}
                    },
                    "serverInfo": {
                        "name": "Star Multlogin MCP Server",
                        "version": "2.1.0"
                    }
                }
            })).into_response()
        }
        McpMethod::NotificationsInitialized => {
            StatusCode::NO_CONTENT.into_response()
        }
        McpMethod::ToolsList => {
            Json(json!({
                "jsonrpc": "2.0",
                "id": id,
                "result": {
                    "tools": list_tools_spec()
                }
            })).into_response()
        }
        McpMethod::ToolsCall { name, args } => {
            let tool_kind = match ToolKind::from_str(name) {
                Some(k) => k,
                None => {
                    return Json(McpError::ToolNotFound(name.to_string()).to_jsonrpc_error(id)).into_response();
                }
            };

            match execute_tool(tool_kind, args, storage).await {
                Ok(content_text) => {
                    Json(json!({
                        "jsonrpc": "2.0",
                        "id": id,
                        "result": {
                            "content": [
                                { "type": "text", "text": content_text }
                            ]
                        }
                    })).into_response()
                }
                Err(err) => {
                    Json(err.to_jsonrpc_error(id)).into_response()
                }
            }
        }
        McpMethod::Unknown(m) => {
            Json(McpError::MethodNotFound(m.to_string()).to_jsonrpc_error(id)).into_response()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_mcp_methods() {
        let empty = json!({});
        assert_eq!(McpMethod::parse("initialize", &empty), McpMethod::Initialize);
        assert_eq!(McpMethod::parse("notifications/initialized", &empty), McpMethod::NotificationsInitialized);
        assert_eq!(McpMethod::parse("tools/list", &empty), McpMethod::ToolsList);

        let call_params = json!({
            "name": "star_profiles",
            "arguments": { "tag": "test" }
        });
        match McpMethod::parse("tools/call", &call_params) {
            McpMethod::ToolsCall { name, args } => {
                assert_eq!(name, "star_profiles");
                assert_eq!(args["tag"], "test");
            }
            _ => panic!("esperava ToolsCall"),
        }

        assert_eq!(McpMethod::parse("invalid", &empty), McpMethod::Unknown("invalid"));
    }
}
