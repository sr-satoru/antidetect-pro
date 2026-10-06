use crate::server_sync::CloudAuthService;
use axum::{
    extract::{Path, Query, State},
    http::{header, HeaderMap, StatusCode},
    response::{Html, IntoResponse, Json},
};
use serde::Deserialize;
use std::sync::Arc;

#[derive(Debug, Deserialize)]
pub struct CallbackQuery {
    pub code: Option<String>,
    pub state: Option<String>,
    pub error: Option<String>,
}

/// 1. Inicia o fluxo de autorização OAuth2 PKCE
pub async fn start_login(State(auth): State<Arc<CloudAuthService>>) -> impl IntoResponse {
    let (session_id, token, auth_url) = auth.create_auth_session("login").await;
    Json(serde_json::json!({
        "session_id": session_id,
        "token": token,
        "auth_url": auth_url
    }))
}

/// 2. Inicia o fluxo de cadastro OAuth2 PKCE
pub async fn start_register(State(auth): State<Arc<CloudAuthService>>) -> impl IntoResponse {
    let (session_id, token, auth_url) = auth.create_auth_session("register").await;
    Json(serde_json::json!({
        "session_id": session_id,
        "token": token,
        "auth_url": auth_url
    }))
}

/// 3. Receptor Loopback (RFC 8252 / Google Standard)
pub async fn callback(
    State(auth): State<Arc<CloudAuthService>>,
    Query(query): Query<CallbackQuery>,
) -> impl IntoResponse {
    let mut headers = HeaderMap::new();
    headers.insert(header::CONTENT_TYPE, "text/html; charset=utf-8".parse().unwrap());

    if let Some(err) = query.error {
        return (StatusCode::BAD_REQUEST, headers, Html(auth.render_error_html(&err)));
    }

    let code = match query.code {
        Some(c) if !c.is_empty() => c,
        _ => {
            return (
                StatusCode::BAD_REQUEST,
                headers,
                Html(auth.render_error_html("Código de autorização ausente")),
            );
        }
    };

    let oauth_state = match query.state {
        Some(s) if !s.is_empty() => s,
        _ => {
            return (
                StatusCode::BAD_REQUEST,
                headers,
                Html(auth.render_error_html("Parâmetro state ausente")),
            );
        }
    };

    // Idempotência: Se já foi autenticado nesta sessão (ex: duplo redirect do browser)
    if let Some(u) = auth.get_current_user().await {
        return (StatusCode::OK, headers, Html(auth.render_success_html(&u.email)));
    }

    match auth.exchange_code(&code, &oauth_state).await {
        Ok(user) => (StatusCode::OK, headers, Html(auth.render_success_html(&user.email))),
        Err(err) => (StatusCode::BAD_REQUEST, headers, Html(auth.render_error_html(&err))),
    }
}

/// 4. Consulta status de uma sessão ativa pelo App Desktop
pub async fn get_session_status(
    State(auth): State<Arc<CloudAuthService>>,
    Path(session_id): Path<String>,
) -> impl IntoResponse {
    if let Some(u) = auth.get_current_user().await {
        Json(serde_json::json!({
            "status": "authenticated",
            "session_id": session_id,
            "user": u,
            "token": auth.get_current_token().await,
            "refresh_token": auth.get_current_refresh_token().await
        }))
    } else {
        Json(serde_json::json!({
            "status": "pending",
            "session_id": session_id,
            "user": null,
            "token": null,
            "refresh_token": null
        }))
    }
}

/// 5. Retorna dados do usuário atualmente autenticado ou modo offline
pub async fn me(State(auth): State<Arc<CloudAuthService>>) -> impl IntoResponse {
    if let Some(u) = auth.get_current_user().await {
        let token = auth.get_current_token().await;
        let refresh_token = auth.get_current_refresh_token().await;
        Json(serde_json::json!({
            "id": u.id,
            "email": u.email,
            "name": u.name,
            "plan": u.plan,
            "max_profiles": u.max_profiles,
            "profile_count": u.profile_count,
            "is_offline": false,
            "token": token,
            "refresh_token": refresh_token
        }))
    } else {
        Json(serde_json::json!({
            "id": "offline-1",
            "email": null,
            "name": "Usuário Offline",
            "plan": "offline",
            "max_profiles": 9999,
            "profile_count": 0,
            "is_offline": true,
            "token": null
        }))
    }
}

/// 6. Desconecta o usuário atual
pub async fn logout(State(auth): State<Arc<CloudAuthService>>) -> impl IntoResponse {
    auth.logout().await;
    Json(serde_json::json!({ "success": true }))
}
