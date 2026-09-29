use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use std::sync::Arc;

use crate::extraction_session::fire_fox::{
    extract_cookies, extract_local_storage, extract_unified_session,
};
use crate::launcher::engine::injection::{
    clear_profile_cookies as clear_cookies_engine,
    clear_profile_storage as clear_storage_engine,
    import_raw_cookies,
};
use crate::service_database::ProfileStorage;

#[derive(Debug, Deserialize)]
pub struct ImportCookiesDto {
    pub cookies_raw: String,
}

/// Lê todos os cookies e estatísticas de domínios do perfil (Módulo 1)
pub async fn get_profile_cookies(
    State(storage): State<Arc<ProfileStorage>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let profile_dir = storage.get_profile_dir(&id);
    match extract_cookies(&profile_dir) {
        Ok(stats) => Ok(Json(stats)),
        Err(err) => Err((StatusCode::INTERNAL_SERVER_ERROR, err)),
    }
}

/// Lê todo o LocalStorage / Tokens extraídos do perfil (Módulo 2)
pub async fn get_profile_storage(
    State(storage): State<Arc<ProfileStorage>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let profile_dir = storage.get_profile_dir(&id);
    match extract_local_storage(&profile_dir) {
        Ok(storage_map) => Ok(Json(storage_map)),
        Err(err) => Err((StatusCode::INTERNAL_SERVER_ERROR, err)),
    }
}

/// Lê a sessão unificada completa do perfil (Cookies + LocalStorage)
pub async fn get_profile_session(
    State(storage): State<Arc<ProfileStorage>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let profile_dir = storage.get_profile_dir(&id);
    match extract_unified_session(&profile_dir) {
        Ok(session) => Ok(Json(session)),
        Err(err) => Err((StatusCode::INTERNAL_SERVER_ERROR, err)),
    }
}

/// Importa e injeta cookies em formato JSON ou Netscape no Camoufox
pub async fn import_profile_cookies(
    State(storage): State<Arc<ProfileStorage>>,
    Path(id): Path<String>,
    Json(payload): Json<ImportCookiesDto>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let profile_dir = storage.get_profile_dir(&id);
    match import_raw_cookies(&profile_dir, &payload.cookies_raw) {
        Ok(result) => Ok(Json(result)),
        Err(err) => Err((StatusCode::BAD_REQUEST, err)),
    }
}

/// Limpa todos os cookies do perfil
pub async fn clear_profile_cookies(
    State(storage): State<Arc<ProfileStorage>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let profile_dir = storage.get_profile_dir(&id);
    match clear_cookies_engine(&profile_dir) {
        Ok(deleted) => Ok(Json(serde_json::json!({
            "status": "cleared",
            "deleted_count": deleted
        }))),
        Err(err) => Err((StatusCode::INTERNAL_SERVER_ERROR, err)),
    }
}

/// Limpa todo o LocalStorage do perfil
pub async fn clear_profile_storage(
    State(storage): State<Arc<ProfileStorage>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let profile_dir = storage.get_profile_dir(&id);
    match clear_storage_engine(&profile_dir) {
        Ok(()) => Ok(Json(serde_json::json!({
            "status": "cleared",
            "type": "storage"
        }))),
        Err(err) => Err((StatusCode::INTERNAL_SERVER_ERROR, err)),
    }
}
