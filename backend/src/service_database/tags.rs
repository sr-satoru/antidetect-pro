use super::data::Vault;
use crate::models::{CreateTagDto, Tag, UpdateTagDto};
use rusqlite::params;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

fn now_secs() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

/// Serviço de tags com persistência direta na tabela `tags` do Star Vault
#[derive(Clone)]
pub struct TagService {
    vault: Arc<Vault>,
}

pub type TagStorage = TagService;

impl TagService {
    pub fn new(vault: Arc<Vault>) -> Self {
        Self { vault }
    }

    pub fn list(&self, search: Option<&str>) -> Vec<Tag> {
        let conn = self.vault.conn();
        let conn_guard = match conn.lock() {
            Ok(g) => g,
            Err(_) => return Vec::new(),
        };

        let mut stmt = match conn_guard.prepare("SELECT id, name, color, created_at FROM tags ORDER BY name ASC") {
            Ok(s) => s,
            Err(_) => return Vec::new(),
        };

        let mut rows = match stmt.query([]) {
            Ok(r) => r,
            Err(_) => return Vec::new(),
        };

        let mut tags = Vec::new();
        while let Ok(Some(row)) = rows.next() {
            if let (Ok(id), Ok(name), Ok(color), Ok(created_at)) = (
                row.get::<_, String>(0),
                row.get::<_, String>(1),
                row.get::<_, String>(2),
                row.get::<_, i64>(3),
            ) {
                tags.push(Tag {
                    id,
                    name,
                    color,
                    created_at,
                    updated_at: created_at,
                });
            }
        }

        if let Some(q) = search.map(|s| s.trim().to_lowercase()) {
            if !q.is_empty() {
                tags.retain(|t| t.name.to_lowercase().contains(&q));
            }
        }

        tags
    }

    pub fn get(&self, id: &str) -> Option<Tag> {
        let conn = self.vault.conn();
        let conn_guard = conn.lock().ok()?;

        let mut stmt = conn_guard
            .prepare("SELECT id, name, color, created_at FROM tags WHERE id = ? LIMIT 1")
            .ok()?;
        let mut rows = stmt.query(params![id]).ok()?;

        if let Ok(Some(row)) = rows.next() {
            let id: String = row.get(0).ok()?;
            let name: String = row.get(1).ok()?;
            let color: String = row.get(2).ok()?;
            let created_at: i64 = row.get(3).ok()?;

            return Some(Tag {
                id,
                name,
                color,
                created_at,
                updated_at: created_at,
            });
        }

        None
    }

    pub fn create(&self, dto: CreateTagDto) -> Result<Tag, String> {
        let name = dto.name.trim().to_string();
        if name.is_empty() {
            return Err("O nome da tag não pode ser vazio".to_string());
        }

        let id = uuid::Uuid::new_v4().to_string();
        let color = dto.color.unwrap_or_else(|| "#1677FF".to_string());
        let now = now_secs();

        let conn = self.vault.conn();
        let conn_guard = conn.lock().map_err(|e| e.to_string())?;

        conn_guard
            .execute(
                "INSERT INTO tags (id, name, color, created_at) VALUES (?1, ?2, ?3, ?4)",
                params![id, name, color, now],
            )
            .map_err(|e| {
                if e.to_string().contains("UNIQUE") {
                    "Já existe uma tag com este nome".to_string()
                } else {
                    e.to_string()
                }
            })?;

        Ok(Tag {
            id,
            name,
            color,
            created_at: now,
            updated_at: now,
        })
    }

    pub fn update(&self, id: &str, dto: UpdateTagDto) -> Result<Tag, String> {
        let existing = self.get(id).ok_or_else(|| "Tag não encontrada".to_string())?;
        let new_name = dto.name.map(|n| n.trim().to_string()).unwrap_or(existing.name);
        let new_color = dto.color.unwrap_or(existing.color);
        let now = now_secs();

        let conn = self.vault.conn();
        let conn_guard = conn.lock().map_err(|e| e.to_string())?;

        conn_guard
            .execute(
                "UPDATE tags SET name = ?1, color = ?2 WHERE id = ?3",
                params![new_name, new_color, id],
            )
            .map_err(|e| e.to_string())?;

        Ok(Tag {
            id: id.to_string(),
            name: new_name,
            color: new_color,
            created_at: existing.created_at,
            updated_at: now,
        })
    }

    pub fn delete(&self, id: &str) -> Result<bool, String> {
        let conn = self.vault.conn();
        let conn_guard = conn.lock().map_err(|e| e.to_string())?;
        let affected = conn_guard
            .execute("DELETE FROM tags WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;
        Ok(affected > 0)
    }

    pub fn delete_many(&self, ids: &[String]) -> Result<usize, String> {
        if ids.is_empty() {
            return Ok(0);
        }

        let conn = self.vault.conn();
        let conn_guard = conn.lock().map_err(|e| e.to_string())?;

        let placeholders = ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
        let sql = format!("DELETE FROM tags WHERE id IN ({placeholders})");

        let params_slice: Vec<&dyn rusqlite::ToSql> = ids.iter().map(|id| id as &dyn rusqlite::ToSql).collect();
        let affected = conn_guard
            .execute(&sql, &params_slice[..])
            .map_err(|e| e.to_string())?;

        Ok(affected)
    }
}
