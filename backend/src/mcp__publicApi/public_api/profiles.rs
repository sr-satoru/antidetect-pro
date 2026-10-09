use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use std::sync::Arc;

use crate::service_database::ProfileStorage;
use crate::mcp_public_api::auth::authenticate_mcp;
use crate::mcp_public_api::error::McpError;
use crate::mcp_public_api::types::{McpLaunchPayload, McpLaunchResponse, McpProfileSummary, McpQueryParams, McpStopResponse};

// ============================================================================
// 1. ENDPOINTS GET: LISTAR PERFIS
// ============================================================================

/// Lista perfis do banco local autenticado por token no path: GET /mcp/{token}/profiles
pub async fn list_mcp_profiles(
    State(storage): State<Arc<ProfileStorage>>,
    Path(token): Path<String>,
    headers: HeaderMap,
    Query(query): Query<McpQueryParams>,
) -> Response {
    handle_list_mcp_profiles_inner(&storage, Some(&token), &headers, &query)
}

/// Lista perfis do banco local autenticado por Bearer token ou query: GET /mcp/profiles
pub async fn list_mcp_profiles_bearer(
    State(storage): State<Arc<ProfileStorage>>,
    headers: HeaderMap,
    Query(query): Query<McpQueryParams>,
) -> Response {
    handle_list_mcp_profiles_inner(&storage, None, &headers, &query)
}

fn handle_list_mcp_profiles_inner(
    storage: &ProfileStorage,
    path_token: Option<&str>,
    headers: &HeaderMap,
    query: &McpQueryParams,
) -> Response {
    if let Err(err) = authenticate_mcp(storage, path_token, headers, query) {
        return err.into_response();
    }

    let all_profiles = storage.list(query.search.as_deref(), query.group.as_deref());
    let tag_filter = query.tag.as_deref().map(str::trim).filter(|s| !s.is_empty());

    let summaries: Vec<McpProfileSummary> = all_profiles
        .into_iter()
        .filter(|p| {
            if let Some(tf) = tag_filter {
                p.tags.iter().any(|t| t.name.eq_ignore_ascii_case(tf))
            } else {
                true
            }
        })
        .map(|p| {
            let is_running = storage.is_running(&p.id);
            McpProfileSummary {
                id: p.id.clone(),
                name: p.name,
                kernel: p.kernel,
                browser_version: p.browser_version,
                os: p.os,
                group: p.group,
                tags: p.tags,
                status: if is_running { "running".to_string() } else { p.status },
                running: is_running,
                created_at: p.created_at,
                updated_at: p.updated_at,
            }
        })
        .collect();

    (StatusCode::OK, Json(json!(summaries))).into_response()
}

// ============================================================================
// 2. ENDPOINTS GET: CONSULTAR PERFIL POR ID
// ============================================================================

/// Consulta perfil específico pelo ID: GET /mcp/{token}/profiles/{id}
pub async fn get_mcp_profile(
    State(storage): State<Arc<ProfileStorage>>,
    Path((token, profile_id)): Path<(String, String)>,
    headers: HeaderMap,
    Query(query): Query<McpQueryParams>,
) -> Response {
    handle_get_mcp_profile_inner(&storage, Some(&token), &headers, &query, &profile_id)
}

/// Consulta perfil específico pelo ID via Bearer token: GET /mcp/profiles/{id}
pub async fn get_mcp_profile_bearer(
    State(storage): State<Arc<ProfileStorage>>,
    Path(profile_id): Path<String>,
    headers: HeaderMap,
    Query(query): Query<McpQueryParams>,
) -> Response {
    handle_get_mcp_profile_inner(&storage, None, &headers, &query, &profile_id)
}

fn handle_get_mcp_profile_inner(
    storage: &ProfileStorage,
    path_token: Option<&str>,
    headers: &HeaderMap,
    query: &McpQueryParams,
    profile_id: &str,
) -> Response {
    if let Err(err) = authenticate_mcp(storage, path_token, headers, query) {
        return err.into_response();
    }

    match storage.get(profile_id) {
        Some(p) => {
            let is_running = storage.is_running(&p.id);
            let summary = McpProfileSummary {
                id: p.id.clone(),
                name: p.name,
                kernel: p.kernel,
                browser_version: p.browser_version,
                os: p.os,
                group: p.group,
                tags: p.tags,
                status: if is_running { "running".to_string() } else { p.status },
                running: is_running,
                created_at: p.created_at,
                updated_at: p.updated_at,
            };
            (StatusCode::OK, Json(json!(summary))).into_response()
        }
        None => McpError::ProfileNotFound(profile_id.to_string()).into_response(),
    }
}

