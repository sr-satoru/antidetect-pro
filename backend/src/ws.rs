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
pub enum WsEvent {
    #[serde(rename = "profile_status")]
    ProfileStatus {
        profile_id: String,
        status: String, // "running" ou "ready"
    },
}

#[derive(Clone)]
pub struct WsState {
    pub tx: broadcast::Sender<WsEvent>,
}

impl WsState {
    pub fn new() -> Self {
        let (tx, _) = broadcast::channel(256);
        Self { tx }
    }

    pub fn emit(&self, event: WsEvent) {
        let _ = self.tx.send(event);
    }
}

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<WsState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(mut socket: WebSocket, state: WsState) {
    let mut rx = state.tx.subscribe();
    info!("🔌 Cliente conectado ao WebSocket /api/ws");

    loop {
        tokio::select! {
            // Envia eventos do backend para o frontend
            event_res = rx.recv() => {
                match event_res {
                    Ok(event) => {
                        info!("📡 WebSocket enviando evento: {:?}", event);
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
            // Lê pings/mensagens do cliente (mantém a conexão viva)
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
    info!("🔌 Cliente desconectado do WebSocket /api/ws");
}
