use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use std::sync::Arc;

use crate::models::{CreateExtensionCategoryDto, UpdateExtensionCategoryDto};
use crate::service_database::ExtensionCategoryStorage;

pub async fn list_categories(
    State(storage): State<Arc<ExtensionCategoryStorage>>,
) -> impl IntoResponse {
    let list = storage.list();
    Json(list)
}

pub async fn get_category(
    State(storage): State<Arc<ExtensionCategoryStorage>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    match storage.get(&id) {
        Some(item) => Ok(Json(serde_json::to_value(item).unwrap())),
        None => Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": "Categoria não encontrada" })),
        )),
    }
}

pub async fn create_category(
    State(storage): State<Arc<ExtensionCategoryStorage>>,
    Json(payload): Json<CreateExtensionCategoryDto>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    match storage.create(payload) {
        Ok(item) => Ok((StatusCode::CREATED, Json(serde_json::to_value(item).unwrap()))),
        Err(err) => Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": err })),
        )),
    }
}

pub async fn update_category(
    State(storage): State<Arc<ExtensionCategoryStorage>>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateExtensionCategoryDto>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    match storage.update(&id, payload) {
        Ok(item) => Ok(Json(serde_json::to_value(item).unwrap())),
        Err(err) => Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": err })),
        )),
    }
}

pub async fn delete_category(
    State(storage): State<Arc<ExtensionCategoryStorage>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    match storage.delete(&id) {
        Ok(_) => Ok(StatusCode::NO_CONTENT),
        Err(err) => Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": err })),
        )),
    }
}
