use std::time::{Duration, Instant};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyValidationResult {
    pub status: String, // "active", "auth_error", "connection_error", "timeout", "error"
    pub latency_ms: Option<u64>,
    pub exit_ip: Option<String>,
    pub message: String,
}

pub struct ProxyValidator;

impl ProxyValidator {
    /// Valida uma conexão proxy executando requisições através do túnel SOCKS5/HTTP/HTTPS.
    /// Testa se o host é alcançável e se as credenciais fornecidas (usuário e senha) são aceitas.
    pub async fn validate(
        proxy_type: &str,
        host: &str,
        port: u16,
        username: Option<&str>,
        password: Option<&str>,
    ) -> ProxyValidationResult {
        let clean_host = host.trim();
        if clean_host.is_empty() {
            return ProxyValidationResult {
                status: "error".to_string(),
                latency_ms: None,
                exit_ip: None,
                message: "Host do proxy não pode ser vazio.".to_string(),
            };
        }

        // Formatação correta para IPv6 (ex: [2001:db8::1])
        let formatted_host = if clean_host.contains(':') && !clean_host.starts_with('[') {
            format!("[{}]", clean_host)
        } else {
            clean_host.to_string()
        };

        let p_type = proxy_type.to_lowercase();
        let scheme = match p_type.as_str() {
            "socks4" => "socks4",
            "socks5" | "socks" => "socks5",
            "https" => "https",
            _ => "http",
        };

        let proxy_url = format!("{}://{}:{}", scheme, formatted_host, port);
        let mut reqwest_proxy = match reqwest::Proxy::all(&proxy_url) {
            Ok(p) => p,
            Err(e) => {
                return ProxyValidationResult {
                    status: "error".to_string(),
                    latency_ms: None,
                    exit_ip: None,
                    message: format!("URL do proxy inválida: {}", e),
                };
            }
        };

        if let (Some(u), Some(p)) = (username, password) {
            let u_trimmed = u.trim();
            let p_trimmed = p.trim();
            if !u_trimmed.is_empty() {
                reqwest_proxy = reqwest_proxy.basic_auth(u_trimmed, p_trimmed);
            }
        }

        let client = match reqwest::Client::builder()
            .proxy(reqwest_proxy)
            .timeout(Duration::from_secs(15))
            .connect_timeout(Duration::from_secs(10))
            .build()
        {
            Ok(c) => c,
            Err(e) => {
                return ProxyValidationResult {
                    status: "error".to_string(),
                    latency_ms: None,
                    exit_ip: None,
                    message: format!("Falha ao inicializar cliente HTTP: {}", e),
                };
            }
        };

        // Testar requisição para ecoar IP externo através do proxy
        let start = Instant::now();
        let test_urls = [
            "http://api.ipify.org?format=json",
            "http://ip-api.com/json",
            "https://api.ipify.org?format=json",
        ];

        let mut last_error_msg = String::new();

        for url in test_urls {
            match client.get(url).send().await {
                Ok(resp) => {
                    let status_code = resp.status().as_u16();

                    // Se retornar 407 Proxy Authentication Required
                    if status_code == 407 {
                        return ProxyValidationResult {
                            status: "auth_error".to_string(),
                            latency_ms: None,
                            exit_ip: None,
                            message: "Erro de autenticação: credenciais do proxy inválidas (407).".to_string(),
                        };
                    }

                    if resp.status().is_success() {
                        let latency = start.elapsed().as_millis() as u64;
                        let text = resp.text().await.unwrap_or_default();
                        let exit_ip = Self::extract_ip(&text).unwrap_or_else(|| formatted_host.clone());

                        return ProxyValidationResult {
                            status: "active".to_string(),
                            latency_ms: Some(latency),
                            exit_ip: Some(exit_ip),
                            message: "Proxy conectado com sucesso.".to_string(),
                        };
                    } else {
                        last_error_msg = format!("Servidor retornou código HTTP {}", status_code);
                    }
                }
                Err(err) => {
                    let err_str = err.to_string();
                    let err_lower = err_str.to_lowercase();

                    // Detecta erro de autenticação SOCKS5 ou HTTP
                    if err_lower.contains("407")
                        || err_lower.contains("auth")
                        || err_lower.contains("credential")
                        || err_lower.contains("password")
                        || err_lower.contains("unauthorized")
                    {
                        return ProxyValidationResult {
                            status: "auth_error".to_string(),
                            latency_ms: None,
                            exit_ip: None,
                            message: "Erro de autenticação: usuário ou senha incorretos.".to_string(),
                        };
                    }

                    // Se for timeout
                    if err_lower.contains("timed out") || err_lower.contains("timeout") {
                        return ProxyValidationResult {
                            status: "timeout".to_string(),
                            latency_ms: None,
                            exit_ip: None,
                            message: "Tempo limite esgotado ao tentar conectar ao proxy.".to_string(),
                        };
                    }

                    // Se for conexão recusada
                    if err_lower.contains("connection refused")
                        || err_lower.contains("host unreachable")
                        || err_lower.contains("no route to host")
                        || err_lower.contains("dns")
                    {
                        return ProxyValidationResult {
                            status: "connection_error".to_string(),
                            latency_ms: None,
                            exit_ip: None,
                            message: "Falha de conexão: host inacessível ou porta fechada.".to_string(),
                        };
                    }

                    last_error_msg = err_str;
                }
            }
        }

        ProxyValidationResult {
            status: "error".to_string(),
            latency_ms: None,
            exit_ip: None,
            message: if last_error_msg.is_empty() {
                "Falha ao validar conexão com o proxy.".to_string()
            } else {
                format!("Erro ao testar proxy: {}", last_error_msg)
            },
        }
    }

    pub fn extract_ip(body: &str) -> Option<String> {
        if let Ok(val) = serde_json::from_str::<serde_json::Value>(body) {
            if let Some(ip) = val.get("ip").and_then(|v| v.as_str()) {
                return Some(ip.to_string());
            }
            if let Some(ip) = val.get("query").and_then(|v| v.as_str()) {
                return Some(ip.to_string());
            }
        }

        let trimmed = body.trim();
        if trimmed.chars().all(|c| c.is_ascii_digit() || c == '.' || c == ':' || c.is_ascii_hexdigit()) && !trimmed.is_empty() {
            return Some(trimmed.to_string());
        }

        None
    }
}
