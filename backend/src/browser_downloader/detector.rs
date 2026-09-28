use std::fs;
use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};
use tracing::{info, warn};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "status")]
pub enum EngineHealthStatus {
    #[serde(rename = "installed")]
    Installed {
        executable_path: PathBuf,
        version: String,
        size_bytes: u64,
    },
    #[serde(rename = "missing")]
    Missing {
        reason: String,
    },
    #[serde(rename = "broken")]
    Broken {
        reason: String,
    },
}

/// Retorna o diretório base onde os arquivos protegidos do motor residem
pub fn get_engine_dir(data_dir: &Path) -> PathBuf {
    let base = if data_dir.ends_with("profiles") {
        data_dir.parent().unwrap_or(data_dir)
    } else {
        data_dir
    };
    base.join("binaries").join(".engine")
}

/// Candidatos de busca do executável dentro da pasta do motor
fn get_executable_candidates(engine_dir: &Path) -> Vec<PathBuf> {
    let mut candidates = Vec::new();

    // 1. Prioridade absoluta: fury-engine / fury-engine.exe
    #[cfg(windows)]
    candidates.push(engine_dir.join("fury-engine.exe"));
    #[cfg(not(windows))]
    candidates.push(engine_dir.join("fury-engine"));

    // 2. Nomes originais que podem ter sido descompactados antes da renomeação
    #[cfg(windows)]
    {
        candidates.push(engine_dir.join("camoufox.exe"));
        candidates.push(engine_dir.join("camoufox").join("camoufox.exe"));
        candidates.push(engine_dir.join("bin").join("camoufox.exe"));
        candidates.push(engine_dir.join("firefox.exe"));
    }

    #[cfg(target_os = "linux")]
    {
        candidates.push(engine_dir.join("camoufox"));
        candidates.push(engine_dir.join("camoufox").join("camoufox"));
        candidates.push(engine_dir.join("camoufox-bin"));
        candidates.push(engine_dir.join("firefox"));
    }

    #[cfg(target_os = "macos")]
    {
        candidates.push(engine_dir.join("Camoufox.app").join("Contents").join("MacOS").join("camoufox"));
        candidates.push(engine_dir.join("Contents").join("MacOS").join("camoufox"));
        candidates.push(engine_dir.join("camoufox"));
    }

    candidates
}

/// Localiza e padroniza o executável fury-engine dentro do diretório .engine
pub fn find_or_standardize_executable(engine_dir: &Path) -> Option<PathBuf> {
    #[cfg(windows)]
    let target_name = "fury-engine.exe";
    #[cfg(not(windows))]
    let target_name = "fury-engine";

    let target_path = engine_dir.join(target_name);
    if target_path.exists() && target_path.is_file() {
        return Some(target_path);
    }

    // Se o executável ainda estiver com o nome de origem (camoufox/firefox), renomeia para fury-engine
    for candidate in get_executable_candidates(engine_dir) {
        if candidate.exists() && candidate.is_file() {
            info!(
                "Renomeando executável do motor de {:?} para {:?}",
                candidate, target_path
            );
            if fs::rename(&candidate, &target_path).is_ok() {
                return Some(target_path);
            }
            // Se o rename falhar (ex: cross-device), usa o candidato encontrado
            return Some(candidate);
        }
    }

    None
}

