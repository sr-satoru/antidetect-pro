use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Key, Nonce,
};
use axum::{
    extract::{Request, State},
    http::{header, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use pbkdf2::pbkdf2_hmac;
use rand::RngCore;
use serde_json::json;
use sha2::Sha256;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::sync::RwLock;

pub const TOKEN_MAGIC: &[u8; 8] = b"STARMCP1";
pub const NONCE_LEN: usize = 12; // 96 bits para AES-GCM
pub const SALT_LEN: usize = 16;
pub const PBKDF2_ROUNDS: u32 = 100_000;

/// Estado compartilhado para armazenamento e rotação segura do token de automação em memória e disco
#[derive(Clone)]
pub struct TokenState {
    pub token: Arc<RwLock<String>>,
    pub data_dir: PathBuf,
}

impl TokenState {
    pub fn new(initial_token: String, data_dir: PathBuf) -> Self {
        Self {
            token: Arc::new(RwLock::new(initial_token)),
            data_dir,
        }
    }

    /// Retorna o valor atual do token decifrado em memória
    pub async fn get_token(&self) -> String {
        self.token.read().await.clone()
    }

    /// Valida se um token fornecido (ex: via URL ou header) é idêntico ao ativo em tempo constante
    pub async fn is_valid_token(&self, candidate: &str) -> bool {
        let current = self.get_token().await;
        constant_time_eq(current.as_bytes(), candidate.as_bytes())
    }

    /// Rotaciona o token gravando cifrado no disco com 0600 e atualizando a memória RAM
    pub async fn refresh_token(&self) -> Result<String, std::io::Error> {
        let new_token = rotate_token(&self.data_dir)?;
        let mut lock = self.token.write().await;
        *lock = new_token.clone();
        Ok(new_token)
    }
}

/// Retorna o caminho do arquivo do token cifrado em repouso
pub fn encrypted_token_path(data_dir: &Path) -> PathBuf {
    data_dir.join("api-token.enc")
}

/// Retorna o caminho do arquivo do token legado em texto puro (usado apenas para migração)
pub fn legacy_plaintext_token_path(data_dir: &Path) -> PathBuf {
    data_dir.join("api-token")
}

/// Retorna o caminho do salt local da máquina
pub fn salt_path(data_dir: &Path) -> PathBuf {
    data_dir.join(".mcp_salt")
}

/// Obtém ou gera o salt estável exclusivo desta instalação da máquina (com permissões 0600)
pub fn ensure_local_salt(data_dir: &Path) -> Result<[u8; SALT_LEN], std::io::Error> {
    let p = salt_path(data_dir);
    if let Ok(bytes) = std::fs::read(&p) {
        if bytes.len() == SALT_LEN {
            let mut salt = [0u8; SALT_LEN];
            salt.copy_from_slice(&bytes);
            return Ok(salt);
        }
    }

    let mut salt = [0u8; SALT_LEN];
    rand::rngs::OsRng.fill_bytes(&mut salt);

    if let Some(parent) = p.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    std::fs::write(&p, &salt)?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let perms = std::fs::Permissions::from_mode(0o600);
        let _ = std::fs::set_permissions(&p, perms);
    }

    Ok(salt)
}

/// Deriva uma chave de 256 bits atrelada ao hardware da máquina via Argon2id/PBKDF2-HMAC-SHA256
pub fn derive_machine_key(data_dir: &Path) -> Result<[u8; 32], std::io::Error> {
    let salt = ensure_local_salt(data_dir)?;

    // Identificador único da máquina no SO
    let mut machine_seed = String::new();

    #[cfg(target_os = "linux")]
    {
        if let Ok(id) = std::fs::read_to_string("/etc/machine-id") {
            machine_seed.push_str(id.trim());
        } else if let Ok(id) = std::fs::read_to_string("/var/lib/dbus/machine-id") {
            machine_seed.push_str(id.trim());
        }
    }

    // Complementa com o usuário e hostname da sessão
    if let Ok(user) = std::env::var("USER").or_else(|_| std::env::var("USERNAME")) {
        machine_seed.push(':');
        machine_seed.push_str(&user);
    }
    if let Ok(home) = std::env::var("HOME").or_else(|_| std::env::var("USERPROFILE")) {
        machine_seed.push(':');
        machine_seed.push_str(&home);
    }

    if machine_seed.is_empty() {
        machine_seed = "star_default_hardware_bound_secret_seed".to_string();
    }

    let mut key = [0u8; 32];
    pbkdf2_hmac::<Sha256>(machine_seed.as_bytes(), &salt, PBKDF2_ROUNDS, &mut key);
    Ok(key)
}

pub const SESSION_MAGIC: &[u8; 8] = b"STARSES1";

/// Criptografa um arquivo arbitrário no disco com AES-256-GCM usando chave vinculada à máquina e permissões 0600
pub fn encrypt_file_for_machine(
    data_dir: &Path,
    file_path: &Path,
    plaintext: &[u8],
    magic: &[u8; 8],
) -> Result<(), std::io::Error> {
    let key_bytes = derive_machine_key(data_dir)?;
    let key = Key::<Aes256Gcm>::from_slice(&key_bytes);
    let cipher = Aes256Gcm::new(key);

    let mut nonce_bytes = [0u8; NONCE_LEN];
    rand::rngs::OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, format!("AES-GCM encryption error: {e}")))?;

    let mut payload = Vec::with_capacity(magic.len() + NONCE_LEN + ciphertext.len());
    payload.extend_from_slice(magic);
    payload.extend_from_slice(&nonce_bytes);
    payload.extend_from_slice(&ciphertext);

    if let Some(parent) = file_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    std::fs::write(file_path, &payload)?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let perms = std::fs::Permissions::from_mode(0o600);
        let _ = std::fs::set_permissions(file_path, perms);
    }

    Ok(())
}

