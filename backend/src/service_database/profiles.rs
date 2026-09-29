use super::data::{crypto::decrypt_payload, crypto::encrypt_payload, Vault};
use crate::launcher::ProcessManager;
use crate::models::{CreateProfileDto, Profile, ProfileProxyConfig, UpdateProfileDto};
use crate::ws::WsState;
use rusqlite::params;
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
}

pub type ProfileStorage = ProfileService;

impl ProfileService {
    pub fn new<P: AsRef<Path>>(data_dir: P, ws: WsState, vault: Arc<Vault>) -> Self {
        let dir = data_dir.as_ref().join("profiles");
        let _ = fs::create_dir_all(&dir);
        let pm = Arc::new(ProcessManager::new(ws));
        pm.set_vault(vault.clone());
        Self {
            vault,
            data_dir: dir,
            process_manager: pm,
            auto_sync: Arc::new(Mutex::new(None)),
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

    fn resolve_tags(
        conn: &rusqlite::Connection,
        tag_names: Option<&[String]>,
        tag_ids: Option<&[i64]>,
    ) -> Vec<crate::models::TagRef> {
        let mut result = Vec::new();

        // 1. Resolver por IDs diretos
        if let Some(ids) = tag_ids {
            for &id in ids {
                let mut stmt = match conn.prepare("SELECT id, name, color FROM tags WHERE id = ?1 LIMIT 1") {
                    Ok(s) => s,
                    Err(_) => continue,
                };
                if let Ok(mut rows) = stmt.query(params![id]) {
                    if let Ok(Some(row)) = rows.next() {
                        if let (Ok(tid), Ok(name), Ok(color)) = (
                            row.get::<_, i64>(0),
                            row.get::<_, String>(1),
                            row.get::<_, String>(2),
                        ) {
                            result.push(crate::models::TagRef { id: tid, name, color });
                        }
                    }
                }
            }
        }

        // 2. Resolver por nomes (buscando ou inserindo com cor padrão)
        if let Some(names) = tag_names {
            let now = now_secs();
            for raw_name in names {
                let name = raw_name.trim();
                if name.is_empty() {
                    continue;
                }
                if result.iter().any(|t| t.name.eq_ignore_ascii_case(name)) {
                    continue;
                }

                let mut stmt = match conn.prepare("SELECT id, name, color FROM tags WHERE LOWER(name) = LOWER(?1) LIMIT 1") {
                    Ok(s) => s,
                    Err(_) => continue,
                };
                let existing = stmt.query_row(params![name], |row| {
                    Ok(crate::models::TagRef {
                        id: row.get(0)?,
                        name: row.get(1)?,
                        color: row.get(2)?,
                    })
                });

                match existing {
                    Ok(t) => result.push(t),
                    Err(_) => {
                        let default_color = crate::models::tag::default_tag_color();
                        let inserted = conn.execute(
                            "INSERT INTO tags (name, color, created_at) VALUES (?1, ?2, ?3)",
                            params![name, default_color, now],
                        );
                        if inserted.is_ok() {
                            let new_id = conn.last_insert_rowid();
                            result.push(crate::models::TagRef {
                                id: new_id,
                                name: name.to_string(),
                                color: default_color,
                            });
                        }
                    }
                }
            }
        }

        result
    }

    fn load_profile_tags(conn: &rusqlite::Connection, profile_id: &str) -> Vec<crate::models::TagRef> {
        let mut stmt = match conn.prepare(
            "SELECT t.id, t.name, t.color
             FROM tags t
             JOIN profile_tags pt ON pt.tag_id = t.id
             WHERE pt.profile_id = ?1
             ORDER BY t.name ASC"
        ) {
            Ok(s) => s,
            Err(_) => return Vec::new(),
        };

        let mut rows = match stmt.query(params![profile_id]) {
            Ok(r) => r,
            Err(_) => return Vec::new(),
        };

        let mut tags = Vec::new();
        while let Ok(Some(row)) = rows.next() {
            if let (Ok(id), Ok(name), Ok(color)) = (
                row.get::<_, i64>(0),
                row.get::<_, String>(1),
                row.get::<_, String>(2),
            ) {
                tags.push(crate::models::TagRef { id, name, color });
            }
        }
        tags
    }

    fn save_to_db(&self, profile: &Profile) -> Result<(), String> {
        let conn = self.vault.conn();
        let conn_guard = conn.lock().map_err(|e| e.to_string())?;

        let json_bytes = serde_json::to_vec(profile).map_err(|e| e.to_string())?;
        let payload_enc = encrypt_payload(self.vault.key().as_ref(), &json_bytes)?;

        conn_guard
            .execute(
                "INSERT INTO profiles (
                    id, name, group_name, status, kernel, browser_version, os,
                    payload_enc, created_at, updated_at, last_launch, is_deleted, deleted_at
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
                ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    group_name = excluded.group_name,
                    status = excluded.status,
                    kernel = excluded.kernel,
                    browser_version = excluded.browser_version,
                    os = excluded.os,
                    payload_enc = excluded.payload_enc,
                    updated_at = excluded.updated_at,
                    last_launch = excluded.last_launch,
                    is_deleted = excluded.is_deleted,
                    deleted_at = excluded.deleted_at",
                params![
                    profile.id,
                    profile.name,
                    profile.group,
                    profile.status,
                    profile.kernel,
                    profile.browser_version,
                    profile.os,
                    payload_enc,
                    profile.created_at,
                    profile.updated_at,
                    profile.last_launch,
                    profile.is_deleted as i32,
                    profile.deleted_at,
                ],
            )
            .map_err(|e| format!("Erro ao salvar perfil no banco de dados: {e}"))?;

        // Sincroniza vínculos na tabela relacional profile_tags
        let _ = conn_guard.execute(
            "DELETE FROM profile_tags WHERE profile_id = ?1",
            params![profile.id],
        );
        for tag in &profile.tags {
            if tag.id > 0 {
                let _ = conn_guard.execute(
                    "INSERT OR IGNORE INTO profile_tags (profile_id, tag_id) VALUES (?1, ?2)",
                    params![profile.id, tag.id],
                );
            }
        }

        Ok(())
    }

    pub fn list(&self, search: Option<&str>, group: Option<&str>) -> Vec<Profile> {
        let conn = self.vault.conn();
        let conn_guard = match conn.lock() {
            Ok(g) => g,
            Err(e) => {
                tracing::error!("Erro de concorrência no banco: {e}");
                return Vec::new();
            }
        };

        let mut sql = "SELECT payload_enc FROM profiles WHERE is_deleted = 0".to_string();
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if let Some(grp) = group {
            if grp != "all" && grp != "Todos os grupos" && !grp.trim().is_empty() {
                sql.push_str(" AND group_name = ?");
                params_vec.push(Box::new(grp.to_string()));
            }
        }

        sql.push_str(" ORDER BY created_at DESC");

        let params_slice: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|b| b.as_ref()).collect();
        let mut stmt = match conn_guard.prepare(&sql) {
            Ok(s) => s,
            Err(e) => {
                tracing::error!("Erro ao preparar query de perfis: {e}");
                return Vec::new();
            }
        };

        let mut rows = match stmt.query(&params_slice[..]) {
            Ok(r) => r,
            Err(e) => {
                tracing::error!("Erro ao executar query de perfis: {e}");
                return Vec::new();
            }
        };

        let mut profiles = Vec::new();
        while let Ok(Some(row)) = rows.next() {
            if let Ok(payload_enc) = row.get::<_, Vec<u8>>(0) {
                if let Ok(decrypted) = decrypt_payload(self.vault.key().as_ref(), &payload_enc) {
                    if let Ok(mut profile) = serde_json::from_slice::<Profile>(&decrypted) {
                        let dynamic_tags = Self::load_profile_tags(&conn_guard, &profile.id);
                        if !dynamic_tags.is_empty() {
                            profile.tags = dynamic_tags;
                        }

                        let profile_dir = self.data_dir.join(&profile.id).join("profile");
                        let is_alive = self.process_manager.is_running_with_dir(&profile.id, Some(&profile_dir));
                        if is_alive && profile.status != "running" {
                            profile.status = "running".to_string();
                        } else if !is_alive && profile.status == "running" {
                            profile.status = "ready".to_string();
                        }

                        if let Some(s) = search {
                            let term = s.to_lowercase();
                            let matches_name = profile.name.to_lowercase().contains(&term);
                            let matches_notes = profile.notes.to_lowercase().contains(&term);
                            let matches_proxy = profile
                                .proxy
                                .host
                                .as_deref()
                                .map(|h| h.to_lowercase().contains(&term))
                                .unwrap_or(false);
                            let matches_tags = profile.tags.iter().any(|t| t.name.to_lowercase().contains(&term));
                            if !(matches_name || matches_notes || matches_proxy || matches_tags) {
                                continue;
                            }
                        }

                        profiles.push(profile);
                    }
                }
            }
        }

        profiles
    }

    pub fn list_trash(&self) -> Vec<Profile> {
        let conn = self.vault.conn();
        let conn_guard = match conn.lock() {
            Ok(g) => g,
            Err(_) => return Vec::new(),
        };

        let mut stmt = match conn_guard.prepare("SELECT payload_enc FROM profiles WHERE is_deleted = 1 ORDER BY deleted_at DESC") {
            Ok(s) => s,
            Err(_) => return Vec::new(),
        };

        let mut rows = match stmt.query([]) {
            Ok(r) => r,
            Err(_) => return Vec::new(),
        };

        let mut profiles = Vec::new();
        while let Ok(Some(row)) = rows.next() {
            if let Ok(payload_enc) = row.get::<_, Vec<u8>>(0) {
                if let Ok(decrypted) = decrypt_payload(self.vault.key().as_ref(), &payload_enc) {
                    if let Ok(mut profile) = serde_json::from_slice::<Profile>(&decrypted) {
                        let dynamic_tags = Self::load_profile_tags(&conn_guard, &profile.id);
                        if !dynamic_tags.is_empty() {
                            profile.tags = dynamic_tags;
                        }
                        profiles.push(profile);
                    }
                }
            }
        }

        profiles
    }

    pub fn get(&self, id: &str) -> Option<Profile> {
        let conn = self.vault.conn();
        let conn_guard = conn.lock().ok()?;

        let mut stmt = conn_guard
            .prepare("SELECT payload_enc FROM profiles WHERE id = ? LIMIT 1")
            .ok()?;
        let mut rows = stmt.query(params![id]).ok()?;

        if let Ok(Some(row)) = rows.next() {
            let payload_enc: Vec<u8> = row.get(0).ok()?;
            let decrypted = decrypt_payload(self.vault.key().as_ref(), &payload_enc).ok()?;
            let mut profile = serde_json::from_slice::<Profile>(&decrypted).ok()?;

            let dynamic_tags = Self::load_profile_tags(&conn_guard, &profile.id);
            if !dynamic_tags.is_empty() {
                profile.tags = dynamic_tags;
            }

            let profile_dir = self.data_dir.join(id).join("profile");
            let is_alive = self.process_manager.is_running_with_dir(&profile.id, Some(&profile_dir));
            if is_alive && profile.status != "running" {
                profile.status = "running".to_string();
            } else if !is_alive && profile.status == "running" {
                profile.status = "ready".to_string();
            }

            return Some(profile);
        }

        None
    }

    pub fn create(&self, dto: CreateProfileDto) -> Result<Profile, String> {
        let id = dto
            .id
            .filter(|s| !s.trim().is_empty())
            .unwrap_or_else(|| crate::id_generator::generate_profile_id());

        let now = now_secs();

        let conn = self.vault.conn();
        let conn_guard = conn.lock().map_err(|e| e.to_string())?;
        let tags = Self::resolve_tags(
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

        // Persistência EXCLUSIVA no Star Vault (.db).
        // NENHUMA pasta em disco é criada na criação do cadastro.
        self.save_to_db(&profile)?;
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
                profile.tags = Self::resolve_tags(
                    &conn_guard,
                    dto.tags.as_deref(),
                    dto.tag_ids.as_deref(),
                );
            }
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

        self.save_to_db(&profile)?;
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

        self.save_to_db(&cloned)?;
        tracing::info!("📋 Perfil '{}' ({}) clonado com sucesso para novo ID {}", original.name, id, new_id);

        self.trigger_auto_sync(&new_id);

        Ok(cloned)
    }

    pub fn soft_delete(&self, id: &str) -> Result<(), String> {
        let _ = self.process_manager.stop(id);
        let now = now_secs();

        let conn = self.vault.conn();
        let conn_guard = conn.lock().map_err(|e| e.to_string())?;
        conn_guard
            .execute(
                "UPDATE profiles SET is_deleted = 1, deleted_at = ?1 WHERE id = ?2",
                params![now, id],
            )
            .map_err(|e| e.to_string())?;

        self.trigger_auto_sync(id);
        Ok(())
    }

    pub fn restore(&self, id: &str) -> Result<Profile, String> {
        let conn = self.vault.conn();
        let conn_guard = conn.lock().map_err(|e| e.to_string())?;
        conn_guard
            .execute(
                "UPDATE profiles SET is_deleted = 0, deleted_at = NULL WHERE id = ?1",
                params![id],
            )
            .map_err(|e| e.to_string())?;

        drop(conn_guard);
        let profile = self.get(id).ok_or_else(|| "Perfil não encontrado".to_string())?;
        self.trigger_auto_sync(id);
        Ok(profile)
    }

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

        let conn = self.vault.conn();
        let conn_guard = conn.lock().map_err(|e| e.to_string())?;
        conn_guard
            .execute("DELETE FROM profiles WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;

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
        let (prof, pid, _, _) = self.launch_with_cdp(id, false).await?;
        Ok((prof, pid))
    }

    pub async fn launch_with_cdp(
        &self,
        id: &str,
        cdp: bool,
    ) -> Result<(Profile, u32, Option<u16>, Option<String>), String> {
        let mut profile = self.get(id).ok_or_else(|| "Perfil não encontrado".to_string())?;
        let profile_dir = self.get_profile_dir(id);

        // Descriptografa e monta a sessão efêmera do Vault nos arquivos SQLite temporários
        let session_svc = super::sessions::SessionService::new(self.vault.clone());
        if let Ok(Some(session)) = session_svc.load_session(id) {
            tracing::info!(
                "🔓 Descriptografando e montando sessão efêmera do Vault para perfil {} ({} cookies, {} storage)",
                id, session.total_cookies, session.total_storage_items
            );
            let _ = crate::launcher::engine::injection::inject_cookies(&profile_dir, &session.cookies);
            for (origin, items) in &session.local_storage {
                let _ = crate::launcher::engine::injection::inject_local_storage(&profile_dir, origin, items);
            }
        }

        let (pid, debug_port, ws_endpoint) = self.process_manager.launch_with_cdp(&profile, &self.data_dir, cdp).await?;
        let now = now_secs();
        profile.status = "running".to_string();
        profile.last_launch = Some(now);
        profile.updated_at = now;

        self.save_to_db(&profile)?;
        Ok((profile, pid, debug_port, ws_endpoint))
    }

    pub fn stop(&self, id: &str) -> Result<Profile, String> {
        let mut profile = self.get(id).ok_or_else(|| "Perfil não encontrado".to_string())?;
        let profile_dir = self.get_profile_dir(id);

        // 1. Encerra o processo do navegador
        self.process_manager.stop(id)?;

        // 2. Extrai a sessão atualizada, criptografa no Vault e limpa o disco temporário
        let session_svc = super::sessions::SessionService::new(self.vault.clone());
        if let Ok(fresh_session) = crate::extraction_session::fire_fox::extract_unified_session(&profile_dir) {
            if fresh_session.total_cookies > 0 || fresh_session.total_storage_items > 0 {
                tracing::info!(
                    "🔒 Criptografando e salvando sessão no Vault para perfil {} via stop API ({} cookies, {} storage)",
                    id, fresh_session.total_cookies, fresh_session.total_storage_items
                );
                let _ = session_svc.save_session(id, &fresh_session);
            }
        }
        tracing::info!("🛡️ Zero-Trace: expurgando arquivos temporários de sessão no disco pós stop ({})", id);
        crate::launcher::engine::injection::purge_ephemeral_session_files(&profile_dir);

        let now = now_secs();
        profile.status = "ready".to_string();
        profile.updated_at = now;

        self.save_to_db(&profile)?;
        Ok(profile)
    }

    pub fn vault(&self) -> &Arc<Vault> {
        &self.vault
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
        self.get(profile_id).map(|p| p.updated_at)
    }

    pub fn get_profile_dir(&self, id: &str) -> PathBuf {
        self.data_dir.join(id).join("profile")
    }
}
