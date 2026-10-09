use std::fs;
use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};

use super::EngineKind;
pub use super::astrobrowser::detector::{
    check_health as check_clearcote_health, find_clearcote_executable,
};
pub use super::astrofox::detector::{
    check_health as check_camoufox_health, find_or_standardize_executable,
};

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

/// Retorna o diretório base onde os arquivos de um motor específico residem
pub fn get_engine_dir_for(data_dir: &Path, engine: EngineKind) -> PathBuf {
    let base = if data_dir.ends_with("profiles") {
        data_dir.parent().unwrap_or(data_dir)
    } else {
        data_dir
    };
    base.join("binaries").join(engine.default_target_dir())
}

/// Retorna o diretório base padrão do Camoufox (.engine) para retrocompatibilidade
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

/// Verifica a integridade do motor padrão (Camoufox) para retrocompatibilidade
pub fn check_engine_health(data_dir: &Path) -> EngineHealthStatus {
    check_camoufox_health(data_dir)
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

/// Remove resíduos de instalações quebradas de um motor
pub fn clean_broken_engine_for(data_dir: &Path, engine: EngineKind) -> Result<(), String> {
    let engine_dir = get_engine_dir_for(data_dir, engine);
    if engine_dir.exists() {
        let _ = fs::remove_dir_all(&engine_dir);
    }
    clean_temp_downloads(data_dir)
}

/// Limpa o motor padrão (Camoufox) para retrocompatibilidade
pub fn clean_broken_engine(data_dir: &Path) -> Result<(), String> {
    clean_broken_engine_for(data_dir, EngineKind::Camoufox)
}
