use std::sync::Arc;
use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};

use crate::browser_downloader::{
    detector, platform, BrowserDownloadService, BrowserManifest, DownloadStatus, EngineHealthStatus,
    EngineKind,
};

#[derive(Clone)]
pub struct BrowserRouteState {
    pub service: Arc<BrowserDownloadService>,
    pub data_dir: std::path::PathBuf,
}

#[derive(Deserialize, Default)]
pub struct DownloadQuery {
    pub engine: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct BrowserStatusResponse {
    pub health: EngineHealthStatus,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub health_clearcote: Option<EngineHealthStatus>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub health_camoufox: Option<EngineHealthStatus>,
    pub download: DownloadStatus,
    pub platform: String,
    pub os_name: String,
    pub available_version: String,
    pub has_update: bool,
}

#[derive(Serialize, Deserialize)]
pub struct GenericMessageResponse {
    pub success: bool,
    pub message: String,
}

/// GET /api/browser/status
pub async fn get_browser_status(
    State(state): State<BrowserRouteState>,
    Query(query): Query<DownloadQuery>,
) -> impl IntoResponse {
    let req_engine = query.engine.as_deref().and_then(EngineKind::from_str);
    let (health, download) = match req_engine {
        Some(eng) => state.service.get_engine_status(eng).await,
        None => state.service.get_status().await,
    };

    let platform = platform::get_current_platform_key().unwrap_or_else(|_| "unknown".to_string());
    let os_name = platform::get_os_display_name().to_string();

    let manifest = BrowserManifest::load(&state.data_dir).ok();
    let available_version = manifest
        .as_ref()
        .map(|m| m.version.clone())
        .unwrap_or_else(|| "v2.1.0".to_string());

    let installed_version = match &health {
        EngineHealthStatus::Installed { version, .. } => Some(version.as_str()),
        _ => None,
    };

    let has_update = match installed_version {
        Some(inst) => inst != available_version.as_str(),
        None => true,
    };

    let health_clearcote = Some(detector::check_clearcote_health(&state.data_dir));
    let health_camoufox = Some(detector::check_engine_health(&state.data_dir));

    Json(BrowserStatusResponse {
        health,
        health_clearcote,
        health_camoufox,
        download,
        platform,
        os_name,
        available_version,
        has_update,
    })
}

/// POST /api/browser/download
pub async fn trigger_browser_download(
    State(state): State<BrowserRouteState>,
    Query(query): Query<DownloadQuery>,
) -> impl IntoResponse {
    let engine = query
        .engine
        .as_deref()
        .and_then(EngineKind::from_str)
        .unwrap_or(EngineKind::Clearcote);

    match state.service.start_download_engine(engine).await {
        Ok(_) => (
            StatusCode::OK,
            Json(GenericMessageResponse {
                success: true,
                message: format!("Download do motor '{}' iniciado com sucesso.", engine.as_str()),
            }),
        ),
        Err(err) => (
            StatusCode::CONFLICT,
            Json(GenericMessageResponse {
                success: false,
                message: err.to_string(),
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
            Json(serde_json::json!({ "error": err.to_string() })),
        )
            .into_response(),
    }
}
