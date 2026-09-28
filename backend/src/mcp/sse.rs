use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{
        sse::{Event, KeepAlive, Sse},
        IntoResponse, Response,
    },
    Json,
};
use futures_util::stream::{unfold, Stream};
use futures_util::StreamExt;
use serde_json::json;
use std::collections::HashMap;
use std::convert::Infallible;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::{mpsc, RwLock};
use tracing::{info, warn};

use super::handlers::McpState;
use crate::tab_manager::TabManager;

/// Gerenciador de sessões SSE ativas para o protocolo MCP
#[derive(Clone)]
pub struct SessionManager {
    sessions: Arc<RwLock<HashMap<String, mpsc::Sender<String>>>>,
}

impl SessionManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn register(&self, session_id: String, tx: mpsc::Sender<String>) {
        let mut map = self.sessions.write().await;
        map.insert(session_id, tx);
    }

    pub async fn remove(&self, session_id: &str) {
        let mut map = self.sessions.write().await;
        map.remove(session_id);
    }

    pub async fn send_to(&self, session_id: &str, message: String) -> bool {
        let map = self.sessions.read().await;
        if let Some(tx) = map.get(session_id) {
            tx.send(message).await.is_ok()
        } else {
            false
        }
    }
}

/// Estado compartilhado para os handlers MCP SSE e JSON-RPC
#[derive(Clone)]
pub struct McpSseState {
    pub mcp_state: McpState,
    pub session_manager: SessionManager,
}

/// Converte um Receiver do Tokio em uma Stream compatível com Axum SSE
fn receiver_stream(rx: mpsc::Receiver<String>) -> impl Stream<Item = Result<Event, Infallible>> {
    unfold(rx, |mut rx| async move {
        match rx.recv().await {
            Some(data) => {
                let event = Event::default().event("message").data(data);
                Some((Ok(event), rx))
            }
            None => None,
        }
    })
}

/// GET /mcp/{token}/sse e GET /{token}/mcp/sse
/// Estabelece o túnel Server-Sent Events (SSE) para a IA (Cursor, Antigravity, Claude)
pub async fn mcp_sse_handler(
    State(state): State<McpSseState>,
    Path(token): Path<String>,
) -> Response {
    if !state.mcp_state.token_state.is_valid_token(&token).await {
        return (
            StatusCode::UNAUTHORIZED,
            Json(json!({
                "error": "unauthorized",
                "message": "Token de acesso MCP inválido na URL."
            })),
        )
            .into_response();
    }

    let session_id = uuid::Uuid::new_v4().to_string();
    let (tx, rx) = mpsc::channel::<String>(64);

    state
        .session_manager
        .register(session_id.clone(), tx.clone())
        .await;

    info!("🔌 Cliente MCP conectado via SSE (Sessão: {})", session_id);

    // Evento inicial exigido pelo protocolo MCP SSE: 'endpoint' com o caminho para POST
    let endpoint_url = format!("/mcp/{}/messages?sessionId={}", token, session_id);
    let initial_event = Event::default().event("endpoint").data(endpoint_url);

    let stream = futures_util::stream::once(async move { Ok(initial_event) })
        .chain(receiver_stream(rx));

    let sse = Sse::new(stream)
        .keep_alive(
            KeepAlive::default()
                .interval(Duration::from_secs(15))
                .text("ping"),
        );

    sse.into_response()
}

