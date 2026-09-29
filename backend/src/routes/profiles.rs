use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use std::sync::Arc;

use crate::models::{CreateProfileDto, UpdateProfileDto};
use crate::service_database::ProfileStorage;

#[derive(Debug, Deserialize)]
pub struct ListParams {
    pub search: Option<String>,
    pub group: Option<String>,
}

pub async fn list_profiles(
    State(storage): State<Arc<ProfileStorage>>,
    Query(params): Query<ListParams>,
) -> impl IntoResponse {
    let list = storage.list(params.search.as_deref(), params.group.as_deref());
    Json(list)
}

pub async fn create_profile(
    State(storage): State<Arc<ProfileStorage>>,
    Json(payload): Json<CreateProfileDto>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    match storage.create(payload) {
        Ok(profile) => Ok((StatusCode::CREATED, Json(profile))),
        Err(err) => Err((StatusCode::BAD_REQUEST, err)),
    }
}

pub async fn get_profile(
    State(storage): State<Arc<ProfileStorage>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, StatusCode> {
    match storage.get(&id) {
        Some(profile) => Ok(Json(profile)),
        None => Err(StatusCode::NOT_FOUND),
    }
}

pub async fn update_profile(
    State(storage): State<Arc<ProfileStorage>>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateProfileDto>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    match storage.update(&id, payload) {
        Ok(profile) => Ok(Json(profile)),
        Err(err) => Err((StatusCode::NOT_FOUND, err)),
    }
}

pub async fn clone_profile(
    State(storage): State<Arc<ProfileStorage>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    match storage.clone_profile(&id) {
        Ok(profile) => Ok((StatusCode::CREATED, Json(profile))),
        Err(err) => Err((StatusCode::NOT_FOUND, err)),
    }
}

pub async fn delete_profile(
    State(storage): State<Arc<ProfileStorage>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    match storage.soft_delete(&id) {
        Ok(_) => Ok(StatusCode::NO_CONTENT),
        Err(err) => Err((StatusCode::NOT_FOUND, err)),
    }
}

pub async fn list_trash(State(storage): State<Arc<ProfileStorage>>) -> impl IntoResponse {
    let list = storage.list_trash();
    Json(list)
}

pub async fn restore_profile(
    State(storage): State<Arc<ProfileStorage>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    match storage.restore(&id) {
        Ok(profile) => Ok(Json(profile)),
        Err(err) => Err((StatusCode::NOT_FOUND, err)),
    }
}

pub async fn delete_permanent(
    State(storage): State<Arc<ProfileStorage>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    match storage.permanent_delete(&id) {
        Ok(_) => Ok(StatusCode::NO_CONTENT),
        Err(err) => Err((StatusCode::INTERNAL_SERVER_ERROR, err)),
    }
}

pub async fn empty_trash(
    State(storage): State<Arc<ProfileStorage>>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    match storage.empty_trash() {
        Ok(count) => Ok(Json(serde_json::json!({
            "status": "success",
            "message": format!("{count} perfis removidos permanentemente."),
            "deleted_count": count
        }))),
        Err(err) => Err((StatusCode::INTERNAL_SERVER_ERROR, err)),
    }
}

#[derive(Debug, Deserialize)]
pub struct LaunchProfileQuery {
    pub cdp: Option<bool>,
}

pub async fn launch_profile(
    State(storage): State<Arc<ProfileStorage>>,
    Path(id): Path<String>,
    Query(params): Query<LaunchProfileQuery>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let cdp = params.cdp.unwrap_or(false);
    match storage.launch_with_cdp(&id, cdp).await {
        Ok((profile, pid, debug_port, ws_endpoint)) => Ok(Json(serde_json::json!({
            "status": "launched",
            "profile_id": profile.id,
            "pid": pid,
            "debug_port": debug_port,
            "ws_endpoint": ws_endpoint,
            "kernel": profile.kernel,
            "message": format!("Navegador {} iniciado com sucesso (PID: {pid}).", profile.kernel)
        }))),
        Err(err) => {
            tracing::error!("❌ Erro ao iniciar perfil {}: {}", id, err);
            Err((
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({
                    "error": err,
                    "detail": err,
                    "code": "LAUNCH_FAILED"
                })),
            ))
        }
    }
}

pub async fn stop_profile(
    State(storage): State<Arc<ProfileStorage>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    match storage.stop(&id) {
        Ok(profile) => Ok(Json(serde_json::json!({
            "status": "stopped",
            "profile_id": profile.id,
            "message": "Navegador finalizado com sucesso."
        }))),
        Err(err) => Err((StatusCode::NOT_FOUND, err)),
    }
}

