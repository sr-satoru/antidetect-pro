use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::{
    path::{Path, PathBuf},
    sync::Arc,
    time::{Duration, Instant},
};
use tokio::{fs::File, io::AsyncWriteExt, sync::{oneshot, Mutex}};
use tracing::info;
use crate::ws::{WsEvent, WsState};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppAssetInfo {
    pub name: String,
    pub download_url: String,
    pub size_bytes: u64,
    pub format: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
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

#[derive(Debug, Deserialize)]
pub struct CheckQuery {
    pub current_version: Option<String>,
    pub format: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct DownloadPayload {
    pub url: Option<String>,
    pub name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ApplyPayload {
    pub file_path: Option<String>,
}

#[derive(Clone)]
pub struct AppUpdateService {
    data_dir: PathBuf,
    ws: WsState,
    status: Arc<Mutex<AppDownloadStatus>>,
    cancel_tx: Arc<Mutex<Option<oneshot::Sender<()>>>>,
}

impl AppUpdateService {
    pub fn new(data_dir: &Path, ws: WsState) -> Self {
        let updates_dir = data_dir.join("updates");
        tokio::spawn(async move {
            Self::cleanup_update_residuals(&updates_dir);
        });

        Self {
            data_dir: data_dir.to_path_buf(),
            ws,
            status: Arc::new(Mutex::new(AppDownloadStatus::default())),
            cancel_tx: Arc::new(Mutex::new(None)),
        }
    }

    /// Limpa resíduos de atualizações antigas (.deb, .msi, .exe, .dmg, .part)
    /// preservando apenas o .AppImage atual caso o aplicativo esteja executando diretamente dele.
    fn cleanup_update_residuals(dir: &Path) {
        if !dir.is_dir() {
            return;
        }

        let running_appimage = std::env::var("APPIMAGE").ok().map(PathBuf::from);

        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if !path.is_file() {
                    continue;
                }

                // Não remove o próprio executável se estiver rodando como o AppImage atual
                if let Some(ref current) = running_appimage {
                    if &path == current {
                        continue;
                    }
                }

                if let Err(e) = std::fs::remove_file(&path) {
                    tracing::debug!("Aviso ao remover resíduo de update {:?}: {}", path, e);
                } else {
                    tracing::info!("🧹 Resíduo de atualização removido com sucesso: {:?}", path.file_name().unwrap_or_default());
                }
            }
        }
    }

    pub async fn get_status(&self) -> AppDownloadStatus {
        self.status.lock().await.clone()
    }

    pub async fn cancel_download(&self) -> Result<(), String> {
        if let Some(tx) = self.cancel_tx.lock().await.take() {
            let _ = tx.send(());
            let mut st = self.status.lock().await;
            st.is_downloading = false;
            st.stage = "cancelled".into();
            st.error = Some("Download cancelado.".into());
            return Ok(());
        }
        Err("Nenhum download em andamento.".into())
    }

    pub async fn start_download(&self, url: String, name: String) -> Result<(), String> {
        let mut cancel_guard = self.cancel_tx.lock().await;
        let (tx, mut rx) = oneshot::channel();
        *cancel_guard = Some(tx);

        let data_dir = self.data_dir.clone();
        let status_arc = self.status.clone();
        let ws = self.ws.clone();

        tokio::spawn(async move {
            {
                let mut st = status_arc.lock().await;
                *st = AppDownloadStatus {
                    is_downloading: true,
                    stage: "connecting".into(),
                    ..Default::default()
                };
            }

            let client = match reqwest::Client::builder().timeout(Duration::from_secs(30)).build() {
                Ok(c) => c,
                Err(e) => return Self::fail(&status_arc, &ws, &e.to_string()).await,
            };

            let resp = match client.get(&url).send().await {
                Ok(r) if r.status().is_success() => r,
                Ok(r) => return Self::fail(&status_arc, &ws, &format!("HTTP {}", r.status())).await,
                Err(e) => return Self::fail(&status_arc, &ws, &e.to_string()).await,
            };

            let total = resp.content_length().unwrap_or(0);
            let dir = data_dir.join("updates");
            let _ = tokio::fs::create_dir_all(&dir).await;
            Self::cleanup_update_residuals(&dir);
            let dest = dir.join(&name);
            let part = dir.join(format!("{name}.part"));

            let mut file = match File::create(&part).await {
                Ok(f) => f,
                Err(e) => return Self::fail(&status_arc, &ws, &e.to_string()).await,
            };

            let mut stream = resp.bytes_stream();
            let mut downloaded = 0u64;
            let start = Instant::now();

            loop {
                tokio::select! {
                    _ = &mut rx => {
                        let _ = tokio::fs::remove_file(&part).await;
                        return;
                    }
                    chunk = stream.next() => {
                        match chunk {
                            Some(Ok(b)) => {
                                if file.write_all(&b).await.is_err() {
                                    return Self::fail(&status_arc, &ws, "Erro ao gravar dados no disco").await;
                                }
                                downloaded += b.len() as u64;
                                let elapsed = start.elapsed().as_secs_f64();
                                let prog = if total > 0 { (downloaded as f32 / total as f32) * 100.0 } else { 0.0 };
                                let speed = if elapsed > 0.05 { (downloaded as f32 / (1024.0 * 1024.0)) / elapsed as f32 } else { 0.0 };
                                let eta = if speed > 0.01 && total > downloaded { ((total - downloaded) as f32 / (1024.0 * 1024.0) / speed) as u64 } else { 0 };

                                {
                                    let mut st = status_arc.lock().await;
                                    st.stage = "downloading".into();
                                    st.progress = prog;
                                    st.downloaded_bytes = downloaded;
                                    st.total_bytes = total;
                                    st.speed_mb_s = speed;
                                    st.eta_seconds = eta;
                                }
                            }
                            Some(Err(e)) => return Self::fail(&status_arc, &ws, &e.to_string()).await,
                            None => break,
                        }
                    }
                }
            }

            let _ = file.flush().await;
            drop(file);
            let _ = tokio::fs::rename(&part, &dest).await;

            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                if let Ok(meta) = std::fs::metadata(&dest) {
                    let mut p = meta.permissions();
                    p.set_mode(0o755);
                    let _ = std::fs::set_permissions(&dest, p);
                }
            }

            let path_str = dest.to_string_lossy().to_string();
            {
                let mut st = status_arc.lock().await;
                *st = AppDownloadStatus {
                    is_downloading: false,
                    stage: "ready".into(),
                    progress: 100.0,
                    downloaded_bytes: total,
                    total_bytes: total,
                    file_path: Some(path_str.clone()),
                    ..Default::default()
                };
            }
            ws.emit(WsEvent::AppUpdateProgress {
                stage: "ready".into(),
                progress: 100.0,
                downloaded_bytes: total,
                total_bytes: total,
                speed_mb_s: 0.0,
                eta_seconds: 0,
                error: None,
                file_path: Some(path_str),
            });
        });

        Ok(())
    }

    async fn fail(status: &Arc<Mutex<AppDownloadStatus>>, ws: &WsState, err: &str) {
        let mut st = status.lock().await;
        st.is_downloading = false;
        st.stage = "error".into();
        st.error = Some(err.into());
        ws.emit(WsEvent::AppUpdateProgress {
            stage: "error".into(),
            progress: st.progress,
            downloaded_bytes: st.downloaded_bytes,
            total_bytes: st.total_bytes,
            speed_mb_s: 0.0,
            eta_seconds: 0,
            error: Some(err.into()),
            file_path: None,
        });
    }

    pub async fn apply_update(&self, custom: Option<String>) -> Result<String, String> {
        let path = custom
            .map(PathBuf::from)
            .or_else(|| self.status.try_lock().ok().and_then(|s| s.file_path.clone().map(PathBuf::from)))
            .unwrap_or_else(|| self.data_dir.join("updates"));

        let file = if path.is_file() {
            path
        } else {
            let mut list: Vec<PathBuf> = std::fs::read_dir(&path)
                .map_err(|e| e.to_string())?
                .filter_map(|e| e.ok().map(|d| d.path()))
                .filter(|p| p.extension().is_some())
                .collect();
            list.sort_by_key(|p| std::fs::metadata(p).and_then(|m| m.modified()).ok());
            list.pop().ok_or_else(|| "Nenhum instalador encontrado.".to_string())?
        };

        let s = file.to_string_lossy().to_lowercase();
        if s.ends_with(".appimage") {
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                let _ = std::fs::set_permissions(&file, std::fs::Permissions::from_mode(0o755));
                info!("🚀 Iniciando novo AppImage: {:?}", file);
                std::process::Command::new(&file).spawn().map_err(|e| e.to_string())?;
                tokio::spawn(async {
                    tokio::time::sleep(Duration::from_millis(600)).await;
                    std::process::exit(0);
                });
                return Ok(format!("AppImage {} iniciado. Reiniciando aplicativo.", file.display()));
            }
        } else if s.ends_with(".deb") {
            #[cfg(unix)]
            {
                let deb_path = file.to_string_lossy().to_string();
                info!("📦 Disparando instalação do pacote .deb: {}", deb_path);
                
                let install_cmd = format!(
                    "if pkexec dpkg -i '{deb_path}'; then (/usr/bin/star-multlogin &); else xdg-open '{deb_path}'; fi"
                );
                
                let res = std::process::Command::new("sh")
                    .arg("-c")
                    .arg(&install_cmd)
                    .spawn();

                if res.is_ok() {
                    tokio::spawn(async {
                        tokio::time::sleep(Duration::from_millis(800)).await;
                        std::process::exit(0);
                    });
                    return Ok("Solicitando senha do sistema para instalar a nova versão .deb...".into());
                } else {
                    let _ = std::process::Command::new("xdg-open").arg(&file).spawn();
                    return Ok(format!("Instalador de pacotes .deb aberto: {}", file.display()));
                }
            }
        } else if s.ends_with(".exe") {
            #[cfg(windows)]
            {
                std::process::Command::new(&file).spawn().map_err(|e| e.to_string())?;
                tokio::spawn(async {
                    tokio::time::sleep(Duration::from_millis(600)).await;
                    std::process::exit(0);
                });
                return Ok("Instalador Windows iniciado.".into());
            }
        } else if s.ends_with(".msi") {
            #[cfg(windows)]
            {
                let _ = std::process::Command::new("msiexec")
                    .args(["/i", &file.to_string_lossy()])
                    .spawn()
                    .map_err(|e| e.to_string())?;
                tokio::spawn(async {
                    tokio::time::sleep(Duration::from_millis(600)).await;
                    std::process::exit(0);
                });
                return Ok("Instalador MSI iniciado.".into());
            }
        } else if s.ends_with(".dmg") {
            #[cfg(target_os = "macos")]
            {
                std::process::Command::new("open").arg(&file).spawn().map_err(|e| e.to_string())?;
                return Ok("Instalador macOS (.dmg) aberto.".into());
            }
        }

        Err("Formato não suportado para execução automática.".into())
    }
}

