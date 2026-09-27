use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::{Arc, Mutex};
use tracing::info;

use crate::models::Profile;
use crate::ws::{WsEvent, WsState};

/// Gerenciador de processos do navegador Camoufox.
pub struct ProcessManager {
    running: Arc<Mutex<HashMap<String, u32>>>,
    ports: Arc<Mutex<HashMap<String, u16>>>,
    tunnels: Arc<Mutex<HashMap<String, crate::network::tunnel::Socks5LoopbackTunnel>>>,
    client: reqwest::Client,
    ws: WsState,
    auto_sync: Arc<Mutex<Option<Arc<crate::cloud_sync::AutoSyncEngine>>>>,
}

impl ProcessManager {
    pub fn new(ws: WsState) -> Self {
        let client = reqwest::Client::builder()
            .user_agent("Mozilla/5.0 (X11; Linux x86_64; rv:150.0) Gecko/20100101 Firefox/150.0 FuryBrowser/1.0")
            .timeout(std::time::Duration::from_secs(15))
            .build()
            .unwrap_or_default();

        Self {
            running: Arc::new(Mutex::new(HashMap::new())),
            ports: Arc::new(Mutex::new(HashMap::new())),
            tunnels: Arc::new(Mutex::new(HashMap::new())),
            client,
            ws,
            auto_sync: Arc::new(Mutex::new(None)),
        }
    }

    pub fn set_auto_sync(&self, auto_sync: Arc<crate::cloud_sync::AutoSyncEngine>) {
        let mut lock = self.auto_sync.lock().unwrap();
        *lock = Some(auto_sync);
    }

    /// Retorna a porta de depuração do perfil caso esteja ativa
    pub fn get_debug_port(&self, profile_id: &str) -> Option<u16> {
        let map = self.ports.lock().unwrap();
        map.get(profile_id).copied()
    }

    /// Escolhe uma porta TCP local disponível
    #[allow(dead_code)]
    pub fn pick_available_port() -> u16 {
        std::net::TcpListener::bind("127.0.0.1:0")
            .and_then(|l| l.local_addr())
            .map(|a| a.port())
            .unwrap_or(18922)
    }

    /// Resolve o executável do Camoufox na máquina (compatível com Linux, Windows e macOS).
    pub fn resolve_browser_binary() -> Result<PathBuf, String> {
        // 1. Caminho prioritário específico do PC do desenvolvedor
        let dev_pc_camoufox = PathBuf::from("/home/vanir/.local/bin/camoufox");
        if dev_pc_camoufox.exists() {
            return Ok(dev_pc_camoufox);
        }

        // 2. Busca no diretório home do usuário (.local/bin ou .camoufox)
        if let Ok(home) = std::env::var("HOME").or_else(|_| std::env::var("USERPROFILE")) {
            let home_path = PathBuf::from(home);
            let candidates = [
                home_path.join(".local").join("bin").join("camoufox"),
                home_path.join(".local").join("bin").join("camoufox.exe"),
                home_path.join(".camoufox").join("camoufox"),
                home_path.join(".camoufox").join("camoufox.exe"),
            ];
            for cand in candidates {
                if cand.exists() {
                    return Ok(cand);
                }
            }
        }

        // 3. Fallback no PATH do sistema: 'which' (Linux/macOS) ou 'where' (Windows)
        #[cfg(unix)]
        let finder = "which";
        #[cfg(windows)]
        let finder = "where";

        if let Ok(output) = Command::new(finder).arg("camoufox").output() {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                if let Some(first_line) = stdout.lines().next() {
                    let trimmed = first_line.trim();
                    if !trimmed.is_empty() {
                        return Ok(PathBuf::from(trimmed));
                    }
                }
            }
        }

