use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use base64::Engine;
use serde::{Deserialize, Serialize};
use tracing::{error, info};

use crate::cloud_auth::CloudAuthService;
use crate::cloud_sync::{
    crypto,
    decryptor::ProfileDecryptor,
    downloader::CloudDownloader,
    filter,
};
use crate::ws::{WsEvent, WsState};

pub type RunningChecker = Arc<dyn Fn(&str) -> bool + Send + Sync>;

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncUploadResult {
    pub profile_id: String,
    pub size_bytes: usize,
    pub size_kb: usize,
    pub synced_at: String,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProfileCloudStat {
    pub exists: boolean_or_bool::BooleanOrBool,
    pub size: Option<usize>,
    pub last_modified: Option<String>,
    pub metadata: Option<std::collections::HashMap<String, String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PulledProfileDetail {
    pub id: String,
    pub status: String, // "downloaded", "already_exists", "failed"
    pub size_bytes: usize,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PullProfilesResult {
    pub total_remote: usize,
    pub downloaded_count: usize,
    pub existing_count: usize,
    pub failed_count: usize,
    pub profiles: Vec<PulledProfileDetail>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncProfileDetail {
    pub id: String,
    pub action: String, // "downloaded", "uploaded", "skipped_running", "in_sync", "failed"
    pub size_kb: usize,
    pub reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TwoWaySyncSummary {
    pub total_remote: usize,
    pub total_local: usize,
    pub downloaded_count: usize,
    pub uploaded_count: usize,
    pub skipped_running: usize,
    pub in_sync_count: usize,
    pub failed_count: usize,
    pub profiles: Vec<SyncProfileDetail>,
}

mod boolean_or_bool {
    use serde::{Deserialize, Deserializer, Serialize, Serializer};

    #[derive(Debug, Clone, Copy)]
    pub struct BooleanOrBool(pub bool);

    impl Serialize for BooleanOrBool {
        fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
        where
            S: Serializer,
        {
            serializer.serialize_bool(self.0)
        }
    }

    impl<'de> Deserialize<'de> for BooleanOrBool {
        fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
        where
            D: Deserializer<'de>,
        {
            let b = bool::deserialize(deserializer)?;
            Ok(BooleanOrBool(b))
        }
    }
}

#[derive(Clone)]
pub struct CloudSyncService {
    data_dir: PathBuf,
    auth_service: Arc<CloudAuthService>,
    cloud_api_url: String,
    http_client: reqwest::Client,
    downloader: CloudDownloader,
    ws: Option<WsState>,
    running_checker: Arc<Mutex<Option<RunningChecker>>>,
}

impl CloudSyncService {
    pub fn new<P: AsRef<Path>>(data_dir: P, auth_service: Arc<CloudAuthService>) -> Self {
        let cloud_api_url = std::env::var("STAR_CLOUD_API_URL")
            .or_else(|_| std::env::var("STAR_CLOUD_API_URL"))
            .unwrap_or_else(|_| "http://localhost:12342".to_string());
        let http_client = reqwest::Client::new();
        let downloader = CloudDownloader::new(cloud_api_url.clone(), http_client.clone());

        Self {
            data_dir: data_dir.as_ref().to_path_buf(),
            auth_service,
            cloud_api_url,
            http_client,
            downloader,
            ws: None,
            running_checker: Arc::new(Mutex::new(None)),
        }
    }

    pub fn with_ws(mut self, ws: WsState) -> Self {
        self.ws = Some(ws);
        self
    }

    #[allow(dead_code)]
    pub fn set_ws(&mut self, ws: WsState) {
        self.ws = Some(ws);
    }

    pub fn set_running_checker(&self, checker: RunningChecker) {
        let mut lock = self.running_checker.lock().unwrap();
        *lock = Some(checker);
    }

    pub fn get_cloud_api_url(&self) -> &str {
        &self.cloud_api_url
    }

    pub fn get_auth_service(&self) -> Arc<CloudAuthService> {
        self.auth_service.clone()
    }

    pub fn is_running(&self, profile_id: &str) -> bool {
        if let Some(checker) = self.running_checker.lock().unwrap().as_ref() {
            checker(profile_id)
        } else {
            false
        }
    }

    fn emit_ws(&self, event: WsEvent) {
        if let Some(ws) = &self.ws {
            ws.emit(event);
        }
    }

    /// Retorna o diretório raiz de um perfil no disco local
    fn get_profile_dir(&self, profile_id: &str) -> PathBuf {
        if self.data_dir.ends_with("profiles") {
            self.data_dir.join(profile_id)
        } else {
            self.data_dir.join("profiles").join(profile_id)
        }
    }

    /// Obtém a chave de derivação criptográfica E2EE do usuário ativo
    async fn get_user_encryption_key(&self, token: &str) -> String {
        if let Some(user) = self.auth_service.get_current_user().await {
            return user.id;
        }

        // Fallback: extrai a claim `sub` do JWT
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

    /// Resolve o token a ser usado: prioriza o token interno gerenciado, com fallback para o token do cabeçalho
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

    /// Faz o upload de um perfil para o S3 com cápsula filtrada (< 1 MB), cifrada com E2EE (AES-256-GCM)
    #[allow(dead_code)]
    pub async fn upload_profile(&self, profile_id: &str) -> Result<SyncUploadResult, String> {
        self.upload_profile_with_fallback(profile_id, None).await
    }

    /// Faz o upload com suporte a token de fallback passado na requisição do desktop
    pub async fn upload_profile_with_fallback(
        &self,
        profile_id: &str,
        header_token: Option<&str>,
    ) -> Result<SyncUploadResult, String> {
        let result = self.upload_profile_with_fallback_inner(profile_id, header_token).await;
        if let Err(ref e) = result {
            self.emit_ws(WsEvent::ProfileSyncFailed {
                profile_id: profile_id.to_string(),
                error: e.clone(),
            });
        }
        result
    }

    async fn upload_profile_with_fallback_inner(
        &self,
        profile_id: &str,
        header_token: Option<&str>,
    ) -> Result<SyncUploadResult, String> {
        // 1. Obtém o token de acesso válido (ou fallback do cabeçalho)
        let token = self.resolve_token(header_token).await?;
        let user_key = self.get_user_encryption_key(&token).await;

        self.emit_ws(WsEvent::ProfileSyncing {
            profile_id: profile_id.to_string(),
        });

        // 2. Localiza o perfil no disco local
        let profile_dir = self.get_profile_dir(profile_id);
        if !profile_dir.exists() {
            return Err(format!("Perfil '{}' não encontrado localmente em {:?}", profile_id, profile_dir));
        }

        let meta_file = profile_dir.join("metadata.json");
        let local_updated_at = if let Ok(c) = std::fs::read_to_string(&meta_file) {
            serde_json::from_str::<serde_json::Value>(&c)
                .ok()
                .and_then(|v| v.get("updated_at").and_then(|u| u.as_i64()))
                .unwrap_or_else(|| chrono::Utc::now().timestamp())
        } else {
            chrono::Utc::now().timestamp()
        };

        // 3. Empacota a cápsula ultra-leve (corta cache, telemetria e extensões pesadas)
        let capsule_zip = filter::pack_profile_capsule(&profile_dir)?;

        // 4. Cifra com Zero-Knowledge E2EE (AES-256-GCM)
        let encrypted_blob = crypto::encrypt_capsule(&capsule_zip, &user_key)?;
        let size_bytes = encrypted_blob.len();
        let size_kb = size_bytes / 1024;

        // 5. Solicita a URL pré-assinada de upload ao NestJS com updated-at nos metadados
        let presign_url = format!("{}/v1/objects/presign-upload", self.cloud_api_url);
        let object_key = format!("profiles/{}.enc", profile_id);

        let mut meta = std::collections::HashMap::new();
        meta.insert("updated-at".to_string(), local_updated_at.to_string());

        let payload = serde_json::json!({
            "key": object_key,
            "contentType": "application/octet-stream",
            "expiresIn": 300,
            "metadata": meta
        });

        let resp = self
            .http_client
            .post(&presign_url)
            .bearer_auth(&token)
            .json(&payload)
            .send()
            .await
            .map_err(|e| format!("Falha de comunicação com o servidor de sincronização: {}", e))?;

        if !resp.status().is_success() {
            let err_text = resp.text().await.unwrap_or_default();
            return Err(format!("Erro ao gerar URL de upload: {}", err_text));
        }

        #[derive(Deserialize)]
        struct PresignResponse {
            url: String,
        }

        let presign_data: PresignResponse = resp
            .json()
            .await
            .map_err(|e| format!("Erro ao decodificar URL pré-assinada: {}", e))?;

        // 6. Envia o blob binário cifrado diretamente ao S3 / MinIO via HTTP PUT
        let upload_builder = self
            .http_client
            .put(&presign_data.url)
            .header("Content-Type", "application/octet-stream")
            .header("Content-Length", size_bytes.to_string())
            .header("x-amz-meta-updated-at", local_updated_at.to_string());

        let upload_resp = upload_builder
            .body(encrypted_blob)
            .send()
            .await
            .map_err(|e| format!("Falha ao enviar arquivo para o armazenamento: {}", e))?;

        if !upload_resp.status().is_success() {
            let status = upload_resp.status();
            let text = upload_resp.text().await.unwrap_or_default();
            error!("Erro no upload: status {} - {}", status, text);
            return Err(format!("Falha no envio para o servidor: status {}", status));
        }

        self.emit_ws(WsEvent::ProfileSynced {
            profile_id: profile_id.to_string(),
            size_kb,
        });

        info!("☁️ Perfil '{}' sincronizado na nuvem com E2EE com sucesso! ({} KB)", profile_id, size_kb);

        Ok(SyncUploadResult {
            profile_id: profile_id.to_string(),
            size_bytes,
            size_kb,
            synced_at: chrono::Utc::now().to_rfc3339(),
            status: "synced".to_string(),
        })
    }

    /// Faz o download da cápsula cifrada da nuvem, decifra com AES-256-GCM e restaura os cookies/storage no diretório local
    #[allow(dead_code)]
    pub async fn download_profile(&self, profile_id: &str) -> Result<(), String> {
        self.download_profile_with_fallback(profile_id, None).await
    }

    /// Download com suporte a token de fallback do cabeçalho
    pub async fn download_profile_with_fallback(
        &self,
        profile_id: &str,
        header_token: Option<&str>,
    ) -> Result<(), String> {
        let token = self.resolve_token(header_token).await?;
        let user_key = self.get_user_encryption_key(&token).await;

        self.emit_ws(WsEvent::ProfileSyncing {
            profile_id: profile_id.to_string(),
        });

        // 1. Download seguro e resiliente através do módulo CloudDownloader
        let encrypted_bytes = self.downloader.fetch_capsule(profile_id, &token).await?;
        let size_kb = encrypted_bytes.len() / 1024;

        // 2. Decriptação E2EE e restauração atômica pelo módulo ProfileDecryptor
        let target_dir = self.get_profile_dir(profile_id);
        ProfileDecryptor::decrypt_and_restore(&encrypted_bytes, &user_key, &target_dir)?;

        self.emit_ws(WsEvent::ProfileSynced {
            profile_id: profile_id.to_string(),
            size_kb,
        });

        info!("📥 Perfil '{}' baixado, decifrado e verificado com sucesso!", profile_id);
        Ok(())
    }

    /// Consulta o estado da cápsula na nuvem (se existe, tamanho e data)
    #[allow(dead_code)]
    pub async fn stat_profile(&self, profile_id: &str) -> Result<ProfileCloudStat, String> {
        self.stat_profile_with_fallback(profile_id, None).await
    }

    /// Consulta o estado da cápsula na nuvem com fallback para token do cabeçalho
    pub async fn stat_profile_with_fallback(
        &self,
        profile_id: &str,
        header_token: Option<&str>,
    ) -> Result<ProfileCloudStat, String> {
        let token = self.resolve_token(header_token).await?;
        let stat_url = format!("{}/v1/objects/stat", self.cloud_api_url);
        let object_key = format!("profiles/{}.enc", profile_id);

        let payload = serde_json::json!({
            "key": object_key
        });

        let resp = self
            .http_client
            .post(&stat_url)
            .bearer_auth(&token)
            .json(&payload)
            .send()
            .await
            .map_err(|e| format!("Falha ao consultar stat na nuvem: {}", e))?;

        if !resp.status().is_success() {
            return Ok(ProfileCloudStat {
                exists: boolean_or_bool::BooleanOrBool(false),
                size: None,
                last_modified: None,
                metadata: None,
            });
        }

        #[derive(Deserialize)]
        struct StatResponse {
            exists: bool,
            size: Option<usize>,
            #[serde(rename = "lastModified")]
            last_modified: Option<String>,
            metadata: Option<std::collections::HashMap<String, String>>,
        }

        let data: StatResponse = resp
            .json()
            .await
            .map_err(|e| format!("Erro ao decodificar stat: {}", e))?;

        Ok(ProfileCloudStat {
            exists: boolean_or_bool::BooleanOrBool(data.exists),
            size: data.size,
            last_modified: data.last_modified,
            metadata: data.metadata,
        })
    }

    /// Puxa todos os perfis do usuário presentes na nuvem, descriptografa e restaura localmente
    #[allow(dead_code)]
    pub async fn pull_all_profiles(&self, force: bool) -> Result<PullProfilesResult, String> {
        self.pull_all_profiles_with_fallback(None, force).await
    }

    /// Puxa todos os perfis com suporte ao token do cabeçalho de requisição
    pub async fn pull_all_profiles_with_fallback(
        &self,
        header_token: Option<&str>,
        force: bool,
    ) -> Result<PullProfilesResult, String> {
        let token = self.resolve_token(header_token).await?;
        let user_key = self.get_user_encryption_key(&token).await;

        // 1. Consulta a lista remota de cápsulas usando o CloudDownloader
        let remote_capsules = self.downloader.list_remote_capsules(&token).await?;

        let mut details = Vec::new();
        let mut downloaded_count = 0;
        let mut existing_count = 0;
        let mut failed_count = 0;

        for capsule in remote_capsules {
            let profile_id = &capsule.profile_id;
            let profile_dir = self.get_profile_dir(profile_id);
            let meta_file = profile_dir.join("metadata.json");

            if meta_file.exists() && !force {
                existing_count += 1;
                details.push(PulledProfileDetail {
                    id: profile_id.clone(),
                    status: "already_exists".to_string(),
                    size_bytes: capsule.size_bytes,
                    error: None,
                });
                continue;
            }

            self.emit_ws(WsEvent::ProfileSyncing {
                profile_id: profile_id.clone(),
            });

            // 2. Baixa via CloudDownloader e Descriptografa/Restaura atômica via ProfileDecryptor
            match self.downloader.fetch_capsule(profile_id, &token).await {
                Ok(encrypted_bytes) => {
                    let size_kb = encrypted_bytes.len() / 1024;
                    match ProfileDecryptor::decrypt_and_restore(&encrypted_bytes, &user_key, &profile_dir) {
                        Ok(_) => {
                            downloaded_count += 1;
                            self.emit_ws(WsEvent::ProfileSynced {
                                profile_id: profile_id.clone(),
                                size_kb,
                            });
                            details.push(PulledProfileDetail {
                                id: profile_id.clone(),
                                status: "downloaded".to_string(),
                                size_bytes: capsule.size_bytes,
                                error: None,
                            });
                        }
                        Err(e) => {
                            error!("❌ Falha ao decifrar cápsula do perfil '{}': {}", profile_id, e);
                            failed_count += 1;
                            details.push(PulledProfileDetail {
                                id: profile_id.clone(),
                                status: "failed".to_string(),
                                size_bytes: capsule.size_bytes,
                                error: Some(format!("Erro na decriptação: {}", e)),
                            });
                        }
                    }
                }
                Err(e) => {
                    error!("❌ Falha ao baixar cápsula do perfil '{}': {}", profile_id, e);
                    failed_count += 1;
                    details.push(PulledProfileDetail {
                        id: profile_id.clone(),
                        status: "failed".to_string(),
                        size_bytes: capsule.size_bytes,
                        error: Some(format!("Erro no download: {}", e)),
                    });
                }
            }
        }

        info!(
            "☁️ Sincronização concluída: {} remotos, {} baixados e decifrados, {} já existentes, {} falhas.",
            details.len(),
            downloaded_count,
            existing_count,
            failed_count
        );

        Ok(PullProfilesResult {
            total_remote: details.len(),
            downloaded_count,
            existing_count,
            failed_count,
            profiles: details,
        })
    }

    /// Lista os perfis locais ativos no diretório local e seus respectivos timestamps de atualização
    pub fn list_local_profiles(&self) -> Vec<(String, i64)> {
        let profiles_dir = if self.data_dir.ends_with("profiles") {
            self.data_dir.clone()
        } else {
            self.data_dir.join("profiles")
        };

        let mut res = Vec::new();
        if let Ok(entries) = std::fs::read_dir(&profiles_dir) {
            for entry in entries.flatten() {
                if let Ok(ft) = entry.file_type() {
                    if ft.is_dir() {
                        let id = entry.file_name().to_string_lossy().to_string();
                        // Ignora diretórios de backup (.bak) ou ocultos
                        if id.ends_with(".bak") || id.starts_with('.') {
                            continue;
                        }
                        let meta_path = entry.path().join("metadata.json");
                        let updated_at = if let Ok(content) = std::fs::read_to_string(&meta_path) {
                            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
                                if val.get("is_deleted").and_then(|b| b.as_bool()).unwrap_or(false) {
                                    continue;
                                }
                                val.get("updated_at")
                                    .and_then(|u| u.as_i64())
                                    .unwrap_or(0)
                            } else {
                                0
                            }
                        } else {
                            0
                        };
                        res.push((id, updated_at));
                    }
                }
            }
        }
        res
    }

    /// Resolve o timestamp de modificação da cápsula remota (prioriza updated-at nos metadados S3, fallback lastModified)
    async fn resolve_remote_timestamp(
        &self,
        profile_id: &str,
        capsule: &crate::cloud_sync::downloader::RemoteCapsuleInfo,
        token: &str,
    ) -> i64 {
        if let Ok(stat) = self.stat_profile_with_fallback(profile_id, Some(token)).await {
            if let Some(meta) = &stat.metadata {
                if let Some(v) = meta.get("updated-at").and_then(|s| s.parse::<i64>().ok()) {
                    return v;
                }
            }
            if let Some(lm) = &stat.last_modified {
                if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(lm) {
                    return dt.timestamp();
                }
            }
        }
        if let Some(lm) = &capsule.last_modified {
            if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(lm) {
                return dt.timestamp();
            }
        }
        0
    }

    /// Executa a Dupla Troca completa no Login (Padrão Donut Browser)
    pub async fn two_way_sync(
        &self,
        header_token: Option<&str>,
        force: bool,
    ) -> Result<TwoWaySyncSummary, String> {
        let token = self.resolve_token(header_token).await?;
        let user_key = self.get_user_encryption_key(&token).await;

        // 1. Obtém lista de cápsulas remotas na nuvem
        let remote_capsules = self.downloader.list_remote_capsules(&token).await?;
        let remote_map: std::collections::HashMap<String, &crate::cloud_sync::downloader::RemoteCapsuleInfo> =
            remote_capsules.iter().map(|c| (c.profile_id.clone(), c)).collect();

        // 2. Obtém lista de perfis locais com seus timestamps
        let local_profiles = self.list_local_profiles();
        let local_map: std::collections::HashMap<String, i64> =
            local_profiles.into_iter().collect();

        let mut details = Vec::new();
        let mut downloaded_count = 0;
        let mut uploaded_count = 0;
        let mut skipped_running = 0;
        let mut in_sync_count = 0;
        let mut failed_count = 0;

        info!(
            "🔄 Iniciando Dupla Troca: {} perfis remotos na nuvem, {} perfis locais",
            remote_map.len(),
            local_map.len()
        );

        // =========================================================================
        // ETAPA 1: Baixar perfis ausentes na máquina local (Nuvem -> Local)
        // =========================================================================
        for (remote_id, _capsule) in &remote_map {
            if !local_map.contains_key(remote_id) {
                // Perfil existe na nuvem mas NÃO existe localmente -> Baixar e Restaurar
                self.emit_ws(WsEvent::ProfileSyncing {
                    profile_id: (*remote_id).clone(),
                });

                let profile_dir = self.get_profile_dir(remote_id);
                match self.downloader.fetch_capsule(remote_id, &token).await {
                    Ok(encrypted_bytes) => {
                        let size_kb = encrypted_bytes.len() / 1024;
                        match ProfileDecryptor::decrypt_and_restore(&encrypted_bytes, &user_key, &profile_dir) {
                            Ok(_) => {
                                info!("📥 [Dupla Troca] Perfil ausente '{}' baixado e restaurado com sucesso! ({} KB)", remote_id, size_kb);
                                downloaded_count += 1;
                                self.emit_ws(WsEvent::ProfileSynced {
                                    profile_id: (*remote_id).clone(),
                                    size_kb,
                                });
                                details.push(SyncProfileDetail {
                                    id: (*remote_id).clone(),
                                    action: "downloaded".to_string(),
                                    size_kb,
                                    reason: Some("Perfil ausente baixado da nuvem".to_string()),
                                });
                            }
                            Err(e) => {
                                error!("❌ [Dupla Troca] Falha ao decifrar perfil '{}': {}", remote_id, e);
                                failed_count += 1;
                                details.push(SyncProfileDetail {
                                    id: (*remote_id).clone(),
                                    action: "failed".to_string(),
                                    size_kb: 0,
                                    reason: Some(format!("Falha na decriptação: {}", e)),
                                });
                            }
                        }
                    }
                    Err(e) => {
                        error!("❌ [Dupla Troca] Falha no download do perfil '{}': {}", remote_id, e);
                        failed_count += 1;
                        details.push(SyncProfileDetail {
                            id: (*remote_id).clone(),
                            action: "failed".to_string(),
                            size_kb: 0,
                            reason: Some(format!("Falha no download: {}", e)),
                        });
                    }
                }
            }
        }

        // =========================================================================
        // ETAPA 2: Reconciliação LWW e Upload dos perfis locais existentes
        // =========================================================================
        for (local_id, local_updated_at) in &local_map {
            // Regra Primária de Integridade (Donut Browser): Se o navegador estiver aberto, PULA!
            if self.is_running(local_id) {
                info!("⏸️ [Dupla Troca] Perfil '{}' está em execução no navegador. Sincronização ignorada temporariamente (AutoSync cuidará ao fechar).", local_id);
                skipped_running += 1;
                details.push(SyncProfileDetail {
                    id: local_id.clone(),
                    action: "skipped_running".to_string(),
                    size_kb: 0,
                    reason: Some("Navegador em execução localmente".to_string()),
                });
                continue;
            }

            match remote_map.get(local_id) {
                None => {
                    // Cenário 2: Perfil criado localmente offline (não existe na nuvem) -> Upload Automático
                    info!("🚀 [Dupla Troca] Perfil novo local '{}' identificado. Enviando para a nuvem...", local_id);
                    match self.upload_profile_with_fallback(local_id, Some(&token)).await {
                        Ok(up) => {
                            uploaded_count += 1;
                            details.push(SyncProfileDetail {
                                id: local_id.clone(),
                                action: "uploaded".to_string(),
                                size_kb: up.size_kb,
                                reason: Some("Perfil local novo enviado para a nuvem".to_string()),
                            });
                        }
                        Err(e) => {
                            error!("❌ [Dupla Troca] Falha ao enviar perfil novo '{}': {}", local_id, e);
                            failed_count += 1;
                            details.push(SyncProfileDetail {
                                id: local_id.clone(),
                                action: "failed".to_string(),
                                size_kb: 0,
                                reason: Some(format!("Falha no upload: {}", e)),
                            });
                        }
                    }
                }
                Some(remote_capsule) => {
                    // Cenário 4, 6, 8: Perfil existe EM AMBOS OS LADOS -> Comparar timestamps LWW
                    let remote_updated_at = self.resolve_remote_timestamp(local_id, remote_capsule, &token).await;

                    let local_ts = *local_updated_at;
                    let remote_ts = remote_updated_at;

                    info!(
                        "⚖️ [Dupla Troca] Perfil '{}': Local TS = {}, Remoto TS = {} (diff = {}s)",
                        local_id,
                        local_ts,
                        remote_ts,
                        (local_ts - remote_ts).abs()
                    );

                    if force || remote_ts > (local_ts + 5) {
                        // Nuvem é mais recente que o local por mais de 5s (ou force=true)
                        info!("📥 [Dupla Troca] Versão na nuvem do perfil '{}' é mais recente (ou force). Fazendo backup (.bak) e baixando...", local_id);

                        let profile_dir = self.get_profile_dir(local_id);
                        let bak_dir = profile_dir.with_extension("bak");

                        // Backup de segurança
                        if bak_dir.exists() {
                            let _ = std::fs::remove_dir_all(&bak_dir);
                        }
                        if profile_dir.exists() {
                            let _ = std::fs::rename(&profile_dir, &bak_dir);
                        }

                        self.emit_ws(WsEvent::ProfileSyncing {
                            profile_id: local_id.clone(),
                        });

                        match self.downloader.fetch_capsule(local_id, &token).await {
                            Ok(encrypted_bytes) => {
                                let size_kb = encrypted_bytes.len() / 1024;
                                match ProfileDecryptor::decrypt_and_restore(&encrypted_bytes, &user_key, &profile_dir) {
                                    Ok(_) => {
                                        info!("✅ [Dupla Troca] Perfil '{}' atualizado com a versão mais recente da nuvem!", local_id);
                                        downloaded_count += 1;
                                        self.emit_ws(WsEvent::ProfileSynced {
                                            profile_id: local_id.clone(),
                                            size_kb,
                                        });
                                        details.push(SyncProfileDetail {
                                            id: local_id.clone(),
                                            action: "downloaded".to_string(),
                                            size_kb,
                                            reason: Some("Atualizado para versão mais recente da nuvem (backup .bak preservado)".to_string()),
                                        });
                                    }
                                    Err(e) => {
                                        error!("❌ [Dupla Troca] Falha ao decifrar nova versão de '{}': {}. Restaurando backup...", local_id, e);
                                        if !profile_dir.exists() && bak_dir.exists() {
                                            let _ = std::fs::rename(&bak_dir, &profile_dir);
                                        }
                                        failed_count += 1;
                                        details.push(SyncProfileDetail {
                                            id: local_id.clone(),
                                            action: "failed".to_string(),
                                            size_kb: 0,
                                            reason: Some(format!("Falha na decriptação: {}", e)),
                                        });
                                    }
                                }
                            }
                            Err(e) => {
                                error!("❌ [Dupla Troca] Falha no download da versão mais recente de '{}': {}. Restaurando backup...", local_id, e);
                                if !profile_dir.exists() && bak_dir.exists() {
                                    let _ = std::fs::rename(&bak_dir, &profile_dir);
                                }
                                failed_count += 1;
                                details.push(SyncProfileDetail {
                                    id: local_id.clone(),
                                    action: "failed".to_string(),
                                    size_kb: 0,
                                    reason: Some(format!("Falha no download: {}", e)),
                                });
                            }
                        }
                    } else if local_ts > (remote_ts + 5) {
                        // Versão local é mais recente que a nuvem por mais de 5s -> Upload Automático
                        info!("🚀 [Dupla Troca] Versão local do perfil '{}' é mais recente que a nuvem. Enviando atualização...", local_id);
                        match self.upload_profile_with_fallback(local_id, Some(&token)).await {
                            Ok(up) => {
                                uploaded_count += 1;
                                details.push(SyncProfileDetail {
                                    id: local_id.clone(),
                                    action: "uploaded".to_string(),
                                    size_kb: up.size_kb,
                                    reason: Some("Versão local mais recente enviada para a nuvem".to_string()),
                                });
                            }
                            Err(e) => {
                                error!("❌ [Dupla Troca] Falha ao enviar versão local mais recente de '{}': {}", local_id, e);
                                failed_count += 1;
                                details.push(SyncProfileDetail {
                                    id: local_id.clone(),
                                    action: "failed".to_string(),
                                    size_kb: 0,
                                    reason: Some(format!("Falha no upload: {}", e)),
                                });
                            }
                        }
                    } else {
                        // Timestamps em sincronia (diferença <= 5s) -> No-op
                        in_sync_count += 1;
                        details.push(SyncProfileDetail {
                            id: local_id.clone(),
                            action: "in_sync".to_string(),
                            size_kb: 0,
                            reason: Some("Já em sincronia".to_string()),
                        });
                    }
                }
            }
        }

        let summary = TwoWaySyncSummary {
            total_remote: remote_map.len(),
            total_local: local_map.len(),
            downloaded_count,
            uploaded_count,
            skipped_running,
            in_sync_count,
            failed_count,
            profiles: details,
        };

        info!(
            "☁️ Dupla Troca finalizada: {} baixados, {} enviados, {} pulados (em execução), {} em sincronia, {} falhas.",
            summary.downloaded_count,
            summary.uploaded_count,
            summary.skipped_running,
            summary.in_sync_count,
            summary.failed_count
        );

        Ok(summary)
    }
}