/// Descriptografa um arquivo a partir do disco usando a chave vinculada à máquina
pub fn decrypt_file_from_machine(
    data_dir: &Path,
    file_path: &Path,
    magic: &[u8; 8],
) -> Result<Vec<u8>, std::io::Error> {
    let payload = std::fs::read(file_path)?;

    let min_len = magic.len() + NONCE_LEN + 16;
    if payload.len() < min_len || &payload[..magic.len()] != magic {
        return Err(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            format!("Arquivo {:?} corrompido ou cabeçalho mágico inválido", file_path),
        ));
    }

    let nonce_start = magic.len();
    let nonce_end = nonce_start + NONCE_LEN;
    let nonce = Nonce::from_slice(&payload[nonce_start..nonce_end]);
    let ciphertext = &payload[nonce_end..];

    let key_bytes = derive_machine_key(data_dir)?;
    let key = Key::<Aes256Gcm>::from_slice(&key_bytes);
    let cipher = Aes256Gcm::new(key);

    cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::PermissionDenied, format!("Falha de autenticação/decifragem AES-GCM: {e}")))
}

/// Criptografa o token de automação no disco com AES-256-GCM e permissões POSIX 0600
pub fn encrypt_token_to_disk(data_dir: &Path, token: &str) -> Result<(), std::io::Error> {
    let path = encrypted_token_path(data_dir);
    encrypt_file_for_machine(data_dir, &path, token.as_bytes(), TOKEN_MAGIC)
}

/// Descriptografa o token de automação a partir do disco usando a chave atrelada ao hardware
pub fn decrypt_token_from_disk(data_dir: &Path) -> Result<String, std::io::Error> {
    let path = encrypted_token_path(data_dir);
    let plaintext = decrypt_file_from_machine(data_dir, &path, TOKEN_MAGIC)?;
    String::from_utf8(plaintext)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, format!("Token UTF-8 inválido: {e}")))
}

/// Lê o token existente em disco (decifrando api-token.enc ou migrando texto puro) ou gera novo token
pub fn ensure_token(data_dir: &Path) -> Result<String, std::io::Error> {
    // 1. Tenta carregar do formato seguro criptografado
    if let Ok(decrypted) = decrypt_token_from_disk(data_dir) {
        let trimmed = decrypted.trim().to_string();
        if !trimmed.is_empty() {
            // Remove qualquer resquício legado em texto puro se ainda existir
            let legacy_path = legacy_plaintext_token_path(data_dir);
            if legacy_path.exists() {
                let _ = std::fs::remove_file(legacy_path);
            }
            return Ok(trimmed);
        }
    }

    // 2. Migração transparente de versão legada em texto puro (se existir)
    let legacy_path = legacy_plaintext_token_path(data_dir);
    if let Ok(existing) = std::fs::read_to_string(&legacy_path) {
        let trimmed = existing.trim().to_string();
        if !trimmed.is_empty() {
            encrypt_token_to_disk(data_dir, &trimmed)?;
            let _ = std::fs::remove_file(&legacy_path);
            return Ok(trimmed);
        }
    }

    // 3. Se não houver nenhum token salvo, gera um novo com alta entropia
    rotate_token(data_dir)
}

/// Gera um novo token aleatório de 256 bits via OsRng do kernel e grava em disco cifrado com 0600
pub fn rotate_token(data_dir: &Path) -> Result<String, std::io::Error> {
    let mut bytes = [0u8; 32];
    rand::rngs::OsRng.fill_bytes(&mut bytes);

    let token = format!("star_sec_{}", hex::encode(bytes));
    encrypt_token_to_disk(data_dir, &token)?;

    // Garante que nenhum arquivo em texto puro permaneça
    let legacy = legacy_plaintext_token_path(data_dir);
    if legacy.exists() {
        let _ = std::fs::remove_file(legacy);
    }

    Ok(token)
}

