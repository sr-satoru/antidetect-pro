use std::sync::Arc;
use tracing::info;

use super::download_profile;
use super::update_profile_desktop;
use crate::server_sync::cloud_sync::client_http::{
    self, PullProfilesResult, PulledProfileDetail,
};
use crate::service_database::Vault;
use crate::ws::WsState;

/// Orquestrador do fluxo de Download:
/// Centraliza tanto o download de perfis individuais faltantes, atualizações assíncronas,
/// quanto o pull em lote com resolução inteligente de cache local (ETag/Hash).
pub struct OrquestradorDownload;

impl OrquestradorDownload {
    /// Baixa um perfil que existe na nuvem mas ainda não está cadastrado no SQLite local
    pub async fn baixar_perfil(
        vault: &Arc<Vault>,
        http_client: &reqwest::Client,
        cloud_url: &str,
        token: &str,
        user_key: &str,
        profile_id: &str,
        ws: Option<&WsState>,
    ) -> Result<String, String> {
        info!("📥 Orquestrador Download: Baixando perfil '{}'...", profile_id);
        download_profile::baixar_perfil_faltante(
            vault,
            http_client,
            cloud_url,
            token,
            user_key,
            profile_id,
            ws,
        )
        .await
    }

    /// Atualiza um perfil já existente localmente com a versão mais recente da nuvem Java
    pub async fn atualizar_perfil(
        vault: &Arc<Vault>,
        http_client: &reqwest::Client,
        cloud_url: &str,
        token: &str,
        user_key: &str,
        profile_id: &str,
        ws: Option<&WsState>,
    ) -> Result<(), String> {
        info!("🔄 Orquestrador Download: Atualizando perfil '{}' com versão Java...", profile_id);
        update_profile_desktop::atualizar_desktop_com_versao_java(
            vault,
            http_client,
            cloud_url,
            token,
            user_key,
            profile_id,
            ws,
        )
        .await
    }

    /// Dispara a atualização do perfil em background (sem bloquear o chamador)
    pub fn disparar_update_assincrono(
        vault: Arc<Vault>,
        http_client: reqwest::Client,
        cloud_url: String,
        token: String,
        user_key: String,
        profile_id: String,
        ws: Option<WsState>,
    ) {
        update_profile_desktop::disparar_update_desktop_assincrono(
            vault,
            http_client,
            cloud_url,
            token,
            user_key,
            profile_id,
            ws,
        );
    }

    /// Puxa todos os perfis da nuvem para o computador:
    /// - Se o perfil não existir localmente, baixa e restaura.
    /// - Se existir com mesmo hash, ignora (ou força se force=true).
    /// - Se existir com hash diferente, atualiza.
    pub async fn puxar_todos_perfis(
        vault: &Arc<Vault>,
        http_client: &reqwest::Client,
        cloud_url: &str,
        token: &str,
        user_key: &str,
        ws: Option<&WsState>,
        force: bool,
    ) -> Result<PullProfilesResult, String> {
        info!("🌐 Orquestrador Download: Iniciando sincronização em lote da nuvem...");

        let remote_list = client_http::listar_remotos(http_client, cloud_url, token).await?;
        let total_remote = remote_list.len();

        let mut downloaded_count = 0;
        let mut existing_count = 0;
        let mut failed_count = 0;
        let mut details = Vec::new();

        for item in remote_list {
            let pid = item.resolve_local_id();
            if pid.is_empty() {
                continue;
            }

            let (exists_locally, local_hash) = {
                let conn = vault.conn();
                if let Ok(guard) = conn.lock() {
                    let mut s = guard
                        .prepare("SELECT cloud_hash FROM profiles WHERE id = ?1 LIMIT 1")
                        .unwrap();
                    let mut rows = s.query(rusqlite::params![&pid]).ok();
                    if let Some(ref mut r) = rows {
                        if let Ok(Some(row)) = r.next() {
                            (true, row.get::<_, Option<String>>(0).ok().flatten())
                        } else {
                            (false, None)
                        }
                    } else {
                        (false, None)
                    }
                } else {
                    (false, None)
                }
            };

            if exists_locally && !force {
                if let (Some(lh), Some(rh)) = (&local_hash, &item.hash) {
                    if !lh.is_empty() && lh.trim().eq_ignore_ascii_case(rh.trim()) {
                        existing_count += 1;
                        details.push(PulledProfileDetail {
                            id: pid.clone(),
                            status: "already_exists".to_string(),
                            size_bytes: item.size_bytes.unwrap_or(0),
                            error: None,
                        });
                        continue;
                    }
                }
            }

            if !exists_locally {
                match download_profile::baixar_perfil_faltante(
                    vault,
                    http_client,
                    cloud_url,
                    token,
                    user_key,
                    &pid,
                    ws,
                )
                .await
                {
                    Ok(_) => {
                        downloaded_count += 1;
                        details.push(PulledProfileDetail {
                            id: pid.clone(),
                            status: "downloaded".to_string(),
                            size_bytes: item.size_bytes.unwrap_or(0),
                            error: None,
                        });
                    }
                    Err(e) => {
                        failed_count += 1;
                        details.push(PulledProfileDetail {
                            id: pid.clone(),
                            status: "failed".to_string(),
                            size_bytes: 0,
                            error: Some(e),
                        });
                    }
                }
            } else {
                match update_profile_desktop::atualizar_desktop_com_versao_java(
                    vault,
                    http_client,
                    cloud_url,
                    token,
                    user_key,
                    &pid,
                    ws,
                )
                .await
                {
                    Ok(_) => {
                        downloaded_count += 1;
                        details.push(PulledProfileDetail {
                            id: pid.clone(),
                            status: "downloaded".to_string(),
                            size_bytes: item.size_bytes.unwrap_or(0),
                            error: None,
                        });
                    }
                    Err(e) => {
                        failed_count += 1;
                        details.push(PulledProfileDetail {
                            id: pid.clone(),
                            status: "failed".to_string(),
                            size_bytes: 0,
                            error: Some(e),
                        });
                    }
                }
            }
        }

        info!(
            "🏁 Orquestrador Download: Pull concluído! Total: {}, Baixados: {}, Existentes: {}, Falhas: {}",
            total_remote, downloaded_count, existing_count, failed_count
        );

        Ok(PullProfilesResult {
            total_remote,
            downloaded_count,
            existing_count,
            failed_count,
            profiles: details,
        })
    }
}
