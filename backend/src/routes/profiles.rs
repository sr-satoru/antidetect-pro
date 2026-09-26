use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use std::sync::Arc;

use crate::models::{CreateProfileDto, UpdateProfileDto};
use crate::storage::ProfileStorage;

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

pub async fn launch_profile(
    State(storage): State<Arc<ProfileStorage>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    match storage.launch(&id).await {
        Ok((profile, pid)) => Ok(Json(serde_json::json!({
            "status": "launched",
            "profile_id": profile.id,
            "pid": pid,
            "kernel": profile.kernel,
            "message": format!("Navegador {} iniciado com sucesso (PID: {pid}).", profile.kernel)
        }))),
        Err(err) => Err((StatusCode::INTERNAL_SERVER_ERROR, err)),
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

#[derive(Debug, Deserialize)]
pub struct OpenTabDto {
    pub url: String,
}

#[derive(Debug, Deserialize)]
pub struct ImportCookiesDto {
    pub cookies_raw: String,
}

/// Consulta abas e URLs abertas no perfil em tempo real
pub async fn get_profile_tabs(
    State(storage): State<Arc<ProfileStorage>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let pm = storage.get_process_manager();
    let is_running = pm.is_running(&id);
    if !is_running {
        return Ok(Json(serde_json::json!({
            "is_running": false,
            "port": null,
            "tabs": []
        })));
    }

    let port = pm.get_debug_port(&id);
    let tabs = if let Some(p) = port {
        crate::tab_manager::TabManager::get_open_tabs(p)
            .await
            .unwrap_or_default()
    } else {
        vec![]
    };

    Ok(Json(serde_json::json!({
        "is_running": true,
        "port": port,
        "tabs": tabs
    })))
}

/// Abre uma nova aba com a URL solicitada
pub async fn open_profile_tab(
    State(storage): State<Arc<ProfileStorage>>,
    Path(id): Path<String>,
    Json(payload): Json<OpenTabDto>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let pm = storage.get_process_manager();
    if !pm.is_running(&id) {
        return Err((StatusCode::BAD_REQUEST, "Perfil não está em execução".to_string()));
    }

    let port = pm.get_debug_port(&id).ok_or_else(|| {
        (StatusCode::BAD_REQUEST, "Porta de depuração do navegador indisponível".to_string())
    })?;

    match crate::tab_manager::TabManager::open_new_tab(port, &payload.url).await {
        Ok(context_id) => Ok(Json(serde_json::json!({
            "status": "opened",
            "context_id": context_id,
            "url": payload.url
        }))),
        Err(err) => Err((StatusCode::INTERNAL_SERVER_ERROR, err)),
    }
}

/// Fecha uma aba no navegador em execução
pub async fn close_profile_tab(
    State(storage): State<Arc<ProfileStorage>>,
    Path((id, tab_id)): Path<(String, String)>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let pm = storage.get_process_manager();
    if !pm.is_running(&id) {
        return Err((StatusCode::BAD_REQUEST, "Perfil não está em execução".to_string()));
    }

    let port = pm.get_debug_port(&id).ok_or_else(|| {
        (StatusCode::BAD_REQUEST, "Porta de depuração do navegador indisponível".to_string())
    })?;

    match crate::tab_manager::TabManager::close_tab(port, &tab_id).await {
        Ok(_) => Ok(Json(serde_json::json!({
            "status": "closed",
            "tab_id": tab_id
        }))),
        Err(err) => Err((StatusCode::INTERNAL_SERVER_ERROR, err)),
    }
}

/// Lê todos os cookies e estatísticas de domínios do perfil
pub async fn get_profile_cookies(
    State(storage): State<Arc<ProfileStorage>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let profile_dir = storage.get_profile_dir(&id);
    match crate::cookie_manager::CookieManager::read_cookies(&profile_dir) {
        Ok(stats) => Ok(Json(stats)),
        Err(err) => Err((StatusCode::INTERNAL_SERVER_ERROR, err)),
    }
}

/// Importa cookies em JSON ou formato Netscape para o perfil
pub async fn import_profile_cookies(
    State(storage): State<Arc<ProfileStorage>>,
    Path(id): Path<String>,
    Json(payload): Json<ImportCookiesDto>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let profile_dir = storage.get_profile_dir(&id);
    match crate::cookie_manager::CookieManager::import_cookies(&profile_dir, &payload.cookies_raw) {
        Ok(result) => Ok(Json(result)),
        Err(err) => Err((StatusCode::BAD_REQUEST, err)),
    }
}

/// Limpa os cookies do perfil
pub async fn clear_profile_cookies(
    State(storage): State<Arc<ProfileStorage>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let profile_dir = storage.get_profile_dir(&id);
    match crate::cookie_manager::CookieManager::clear_cookies(&profile_dir) {
        Ok(deleted) => Ok(Json(serde_json::json!({
            "status": "cleared",
            "deleted_count": deleted
        }))),
        Err(err) => Err((StatusCode::INTERNAL_SERVER_ERROR, err)),
    }
}

