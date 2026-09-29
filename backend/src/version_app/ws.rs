use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};
use tokio::sync::broadcast;
use tracing::info;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "event", content = "data")]
pub enum VersionWsEvent {
    #[serde(rename = "update_progress")]
    UpdateProgress {
        stage: String,
        progress: f32,
        downloaded_bytes: u64,
        total_bytes: u64,
        speed_mb_s: f32,
        eta_seconds: u64,
        error: Option<String>,
    },
    #[serde(rename = "update_ready")]
    UpdateReady {
        version: String,
        asset_name: String,
        file_path: String,
    },
}

#[derive(Clone)]
pub struct VersionWsState {
    pub tx: broadcast::Sender<VersionWsEvent>,
}

impl VersionWsState {
    pub fn new() -> Self {
        let (tx, _) = broadcast::channel(128);
        Self { tx }
    }

    pub fn emit(&self, event: VersionWsEvent) {
        let _ = self.tx.send(event);
    }
}

impl Default for VersionWsState {
    fn default() -> Self {
        Self::new()
    }
}

/// Handler do WebSocket dedicado para atualizações de versão
pub async fn version_ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<VersionWsState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_version_socket(socket, state))
}

async fn handle_version_socket(mut socket: WebSocket, state: VersionWsState) {
    let mut rx = state.tx.subscribe();
    info!("🔌 Cliente conectado ao WebSocket dedicado de atualização (/api/app/ws)");

    loop {
        tokio::select! {
            // Envia eventos de progresso da atualização para o cliente conectado
            event_res = rx.recv() => {
                match event_res {
                    Ok(event) => {
                        if let Ok(json) = serde_json::to_string(&event) {
                            if socket.send(Message::Text(json.into())).await.is_err() {
                                break;
                            }
                        }
                    }
                    Err(broadcast::error::RecvError::Lagged(_)) => continue,
                    Err(broadcast::error::RecvError::Closed) => break,
                }
            }
            // Mantém a conexão viva respondendo Pongs
            msg_res = socket.recv() => {
                match msg_res {
                    Some(Ok(Message::Ping(data))) => {
                        if socket.send(Message::Pong(data)).await.is_err() {
                            break;
                        }
                    }
                    Some(Ok(Message::Close(_))) | None => break,
                    _ => {}
                }
            }
        }
    }
    info!("🔌 Cliente desconectado do WebSocket de atualização (/api/app/ws)");
}
