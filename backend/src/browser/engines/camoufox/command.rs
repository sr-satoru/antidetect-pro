use super::{linux, macos, windows};

use std::path::Path;
use tracing::info;
use crate::models::Profile;
use crate::network::NetworkSetupResult;

/// Ponto de entrada unificado e fachada do módulo Camoufox.
/// Despacha a montagem do processo de acordo com a plataforma host e o tipo de binário.
pub fn build_browser_command(
    binary_path: &Path,
    profile_dir: &Path,
    profile: &Profile,
    debug_port: Option<u16>,
    net_setup: &NetworkSetupResult,
    addon_paths: &[String],
    proxy_ip: Option<&str>,
    initial_url: Option<&str>,
) -> Result<tokio::process::Command, String> {
    let host_os = std::env::consts::OS;
    let is_windows_binary = binary_path
        .extension()
        .and_then(|e| e.to_str())
        .map(|ext| ext.eq_ignore_ascii_case("exe"))
        .unwrap_or(false);

    let is_macos_bundle = binary_path.to_string_lossy().contains(".app");

    if host_os == "windows" || is_windows_binary {
        info!("🦊 Despachando execução para o módulo Camoufox/Windows");
        windows::build_windows_command(
            binary_path,
            profile_dir,
            profile,
            debug_port,
            net_setup,
            addon_paths,
            proxy_ip,
            initial_url,
        )
    } else if host_os == "macos" || is_macos_bundle {
        info!("🦊 Despachando execução para o módulo Camoufox/macOS");
        macos::build_macos_command(
            binary_path,
            profile_dir,
            profile,
            debug_port,
            net_setup,
            addon_paths,
            proxy_ip,
            initial_url,
        )
    } else {
        info!("🦊 Despachando execução para o módulo Camoufox/Linux");
        linux::build_linux_command(
            binary_path,
            profile_dir,
            profile,
            debug_port,
            net_setup,
            addon_paths,
            proxy_ip,
            initial_url,
        )
    }
}
