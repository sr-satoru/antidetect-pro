use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use tracing::info;

use crate::models::Profile;
use crate::ws::{WsEvent, WsState};
use super::{cdp, watcher};
use crate::launcher::sys;

/// Gerenciador de processos e orquestrador do ciclo de vida do navegador.
pub struct ProcessManager {
    running: Arc<Mutex<HashMap<String, u32>>>,
    profile_dirs: Arc<Mutex<HashMap<String, PathBuf>>>,
    ports: Arc<Mutex<HashMap<String, u16>>>,
    relays: Arc<Mutex<HashMap<String, crate::network::relay::ProxyRelay>>>,
    client: reqwest::Client,
    ws: WsState,
    auto_sync: Arc<Mutex<Option<Arc<crate::server_sync::AutoSyncEngine>>>>,
    vault: Arc<Mutex<Option<Arc<crate::service_database::Vault>>>>,
}

impl ProcessManager {
    pub fn new(ws: WsState) -> Self {
        let client = reqwest::Client::builder()
            .user_agent("Mozilla/5.0 (X11; Linux x86_64; rv:150.0) Gecko/20100101 Firefox/150.0 StarMultlogin/1.0")
            .timeout(std::time::Duration::from_secs(15))
            .build()
            .unwrap_or_default();

        Self {
            running: Arc::new(Mutex::new(HashMap::new())),
            profile_dirs: Arc::new(Mutex::new(HashMap::new())),
            ports: Arc::new(Mutex::new(HashMap::new())),
            relays: Arc::new(Mutex::new(HashMap::new())),
            client,
            ws,
            auto_sync: Arc::new(Mutex::new(None)),
            vault: Arc::new(Mutex::new(None)),
        }
    }

    pub fn set_auto_sync(&self, auto_sync: Arc<crate::server_sync::AutoSyncEngine>) {
        let mut lock = self.auto_sync.lock().unwrap();
        *lock = Some(auto_sync);
    }

    pub fn set_vault(&self, vault: Arc<crate::service_database::Vault>) {
        let mut lock = self.vault.lock().unwrap();
        *lock = Some(vault);
    }

    /// Retorna a porta de depuração do perfil caso esteja ativa
    pub fn get_debug_port(&self, profile_id: &str) -> Option<u16> {
        self.ports.lock().unwrap().get(profile_id).copied()
    }

    /// Retorna o número de instâncias de navegadores atualmente abertos
    pub fn get_running_count(&self) -> usize {
        self.running.lock().unwrap().len()
    }

    /// Resolve o executável do motor Star Multlogin baixado e gerenciado pelo aplicativo.
    pub fn resolve_browser_binary(data_dir: &Path) -> Result<PathBuf, String> {
        crate::browser_downloader::resolve_engine_binary(data_dir)
    }

    /// Resolve o executável para um kernel específico (AstroFox / AstroBrowser)
    pub fn resolve_kernel_binary(data_dir: &Path, kernel: &str) -> Result<PathBuf, String> {
        let engine = crate::browser::engines::get_engine(kernel);
        engine.resolve_binary(data_dir)
    }

    /// Dispara o navegador Camoufox para o perfil com suporte opcional a depuração CDP
    pub async fn launch_with_cdp(
        &self,
        profile: &Profile,
        data_dir: &Path,
        cdp: bool,
    ) -> Result<(u32, Option<u16>, Option<String>), String> {
        self.launch_with_options(profile, data_dir, cdp, None).await
    }

