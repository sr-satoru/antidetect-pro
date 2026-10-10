pub mod lifecycle;
pub mod quota;
pub mod repository;
pub mod tag_binder;

use crate::launcher::ProcessManager;
use crate::models::{CreateProfileDto, Profile, ProfileProxyConfig, UpdateProfileDto};
use crate::service_database::Vault;
use crate::ws::WsState;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

fn now_secs() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

/// Serviço de perfis com persistência direta na tabela `profiles` do Star Vault
pub struct ProfileService {
    vault: Arc<Vault>,
    data_dir: PathBuf,
    process_manager: Arc<ProcessManager>,
    auto_sync: Arc<Mutex<Option<Arc<crate::server_sync::AutoSyncEngine>>>>,
    ws: WsState,
}

pub type ProfileStorage = ProfileService;

impl ProfileService {
    pub fn new<P: AsRef<Path>>(data_dir: P, ws: WsState, vault: Arc<Vault>) -> Self {
        let dir = data_dir.as_ref().join("profiles");
        let _ = fs::create_dir_all(&dir);
        let pm = Arc::new(ProcessManager::new(ws.clone()));
        pm.set_vault(vault.clone());
        Self {
            vault,
            data_dir: dir,
            process_manager: pm,
            auto_sync: Arc::new(Mutex::new(None)),
            ws,
        }
    }

    pub fn set_auto_sync(&self, auto_sync: Arc<crate::server_sync::AutoSyncEngine>) {
        let mut lock = self.auto_sync.lock().unwrap();
        *lock = Some(auto_sync.clone());
        self.process_manager.set_auto_sync(auto_sync.clone());

        let pm = self.process_manager.clone();
        auto_sync.set_running_checker(Arc::new(move |pid: &str| pm.is_running(pid)));
    }

    fn trigger_auto_sync(&self, profile_id: &str) {
        if let Some(engine) = self.auto_sync.lock().unwrap().as_ref() {
            engine.schedule_profile_change(profile_id.to_string());
        }
    }

    fn trigger_delete_cloud(&self, profile_id: &str) {
        if let Some(engine) = self.auto_sync.lock().unwrap().as_ref() {
            engine.schedule_profile_deletion(profile_id.to_string());
        }
    }

    fn trigger_trash_empty_cloud(&self, profile_ids: Vec<String>) {
        if let Some(engine) = self.auto_sync.lock().unwrap().as_ref() {
            engine.schedule_trash_empty(profile_ids);
        }
    }

    pub fn list(&self, search: Option<&str>, group: Option<&str>) -> Vec<Profile> {
        repository::list(&self.vault, &self.process_manager, &self.data_dir, search, group)
    }

    pub fn list_trash(&self) -> Vec<Profile> {
        repository::list_trash(&self.vault, &self.process_manager, &self.data_dir)
    }

    pub fn get(&self, id: &str) -> Option<Profile> {
        repository::get(&self.vault, &self.process_manager, &self.data_dir, id)
    }

    pub fn get_public(
        &self,
        id: Option<&str>,
        name: Option<&str>,
        tag: Option<&str>,
    ) -> Vec<crate::models::PublicProfileDto> {
        repository::get_public(&self.vault, id, name, tag)
    }

