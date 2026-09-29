pub mod database;
pub mod mcp_api;
pub mod memory_guard;

// Módulos para retrocompatibilidade direta com referências legadas
pub mod crypto {
    pub use super::database::crypto::encrypt_payload;
    pub use super::database::descrypto::decrypt_payload;
}

pub mod kdf {
    pub use super::database::crypto::{derive_vault_key, ensure_vault_salt, vault_salt_path};
}

pub use database::crypto::{derive_vault_key, encrypt_payload, ensure_vault_salt};
pub use database::descrypto::decrypt_payload;
pub use mcp_api::crypto::rotate_token;
pub use mcp_api::descrypto::ensure_token;
pub use memory_guard::{harden_process_memory, ProtectedKey};
