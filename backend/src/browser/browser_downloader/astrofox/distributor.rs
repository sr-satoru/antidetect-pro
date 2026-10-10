use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::sync::broadcast;
use tracing::info;

use super::error::AstrofoxError;
use super::linux::LinuxOperations;
use super::macos::MacOsOperations;
use super::windows::WindowsOperations;
use crate::browser_downloader::detector::EngineHealthStatus;
use crate::browser_downloader::traits::{ArchiveFormat, PlatformOperations};
use crate::browser_downloader::{BrowserDownloadEvent, EngineManifest, PlatformConfig};

pub const ASTROFOX_RELEASE_TAG: &str = "v3.0.0";
pub const ASTROFOX_CAMOUFOX_VERSION: &str = "152.0.4-beta.31";

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

/// Metadados do artefato binário oficial do AstroFox (Camoufox / Gecko)
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AstrofoxArtifact {
    pub platform_key: &'static str,
    pub filename: &'static str,
    pub url: &'static str,
    pub exe_name: &'static str,
    pub size_mb: u64,
}

pub static WIN_X64_ARTIFACT: AstrofoxArtifact = AstrofoxArtifact {
    platform_key: "win-x86_64",
    filename: "camoufox-152.0.4-beta.31-win.x86_64.zip",
    url: "https://github.com/sr-satoru/navegador/releases/download/v3.0.0/camoufox-152.0.4-beta.31-win.x86_64.zip",
    exe_name: "star-engine.exe",
    size_mb: 456,
};

pub static LIN_X64_ARTIFACT: AstrofoxArtifact = AstrofoxArtifact {
    platform_key: "lin-x86_64",
    filename: "camoufox-152.0.4-beta.31-lin.x86_64.zip",
    url: "https://github.com/sr-satoru/navegador/releases/download/v3.0.0/camoufox-152.0.4-beta.31-lin.x86_64.zip",
    exe_name: "star-engine",
    size_mb: 632,
};

pub static LIN_ARM64_ARTIFACT: AstrofoxArtifact = AstrofoxArtifact {
    platform_key: "lin-arm64",
    filename: "camoufox-152.0.4-beta.31-lin.arm64.zip",
    url: "https://github.com/sr-satoru/navegador/releases/download/v3.0.0/camoufox-152.0.4-beta.31-lin.arm64.zip",
    exe_name: "star-engine",
    size_mb: 623,
};

pub static MAC_ARM64_ARTIFACT: AstrofoxArtifact = AstrofoxArtifact {
    platform_key: "mac-arm64",
    filename: "camoufox-152.0.4-beta.31-mac.arm64.zip",
    url: "https://github.com/sr-satoru/navegador/releases/download/v3.0.0/camoufox-152.0.4-beta.31-mac.arm64.zip",
    exe_name: "star-engine",
    size_mb: 298,
};

/// Retorna o artefato correspondente ao SO e arquitetura fornecidos
pub fn get_artifact(os: OsKind, arch: ArchKind) -> Result<&'static AstrofoxArtifact, AstrofoxError> {
    match (os, arch) {
        (OsKind::Windows, ArchKind::X86_64) => Ok(&WIN_X64_ARTIFACT),
        (OsKind::Linux, ArchKind::X86_64) => Ok(&LIN_X64_ARTIFACT),
        (OsKind::Linux, ArchKind::Aarch64) => Ok(&LIN_ARM64_ARTIFACT),
        (OsKind::MacOS, ArchKind::Aarch64) => Ok(&MAC_ARM64_ARTIFACT),
        (o, a) => Err(AstrofoxError::UnsupportedPlatform(format!(
            "AstroFox não suporta {} ({})",
            o.display_name(),
            a.display_name()
        ))),
    }
}

/// Retorna o artefato para a máquina atual
pub fn get_current_artifact() -> Result<&'static AstrofoxArtifact, AstrofoxError> {
    get_artifact(OsKind::detect(), ArchKind::detect())
}

