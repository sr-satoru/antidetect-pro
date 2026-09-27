pub mod detector;
pub mod manifest;
pub mod platform;
pub mod service;

use std::path::{Path, PathBuf};

pub use detector::{check_engine_health, clean_broken_engine, get_engine_dir, EngineHealthStatus};
pub use manifest::BrowserManifest;
pub use platform::{get_current_platform_key, get_os_display_name};
pub use service::{BrowserDownloadService, DownloadStatus};

/// Resolve o executável do motor Camoufox instalado no sistema Fury.
/// Retorna Ok(caminho) apenas se o motor estiver íntegro.
pub fn resolve_engine_binary(data_dir: &Path) -> Result<PathBuf, String> {
    match check_engine_health(data_dir) {
        EngineHealthStatus::Installed { executable_path, .. } => Ok(executable_path),
        EngineHealthStatus::Broken { reason } => Err(format!(
            "O motor de navegação Fury está corrompido: {}. É necessário baixar novamente.",
            reason
        )),
        EngineHealthStatus::Missing { .. } => Err(
            "O motor de navegação Fury ainda não está instalado na máquina. Clique em 'Baixar Cliente' para instalar.".to_string(),
        ),
    }
}
