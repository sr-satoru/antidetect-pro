use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::sync::broadcast;
use tracing::info;

use super::error::AstrobrowserError;
use super::linux::LinuxOperations;
use super::macos::MacOsOperations;
use super::verifier;
use super::windows::WindowsOperations;
use crate::browser_downloader::detector::EngineHealthStatus;
use crate::browser_downloader::traits::{ArchiveFormat, PlatformOperations};
use crate::browser_downloader::{BrowserDownloadEvent, EngineManifest, PlatformConfig};

pub const ASTROBROWSER_RELEASE_TAG: &str = "v0.1.0-pre.23";
pub const ASTROBROWSER_CHROMIUM_VERSION: &str = "150.0.7871.114";

/// Sistema operacional detectado
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum OsKind {
    Windows,
    Linux,
    MacOS,
    Unknown,
}

impl OsKind {
    pub const fn detect() -> Self {
        #[cfg(target_os = "windows")]
        {
            Self::Windows
        }
        #[cfg(target_os = "linux")]
        {
            Self::Linux
        }
        #[cfg(target_os = "macos")]
        {
            Self::MacOS
        }
        #[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
        {
            Self::Unknown
        }
    }

    pub const fn display_name(&self) -> &'static str {
        match self {
            Self::Windows => "Windows",
            Self::Linux => "Linux",
            Self::MacOS => "macOS",
            Self::Unknown => "Desconhecido",
        }
    }
}

/// Arquitetura de CPU detectada
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum ArchKind {
    X86_64,
    Aarch64,
    Unknown,
}

impl ArchKind {
    pub const fn detect() -> Self {
        #[cfg(target_arch = "x86_64")]
        {
            Self::X86_64
        }
        #[cfg(target_arch = "aarch64")]
        {
            Self::Aarch64
        }
        #[cfg(not(any(target_arch = "x86_64", target_arch = "aarch64")))]
        {
            Self::Unknown
        }
    }

    pub const fn display_name(&self) -> &'static str {
        match self {
            Self::X86_64 => "x86_64 (64-bit)",
            Self::Aarch64 => "ARM64 (Apple Silicon / AArch64)",
            Self::Unknown => "Arquitetura não suportada",
        }
    }
}

/// Metadados do artefato binário oficial do AstroBrowser (Clearcote Stealth)
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AstrobrowserArtifact {
    pub platform_key: &'static str,
    pub filename: &'static str,
    pub url: &'static str,
    pub exe_name: &'static str,
    pub archive_format: ArchiveFormat,
    pub sha256: &'static str,
    pub exe_sha256: &'static str,
    pub size_mb: u64,
}

pub static WINDOWS_X64_ARTIFACT: AstrobrowserArtifact = AstrobrowserArtifact {
    platform_key: "windows-x64",
    filename: "clearcote-150.0.7871.114-windows-x64.zip",
    url: "https://github.com/clearcotelabs/clearcote-browser/releases/download/v0.1.0-pre.23/clearcote-150.0.7871.114-windows-x64.zip",
    exe_name: "chrome.exe",
    archive_format: ArchiveFormat::Zip,
    sha256: "93fc03c45b931d8d82f714814318892929f44dd671b0993788332071d53f3135",
    exe_sha256: "f49b0d6bc5a08857e34f951ddc456abc643283ae45ff330ee7c2c39cd75b4869",
    size_mb: 180,
};

pub static LINUX_X64_ARTIFACT: AstrobrowserArtifact = AstrobrowserArtifact {
    platform_key: "linux-x64",
    filename: "clearcote-150.0.7871.114-linux-x64.tar.xz",
    url: "https://github.com/clearcotelabs/clearcote-browser/releases/download/v0.1.0-pre.23/clearcote-150.0.7871.114-linux-x64.tar.xz",
    exe_name: "chrome",
    archive_format: ArchiveFormat::TarXz,
    sha256: "92ebd3de6fbf2c1349d3eb3c210952fcdb8dc9ed35655a35297cd68431fc8ef2",
    exe_sha256: "cc192460484b7dcb1de8df3b3b7bea6f78962d560b6347012d9dbedd3f66720d",
    size_mb: 220,
};