    pub fn create(&self, dto: CreateProfileDto) -> Result<Profile, String> {
        let id = dto
            .id
            .filter(|s| !s.trim().is_empty())
            .unwrap_or_else(|| crate::id_generator::generate_profile_id());

        let now = now_secs();

        let conn = self.vault.conn();
        let conn_guard = conn.lock().map_err(|e| e.to_string())?;
        let tags = tag_binder::resolve_tags(
            &conn_guard,
            dto.tags.as_deref(),
            dto.tag_ids.as_deref(),
        );
        drop(conn_guard);

        let proxy = ProfileProxyConfig {
            mode: "custom".to_string(),
            proxy_type: dto.proxy_type.unwrap_or_else(|| "none".to_string()),
            host: dto.proxy_host,
            port: dto.proxy_port,
            username: dto.proxy_username,
            password: dto.proxy_password,
            rotation_url: None,
            ip_checker: Some("IP2Location".to_string()),
            socks_remote_dns: true,
        };

        let extension_mode = dto.extension_mode.clone();
        let extension_category = dto.extension_category.clone();
        let extensions = dto.extensions.clone().or_else(|| {
            if let Some(ref fp) = dto.fingerprint_json {
                if let Some(arr) = fp.get("extensions") {
                    return Some(arr.clone());
                }
            }
            None
        });

        let profile = Profile {
            id: id.clone(),
            name: dto.name.unwrap_or_else(|| format!("Perfil #{id}")),
            group: dto.group.unwrap_or_else(|| "Desagrupado".to_string()),
            tags,
            notes: dto.notes.unwrap_or_default(),
            status: dto.status.unwrap_or_else(|| "ready".to_string()),
            kernel: dto.kernel.unwrap_or_else(|| "AstroFox".to_string()),
            browser_version: dto.browser_version.unwrap_or_else(|| "150".to_string()),
            os: dto.os.unwrap_or_else(|| "windows".to_string()),
            created_at: now,
            updated_at: now,
            last_launch: None,
            is_deleted: false,
            deleted_at: None,
            proxy,
            fingerprint_json: dto.fingerprint_json.unwrap_or_else(|| serde_json::json!({})),
            extension_mode,
            extension_category,
            extensions,
        };

        repository::save_to_db(&self.vault, &profile)?;

        // Se houver cookies no formulário/fingerprint_json, inicializa a sessão criptografada no Star Vault
        if let Some(raw_cookies) = profile.fingerprint_json.get("cookies").and_then(|v| {
            if let Some(s) = v.as_str() {
                Some(s.to_string())
            } else if v.is_array() || v.is_object() {
                Some(v.to_string())
            } else {
                None
            }
        }) {
            if !raw_cookies.trim().is_empty() {
                if let Ok(parsed) = crate::extraction_session::fire_fox::parse_cookies_input(&raw_cookies) {
                    if !parsed.is_empty() {
                        let session_svc = crate::service_database::sessions::SessionService::new(self.vault.clone());
                        let count = parsed.len();
                        let initial_session = crate::extraction_session::UnifiedSession {
                            cookies: parsed,
                            local_storage: std::collections::HashMap::new(),
                            total_cookies: count,
                            total_storage_items: 0,
                        };
                        let _ = session_svc.save_session(&id, &initial_session);
                    }
                }
            }
        }

        self.trigger_auto_sync(&id);

        Ok(profile)
    }

