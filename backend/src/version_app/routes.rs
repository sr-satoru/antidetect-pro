use std::sync::Arc;
use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};

use super::models::{CheckUpdateQuery, GenericResponse, OpenUrlRequest};
use super::service::AppVersionService;

#[derive(Clone)]
pub struct AppVersionRouteState {
    pub service: Arc<AppVersionService>,
}

/// Cria o sub-roteador do módulo version_app para /api/app
pub fn create_app_version_routes(service: Arc<AppVersionService>) -> Router {
    let state = AppVersionRouteState { service };

    Router::new()
        .route("/version", get(get_current_version))
        .route("/check-update", get(check_app_update))
        .route("/open-download", post(open_download_url))
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

/// POST /api/app/open-download
pub async fn open_download_url(
    State(state): State<AppVersionRouteState>,
    Json(payload): Json<OpenUrlRequest>,
) -> impl IntoResponse {
    let target_url = if let Some(u) = payload.url.filter(|s| !s.trim().is_empty()) {
        u
    } else {
        // Se nenhuma URL foi passada, busca o download_url da última versão
        match state.service.check_update(None).await {
            Ok(info) => info.download_url.unwrap_or(info.html_url),
            Err(e) => {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(GenericResponse {
                        success: false,
                        message: format!("Não foi possível determinar URL de download: {}", e),
                    }),
                );
            }
        }
    };

    match state.service.open_external_url(&target_url) {
        Ok(_) => (
            StatusCode::OK,
            Json(GenericResponse {
                success: true,
                message: format!("URL externa aberta com sucesso: {}", target_url),
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
