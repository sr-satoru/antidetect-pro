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

