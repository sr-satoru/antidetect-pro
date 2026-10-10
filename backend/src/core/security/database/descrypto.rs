use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};

use super::crypto::NONCE_LEN;

pub const TAG_LEN: usize = 16;

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
