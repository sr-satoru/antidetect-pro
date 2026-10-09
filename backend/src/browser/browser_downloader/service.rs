use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::atomic::AtomicBool;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Mutex;
use tracing::{error, info};

use crate::ws::{WsEvent, WsState};
use super::detector::{self, EngineHealthStatus};
use super::error::BrowserDownloadError;
use super::manifest::EngineKind;

/// Eventos transmitidos durante a execução do download
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum BrowserDownloadEvent {
    Started { total_bytes: u64 },
    Progress {
        downloaded_bytes: u64,
        total_bytes: u64,
        progress_percent: f64,
        speed_mb_s: f32,
        eta_seconds: u64,
    },
    Verifying,
    Extracting { progress_percent: f32 },
    Completed { version: String },
    Error { message: String },
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

    /// Retorna o estado atual do motor prioritário/instalado e do processo de download
    pub async fn get_status(&self) -> (EngineHealthStatus, DownloadStatus) {
        let health = match detector::check_clearcote_health(&self.data_dir) {
            h @ EngineHealthStatus::Installed { .. } => h,
            _ => match detector::check_camoufox_health(&self.data_dir) {
                h @ EngineHealthStatus::Installed { .. } => h,
                _ => detector::check_clearcote_health(&self.data_dir),
            },
        };
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

    /// Dispara a sincronização inteligente de todos os motores pendentes ou que precisem de download
    pub async fn start_smart_sync(&self) -> Result<Vec<String>, BrowserDownloadError> {
        let mut running_guard = self.is_running.lock().await;
        if *running_guard {
            return Err(BrowserDownloadError::AlreadyRunning);
        }
        *running_guard = true;

        let data_dir = self.data_dir.clone();
        let ws = self.ws.clone();
        let status_arc = self.status.clone();
        let is_running_arc = self.is_running.clone();

        // Determina quais motores precisam de download ou reparo
        let mut engines_to_sync = Vec::new();
        if !matches!(detector::check_clearcote_health(&data_dir), EngineHealthStatus::Installed { .. }) {
            engines_to_sync.push(EngineKind::Clearcote);
        }
        if !matches!(detector::check_camoufox_health(&data_dir), EngineHealthStatus::Installed { .. }) {
            engines_to_sync.push(EngineKind::Camoufox);
        }
        if engines_to_sync.is_empty() {
            // Se ambos estão instalados, enfileira o prioritário (Clearcote) para reparo/atualização
            engines_to_sync.push(EngineKind::Clearcote);
        }

        let queued_names: Vec<String> = engines_to_sync.iter().map(|e| e.as_str().to_string()).collect();
        let engines = engines_to_sync.clone();

        tokio::spawn(async move {
            let total = engines.len();
            for (idx, engine) in engines.into_iter().enumerate() {
                info!("🚀 Sincronizando motor {}/{} ('{}')", idx + 1, total, engine.as_str());
                let res = Self::execute_download_and_install(&data_dir, &ws, &status_arc, engine).await;
                if let Err(err) = res {
                    let err_msg = err.to_string();
                    error!("❌ Falha ao sincronizar motor '{}': {}", engine.as_str(), err_msg);
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
                    let mut is_running = is_running_arc.lock().await;
                    *is_running = false;
                    return;
                }
            }

            let mut is_running = is_running_arc.lock().await;
            *is_running = false;

            let mut st = status_arc.lock().await;
            st.is_downloading = false;
            st.stage = "ready".to_string();
            st.progress = 100.0;
            ws.emit(WsEvent::BrowserDownloadProgress {
                stage: "ready".to_string(),
                progress: 100.0,
                downloaded_bytes: st.downloaded_bytes,
                total_bytes: st.total_bytes,
                speed_mb_s: 0.0,
                eta_seconds: 0,
                error: None,
            });
        });

        Ok(queued_names)
    }

    /// Dispara download padrão delegando para a sincronização inteligente
    pub async fn start_download(&self) -> Result<(), String> {
        self.start_smart_sync()
            .await
            .map(|_| ())
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
                        speed_mb_s,
                        eta_seconds,
                    } => {
                        st.is_downloading = true;
                        st.stage = "downloading".to_string();
                        st.downloaded_bytes = downloaded_bytes;
                        st.total_bytes = total_bytes;
                        st.progress = progress_percent as f32;
                        st.speed_mb_s = speed_mb_s;
                        st.eta_seconds = eta_seconds;
                    }
                    BrowserDownloadEvent::Verifying => {
                        st.stage = "verifying".to_string();
                        st.progress = 100.0;
                        st.speed_mb_s = 0.0;
                        st.eta_seconds = 0;
                    }
                    BrowserDownloadEvent::Extracting { progress_percent } => {
                        st.stage = "extracting".to_string();
                        st.progress = progress_percent;
                        st.speed_mb_s = 0.0;
                        st.eta_seconds = 0;
                    }
                    BrowserDownloadEvent::Completed { .. } => {
                        st.is_downloading = false;
                        st.stage = "ready".to_string();
                        st.progress = 100.0;
                        st.speed_mb_s = 0.0;
                        st.eta_seconds = 0;
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

        info!("🌐 Iniciando pipeline desacoplado do motor '{}'", engine.as_str());

        let result = match engine {
            EngineKind::Clearcote => {
                super::astrobrowser::download_astrobrowser(&client, data_dir, cancel_flag, event_tx)
                    .await
                    .map_err(BrowserDownloadError::from)
            }
            EngineKind::Camoufox => {
                super::astrofox::download_astrofox(&client, data_dir, cancel_flag, event_tx)
                    .await
                    .map_err(BrowserDownloadError::from)
            }
        };

        let _ = progress_handle.await;
        result
    }
}
