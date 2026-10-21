pub mod adspower;

use std::sync::Arc;
use axum::{
    body::Body,
    extract::ConnectInfo,
    http::{Request, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    Router,
};
use std::net::SocketAddr;
use crate::storage::ProfileStorage;

/// Middleware de segurança dedicado e desacoplado para APIs de terceiros.
/// 1. Admissão Estrita de Loopback: rejeita conexões de fora de 127.0.0.1 ou ::1.
/// 2. Gating Anti-CSRF em cabeçalhos Origin e Referer: bloqueia drive-by CSRF vindo de abas de sites públicos.
pub async fn api_terceiros_security_guard(
    request: Request<Body>,
    next: Next,
) -> Response {
    // 1. Verificação de Loopback por ConnectInfo se disponível
    if let Some(ConnectInfo(addr)) = request.extensions().get::<ConnectInfo<SocketAddr>>() {
        let ip = addr.ip();
        if !ip.is_loopback() {
            tracing::warn!(
                "⛔ [API Terceiros] Acesso bloqueado: requisição de IP externo não autorizado: {}",
                ip
            );
            return (
                StatusCode::FORBIDDEN,
                "Acesso proibido: esta API só aceita conexões locais (loopback)",
            )
                .into_response();
        }
    }

    // 2. Proteção Anti-CSRF contra ataques drive-by originados de abas de navegador
    if let Some(origin_header) = request.headers().get("origin").and_then(|v| v.to_str().ok()) {
        let clean_origin = origin_header.trim().to_lowercase();
        let is_allowed = clean_origin.starts_with("http://127.0.0.1")
            || clean_origin.starts_with("http://localhost")
            || clean_origin.starts_with("https://127.0.0.1")
            || clean_origin.starts_with("https://localhost")
            || clean_origin.starts_with("chrome-extension://")
            || clean_origin.starts_with("moz-extension://");

        if !is_allowed {
            tracing::warn!(
                "⛔ [API Terceiros] Tentativa de CSRF bloqueada! Origin não autorizada: {}",
                clean_origin
            );
            return (
                StatusCode::FORBIDDEN,
                "Acesso proibido: requisições de origens web públicas são bloqueadas para proteção contra CSRF",
            )
                .into_response();
        }
    }

    next.run(request).await
}

/// Constrói o roteador de compatibilidade de APIs de terceiros.
pub fn api_terceiros_routes(storage: Arc<ProfileStorage>) -> Router {
    Router::new()
        .merge(adspower::adspower_routes(storage))
        .layer(axum::middleware::from_fn(api_terceiros_security_guard))
}
