use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use pbkdf2::pbkdf2_hmac;
use rand::RngCore;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::sync::Arc;
use tracing::info;

use crate::models::Profile;
use crate::service_database::data::crypto::decrypt_payload;
use crate::service_database::Vault;

const MAGIC_HEADER: &[u8; 8] = b"STARENC2";
const SALT_LEN: usize = 16;
const NONCE_LEN: usize = 12;
const PBKDF2_ROUNDS: u32 = 100_000;
const TAG_LEN: usize = 16;
const MIN_ENCRYPTED_LEN: usize = 8 + SALT_LEN + NONCE_LEN + TAG_LEN; // 52 bytes

/// Bundle unificado contendo o perfil e a sessão descriptografados do cofre local
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloudProfileBundle {
    pub version: u32,
    pub profile: Profile,
    pub session_json: Option<serde_json::Value>,
}

#[derive(Debug, Clone)]
pub struct PacoteCriptografado {
    pub bytes: Vec<u8>,
    pub hash: String,
    pub name: String,
    pub group_name: String,
    pub kernel: String,
    pub os: String,
    pub versao_alvo: i64,
}

/// Cifra um slice de bytes usando STARENC2 (PBKDF2-HMAC-SHA256 + AES-256-GCM)
/// Retorna os bytes da cápsula [MAGIC || SALT || NONCE || CIPHERTEXT+TAG] e o hash SHA-256 em hexadecimal.
pub fn cifrar_bytes(plaintext: &[u8], user_key: &str) -> Result<(Vec<u8>, String), String> {
    let mut salt = [0u8; SALT_LEN];
    rand::rngs::OsRng.fill_bytes(&mut salt);

    let mut key = [0u8; 32];
    pbkdf2_hmac::<Sha256>(user_key.as_bytes(), &salt, PBKDF2_ROUNDS, &mut key);

    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| format!("Falha ao instanciar cifra AES-256-GCM: {e}"))?;

    let mut nonce_bytes = [0u8; NONCE_LEN];
    rand::rngs::OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext)
        .map_err(|e| format!("Erro ao cifrar dados em STARENC2: {e}"))?;

    let mut output = Vec::with_capacity(8 + SALT_LEN + NONCE_LEN + ciphertext.len());
    output.extend_from_slice(MAGIC_HEADER);
    output.extend_from_slice(&salt);
    output.extend_from_slice(&nonce_bytes);
    output.extend_from_slice(&ciphertext);

    let hash = format!("{:x}", Sha256::digest(&output));
    Ok((output, hash))
}

/// Decifra uma cápsula STARENC2 utilizando a chave do usuário
pub fn decifrar_bytes(encrypted: &[u8], user_key: &str) -> Result<Vec<u8>, String> {
    if encrypted.len() < MIN_ENCRYPTED_LEN {
        return Err("Payload STARENC2 menor que o tamanho mínimo".to_string());
    }

    if &encrypted[0..8] != MAGIC_HEADER {
        return Err("Cabeçalho mágico inválido (esperado STARENC2)".to_string());
    }

    let salt = &encrypted[8..8 + SALT_LEN];
    let nonce_bytes = &encrypted[8 + SALT_LEN..8 + SALT_LEN + NONCE_LEN];
    let ciphertext = &encrypted[8 + SALT_LEN + NONCE_LEN..];

    let mut key = [0u8; 32];
    pbkdf2_hmac::<Sha256>(user_key.as_bytes(), salt, PBKDF2_ROUNDS, &mut key);

    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| format!("Chave inválida para AES-256-GCM: {e}"))?;

    let nonce = Nonce::from_slice(nonce_bytes);
    cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| format!("Falha ao decifrar cápsula STARENC2 (chave incorreta ou dados corrompidos): {e}"))
}

/// Etapa 4: Criptografia de envio.
/// Lê o perfil físico e sessão do SQLite local, empacota o CloudProfileBundle e cifra em STARENC2,
/// gerando a cápsula protegida e o hash SHA-256 sem realizar tráfego de rede.
pub fn criptografar_para_envio(
    vault: &Arc<Vault>,
    profile_id: &str,
    user_key: &str,
    versao_alvo: i64,
) -> Result<PacoteCriptografado, String> {
    info!(
        "🔐 Criptografia Envio: Empacotando e cifrando perfil físico '{}' (v{})...",
        profile_id, versao_alvo
    );

    let conn = vault.conn();
    let guard = conn
        .lock()
        .map_err(|e| format!("Erro ao acessar cofre local: {e}"))?;

    // 1. Lê e decifra o perfil no banco local SQLite
    let payload_enc: Vec<u8> = guard
        .query_row(
            "SELECT payload_enc FROM profiles WHERE id = ?1",
            rusqlite::params![profile_id],
            |row| row.get(0),
        )
        .map_err(|_| format!("Perfil '{}' não encontrado no banco físico local", profile_id))?;

    let decrypted = decrypt_payload(vault.key().as_ref(), &payload_enc)?;
    let profile: Profile = serde_json::from_slice(&decrypted)
        .map_err(|e| format!("Erro ao desserializar perfil local: {e}"))?;

    // 2. Lê e decifra a sessão efêmera (se houver)
    let session_json: Option<serde_json::Value> = guard
        .query_row(
            "SELECT session_enc FROM profile_sessions WHERE profile_id = ?1",
            rusqlite::params![profile_id],
            |row| row.get::<_, Vec<u8>>(0),
        )
        .ok()
        .and_then(|s_enc| decrypt_payload(vault.key().as_ref(), &s_enc).ok())
        .and_then(|dec| serde_json::from_slice(&dec).ok());

    let name = profile.name.clone();
    let group_name = profile.group.clone();
    let kernel = profile.kernel.clone();
    let os = profile.os.clone();

    // 3. Monta o bundle unificado internamente
    let bundle = CloudProfileBundle {
        version: versao_alvo as u32,
        profile,
        session_json,
    };

    let json_bytes = serde_json::to_vec(&bundle)
        .map_err(|e| format!("Erro ao serializar pacote de nuvem: {e}"))?;

    // 4. Cifra com STARENC2 e calcula hash SHA-256 da cápsula
    let (bytes, hash) = cifrar_bytes(&json_bytes, user_key)?;

    info!(
        "🔒 Criptografia Envio: Perfil '{}' cifrado com sucesso! Tamanho: {} bytes, Hash: {}",
        profile_id,
        bytes.len(),
        hash
    );

    Ok(PacoteCriptografado {
        bytes,
        hash,
        name,
        group_name,
        kernel,
        os,
        versao_alvo,
    })
}
