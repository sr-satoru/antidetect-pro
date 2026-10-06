use std::sync::Arc;
use tracing::info;

use super::criptografia_envio::PacoteCriptografado;
use super::plano_usuario::TipoAcaoUpload;
use crate::server_sync::cloud_sync::client_http::SyncUploadResult;
use crate::service_database::Vault;
use crate::ws::{WsEvent, WsState};

/// Etapa 5: Transmissão e sincronização HTTP com a VPS Java Spring Boot.
/// Envia os dados cifrados sabendo exatamente se é atualização ou gravação nova,
/// persiste a versão/hash/server_id no SQLite local e emite os eventos WebSocket.
pub async fn sincronizar_e_enviar(
    vault: &Arc<Vault>,
    http_client: &reqwest::Client,
    cloud_url: &str,
    token: &str,
    profile_id: &str,
    pacote: &PacoteCriptografado,
    tipo_acao: &TipoAcaoUpload,
    ws: Option<&WsState>,
) -> Result<SyncUploadResult, String> {
    let size_bytes = pacote.bytes.len();
    let size_kb = size_bytes / 1024;

    if let Some(w) = ws {
        w.emit(WsEvent::ProfileSyncing {
            profile_id: profile_id.to_string(),
        });
    }

    let url = format!("{}/api/cloud-sync/profiles/{}/upload", cloud_url, profile_id);

    let acao_str = match tipo_acao {
        TipoAcaoUpload::AtualizarExistente { .. } => "update",
        TipoAcaoUpload::GravarNovo { .. } => "create",
    };

    info!(
        "🌐 Sync Upload: Enviando perfil '{}' para a nuvem Java (Ação: {}, Tamanho: {} KB)...",
        profile_id, acao_str, size_kb
    );

    let resp = http_client
        .post(&url)
        .bearer_auth(token)
        .header("Content-Type", "application/octet-stream")
        .header("x-profile-name", &pacote.name)
        .header("x-group-name", &pacote.group_name)
        .header("x-kernel", &pacote.kernel)
        .header("x-os", &pacote.os)
        .header("x-profile-hash", &pacote.hash)
        .header("x-sync-action", acao_str)
        .body(pacote.bytes.clone())
        .send()
        .await
        .map_err(|e| format!("Falha de conexão com o backend Java: {e}"))?;

    let status = resp.status();
    if status.as_u16() == 403 || status.as_u16() == 402 {
        let msg = resp
            .json::<serde_json::Value>()
            .await
            .ok()
            .and_then(|j| j.get("message").and_then(|m| m.as_str().map(String::from)))
            .unwrap_or_else(|| "Limite do plano atingido na nuvem. Faça upgrade do plano.".to_string());

        if let Some(w) = ws {
            w.emit(WsEvent::ProfileSyncFailed {
                profile_id: profile_id.to_string(),
                error: msg.clone(),
            });
        }
        return Err(msg);
    }

    if !status.is_success() {
        let err_text = resp.text().await.unwrap_or_default();
        let err_msg = format!("Falha no servidor cloud (status {status}): {err_text}");
        if let Some(w) = ws {
            w.emit(WsEvent::ProfileSyncFailed {
                profile_id: profile_id.to_string(),
                error: err_msg.clone(),
            });
        }
        return Err(err_msg);
    }

    let resp_json = resp.json::<serde_json::Value>().await.ok();
    let server_id = resp_json
        .as_ref()
        .and_then(|j| j.get("serverId").and_then(|v| v.as_i64()));
    let version = resp_json
        .as_ref()
        .and_then(|j| j.get("version").and_then(|v| v.as_i64()))
        .unwrap_or(pacote.versao_alvo);

    // Atualiza colunas version, cloud_hash e server_id no SQLite local
    {
        let conn = vault.conn();
        if let Ok(guard) = conn.lock() {
            let _ = guard.execute(
                "UPDATE profiles SET version = ?1, cloud_hash = ?2, server_id = COALESCE(?3, server_id) WHERE id = ?4",
                rusqlite::params![version, pacote.hash, server_id, profile_id],
            );
        }
    }

    if let Some(w) = ws {
        w.emit(WsEvent::ProfileSynced {
            profile_id: profile_id.to_string(),
            size_kb,
        });
    }

    let status_str = match tipo_acao {
        TipoAcaoUpload::AtualizarExistente { .. } => "updated",
        TipoAcaoUpload::GravarNovo { .. } => "created",
    };

    info!(
        "☁️ Sync Upload: Perfil '{}' gravado com sucesso no backend Java! (v{}, server_id: {:?}, ação: {}, {} KB)",
        profile_id, version, server_id, status_str, size_kb
    );

    Ok(SyncUploadResult {
        profile_id: profile_id.to_string(),
        size_bytes,
        size_kb,
        synced_at: chrono::Utc::now().to_rfc3339(),
        status: status_str.to_string(),
    })
}
