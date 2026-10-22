pub mod cleaner;
pub mod extractor;
pub mod paths;

use std::fs;
use std::path::{Path, PathBuf};
use async_trait::async_trait;
use tracing::debug;

use super::error::AstrobrowserError;
use crate::browser_downloader::detector::EngineHealthStatus;
use crate::browser_downloader::traits::PlatformOperations;

pub struct LinuxOperations;

impl LinuxOperations {
    pub fn new() -> Self {
        Self
    }
}

impl Default for LinuxOperations {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl PlatformOperations for LinuxOperations {
    type Error = AstrobrowserError;

    fn get_target_dir(&self, data_dir: &Path) -> PathBuf {
        paths::get_target_dir(data_dir)
    }

    fn get_executable_path(&self, target_dir: &Path) -> PathBuf {
        paths::get_executable_path(target_dir)
    }

    async fn extract_archive(&self, archive_path: &Path, staging_dir: &Path) -> Result<(), Self::Error> {
        let arch = archive_path.to_path_buf();
        let target = staging_dir.to_path_buf();

        tokio::task::spawn_blocking(move || {
            let path_str = arch.to_string_lossy();
            let clean_path = path_str.strip_suffix(".download").unwrap_or(&path_str);
            if clean_path.ends_with(".tar.xz") || clean_path.ends_with(".txz") || path_str.contains(".tar.xz") || path_str.contains(".txz") {
                extractor::extract_tar_xz(&arch, &target)
            } else {
                extractor::extract_zip(&arch, &target)
            }
        })
        .await
        .map_err(|e| AstrobrowserError::ExtractionFailed(format!("Erro na tarefa de extração: {e}")))??;

        Ok(())
    }

    fn verify_installation(&self, target_dir: &Path) -> Result<EngineHealthStatus, Self::Error> {
        let exe_path = paths::get_executable_path(target_dir);
        if !exe_path.exists() {
            return Ok(EngineHealthStatus::Missing {
                reason: format!("Executável chrome não encontrado em {:?}", target_dir),
            });
        }

        let metadata = fs::metadata(&exe_path)
            .map_err(|e| AstrobrowserError::IoError(format!("Falha ao ler metadata do executável: {e}")))?;

        if metadata.len() < 100_000 {
            return Ok(EngineHealthStatus::Broken {
                reason: format!("Executável Chromium incompleto ou truncado (apenas {} bytes).", metadata.len()),
            });
        }

        let exe_dir = exe_path.parent().unwrap_or(target_dir);
        let icu = exe_dir.join("icudtl.dat");
        let pak = exe_dir.join("resources.pak");
        let icu_root = target_dir.join("icudtl.dat");
        let pak_root = target_dir.join("resources.pak");
        if (!icu.exists() && !icu_root.exists()) || (!pak.exists() && !pak_root.exists()) {
            return Ok(EngineHealthStatus::Broken {
                reason: "Arquivos vitais do Chromium (icudtl.dat ou resources.pak) ausentes.".to_string(),
            });
        }

        extractor::apply_unix_permissions(target_dir);

        let version = fs::read_to_string(target_dir.join("installed.json"))
            .ok()
            .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
            .and_then(|j| j.get("version").and_then(|v| v.as_str().map(|v| v.to_string())))
            .unwrap_or_else(|| "150.0.7871.114".to_string());

        debug!("✅ AstroBrowser (Linux) detectado e saudável em {:?}", exe_path);

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