// ============================================================================
// 3. ENDPOINTS POST: DISPARAR E PARAR PERFIS NO BANCO LOCAL
// ============================================================================

/// Inicia um perfil no banco local pelo ID: POST /mcp/{token}/profiles/{id}/launch
pub async fn launch_mcp_profile(
    State(storage): State<Arc<ProfileStorage>>,
    Path((token, profile_id)): Path<(String, String)>,
    headers: HeaderMap,
    Query(query): Query<McpQueryParams>,
    body: Option<Json<McpLaunchPayload>>,
) -> Response {
    handle_launch_mcp_profile_inner(&storage, Some(&token), &headers, &query, &profile_id, body).await
}

/// Inicia um perfil no banco local via Bearer token: POST /mcp/profiles/{id}/launch
pub async fn launch_mcp_profile_bearer(
    State(storage): State<Arc<ProfileStorage>>,
    Path(profile_id): Path<String>,
    headers: HeaderMap,
    Query(query): Query<McpQueryParams>,
    body: Option<Json<McpLaunchPayload>>,
) -> Response {
    handle_launch_mcp_profile_inner(&storage, None, &headers, &query, &profile_id, body).await
}

async fn handle_launch_mcp_profile_inner(
    storage: &ProfileStorage,
    path_token: Option<&str>,
    headers: &HeaderMap,
    query: &McpQueryParams,
    profile_id: &str,
    body: Option<Json<McpLaunchPayload>>,
) -> Response {
    if let Err(err) = authenticate_mcp(storage, path_token, headers, query) {
        return err.into_response();
    }

    let payload = body.map(|b| b.0).unwrap_or_default();
    let cdp = payload.cdp.or(query.cdp).unwrap_or(true);
    let initial_url = payload.url.as_deref().or(query.url.as_deref());

    match storage.launch_with_options(profile_id, cdp, initial_url).await {
        Ok((profile, pid, debug_port, ws_endpoint)) => {
            let res = McpLaunchResponse {
                status: "launched".to_string(),
                profile_id: profile.id.clone(),
                name: profile.name.clone(),
                kernel: profile.kernel.clone(),
                pid,
                debug_port,
                ws_endpoint,
                url: initial_url.map(String::from),
                message: format!("Navegador '{}' ({}) iniciado com sucesso no PID {pid}.", profile.name, profile.kernel),
            };
            (StatusCode::OK, Json(json!(res))).into_response()
        }
        Err(err) => McpError::LaunchFailed {
            id: profile_id.to_string(),
            reason: err,
        }.into_response(),
    }
}

/// Finaliza a execução de um perfil: POST /mcp/{token}/profiles/{id}/stop
pub async fn stop_mcp_profile(
    State(storage): State<Arc<ProfileStorage>>,
    Path((token, profile_id)): Path<(String, String)>,
    headers: HeaderMap,
    Query(query): Query<McpQueryParams>,
) -> Response {
    handle_stop_mcp_profile_inner(&storage, Some(&token), &headers, &query, &profile_id)
}

/// Finaliza a execução de um perfil via Bearer: POST /mcp/profiles/{id}/stop
pub async fn stop_mcp_profile_bearer(
    State(storage): State<Arc<ProfileStorage>>,
    Path(profile_id): Path<String>,
    headers: HeaderMap,
    Query(query): Query<McpQueryParams>,
) -> Response {
    handle_stop_mcp_profile_inner(&storage, None, &headers, &query, &profile_id)
}

fn handle_stop_mcp_profile_inner(
    storage: &ProfileStorage,
    path_token: Option<&str>,
    headers: &HeaderMap,
    query: &McpQueryParams,
    profile_id: &str,
) -> Response {
    if let Err(err) = authenticate_mcp(storage, path_token, headers, query) {
        return err.into_response();
    }

    match storage.stop(profile_id) {
        Ok(profile) => {
            let res = McpStopResponse {
                status: "stopped".to_string(),
                profile_id: profile.id.clone(),
                name: profile.name.clone(),
                message: format!("Perfil '{}' finalizado com sucesso.", profile.name),
            };
            (StatusCode::OK, Json(json!(res))).into_response()
        }
        Err(err) => McpError::StopFailed {
            id: profile_id.to_string(),
            reason: err,
        }.into_response(),
    }
}
