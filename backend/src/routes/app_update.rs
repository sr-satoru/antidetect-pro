use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::io::AsyncWriteExt;
use tokio::sync::{Mutex, oneshot};
use tracing::{error, info, warn};

use crate::ws::{WsEvent, WsState};

#[derive(Debug, Deserialize)]
pub struct CheckUpdateQuery {
    pub current_version: Option<String>,
    pub os: Option<String>,
    pub arch: Option<String>,
    pub format: Option<String>, // "appimage", "deb", "rpm", "exe", "msi", "dmg"
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PackageFormat {
    AppImage,
    Deb,
    Rpm,
    Exe,
    Msi,
    Dmg,
    TarGz,
    Unknown,
}

impl PackageFormat {
    pub fn as_str(&self) -> &'static str {
        match self {
            PackageFormat::AppImage => "appimage",
            PackageFormat::Deb => "deb",
            PackageFormat::Rpm => "rpm",
            PackageFormat::Exe => "exe",
            PackageFormat::Msi => "msi",
            PackageFormat::Dmg => "dmg",
            PackageFormat::TarGz => "targz",
            PackageFormat::Unknown => "unknown",
        }
    }

    pub fn display_name(&self) -> &'static str {
        match self {
            PackageFormat::AppImage => "AppImage (Portátil)",
            PackageFormat::Deb => "Pacote .deb (Debian/Ubuntu/Mint)",
            PackageFormat::Rpm => "Pacote .rpm (Fedora/RHEL)",
            PackageFormat::Exe => "Instalador .exe (NSIS)",
            PackageFormat::Msi => "Pacote .msi (Windows Installer)",
            PackageFormat::Dmg => "Imagem .dmg (macOS)",
            PackageFormat::TarGz => "Arquivo .tar.gz",
            PackageFormat::Unknown => "Formato Genérico",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().trim() {
            "appimage" => Some(PackageFormat::AppImage),
            "deb" => Some(PackageFormat::Deb),
            "rpm" => Some(PackageFormat::Rpm),
            "exe" => Some(PackageFormat::Exe),
            "msi" => Some(PackageFormat::Msi),
            "dmg" => Some(PackageFormat::Dmg),
            "tar.gz" | "targz" => Some(PackageFormat::TarGz),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AppAssetInfo {
    pub name: String,
    pub download_url: String,
    pub size_bytes: u64,
    pub format: PackageFormat,
}

impl AppAssetInfo {
    pub fn new(name: String, download_url: String, size_bytes: u64) -> Self {
        let format = classify_asset_format(&name);
        Self {
            name,
            download_url,
            size_bytes,
            format,
        }
    }
}

pub fn classify_asset_format(name: &str) -> PackageFormat {
    let lower = name.to_lowercase();
    if lower.ends_with(".appimage") {
        PackageFormat::AppImage
    } else if lower.ends_with(".deb") {
        PackageFormat::Deb
    } else if lower.ends_with(".rpm") {
        PackageFormat::Rpm
    } else if lower.contains("setup.exe") || lower.ends_with(".exe") {
        PackageFormat::Exe
    } else if lower.ends_with(".msi") {
        PackageFormat::Msi
    } else if lower.ends_with(".dmg") {
        PackageFormat::Dmg
    } else if lower.ends_with(".tar.gz") {
        PackageFormat::TarGz
    } else {
        PackageFormat::Unknown
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppUpdateResponse {
    pub has_update: bool,
    pub current_version: String,
    pub latest_version: String,
    pub tag_name: String,
    pub name: String,
    pub body: String,
    pub published_at: String,
    pub html_url: String,
    pub platform: String,
    pub os_name: String,
    pub detected_format: String,
    pub detection_reason: String,
    pub matched_asset: Option<AppAssetInfo>,
    pub compatible_assets: Vec<AppAssetInfo>,
    pub assets: Vec<AppAssetInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppDownloadStatus {
    pub is_downloading: bool,
    pub stage: String,
    pub progress: f32,
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
    pub speed_mb_s: f32,
    pub eta_seconds: u64,
    pub file_path: Option<String>,
    pub error: Option<String>,
}

impl Default for AppDownloadStatus {
    fn default() -> Self {
        Self {
            is_downloading: false,
            stage: "idle".to_string(),
            progress: 0.0,
            downloaded_bytes: 0,
            total_bytes: 0,
            speed_mb_s: 0.0,
            eta_seconds: 0,
            file_path: None,
            error: None,
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct TriggerDownloadPayload {
    pub url: Option<String>,
    pub name: Option<String>,
}

#[derive(Clone)]
pub struct AppUpdateService {
    data_dir: PathBuf,
    ws: WsState,
    status: Arc<Mutex<AppDownloadStatus>>,
    is_running: Arc<Mutex<bool>>,
    cancel_tx: Arc<Mutex<Option<oneshot::Sender<()>>>>,
}

impl AppUpdateService {
    pub fn new(data_dir: &Path, ws: WsState) -> Self {
        Self {
            data_dir: data_dir.to_path_buf(),
            ws,
            status: Arc::new(Mutex::new(AppDownloadStatus::default())),
            is_running: Arc::new(Mutex::new(false)),
            cancel_tx: Arc::new(Mutex::new(None)),
        }
    }

    pub async fn get_status(&self) -> AppDownloadStatus {
        self.status.lock().await.clone()
    }

    pub async fn cancel_download(&self) -> Result<(), String> {
        let mut cancel_guard = self.cancel_tx.lock().await;
        if let Some(tx) = cancel_guard.take() {
            let _ = tx.send(());
            let mut st = self.status.lock().await;
            st.is_downloading = false;
            st.stage = "cancelled".to_string();
            st.error = Some("Download cancelado pelo usuário.".to_string());
            self.ws.emit(WsEvent::AppUpdateProgress {
                stage: "cancelled".to_string(),
                progress: st.progress,
                downloaded_bytes: st.downloaded_bytes,
                total_bytes: st.total_bytes,
                speed_mb_s: 0.0,
                eta_seconds: 0,
                error: Some("Download cancelado pelo usuário.".to_string()),
                file_path: None,
            });
            return Ok(());
        }
        Err("Nenhum download em andamento para cancelar.".to_string())
    }

    pub async fn start_download(
        &self,
        target_url: &str,
        target_name: &str,
    ) -> Result<(), String> {
        let mut running_guard = self.is_running.lock().await;
        if *running_guard {
            return Err("Download de atualização já está em andamento.".to_string());
        }
        *running_guard = true;

        let (cancel_sender, mut cancel_receiver) = oneshot::channel();
        {
            let mut cancel_guard = self.cancel_tx.lock().await;
            *cancel_guard = Some(cancel_sender);
        }

        let data_dir = self.data_dir.clone();
        let ws = self.ws.clone();
        let status_arc = self.status.clone();
        let is_running_arc = self.is_running.clone();
        let url = target_url.to_string();
        let file_name = target_name.to_string();

        tokio::spawn(async move {
            info!("⬇️ Iniciando download do instalador: {} ({})", file_name, url);

            {
                let mut st = status_arc.lock().await;
                st.is_downloading = true;
                st.stage = "connecting".to_string();
                st.progress = 0.0;
                st.downloaded_bytes = 0;
                st.total_bytes = 0;
                st.speed_mb_s = 0.0;
                st.eta_seconds = 0;
                st.file_path = None;
                st.error = None;
            }

            ws.emit(WsEvent::AppUpdateProgress {
                stage: "connecting".to_string(),
                progress: 0.0,
                downloaded_bytes: 0,
                total_bytes: 0,
                speed_mb_s: 0.0,
                eta_seconds: 0,
                error: None,
                file_path: None,
            });

            let client = reqwest::Client::builder()
                .user_agent("StarMultloginApp/1.0 (Updater-Downloader)")
                .timeout(Duration::from_secs(300))
                .build();

            let client = match client {
                Ok(c) => c,
                Err(e) => {
                    let err = format!("Erro ao criar cliente HTTP: {e}");
                    error!("❌ {}", err);
                    Self::set_error(&status_arc, &ws, &err).await;
                    let mut is_running = is_running_arc.lock().await;
                    *is_running = false;
                    return;
                }
            };

            let response = match client.get(&url).send().await {
                Ok(r) => r,
                Err(e) => {
                    let err = format!("Falha de conexão com o GitHub: {e}");
                    error!("❌ {}", err);
                    Self::set_error(&status_arc, &ws, &err).await;
                    let mut is_running = is_running_arc.lock().await;
                    *is_running = false;
                    return;
                }
            };

            if !response.status().is_success() {
                let err = format!("Servidor de release retornou status HTTP {}", response.status());
                error!("❌ {}", err);
                Self::set_error(&status_arc, &ws, &err).await;
                let mut is_running = is_running_arc.lock().await;
                *is_running = false;
                return;
            }

            let total_bytes = response.content_length().unwrap_or(0);
            let updates_dir = data_dir.join("updates");
            let _ = tokio::fs::create_dir_all(&updates_dir).await;
            let dest_path = updates_dir.join(&file_name);
            let part_path = updates_dir.join(format!("{}.download", file_name));

            let mut file = match tokio::fs::File::create(&part_path).await {
                Ok(f) => f,
                Err(e) => {
                    let err = format!("Falha ao criar arquivo {:?}: {e}", part_path);
                    error!("❌ {}", err);
                    Self::set_error(&status_arc, &ws, &err).await;
                    let mut is_running = is_running_arc.lock().await;
                    *is_running = false;
                    return;
                }
            };

            let mut stream = response.bytes_stream();
            let mut downloaded: u64 = 0;
            let start_time = Instant::now();
            let mut last_emit = Instant::now();

            loop {
                tokio::select! {
                    _ = &mut cancel_receiver => {
                        info!("🛑 Download cancelado.");
                        let _ = tokio::fs::remove_file(&part_path).await;
                        let mut is_running = is_running_arc.lock().await;
                        *is_running = false;
                        return;
                    }
                    chunk_opt = stream.next() => {
                        match chunk_opt {
                            Some(Ok(chunk)) => {
                                if let Err(e) = file.write_all(&chunk).await {
                                    let err = format!("Erro ao gravar no disco: {e}");
                                    error!("❌ {}", err);
                                    let _ = tokio::fs::remove_file(&part_path).await;
                                    Self::set_error(&status_arc, &ws, &err).await;
                                    let mut is_running = is_running_arc.lock().await;
                                    *is_running = false;
                                    return;
                                }
                                downloaded += chunk.len() as u64;

                                if last_emit.elapsed() >= Duration::from_millis(150) || (total_bytes > 0 && downloaded >= total_bytes) {
                                    last_emit = Instant::now();
                                    let elapsed = start_time.elapsed().as_secs_f64();
                                    let (progress, speed_mb_s, eta_seconds) =
                                        calculate_download_metrics(downloaded, total_bytes, elapsed);

                                    {
                                        let mut st = status_arc.lock().await;
                                        st.stage = "downloading".to_string();
                                        st.progress = progress;
                                        st.downloaded_bytes = downloaded;
                                        st.total_bytes = total_bytes;
                                        st.speed_mb_s = speed_mb_s;
                                        st.eta_seconds = eta_seconds;
                                    }

                                    ws.emit(WsEvent::AppUpdateProgress {
                                        stage: "downloading".to_string(),
                                        progress,
                                        downloaded_bytes: downloaded,
                                        total_bytes,
                                        speed_mb_s,
                                        eta_seconds,
                                        error: None,
                                        file_path: None,
                                    });
                                }
                            }
                            Some(Err(e)) => {
                                let err = format!("Erro no streaming de download: {e}");
                                error!("❌ {}", err);
                                let _ = tokio::fs::remove_file(&part_path).await;
                                Self::set_error(&status_arc, &ws, &err).await;
                                let mut is_running = is_running_arc.lock().await;
                                *is_running = false;
                                return;
                            }
                            None => break,
                        }
                    }
                }
            }

            if let Err(e) = file.flush().await {
                let err = format!("Erro ao sincronizar arquivo: {e}");
                Self::set_error(&status_arc, &ws, &err).await;
                let mut is_running = is_running_arc.lock().await;
                *is_running = false;
                return;
            }
            drop(file);

            if let Err(e) = tokio::fs::rename(&part_path, &dest_path).await {
                let err = format!("Erro ao finalizar instalador: {e}");
                Self::set_error(&status_arc, &ws, &err).await;
                let mut is_running = is_running_arc.lock().await;
                *is_running = false;
                return;
            }

            #[cfg(unix)]
            {
                if dest_path.extension().and_then(|ext| ext.to_str()) == Some("AppImage") {
                    use std::os::unix::fs::PermissionsExt;
                    if let Ok(metadata) = std::fs::metadata(&dest_path) {
                        let mut perms = metadata.permissions();
                        perms.set_mode(0o755);
                        let _ = std::fs::set_permissions(&dest_path, perms);
                        info!("🔑 Permissão de execução (chmod +x) aplicada a {:?}", dest_path);
                    }
                }
            }

            let final_path_str = dest_path.to_string_lossy().to_string();
            info!("✅ Download da atualização concluído em: {}", final_path_str);

            {
                let mut st = status_arc.lock().await;
                st.is_downloading = false;
                st.stage = "ready".to_string();
                st.progress = 100.0;
                st.downloaded_bytes = downloaded;
                st.total_bytes = total_bytes;
                st.speed_mb_s = 0.0;
                st.eta_seconds = 0;
                st.file_path = Some(final_path_str.clone());
                st.error = None;
            }

            ws.emit(WsEvent::AppUpdateProgress {
                stage: "ready".to_string(),
                progress: 100.0,
                downloaded_bytes: downloaded,
                total_bytes,
                speed_mb_s: 0.0,
                eta_seconds: 0,
                error: None,
                file_path: Some(final_path_str),
            });

            let mut is_running = is_running_arc.lock().await;
            *is_running = false;
        });

        Ok(())
    }

    async fn set_error(status: &Arc<Mutex<AppDownloadStatus>>, ws: &WsState, error_msg: &str) {
        let mut st = status.lock().await;
        st.is_downloading = false;
        st.stage = "error".to_string();
        st.error = Some(error_msg.to_string());
        ws.emit(WsEvent::AppUpdateProgress {
            stage: "error".to_string(),
            progress: st.progress,
            downloaded_bytes: st.downloaded_bytes,
            total_bytes: st.total_bytes,
            speed_mb_s: 0.0,
            eta_seconds: 0,
            error: Some(error_msg.to_string()),
            file_path: None,
        });
    }
}

pub fn calculate_download_metrics(downloaded: u64, total: u64, elapsed_secs: f64) -> (f32, f32, u64) {
    let progress = if total > 0 {
        ((downloaded as f64 / total as f64) * 100.0).clamp(0.0, 100.0) as f32
    } else {
        0.0
    };

    let speed_mb_s = if elapsed_secs > 0.05 {
        ((downloaded as f64 / (1024.0 * 1024.0)) / elapsed_secs) as f32
    } else {
        0.0
    };

    let eta_seconds = if total > downloaded && speed_mb_s > 0.01 {
        let remaining_bytes = total - downloaded;
        let remaining_mb = remaining_bytes as f64 / (1024.0 * 1024.0);
        (remaining_mb / speed_mb_s as f64).round() as u64
    } else {
        0
    };

    (progress, speed_mb_s, eta_seconds)
}

#[derive(Debug, Clone)]
pub struct LinuxDistroInfo {
    pub name: String,
    pub id: String,
    pub is_debian_like: bool,
    pub is_fedora_like: bool,
    pub is_arch_like: bool,
}

pub fn parse_os_release_content(content: &str) -> LinuxDistroInfo {
    let mut name = "Linux".to_string();
    let mut id = "linux".to_string();
    let mut id_like = String::new();

    for line in content.lines() {
        let line = line.trim();
        if let Some(val) = line.strip_prefix("NAME=") {
            name = val.trim_matches('"').to_string();
        } else if let Some(val) = line.strip_prefix("ID=") {
            id = val.trim_matches('"').to_lowercase();
        } else if let Some(val) = line.strip_prefix("ID_LIKE=") {
            id_like = val.trim_matches('"').to_lowercase();
        }
    }

    let combined = format!("{} {}", id, id_like);
    let is_debian_like = combined.contains("debian")
        || combined.contains("ubuntu")
        || combined.contains("linuxmint")
        || combined.contains("pop")
        || combined.contains("elementary")
        || combined.contains("zorin");

    let is_fedora_like = combined.contains("fedora")
        || combined.contains("rhel")
        || combined.contains("centos")
        || combined.contains("rocky")
        || combined.contains("almalinux")
        || combined.contains("suse")
        || combined.contains("opensuse");

    let is_arch_like = combined.contains("arch") || combined.contains("manjaro") || combined.contains("endeavouros");

    LinuxDistroInfo {
        name,
        id,
        is_debian_like,
        is_fedora_like,
        is_arch_like,
    }
}

pub fn detect_linux_distro() -> LinuxDistroInfo {
    if let Ok(content) = std::fs::read_to_string("/etc/os-release") {
        return parse_os_release_content(&content);
    }
    if let Ok(content) = std::fs::read_to_string("/usr/lib/os-release") {
        return parse_os_release_content(&content);
    }
    LinuxDistroInfo {
        name: "Linux".to_string(),
        id: "linux".to_string(),
        is_debian_like: false,
        is_fedora_like: false,
        is_arch_like: false,
    }
}

/// Detecta com precisão cirúrgica o formato de empacotamento atualmente em execução
pub fn detect_runtime_package_format() -> (PackageFormat, String) {
    if cfg!(target_os = "linux") {
        // 1. Variável $APPIMAGE injetada pelo runtime AppImage
        if let Ok(appimage_path) = std::env::var("APPIMAGE") {
            if !appimage_path.is_empty() {
                return (
                    PackageFormat::AppImage,
                    format!("Ambiente portátil AppImage ($APPIMAGE: {})", appimage_path),
                );
            }
        }

        // 2. Variável $APPDIR ou ponto de montagem
        if let Ok(appdir) = std::env::var("APPDIR") {
            if !appdir.is_empty() {
                return (
                    PackageFormat::AppImage,
                    format!("Container AppImage montado ($APPDIR: {})", appdir),
                );
            }
        }

        // 3. Inspeção do executável atual
        if let Ok(exe) = std::env::current_exe() {
            let path_str = exe.to_string_lossy().to_string();
            if path_str.contains(".mount_") || path_str.ends_with(".AppImage") {
                return (
                    PackageFormat::AppImage,
                    format!("Executável montado a partir de AppImage ({})", path_str),
                );
            }
            if path_str.starts_with("/usr/bin") || path_str.starts_with("/usr/lib") || path_str.starts_with("/opt") {
                let distro = detect_linux_distro();
                if distro.is_debian_like {
                    return (
                        PackageFormat::Deb,
                        format!("Instalação de sistema .deb detectada em {}", distro.name),
                    );
                } else if distro.is_fedora_like {
                    return (
                        PackageFormat::Rpm,
                        format!("Instalação de sistema .rpm detectada em {}", distro.name),
                    );
                }
            }
        }

        // 4. Detecção por sistema operacional base
        let distro = detect_linux_distro();
        if distro.is_debian_like {
            (
                PackageFormat::Deb,
                format!("Sistema {} baseado em Debian/Ubuntu (.deb nativo)", distro.name),
            )
        } else if distro.is_fedora_like {
            (
                PackageFormat::Rpm,
                format!("Sistema {} baseado em Fedora/RedHat (.rpm nativo)", distro.name),
            )
        } else {
            (
                PackageFormat::AppImage,
                format!("Distribuição Linux {} (AppImage universal portátil)", distro.name),
            )
        }
    } else if cfg!(target_os = "windows") {
        if let Ok(exe) = std::env::current_exe() {
            let path_str = exe.to_string_lossy().to_lowercase();
            if path_str.contains("appdata\\local\\programs") {
                return (
                    PackageFormat::Exe,
                    "Instalação por usuário NSIS (AppData) detectada".to_string(),
                );
            }
        }
        (
            PackageFormat::Exe,
            "Instalador padrão para Windows (.exe NSIS)".to_string(),
        )
    } else if cfg!(target_os = "macos") {
        (
            PackageFormat::Dmg,
            "Imagem de disco padrão para macOS (.dmg)".to_string(),
        )
    } else {
        (
            PackageFormat::Unknown,
            "Sistema operacional desconhecido".to_string(),
        )
    }
}

pub fn resolve_os_and_arch(
    override_os: Option<&str>,
    override_arch: Option<&str>,
) -> (&'static str, &'static str, &'static str) {
    let os = match override_os.map(|s| s.to_lowercase()) {
        Some(ref o) if o.contains("win") => "windows",
        Some(ref o) if o.contains("mac") || o.contains("darwin") || o.contains("osx") => "macos",
        Some(ref o) if o.contains("lin") || o.contains("ubuntu") || o.contains("debian") || o.contains("mint") => "linux",
        _ => {
            if cfg!(target_os = "windows") {
                "windows"
            } else if cfg!(target_os = "macos") {
                "macos"
            } else if cfg!(target_os = "linux") {
                "linux"
            } else {
                "unknown"
            }
        }
    };

    let arch = match override_arch.map(|s| s.to_lowercase()) {
        Some(ref a) if a.contains("arm64") || a.contains("aarch64") => "arm64",
        Some(ref a) if a.contains("x86_64") || a.contains("amd64") || a.contains("x64") => "x86_64",
        Some(ref a) if a.contains("x86") || a.contains("i686") || a.contains("i386") => "x86",
        _ => {
            if cfg!(target_arch = "aarch64") {
                "arm64"
            } else if cfg!(target_arch = "x86_64") {
                "x86_64"
            } else {
                "x86"
            }
        }
    };

    let os_display = match os {
        "windows" => "Windows",
        "macos" => "macOS",
        "linux" => "Linux",
        _ => "Desconhecido",
    };

    (os, arch, os_display)
}

/// Identifica TODOS os assets compatíveis com o SO atual e elege o melhor de acordo com o formato preferido/detectado
pub fn match_assets_with_format_preference(
    assets: &[AppAssetInfo],
    os: &str,
    arch: &str,
    preferred_format: Option<PackageFormat>,
) -> (Option<AppAssetInfo>, Vec<AppAssetInfo>) {
    if assets.is_empty() {
        return (None, Vec::new());
    }

    // 1. Filtra todos os pacotes compatíveis com este sistema operacional e arquitetura
    let mut compat: Vec<AppAssetInfo> = match os {
        "linux" => {
            if arch == "arm64" {
                assets
                    .iter()
                    .filter(|a| {
                        let l = a.name.to_lowercase();
                        (l.contains("aarch64") || l.contains("arm64"))
                            && (l.ends_with(".appimage") || l.ends_with(".deb") || l.ends_with(".rpm") || l.ends_with(".tar.gz"))
                    })
                    .cloned()
                    .collect()
            } else {
                assets
                    .iter()
                    .filter(|a| {
                        let l = a.name.to_lowercase();
                        !l.contains("aarch64")
                            && !l.contains("arm64")
                            && (l.ends_with(".appimage") || l.ends_with(".deb") || l.ends_with(".rpm") || l.ends_with(".tar.gz"))
                    })
                    .cloned()
                    .collect()
            }
        }
        "windows" => {
            if arch == "arm64" {
                assets
                    .iter()
                    .filter(|a| {
                        let l = a.name.to_lowercase();
                        (l.contains("arm64") || l.contains("aarch64"))
                            && (l.ends_with(".exe") || l.ends_with(".msi") || l.ends_with(".zip"))
                    })
                    .cloned()
                    .collect()
            } else {
                assets
                    .iter()
                    .filter(|a| {
                        let l = a.name.to_lowercase();
                        !l.contains("arm64")
                            && (l.ends_with(".exe") || l.ends_with(".msi") || l.ends_with(".zip"))
                    })
                    .cloned()
                    .collect()
            }
        }
        "macos" => {
            if arch == "arm64" {
                assets
                    .iter()
                    .filter(|a| {
                        let l = a.name.to_lowercase();
                        (l.contains("aarch64") || l.contains("arm64"))
                            && (l.ends_with(".dmg") || l.ends_with(".app.tar.gz") || l.ends_with(".tar.gz"))
                    })
                    .cloned()
                    .collect()
            } else {
                assets
                    .iter()
                    .filter(|a| {
                        let l = a.name.to_lowercase();
                        !l.contains("aarch64")
                            && !l.contains("arm64")
                            && (l.ends_with(".dmg") || l.ends_with(".app.tar.gz") || l.ends_with(".tar.gz"))
                    })
                    .cloned()
                    .collect()
            }
        }
        _ => assets.to_vec(),
    };

    if compat.is_empty() {
        compat = assets.to_vec();
    }

    // 2. Se o usuário ou o sistema solicitou um formato preferido (ex: AppImage ou Deb), tenta encontrá-lo
    let matched = if let Some(pref) = preferred_format {
        compat.iter().find(|a| a.format == pref).cloned()
    } else {
        None
    };

    // 3. Fallback de prioridade padrão se o formato preferido não foi encontrado na release
    let best = matched.or_else(|| {
        match os {
            "linux" => {
                // No Linux padrão: AppImage > deb > rpm > tar.gz
                compat
                    .iter()
                    .find(|a| a.format == PackageFormat::AppImage)
                    .or_else(|| compat.iter().find(|a| a.format == PackageFormat::Deb))
                    .or_else(|| compat.iter().find(|a| a.format == PackageFormat::Rpm))
                    .or_else(|| compat.first())
                    .cloned()
            }
            "windows" => {
                // No Windows padrão: setup.exe > .exe > .msi > .zip
                compat
                    .iter()
                    .find(|a| a.name.to_lowercase().contains("setup.exe"))
                    .or_else(|| compat.iter().find(|a| a.format == PackageFormat::Exe))
                    .or_else(|| compat.iter().find(|a| a.format == PackageFormat::Msi))
                    .or_else(|| compat.first())
                    .cloned()
            }
            "macos" => {
                // No macOS padrão: .dmg > .tar.gz
                compat
                    .iter()
                    .find(|a| a.format == PackageFormat::Dmg)
                    .or_else(|| compat.iter().find(|a| a.format == PackageFormat::TarGz))
                    .or_else(|| compat.first())
                    .cloned()
            }
            _ => compat.first().cloned(),
        }
    });

    (best, compat)
}

pub fn is_version_newer(latest: &str, current: &str) -> bool {
    let clean = |v: &str| -> Vec<u32> {
        v.trim_start_matches('v')
            .split('.')
            .filter_map(|s| s.parse::<u32>().ok())
            .collect()
    };
    let l = clean(latest);
    let c = clean(current);
    for i in 0..std::cmp::max(l.len(), c.len()) {
        let l_part = l.get(i).copied().unwrap_or(0);
        let c_part = c.get(i).copied().unwrap_or(0);
        if l_part > c_part {
            return true;
        }
        if l_part < c_part {
            return false;
        }
    }
    false
}

/// GET /api/app/check-update
pub async fn check_app_update_handler(
    Query(params): Query<CheckUpdateQuery>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let current_version = params.current_version.unwrap_or_else(|| "0.1.22".to_string());

    let (runtime_format, detection_reason) = detect_runtime_package_format();
    let requested_format = params
        .format
        .as_deref()
        .and_then(PackageFormat::from_str)
        .or(Some(runtime_format));

    let (platform, os_name, _) = resolve_os_and_arch(params.os.as_deref(), params.arch.as_deref());

    let client = reqwest::Client::builder()
        .user_agent("StarMultloginApp/1.0 (Updater; +https://github.com/sr-satoru/antidetect-pro)")
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao criar cliente HTTP: {e}")))?;

    let url = "https://api.github.com/repos/sr-satoru/antidetect-pro/releases/latest";
    let resp = match client.get(url).send().await {
        Ok(r) => r,
        Err(e) => {
            warn!("⚠️ Erro ao consultar releases no GitHub: {}", e);
            return Ok(Json(AppUpdateResponse {
                has_update: false,
                current_version: current_version.clone(),
                latest_version: current_version.clone(),
                tag_name: format!("v{current_version}"),
                name: format!("Star Multlogin v{current_version}"),
                body: String::new(),
                published_at: String::new(),
                html_url: "https://github.com/sr-satoru/antidetect-pro/releases".to_string(),
                platform: platform.to_string(),
                os_name: os_name.to_string(),
                detected_format: runtime_format.as_str().to_string(),
                detection_reason,
                matched_asset: None,
                compatible_assets: Vec::new(),
                assets: Vec::new(),
            }));
        }
    };

    if !resp.status().is_success() {
        warn!("⚠️ GitHub Releases retornou status HTTP: {}", resp.status());
        return Ok(Json(AppUpdateResponse {
            has_update: false,
            current_version: current_version.clone(),
            latest_version: current_version.clone(),
            tag_name: format!("v{current_version}"),
            name: format!("Star Multlogin v{current_version}"),
            body: String::new(),
            published_at: String::new(),
            html_url: "https://github.com/sr-satoru/antidetect-pro/releases".to_string(),
            platform: platform.to_string(),
            os_name: os_name.to_string(),
            detected_format: runtime_format.as_str().to_string(),
            detection_reason,
            matched_asset: None,
            compatible_assets: Vec::new(),
            assets: Vec::new(),
        }));
    }

    let json_data: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, format!("Erro ao processar JSON do GitHub: {e}")))?;

    let tag_name = json_data
        .get("tag_name")
        .and_then(|v| v.as_str())
        .unwrap_or_default()
        .to_string();

    let latest_version = tag_name.trim_start_matches('v').to_string();
    let has_update = is_version_newer(&latest_version, &current_version);

    let name = json_data
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or(&tag_name)
        .to_string();

    let body = json_data
        .get("body")
        .and_then(|v| v.as_str())
        .unwrap_or_default()
        .to_string();

    let published_at = json_data
        .get("published_at")
        .and_then(|v| v.as_str())
        .unwrap_or_default()
        .to_string();

    let html_url = json_data
        .get("html_url")
        .and_then(|v| v.as_str())
        .unwrap_or("https://github.com/sr-satoru/antidetect-pro/releases")
        .to_string();

    let mut assets = Vec::new();
    if let Some(arr) = json_data.get("assets").and_then(|v| v.as_array()) {
        for a in arr {
            let asset_name = a.get("name").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let download_url = a.get("browser_download_url").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let size_bytes = a.get("size").and_then(|v| v.as_u64()).unwrap_or(0);
            if !asset_name.is_empty() && !download_url.is_empty() {
                assets.push(AppAssetInfo::new(asset_name, download_url, size_bytes));
            }
        }
    }

    let (os_key, arch_key, _) = resolve_os_and_arch(params.os.as_deref(), params.arch.as_deref());
    let (matched_asset, compatible_assets) =
        match_assets_with_format_preference(&assets, os_key, arch_key, requested_format);

    Ok(Json(AppUpdateResponse {
        has_update,
        current_version,
        latest_version,
        tag_name,
        name,
        body,
        published_at,
        html_url,
        platform: format!("{}-{}", os_key, arch_key),
        os_name: os_name.to_string(),
        detected_format: runtime_format.as_str().to_string(),
        detection_reason,
        matched_asset,
        compatible_assets,
        assets,
    }))
}

/// POST /api/app/download
pub async fn trigger_app_download_handler(
    State(service): State<Arc<AppUpdateService>>,
    Json(payload): Json<TriggerDownloadPayload>,
) -> impl IntoResponse {
    let (target_url, target_name) = match (payload.url, payload.name) {
        (Some(u), Some(n)) if !u.is_empty() && !n.is_empty() => (u, n),
        _ => {
            let client = reqwest::Client::builder()
                .user_agent("StarMultloginApp/1.0 (Updater)")
                .timeout(Duration::from_secs(10))
                .build();

            if let Ok(c) = client {
                if let Ok(resp) = c.get("https://api.github.com/repos/sr-satoru/antidetect-pro/releases/latest").send().await {
                    if let Ok(json_data) = resp.json::<serde_json::Value>().await {
                        let mut assets = Vec::new();
                        if let Some(arr) = json_data.get("assets").and_then(|v| v.as_array()) {
                            for a in arr {
                                let asset_name = a.get("name").and_then(|v| v.as_str()).unwrap_or_default().to_string();
                                let download_url = a.get("browser_download_url").and_then(|v| v.as_str()).unwrap_or_default().to_string();
                                let size_bytes = a.get("size").and_then(|v| v.as_u64()).unwrap_or(0);
                                if !asset_name.is_empty() && !download_url.is_empty() {
                                    assets.push(AppAssetInfo::new(asset_name, download_url, size_bytes));
                                }
                            }
                        }
                        let (runtime_format, _) = detect_runtime_package_format();
                        let (os_key, arch_key, _) = resolve_os_and_arch(None, None);
                        let (matched, _) = match_assets_with_format_preference(&assets, os_key, arch_key, Some(runtime_format));
                        if let Some(asset) = matched {
                            (asset.download_url, asset.name)
                        } else {
                            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({
                                "success": false,
                                "message": "Nenhum pacote compatível com o seu sistema foi encontrado na release."
                            }))).into_response();
                        }
                    } else {
                        return (StatusCode::BAD_GATEWAY, Json(serde_json::json!({
                            "success": false,
                            "message": "Falha ao processar informações da release no GitHub."
                        }))).into_response();
                    }
                } else {
                    return (StatusCode::BAD_GATEWAY, Json(serde_json::json!({
                        "success": false,
                        "message": "Falha na conexão com o GitHub."
                    }))).into_response();
                }
            } else {
                return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({
                    "success": false,
                    "message": "Falha ao inicializar requisição de download."
                }))).into_response();
            }
        }
    };

    match service.start_download(&target_url, &target_name).await {
        Ok(_) => (StatusCode::OK, Json(serde_json::json!({
            "success": true,
            "message": format!("Download de {} iniciado com sucesso.", target_name),
            "asset_name": target_name,
            "download_url": target_url
        }))).into_response(),
        Err(err) => (StatusCode::CONFLICT, Json(serde_json::json!({
            "success": false,
            "message": err
        }))).into_response(),
    }
}

/// GET /api/app/download-status
pub async fn get_app_download_status_handler(
    State(service): State<Arc<AppUpdateService>>,
) -> impl IntoResponse {
    let status = service.get_status().await;
    Json(status)
}

/// POST /api/app/cancel-download
pub async fn cancel_app_download_handler(
    State(service): State<Arc<AppUpdateService>>,
) -> impl IntoResponse {
    match service.cancel_download().await {
        Ok(_) => (StatusCode::OK, Json(serde_json::json!({
            "success": true,
            "message": "Download cancelado com sucesso."
        }))).into_response(),
        Err(err) => (StatusCode::BAD_REQUEST, Json(serde_json::json!({
            "success": false,
            "message": err
        }))).into_response(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn mock_asset(name: &str, size: u64) -> AppAssetInfo {
        AppAssetInfo::new(
            name.to_string(),
            format!("https://github.com/mock/releases/download/v1.0.0/{name}"),
            size,
        )
    }

    fn get_official_v0123_assets() -> Vec<AppAssetInfo> {
        vec![
            mock_asset("star-multlogin-0.1.23-1.x86_64.rpm", 8650262),
            mock_asset("star-multlogin_0.1.23_aarch64.dmg", 13210757),
            mock_asset("star-multlogin_0.1.23_amd64.AppImage", 86505976),
            mock_asset("star-multlogin_0.1.23_amd64.deb", 8649692),
            mock_asset("star-multlogin_0.1.23_x64-setup.exe", 5469361),
            mock_asset("star-multlogin_0.1.23_x64_en-US.msi", 7905280),
            mock_asset("star-multlogin_aarch64.app.tar.gz", 10402097),
        ]
    }

    // =========================================================================
    // TESTES 1 A 6: Detecção de Distros Linux via os-release
    // =========================================================================

    #[test]
    fn test_01_parse_os_release_debian() {
        let content = "NAME=\"Debian GNU/Linux\"\nID=debian\nVERSION_ID=\"12\"\n";
        let info = parse_os_release_content(content);
        assert!(info.is_debian_like);
        assert!(!info.is_fedora_like);
    }

    #[test]
    fn test_02_parse_os_release_ubuntu() {
        let content = "NAME=\"Ubuntu\"\nID=ubuntu\nID_LIKE=debian\n";
        let info = parse_os_release_content(content);
        assert!(info.is_debian_like);
    }

    #[test]
    fn test_03_parse_os_release_linux_mint() {
        let content = "NAME=\"Linux Mint\"\nID=linuxmint\nID_LIKE=\"ubuntu debian\"\nVERSION_ID=\"22.2\"\n";
        let info = parse_os_release_content(content);
        assert!(info.is_debian_like);
        assert_eq!(info.id, "linuxmint");
    }

    #[test]
    fn test_04_parse_os_release_fedora() {
        let content = "NAME=Fedora\nID=fedora\nVERSION_ID=40\n";
        let info = parse_os_release_content(content);
        assert!(info.is_fedora_like);
        assert!(!info.is_debian_like);
    }

    #[test]
    fn test_05_parse_os_release_rhel_rocky() {
        let content = "NAME=\"Rocky Linux\"\nID=\"rocky\"\nID_LIKE=\"rhel centos fedora\"\n";
        let info = parse_os_release_content(content);
        assert!(info.is_fedora_like);
    }

    #[test]
    fn test_06_parse_os_release_arch_linux() {
        let content = "NAME=\"Arch Linux\"\nID=arch\n";
        let info = parse_os_release_content(content);
        assert!(info.is_arch_like);
    }

    // =========================================================================
    // TESTES 7 A 12: Seleção e Classificação Precisa Linux (AppImage vs Deb vs Rpm)
    // =========================================================================

    #[test]
    fn test_07_linux_classify_formats() {
        assert_eq!(classify_asset_format("app.AppImage"), PackageFormat::AppImage);
        assert_eq!(classify_asset_format("app.deb"), PackageFormat::Deb);
        assert_eq!(classify_asset_format("app.rpm"), PackageFormat::Rpm);
        assert_eq!(classify_asset_format("app-setup.exe"), PackageFormat::Exe);
        assert_eq!(classify_asset_format("app.msi"), PackageFormat::Msi);
        assert_eq!(classify_asset_format("app.dmg"), PackageFormat::Dmg);
    }

    #[test]
    fn test_08_linux_prefers_appimage_when_requested() {
        let assets = get_official_v0123_assets();
        let (matched, compat) = match_assets_with_format_preference(&assets, "linux", "x86_64", Some(PackageFormat::AppImage));
        let asset = matched.expect("Deveria encontrar AppImage");
        assert_eq!(asset.name, "star-multlogin_0.1.23_amd64.AppImage");
        assert_eq!(asset.format, PackageFormat::AppImage);
        assert!(compat.len() >= 3); // AppImage, deb, rpm
    }

    #[test]
    fn test_09_linux_prefers_deb_when_requested() {
        let assets = get_official_v0123_assets();
        let (matched, _) = match_assets_with_format_preference(&assets, "linux", "x86_64", Some(PackageFormat::Deb));
        let asset = matched.expect("Deveria encontrar .deb");
        assert_eq!(asset.name, "star-multlogin_0.1.23_amd64.deb");
        assert_eq!(asset.format, PackageFormat::Deb);
    }

    #[test]
    fn test_10_linux_prefers_rpm_when_requested() {
        let assets = get_official_v0123_assets();
        let (matched, _) = match_assets_with_format_preference(&assets, "linux", "x86_64", Some(PackageFormat::Rpm));
        let asset = matched.expect("Deveria encontrar .rpm");
        assert_eq!(asset.name, "star-multlogin-0.1.23-1.x86_64.rpm");
        assert_eq!(asset.format, PackageFormat::Rpm);
    }

    #[test]
    fn test_11_linux_returns_all_three_compatible_formats() {
        let assets = get_official_v0123_assets();
        let (_, compat) = match_assets_with_format_preference(&assets, "linux", "x86_64", None);
        let names: Vec<&str> = compat.iter().map(|a| a.name.as_str()).collect();
        assert!(names.contains(&"star-multlogin_0.1.23_amd64.AppImage"));
        assert!(names.contains(&"star-multlogin_0.1.23_amd64.deb"));
        assert!(names.contains(&"star-multlogin-0.1.23-1.x86_64.rpm"));
    }

    #[test]
    fn test_12_linux_fallback_when_preferred_format_not_in_release() {
        // Se o usuário pediu RPM mas a release só tem deb e AppImage
        let assets = vec![
            mock_asset("star-multlogin_0.1.23_amd64.AppImage", 86000000),
            mock_asset("star-multlogin_0.1.23_amd64.deb", 8600000),
        ];
        let (matched, _) = match_assets_with_format_preference(&assets, "linux", "x86_64", Some(PackageFormat::Rpm));
        let asset = matched.expect("Deveria fazer fallback para AppImage");
        assert_eq!(asset.format, PackageFormat::AppImage);
    }

    // =========================================================================
    // TESTES 13 A 16: Windows (setup.exe vs msi)
    // =========================================================================

    #[test]
    fn test_13_windows_prefers_setup_exe_when_requested() {
        let assets = get_official_v0123_assets();
        let (matched, _) = match_assets_with_format_preference(&assets, "windows", "x86_64", Some(PackageFormat::Exe));
        let asset = matched.expect("Deveria encontrar setup.exe");
        assert_eq!(asset.name, "star-multlogin_0.1.23_x64-setup.exe");
        assert_eq!(asset.format, PackageFormat::Exe);
    }

    #[test]
    fn test_14_windows_prefers_msi_when_requested() {
        let assets = get_official_v0123_assets();
        let (matched, _) = match_assets_with_format_preference(&assets, "windows", "x86_64", Some(PackageFormat::Msi));
        let asset = matched.expect("Deveria encontrar .msi");
        assert_eq!(asset.name, "star-multlogin_0.1.23_x64_en-US.msi");
        assert_eq!(asset.format, PackageFormat::Msi);
    }

    #[test]
    fn test_15_windows_lists_both_exe_and_msi_in_compatible_assets() {
        let assets = get_official_v0123_assets();
        let (_, compat) = match_assets_with_format_preference(&assets, "windows", "x86_64", None);
        let names: Vec<&str> = compat.iter().map(|a| a.name.as_str()).collect();
        assert!(names.contains(&"star-multlogin_0.1.23_x64-setup.exe"));
        assert!(names.contains(&"star-multlogin_0.1.23_x64_en-US.msi"));
    }

    #[test]
    fn test_16_windows_fallback_to_msi_if_exe_missing() {
        let assets = vec![mock_asset("star-multlogin_0.1.23_x64_en-US.msi", 7900000)];
        let (matched, _) = match_assets_with_format_preference(&assets, "windows", "x86_64", Some(PackageFormat::Exe));
        let asset = matched.expect("Deveria fazer fallback para msi");
        assert_eq!(asset.format, PackageFormat::Msi);
    }

    // =========================================================================
    // TESTES 17 A 19: macOS (Apple Silicon vs Intel)
    // =========================================================================

    #[test]
    fn test_17_macos_apple_silicon_prefers_aarch64_dmg() {
        let assets = get_official_v0123_assets();
        let (matched, _) = match_assets_with_format_preference(&assets, "macos", "arm64", Some(PackageFormat::Dmg));
        let asset = matched.expect("Deveria encontrar aarch64 dmg");
        assert_eq!(asset.name, "star-multlogin_0.1.23_aarch64.dmg");
    }

    #[test]
    fn test_18_macos_apple_silicon_can_select_tar_gz() {
        let assets = get_official_v0123_assets();
        let (matched, _) = match_assets_with_format_preference(&assets, "macos", "arm64", Some(PackageFormat::TarGz));
        let asset = matched.expect("Deveria encontrar tar.gz");
        assert_eq!(asset.name, "star-multlogin_aarch64.app.tar.gz");
    }

    #[test]
    fn test_19_macos_intel_selects_x64_dmg() {
        let assets = vec![
            mock_asset("star-multlogin_0.1.23_aarch64.dmg", 13200000),
            mock_asset("star-multlogin_0.1.23_x64.dmg", 14000000),
        ];
        let (matched, _) = match_assets_with_format_preference(&assets, "macos", "x86_64", None);
        let asset = matched.expect("Deveria encontrar x64 dmg");
        assert_eq!(asset.name, "star-multlogin_0.1.23_x64.dmg");
    }

    // =========================================================================
    // TESTES 20 A 24: SemVer e Métricas de Download
    // =========================================================================

    #[test]
    fn test_20_semver_patch_newer() {
        assert!(is_version_newer("0.1.23", "0.1.22"));
        assert!(is_version_newer("v0.1.23", "0.1.22"));
        assert!(!is_version_newer("0.1.22", "0.1.23"));
    }

    #[test]
    fn test_21_semver_minor_and_major() {
        assert!(is_version_newer("0.2.0", "0.1.99"));
        assert!(is_version_newer("1.0.0", "0.9.99"));
        assert!(!is_version_newer("0.1.99", "0.2.0"));
    }

    #[test]
    fn test_22_semver_equal_returns_false() {
        assert!(!is_version_newer("0.1.23", "0.1.23"));
        assert!(!is_version_newer("v0.1.23", "v0.1.23"));
    }

    #[test]
    fn test_23_download_metrics_progress_and_eta() {
        // 50 MB baixados de 100 MB em 5s -> 10 MB/s, 5s restante
        let (progress, speed, eta) = calculate_download_metrics(50 * 1024 * 1024, 100 * 1024 * 1024, 5.0);
        assert!((progress - 50.0).abs() < 0.1);
        assert!((speed - 10.0).abs() < 0.2);
        assert_eq!(eta, 5);
    }

    #[test]
    fn test_24_download_metrics_division_by_zero_safe() {
        let (progress, speed, eta) = calculate_download_metrics(0, 0, 0.0);
        assert_eq!(progress, 0.0);
        assert_eq!(speed, 0.0);
        assert_eq!(eta, 0);
    }

    #[test]
    fn test_25_empty_assets_handling() {
        let assets: Vec<AppAssetInfo> = Vec::new();
        let (matched, compat) = match_assets_with_format_preference(&assets, "linux", "x86_64", None);
        assert!(matched.is_none());
        assert!(compat.is_empty());
    }
}
