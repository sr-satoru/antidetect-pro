use std::sync::Arc;
use axum::{
    extract::{Query, State, WebSocketUpgrade},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};

use super::models::{CheckUpdateQuery, GenericResponse, StartDownloadRequest};
use super::service::AppVersionService;
use super::ws::{version_ws_handler, VersionWsState};

#[derive(Clone)]
pub struct AppVersionRouteState {
    pub service: Arc<AppVersionService>,
    pub ws_state: VersionWsState,
}

/// Cria o sub-roteador do módulo version_app para /api/app
pub fn create_app_version_routes(
    service: Arc<AppVersionService>,
    ws_state: VersionWsState,
) -> Router {
    let state = AppVersionRouteState { service, ws_state };

    Router::new()
        .route("/version", get(get_current_version))
        .route("/check-update", get(check_app_update))
        .route("/status", get(get_update_status))
        .route("/start-download", post(start_app_download))
        .route("/apply-restart", post(apply_app_restart))
        .route("/ws", get(upgrade_version_ws))
        .with_state(state)
}

/// GET /api/app/version
pub async fn get_current_version(
    State(state): State<AppVersionRouteState>,
) -> impl IntoResponse {
    let version = state.service.get_local_version();
    Json(serde_json::json!({
        "version": version
    }))
}

/// GET /api/app/check-update
pub async fn check_app_update(
    State(state): State<AppVersionRouteState>,
    Query(query): Query<CheckUpdateQuery>,
) -> impl IntoResponse {
    match state.service.check_update(query.current_version).await {
        Ok(info) => (StatusCode::OK, Json(serde_json::to_value(info).unwrap())),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e })),
        ),
    }
}

/// GET /api/app/status
pub async fn get_update_status(
    State(state): State<AppVersionRouteState>,
) -> impl IntoResponse {
    let status = state.service.get_status().await;
    (StatusCode::OK, Json(status))
}

/// POST /api/app/start-download
pub async fn start_app_download(
    State(state): State<AppVersionRouteState>,
    Json(payload): Json<StartDownloadRequest>,
) -> impl IntoResponse {
    match state.service.start_download(payload.download_url).await {
        Ok(msg) => (
            StatusCode::OK,
            Json(GenericResponse {
                success: true,
                message: msg,
            }),
        ),
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(GenericResponse {
                success: false,
                message: e,
            }),
        ),
    }
}

/// POST /api/app/apply-restart
pub async fn apply_app_restart(
    State(state): State<AppVersionRouteState>,
) -> impl IntoResponse {
    match state.service.apply_restart().await {
        Ok(_) => (
            StatusCode::OK,
            Json(GenericResponse {
                success: true,
                message: "Reiniciando aplicação...".to_string(),
            }),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(GenericResponse {
                success: false,
                message: e,
            }),
        ),
    }
}

/// GET /api/app/ws (WebSocket dedicado de atualização)
pub async fn upgrade_version_ws(
    ws: WebSocketUpgrade,
    State(state): State<AppVersionRouteState>,
) -> impl IntoResponse {
    version_ws_handler(ws, axum::extract::State(state.ws_state)).await
}
