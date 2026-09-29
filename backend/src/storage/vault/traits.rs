use crate::cloud_auth::service::PersistedAuthSession;
use crate::models::{CreateProxyDto, CreateTagDto, Profile, ProxyItem, Tag, UpdateTagDto};

/// Contrato para persistência e consulta de Perfis de navegação
pub trait ProfileRepository: Send + Sync {
    fn list(&self, search: Option<&str>, group: Option<&str>) -> Result<Vec<Profile>, String>;
    fn list_trash(&self) -> Result<Vec<Profile>, String>;
    fn get(&self, id: &str) -> Result<Option<Profile>, String>;
    fn save(&self, profile: &Profile) -> Result<(), String>;
    fn delete_soft(&self, id: &str) -> Result<(), String>;
    fn restore(&self, id: &str) -> Result<Option<Profile>, String>;
    fn delete_permanent(&self, id: &str) -> Result<(), String>;
    fn empty_trash(&self) -> Result<usize, String>;
}

/// Contrato para persistência e consulta de Proxies com credenciais seguras
pub trait ProxyRepository: Send + Sync {
    fn list(&self) -> Result<Vec<ProxyItem>, String>;
    fn create(&self, dto: CreateProxyDto) -> Result<ProxyItem, String>;
    fn delete(&self, id: &str) -> Result<(), String>;
}

/// Contrato para gerenciamento de Tags organizacionais
pub trait TagRepository: Send + Sync {
    fn list(&self) -> Result<Vec<Tag>, String>;
    fn create(&self, dto: CreateTagDto) -> Result<Tag, String>;
    fn update(&self, id: &str, dto: UpdateTagDto) -> Result<Tag, String>;
    fn delete(&self, id: &str) -> Result<(), String>;
    fn batch_delete(&self, ids: &[String]) -> Result<usize, String>;
}

/// Contrato para armazenamento protegido da sessão ativa e tokens da nuvem
pub trait AuthRepository: Send + Sync {
    fn get(&self) -> Result<Option<PersistedAuthSession>, String>;
    fn save(&self, session: &PersistedAuthSession) -> Result<(), String>;
    fn clear(&self) -> Result<(), String>;
}

/// Contrato para armazenamento do token de segurança do protocolo MCP
pub trait McpRepository: Send + Sync {
    fn get_token(&self) -> Result<Option<String>, String>;
    fn save_token(&self, token: &str) -> Result<(), String>;
}
