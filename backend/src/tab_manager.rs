use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use std::sync::OnceLock;
use std::time::Duration;
use tokio::sync::{mpsc, oneshot, Mutex};
use tokio::time::timeout;
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::protocol::Message;
use tracing::{info, warn};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TabInfo {
    pub id: String,
    pub url: String,
    pub title: String,
    pub is_active: bool,
}

enum BiDiRequest {
    GetTabs {
        resp: oneshot::Sender<Result<Vec<TabInfo>, String>>,
    },
    OpenTab {
        url: String,
        resp: oneshot::Sender<Result<String, String>>,
    },
    CloseTab {
        context_id: String,
        resp: oneshot::Sender<Result<(), String>>,
    },
}

static BIDI_SESSIONS: OnceLock<Mutex<HashMap<u16, mpsc::Sender<BiDiRequest>>>> = OnceLock::new();

fn get_sessions() -> &'static Mutex<HashMap<u16, mpsc::Sender<BiDiRequest>>> {
    BIDI_SESSIONS.get_or_init(|| Mutex::new(HashMap::new()))
}

async fn run_bidi_actor(port: u16, mut rx: mpsc::Receiver<BiDiRequest>) {
    let ws_url = format!("ws://127.0.0.1:{port}/session");
    let connect_res = timeout(Duration::from_millis(3000), connect_async(&ws_url)).await;
    let (mut ws_stream, _) = match connect_res {
        Ok(Ok(stream)) => stream,
        Ok(Err(e)) => {
            warn!("Falha ao conectar BiDi na porta {port}: {e}");
            return;
        }
        Err(_) => {
            warn!("Timeout conectando BiDi na porta {port}");
            return;
        }
    };

    // 1. Inicia sessão BiDi persistente
    let _ = ws_stream
        .send(Message::Text(
            json!({
                "id": 1,
                "method": "session.new",
                "params": {"capabilities": {}}
            })
            .to_string()
            .into(),
        ))
        .await;

    let _ = timeout(Duration::from_millis(1000), ws_stream.next()).await;

    // 2. Inscreve em eventos de contexto
    let _ = ws_stream
        .send(Message::Text(
            json!({
                "id": 2,
                "method": "session.subscribe",
                "params": {"events": ["browsingContext.contextCreated"]}
            })
            .to_string()
            .into(),
        ))
        .await;
    let _ = timeout(Duration::from_millis(300), ws_stream.next()).await;

    let mut next_cmd_id: i64 = 10;

    while let Some(req) = rx.recv().await {
        match req {
            BiDiRequest::GetTabs { resp } => {
                let cmd_id = next_cmd_id;
                next_cmd_id += 1;
                let tree_cmd = json!({
                    "id": cmd_id,
                    "method": "browsingContext.getTree",
                    "params": {}
                });

                if let Err(e) = ws_stream.send(Message::Text(tree_cmd.to_string().into())).await {
                    let _ = resp.send(Err(format!("Erro no envio getTree: {e}")));
                    break;
                }

                let mut tabs = Vec::new();
                let start = tokio::time::Instant::now();
                while start.elapsed() < Duration::from_millis(2000) {
                    if let Ok(Some(Ok(msg))) = timeout(Duration::from_millis(1000), ws_stream.next()).await {
                        if let Message::Text(text) = msg {
                            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&text) {
                                if val.get("id").and_then(|v| v.as_i64()) == Some(cmd_id) {
                                    if let Some(contexts) = val.get("result").and_then(|r| r.get("contexts")).and_then(|c| c.as_array()) {
                                        for (idx, ctx) in contexts.iter().enumerate() {
                                            let id = ctx.get("context").and_then(|v| v.as_str()).unwrap_or_default().to_string();
                                            let raw_url = ctx.get("url").and_then(|v| v.as_str()).unwrap_or("about:blank").to_string();
                                            let title = if raw_url.starts_with("http") {
                                                raw_url.replace("https://", "").replace("http://", "").split('/').next().unwrap_or(&raw_url).to_string()
                                            } else {
                                                raw_url.clone()
                                            };
                                            tabs.push(TabInfo { id, url: raw_url, title, is_active: idx == 0 });
                                        }
                                    }
                                    break;
                                }
                            }
                        }
                    } else {
                        break;
                    }
                }
                let _ = resp.send(Ok(tabs));
            }
            BiDiRequest::OpenTab { url, resp } => {
                let create_id = next_cmd_id;
                next_cmd_id += 1;
                let create_cmd = json!({
                    "id": create_id,
                    "method": "browsingContext.create",
                    "params": {"type": "tab"}
                });

                if let Err(e) = ws_stream.send(Message::Text(create_cmd.to_string().into())).await {
                    let _ = resp.send(Err(format!("Erro no envio create: {e}")));
                    break;
                }

                let mut created_ctx = String::new();
                let start = tokio::time::Instant::now();
                while start.elapsed() < Duration::from_millis(3000) {
                    if let Ok(Some(Ok(msg))) = timeout(Duration::from_millis(1500), ws_stream.next()).await {
                        if let Message::Text(text) = msg {
                            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&text) {
                                if val.get("method").and_then(|m| m.as_str()) == Some("browsingContext.contextCreated") {
                                    if let Some(ctx) = val.get("params").and_then(|p| p.get("context")).and_then(|c| c.as_str()) {
                                        created_ctx = ctx.to_string();
                                        break;
                                    }
                                }
                                if val.get("id").and_then(|v| v.as_i64()) == Some(create_id) {
                                    if let Some(ctx) = val.get("result").and_then(|r| r.get("context")).and_then(|c| c.as_str()) {
                                        created_ctx = ctx.to_string();
                                        break;
                                    }
                                }
                            }
                        }
                    } else {
                        break;
                    }
                }

                // Fallback getTree if not captured yet
                if created_ctx.is_empty() {
                    let tree_id = next_cmd_id;
                    next_cmd_id += 1;
                    let _ = ws_stream.send(Message::Text(json!({"id": tree_id, "method": "browsingContext.getTree", "params": {}}).to_string().into())).await;
                    let tree_start = tokio::time::Instant::now();
                    while tree_start.elapsed() < Duration::from_millis(1500) {
                        if let Ok(Some(Ok(Message::Text(text)))) = timeout(Duration::from_millis(800), ws_stream.next()).await {
                            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&text) {
                                if val.get("id").and_then(|v| v.as_i64()) == Some(tree_id) {
                                    if let Some(contexts) = val.get("result").and_then(|r| r.get("contexts")).and_then(|c| c.as_array()) {
                                        if let Some(last) = contexts.last().and_then(|c| c.get("context")).and_then(|c| c.as_str()) {
                                            created_ctx = last.to_string();
                                        }
                                    }
                                    break;
                                }
                            }
                        } else {
                            break;
                        }
                    }
                }

                if created_ctx.is_empty() {
                    let _ = resp.send(Err("Falha ao obter ID da nova aba criada".to_string()));
                    continue;
                }

                let target_url = if url.trim().is_empty() {
                    "about:blank".to_string()
                } else if !url.starts_with("http://") && !url.starts_with("https://") && !url.starts_with("about:") {
                    format!("https://{url}")
                } else {
                    url.clone()
                };

                let nav_id = next_cmd_id;
                next_cmd_id += 1;
                let nav_cmd = json!({
                    "id": nav_id,
                    "method": "browsingContext.navigate",
                    "params": {
                        "context": created_ctx,
                        "url": target_url,
                        "wait": "none"
                    }
                });

                let _ = ws_stream.send(Message::Text(nav_cmd.to_string().into())).await;
                info!("🌐 BiDi Actor: nova aba aberta (porta {port}): context={created_ctx}, url={target_url}");
                let _ = resp.send(Ok(created_ctx));
            }
            BiDiRequest::CloseTab { context_id, resp } => {
                let close_id = next_cmd_id;
                next_cmd_id += 1;
                let close_cmd = json!({
                    "id": close_id,
                    "method": "browsingContext.close",
                    "params": {"context": context_id}
                });
                let _ = ws_stream.send(Message::Text(close_cmd.to_string().into())).await;
                let _ = resp.send(Ok(()));
            }
        }
    }

    // Cleanup session on exit
    let _ = ws_stream.send(Message::Text(json!({"id": 9999, "method": "session.end", "params": {}}).to_string().into())).await;
    let _ = timeout(Duration::from_millis(300), ws_stream.next()).await;
    let _ = ws_stream.close(None).await;
}

