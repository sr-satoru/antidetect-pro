use std::sync::Arc;
use tracing::info;

use super::plano_usuario::TipoAcaoUpload;
use crate::service_database::Vault;

#[derive(Debug, Clone)]
pub struct PerfilUploadInfo {
    pub profile_id: String,
    pub tipo_acao: TipoAcaoUpload,
    pub versao_alvo: i64,
}

/// Etapa 3: Seleciona e valida os perfis físicos no banco SQLite local,
/// determinando a versão de destino e a classificação (Atualizar Existente vs Gravar Novo).
pub fn preparar_perfil_fisico(
    vault: &Arc<Vault>,
    profile_id: &str,
    tipo_acao: &TipoAcaoUpload,
    local_version: i64,
) -> Result<PerfilUploadInfo, String> {
    let conn = vault.conn();
    let guard = conn
        .lock()
        .map_err(|e| format!("Erro ao acessar cofre local: {e}"))?;

    // Valida existência física e se o perfil não está deletado
    let is_deleted: i64 = guard
        .query_row(
            "SELECT is_deleted FROM profiles WHERE id = ?1",
            rusqlite::params![profile_id],
            |r| r.get(0),
        )
        .map_err(|_| format!("Perfil físico '{}' não encontrado no banco local", profile_id))?;

    if is_deleted != 0 {
        return Err(format!(
            "Perfil físico '{}' está marcado como excluído (is_deleted = 1)",
            profile_id
        ));
    }

    let versao_alvo = match tipo_acao {
        TipoAcaoUpload::AtualizarExistente { remote_version } => {
            std::cmp::max(local_version, *remote_version) + 1
        }
        TipoAcaoUpload::GravarNovo { .. } => {
            if local_version > 1 {
                local_version
            } else {
                1
            }
        }
    };

    info!(
        "📦 Upload Versão: Perfil '{}' selecionado com sucesso. Versão alvo: v{} ({:?})",
        profile_id, versao_alvo, tipo_acao
    );

    Ok(PerfilUploadInfo {
        profile_id: profile_id.to_string(),
        tipo_acao: tipo_acao.clone(),
        versao_alvo,
    })
}

/// Seleciona todos os IDs de perfis físicos locais ativos elegíveis para sincronização
pub fn listar_perfis_fisicos_ativos(vault: &Arc<Vault>) -> Result<Vec<String>, String> {
    let conn = vault.conn();
    let guard = conn
        .lock()
        .map_err(|e| format!("Erro ao acessar cofre local: {e}"))?;

    let mut stmt = guard
        .prepare("SELECT id FROM profiles WHERE is_deleted = 0 ORDER BY created_at DESC")
        .map_err(|e| format!("Erro ao listar perfis físicos: {e}"))?;

    let rows = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| format!("Erro ao iterar perfis físicos: {e}"))?;

    let ids = rows.flatten().collect();
    Ok(ids)
}
