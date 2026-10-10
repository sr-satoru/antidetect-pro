pub mod common;
pub mod linux;
pub mod macos;
pub mod windows;
pub mod command;

pub use command::build_browser_command;

use std::fs;
use std::path::{Path, PathBuf};
use async_trait::async_trait;

use crate::models::Profile;
use crate::extraction_session::{ImportCookieResult, UnifiedCookie, UnifiedSession};
use super::trait_engine::{BrowserEngine, EnginePrepResult};

/// Implementação desacoplada do motor Camoufox (Firefox stealth).
pub struct CamoufoxEngine;

impl CamoufoxEngine {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl BrowserEngine for CamoufoxEngine {
    fn kernel_name(&self) -> &'static str {
        "AstroFox"
    }

    fn resolve_binary(&self, data_dir: &Path) -> Result<PathBuf, String> {
        crate::browser_downloader::resolve_engine_binary(data_dir)
    }

    fn clear_profile_locks(&self, profile_dir: &Path) {
        let _ = fs::remove_file(profile_dir.join("parent.lock"));
        let _ = fs::remove_file(profile_dir.join(".parentlock"));
        let _ = fs::remove_file(profile_dir.join("lock"));
    }

    async fn prepare_profile_dir(
        &self,
        profile_dir: &Path,
        profile: &Profile,
        data_dir: &Path,
        client: &reqwest::Client,
        _cdp: bool,
    ) -> Result<EnginePrepResult, String> {
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

        // 3. Limpa travas órfãs do Firefox
        self.clear_profile_locks(profile_dir);

        // 4. Delegação de Proxy Universal Relay via módulo network
        let net_setup = crate::network::prepare_network(&profile.proxy, &profile.fingerprint_json).await?;

        // 5. Importação e preparação das extensões via módulo extensions
        let ext_paths = crate::extensions::import_profile_extensions(
            profile,
            profile_dir,
            data_dir,
            client,
            "camoufox",
        )
        .await?;

        let mut all_addon_paths = net_setup.addon_paths.clone();
        all_addon_paths.extend(ext_paths);

        // 6. Resolução de IPv4 para WebRTC
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

        Ok(EnginePrepResult {
            net_setup,
            addon_paths: all_addon_paths,
            proxy_ip,
        })
    }

    fn build_launch_command(
        &self,
        binary_path: &Path,
        profile_dir: &Path,
        profile: &Profile,
        debug_port: Option<u16>,
        prep: &EnginePrepResult,
        initial_url: Option<&str>,
    ) -> Result<tokio::process::Command, String> {
        command::build_browser_command(
            binary_path,
            profile_dir,
            profile,
            debug_port,
            &prep.net_setup,
            &prep.addon_paths,
            prep.proxy_ip.as_deref(),
            initial_url,
        )
    }

    fn extract_session(&self, profile_dir: &Path) -> Result<UnifiedSession, String> {
        let session = crate::extraction_session::fire_fox::extract_unified_session(profile_dir)
            .map_err(|e| format!("Erro ao extrair sessão do Camoufox: {e}"))?;

        Ok(session)
    }

    fn inject_session(
        &self,
        profile_dir: &Path,
        cookies: &[UnifiedCookie],
    ) -> Result<ImportCookieResult, String> {
        crate::launcher::engine::injection::inject_cookies(profile_dir, cookies)
    }
}
