pub mod audit;
pub mod dto;
pub mod handlers;
pub mod security;

use axum::{
    middleware,
    routing::{delete, get, post},
    Router,
};
use std::path::PathBuf;
use std::sync::Arc;

use crate::storage::ProfileStorage;
pub use dto::*;
pub use handlers::McpState;
pub use security::TokenState;

/// Cria o Router de Automação e MCP protegido pelas 5 camadas invariantes de blindagem
pub fn create_mcp_router(
    profile_storage: Arc<ProfileStorage>,
    _data_dir: PathBuf,
    token_state: TokenState,
) -> Router {
    let state = McpState {
        profile_storage,
        token_state: token_state.clone(),
    };

    Router::new()
        .route("/status", get(handlers::get_status))
        .route("/profiles", get(handlers::list_profiles))
        .route("/profiles/start", post(handlers::start_profile))
        .route("/profiles/stop", post(handlers::stop_profile))
        .route("/profiles/{id}/tabs", get(handlers::get_tabs).post(handlers::open_tab))
        .route("/profiles/{id}/tabs/{tab_id}", delete(handlers::close_tab))
        .route("/auth/token/refresh", post(handlers::refresh_token))
        .route("/emergency/lock", post(handlers::emergency_lock))
        .with_state(state)
        // 3. Validação do Token Bearer em tempo constante
        .layer(middleware::from_fn_with_state(
            token_state,
            security::bearer_auth_middleware,
        ))
        // 2. Bloqueio de DNS Rebinding
        .layer(middleware::from_fn(security::host_validation_middleware))
        // 1. Filtro Anti-Origin de navegadores
        .layer(middleware::from_fn(security::anti_origin_middleware))
}