/// Comparação em tempo constante (contra timing attacks / side-channel leaks)
pub fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    a.iter().zip(b).fold(0u8, |acc, (x, y)| acc | (x ^ y)) == 0
}

/// 1. Middleware Anti-Origin: Rejeita qualquer requisição vinda de sites externos da internet (403 origin_present)
pub async fn anti_origin_middleware(req: Request, next: Next) -> Response {
    if let Some(origin) = req.headers().get(header::ORIGIN).and_then(|h| h.to_str().ok()) {
        let is_local_origin = origin.starts_with("http://localhost:")
            || origin.starts_with("http://127.0.0.1:")
            || origin.starts_with("tauri://")
            || origin.starts_with("app://")
            || origin == "null";

        if !is_local_origin {
            return (
                StatusCode::FORBIDDEN,
                Json(json!({
                    "error": "origin_present",
                    "message": "This endpoint refuses requests from external websites."
                })),
            )
                .into_response();
        }
    }

    next.run(req).await
}

/// 2. Middleware Anti-DNS Rebinding: Valida estritamente se o Host é endereço de loopback (403 bad_host)
pub async fn host_validation_middleware(req: Request, next: Next) -> Response {
    let host_ok = req
        .headers()
        .get(header::HOST)
        .and_then(|h| h.to_str().ok())
        .map(|h| {
            let name = h.rsplit_once(':').map(|(n, _)| n).unwrap_or(h);
            name == "127.0.0.1" || name == "localhost" || name == "[::1]"
        })
        .unwrap_or(false);

    if !host_ok {
        return (
            StatusCode::FORBIDDEN,
            Json(json!({
                "error": "bad_host",
                "message": "Address this by its loopback address."
            })),
        )
            .into_response();
    }

    next.run(req).await
}

/// 3. Middleware Bearer Auth: Valida o token local em tempo constante (401 unauthenticated)
pub async fn bearer_auth_middleware(
    State(token_state): State<TokenState>,
    req: Request,
    next: Next,
) -> Response {
    let auth_header = req
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok())
        .and_then(|h| h.strip_prefix("Bearer "))
        .map(|token| token.trim());

    let is_authorized = match auth_header {
        Some(presented) => token_state.is_valid_token(presented).await,
        None => false,
    };

    if !is_authorized {
        return (
            StatusCode::UNAUTHORIZED,
            Json(json!({
                "error": "unauthenticated",
                "message": "Send the token from the api-token file as a bearer token."
            })),
        )
            .into_response();
    }

    next.run(req).await
}

/// Função utilitária simples para encode hexadecimal sem dependência externa
mod hex {
    pub fn encode(bytes: [u8; 32]) -> String {
        let mut s = String::with_capacity(64);
        for b in bytes {
            use std::fmt::Write;
            let _ = write!(s, "{:02x}", b);
        }
        s
    }
}

#[cfg(test)]
mod tests {
    use super::*;

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
    fn test_encryption_and_persistence() {
        let temp_dir = std::env::temp_dir().join(format!("star_mcp_test_{}", std::time::SystemTime::now().elapsed().unwrap().as_nanos()));
        let _ = std::fs::create_dir_all(&temp_dir);

        // 1. Gera token inicial
        let token1 = ensure_token(&temp_dir).expect("Falha ao gerar token");
        assert!(token1.starts_with("star_sec_"));
        assert_eq!(token1.len(), 9 + 64);

        // Verifica que o arquivo em disco é binário cifrado e não texto puro
        let enc_path = encrypted_token_path(&temp_dir);
        assert!(enc_path.exists());
        let raw_disk = std::fs::read(&enc_path).unwrap();
        assert!(&raw_disk[..TOKEN_MAGIC.len()] == TOKEN_MAGIC);
        let raw_str = String::from_utf8_lossy(&raw_disk);
        assert!(!raw_str.contains(&token1), "O arquivo em disco não pode conter o token em texto puro!");

        // 2. ensure_token subsequente deve decifrar exatamente o mesmo token
        let token2 = ensure_token(&temp_dir).expect("Falha ao ler token existente cifrado");
        assert_eq!(token1, token2);

        // 3. Rotação manual deve gerar novo token e ser diferente do anterior
        let token3 = rotate_token(&temp_dir).expect("Falha ao rotacionar token");
        assert_ne!(token1, token3);
        assert!(token3.starts_with("star_sec_"));

        // Limpeza
        let _ = std::fs::remove_dir_all(temp_dir);
    }
}
