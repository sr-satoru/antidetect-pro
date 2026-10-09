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
    engine: Arc<dyn crate::browser::engines::BrowserEngine>,
    running: Arc<Mutex<HashMap<String, u32>>>,
    profile_dirs: Arc<Mutex<HashMap<String, PathBuf>>>,
    ports: Arc<Mutex<HashMap<String, u16>>>,
    relays: Arc<Mutex<HashMap<String, crate::network::relay::ProxyRelay>>>,
    ws: WsState,
    auto_sync: Arc<Mutex<Option<Arc<crate::server_sync::AutoSyncEngine>>>>,
    vault: Arc<Mutex<Option<Arc<crate::service_database::Vault>>>>,
) {
    tokio::spawn(async move {
        let cdp_port = {
            let pmap = ports.lock().unwrap();
            pmap.get(&profile_id).copied()
        };

        // Canal de finalização para o loop de sincronização contínua de cookies CDP
        let (stop_sync_tx, mut stop_sync_rx) = tokio::sync::oneshot::channel::<()>();

        if let Some(port) = cdp_port {
            let pid_clone = profile_id.clone();
            let vault_clone = vault.clone();
            tokio::spawn(async move {
                let client = reqwest::Client::new();
                let mut interval = tokio::time::interval(std::time::Duration::from_secs(4));
                interval.tick().await; // Descarta tick imediato

                loop {
                    tokio::select! {
                        _ = &mut stop_sync_rx => {
                            break;
                        }
                        _ = interval.tick() => {
                            if let Some(ws_url) = crate::launcher::engine::cdp::wait_for_devtools_endpoint(port, &client, false).await {
                                if let Ok(live_cookies) = crate::launcher::engine::cdp::fetch_cookies_via_cdp(&ws_url).await {
                                    if !live_cookies.is_empty() {
                                        let vault_opt = vault_clone.lock().unwrap().clone();
                                        if let Some(v) = vault_opt {
                                            let session_svc = crate::service_database::SessionService::new(v);
                                            let current = session_svc.load_session(&pid_clone).unwrap_or(None).unwrap_or_default();
                                            let count = live_cookies.len();
                                            let fresh = crate::extraction_session::UnifiedSession {
                                                cookies: live_cookies,
                                                local_storage: current.local_storage,
                                                total_cookies: count,
                                                total_storage_items: current.total_storage_items,
                                            };
                                            let _ = session_svc.save_session(&pid_clone, &fresh);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });
        }

        let exit_status = child.wait().await;
        let _ = stop_sync_tx.send(());

        info!(
            "🛑 Processo inicial {} (PID {}) do perfil {} concluiu ({:?}).",
            engine.kernel_name(), pid, profile_id, exit_status
        );

        // Aguarda a liberação de locks de arquivo do perfil (especialmente no Windows)
        while sys::is_profile_locked(&profile_dir) {
            tokio::time::sleep(std::time::Duration::from_millis(800)).await;
        }

        info!(
            "🏁 Janela do perfil {} totalmente fechada pelo usuário.",
            profile_id
        );

        // Limpa travas e locks órfãos deixados pelo processo
        engine.clear_profile_locks(&profile_dir);

        // 1. Vault Sync: extração de sessão delegada à engine correspondente
        let vault_opt = vault.lock().unwrap().clone();
        if let Some(v) = vault_opt {
            let session_svc = crate::service_database::SessionService::new(v);
            if let Ok(fresh_session) = engine.extract_session(&profile_dir) {
                if fresh_session.total_cookies > 0 || fresh_session.total_storage_items > 0 {
                    info!(
                        "🔒 Sincronizando sessão persistida no Star Vault para o perfil {} ({} cookies, {} storage)",
                        profile_id, fresh_session.total_cookies, fresh_session.total_storage_items
                    );
                    if let Err(e) = session_svc.save_session(&profile_id, &fresh_session) {
                        tracing::error!("Erro ao salvar sessão no Vault: {e}");
                    }
                }
            }
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
