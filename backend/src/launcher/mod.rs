use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use tracing::info;

use crate::models::Profile;
use crate::ws::{WsEvent, WsState};

pub mod sys;

/// Gerenciador de processos do navegador Camoufox.
pub struct ProcessManager {
    running: Arc<Mutex<HashMap<String, u32>>>,
    profile_dirs: Arc<Mutex<HashMap<String, PathBuf>>>,
    ports: Arc<Mutex<HashMap<String, u16>>>,
    relays: Arc<Mutex<HashMap<String, crate::network::relay::ProxyRelay>>>,
    client: reqwest::Client,
    ws: WsState,
    auto_sync: Arc<Mutex<Option<Arc<crate::cloud_sync::AutoSyncEngine>>>>,
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

    /// Resolve o executável do motor Star Multlogin baixado e gerenciado pelo aplicativo.
    /// A única forma permitida de iniciar é pelo binário oficial baixado automaticamente.
    pub fn resolve_browser_binary(data_dir: &Path) -> Result<PathBuf, String> {
        let base_data_dir = if data_dir.ends_with("profiles") {
            data_dir.parent().unwrap_or(data_dir)
        } else {
            data_dir
        };

        crate::browser_downloader::resolve_engine_binary(base_data_dir)
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
        user_js.push_str("// Configurações geradas automaticamente pelo Star Multlogin\n");
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

        // 1. Delegação de Proxy Universal Relay e WebRTC via módulo desacoplado network
        let net_setup = crate::network::prepare_network(&profile.proxy, &profile.fingerprint_json).await?;
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

        // 3. Delegação de Fingerprint e Sistema Operacional com IPv4 estrito para WebRTC
        let proxy_ip: Option<String> = if profile.proxy.proxy_type != "none" {
            if let Some(host) = profile.proxy.host.as_deref().filter(|h| !h.trim().is_empty()) {
                if host.parse::<std::net::Ipv4Addr>().is_ok() {
                    Some(host.to_string())
                } else {
                    let port = profile.proxy.port.unwrap_or(8080);
                    tokio::net::lookup_host(format!("{}:{}", host, port))
                        .await
                        .ok()
                        .and_then(|mut iter| iter.find_map(|addr| {
                            if let std::net::SocketAddr::V4(v4) = addr {
                                Some(v4.ip().to_string())
                            } else {
                                None
                            }
                        }))
                }
            } else {
                None
            }
        } else {
            None
        };

        let fp_setup = crate::fingerprint::prepare_fingerprint(profile, proxy_ip.as_deref(), &all_addon_paths);
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
        // Se já constar como em execução, checa se o processo ou lock ainda está ativo no SO
        {
            let mut map = self.running.lock().unwrap();
            if let Some(&pid) = map.get(&profile.id) {
                if sys::is_pid_alive(pid) {
                    info!("Perfil {} já está em execução no PID {}", profile.id, pid);
                    return Ok(pid);
                } else {
                    map.remove(&profile.id);
                }
            }
        }

        let binary_path = Self::resolve_browser_binary(data_dir)?;
        let profile_dir = if data_dir.ends_with("profiles") {
            data_dir.join(&profile.id).join("profile")
        } else {
            data_dir.join("profiles").join(&profile.id).join("profile")
        };

        // Executa migrações pendentes através do módulo especializado em migrations (com notificações apenas se necessário)
        let _ = crate::migrations::MigrationNotifier::new(Some(&self.ws))
            .migrate_profile_with_notification(&profile_dir, None);

        let (net_setup, fp_setup) = Self::prepare_profile_dir(&profile_dir, profile, data_dir, &self.client).await?;

        info!(
            "🚀 Disparando Camoufox para o perfil '{}' ({}) via {:?}",
            profile.name, profile.id, binary_path
        );

        let mut cmd = tokio::process::Command::new(&binary_path);
        
        // Aplica sintaxe de comando compatível por SO (-profile no Windows, --profile no Linux)
        sys::configure_browser_command(&mut cmd, &profile_dir);

        // Aplica regras de rede
        net_setup.apply_to_command(&mut cmd);

        // Suporte a launch_hook personalizado vindo das impressões digitais do frontend
        let fp_map = crate::fingerprint::translator::extract_fingerprint_map(&profile.fingerprint_json);
        if let Some(hook) = fp_map.get("launch_hook").and_then(|v| v.as_str()) {
            for arg in hook.split_whitespace() {
                if !arg.is_empty() {
                    cmd.arg(arg);
                }
            }
        }

        // FONTCONFIG_PATH injection se rodando em Linux
        #[cfg(target_os = "linux")]
        {
            if let Some(engine_dir) = binary_path.parent() {
                let fc_candidate = engine_dir.join("fontconfig").join("bundle");
                let alt_fc = engine_dir.join("fontconfig");
                if fc_candidate.exists() {
                    cmd.env("FONTCONFIG_PATH", fc_candidate);
                } else if alt_fc.exists() {
                    cmd.env("FONTCONFIG_PATH", alt_fc);
                }
            }
        }

        // Injeta o CAMOU_CONFIG com spoofing nativo de SO e Fingerprint no C++ do Camoufox
        // Suporta chunking CAMOU_CONFIG_n para mitigar estouro de variáveis de ambiente no Windows
        let camou_config_json = fp_setup.to_camou_config_json();
        info!(
            "🎭 Injetando CAMOU_CONFIG (SO: {}, bytes: {}) para o perfil {}",
            profile.os,
            camou_config_json.len(),
            profile.id
        );
        if camou_config_json.len() > 2000 {
            let mut chunk_idx = 1;
            let mut start = 0;
            let bytes = camou_config_json.as_bytes();
            while start < bytes.len() {
                let end = std::cmp::min(start + 2000, bytes.len());
                let chunk = &camou_config_json[start..end];
                cmd.env(format!("CAMOU_CONFIG_{chunk_idx}"), chunk);
                chunk_idx += 1;
                start = end;
            }
        }
        cmd.env("CAMOU_CONFIG", &camou_config_json);

        let mut child = cmd.spawn().map_err(|e| {
            format!("Falha ao executar {:?}: {}", binary_path, e)
        })?;

        let pid = child.id().unwrap_or(0);
        info!("✅ Camoufox iniciado com PID {} para o perfil {}", pid, profile.id);

        {
            let mut map = self.running.lock().unwrap();
            map.insert(profile.id.clone(), pid);

            let mut dirs = self.profile_dirs.lock().unwrap();
            dirs.insert(profile.id.clone(), profile_dir.clone());
        }

        if let Some(relay) = net_setup.relay {
            let mut relays = self.relays.lock().unwrap();
            relays.insert(profile.id.clone(), relay);
        }

        // Notifica o frontend via WebSocket imediatamente
        self.ws.emit(WsEvent::ProfileStatus {
            profile_id: profile.id.clone(),
            status: "running".to_string(),
        });

        // Monitoramento Híbrido em tempo real:
        // Acompanha a saída do processo inicial e valida se a trava do perfil no disco continua ativa
        let profile_id_clone = profile.id.clone();
        let running_map = self.running.clone();
        let profile_dirs_map = self.profile_dirs.clone();
        let relays_map = self.relays.clone();
        let ws_clone = self.ws.clone();
        let auto_sync_clone = self.auto_sync.clone();
        let profile_dir_clone = profile_dir.clone();
        let meta_file = if data_dir.ends_with("profiles") {
            data_dir.join(&profile.id).join("metadata.json")
        } else {
            data_dir.join("profiles").join(&profile.id).join("metadata.json")
        };

        tokio::spawn(async move {
            let exit_status = child.wait().await;
            info!(
                "🛑 Processo inicial Camoufox (PID {}) do perfil {} concluiu ({:?}).",
                pid, profile_id_clone, exit_status
            );

            // Verificação Híbrida: No Windows ou caso subprocessos continuem rodando,
            // aguarda até que o lock do arquivo do perfil (parent.lock / .parentlock) seja liberado
            while sys::is_profile_locked(&profile_dir_clone) {
                tokio::time::sleep(std::time::Duration::from_millis(800)).await;
            }

            info!(
                "🏁 Janela do perfil {} totalmente fechada pelo usuário.",
                profile_id_clone
            );

            {
                let mut map = running_map.lock().unwrap();
                map.remove(&profile_id_clone);
            }

            {
                let mut dirs = profile_dirs_map.lock().unwrap();
                dirs.remove(&profile_id_clone);
            }

            {
                let mut relays = relays_map.lock().unwrap();
                if let Some(mut relay) = relays.remove(&profile_id_clone) {
                    relay.stop();
                }
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
            if sys::is_pid_alive(pid) {
                info!("🛑 Encerrando processo PID {} para perfil {}", pid, profile_id);
                let _ = sys::terminate_process_tree(pid);

                // Aguarda o processo salvar e descarregar no disco (cookies e sessionstore)
                for _ in 0..30 {
                    if !sys::is_pid_alive(pid) {
                        break;
                    }
                    std::thread::sleep(std::time::Duration::from_millis(100));
                }
            }
        }

        {
            let mut dirs = self.profile_dirs.lock().unwrap();
            dirs.remove(profile_id);
        }

        {
            let mut relays = self.relays.lock().unwrap();
            if let Some(mut relay) = relays.remove(profile_id) {
                relay.stop();
            }
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
        self.is_running_with_dir(profile_id, None)
    }

    /// Verifica se o perfil está ativo conferindo tanto o PID quanto o arquivo de trava no diretório
    pub fn is_running_with_dir(&self, profile_id: &str, candidate_profile_dir: Option<&Path>) -> bool {
        let mut map = self.running.lock().unwrap();
        if let Some(&pid) = map.get(profile_id) {
            if sys::is_pid_alive(pid) {
                return true;
            }

            // Se o PID inicial não responde mais, verifica se o perfil ainda tem trava ativa
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

            map.remove(profile_id);
        } else {
            // Se não está no mapa de PIDs, verifica se temos diretório registrado com trava
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
        }
        false
    }
}
