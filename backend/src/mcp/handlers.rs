use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde_json::json;
use std::sync::Arc;

use super::audit::log_event;
use super::dto::{
    LaunchProfileRequest, LaunchProfileResponse, MinimalProfileSummary, OpenTabRequest,
    StatusResponse, StopProfileRequest, StopProfileResponse, TabInfo, TabListResponse,
    TokenRefreshResponse,
};
use super::security::TokenState;
use crate::storage::ProfileStorage;
use crate::tab_manager::TabManager;

/// Estado compartilhado para os handlers do módulo MCP
#[derive(Clone)]
pub struct McpState {
    pub profile_storage: Arc<ProfileStorage>,
    pub token_state: TokenState,
}

/// GET /api/v1/status (e GET /v1/status)
/// Retorna a integridade do motor Camoufox e o número de perfis em execução
pub async fn get_status(State(state): State<McpState>) -> impl IntoResponse {
    let pm = state.profile_storage.get_process_manager();
    let running_count = pm.get_running_count();

    Json(StatusResponse {
        ok: true,
        engine: "camoufox".to_string(),
        version: "2.1.0".to_string(),
        running_count,
        loopback_only: true,
    })
}

/// GET /api/v1/profiles (e GET /v1/profiles)
/// Retorna a lista estrita de menor privilégio (Zero-Leakage):
/// EXCLUSIVAMENTE { id, name, group, tags, status }. Nenhum dado de proxy ou hardware.
pub async fn list_profiles(State(state): State<McpState>) -> impl IntoResponse {
    let profiles = state.profile_storage.list(None, None);

    let summaries: Vec<MinimalProfileSummary> = profiles
        .into_iter()
        .map(|p| MinimalProfileSummary {
            id: p.id,
            name: p.name,
            group: p.group,
            tags: p.tags,
            status: p.status,
        })
        .collect();

    log_event(
        &state.token_state.data_dir,
        "automation.list_profiles",
        None,
        "success",
        Some(&format!("count: {}", summaries.len())),
    );

    Json(summaries)
}

/// POST /api/v1/profiles/start (e POST /v1/profiles/start)
/// Inicia o Camoufox pelo ID através da Camada 2 (onde proxy e fingerprint são resolvidos internamente)
pub async fn start_profile(
    State(state): State<McpState>,
    Json(req): Json<LaunchProfileRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    match state.profile_storage.launch_with_cdp(&req.id, req.cdp).await {
        Ok((profile, pid, debug_port, ws_endpoint)) => {
            log_event(
                &state.token_state.data_dir,
                "automation.profile_launched",
                Some(&profile.id),
                "success",
                Some(&format!("pid: {pid}, cdp: {:?}", debug_port)),
            );

            Ok(Json(LaunchProfileResponse {
                status: "launched".to_string(),
                profile_id: profile.id,
                pid,
                debug_port,
                ws_endpoint,
            }))
        }
        Err(err) => {
            log_event(
                &state.token_state.data_dir,
                "automation.profile_launch_failed",
                Some(&req.id),
                "error",
                Some(&err),
            );

            Err((
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "error": err,
                    "code": "LAUNCH_FAILED"
                })),
            ))
        }
    }
}

/// POST /api/v1/profiles/stop (e POST /v1/profiles/stop)
/// Encerra graciosamente o perfil para garantir o flush de cookies e sincronização de sessão
pub async fn stop_profile(
    State(state): State<McpState>,
    Json(req): Json<StopProfileRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    match state.profile_storage.stop(&req.id) {
        Ok(profile) => {
            log_event(
                &state.token_state.data_dir,
                "automation.profile_stopped",
                Some(&profile.id),
                "success",
                None,
            );

            Ok(Json(StopProfileResponse {
                status: "stopped".to_string(),
                profile_id: profile.id,
                cookies_saved: 0,
                message: "Perfil finalizado e sessão sincronizada com sucesso.".to_string(),
            }))
        }
        Err(err) => Err((
            StatusCode::NOT_FOUND,
            Json(json!({
                "error": err,
                "code": "PROFILE_NOT_FOUND"
            })),
        )),
    }
}

