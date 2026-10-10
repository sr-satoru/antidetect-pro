use std::sync::Arc;
use tracing::info;

use crate::server_sync::cloud_sync::cliente_http;
use crate::server_sync::cloud_sync::dwonload;
use crate::service_database::Vault;
use crate::ws::WsState;

#[derive(Debug, Clone, PartialEq)]
pub enum DecisaoVersao {
    /// Versão local e remota são idênticas (ou possuem mesmo hash confirmado). Nada a enviar.
    InalteradoJaSincronizado {
        version: i64,
    },
    /// A versão do banco local é menor que a da nuvem (disparado update assíncrono em background).
    LocalDesatualizadoIgnorado {
        local_version: i64,
        remote_version: i64,
    },
    /// A versão local é mais nova que a da nuvem (ou o perfil não existe ainda no Java). Prosseguir para plano.
    ProsseguirUpload {
        existe_na_nuvem: bool,
        remote_version: Option<i64>,
        local_version: i64,
        local_hash: Option<String>,
    },
}

/// Etapa 1: Checa a versão do backend Java via HTTP e compara com o banco local.
/// - Se igual: não faz nada.
/// - Se local < backend: dispara update assíncrono do desktop em background e prossegue sem travar.
/// - Se backend < local (ou perfil novo na nuvem): prossegue para validação do plano.
pub async fn checar_versao_perfil(
    vault: &Arc<Vault>,
    http_client: &reqwest::Client,
    cloud_url: &str,
    token: &str,
    user_key: &str,
    profile_id: &str,
    ws: Option<&WsState>,
) -> Result<DecisaoVersao, String> {

    // 1. Consulta versão e hash no banco local SQLite
    let (local_version, local_hash) = {
        let conn = vault.conn();
        let guard = conn
            .lock()
            .map_err(|e| format!("Erro ao acessar cofre local: {e}"))?;

        guard
            .query_row(
                "SELECT COALESCE(version, 1), cloud_hash FROM profiles WHERE id = ?1",
                rusqlite::params![profile_id],
                |row| {
                    let v: i64 = row.get(0)?;
                    let h: Option<String> = row.get(1)?;
                    Ok((v, h))
                },
            )
            .map_err(|e| format!("Perfil '{}' não encontrado no banco físico local: {e}", profile_id))?
    };

    // 2. Faz uma única requisição HTTP leve na VPS Java para obter o status
    let stat = match cliente_http::consultar_stat(http_client, cloud_url, token, profile_id).await {
        Ok(s) => s,
        Err(err) => {
            return Err(format!(
                "Falha ao checar versão no backend Java para o perfil '{}': {err}",
                profile_id
            ));
        }
    };

    // 3. Se o perfil já existe na nuvem Java
    if stat.exists {
        let remote_version = stat.version.unwrap_or(1);

        // Se a ETag/hash local existir e for idêntica à da nuvem, já está 100% em sincronia
        if let (Some(lh), Some(rh)) = (&local_hash, &stat.hash) {
            if !lh.is_empty() && lh.trim().eq_ignore_ascii_case(rh.trim()) {
                info!(
                    "⚡ Perfil '{}' idêntico na nuvem (ETag/hash {}). Upload dispensado!",
                    profile_id, lh
                );
                return Ok(DecisaoVersao::InalteradoJaSincronizado {
                    version: remote_version,
                });
            }
        }

        // Se a do banco local for menor que a do Java (nuvem mais recente)
        if local_version < remote_version {
            tracing::info!(
                "⚡ Perfil '{}' tem versão mais recente na nuvem (local v{} < nuvem v{}). Disparando update assíncrono do PC...",
                profile_id, local_version, remote_version
            );

            // Dispara a atualização assíncrona em background usando o módulo dwonload
            dwonload::disparar_update_desktop_assincrono(
                vault.clone(),
                http_client.clone(),
                cloud_url.to_string(),
                token.to_string(),
                user_key.to_string(),
                profile_id.to_string(),
                ws.cloned(),
            );

            return Ok(DecisaoVersao::LocalDesatualizadoIgnorado {
                local_version,
                remote_version,
            });
        }

        // Se a ETag local for nula (alteração local) ou diferente, e local_version >= remote_version:
        info!(
            "🚀 Perfil '{}' possui alterações locais pendentes (local v{}, nuvem v{}). Prosseguindo para envio...",
            profile_id, local_version, remote_version
        );
        return Ok(DecisaoVersao::ProsseguirUpload {
            existe_na_nuvem: true,
            remote_version: Some(remote_version),
            local_version,
            local_hash,
        });
    }

    // 4. Se o perfil não existe ainda na nuvem Java
    info!(
        "🆕 Perfil '{}' é novo e ainda não existe no backend Java. Prosseguindo para checagem de plano...",
        profile_id
    );
    Ok(DecisaoVersao::ProsseguirUpload {
        existe_na_nuvem: false,
        remote_version: None,
        local_version,
        local_hash,
    })
}
