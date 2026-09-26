use crate::models::{CreateTagDto, Tag, UpdateTagDto};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::RwLock;
use std::time::{SystemTime, UNIX_EPOCH};

pub struct TagStorage {
    file_path: PathBuf,
    cache: RwLock<Vec<Tag>>,
}

impl TagStorage {
    pub fn new<P: AsRef<Path>>(data_dir: P) -> Self {
        let dir = data_dir.as_ref();
        let _ = fs::create_dir_all(dir);
        let file_path = dir.join("tags.json");

        let tags = if file_path.exists() {
            fs::read_to_string(&file_path)
                .ok()
                .and_then(|content| serde_json::from_str::<Vec<Tag>>(&content).ok())
                .unwrap_or_default()
        } else {
            Vec::new()
        };

        Self {
            file_path,
            cache: RwLock::new(tags),
        }
    }

    fn now_secs() -> i64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as i64
    }

    fn persist_locked(&self, tags: &[Tag]) -> Result<(), String> {
        let content = serde_json::to_string_pretty(tags)
            .map_err(|e| format!("Erro ao serializar etiquetas: {}", e))?;
        fs::write(&self.file_path, content)
            .map_err(|e| format!("Erro ao salvar arquivo tags.json: {}", e))?;
        Ok(())
    }

    pub fn list(&self, search: Option<&str>) -> Vec<Tag> {
        let cache = self.cache.read().unwrap();
        let mut list: Vec<Tag> = if let Some(q) = search.map(|s| s.trim().to_lowercase()) {
            if q.is_empty() {
                cache.clone()
            } else {
                cache
                    .iter()
                    .filter(|t| t.name.to_lowercase().contains(&q))
                    .cloned()
                    .collect()
            }
        } else {
            cache.clone()
        };

        // Ordenação alfabética por padrão
        list.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
        list
    }

    pub fn get(&self, id: &str) -> Option<Tag> {
        let cache = self.cache.read().unwrap();
        cache.iter().find(|t| t.id == id).cloned()
    }

    pub fn create(&self, dto: CreateTagDto) -> Result<Tag, String> {
        let name = dto.name.trim().to_string();
        if name.is_empty() {
            return Err("Nome da etiqueta não pode ser vazio".to_string());
        }

        let mut cache = self.cache.write().unwrap();
        let now = Self::now_secs();
        let tag = Tag {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            color: dto.color.unwrap_or_else(|| "#1677FF".to_string()),
            created_at: now,
            updated_at: now,
        };

        cache.push(tag.clone());
        self.persist_locked(&cache)?;
        Ok(tag)
    }

    pub fn update(&self, id: &str, dto: UpdateTagDto) -> Result<Tag, String> {
        let mut cache = self.cache.write().unwrap();
        let tag = cache
            .iter_mut()
            .find(|t| t.id == id)
            .ok_or_else(|| format!("Etiqueta com id '{}' não encontrada", id))?;

        if let Some(new_name) = dto.name {
            let trimmed = new_name.trim().to_string();
            if !trimmed.is_empty() {
                tag.name = trimmed;
            }
        }

        if let Some(new_color) = dto.color {
            let trimmed = new_color.trim().to_string();
            if !trimmed.is_empty() {
                tag.color = trimmed;
            }
        }

        tag.updated_at = Self::now_secs();
        let updated = tag.clone();
        self.persist_locked(&cache)?;
        Ok(updated)
    }

    pub fn delete(&self, id: &str) -> Result<bool, String> {
        let mut cache = self.cache.write().unwrap();
        let initial_len = cache.len();
        cache.retain(|t| t.id != id);
        if cache.len() < initial_len {
            self.persist_locked(&cache)?;
            Ok(true)
        } else {
            Ok(false)
        }
    }

    pub fn delete_many(&self, ids: &[String]) -> Result<usize, String> {
        let mut cache = self.cache.write().unwrap();
        let initial_len = cache.len();
        cache.retain(|t| !ids.contains(&t.id));
        let removed = initial_len - cache.len();
        if removed > 0 {
            self.persist_locked(&cache)?;
        }
        Ok(removed)
    }
}
