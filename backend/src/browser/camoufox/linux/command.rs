use std::path::Path;
use tracing::info;
use crate::models::Profile;
use crate::network::NetworkSetupResult;
use super::fontconfig::setup_linux_fontconfig;
use crate::camoufox::common::{chunk_environment_variable, build_camou_config_map, build_camou_prefs};

const LINUX_CHUNK_SIZE: usize = 32767;

/// Constrói o comando de execução otimizado especificamente para Linux.
pub fn build_linux_command(
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

    // 1. Diretório de trabalho e bibliotecas dinâmicas do Gecko
    if let Some(engine_dir) = binary_path.parent() {
        cmd.current_dir(engine_dir);

        let current_ld = std::env::var("LD_LIBRARY_PATH").unwrap_or_default();
        let new_ld = if current_ld.is_empty() {
            engine_dir.to_string_lossy().to_string()
        } else {
            format!("{}:{}", engine_dir.to_string_lossy(), current_ld)
        };
        cmd.env("LD_LIBRARY_PATH", new_ld);

        // Prevenção de crashes em sessões Wayland/X11
        cmd.env("MOZ_ENABLE_WAYLAND", "0");
        cmd.env("GDK_BACKEND", "x11");

        // 2. Isolamento de Fontes do Linux via FONTCONFIG_FILE
        if let Some(fc_path) = setup_linux_fontconfig(engine_dir, &profile.os) {
            if fc_path.is_file() {
                cmd.env("FONTCONFIG_FILE", fc_path);
            } else {
                cmd.env("FONTCONFIG_PATH", fc_path);
            }
        }
    }

    // 3. Argumento de perfil com hífen duplo no Linux
    cmd.arg("--profile").arg(profile_dir);

    // 4. Porta CDP para depuração remota se solicitada
    if let Some(port) = debug_port {
        cmd.arg("--remote-debugging-port").arg(port.to_string());
    }

    // 5. Configurações de rede e proxy
    net_setup.apply_to_command(&mut cmd);

    // 6. Suporte a launch_hook personalizado
    let fp_map = crate::fingerprint::translator::extract_fingerprint_map(&profile.fingerprint_json);
    if let Some(hook) = fp_map.get("launch_hook").and_then(|v| v.as_str()) {
        for arg in hook.split_whitespace() {
            if !arg.is_empty() {
                cmd.arg(arg);
            }
        }
    }

    // 7. Injeção de CAMOU_CONFIG via C++ (MaskConfig.hpp) com particionamento
    let camou_config_map = build_camou_config_map(profile, proxy_ip, addon_paths);
    let camou_config_json = serde_json::to_string(&camou_config_map)
        .unwrap_or_else(|_| "{}".to_string());

    info!(
        "🐧 [Linux] Injetando CAMOU_CONFIG (SO perfil: {}, {} bytes) no processo {}",
        profile.os,
        camou_config_json.len(),
        profile.id
    );

    let config_chunks = chunk_environment_variable("CAMOU_CONFIG", &camou_config_json, LINUX_CHUNK_SIZE);
    for (k, v) in config_chunks {
        cmd.env(k, v);
    }
    cmd.env("CAMOU_CONFIG", &camou_config_json);

    // 8. Injeção de CAMOU_PREFS em memória (camoufox.cfg early autoconfig)
    let camou_prefs_map = build_camou_prefs(profile, debug_port, net_setup);
    let camou_prefs_json = serde_json::to_string(&camou_prefs_map)
        .unwrap_or_else(|_| "{}".to_string());

    let prefs_chunks = chunk_environment_variable("CAMOU_PREFS", &camou_prefs_json, LINUX_CHUNK_SIZE);
    for (k, v) in prefs_chunks {
        cmd.env(k, v);
    }

    // 9. URL inicial opcional
    if let Some(u) = initial_url.filter(|s| !s.trim().is_empty()) {
        cmd.arg(u);
    }

    Ok(cmd)
}