/// Retorna a chave de plataforma para AstroFox
pub fn get_platform_key(os: OsKind, arch: ArchKind) -> Result<&'static str, AstrofoxError> {
    match (os, arch) {
        (OsKind::Windows, ArchKind::X86_64) => Ok("win-x86_64"),
        (OsKind::Linux, ArchKind::X86_64) => Ok("lin-x86_64"),
        (OsKind::Linux, ArchKind::Aarch64) => Ok("lin-arm64"),
        (OsKind::MacOS, ArchKind::Aarch64) => Ok("mac-arm64"),
        (o, a) => Err(AstrofoxError::UnsupportedPlatform(format!(
            "SO '{}' com arquitetura '{}' não suportado pelo AstroFox",
            o.display_name(),
            a.display_name()
        ))),
    }
}

/// Obtém as operações do SO atual (Diamante -> SO)
pub fn get_platform_operations() -> Box<dyn PlatformOperations<Error = AstrofoxError>> {
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

/// Verifica a saúde da instalação do AstroFox na máquina atual
pub fn check_health(data_dir: &Path) -> EngineHealthStatus {
    let ops = get_platform_operations();
    let target_dir = ops.get_target_dir(data_dir);
    if !target_dir.exists() {
        return EngineHealthStatus::Missing {
            reason: format!(
                "Diretório do AstroFox não encontrado em: {:?}",
                target_dir
            ),
        };
    }

    match ops.verify_installation(&target_dir) {
        Ok(status) => status,
        Err(e) => EngineHealthStatus::Broken {
            reason: format!("Falha na validação do AstroFox: {e}"),
        },
    }
}

/// Resolve o executável do AstroFox
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

/// Executa o fluxo de download e extração do AstroFox distribuindo para o SO
pub async fn download_astrofox(
    client: &reqwest::Client,
    data_dir: &Path,
    cancel_flag: Arc<AtomicBool>,
    event_sender: broadcast::Sender<BrowserDownloadEvent>,
) -> Result<PathBuf, AstrofoxError> {
    let artifact = get_current_artifact()?;
    let ops = get_platform_operations();

    info!(
        "🚀 [AstroFox Distributor] Despachando download para {} ({})",
        artifact.platform_key, artifact.filename
    );

    let target_dir = ops.get_target_dir(data_dir);
    let binaries_dir = target_dir
        .parent()
        .map(|p| p.to_path_buf())
        .unwrap_or_else(|| data_dir.join("binaries"));

    // Trava de segurança: impede corromper arquivos se o motor já estiver rodando
    let existing_exe = ops.get_executable_path(&target_dir);
    if crate::browser_downloader::detector::is_executable_running(&existing_exe) {
        return Err(AstrofoxError::EngineInUse(
            "O motor AstroFox (Firefox) está em execução. Feche todas as janelas e perfis abertos antes de instalar ou atualizar.".to_string(),
        ));
    }

    tokio::fs::create_dir_all(&binaries_dir)
        .await
        .map_err(|e| AstrofoxError::IoError(format!("Falha ao criar diretório binaries: {e}")))?;

    let temp_archive = binaries_dir.join(format!("{}.download", artifact.filename));
    let _ = tokio::fs::remove_file(&temp_archive).await;

    // 1. Download com streaming e progresso
    let _ = event_sender.send(BrowserDownloadEvent::Started {
        total_bytes: artifact.size_mb * 1024 * 1024,
    });

    info!("⬇️ Baixando AstroFox de {}", artifact.url);
    let response = client.get(artifact.url).send().await.map_err(|e| {
        AstrofoxError::HttpError(format!("Falha ao conectar no GitHub Releases: {e}"))
    })?;

    if !response.status().is_success() {
        return Err(AstrofoxError::HttpError(format!(
            "Download do AstroFox falhou com status HTTP {}",
            response.status()
        )));
    }

    let total_bytes = response
        .content_length()
        .unwrap_or(artifact.size_mb * 1024 * 1024);
    let mut downloaded_bytes: u64 = 0;
    let mut stream = response.bytes_stream();

    let mut out_file = tokio::fs::File::create(&temp_archive).await.map_err(|e| {
        AstrofoxError::IoError(format!("Falha ao criar arquivo temporário: {e}"))
    })?;

    use futures_util::StreamExt;
    use tokio::io::AsyncWriteExt;

    let mut last_tick_time = std::time::Instant::now();
    let mut last_tick_bytes: u64 = 0;
    let mut last_emitted_pct: f64 = 0.0;

    while let Some(chunk_res) = stream.next().await {
        if cancel_flag.load(Ordering::Relaxed) {
            let _ = tokio::fs::remove_file(&temp_archive).await;
            return Err(AstrofoxError::Cancelled);
        }

        let chunk = chunk_res
            .map_err(|e| AstrofoxError::HttpError(format!("Erro ao ler stream: {e}")))?;
        out_file
            .write_all(&chunk)
            .await
            .map_err(|e| AstrofoxError::IoError(format!("Erro ao salvar chunk: {e}")))?;

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
        .map_err(|e| AstrofoxError::IoError(format!("Erro ao descarregar buffer: {e}")))?;
    drop(out_file);

    // Renomeia para o arquivo com o nome canônico do artefato
    let final_archive = binaries_dir.join(&artifact.filename);
    let _ = tokio::fs::remove_file(&final_archive).await;
    tokio::fs::rename(&temp_archive, &final_archive)
        .await
        .map_err(|e| AstrofoxError::IoError(format!("Falha ao renomear arquivo temporário: {e}")))?;

    // 2. Extração direta via SO (sem renomear pastas para evitar bloqueios de antivírus/Defender)
    info!("📦 Extraindo AstroFox diretamente em {:?} via módulo do SO...", target_dir);
    let _ = event_sender.send(BrowserDownloadEvent::Extracting { progress_percent: 100.0 });
    tokio::fs::create_dir_all(&target_dir)
        .await
        .map_err(|e| AstrofoxError::IoError(format!("Falha ao criar pasta de destino: {e}")))?;

    ops.extract_archive(&final_archive, &target_dir).await?;

    // 3. Grava installed.json e .version diretamente na pasta final
    let installed_info = serde_json::json!({
        "engine_name": "camoufox",
        "version": ASTROFOX_RELEASE_TAG,
        "browser_version": ASTROFOX_CAMOUFOX_VERSION,
        "platform": artifact.platform_key,
        "installed_at": chrono::Utc::now().to_rfc3339(),
        "executable": artifact.exe_name,
    });
    let _ = tokio::fs::write(
        target_dir.join("installed.json"),
        serde_json::to_string_pretty(&installed_info).unwrap_or_default(),
    )
    .await;

    let _ = tokio::fs::write(target_dir.join(".version"), ASTROFOX_RELEASE_TAG).await;

    // 4. Limpeza do arquivo de download e eventuais sobras antigas de staging/backup
    let _ = tokio::fs::remove_file(&final_archive).await;
    let _ = tokio::fs::remove_dir_all(binaries_dir.join(".astrofox-staging")).await;
    let _ = tokio::fs::remove_dir_all(binaries_dir.join(".astrofox-backup")).await;

    // 5. No Windows: remove o alternate data stream Zone.Identifier se existir (desbloqueio SmartScreen)
    let final_exe = ops.get_executable_path(&target_dir);
    #[cfg(target_os = "windows")]
    {
        if final_exe.exists() {
            if let Some(file_name) = final_exe.file_name() {
                let zone_stream = final_exe.with_file_name(format!("{}:Zone.Identifier", file_name.to_string_lossy()));
                let _ = std::fs::remove_file(zone_stream);
            }
        }
    }

    let _ = crate::browser_downloader::path_registry::register_engine(
        data_dir,
        "camoufox",
        ASTROFOX_CAMOUFOX_VERSION,
        &target_dir,
        &final_exe,
    );

    info!("✨ AstroFox instalado com sucesso em {:?}", target_dir);
    let _ = event_sender.send(BrowserDownloadEvent::Completed {
        version: ASTROFOX_RELEASE_TAG.to_string(),
    });

    Ok(final_exe)
}

/// Constrói o manifesto de motor para o AstroFox
pub fn get_engine_manifest() -> EngineManifest {
    let mut platforms = HashMap::new();
    let artifacts = [
        &WIN_X64_ARTIFACT,
        &LIN_X64_ARTIFACT,
        &LIN_ARM64_ARTIFACT,
        &MAC_ARM64_ARTIFACT,
    ];

    for art in artifacts {
        platforms.insert(
            art.platform_key.to_string(),
            PlatformConfig {
                filename: art.filename.to_string(),
                url: art.url.to_string(),
                exe_name: art.exe_name.to_string(),
                archive_format: ArchiveFormat::Zip,
                sha256: None,
                exe_sha256: None,
                source_candidates: vec!["star-engine.exe".into(), "star-engine".into()],
                size_mb: art.size_mb as usize,
            },
        );
    }

    EngineManifest {
        engine_name: "Camoufox".to_string(),
        version: ASTROFOX_CAMOUFOX_VERSION.to_string(),
        release_tag: ASTROFOX_RELEASE_TAG.to_string(),
        target_dir: "astrofox".to_string(),
        platforms,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_astrofox_artifact_resolution() {
        let win = get_artifact(OsKind::Windows, ArchKind::X86_64).unwrap();
        assert_eq!(win.exe_name, "star-engine.exe");

        let lin = get_artifact(OsKind::Linux, ArchKind::X86_64).unwrap();
        assert_eq!(lin.exe_name, "star-engine");

        let lin_arm = get_artifact(OsKind::Linux, ArchKind::Aarch64).unwrap();
        assert_eq!(lin_arm.platform_key, "lin-arm64");

        let mac = get_artifact(OsKind::MacOS, ArchKind::Aarch64).unwrap();
        assert_eq!(mac.platform_key, "mac-arm64");
    }

    #[test]
    fn test_astrofox_platform_keys() {
        assert_eq!(
            get_platform_key(OsKind::Windows, ArchKind::X86_64).unwrap(),
            "win-x86_64"
        );
        assert_eq!(
            get_platform_key(OsKind::Linux, ArchKind::X86_64).unwrap(),
            "lin-x86_64"
        );
        assert_eq!(
            get_platform_key(OsKind::Linux, ArchKind::Aarch64).unwrap(),
            "lin-arm64"
        );
        assert_eq!(
            get_platform_key(OsKind::MacOS, ArchKind::Aarch64).unwrap(),
            "mac-arm64"
        );

        assert!(get_platform_key(OsKind::MacOS, ArchKind::X86_64).is_err());
    }

    #[test]
    fn test_astrofox_os_modules_paths() {
        let base_data = Path::new("/var/app/data");

        let win_ops = WindowsOperations::new();
        assert_eq!(
            win_ops.get_target_dir(base_data),
            PathBuf::from("/var/app/data/binaries/astrofox")
        );
        assert_eq!(
            win_ops.get_executable_path(&win_ops.get_target_dir(base_data)),
            PathBuf::from("/var/app/data/binaries/astrofox/star-engine.exe")
        );

        let lin_ops = LinuxOperations::new();
        assert_eq!(
            lin_ops.get_target_dir(base_data),
            PathBuf::from("/var/app/data/binaries/astrofox")
        );
        assert_eq!(
            lin_ops.get_executable_path(&lin_ops.get_target_dir(base_data)),
            PathBuf::from("/var/app/data/binaries/astrofox/star-engine")
        );

        let mac_ops = MacOsOperations::new();
        assert_eq!(
            mac_ops.get_target_dir(base_data),
            PathBuf::from("/var/app/data/binaries/astrofox")
        );
    }

    #[test]
    fn test_astrofox_missing_detection() {
        let fake_dir = Path::new("/nonexistent/data/path/for/tests");
        let health = check_health(fake_dir);
        match health {
            EngineHealthStatus::Missing { .. } => {}
            other => panic!("Esperado status Missing para pasta inexistente, obteve: {:?}", other),
        }
    }
}
