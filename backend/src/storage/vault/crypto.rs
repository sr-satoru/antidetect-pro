use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Key, Nonce,
};
use rand::RngCore;

pub const NONCE_LEN: usize = 12; // 96 bits para AES-GCM
pub const TAG_LEN: usize = 16;   // 128 bits auth tag

/// Criptografa dados em um blob binário com AES-256-GCM usando nonce aleatório e tag de autenticação
pub fn encrypt_payload(key_bytes: &[u8; 32], plaintext: &[u8]) -> Result<Vec<u8>, String> {
    let key = Key::<Aes256Gcm>::from_slice(key_bytes);
    let cipher = Aes256Gcm::new(key);

    let mut nonce_bytes = [0u8; NONCE_LEN];
    rand::rngs::OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext)
        .map_err(|e| format!("Falha de cifragem AES-GCM: {e}"))?;

    let mut blob = Vec::with_capacity(NONCE_LEN + ciphertext.len());
    blob.extend_from_slice(&nonce_bytes);
    blob.extend_from_slice(&ciphertext);

    Ok(blob)
}

/// Descriptografa um blob binário gerado pelo encrypt_payload validando integridade em tempo constante
pub fn decrypt_payload(key_bytes: &[u8; 32], payload: &[u8]) -> Result<Vec<u8>, String> {
    if payload.len() < NONCE_LEN + TAG_LEN {
        return Err("Payload corrompido ou menor que o tamanho mínimo de cabeçalho AES-GCM".to_string());
    }

    let nonce = Nonce::from_slice(&payload[..NONCE_LEN]);
    let ciphertext = &payload[NONCE_LEN..];

    let key = Key::<Aes256Gcm>::from_slice(key_bytes);
    let cipher = Aes256Gcm::new(key);

    cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| format!("Falha de autenticação ou decifragem AES-GCM: {e}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vault_crypto_roundtrip() {
        let key = [0x5au8; 32];
        let secret_text = b"super_secret_proxy_password_12345";

        let encrypted = encrypt_payload(&key, secret_text).expect("Falha ao criptografar");
        assert_ne!(&encrypted[NONCE_LEN..], secret_text);

        let decrypted = decrypt_payload(&key, &encrypted).expect("Falha ao descriptografar");
        assert_eq!(&decrypted, secret_text);
    }

    #[test]
    fn test_vault_crypto_tamper_fails() {
        let key = [0x5au8; 32];
        let secret_text = b"super_secret_proxy_password_12345";

        let mut encrypted = encrypt_payload(&key, secret_text).expect("Falha ao criptografar");
        // Adulterar um byte do ciphertext
        let last = encrypted.len() - 1;
        encrypted[last] ^= 0xff;

        assert!(decrypt_payload(&key, &encrypted).is_err(), "Decifragem deveria falhar com dado adulterado!");
    }
}
