use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tracing::{debug, info, warn};

use crate::server_sync::cloud_auth::CloudAuthService;
use crate::server_sync::cloud_sync::CloudSyncService;
use crate::ws::{WsEvent, WsState};

type RunningChecker = Arc<dyn Fn(&str) -> bool + Send + Sync>;

#[derive(Clone)]
pub struct AutoSyncEngine {
    sync_service: Arc<CloudSyncService>,
    auth_service: Arc<CloudAuthService>,
    ws: WsState,
    pending_tasks: Arc<Mutex<HashMap<String, tokio::task::JoinHandle<()>>>>,
    running_checker: Arc<Mutex<Option<RunningChecker>>>,
}

impl AutoSyncEngine {
    pub fn new(
        sync_service: Arc<CloudSyncService>,
        auth_service: Arc<CloudAuthService>,
        ws: WsState,
    ) -> Self {
        Self {
            sync_service,
            auth_service,
            ws,
            pending_tasks: Arc::new(Mutex::new(HashMap::new())),
            running_checker: Arc::new(Mutex::new(None)),
        }
    }

    pub fn set_running_checker(&self, checker: RunningChecker) {
        let mut lock = self.running_checker.lock().unwrap();
        *lock = Some(checker);
    }

    /// Gatilho 1: Agenda a sincronização após qualquer alteração no perfil com debounce de 5 segundos.
    /// Se novas alterações ocorrerem antes dos 5 segundos, o cronômetro é reiniciado automaticamente.
    pub fn schedule_profile_change(&self, profile_id: String) {
        let mut map = self.pending_tasks.lock().unwrap();

        // Cancela o timer anterior caso o usuário continue editando
        if let Some(prev) = map.remove(&profile_id) {
            prev.abort();
            debug!("⏱️ AutoSync: Timer de 5s resetado devido a nova alteração no perfil {}", profile_id);
        }

        let sync_service = self.sync_service.clone();
        let auth_service = self.auth_service.clone();
        let ws = self.ws.clone();
        let pid = profile_id.clone();
        let tasks_map = self.pending_tasks.clone();
        let running_checker = self.running_checker.clone();

        let handle = tokio::spawn(async move {
            info!("⏳ AutoSync: Agendado upload do perfil {} para daqui a 5 segundos de inatividade...", pid);
            tokio::time::sleep(Duration::from_secs(5)).await;

            // Remove a si próprio do mapa de pendências
            {
                let mut m = tasks_map.lock().unwrap();
                m.remove(&pid);
            }

            // Se estiver em modo offline, não tenta sincronizar
            if auth_service.get_current_user().await.is_none() {
                debug!("⏸️ AutoSync: Usuário em modo offline. Upload automático cancelado para perfil {}", pid);
                return;
            }

            // Se o perfil estiver em execução no navegador, adia para quando o processo fechar
            if let Some(checker) = running_checker.lock().unwrap().as_ref() {
                if checker(&pid) {
                    info!("⏸️ AutoSync: Perfil {} está em execução no navegador. Upload adiado para o fechamento.", pid);
                    return;
                }
            }

            info!("🚀 AutoSync: 5 segundos de inatividade atingidos. Enviando perfil {} para a nuvem...", pid);
            ws.emit(WsEvent::ProfileSyncing {
                profile_id: pid.clone(),
            });

            match sync_service.upload_profile_with_fallback(&pid, None).await {
                Ok(res) => {
                    info!("✅ AutoSync: Perfil {} sincronizado com sucesso na nuvem! ({} KB)", pid, res.size_kb);
                    ws.emit(WsEvent::ProfileSynced {
                        profile_id: pid,
                        size_kb: res.size_kb,
                    });
                }
                Err(err) => {
                    warn!("⚠️ AutoSync: Falha no upload automático do perfil {}: {}", pid, err);
                    ws.emit(WsEvent::ProfileSyncFailed {
                        profile_id: pid,
                        error: err.to_string(),
                    });
                }
            }
        });

        map.insert(profile_id, handle);
    }

    /// Gatilho 2: Agenda o upload automático exatamente 3 segundos após o navegador fechar.
    /// Aguarda 3 segundos para garantir que o Chromium descarregou totalmente cookies, localStorage e liberou as travas de arquivos.
    pub fn schedule_browser_closed(&self, profile_id: String) {
        let mut map = self.pending_tasks.lock().unwrap();

        // Cancela qualquer timer de alteração prévio para priorizar o fechamento completo
        if let Some(prev) = map.remove(&profile_id) {
            prev.abort();
        }

        let sync_service = self.sync_service.clone();
        let auth_service = self.auth_service.clone();
        let ws = self.ws.clone();
        let pid = profile_id.clone();
        let tasks_map = self.pending_tasks.clone();

        let handle = tokio::spawn(async move {
            info!("⏳ AutoSync: Navegador fechado. Aguardando 3s para gravação final de cookies do perfil {}...", pid);
            tokio::time::sleep(Duration::from_secs(3)).await;

            // Remove a si próprio do mapa de pendências
            {
                let mut m = tasks_map.lock().unwrap();
                m.remove(&pid);
            }

            // Se estiver em modo offline, não tenta sincronizar
            if auth_service.get_current_user().await.is_none() {
                debug!("⏸️ AutoSync: Modo offline ativo. Upload pós-fechamento ignorado para perfil {}", pid);
                return;
            }

            info!("🚀 AutoSync: 3 segundos concluídos. Enviando perfil {} fechado para a nuvem...", pid);
            ws.emit(WsEvent::ProfileSyncing {
                profile_id: pid.clone(),
            });

            match sync_service.upload_profile_with_fallback(&pid, None).await {
                Ok(res) => {
                    info!("✅ AutoSync: Perfil {} atualizado na nuvem com cookies e sessão recentes! ({} KB)", pid, res.size_kb);
                    ws.emit(WsEvent::ProfileSynced {
                        profile_id: pid,
                        size_kb: res.size_kb,
                    });
                }
                Err(err) => {
                    warn!("⚠️ AutoSync: Falha ao enviar perfil {} após fechamento: {}", pid, err);
                    ws.emit(WsEvent::ProfileSyncFailed {
                        profile_id: pid,
                        error: err.to_string(),
                    });
                }
            }
        });

        map.insert(profile_id, handle);
    }
}