async fn get_or_spawn_sender(port: u16) -> Result<mpsc::Sender<BiDiRequest>, String> {
    let mut sessions = get_sessions().lock().await;
    if let Some(tx) = sessions.get(&port) {
        if !tx.is_closed() {
            return Ok(tx.clone());
        }
    }

    let (tx, rx) = mpsc::channel(32);
    tokio::spawn(run_bidi_actor(port, rx));
    sessions.insert(port, tx.clone());
    Ok(tx)
}

pub struct TabManager;

impl TabManager {
    /// Obtém todas as abas e URLs abertas em tempo real através da porta de depuração do Camoufox
    pub async fn get_open_tabs(port: u16) -> Result<Vec<TabInfo>, String> {
        let tx = get_or_spawn_sender(port).await?;
        let (resp_tx, resp_rx) = oneshot::channel();
        tx.send(BiDiRequest::GetTabs { resp: resp_tx })
            .await
            .map_err(|e| format!("Falha ao enviar comando para BiDi actor: {e}"))?;
        resp_rx.await.map_err(|_| "BiDi actor encerrou sem responder".to_string())?
    }

    /// Abre uma nova aba com a URL especificada no navegador Camoufox em execução
    pub async fn open_new_tab(port: u16, url: &str) -> Result<String, String> {
        let tx = get_or_spawn_sender(port).await?;
        let (resp_tx, resp_rx) = oneshot::channel();
        tx.send(BiDiRequest::OpenTab {
            url: url.to_string(),
            resp: resp_tx,
        })
        .await
        .map_err(|e| format!("Falha ao enviar comando para BiDi actor: {e}"))?;
        resp_rx.await.map_err(|_| "BiDi actor encerrou sem responder".to_string())?
    }

    /// Fecha uma aba específica do navegador
    pub async fn close_tab(port: u16, context_id: &str) -> Result<(), String> {
        let tx = get_or_spawn_sender(port).await?;
        let (resp_tx, resp_rx) = oneshot::channel();
        tx.send(BiDiRequest::CloseTab {
            context_id: context_id.to_string(),
            resp: resp_tx,
        })
        .await
        .map_err(|e| format!("Falha ao enviar comando para BiDi actor: {e}"))?;
        resp_rx.await.map_err(|_| "BiDi actor encerrou sem responder".to_string())?
    }
}
