use star_multlogin_backend::security::{
    constant_time_eq, decrypt_payload, derive_vault_key, encrypt_payload,
};

#[test]
fn test_constant_time_eq_matching() {
    let a = b"star_sec_1234567890abcdef1234567890abcdef";
    let b = b"star_sec_1234567890abcdef1234567890abcdef";
    assert!(constant_time_eq(a, b));
}

#[test]
fn test_constant_time_eq_different() {
    let a = b"star_sec_1234567890abcdef1234567890abcdef";
    let b = b"star_sec_1234567890abcdef1234567890abcdeg";
    assert!(!constant_time_eq(a, b));
}

#[test]
fn test_constant_time_eq_different_lengths() {
    let a = b"star_sec_short";
    let b = b"star_sec_much_longer_token";
    assert!(!constant_time_eq(a, b));
}

#[test]
fn test_derive_vault_key_consistency() {
    let temp_dir = std::env::temp_dir().join(format!(
        "star_kdf_test_{}",
        std::time::SystemTime::now().elapsed().unwrap().as_nanos()
    ));
    let _ = std::fs::create_dir_all(&temp_dir);

    let key1 = derive_vault_key(&temp_dir).expect("Key 1 derivation failed");
    let key2 = derive_vault_key(&temp_dir).expect("Key 2 derivation failed");

    assert_eq!(key1.as_bytes(), key2.as_bytes());

    let _ = std::fs::remove_dir_all(temp_dir);
}

#[test]
fn test_encrypt_decrypt_roundtrip() {
    let key = [42u8; 32];
    let original = b"star_antidetect_super_secret_payload";

    let encrypted = encrypt_payload(&key, original).expect("Falha ao criptografar");
    assert_ne!(encrypted, original);

    let decrypted = decrypt_payload(&key, &encrypted).expect("Falha ao descriptografar");
    assert_eq!(decrypted, original);
}
