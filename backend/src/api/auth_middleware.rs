use axum::{
    extract::{Request, State},
    http::{HeaderMap, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use std::sync::Arc;

use crate::core::security::NonceManager;
use crate::storage::service_database::ProfileStorage;

/// Estado compartilhado injetado no middleware de segurança
#[derive(Clone)]
pub struct SecurityState {
    pub nonce_manager: Arc<NonceManager>,
    pub profile_storage: Arc<ProfileStorage>,
}

/// Identificação do tipo de credencial bearer enviada no header Authorization
#[derive(Debug, PartialEq, Eq)]
pub enum BearerKind<'a> {
    McpApiKey(&'a str),     // 🅱 star_sec_xxx  -> MCP API Key
    CloudOAuthJwt(&'a str), // 🅰 eyJxxx        -> Cloud OAuth JWT
    Unknown(&'a str),
}

/// Classifica o bearer token pelo seu prefixo criptográfico
pub fn classify_bearer(token: &str) -> BearerKind<'_> {
    if token.starts_with("star_sec_") {
        BearerKind::McpApiKey(token)
    } else if token.starts_with("eyJ") {
        BearerKind::CloudOAuthJwt(token)
    } else {
        BearerKind::Unknown(token)
    }
}

/// Extrai e classifica o token presente no header Authorization: Bearer <token>
fn extract_bearer_token(headers: &HeaderMap) -> Option<BearerKind<'_>> {
    headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer ").or_else(|| v.strip_prefix("bearer ")))
        .map(|token| classify_bearer(token.trim()))
}

/// Extrai a MCP API Key tanto de Authorization: Bearer quanto de x-mcp-token
fn extract_mcp_api_key(headers: &HeaderMap) -> Option<&str> {
    if let Some(BearerKind::McpApiKey(token)) = extract_bearer_token(headers) {
        return Some(token);
    }
    headers
        .get("x-mcp-token")
        .and_then(|v| v.to_str().ok())
        .filter(|t| t.starts_with("star_sec_"))
}

/// Valida se o request possui uma sessão desktop efêmera válida no header X-Session-Token
fn has_valid_session(headers: &HeaderMap, nm: &NonceManager) -> bool {
    headers
        .get("x-session-token")
        .and_then(|v| v.to_str().ok())
        .map(|token| token.starts_with("ses_") && nm.validate_session(token))
        .unwrap_or(false)
}

/// Valida se o request possui uma MCP API Key válida cadastrada no Star Vault
fn has_valid_mcp_api_key(headers: &HeaderMap, storage: &ProfileStorage) -> bool {
    if let Some(key) = extract_mcp_api_key(headers) {
        storage.verify_mcp_token(key)
    } else {
        false
    }
}

/// Valida se o request possui um Action Ticket de uso único no header X-Action-Ticket
fn has_valid_action_ticket(headers: &HeaderMap, nm: &NonceManager, scope: &str) -> bool {
    headers
        .get("x-action-ticket")
        .and_then(|v| v.to_str().ok())
        .map(|ticket| ticket.starts_with("ticket_") && nm.consume_ticket(ticket, scope))
        .unwrap_or(false)
}

/// Identifica rotas abertas (leitura pública informativa, documentação Swagger, preflight CORS)
fn is_open_endpoint(path: &str, method: &str) -> bool {
    if method == "OPTIONS" {
        return true;
    }

    if path.starts_with("/swagger-ui") || path.starts_with("/api-docs") {
        return true;
    }

    // Handshake inicial
    if method == "POST" && (path == "/api/local-auth/handshake" || path == "/api/local-auth/dev-handshake") {
        return true;
    }

    // Callbacks de autenticação da nuvem (redirecionamento do browser pelo OAuth PKCE)
    if method == "GET" && (path == "/api/cloud-auth/callback" || path == "/api/auth/callback") {
        return true;
    }

    // Fingerprints estáticos e informativos
    if method == "GET" && path.starts_with("/api/fingerprints/") {
        return true;
    }

    // Browser status e manifestos
    if method == "GET" && (path == "/api/browser/status" || path == "/api/browser/manifest") {
        return true;
    }

    if (method == "GET" || method == "POST") && path == "/api/browser/verify" {
        return true;
    }

    // Atualização de app (apenas consultas informativas e cancelamento)
    if method == "GET" && (path == "/api/app/check-update" || path == "/api/app/download-status") {
        return true;
    }

    if method == "POST" && path == "/api/app/cancel-download" {
        return true;
    }

    // MCP status
    if method == "GET" && path == "/api/v1/status" {
        return true;
    }

    // WebSocket em tempo real para o frontend local (status de perfis, sync e downloads)
    if path == "/api/ws" || path.starts_with("/api/ws/") {
        return true;
    }

    // Perfis públicos sanitizados
    if is_public_profile_route(path) {
        return true;
    }

    // AdsPower Local API (protegida exclusivamente por loopback admission e anti-CSRF no módulo api_terceiros)
    if path.starts_with("/api/v1/browser/")
        || path.starts_with("/api/v1/user/")
        || path.starts_with("/api/v1/group/")
    {
        return true;
    }

    false
}

/// Identifica rotas de perfis sanitizados
fn is_public_profile_route(path: &str) -> bool {
    path == "/api/profiles/public"
        || path == "/api/v1/profiles/public"
        || (path.starts_with("/api/profiles/") && path.ends_with("/public"))
        || (path.starts_with("/api/v1/profiles/") && path.ends_with("/public"))
}

/// Identifica endpoints de automação que aceitam tanto Sessão Desktop quanto MCP API Key (star_sec_)
fn is_api_key_endpoint(path: &str, method: &str) -> bool {
    if path.starts_with("/mcp") {
        return true;
    }

    // Operações de automação de perfil
    let subpath = if let Some(rest) = path.strip_prefix("/api/v1/profiles/") {
        rest
    } else if let Some(rest) = path.strip_prefix("/api/profiles/") {
        rest
    } else {
        return false;
    };

    if method == "POST" && (subpath.ends_with("/launch") || subpath.ends_with("/stop")) {
        return true;
    }

    if method == "GET" && subpath.ends_with("/playwright") {
        return true;
    }

    false
}

/// Identifica endpoints de alto impacto que exigem Action Ticket de uso único
fn is_action_ticket_endpoint(path: &str, method: &str) -> Option<&'static str> {
    if method == "POST" && path == "/api/app/apply-update" {
        Some("action_apply_update")
    } else if method == "POST" && path == "/api/app/download" {
        Some("action_download")
    } else if method == "POST" && path == "/api/browser/download" {
        Some("action_browser_download")
    } else {
        None
    }
}

/// Resposta de erro padronizada em JSON com código HTTP apropriado
fn make_error_response(status: StatusCode, message: &str, code: &str) -> Response {
    (
        status,
        Json(json!({
            "error": message,
            "code": code,
            "status": status.as_u16(),
        })),
    )
        .into_response()
}

/// Middleware principal de segurança em camadas com taxonomia e desambiguação de tokens
pub async fn security_layer(
    State(state): State<SecurityState>,
    request: Request,
    next: Next,
) -> Response {
    let path = request.uri().path().to_string();
    let method = request.method().as_str().to_string();
    let headers = request.headers().clone();

    // ═══ CAMADA 3: Aberto (Informativo, Swagger, CORS preflight) ═══
    if is_open_endpoint(&path, &method) {
        return next.run(request).await;
    }

    // ═══ CAMADA 2: API Key ou Sessão Desktop (Automação MCP e rotas externas) ═══
    if is_api_key_endpoint(&path, &method) {
        if has_valid_session(&headers, &state.nonce_manager) {
            return next.run(request).await;
        }

        if has_valid_mcp_api_key(&headers, &state.profile_storage) {
            return next.run(request).await;
        }

        // Diagnóstico preciso em caso de erro
        if let Some(BearerKind::CloudOAuthJwt(_)) = extract_bearer_token(&headers) {
            return make_error_response(
                StatusCode::UNAUTHORIZED,
                "Cloud OAuth JWT não possui permissão para automação local. Utilize uma MCP API Key (star_sec_...) ou X-Session-Token.",
                "TOKEN_DISALLOWED_CLOUD_JWT",
            );
        }

        return make_error_response(
            StatusCode::UNAUTHORIZED,
            "Acesso não autorizado. Forneça uma MCP API Key válida (Authorization: Bearer star_sec_...) ou X-Session-Token.",
            "AUTH_REQUIRED_MCP_OR_SESSION",
        );
    }

    // ═══ ALTO RISCO: Action Ticket Obrigatório (apply-update, download) ═══
    if let Some(scope) = is_action_ticket_endpoint(&path, &method) {
        if !has_valid_session(&headers, &state.nonce_manager) {
            return make_error_response(
                StatusCode::UNAUTHORIZED,
                "Operação de alto privilégio exige sessão desktop ativa (X-Session-Token).",
                "AUTH_REQUIRED_SESSION",
            );
        }

        if !has_valid_action_ticket(&headers, &state.nonce_manager, scope) {
            tracing::warn!("⛔ Tentativa de executar operação perigosa '{}' sem action ticket válido.", path);
            return make_error_response(
                StatusCode::FORBIDDEN,
                "Action Ticket de uso único ausente, expirado ou inválido para esta operação (X-Action-Ticket).",
                "ACTION_TICKET_REQUIRED",
            );
        }

        return next.run(request).await;
    }

    // ═══ CAMADA 1: Sessão Desktop Exclusiva (CRUD de perfis, proxies, cookies, storage, etc.) ═══
    if has_valid_session(&headers, &state.nonce_manager) {
        return next.run(request).await;
    }

    // Verificação de erros comuns para facilitar depuração
    if let Some(BearerKind::CloudOAuthJwt(_)) = extract_bearer_token(&headers) {
        return make_error_response(
            StatusCode::UNAUTHORIZED,
            "Cloud OAuth JWT não tem permissão para acesso a dados locais. Utilize o header X-Session-Token emitido pelo handshake desktop.",
            "TOKEN_DISALLOWED_CLOUD_JWT",
        );
    }

    if let Some(BearerKind::McpApiKey(_)) = extract_bearer_token(&headers) {
        return make_error_response(
            StatusCode::FORBIDDEN,
            "MCP API Key não possui acesso a endpoints sensíveis de desktop (cookies, storage, proxies). Utilize as rotas /mcp/* ou X-Session-Token.",
            "FORBIDDEN_MCP_KEY_ON_DESKTOP_ROUTE",
        );
    }

    if headers.contains_key("x-session-token") {
        return make_error_response(
            StatusCode::UNAUTHORIZED,
            "Sessão desktop inválida ou expirada. Refaça o handshake com o aplicativo nativo.",
            "SESSION_EXPIRED",
        );
    }

    make_error_response(
        StatusCode::UNAUTHORIZED,
        "Acesso não autorizado. Este endpoint requer sessão desktop ativa no header X-Session-Token.",
        "UNAUTHORIZED",
    )
}
