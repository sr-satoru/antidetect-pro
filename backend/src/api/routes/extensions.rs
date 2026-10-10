use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use std::sync::Arc;

use crate::models::{CreateExtensionDto, UpdateExtensionDto};
use crate::extensions::ExtensionStorage;

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
    match storage.create(payload).await {
        Ok(item) => Ok((StatusCode::CREATED, Json(item))),
        Err(err) => Err((StatusCode::BAD_REQUEST, err)),
    }
}

pub async fn upload_extension(
    State(storage): State<Arc<ExtensionStorage>>,
    mut multipart: axum::extract::Multipart,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let mut file_bytes: Option<Vec<u8>> = None;
    let mut file_name = "extensao.zip".to_string();
    let mut name_override: Option<String> = None;
    let mut desc_override: Option<String> = None;

    while let Ok(Some(field)) = multipart.next_field().await {
        let field_name = field.name().unwrap_or("").to_string();
        if field_name == "file" {
            if let Some(filename) = field.file_name() {
                file_name = filename.to_string();
            }
            match field.bytes().await {
                Ok(bytes) => file_bytes = Some(bytes.to_vec()),
                Err(e) => return Err((StatusCode::BAD_REQUEST, format!("Erro ao ler bytes do arquivo: {e}"))),
            }
        } else if field_name == "name" {
            if let Ok(text) = field.text().await {
                if !text.trim().is_empty() {
                    name_override = Some(text.trim().to_string());
                }
            }
        } else if field_name == "description" {
            if let Ok(text) = field.text().await {
                if !text.trim().is_empty() {
                    desc_override = Some(text.trim().to_string());
                }
            }
        }
    }

    let Some(bytes) = file_bytes else {
        return Err((StatusCode::BAD_REQUEST, "Nenhum arquivo enviado no campo 'file'".to_string()));
    };

    match storage.save_uploaded_extension(&file_name, &bytes, name_override, desc_override) {
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
