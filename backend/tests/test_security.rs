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
    let key_file = temp_dir.join(".vault_key");
    assert!(key_file.exists(), ".vault_key deve ser criado no diretório para portabilidade");
    assert_eq!(std::fs::read(&key_file).unwrap().len(), 32);

    let key2 = derive_vault_key(&temp_dir).expect("Key 2 derivation failed");
    assert_eq!(key1.as_bytes(), key2.as_bytes());

    let _ = std::fs::remove_dir_all(temp_dir);
}

#[test]
fn test_portable_vault_key_simulated_machine_transfer() {
    let drive_dir = std::env::temp_dir().join(format!(
        "star_portable_drive_{}",
        std::time::SystemTime::now().elapsed().unwrap().as_nanos()
    ));
    let _ = std::fs::create_dir_all(&drive_dir);

    // Máquina A: cria a chave e criptografa dados
    let key_machine_a = derive_vault_key(&drive_dir).expect("Falha ao inicializar na máquina A");
    let secret = b"meus_cookies_e_perfis_secretos";
    let ciphertext = encrypt_payload(&key_machine_a, secret).expect("Falha ao criptografar");

    // Simula desplugar o HD e espetar na Máquina B:
    // A chave mestra .vault_key reside no próprio drive_dir
    let key_machine_b = derive_vault_key(&drive_dir).expect("Falha ao carregar na máquina B");
    assert_eq!(key_machine_a.as_bytes(), key_machine_b.as_bytes(), "A chave portátil deve ser idêntica na outra máquina");

    let decrypted = decrypt_payload(&key_machine_b, &ciphertext).expect("Falha ao descriptografar na máquina B");
    assert_eq!(decrypted, secret, "Os dados devem ser perfeitamente descriptografados na nova máquina");

    let _ = std::fs::remove_dir_all(drive_dir);
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
