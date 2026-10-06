use std::sync::{Arc, Mutex, RwLock};
use std::time::Duration;

use super::client_http::{self, ProfileCloudStat, PullProfilesResult, SyncUploadResult};
use super::cron::RunningChecker;
use super::delete::OrquestradorDelete;
use super::dwonload::OrquestradorDownload;
use super::upload::orquestrador_upload;
use crate::server_sync::cloud_auth::CloudAuthService;
use crate::service_database::Vault;
use crate::ws::WsState;

/// Fachada de alto nível para os serviços de sincronização com a Nuvem
pub struct CloudSyncService {
    vault: Arc<Vault>,
    auth_service: Arc<CloudAuthService>,
    http_client: reqwest::Client,
    cloud_api_url: String,
    ws: Arc<RwLock<Option<WsState>>>,
    running_checker: Arc<Mutex<Option<RunningChecker>>>,
}

impl CloudSyncService {
    pub fn new(vault: Arc<Vault>, auth_service: Arc<CloudAuthService>) -> Self {
        let cloud_api_url = std::env::var("STAR_CLOUD_API_URL")
            .unwrap_or_else(|_| "http://localhost:12342".to_string());

        let http_client = reqwest::Client::builder()
            .timeout(Duration::from_secs(45))
            .build()
            .unwrap_or_default();

        Self {
            vault,
            auth_service,
            http_client,
            cloud_api_url,
            ws: Arc::new(RwLock::new(None)),
            running_checker: Arc::new(Mutex::new(None)),
        }
    }

    pub fn with_ws(self, ws: WsState) -> Self {
        *self.ws.write().unwrap() = Some(ws);
        self
    }

    pub fn set_ws(&self, ws: WsState) {
        let mut lock = self.ws.write().unwrap();
        *lock = Some(ws);
    }

    pub fn set_running_checker(&self, checker: RunningChecker) {
        let mut lock = self.running_checker.lock().unwrap();
        *lock = Some(checker);
    }

    pub fn get_cloud_api_url(&self) -> &str {
        &self.cloud_api_url
    }

    pub fn get_auth_service(&self) -> &Arc<CloudAuthService> {
        &self.auth_service
    }

    async fn resolve_token(&self, header_token: Option<&str>) -> Result<String, String> {
        match self.auth_service.get_valid_access_token().await {
            Ok(t) => Ok(t),
            Err(e) => {
                if let Some(ht) = header_token {
                    let trimmed = ht.trim();
                    if !trimmed.is_empty() {
                        return Ok(trimmed.to_string());
                    }
                }
                Err(e)
            }
        }
    }

    async fn resolve_user_key(&self, token: &str) -> String {
        if let Some(user) = self.auth_service.get_current_user().await {
            return user.id;
        }

        use base64::Engine;
        token
            .split('.')
            .nth(1)
            .and_then(|payload_b64| {
                base64::engine::general_purpose::URL_SAFE_NO_PAD
                    .decode(payload_b64)
                    .ok()
                    .or_else(|| base64::engine::general_purpose::STANDARD.decode(payload_b64).ok())
            })
            .and_then(|bytes| serde_json::from_slice::<serde_json::Value>(&bytes).ok())
            .and_then(|json| json.get("sub").and_then(|s| s.as_str().map(|s| s.to_string())))
            .unwrap_or_else(|| "star_user_master_vault".to_string())
    }

    /// Upload do perfil delegando para o orquestrador_upload
    pub async fn upload_profile_with_fallback(
        &self,
        profile_id: &str,
        header_token: Option<&str>,
    ) -> Result<SyncUploadResult, String> {
        let token = self.resolve_token(header_token).await?;
        let user_key = self.resolve_user_key(&token).await;
        let ws = self.ws.read().unwrap().clone();

        orquestrador_upload::executar_upload(
            &self.vault,
            &self.http_client,
            &self.cloud_api_url,
            &token,
            &user_key,
            profile_id,
            ws.as_ref(),
        )
        .await
    }

    /// Download e restauração delegando para o OrquestradorDownload
    pub async fn download_profile_with_fallback(
        &self,
        profile_id: &str,
        header_token: Option<&str>,
    ) -> Result<(), String> {
        let token = self.resolve_token(header_token).await?;
        let user_key = self.resolve_user_key(&token).await;
        let ws = self.ws.read().unwrap().clone();

        OrquestradorDownload::atualizar_perfil(
            &self.vault,
            &self.http_client,
            &self.cloud_api_url,
            &token,
            &user_key,
            profile_id,
            ws.as_ref(),
        )
        .await
    }

    /// Pull de todos os perfis da nuvem delegando para o OrquestradorDownload
    pub async fn pull_all_profiles_with_fallback(
        &self,
        header_token: Option<&str>,
        force: bool,
    ) -> Result<PullProfilesResult, String> {
        let token = self.resolve_token(header_token).await?;
        let user_key = self.resolve_user_key(&token).await;
        let ws = self.ws.read().unwrap().clone();

        OrquestradorDownload::puxar_todos_perfis(
            &self.vault,
            &self.http_client,
            &self.cloud_api_url,
            &token,
            &user_key,
            ws.as_ref(),
            force,
        )
        .await
    }

    /// Consulta o status remoto do perfil na nuvem
    pub async fn stat_profile_with_fallback(
        &self,
        profile_id: &str,
        header_token: Option<&str>,
    ) -> Result<ProfileCloudStat, String> {
        let token = self.resolve_token(header_token).await?;
        client_http::consultar_stat(&self.http_client, &self.cloud_api_url, &token, profile_id).await
    }

    /// Remove o perfil da nuvem delegando ao OrquestradorDelete
    pub async fn delete_profile_from_cloud(
        &self,
        profile_id: &str,
        header_token: Option<&str>,
    ) -> Result<(), String> {
        let token = self.resolve_token(header_token).await?;
        let ws = self.ws.read().unwrap().clone();

        OrquestradorDelete::executar_delete(
            &self.http_client,
            &self.cloud_api_url,
            &token,
            profile_id,
            ws.as_ref(),
        )
        .await
    }

    /// Remove múltiplos perfis da nuvem em lote delegando ao OrquestradorDelete
    pub async fn delete_trash_batch_from_cloud(
        &self,
        profile_ids: &[String],
        header_token: Option<&str>,
    ) -> Result<usize, String> {
        let token = self.resolve_token(header_token).await?;
        let ws = self.ws.read().unwrap().clone();

        OrquestradorDelete::executar_delete_em_lote(
            &self.http_client,
            &self.cloud_api_url,
            &token,
            profile_ids,
            ws.as_ref(),
        )
        .await
    }
}
