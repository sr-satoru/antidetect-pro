use std::collections::HashMap;
use std::sync::RwLock;
use std::time::{Duration, Instant};

use crate::models::RecommendedExtension;

pub struct CacheEntry {
    pub items: Vec<RecommendedExtension>,
    pub cached_at: Instant,
}

/// Módulo desacoplado de cache de extensões e catálogo
pub struct ExtensionCache {
    ttl: Duration,
    entries: RwLock<HashMap<String, CacheEntry>>,
}

impl ExtensionCache {
    pub fn new(ttl_secs: u64) -> Self {
        Self {
            ttl: Duration::from_secs(ttl_secs),
            entries: RwLock::new(HashMap::new()),
        }
    }

    /// Gera chave única normalizada para cada combinação de filtros
    pub fn build_key(query: Option<&str>, category: Option<&str>, store: Option<&str>) -> String {
        let q = query.unwrap_or("").trim().to_lowercase();
        let cat = category.unwrap_or("All").trim();
        let st = store.unwrap_or("all").trim().to_lowercase();
        format!("{q}___{cat}___{st}")
    }

    /// Obtém extensões do cache se ainda estiverem dentro do TTL
    pub fn get(
        &self,
        query: Option<&str>,
        category: Option<&str>,
        store: Option<&str>,
    ) -> Option<Vec<RecommendedExtension>> {
        let key = Self::build_key(query, category, store);
        let read_guard = self.entries.read().ok()?;
        let entry = read_guard.get(&key)?;

        if entry.cached_at.elapsed() < self.ttl {
            Some(entry.items.clone())
        } else {
            None
        }
    }

    /// Armazena itens no cache com timestamp atual
    pub fn set(
        &self,
        query: Option<&str>,
        category: Option<&str>,
        store: Option<&str>,
        items: Vec<RecommendedExtension>,
    ) {
        let key = Self::build_key(query, category, store);
        if let Ok(mut write_guard) = self.entries.write() {
            write_guard.insert(
                key,
                CacheEntry {
                    items,
                    cached_at: Instant::now(),
                },
            );
        }
    }

    /// Limpa todo o cache
    #[allow(dead_code)]
    pub fn clear(&self) {
        if let Ok(mut write_guard) = self.entries.write() {
            write_guard.clear();
        }
    }
}

impl Default for ExtensionCache {
    fn default() -> Self {
        Self::new(30 * 60) // 30 minutos de validade por padrão
    }
}
