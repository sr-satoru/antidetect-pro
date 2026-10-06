pub mod detector;
pub mod manifest;
pub mod platform;
pub mod service;

use std::path::{Path, PathBuf};

pub use detector::{check_engine_health, clean_broken_engine, clean_temp_downloads, get_engine_dir, EngineHealthStatus};
pub use manifest::BrowserManifest;
pub use platform::{get_current_platform_key, get_os_display_name};
pub use service::{BrowserDownloadService, DownloadStatus};

/// Resolve o executável do motor Camoufox instalado no sistema Star Multlogin.
/// Retorna Ok(caminho) apenas se o motor estiver íntegro.
pub fn resolve_engine_binary(data_dir: &Path) -> Result<PathBuf, String> {
    match check_engine_health(data_dir) {
        EngineHealthStatus::Installed { executable_path, .. } => Ok(executable_path),
        EngineHealthStatus::Broken { reason } => Err(format!(
            "O motor de navegação Star Multlogin está corrompido: {}. É necessário baixar novamente.",
            reason
        )),
        EngineHealthStatus::Missing { .. } => Err(
            "O motor de navegação Star Multlogin ainda não está instalado na máquina. Abra a Central de Atualizações para baixar.".to_string(),
        ),
    }
}