/// Retorna o artefato correspondente ao SO e arquitetura fornecidos
pub fn get_artifact(os: OsKind, arch: ArchKind) -> Result<&'static AstrobrowserArtifact, AstrobrowserError> {
    match (os, arch) {
        (OsKind::Windows, ArchKind::X86_64) => Ok(&WINDOWS_X64_ARTIFACT),
        (OsKind::Linux, ArchKind::X86_64) => Ok(&LINUX_X64_ARTIFACT),
        (o, a) => Err(AstrobrowserError::UnsupportedPlatform(format!(
            "AstroBrowser não possui binário oficial para {} ({})",
            o.display_name(),
            a.display_name()
        ))),
    }
}

/// Retorna o artefato para a máquina atual
pub fn get_current_artifact() -> Result<&'static AstrobrowserArtifact, AstrobrowserError> {
    get_artifact(OsKind::detect(), ArchKind::detect())
}

/// Retorna a chave de plataforma para AstroBrowser
pub fn get_platform_key(os: OsKind, arch: ArchKind) -> Result<&'static str, AstrobrowserError> {
    match (os, arch) {
        (OsKind::Windows, ArchKind::X86_64) => Ok("windows-x64"),
        (OsKind::Linux, ArchKind::X86_64) => Ok("linux-x64"),
        (o, a) => Err(AstrobrowserError::UnsupportedPlatform(format!(
            "SO '{}' com arquitetura '{}' não suportado pelo AstroBrowser",
            o.display_name(),
            a.display_name()
        ))),
    }
}

/// Obtém as operações do SO atual (Diamante -> SO)
pub fn get_platform_operations() -> Box<dyn PlatformOperations<Error = AstrobrowserError>> {
    match OsKind::detect() {
        OsKind::Windows => Box::new(WindowsOperations::new()),
        OsKind::Linux => Box::new(LinuxOperations::new()),
        OsKind::MacOS => Box::new(MacOsOperations::new()),
        OsKind::Unknown => {
            #[cfg(target_os = "windows")]
            {
                Box::new(WindowsOperations::new())
            }
            #[cfg(target_os = "macos")]
            {
                Box::new(MacOsOperations::new())
            }
            #[cfg(not(any(target_os = "windows", target_os = "macos")))]
            {
                Box::new(LinuxOperations::new())
            }
        }
    }
}

/// Verifica a saúde da instalação do AstroBrowser na máquina atual
pub fn check_health(data_dir: &Path) -> EngineHealthStatus {
    let ops = get_platform_operations();
    let target_dir = ops.get_target_dir(data_dir);
    if !target_dir.exists() {
        return EngineHealthStatus::Missing {
            reason: format!(
                "Diretório do AstroBrowser não encontrado em: {:?}",
                target_dir
            ),
        };
    }

    match ops.verify_installation(&target_dir) {
        Ok(status) => status,
        Err(e) => EngineHealthStatus::Broken {
            reason: format!("Falha na validação do AstroBrowser: {e}"),
        },
    }
}

/// Resolve o executável do AstroBrowser
pub fn resolve_binary(data_dir: &Path) -> Option<PathBuf> {
    let ops = get_platform_operations();
    let target_dir = ops.get_target_dir(data_dir);
    let exe = ops.get_executable_path(&target_dir);
    if exe.exists() && exe.is_file() {
        Some(exe)
    } else {
        None
    }
}

