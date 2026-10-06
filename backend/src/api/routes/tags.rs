use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use std::sync::Arc;

use crate::models::{BatchDeleteTagsDto, CreateTagDto, UpdateTagDto};
use crate::service_database::TagStorage;

#[derive(Debug, Deserialize)]
pub struct ListTagsQuery {
    pub search: Option<String>,
}

pub async fn list_tags(
    State(storage): State<Arc<TagStorage>>,
    Query(query): Query<ListTagsQuery>,
) -> impl IntoResponse {
    let list = storage.list(query.search.as_deref());
    Json(list)
}

pub async fn get_tag(
    State(storage): State<Arc<TagStorage>>,
    Path(id): Path<i64>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    match storage.get(id) {
        Some(tag) => Ok(Json(serde_json::to_value(tag).unwrap())),
        None => Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": "Etiqueta não encontrada" })),
        )),
    }
}

pub async fn create_tag(
    State(storage): State<Arc<TagStorage>>,
    Json(payload): Json<CreateTagDto>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    match storage.create(payload) {
        Ok(tag) => Ok((StatusCode::CREATED, Json(serde_json::to_value(tag).unwrap()))),
        Err(err) => Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": err })),
        )),
    }
}

pub async fn update_tag(
    State(storage): State<Arc<TagStorage>>,
    Path(id): Path<i64>,
    Json(payload): Json<UpdateTagDto>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    match storage.update(id, payload) {
        Ok(tag) => Ok(Json(serde_json::to_value(tag).unwrap())),
        Err(err) => Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": err })),
        )),
    }
}

pub async fn delete_tag(
    State(storage): State<Arc<TagStorage>>,
    Path(id): Path<i64>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    match storage.delete(id) {
        Ok(true) => Ok(StatusCode::NO_CONTENT),
        Ok(false) => Err((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": "Etiqueta não encontrada" })),
        )),
        Err(err) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": err })),
        )),
    }
}

pub async fn batch_delete_tags(
    State(storage): State<Arc<TagStorage>>,
    Json(payload): Json<BatchDeleteTagsDto>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    match storage.delete_many(&payload.ids) {
        Ok(count) => Ok(Json(serde_json::json!({ "deleted_count": count }))),
        Err(err) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": err })),
        )),
    }
}
