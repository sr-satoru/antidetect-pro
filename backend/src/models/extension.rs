use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtensionItem {
    pub id: u64,
    pub name: String,
    #[serde(alias = "icon_type")]
    pub icon_type: Option<String>,
    #[serde(alias = "icon_url")]
    pub icon_url: Option<String>,
    #[serde(alias = "icon_bg")]
    pub icon_bg: Option<String>,
    #[serde(default = "default_true")]
    pub enabled: bool,
    #[serde(default = "default_status_available")]
    pub status: String, // "available" | "disabled"
    #[serde(default)]
    pub description: String,
    #[serde(default = "default_provider")]
    pub provider: String,
    #[serde(alias = "provider_url")]
    pub provider_url: Option<String>,
    #[serde(default = "default_tab_team")]
    pub tab: String, // "team" | "recommended"
    #[serde(default)]
    pub version: Option<String>,
}

fn default_true() -> bool {
    true
}
fn default_status_available() -> String {
    "available".to_string()
}
fn default_provider() -> String {
    "Firefox Add-ons".to_string()
}
fn default_tab_team() -> String {
    "team".to_string()
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateExtensionDto {
    pub id: Option<u64>,
    pub name: Option<String>,
    #[serde(alias = "icon_type")]
    pub icon_type: Option<String>,
    #[serde(alias = "icon_url")]
    pub icon_url: Option<String>,
    #[serde(alias = "icon_bg")]
    pub icon_bg: Option<String>,
    pub enabled: Option<bool>,
    pub status: Option<String>,
    pub description: Option<String>,
    pub provider: Option<String>,
    #[serde(alias = "provider_url")]
    pub provider_url: Option<String>,
    pub tab: Option<String>,
    pub version: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateExtensionDto {
    pub name: Option<String>,
    pub enabled: Option<bool>,
    pub status: Option<String>,
    pub description: Option<String>,
    #[serde(alias = "icon_bg")]
    pub icon_bg: Option<String>,
    pub version: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecommendedExtension {
    pub id: String,
    pub name: String,
    pub category: String,
    pub description: String,
    pub provider: String, // "Firefox Add-ons" | "Chrome Web Store"
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provider_url: Option<String>,
    pub icon_type: String,
    pub icon_bg: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub featured: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtensionCategoryItem {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub extension_ids: Vec<serde_json::Value>,
    #[serde(default)]
    pub extensions: Vec<serde_json::Value>,
    #[serde(default)]
    pub is_default: bool,
    #[serde(default)]
    pub created_at: i64,
    #[serde(default)]
    pub updated_at: i64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateExtensionCategoryDto {
    pub id: Option<String>,
    pub name: String,
    pub description: Option<String>,
    #[serde(default)]
    pub extensions: Vec<serde_json::Value>,
    pub is_default: Option<bool>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateExtensionCategoryDto {
    pub name: Option<String>,
    pub description: Option<String>,
    pub extensions: Option<Vec<serde_json::Value>>,
}