/// Executa o fluxo de download, verificação criptográfica e extração distribuindo para o SO
pub async fn download_astrobrowser(
    client: &reqwest::Client,
    data_dir: &Path,
    cancel_flag: Arc<AtomicBool>,
    event_sender: broadcast::Sender<BrowserDownloadEvent>,
) -> Result<PathBuf, AstrobrowserError> {
    let artifact = get_current_artifact()?;
    let ops = get_platform_operations();

    info!(
        "🚀 [AstroBrowser Distributor] Despachando download para {} ({})",
        artifact.platform_key, artifact.filename
    );

    let target_dir = ops.get_target_dir(data_dir);
    let binaries_dir = target_dir
        .parent()
        .map(|p| p.to_path_buf())
        .unwrap_or_else(|| data_dir.join("binaries"));

    tokio::fs::create_dir_all(&binaries_dir)
        .await
        .map_err(|e| AstrobrowserError::IoError(format!("Falha ao criar diretório binaries: {e}")))?;

    let staging_dir = binaries_dir.join(".astrobrowser-staging");
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

    let mut last_tick_time = std::time::Instant::now();
    let mut last_tick_bytes: u64 = 0;
    let mut last_emitted_pct: f64 = 0.0;

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

        let now = std::time::Instant::now();
        let elapsed_tick = now.duration_since(last_tick_time).as_secs_f64();
        let is_completed = downloaded_bytes >= total_bytes;

        // Limita emissões WebSocket a ~8 por segundo (cada 120ms) ou mudanças de 0.5%
        if elapsed_tick >= 0.12 || is_completed || (pct - last_emitted_pct) >= 0.5 {
            let speed_bytes_sec = if elapsed_tick > 0.0 {
                (downloaded_bytes.saturating_sub(last_tick_bytes)) as f64 / elapsed_tick
            } else {
                0.0
            };
            let speed_mb_s = (speed_bytes_sec / (1024.0 * 1024.0)) as f32;
            let eta_seconds = if speed_bytes_sec > 1024.0 && total_bytes > downloaded_bytes {
                ((total_bytes - downloaded_bytes) as f64 / speed_bytes_sec) as u64
            } else {
                0
            };

            last_tick_time = now;
            last_tick_bytes = downloaded_bytes;
            last_emitted_pct = pct;

            let _ = event_sender.send(BrowserDownloadEvent::Progress {
                downloaded_bytes,
                total_bytes,
                progress_percent: pct,
                speed_mb_s,
                eta_seconds,
            });
        }
    }

    out_file
        .flush()
        .await
        .map_err(|e| AstrobrowserError::IoError(format!("Erro ao descarregar buffer: {e}")))?;
    drop(out_file);

    // Renomeia para o arquivo com o nome canônico do artefato
    let final_archive = binaries_dir.join(&artifact.filename);
    let _ = tokio::fs::remove_file(&final_archive).await;
    tokio::fs::rename(&temp_archive, &final_archive)
        .await
        .map_err(|e| AstrobrowserError::IoError(format!("Falha ao renomear arquivo temporário: {e}")))?;

    // 2. Validação SHA-256
    info!("🔒 Validando integridade SHA-256 do pacote baixado...");
    let _ = event_sender.send(BrowserDownloadEvent::Verifying);
    verifier::verify_file_sha256(&final_archive, artifact.sha256)?;

    // 3. Extração via SO
    info!("📦 Extraindo AstroBrowser em {:?} via módulo do SO...", staging_dir);
    let _ = event_sender.send(BrowserDownloadEvent::Extracting { progress_percent: 100.0 });
    tokio::fs::create_dir_all(&staging_dir)
        .await
        .map_err(|e| AstrobrowserError::IoError(format!("Falha ao criar staging: {e}")))?;

    ops.extract_archive(&final_archive, &staging_dir).await?;

    // 4. Grava installed.json e .version
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

    let _ = tokio::fs::write(staging_dir.join(".version"), ASTROBROWSER_RELEASE_TAG).await;

    // 5. Promoção atômica
    let _ = tokio::fs::remove_file(&final_archive).await;

    if target_dir.exists() {
        let backup_dir = binaries_dir.join(".astrobrowser-backup");
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

    Ok(ops.get_executable_path(&target_dir))
}

