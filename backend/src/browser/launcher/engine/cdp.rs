


/// Escolhe uma porta TCP local disponível
pub fn pick_available_port() -> u16 {
    std::net::TcpListener::bind("127.0.0.1:0")
        .and_then(|l| l.local_addr())
        .map(|a| a.port())
        .unwrap_or(18922)
}

/// Aguarda a porta TCP do navegador abrir e retorna o endpoint de depuração e automação correto (Firefox vs Chromium)
pub async fn wait_for_devtools_endpoint(
    port: u16,
    client: &reqwest::Client,
    is_chromium: bool,
) -> Option<String> {
    let addr = format!("127.0.0.1:{port}");
    
    // Tenta conectar na porta TCP local (abre em poucos milissegundos)
    for _ in 0..40 {
        if tokio::net::TcpStream::connect(&addr).await.is_ok() {
            if is_chromium {
                let url = format!("http://127.0.0.1:{port}/json/version");
                if let Ok(resp) = client.get(&url).send().await {
                    if let Ok(json) = resp.json::<serde_json::Value>().await {
                        if let Some(ws_url) = json.get("webSocketDebuggerUrl").and_then(|v| v.as_str()) {
                            return Some(ws_url.to_string());
                        }
                    }
                }
            } else {
                return Some(format!("ws://127.0.0.1:{port}/session"));
            }
        }
        tokio::time::sleep(std::time::Duration::from_millis(50)).await;
    }

    if is_chromium {
        Some(format!("ws://127.0.0.1:{port}/devtools/browser"))
    } else {
        Some(format!("ws://127.0.0.1:{port}/session"))
    }
}

use crate::extraction_session::UnifiedCookie;
use futures_util::{SinkExt, StreamExt};
use serde_json::json;
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::Message;

/// Lê todos os cookies via WebSocket CDP (Storage.getCookies) diretamente da memória do navegador
pub async fn fetch_cookies_via_cdp(ws_url: &str) -> Result<Vec<UnifiedCookie>, String> {
    let (mut ws_stream, _) = connect_async(ws_url)
        .await
        .map_err(|e| format!("Falha ao conectar no WebSocket CDP ({ws_url}): {e}"))?;

    let req = json!({
        "id": 1,
        "method": "Storage.getCookies",
        "params": {}
    });

    ws_stream
        .send(Message::Text(req.to_string().into()))
        .await
        .map_err(|e| format!("Falha ao enviar Storage.getCookies via CDP: {e}"))?;

    let mut cookies = Vec::new();

    while let Some(msg) = ws_stream.next().await {
        if let Ok(Message::Text(text)) = msg {
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&text) {
                if v.get("id").and_then(|id| id.as_i64()) == Some(1) {
                    if let Some(err) = v.get("error") {
                        return Err(format!("Erro retornado pelo CDP Storage.getCookies: {err}"));
                    }
                    if let Some(list) = v.get("result").and_then(|r| r.get("cookies")).and_then(|c| c.as_array()) {
                        for c in list {
                            let name = c.get("name").and_then(|n| n.as_str()).unwrap_or_default().to_string();
                            let value = c.get("value").and_then(|val| val.as_str()).unwrap_or_default().to_string();
                            let domain = c.get("domain").and_then(|d| d.as_str()).unwrap_or_default().to_string();
                            let path = c.get("path").and_then(|p| p.as_str()).unwrap_or("/").to_string();
                            let expires_sec = c.get("expires").and_then(|e| e.as_f64()).unwrap_or(-1.0);
                            let expiry = if expires_sec > 0.0 { Some(expires_sec as i64) } else { None };
                            let is_secure = c.get("secure").and_then(|s| s.as_bool()).unwrap_or(false);
                            let is_http_only = c.get("httpOnly").and_then(|h| h.as_bool()).unwrap_or(false);
                            let same_site = c.get("sameSite").and_then(|s| s.as_str()).unwrap_or("Lax").to_string();

                            cookies.push(UnifiedCookie {
                                name,
                                value,
                                domain,
                                path,
                                expiry,
                                is_secure,
                                is_http_only,
                                same_site,
                            });
                        }
                    }
                    break;
                }
            }
        }
    }

    let _ = ws_stream.close(None).await;
    Ok(cookies)
}

/// Injeta cookies via WebSocket CDP (Storage.setCookies) diretamente no navegador ativo
pub async fn inject_cookies_via_cdp(ws_url: &str, cookies: &[UnifiedCookie]) -> Result<(), String> {
    if cookies.is_empty() {
        return Ok(());
    }

    let (mut ws_stream, _) = connect_async(ws_url)
        .await
        .map_err(|e| format!("Falha ao conectar no WebSocket CDP ({ws_url}): {e}"))?;

    let cdp_cookies: Vec<serde_json::Value> = cookies.iter().map(|c| {
        let same_site = match c.same_site.to_lowercase().as_str() {
            "strict" => "Strict",
            "none" => "None",
            _ => "Lax",
        };
        let mut obj = json!({
            "name": c.name,
            "value": c.value,
            "domain": c.domain,
            "path": c.path,
            "secure": c.is_secure,
            "httpOnly": c.is_http_only,
            "sameSite": same_site,
        });
        if let Some(exp) = c.expiry {
            if exp > 0 {
                obj["expires"] = json!(exp as f64);
            }
        }
        obj
    }).collect();

    let req = json!({
        "id": 2,
        "method": "Storage.setCookies",
        "params": {
            "cookies": cdp_cookies
        }
    });

    ws_stream
        .send(Message::Text(req.to_string().into()))
        .await
        .map_err(|e| format!("Falha ao enviar Storage.setCookies via CDP: {e}"))?;

    while let Some(msg) = ws_stream.next().await {
        if let Ok(Message::Text(text)) = msg {
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&text) {
                if v.get("id").and_then(|id| id.as_i64()) == Some(2) {
                    if let Some(err) = v.get("error") {
                        return Err(format!("Erro retornado pelo CDP Storage.setCookies: {err}"));
                    }
                    break;
                }
            }
        }
    }

    let _ = ws_stream.close(None).await;
    Ok(())
}


