pub mod auth;
pub mod error;
pub mod protocol;
pub mod public_api;
pub mod types;

pub use auth::*;
pub use error::*;
pub use protocol::*;
pub use public_api::*;
pub use types::*;

use axum::{
    routing::{get, post},
    Router,
};
use std::sync::Arc;
use crate::service_database::ProfileStorage;

/// Constrói o roteador HTTP modular para todos os endpoints MCP e REST sob /mcp
pub fn router(storage: Arc<ProfileStorage>) -> Router {
    Router::new()
        // Gestão & Handshake inicial
        .route("/info", get(public_api::management::get_mcp_info))
        .route("/rotate-token", post(public_api::management::rotate_mcp_token_handler))
        // Protocolo MCP via Bearer token
        .route("/sse", get(protocol::sse::handle_mcp_sse_bearer))
        .route("/messages", post(protocol::jsonrpc::handle_mcp_messages_bearer))
        // APIs REST via Bearer token
        .route("/profiles", get(public_api::profiles::list_mcp_profiles_bearer))
        .route("/profiles/{id}", get(public_api::profiles::get_mcp_profile_bearer))
        .route("/profiles/{id}/launch", post(public_api::profiles::launch_mcp_profile_bearer))
        .route("/profiles/{id}/stop", post(public_api::profiles::stop_mcp_profile_bearer))
        // Protocolo MCP e APIs REST com token no path (/mcp/{token}/...)
        .route("/{token}", post(protocol::jsonrpc::handle_mcp_jsonrpc))
        .route("/{token}/sse", get(protocol::sse::handle_mcp_sse))
        .route("/{token}/messages", post(protocol::jsonrpc::handle_mcp_jsonrpc))
        .route("/{token}/profiles", get(public_api::profiles::list_mcp_profiles))
        .route("/{token}/profiles/{id}", get(public_api::profiles::get_mcp_profile))
        .route("/{token}/profiles/{id}/launch", post(public_api::profiles::launch_mcp_profile))
        .route("/{token}/profiles/{id}/stop", post(public_api::profiles::stop_mcp_profile))
        .with_state(storage)
}
