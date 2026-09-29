use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use std::sync::Arc;

use crate::launcher::TabManager;
use crate::service_database::ProfileStorage;

#[derive(Debug, Deserialize)]
pub struct OpenTabDto {
    pub url: String,
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
        TabManager::get_open_tabs(p)
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

/// Abre uma nova aba com a URL solicitada no perfil
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

    match TabManager::open_new_tab(port, &payload.url).await {
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

    match TabManager::close_tab(port, &tab_id).await {
        Ok(_) => Ok(Json(serde_json::json!({
            "status": "closed",
            "tab_id": tab_id
        }))),
        Err(err) => Err((StatusCode::INTERNAL_SERVER_ERROR, err)),
    }
}
