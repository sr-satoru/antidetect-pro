use std::time::Duration;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use tracing::{info, warn};

/// Opções de configuração para o download seguro de cápsulas da nuvem
#[derive(Debug, Clone)]
pub struct DownloadOptions {
    /// Tamanho máximo permitido em bytes (Prevenção contra DoS / esgotamento de memória)
    pub max_size_bytes: usize,
    /// Timeout por requisição HTTP
    pub timeout: Duration,
    /// Quantidade máxima de tentativas em caso de erro transitório de rede
    pub max_retries: usize,
}

impl Default for DownloadOptions {
    fn default() -> Self {
        Self {
            max_size_bytes: 100 * 1024 * 1024, // 100 MB máximo por cápsula
            timeout: Duration::from_secs(30),
            max_retries: 3,
        }
    }
}

/// Metadados de um perfil remoto listado no bucket/storage
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemoteCapsuleInfo {
    pub key: String,
    pub profile_id: String,
    pub size_bytes: usize,
    pub last_modified: Option<String>,
}

/// Módulo dedicado exclusivamente ao download seguro de perfis na nuvem
#[derive(Clone)]
pub struct CloudDownloader {
    cloud_api_url: String,
    http_client: Client,
    options: DownloadOptions,
}

impl CloudDownloader {
    pub fn new(cloud_api_url: String, http_client: Client) -> Self {
        Self {
            cloud_api_url,
            http_client,
            options: DownloadOptions::default(),
        }
    }

    #[allow(dead_code)]
    pub fn with_options(mut self, options: DownloadOptions) -> Self {
        self.options = options;
        self
    }

    /// Lista todas as cápsulas remotas pertencentes ao usuário no servidor
    pub async fn list_remote_capsules(&self, token: &str) -> Result<Vec<RemoteCapsuleInfo>, String> {
        let list_url = format!("{}/v1/objects/list", self.cloud_api_url);
        let payload = serde_json::json!({
            "prefix": "profiles/",
            "maxKeys": 1000
        });

        let resp = self
            .http_client
            .post(&list_url)
            .bearer_auth(token)
            .timeout(self.options.timeout)
            .json(&payload)
            .send()
            .await
            .map_err(|e| format!("Falha de conexão ao listar cápsulas na nuvem: {}", e))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let err_text = resp.text().await.unwrap_or_default();
            return Err(format!("Erro da nuvem ao listar objetos (status {}): {}", status, err_text));
        }

        #[derive(Deserialize)]
        struct ListObjectsResponse {
            objects: Vec<RemoteItem>,
        }

        #[derive(Deserialize)]
        struct RemoteItem {
            key: String,
            size: usize,
            #[serde(rename = "lastModified")]
            last_modified: Option<String>,
        }

        let data: ListObjectsResponse = resp
            .json()
            .await
            .map_err(|e| format!("Erro ao decodificar listagem de perfis da nuvem: {}", e))?;

        let mut results = Vec::new();
        for item in data.objects {
            // Espera chaves no formato "profiles/{profile_id}.enc"
            let profile_id = if let Some(stripped) = item.key.strip_prefix("profiles/") {
                stripped.strip_suffix(".enc").unwrap_or(stripped).to_string()
            } else if let Some(stripped) = item.key.strip_suffix(".enc") {
                stripped.to_string()
            } else {
                continue;
            };

            if profile_id.is_empty() {
                continue;
            }

            results.push(RemoteCapsuleInfo {
                key: item.key,
                profile_id,
                size_bytes: item.size,
                last_modified: item.last_modified,
            });
        }

        info!("📋 CloudDownloader: {} cápsulas remotas identificadas na nuvem", results.len());
        Ok(results)
    }

    /// Solicita ao servidor NestJS uma URL pré-assinada para download
    pub async fn request_presigned_download_url(
        &self,
        profile_id: &str,
        token: &str,
    ) -> Result<String, String> {
        let presign_url = format!("{}/v1/objects/presign-download", self.cloud_api_url);
        let object_key = format!("profiles/{}.enc", profile_id);

        let payload = serde_json::json!({
            "key": object_key,
            "expiresIn": 300
        });

        let resp = self
            .http_client
            .post(&presign_url)
            .bearer_auth(token)
            .timeout(self.options.timeout)
            .json(&payload)
            .send()
            .await
            .map_err(|e| format!("Falha ao solicitar URL de download para '{}': {}", profile_id, e))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let err_text = resp.text().await.unwrap_or_default();
            return Err(format!("Erro ao gerar URL de download (status {}): {}", status, err_text));
        }

        #[derive(Deserialize)]
        struct PresignResponse {
            url: String,
        }

        let presign_data: PresignResponse = resp
            .json()
            .await
            .map_err(|e| format!("Resposta inválida do endpoint de presign: {}", e))?;

        Ok(presign_data.url)
    }

    /// Baixa os bytes brutos da cápsula cifrada (.enc) aplicando retries e proteção contra DoS
    pub async fn download_blob(&self, download_url: &str) -> Result<Vec<u8>, String> {
        let mut last_err = String::new();

        for attempt in 1..=self.options.max_retries {
            match self.execute_single_download(download_url).await {
                Ok(bytes) => return Ok(bytes),
                Err(err) => {
                    warn!(
                        "⚠️ Tentativa {}/{} de download falhou: {}. Tentando novamente...",
                        attempt, self.options.max_retries, err
                    );
                    last_err = err;
                    if attempt < self.options.max_retries {
                        let delay_ms = 500 * (1 << (attempt - 1));
                        tokio::time::sleep(Duration::from_millis(delay_ms)).await;
                    }
                }
            }
        }

        Err(format!(
            "Download falhou após {} tentativas. Último erro: {}",
            self.options.max_retries, last_err
        ))
    }

    /// Executa uma única requisição de download com validação de cabeçalhos e limites de tamanho
    async fn execute_single_download(&self, download_url: &str) -> Result<Vec<u8>, String> {
        let resp = self
            .http_client
            .get(download_url)
            .timeout(self.options.timeout)
            .send()
            .await
            .map_err(|e| format!("Erro de rede ao baixar cápsula: {}", e))?;

        if !resp.status().is_success() {
            return Err(format!("Status HTTP inválido no download: {}", resp.status()));
        }

        // Validação preventiva do Content-Length
        if let Some(content_length) = resp.content_length() {
            if content_length as usize > self.options.max_size_bytes {
                return Err(format!(
                    "Cápsula excede o tamanho máximo permitido ({} MB > {} MB)",
                    content_length / (1024 * 1024),
                    self.options.max_size_bytes / (1024 * 1024)
                ));
            }
        }

        let bytes = resp
            .bytes()
            .await
            .map_err(|e| format!("Erro ao receber fluxo de dados da cápsula: {}", e))?;

        if bytes.len() > self.options.max_size_bytes {
            return Err(format!(
                "Tamanho do payload recebido excedeu o limite máximo ({} bytes)",
                bytes.len()
            ));
        }

        Ok(bytes.to_vec())
    }

    /// Método unificado: Obtém a URL e baixa a cápsula cifrada completa de um perfil
    pub async fn fetch_capsule(&self, profile_id: &str, token: &str) -> Result<Vec<u8>, String> {
        let url = self.request_presigned_download_url(profile_id, token).await?;
        let bytes = self.download_blob(&url).await?;
        info!("📥 CloudDownloader: Cápsula cifrada do perfil '{}' baixada com sucesso ({} KB)", profile_id, bytes.len() / 1024);
        Ok(bytes)
    }
}
