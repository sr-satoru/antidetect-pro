use std::path::{Path, PathBuf};
use std::sync::Arc;
use base64::Engine;
use serde::{Deserialize, Serialize};
use tracing::{error, info};

use crate::cloud_auth::CloudAuthService;
use crate::cloud_sync::{crypto, filter};

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
}

impl CloudSyncService {
    pub fn new<P: AsRef<Path>>(data_dir: P, auth_service: Arc<CloudAuthService>) -> Self {
        let cloud_api_url = std::env::var("FURY_CLOUD_API_URL")
            .unwrap_or_else(|_| "http://localhost:12342".to_string());

        Self {
            data_dir: data_dir.as_ref().to_path_buf(),
            auth_service,
            cloud_api_url,
            http_client: reqwest::Client::new(),
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

    /// Faz o upload de um perfil para o S3 com cápsula filtrada (< 1 MB), cifrada com E2EE (AES-256-GCM)
    pub async fn upload_profile(&self, profile_id: &str) -> Result<SyncUploadResult, String> {
        // 1. Obtém o token de acesso válido (renovado silenciosamente se expirou)
        let token = self.auth_service.get_valid_access_token().await?;
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
            .map_err(|e| format!("Falha ao enviar arquivo para o armazenamento S3: {}", e))?;

        if !upload_resp.status().is_success() {
            let status = upload_resp.status();
            let text = upload_resp.text().await.unwrap_or_default();
            error!("Erro no upload S3: status {} - {}", status, text);
            return Err(format!("Falha no envio para o S3: status {}", status));
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
    pub async fn download_profile(&self, profile_id: &str) -> Result<(), String> {
        let token = self.auth_service.get_valid_access_token().await?;
        let user_key = self.get_user_encryption_key(&token).await;

        let presign_url = format!("{}/v1/objects/presign-download", self.cloud_api_url);
        let object_key = format!("profiles/{}.enc", profile_id);

        let payload = serde_json::json!({
            "key": object_key,
            "expiresIn": 300
        });

        let resp = self
            .http_client
            .post(&presign_url)
            .bearer_auth(&token)
            .json(&payload)
            .send()
            .await
            .map_err(|e| format!("Falha de comunicação ao solicitar download: {}", e))?;

        if !resp.status().is_success() {
            let err_text = resp.text().await.unwrap_or_default();
            return Err(format!("Erro ao gerar URL de download: {}", err_text));
        }

        #[derive(Deserialize)]
        struct PresignResponse {
            url: String,
        }

        let presign_data: PresignResponse = resp
            .json()
            .await
            .map_err(|e| format!("Erro ao processar resposta de download: {}", e))?;

        // 1. Baixa os bytes cifrados (.enc) do S3
        let dl_resp = self
            .http_client
            .get(&presign_data.url)
            .send()
            .await
            .map_err(|e| format!("Falha ao baixar cápsula do S3: {}", e))?;

        if !dl_resp.status().is_success() {
            return Err(format!("Falha no download da cápsula: status {}", dl_resp.status()));
        }

        let encrypted_bytes = dl_resp
            .bytes()
            .await
            .map_err(|e| format!("Erro ao receber bytes da cápsula: {}", e))?;

        // 2. Decifra a cápsula E2EE com a chave do usuário
        let capsule_zip = crypto::decrypt_capsule(&encrypted_bytes, &user_key)?;

        // 3. Descompacta na pasta do perfil local
        let target_dir = self.get_profile_dir(profile_id);
        filter::unpack_profile_capsule(&capsule_zip, &target_dir)?;

        info!("📥 Perfil '{}' restaurado da nuvem e decifrado com sucesso!", profile_id);
        Ok(())
    }

    /// Consulta o estado da cápsula na nuvem (se existe, tamanho e data)
    pub async fn stat_profile(&self, profile_id: &str) -> Result<ProfileCloudStat, String> {
        let token = self.auth_service.get_valid_access_token().await?;
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
}
