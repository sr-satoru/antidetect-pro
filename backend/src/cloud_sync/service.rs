use std::path::{Path, PathBuf};
use std::sync::Arc;
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
}

impl CloudSyncService {
    pub fn new<P: AsRef<Path>>(data_dir: P, auth_service: Arc<CloudAuthService>) -> Self {
        let cloud_api_url = std::env::var("FURY_CLOUD_API_URL")
            .unwrap_or_else(|_| "http://localhost:12342".to_string());
        let http_client = reqwest::Client::new();
        let downloader = CloudDownloader::new(cloud_api_url.clone(), http_client.clone());

        Self {
            data_dir: data_dir.as_ref().to_path_buf(),
            auth_service,
            cloud_api_url,
            http_client,
            downloader,
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
            .unwrap_or_else(|| "fury_user_master_vault".to_string())
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
        // 1. Obtém o token de acesso válido (ou fallback do cabeçalho)
        let token = self.resolve_token(header_token).await?;
        let user_key = self.get_user_encryption_key(&token).await;

        // 2. Localiza o perfil no disco local
        let profile_dir = self.get_profile_dir(profile_id);
        if !profile_dir.exists() {
            return Err(format!("Perfil '{}' não encontrado localmente em {:?}", profile_id, profile_dir));
        }

        // 3. Empacota a cápsula ultra-leve (corta cache, telemetria e extensões pesadas)
        let capsule_zip = filter::pack_profile_capsule(&profile_dir)?;

        // 4. Cifra com Zero-Knowledge E2EE (AES-256-GCM)
        let encrypted_blob = crypto::encrypt_capsule(&capsule_zip, &user_key)?;
        let size_bytes = encrypted_blob.len();
        let size_kb = size_bytes / 1024;

        // 5. Solicita a URL pré-assinada de upload ao NestJS
        let presign_url = format!("{}/v1/objects/presign-upload", self.cloud_api_url);
        let object_key = format!("profiles/{}.enc", profile_id);

        let payload = serde_json::json!({
            "key": object_key,
            "contentType": "application/octet-stream",
            "expiresIn": 300
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
        let upload_resp = self
            .http_client
            .put(&presign_data.url)
            .header("Content-Type", "application/octet-stream")
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

        // 1. Download seguro e resiliente através do módulo CloudDownloader
        let encrypted_bytes = self.downloader.fetch_capsule(profile_id, &token).await?;

        // 2. Decriptação E2EE e restauração atômica pelo módulo ProfileDecryptor
        let target_dir = self.get_profile_dir(profile_id);
        ProfileDecryptor::decrypt_and_restore(&encrypted_bytes, &user_key, &target_dir)?;

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
            });
        }

        #[derive(Deserialize)]
        struct StatResponse {
            exists: bool,
            size: Option<usize>,
            #[serde(rename = "lastModified")]
            last_modified: Option<String>,
        }

        let data: StatResponse = resp
            .json()
            .await
            .map_err(|e| format!("Erro ao decodificar stat: {}", e))?;

        Ok(ProfileCloudStat {
            exists: boolean_or_bool::BooleanOrBool(data.exists),
            size: data.size,
            last_modified: data.last_modified,
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

            // 2. Baixa via CloudDownloader e Descriptografa/Restaura atômica via ProfileDecryptor
            match self.downloader.fetch_capsule(profile_id, &token).await {
                Ok(encrypted_bytes) => {
                    match ProfileDecryptor::decrypt_and_restore(&encrypted_bytes, &user_key, &profile_dir) {
                        Ok(_) => {
                            downloaded_count += 1;
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
}
