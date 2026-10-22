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
                reason: format!("Executável do AstroBrowser/Chromium não encontrado em {:?}", target_dir),
            });
        }

        let metadata = fs::metadata(&exe_path)
            .map_err(|e| AstrobrowserError::IoError(format!("Falha ao ler metadata do executável: {e}")))?;

        if metadata.len() < 100_000 {
            return Ok(EngineHealthStatus::Broken {
                reason: format!("Executável incompleto (apenas {} bytes)", metadata.len()),
            });
        }

        let exe_dir = exe_path.parent().unwrap_or(target_dir);
        let icu = exe_dir.join("icudtl.dat");
        let pak = exe_dir.join("resources.pak");
        let v8_snap = exe_dir.join("v8_context_snapshot.bin");
        let icu_target = target_dir.join("icudtl.dat");
        let pak_target = target_dir.join("resources.pak");

        let has_vital_files = icu.exists()
            || pak.exists()
            || v8_snap.exists()
            || icu_target.exists()
            || pak_target.exists()
            || fs::read_dir(exe_dir).ok().map(|entries| {
                entries.flatten().any(|e| {
                    let ext = e.path().extension().and_then(|x| x.to_str()).unwrap_or("").to_lowercase();
                    ext == "pak" || ext == "dat" || ext == "bin" || ext == "dll"
                })
            }).unwrap_or(false)
            || fs::read_dir(target_dir).ok().map(|entries| {
                entries.flatten().any(|e| {
                    let ext = e.path().extension().and_then(|x| x.to_str()).unwrap_or("").to_lowercase();
                    ext == "pak" || ext == "dat" || ext == "bin" || ext == "dll"
                })
            }).unwrap_or(false);

        if !has_vital_files {
            return Ok(EngineHealthStatus::Broken {
                reason: "Arquivos vitais do Chromium (icudtl.dat, resources.pak ou bibliotecas) ausentes.".to_string(),
            });
        }

        let version = fs::read_to_string(target_dir.join("installed.json"))
            .or_else(|_| fs::read_to_string(exe_dir.join("installed.json")))
            .or_else(|_| {
                target_dir.parent()
                    .map(|p| fs::read_to_string(p.join("installed.json")))
                    .unwrap_or_else(|| Err(std::io::Error::new(std::io::ErrorKind::NotFound, "")))
            })
            .ok()
            .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
            .and_then(|j| j.get("version").and_then(|v| v.as_str().map(|v| v.to_string())))
            .unwrap_or_else(|| "150.0.7871.114".to_string());

        debug!("✅ AstroBrowser (Windows) detectado e saudável em {:?}", exe_path);

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
