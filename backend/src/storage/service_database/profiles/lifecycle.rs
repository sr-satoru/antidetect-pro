use crate::launcher::ProcessManager;
use crate::models::Profile;
use crate::service_database::Vault;
use std::path::Path;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

fn now_secs() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

/// Dispara o navegador Camoufox para o perfil com montagem efêmera de sessão do Vault
pub async fn launch_with_cdp(
    vault: &Arc<Vault>,
    process_manager: &ProcessManager,
    data_dir: &Path,
    profile_dir: &Path,
    profile: &mut Profile,
    cdp: bool,
) -> Result<(u32, Option<u16>, Option<String>), String> {
    launch_with_options(vault, process_manager, data_dir, profile_dir, profile, cdp, None).await
}

/// Dispara o navegador Camoufox para o perfil com montagem efêmera de sessão do Vault e URL inicial opcional
pub async fn launch_with_options(
    vault: &Arc<Vault>,
    process_manager: &ProcessManager,
    data_dir: &Path,
    profile_dir: &Path,
    profile: &mut Profile,
    cdp: bool,
    initial_url: Option<&str>,
) -> Result<(u32, Option<u16>, Option<String>), String> {
    // 1. Descriptografa e monta a sessão efêmera do Vault nos arquivos SQLite temporários
    let session_svc = crate::service_database::sessions::SessionService::new(vault.clone());
    if let Ok(Some(session)) = session_svc.load_session(&profile.id) {
        tracing::info!(
            "🔓 Descriptografando e montando sessão efêmera do Vault para perfil {} ({} cookies, {} storage)",
            profile.id, session.total_cookies, session.total_storage_items
        );
        let _ = crate::launcher::engine::injection::inject_cookies(profile_dir, &session.cookies);
        for (origin, items) in &session.local_storage {
            let _ = crate::launcher::engine::injection::inject_local_storage(profile_dir, origin, items);
        }
    }

    // 2. Dispara o processo do Camoufox
    let (pid, debug_port, ws_endpoint) = process_manager.launch_with_options(profile, data_dir, cdp, initial_url).await?;

    let now = now_secs();
    profile.status = "running".to_string();
    profile.last_launch = Some(now);
    profile.updated_at = now;

    Ok((pid, debug_port, ws_endpoint))
}

/// Encerra o navegador, extrai sessão atualizada para o Vault e expurga arquivos temporários
pub fn stop(
    vault: &Arc<Vault>,
    process_manager: &ProcessManager,
    profile_dir: &Path,
    profile: &mut Profile,
) -> Result<(), String> {
    // 1. Encerra o processo do navegador
    process_manager.stop(&profile.id)?;

    // 2. Extrai a sessão atualizada, criptografa no Vault e limpa o disco temporário
    let session_svc = crate::service_database::sessions::SessionService::new(vault.clone());
    if let Ok(fresh_session) = crate::extraction_session::fire_fox::extract_unified_session(profile_dir) {
        if fresh_session.total_cookies > 0 || fresh_session.total_storage_items > 0 {
            tracing::info!(
                "🔒 Criptografando e salvando sessão no Vault para perfil {} via stop API ({} cookies, {} storage)",
                profile.id, fresh_session.total_cookies, fresh_session.total_storage_items
            );
            let _ = session_svc.save_session(&profile.id, &fresh_session);
        }
    }
    tracing::info!("🛡️ Zero-Trace: expurgando arquivos temporários de sessão no disco pós stop ({})", profile.id);
    crate::launcher::engine::injection::purge_ephemeral_session_files(profile_dir);

    let now = now_secs();
    profile.status = "ready".to_string();
    profile.updated_at = now;

    Ok(())
}
