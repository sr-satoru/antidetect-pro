use crate::models::{CloudUser, SessionRecord};
use base64::Engine;
use rand::RngCore;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PersistedAuthSession {
    pub user: CloudUser,
    pub access_token: String,
    pub refresh_token: String,
    pub expires_at: i64,
}

#[derive(Clone)]
pub struct CloudAuthService {
    sessions: Arc<RwLock<HashMap<String, SessionRecord>>>,
    current_user: Arc<RwLock<Option<CloudUser>>>,
    current_token: Arc<RwLock<Option<String>>>,
    current_refresh_token: Arc<RwLock<Option<String>>>,
    current_token_expires_at: Arc<RwLock<i64>>,
    cloud_api_url: String,
    web_site_url: String,
    http_client: reqwest::Client,
    auth_repo: Arc<dyn crate::storage::vault::traits::AuthRepository>,
}

impl CloudAuthService {
    pub fn new(auth_repo: Arc<dyn crate::storage::vault::traits::AuthRepository>) -> Self {
        let cloud_api_url = std::env::var("STAR_CLOUD_API_URL")
            .unwrap_or_else(|_| "http://localhost:12342".to_string());
        let web_site_url = std::env::var("STAR_WEB_SITE_URL")
            .unwrap_or_else(|_| "http://localhost:3001".to_string());

        let mut initial_user = None;
        let mut initial_token = None;
        let mut initial_refresh_token = None;
        let mut initial_expires_at = 0;

        if let Ok(Some(saved)) = auth_repo.get() {
            tracing::info!("🔒 Sessão de autenticação carregada do Star Secure Vault para: {}", saved.user.email);
            initial_user = Some(saved.user);
            initial_token = Some(saved.access_token);
            initial_refresh_token = Some(saved.refresh_token);
            initial_expires_at = saved.expires_at;
        }

        Self {
            sessions: Arc::new(RwLock::new(HashMap::new())),
            current_user: Arc::new(RwLock::new(initial_user)),
            current_token: Arc::new(RwLock::new(initial_token)),
            current_refresh_token: Arc::new(RwLock::new(initial_refresh_token)),
            current_token_expires_at: Arc::new(RwLock::new(initial_expires_at)),
            cloud_api_url,
            web_site_url,
            http_client: reqwest::Client::new(),
            auth_repo,
        }
    }

    /// Gera o par PKCE (code_verifier, code_challenge) em conformidade com a RFC 7636
    pub fn generate_pkce_pair() -> (String, String) {
        let mut random_bytes = [0u8; 48];
        rand::thread_rng().fill_bytes(&mut random_bytes);
        let code_verifier = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(random_bytes);

        let hash = Sha256::digest(code_verifier.as_bytes());
        let code_challenge = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(hash);

        (code_verifier, code_challenge)
    }

