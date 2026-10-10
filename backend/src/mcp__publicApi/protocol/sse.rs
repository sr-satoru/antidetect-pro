use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    response::{sse::Event, IntoResponse, Response, Sse},
};
use futures_util::stream;
use std::{convert::Infallible, sync::Arc, time::Duration};

use crate::service_database::ProfileStorage;
use crate::mcp_public_api::auth::authenticate_mcp;
use crate::mcp_public_api::types::McpQueryParams;

/// Endpoint SSE com token no path: GET /mcp/{token}/sse
pub async fn handle_mcp_sse(
    State(storage): State<Arc<ProfileStorage>>,
    Path(token): Path<String>,
    headers: HeaderMap,
    Query(query): Query<McpQueryParams>,
) -> Response {
    handle_mcp_sse_inner(&storage, Some(&token), &headers, &query)
}

/// Endpoint SSE com Bearer token ou query: GET /mcp/sse
pub async fn handle_mcp_sse_bearer(
    State(storage): State<Arc<ProfileStorage>>,
    headers: HeaderMap,
    Query(query): Query<McpQueryParams>,
) -> Response {
    handle_mcp_sse_inner(&storage, None, &headers, &query)
}

fn handle_mcp_sse_inner(
    storage: &ProfileStorage,
    path_token: Option<&str>,
    headers: &HeaderMap,
    query: &McpQueryParams,
) -> Response {
    let valid_token = match authenticate_mcp(storage, path_token, headers, query) {
        Ok(tok) => tok,
        Err(err) => return err.into_response(),
    };

    // Devolve o endpoint relativo para onde o cliente MCP deve postar as mensagens JSON-RPC
    let endpoint_url = format!("/mcp/{}/messages", valid_token.as_str());
    let stream = stream::once(async move {
        Ok::<Event, Infallible>(Event::default().event("endpoint").data(endpoint_url))
    });

    Sse::new(stream)
        .keep_alive(axum::response::sse::KeepAlive::new().interval(Duration::from_secs(15)))
        .into_response()
}
