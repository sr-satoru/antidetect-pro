use std::sync::Arc;
use tracing::info;

use super::descripitografar;
use crate::server_sync::cloud_sync::cliente_http;
use crate::service_database::data::crypto::encrypt_payload;
use crate::service_database::Vault;
use crate::ws::{WsEvent, WsState};

/// Dispara a rotina de download e atualização do cofre local de forma assíncrona (não-bloqueante)
pub fn disparar_update_desktop_assincrono(
    vault: Arc<Vault>,
    http_client: reqwest::Client,
    cloud_url: String,
    token: String,
    user_key: String,
    profile_id: String,
    ws: Option<WsState>,
) {
    tokio::spawn(async move {
        info!(
            "⚡ Update Desktop: Iniciando atualização assíncrona do perfil '{}' em background...",
            profile_id
        );
        match atualizar_desktop_com_versao_java(
            &vault,
            &http_client,
            &cloud_url,
            &token,
            &user_key,
            &profile_id,
            ws.as_ref(),
        )
        .await
        {
            Ok(_) => {
                info!(
                    "✅ Update Desktop: Perfil '{}' atualizado em background com sucesso!",
                    profile_id
                );
            }
            Err(e) => {
                tracing::error!(
                    "❌ Update Desktop: Falha na atualização assíncrona do perfil '{}': {}",
                    profile_id,
                    e
                );
            }
        }
    });
}

/// Executa a atualização de um perfil existente com a versão mais recente vinda da nuvem Java
pub async fn atualizar_desktop_com_versao_java(
    vault: &Arc<Vault>,
    http_client: &reqwest::Client,
    cloud_url: &str,
    token: &str,
    user_key: &str,
    profile_id: &str,
    ws: Option<&WsState>,
) -> Result<(), String> {
    if let Some(w) = ws {
        w.emit(WsEvent::ProfileSyncing {
            profile_id: profile_id.to_string(),
        });
    }

    // 1. Obtém o hash local atual para envio condicional (HTTP 304 ETag)
    let local_hash = {
        let conn = vault.conn();
        if let Ok(guard) = conn.lock() {
            guard
                .query_row(
                    "SELECT cloud_hash FROM profiles WHERE id = ?1",
                    rusqlite::params![profile_id],
                    |row| row.get::<_, Option<String>>(0),
                )
                .ok()
                .flatten()
        } else {
            None
        }
    };

    // 2. Faz a requisição HTTP com If-None-Match
    let resp = match cliente_http::baixar_arquivo(
        http_client,
        cloud_url,
        token,
        profile_id,
        local_hash.as_deref(),
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

    // 3. Se não foi modificado (HTTP 304)
    if resp.not_modified {
        info!(
            "⚡ Update Desktop: Perfil '{}' idêntico na nuvem (HTTP 304). Usando cache local!",
            profile_id
        );
        if let Some(w) = ws {
            w.emit(WsEvent::ProfileStatus {
                profile_id: profile_id.to_string(),
                status: "ready".to_string(),
            });
        }
        return Ok(());
    }

    let size_kb = resp.bytes.len() / 1024;

    // 4. Decifra a nova cápsula STARENC2
    let bundle = descripitografar::descriptografar_capsula(&resp.bytes, user_key)?;

    // 5. Criptografa o payload do perfil para o formato do cofre SQLite local
    let profile_bytes = serde_json::to_vec(&bundle.profile)
        .map_err(|e| format!("Erro ao serializar perfil para o cofre local: {e}"))?;
    let payload_enc = encrypt_payload(vault.key().as_ref(), &profile_bytes)?;

    // 6. Atualiza a tabela 'profiles' no SQLite local
    {
        let conn = vault.conn();
        let guard = conn
            .lock()
            .map_err(|e| format!("Erro ao acessar cofre local: {e}"))?;

        guard.execute(
            "UPDATE profiles
             SET payload_enc = ?1, name = ?2, group_name = ?3, kernel = ?4, os = ?5,
                 version = ?6, cloud_hash = ?7, server_id = COALESCE(?8, server_id),
                 updated_at = unixepoch()
             WHERE id = ?9",
            rusqlite::params![
                payload_enc,
                bundle.profile.name,
                bundle.profile.group,
                bundle.profile.kernel,
                bundle.profile.os,
                resp.version,
                resp.etag,
                resp.server_id,
                profile_id
            ],
        ).map_err(|e| format!("Erro ao atualizar perfil no SQLite: {e}"))?;

        // 7. Atualiza a sessão em 'profile_sessions' se presente
        if let Some(session_val) = bundle.session_json {
            if let Ok(s_bytes) = serde_json::to_vec(&session_val) {
                if let Ok(s_enc) = encrypt_payload(vault.key().as_ref(), &s_bytes) {
                    let _ = guard.execute(
                        "INSERT INTO profile_sessions (profile_id, session_enc, updated_at)
                         VALUES (?1, ?2, unixepoch())
                         ON CONFLICT(profile_id) DO UPDATE SET session_enc = excluded.session_enc, updated_at = unixepoch()",
                        rusqlite::params![profile_id, s_enc],
                    );
                }
            }
        }
    }

    if let Some(w) = ws {
        w.emit(WsEvent::ProfileSynced {
            profile_id: profile_id.to_string(),
            size_kb,
        });
        w.emit(WsEvent::ProfileStatus {
            profile_id: profile_id.to_string(),
            status: "ready".to_string(),
        });
    }

    info!(
        "📥 Update Desktop: Perfil '{}' atualizado com sucesso no PC! (v{}, server_id: {:?}, {} KB)",
        profile_id, resp.version, resp.server_id, size_kb
    );

    Ok(())
}
