use std::fs;
use std::path::Path;

/// Escolhe uma porta TCP local disponível
pub fn pick_available_port() -> u16 {
    std::net::TcpListener::bind("127.0.0.1:0")
        .and_then(|l| l.local_addr())
        .map(|a| a.port())
        .unwrap_or(18922)
}

/// Aguarda o surgimento do arquivo DevToolsActivePort ou responde pela API /json/version do CDP
pub async fn wait_for_devtools_endpoint(
    client: &reqwest::Client,
    profile_dir: &Path,
    port: u16,
) -> Option<String> {
    let active_port_file = profile_dir.join("DevToolsActivePort");
    for _ in 0..50 {
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;

        // 1. Tenta ler o arquivo DevToolsActivePort gerado pelo Camoufox
        if let Ok(content) = fs::read_to_string(&active_port_file) {
            let lines: Vec<&str> = content.lines().collect();
            if lines.len() >= 2 {
                let ws_path = lines[1].trim();
                if !ws_path.is_empty() {
                    let path = if ws_path.starts_with('/') {
                        ws_path.to_string()
                    } else {
                        format!("/{}", ws_path)
                    };
                    return Some(format!("ws://127.0.0.1:{}{}", port, path));
                }
            }
        }

        // 2. Consulta alternativa no endpoint HTTP /json/version
        let version_url = format!("http://127.0.0.1:{}/json/version", port);
        if let Ok(resp) = client.get(&version_url).send().await {
            if let Ok(json) = resp.json::<serde_json::Value>().await {
                if let Some(ws_url) = json.get("webSocketDebuggerUrl").and_then(|v| v.as_str()) {
                    return Some(ws_url.to_string());
                }
            }
        }
    }

    // Fallback convencional caso o polling expire
    Some(format!("ws://127.0.0.1:{}/devtools/browser/session", port))
}
