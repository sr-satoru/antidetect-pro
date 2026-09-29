use std::path::Path;
use tracing::info;

use crate::fingerprint::FingerprintSetupResult;
use crate::models::Profile;
use crate::network::NetworkSetupResult;
use crate::launcher::sys;

/// Monta o comando `tokio::process::Command` com todas as flags do SO, rede, CDP e CAMOU_CONFIG
pub fn build_browser_command(
    binary_path: &Path,
    profile_dir: &Path,
    profile: &Profile,
    debug_port: Option<u16>,
    net_setup: &NetworkSetupResult,
    fp_setup: &FingerprintSetupResult,
) -> tokio::process::Command {
    let mut cmd = tokio::process::Command::new(binary_path);

    // 1. Aplica sintaxe de comando compatível por SO (-profile no Windows, --profile no Linux/macOS)
    sys::configure_browser_command(&mut cmd, profile_dir);

    // 2. Se CDP habilitado, injeta porta de depuração
    if let Some(port) = debug_port {
        cmd.arg("--remote-debugging-port").arg(port.to_string());
    }

    // 3. Aplica regras de rede e proxy
    net_setup.apply_to_command(&mut cmd);

    // 4. Suporte a launch_hook personalizado vindo das impressões digitais do frontend
    let fp_map = crate::fingerprint::translator::extract_fingerprint_map(&profile.fingerprint_json);
    if let Some(hook) = fp_map.get("launch_hook").and_then(|v| v.as_str()) {
        for arg in hook.split_whitespace() {
            if !arg.is_empty() {
                cmd.arg(arg);
            }
        }
    }

    // 5. Injeção de FONTCONFIG_PATH se rodando em Linux
    #[cfg(target_os = "linux")]
    {
        if let Some(engine_dir) = binary_path.parent() {
            let fc_candidate = engine_dir.join("fontconfig").join("bundle");
            let alt_fc = engine_dir.join("fontconfig");
            if fc_candidate.exists() {
                cmd.env("FONTCONFIG_PATH", fc_candidate);
            } else if alt_fc.exists() {
                cmd.env("FONTCONFIG_PATH", alt_fc);
            }
        }
    }

    // 6. Injeta o CAMOU_CONFIG com spoofing nativo de SO e Fingerprint no C++ do Camoufox
    let camou_config_json = fp_setup.to_camou_config_json();
    info!(
        "🎭 Injetando CAMOU_CONFIG (SO: {}, bytes: {}) para o perfil {}",
        profile.os,
        camou_config_json.len(),
        profile.id
    );

    // Chunking em blocos de 2000 bytes caso a string seja grande
    if camou_config_json.len() > 2000 {
        let mut chunk_idx = 1;
        let mut start = 0;
        let bytes = camou_config_json.as_bytes();
        while start < bytes.len() {
            let end = std::cmp::min(start + 2000, bytes.len());
            let chunk = &camou_config_json[start..end];
            cmd.env(format!("CAMOU_CONFIG_{chunk_idx}"), chunk);
            chunk_idx += 1;
            start = end;
        }
    }
    cmd.env("CAMOU_CONFIG", &camou_config_json);

    cmd
}
