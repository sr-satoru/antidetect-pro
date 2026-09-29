pub mod data;
pub mod profiles;
pub mod proxies;
pub mod tags;
pub mod extension_categories;

pub use data::Vault;
pub use profiles::ProfileService;
pub use proxies::ProxyService;
pub use tags::TagService;
pub use extension_categories::ExtensionCategoryService;

// Módulo para retrocompatibilidade com chamadas de criptografia
pub mod vault {
    pub use crate::security::crypto::{decrypt_payload, encrypt_payload};
}

// Aliases para compatibilidade direta
pub type ProfileStorage = ProfileService;
pub type ProxyStorage = ProxyService;
pub type TagStorage = TagService;
pub type ExtensionCategoryStorage = ExtensionCategoryService;
