use axum::{
    extract::{Path, Query, State},
    http::{header, HeaderMap, StatusCode},
    response::{Html, IntoResponse, Json},
};
use base64::Engine;
use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;

type HmacSha256 = Hmac<Sha256>;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CloudUser {
    pub id: String,
    pub email: String,
    pub name: Option<String>,
    pub plan: String,
    pub max_profiles: i64,
    pub profile_count: i64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SessionRecord {
    pub session_id: String,
    pub action: String, // "login" | "register"
    pub state: String,
    pub status: String, // "pending" | "authenticated" | "failed"
    pub created_at: i64,
    pub user: Option<CloudUser>,
    pub token: Option<String>,
}

#[derive(Clone)]
pub struct AuthState {
    pub sessions: Arc<RwLock<HashMap<String, SessionRecord>>>,
    pub current_user: Arc<RwLock<Option<CloudUser>>>,
    pub current_token: Arc<RwLock<Option<String>>>,
    pub cloud_api_url: String,
    pub web_site_url: String,
    pub oauth_secret: String,
    pub http_client: reqwest::Client,
}

impl AuthState {
    pub fn new() -> Self {
        let cloud_api_url = std::env::var("FURY_CLOUD_API_URL")
            .unwrap_or_else(|_| "http://localhost:12342".to_string());
        let web_site_url = std::env::var("FURY_WEB_SITE_URL")
            .unwrap_or_else(|_| "http://localhost:3001".to_string());
        let oauth_secret = std::env::var("OAUTH_SECRET")
            .unwrap_or_else(|_| "fury_oauth_secret_shared_with_rust_daemon".to_string());

        Self {
            sessions: Arc::new(RwLock::new(HashMap::new())),
            current_user: Arc::new(RwLock::new(None)),
            current_token: Arc::new(RwLock::new(None)),
            cloud_api_url,
            web_site_url,
            oauth_secret,
            http_client: reqwest::Client::new(),
        }
    }
}

pub fn generate_challenge_token(action: &str, state: &str, secret: &str) -> String {
    let exp = chrono::Utc::now().timestamp() + 600; // 10 minutos de validade
    let payload = serde_json::json!({
        "action": action,
        "state": state,
        "exp": exp
    });

    let payload_str = payload.to_string();
    let payload_b64 = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(payload_str.as_bytes());

    let mut mac = HmacSha256::new_from_slice(secret.as_bytes()).expect("Chave HMAC válida");
    mac.update(payload_b64.as_bytes());
    let signature = mac.finalize().into_bytes();
    let sig_hex: String = signature.iter().map(|b| format!("{:02x}", b)).collect();

    format!("{}.{}", payload_b64, sig_hex)
}

/// 1. Gerador de Token para ENTRAR NA CONTA (Login)
pub async fn start_login(State(state): State<Arc<AuthState>>) -> impl IntoResponse {
    let session_id = Uuid::new_v4().to_string();
    let auth_state = Uuid::new_v4().to_string();
    let token = generate_challenge_token("login", &auth_state, &state.oauth_secret);
    let redirect_uri = "http://127.0.0.1:8000/api/auth/callback";

    let auth_url = format!(
        "{}/auth?action=login&token={}&state={}&redirect_uri={}",
        state.web_site_url, token, auth_state, redirect_uri
    );

    let record = SessionRecord {
        session_id: session_id.clone(),
        action: "login".to_string(),
        state: auth_state,
        status: "pending".to_string(),
        created_at: chrono::Utc::now().timestamp(),
        user: None,
        token: None,
    };

    state.sessions.write().await.insert(session_id.clone(), record);

    Json(serde_json::json!({
        "session_id": session_id,
        "token": token,
        "auth_url": auth_url
    }))
}

/// 2. Gerador de Token para CRIAR CONTA (Register)
pub async fn start_register(State(state): State<Arc<AuthState>>) -> impl IntoResponse {
    let session_id = Uuid::new_v4().to_string();
    let auth_state = Uuid::new_v4().to_string();
    let token = generate_challenge_token("register", &auth_state, &state.oauth_secret);
    let redirect_uri = "http://127.0.0.1:8000/api/auth/callback";

    let auth_url = format!(
        "{}/auth?action=register&token={}&state={}&redirect_uri={}",
        state.web_site_url, token, auth_state, redirect_uri
    );

    let record = SessionRecord {
        session_id: session_id.clone(),
        action: "register".to_string(),
        state: auth_state,
        status: "pending".to_string(),
        created_at: chrono::Utc::now().timestamp(),
        user: None,
        token: None,
    };

    state.sessions.write().await.insert(session_id.clone(), record);

    Json(serde_json::json!({
        "session_id": session_id,
        "token": token,
        "auth_url": auth_url
    }))
}

#[derive(Debug, Deserialize)]
pub struct CallbackQuery {
    pub code: Option<String>,
    pub state: Option<String>,
    pub error: Option<String>,
}

/// 3. Receptor Loopback (RFC 8252 / Google Standard)
/// O navegador redireciona para cá após autenticar no site:
/// http://127.0.0.1:8000/api/auth/callback?code=...&state=...
pub async fn callback(
    State(state): State<Arc<AuthState>>,
    Query(query): Query<CallbackQuery>,
) -> impl IntoResponse {
    let mut headers = HeaderMap::new();
    headers.insert(header::CONTENT_TYPE, "text/html; charset=utf-8".parse().unwrap());

    if let Some(err) = query.error {
        let error_html = format!(
            r#"<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Fury - Erro na Autenticação</title>
<style>body{{background:#0b0f17;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}}
.card{{background:#161f30;border:1px solid #ef4444;padding:36px;border-radius:16px;text-align:center;max-width:400px;}}
h1{{color:#ef4444;font-size:20px;margin-bottom:12px;}}p{{color:#94a3b8;font-size:14px;line-height:1.5;}}</style>
</head>
<body><div class="card"><h1>Falha na Autenticação</h1><p>{}</p></div></body></html>"#,
            err
        );
        return (StatusCode::BAD_REQUEST, headers, Html(error_html));
    }

    let code = match query.code {
        Some(c) if !c.is_empty() => c,
        _ => {
            return (
                StatusCode::BAD_REQUEST,
                headers,
                Html("<h1>Código de autorização ausente</h1>".to_string()),
            );
        }
    };

    let oauth_state = match query.state {
        Some(s) if !s.is_empty() => s,
        _ => {
            return (
                StatusCode::BAD_REQUEST,
                headers,
                Html("<h1>Parâmetro state ausente</h1>".to_string()),
            );
        }
    };

    // Encontra a sessão pendente correspondente pelo state
    let session_id_opt = {
        let sessions = state.sessions.read().await;
        sessions
            .iter()
            .find(|(_, rec)| rec.state == oauth_state)
            .map(|(id, _)| id.clone())
    };

    let session_id = match session_id_opt {
        Some(id) => id,
        None => {
            return (
                StatusCode::BAD_REQUEST,
                headers,
                Html("<h1>Sessão de autenticação expirada ou inválida</h1>".to_string()),
            );
        }
    };

    // Chama o NestJS para trocar o código pelo JWT e dados do usuário
    let exchange_url = format!("{}/api/auth/exchange-code", state.cloud_api_url);
    let exchange_payload = serde_json::json!({
        "code": code,
        "state": oauth_state,
    });

    let resp = match state
        .http_client
        .post(&exchange_url)
        .json(&exchange_payload)
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Erro de conexão com o NestJS ao trocar código: {:?}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                headers,
                Html("<h1>Não foi possível conectar ao servidor de nuvem para validar o código</h1>".to_string()),
            );
        }
    };

    if !resp.status().is_success() {
        let err_text = resp.text().await.unwrap_or_default();
        return (
            StatusCode::BAD_REQUEST,
            headers,
            Html(format!("<h1>Erro na troca do código: {}</h1>", err_text)),
        );
    }

    #[derive(Deserialize)]
    struct ExchangeResponse {
        #[serde(rename = "accessToken")]
        access_token: String,
        user: CloudUser,
    }

    let parsed: ExchangeResponse = match resp.json().await {
        Ok(p) => p,
        Err(e) => {
            tracing::error!("Falha ao interpretar resposta do NestJS: {:?}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                headers,
                Html("<h1>Erro ao processar dados da conta</h1>".to_string()),
            );
        }
    };

    // Atualiza a sessão e salva o usuário logado
    {
        let mut sessions = state.sessions.write().await;
        if let Some(rec) = sessions.get_mut(&session_id) {
            rec.status = "authenticated".to_string();
            rec.token = Some(parsed.access_token.clone());
            rec.user = Some(parsed.user.clone());
        }
    }

    *state.current_user.write().await = Some(parsed.user.clone());
    *state.current_token.write().await = Some(parsed.access_token);

    let success_html = format!(
        r#"<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fury Antidetect - Conectado</title>
  <style>
    body {{
      background: #080c14;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
    }}
    .card {{
      background: #0f172a;
      border: 1px solid #1e293b;
      padding: 44px 36px;
      border-radius: 20px;
      text-align: center;
      max-width: 440px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    }}
    .badge {{
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(34, 197, 94, 0.12);
      border: 1px solid rgba(34, 197, 94, 0.25);
      color: #4ade80;
      font-size: 13px;
      font-weight: 500;
      padding: 6px 14px;
      border-radius: 9999px;
      margin-bottom: 20px;
    }}
    h1 {{
      font-size: 22px;
      font-weight: 700;
      margin: 0 0 10px;
      letter-spacing: -0.02em;
    }}
    p {{
      color: #94a3b8;
      font-size: 14px;
      line-height: 1.6;
      margin: 0 0 28px;
    }}
    .user-pill {{
      background: #1e293b;
      padding: 10px 16px;
      border-radius: 12px;
      font-size: 13px;
      color: #e2e8f0;
      margin-bottom: 24px;
      word-break: break-all;
    }}
    .btn {{
      background: #3b82f6;
      color: #fff;
      border: none;
      padding: 12px 24px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }}
    .btn:hover {{
      background: #2563eb;
    }}
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
      Conectado com sucesso
    </div>
    <h1>Autenticação Concluída!</h1>
    <p>Sua conta foi vinculada ao aplicativo <strong>Fury Antidetect</strong>.</p>
    <div class="user-pill">Conectado como: <strong>{}</strong></div>
    <button class="btn" onclick="window.close()">Fechar esta Janela</button>
  </div>
</body>
</html>"#,
        parsed.user.email
    );

    (StatusCode::OK, headers, Html(success_html))
}

/// 4. Consulta status de uma sessão ativa pelo App Desktop
pub async fn get_session_status(
    State(state): State<Arc<AuthState>>,
    Path(session_id): Path<String>,
) -> impl IntoResponse {
    let sessions = state.sessions.read().await;
    if let Some(rec) = sessions.get(&session_id) {
        Json(serde_json::json!({
            "status": rec.status,
            "session_id": rec.session_id,
            "user": rec.user,
            "token": rec.token
        }))
    } else {
        Json(serde_json::json!({
            "status": "not_found",
            "session_id": session_id,
            "user": null,
            "token": null
        }))
    }
}

/// 5. Retorna dados do usuário atualmente autenticado ou modo offline
pub async fn me(State(state): State<Arc<AuthState>>) -> impl IntoResponse {
    let user_guard = state.current_user.read().await;
    let token_guard = state.current_token.read().await;

    if let Some(ref u) = *user_guard {
        Json(serde_json::json!({
            "id": u.id,
            "email": u.email,
            "name": u.name,
            "plan": u.plan,
            "max_profiles": u.max_profiles,
            "profile_count": u.profile_count,
            "is_offline": false,
            "token": *token_guard
        }))
    } else {
        Json(serde_json::json!({
            "id": "offline-1",
            "email": null,
            "name": "Usuário Offline",
            "plan": "offline",
            "max_profiles": 9999,
            "profile_count": 0,
            "is_offline": true,
            "token": null
        }))
    }
}

/// 6. Desconecta o usuário atual
pub async fn logout(State(state): State<Arc<AuthState>>) -> impl IntoResponse {
    *state.current_user.write().await = None;
    *state.current_token.write().await = None;
    Json(serde_json::json!({ "success": true }))
}
