pub mod auth_extension;
pub mod prefs;
pub mod tunnel;
pub mod webrtc;

use crate::models::ProfileProxyConfig;
use std::collections::HashMap;
use std::path::Path;

pub struct NetworkSetupResult {
    /// Trecho de configuração a ser concatenado no user.js
    pub user_js_snippet: String,
    /// Variáveis de ambiente a serem injetadas no processo do Camoufox (ex: CAMOU_CONFIG)
    pub env_vars: HashMap<String, String>,
    /// Micro-túnel SOCKS5 ativo (se aplicável), deve ser mantido vivo enquanto o perfil roda
    pub tunnel: Option<tunnel::Socks5LoopbackTunnel>,
}

impl NetworkSetupResult {
    /// Aplica as variáveis de ambiente necessárias ao comando de execução
    pub fn apply_to_command(&self, cmd: &mut tokio::process::Command) {
        for (k, v) in &self.env_vars {
            cmd.env(k, v);
        }
    }
}

/// Prepara toda a infraestrutura de rede, proxy, autenticação e spoofing de WebRTC para o perfil.
pub async fn prepare_network(
    proxy: &ProfileProxyConfig,
    profile_dir: &Path,
) -> Result<NetworkSetupResult, String> {
    // 1. Perfil sem proxy configurado
    if proxy.proxy_type == "none" || proxy.host.as_deref().unwrap_or("").trim().is_empty() {
        return Ok(NetworkSetupResult {
            user_js_snippet: prefs::build_proxy_prefs(proxy, None, None),
            env_vars: HashMap::new(),
            tunnel: None,
        });
    }

    let host = proxy.host.as_deref().unwrap_or("").trim();
    let port = proxy.port.unwrap_or(8080);
    let username = proxy.username.as_deref().unwrap_or("").trim();
    let password = proxy.password.as_deref().unwrap_or("").trim();
    let has_auth = !username.is_empty() && !password.is_empty();

    let mut addon_paths: Vec<String> = Vec::new();
    let mut active_tunnel: Option<tunnel::Socks5LoopbackTunnel> = None;
    let mut effective_host = host;
    let mut effective_port = port;

    let p_type = proxy.proxy_type.to_lowercase();

    // 2. Se for SOCKS5 com autenticação: sobe micro-túnel loopback local
    // porque o Firefox nativamente não suporta credenciais SOCKS5 via user.js
    if (p_type == "socks5" || p_type == "socks4") && has_auth {
        let tun = tunnel::Socks5LoopbackTunnel::start(
            host.to_string(),
            port,
            username.to_string(),
            password.to_string(),
        )
        .await?;

        effective_host = "127.0.0.1";
        effective_port = tun.local_port;
        active_tunnel = Some(tun);
    }
    // 3. Se for HTTP/HTTPS com autenticação: injeta WebExtension nativa de auto-autenticação
    else if (p_type == "http" || p_type == "https") && has_auth {
        let ext_dir = auth_extension::install_proxy_auth_extension(profile_dir, username, password)?;
        addon_paths.push(ext_dir.to_string_lossy().to_string());
    }

    // 4. Monta o user.js endurecido
    let user_js_snippet = prefs::build_proxy_prefs(
        proxy,
        Some(effective_host),
        Some(effective_port),
    );

    // 5. Constrói o CAMOU_CONFIG com spoofing de IP no WebRTC e extensões
    let mut env_vars = HashMap::new();
    let camou_json = webrtc::build_camou_config(Some(host), &addon_paths);
    if !camou_json.is_empty() {
        if let Ok(serialized) = serde_json::to_string(&camou_json) {
            env_vars.insert("CAMOU_CONFIG".to_string(), serialized);
        }
    }

    Ok(NetworkSetupResult {
        user_js_snippet,
        env_vars,
        tunnel: active_tunnel,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    struct TempDir(std::path::PathBuf);
    impl TempDir {
        fn new() -> Self {
            let p = std::env::temp_dir().join(format!("fury_net_test_{}", uuid::Uuid::new_v4()));
            std::fs::create_dir_all(&p).unwrap();
            Self(p)
        }
        fn path(&self) -> &std::path::Path {
            &self.0
        }
    }
    impl Drop for TempDir {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.0);
        }
    }

    #[tokio::test]
    async fn test_proxy_none() {
        let temp_dir = TempDir::new();
        let proxy = ProfileProxyConfig {
            proxy_type: "none".to_string(),
            ..Default::default()
        };

        let res = prepare_network(&proxy, temp_dir.path()).await.unwrap();
        assert!(res.user_js_snippet.contains("user_pref(\"network.proxy.type\", 0);"));
        assert!(res.tunnel.is_none());
        assert!(res.env_vars.is_empty());
    }

    #[tokio::test]
    async fn test_http_proxy_with_auth() {
        let temp_dir = TempDir::new();
        let proxy = ProfileProxyConfig {
            mode: "custom".to_string(),
            proxy_type: "http".to_string(),
            host: Some("192.168.1.100".to_string()),
            port: Some(8080),
            username: Some("user_test".to_string()),
            password: Some("pass_secret".to_string()),
            socks_remote_dns: true,
            ..Default::default()
        };

        let res = prepare_network(&proxy, temp_dir.path()).await.unwrap();
        assert!(res.user_js_snippet.contains("user_pref(\"network.proxy.type\", 1);"));
        assert!(res.user_js_snippet.contains("user_pref(\"network.proxy.http\", \"192.168.1.100\");"));
        assert!(res.user_js_snippet.contains("user_pref(\"network.proxy.share_proxy_settings\", true);"));
        assert!(res.user_js_snippet.contains("user_pref(\"network.trr.mode\", 5);"));

        // Garante que a extensão foi criada no diretório do perfil
        let ext_manifest = temp_dir
            .path()
            .join("extensions")
            .join("fury-proxy-auth@antidetect.fury")
            .join("manifest.json");
        assert!(ext_manifest.exists());

        // Verifica que o CAMOU_CONFIG contém o IP para WebRTC
        let camou_env = res.env_vars.get("CAMOU_CONFIG").unwrap();
        assert!(camou_env.contains("192.168.1.100"));
    }
}
