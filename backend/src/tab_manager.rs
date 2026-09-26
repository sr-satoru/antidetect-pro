use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::time::Duration;
use tokio::time::timeout;
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::protocol::Message;
use tracing::info;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TabInfo {
    pub id: String,
    pub url: String,
    pub title: String,
    pub is_active: bool,
}

pub struct TabManager;

impl TabManager {
    /// Obtém todas as abas e URLs abertas em tempo real através da porta de depuração do Camoufox
    pub async fn get_open_tabs(port: u16) -> Result<Vec<TabInfo>, String> {
        let ws_url = format!("ws://127.0.0.1:{port}/session");

        // Timeout de conexão para evitar travamentos
        let connect_future = connect_async(&ws_url);
        let (mut ws_stream, _) = timeout(Duration::from_millis(1500), connect_future)
            .await
            .map_err(|_| "Timeout ao conectar na porta de depuração do navegador".to_string())?
            .map_err(|e| format!("Falha no handshake WebSocket BiDi: {e}"))?;

        // 1. Inicializa sessão BiDi (session.new)
        let init_cmd = json!({
            "id": 1,
            "method": "session.new",
            "params": {
                "capabilities": {}
            }
        });

        ws_stream
            .send(Message::Text(init_cmd.to_string().into()))
            .await
            .map_err(|e| format!("Falha ao enviar session.new: {e}"))?;

        // Lê a resposta do session.new (pode ser success ou session already active)
        if let Ok(Some(Ok(msg))) = timeout(Duration::from_millis(1000), ws_stream.next()).await {
            let _ = msg;
        }

        // 2. Consulta a árvore de contextos (abas) abertas (browsingContext.getTree)
        let tree_cmd = json!({
            "id": 2,
            "method": "browsingContext.getTree",
            "params": {}
        });

        ws_stream
            .send(Message::Text(tree_cmd.to_string().into()))
            .await
            .map_err(|e| format!("Falha ao solicitar abas: {e}"))?;

        let mut tabs = Vec::new();

        // Aguarda a resposta do browsingContext.getTree
        while let Ok(Some(Ok(msg))) = timeout(Duration::from_millis(1500), ws_stream.next()).await {
            if let Message::Text(text) = msg {
                if let Ok(val) = serde_json::from_str::<serde_json::Value>(&text) {
                    if val.get("id").and_then(|v| v.as_i64()) == Some(2) {
                        if let Some(contexts) = val
                            .get("result")
                            .and_then(|r| r.get("contexts"))
                            .and_then(|c| c.as_array())
                        {
                            for (idx, ctx) in contexts.iter().enumerate() {
                                let id = ctx
                                    .get("context")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or_default()
                                    .to_string();
                                let raw_url = ctx
                                    .get("url")
                                    .and_then(|v| v.as_str())
                                    .unwrap_or("about:blank")
                                    .to_string();

                                let title = if raw_url.starts_with("http") {
                                    raw_url
                                        .replace("https://", "")
                                        .replace("http://", "")
                                        .split('/')
                                        .next()
                                        .unwrap_or(&raw_url)
                                        .to_string()
                                } else {
                                    raw_url.clone()
                                };

                                tabs.push(TabInfo {
                                    id,
                                    url: raw_url,
                                    title,
                                    is_active: idx == 0,
                                });
                            }
                        }
                        break;
                    }
                }
            }
        }

        // Encerra a conexão WebSocket com gentileza
        let _ = ws_stream.close(None).await;

        Ok(tabs)
    }

    /// Abre uma nova aba com a URL especificada no navegador Camoufox em execução
    pub async fn open_new_tab(port: u16, url: &str) -> Result<String, String> {
        let ws_url = format!("ws://127.0.0.1:{port}/session");
        let (mut ws_stream, _) = timeout(Duration::from_millis(1500), connect_async(&ws_url))
            .await
            .map_err(|_| "Timeout ao conectar no navegador".to_string())?
            .map_err(|e| format!("Erro ao conectar: {e}"))?;

        // 1. Session new
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

        let _ = timeout(Duration::from_millis(800), ws_stream.next()).await;

        // 2. browsingContext.create (type: tab)
        let create_cmd = json!({
            "id": 2,
            "method": "browsingContext.create",
            "params": {
                "type": "tab"
            }
        });

        ws_stream
            .send(Message::Text(create_cmd.to_string().into()))
            .await
            .map_err(|e| format!("Falha ao enviar create tab: {e}"))?;

        let mut created_context_id = String::new();

        while let Ok(Some(Ok(msg))) = timeout(Duration::from_millis(1500), ws_stream.next()).await {
            if let Message::Text(text) = msg {
                if let Ok(val) = serde_json::from_str::<serde_json::Value>(&text) {
                    if val.get("id").and_then(|v| v.as_i64()) == Some(2) {
                        if let Some(ctx_id) = val
                            .get("result")
                            .and_then(|r| r.get("context"))
                            .and_then(|c| c.as_str())
                        {
                            created_context_id = ctx_id.to_string();
                        }
                        break;
                    }
                }
            }
        }

        if created_context_id.is_empty() {
            return Err("Falha ao obter ID da nova aba criada".to_string());
        }

        // 3. Navega para a URL se foi fornecida
        let target_url = if url.trim().is_empty() {
            "about:blank"
        } else if !url.starts_with("http://") && !url.starts_with("https://") && !url.starts_with("about:") {
            &format!("https://{url}")
        } else {
            url
        };

        let nav_cmd = json!({
            "id": 3,
            "method": "browsingContext.navigate",
            "params": {
                "context": created_context_id,
                "url": target_url
            }
        });

        let _ = ws_stream
            .send(Message::Text(nav_cmd.to_string().into()))
            .await;

        let _ = ws_stream.close(None).await;

        info!(
            "🌐 Nova aba aberta no navegador (porta {}): context={}, url={}",
            port, created_context_id, target_url
        );

        Ok(created_context_id)
    }

    /// Fecha uma aba específica do navegador
    pub async fn close_tab(port: u16, context_id: &str) -> Result<(), String> {
        let ws_url = format!("ws://127.0.0.1:{port}/session");
        let (mut ws_stream, _) = timeout(Duration::from_millis(1500), connect_async(&ws_url))
            .await
            .map_err(|_| "Timeout ao conectar no navegador".to_string())?
            .map_err(|e| format!("Erro ao conectar: {e}"))?;

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
        let _ = timeout(Duration::from_millis(800), ws_stream.next()).await;

        let close_cmd = json!({
            "id": 2,
            "method": "browsingContext.close",
            "params": {
                "context": context_id
            }
        });

        ws_stream
            .send(Message::Text(close_cmd.to_string().into()))
            .await
            .map_err(|e| format!("Falha ao fechar aba: {e}"))?;

        let _ = ws_stream.close(None).await;
        info!("❌ Aba fechada: context={}", context_id);
        Ok(())
    }
}
