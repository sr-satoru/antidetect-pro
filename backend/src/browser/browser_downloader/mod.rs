pub mod astrobrowser;
pub mod astrofox;
pub mod detector;

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fmt;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::AtomicBool;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Mutex;
use tracing::{error, info};

use crate::ws::{WsEvent, WsState};

pub use astrobrowser::{
    check_health as check_astrobrowser_health, resolve_binary as resolve_astrobrowser_binary,
    ArchiveFormat, AstrobrowserArtifact, ASTROBROWSER_CHROMIUM_VERSION, ASTROBROWSER_RELEASE_TAG,
};
pub use astrofox::{
    check_health as check_astrofox_health, resolve_binary as resolve_astrofox_binary,
    AstrofoxArtifact, ASTROFOX_CAMOUFOX_VERSION, ASTROFOX_RELEASE_TAG,
};
pub use detector::{
    check_clearcote_health, check_engine_health, check_engine_health_for, clean_broken_engine,
    clean_broken_engine_for, clean_temp_downloads, find_clearcote_executable,
    find_or_standardize_executable, get_engine_dir, get_engine_dir_for, EngineHealthStatus,
};

/// Tipos de motor de navegação suportados pelo sistema
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum EngineKind {
    Clearcote, // AstroBrowser / Chromium
    Camoufox,  // AstroFox / Firefox
}

impl EngineKind {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Clearcote => "clearcote",
            Self::Camoufox => "camoufox",
        }
    }

    pub fn default_target_dir(&self) -> &'static str {
        match self {
            Self::Clearcote => ".engine-chromium",
            Self::Camoufox => ".engine",
        }
    }

    #[allow(clippy::should_implement_trait)]
    pub fn from_str(s: &str) -> Option<Self> {
        if s.eq_ignore_ascii_case("clearcote")
            || s.eq_ignore_ascii_case("astrobrowser")
            || s.eq_ignore_ascii_case("chromium")
        {
            Some(Self::Clearcote)
        } else if s.eq_ignore_ascii_case("camoufox")
            || s.eq_ignore_ascii_case("astrofox")
            || s.eq_ignore_ascii_case("firefox")
        {
            Some(Self::Camoufox)
        } else {
            None
        }
    }
}

/// Configuração de download e metadados de uma plataforma
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlatformConfig {
    pub filename: String,
    pub url: String,
    pub exe_name: String,
    #[serde(default)]
    pub archive_format: ArchiveFormat,
    #[serde(default)]
    pub sha256: Option<String>,
    #[serde(default)]
    pub exe_sha256: Option<String>,
    pub source_candidates: Vec<String>,
    pub size_mb: usize,
}

/// Manifesto descritivo de um motor individual
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngineManifest {
    pub engine_name: String,
    pub version: String,
    pub release_tag: String,
    pub target_dir: String,
    pub platforms: HashMap<String, PlatformConfig>,
}

/// Manifesto global contendo todos os motores disponíveis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrowserManifest {
    pub engine_name: String,
    pub version: String,
    pub platforms: HashMap<String, PlatformConfig>,
    #[serde(default)]
    pub engines: HashMap<String, EngineManifest>,
}

impl BrowserManifest {
    /// Constrói o manifesto oficial embutido a partir dos submódulos especializados de astrobrowser e astrofox
    pub fn builtin() -> Self {
        let mut engines = HashMap::new();
        let af_engine = astrofox::manifest::get_engine_manifest();
        let ab_engine = astrobrowser::manifest::get_engine_manifest();

        let camoufox_platforms = af_engine.platforms.clone();

        engines.insert("camoufox".to_string(), af_engine);
        engines.insert("clearcote".to_string(), ab_engine);

        Self {
            engine_name: "Star Engine".to_string(),
            version: ASTROFOX_RELEASE_TAG.to_string(),
            platforms: camoufox_platforms,
            engines,
        }
    }

