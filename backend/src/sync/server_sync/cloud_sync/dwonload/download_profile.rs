use std::sync::Arc;
use tracing::info;

use super::descripitografar;
use crate::server_sync::cloud_sync::cliente_http;
use crate::service_database::data::crypto::encrypt_payload;
use crate::service_database::profiles::repository::save_to_db;
use crate::service_database::Vault;
use crate::ws::{WsEvent, WsState};

/// Baixa e cadastra um perfil faltante que existe na nuvem Java mas não no banco local do PC
pub async fn baixar_perfil_faltante(
    vault: &Arc<Vault>,
    http_client: &reqwest::Client,
    cloud_url: &str,
    token: &str,
    user_key: &str,
    profile_id: &str,
    ws: Option<&WsState>,
) -> Result<String, String> {
    info!(
        "📥 Download Profile: Baixando perfil faltante '{}' da nuvem Java...",
        profile_id
    );

    if let Some(w) = ws {
        w.emit(WsEvent::ProfileSyncing {
            profile_id: profile_id.to_string(),
        });
    }

    // 1. Faz a requisição HTTP para baixar a cápsula criptografada
    let resp = match cliente_http::baixar_arquivo(
        http_client,
        cloud_url,
        token,
        profile_id,
        None,
    )
    .await
    {
        Ok(r) => r,
        Err(err) => {
            if let Some(w) = ws {
                w.emit(WsEvent::ProfileSyncFailed {
                    profile_id: profile_id.to_string(),
                    error: err.clone(),
                });
            }
            return Err(err);
        }
    };

    let size_kb = resp.bytes.len() / 1024;

    // 2. Decifra a cápsula STARENC2 e extrai o bundle
    let bundle = descripitografar::descriptografar_capsula(&resp.bytes, user_key)?;
    let id_retornado = bundle.profile.id.clone();

    // 3. Salva o perfil e tags no banco físico local
    save_to_db(vault, &bundle.profile)?;

    // 4. Salva a sessão efêmera (cookies/storage) se presente
    if let Some(session_val) = bundle.session_json {
        if let Ok(session_bytes) = serde_json::to_vec(&session_val) {
            if let Ok(session_enc) = encrypt_payload(vault.key().as_ref(), &session_bytes) {
                let conn = vault.conn();
                if let Ok(guard) = conn.lock() {
                    let _ = guard.execute(
                        "INSERT INTO profile_sessions (profile_id, session_enc, updated_at)
                         VALUES (?1, ?2, unixepoch())
                         ON CONFLICT(profile_id) DO UPDATE SET session_enc = excluded.session_enc, updated_at = unixepoch()",
                        rusqlite::params![&id_retornado, session_enc],
                    );
                }
            }
        }
    }

    // 5. Atualiza os metadados da nuvem (version, cloud_hash, server_id) no SQLite local
    {
        let conn = vault.conn();
        if let Ok(guard) = conn.lock() {
            let _ = guard.execute(
                "UPDATE profiles SET version = ?1, cloud_hash = ?2, server_id = COALESCE(?3, server_id) WHERE id = ?4",
                rusqlite::params![resp.version, resp.etag, resp.server_id, id_retornado],
            );
        }
    }

    if let Some(w) = ws {
        w.emit(WsEvent::ProfileSynced {
            profile_id: id_retornado.clone(),
            size_kb,
        });
        w.emit(WsEvent::ProfileStatus {
            profile_id: id_retornado.clone(),
            status: "ready".to_string(),
        });
    }

    info!(
        "✅ Download Profile: Perfil faltante '{}' restaurado no PC com sucesso! (v{}, server_id: {:?}, {} KB)",
        id_retornado, resp.version, resp.server_id, size_kb
    );

    Ok(id_retornado)
}

/// Puxa e restaura todos os perfis que estão na nuvem Java e não existem localmente no PC
pub async fn puxar_todos_faltantes(
    vault: &Arc<Vault>,
    http_client: &reqwest::Client,
    cloud_url: &str,
    token: &str,
    user_key: &str,
    perfis_remotos_faltantes: &[String],
    ws: Option<&WsState>,
) -> Result<usize, String> {
    let mut restaurados = 0;

    for pid in perfis_remotos_faltantes {
        match baixar_perfil_faltante(vault, http_client, cloud_url, token, user_key, pid, ws).await {
            Ok(_) => restaurados += 1,
            Err(e) => {
                tracing::warn!("⚠️ Falha ao baixar perfil faltante '{}': {}", pid, e);
            }
        }
    }

    Ok(restaurados)
}
