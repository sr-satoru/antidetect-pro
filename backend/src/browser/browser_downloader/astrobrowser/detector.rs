use std::fs;
use std::path::{Path, PathBuf};
use tracing::info;
use crate::browser_downloader::detector::EngineHealthStatus;
use super::extractor::apply_unix_permissions;
pub use super::manifest::{ASTROBROWSER_CHROMIUM_VERSION, ASTROBROWSER_RELEASE_TAG};

/// Candidatos de busca do executável dentro da pasta do motor Clearcote
fn get_clearcote_candidates(engine_dir: &Path) -> Vec<PathBuf> {
    let mut candidates = Vec::new();

    #[cfg(windows)]
    {
        candidates.push(engine_dir.join("chrome.exe"));
        candidates.push(engine_dir.join("clearcote.exe"));
        candidates.push(engine_dir.join("star-chromium.exe"));
        candidates.push(engine_dir.join("browser").join("chrome.exe"));
    }

    #[cfg(not(windows))]
    {
        candidates.push(engine_dir.join("chrome"));
        candidates.push(engine_dir.join("clearcote"));
        candidates.push(engine_dir.join("star-chromium"));
        candidates.push(engine_dir.join("browser").join("chrome"));
    }

    candidates
}

/// Localiza o executável do Clearcote / Chromium
pub fn find_clearcote_executable(engine_dir: &Path) -> Option<PathBuf> {
    get_clearcote_candidates(engine_dir)
        .into_iter()
        .find(|candidate| candidate.exists() && candidate.is_file())
}

/// Localiza o executável do AstroBrowser dentro do diretório de dados
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

    let engine_dir = binaries_dir.join(".engine-chromium");
    if let Some(exe) = find_clearcote_executable(&engine_dir) {
        return Some(exe);
    }

    let astro_dir = binaries_dir.join("astrobrowser");
    if let Some(exe) = find_clearcote_executable(&astro_dir) {
        return Some(exe);
    }

    None
}

/// Avalia a integridade e estado de saúde da instalação do AstroBrowser
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

    let engine_dir = binaries_dir.join(".engine-chromium");
    let alt_dir = binaries_dir.join("astrobrowser");

    let effective_dir = if engine_dir.exists() {
        engine_dir
    } else if alt_dir.exists() {
        alt_dir
    } else {
        return EngineHealthStatus::Missing {
            reason: "Diretório do motor AstroBrowser não encontrado em binaries/.engine-chromium.".to_string(),
        };
    };

    let exe_path = match find_clearcote_executable(&effective_dir) {
        Some(p) => p,
        None => {
            return EngineHealthStatus::Broken {
                reason: "Executável chrome / clearcote não encontrado na pasta .engine-chromium.".to_string(),
            };
        }
    };

    let metadata = match fs::metadata(&exe_path) {
        Ok(m) => m,
        Err(e) => {
            return EngineHealthStatus::Broken {
                reason: format!("Não foi possível inspecionar o executável Chromium: {e}"),
            };
        }
    };

    let size_bytes = metadata.len();
    if size_bytes < 5_000_000 {
        return EngineHealthStatus::Broken {
            reason: format!("Executável Chromium incompleto ou truncado (apenas {size_bytes} bytes)."),
        };
    }

    let bundle_dir = exe_path.parent().unwrap_or(&effective_dir);
    let icu = bundle_dir.join("icudtl.dat");
    let pak = bundle_dir.join("resources.pak");
    if !icu.exists() || !pak.exists() {
        return EngineHealthStatus::Broken {
            reason: "Arquivos vitais do Chromium (icudtl.dat ou resources.pak) ausentes.".to_string(),
        };
    }

    apply_unix_permissions(&effective_dir, &exe_path);

    let installed_json_path = effective_dir.join("installed.json");
    let version = fs::read_to_string(&installed_json_path)
        .ok()
        .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
        .and_then(|j| j.get("version").and_then(|v| v.as_str().map(|v| v.to_string())))
        .unwrap_or_else(|| ASTROBROWSER_CHROMIUM_VERSION.to_string());

    info!(
        "✅ AstroBrowser detectado e saudável em {:?} (versão: {})",
        exe_path, version
    );

    EngineHealthStatus::Installed {
        executable_path: exe_path,
        version,
        size_bytes,
    }
}
