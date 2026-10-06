pub mod data;
pub mod extension_categories;
pub mod profiles;
pub mod proxies;
pub mod sessions;
pub mod tags;

pub use data::Vault;
pub use extension_categories::ExtensionCategoryService;
pub use profiles::ProfileService;
pub use proxies::ProxyService;
pub use sessions::SessionService;
pub use tags::TagService;

// Módulo para retrocompatibilidade com chamadas de criptografia
pub mod vault {
    pub use crate::security::crypto::{decrypt_payload, encrypt_payload};
}

// Aliases para compatibilidade direta
pub type ProfileStorage = ProfileService;
pub type ProxyStorage = ProxyService;
pub type TagStorage = TagService;
pub type ExtensionCategoryStorage = ExtensionCategoryService;
pub type SessionStorage = SessionService;