        Err(
            "Executável do Camoufox não foi encontrado no PATH nem nos diretórios padrão do sistema."
                .to_string(),
        )
    }

    /// Prepara a pasta isolada do perfil e injeta configurações (Proxy, Extensões, Fingerprint, WebRTC, etc.) no user.js
    pub async fn prepare_profile_dir(
        profile_dir: &Path,
        profile: &Profile,
        data_dir: &Path,
        client: &reqwest::Client,
    ) -> Result<(crate::network::NetworkSetupResult, crate::fingerprint::FingerprintSetupResult), String> {
        fs::create_dir_all(profile_dir)
            .map_err(|e| format!("Erro ao criar diretório do perfil: {e}"))?;

        // 1. Gera o arquivo user.js dentro da pasta do perfil Firefox/Camoufox
        let mut user_js = String::new();
        user_js.push_str("// Configurações geradas automaticamente pelo Fury Browser\n");
        user_js.push_str("user_pref(\"browser.shell.checkDefaultBrowser\", false);\n");
        user_js.push_str("user_pref(\"browser.warnOnQuit\", false);\n");
        user_js.push_str("user_pref(\"browser.aboutwelcome.enabled\", false);\n");

        // Restauração de Sessão e Abas anteriores (estilo Donut Browser)
        user_js.push_str("// Restauração automática de abas e sessão\n");
        user_js.push_str("user_pref(\"browser.startup.page\", 3);\n");
        user_js.push_str("user_pref(\"browser.startup.homepage\", \"about:blank\");\n");
        user_js.push_str("user_pref(\"browser.sessionstore.resume_from_crash\", true);\n");
        user_js.push_str("user_pref(\"browser.sessionstore.max_resumed_crashes\", -1);\n");
        user_js.push_str("user_pref(\"browser.sessionstore.resuming_after_os_restart\", true);\n");
        user_js.push_str("user_pref(\"browser.sessionstore.privacy_level\", 0);\n");
        user_js.push_str("user_pref(\"browser.sessionstore.privacy_level_deferred\", 0);\n");
        user_js.push_str("user_pref(\"browser.sessionstore.interval\", 1000);\n"); // Salva estado da sessão a cada 1 segundo no disco
        user_js.push_str("user_pref(\"browser.sessionstore.max_tabs_undo\", 100);\n");
        user_js.push_str("user_pref(\"browser.sessionstore.max_windows_undo\", 25);\n");
        user_js.push_str("user_pref(\"browser.sessionstore.restore_on_demand\", false);\n");
        user_js.push_str("user_pref(\"browser.sessionstore.restore_tabs_lazily\", false);\n");
        user_js.push_str("user_pref(\"browser.sessionstore.restore_hidden_tabs\", true);\n");
        user_js.push_str("user_pref(\"browser.tabs.warnOnClose\", false);\n");

        // Preserva o que o usuário digita (formulários, pesquisas, logins e histórico de digitação)
        user_js.push_str("user_pref(\"browser.formfill.enable\", true);\n");
        user_js.push_str("user_pref(\"signon.autofillForms\", true);\n");
        user_js.push_str("user_pref(\"signon.rememberSignons\", true);\n");
        user_js.push_str("user_pref(\"privacy.clearOnShutdown.formdata\", false);\n");
        user_js.push_str("user_pref(\"privacy.sanitize.sanitizeOnShutdown\", false);\n");

        user_js.push_str("user_pref(\"privacy.clearOnShutdown.cookies\", false);\n");
        user_js.push_str("user_pref(\"privacy.clearOnShutdown.sessions\", false);\n");
        user_js.push_str("user_pref(\"privacy.clearOnShutdown.history\", false);\n");
        user_js.push_str("user_pref(\"privacy.clearOnShutdown.openWindows\", false);\n");
        user_js.push_str("user_pref(\"privacy.clearOnShutdown.cache\", false);\n");
        user_js.push_str("user_pref(\"toolkit.legacyUserProfileCustomizations.stylesheets\", true);\n");

        // Preferências nativas do Firefox para auto-ativação e sideload de extensões
        user_js.push_str("// Carregamento automático de extensões no perfil Camoufox\n");
        user_js.push_str("user_pref(\"extensions.autoDisableScopes\", 0);\n");
        user_js.push_str("user_pref(\"extensions.enabledScopes\", 15);\n");
        user_js.push_str("user_pref(\"extensions.startupScanScopes\", 15);\n");
        user_js.push_str("user_pref(\"xpinstall.signatures.required\", false);\n");
        user_js.push_str("user_pref(\"extensions.experiments.enabled\", true);\n");

        // 1. Delegação de Proxy, Auto-Auth e WebRTC via módulo desacoplado network
        let net_setup = crate::network::prepare_network(&profile.proxy, profile_dir).await?;
        user_js.push_str(&net_setup.user_js_snippet);

        // 2. Importação e preparação das extensões via módulo desacoplado import_extensions_web
        let ext_paths = crate::import_extensions_web::import_profile_extensions(
            profile,
            profile_dir,
            data_dir,
            client,
        )
        .await?;

        let mut all_addon_paths = net_setup.addon_paths.clone();
        all_addon_paths.extend(ext_paths);

        // 3. Delegação de Fingerprint e Sistema Operacional com TODAS as extensões
        let proxy_ip = profile.proxy.host.as_deref().filter(|h| !h.trim().is_empty());
        let fp_setup = crate::fingerprint::prepare_fingerprint(profile, proxy_ip, &all_addon_paths);
        user_js.push_str(&fp_setup.user_js_snippet);

        let user_js_path = profile_dir.join("user.js");
        fs::write(user_js_path, user_js)
            .map_err(|e| format!("Erro ao gravar user.js do perfil: {e}"))?;

        // Garante ocultação de qualquer banner de automação/depuração no Camoufox
        let chrome_dir = profile_dir.join("chrome");
        let _ = fs::create_dir_all(&chrome_dir);
        let user_chrome_css = "#remote-control-box { display: none !important; }\n#urlbar-background { background-image: none !important; }\n";
        let _ = fs::write(chrome_dir.join("userChrome.css"), user_chrome_css);

        Ok((net_setup, fp_setup))
    }

    /// Dispara o navegador Camoufox para o perfil especificado
    pub async fn launch(&self, profile: &Profile, data_dir: &Path) -> Result<u32, String> {
        // Se já constar como em execução, checa se o processo ainda está vivo no SO
        {
            let mut map = self.running.lock().unwrap();
            if let Some(&pid) = map.get(&profile.id) {
                if Self::is_pid_alive(pid) {
                    info!("Perfil {} já está em execução no PID {}", profile.id, pid);
                    return Ok(pid);
                } else {
                    map.remove(&profile.id);
                }
            }
        }

        let binary_path = Self::resolve_browser_binary()?;
        let profile_dir = if data_dir.ends_with("profiles") {
            data_dir.join(&profile.id).join("profile")
        } else {
            data_dir.join("profiles").join(&profile.id).join("profile")
        };
        let (net_setup, fp_setup) = Self::prepare_profile_dir(&profile_dir, profile, data_dir, &self.client).await?;

        info!(
            "🚀 Disparando Camoufox para o perfil '{}' ({}) via {:?}",
            profile.name, profile.id, binary_path
        );

        let mut cmd = tokio::process::Command::new(&binary_path);
        cmd.arg("--profile").arg(&profile_dir);
        cmd.arg("--new-instance");

        // Aplica regras de rede
        net_setup.apply_to_command(&mut cmd);

        // Injeta o CAMOU_CONFIG com spoofing nativo de SO e Fingerprint no C++ do Camoufox
        let camou_config_json = fp_setup.to_camou_config_json();
        info!(
            "🎭 Injetando CAMOU_CONFIG (SO: {}, bytes: {}) para o perfil {}",
            profile.os,
            camou_config_json.len(),
            profile.id
        );
        cmd.env("CAMOU_CONFIG", camou_config_json);

        let mut child = cmd.spawn().map_err(|e| {
            format!("Falha ao executar {:?}: {}", binary_path, e)
        })?;

        let pid = child.id().unwrap_or(0);
        info!("✅ Camoufox iniciado com PID {} para o perfil {}", pid, profile.id);

        {
            let mut map = self.running.lock().unwrap();
            map.insert(profile.id.clone(), pid);
        }

        if let Some(tunnel) = net_setup.tunnel {
            let mut tunnels = self.tunnels.lock().unwrap();
            tunnels.insert(profile.id.clone(), tunnel);
        }

        // Notifica o frontend via WebSocket imediatamente
        self.ws.emit(WsEvent::ProfileStatus {
            profile_id: profile.id.clone(),
            status: "running".to_string(),
        });

        // Monitoramento nativo em tempo real: o OS notifica o momento exato em que a janela do Camoufox fechar
        let profile_id_clone = profile.id.clone();
        let running_map = self.running.clone();
        let tunnels_map = self.tunnels.clone();
        let ws_clone = self.ws.clone();
        let auto_sync_clone = self.auto_sync.clone();
        let meta_file = if data_dir.ends_with("profiles") {
            data_dir.join(&profile.id).join("metadata.json")
        } else {
            data_dir.join("profiles").join(&profile.id).join("metadata.json")
        };

        tokio::spawn(async move {
            let exit_status = child.wait().await;
            info!(
                "🛑 Processo Camoufox (PID {}) do perfil {} encerrou ({:?}).",
                pid, profile_id_clone, exit_status
            );

            {
                let mut map = running_map.lock().unwrap();
                map.remove(&profile_id_clone);
            }

            {
                let mut tunnels = tunnels_map.lock().unwrap();
                tunnels.remove(&profile_id_clone);
            }

            // Atualiza metadata.json no disco com status ready e timestamp atualizado
            if let Ok(content) = fs::read_to_string(&meta_file) {
                if let Ok(mut prof) = serde_json::from_str::<Profile>(&content) {
                    let now = std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_secs() as i64;
                    prof.status = "ready".to_string();
                    prof.updated_at = now;
                    let _ = fs::write(&meta_file, serde_json::to_string_pretty(&prof).unwrap_or_default());
                }
            }

            // Emite o evento instantaneamente para o frontend via WebSocket!
            info!("📢 Notificando frontend via WebSocket: perfil {} agora é 'ready'", profile_id_clone);
            ws_clone.emit(WsEvent::ProfileStatus {
                profile_id: profile_id_clone.clone(),
                status: "ready".to_string(),
            });

            // Trigger 2: Fechamento de Navegador. Aguarda 3 segundos para flushing completo de cookies e sessão antes do upload
            if let Some(engine) = auto_sync_clone.lock().unwrap().as_ref() {
                engine.schedule_browser_closed(profile_id_clone);
            }
        });

        Ok(pid)
    }

    /// Encerra a execução do navegador para o perfil informado
    pub fn stop(&self, profile_id: &str) -> Result<(), String> {
        let mut map = self.running.lock().unwrap();
        if let Some(pid) = map.remove(profile_id) {
            if Self::is_pid_alive(pid) {
                info!("🛑 Encerrando processo PID {} para perfil {}", pid, profile_id);
                #[cfg(unix)]
                {
                    let _ = Command::new("kill").arg(pid.to_string()).status();
                }
                #[cfg(windows)]
                {
                    let _ = Command::new("taskkill")
                        .arg("/PID")
                        .arg(pid.to_string())
                        .status();
                }

                // Aguarda o processo salvar e descarregar no disco (cookies e sessionstore)
                for _ in 0..30 {
                    if !Self::is_pid_alive(pid) {
                        break;
                    }
                    std::thread::sleep(std::time::Duration::from_millis(100));
                }
            }
        }

        {
            let mut tunnels = self.tunnels.lock().unwrap();
            tunnels.remove(profile_id);
        }

        // Emite status "ready" via WebSocket
        self.ws.emit(WsEvent::ProfileStatus {
            profile_id: profile_id.to_string(),
            status: "ready".to_string(),
        });

        Ok(())
    }

    /// Verifica se o perfil está com processo ativo no SO
    pub fn is_running(&self, profile_id: &str) -> bool {
        let mut map = self.running.lock().unwrap();
        if let Some(&pid) = map.get(profile_id) {
            if Self::is_pid_alive(pid) {
                return true;
            } else {
                map.remove(profile_id);
            }
        }
        false
    }

    fn is_pid_alive(pid: u32) -> bool {
        #[cfg(target_os = "linux")]
        {
            if let Ok(status) = std::fs::read_to_string(format!("/proc/{}/status", pid)) {
                for line in status.lines() {
                    if line.starts_with("State:") {
                        let is_dead = line.contains('Z') || line.contains('X');
                        return !is_dead;
                    }
                }
                return true;
            }
            false
        }
        #[cfg(all(unix, not(target_os = "linux")))]
        {
            match Command::new("kill").arg("-0").arg(pid.to_string()).output() {
                Ok(output) => output.status.success(),
                Err(_) => false,
            }
        }
        #[cfg(windows)]
        {
            match Command::new("tasklist")
                .arg("/FI")
                .arg(format!("PID eq {}", pid))
                .output()
            {
                Ok(output) => {
                    let text = String::from_utf8_lossy(&output.stdout);
                    text.contains(&pid.to_string())
                }
                Err(_) => false,
            }
        }
    }
}
