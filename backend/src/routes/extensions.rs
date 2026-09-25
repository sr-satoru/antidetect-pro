use axum::{
    extract::Path,
    http::StatusCode,
    response::IntoResponse,
    Json,
};

pub async fn list_extensions() -> impl IntoResponse {
    Json(serde_json::json!([]))
}

pub async fn create_extension(Json(payload): Json<serde_json::Value>) -> impl IntoResponse {
    (StatusCode::CREATED, Json(payload))
}

pub async fn update_extension(
    Path(_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    Json(payload)
}

pub async fn delete_extension(Path(_id): Path<String>) -> impl IntoResponse {
    StatusCode::NO_CONTENT
}

pub async fn get_catalog() -> impl IntoResponse {
    Json(serde_json::json!([
        {
            "id": "ublock-origin",
            "name": "uBlock Origin",
            "version": "1.58.0",
            "description": "Bloqueador de anúncios eficiente e rápido.",
            "category": "Segurança"
        },
        {
            "id": "cookie-editor",
            "name": "Cookie-Editor",
            "version": "1.12.2",
            "description": "Gerenciador simples e avançado de cookies para navegação.",
            "category": "Produtividade"
        }
    ]))
}
