use crate::models::Profile;
use crate::security::ProtectedKey;
use crate::storage::vault::crypto::{decrypt_payload, encrypt_payload};
use crate::storage::vault::traits::ProfileRepository;
use rusqlite::{params, Connection};
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

fn now_secs() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

pub struct SqliteProfileRepository {
    conn: Arc<Mutex<Connection>>,
    key: Arc<ProtectedKey>,
}

impl SqliteProfileRepository {
    pub fn new(conn: Arc<Mutex<Connection>>, key: Arc<ProtectedKey>) -> Self {
        Self { conn, key }
    }
}

impl ProfileRepository for SqliteProfileRepository {
    fn list(&self, search: Option<&str>, group: Option<&str>) -> Result<Vec<Profile>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        let mut sql = "SELECT payload_enc FROM profiles WHERE is_deleted = 0".to_string();
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if let Some(grp) = group {
            if grp != "all" && !grp.trim().is_empty() {
                sql.push_str(" AND group_name = ?");
                params_vec.push(Box::new(grp.to_string()));
            }
        }

        if let Some(q) = search {
            let q = q.trim();
            if !q.is_empty() {
                sql.push_str(" AND (name LIKE ? OR id LIKE ?)");
                let pattern = format!("%{q}%");
                params_vec.push(Box::new(pattern.clone()));
                params_vec.push(Box::new(pattern));
            }
        }

        sql.push_str(" ORDER BY created_at DESC");

        let params_slice: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|b| b.as_ref()).collect();
        let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
        let mut rows = stmt.query(&params_slice[..]).map_err(|e| e.to_string())?;

        let mut profiles = Vec::new();
        while let Some(row) = rows.next().map_err(|e| e.to_string())? {
            let payload_enc: Vec<u8> = row.get(0).map_err(|e| e.to_string())?;
            if let Ok(decrypted) = decrypt_payload(self.key.as_bytes(), &payload_enc) {
                if let Ok(profile) = serde_json::from_slice::<Profile>(&decrypted) {
                    profiles.push(profile);
                }
            }
        }

        Ok(profiles)
    }

    fn list_trash(&self) -> Result<Vec<Profile>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT payload_enc FROM profiles WHERE is_deleted = 1 ORDER BY deleted_at DESC")
            .map_err(|e| e.to_string())?;
        let mut rows = stmt.query([]).map_err(|e| e.to_string())?;

        let mut profiles = Vec::new();
        while let Some(row) = rows.next().map_err(|e| e.to_string())? {
            let payload_enc: Vec<u8> = row.get(0).map_err(|e| e.to_string())?;
            if let Ok(decrypted) = decrypt_payload(self.key.as_bytes(), &payload_enc) {
                if let Ok(profile) = serde_json::from_slice::<Profile>(&decrypted) {
                    profiles.push(profile);
                }
            }
        }

        Ok(profiles)
    }

    fn get(&self, id: &str) -> Result<Option<Profile>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT payload_enc FROM profiles WHERE id = ? LIMIT 1")
            .map_err(|e| e.to_string())?;
        let mut rows = stmt.query(params![id]).map_err(|e| e.to_string())?;

        if let Some(row) = rows.next().map_err(|e| e.to_string())? {
            let payload_enc: Vec<u8> = row.get(0).map_err(|e| e.to_string())?;
            let decrypted = decrypt_payload(self.key.as_bytes(), &payload_enc)?;
            let profile = serde_json::from_slice::<Profile>(&decrypted).map_err(|e| e.to_string())?;
            Ok(Some(profile))
        } else {
            Ok(None)
        }
    }

    fn save(&self, profile: &Profile) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let json_bytes = serde_json::to_vec(profile).map_err(|e| e.to_string())?;
        let payload_enc = encrypt_payload(self.key.as_bytes(), &json_bytes)?;

        conn.execute(
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
                if profile.is_deleted { 1 } else { 0 },
                profile.deleted_at,
            ],
        )
        .map_err(|e| e.to_string())?;

        Ok(())
    }

    fn delete_soft(&self, id: &str) -> Result<(), String> {
        if let Some(mut profile) = self.get(id)? {
            let now = now_secs();
            profile.is_deleted = true;
            profile.deleted_at = Some(now);
            profile.updated_at = now;
            self.save(&profile)?;
        }
        Ok(())
    }

    fn restore(&self, id: &str) -> Result<Option<Profile>, String> {
        if let Some(mut profile) = self.get(id)? {
            profile.is_deleted = false;
            profile.deleted_at = None;
            profile.updated_at = now_secs();
            self.save(&profile)?;
            Ok(Some(profile))
        } else {
            Ok(None)
        }
    }

    fn delete_permanent(&self, id: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM profiles WHERE id = ?", params![id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    fn empty_trash(&self) -> Result<usize, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let count = conn
            .execute("DELETE FROM profiles WHERE is_deleted = 1", [])
            .map_err(|e| e.to_string())?;
        Ok(count)
    }
}