    pub fn update(&self, id: &str, dto: UpdateProfileDto) -> Result<Profile, String> {
        let mut profile = self.get(id).ok_or_else(|| "Perfil não encontrado".to_string())?;

        if let Some(name) = dto.name {
            if !name.trim().is_empty() {
                profile.name = name.trim().to_string();
            }
        }
        if let Some(group) = dto.group {
            profile.group = group;
        }
        if let Some(notes) = dto.notes {
            profile.notes = notes;
        }
        if let Some(status) = dto.status {
            if status == "ready" {
                let _ = self.process_manager.stop(id);
            }
            profile.status = status;
        }

        if dto.tags.is_some() || dto.tag_ids.is_some() {
            let conn = self.vault.conn();
            if let Ok(conn_guard) = conn.lock() {
                profile.tags = tag_binder::resolve_tags(
                    &conn_guard,
                    dto.tags.as_deref(),
                    dto.tag_ids.as_deref(),
                );
            }
        }

        if let Some(os) = dto.os {
            profile.os = os;
        }
        // O motor do navegador (kernel) é estritamente imutável após a criação
        // para garantir a integridade dos cookies, pastas de sessão e proteção contra antifraude.
        if let Some(ref kernel) = dto.kernel {
            if !kernel.is_empty() && kernel != &profile.kernel {
                tracing::warn!(
                    "⚠️ [Segurança Antidetect] Tentativa de alterar o motor do perfil '{}' ({}) de '{}' para '{}' foi ignorada. O motor é imutável após a criação.",
                    profile.name,
                    id,
                    profile.kernel,
                    kernel
                );
            }
        }
        if let Some(bv) = dto.browser_version {
            profile.browser_version = bv;
        }

        if let Some(proxy_type) = dto.proxy_type {
            profile.proxy.proxy_type = proxy_type;
        }
        if let Some(proxy_host) = dto.proxy_host {
            profile.proxy.host = Some(proxy_host);
        }
        if let Some(port) = dto.proxy_port {
            profile.proxy.port = Some(port);
        }
        if let Some(proxy_user) = dto.proxy_username {
            profile.proxy.username = Some(proxy_user);
        }
        if let Some(proxy_pass) = dto.proxy_password {
            profile.proxy.password = Some(proxy_pass);
        }

        if let Some(fp) = dto.fingerprint_json {
            profile.fingerprint_json = fp;

            // Se houver cookies no fingerprint_json atualizado, sincroniza com o Star Vault
            if let Some(raw_cookies) = profile.fingerprint_json.get("cookies").and_then(|v| {
                if let Some(s) = v.as_str() {
                    Some(s.to_string())
                } else if v.is_array() || v.is_object() {
                    Some(v.to_string())
                } else {
                    None
                }
            }) {
                if !raw_cookies.trim().is_empty() {
                    if let Ok(parsed) = crate::extraction_session::fire_fox::parse_cookies_input(&raw_cookies) {
                        if !parsed.is_empty() {
                            let session_svc = crate::service_database::sessions::SessionService::new(self.vault.clone());
                            let count = parsed.len();
                            let current = session_svc.load_session(id).unwrap_or(None).unwrap_or_default();
                            let updated_session = crate::extraction_session::UnifiedSession {
                                cookies: parsed,
                                local_storage: current.local_storage,
                                total_cookies: count,
                                total_storage_items: current.total_storage_items,
                            };
                            let _ = session_svc.save_session(id, &updated_session);
                        }
                    }
                }
            }
        }

        if let Some(mode) = dto.extension_mode {
            profile.extension_mode = Some(mode);
        }
        if let Some(cat) = dto.extension_category {
            profile.extension_category = Some(cat);
        }
        if let Some(exts) = dto.extensions {
            profile.extensions = Some(exts);
        }

        profile.updated_at = now_secs();

        repository::save_to_db(&self.vault, &profile)?;
        self.trigger_auto_sync(id);

        Ok(profile)
    }

    pub fn clone_profile(&self, id: &str) -> Result<Profile, String> {
        let original = self.get(id).ok_or_else(|| "Perfil original não encontrado".to_string())?;

        let new_id = crate::id_generator::generate_profile_id();
        let now = now_secs();

        let mut cloned = original.clone();
        cloned.id = new_id.clone();
        cloned.name = format!("{} (Cópia)", original.name);
        cloned.status = "ready".to_string();
        cloned.created_at = now;
        cloned.updated_at = now;
        cloned.last_launch = None;
        cloned.is_deleted = false;
        cloned.deleted_at = None;

        let new_profile_dir = self.data_dir.join(&new_id);
        fs::create_dir_all(&new_profile_dir).map_err(|e| format!("Erro ao criar pasta do clone: {e}"))?;

        let orig_browser_dir = self.data_dir.join(id).join("profile");
        let new_browser_dir = new_profile_dir.join("profile");
        if orig_browser_dir.exists() {
            let _ = fs::create_dir_all(&new_browser_dir);
            let orig_user_js = orig_browser_dir.join("user.js");
            if orig_user_js.exists() {
                let _ = fs::copy(&orig_user_js, new_browser_dir.join("user.js"));
            }
        }

        repository::save_to_db(&self.vault, &cloned)?;
        tracing::info!("📋 Perfil '{}' ({}) clonado com sucesso para novo ID {}", original.name, id, new_id);

        self.trigger_auto_sync(&new_id);

        Ok(cloned)
    }

    pub fn soft_delete(&self, id: &str) -> Result<(), String> {
        repository::soft_delete(&self.vault, &self.process_manager, id)?;
        self.trigger_auto_sync(id);
        Ok(())
    }

    pub fn restore(&self, id: &str) -> Result<Profile, String> {
        repository::restore(&self.vault, id)?;
        let profile = self.get(id).ok_or_else(|| "Perfil não encontrado".to_string())?;
        self.trigger_auto_sync(id);
        Ok(profile)
    }

    pub fn permanent_delete(&self, id: &str) -> Result<(), String> {
        let res = repository::permanent_delete(&self.vault, &self.process_manager, &self.data_dir, id);
        if res.is_ok() {
            self.trigger_delete_cloud(id);
        }
        res
    }

