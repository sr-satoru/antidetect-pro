use super::types::PkcePair;
use base64::Engine;
use rand::RngCore;
use sha2::{Digest, Sha256};
use uuid::Uuid;

/// Módulo de Criptografia PKCE pura.
/// Totalmente isolado de rede e banco de dados.
pub struct PkceEngine;

impl PkceEngine {
    /// Gera par criptográfico S256: code_verifier de 48 bytes e code_challenge SHA-256
    pub fn generate_pair() -> PkcePair {
        let mut random_bytes = [0u8; 48];
        rand::thread_rng().fill_bytes(&mut random_bytes);
        let code_verifier =
            base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(random_bytes);

        let hash = Sha256::digest(code_verifier.as_bytes());
        let code_challenge =
            base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(hash);

        PkcePair {
            code_verifier,
            code_challenge,
        }
    }

    /// Gera UUID para nonce state anti-CSRF
    pub fn generate_state() -> String {
        Uuid::new_v4().to_string()
    }
}