/// GET /api/v1/profiles/:id/tabs (e GET /v1/profiles/:id/tabs)
/// Inspeciona as abas e URLs abertas em tempo real no perfil através da porta de depuração
pub async fn get_tabs(
    State(state): State<McpState>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let debug_port = state
        .profile_storage
        .get_process_manager()
        .get_debug_port(&id)
        .ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "error": "Perfil não está em execução ou não possui porta CDP ativa",
                    "code": "NOT_RUNNING"
                })),
            )
        })?;

    match TabManager::get_open_tabs(debug_port).await {
        Ok(tabs) => {
            let list = tabs
                .into_iter()
                .map(|t| TabInfo {
                    id: t.id,
                    title: t.title,
                    url: t.url,
                })
                .collect();

            Ok(Json(TabListResponse { tabs: list }))
        }
        Err(err) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "error": err,
                "code": "TAB_QUERY_FAILED"
            })),
        )),
    }
}

/// POST /api/v1/profiles/:id/tabs (e POST /v1/profiles/:id/tabs)
/// Abre uma nova aba navegando para a URL indicada
pub async fn open_tab(
    State(state): State<McpState>,
    Path(id): Path<String>,
    Json(req): Json<OpenTabRequest>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let debug_port = state
        .profile_storage
        .get_process_manager()
        .get_debug_port(&id)
        .ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "error": "Perfil não está em execução",
                    "code": "NOT_RUNNING"
                })),
            )
        })?;

    match TabManager::open_new_tab(debug_port, &req.url).await {
        Ok(context_id) => {
            log_event(
                &state.token_state.data_dir,
                "automation.tab_opened",
                Some(&id),
                "success",
                Some(&req.url),
            );

            Ok(Json(json!({
                "ok": true,
                "context_id": context_id,
                "url": req.url
            })))
        }
        Err(err) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "error": err,
                "code": "TAB_OPEN_FAILED"
            })),
        )),
    }
}

/// DELETE /api/v1/profiles/:id/tabs/:tab_id
/// Fecha a aba especificada
pub async fn close_tab(
    State(state): State<McpState>,
    Path((id, tab_id)): Path<(String, String)>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let debug_port = state
        .profile_storage
        .get_process_manager()
        .get_debug_port(&id)
        .ok_or_else(|| {
            (
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "error": "Perfil não está em execução",
                    "code": "NOT_RUNNING"
                })),
            )
        })?;

    match TabManager::close_tab(debug_port, &tab_id).await {
        Ok(_) => Ok(Json(json!({
            "ok": true,
            "closed_tab": tab_id
        }))),
        Err(err) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "error": err,
                "code": "TAB_CLOSE_FAILED"
            })),
        )),
    }
}

/// POST /api/v1/auth/token/refresh
/// Gera um novo token aleatório de 256 bits, sobrescreve o arquivo com 0600 e invalida o anterior
pub async fn refresh_token(
    State(state): State<McpState>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    match state.token_state.refresh_token().await {
        Ok(new_token) => {
            log_event(
                &state.token_state.data_dir,
                "automation.token_refreshed",
                None,
                "success",
                None,
            );

            Ok(Json(TokenRefreshResponse {
                ok: true,
                new_token,
                message: "Token de automação regenerado com sucesso. O anterior foi revogado.".to_string(),
            }))
        }
        Err(err) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "error": format!("Falha ao renovar token: {err}"),
                "code": "TOKEN_REFRESH_FAILED"
            })),
        )),
    }
}

/// POST /api/v1/emergency/lock
/// Killswitch de pânico Blue Team: Encerra todos os navegadores abertos e rotaciona o token imediatamente
pub async fn emergency_lock(State(state): State<McpState>) -> impl IntoResponse {
    let pm = state.profile_storage.get_process_manager();
    
    // 1. Encerra todos os perfis ativos
    let profiles = state.profile_storage.list(None, None);
    for p in profiles {
        if p.status == "running" {
            let _ = pm.stop(&p.id);
        }
    }

    // 2. Rotaciona o token para revogação imediata de credenciais
    let _ = state.token_state.refresh_token().await;

    log_event(
        &state.token_state.data_dir,
        "automation.emergency_lock",
        None,
        "triggered",
        Some("All running browsers killed and token revoked"),
    );

    Json(json!({
        "ok": true,
        "message": "Trava de emergência acionada. Todos os processos foram encerrados e o token foi rotacionado."
    }))
}
