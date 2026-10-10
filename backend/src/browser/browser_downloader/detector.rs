use std::fs;
use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};

use super::EngineKind;
pub use super::astrobrowser::check_health as check_clearcote_health;
pub use super::astrofox::check_health as check_camoufox_health;

/// Estado de saúde e integridade física de um motor instalado
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

/// Helper para compatibilidade: localiza executável do Clearcote em um diretório
pub fn find_clearcote_executable(engine_dir: &Path) -> Option<PathBuf> {
    let candidates = ["chrome.exe", "clearcote.exe", "astrobrowser.exe", "chrome", "clearcote"];
    for name in &candidates {
        let target = engine_dir.join(name);
        if target.exists() && target.is_file() {
            return Some(target);
        }
    }

    if let Ok(entries) = fs::read_dir(engine_dir) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_dir() {
                for name in &candidates {
                    let target = p.join(name);
                    if target.exists() && target.is_file() {
                        return Some(target);
                    }
                }
            }
        }
    }

    None
}

/// Helper para compatibilidade: localiza executável do Camoufox em um diretório
pub fn find_or_standardize_executable(engine_dir: &Path) -> Option<PathBuf> {
    let candidates = ["star-engine.exe", "camoufox.exe", "astrofox.exe", "firefox.exe", "star-engine", "camoufox", "firefox"];
    for name in &candidates {
        let target = engine_dir.join(name);
        if target.exists() && target.is_file() {
            return Some(target);
        }
    }

    if let Ok(entries) = fs::read_dir(engine_dir) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_dir() {
                for name in &candidates {
                    let target = p.join(name);
                    if target.exists() && target.is_file() {
                        return Some(target);
                    }
                }
            }
        }
    }

    None
}

/// Retorna o diretório base canônico onde os arquivos de um motor específico residem
pub fn get_engine_dir_for(data_dir: &Path, engine: EngineKind) -> PathBuf {
    let base = if data_dir.ends_with("profiles") {
        data_dir.parent().unwrap_or(data_dir)
    } else {
        data_dir
    };
    base.join("binaries").join(engine.default_target_dir())
}

/// Retorna o diretório base padrão do AstroFox (astrofox)
pub fn get_engine_dir(data_dir: &Path) -> PathBuf {
    get_engine_dir_for(data_dir, EngineKind::Camoufox)
}

/// Verifica a integridade completa de um motor específico (Clearcote ou Camoufox)
pub fn check_engine_health_for(data_dir: &Path, engine: EngineKind) -> EngineHealthStatus {
    match engine {
        EngineKind::Clearcote => check_clearcote_health(data_dir),
        EngineKind::Camoufox => check_camoufox_health(data_dir),
    }
}

/// Verifica a integridade do motor padrão (AstroFox)
pub fn check_engine_health(data_dir: &Path) -> EngineHealthStatus {
    check_camoufox_health(data_dir)
}

