use tracing::info;

use crate::server_sync::cloud_sync::upload::{decifrar_bytes, CloudProfileBundle};

/// Descriptografa uma cápsula binária STARENC2 da nuvem e deserializa o CloudProfileBundle
pub fn descriptografar_capsula(
    encrypted_bytes: &[u8],
    user_key: &str,
) -> Result<CloudProfileBundle, String> {
    info!(
        "🔓 Descriptografando cápsula STARENC2 ({} bytes)...",
        encrypted_bytes.len()
    );

    // 1. Decifra os bytes usando AES-256-GCM + PBKDF2
    let decrypted_bytes = decifrar_bytes(encrypted_bytes, user_key)?;

    // 2. Deserializa o JSON do bundle do perfil
    let bundle: CloudProfileBundle = serde_json::from_slice(&decrypted_bytes)
        .map_err(|e| format!("Erro ao processar JSON do perfil baixado: {e}"))?;

    info!(
        "✅ Cápsula descriptografada com sucesso! Perfil: '{}' (v{})",
        bundle.profile.name, bundle.version
    );

    Ok(bundle)
}
