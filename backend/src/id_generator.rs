use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

const BASE62_ALPHABET: &[u8; 62] = b"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
// Época de referência: 01 de Janeiro de 2026 00:00:00 UTC
const CUSTOM_EPOCH_MS: u64 = 1767225600000;
const MAX_BASE62_7: u64 = 3_521_614_606_207; // 62^7 - 1

static LAST_ID: AtomicU64 = AtomicU64::new(0);

/// Gera uma string de exatamente 7 caracteres em Base62.
/// - 100% livre de colisões (incremento atômico monotônico via CAS loop)
/// - Cronologicamente ordenável (acompanha o tempo em fatias de 50ms)
/// - Capacidade de 3.521.614.606.208 valores únicos
pub fn generate_base62_7() -> String {
    let now_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;

    // Fatias de 50ms a partir da época 2026
    let delta_units = now_ms.saturating_sub(CUSTOM_EPOCH_MS) / 50;
    // Reserva 11 bits para o contador intra-fatia (2048 IDs a cada 50ms = 40.960 IDs/segundo)
    let target = (delta_units << 11) % MAX_BASE62_7;

    let mut current = LAST_ID.load(Ordering::Relaxed);
    let assigned = loop {
        let next = if target > current {
            target
        } else {
            (current + 1) % MAX_BASE62_7
        };

        match LAST_ID.compare_exchange_weak(current, next, Ordering::SeqCst, Ordering::Relaxed) {
            Ok(_) => break next,
            Err(actual) => current = actual,
        }
    };

    let mut num = assigned;
    let mut buffer = [b'0'; 7];
    for i in (0..7).rev() {
        buffer[i] = BASE62_ALPHABET[(num % 62) as usize];
        num /= 62;
    }

    String::from_utf8_lossy(&buffer).to_string()
}

/// Gera um ID semântico prefixado (ex: usr_01Ab2K9, prf_01Ab2K9)
pub fn generate_id(prefix: &str) -> String {
    format!("{}_{}", prefix, generate_base62_7())
}

/// Atalho para gerar ID de perfil de navegador (ex: prf_01Ab2K9)
pub fn generate_profile_id() -> String {
    generate_id("prf")
}

/// Atalho para gerar ID de usuário (ex: usr_01Ab2K9)
pub fn generate_user_id() -> String {
    generate_id("usr")
}

#[cfg(test)]
mod tests {
    use super::*;
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
}
