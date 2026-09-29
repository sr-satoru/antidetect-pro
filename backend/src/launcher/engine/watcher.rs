use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tracing::info;

use crate::models::Profile;
use crate::ws::{WsEvent, WsState};
use crate::launcher::sys;

/// Monitora o ciclo de vida do processo do navegador em segundo plano até o fechamento da janela
pub fn spawn_lifecycle_watcher(
    mut child: tokio::process::Child,
    pid: u32,
    profile_id: String,
    profile_dir: PathBuf,
    meta_file: PathBuf,
    running: Arc<Mutex<HashMap<String, u32>>>,
    profile_dirs: Arc<Mutex<HashMap<String, PathBuf>>>,
    ports: Arc<Mutex<HashMap<String, u16>>>,
    relays: Arc<Mutex<HashMap<String, crate::network::relay::ProxyRelay>>>,
    ws: WsState,
    auto_sync: Arc<Mutex<Option<Arc<crate::server_sync::AutoSyncEngine>>>>,
    vault: Arc<Mutex<Option<Arc<crate::service_database::Vault>>>>,
) {
    tokio::spawn(async move {
        let exit_status = child.wait().await;
        info!(
            "🛑 Processo inicial Camoufox (PID {}) do perfil {} concluiu ({:?}).",
            pid, profile_id, exit_status
        );

        // Aguarda a liberação de locks de arquivo do perfil (especialmente no Windows)
        while sys::is_profile_locked(&profile_dir) {
            tokio::time::sleep(std::time::Duration::from_millis(800)).await;
        }

        info!(
            "🏁 Janela do perfil {} totalmente fechada pelo usuário.",
            profile_id
        );

        // 1. Zero-Trace Vault Sync: Extração da sessão atualizada, criptografia no Vault e limpeza do disco
        let vault_opt = vault.lock().unwrap().clone();
        if let Some(v) = vault_opt {
            let session_svc = crate::service_database::SessionService::new(v);
            match crate::extraction_session::fire_fox::extract_unified_session(&profile_dir) {
                Ok(fresh_session) => {
                    info!(
                        "🔒 Criptografando e persistindo sessão atualizada no Star Vault para o perfil {} ({} cookies, {} storage)",
                        profile_id, fresh_session.total_cookies, fresh_session.total_storage_items
                    );
                    if let Err(e) = session_svc.save_session(&profile_id, &fresh_session) {
                        tracing::error!("Erro ao salvar sessão criptografada no Vault: {e}");
                    }
                }
                Err(e) => {
                    tracing::warn!("Aviso ao extrair sessão no fechamento da janela: {e}");
                }
            }

            info!(
                "🛡️ Zero-Trace: expurgando arquivos temporários de sessão em texto puro do disco ({})",
                profile_id
            );
            crate::launcher::engine::injection::purge_ephemeral_session_files(&profile_dir);
        }

        // Limpa registros em memória
        {
            let mut map = running.lock().unwrap();
            map.remove(&profile_id);
        }

        {
            let mut dirs = profile_dirs.lock().unwrap();
            dirs.remove(&profile_id);
        }

        {
            let mut ports_map = ports.lock().unwrap();
            ports_map.remove(&profile_id);
        }

        {
            let mut relays_map = relays.lock().unwrap();
            if let Some(mut relay) = relays_map.remove(&profile_id) {
                relay.stop();
            }
        }

        // Atualiza metadata.json no disco com status "ready"
        if let Ok(content) = fs::read_to_string(&meta_file) {
            if let Ok(mut prof) = serde_json::from_str::<Profile>(&content) {
                let now = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs() as i64;
                prof.status = "ready".to_string();
                prof.updated_at = now;
                let _ = fs::write(&meta_file, serde_json::to_string_pretty(&prof).unwrap_or_default());
            }
        }

        // Emite evento WebSocket notificando o frontend
        info!("📢 Notificando frontend via WebSocket: perfil {} agora é 'ready'", profile_id);
        ws.emit(WsEvent::ProfileStatus {
            profile_id: profile_id.clone(),
            status: "ready".to_string(),
        });

        // Agenda auto-sync para backup na nuvem caso habilitado
        if let Some(engine) = auto_sync.lock().unwrap().as_ref() {
            engine.schedule_browser_closed(profile_id);
        }
    });
}
