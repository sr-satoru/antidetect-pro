use crate::launcher::ProcessManager;
use crate::models::{CreateProfileDto, Profile, ProfileProxyConfig, UpdateProfileDto};
use crate::ws::WsState;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

pub struct ProfileStorage {
    data_dir: PathBuf,
    process_manager: Arc<ProcessManager>,
    auto_sync: Arc<Mutex<Option<Arc<crate::cloud_sync::AutoSyncEngine>>>>,
}

impl ProfileStorage {
    pub fn new<P: AsRef<Path>>(data_dir: P, ws: WsState) -> Self {
        let dir = data_dir.as_ref().join("profiles");
        let _ = fs::create_dir_all(&dir);
        Self {
            data_dir: dir,
            process_manager: Arc::new(ProcessManager::new(ws)),
            auto_sync: Arc::new(Mutex::new(None)),
        }
    }

    pub fn set_auto_sync(&self, auto_sync: Arc<crate::cloud_sync::AutoSyncEngine>) {
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

    fn now_secs() -> i64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as i64
    }

    fn get_profile_path(&self, id: &str) -> PathBuf {
        self.data_dir.join(id).join("metadata.json")
    }

    pub fn list(&self, search: Option<&str>, group: Option<&str>) -> Vec<Profile> {
        let mut profiles = Vec::new();
        if let Ok(entries) = fs::read_dir(&self.data_dir) {
            for entry in entries.flatten() {
                if let Ok(file_type) = entry.file_type() {
                    if file_type.is_dir() {
                        let meta_path = entry.path().join("metadata.json");
                        if let Ok(content) = fs::read_to_string(meta_path) {
                            if let Ok(mut profile) = serde_json::from_str::<Profile>(&content) {
                                if !profile.is_deleted {
                                    // Sincroniza em tempo real o status com o processo e trava no SO
                                    let profile_dir = entry.path().join("profile");
                                    let is_alive = self.process_manager.is_running_with_dir(&profile.id, Some(&profile_dir));
                                    if is_alive && profile.status != "running" {
                                        profile.status = "running".to_string();
                                    } else if !is_alive && profile.status == "running" {
                                        profile.status = "ready".to_string();
                                    }
                                    profiles.push(profile);
                                }
                            }
                        }
                    }
                }
            }
        }

        // Ordena pelos mais recentes
        profiles.sort_by(|a, b| b.created_at.cmp(&a.created_at));

        // Aplica filtros de busca e grupo
        profiles
            .into_iter()
            .filter(|p| {
                if let Some(grp) = group {
                    if grp != "Todos os grupos" && p.group != grp {
                        return false;
                    }
                }
                if let Some(s) = search {
                    let term = s.to_lowercase();
                    let matches_name = p.name.to_lowercase().contains(&term);
                    let matches_notes = p.notes.to_lowercase().contains(&term);
                    let matches_proxy = p
                        .proxy
                        .host
                        .as_deref()
                        .map(|h| h.to_lowercase().contains(&term))
                        .unwrap_or(false);
                    let matches_tags = p.tags.iter().any(|t| t.to_lowercase().contains(&term));
                    return matches_name || matches_notes || matches_proxy || matches_tags;
                }
                true
            })
            .collect()
    }

    pub fn list_trash(&self) -> Vec<Profile> {
        let mut profiles = Vec::new();
        if let Ok(entries) = fs::read_dir(&self.data_dir) {
            for entry in entries.flatten() {
                if let Ok(file_type) = entry.file_type() {
                    if file_type.is_dir() {
                        let meta_path = entry.path().join("metadata.json");
                        if let Ok(content) = fs::read_to_string(meta_path) {
                            if let Ok(profile) = serde_json::from_str::<Profile>(&content) {
                                if profile.is_deleted {
                                    profiles.push(profile);
                                }
                            }
                        }
                    }
                }
            }
        }
        profiles.sort_by(|a, b| b.deleted_at.unwrap_or(0).cmp(&a.deleted_at.unwrap_or(0)));
        profiles
    }

    pub fn get(&self, id: &str) -> Option<Profile> {
        let path = self.get_profile_path(id);
        if let Ok(content) = fs::read_to_string(path) {
            if let Ok(mut profile) = serde_json::from_str::<Profile>(&content) {
                let profile_dir = self.data_dir.join(id).join("profile");
                let is_alive = self.process_manager.is_running_with_dir(&profile.id, Some(&profile_dir));
                if is_alive && profile.status != "running" {
                    profile.status = "running".to_string();
                } else if !is_alive && profile.status == "running" {
                    profile.status = "ready".to_string();
                }
                return Some(profile);
            }
        }
        None
    }