    pub async fn launch_with_options(
        &self,
        profile: &Profile,
        data_dir: &Path,
        cdp: bool,
        initial_url: Option<&str>,
    ) -> Result<(u32, Option<u16>, Option<String>), String> {
        // Se já constar como em execução, checa se o processo ainda está ativo no SO
        {
            let mut map = self.running.lock().unwrap();
            if let Some(&pid) = map.get(&profile.id) {
                if sys::is_pid_alive(pid) {
                    info!("Perfil {} já está em execução no PID {}", profile.id, pid);
                    let port = self.get_debug_port(&profile.id);
                    let ws = port.map(|p| format!("ws://127.0.0.1:{}/session", p));
                    return Ok((pid, port, ws));
                } else {
                    map.remove(&profile.id);
                }
            }
        }

        let engine = crate::browser::engines::get_engine(&profile.kernel);
        let binary_path = engine.resolve_binary(data_dir)?;
        let profile_dir = if data_dir.ends_with("profiles") {
            data_dir.join(&profile.id).join("profile")
        } else {
            data_dir.join("profiles").join(&profile.id).join("profile")
        };

        // Remove travas de perfil específicas do motor
        engine.clear_profile_locks(&profile_dir);

        // Prepara configurações e extensões via engine desacoplada
        let prep = engine.prepare_profile_dir(&profile_dir, profile, data_dir, &self.client, cdp).await?;

        // Para AstroBrowser (Chromium), o CDP em loopback é essencial para contornar a criptografia DPAPI
        // de cookies do Chromium e sincronizar sessões em tempo real com o Star Vault (o patch 110-runtime-enable do Clearcote oculta o CDP de páginas).
        let is_chromium = engine.kernel_name() == "AstroBrowser";
        let debug_port = if cdp || is_chromium {
            let port = cdp::pick_available_port();
            let _ = std::fs::remove_file(profile_dir.join("DevToolsActivePort"));
            Some(port)
        } else {
            None
        };

        info!(
            "🚀 Disparando motor '{}' para o perfil '{}' ({}) via {:?} (CDP: {:?}, URL: {:?})",
            engine.kernel_name(), profile.name, profile.id, binary_path, debug_port, initial_url
        );

        // Constrói o comando do processo através da engine desacoplada
        let mut cmd = engine.build_launch_command(
            &binary_path,
            &profile_dir,
            profile,
            debug_port,
            &prep,
            initial_url,
        )?;

        let child = cmd.spawn().map_err(|e| {
            let os_code = e.raw_os_error();
            // Windows Error 225: ERROR_VIRUS_INFECTED
            // Windows Error 1260: ERROR_ACCESS_DISABLED_BY_POLICY
            // Windows Error 5: ERROR_ACCESS_DENIED (frequente se o antivírus bloqueou ou colocou em quarentena)
            let is_antivirus_likely = match os_code {
                Some(225) | Some(1260) => true,
                Some(5) if !binary_path.exists() => true,
                _ => false,
            };

            if is_antivirus_likely {
                tracing::warn!(
                    "⚠️ [Segurança/Antivírus] Possível bloqueio detectado pelo Windows Defender / Antivírus ao executar {:?}! Código OS: {:?} - {}",
                    binary_path,
                    os_code,
                    e
                );
                format!(
                    "Bloqueado pelo Windows Defender / Antivírus (Código OS: {:?}). O executável do navegador foi impedido de iniciar ou colocado em quarentena. Libere o arquivo no Histórico de Proteção da Segurança do Windows.",
                    os_code.unwrap_or(0)
                )
            } else {
                tracing::error!(
                    "❌ Falha ao executar processo do motor em {:?}: {} (Código OS: {:?})",
                    binary_path,
                    e,
                    os_code
                );
                format!("Falha ao executar {:?}: {} (Código OS: {:?})", binary_path, e, os_code)
            }
        })?;

        let pid = child.id().unwrap_or(0);
        info!("✅ Motor '{}' iniciado com PID {} para o perfil {}", engine.kernel_name(), pid, profile.id);

        {
            self.running.lock().unwrap().insert(profile.id.clone(), pid);
            self.profile_dirs.lock().unwrap().insert(profile.id.clone(), profile_dir.clone());
            if let Some(port) = debug_port {
                self.ports.lock().unwrap().insert(profile.id.clone(), port);
            }
        }

        if let Some(relay) = prep.net_setup.relay {
            self.relays.lock().unwrap().insert(profile.id.clone(), relay);
        }

        // Notifica frontend via WebSocket
        self.ws.emit(WsEvent::ProfileStatus {
            profile_id: profile.id.clone(),
            status: "running".to_string(),
        });

        // Polling do WebSocket CDP
        let ws_endpoint = if let Some(port) = debug_port {
            cdp::wait_for_devtools_endpoint(port, &self.client, is_chromium).await
        } else {
            None
        };

        // Para AstroBrowser (Chromium), injeta cookies vivos diretamente na memória do CookieMonster
        if is_chromium {
            if let Some(ws_url) = ws_endpoint.as_deref() {
                let vault_opt = self.vault.lock().unwrap().clone();
                if let Some(v) = vault_opt {
                    let session_svc = crate::service_database::SessionService::new(v);
                    if let Ok(Some(session)) = session_svc.load_session(&profile.id) {
                        if !session.cookies.is_empty() {
                            info!("🍪 [Clearcote/CDP] Injetando {} cookies vivos na memória do motor", session.cookies.len());
                            let _ = cdp::inject_cookies_via_cdp(ws_url, &session.cookies).await;
                        }
                    }
                }
            }
        }

        let meta_file = if data_dir.ends_with("profiles") {
            data_dir.join(&profile.id).join("metadata.json")
        } else {
            data_dir.join("profiles").join(&profile.id).join("metadata.json")
        };

        // Delega o monitoramento de ciclo de vida em background para o watcher.rs com a engine
        watcher::spawn_lifecycle_watcher(
            child,
            pid,
            profile.id.clone(),
            profile_dir,
            meta_file,
            engine,
            self.running.clone(),
            self.profile_dirs.clone(),
            self.ports.clone(),
            self.relays.clone(),
            self.ws.clone(),
            self.auto_sync.clone(),
            self.vault.clone(),
        );

        Ok((pid, debug_port, ws_endpoint))
    }