    /// Carrega o manifesto:
    /// 1. Tenta carregar de data_dir/browser_manifest.json (customização do usuário no disco).
    /// 2. Caso contrário, gera diretamente dos metadados tipados embutidos dos motores.
    pub fn load(data_dir: &Path) -> Result<Self, BrowserDownloadError> {
        let external_path = data_dir.join("browser_manifest.json");
        if external_path.exists() {
            let content = fs::read_to_string(&external_path).map_err(|e| {
                BrowserDownloadError::ManifestError(format!(
                    "Falha ao ler {}: {}",
                    external_path.display(),
                    e
                ))
            })?;
            return serde_json::from_str::<BrowserManifest>(&content).map_err(|e| {
                BrowserDownloadError::ManifestError(format!(
                    "Erro ao decodificar {}: {}",
                    external_path.display(),
                    e
                ))
            });
        }

        Ok(Self::builtin())
    }
}

/// Erro consolidado da camada de download do navegador
#[derive(Debug)]
pub enum BrowserDownloadError {
    Astrofox(astrofox::error::AstrofoxError),
    Astrobrowser(astrobrowser::error::AstrobrowserError),
    UnsupportedPlatform(String),
    PlatformNotFoundInManifest { platform: String, engine: String },
    ChecksumMismatch { expected: String, got: String },
    DownloadFailed(String),
    ExtractionFailed(String),
    CorruptedPackage(String),
    ManifestError(String),
    HttpError(String),
    IoError(String),
    Cancelled,
    AlreadyRunning,
    Io(std::io::Error),
    Json(serde_json::Error),
}

impl fmt::Display for BrowserDownloadError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Astrofox(e) => write!(f, "{e}"),
            Self::Astrobrowser(e) => write!(f, "{e}"),
            Self::UnsupportedPlatform(msg) => write!(f, "Plataforma não suportada: {msg}"),
            Self::PlatformNotFoundInManifest { platform, engine } => {
                write!(
                    f,
                    "Plataforma '{platform}' não encontrada no manifesto para o motor '{engine}'"
                )
            }
            Self::ChecksumMismatch { expected, got } => {
                write!(f, "Falha na verificação de integridade SHA-256! Esperado: {expected}, Obtido: {got}")
            }
            Self::DownloadFailed(msg) => write!(f, "Falha no download do motor: {msg}"),
            Self::ExtractionFailed(msg) => write!(f, "Falha na descompactação do pacote: {msg}"),
            Self::CorruptedPackage(msg) => write!(f, "Pacote corrompido ou incompleto: {msg}"),
            Self::ManifestError(msg) => write!(f, "Erro no manifesto do motor: {msg}"),
            Self::HttpError(msg) => write!(f, "Erro de rede / HTTP: {msg}"),
            Self::IoError(msg) => write!(f, "Erro de sistema de arquivos: {msg}"),
            Self::Cancelled => write!(f, "Download cancelado pelo usuário."),
            Self::AlreadyRunning => write!(f, "Já existe um download em andamento."),
            Self::Io(err) => write!(f, "Erro de E/S de disco: {err}"),
            Self::Json(err) => write!(f, "Erro JSON: {err}"),
        }
    }
}

impl std::error::Error for BrowserDownloadError {}

impl From<astrofox::error::AstrofoxError> for BrowserDownloadError {
    fn from(err: astrofox::error::AstrofoxError) -> Self {
        Self::Astrofox(err)
    }
}

impl From<astrobrowser::error::AstrobrowserError> for BrowserDownloadError {
    fn from(err: astrobrowser::error::AstrobrowserError) -> Self {
        Self::Astrobrowser(err)
    }
}

impl From<std::io::Error> for BrowserDownloadError {
    fn from(err: std::io::Error) -> Self {
        Self::Io(err)
    }
}

impl From<serde_json::Error> for BrowserDownloadError {
    fn from(err: serde_json::Error) -> Self {
        Self::Json(err)
    }
}

/// Eventos transmitidos durante a execução do download
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum BrowserDownloadEvent {
    Started {
        total_bytes: u64,
    },
    Progress {
        downloaded_bytes: u64,
        total_bytes: u64,
        progress_percent: f64,
    },
    Verifying,
    Extracting,
    Completed {
        version: String,
    },
    Error {
        message: String,
    },
}

/// Estado reativo do processo de download para frontend e telemetria
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadStatus {
    pub is_downloading: bool,
    pub stage: String,
    pub engine: String,
    pub progress: f32,
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
    pub speed_mb_s: f32,
    pub eta_seconds: u64,
    pub error: Option<String>,
}