/// POST /mcp/{token}/messages e POST /{token}/mcp/messages
/// Recebe as requisições JSON-RPC 2.0 enviadas pelo cliente MCP
pub async fn mcp_messages_handler(
    State(state): State<McpSseState>,
    Path(token): Path<String>,
    Query(query): Query<HashMap<String, String>>,
    Json(body): Json<serde_json::Value>,
) -> Response {
    if !state.mcp_state.token_state.is_valid_token(&token).await {
        return (
            StatusCode::UNAUTHORIZED,
            Json(json!({
                "error": "unauthorized",
                "message": "Token de acesso MCP inválido."
            })),
        )
            .into_response();
    }

    let session_id = query.get("sessionId").cloned();

    // Suporta requisições individuais ou em lote (batch JSON-RPC)
    let response_value = if body.is_array() {
        let mut responses = Vec::new();
        if let Some(arr) = body.as_array() {
            for item in arr {
                if let Some(resp) = handle_single_jsonrpc(&state.mcp_state, item).await {
                    responses.push(resp);
                }
            }
        }
        serde_json::Value::Array(responses)
    } else {
        handle_single_jsonrpc(&state.mcp_state, &body)
            .await
            .unwrap_or(serde_json::Value::Null)
    };

    // Se houver resposta e sessão SSE conectada, despacha pelo canal SSE
    if !response_value.is_null() {
        let response_str = serde_json::to_string(&response_value).unwrap_or_default();
        if let Some(ref sid) = session_id {
            state.session_manager.send_to(sid, response_str).await;
        }

        // Também retorna diretamente no POST (compatível com clientes HTTP e SSE simultaneamente)
        (StatusCode::OK, Json(response_value)).into_response()
    } else {
        StatusCode::ACCEPTED.into_response()
    }
}

/// POST /mcp/{token} (Transporte JSON-RPC Direto sobre HTTP puro)
pub async fn mcp_direct_handler(
    State(state): State<McpSseState>,
    Path(token): Path<String>,
    Json(body): Json<serde_json::Value>,
) -> Response {
    if !state.mcp_state.token_state.is_valid_token(&token).await {
        return (
            StatusCode::UNAUTHORIZED,
            Json(json!({
                "error": "unauthorized",
                "message": "Token de acesso MCP inválido."
            })),
        )
            .into_response();
    }

    let resp = handle_single_jsonrpc(&state.mcp_state, &body)
        .await
        .unwrap_or_else(|| json!({ "jsonrpc": "2.0", "result": {} }));

    (StatusCode::OK, Json(resp)).into_response()
}

/// GET /mcp/info
/// Retorna a URL de conexão SSE do MCP e o token para a interface desktop local
pub async fn mcp_info_handler(State(state): State<McpSseState>) -> Response {
    let token = state.mcp_state.token_state.get_token().await;
    let port = 12540;
    (
        StatusCode::OK,
        Json(json!({
            "ok": true,
            "token": token,
            "port": port,
            "server_url": format!("http://127.0.0.1:{}/mcp/{}/sse", port, token),
            "mcp_url": format!("http://127.0.0.1:{}/mcp/{}/sse", port, token)
        })),
    )
        .into_response()
}

