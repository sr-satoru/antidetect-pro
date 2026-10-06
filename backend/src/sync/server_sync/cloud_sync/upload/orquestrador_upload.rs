use std::sync::Arc;
use tracing::info;

use super::checagem_version::{self, DecisaoVersao};
use super::criptografia_envio;
use super::plano_usuario;
use super::sync_upload;
use super::upload_version;

use crate::server_sync::cloud_sync::client_http::SyncUploadResult;
use crate::service_database::Vault;
use crate::ws::{WsEvent, WsState};

/// Orquestrador do pipeline de upload físico:
/// 1. checagem_version: HTTP leve no Java + SQLite local. Para se igual ou se local < java.
/// 2. plano_usuario: Valida quota no Java. Se limite atingido, bloqueia novos perfis e só permite existentes.
/// 3. upload_version: Seleciona perfis físicos válidos e calcula versão alvo (Atualizar vs Gravar Novo).
/// 4. criptografia_envio: Empacota dados físicos e cifra em STARENC2 (AES-256-GCM + PBKDF2).
/// 5. sync_upload: Envia dados para o backend Java, persiste SQLite local e notifica WebSocket.
pub async fn executar_upload(
    vault: &Arc<Vault>,
    http_client: &reqwest::Client,
    cloud_url: &str,
    token: &str,
    user_key: &str,
    profile_id: &str,
    ws: Option<&WsState>,
) -> Result<SyncUploadResult, String> {
    info!("🚀 Orquestrador Upload: Iniciando esteira de upload para o perfil '{}'...", profile_id);

    // 1. CHECAGEM DE VERSÃO
    let decisao = checagem_version::checar_versao_perfil(
        vault,
        http_client,
        cloud_url,
        token,
        user_key,
        profile_id,
        ws,
    )
    .await?;

    let (existe_na_nuvem, remote_version, local_version) = match decisao {
        DecisaoVersao::InalteradoJaSincronizado { version } => {
            info!(
                "⚡ Orquestrador Upload: Perfil '{}' já está sincronizado (v{}). Upload cancelado (0 bytes transferidos)!",
                profile_id, version
            );
            if let Some(w) = ws {
                w.emit(WsEvent::ProfileSynced {
                    profile_id: profile_id.to_string(),
                    size_kb: 0,
                });
            }
            return Ok(SyncUploadResult {
                profile_id: profile_id.to_string(),
                size_bytes: 0,
                size_kb: 0,
                synced_at: chrono::Utc::now().to_rfc3339(),
                status: "already_in_sync".to_string(),
            });
        }
        DecisaoVersao::LocalDesatualizadoIgnorado {
            local_version,
            remote_version,
        } => {
            info!(
                "⏸️ Orquestrador Upload: Perfil '{}' tem versão mais recente na nuvem (local v{} < remota v{}). Download ignorado por enquanto.",
                profile_id, local_version, remote_version
            );
            return Ok(SyncUploadResult {
                profile_id: profile_id.to_string(),
                size_bytes: 0,
                size_kb: 0,
                synced_at: chrono::Utc::now().to_rfc3339(),
                status: "local_outdated_ignored".to_string(),
            });
        }
        DecisaoVersao::ProsseguirUpload {
            existe_na_nuvem,
            remote_version,
            local_version,
            ..
        } => (existe_na_nuvem, remote_version, local_version),
    };

    // 2. PLANO DO USUÁRIO & QUOTAS
    let tipo_acao = plano_usuario::validar_plano_upload(
        http_client,
        cloud_url,
        token,
        profile_id,
        existe_na_nuvem,
        remote_version,
    )
    .await?;

    // 3. UPLOAD VERSION (Seleção e Versionamento)
    let info_upload = upload_version::preparar_perfil_fisico(
        vault,
        profile_id,
        &tipo_acao,
        local_version,
    )?;

    // 4. CRIPTOGRAFIA DE ENVIO (STARENC2 + CloudProfileBundle)
    let pacote = criptografia_envio::criptografar_para_envio(
        vault,
        profile_id,
        user_key,
        info_upload.versao_alvo,
    )?;

    // 5. TRANSMISSÃO E GRAVAÇÃO (SYNC UPLOAD)
    let resultado = sync_upload::sincronizar_e_enviar(
        vault,
        http_client,
        cloud_url,
        token,
        profile_id,
        &pacote,
        &tipo_acao,
        ws,
    )
    .await?;

    info!(
        "✅ Orquestrador Upload: Esteira finalizada com sucesso para o perfil '{}' (status: {})!",
        profile_id, resultado.status
    );

    Ok(resultado)
}
