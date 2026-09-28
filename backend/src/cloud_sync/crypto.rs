use aes_gcm::{
    aead::{rand_core::RngCore, Aead, KeyInit, OsRng},
    Aes256Gcm, Key, Nonce,
};
use hmac::{Hmac, Mac};
use pbkdf2::pbkdf2_hmac;
use sha2::Sha256;

type HmacSha256 = Hmac<Sha256>;

pub const MAGIC_HEADER_V1: &[u8; 8] = b"FURYENC1";
pub const MAGIC_HEADER_V2: &[u8; 8] = b"FURYENC2";
pub const MAGIC_HEADER: &[u8; 8] = MAGIC_HEADER_V2;

pub const SALT_LEN: usize = 16;
pub const NONCE_LEN: usize = 12; // 96 bits para AES-GCM
pub const PBKDF2_ROUNDS: u32 = 100_000;
pub const MIN_PAYLOAD_LEN: usize = 8 + SALT_LEN + NONCE_LEN + 16; // Cabeçalho + tag de autenticação GCM

/// Deriva uma chave de 256 bits via PBKDF2-HMAC-SHA256 com 100.000 iterações (Padrão FURYENC2)
pub fn derive_key_v2(user_key: &str, salt: &[u8; SALT_LEN]) -> [u8; 32] {
    let mut key = [0u8; 32];
    pbkdf2_hmac::<Sha256>(user_key.as_bytes(), salt, PBKDF2_ROUNDS, &mut key);
    key
}

/// Derivação legado (FURYENC1) via HMAC-SHA256 de 1 rodada para compatibilidade retroativa
pub fn derive_key_v1(user_key: &str, salt: &[u8; SALT_LEN]) -> [u8; 32] {
    let mut mac = <HmacSha256 as hmac::Mac>::new_from_slice(user_key.as_bytes())
        .expect("HMAC aceita chaves de qualquer tamanho");
    mac.update(b"fury_e2ee_capsule_vault_v1");
    mac.update(salt);
    let result = mac.finalize().into_bytes();
    let mut key = [0u8; 32];
    key.copy_from_slice(&result[..32]);
    key
}

/// Alias padrão para a versão corrente (V2)
pub fn derive_key(user_key: &str, salt: &[u8; SALT_LEN]) -> [u8; 32] {
    derive_key_v2(user_key, salt)
}

/// Cifra os bytes de uma cápsula ZIP usando AES-256-GCM Zero-Knowledge (E2EE) com FURYENC2 + PBKDF2
pub fn encrypt_capsule(plaintext: &[u8], user_key: &str) -> Result<Vec<u8>, String> {
    let mut salt = [0u8; SALT_LEN];
    let mut nonce_bytes = [0u8; NONCE_LEN];

    OsRng.fill_bytes(&mut salt);
    OsRng.fill_bytes(&mut nonce_bytes);

    let key_bytes = derive_key_v2(user_key, &salt);
    let key = Key::<Aes256Gcm>::from_slice(&key_bytes);
    let cipher = Aes256Gcm::new(key);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext)
        .map_err(|e| format!("Falha ao cifrar cápsula com AES-256-GCM: {}", e))?;

    let mut output = Vec::with_capacity(8 + SALT_LEN + NONCE_LEN + ciphertext.len());
    output.extend_from_slice(MAGIC_HEADER_V2);
    output.extend_from_slice(&salt);
    output.extend_from_slice(&nonce_bytes);
    output.extend_from_slice(&ciphertext);

    Ok(output)
}

/// Descriptografa uma cápsula binária .enc validando o cabeçalho (FURYENC2 ou FURYENC1) e a tag de integridade GCM
pub fn decrypt_capsule(encrypted_data: &[u8], user_key: &str) -> Result<Vec<u8>, String> {
    if encrypted_data.len() < MIN_PAYLOAD_LEN {
        return Err(format!(
            "Payload cifrado corrompido ou truncado: tamanho {} < {}",
            encrypted_data.len(),
            MIN_PAYLOAD_LEN
        ));
    }

    let header = &encrypted_data[..8];
    let key_bytes = if header == MAGIC_HEADER_V2 {
        let mut salt = [0u8; SALT_LEN];
        salt.copy_from_slice(&encrypted_data[8..24]);
        derive_key_v2(user_key, &salt)
    } else if header == MAGIC_HEADER_V1 {
        let mut salt = [0u8; SALT_LEN];
        salt.copy_from_slice(&encrypted_data[8..24]);
        derive_key_v1(user_key, &salt)
    } else {
        return Err(format!(
            "Cabeçalho inválido ({:?}): o arquivo não é uma cápsula Fury E2EE válida",
            String::from_utf8_lossy(header)
        ));
    };

    let mut nonce_bytes = [0u8; NONCE_LEN];
    nonce_bytes.copy_from_slice(&encrypted_data[24..36]);
    let ciphertext = &encrypted_data[36..];

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
    fn test_e2ee_v2_encrypt_decrypt_roundtrip() {
        let secret = "usr_4k9L2xZ_user_master_e2ee_key";
        let original_data = b"Hello, Fury Cloud E2EE V2 with PBKDF2! This is confidential profile cookies and tokens.";

        let encrypted = encrypt_capsule(original_data, secret).expect("Cifra com sucesso");
        assert_ne!(encrypted.as_slice(), original_data);
        assert!(encrypted.len() > original_data.len());
        assert_eq!(&encrypted[..8], MAGIC_HEADER_V2);

        let decrypted = decrypt_capsule(&encrypted, secret).expect("Decifra com sucesso");
        assert_eq!(decrypted.as_slice(), original_data);
    }

    #[test]
    fn test_e2ee_v1_backwards_compatibility() {
        let secret = "usr_legacy_secret_key";
        let original_data = b"Capsule encrypted in older Fury version (V1 HMAC)";

        // Simula criação manual de uma cápsula V1
        let mut salt = [0u8; SALT_LEN];
        let mut nonce_bytes = [0u8; NONCE_LEN];
        OsRng.fill_bytes(&mut salt);
        OsRng.fill_bytes(&mut nonce_bytes);

        let key_bytes = derive_key_v1(secret, &salt);
        let key = Key::<Aes256Gcm>::from_slice(&key_bytes);
        let cipher = Aes256Gcm::new(key);
        let nonce = Nonce::from_slice(&nonce_bytes);

        let ciphertext = cipher.encrypt(nonce, original_data.as_ref()).unwrap();

        let mut v1_payload = Vec::new();
        v1_payload.extend_from_slice(MAGIC_HEADER_V1);
        v1_payload.extend_from_slice(&salt);
        v1_payload.extend_from_slice(&nonce_bytes);
        v1_payload.extend_from_slice(&ciphertext);

        // Testa se o novo decrypt_capsule consegue decifrar cápsulas legadas V1 com perfeição
        let decrypted = decrypt_capsule(&v1_payload, secret).expect("Deve decifrar V1 com sucesso");
        assert_eq!(decrypted.as_slice(), original_data);
    }

    #[test]
    fn test_e2ee_tamper_detection() {
        let secret = "usr_test_secret";
        let original_data = b"Sensitive browser SQLite cookies";

        let mut encrypted = encrypt_capsule(original_data, secret).expect("Cifra com sucesso");
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
