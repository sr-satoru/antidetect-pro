use crate::models::{CreateTagDto, Tag, UpdateTagDto};
use crate::storage::vault::traits::TagRepository;
use std::sync::Arc;

#[derive(Clone)]
pub struct TagStorage {
    repo: Arc<dyn TagRepository>,
}

impl TagStorage {
    pub fn new(repo: Arc<dyn TagRepository>) -> Self {
        Self { repo }
    }

    pub fn list(&self, search: Option<&str>) -> Vec<Tag> {
        let all = self.repo.list().unwrap_or_default();
        if let Some(q) = search.map(|s| s.trim().to_lowercase()) {
            if q.is_empty() {
                all
            } else {
                all.into_iter()
                    .filter(|t| t.name.to_lowercase().contains(&q))
                    .collect()
            }
        } else {
            all
        }
    }

    pub fn get(&self, id: &str) -> Option<Tag> {
        self.repo.list().ok()?.into_iter().find(|t| t.id == id)
    }

    pub fn create(&self, dto: CreateTagDto) -> Result<Tag, String> {
        self.repo.create(dto)
    }

    pub fn update(&self, id: &str, dto: UpdateTagDto) -> Result<Tag, String> {
        self.repo.update(id, dto)
    }

    pub fn delete(&self, id: &str) -> Result<bool, String> {
        self.repo.delete(id).map(|_| true)
    }

    pub fn delete_many(&self, ids: &[String]) -> Result<usize, String> {
        self.repo.batch_delete(ids)
    }
}