/// Constrói o manifesto de motor para o AstroBrowser
pub fn get_engine_manifest() -> EngineManifest {
    let mut platforms = HashMap::new();

    let win_chrome = PlatformConfig {
        filename: WINDOWS_X64_ARTIFACT.filename.to_string(),
        url: WINDOWS_X64_ARTIFACT.url.to_string(),
        exe_name: WINDOWS_X64_ARTIFACT.exe_name.to_string(),
        archive_format: ArchiveFormat::Zip,
        sha256: Some(WINDOWS_X64_ARTIFACT.sha256.to_string()),
        exe_sha256: Some(WINDOWS_X64_ARTIFACT.exe_sha256.to_string()),
        source_candidates: vec!["chrome.exe".into(), "clearcote.exe".into()],
        size_mb: WINDOWS_X64_ARTIFACT.size_mb as usize,
    };
    platforms.insert("win-x86_64".to_string(), win_chrome.clone());
    platforms.insert("windows-x64".to_string(), win_chrome);

    let lin_chrome = PlatformConfig {
        filename: LINUX_X64_ARTIFACT.filename.to_string(),
        url: LINUX_X64_ARTIFACT.url.to_string(),
        exe_name: LINUX_X64_ARTIFACT.exe_name.to_string(),
        archive_format: ArchiveFormat::TarXz,
        sha256: Some(LINUX_X64_ARTIFACT.sha256.to_string()),
        exe_sha256: Some(LINUX_X64_ARTIFACT.exe_sha256.to_string()),
        source_candidates: vec!["chrome".into(), "clearcote".into()],
        size_mb: LINUX_X64_ARTIFACT.size_mb as usize,
    };
    platforms.insert("lin-x86_64".to_string(), lin_chrome.clone());
    platforms.insert("linux-x64".to_string(), lin_chrome);

    EngineManifest {
        engine_name: "Clearcote".to_string(),
        version: ASTROBROWSER_CHROMIUM_VERSION.to_string(),
        release_tag: ASTROBROWSER_RELEASE_TAG.to_string(),
        target_dir: "astrobrowser".to_string(),
        platforms,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_astrobrowser_artifact_resolution() {
        let win_art = get_artifact(OsKind::Windows, ArchKind::X86_64).unwrap();
        assert_eq!(win_art.exe_name, "chrome.exe");
        assert_eq!(win_art.archive_format, ArchiveFormat::Zip);
        assert!(!win_art.sha256.is_empty());

        let lin_art = get_artifact(OsKind::Linux, ArchKind::X86_64).unwrap();
        assert_eq!(lin_art.exe_name, "chrome");
        assert_eq!(lin_art.archive_format, ArchiveFormat::TarXz);
        assert!(!lin_art.sha256.is_empty());

        assert!(get_artifact(OsKind::MacOS, ArchKind::Aarch64).is_err());
    }

    #[test]
    fn test_astrobrowser_platform_keys() {
        assert_eq!(
            get_platform_key(OsKind::Windows, ArchKind::X86_64).unwrap(),
            "windows-x64"
        );
        assert_eq!(
            get_platform_key(OsKind::Linux, ArchKind::X86_64).unwrap(),
            "linux-x64"
        );
        assert!(get_platform_key(OsKind::MacOS, ArchKind::Aarch64).is_err());
    }

    #[test]
    fn test_astrobrowser_os_modules_paths() {
        let base_data = Path::new("/var/app/data");

        let win_ops = WindowsOperations::new();
        assert_eq!(
            win_ops.get_target_dir(base_data),
            PathBuf::from("/var/app/data/binaries/astrobrowser")
        );
        assert_eq!(
            win_ops.get_executable_path(&win_ops.get_target_dir(base_data)),
            PathBuf::from("/var/app/data/binaries/astrobrowser/chrome.exe")
        );

        let lin_ops = LinuxOperations::new();
        assert_eq!(
            lin_ops.get_target_dir(base_data),
            PathBuf::from("/var/app/data/binaries/astrobrowser")
        );
        assert_eq!(
            lin_ops.get_executable_path(&lin_ops.get_target_dir(base_data)),
            PathBuf::from("/var/app/data/binaries/astrobrowser/chrome")
        );

        let mac_ops = MacOsOperations::new();
        assert_eq!(
            mac_ops.get_target_dir(base_data),
            PathBuf::from("/var/app/data/binaries/astrobrowser")
        );
    }

    #[test]
    fn test_astrobrowser_missing_detection() {
        let fake_dir = Path::new("/nonexistent/data/path/for/tests");
        let health = check_health(fake_dir);
        match health {
            EngineHealthStatus::Missing { .. } => {}
            other => panic!("Esperado status Missing para pasta inexistente, obteve: {:?}", other),
        }
    }
}
