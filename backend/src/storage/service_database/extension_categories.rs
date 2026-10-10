use super::data::Vault;
use crate::models::{CreateExtensionCategoryDto, ExtensionCategoryItem, UpdateExtensionCategoryDto};
use rusqlite::params;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

fn now_secs() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

/// Serviço de categorias/kits de extensões com persistência direta no SQLite (Star Vault)
#[derive(Clone)]
pub struct ExtensionCategoryService {
    vault: Arc<Vault>,
}

pub type ExtensionCategoryStorage = ExtensionCategoryService;

impl ExtensionCategoryService {
    pub fn new(vault: Arc<Vault>) -> Self {
        Self { vault }
    }

    pub fn list(&self) -> Vec<ExtensionCategoryItem> {
        let conn = self.vault.conn();
        let conn_guard = match conn.lock() {
            Ok(g) => g,
            Err(_) => return Vec::new(),
        };

        let mut stmt = match conn_guard.prepare(
            "SELECT id, name, description, extensions_json, is_default, created_at, updated_at 
             FROM extension_categories 
             ORDER BY is_default DESC, created_at ASC",
        ) {
            Ok(s) => s,
            Err(_) => return Vec::new(),
        };

        let mut rows = match stmt.query([]) {
            Ok(r) => r,
            Err(_) => return Vec::new(),
        };

        let mut categories = Vec::new();
        while let Ok(Some(row)) = rows.next() {
            if let (Ok(id), Ok(name), Ok(description), Ok(exts_json), Ok(is_default), Ok(created_at), Ok(updated_at)) = (
                row.get::<_, String>(0),
                row.get::<_, String>(1),
                row.get::<_, String>(2),
                row.get::<_, String>(3),
                row.get::<_, i32>(4),
                row.get::<_, i64>(5),
                row.get::<_, i64>(6),
            ) {
                let extensions: Vec<serde_json::Value> = serde_json::from_str(&exts_json).unwrap_or_default();
                let extension_ids = extensions
                    .iter()
                    .filter_map(|e| e.get("id").cloned())
                    .collect();

                categories.push(ExtensionCategoryItem {
                    id,
                    name,
                    description,
                    extension_ids,
                    extensions,
                    is_default: is_default == 1,
                    created_at,
                    updated_at,
                });
            }
        }

        categories
    }

    pub fn get(&self, id: &str) -> Option<ExtensionCategoryItem> {
        let conn = self.vault.conn();
        let conn_guard = conn.lock().ok()?;

        let mut stmt = conn_guard
            .prepare(
                "SELECT id, name, description, extensions_json, is_default, created_at, updated_at 
                 FROM extension_categories 
                 WHERE id = ? LIMIT 1",
            )
            .ok()?;
        let mut rows = stmt.query(params![id]).ok()?;

        if let Ok(Some(row)) = rows.next() {
            let id: String = row.get(0).ok()?;
            let name: String = row.get(1).ok()?;
            let description: String = row.get(2).ok()?;
            let exts_json: String = row.get(3).ok()?;
            let is_default: i32 = row.get(4).ok()?;
            let created_at: i64 = row.get(5).ok()?;
            let updated_at: i64 = row.get(6).ok()?;

            let extensions: Vec<serde_json::Value> = serde_json::from_str(&exts_json).unwrap_or_default();
            let extension_ids = extensions
                .iter()
                .filter_map(|e| e.get("id").cloned())
                .collect();

            return Some(ExtensionCategoryItem {
                id,
                name,
                description,
                extension_ids,
                extensions,
                is_default: is_default == 1,
                created_at,
                updated_at,
            });
        }

        None
    }

    pub fn create(&self, dto: CreateExtensionCategoryDto) -> Result<ExtensionCategoryItem, String> {
        let name = dto.name.trim().to_string();
        if name.is_empty() {
            return Err("Nome da categoria é obrigatório".to_string());
        }

        let id = dto
            .id
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| {
                format!(
                    "cat_{}",
                    SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis()
                )
            });

        let description = dto.description.unwrap_or_default().trim().to_string();
        let extensions = dto.extensions;
        let extensions_json = serde_json::to_string(&extensions).map_err(|e| e.to_string())?;
        let is_default = dto.is_default.unwrap_or(false) as i32;
        let now = now_secs();

        let conn = self.vault.conn();
        let conn_guard = conn.lock().map_err(|e| e.to_string())?;

        conn_guard
            .execute(
                "INSERT INTO extension_categories (id, name, description, extensions_json, is_default, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![id, name, description, extensions_json, is_default, now, now],
            )
            .map_err(|e| format!("Erro ao criar categoria de extensões: {e}"))?;

        let extension_ids = extensions
            .iter()
            .filter_map(|e| e.get("id").cloned())
            .collect();

        Ok(ExtensionCategoryItem {
            id,
            name,
            description,
            extension_ids,
            extensions,
            is_default: is_default == 1,
            created_at: now,
            updated_at: now,
        })
    }

    pub fn update(
        &self,
        id: &str,
        dto: UpdateExtensionCategoryDto,
    ) -> Result<ExtensionCategoryItem, String> {
        let current = self
            .get(id)
            .ok_or_else(|| "Categoria não encontrada".to_string())?;

        let name = dto
            .name
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .unwrap_or(current.name);

        let description = dto
            .description
            .map(|s| s.trim().to_string())
            .unwrap_or(current.description);

        let extensions = dto.extensions.unwrap_or(current.extensions);
        let extensions_json = serde_json::to_string(&extensions).map_err(|e| e.to_string())?;
        let now = now_secs();

        let conn = self.vault.conn();
        let conn_guard = conn.lock().map_err(|e| e.to_string())?;

        conn_guard
            .execute(
                "UPDATE extension_categories 
                 SET name = ?1, description = ?2, extensions_json = ?3, updated_at = ?4
                 WHERE id = ?5",
                params![name, description, extensions_json, now, id],
            )
            .map_err(|e| format!("Erro ao atualizar categoria de extensões: {e}"))?;

        let extension_ids = extensions
            .iter()
            .filter_map(|e| e.get("id").cloned())
            .collect();

        Ok(ExtensionCategoryItem {
            id: id.to_string(),
            name,
            description,
            extension_ids,
            extensions,
            is_default: current.is_default,
            created_at: current.created_at,
            updated_at: now,
        })
    }

    pub fn delete(&self, id: &str) -> Result<(), String> {
        if id == "kit_basico" {
            return Err("O kit básico padrão não pode ser excluído".to_string());
        }

        let conn = self.vault.conn();
        let conn_guard = conn.lock().map_err(|e| e.to_string())?;

        let rows_affected = conn_guard
            .execute(
                "DELETE FROM extension_categories WHERE id = ? AND is_default = 0",
                params![id],
            )
            .map_err(|e| format!("Erro ao excluir categoria de extensões: {e}"))?;

        if rows_affected == 0 {
            return Err("Categoria não encontrada ou não pode ser excluída".to_string());
        }

        Ok(())
    }
}
