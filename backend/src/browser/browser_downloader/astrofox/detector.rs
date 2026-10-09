use std::fs;
use std::path::{Path, PathBuf};
use tracing::info;
use crate::browser_downloader::detector::EngineHealthStatus;
pub use super::manifest::{ASTROFOX_CAMOUFOX_VERSION, ASTROFOX_RELEASE_TAG};

/// Candidatos de busca do executável dentro da pasta do motor Camoufox / AstroFox
fn get_camoufox_candidates(engine_dir: &Path) -> Vec<PathBuf> {
    let mut candidates = Vec::new();

    #[cfg(windows)]
    {
        candidates.push(engine_dir.join("star-engine.exe"));
        candidates.push(engine_dir.join("camoufox.exe"));
        candidates.push(engine_dir.join("camoufox").join("camoufox.exe"));
        candidates.push(engine_dir.join("bin").join("camoufox.exe"));
        candidates.push(engine_dir.join("firefox.exe"));
    }

    #[cfg(target_os = "linux")]
    {
        candidates.push(engine_dir.join("star-engine"));
        candidates.push(engine_dir.join("camoufox"));
        candidates.push(engine_dir.join("camoufox").join("camoufox"));
        candidates.push(engine_dir.join("camoufox-bin"));
        candidates.push(engine_dir.join("firefox"));
    }

    #[cfg(target_os = "macos")]
    {
        candidates.push(engine_dir.join("star-engine"));
        candidates.push(engine_dir.join("Camoufox.app").join("Contents").join("MacOS").join("camoufox"));
        candidates.push(engine_dir.join("Contents").join("MacOS").join("camoufox"));
        candidates.push(engine_dir.join("camoufox"));
    }

    candidates
}

/// Localiza e padroniza o executável star-engine dentro do diretório .engine (Camoufox)
pub fn find_or_standardize_executable(engine_dir: &Path) -> Option<PathBuf> {
    #[cfg(windows)]
    let target_name = "star-engine.exe";
    #[cfg(not(windows))]
    let target_name = "star-engine";

    let target_path = engine_dir.join(target_name);
    if target_path.exists() && target_path.is_file() {
        return Some(target_path);
    }

    for candidate in get_camoufox_candidates(engine_dir) {
        if candidate.exists() && candidate.is_file() {
            info!("Padronizando executável do motor Camoufox de {:?} para {:?}", candidate, target_path);
            if fs::rename(&candidate, &target_path).is_ok() {
                return Some(target_path);
            }
            return Some(candidate);
        }
    }

    None
}

/// Localiza o executável do AstroFox dentro do diretório de dados
pub fn resolve_binary(data_dir: &Path) -> Option<PathBuf> {
    let base = if data_dir.ends_with("profiles") {
        data_dir.parent().unwrap_or(data_dir)
    } else {
        data_dir
    };

    let binaries_dir = if base.ends_with("binaries") {
        base.to_path_buf()
    } else {
        base.join("binaries")
    };

    let engine_dir = binaries_dir.join(".engine");
    if let Some(exe) = find_or_standardize_executable(&engine_dir) {
        return Some(exe);
    }

    let astro_dir = binaries_dir.join("astrofox");
    if let Some(exe) = find_or_standardize_executable(&astro_dir) {
        return Some(exe);
    }

    None
}

/// Avalia a integridade e estado de saúde da instalação do AstroFox
pub fn check_health(data_dir: &Path) -> EngineHealthStatus {
    let base = if data_dir.ends_with("profiles") {
        data_dir.parent().unwrap_or(data_dir)
    } else {
        data_dir
    };

    let binaries_dir = if base.ends_with("binaries") {
        base.to_path_buf()
    } else {
        base.join("binaries")
    };

    let engine_dir = binaries_dir.join(".engine");
    let alt_dir = binaries_dir.join("astrofox");

    let effective_dir = if engine_dir.exists() {
        engine_dir
    } else if alt_dir.exists() {
        alt_dir
    } else {
        return EngineHealthStatus::Missing {
            reason: "Diretório do motor AstroFox não encontrado em binaries/.engine.".to_string(),
        };
    };

    let exe_path = match find_or_standardize_executable(&effective_dir) {
        Some(p) => p,
        None => {
            return EngineHealthStatus::Broken {
                reason: "Executável star-engine / camoufox ausente.".to_string(),
            };
        }
    };

    let metadata = match fs::metadata(&exe_path) {
        Ok(m) => m,
        Err(e) => {
            return EngineHealthStatus::Broken {
                reason: format!("Não foi possível inspecionar o executável: {e}"),
            };
        }
    };

    let size_bytes = metadata.len();
    if size_bytes < 100_000 {
        return EngineHealthStatus::Broken {
            reason: format!("Executável corrompido ou incompleto (apenas {size_bytes} bytes)."),
        };
    }

    let bundle_dir = exe_path.parent().unwrap_or(&effective_dir);
    let omni_root = bundle_dir.join("omni.ja");
    let omni_sub = bundle_dir.join("browser").join("omni.ja");
    let has_xul = bundle_dir.join("libxul.so").exists()
        || bundle_dir.join("xul.dll").exists()
        || bundle_dir.join("XUL").exists()
        || bundle_dir.join("Contents").join("MacOS").join("XUL").exists();

    if !omni_root.exists() && !omni_sub.exists() && !has_xul {
        return EngineHealthStatus::Broken {
            reason: "Arquivos vitais do Gecko (omni.ja / libxul) ausentes. Pacote corrompido.".to_string(),
        };
    }

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mode = metadata.permissions().mode();
        if mode & 0o111 == 0 {
            let mut perms = metadata.permissions();
            perms.set_mode(0o755);
            let _ = fs::set_permissions(&exe_path, perms);
        }
    }

    let installed_json_path = effective_dir.join("installed.json");
    let version = fs::read_to_string(&installed_json_path)
        .ok()
        .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
        .and_then(|j| j.get("version").and_then(|v| v.as_str().map(|v| v.to_string())))
        .unwrap_or_else(|| ASTROFOX_RELEASE_TAG.to_string());

    info!(
        "✅ AstroFox detectado e saudável em {:?} (versão: {})",
        exe_path, version
    );

    EngineHealthStatus::Installed {
        executable_path: exe_path,
        version,
        size_bytes,
    }
}
