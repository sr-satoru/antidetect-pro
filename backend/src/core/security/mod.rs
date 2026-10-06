pub mod database;
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
pub use memory_guard::{harden_process_memory, ProtectedKey};

/// Comparação segura de bytes em tempo constante contra timing attacks
pub fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    let mut res = 0u8;
    for (x, y) in a.iter().zip(b.iter()) {
        res |= x ^ y;
    }
    res == 0
}
