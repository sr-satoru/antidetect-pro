use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::sync::broadcast;
use tracing::info;

use super::error::AstrobrowserError;
use super::extractor;
use super::manifest::{
    get_artifact, HostMachine, ASTROBROWSER_CHROMIUM_VERSION,
    ASTROBROWSER_RELEASE_TAG,
};
use super::verifier;
use crate::browser_downloader::BrowserDownloadEvent;

/// Executa o fluxo completo de download, verificação criptográfica e extração do AstroBrowser para a máquina atual.
pub async fn download_astrobrowser(
    client: &reqwest::Client,
    data_dir: &Path,
    cancel_flag: Arc<AtomicBool>,
    event_sender: broadcast::Sender<BrowserDownloadEvent>,
) -> Result<PathBuf, AstrobrowserError> {
    let machine = HostMachine::detect();
    download_astrobrowser_for(client, data_dir, &machine, cancel_flag, event_sender).await
}

/// Executa o fluxo completo de download, verificação criptográfica e extração do AstroBrowser para uma máquina específica.
pub async fn download_astrobrowser_for(
    client: &reqwest::Client,
    data_dir: &Path,
    machine: &HostMachine,
    cancel_flag: Arc<AtomicBool>,
    event_sender: broadcast::Sender<BrowserDownloadEvent>,
) -> Result<PathBuf, AstrobrowserError> {
    let artifact = get_artifact(machine)?;

    info!(
        "🚀 Iniciando pipeline do AstroBrowser para {} ({})",
        artifact.platform_key, artifact.filename
    );

    let binaries_dir = data_dir.join("binaries");
    tokio::fs::create_dir_all(&binaries_dir)
        .await
        .map_err(|e| {
            AstrobrowserError::IoError(format!("Falha ao criar diretório binaries: {e}"))
        })?;

    let target_dir = binaries_dir.join(".engine-chromium");
    let staging_dir = binaries_dir.join(".engine-chromium-staging");
    let temp_archive = binaries_dir.join(format!("{}.download", artifact.filename));

    let _ = tokio::fs::remove_dir_all(&staging_dir).await;
    let _ = tokio::fs::remove_file(&temp_archive).await;

    // 1. Download com streaming e progresso
    let _ = event_sender.send(BrowserDownloadEvent::Started {
        total_bytes: artifact.size_mb * 1024 * 1024,
    });

    info!("⬇️ Baixando AstroBrowser de {}", artifact.url);
    let response = client.get(artifact.url).send().await.map_err(|e| {
        AstrobrowserError::HttpError(format!("Falha ao conectar no GitHub Releases: {e}"))
    })?;

    if !response.status().is_success() {
        return Err(AstrobrowserError::HttpError(format!(
            "Download do AstroBrowser falhou com status HTTP {}",
            response.status()
        )));
    }

    let total_bytes = response
        .content_length()
        .unwrap_or(artifact.size_mb * 1024 * 1024);
    let mut downloaded_bytes: u64 = 0;
    let mut stream = response.bytes_stream();

    let mut out_file = tokio::fs::File::create(&temp_archive).await.map_err(|e| {
        AstrobrowserError::IoError(format!("Falha ao criar arquivo temporário: {e}"))
    })?;

    use futures_util::StreamExt;
    use tokio::io::AsyncWriteExt;

    while let Some(chunk_res) = stream.next().await {
        if cancel_flag.load(Ordering::Relaxed) {
            let _ = tokio::fs::remove_file(&temp_archive).await;
            return Err(AstrobrowserError::Cancelled);
        }

        let chunk = chunk_res
            .map_err(|e| AstrobrowserError::HttpError(format!("Erro ao ler stream: {e}")))?;
        out_file
            .write_all(&chunk)
            .await
            .map_err(|e| AstrobrowserError::IoError(format!("Erro ao salvar chunk: {e}")))?;

        downloaded_bytes += chunk.len() as u64;

        let pct = if total_bytes > 0 {
            (downloaded_bytes as f64 / total_bytes as f64) * 100.0
        } else {
            0.0
        };

        let _ = event_sender.send(BrowserDownloadEvent::Progress {
            downloaded_bytes,
            total_bytes,
            progress_percent: pct,
        });
    }

    out_file
        .flush()
        .await
        .map_err(|e| AstrobrowserError::IoError(format!("Erro ao descarregar buffer: {e}")))?;
    drop(out_file);

    // 2. Verificação de integridade SHA-256
    info!("🔒 Validando integridade SHA-256 do pacote baixado...");
    let _ = event_sender.send(BrowserDownloadEvent::Verifying);
    verifier::verify_file_sha256(&temp_archive, artifact.sha256)?;

    // 3. Extração segura
    info!("📦 Extraindo AstroBrowser em {:?}...", staging_dir);
    let _ = event_sender.send(BrowserDownloadEvent::Extracting);

    tokio::fs::create_dir_all(&staging_dir)
        .await
        .map_err(|e| AstrobrowserError::IoError(format!("Falha ao criar staging: {e}")))?;

    let temp_archive_clone = temp_archive.clone();
    let staging_dir_clone = staging_dir.clone();
    let archive_format = artifact.archive_format;

    tokio::task::spawn_blocking(move || -> Result<(), AstrobrowserError> {
        extractor::extract_archive(&temp_archive_clone, &staging_dir_clone, archive_format)?;
        extractor::flatten_wrapper_dir(&staging_dir_clone)?;
        Ok(())
    })
    .await
    .map_err(|e| AstrobrowserError::ExtractionFailed(format!("Panic na descompressão: {e}")))??;

    // 4. Aplica permissões unix no executável
    let exe_path = staging_dir.join(artifact.exe_name);
    extractor::apply_unix_permissions(&staging_dir, &exe_path);

    // 5. Grava installed.json e .version
    let installed_info = serde_json::json!({
        "engine_name": "clearcote",
        "version": ASTROBROWSER_CHROMIUM_VERSION,
        "release_tag": ASTROBROWSER_RELEASE_TAG,
        "platform": artifact.platform_key,
        "installed_at": chrono::Utc::now().to_rfc3339(),
        "executable": artifact.exe_name,
    });
    let _ = tokio::fs::write(
        staging_dir.join("installed.json"),
        serde_json::to_string_pretty(&installed_info).unwrap_or_default(),
    )
    .await;

    let version_file = staging_dir.join(".version");
    let _ = tokio::fs::write(&version_file, ASTROBROWSER_RELEASE_TAG).await;

    // 6. Promoção atômica
    let _ = tokio::fs::remove_file(&temp_archive).await;

    if target_dir.exists() {
        let backup_dir = binaries_dir.join(".engine-chromium-backup");
        let _ = tokio::fs::remove_dir_all(&backup_dir).await;
        let _ = tokio::fs::rename(&target_dir, &backup_dir).await;
    }

    tokio::fs::rename(&staging_dir, &target_dir)
        .await
        .map_err(|e| {
            AstrobrowserError::IoError(format!("Falha ao promover staging para produção: {e}"))
        })?;

    info!("✨ AstroBrowser instalado com sucesso em {:?}", target_dir);
    let _ = event_sender.send(BrowserDownloadEvent::Completed {
        version: ASTROBROWSER_RELEASE_TAG.to_string(),
    });

    Ok(target_dir.join(artifact.exe_name))
}