/// Processa uma mensagem individual do protocolo JSON-RPC 2.0
async fn handle_single_jsonrpc(
    state: &McpState,
    req: &serde_json::Value,
) -> Option<serde_json::Value> {
    let method = req.get("method").and_then(|m| m.as_str())?;
    let id = req.get("id");

    match method {
        // 1. Handshake inicial do protocolo MCP
        "initialize" => {
            let res = json!({
                "jsonrpc": "2.0",
                "id": id,
                "result": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {
                        "tools": {
                            "listChanged": false
                        }
                    },
                    "serverInfo": {
                        "name": "star-multlogin",
                        "version": "2.1.0"
                    }
                }
            });
            Some(res)
        }

        // 2. Confirmação de inicialização do cliente (notificação sem retorno)
        "notifications/initialized" => {
            info!("🚀 Cliente MCP confirmou inicialização (handshake completo)");
            None
        }

        // 3. Ping de liveness
        "ping" => Some(json!({
            "jsonrpc": "2.0",
            "id": id,
            "result": {}
        })),

        // 4. Catálogo das Ferramentas Disponíveis
        "tools/list" => {
            let tools = get_mcp_tools();
            Some(json!({
                "jsonrpc": "2.0",
                "id": id,
                "result": {
                    "tools": tools
                }
            }))
        }

        // 5. Execução de Ferramenta
        "tools/call" => {
            let params = req.get("params").cloned().unwrap_or(json!({}));
            let tool_name = params.get("name").and_then(|n| n.as_str()).unwrap_or("");
            let arguments = params.get("arguments").cloned().unwrap_or(json!({}));

            match execute_mcp_tool(state, tool_name, &arguments).await {
                Ok(data) => {
                    let text = if data.is_string() {
                        data.as_str().unwrap().to_string()
                    } else {
                        serde_json::to_string_pretty(&data).unwrap_or_else(|_| data.to_string())
                    };

                    Some(json!({
                        "jsonrpc": "2.0",
                        "id": id,
                        "result": {
                            "content": [
                                {
                                    "type": "text",
                                    "text": text
                                }
                            ],
                            "isError": false
                        }
                    }))
                }
                Err(err_msg) => Some(json!({
                    "jsonrpc": "2.0",
                    "id": id,
                    "result": {
                        "content": [
                            {
                                "type": "text",
                                "text": format!("Erro na execução: {err_msg}")
                            }
                        ],
                        "isError": true
                    }
                })),
            }
        }

        // Método desconhecido
        unknown => {
            warn!("⚠️ Método JSON-RPC desconhecido recebido no MCP: '{}'", unknown);
            if id.is_some() {
                Some(json!({
                    "jsonrpc": "2.0",
                    "id": id,
                    "error": {
                        "code": -32601,
                        "message": format!("Método não encontrado: '{unknown}'")
                    }
                }))
            } else {
                None
            }
        }
    }
}

/// Catálogo padronizado das ferramentas MCP suportadas pelo Star Multlogin
pub fn get_mcp_tools() -> serde_json::Value {
    json!([
        {
            "name": "star_status",
            "description": "Verifica se o motor Camoufox e o backend estão ativos e quantos perfis estão rodando.",
            "inputSchema": { "type": "object", "properties": {} }
        },
        {
            "name": "star_profiles",
            "description": "Lista perfis com ID, nome, grupo, tags e status (Zero-Leakage: sem expor dados de proxy).",
            "inputSchema": { "type": "object", "properties": {} }
        },
        {
            "name": "star_start_profile",
            "description": "Inicia um perfil pelo ID e retorna o ws_endpoint para conexão Playwright/Puppeteer/CDP.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "id": { "type": "string", "description": "O identificador único do perfil." },
                    "cdp": { "type": "boolean", "description": "Habilita porta de depuração WebSocket CDP.", "default": true }
                },
                "required": ["id"]
            }
        },
        {
            "name": "star_stop_profile",
            "description": "Encerra o perfil graciosamente garantindo flush de cookies e sincronização de sessão.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "id": { "type": "string", "description": "O identificador do perfil a ser encerrado." }
                },
                "required": ["id"]
            }
        },
        {
            "name": "star_get_tabs",
            "description": "Lê em tempo real os títulos e URLs das abas abertas no perfil informado.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "id": { "type": "string", "description": "Identificador do perfil ativo." }
                },
                "required": ["id"]
            }
        },
        {
            "name": "star_open_tab",
            "description": "Abre uma nova aba no perfil indicado navegando para a URL desejada.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "id": { "type": "string", "description": "Identificador do perfil ativo." },
                    "url": { "type": "string", "description": "URL que deve ser aberta na nova aba." }
                },
                "required": ["id", "url"]
            }
        },
        {
            "name": "star_close_tab",
            "description": "Fecha uma aba específica do perfil sem encerrar o navegador.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "id": { "type": "string", "description": "Identificador do perfil ativo." },
                    "tab_id": { "type": "string", "description": "ID da aba a ser fechada." }
                },
                "required": ["id", "tab_id"]
            }
        }
    ])
}

