use axum::{http::StatusCode, response::IntoResponse, Json};
use serde::Deserialize;

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct LoginDto {
    pub login: Option<String>,
    pub username: Option<String>,
    pub password: Option<String>,
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct RegisterDto {
    pub username: Option<String>,
    pub email: Option<String>,
    pub password: Option<String>,
}

pub async fn login(Json(payload): Json<LoginDto>) -> Result<impl IntoResponse, (StatusCode, String)> {
    let username = payload.login.or(payload.username).unwrap_or_else(|| "offline_user".to_string());
    Ok(Json(serde_json::json!({
        "token": "local_rust_token_session",
        "user": {
            "id": 1,
            "username": username,
            "email": null,
            "is_offline": true
        }
    })))
}

pub async fn register(Json(payload): Json<RegisterDto>) -> Result<impl IntoResponse, (StatusCode, String)> {
    let username = payload.username.unwrap_or_else(|| "offline_user".to_string());
    Ok((
        StatusCode::CREATED,
        Json(serde_json::json!({
            "token": "local_rust_token_session",
            "user": {
                "id": 1,
                "username": username,
                "email": payload.email,
                "is_offline": true
            }
        })),
    ))
}

pub async fn me() -> impl IntoResponse {
    Json(serde_json::json!({
        "id": 1,
        "username": "offline_user",
        "email": null,
        "is_offline": true
    }))
}