/// Identifica com 100% de precisão o formato do próprio aplicativo que está em execução
pub fn detect_current_app_format() -> &'static str {
    if std::env::var("APPIMAGE").is_ok() {
        return "appimage";
    }

    if let Ok(exe) = std::env::current_exe() {
        let p = exe.to_string_lossy().to_lowercase();
        if p.contains(".mount_") || p.ends_with(".appimage") {
            return "appimage";
        }
        if p.starts_with("/usr") || p.starts_with("/opt") {
            return "deb";
        }
        if p.contains("appdata") {
            return "exe";
        }
        if p.contains("program files") {
            return "msi";
        }
    }

    if cfg!(target_os = "windows") {
        "exe"
    } else if cfg!(target_os = "macos") {
        "dmg"
    } else {
        "deb"
    }
}

// === HANDLERS AXUM ===

pub async fn check_app_update_handler(Query(q): Query<CheckQuery>) -> impl IntoResponse {
    let cur = q.current_version.unwrap_or_else(|| "0.1.22".into());
    let client = reqwest::Client::builder()
        .user_agent("StarMultlogin/1.0")
        .timeout(Duration::from_secs(10))
        .build()
        .unwrap_or_default();

    let url = "https://api.github.com/repos/sr-satoru/antidetect-pro/releases/latest";
    let resp: serde_json::Value = match client.get(url).send().await {
        Ok(r) if r.status().is_success() => r.json().await.unwrap_or_default(),
        _ => return (StatusCode::BAD_GATEWAY, "Erro ao conectar com GitHub").into_response(),
    };

    let tag = resp["tag_name"].as_str().unwrap_or("").to_string();
    let latest = tag.trim_start_matches('v').to_string();
    let has_update = !latest.is_empty() && latest != cur;

    let mut compat = Vec::new();
    if let Some(arr) = resp["assets"].as_array() {
        for a in arr {
            let name = a["name"].as_str().unwrap_or("").to_string();
            let dl = a["browser_download_url"].as_str().unwrap_or("").to_string();
            let sz = a["size"].as_u64().unwrap_or(0);
            let lower = name.to_lowercase();
            let fmt = if lower.ends_with(".appimage") { "appimage" }
                else if lower.ends_with(".deb") { "deb" }
                else if lower.ends_with(".rpm") { "rpm" }
                else if lower.ends_with(".exe") { "exe" }
                else if lower.ends_with(".msi") { "msi" }
                else if lower.ends_with(".dmg") { "dmg" }
                else { "unknown" };

            let is_match = if cfg!(target_os = "linux") {
                fmt == "appimage" || fmt == "deb" || fmt == "rpm"
            } else if cfg!(target_os = "windows") {
                fmt == "exe" || fmt == "msi"
            } else if cfg!(target_os = "macos") {
                fmt == "dmg"
            } else {
                true
            };

            if is_match && !name.is_empty() {
                compat.push(AppAssetInfo { name, download_url: dl, size_bytes: sz, format: fmt.into() });
            }
        }
    }

    // Consulta o formato real do executável atual e elege o mesmo formato
    let app_format = detect_current_app_format();
    let pref = q.format.unwrap_or_else(|| app_format.to_string());
    let matched = compat.iter().find(|a| a.format == pref).or_else(|| compat.first()).cloned();

    Json(serde_json::json!({
        "has_update": has_update,
        "current_version": cur,
        "latest_version": latest,
        "tag_name": tag,
        "name": resp["name"].as_str().unwrap_or(&tag),
        "matched_asset": matched,
        "compatible_assets": compat,
        "detected_format": app_format,
    })).into_response()
}