impl Default for DownloadStatus {
    fn default() -> Self {
        Self {
            is_downloading: false,
            stage: "idle".to_string(),
            engine: "clearcote".to_string(),
            progress: 0.0,
            downloaded_bytes: 0,
            total_bytes: 0,
            speed_mb_s: 0.0,
            eta_seconds: 0,
            error: None,
        }
    }
}

/// Serviço de coordenação de download de navegadores
#[derive(Clone)]
pub struct BrowserDownloadService {
    data_dir: PathBuf,
    ws: WsState,
    status: Arc<Mutex<DownloadStatus>>,
    is_running: Arc<Mutex<bool>>,
}

impl BrowserDownloadService {
    pub fn new(data_dir: &Path, ws: WsState) -> Self {
        Self {
            data_dir: data_dir.to_path_buf(),
            ws,
            status: Arc::new(Mutex::new(DownloadStatus::default())),
            is_running: Arc::new(Mutex::new(false)),
        }
    }

    /// Retorna o estado atual do motor padrão (Camoufox) e do processo de download
    pub async fn get_status(&self) -> (EngineHealthStatus, DownloadStatus) {
        let health = detector::check_engine_health(&self.data_dir);
        let status = self.status.lock().await.clone();
        (health, status)
    }

    /// Retorna o estado específico para um motor (Clearcote ou Camoufox)
    pub async fn get_engine_status(
        &self,
        engine: EngineKind,
    ) -> (EngineHealthStatus, DownloadStatus) {
        let health = detector::check_engine_health_for(&self.data_dir, engine);
        let status = self.status.lock().await.clone();
        (health, status)
    }

    /// Dispara o download de um motor específico delegando para sua pasta respectiva
    pub async fn start_download_engine(
        &self,
        engine: EngineKind,
    ) -> Result<(), BrowserDownloadError> {
        let mut running_guard = self.is_running.lock().await;
        if *running_guard {
            return Err(BrowserDownloadError::AlreadyRunning);
        }
        *running_guard = true;

        let data_dir = self.data_dir.clone();
        let ws = self.ws.clone();
        let status_arc = self.status.clone();
        let is_running_arc = self.is_running.clone();

        tokio::spawn(async move {
            let res = Self::execute_download_and_install(&data_dir, &ws, &status_arc, engine).await;
            let mut is_running = is_running_arc.lock().await;
            *is_running = false;

            if let Err(err) = res {
                let err_msg = err.to_string();
                error!(
                    "❌ Falha no download do motor '{}': {}",
                    engine.as_str(),
                    err_msg
                );
                let mut st = status_arc.lock().await;
                st.is_downloading = false;
                st.stage = "error".to_string();
                st.error = Some(err_msg.clone());
                ws.emit(WsEvent::BrowserDownloadProgress {
                    stage: "error".to_string(),
                    progress: st.progress,
                    downloaded_bytes: st.downloaded_bytes,
                    total_bytes: st.total_bytes,
                    speed_mb_s: 0.0,
                    eta_seconds: 0,
                    error: Some(err_msg),
                });
            }
        });

        Ok(())
    }

    /// Dispara download padrão (se Clearcote já estiver instalado, tenta Camoufox; caso contrário, Clearcote)
    pub async fn start_download(&self) -> Result<(), String> {
        let engine = match detector::check_clearcote_health(&self.data_dir) {
            EngineHealthStatus::Installed { .. } => EngineKind::Camoufox,
            _ => EngineKind::Clearcote,
        };
        self.start_download_engine(engine)
            .await
            .map_err(|e| e.to_string())
    }