/// Verifica a integridade completa do motor, detectando versões fantasmas ou corrompidas
pub fn check_engine_health(data_dir: &Path) -> EngineHealthStatus {
    let engine_dir = get_engine_dir(data_dir);
    if !engine_dir.exists() {
        return EngineHealthStatus::Missing {
            reason: "Diretório do motor de navegação não encontrado.".to_string(),
        };
    }

    // 1. Procura o executável
    let exe_path = match find_or_standardize_executable(&engine_dir) {
        Some(p) => p,
        None => {
            return EngineHealthStatus::Broken {
                reason: "Executável do motor ausente ou pasta descompactada de forma incompleta.".to_string(),
            };
        }
    };

    // 2. Valida o tamanho do binário inicial (no Gecko o stub executável tem entre 300 KB e 2 MB)
    let metadata = match fs::metadata(&exe_path) {
        Ok(m) => m,
        Err(e) => {
            return EngineHealthStatus::Broken {
                reason: format!("Não foi possível inspecionar o executável: {}", e),
            };
        }
    };

    let size_bytes = metadata.len();
    if size_bytes < 100_000 {
        return EngineHealthStatus::Broken {
            reason: format!(
                "Executável corrompido ou incompleto (tamanho de apenas {} bytes).",
                size_bytes
            ),
        };
    }

    // 3. Valida a presença de arquivos vitais do Gecko (omni.ja e libxul/xul.dll)
    let omni_root = engine_dir.join("omni.ja");
    let omni_sub = engine_dir.join("browser").join("omni.ja");
    let has_xul = engine_dir.join("libxul.so").exists()
        || engine_dir.join("xul.dll").exists()
        || engine_dir.join("XUL").exists()
        || engine_dir.join("Contents").join("MacOS").join("XUL").exists();

    if !omni_root.exists() && !omni_sub.exists() && !has_xul {
        return EngineHealthStatus::Broken {
            reason: "Arquivos vitais do Gecko (omni.ja / libxul) ausentes. Pacote corrompido.".to_string(),
        };
    }

    // 4. Aplica / garante permissões executáveis no Linux e macOS
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mode = metadata.permissions().mode();
        if mode & 0o111 == 0 {
            let mut perms = metadata.permissions();
            perms.set_mode(0o755);
            if let Err(e) = fs::set_permissions(&exe_path, perms) {
                warn!("Aviso: Falha ao ajustar permissões do executável {:?}: {}", exe_path, e);
            }
        }
    }

    // 4.1. Remove quarentena do Gatekeeper no macOS para liberar execução
    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("xattr")
            .args(["-dr", "com.apple.quarantine"])
            .arg(&exe_path)
            .status();

        if let Some(parent_app) = exe_path.ancestors().find(|p| p.extension().map_or(false, |ext| ext == "app")) {
            let _ = std::process::Command::new("xattr")
                .args(["-dr", "com.apple.quarantine"])
                .arg(parent_app)
                .status();
        }
    }

    // Lê a versão de installed.json se presente, ou assume a versão do manifesto
    let installed_json_path = engine_dir.join("installed.json");
    let version = fs::read_to_string(&installed_json_path)
        .ok()
        .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
        .and_then(|j| j.get("version").and_then(|v| v.as_str().map(|v| v.to_string())))
        .unwrap_or_else(|| "v2.0.0".to_string());

    EngineHealthStatus::Installed {
        executable_path: exe_path,
        version,
        size_bytes,
    }
}

/// Remove apenas os arquivos temporários de download e extração (.download.tmp e .tmp_extract)
pub fn clean_temp_downloads(data_dir: &Path) -> Result<(), String> {
    let binaries_dir = data_dir.join("binaries");
    let tmp_extract = binaries_dir.join(".tmp_extract");
    if tmp_extract.exists() {
        let _ = fs::remove_dir_all(&tmp_extract);
    }

    let tmp_download = binaries_dir.join(".download.tmp");
    if tmp_download.exists() {
        let _ = fs::remove_file(&tmp_download);
    }

    Ok(())
}

/// Remove resíduos de instalações quebradas e temporárias para permitir um download/reparo limpo
pub fn clean_broken_engine(data_dir: &Path) -> Result<(), String> {
    let engine_dir = get_engine_dir(data_dir);
    if engine_dir.exists() {
        info!("Limpando diretório do motor corrompido: {:?}", engine_dir);
        let _ = fs::remove_dir_all(&engine_dir);
    }

    clean_temp_downloads(data_dir)
}