pub async fn trigger_app_download_handler(
    State(srv): State<Arc<AppUpdateService>>,
    Json(p): Json<DownloadPayload>,
) -> impl IntoResponse {
    match (p.url, p.name) {
        (Some(u), Some(n)) => match srv.start_download(u, n).await {
            Ok(_) => (StatusCode::OK, Json(serde_json::json!({ "success": true }))).into_response(),
            Err(e) => (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "success": false, "message": e }))).into_response(),
        },
        _ => (StatusCode::BAD_REQUEST, "URL e nome são obrigatórios").into_response(),
    }
}

pub async fn get_app_download_status_handler(State(srv): State<Arc<AppUpdateService>>) -> impl IntoResponse {
    Json(srv.get_status().await)
}

pub async fn cancel_app_download_handler(State(srv): State<Arc<AppUpdateService>>) -> impl IntoResponse {
    let _ = srv.cancel_download().await;
    Json(serde_json::json!({ "success": true }))
}

pub async fn apply_app_update_handler(
    State(srv): State<Arc<AppUpdateService>>,
    payload: Option<Json<ApplyPayload>>,
) -> impl IntoResponse {
    let file = payload.and_then(|Json(p)| p.file_path);
    match srv.apply_update(file).await {
        Ok(msg) => (StatusCode::OK, Json(serde_json::json!({ "success": true, "message": msg }))).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "success": false, "message": e }))).into_response(),
    }
}
