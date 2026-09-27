use aes_gcm::{
    aead::{rand_core::RngCore, Aead, KeyInit, OsRng},
    Aes256Gcm, Key, Nonce,
};
use hmac::{Hmac, Mac};
use sha2::Sha256;

type HmacSha256 = Hmac<Sha256>;

pub const MAGIC_HEADER: &[u8; 8] = b"FURYENC1";
pub const SALT_LEN: usize = 16;
pub const NONCE_LEN: usize = 12; // 96 bits para AES-GCM
#[allow(dead_code)]
pub const MIN_PAYLOAD_LEN: usize = 8 + SALT_LEN + NONCE_LEN + 16; // Cabeçalho + tag de autenticação GCM

/// Deriva uma chave criptográfica de 256 bits a partir da chave do usuário e do salt
pub fn derive_key(user_key: &str, salt: &[u8; SALT_LEN]) -> [u8; 32] {
    let mut mac = <HmacSha256 as hmac::Mac>::new_from_slice(user_key.as_bytes())
        .expect("HMAC aceita chaves de qualquer tamanho");
    mac.update(b"fury_e2ee_capsule_vault_v1");
    mac.update(salt);
    let result = mac.finalize().into_bytes();
    let mut key = [0u8; 32];
    key.copy_from_slice(&result[..32]);
    key
}

/// Cifra os bytes de uma cápsula ZIP usando AES-256-GCM Zero-Knowledge (E2EE)
pub fn encrypt_capsule(plaintext: &[u8], user_key: &str) -> Result<Vec<u8>, String> {
    let mut salt = [0u8; SALT_LEN];
    let mut nonce_bytes = [0u8; NONCE_LEN];

    OsRng.fill_bytes(&mut salt);
    OsRng.fill_bytes(&mut nonce_bytes);

    let key_bytes = derive_key(user_key, &salt);
    let key = Key::<Aes256Gcm>::from_slice(&key_bytes);
    let cipher = Aes256Gcm::new(key);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext)
        .map_err(|e| format!("Falha ao cifrar cápsula com AES-256-GCM: {}", e))?;

    let mut output = Vec::with_capacity(8 + SALT_LEN + NONCE_LEN + ciphertext.len());
    output.extend_from_slice(MAGIC_HEADER);
    output.extend_from_slice(&salt);
    output.extend_from_slice(&nonce_bytes);
    output.extend_from_slice(&ciphertext);

    Ok(output)
}

/// Descriptografa uma cápsula binária .enc validando o cabeçalho e a tag de integridade GCM
#[allow(dead_code)]
pub fn decrypt_capsule(encrypted_data: &[u8], user_key: &str) -> Result<Vec<u8>, String> {
    if encrypted_data.len() < MIN_PAYLOAD_LEN {
        return Err(format!(
            "Payload cifrado corrompido ou truncado: tamanho {} < {}",
            encrypted_data.len(),
            MIN_PAYLOAD_LEN
        ));
    }

    if &encrypted_data[..8] != MAGIC_HEADER {
        return Err("Cabeçalho inválido: o arquivo não é uma cápsula Fury E2EE válida".to_string());
    }

    let mut salt = [0u8; SALT_LEN];
    salt.copy_from_slice(&encrypted_data[8..24]);

    let mut nonce_bytes = [0u8; NONCE_LEN];
    nonce_bytes.copy_from_slice(&encrypted_data[24..36]);

    let ciphertext = &encrypted_data[36..];

    let key_bytes = derive_key(user_key, &salt);
    let key = Key::<Aes256Gcm>::from_slice(&key_bytes);
    let cipher = Aes256Gcm::new(key);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| format!("Falha de autenticação/integridade ao decifrar cápsula E2EE: {}", e))?;

    Ok(plaintext)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_e2ee_encrypt_decrypt_roundtrip() {
        let secret = "usr_4k9L2xZ_user_master_e2ee_key";
        let original_data = b"Hello, Fury Cloud E2EE! This is confidential profile cookies and tokens.";

        let encrypted = encrypt_capsule(original_data, secret).expect("Cifra com sucesso");
        assert_ne!(encrypted.as_slice(), original_data);
        assert!(encrypted.len() > original_data.len());
        assert_eq!(&encrypted[..8], MAGIC_HEADER);

        let decrypted = decrypt_capsule(&encrypted, secret).expect("Decifra com sucesso");
        assert_eq!(decrypted.as_slice(), original_data);
    }

    #[test]
    fn test_e2ee_tamper_detection() {
        let secret = "usr_test_secret";
        let original_data = b"Sensitive browser SQLite cookies";

        let mut encrypted = encrypt_capsule(original_data, secret).expect("Cifra com sucesso");
        // Adultera o último byte do ciphertext/tag
        let last_idx = encrypted.len() - 1;
        encrypted[last_idx] ^= 0xFF;

        let res = decrypt_capsule(&encrypted, secret);
        assert!(res.is_err(), "Deve falhar se o dado cifrado foi adulterado");
    }

    #[test]
    fn test_e2ee_wrong_key() {
        let original_data = b"Profile credentials";
        let encrypted = encrypt_capsule(original_data, "correct_secret").expect("Cifra");

        let res = decrypt_capsule(&encrypted, "wrong_secret");
        assert!(res.is_err(), "Deve falhar com chave incorreta");
    }
}
