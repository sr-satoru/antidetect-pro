use crate::models::{CloudUser, SessionRecord};
use base64::Engine;
use hmac::{Hmac, Mac};
use serde::Deserialize;
use sha2::Sha256;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;

type HmacSha256 = Hmac<Sha256>;

#[derive(Clone)]
pub struct CloudAuthService {
    sessions: Arc<RwLock<HashMap<String, SessionRecord>>>,
    current_user: Arc<RwLock<Option<CloudUser>>>,
    current_token: Arc<RwLock<Option<String>>>,
    cloud_api_url: String,
    web_site_url: String,
    oauth_secret: String,
    http_client: reqwest::Client,
}

impl CloudAuthService {
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

    /// Gera o token assinado HMAC-SHA256 de curta duração para autorização segura
    pub fn generate_challenge_token(&self, action: &str, state: &str) -> String {
        let exp = chrono::Utc::now().timestamp() + 600; // 10 minutos
        let payload = serde_json::json!({
            "action": action,
            "state": state,
            "exp": exp
        });

        let payload_str = payload.to_string();
        let payload_b64 = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(payload_str.as_bytes());

        let mut mac = HmacSha256::new_from_slice(self.oauth_secret.as_bytes())
            .expect("Chave HMAC válida");
        mac.update(payload_b64.as_bytes());
        let signature = mac.finalize().into_bytes();
        let sig_hex: String = signature.iter().map(|b| format!("{:02x}", b)).collect();

        format!("{}.{}", payload_b64, sig_hex)
    }

    /// Cria uma nova sessão para Login ou Registro e monta a URL do navegador
    pub async fn create_auth_session(&self, action: &str) -> (String, String, String) {
        let session_id = Uuid::new_v4().to_string();
        let auth_state = Uuid::new_v4().to_string();
        let token = self.generate_challenge_token(action, &auth_state);
        let redirect_uri = "http://127.0.0.1:8000/api/auth/callback";

        let auth_url = format!(
            "{}/auth?action={}&token={}&state={}&redirect_uri={}",
            self.web_site_url, action, token, auth_state, redirect_uri
        );

        let record = SessionRecord {
            session_id: session_id.clone(),
            action: action.to_string(),
            state: auth_state,
            status: "pending".to_string(),
            created_at: chrono::Utc::now().timestamp(),
            user: None,
            token: None,
        };

        self.sessions.write().await.insert(session_id.clone(), record);
        (session_id, token, auth_url)
    }

    /// Verifica se a sessão deste state já foi autenticada (idempotência para redirects duplos do browser)
    pub async fn get_authenticated_email_by_state(&self, oauth_state: &str) -> Option<String> {
        let sessions = self.sessions.read().await;
        sessions.iter().find_map(|(_, rec)| {
            if rec.state == oauth_state && rec.status == "authenticated" {
                rec.user.as_ref().map(|u| u.email.clone())
            } else {
                None
            }
        })
    }

    /// Realiza a troca do AuthCode pelo JWT definitivo no NestJS Cloud
    pub async fn exchange_code(&self, code: &str, oauth_state: &str) -> Result<CloudUser, String> {
        let session_id = {
            let sessions = self.sessions.read().await;
            sessions
                .iter()
                .find(|(_, rec)| rec.state == oauth_state)
                .map(|(id, _)| id.clone())
                .ok_or_else(|| "Sessão de autenticação expirada ou inválida".to_string())?
        };

        let exchange_url = format!("{}/api/auth/exchange-code", self.cloud_api_url);
        let payload = serde_json::json!({
            "code": code,
            "state": oauth_state,
        });

        let resp = self
            .http_client
            .post(&exchange_url)
            .json(&payload)
            .send()
            .await
            .map_err(|e| format!("Erro de conexão com o NestJS: {}", e))?;

        if !resp.status().is_success() {
            let err_text = resp.text().await.unwrap_or_default();
            return Err(format!("Falha na validação do servidor: {}", err_text));
        }

        #[derive(Deserialize)]
        struct ExchangeResponse {
            #[serde(rename = "accessToken")]
            access_token: String,
            user: CloudUser,
        }

        let parsed: ExchangeResponse = resp
            .json()
            .await
            .map_err(|e| format!("Erro ao processar dados retornados pela nuvem: {}", e))?;

        // Atualiza o registro da sessão
        {
            let mut sessions = self.sessions.write().await;
            if let Some(rec) = sessions.get_mut(&session_id) {
                rec.status = "authenticated".to_string();
                rec.token = Some(parsed.access_token.clone());
                rec.user = Some(parsed.user.clone());
            }
        }

        // Salva a sessão ativa global do app
        *self.current_user.write().await = Some(parsed.user.clone());
        *self.current_token.write().await = Some(parsed.access_token);

        Ok(parsed.user)
    }

    /// Consulta o status de uma sessão específica (usado pelo polling do desktop)
    pub async fn get_session(&self, session_id: &str) -> Option<SessionRecord> {
        let sessions = self.sessions.read().await;
        sessions.get(session_id).cloned()
    }

    /// Retorna o usuário logado atualmente ou None se em modo offline
    pub async fn get_current_user(&self) -> Option<CloudUser> {
        self.current_user.read().await.clone()
    }

    /// Retorna o token JWT atual
    pub async fn get_current_token(&self) -> Option<String> {
        self.current_token.read().await.clone()
    }

    /// Desconecta o usuário ativo
    pub async fn logout(&self) {
        *self.current_user.write().await = None;
        *self.current_token.write().await = None;
    }

    /// Renderiza a página HTML oficial de sucesso exibida no navegador após autenticar
    pub fn render_success_html(&self, email: &str) -> String {
        format!(
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
            email
        )
    }

    /// Renderiza página de erro caso a autorização falhe
    pub fn render_error_html(&self, err_msg: &str) -> String {
        format!(
            r#"<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Fury - Erro na Autenticação</title>
<style>body{{background:#0b0f17;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}}
.card{{background:#161f30;border:1px solid #ef4444;padding:36px;border-radius:16px;text-align:center;max-width:400px;}}
h1{{color:#ef4444;font-size:20px;margin-bottom:12px;}}p{{color:#94a3b8;font-size:14px;line-height:1.5;}}</style>
</head>
<body><div class="card"><h1>Falha na Autenticação</h1><p>{}</p></div></body></html>"#,
            err_msg
        )
    }
}
