use serde::{Deserialize, Serialize};
use std::collections::HashMap;

pub mod fire_fox;

/// Representação unificada de um Cookie compatível com Firefox (Camoufox) e navegadores modernos
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct UnifiedCookie {
    pub name: String,
    pub value: String,
    pub domain: String,
    pub path: String,
    pub expiry: Option<i64>,
    pub is_secure: bool,
    pub is_http_only: bool,
    pub same_site: String,
}

/// Resumo quantitativo de cookies por domínio
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DomainSummary {
    pub domain: String,
    pub count: usize,
}

/// Estatísticas de cookies extraídos do perfil
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CookieStats {
    pub total_count: usize,
    pub domains: Vec<DomainSummary>,
    pub cookies: Vec<UnifiedCookie>,
}

/// Resultado da operação de importação / injeção de cookies
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ImportCookieResult {
    pub imported: usize,
    pub skipped: usize,
    pub errors: Vec<String>,
}

/// Item de armazenamento local (LocalStorage / SessionStorage)
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct StorageItem {
    pub origin: String,
    pub key: String,
    pub value: String,
}

/// Sessão unificada completa (Cookies + LocalStorage / Tokens)
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct UnifiedSession {
    pub cookies: Vec<UnifiedCookie>,
    /// Mapeamento de Origem -> (Chave -> Valor de LocalStorage)
    pub local_storage: HashMap<String, HashMap<String, String>>,
    pub total_cookies: usize,
    pub total_storage_items: usize,
}
