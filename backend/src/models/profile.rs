use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfileProxyConfig {
    #[serde(default = "default_proxy_mode")]
    pub mode: String, // "custom" | "saved" | "none"
    #[serde(rename = "type", default = "default_proxy_type")]
    pub proxy_type: String, // "none" | "http" | "https" | "socks5"
    pub host: Option<String>,
    pub port: Option<u16>,
    pub username: Option<String>,
    pub password: Option<String>,
    pub rotation_url: Option<String>,
    pub ip_checker: Option<String>,
    #[serde(default = "default_true")]
    pub socks_remote_dns: bool,
}

fn default_proxy_mode() -> String {
    "custom".to_string()
}
fn default_proxy_type() -> String {
    "none".to_string()
}
fn default_true() -> bool {
    true
}

impl Default for ProfileProxyConfig {
    fn default() -> Self {
        Self {
            mode: "custom".to_string(),
            proxy_type: "none".to_string(),
            host: None,
            port: None,
            username: None,
            password: None,
            rotation_url: None,
            ip_checker: Some("IP2Location".to_string()),
            socks_remote_dns: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct TagRef {
    #[serde(default)]
    pub id: i64,
    pub name: String,
    #[serde(default = "default_tag_color")]
    pub color: String,
}

fn default_tag_color() -> String {
    "#1677FF".to_string()
}

fn deserialize_tags<'de, D>(deserializer: D) -> Result<Vec<TagRef>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    use serde::de::Deserialize;
    let value = serde_json::Value::deserialize(deserializer)?;
    match value {
        serde_json::Value::Array(arr) => {
            let mut result = Vec::new();
            for item in arr {
                if let Ok(tag_ref) = serde_json::from_value::<TagRef>(item.clone()) {
                    result.push(tag_ref);
                } else if let Some(s) = item.as_str() {
                    result.push(TagRef {
                        id: 0,
                        name: s.to_string(),
                        color: default_tag_color(),
                    });
                }
            }
            Ok(result)
        }
        _ => Ok(Vec::new()),
    }
}

/// Metadados e dados completos do Perfil
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Profile {
    pub id: String, // UUID v4
    pub name: String,
    #[serde(default = "default_group")]
    pub group: String,
    #[serde(default, deserialize_with = "deserialize_tags")]
    pub tags: Vec<TagRef>,
    #[serde(default)]
    pub notes: String,
    #[serde(default = "default_status")]
    pub status: String, // "ready" | "running" | "error"

    #[serde(default = "default_kernel")]
    pub kernel: String, // "FlowerBrowser" (Camoufox) | "SunBrowser"
    #[serde(default = "default_kernel_version")]
    pub browser_version: String,
    #[serde(default = "default_os")]
    pub os: String, // "windows" | "macos" | "linux"

    // Timestamps em segundos Unix para Last-Write-Wins (LWW)
    pub created_at: i64,
    pub updated_at: i64,
    pub last_launch: Option<i64>,

    // Controle de lixeira (Soft Delete)
    #[serde(default)]
    pub is_deleted: bool,
    pub deleted_at: Option<i64>,

    // Configuração de Proxy
    #[serde(default)]
    pub proxy: ProfileProxyConfig,

    // Impressão digital bruta / estruturada do Camoufox
    #[serde(default = "default_json_obj")]
    pub fingerprint_json: serde_json::Value,

    // Configuração de Extensões vinculadas ao perfil
    #[serde(default)]
    pub extension_mode: Option<String>,
    #[serde(default)]
    pub extension_category: Option<String>,
    #[serde(default)]
    pub extensions: Option<serde_json::Value>,
}

fn default_group() -> String {
    "Desagrupado".to_string()
}
fn default_status() -> String {
    "ready".to_string()
}
fn default_kernel() -> String {
    "FlowerBrowser".to_string()
}
fn default_kernel_version() -> String {
    "150".to_string()
}
fn default_os() -> String {
    "windows".to_string()
}
fn default_json_obj() -> serde_json::Value {
    serde_json::json!({})
}

/// DTO recebido do frontend na criação do perfil
#[derive(Debug, Clone, Deserialize)]
pub struct CreateProfileDto {
    pub id: Option<String>,
    pub name: Option<String>,
    pub group: Option<String>,
    pub tags: Option<Vec<String>>,
    pub tag_ids: Option<Vec<i64>>,
    pub notes: Option<String>,
    pub status: Option<String>,
    pub kernel: Option<String>,
    pub browser_version: Option<String>,
    pub os: Option<String>,

    pub proxy_type: Option<String>,
    pub proxy_host: Option<String>,
    pub proxy_port: Option<u16>,
    pub proxy_username: Option<String>,
    pub proxy_password: Option<String>,

    pub fingerprint_json: Option<serde_json::Value>,

    pub extension_mode: Option<String>,
    pub extension_category: Option<String>,
    pub extensions: Option<serde_json::Value>,
}

/// DTO para atualização de perfil
#[derive(Debug, Clone, Deserialize)]
pub struct UpdateProfileDto {
    pub name: Option<String>,
    pub group: Option<String>,
    pub tags: Option<Vec<String>>,
    pub tag_ids: Option<Vec<i64>>,
    pub notes: Option<String>,
    pub status: Option<String>,
    pub kernel: Option<String>,
    pub browser_version: Option<String>,
    pub os: Option<String>,

    pub proxy_type: Option<String>,
    pub proxy_host: Option<String>,
    pub proxy_port: Option<u16>,
    pub proxy_username: Option<String>,
    pub proxy_password: Option<String>,

    pub fingerprint_json: Option<serde_json::Value>,

    pub extension_mode: Option<String>,
    pub extension_category: Option<String>,
    pub extensions: Option<serde_json::Value>,
}
