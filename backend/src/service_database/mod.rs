pub mod data;
pub mod profiles;
pub mod proxies;
pub mod tags;

pub use data::Vault;
pub use profiles::ProfileService;
pub use proxies::ProxyService;
pub use tags::TagService;

// Aliases para compatibilidade direta
pub type ProfileStorage = ProfileService;
pub type ProxyStorage = ProxyService;
pub type TagStorage = TagService;
