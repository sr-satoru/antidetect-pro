use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use rand::RngCore;

const NONCE_LEN: usize = 12;
const TAG_LEN: usize = 16;

/// Criptografa dados em AES-256-GCM com nonce aleatório via OsRng.
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

/// Descriptografa dados em AES-256-GCM extraindo o nonce dos primeiros 12 bytes.
pub fn decrypt_payload(key: impl AsRef<[u8]>, payload: &[u8]) -> Result<Vec<u8>, String> {
    let key = key.as_ref();
    if payload.len() < NONCE_LEN + TAG_LEN {
        return Err("Payload menor que o tamanho mínimo de encriptação".to_string());
    }

    let cipher = Aes256Gcm::new_from_slice(key)
        .map_err(|e| format!("Chave inválida para AES-256-GCM: {e}"))?;

    let (nonce_bytes, ciphertext) = payload.split_at(NONCE_LEN);
    let nonce = Nonce::from_slice(nonce_bytes);

    cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| format!("Falha na decriptação (chave incorreta ou payload corrompido): {e}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt_roundtrip() {
        let key = [42u8; 32];
        let original = b"star_antidetect_super_secret_payload";

        let encrypted = encrypt_payload(&key, original).expect("Falha ao criptografar");
        assert_ne!(encrypted, original);

        let decrypted = decrypt_payload(&key, &encrypted).expect("Falha ao descriptografar");
        assert_eq!(decrypted, original);
    }
}