    pub fn empty_trash(&self) -> Result<usize, String> {
        let trashed = self.list_trash();
        let count = trashed.len();
        let mut deleted_ids = Vec::with_capacity(count);
        for p in &trashed {
            if repository::permanent_delete(&self.vault, &self.process_manager, &self.data_dir, &p.id).is_ok() {
                deleted_ids.push(p.id.clone());
            }
        }
        if !deleted_ids.is_empty() {
            self.trigger_trash_empty_cloud(deleted_ids);
        }
        Ok(count)
    }

    pub async fn launch(&self, id: &str) -> Result<(Profile, u32), String> {
        let (prof, pid, _, _) = self.launch_with_cdp(id, false).await?;
        Ok((prof, pid))
    }

    pub async fn launch_with_cdp(
        &self,
        id: &str,
        cdp: bool,
    ) -> Result<(Profile, u32, Option<u16>, Option<String>), String> {
        self.launch_with_options(id, cdp, None).await
    }

    pub async fn launch_with_options(
        &self,
        id: &str,
        cdp: bool,
        initial_url: Option<&str>,
    ) -> Result<(Profile, u32, Option<u16>, Option<String>), String> {
        let mut profile = self.get(id).ok_or_else(|| "Perfil não encontrado".to_string())?;
        let profile_dir = self.get_profile_dir(id);

        let (pid, debug_port, ws_endpoint) = lifecycle::launch_with_options(
            &self.vault,
            &self.process_manager,
            &self.data_dir,
            &profile_dir,
            &mut profile,
            cdp,
            initial_url,
        )
        .await?;

        repository::save_to_db(&self.vault, &profile)?;
        Ok((profile, pid, debug_port, ws_endpoint))
    }

    pub fn stop(&self, id: &str) -> Result<Profile, String> {
        let mut profile = self.get(id).ok_or_else(|| "Perfil não encontrado".to_string())?;
        let profile_dir = self.get_profile_dir(id);

        lifecycle::stop(&self.vault, &self.process_manager, &profile_dir, &mut profile)?;
        repository::save_to_db(&self.vault, &profile)?;
        Ok(profile)
    }

    pub fn vault(&self) -> &Arc<Vault> {
        &self.vault
    }

    pub fn get_mcp_token(&self) -> String {
        let api_keys = crate::service_database::ApiKeyService::new(self.vault.clone());
        api_keys.get_or_create_token().unwrap_or_else(|_| crate::service_database::api_keys::ApiKeyService::generate_token())
    }

    pub fn rotate_mcp_token(&self) -> Result<String, String> {
        let api_keys = crate::service_database::ApiKeyService::new(self.vault.clone());
        api_keys.rotate_token()
    }

    pub fn verify_mcp_token(&self, candidate: &str) -> bool {
        let api_keys = crate::service_database::ApiKeyService::new(self.vault.clone());
        api_keys.verify_token(candidate)
    }

    pub fn get_process_manager(&self) -> Arc<ProcessManager> {
        self.process_manager.clone()
    }

    pub fn is_running(&self, profile_id: &str) -> bool {
        self.process_manager.is_running(profile_id)
    }

    pub fn get_profile_updated_at(&self, profile_id: &str) -> Option<i64> {
        self.get(profile_id).map(|p| p.updated_at)
    }

    pub fn ws(&self) -> &WsState {
        &self.ws
    }

    pub fn check_profile_limit(&self) -> Result<(), String> {
        let active_count = self.list(None, None).len();
        quota::check_profile_limit(&self.vault, active_count, &self.ws)
    }

    pub fn get_profile_dir(&self, id: &str) -> PathBuf {
        self.data_dir.join(id).join("profile")
    }

