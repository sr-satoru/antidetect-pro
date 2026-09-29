use crate::models::{CreateProxyDto, ProxyItem};
use crate::storage::vault::traits::ProxyRepository;
use std::sync::Arc;

#[derive(Clone)]
pub struct ProxyStorage {
    repo: Arc<dyn ProxyRepository>,
}

impl ProxyStorage {
    pub fn new(repo: Arc<dyn ProxyRepository>) -> Self {
        Self { repo }
    }

    pub fn list(&self) -> Vec<ProxyItem> {
        self.repo.list().unwrap_or_default()
    }

    pub fn create(&self, dto: CreateProxyDto) -> Result<ProxyItem, String> {
        self.repo.create(dto)
    }

    pub fn delete(&self, id: &str) -> Result<(), String> {
        self.repo.delete(id)
    }
}