    pub fn create(&self, dto: CreateProfileDto) -> Result<Profile, String> {
        let id = dto
            .id
            .filter(|s| !s.trim().is_empty())
            .unwrap_or_else(|| crate::id_generator::generate_profile_id());

        let now = Self::now_secs();

        // Normalização de tags
        let tags: Vec<String> = match dto.tags {
            Some(serde_json::Value::Array(arr)) => arr
                .into_iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect(),
            Some(serde_json::Value::String(s)) => {
                s.split(',').map(|t| t.trim().to_string()).filter(|t| !t.is_empty()).collect()
            }
            _ => Vec::new(),
        };

        let port_u16 = dto.proxy_port.and_then(|v| {
            if let Some(n) = v.as_u64() {
                Some(n as u16)
            } else if let Some(s) = v.as_str() {
                s.parse::<u16>().ok()
            } else {
                None
            }
        });

        let proxy = ProfileProxyConfig {
            mode: "custom".to_string(),
            proxy_type: dto.proxy_type.unwrap_or_else(|| "none".to_string()),
            host: dto.proxy_host,
            port: port_u16,
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
            kernel: dto.kernel.unwrap_or_else(|| "Camoufox".to_string()),
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

        // Grava no disco em data/profiles/<id>/metadata.json
        let profile_dir = self.data_dir.join(&id);
        fs::create_dir_all(&profile_dir).map_err(|e| e.to_string())?;

        let meta_file = profile_dir.join("metadata.json");
        let json_str = serde_json::to_string_pretty(&profile).map_err(|e| e.to_string())?;
        fs::write(meta_file, json_str).map_err(|e| e.to_string())?;

        // Agenda sincronização automática com debounce de 5 segundos
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
        if let Some(tags_val) = dto.tags {
            profile.tags = match tags_val {
                serde_json::Value::Array(arr) => arr
                    .into_iter()
                    .filter_map(|v| v.as_str().map(|s| s.to_string()))
                    .collect(),
                serde_json::Value::String(s) => {
                    s.split(',').map(|t| t.trim().to_string()).filter(|t| !t.is_empty()).collect()
                }
                _ => profile.tags,
            };
        }

        if let Some(os) = dto.os {
            profile.os = os;
        }
        if let Some(kernel) = dto.kernel {
            profile.kernel = kernel;
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
        if let Some(ref p_val) = dto.proxy_port {
            let port_u16 = if let Some(n) = p_val.as_u64() {
                Some(n as u16)
            } else if let Some(s) = p_val.as_str() {
                s.parse::<u16>().ok()
            } else {
                None
            };
            profile.proxy.port = port_u16;
        }
        if let Some(proxy_user) = dto.proxy_username {
            profile.proxy.username = Some(proxy_user);
        }
        if let Some(proxy_pass) = dto.proxy_password {
            profile.proxy.password = Some(proxy_pass);
        }

        if let Some(fp) = dto.fingerprint_json {
            profile.fingerprint_json = fp;
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

        profile.updated_at = Self::now_secs();

        let meta_file = self.get_profile_path(id);
        let json_str = serde_json::to_string_pretty(&profile).map_err(|e| e.to_string())?;
        fs::write(meta_file, json_str).map_err(|e| e.to_string())?;

        // Agenda sincronização automática com debounce de 5 segundos
        self.trigger_auto_sync(id);

        Ok(profile)
    }

    /// Clona atomicamente um perfil existente no disco com um novo UUID
    pub fn clone_profile(&self, id: &str) -> Result<Profile, String> {
        let original = self.get(id).ok_or_else(|| "Perfil original não encontrado".to_string())?;

        let new_id = crate::id_generator::generate_profile_id();
        let now = Self::now_secs();

        let mut cloned = original.clone();
        cloned.id = new_id.clone();
        cloned.name = format!("{} (Cópia)", original.name);
        cloned.status = "ready".to_string();
        cloned.created_at = now;
        cloned.updated_at = now;
        cloned.last_launch = None;
        cloned.is_deleted = false;
        cloned.deleted_at = None;

        // Cria o diretório para o clone no disco
        let new_profile_dir = self.data_dir.join(&new_id);
        fs::create_dir_all(&new_profile_dir).map_err(|e| format!("Erro ao criar pasta do clone: {e}"))?;

        // Clona diretório de dados do navegador se existir
        let orig_browser_dir = self.data_dir.join(id).join("profile");
        let new_browser_dir = new_profile_dir.join("profile");
        if orig_browser_dir.exists() {
            let _ = fs::create_dir_all(&new_browser_dir);
            let orig_user_js = orig_browser_dir.join("user.js");
            if orig_user_js.exists() {
                let _ = fs::copy(&orig_user_js, new_browser_dir.join("user.js"));
            }
        }

        // Salva o metadata.json no disco
        let meta_file = new_profile_dir.join("metadata.json");
        let json_str = serde_json::to_string_pretty(&cloned).map_err(|e| e.to_string())?;
        fs::write(meta_file, json_str).map_err(|e| format!("Erro ao salvar metadata do clone: {e}"))?;

        tracing::info!("📋 Perfil '{}' ({}) clonado com sucesso para novo ID {}", original.name, id, new_id);

        // Agenda sincronização automática para o novo perfil clonado
        self.trigger_auto_sync(&new_id);

        Ok(cloned)
    }

    pub fn soft_delete(&self, id: &str) -> Result<(), String> {
        let _ = self.process_manager.stop(id);
        let mut profile = self.get(id).ok_or_else(|| "Perfil não encontrado".to_string())?;
        profile.is_deleted = true;
        profile.deleted_at = Some(Self::now_secs());
        profile.updated_at = Self::now_secs();

        let meta_file = self.get_profile_path(id);
        let json_str = serde_json::to_string_pretty(&profile).map_err(|e| e.to_string())?;
        fs::write(meta_file, json_str).map_err(|e| e.to_string())?;

        // Agenda sincronização automática da exclusão
        self.trigger_auto_sync(id);

        Ok(())
    }

    pub fn restore(&self, id: &str) -> Result<Profile, String> {
        let mut profile = self.get(id).ok_or_else(|| "Perfil não encontrado".to_string())?;
        profile.is_deleted = false;
        profile.deleted_at = None;
        profile.updated_at = Self::now_secs();

        let meta_file = self.get_profile_path(id);
        let json_str = serde_json::to_string_pretty(&profile).map_err(|e| e.to_string())?;
        fs::write(meta_file, json_str).map_err(|e| e.to_string())?;

        // Agenda sincronização automática da restauração
        self.trigger_auto_sync(id);

        Ok(profile)
    }

    /// Remove diretório com tolerância a descritores em processo de fechamento no Windows
    fn robust_remove_dir(path: &Path) -> Result<(), String> {
        let mut attempts = 0;
        loop {
            match fs::remove_dir_all(path) {
                Ok(_) => return Ok(()),
                Err(e) => {
                    attempts += 1;
                    if attempts >= 4 || !path.exists() {
                        return Err(e.to_string());
                    }
                    std::thread::sleep(std::time::Duration::from_millis(150));
                }
            }
        }
    }

    pub fn permanent_delete(&self, id: &str) -> Result<(), String> {
        let _ = self.process_manager.stop(id);
        let profile_dir = self.data_dir.join(id);
        if profile_dir.exists() {
            Self::robust_remove_dir(&profile_dir)?;
        }
        Ok(())
    }

    pub fn empty_trash(&self) -> Result<usize, String> {
        let trashed = self.list_trash();
        let count = trashed.len();
        for p in trashed {
            let _ = self.permanent_delete(&p.id);
        }
        Ok(count)
    }

    pub async fn launch(&self, id: &str) -> Result<(Profile, u32), String> {
        let mut profile = self.get(id).ok_or_else(|| "Perfil não encontrado".to_string())?;
        let pid = self.process_manager.launch(&profile, &self.data_dir).await?;
        let now = Self::now_secs();
        profile.status = "running".to_string();
        profile.last_launch = Some(now);
        profile.updated_at = now;

        let meta_file = self.get_profile_path(id);
        let json_str = serde_json::to_string_pretty(&profile).map_err(|e| e.to_string())?;
        fs::write(meta_file, json_str).map_err(|e| e.to_string())?;
        Ok((profile, pid))
    }

    /// Inicia o perfil com opção de depuração remota CDP / BiDi retornando ws_endpoint
    pub async fn launch_with_cdp(
        &self,
        id: &str,
        cdp: bool,
    ) -> Result<(Profile, u32, Option<u16>, Option<String>), String> {
        let mut profile = self.get(id).ok_or_else(|| "Perfil não encontrado".to_string())?;
        let (pid, debug_port, ws_endpoint) = self.process_manager.launch_with_cdp(&profile, &self.data_dir, cdp).await?;
        let now = Self::now_secs();
        profile.status = "running".to_string();
        profile.last_launch = Some(now);
        profile.updated_at = now;

        let meta_file = self.get_profile_path(id);
        let json_str = serde_json::to_string_pretty(&profile).map_err(|e| e.to_string())?;
        fs::write(meta_file, json_str).map_err(|e| e.to_string())?;
        Ok((profile, pid, debug_port, ws_endpoint))
    }

    pub fn stop(&self, id: &str) -> Result<Profile, String> {
        let mut profile = self.get(id).ok_or_else(|| "Perfil não encontrado".to_string())?;
        self.process_manager.stop(id)?;
        let now = Self::now_secs();
        profile.status = "ready".to_string();
        profile.updated_at = now;

        let meta_file = self.get_profile_path(id);
        let json_str = serde_json::to_string_pretty(&profile).map_err(|e| e.to_string())?;
        fs::write(meta_file, json_str).map_err(|e| e.to_string())?;
        Ok(profile)
    }

    pub fn get_process_manager(&self) -> Arc<ProcessManager> {
        self.process_manager.clone()
    }

    #[allow(dead_code)]
    pub fn is_running(&self, profile_id: &str) -> bool {
        self.process_manager.is_running(profile_id)
    }

    #[allow(dead_code)]
    pub fn get_profile_updated_at(&self, profile_id: &str) -> Option<i64> {
        let path = self.get_profile_path(profile_id);
        if let Ok(content) = fs::read_to_string(path) {
            if let Ok(profile) = serde_json::from_str::<Profile>(&content) {
                return Some(profile.updated_at);
            }
        }
        None
    }

    pub fn get_profile_dir(&self, id: &str) -> PathBuf {
        self.data_dir.join(id).join("profile")
    }
}

