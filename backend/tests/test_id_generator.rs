use star_multlogin_backend::id_generator::{
    generate_base62_7, generate_profile_id, generate_user_id,
};
use std::collections::HashSet;

#[test]
fn test_length_and_characters() {
    let id = generate_base62_7();
    assert_eq!(id.len(), 7);
    for c in id.chars() {
        assert!(c.is_ascii_alphanumeric());
    }
}

#[test]
fn test_uniqueness_under_high_volume() {
    let mut set = HashSet::new();
    // Gera 50.000 IDs consecutivos em sequência imediata
    for _ in 0..50_000 {
        let id = generate_base62_7();
        assert!(set.insert(id), "Colisão detectada!");
    }
    assert_eq!(set.len(), 50_000);
}

#[test]
fn test_chronological_ordering() {
    let id1 = generate_base62_7();
    let id2 = generate_base62_7();
    let id3 = generate_base62_7();

    assert!(id1 < id2, "id1 ({}) deve ser menor que id2 ({})", id1, id2);
    assert!(id2 < id3, "id2 ({}) deve ser menor que id3 ({})", id2, id3);
}

#[test]
fn test_prefixed_ids() {
    let prf_id = generate_profile_id();
    assert!(prf_id.starts_with("prf_"));
    assert_eq!(prf_id.len(), 11); // "prf_" (4) + 7 chars

    let usr_id = generate_user_id();
    assert!(usr_id.starts_with("usr_"));
    assert_eq!(usr_id.len(), 11); // "usr_" (4) + 7 chars
}
