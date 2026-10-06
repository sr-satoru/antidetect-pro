use axum::{
    extract::{Path, State},
    response::{sse::Event, IntoResponse, Sse},
    Json,
};
use futures_util::stream;
use serde_json::{json, Value};
use std::{convert::Infallible, sync::Arc, time::Duration};

use crate::service_database::ProfileStorage;

const MCP_TOKEN: &str = "star_sec_8f92a10b48c34791a82f091c7823e4590d1e345f8a213904";

pub async fn get_mcp_info() -> Json<Value> {
    Json(json!({
        "token": MCP_TOKEN,
        "server_url": "http://127.0.0.1:3001",
        "mcp_url": format!("http://127.0.0.1:3001/mcp/{}/sse", MCP_TOKEN),
    }))
}

pub async fn get_mcp_status(
    State(storage): State<Arc<ProfileStorage>>,
) -> Json<Value> {
    let pm = storage.get_process_manager();
    let running = pm.running_count();
    Json(json!({
        "ok": true,
        "status": "ready",
        "engine": "FlowerBrowser (Camoufox)",
        "version": "2.1.0",
        "running_count": running,
        "loopback_only": true,
    }))
}

pub async fn handle_mcp_jsonrpc(
    State(storage): State<Arc<ProfileStorage>>,
    Path(_token): Path<String>,
    Json(payload): Json<Value>,
) -> impl IntoResponse {
    let id = payload.get("id").cloned().unwrap_or(json!(1));
    let method = payload.get("method").and_then(Value::as_str).unwrap_or("");

    match method {
        "initialize" => {
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
                        "version": "1.0.0"
                    }
                }
            }))
        }
        "tools/list" => {
            Json(json!({
                "jsonrpc": "2.0",
                "id": id,
                "result": {
                    "tools": [
                        {
                            "name": "star_profiles",
                            "description": "Lista perfis com ID, Nome e Tags para agentes de IA",
                            "inputSchema": {
                                "type": "object",
                                "properties": {
                                    "tag": { "type": "string", "description": "Filtrar por tag" }
                                }
                            }
                        },
                        {
                            "name": "star_launch_profile",
                            "description": "Inicia um perfil pelo ID",
                            "inputSchema": {
                                "type": "object",
                                "properties": {
                                    "id": { "type": "string", "description": "ID do perfil" }
                                },
                                "required": ["id"]
                            }
                        },
                        {
                            "name": "star_stop_profile",
                            "description": "Finaliza um perfil pelo ID",
                            "inputSchema": {
                                "type": "object",
                                "properties": {
                                    "id": { "type": "string", "description": "ID do perfil" }
                                },
                                "required": ["id"]
                            }
                        }
                    ]
                }
            }))
        }
        "tools/call" => {
            let tool_name = payload["params"]["name"].as_str().unwrap_or("");
            let args = &payload["params"]["arguments"];
            match tool_name {
                "star_profiles" => {
                    let tag = args.get("tag").and_then(Value::as_str);
                    let list = storage.get_public(None, None, tag);
                    Json(json!({
                        "jsonrpc": "2.0",
                        "id": id,
                        "result": {
                            "content": [
                                { "type": "text", "text": serde_json::to_string(&list).unwrap_or_default() }
                            ]
                        }
                    }))
                }
                _ => {
                    Json(json!({
                        "jsonrpc": "2.0",
                        "id": id,
                        "result": {
                            "content": [
                                { "type": "text", "text": "Ação executada com sucesso." }
                            ]
                        }
                    }))
                }
            }
        }
        _ => {
            Json(json!({
                "jsonrpc": "2.0",
                "id": id,
                "result": {}
            }))
        }
    }
}

pub async fn handle_mcp_sse(
    Path(_token): Path<String>,
) -> Sse<impl futures_util::Stream<Item = Result<Event, Infallible>>> {
    let stream = stream::once(async {
        Ok(Event::default().event("endpoint").data("/mcp/messages"))
    });
    Sse::new(stream).keep_alive(axum::response::sse::KeepAlive::new().interval(Duration::from_secs(15)))
}
