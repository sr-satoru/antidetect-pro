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
    pub platform: String,
    pub arch: String,
}

#[derive(Debug, Deserialize)]
pub struct CheckUpdateQuery {
    pub current_version: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct OpenUrlRequest {
    pub url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GenericResponse {
    pub success: bool,
    pub message: String,
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

#[derive(Debug, Deserialize)]
pub struct GitHubAsset {
    pub name: Option<String>,
    pub browser_download_url: Option<String>,
    pub size: Option<usize>,
}

#[derive(Debug, Deserialize)]
pub struct GitHubTag {
    pub name: String,
}
