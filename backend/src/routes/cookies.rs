use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use std::sync::Arc;

use crate::cookie_manager::CookieManager;
use crate::service_database::ProfileStorage;

#[derive(Debug, Deserialize)]
pub struct ImportCookiesDto {
    pub cookies_raw: String,
}

/// Lê todos os cookies e estatísticas de domínios do perfil
pub async fn get_profile_cookies(
    State(storage): State<Arc<ProfileStorage>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let profile_dir = storage.get_profile_dir(&id);
    match CookieManager::read_cookies(&profile_dir) {
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
    match CookieManager::import_cookies(&profile_dir, &payload.cookies_raw) {
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
    match CookieManager::clear_cookies(&profile_dir) {
        Ok(deleted) => Ok(Json(serde_json::json!({
            "status": "cleared",
            "deleted_count": deleted
        }))),
        Err(err) => Err((StatusCode::INTERNAL_SERVER_ERROR, err)),
    }
}