    /// Retorna as opções prontas e formatadas para a biblioteca própria do Camoufox (Playwright)
    pub fn get_playwright_options(&self, id: &str) -> Result<serde_json::Value, String> {
        let profile = self.get(id).ok_or_else(|| "Perfil não encontrado".to_string())?;
        let profile_dir = self.get_profile_dir(id);
        let root_dir = self.data_dir.parent().unwrap_or(&self.data_dir);
        let is_chromium = matches!(
            crate::browser::engines::normalize_kernel(&profile.kernel),
            crate::browser::engines::KernelKind::Chromium
        );
        let binary_path = if is_chromium {
            crate::browser_downloader::resolve_clearcote_binary(root_dir)
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_default()
        } else {
            crate::browser_downloader::resolve_engine_binary(root_dir)
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_default()
        };
        let is_running = self.is_running(id);
        let debug_port = self.process_manager.get_debug_port(id);
        let ws_endpoint = debug_port.map(|port| {
            if is_chromium {
                format!("http://127.0.0.1:{}", port)
            } else {
                format!("ws://127.0.0.1:{}/session", port)
            }
        });

        let proxy_val = if profile.proxy.proxy_type != "none" {
            if let Some(host) = &profile.proxy.host {
                let port = profile.proxy.port.unwrap_or(8080);
                let server = format!("{}://{}:{}", profile.proxy.proxy_type, host, port);
                Some(serde_json::json!({
                    "server": server,
                    "username": profile.proxy.username,
                    "password": profile.proxy.password,
                }))
            } else {
                None
            }
        } else {
            None
        };

        let fp = crate::fingerprint::translator::extract_fingerprint_map(&profile.fingerprint_json);
        let custom_lang = fp
            .get("custom_language")
            .and_then(|v| v.as_str())
            .unwrap_or("pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7");
        let primary_lang = custom_lang
            .split(',')
            .next()
            .map(|s| s.split(';').next().unwrap_or("pt-BR").trim())
            .unwrap_or("pt-BR");

        if is_chromium {
            let proxy_url = if profile.proxy.proxy_type != "none" {
                profile.proxy.host.as_ref().map(|host| {
                    let port = profile.proxy.port.unwrap_or(8080);
                    format!("{}://{}:{}", profile.proxy.proxy_type, host, port)
                })
            } else {
                None
            };
            let clearcote_flags = crate::browser::engines::clearcote::flags::build_clearcote_flags(
                &profile_dir,
                &profile,
                None,
                proxy_url.as_deref(),
                &[],
                None,
            );

            Ok(serde_json::json!({
                "profile_id": profile.id,
                "name": profile.name,
                "kernel": profile.kernel,
                "os": profile.os,
                "locale": primary_lang,
                "executable_path": binary_path,
                "user_data_dir": profile_dir.to_string_lossy().to_string(),
                "proxy": proxy_val,
                "args": clearcote_flags,
                "headless": false,
                "humanize": true,
                "is_running": is_running,
                "debug_port": debug_port,
                "ws_endpoint": ws_endpoint,
            }))
        } else {
            let net_setup = crate::network::NetworkSetupResult::default();
            let mut config_map = crate::browser::engines::camoufox::common::build_camou_config_map(&profile, None, &[]);
            let prefs_map = crate::browser::engines::camoufox::common::build_camou_prefs(&profile, None, &net_setup);

            // 1. Sanitizar webGl:renderer para AstroFox/Camoufox no Linux
            if let Some(renderer_val) = config_map.get_mut("webGl:renderer") {
                if let Some(renderer_str) = renderer_val.as_str() {
                    if (profile.os == "linux" || profile.os == "lin")
                        && !renderer_str.ends_with(", or similar")
                        && renderer_str != "Generic Renderer"
                        && renderer_str != "Mozilla"
                    {
                        *renderer_val = serde_json::Value::String(format!("{}, or similar", renderer_str));
                    }
                }
            }

            // 2. Remover chaves que não são propriedades do MaskConfig
            config_map.remove("navigator.languages");

            Ok(serde_json::json!({
                "profile_id": profile.id,
                "name": profile.name,
                "kernel": profile.kernel,
                "os": profile.os,
                "locale": primary_lang,
                "executable_path": binary_path,
                "user_data_dir": profile_dir.to_string_lossy().to_string(),
                "proxy": proxy_val,
                "args": Vec::<String>::new(),
                "config": config_map,
                "firefox_user_prefs": prefs_map,
                "headless": false,
                "humanize": true,
                "i_know_what_im_doing": true,
                "is_running": is_running,
                "debug_port": debug_port,
                "ws_endpoint": ws_endpoint,
            }))
        }
    }
}
