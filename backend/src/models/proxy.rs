use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyItem {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub proxy_type: String,
    pub host: String,
    pub port: String,
    #[serde(default)]
    pub user: String,
    #[serde(default)]
    pub pass: String,
    #[serde(default)]
    pub ip: String,
    #[serde(default = "default_country")]
    pub country: String,
    #[serde(default = "default_status")]
    pub status: String,
    pub created_at: i64,
}

fn default_country() -> String {
    "BR - Brasil".to_string()
}
fn default_status() -> String {
    "active".to_string()
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateProxyDto {
    pub name: Option<String>,
    #[serde(rename = "type")]
    pub proxy_type: Option<String>,
    pub host: String,
    pub port: serde_json::Value,
    pub username: Option<String>,
    pub user: Option<String>,
    pub password: Option<String>,
    pub pass: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct TestProxyDto {
    #[serde(rename = "type")]
    pub proxy_type: Option<String>,
    pub host: String,
    pub port: serde_json::Value,
    pub username: Option<String>,
    pub user: Option<String>,
    pub password: Option<String>,
    pub pass: Option<String>,
}

impl TestProxyDto {
    pub fn get_username(&self) -> Option<&str> {
        self.username
            .as_deref()
            .or(self.user.as_deref())
            .filter(|s| !s.trim().is_empty())
    }

    pub fn get_password(&self) -> Option<&str> {
        self.password
            .as_deref()
            .or(self.pass.as_deref())
            .filter(|s| !s.trim().is_empty())
    }

    pub fn get_port(&self) -> u16 {
        match &self.port {
            serde_json::Value::Number(n) => n.as_u64().unwrap_or(8080) as u16,
            serde_json::Value::String(s) => s.trim().parse::<u16>().unwrap_or(8080),
            _ => 8080,
        }
    }
}

pub type ProxyTestRequest = TestProxyDto;
pub type ProxyTestResult = crate::proxy_validator::ProxyValidationResult;
