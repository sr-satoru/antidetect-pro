use tracing::{info, warn};

use super::super::client_http;
use crate::ws::WsState;

/// Orquestrador responsável por coordenar a exclusão de perfis na nuvem Java
pub struct OrquestradorDelete;

impl OrquestradorDelete {
    /// Executa a exclusão de um perfil no servidor Java remoto via DELETE /api/cloud-sync/profiles/{id}
    pub async fn executar_delete(
        http_client: &reqwest::Client,
        cloud_url: &str,
        token: &str,
        profile_id: &str,
        _ws: Option<&WsState>,
    ) -> Result<(), String> {
        info!("🗑️ [OrquestradorDelete] Iniciando exclusão do perfil '{}' na nuvem ({cloud_url})...", profile_id);

        match client_http::excluir_remoto(http_client, cloud_url, token, profile_id).await {
            Ok(()) => {
                info!("✅ [OrquestradorDelete] Perfil '{}' removido com sucesso da nuvem.", profile_id);
                Ok(())
            }
            Err(err) => {
                // Se o perfil já não existia na nuvem (404), tratamos como sucesso idempotente
                if err.contains("404") || err.contains("não encontrado") || err.contains("Not Found") {
                    info!("ℹ️ [OrquestradorDelete] Perfil '{}' já não constava na nuvem (404). Considerando operação concluída.", profile_id);
                    Ok(())
                } else {
                    warn!("❌ [OrquestradorDelete] Falha ao excluir perfil '{}' na nuvem: {err}", profile_id);
                    Err(err)
                }
            }
        }
    }

    /// Executa a exclusão em lote de múltiplos perfis (utilizado ao esvaziar lixeira)
    pub async fn executar_delete_em_lote(
        http_client: &reqwest::Client,
        cloud_url: &str,
        token: &str,
        profile_ids: &[String],
        _ws: Option<&WsState>,
    ) -> Result<usize, String> {
        info!("🗑️ [OrquestradorDelete] Iniciando exclusão em lote de {} perfis na nuvem...", profile_ids.len());
        let mut sucessos = 0;

        for id in profile_ids {
            if let Ok(()) = Self::executar_delete(http_client, cloud_url, token, id, _ws).await {
                sucessos += 1;
            }
        }

        info!("✅ [OrquestradorDelete] Exclusão em lote finalizada: {sucessos}/{} perfis removidos da nuvem.", profile_ids.len());
        Ok(sucessos)
    }
}
