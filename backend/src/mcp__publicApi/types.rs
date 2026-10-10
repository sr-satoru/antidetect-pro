use serde::{Deserialize, Serialize};
use crate::models::profile::TagRef;

/// Resumo formatado de perfil para consumo via MCP / Agentes de IA / APIs Públicas
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct McpProfileSummary {
    pub id: String,
    pub name: String,
    pub kernel: String,
    pub browser_version: String,
    pub os: String,
    pub group: String,
    pub tags: Vec<TagRef>,
    pub status: String,
    pub running: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Parâmetros de query aceitos pelas rotas REST e endpoints MCP
#[derive(Debug, Clone, Deserialize, Default)]
pub struct McpQueryParams {
    pub token: Option<String>,
    pub tag: Option<String>,
    pub search: Option<String>,
    pub group: Option<String>,
    pub cdp: Option<bool>,
    pub url: Option<String>,
}

/// Payload opcional para inicialização de perfil via POST
#[derive(Debug, Clone, Deserialize, Default)]
pub struct McpLaunchPayload {
    pub cdp: Option<bool>,
    pub url: Option<String>,
}

/// Resposta de sucesso ao disparar perfil
#[derive(Debug, Clone, Serialize)]
pub struct McpLaunchResponse {
    pub status: String,
    pub profile_id: String,
    pub name: String,
    pub kernel: String,
    pub pid: u32,
    pub debug_port: Option<u16>,
    pub ws_endpoint: Option<String>,
    pub url: Option<String>,
    pub message: String,
}

/// Resposta de sucesso ao parar perfil
#[derive(Debug, Clone, Serialize)]
pub struct McpStopResponse {
    pub status: String,
    pub profile_id: String,
    pub name: String,
    pub message: String,
}

/// Resposta de informações do servidor MCP
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpInfoResponse {
    pub token: String,
    pub server_url: String,
    pub mcp_url: String,
}

/// Resposta de status operacional do motor
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McpStatusResponse {
    pub ok: bool,
    pub status: String,
    pub engine: String,
    pub version: String,
    pub running_count: usize,
    pub loopback_only: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_types_serialization_roundtrip() -> Result<(), Box<dyn std::error::Error>> {
        let summary = McpProfileSummary {
            id: "prof_123".to_string(),
            name: "Perfil Teste".to_string(),
            kernel: "AstroFox".to_string(),
            browser_version: "135.0".to_string(),
            os: "linux".to_string(),
            group: "Default".to_string(),
            tags: vec![],
            status: "ready".to_string(),
            running: false,
            created_at: 1000,
            updated_at: 2000,
        };

        let json_str = serde_json::to_string(&summary)?;
        let deserialized: McpProfileSummary = serde_json::from_str(&json_str)?;
        assert_eq!(summary, deserialized);
        Ok(())
    }
}
