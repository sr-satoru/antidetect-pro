use std::path::{Path, PathBuf};
use tracing::info;
use crate::models::Profile;
use crate::network::NetworkSetupResult;
use crate::browser::engines::camoufox::common::{chunk_environment_variable, build_camou_config_map, build_camou_prefs};

const MACOS_CHUNK_SIZE: usize = 32767;

/// Resolve o executável real dentro da estrutura .app do macOS se necessário
pub fn resolve_macos_executable(base_path: &Path) -> PathBuf {
    if base_path.extension().and_then(|s| s.to_str()) == Some("app") {
        let internal = base_path.join("Contents").join("MacOS").join("camoufox");
        if internal.exists() {
            return internal;
        }
    }
    base_path.to_path_buf()
}

/// Constrói o comando de execução otimizado especificamente para macOS.
pub fn build_macos_command(
    binary_path: &Path,
    profile_dir: &Path,
    profile: &Profile,
    debug_port: Option<u16>,
    net_setup: &NetworkSetupResult,
    addon_paths: &[String],
    proxy_ip: Option<&str>,
    initial_url: Option<&str>,
) -> Result<tokio::process::Command, String> {
    let exec_path = resolve_macos_executable(binary_path);
    let mut cmd = tokio::process::Command::new(&exec_path);

    // 1. Diretório de trabalho (dentro de Contents/MacOS ou diretório do executável)
    if let Some(parent) = exec_path.parent() {
        cmd.current_dir(parent);
    }

    // 2. Argumento de perfil com hífen duplo no macOS
    cmd.arg("--profile").arg(profile_dir);

    // 3. Porta CDP para depuração remota
    if let Some(port) = debug_port {
        cmd.arg("--remote-debugging-port").arg(port.to_string());
    }

    // 4. Configurações de rede e proxy
    net_setup.apply_to_command(&mut cmd);

    // 5. Suporte a launch_hook personalizado
    let fp_map = crate::fingerprint::translator::extract_fingerprint_map(&profile.fingerprint_json);
    if let Some(hook) = fp_map.get("launch_hook").and_then(|v| v.as_str()) {
        for arg in hook.split_whitespace() {
            if !arg.is_empty() {
                cmd.arg(arg);
            }
        }
    }

    // 6. CAMOU_CONFIG com suporte a macOS (recursos em Contents/Resources)
    let camou_config_map = build_camou_config_map(profile, proxy_ip, addon_paths);
    let camou_config_json = serde_json::to_string(&camou_config_map)
        .unwrap_or_else(|_| "{}".to_string());

    info!(
        "🍏 [macOS] Injetando CAMOU_CONFIG (SO perfil: {}, {} bytes) no processo {}",
        profile.os,
        camou_config_json.len(),
        profile.id
    );

    let config_chunks = chunk_environment_variable("CAMOU_CONFIG", &camou_config_json, MACOS_CHUNK_SIZE);
    for (k, v) in config_chunks {
        cmd.env(k, v);
    }
    cmd.env("CAMOU_CONFIG", &camou_config_json);

    // 7. CAMOU_PREFS em memória
    let camou_prefs_map = build_camou_prefs(profile, debug_port, net_setup);
    let camou_prefs_json = serde_json::to_string(&camou_prefs_map)
        .unwrap_or_else(|_| "{}".to_string());

    let prefs_chunks = chunk_environment_variable("CAMOU_PREFS", &camou_prefs_json, MACOS_CHUNK_SIZE);
    for (k, v) in prefs_chunks {
        cmd.env(k, v);
    }

    // 8. URLs iniciais (suporta múltiplas URLs)
    if let Some(u) = initial_url.filter(|s| !s.trim().is_empty()) {
        for single in u.split_whitespace() {
            if !single.is_empty() {
                cmd.arg(single);
            }
        }
    }

    Ok(cmd)
}
