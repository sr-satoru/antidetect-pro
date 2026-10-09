use std::fs;
use std::path::Path;

use crate::models::Profile;
use crate::network::NetworkSetupResult;

/// Prepara a pasta isolada do perfil e extensões.
/// Não injeta fingerprints no user.js: toda configuração de fingerprint e preferências
/// é entregue nativamente ao C++ do Camoufox via variáveis de ambiente em memória (CAMOU_CONFIG e CAMOU_PREFS).
pub async fn prepare_profile_dir(
    profile_dir: &Path,
    profile: &Profile,
    data_dir: &Path,
    client: &reqwest::Client,
    _cdp: bool,
) -> Result<(NetworkSetupResult, Vec<String>, Option<String>), String> {
    fs::create_dir_all(profile_dir)
        .map_err(|e| format!("Erro ao criar diretório do perfil: {e}"))?;

    // 1. Remove qualquer user.js legado para garantir pureza da injeção nativa em memória
    let user_js_path = profile_dir.join("user.js");
    if user_js_path.exists() {
        let _ = fs::remove_file(&user_js_path);
    }

    // 2. Remove resquício de pasta chrome/userChrome.css se existir
    let chrome_dir = profile_dir.join("chrome");
    if chrome_dir.exists() {
        let _ = fs::remove_dir_all(&chrome_dir);
    }

    // 3. Delegação de Proxy Universal Relay via módulo network
    let net_setup = crate::network::prepare_network(&profile.proxy, &profile.fingerprint_json).await?;

    // 4. Importação e preparação das extensões via módulo extensions
    let ext_paths = crate::extensions::import_profile_extensions(
        profile,
        profile_dir,
        data_dir,
        client,
        &profile.kernel,
    )
    .await?;

    let mut all_addon_paths = net_setup.addon_paths.clone();
    all_addon_paths.extend(ext_paths);

    // 5. Resolução de IPv4 para WebRTC
    let proxy_ip: Option<String> = if profile.proxy.proxy_type != "none" {
        if let Some(host) = profile.proxy.host.as_deref().filter(|h| !h.trim().is_empty()) {
            if host.parse::<std::net::Ipv4Addr>().is_ok() {
                Some(host.to_string())
            } else {
                let port = profile.proxy.port.unwrap_or(8080);
                tokio::net::lookup_host(format!("{}:{}", host, port))
                    .await
                    .ok()
                    .and_then(|mut iter| {
                        iter.find_map(|addr| {
                            if let std::net::SocketAddr::V4(v4) = addr {
                                Some(v4.ip().to_string())
                            } else {
                                None
                            }
                        })
                    })
            }
        } else {
            None
        }
    } else {
        None
    };

    Ok((net_setup, all_addon_paths, proxy_ip))
}
