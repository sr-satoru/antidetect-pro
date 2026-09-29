pub mod crypto;
pub mod kdf;
pub mod memory_guard;

pub use crypto::{decrypt_payload, encrypt_payload};
pub use kdf::derive_vault_key;
pub use memory_guard::{harden_process_memory, ProtectedKey};
