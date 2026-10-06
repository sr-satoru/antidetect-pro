use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use pbkdf2::pbkdf2_hmac;
use rand::RngCore;
use sha2::Sha256;
use std::path::{Path, PathBuf};

use crate::security::memory_guard::ProtectedKey;

pub const NONCE_LEN: usize = 12;
pub const SALT_LEN: usize = 32;
pub const PBKDF2_ROUNDS: u32 = 100_000;

pub fn vault_salt_path(data_dir: &Path) -> PathBuf {
    data_dir.join(".vault_salt")
}

/// Obtém ou gera o sal criptográfico mestre exclusivo desta instalação do dispositivo (0600)
pub fn ensure_vault_salt(data_dir: &Path) -> Result<[u8; SALT_LEN], std::io::Error> {
    let p = vault_salt_path(data_dir);
    if let Ok(bytes) = std::fs::read(&p) {
        if bytes.len() == SALT_LEN {
            let mut salt = [0u8; SALT_LEN];
            salt.copy_from_slice(&bytes);
            return Ok(salt);
        }
    }

    let mut salt = [0u8; SALT_LEN];
    rand::rngs::OsRng.fill_bytes(&mut salt);

    if let Some(parent) = p.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    std::fs::write(&p, &salt)?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let perms = std::fs::Permissions::from_mode(0o600);
        let _ = std::fs::set_permissions(&p, perms);
    }

    Ok(salt)
}

/// Deriva uma chave de 256 bits vinculada ao sistema operacional / hardware da máquina
pub fn derive_vault_key(data_dir: &Path) -> Result<ProtectedKey, std::io::Error> {
    let salt = ensure_vault_salt(data_dir)?;

    let mut machine_seed = String::new();

    #[cfg(target_os = "linux")]
    {
        if let Ok(id) = std::fs::read_to_string("/etc/machine-id") {
            machine_seed.push_str(id.trim());
        } else if let Ok(id) = std::fs::read_to_string("/var/lib/dbus/machine-id") {
            machine_seed.push_str(id.trim());
        }
    }

    // Complementa com as variáveis do usuário do sistema operacional
    if let Ok(user) = std::env::var("USER").or_else(|_| std::env::var("USERNAME")) {
        machine_seed.push(':');
        machine_seed.push_str(&user);
    }
    if let Ok(home) = std::env::var("HOME").or_else(|_| std::env::var("USERPROFILE")) {
        machine_seed.push(':');
        machine_seed.push_str(&home);
    }

    if machine_seed.is_empty() {
        machine_seed = "star_secure_vault_hardware_root_seed".to_string();
    }

    let mut raw_key = [0u8; 32];
    pbkdf2_hmac::<Sha256>(machine_seed.as_bytes(), &salt, PBKDF2_ROUNDS, &mut raw_key);

    Ok(ProtectedKey::new(raw_key))
}

/// Criptografa dados em AES-256-GCM com nonce aleatório via OsRng para salvar no banco.
/// Aceita qualquer tipo que implemente AsRef<[u8]> (como &[u8], [u8; 32], ProtectedKey).
/// Formato da saída: [12 bytes de Nonce || Ciphertext + Tag de 16 bytes]
pub fn encrypt_payload(key: impl AsRef<[u8]>, plaintext: &[u8]) -> Result<Vec<u8>, String> {
    let key = key.as_ref();
    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|e| format!("Chave inválida para AES-256-GCM: {e}"))?;

    let mut nonce_bytes = [0u8; NONCE_LEN];
    rand::rngs::OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext)
        .map_err(|e| format!("Erro ao criptografar: {e}"))?;

    let mut result = Vec::with_capacity(NONCE_LEN + ciphertext.len());
    result.extend_from_slice(&nonce_bytes);
    result.extend_from_slice(&ciphertext);
    Ok(result)
}
