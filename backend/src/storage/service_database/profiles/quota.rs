use crate::service_database::Vault;
use crate::ws::{WsEvent, WsState};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

fn now_secs() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

/// Valida se o usuário atingiu a cota máxima de perfis do seu plano ativo.
/// Emite notificação de aviso caso o limite tenha sido atingido, informando que os próximos perfis
/// funcionarão normalmente localmente mas não serão salvos na nuvem até upgrade.
pub fn check_profile_limit(
    vault: &Arc<Vault>,
    active_count: usize,
    ws: &WsState,
) -> Result<(), String> {
    if let Ok(Some(session)) = crate::server_sync::cloud_auth::storage::VaultSessionStorage::load_session(vault) {
        if (active_count as i64) >= session.user.max_profiles {
            let msg = format!(
                "Você atingiu o limite de {} perfis do seu plano {}. Os novos perfis funcionarão normalmente neste computador, mas não serão salvos na nuvem até que você faça upgrade.",
                session.user.max_profiles, session.user.plan
            );
            ws.emit(WsEvent::Notification {
                id: format!("limit_{}", now_secs()),
                title: "Limite de Perfis Atingido".to_string(),
                description: msg,
                notification_type: "warning".to_string(),
                timestamp: (now_secs() * 1000) as i64,
            });
            // Permite a criação local normalmente sem bloquear o usuário
        }
    }
    Ok(())
}
