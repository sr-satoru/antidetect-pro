use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportProfileItem {
    pub id: Option<String>,
    pub name: Option<String>,
    pub group: Option<String>,
    pub notes: Option<String>,
    pub username: Option<String>,
    pub password: Option<String>,
    pub twofa: Option<String>,
    pub kernel: Option<String>,
    pub os: Option<String>,
    pub proxy_type: Option<String>,
    pub proxy_host: Option<String>,
    pub proxy_port: Option<u16>,
    pub proxy_username: Option<String>,
    pub proxy_password: Option<String>,
    pub screen_width: Option<u32>,
    pub screen_height: Option<u32>,
    pub user_agent: Option<String>,
    #[serde(default)]
    pub cookies: Vec<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportBatchDto {
    #[serde(default)]
    pub profiles: Vec<ImportProfileItem>,
    pub raw_text: Option<String>,
    pub default_group: Option<String>,
    pub default_kernel: Option<String>,
    pub default_platform: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportBatchResult {
    pub total: usize,
    pub imported: usize,
    pub failed: usize,
    pub imported_ids: Vec<String>,
    pub errors: Vec<String>,
}
