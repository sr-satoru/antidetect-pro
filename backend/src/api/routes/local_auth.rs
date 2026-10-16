use axum::{
    extract::{ConnectInfo, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::net::SocketAddr;
use std::sync::Arc;
use crate::core::security::NonceManager;

/// Payload para troca de ticket efêmero por sessão
#[derive(Debug, Deserialize, Serialize)]
pub struct HandshakePayload {
    pub ticket: String,
}

/// Payload opcional para solicitação de ticket de ação de risco
#[derive(Debug, Deserialize, Serialize, Default)]
pub struct ActionTicketPayload {
    pub action: Option<String>,
}

/// POST /api/local-auth/handshake
/// Consome um ticket de uso único (emitido via Tauri IPC) e retorna uma sessão desktop efêmera.
/// ⚠️ Não tem relação com /api/cloud-auth. Funciona 100% offline.
pub async fn handshake(
    State(nm): State<Arc<NonceManager>>,
    Json(payload): Json<HandshakePayload>,
) -> Result<impl IntoResponse, StatusCode> {
    if payload.ticket.is_empty() {
        return Err(StatusCode::BAD_REQUEST);
    }

    if nm.consume_ticket(&payload.ticket, "desktop_handshake") {
        let session_token = nm.create_session(7200); // 2 horas (sliding window)
        tracing::info!("✅ Handshake desktop concluído com sucesso. Nova sessão emitida.");
        Ok(Json(json!({
            "session_token": session_token,
            "expires_in": 7200,
            "token_type": "session"
        })))
    } else {
        tracing::warn!("⛔ Tentativa de handshake com ticket inválido, expirado ou reutilizado.");
        Err(StatusCode::UNAUTHORIZED)
    }
}

/// POST /api/local-auth/action-ticket
/// Emite ticket de ação de curto TTL (15s) para operações de alto risco como apply-update.
/// Requer sessão desktop válida no header X-Session-Token.
pub async fn request_action_ticket(
    State(nm): State<Arc<NonceManager>>,
    headers: HeaderMap,
    payload: Option<Json<ActionTicketPayload>>,
) -> Result<impl IntoResponse, StatusCode> {
    let session_valid = headers
        .get("x-session-token")
        .and_then(|v| v.to_str().ok())
        .map(|t| t.starts_with("ses_") && nm.validate_session(t))
        .unwrap_or(false);

    if !session_valid {
        return Err(StatusCode::UNAUTHORIZED);
    }

    let action_name = payload
        .and_then(|p| p.action.clone())
        .unwrap_or_else(|| "apply_update".to_string());

    let scope = format!("action_{}", action_name);
    let action_ticket = nm.create_ticket(&scope, 15); // TTL de 15 segundos

    tracing::info!("🎫 Action ticket emitido para escopo '{}' com TTL de 15s", scope);

    Ok(Json(json!({
        "action_ticket": action_ticket,
        "scope": scope,
        "expires_in": 15
    })))
}

/// POST /api/local-auth/dev-handshake
/// Ativo SOMENTE em builds de desenvolvimento (debug_assertions).
/// Aceita conexões unicamente originadas de loopback (127.0.0.1 / ::1).
#[cfg(debug_assertions)]
pub async fn dev_handshake(
    State(nm): State<Arc<NonceManager>>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
) -> Result<impl IntoResponse, StatusCode> {
    if !addr.ip().is_loopback() {
        tracing::warn!("⛔ Dev handshake rejeitado de endereço não-loopback: {}", addr.ip());
        return Err(StatusCode::FORBIDDEN);
    }

    let session_token = nm.create_session(7200);
    tracing::info!("🛠️ Dev handshake gerou sessão de desenvolvimento: {}", session_token);

    Ok(Json(json!({
        "session_token": session_token,
        "expires_in": 7200,
        "mode": "development",
        "token_type": "session"
    })))
}

#[cfg(not(debug_assertions))]
pub async fn dev_handshake() -> StatusCode {
    StatusCode::NOT_FOUND
}
