use std::sync::Arc;
use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::post,
    Router,
};

use crate::service_database::ProfileStorage;
use super::models::ImportBatchDto;
use super::service::ImportExportService;

/// Handler para importação em lote de perfis (JSON estruturado ou texto do AdsPower)
pub async fn import_profiles_handler(
    State(storage): State<Arc<ProfileStorage>>,
    Json(payload): Json<ImportBatchDto>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    match ImportExportService::import_profiles(storage, payload).await {
        Ok(result) => Ok((StatusCode::OK, Json(result))),
        Err(err) => Err((StatusCode::BAD_REQUEST, err)),
    }
}

pub fn import_export_routes(storage: Arc<ProfileStorage>) -> Router {
    Router::new()
        .route("/import", post(import_profiles_handler))
        .with_state(storage)
}
