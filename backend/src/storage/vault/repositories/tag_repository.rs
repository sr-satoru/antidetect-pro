use crate::models::{CreateTagDto, Tag, UpdateTagDto};
use crate::storage::vault::traits::TagRepository;
use rusqlite::{params, Connection};
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

fn now_secs() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

pub struct SqliteTagRepository {
    conn: Arc<Mutex<Connection>>,
}

impl SqliteTagRepository {
    pub fn new(conn: Arc<Mutex<Connection>>) -> Self {
        Self { conn }
    }
}

impl TagRepository for SqliteTagRepository {
    fn list(&self) -> Result<Vec<Tag>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT id, name, color, created_at, created_at FROM tags ORDER BY name ASC")
            .map_err(|e| e.to_string())?;
        let mut rows = stmt.query([]).map_err(|e| e.to_string())?;

        let mut tags = Vec::new();
        while let Some(row) = rows.next().map_err(|e| e.to_string())? {
            tags.push(Tag {
                id: row.get(0).map_err(|e| e.to_string())?,
                name: row.get(1).map_err(|e| e.to_string())?,
                color: row.get(2).map_err(|e| e.to_string())?,
                created_at: row.get(3).map_err(|e| e.to_string())?,
                updated_at: row.get(4).map_err(|e| e.to_string())?,
            });
        }

        Ok(tags)
    }

    fn create(&self, dto: CreateTagDto) -> Result<Tag, String> {
        let name = dto.name.trim().to_string();
        if name.is_empty() {
            return Err("O nome da tag não pode ser vazio".to_string());
        }

        let id = uuid::Uuid::new_v4().to_string();
        let color = dto.color.unwrap_or_else(|| "#1677FF".to_string());
        let now = now_secs();

        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
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

    fn update(&self, id: &str, dto: UpdateTagDto) -> Result<Tag, String> {
        let now = now_secs();
        let existing = self.list()?
            .into_iter()
            .find(|t| t.id == id)
            .ok_or_else(|| "Tag não encontrada".to_string())?;

        let new_name = dto.name.map(|n| n.trim().to_string()).unwrap_or(existing.name);
        let new_color = dto.color.unwrap_or(existing.color);

        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
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

    fn delete(&self, id: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM tags WHERE id = ?", params![id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    fn batch_delete(&self, ids: &[String]) -> Result<usize, String> {
        let mut count = 0;
        for id in ids {
            if self.delete(id).is_ok() {
                count += 1;
            }
        }
        Ok(count)
    }
}
