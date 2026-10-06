use super::client::RemoteAuthClient;
use super::pkce::PkceEngine;
use super::session::SessionManager;
use super::storage::VaultSessionStorage;
use super::types::{AuthSession, ConnectionStatus};
use crate::models::CloudUser;
use crate::service_database::Vault;
use std::sync::Arc;

/// Fachada pública de autenticação do Desktop.
/// Orquestra os submódulos desacoplados: pkce, session, storage e client.
#[derive(Clone)]
pub struct CloudAuthService {
    session_manager: SessionManager,
    client: RemoteAuthClient,
    vault: Arc<Vault>,
    cloud_api_url: String,
}

impl CloudAuthService {
    pub fn new(vault: Arc<Vault>) -> Self {
        let cloud_api_url = std::env::var("STAR_CLOUD_API_URL")
            .unwrap_or_else(|_| "http://localhost:12342".to_string());

        let initial_session = match VaultSessionStorage::load_session(&vault) {
            Ok(Some(saved)) => {
                tracing::info!("🔒 Sessão de autenticação carregada do Star Vault para: {}", saved.user.email);
                Some(saved)
            }
            _ => None,
        };

        Self {
            session_manager: SessionManager::new(initial_session),
            client: RemoteAuthClient::new(cloud_api_url.clone()),
            vault,
            cloud_api_url,
        }
    }

    /// Inicia o fluxo PKCE Zero-Click abrindo diretamente no /api/auth/authorize
    pub async fn create_auth_session(&self, _action: &str) -> (String, String, String) {
        let state = PkceEngine::generate_state();
        let pair = PkceEngine::generate_pair();

        self.session_manager
            .store_pending_pkce(state.clone(), pair.code_verifier)
            .await;

        let redirect_uri = "http://127.0.0.1:12540/api/auth/callback";
        let auth_url = format!(
            "{}/api/auth/authorize?client_id=star-desktop&response_type=code&redirect_uri={}&code_challenge={}&code_challenge_method=S256&state={}",
            self.cloud_api_url, redirect_uri, pair.code_challenge, state
        );

        (state.clone(), state, auth_url)
    }

    /// Executa a troca do AuthCode pelo token definitivo e salva no cofre cifrado
    pub async fn exchange_code(&self, code: &str, state: &str) -> Result<CloudUser, String> {
        let verifier = self.session_manager.take_pending_pkce(state).await?;
        let resp = self.client.exchange_code(code, state, &verifier).await?;

        let expires_at = chrono::Utc::now().timestamp() + resp.expires_in;
        let new_session = AuthSession {
            user: resp.user.clone(),
            access_token: resp.access_token,
            refresh_token: resp.refresh_token,
            expires_at,
        };

        let _ = VaultSessionStorage::save_session(&self.vault, &new_session);
        self.session_manager.set_session(new_session).await;

        tracing::info!("✅ Autenticação PKCE concluída para {}", resp.user.email);
        Ok(resp.user)
    }

    /// Retorna token de acesso válido, renovando silenciosamente via Single-Flight se faltar < 30s
    pub async fn get_valid_access_token(&self) -> Result<String, String> {
        let now = chrono::Utc::now().timestamp();

        if let Some(sess) = self.session_manager.get_session().await {
            if sess.expires_at - now > 30 {
                return Ok(sess.access_token);
            }
        }

        // Single-Flight Lock: apenas 1 thread faz a renovação por vez
        let refresh_lock = self.session_manager.refresh_lock();
        let _guard = refresh_lock.lock().await;

        // Dupla checagem
        let now = chrono::Utc::now().timestamp();
        if let Some(sess) = self.session_manager.get_session().await {
            if sess.expires_at - now > 30 {
                return Ok(sess.access_token);
            }
        }

        let refresh_token = match self.session_manager.get_session().await {
            Some(s) => s.refresh_token,
            None => return Err("Usuário não autenticado no Star Multlogin".to_string()),
        };

        let data = self.client.refresh_access_token(&refresh_token).await?;
        let new_expires_at = now + data.expires_in;

        self.session_manager
            .update_tokens(data.access_token.clone(), new_expires_at)
            .await;

        if let Some(sess) = self.session_manager.get_session().await {
            let _ = VaultSessionStorage::save_session(&self.vault, &sess);
        }

        tracing::info!("🔄 Access Token renovado com sucesso!");
        Ok(data.access_token)
    }