/// Remove arquivos temporários de download e extração
pub fn clean_temp_downloads(data_dir: &Path) -> Result<(), String> {
    let binaries_dir = data_dir.join("binaries");
    let staging_ab = binaries_dir.join(".astrobrowser-staging");
    if staging_ab.exists() {
        let _ = fs::remove_dir_all(&staging_ab);
    }

    let staging_af = binaries_dir.join(".astrofox-staging");
    if staging_af.exists() {
        let _ = fs::remove_dir_all(&staging_af);
    }

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

/// Remove resíduos de instalações de um motor
pub fn clean_broken_engine_for(data_dir: &Path, engine: EngineKind) -> Result<(), String> {
    let engine_dir = get_engine_dir_for(data_dir, engine);
    if engine_dir.exists() {
        let _ = fs::remove_dir_all(&engine_dir);
    }
    clean_temp_downloads(data_dir)
}

/// Limpa o motor padrão (AstroFox)
pub fn clean_broken_engine(data_dir: &Path) -> Result<(), String> {
    clean_broken_engine_for(data_dir, EngineKind::Camoufox)
}

/// Relatório completo de auditoria e verificação de versão instalada
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngineVerificationReport {
    pub engine: String,
    pub name: String,
    pub status: String,
    pub is_valid: bool,
    pub is_runnable: bool,
    pub version: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub browser_version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub raw_version_output: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub executable_path: Option<String>,
    pub size_bytes: u64,
    pub size_mb: f64,
    pub message: String,
    pub checked_at: String,
}

/// Executa verificação profunda no executável instalado e retorna seu relatório
pub fn verify_installed_engine(data_dir: &Path, engine: EngineKind) -> EngineVerificationReport {
    let now = chrono::Utc::now().to_rfc3339();
    let (name, target_dir, exe_path) = match engine {
        EngineKind::Clearcote => {
            let ops = super::astrobrowser::distributor::get_platform_operations();
            let dir = ops.get_target_dir(data_dir);
            let exe = ops.get_executable_path(&dir);
            ("AstroBrowser (Chromium)", dir, exe)
        }
        EngineKind::Camoufox => {
            let ops = super::astrofox::distributor::get_platform_operations();
            let dir = ops.get_target_dir(data_dir);
            let exe = ops.get_executable_path(&dir);
            ("AstroFox (Firefox)", dir, exe)
        }
    };

    if !exe_path.exists() {
        return EngineVerificationReport {
            engine: engine.as_str().to_string(),
            name: name.to_string(),
            status: "missing".to_string(),
            is_valid: false,
            is_runnable: false,
            version: "N/A".to_string(),
            browser_version: None,
            raw_version_output: None,
            executable_path: Some(exe_path.to_string_lossy().to_string()),
            size_bytes: 0,
            size_mb: 0.0,
            message: format!("Executável não encontrado em {:?}", exe_path),
            checked_at: now,
        };
    }

    let meta = fs::metadata(&exe_path).ok();
    let size_bytes = meta.as_ref().map(|m| m.len()).unwrap_or(0);
    let size_mb = (size_bytes as f64 / (1024.0 * 1024.0) * 10.0).round() / 10.0;

    // Executa --version no binário para obter versão real em tempo de execução
    let run_cmd = std::process::Command::new(&exe_path)
        .arg("--version")
        .output();

    let (is_runnable, raw_version_output) = match run_cmd {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
            let stderr = String::from_utf8_lossy(&out.stderr).trim().to_string();
            let text = if !stdout.is_empty() { stdout } else { stderr };
            (true, if text.is_empty() { None } else { Some(text) })
        }
        Err(e) => (false, Some(format!("Falha ao executar: {e}"))),
    };

    // Lê installed.json se existir para metadados adicionais
    let installed_json = fs::read_to_string(target_dir.join("installed.json"))
        .ok()
        .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok());

    let json_version = installed_json.as_ref()
        .and_then(|j| j.get("version").and_then(|v| v.as_str().map(|s| s.to_string())));
    let browser_ver = installed_json.as_ref()
        .and_then(|j| j.get("browser_version").and_then(|v| v.as_str().map(|s| s.to_string())));

    let detected_version = if let Some(jv) = json_version {
        jv
    } else if let Some(ref raw) = raw_version_output {
        raw.split_whitespace().last().unwrap_or("detectado").to_string()
    } else {
        match engine {
            EngineKind::Clearcote => super::astrobrowser::ASTROBROWSER_CHROMIUM_VERSION.to_string(),
            EngineKind::Camoufox => super::astrofox::ASTROFOX_RELEASE_TAG.to_string(),
        }
    };

    let is_valid = is_runnable && size_bytes > 100_000;
    let message = if is_valid {
        format!("{name} verificado e operacional (Versão: {detected_version}, Tamanho: {size_mb} MB).")
    } else {
        format!("{name} binário corrompido ou inacessível.")
    };

    EngineVerificationReport {
        engine: engine.as_str().to_string(),
        name: name.to_string(),
        status: if is_valid { "installed".to_string() } else { "broken".to_string() },
        is_valid,
        is_runnable,
        version: detected_version,
        browser_version: browser_ver,
        raw_version_output,
        executable_path: Some(exe_path.to_string_lossy().to_string()),
        size_bytes,
        size_mb,
        message,
        checked_at: now,
    }
}
