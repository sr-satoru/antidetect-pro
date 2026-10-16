use crate::launcher::ProcessManager;
use crate::models::{Profile, PublicProfileDto};
use crate::service_database::data::crypto::{decrypt_payload, encrypt_payload};
use crate::service_database::Vault;
use rusqlite::params;
use std::fs;
use std::path::Path;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

fn now_secs() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

/// Helper unificado para descriptografar, hidratar tags e reconciliar status de execução do perfil
pub fn hydrate_profile(
    vault_key: &crate::security::ProtectedKey,
    pm: &ProcessManager,
    data_dir: &Path,
    payload_enc: &[u8],
) -> Option<Profile> {
    let decrypted = decrypt_payload(vault_key, payload_enc).ok()?;
    let mut profile = serde_json::from_slice::<Profile>(&decrypted).ok()?;

    let profile_dir = data_dir.join(&profile.id).join("profile");
    let is_alive = pm.is_running_with_dir(&profile.id, Some(&profile_dir));
    if is_alive && profile.status != "running" {
        profile.status = "running".to_string();
    } else if !is_alive && profile.status == "running" {
        profile.status = "ready".to_string();
    }

    Some(profile)
}

/// Salva perfil cifrado no Star Vault e sincroniza tabela relacional de tags
pub fn save_to_db(vault: &Arc<Vault>, profile: &Profile) -> Result<(), String> {
    let conn = vault.conn();
    let conn_guard = conn.lock().map_err(|e| e.to_string())?;

    let json_bytes = serde_json::to_vec(profile).map_err(|e| e.to_string())?;
    let payload_enc = encrypt_payload(vault.key().as_ref(), &json_bytes)?;

    conn_guard
        .execute(
            "INSERT INTO profiles (
                id, name, group_name, status, kernel, browser_version, os,
                payload_enc, created_at, updated_at, last_launch, is_deleted, deleted_at, cloud_hash
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, NULL)
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
                deleted_at = excluded.deleted_at,
                cloud_hash = NULL",
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

    Ok(())
}

/// Lista perfis ativos aplicando filtros de grupo e pesquisa de texto
pub fn list(
    vault: &Arc<Vault>,
    pm: &ProcessManager,
    data_dir: &Path,
    search: Option<&str>,
    group: Option<&str>,
) -> Vec<Profile> {
    let conn = vault.conn();
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
            if let Some(profile) = hydrate_profile(vault.key().as_ref(), pm, data_dir, &payload_enc) {
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

    profiles
}

/// Lista perfis marcados como excluídos (lixeira)
pub fn list_trash(vault: &Arc<Vault>, pm: &ProcessManager, data_dir: &Path) -> Vec<Profile> {
    let conn = vault.conn();
    let conn_guard = match conn.lock() {
        Ok(g) => g,
        Err(_) => return Vec::new(),
    };

    let mut stmt = match conn_guard.prepare(
        "SELECT payload_enc FROM profiles WHERE is_deleted = 1 ORDER BY deleted_at DESC",
    ) {
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
            if let Some(profile) = hydrate_profile(vault.key().as_ref(), pm, data_dir, &payload_enc) {
                profiles.push(profile);
            }
        }
    }

    profiles
}

/// Busca um perfil específico pelo ID
pub fn get(vault: &Arc<Vault>, pm: &ProcessManager, data_dir: &Path, id: &str) -> Option<Profile> {
    let conn = vault.conn();
    let conn_guard = conn.lock().ok()?;

    let mut stmt = conn_guard
        .prepare("SELECT payload_enc FROM profiles WHERE id = ? LIMIT 1")
        .ok()?;
    let mut rows = stmt.query(params![id]).ok()?;

    if let Ok(Some(row)) = rows.next() {
        let payload_enc: Vec<u8> = row.get(0).ok()?;
        return hydrate_profile(vault.key().as_ref(), pm, data_dir, &payload_enc);
    }

    None
}