    /// Dispara o navegador Camoufox para o perfil especificado (Modo padrão sem CDP)
    pub async fn launch(&self, profile: &Profile, data_dir: &Path) -> Result<u32, String> {
        self.launch_with_cdp(profile, data_dir, false)
            .await
            .map(|(pid, _, _)| pid)
    }

    /// Encerra a execução do navegador para o perfil informado
    pub fn stop(&self, profile_id: &str) -> Result<(), String> {
        let mut map = self.running.lock().unwrap();
        if let Some(pid) = map.remove(profile_id) {
            if sys::is_pid_alive(pid) {
                info!("🛑 Encerrando processo PID {} para perfil {}", pid, profile_id);
                let _ = sys::terminate_process_tree(pid);

                for _ in 0..30 {
                    if !sys::is_pid_alive(pid) {
                        break;
                    }
                    std::thread::sleep(std::time::Duration::from_millis(100));
                }
            }
        }

        self.profile_dirs.lock().unwrap().remove(profile_id);
        self.ports.lock().unwrap().remove(profile_id);
        if let Some(mut relay) = self.relays.lock().unwrap().remove(profile_id) {
            relay.stop();
        }

        self.ws.emit(WsEvent::ProfileStatus {
            profile_id: profile_id.to_string(),
            status: "ready".to_string(),
        });

        Ok(())
    }

    /// Retorna a quantidade de perfis em execução
    pub fn running_count(&self) -> usize {
        self.running.lock().unwrap().len()
    }

    /// Verifica se o perfil está com processo ativo no SO
    pub fn is_running(&self, profile_id: &str) -> bool {
        self.is_running_with_dir(profile_id, None)
    }

    /// Verifica se o perfil está ativo conferindo tanto o PID quanto o arquivo de trava no diretório
    pub fn is_running_with_dir(&self, profile_id: &str, candidate_profile_dir: Option<&Path>) -> bool {
        let mut map = self.running.lock().unwrap();
        if let Some(&pid) = map.get(profile_id) {
            if sys::is_pid_alive(pid) {
                return true;
            }
            map.remove(profile_id);
        }

        let dirs = self.profile_dirs.lock().unwrap();
        if let Some(pdir) = dirs.get(profile_id) {
            if sys::is_profile_locked(pdir) {
                return true;
            }
        }

        if let Some(cand) = candidate_profile_dir {
            if sys::is_profile_locked(cand) {
                return true;
            }
        }

        false
    }

    /// Consulta cookies descriptografados em tempo real do navegador via porta CDP ativa
    pub async fn fetch_live_cdp_cookies(&self, profile_id: &str) -> Result<Vec<crate::extraction_session::UnifiedCookie>, String> {
        let port = {
            let pmap = self.ports.lock().unwrap();
            pmap.get(profile_id).copied()
        };
        if let Some(port) = port {
            let ws_url_opt = cdp::wait_for_devtools_endpoint(port, &self.client, false).await;
            if let Some(ws_url) = ws_url_opt {
                return cdp::fetch_cookies_via_cdp(&ws_url).await;
            }
        }
        Err("Endpoint CDP não disponível para este perfil".to_string())
    }
}
