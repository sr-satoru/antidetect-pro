use std::sync::Arc;
use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};

use crate::browser_downloader::{
    platform, BrowserDownloadService, BrowserManifest, DownloadStatus, EngineHealthStatus,
};

#[derive(Clone)]
pub struct BrowserRouteState {
    pub service: Arc<BrowserDownloadService>,
    pub data_dir: std::path::PathBuf,
}

#[derive(Serialize, Deserialize)]
pub struct BrowserStatusResponse {
    pub health: EngineHealthStatus,
    pub download: DownloadStatus,
    pub platform: String,
    pub os_name: String,
}

#[derive(Serialize, Deserialize)]
pub struct GenericMessageResponse {
    pub success: bool,
    pub message: String,
}

/// GET /api/browser/status
pub async fn get_browser_status(
    State(state): State<BrowserRouteState>,
) -> impl IntoResponse {
    let (health, download) = state.service.get_status().await;
    let platform = platform::get_current_platform_key().unwrap_or_else(|_| "unknown".to_string());
    let os_name = platform::get_os_display_name().to_string();

    Json(BrowserStatusResponse {
        health,
        download,
        platform,
        os_name,
    })
}

/// POST /api/browser/download
pub async fn trigger_browser_download(
    State(state): State<BrowserRouteState>,
) -> impl IntoResponse {
    match state.service.start_download().await {
        Ok(_) => (
            StatusCode::OK,
            Json(GenericMessageResponse {
                success: true,
                message: "Download do motor iniciado com sucesso.".to_string(),
            }),
        ),
        Err(err) => (
            StatusCode::CONFLICT,
            Json(GenericMessageResponse {
                success: false,
                message: err,
            }),
        ),
    }
}

/// GET /api/browser/manifest
pub async fn get_browser_manifest(
    State(state): State<BrowserRouteState>,
) -> impl IntoResponse {
    match BrowserManifest::load(&state.data_dir) {
        Ok(manifest) => (StatusCode::OK, Json(manifest)).into_response(),
        Err(err) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": err })),
        )
            .into_response(),
    }
}
