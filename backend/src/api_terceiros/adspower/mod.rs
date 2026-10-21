pub mod browser;
pub mod envelope;
pub mod group;
pub mod user;

use std::sync::Arc;
use axum::Router;
use crate::storage::ProfileStorage;

/// Monta todas as rotas da AdsPower Local API:
/// - /api/v1/browser/{start, stop, active, cookies}
/// - /api/v1/user/{list, create, update, delete}
/// - /api/v1/group/{list, create}
pub fn adspower_routes(storage: Arc<ProfileStorage>) -> Router {
    Router::new()
        .nest("/api/v1/browser", browser::browser_routes(storage.clone()))
        .nest("/api/v1/user", user::user_routes(storage.clone()))
        .nest("/api/v1/group", group::group_routes(storage))
}
