use serde::{Deserialize, Serialize};

// ==========================================
// DTOs e Estruturas de Dados do Cliente HTTP
// ==========================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloudQuotaInfo {
    pub used: usize,
    pub limit: usize,
    pub available: usize,
    #[serde(default)]
    pub plan: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfileCloudStat {
    pub exists: bool,
    pub size: Option<usize>,
    pub version: Option<i64>,
    pub hash: Option<String>,
    pub last_modified: Option<String>,
}

pub struct DownloadResponse {
    pub not_modified: bool,
    pub bytes: Vec<u8>,
    pub version: i64,
    pub server_id: Option<i64>,
    pub etag: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemoteProfileItem {
    #[serde(default)]
    pub id: Option<serde_json::Value>,
    #[serde(rename = "localProfileId", default)]
    pub local_profile_id: Option<String>,
    pub name: String,
    #[serde(rename = "groupName", default)]
    pub group_name: Option<String>,
    #[serde(default)]
    pub version: Option<i64>,
    #[serde(default)]
    pub hash: Option<String>,
    #[serde(rename = "sizeBytes", default)]
    pub size_bytes: Option<usize>,
    #[serde(rename = "updatedAt", default)]
    pub updated_at: Option<String>,
}

impl RemoteProfileItem {
    pub fn resolve_local_id(&self) -> String {
        if let Some(ref lid) = self.local_profile_id {
            if !lid.trim().is_empty() {
                return lid.trim().to_string();
            }
        }
        if let Some(ref val) = self.id {
            if let Some(s) = val.as_str() {
                return s.trim().to_string();
            }
            if let Some(n) = val.as_i64() {
                return n.to_string();
            }
        }
        String::new()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncUploadResult {
    pub profile_id: String,
    pub size_bytes: usize,
    pub size_kb: usize,
    pub synced_at: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PulledProfileDetail {
    pub id: String,
    pub status: String,
    pub size_bytes: usize,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PullProfilesResult {
    pub total_remote: usize,
    pub downloaded_count: usize,
    pub existing_count: usize,
    pub failed_count: usize,
    pub profiles: Vec<PulledProfileDetail>,
}

// ==========================================
// Funções REST de Comunicação com a Nuvem Java
// ==========================================

/// Consulta a quota e limites do plano no backend Java via GET /api/cloud-sync/quota
pub async fn consultar_quota(
    http_client: &reqwest::Client,
    cloud_url: &str,
    token: &str,
) -> Result<CloudQuotaInfo, String> {
    let url = format!("{}/api/cloud-sync/quota", cloud_url);

    let resp = http_client
        .get(&url)
        .bearer_auth(token)
        .send()
        .await
        .map_err(|e| format!("Falha ao conectar com o serviço de quotas: {e}"))?;

    if !resp.status().is_success() {
        let err_text = resp.text().await.unwrap_or_default();
        return Err(format!("Erro ao consultar quota do usuário na nuvem: {err_text}"));
    }

    resp.json::<CloudQuotaInfo>()
        .await
        .map_err(|e| format!("Erro ao decodificar resposta de quota: {e}"))
}

/// Consulta status de um perfil via GET /api/cloud-sync/profiles/{id}/stat
pub async fn consultar_stat(
    http_client: &reqwest::Client,
    cloud_url: &str,
    token: &str,
    profile_id: &str,
) -> Result<ProfileCloudStat, String> {
    let url = format!("{}/api/cloud-sync/profiles/{}/stat", cloud_url, profile_id);

    let resp = http_client
        .get(&url)
        .bearer_auth(token)
        .send()
        .await
        .map_err(|e| format!("Falha ao consultar status na nuvem: {e}"))?;

    if !resp.status().is_success() {
        return Ok(ProfileCloudStat {
            exists: false,
            size: None,
            version: None,
            hash: None,
            last_modified: None,
        });
    }

    let json = resp.json::<serde_json::Value>().await.unwrap_or_default();
    let exists = json.get("exists").and_then(|v| v.as_bool()).unwrap_or(false);
    let size = json.get("sizeBytes").and_then(|v| v.as_u64()).map(|s| s as usize);
    let version = json.get("version").and_then(|v| v.as_i64());
    let hash = json.get("hash").and_then(|v| v.as_str()).map(String::from);
    let last_modified = json.get("updatedAt").and_then(|v| v.as_str()).map(String::from);

    Ok(ProfileCloudStat {
        exists,
        size,
        version,
        hash,
        last_modified,
    })
}

/// Baixa o perfil da nuvem via GET /api/cloud-sync/profiles/{id}/download com suporte a HTTP 304
pub async fn baixar_arquivo(
    http_client: &reqwest::Client,
    cloud_url: &str,
    token: &str,
    profile_id: &str,
    if_none_match: Option<&str>,
) -> Result<DownloadResponse, String> {
    let url = format!("{}/api/cloud-sync/profiles/{}/download", cloud_url, profile_id);

    let mut req = http_client.get(&url).bearer_auth(token);
    if let Some(h) = if_none_match {
        req = req.header("If-None-Match", h);
    }

    let resp = req
        .send()
        .await
        .map_err(|e| format!("Falha ao conectar para download: {e}"))?;

    if resp.status().as_u16() == 304 {
        return Ok(DownloadResponse {
            not_modified: true,
            bytes: Vec::new(),
            version: 0,
            server_id: None,
            etag: None,
        });
    }

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("Erro ao baixar perfil (status {status}): {text}"));
    }

    let server_id = resp
        .headers()
        .get("x-server-id")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.parse::<i64>().ok());
    let version = resp
        .headers()
        .get("x-profile-version")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.parse::<i64>().ok())
        .unwrap_or(1);
    let etag = resp
        .headers()
        .get(reqwest::header::ETAG)
        .and_then(|v| v.to_str().ok())
        .map(|s| s.replace('"', "").trim().to_string());

    let bytes = resp
        .bytes()
        .await
        .map_err(|e| format!("Erro ao ler bytes da resposta: {e}"))?
        .to_vec();

    Ok(DownloadResponse {
        not_modified: false,
        bytes,
        version,
        server_id,
        etag,
    })
}

/// Consulta lista de perfis salvos na nuvem via GET /api/cloud-sync/profiles
pub async fn listar_remotos(
    http_client: &reqwest::Client,
    cloud_url: &str,
    token: &str,
) -> Result<Vec<RemoteProfileItem>, String> {
    let url = format!("{}/api/cloud-sync/profiles", cloud_url);

    let resp = http_client
        .get(&url)
        .bearer_auth(token)
        .send()
        .await
        .map_err(|e| format!("Falha ao listar perfis da nuvem: {e}"))?;

    if !resp.status().is_success() {
        return Err("Erro ao obter lista de perfis da nuvem".to_string());
    }

    Ok(resp.json::<Vec<RemoteProfileItem>>().await.unwrap_or_default())
}

/// Exclui perfil da nuvem via DELETE /api/cloud-sync/profiles/{id}
pub async fn excluir_remoto(
    http_client: &reqwest::Client,
    cloud_url: &str,
    token: &str,
    profile_id: &str,
) -> Result<(), String> {
    let url = format!("{}/api/cloud-sync/profiles/{}", cloud_url, profile_id);

    let resp = http_client
        .delete(&url)
        .bearer_auth(token)
        .send()
        .await
        .map_err(|e| format!("Falha ao excluir perfil na nuvem: {e}"))?;

    if !resp.status().is_success() {
        let text = resp.text().await.unwrap_or_default();
        return Err(format!("Erro ao excluir da nuvem: {text}"));
    }

    Ok(())
}
