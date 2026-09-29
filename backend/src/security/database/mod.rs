pub mod crypto;
pub mod descrypto;

pub use crypto::{derive_vault_key, ensure_vault_salt, encrypt_payload, vault_salt_path};
pub use descrypto::decrypt_payload;
