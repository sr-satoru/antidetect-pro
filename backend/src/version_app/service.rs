use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::{Duration, Instant};
use futures_util::StreamExt;
use tokio::sync::Mutex;
use tracing::{error, info, warn};

use super::detection_os::{LinuxPackageType, OsDetectionInfo, OsPackageType};
use super::models::{AppUpdateStatus, AppVersionInfo, GitHubRelease, GitHubTag};
use super::ws::{VersionWsEvent, VersionWsState};

const REPO_OWNER_NAME: &str = "sr-satoru/antidetect-pro";
const DEFAULT_VERSION: &str = "0.1.11";

#[derive(Clone)]
pub struct AppVersionService {
    http_client: reqwest::Client,
    status: Arc<Mutex<AppUpdateStatus>>,
    downloaded_file: Arc<Mutex<Option<PathBuf>>>,
    update_dir: PathBuf,
    ws_state: VersionWsState,
}

impl AppVersionService {
    pub fn new(ws_state: VersionWsState) -> Self {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(30))
            .user_agent("Star-Multlogin-Updater/2.0")
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());

        let base_dir = crate::browser_downloader::platform::get_canonical_app_dir();
        let update_dir = base_dir.join("updates");
        let _ = std::fs::create_dir_all(&update_dir);

        let initial_status = AppUpdateStatus {
            is_downloading: false,
            stage: "idle".to_string(),
            progress: 0.0,
            speed_mb_s: 0.0,
            eta_seconds: 0,
            downloaded_bytes: 0,
            total_bytes: 0,
            error: None,
            ready_to_restart: false,
        };

        Self {
            http_client: client,
            status: Arc::new(Mutex::new(initial_status)),
            downloaded_file: Arc::new(Mutex::new(None)),
            update_dir,
            ws_state,
        }
    }

    /// Retorna o estado atual do download e instalação
    pub async fn get_status(&self) -> AppUpdateStatus {
        let lock = self.status.lock().await;
        lock.clone()
    }

    /// Obtém a versão atual configurada para o aplicativo
    pub fn get_local_version(&self) -> String {
        let candidate_paths = [
            "app/package.json",
            "../app/package.json",
            "app/src-tauri/tauri.conf.json",
            "../app/src-tauri/tauri.conf.json",
        ];

        for path_str in &candidate_paths {
            let path = Path::new(path_str);
            if path.exists() {
                if let Ok(content) = std::fs::read_to_string(path) {
                    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&content) {
                        if let Some(v) = parsed.get("version").and_then(|v| v.as_str()) {
                            if !v.is_empty() {
                                return v.to_string();
                            }
                        }
                    }
                }
            }
        }

        DEFAULT_VERSION.to_string()
    }

    /// Compara duas versões semver utilizando a crate oficial semver
    pub fn is_newer_version(latest_str: &str, current_str: &str) -> bool {
        let clean_latest = latest_str.trim_start_matches('v');
        let clean_current = current_str.trim_start_matches('v');

        match (semver::Version::parse(clean_latest), semver::Version::parse(clean_current)) {
            (Ok(latest), Ok(current)) => latest > current,
            _ => {
                // Fallback manual numérico se não for um semver estrito
                let p1: Vec<u64> = clean_latest.split('.').filter_map(|s| s.parse().ok()).collect();
                let p2: Vec<u64> = clean_current.split('.').filter_map(|s| s.parse().ok()).collect();
                let len = std::cmp::max(p1.len(), p2.len());
                for i in 0..len {
                    let n1 = p1.get(i).copied().unwrap_or(0);
                    let n2 = p2.get(i).copied().unwrap_or(0);
                    if n1 > n2 {
                        return true;
                    }
                    if n1 < n2 {
                        return false;
                    }
                }
                false
            }
        }
    }

    /// Verifica no GitHub se há uma versão mais recente compatível com o SO e arquitetura detectados
    pub async fn check_update(&self, client_override_version: Option<String>) -> Result<AppVersionInfo, String> {
        let current_version = client_override_version
            .filter(|v| !v.trim().is_empty())
            .unwrap_or_else(|| self.get_local_version());

        let os_info = OsDetectionInfo::detect();

        // 1. Tenta obter /releases/latest
        let mut release_info = self.fetch_latest_release().await;

        // 2. Fallback para primeira release pública de /releases
        if release_info.is_none() {
            release_info = self.fetch_first_available_release().await;
        }

        // 3. Fallback para tag Git em /tags
        let (tag_name, name, body, published_at, html_url, assets) = if let Some(rel) = release_info {
            let tag = rel.tag_name.unwrap_or_else(|| format!("v{}", current_version));
            let name = rel.name.unwrap_or_else(|| format!("Star Multlogin {}", tag));
            let body = rel.body.unwrap_or_default();
            let published = rel.published_at.unwrap_or_else(|| chrono::Utc::now().to_rfc3339());
            let html = rel.html_url.unwrap_or_else(|| format!("https://github.com/{}/releases", REPO_OWNER_NAME));
            (tag, name, body, published, html, rel.assets)
        } else if let Some(latest_tag) = self.fetch_latest_git_tag().await {
            let tag = latest_tag;
            let name = format!("Star Multlogin {}", tag);
            let body = format!("Nova tag {} encontrada no repositório GitHub.", tag);
            let published = chrono::Utc::now().to_rfc3339();
            let html = format!("https://github.com/{}/releases/tag/{}", REPO_OWNER_NAME, tag);
            (tag, name, body, published, html, Vec::new())
        } else {
            return Ok(AppVersionInfo {
                current_version: current_version.clone(),
                latest_version: current_version.clone(),
                tag_name: format!("v{}", current_version),
                name: format!("Star Multlogin v{}", current_version),
                body: "Versão local em execução.".to_string(),
                published_at: chrono::Utc::now().to_rfc3339(),
                html_url: format!("https://github.com/{}/releases", REPO_OWNER_NAME),
                has_update: false,
                download_url: None,
                asset_name: None,
                asset_size: None,
                platform: os_info.display_name,
                arch: os_info.arch,
            });
        };

        let latest_version = tag_name.trim_start_matches('v').to_string();
        let has_update = Self::is_newer_version(&latest_version, &current_version);

        // Casa o asset correto com a detecção do SO
        let mut download_url = None;
        let mut asset_name = None;
        let mut asset_size = None;

        if let Some(matched_asset) = os_info.match_asset(&assets) {
            download_url = matched_asset.browser_download_url.clone();
            asset_name = matched_asset.name.clone();
            asset_size = matched_asset.size;
        }

        if download_url.is_none() {
            download_url = Some(html_url.clone());
        }

        info!(
            "🔍 [AppUpdater] Atual: v{} | Remoto: {} | SO: {} | Tem update: {} | Asset: {:?}",
            current_version, latest_version, os_info.display_name, has_update, asset_name
        );

        Ok(AppVersionInfo {
            current_version,
            latest_version,
            tag_name,
            name,
            body,
            published_at,
            html_url,
            has_update,
            download_url,
            asset_name,
            asset_size,
            platform: os_info.display_name,
            arch: os_info.arch,
        })
    }

    /// Dispara o download com streaming e broadcast no WebSocket dedicado
    pub async fn start_download(&self, custom_url: Option<String>) -> Result<String, String> {
        {
            let lock = self.status.lock().await;
            if lock.is_downloading {
                return Ok("Download já em andamento.".to_string());
            }
        }

        let target_url = if let Some(url) = custom_url.filter(|s| !s.trim().is_empty()) {
            url
        } else {
            let info = self.check_update(None).await?;
            info.download_url.ok_or_else(|| "URL de download não localizada.".to_string())?
        };

        if !target_url.starts_with("http://") && !target_url.starts_with("https://") {
            return Err("URL de download inválida.".to_string());
        }

        let file_name = target_url
            .split('/')
            .last()
            .unwrap_or("star-multlogin-update.bin")
            .to_string();

        let client = self.http_client.clone();
        let status_arc = self.status.clone();
        let downloaded_file_arc = self.downloaded_file.clone();
        let update_dir = self.update_dir.clone();
        let ws = self.ws_state.clone();

        tokio::spawn(async move {
            info!("📥 [AppUpdater] Iniciando download streaming: {}", target_url);

            {
                let mut st = status_arc.lock().await;
                st.is_downloading = true;
                st.stage = "connecting".to_string();
                st.progress = 0.0;
                st.error = None;
                st.ready_to_restart = false;
            }

            ws.emit(VersionWsEvent::UpdateProgress {
                stage: "connecting".to_string(),
                progress: 0.0,
                downloaded_bytes: 0,
                total_bytes: 0,
                speed_mb_s: 0.0,
                eta_seconds: 0,
                error: None,
            });

            let response = match client.get(&target_url).send().await {
                Ok(resp) if resp.status().is_success() => resp,
                Ok(resp) => {
                    let err_msg = format!("Servidor retornou status HTTP {}", resp.status());
                    error!("❌ [AppUpdater] {}", err_msg);
                    let mut st = status_arc.lock().await;
                    st.is_downloading = false;
                    st.stage = "error".to_string();
                    st.error = Some(err_msg.clone());
                    ws.emit(VersionWsEvent::UpdateProgress {
                        stage: "error".to_string(),
                        progress: 0.0,
                        downloaded_bytes: 0,
                        total_bytes: 0,
                        speed_mb_s: 0.0,
                        eta_seconds: 0,
                        error: Some(err_msg),
                    });
                    return;
                }
                Err(e) => {
                    let err_msg = format!("Falha de conexão com repositório: {}", e);
                    error!("❌ [AppUpdater] {}", err_msg);
                    let mut st = status_arc.lock().await;
                    st.is_downloading = false;
                    st.stage = "error".to_string();
                    st.error = Some(err_msg.clone());
                    ws.emit(VersionWsEvent::UpdateProgress {
                        stage: "error".to_string(),
                        progress: 0.0,
                        downloaded_bytes: 0,
                        total_bytes: 0,
                        speed_mb_s: 0.0,
                        eta_seconds: 0,
                        error: Some(err_msg),
                    });
                    return;
                }
            };

            let total_bytes = response.content_length().unwrap_or(0);
            let part_path = update_dir.join(format!("{}.part", file_name));
            let final_path = update_dir.join(&file_name);

            let mut file = match tokio::fs::File::create(&part_path).await {
                Ok(f) => f,
                Err(e) => {
                    let err_msg = format!("Erro ao criar arquivo temporário de atualização: {}", e);
                    let mut st = status_arc.lock().await;
                    st.is_downloading = false;
                    st.stage = "error".to_string();
                    st.error = Some(err_msg.clone());
                    ws.emit(VersionWsEvent::UpdateProgress {
                        stage: "error".to_string(),
                        progress: 0.0,
                        downloaded_bytes: 0,
                        total_bytes: 0,
                        speed_mb_s: 0.0,
                        eta_seconds: 0,
                        error: Some(err_msg),
                    });
                    return;
                }
            };

            let mut stream = response.bytes_stream();
            let mut downloaded_bytes: u64 = 0;
            let start_time = Instant::now();
            let mut last_emit = Instant::now();
            let mut last_bytes: u64 = 0;

            {
                let mut st = status_arc.lock().await;
                st.stage = "downloading".to_string();
                st.total_bytes = total_bytes;
            }

            use tokio::io::AsyncWriteExt;

            while let Some(chunk_res) = stream.next().await {
                match chunk_res {
                    Ok(chunk) => {
                        if let Err(e) = file.write_all(&chunk).await {
                            let err_msg = format!("Erro ao gravar dados no disco: {}", e);
                            let mut st = status_arc.lock().await;
                            st.is_downloading = false;
                            st.stage = "error".to_string();
                            st.error = Some(err_msg);
                            return;
                        }

                        downloaded_bytes += chunk.len() as u64;

                        // Emite evento via WebSocket a cada 200ms
                        if last_emit.elapsed() >= Duration::from_millis(200) || downloaded_bytes == total_bytes {
                            let elapsed_sec = last_emit.elapsed().as_secs_f32();
                            let bytes_diff = downloaded_bytes.saturating_sub(last_bytes);
                            let speed_mb_s = if elapsed_sec > 0.0 {
                                (bytes_diff as f32 / elapsed_sec) / (1024.0 * 1024.0)
                            } else {
                                0.0
                            };

                            let progress = if total_bytes > 0 {
                                ((downloaded_bytes as f32 / total_bytes as f32) * 100.0).min(99.9)
                            } else {
                                50.0
                            };

                            let remaining_bytes = total_bytes.saturating_sub(downloaded_bytes);
                            let bytes_per_sec = (downloaded_bytes as f64) / start_time.elapsed().as_secs_f64();
                            let eta_seconds = if bytes_per_sec > 0.0 {
                                (remaining_bytes as f64 / bytes_per_sec) as u64
                            } else {
                                0
                            };

                            {
                                let mut st = status_arc.lock().await;
                                st.progress = progress;
                                st.downloaded_bytes = downloaded_bytes;
                                st.speed_mb_s = speed_mb_s;
                                st.eta_seconds = eta_seconds;
                            }

                            ws.emit(VersionWsEvent::UpdateProgress {
                                stage: "downloading".to_string(),
                                progress,
                                downloaded_bytes,
                                total_bytes,
                                speed_mb_s,
                                eta_seconds,
                                error: None,
                            });

                            last_emit = Instant::now();
                            last_bytes = downloaded_bytes;
                        }
                    }
                    Err(e) => {
                        let err_msg = format!("Interrupção no streaming da atualização: {}", e);
                        let mut st = status_arc.lock().await;
                        st.is_downloading = false;
                        st.stage = "error".to_string();
                        st.error = Some(err_msg.clone());
                        ws.emit(VersionWsEvent::UpdateProgress {
                            stage: "error".to_string(),
                            progress: 0.0,
                            downloaded_bytes,
                            total_bytes,
                            speed_mb_s: 0.0,
                            eta_seconds: 0,
                            error: Some(err_msg),
                        });
                        return;
                    }
                }
            }

            let _ = file.flush().await;
            drop(file);

            if let Err(e) = tokio::fs::rename(&part_path, &final_path).await {
                let err_msg = format!("Erro ao finalizar binário de atualização: {}", e);
                let mut st = status_arc.lock().await;
                st.is_downloading = false;
                st.stage = "error".to_string();
                st.error = Some(err_msg);
                return;
            }

            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                let _ = std::fs::set_permissions(&final_path, std::fs::Permissions::from_mode(0o755));
            }

            info!("✅ [AppUpdater] Atualização pronta para reinicialização: {}", final_path.display());

            {
                let mut path_lock = downloaded_file_arc.lock().await;
                *path_lock = Some(final_path.clone());

                let mut st = status_arc.lock().await;
                st.is_downloading = false;
                st.stage = "ready".to_string();
                st.progress = 100.0;
                st.speed_mb_s = 0.0;
                st.eta_seconds = 0;
                st.downloaded_bytes = total_bytes;
                st.ready_to_restart = true;
            }

            ws.emit(VersionWsEvent::UpdateProgress {
                stage: "ready".to_string(),
                progress: 100.0,
                downloaded_bytes: total_bytes,
                total_bytes,
                speed_mb_s: 0.0,
                eta_seconds: 0,
                error: None,
            });

            ws.emit(VersionWsEvent::UpdateReady {
                version: file_name.clone(),
                asset_name: file_name,
                file_path: final_path.to_string_lossy().to_string(),
            });
        });

        Ok("Download da atualização iniciado em segundo plano.".to_string())
    }

    /// Aplica a atualização substituindo o executável e reinicia automaticamente o aplicativo
    pub async fn apply_restart(&self) -> Result<(), String> {
        let file_path = {
            let lock = self.downloaded_file.lock().await;
            lock.clone().ok_or_else(|| "Nenhum arquivo baixado disponível para reinicialização.".to_string())?
        };

        let os_info = OsDetectionInfo::detect();

        match os_info.package_type {
            OsPackageType::Linux(LinuxPackageType::AppImage(orig_opt)) => {
                #[cfg(unix)]
                {
                    use std::os::unix::fs::PermissionsExt;
                    let _ = std::fs::set_permissions(&file_path, std::fs::Permissions::from_mode(0o755));
                }

                let exec_target = if let Some(orig) = orig_opt {
                    if let Err(e) = std::fs::copy(&file_path, &orig) {
                        warn!("Não foi possível sobrescrever o AppImage original ({}): {}. Executando novo binário diretamente.", orig.display(), e);
                        file_path.clone()
                    } else {
                        #[cfg(unix)]
                        {
                            use std::os::unix::fs::PermissionsExt;
                            let _ = std::fs::set_permissions(&orig, std::fs::Permissions::from_mode(0o755));
                        }
                        orig
                    }
                } else {
                    file_path.clone()
                };

                info!("🚀 [AppUpdater] Reiniciando Star Multlogin atualizado: {}", exec_target.display());
                std::process::Command::new(&exec_target)
                    .spawn()
                    .map_err(|e| format!("Falha ao iniciar processo do AppImage: {}", e))?;

                tokio::time::sleep(Duration::from_millis(500)).await;
                std::process::exit(0);
            }
            OsPackageType::Windows => {
                info!("🚀 [AppUpdater] Executando instalador Windows: {}", file_path.display());
                std::process::Command::new(&file_path)
                    .arg("/S")
                    .spawn()
                    .map_err(|e| format!("Falha ao iniciar instalador Windows: {}", e))?;

                tokio::time::sleep(Duration::from_millis(500)).await;
                std::process::exit(0);
            }
            _ => {
                #[cfg(unix)]
                {
                    use std::os::unix::fs::PermissionsExt;
                    let _ = std::fs::set_permissions(&file_path, std::fs::Permissions::from_mode(0o755));
                }

                info!("🚀 [AppUpdater] Reiniciando binário atualizado: {}", file_path.display());
                std::process::Command::new(&file_path)
                    .spawn()
                    .map_err(|e| format!("Falha ao iniciar executável: {}", e))?;

                tokio::time::sleep(Duration::from_millis(500)).await;
                std::process::exit(0);
            }
        }
    }

    /// Consulta /releases/latest no GitHub
    async fn fetch_latest_release(&self) -> Option<GitHubRelease> {
        let url = format!("https://api.github.com/repos/{}/releases/latest", REPO_OWNER_NAME);
        match self.http_client.get(&url).send().await {
            Ok(resp) if resp.status().is_success() => resp.json::<GitHubRelease>().await.ok(),
            _ => None,
        }
    }

    /// Consulta /releases para obter a primeira release pública
    async fn fetch_first_available_release(&self) -> Option<GitHubRelease> {
        let url = format!("https://api.github.com/repos/{}/releases?per_page=5", REPO_OWNER_NAME);
        match self.http_client.get(&url).send().await {
            Ok(resp) if resp.status().is_success() => {
                let list = resp.json::<Vec<GitHubRelease>>().await.ok()?;
                list.into_iter().find(|r| !r.draft.unwrap_or(false))
            }
            _ => None,
        }
    }

    /// Consulta /tags para obter a tag Git mais recente
    async fn fetch_latest_git_tag(&self) -> Option<String> {
        let url = format!("https://api.github.com/repos/{}/tags?per_page=5", REPO_OWNER_NAME);
        match self.http_client.get(&url).send().await {
            Ok(resp) if resp.status().is_success() => {
                let tags = resp.json::<Vec<GitHubTag>>().await.ok()?;
                tags.first().map(|t| t.name.clone())
            }
            _ => None,
        }
    }
}
