use axum::{
    extract::{Path, Query, State},
    http::{header, HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use std::sync::Arc;

use crate::models::{CreateProfileDto, PublicProfileDto, PublicProfileQuery, UpdateProfileDto};
use crate::service_database::ProfileStorage;

/// Valida se o request possui o cabeçalho Authorization: Bearer <TOKEN> válido contra o Star Vault.
/// Se ausente ou inválido, corta imediatamente com HTTP 401 Unauthorized.
fn authenticate_public_request(
    storage: &ProfileStorage,
    headers: &HeaderMap,
) -> Result<(), (StatusCode, Json<serde_json::Value>)> {
    let auth_val = headers.get(header::AUTHORIZATION).and_then(|h| h.to_str().ok());
    let candidate = match auth_val {
        Some(val) => {
            let trimmed = val.trim();
            if let Some(stripped) = trimmed.strip_prefix("Bearer ") {
                stripped.trim()
            } else if !trimmed.contains(' ') {
                trimmed
            } else {
                ""
            }
        }
        None => {
            // Suporte alternativo a x-mcp-token
            headers
                .get("x-mcp-token")
                .and_then(|h| h.to_str().ok())
                .unwrap_or("")
                .trim()
        }
    };

    if candidate.is_empty() || !storage.verify_mcp_token(candidate) {
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({
                "error": "Acesso não autorizado",
                "message": "Token de autenticação ausente ou inválido. Envie o cabeçalho 'Authorization: Bearer <TOKEN>'."
            })),
        ));
    }

    Ok(())
}

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
    if let Err(err) = storage.check_profile_limit() {
        return Err((StatusCode::FORBIDDEN, err));
    }
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

pub async fn get_profile_playwright(
    State(storage): State<Arc<ProfileStorage>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    match storage.get_playwright_options(&id) {
        Ok(opts) => Ok(Json(opts)),
        Err(err) => Err((StatusCode::NOT_FOUND, err)),
    }
}

/// Endpoint público minimalista (GET /api/profiles/public)
/// Exige token Bearer válido no header Authorization.
/// Aceita ESTRITAMENTE os parâmetros `id`, `name` e/ou `tag`.
/// Qualquer outro campo é rejeitado pelo deserializador.
/// Retorna estritamente `{ "id": "...", "name": "...", "tags": [...] }` ou a lista pública resumida.
pub async fn get_public_profiles(
    State(storage): State<Arc<ProfileStorage>>,
    headers: HeaderMap,
    Query(params): Query<PublicProfileQuery>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    authenticate_public_request(&storage, &headers)?;

    let id_opt = params.id.as_deref().map(str::trim).filter(|s| !s.is_empty());
    let name_opt = params.name.as_deref().map(str::trim).filter(|s| !s.is_empty());
    let tag_opt = params.tag.as_deref().map(str::trim).filter(|s| !s.is_empty());

    let results = storage.get_public(id_opt, name_opt, tag_opt);

    if id_opt.is_some() || name_opt.is_some() {
        if let Some(profile) = results.into_iter().next() {
            Ok(Json(serde_json::json!({
                "id": profile.id,
                "name": profile.name,
                "tags": profile.tags,
            })))
        } else {
            Err((
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({
                    "error": "Perfil não encontrado"
                })),
            ))
        }
    } else {
        let list: Vec<PublicProfileDto> = results;
        Ok(Json(serde_json::json!(list)))
    }
}

/// Endpoint público minimalista (POST /api/profiles/public)
/// Exige token Bearer válido no header Authorization.
/// Aceita ESTRITAMENTE o corpo JSON com `id`, `name` e/ou `tag`.
/// Qualquer outro campo no payload é rejeitado com erro 422/400 (deny_unknown_fields).
pub async fn lookup_public_profile(
    State(storage): State<Arc<ProfileStorage>>,
    headers: HeaderMap,
    Json(payload): Json<PublicProfileQuery>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    authenticate_public_request(&storage, &headers)?;

    let id_opt = payload.id.as_deref().map(str::trim).filter(|s| !s.is_empty());
    let name_opt = payload.name.as_deref().map(str::trim).filter(|s| !s.is_empty());
    let tag_opt = payload.tag.as_deref().map(str::trim).filter(|s| !s.is_empty());

    let results = storage.get_public(id_opt, name_opt, tag_opt);

    if id_opt.is_some() || name_opt.is_some() {
        if let Some(profile) = results.into_iter().next() {
            Ok(Json(serde_json::json!({
                "id": profile.id,
                "name": profile.name,
                "tags": profile.tags,
            })))
        } else {
            Err((
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({
                    "error": "Perfil não encontrado"
                })),
            ))
        }
    } else {
        let list: Vec<PublicProfileDto> = results;
        Ok(Json(serde_json::json!(list)))
    }
}

/// Endpoint público minimalista por ID na rota (GET /api/profiles/:id/public)
/// Exige token Bearer válido no header Authorization.
/// Retorna estritamente `{ "id": "...", "name": "...", "tags": [...] }`.
pub async fn get_public_profile_by_id(
    State(storage): State<Arc<ProfileStorage>>,
    Path(id): Path<String>,
    headers: HeaderMap,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    authenticate_public_request(&storage, &headers)?;

    let results = storage.get_public(Some(&id), None, None);
    if let Some(profile) = results.into_iter().next() {
        Ok(Json(serde_json::json!({
            "id": profile.id,
            "name": profile.name,
            "tags": profile.tags,
        })))
    } else {
        Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({
                "error": "Perfil não encontrado"
            })),
        ))
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
    if let Err(err) = storage.check_profile_limit() {
        return Err((StatusCode::FORBIDDEN, err));
    }
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
    pub url: Option<String>,
}

pub async fn launch_profile(
    State(storage): State<Arc<ProfileStorage>>,
    Path(id): Path<String>,
    Query(params): Query<LaunchProfileQuery>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let cdp = params.cdp.unwrap_or(false);
    let initial_url = params.url.as_deref();
    match storage.launch_with_options(&id, cdp, initial_url).await {
        Ok((profile, pid, debug_port, ws_endpoint)) => Ok(Json(serde_json::json!({
            "status": "launched",
            "profile": profile,
            "profile_id": profile.id,
            "pid": pid,
            "debug_port": debug_port,
            "ws_endpoint": ws_endpoint,
            "kernel": profile.kernel,
            "url": initial_url,
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

