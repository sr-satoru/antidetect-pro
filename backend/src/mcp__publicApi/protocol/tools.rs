use serde_json::{json, Value};
use crate::service_database::ProfileStorage;
use crate::mcp_public_api::error::McpError;

/// Enums representando as ferramentas MCP suportadas pelo Star Multlogin
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ToolKind {
    StarProfiles,
    StarLaunchProfile,
    StarStopProfile,
}

impl ToolKind {
    #[allow(clippy::should_implement_trait)]
    pub fn from_str(name: &str) -> Option<Self> {
        match name {
            "star_profiles" => Some(Self::StarProfiles),
            "star_launch_profile" => Some(Self::StarLaunchProfile),
            "star_stop_profile" => Some(Self::StarStopProfile),
            _ => None,
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            Self::StarProfiles => "star_profiles",
            Self::StarLaunchProfile => "star_launch_profile",
            Self::StarStopProfile => "star_stop_profile",
        }
    }
}

/// Retorna a especificação e o inputSchema de todas as ferramentas suportadas (tools/list)
pub fn list_tools_spec() -> Value {
    json!([
        {
            "name": "star_profiles",
            "description": "Lista todos os perfis com ID, Nome, Kernel (AstroFox/AstroBrowser) e Tags do banco de dados local",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "tag": { "type": "string", "description": "Filtrar por nome de tag" },
                    "search": { "type": "string", "description": "Filtrar por nome do perfil" }
                }
            }
        },
        {
            "name": "star_launch_profile",
            "description": "Inicia um perfil pelo ID no banco local (dispara motor AstroFox ou AstroBrowser)",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "id": { "type": "string", "description": "ID único do perfil" },
                    "url": { "type": "string", "description": "URL inicial opcional para navegação" },
                    "cdp": { "type": "boolean", "description": "Habilitar porta de depuração CDP (padrão: false para modo humano puro sem depuração de bot)" }
                },
                "required": ["id"]
            }
        },
        {
            "name": "star_stop_profile",
            "description": "Finaliza um perfil ativo pelo ID no banco local",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "id": { "type": "string", "description": "ID único do perfil a ser encerrado" }
                },
                "required": ["id"]
            }
        }
    ])
}

/// Executa a ferramenta MCP correspondente de forma isolada
pub async fn execute_tool(
    kind: ToolKind,
    args: &Value,
    storage: &ProfileStorage,
) -> Result<String, McpError> {
    match kind {
        ToolKind::StarProfiles => {
            let tag = args.get("tag").and_then(Value::as_str);
            let search = args.get("search").and_then(Value::as_str);
            let all = storage.list(search, None);

            let filtered: Vec<Value> = all
                .into_iter()
                .filter(|p| {
                    if let Some(t) = tag {
                        p.tags.iter().any(|tag_ref| tag_ref.name.eq_ignore_ascii_case(t))
                    } else {
                        true
                    }
                })
                .map(|p| {
                    let is_running = storage.is_running(&p.id);
                    json!({
                        "id": p.id,
                        "name": p.name,
                        "kernel": p.kernel,
                        "browser_version": p.browser_version,
                        "os": p.os,
                        "tags": p.tags.into_iter().map(|t| t.name).collect::<Vec<_>>(),
                        "running": is_running,
                        "status": if is_running { "running" } else { &p.status }
                    })
                })
                .collect();

            serde_json::to_string(&filtered).map_err(|e| McpError::Internal(e.to_string()))
        }
        ToolKind::StarLaunchProfile => {
            let profile_id = args.get("id").and_then(Value::as_str).unwrap_or("").trim();
            if profile_id.is_empty() {
                return Err(McpError::InvalidToolArguments {
                    tool: kind.as_str().to_string(),
                    details: "Parâmetro obrigatório 'id' não informado.".to_string(),
                });
            }

            let url = args.get("url").and_then(Value::as_str);
            // Padrão sempre false: inicia no modo humano normal sem porta de depuração de bot
            let cdp = args.get("cdp").and_then(Value::as_bool).unwrap_or(false);

            match storage.launch_with_options(profile_id, cdp, url).await {
                Ok((profile, pid, debug_port, ws_endpoint)) => {
                    let mut val = json!({
                        "status": "launched",
                        "profile_id": profile.id,
                        "name": profile.name,
                        "pid": pid,
                        "kernel": profile.kernel,
                        "url": url,
                        "mode": if cdp { "debug_automation" } else { "human_normal" },
                        "message": format!(
                            "Perfil '{}' ({}) iniciado com sucesso (PID: {pid}) no modo {}.",
                            profile.name,
                            profile.kernel,
                            if cdp { "automação (CDP)" } else { "humano normal (sem depuração)" }
                        )
                    });
                    if let Some(port) = debug_port {
                        val["debug_port"] = json!(port);
                    }
                    if let Some(ws) = ws_endpoint {
                        val["ws_endpoint"] = json!(ws);
                    }
                    serde_json::to_string(&val).map_err(|e| McpError::Internal(e.to_string()))
                }
                Err(err) => Err(McpError::LaunchFailed {
                    id: profile_id.to_string(),
                    reason: err,
                }),
            }
        }
        ToolKind::StarStopProfile => {
            let profile_id = args.get("id").and_then(Value::as_str).unwrap_or("").trim();
            if profile_id.is_empty() {
                return Err(McpError::InvalidToolArguments {
                    tool: kind.as_str().to_string(),
                    details: "Parâmetro obrigatório 'id' não informado.".to_string(),
                });
            }

            match storage.stop(profile_id) {
                Ok(profile) => {
                    let val = json!({
                        "status": "stopped",
                        "profile_id": profile.id,
                        "name": profile.name,
                        "message": format!("Perfil '{}' finalizado com sucesso.", profile.name)
                    });
                    serde_json::to_string(&val).map_err(|e| McpError::Internal(e.to_string()))
                }
                Err(err) => Err(McpError::StopFailed {
                    id: profile_id.to_string(),
                    reason: err,
                }),
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tool_kind_parsing() {
        assert_eq!(ToolKind::from_str("star_profiles"), Some(ToolKind::StarProfiles));
        assert_eq!(ToolKind::from_str("star_launch_profile"), Some(ToolKind::StarLaunchProfile));
        assert_eq!(ToolKind::from_str("star_stop_profile"), Some(ToolKind::StarStopProfile));
        assert_eq!(ToolKind::from_str("unknown_tool"), None);
    }

    #[test]
    fn test_list_tools_schema() {
        let tools = list_tools_spec();
        assert!(tools.is_array());
        let arr = tools.as_array().expect("deve ser array");
        assert_eq!(arr.len(), 3);
        assert_eq!(arr[0]["name"], "star_profiles");
        assert_eq!(arr[1]["name"], "star_launch_profile");
        assert_eq!(arr[2]["name"], "star_stop_profile");
    }
}
