use std::path::Path;
use super::super::error::AstrofoxError;
use super::paths;

/// Limpa diretórios temporários, staging e instalações do AstroFox no Linux
pub async fn cleanup(data_dir: &Path) -> Result<(), AstrofoxError> {
    let target_dir = paths::get_target_dir(data_dir);
    if let Some(parent) = target_dir.parent() {
        let staging_dir = parent.join(".astrofox-staging");
        let temp_download = parent.join(".astrofox.download");

        if staging_dir.exists() {
            let _ = tokio::fs::remove_dir_all(&staging_dir).await;
        }
        if temp_download.exists() {
            let _ = tokio::fs::remove_file(&temp_download).await;
        }
    }

    if target_dir.exists() {
        let _ = tokio::fs::remove_dir_all(&target_dir).await;
    }

    Ok(())
}
