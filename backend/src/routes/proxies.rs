use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use std::sync::Arc;

use crate::models::{CreateProxyDto, TestProxyDto};
use crate::storage::ProxyStorage;

pub async fn list_proxies(State(storage): State<Arc<ProxyStorage>>) -> impl IntoResponse {
    let list = storage.list();
    Json(list)
}

pub async fn create_proxy(
    State(storage): State<Arc<ProxyStorage>>,
    Json(payload): Json<CreateProxyDto>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    match storage.create(payload) {
        Ok(proxy) => Ok((StatusCode::CREATED, Json(proxy))),
        Err(err) => Err((StatusCode::BAD_REQUEST, err)),
    }
}



pub async fn delete_proxy(
    State(storage): State<Arc<ProxyStorage>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    match storage.delete(&id) {
        Ok(_) => Ok(StatusCode::NO_CONTENT),
        Err(err) => Err((StatusCode::INTERNAL_SERVER_ERROR, err)),
    }
}

pub async fn test_proxy(Json(payload): Json<TestProxyDto>) -> impl IntoResponse {
    let proxy_type = payload.proxy_type.as_deref().unwrap_or("socks5");
    let username = payload.get_username();
    let password = payload.get_password();
    let port = payload.get_port();

    let result = crate::proxy_validator::ProxyValidator::validate(
        proxy_type,
        &payload.host,
        port,
        username,
        password,
    )
    .await;

    Json(result)
}