/// Soft-delete: move o perfil para a lixeira
pub fn soft_delete(vault: &Arc<Vault>, pm: &ProcessManager, id: &str) -> Result<(), String> {
    let _ = pm.stop(id);
    let now = now_secs();

    let conn = vault.conn();
    let conn_guard = conn.lock().map_err(|e| e.to_string())?;
    conn_guard
        .execute(
            "UPDATE profiles SET is_deleted = 1, deleted_at = ?1, cloud_hash = NULL WHERE id = ?2",
            params![now, id],
        )
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Restaura o perfil da lixeira
pub fn restore(vault: &Arc<Vault>, id: &str) -> Result<(), String> {
    let conn = vault.conn();
    let conn_guard = conn.lock().map_err(|e| e.to_string())?;
    conn_guard
        .execute(
            "UPDATE profiles SET is_deleted = 0, deleted_at = NULL, cloud_hash = NULL WHERE id = ?1",
            params![id],
        )
        .map_err(|e| e.to_string())?;

    Ok(())
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

/// Remove permanentemente o perfil do SQLite e seus dados do disco
pub fn permanent_delete(
    vault: &Arc<Vault>,
    pm: &ProcessManager,
    data_dir: &Path,
    id: &str,
) -> Result<(), String> {
    let _ = pm.stop(id);

    let conn = vault.conn();
    let conn_guard = conn.lock().map_err(|e| e.to_string())?;
    conn_guard
        .execute("DELETE FROM profiles WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    let profile_dir = data_dir.join(id);
    if profile_dir.exists() {
        robust_remove_dir(&profile_dir)?;
    }
    Ok(())
}

/// Consulta pública ultra-rápida e segura de perfis (ID, Nome e Tags para controle de agentes)
/// Consulta pública ultra-rápida e segura de perfis (higienizada sem credenciais ou proxies)
pub fn get_public(
    vault: &Arc<Vault>,
    pm: &ProcessManager,
    id: Option<&str>,
    name: Option<&str>,
    tag: Option<&str>,
) -> Vec<PublicProfileDto> {
    let conn = vault.conn();
    let conn_guard = match conn.lock() {
        Ok(g) => g,
        Err(_) => return Vec::new(),
    };

    let mut query = "SELECT id, name, payload_enc FROM profiles WHERE is_deleted = 0".to_string();
    let mut params_vec: Vec<rusqlite::types::Value> = Vec::new();

    if let Some(i) = id {
        query.push_str(" AND id = ?");
        params_vec.push(rusqlite::types::Value::Text(i.to_string()));
    }

    if let Some(n) = name {
        query.push_str(" AND (LOWER(name) = LOWER(?) OR name = ?)");
        params_vec.push(rusqlite::types::Value::Text(n.to_string()));
        params_vec.push(rusqlite::types::Value::Text(n.to_string()));
    }

    query.push_str(" ORDER BY created_at ASC");

    let mut stmt = match conn_guard.prepare(&query) {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Erro ao preparar query pública de perfis: {e}");
            return Vec::new();
        }
    };

    let params_slice: Vec<&dyn rusqlite::ToSql> = params_vec
        .iter()
        .map(|v| v as &dyn rusqlite::ToSql)
        .collect();

    let mut rows = match stmt.query(&params_slice[..]) {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Erro ao executar query pública de perfis: {e}");
            return Vec::new();
        }
    };

    let mut list = Vec::new();
    while let Ok(Some(row)) = rows.next() {
        if let Ok(payload_enc) = row.get::<_, Vec<u8>>(2) {
            if let Ok(decrypted) = decrypt_payload(vault.key().as_ref(), &payload_enc) {
                if let Ok(profile) = serde_json::from_slice::<Profile>(&decrypted) {
                    if let Some(t_filter) = tag {
                        let term = t_filter.trim().to_lowercase();
                        if !profile.tags.iter().any(|t| t.name.to_lowercase() == term) {
                            continue;
                        }
                    }

                    let is_running = pm.is_running(&profile.id);
                    let status = if is_running {
                        "running".to_string()
                    } else {
                        profile.status
                    };

                    let tags = profile
                        .tags
                        .into_iter()
                        .map(|t| crate::models::PublicTagDto {
                            name: t.name,
                            color: t.color,
                        })
                        .collect();

                    list.push(PublicProfileDto {
                        id: profile.id,
                        name: profile.name,
                        kernel: profile.kernel,
                        browser_version: profile.browser_version,
                        os: profile.os,
                        group: profile.group,
                        tags,
                        status,
                        running: is_running,
                        created_at: profile.created_at,
                        updated_at: profile.updated_at,
                    });
                }
            }
        }
    }

    list
}