    /// Cria uma nova sessão para Login ou Registro com PKCE e monta a URL de autorização
    pub async fn create_auth_session(&self, action: &str) -> (String, String, String) {
        let session_id = Uuid::new_v4().to_string();
        let auth_state = Uuid::new_v4().to_string();
        let (code_verifier, code_challenge) = Self::generate_pkce_pair();
        let backend_port = std::env::var("STAR_BACKEND_PORT")
            .or_else(|_| std::env::var("STAR_BACKEND_PORT"))
            .unwrap_or_else(|_| "12540".to_string());
        let redirect_uri = format!("http://127.0.0.1:{}/api/auth/callback", backend_port);

        let auth_url = format!(
            "{}/auth?action={}&code_challenge={}&code_challenge_method=S256&state={}&redirect_uri={}",
            self.web_site_url, action, code_challenge, auth_state, redirect_uri
        );

        let record = SessionRecord {
            session_id: session_id.clone(),
            action: action.to_string(),
            state: auth_state,
            code_verifier: code_verifier.clone(),
            status: "pending".to_string(),
            created_at: chrono::Utc::now().timestamp(),
            user: None,
            token: None,
            refresh_token: None,
        };

        self.sessions.write().await.insert(session_id.clone(), record);
        (session_id, code_verifier, auth_url)
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

    /// Realiza a troca do AuthCode pelo JWT definitivo no NestJS Cloud enviando o code_verifier (PKCE)
    pub async fn exchange_code(&self, code: &str, oauth_state: &str) -> Result<CloudUser, String> {
        let (session_id, code_verifier) = {
            let sessions = self.sessions.read().await;
            sessions
                .iter()
                .find(|(_, rec)| rec.state == oauth_state)
                .map(|(id, rec)| (id.clone(), rec.code_verifier.clone()))
                .ok_or_else(|| "Sessão de autenticação expirada ou inválida".to_string())?
        };

        let exchange_url = format!("{}/api/auth/exchange-code", self.cloud_api_url);
        let payload = serde_json::json!({
            "code": code,
            "state": oauth_state,
            "code_verifier": code_verifier,
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
            #[serde(rename = "refreshToken")]
            refresh_token: Option<String>,
            user: CloudUser,
        }

        let parsed: ExchangeResponse = resp
            .json()
            .await
            .map_err(|e| format!("Erro ao processar dados retornados pela nuvem: {}", e))?;

        let now = chrono::Utc::now().timestamp();
        let expires_at = now + 300; // 5 minutos

        // Atualiza o registro da sessão
        {
            let mut sessions = self.sessions.write().await;
            if let Some(rec) = sessions.get_mut(&session_id) {
                rec.status = "authenticated".to_string();
                rec.token = Some(parsed.access_token.clone());
                rec.refresh_token = parsed.refresh_token.clone();
                rec.user = Some(parsed.user.clone());
            }
        }

        // Salva a sessão ativa global do app
        *self.current_user.write().await = Some(parsed.user.clone());
        *self.current_token.write().await = Some(parsed.access_token.clone());
        *self.current_refresh_token.write().await = parsed.refresh_token.clone();
        *self.current_token_expires_at.write().await = expires_at;

        if let Some(ref r_token) = parsed.refresh_token {
            self.save_session_to_disk(&parsed.user, &parsed.access_token, r_token, expires_at);
        }

        Ok(parsed.user)
    }

    fn save_session_to_disk(&self, user: &CloudUser, access_token: &str, refresh_token: &str, expires_at: i64) {
        let session = PersistedAuthSession {
            user: user.clone(),
            access_token: access_token.to_string(),
            refresh_token: refresh_token.to_string(),
            expires_at,
        };
        if let Err(e) = self.auth_repo.save(&session) {
            tracing::error!("❌ Erro ao salvar sessão no Star Secure Vault: {}", e);
        } else {
            tracing::info!("🔒 Sessão salva e protegida com AES-256-GCM no Star Secure Vault");
        }
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

    /// Retorna o refresh token atual
    pub async fn get_current_refresh_token(&self) -> Option<String> {
        self.current_refresh_token.read().await.clone()
    }

    /// Retorna um Access Token válido, renovando automaticamente com o Refresh Token se estiver prestes a expirar (< 30s)
    pub async fn get_valid_access_token(&self) -> Result<String, String> {
        let now = chrono::Utc::now().timestamp();
        let expires_at = *self.current_token_expires_at.read().await;

        if expires_at > now + 30 {
            if let Some(token) = self.current_token.read().await.clone() {
                return Ok(token);
            }
        }

        let refresh_token = {
            self.current_refresh_token.read().await.clone()
        }.ok_or_else(|| "Nenhum refresh token disponível. Faça login novamente.".to_string())?;

        let refresh_url = format!("{}/api/auth/refresh", self.cloud_api_url);
        let payload = serde_json::json!({
            "refreshToken": refresh_token,
        });

        let resp = self
            .http_client
            .post(&refresh_url)
            .json(&payload)
            .send()
            .await
            .map_err(|e| format!("Erro de conexão ao renovar token: {}", e))?;

        if !resp.status().is_success() {
            let err_text = resp.text().await.unwrap_or_default();
            return Err(format!("Falha na renovação da sessão: {}", err_text));
        }

        #[derive(Deserialize)]
        struct RefreshResponse {
            #[serde(rename = "accessToken")]
            access_token: String,
            #[serde(rename = "expiresIn")]
            expires_in: Option<i64>,
        }

        let parsed: RefreshResponse = resp
            .json()
            .await
            .map_err(|e| format!("Erro ao decodificar resposta de renovação: {}", e))?;

        let new_expires_at = now + parsed.expires_in.unwrap_or(300);
        *self.current_token.write().await = Some(parsed.access_token.clone());
        *self.current_token_expires_at.write().await = new_expires_at;

        if let Some(user) = self.current_user.read().await.clone() {
            self.save_session_to_disk(&user, &parsed.access_token, &refresh_token, new_expires_at);
        }

        tracing::info!("🔑 Access token de 5m renovado automaticamente com sucesso!");
        Ok(parsed.access_token)
    }

    /// Desconecta o usuário ativo
    pub async fn logout(&self) {
        *self.current_user.write().await = None;
        *self.current_token.write().await = None;
        *self.current_refresh_token.write().await = None;
        *self.current_token_expires_at.write().await = 0;
        let _ = self.auth_repo.clear();
    }

    /// Renderiza a página HTML oficial de sucesso exibida no navegador após autenticar
    pub fn render_success_html(&self, email: &str) -> String {
        format!(
            r#"<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Star Multlogin - Conectado</title>
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
    <p>Sua conta foi vinculada ao aplicativo <strong>Star Multlogin</strong>.</p>
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
<head><meta charset="UTF-8"><title>Star Multlogin - Erro na Autenticação</title>
<style>body{{background:#0b0f17;color:#fff;font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}}
.card{{background:#161f30;border:1px solid #ef4444;padding:36px;border-radius:16px;text-align:center;max-width:400px;}}
h1{{color:#ef4444;font-size:20px;margin-bottom:12px;}}p{{color:#94a3b8;font-size:14px;line-height:1.5;}}</style>
</head>
<body><div class="card"><h1>Falha na Autenticação</h1><p>{}</p></div></body></html>"#,
            err_msg
        )
    }
}
