use std::fs::{self, File};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::{Duration, Instant};
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use tokio::io::AsyncWriteExt;
use tokio::sync::Mutex;
use tracing::{error, info};
use zip::ZipArchive;

use crate::browser_downloader::detector::{self, EngineHealthStatus};
use crate::browser_downloader::manifest::BrowserManifest;
use crate::ws::{WsEvent, WsState};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadStatus {
    pub is_downloading: bool,
    pub stage: String, // "idle", "connecting", "downloading", "extracting", "finalizing", "ready", "error"
    pub progress: f32, // 0.0 - 100.0
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
            progress: 0.0,
            downloaded_bytes: 0,
            total_bytes: 0,
            speed_mb_s: 0.0,
            eta_seconds: 0,
            error: None,
        }
    }
}

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

    /// Retorna o estado atual do motor e do processo de download
    pub async fn get_status(&self) -> (EngineHealthStatus, DownloadStatus) {
        let health = detector::check_engine_health(&self.data_dir);
        let status = self.status.lock().await.clone();
        (health, status)
    }

    /// Dispara o download em background se já não houver um em execução
    pub async fn start_download(&self) -> Result<(), String> {
        let mut running_guard = self.is_running.lock().await;
        if *running_guard {
            return Err("Download já está em andamento.".to_string());
        }
        *running_guard = true;

        let data_dir = self.data_dir.clone();
        let ws = self.ws.clone();
        let status_arc = self.status.clone();
        let is_running_arc = self.is_running.clone();

        tokio::spawn(async move {
            let res = Self::execute_download_and_install(&data_dir, &ws, &status_arc).await;
            let mut is_running = is_running_arc.lock().await;
            *is_running = false;

            if let Err(err_msg) = res {
                error!("❌ Falha no download do motor: {}", err_msg);
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

    /// Executa o fluxo completo de download, extração, renomeação e validação
    async fn execute_download_and_install(
        data_dir: &Path,
        ws: &WsState,
        status_arc: &Arc<Mutex<DownloadStatus>>,
    ) -> Result<PathBuf, String> {
        // 1. Carrega o manifesto e localiza a configuração da plataforma
        let manifest = BrowserManifest::load(data_dir)?;
        let (platform_config, platform_key) = manifest.get_current_platform_config()?;
        let target_url = platform_config.url.clone();
        let expected_size_bytes = (platform_config.size_mb as u64) * 1024 * 1024;

        info!(
            "🌐 Iniciando download do motor Camoufox ({}) para a plataforma '{}': {}",
            manifest.version, platform_key, target_url
        );

        // Prepara diretórios
        let binaries_dir = data_dir.join("binaries");
        fs::create_dir_all(&binaries_dir)
            .map_err(|e| format!("Falha ao criar diretório de binários: {}", e))?;

        let tmp_download = binaries_dir.join(".download.tmp");
        let tmp_extract = binaries_dir.join(".tmp_extract");
        let final_engine_dir = detector::get_engine_dir(data_dir);

        // Limpa apenas resíduos temporários de downloads anteriores (.download.tmp e .tmp_extract)
        // O motor instalado atual permanece intacto até que a nova versão seja validada
        let _ = detector::clean_temp_downloads(data_dir);

        // Atualiza status: Conectando
        {
            let mut st = status_arc.lock().await;
            st.is_downloading = true;
            st.stage = "connecting".to_string();
            st.progress = 0.0;
            st.downloaded_bytes = 0;
            st.total_bytes = expected_size_bytes;
            st.speed_mb_s = 0.0;
            st.eta_seconds = 0;
            st.error = None;
            ws.emit(WsEvent::BrowserDownloadProgress {
                stage: "connecting".to_string(),
                progress: 0.0,
                downloaded_bytes: 0,
                total_bytes: expected_size_bytes,
                speed_mb_s: 0.0,
                eta_seconds: 0,
                error: None,
            });
        }

        // 2. Conecta via reqwest com timeouts robustos e User-Agent adequado
        let client = reqwest::Client::builder()
            .user_agent("StarMultloginBrowser/1.0 (Downloader; +https://github.com/sr-satoru/antidetect-pro)")
            .redirect(reqwest::redirect::Policy::limited(10))
            .connect_timeout(Duration::from_secs(25))
            .timeout(Duration::from_secs(1200))
            .tcp_keepalive(Duration::from_secs(60))
            .build()
            .map_err(|e| format!("Erro ao criar cliente HTTP: {}", e))?;

        let response = client
            .get(&target_url)
            .send()
            .await
            .map_err(|e| format!("Falha ao conectar no servidor de download: {}", e))?;

        if !response.status().is_success() {
            return Err(format!(
                "Servidor retornou código de erro HTTP: {}",
                response.status()
            ));
        }

        let total_bytes = response
            .content_length()
            .unwrap_or(expected_size_bytes);

        // Abre arquivo temporário para escrita assíncrona com buffer de 1MB para máxima velocidade
        let file = tokio::fs::File::create(&tmp_download)
            .await
            .map_err(|e| format!("Falha ao criar arquivo de download temporário: {}", e))?;
        let mut buf_writer = tokio::io::BufWriter::with_capacity(1024 * 1024, file);

        let mut stream = response.bytes_stream();
        let mut downloaded_bytes: u64 = 0;
        let start_time = Instant::now();
        let mut last_progress_emit = Instant::now();
        let mut last_bytes_at_emit: u64 = 0;

        // Atualiza status: Baixando
        {
            let mut st = status_arc.lock().await;
            st.stage = "downloading".to_string();
            st.total_bytes = total_bytes;
        }

        // Loop de streaming com bufferização eficiente
        while let Some(chunk_res) = stream.next().await {
            let chunk = chunk_res.map_err(|e| format!("Erro durante o download do pacote: {}", e))?;
            buf_writer.write_all(&chunk)
                .await
                .map_err(|e| format!("Erro ao gravar pacote no disco: {}", e))?;

            downloaded_bytes += chunk.len() as u64;

            let now = Instant::now();
            let elapsed_since_last_emit = now.duration_since(last_progress_emit);

            // Emite atualizações a cada 250ms
            if elapsed_since_last_emit >= Duration::from_millis(250) || downloaded_bytes >= total_bytes {
                let bytes_in_interval = downloaded_bytes.saturating_sub(last_bytes_at_emit);
                let secs = elapsed_since_last_emit.as_secs_f32().max(0.001);
                let speed_mb_s = (bytes_in_interval as f32 / (1024.0 * 1024.0)) / secs;

                let progress = if total_bytes > 0 {
                    ((downloaded_bytes as f32 / total_bytes as f32) * 75.0).min(75.0)
                } else {
                    0.0
                };

                let remaining_bytes = total_bytes.saturating_sub(downloaded_bytes);
                let speed_bytes_s = (speed_mb_s * 1024.0 * 1024.0) as u64;
                let eta_seconds = if speed_bytes_s > 0 {
                    remaining_bytes / speed_bytes_s
                } else {
                    0
                };

                let mut st = status_arc.lock().await;
                st.downloaded_bytes = downloaded_bytes;
                st.total_bytes = total_bytes;
                st.progress = progress;
                st.speed_mb_s = speed_mb_s;
                st.eta_seconds = eta_seconds;

                ws.emit(WsEvent::BrowserDownloadProgress {
                    stage: "downloading".to_string(),
                    progress,
                    downloaded_bytes,
                    total_bytes,
                    speed_mb_s,
                    eta_seconds,
                    error: None,
                });

                last_progress_emit = now;
                last_bytes_at_emit = downloaded_bytes;
            }
        }

        buf_writer.flush()
            .await
            .map_err(|e| format!("Falha ao sincronizar arquivo com disco: {}", e))?;
        drop(buf_writer);

        let total_download_time = start_time.elapsed().as_secs();
        info!(
            "📥 Download concluído em {}s ({} MB). Iniciando extração...",
            total_download_time,
            downloaded_bytes / (1024 * 1024)
        );

        // 3. Extração do Zip
        {
            let mut st = status_arc.lock().await;
            st.stage = "extracting".to_string();
            st.progress = 76.0;
            st.speed_mb_s = 0.0;
            st.eta_seconds = 0;
            ws.emit(WsEvent::BrowserDownloadProgress {
                stage: "extracting".to_string(),
                progress: 76.0,
                downloaded_bytes,
                total_bytes,
                speed_mb_s: 0.0,
                eta_seconds: 0,
                error: None,
            });
        }

        let zip_source = tmp_download.clone();
        let target_dir = tmp_extract.clone();
        let ws_clone = ws.clone();
        let status_clone = status_arc.clone();

        // Extrai em thread dedicada para não bloquear o tokio runtime
        tokio::task::spawn_blocking(move || -> Result<(), String> {
            fs::create_dir_all(&target_dir)
                .map_err(|e| format!("Falha ao criar diretório temporário de extração: {}", e))?;

            let file = File::open(&zip_source)
                .map_err(|e| format!("Falha ao abrir pacote zip baixado: {}", e))?;
            let mut archive = ZipArchive::new(file)
                .map_err(|e| format!("Arquivo baixado não é um ZIP válido: {}", e))?;

            let total_entries = archive.len();
            let mut last_extract_emit = Instant::now();

            for i in 0..total_entries {
                let mut entry = archive
                    .by_index(i)
                    .map_err(|e| format!("Falha ao ler entrada {} do zip: {}", i, e))?;

                let outpath = match entry.enclosed_name() {
                    Some(path) => target_dir.join(path),
                    None => continue,
                };

                if entry.is_dir() {
                    let _ = fs::create_dir_all(&outpath);
                } else {
                    if let Some(parent) = outpath.parent() {
                        if !parent.exists() {
                            let _ = fs::create_dir_all(parent);
                        }
                    }
                    let mut outfile = File::create(&outpath)
                        .map_err(|e| format!("Falha ao criar arquivo de destino {:?}: {}", outpath, e))?;
                    std::io::copy(&mut entry, &mut outfile)
                        .map_err(|e| format!("Falha ao descompactar {:?}: {}", outpath, e))?;

                    #[cfg(unix)]
                    {
                        use std::os::unix::fs::PermissionsExt;
                        if let Some(mode) = entry.unix_mode() {
                            let _ = fs::set_permissions(&outpath, fs::Permissions::from_mode(mode));
                        }
                    }
                }

                if last_extract_emit.elapsed() >= Duration::from_millis(300) || i == total_entries - 1 {
                    let extract_pct = 76.0 + ((i as f32 / total_entries as f32) * 19.0); // 76% a 95%
                    let _ = ws_clone.emit(WsEvent::BrowserDownloadProgress {
                        stage: "extracting".to_string(),
                        progress: extract_pct,
                        downloaded_bytes,
                        total_bytes,
                        speed_mb_s: 0.0,
                        eta_seconds: 0,
                        error: None,
                    });
                    if let Ok(mut st) = status_clone.try_lock() {
                        st.progress = extract_pct;
                    }
                    last_extract_emit = Instant::now();
                }
            }

            Ok(())
        })
        .await
        .map_err(|e| format!("Tarefa de extração interrompida: {}", e))??;

        // Remove o arquivo zip temporário
        let _ = fs::remove_file(&tmp_download);

        // 4. Finalização: normalização de estrutura, renomeação de binário e permissões
        {
            let mut st = status_arc.lock().await;
            st.stage = "finalizing".to_string();
            st.progress = 96.0;
            ws.emit(WsEvent::BrowserDownloadProgress {
                stage: "finalizing".to_string(),
                progress: 96.0,
                downloaded_bytes,
                total_bytes,
                speed_mb_s: 0.0,
                eta_seconds: 0,
                error: None,
            });
        }

        // Se o zip extraiu dentro de uma pasta única (ex: camoufox/), sobe o conteúdo para a raiz
        flatten_wrapper_dir(&tmp_extract)
            .map_err(|e| format!("Falha ao normalizar diretório de extração: {}", e))?;

        // Localiza e renomeia o executável principal para star-engine (ou star-engine.exe)
        let exe_path = detector::find_or_standardize_executable(&tmp_extract)
            .ok_or_else(|| "Executável do navegador não encontrado nos arquivos extraídos.".to_string())?;

        // Garante permissão 0o755 no executável e em binários auxiliares no Unix
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let _ = fs::set_permissions(&exe_path, fs::Permissions::from_mode(0o755));
            // Garante permissão em outros executáveis auxiliares da pasta (ex: minidump-analyzer, glxtest, vaapitest)
            if let Ok(entries) = fs::read_dir(&tmp_extract) {
                for entry in entries.flatten() {
                    let p = entry.path();
                    if p.is_file() {
                        if let Ok(metadata) = p.metadata() {
                            let mode = metadata.permissions().mode();
                            if mode & 0o111 != 0 {
                                let _ = fs::set_permissions(&p, fs::Permissions::from_mode(0o755));
                            }
                        }
                    }
                }
            }
        }

        // Cria installed.json com metadados da versão
        let installed_info = serde_json::json!({
            "engine_name": manifest.engine_name,
            "version": manifest.version,
            "platform": platform_key,
            "installed_at": chrono::Utc::now().to_rfc3339(),
            "executable": exe_path.file_name().and_then(|f| f.to_str()).unwrap_or("star-engine"),
        });
        let _ = fs::write(
            tmp_extract.join("installed.json"),
            serde_json::to_string_pretty(&installed_info).unwrap_or_default(),
        );

        // 5. Substituição atômica: remove motor antigo se existir e move .tmp_extract para .engine
        if final_engine_dir.exists() {
            let _ = fs::remove_dir_all(&final_engine_dir);
        }

        fs::rename(&tmp_extract, &final_engine_dir)
            .map_err(|e| format!("Falha ao mover motor final para {:?}: {}", final_engine_dir, e))?;

        // 6. Verificação de integridade pós-instalação
        let health = detector::check_engine_health(data_dir);
        match health {
            EngineHealthStatus::Installed {
                executable_path,
                version,
                size_bytes,
            } => {
                info!(
                    "✅ Motor de navegação instalado com sucesso em {:?} (versão {}, {} MB)",
                    executable_path,
                    version,
                    size_bytes / (1024 * 1024)
                );

                let mut st = status_arc.lock().await;
                st.is_downloading = false;
                st.stage = "ready".to_string();
                st.progress = 100.0;
                st.speed_mb_s = 0.0;
                st.eta_seconds = 0;
                st.error = None;

                ws.emit(WsEvent::BrowserDownloadProgress {
                    stage: "ready".to_string(),
                    progress: 100.0,
                    downloaded_bytes: total_bytes,
                    total_bytes,
                    speed_mb_s: 0.0,
                    eta_seconds: 0,
                    error: None,
                });

                Ok(executable_path)
            }
            EngineHealthStatus::Broken { reason } => {
                Err(format!("Instalação concluída, mas o teste de integridade falhou: {}", reason))
            }
            EngineHealthStatus::Missing { reason } => {
                Err(format!("Instalação falhou em localizar os binários: {}", reason))
            }
        }
    }
}

/// Sobe os arquivos caso o zip tenha sido descompactado dentro de uma única subpasta wrapper
fn flatten_wrapper_dir(dir: &Path) -> Result<(), std::io::Error> {
    let entries: Vec<_> = fs::read_dir(dir)?
        .filter_map(|e| e.ok())
        .collect();

    if entries.len() == 1 && entries[0].path().is_dir() {
        let single_subdir = entries[0].path();
        // Não achata Camoufox.app no macOS
        if single_subdir.extension().and_then(|s| s.to_str()) != Some("app") {
            info!("Achatando diretório interno único: {:?}", single_subdir);
            let sub_entries: Vec<_> = fs::read_dir(&single_subdir)?
                .filter_map(|e| e.ok())
                .collect();

            for sub in sub_entries {
                let dest = dir.join(sub.file_name());
                fs::rename(sub.path(), dest)?;
            }
            let _ = fs::remove_dir(&single_subdir);
        }
    }

    Ok(())
}
