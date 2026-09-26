use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use std::sync::Arc;

use crate::cloud_sync::CloudSyncService;

pub async fn sync_to_cloud(
    State(sync_service): State<Arc<CloudSyncService>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    match sync_service.upload_profile(&id).await {
        Ok(result) => Ok(Json(result)),
        Err(err) => Err((StatusCode::INTERNAL_SERVER_ERROR, err)),
    }
}

pub async fn restore_from_cloud(
    State(sync_service): State<Arc<CloudSyncService>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    match sync_service.download_profile(&id).await {
        Ok(_) => Ok(Json(serde_json::json!({
            "status": "success",
            "message": format!("Perfil {} restaurado com sucesso da nuvem.", id)
        }))),
        Err(err) => Err((StatusCode::INTERNAL_SERVER_ERROR, err)),
    }
}

pub async fn get_cloud_stat(
    State(sync_service): State<Arc<CloudSyncService>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    match sync_service.stat_profile(&id).await {
        Ok(stat) => Ok(Json(stat)),
        Err(err) => Err((StatusCode::INTERNAL_SERVER_ERROR, err)),
    }
}
