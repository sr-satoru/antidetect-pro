use super::types::{AuthSession, PendingPkce};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{Mutex, RwLock};

/// Gerenciador de estado em memória RAM e concorrência thread-safe.
/// Usa 1 único RwLock atômico para eliminar riscos de deadlock.
#[derive(Clone)]
pub struct SessionManager {
    session: Arc<RwLock<Option<AuthSession>>>,
    pending_pkce: Arc<RwLock<HashMap<String, PendingPkce>>>,
    refresh_lock: Arc<Mutex<()>>,
}

impl SessionManager {
    pub fn new(initial_session: Option<AuthSession>) -> Self {
        Self {
            session: Arc::new(RwLock::new(initial_session)),
            pending_pkce: Arc::new(RwLock::new(HashMap::new())),
            refresh_lock: Arc::new(Mutex::new(())),
        }
    }

    /// Retorna clone da sessão ativa atualmente na memória
    pub async fn get_session(&self) -> Option<AuthSession> {
        let lock = self.session.read().await;
        lock.clone()
    }

    /// Define atômica e seguramente a nova sessão ativa
    pub async fn set_session(&self, new_session: AuthSession) {
        let mut lock = self.session.write().await;
        *lock = Some(new_session);
    }

    /// Atualiza somente os tokens de uma sessão existente após renovação
    pub async fn update_tokens(&self, access_token: String, expires_at: i64) {
        let mut lock = self.session.write().await;
        if let Some(ref mut sess) = *lock {
            sess.access_token = access_token;
            sess.expires_at = expires_at;
        }
    }

    /// Limpa a sessão ativa na memória
    pub async fn clear(&self) {
        let mut lock = self.session.write().await;
        *lock = None;
    }

    /// Salva temporariamente um código verifier vinculado ao state (5 minutos)
    pub async fn store_pending_pkce(&self, state: String, verifier: String) {
        let now = chrono::Utc::now().timestamp();
        let mut lock = self.pending_pkce.write().await;
        lock.insert(
            state,
            PendingPkce {
                code_verifier: verifier,
                expires_at: now + 300,
            },
        );
    }

    /// Recupera e consome (remove) o code_verifier temporário garantindo uso único
    pub async fn take_pending_pkce(&self, state: &str) -> Result<String, String> {
        let mut lock = self.pending_pkce.write().await;
        let pending = lock
            .remove(state)
            .ok_or_else(|| "Sessão de autenticação inválida ou não encontrada".to_string())?;

        let now = chrono::Utc::now().timestamp();
        if now > pending.expires_at {
            return Err("Sessão de login expirou no aplicativo. Tente novamente.".to_string());
        }

        Ok(pending.code_verifier)
    }

    /// Retorna a trava exclusiva para renovação Single-Flight
    pub fn refresh_lock(&self) -> Arc<Mutex<()>> {
        self.refresh_lock.clone()
    }
}
