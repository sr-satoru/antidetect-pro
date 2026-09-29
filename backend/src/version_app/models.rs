use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppVersionInfo {
    pub current_version: String,
    pub latest_version: String,
    pub tag_name: String,
    pub name: String,
    pub body: String,
    pub published_at: String,
    pub html_url: String,
    pub has_update: bool,
    pub download_url: Option<String>,
    pub asset_name: Option<String>,
    pub asset_size: Option<usize>,
    pub platform: String,
    pub arch: String,
}

#[derive(Debug, Deserialize)]
pub struct CheckUpdateQuery {
    pub current_version: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct StartDownloadRequest {
    pub download_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GenericResponse {
    pub success: bool,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppUpdateStatus {
    pub is_downloading: bool,
    pub stage: String,
    pub progress: f32,
    pub speed_mb_s: f32,
    pub eta_seconds: u64,
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
    pub error: Option<String>,
    pub ready_to_restart: bool,
}

/// DTOs internos para decodificar a resposta da API do GitHub Releases
#[derive(Debug, Deserialize)]
pub struct GitHubRelease {
    pub tag_name: Option<String>,
    pub name: Option<String>,
    pub body: Option<String>,
    pub published_at: Option<String>,
    pub html_url: Option<String>,
    pub draft: Option<bool>,
    pub prerelease: Option<bool>,
    #[serde(default)]
    pub assets: Vec<GitHubAsset>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct GitHubAsset {
    pub name: Option<String>,
    pub browser_download_url: Option<String>,
    pub size: Option<usize>,
}

#[derive(Debug, Deserialize)]
pub struct GitHubTag {
    pub name: String,
}