    /// Handshake ativo: valida se o token é aceito pelo servidor e detecta Online / Offline
    pub async fn validate_online_status(&self) -> ConnectionStatus {
        let token = match self.get_valid_access_token().await {
            Ok(t) => t,
            Err(_) => return ConnectionStatus::Unauthenticated,
        };

        match self.client.fetch_me(&token).await {
            Ok(user) => {
                if let Some(mut sess) = self.session_manager.get_session().await {
                    sess.user = user;
                    let _ = VaultSessionStorage::save_session(&self.vault, &sess);
                    self.session_manager.set_session(sess).await;
                }
                ConnectionStatus::Online
            }
            Err(e) if e.contains("401") => {
                self.logout().await;
                ConnectionStatus::Unauthenticated
            }
            Err(_) => ConnectionStatus::OfflineServerUnreachable,
        }
    }

    pub async fn get_current_user(&self) -> Option<CloudUser> {
        self.session_manager.get_session().await.map(|s| s.user)
    }

    pub async fn get_current_token(&self) -> Option<String> {
        self.session_manager.get_session().await.map(|s| s.access_token)
    }

    pub async fn get_current_refresh_token(&self) -> Option<String> {
        self.session_manager.get_session().await.map(|s| s.refresh_token)
    }

    pub async fn logout(&self) {
        self.session_manager.clear().await;
        let _ = VaultSessionStorage::purge_session(&self.vault);
        tracing::info!("🔓 Sessão encerrada e cofre limpo.");
    }

    pub fn render_success_html(&self, email: &str) -> String {
        format!(
            r#"<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Autenticado | Star Multlogin</title>
  <style>
    body {{ background: #0b0c10; color: #fff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }}
    .card {{ background: #12131a; border: 1px solid #232530; border-radius: 16px; padding: 32px; text-align: center; max-width: 380px; box-shadow: 0 10px 30px rgba(0,255,102,0.1); }}
    .icon {{ color: #00FF66; font-size: 44px; margin-bottom: 12px; }}
    h1 {{ font-size: 18px; margin: 0 0 8px; color: #fff; }}
    p {{ font-size: 13px; color: #9093A2; margin: 0 0 16px; }}
    .badge {{ background: rgba(0,255,102,0.1); color: #00FF66; border: 1px solid rgba(0,255,102,0.2); padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: bold; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✓</div>
    <h1>Conectado com Sucesso!</h1>
    <p>Autenticado como <span class="badge">{}</span>.</p>
    <p style="font-size: 11px;">Retornando ao aplicativo...</p>
  </div>
  <script>setTimeout(() => window.close(), 600);</script>
</body>
</html>"#,
            email
        )
    }

    pub fn render_error_html(&self, error: &str) -> String {
        format!(
            r#"<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Erro de Autenticação | Star Multlogin</title>
  <style>
    body {{ background: #0b0c10; color: #fff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }}
    .card {{ background: #12131a; border: 1px solid #ff3344; border-radius: 16px; padding: 32px; text-align: center; max-width: 380px; }}
    .icon {{ color: #ff3344; font-size: 44px; margin-bottom: 12px; }}
    h1 {{ font-size: 18px; margin: 0 0 8px; color: #fff; }}
    p {{ font-size: 13px; color: #9093A2; margin: 0; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">⚠</div>
    <h1>Falha na Autenticação</h1>
    <p>{}</p>
  </div>
</body>
</html>"#,
            error
        )
    }
}
