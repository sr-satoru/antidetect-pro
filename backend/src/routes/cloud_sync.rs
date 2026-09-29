use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use std::sync::Arc;

use crate::server_sync::CloudSyncService;

#[derive(Debug, Deserialize)]
pub struct PullQuery {
    pub force: Option<bool>,
}

fn extract_bearer_token(headers: &HeaderMap) -> Option<&str> {
    headers
        .get("authorization")
        .and_then(|h| h.to_str().ok())
        .and_then(|auth| {
            if auth.starts_with("Bearer ") {
                Some(&auth[7..])
            } else {
                Some(auth)
            }
        })
}

pub async fn pull_all_cloud_profiles(
    State(sync_service): State<Arc<CloudSyncService>>,
    headers: HeaderMap,
    Query(query): Query<PullQuery>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let header_token = extract_bearer_token(&headers);
    let force = query.force.unwrap_or(false);

    match sync_service.pull_all_profiles_with_fallback(header_token, force).await {
        Ok(result) => Ok(Json(serde_json::to_value(result).unwrap_or_default())),
        Err(err) => {
            tracing::error!("❌ Erro ao baixar perfis da nuvem: {}", err);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "detail": err,
                    "error": err
                })),
            ))
        }
    }
}

pub async fn sync_to_cloud(
    State(sync_service): State<Arc<CloudSyncService>>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let header_token = extract_bearer_token(&headers);

    match sync_service.upload_profile_with_fallback(&id, header_token).await {
        Ok(result) => Ok(Json(result)),
        Err(err) => {
            tracing::error!("❌ Erro ao sincronizar perfil {}: {}", id, err);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "detail": err,
                    "error": err
                })),
            ))
        }
    }
}

pub async fn restore_from_cloud(
    State(sync_service): State<Arc<CloudSyncService>>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let header_token = extract_bearer_token(&headers);

    match sync_service.download_profile_with_fallback(&id, header_token).await {
        Ok(_) => Ok(Json(serde_json::json!({
            "status": "success",
            "message": format!("Perfil {} restaurado com sucesso da nuvem.", id)
        }))),
        Err(err) => {
            tracing::error!("❌ Erro ao restaurar perfil {}: {}", id, err);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "detail": err,
                    "error": err
                })),
            ))
        }
    }
}

pub async fn get_cloud_stat(
    State(sync_service): State<Arc<CloudSyncService>>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let header_token = extract_bearer_token(&headers);

    match sync_service.stat_profile_with_fallback(&id, header_token).await {
        Ok(stat) => Ok(Json(stat)),
        Err(err) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({
                "detail": err,
                "error": err
            })),
        )),
    }
}

#[derive(Debug, Deserialize)]
pub struct TwoWayQuery {
    pub force: Option<bool>,
}

pub async fn two_way_sync(
    State(sync_service): State<Arc<CloudSyncService>>,
    headers: HeaderMap,
    Query(query): Query<TwoWayQuery>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let header_token = extract_bearer_token(&headers);
    let force = query.force.unwrap_or(false);

    match sync_service.two_way_sync(header_token, force).await {
        Ok(summary) => Ok(Json(serde_json::to_value(summary).unwrap_or_default())),
        Err(err) => {
            tracing::error!("❌ Erro na dupla troca de perfis: {}", err);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "detail": err,
                    "error": err
                })),
            ))
        }
    }
}

/// Consulta rápida da conectividade com o servidor em nuvem e dados de sessão
pub async fn check_cloud_health(
    State(sync_service): State<Arc<CloudSyncService>>,
) -> impl IntoResponse {
    let cloud_url = sync_service.get_cloud_api_url().to_string();
    let auth = sync_service.get_auth_service();
    let user = auth.get_current_user().await;

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_millis(1200))
        .build()
        .unwrap_or_default();

    let is_online = match client.get(format!("{}/health", cloud_url)).send().await {
        Ok(resp) => resp.status().is_success() || resp.status().as_u16() < 500,
        Err(_) => false,
    };

    Json(serde_json::json!({
        "cloud_online": is_online,
        "cloud_url": cloud_url,
        "authenticated": user.is_some(),
        "user": user.map(|u| serde_json::json!({
            "id": u.id,
            "email": u.email,
            "name": u.name,
            "plan": u.plan,
            "is_offline": false
        }))
    }))
}


