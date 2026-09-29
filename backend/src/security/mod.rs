pub mod kdf;
pub mod memory_guard;

pub use kdf::derive_vault_key;
pub use memory_guard::{harden_process_memory, ProtectedKey, SplitKey};
