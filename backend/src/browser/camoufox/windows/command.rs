use std::path::Path;
use tracing::info;
use crate::models::Profile;
use crate::network::NetworkSetupResult;
use crate::camoufox::common::{chunk_environment_variable, to_ascii_escaped_json, build_camou_config_map, build_camou_prefs};

/// Limite estrito do Windows: a função getenv() do autoconfig lê através da página ANSI,
/// corrompendo blocos maiores que 2047 bytes.
const WINDOWS_CHUNK_SIZE: usize = 2047;

/// Constrói o comando de execução otimizado especificamente para Windows.
pub fn build_windows_command(
    binary_path: &Path,
    profile_dir: &Path,
    profile: &Profile,
    debug_port: Option<u16>,
    net_setup: &NetworkSetupResult,
    addon_paths: &[String],
    proxy_ip: Option<&str>,
    initial_url: Option<&str>,
) -> Result<tokio::process::Command, String> {
    let mut cmd = tokio::process::Command::new(binary_path);

    // 1. Diretório de trabalho (no Windows as DLLs residem ao lado do executável)
    if let Some(engine_dir) = binary_path.parent() {
        cmd.current_dir(engine_dir);
    }

    // 2. Sintaxe de perfil com hífen simples no Windows (-profile)
    cmd.arg("-profile").arg(profile_dir);

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

    // 6. CAMOU_CONFIG com escape ASCII (\uXXXX) e fatias de até 2047 bytes
    let camou_config_map = build_camou_config_map(profile, proxy_ip, addon_paths);
    let config_val = serde_json::to_value(&camou_config_map).unwrap_or_default();
    let camou_config_ascii = to_ascii_escaped_json(&config_val);

    info!(
        "🪟 [Windows] Injetando CAMOU_CONFIG (SO perfil: {}, {} bytes em blocos de 2047) no processo {}",
        profile.os,
        camou_config_ascii.len(),
        profile.id
    );

    let config_chunks = chunk_environment_variable("CAMOU_CONFIG", &camou_config_ascii, WINDOWS_CHUNK_SIZE);
    for (k, v) in config_chunks {
        cmd.env(k, v);
    }
    // Para retrocompatibilidade caso o binário use CAMOU_CONFIG unificado curto
    if camou_config_ascii.len() <= WINDOWS_CHUNK_SIZE {
        cmd.env("CAMOU_CONFIG", &camou_config_ascii);
    }

    // 7. CAMOU_PREFS com escape ASCII e fatias de até 2047 bytes
    let camou_prefs_map = build_camou_prefs(profile, debug_port, net_setup);
    let prefs_val = serde_json::to_value(&camou_prefs_map).unwrap_or_default();
    let camou_prefs_ascii = to_ascii_escaped_json(&prefs_val);

    let prefs_chunks = chunk_environment_variable("CAMOU_PREFS", &camou_prefs_ascii, WINDOWS_CHUNK_SIZE);
    for (k, v) in prefs_chunks {
        cmd.env(k, v);
    }

    // 8. URL inicial
    if let Some(u) = initial_url.filter(|s| !s.trim().is_empty()) {
        cmd.arg(u);
    }

    Ok(cmd)
}
