use tracing::info;

use crate::server_sync::cloud_sync::cliente_http;

#[derive(Debug, Clone, PartialEq)]
pub enum TipoAcaoUpload {
    /// O perfil já existe na nuvem Java. Apenas atualiza a versão (não consome nova vaga de cota).
    AtualizarExistente {
        remote_version: i64,
    },
    /// O perfil é novo na nuvem (só existe no banco físico local). Grava novo registro e consome 1 vaga.
    GravarNovo {
        used: usize,
        limit: usize,
    },
}

/// Etapa 2: Valida o plano e cota do usuário antes de prosseguir com o upload.
/// - Se o perfil já existe na nuvem: permite sincronizar/atualizar (não gasta cota).
/// - Se o perfil for novo (só no banco físico):
///   - Se atingiu o limite máximo: bloqueia o envio com mensagem amigável.
///   - Se houver vaga: autoriza gravar novo perfil na nuvem.
pub async fn validar_plano_upload(
    http_client: &reqwest::Client,
    cloud_url: &str,
    token: &str,
    profile_id: &str,
    existe_na_nuvem: bool,
    remote_version: Option<i64>,
) -> Result<TipoAcaoUpload, String> {
    // 1. Se o perfil já existe na nuvem, atualizações de versão não ocupam novas vagas
    if existe_na_nuvem {
        let ver = remote_version.unwrap_or(1);
        info!(
            "📋 Plano Usuário: Perfil '{}' já existe na nuvem (v{}). Permitida atualização sem consumo de cota.",
            profile_id, ver
        );
        return Ok(TipoAcaoUpload::AtualizarExistente {
            remote_version: ver,
        });
    }

    // 2. Se for perfil novo (só no banco físico), consulta cota do plano no Java
    info!(
        "📋 Plano Usuário: Perfil '{}' é novo. Consultando quota na nuvem Java...",
        profile_id
    );

    let quota = cliente_http::consultar_quota(http_client, cloud_url, token)
        .await
        .map_err(|e| format!("Falha ao verificar limite do plano para o perfil '{profile_id}': {e}"))?;

    if quota.available == 0 || quota.used >= quota.limit {
        return Err(format!(
            "Limite máximo do plano atingido ({}/{} perfis). Seu plano atual só permite sincronizar perfis já existentes. Faça upgrade para enviar novos perfis.",
            quota.used, quota.limit
        ));
    }

    info!(
        "✅ Plano Usuário: Quota disponível ({}/{} usados). Gravação do novo perfil '{}' autorizada!",
        quota.used, quota.limit, profile_id
    );

    Ok(TipoAcaoUpload::GravarNovo {
        used: quota.used,
        limit: quota.limit,
    })
}