    /// Orquestra a execução delegando diretamente para astrobrowser ou astrofox
    async fn execute_download_and_install(
        data_dir: &Path,
        ws: &WsState,
        status_arc: &Arc<Mutex<DownloadStatus>>,
        engine: EngineKind,
    ) -> Result<PathBuf, BrowserDownloadError> {
        let (event_tx, mut event_rx) = tokio::sync::broadcast::channel::<BrowserDownloadEvent>(64);
        let cancel_flag = Arc::new(AtomicBool::new(false));

        let ws_clone = ws.clone();
        let status_clone = status_arc.clone();
        let engine_str = engine.as_str().to_string();

        let progress_handle = tokio::spawn(async move {
            while let Ok(event) = event_rx.recv().await {
                let mut st = status_clone.lock().await;
                st.engine = engine_str.clone();
                match event {
                    BrowserDownloadEvent::Started { total_bytes } => {
                        st.is_downloading = true;
                        st.stage = "connecting".to_string();
                        st.total_bytes = total_bytes;
                        st.progress = 0.0;
                    }
                    BrowserDownloadEvent::Progress {
                        downloaded_bytes,
                        total_bytes,
                        progress_percent,
                    } => {
                        st.is_downloading = true;
                        st.stage = "downloading".to_string();
                        st.downloaded_bytes = downloaded_bytes;
                        st.total_bytes = total_bytes;
                        st.progress = progress_percent as f32;
                    }
                    BrowserDownloadEvent::Verifying => {
                        st.stage = "verifying".to_string();
                        st.progress = 75.0;
                    }
                    BrowserDownloadEvent::Extracting => {
                        st.stage = "extracting".to_string();
                        st.progress = 85.0;
                    }
                    BrowserDownloadEvent::Completed { .. } => {
                        st.is_downloading = false;
                        st.stage = "ready".to_string();
                        st.progress = 100.0;
                    }
                    BrowserDownloadEvent::Error { message } => {
                        st.is_downloading = false;
                        st.stage = "error".to_string();
                        st.error = Some(message);
                    }
                }
                ws_clone.emit(WsEvent::BrowserDownloadProgress {
                    stage: st.stage.clone(),
                    progress: st.progress,
                    downloaded_bytes: st.downloaded_bytes,
                    total_bytes: st.total_bytes,
                    speed_mb_s: st.speed_mb_s,
                    eta_seconds: st.eta_seconds,
                    error: st.error.clone(),
                });
            }
        });

        let client = reqwest::Client::builder()
            .user_agent("StarMultloginBrowser/2.1 (Downloader; +https://github.com/sr-satoru/antidetect-pro)")
            .redirect(reqwest::redirect::Policy::limited(10))
            .connect_timeout(Duration::from_secs(25))
            .timeout(Duration::from_secs(1800))
            .tcp_keepalive(Duration::from_secs(60))
            .build()
            .map_err(|e| BrowserDownloadError::DownloadFailed(format!("Erro ao criar cliente HTTP: {e}")))?;

        info!(
            "🌐 Iniciando pipeline desacoplado do motor '{}'",
            engine.as_str()
        );

        let result = match engine {
            EngineKind::Clearcote => {
                astrobrowser::download_astrobrowser(
                    &client,
                    data_dir,
                    cancel_flag,
                    event_tx,
                )
                .await
                .map_err(BrowserDownloadError::from)
            }
            EngineKind::Camoufox => {
                astrofox::download_astrofox(
                    &client,
                    data_dir,
                    cancel_flag,
                    event_tx,
                )
                .await
                .map_err(BrowserDownloadError::from)
            }
        };

        let _ = progress_handle.await;
        result
    }
}

/// Retorna o nome amigável do sistema operacional atual
pub fn get_os_display_name() -> &'static str {
    #[cfg(target_os = "windows")]
    {
        "Windows"
    }
    #[cfg(target_os = "linux")]
    {
        "Linux"
    }
    #[cfg(target_os = "macos")]
    {
        "macOS"
    }
    #[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
    {
        "Desconhecido"
    }
}

/// Retorna a chave de plataforma atual para o motor padrão (Camoufox legado)
pub fn get_current_platform_key() -> Result<String, String> {
    #[cfg(all(target_os = "windows", target_arch = "x86_64"))]
    return Ok("win-x86_64".to_string());
    #[cfg(all(target_os = "linux", target_arch = "x86_64"))]
    return Ok("lin-x86_64".to_string());
    #[cfg(all(target_os = "linux", target_arch = "aarch64"))]
    return Ok("lin-arm64".to_string());
    #[cfg(all(target_os = "macos", target_arch = "aarch64"))]
    return Ok("mac-arm64".to_string());

    #[cfg(not(any(
        all(target_os = "windows", target_arch = "x86_64"),
        all(target_os = "linux", target_arch = "x86_64"),
        all(target_os = "linux", target_arch = "aarch64"),
        all(target_os = "macos", target_arch = "aarch64")
    )))]
    return Err("Plataforma não suportada".to_string());
}