/// Execução direta das ferramentas em Rust sem loopback HTTP
async fn execute_mcp_tool(
    state: &McpState,
    name: &str,
    arguments: &serde_json::Value,
) -> Result<serde_json::Value, String> {
    match name {
        "star_status" => {
            let pm = state.profile_storage.get_process_manager();
            let running_count = pm.get_running_count();
            Ok(json!({
                "ok": true,
                "engine": "camoufox",
                "version": "2.1.0",
                "running_count": running_count,
                "loopback_only": true
            }))
        }
        "star_profiles" => {
            let profiles = state.profile_storage.list(None, None);
            let summaries: Vec<serde_json::Value> = profiles
                .into_iter()
                .map(|p| json!({
                    "id": p.id,
                    "name": p.name,
                    "group": p.group,
                    "tags": p.tags,
                    "status": p.status
                }))
                .collect();
            Ok(json!(summaries))
        }
        "star_start_profile" => {
            let id = arguments.get("id").and_then(|v| v.as_str()).ok_or("Parâmetro 'id' ausente")?;
            let cdp = arguments.get("cdp").and_then(|v| v.as_bool()).unwrap_or(true);
            match state.profile_storage.launch_with_cdp(id, cdp).await {
                Ok((profile, pid, debug_port, ws_endpoint)) => Ok(json!({
                    "status": "launched",
                    "profile_id": profile.id,
                    "pid": pid,
                    "debug_port": debug_port,
                    "ws_endpoint": ws_endpoint
                })),
                Err(err) => Err(format!("Falha ao iniciar perfil: {err}")),
            }
        }
        "star_stop_profile" => {
            let id = arguments.get("id").and_then(|v| v.as_str()).ok_or("Parâmetro 'id' ausente")?;
            match state.profile_storage.stop(id) {
                Ok(profile) => Ok(json!({
                    "status": "stopped",
                    "profile_id": profile.id,
                    "cookies_saved": 0,
                    "message": "Perfil finalizado e sessão sincronizada com sucesso."
                })),
                Err(err) => Err(format!("Falha ao parar perfil: {err}")),
            }
        }
        "star_get_tabs" => {
            let id = arguments.get("id").and_then(|v| v.as_str()).ok_or("Parâmetro 'id' ausente")?;
            let debug_port = state
                .profile_storage
                .get_process_manager()
                .get_debug_port(id)
                .ok_or_else(|| format!("Perfil {id} não está em execução ou não possui porta CDP ativa"))?;

            match TabManager::get_open_tabs(debug_port).await {
                Ok(tabs) => Ok(json!({ "tabs": tabs })),
                Err(err) => Err(format!("Falha ao inspecionar abas: {err}")),
            }
        }
        "star_open_tab" => {
            let id = arguments.get("id").and_then(|v| v.as_str()).ok_or("Parâmetro 'id' ausente")?;
            let url = arguments.get("url").and_then(|v| v.as_str()).ok_or("Parâmetro 'url' ausente")?;
            let debug_port = state
                .profile_storage
                .get_process_manager()
                .get_debug_port(id)
                .ok_or_else(|| format!("Perfil {id} não está em execução"))?;

            match TabManager::open_new_tab(debug_port, url).await {
                Ok(context_id) => Ok(json!({
                    "ok": true,
                    "context_id": context_id,
                    "url": url
                })),
                Err(err) => Err(format!("Falha ao abrir nova aba: {err}")),
            }
        }
        "star_close_tab" => {
            let id = arguments.get("id").and_then(|v| v.as_str()).ok_or("Parâmetro 'id' ausente")?;
            let tab_id = arguments.get("tab_id").and_then(|v| v.as_str()).ok_or("Parâmetro 'tab_id' ausente")?;
            let debug_port = state
                .profile_storage
                .get_process_manager()
                .get_debug_port(id)
                .ok_or_else(|| format!("Perfil {id} não está em execução"))?;

            match TabManager::close_tab(debug_port, tab_id).await {
                Ok(_) => Ok(json!({ "ok": true, "closed_tab": tab_id })),
                Err(err) => Err(format!("Falha ao fechar aba: {err}")),
            }
        }
        other => Err(format!("Ferramenta MCP desconhecida: '{other}'")),
    }
}
