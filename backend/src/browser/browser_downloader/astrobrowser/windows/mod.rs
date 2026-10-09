pub mod cleaner;
pub mod extractor;
pub mod paths;

use std::fs;
use std::path::{Path, PathBuf};
use async_trait::async_trait;
use tracing::info;

use super::error::AstrobrowserError;
use crate::browser_downloader::detector::EngineHealthStatus;
use crate::browser_downloader::traits::PlatformOperations;

pub struct WindowsOperations;

impl WindowsOperations {
    pub fn new() -> Self {
        Self
    }
}

impl Default for WindowsOperations {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl PlatformOperations for WindowsOperations {
    type Error = AstrobrowserError;

    fn get_target_dir(&self, data_dir: &Path) -> PathBuf {
        paths::get_target_dir(data_dir)
    }

    fn get_executable_path(&self, target_dir: &Path) -> PathBuf {
        paths::get_executable_path(target_dir)
    }

    async fn extract_archive(&self, archive_path: &Path, staging_dir: &Path) -> Result<(), Self::Error> {
        let zip_path = archive_path.to_path_buf();
        let target = staging_dir.to_path_buf();
        tokio::task::spawn_blocking(move || extractor::extract_zip(&zip_path, &target))
            .await
            .map_err(|e| AstrobrowserError::ExtractionFailed(format!("Erro na tarefa de extração: {e}")))??;
        Ok(())
    }

    fn verify_installation(&self, target_dir: &Path) -> Result<EngineHealthStatus, Self::Error> {
        let exe_path = paths::get_executable_path(target_dir);
        if !exe_path.exists() {
            return Ok(EngineHealthStatus::Missing {
                reason: format!("Executável chrome.exe não encontrado em {:?}", target_dir),
            });
        }

        let metadata = fs::metadata(&exe_path)
            .map_err(|e| AstrobrowserError::IoError(format!("Falha ao ler metadata do executável: {e}")))?;

        if metadata.len() < 5_000_000 {
            return Ok(EngineHealthStatus::Broken {
                reason: format!("Executável incompleto (apenas {} bytes)", metadata.len()),
            });
        }

        let icu = target_dir.join("icudtl.dat");
        let pak = target_dir.join("resources.pak");
        if !icu.exists() || !pak.exists() {
            return Ok(EngineHealthStatus::Broken {
                reason: "Arquivos vitais do Chromium (icudtl.dat ou resources.pak) ausentes.".to_string(),
            });
        }

        let version = fs::read_to_string(target_dir.join("installed.json"))
            .ok()
            .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
            .and_then(|j| j.get("version").and_then(|v| v.as_str().map(|v| v.to_string())))
            .unwrap_or_else(|| "150.0.7871.114".to_string());

        info!("✅ AstroBrowser (Windows) detectado e saudável em {:?}", exe_path);

        Ok(EngineHealthStatus::Installed {
            executable_path: exe_path,
            version,
            size_bytes: metadata.len(),
        })
    }

    async fn cleanup_installation(&self, data_dir: &Path) -> Result<(), Self::Error> {
        cleaner::cleanup(data_dir).await
    }
}
