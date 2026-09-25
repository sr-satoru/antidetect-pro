use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use std::sync::Arc;

use crate::models::{CreateExtensionDto, UpdateExtensionDto};
use crate::storage::ExtensionStorage;

#[derive(Debug, Deserialize)]
pub struct CatalogParams {
    pub q: Option<String>,
    pub category: Option<String>,
    pub store: Option<String>,
}

pub async fn list_extensions(
    State(storage): State<Arc<ExtensionStorage>>,
) -> impl IntoResponse {
    let list = storage.list();
    Json(list)
}

pub async fn create_extension(
    State(storage): State<Arc<ExtensionStorage>>,
    Json(payload): Json<CreateExtensionDto>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    match storage.create(payload) {
        Ok(item) => Ok((StatusCode::CREATED, Json(item))),
        Err(err) => Err((StatusCode::BAD_REQUEST, err)),
    }
}

pub async fn update_extension(
    State(storage): State<Arc<ExtensionStorage>>,
    Path(id): Path<u64>,
    Json(payload): Json<UpdateExtensionDto>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    match storage.update(id, payload) {
        Ok(item) => Ok(Json(item)),
        Err(err) => Err((StatusCode::NOT_FOUND, err)),
    }
}

pub async fn delete_extension(
    State(storage): State<Arc<ExtensionStorage>>,
    Path(id): Path<u64>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    match storage.delete(id) {
        Ok(_) => Ok(StatusCode::NO_CONTENT),
        Err(err) => Err((StatusCode::INTERNAL_SERVER_ERROR, err)),
    }
}

pub async fn get_catalog(
    State(storage): State<Arc<ExtensionStorage>>,
    Query(params): Query<CatalogParams>,
) -> impl IntoResponse {
    let list = storage
        .search_catalog(
            params.q.as_deref(),
            params.category.as_deref(),
            params.store.as_deref(),
        )
        .await;
    Json(list)
}
