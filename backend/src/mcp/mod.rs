pub mod audit;
pub mod dto;
pub mod handlers;
pub mod security;
pub mod sse;

use axum::{
    middleware,
    routing::{delete, get, post},
    Router,
};
use std::path::PathBuf;
use std::sync::Arc;

use crate::service_database::ProfileStorage;
pub use dto::*;
pub use handlers::McpState;
pub use security::TokenState;
pub use sse::{McpSseState, SessionManager};

/// Cria o Router de Automação REST protegido pelas 5 camadas invariantes de blindagem
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

/// Cria o Router nativo do protocolo MCP sobre SSE e HTTP para IDEs e Agentes de IA
pub fn create_native_mcp_router(
    profile_storage: Arc<ProfileStorage>,
    token_state: TokenState,
) -> Router {
    let mcp_state = McpState {
        profile_storage,
        token_state,
    };
    let sse_state = McpSseState {
        mcp_state,
        session_manager: SessionManager::new(),
    };

    Router::new()
        // Rotas canônicas: /mcp/{token}/sse e /mcp/{token}/messages
        .route("/mcp/{token}/sse", get(sse::mcp_sse_handler))
        .route("/mcp/{token}/messages", post(sse::mcp_messages_handler))
        .route("/mcp/{token}", post(sse::mcp_direct_handler))
        // Aliases de conveniência: /{token}/mcp/sse e /{token}/mcp/messages
        .route("/{token}/mcp/sse", get(sse::mcp_sse_handler))
        .route("/{token}/mcp/messages", post(sse::mcp_messages_handler))
        .route("/{token}/mcp", post(sse::mcp_direct_handler))
        // Metadados para a interface desktop local
        .route("/mcp/info", get(sse::mcp_info_handler))
        .route("/api/mcp/info", get(sse::mcp_info_handler))
        .with_state(sse_state)
        // Proteção Anti-DNS Rebinding
        .layer(middleware::from_fn(security::host_validation_middleware))
        // Proteção Anti-Origin de navegadores
        .layer(middleware::from_fn(security::anti_origin_middleware))
}