/// Retorna o diretório canônico padrão de armazenamento por sistema operacional
pub fn get_canonical_app_dir() -> PathBuf {
    if let Ok(env_dir) = std::env::var("STAR_DATA_DIR") {
        let p = PathBuf::from(env_dir);
        if !p.as_os_str().is_empty() {
            return p;
        }
    }

    #[cfg(target_os = "windows")]
    {
        if let Ok(appdata) = std::env::var("LOCALAPPDATA") {
            let star_dir = PathBuf::from(&appdata).join("star-multlogin");
            if star_dir.exists() {
                return star_dir;
            }
            let legacy_dir = PathBuf::from(&appdata).join("Star");
            if legacy_dir.exists() {
                return legacy_dir;
            }
            return star_dir;
        }
    }

    #[cfg(target_os = "macos")]
    {
        if let Ok(home) = std::env::var("HOME") {
            let star_dir = PathBuf::from(&home)
                .join("Library")
                .join("Application Support")
                .join("star-multlogin");
            if star_dir.exists() {
                return star_dir;
            }
            let legacy_dir = PathBuf::from(&home)
                .join("Library")
                .join("Application Support")
                .join("Star");
            if legacy_dir.exists() {
                return legacy_dir;
            }
            return star_dir;
        }
    }

    #[cfg(target_os = "linux")]
    {
        if let Ok(home) = std::env::var("HOME") {
            let star_dir = PathBuf::from(&home)
                .join(".local")
                .join("share")
                .join("star-multlogin");
            if star_dir.exists() {
                return star_dir;
            }
            let legacy_dir = PathBuf::from(&home)
                .join(".local")
                .join("share")
                .join("star");
            if legacy_dir.exists() {
                return legacy_dir;
            }
            return star_dir;
        }
    }

    PathBuf::from("./data")
}

/// Módulo de compatibilidade para platform::*
pub mod platform {
    pub use super::{get_canonical_app_dir, get_current_platform_key, get_os_display_name};
}

/// Resolve o executável do motor Camoufox instalado (compatibilidade legada)
pub fn resolve_engine_binary(data_dir: &Path) -> Result<PathBuf, String> {
    resolve_binary_for_engine(data_dir, EngineKind::Camoufox)
}

/// Resolve o executável do motor Clearcote (Chromium) instalado
pub fn resolve_clearcote_binary(data_dir: &Path) -> Result<PathBuf, String> {
    resolve_binary_for_engine(data_dir, EngineKind::Clearcote)
}

/// Resolve o binário de qualquer motor suportado (Clearcote ou Camoufox)
pub fn resolve_binary_for_engine(data_dir: &Path, engine: EngineKind) -> Result<PathBuf, String> {
    match check_engine_health_for(data_dir, engine) {
        EngineHealthStatus::Installed { executable_path, .. } => Ok(executable_path),
        EngineHealthStatus::Broken { reason } => Err(format!(
            "O motor de navegação '{}' está corrompido: {}. É necessário baixar novamente.",
            engine.as_str(),
            reason
        )),
        EngineHealthStatus::Missing { .. } => Err(format!(
            "O motor de navegação '{}' ainda não está instalado na máquina. Abra a Central de Atualizações para baixar.",
            engine.as_str()
        )),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_manifest_loads_clearcote_and_camoufox() {
        let manifest =
            BrowserManifest::load(Path::new(".")).expect("deve carregar manifesto embutido");
        assert!(manifest.engines.contains_key("clearcote"));
        assert!(manifest.engines.contains_key("camoufox"));

        let clearcote = &manifest.engines["clearcote"];
        assert_eq!(clearcote.version, "150.0.7871.114");
        assert!(clearcote.platforms.contains_key("win-x86_64"));
        assert!(clearcote.platforms.contains_key("lin-x86_64"));

        let lin_cfg = &clearcote.platforms["lin-x86_64"];
        assert_eq!(lin_cfg.archive_format, ArchiveFormat::TarXz);
        assert_eq!(
            lin_cfg.sha256.as_deref(),
            Some("92ebd3de6fbf2c1349d3eb3c210952fcdb8dc9ed35655a35297cd68431fc8ef2")
        );
    }

    #[test]
    fn test_platform_detection() {
        let key = get_current_platform_key();
        assert!(key.is_ok());
        let key_str = key.unwrap();
        assert!(key_str.contains('-'));
        assert!(!get_os_display_name().is_empty());
    }
}
