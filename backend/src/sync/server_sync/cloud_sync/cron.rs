use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tokio::sync::{Mutex as TokioMutex, Semaphore};
use tracing::{debug, info, warn};

use super::service::CloudSyncService;
use crate::server_sync::cloud_auth::CloudAuthService;
use crate::ws::{WsEvent, WsState};

pub type RunningChecker = Arc<dyn Fn(&str) -> bool + Send + Sync>;

/// Motor de agendamento, debounce e sincronização baseada em tempo (cron / auto-sync)
#[derive(Clone)]
pub struct CronSyncEngine {
    sync_service: Arc<CloudSyncService>,
    auth_service: Arc<CloudAuthService>,
    ws: WsState,
    pending_tasks: Arc<Mutex<HashMap<String, tokio::task::JoinHandle<()>>>>,
    running_checker: Arc<Mutex<Option<RunningChecker>>>,
    upload_semaphore: Arc<Semaphore>,
    in_flight: Arc<TokioMutex<HashSet<String>>>,
}

// Alias para compatibilidade total com o restante da aplicação
pub type AutoSyncEngine = CronSyncEngine;

impl CronSyncEngine {
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
            upload_semaphore: Arc::new(Semaphore::new(2)),
            in_flight: Arc::new(TokioMutex::new(HashSet::new())),
        }
    }

    pub fn set_running_checker(&self, checker: RunningChecker) {
        let mut lock = self.running_checker.lock().unwrap();
        *lock = Some(checker);
    }

    /// Disparado quando o navegador fecha: agenda upload com debounce de 3 segundos
    pub fn schedule_browser_closed(&self, profile_id: String) {
        self.schedule_profile_change(profile_id);
    }

    /// Agenda ou reinicia o timer de inatividade (debounce) para enviar o perfil alterado
    pub fn schedule_profile_change(&self, profile_id: String) {
        let mut map = self.pending_tasks.lock().unwrap();

        // Se já existia um timer pendente para o mesmo perfil, aborta e reinicia
        if let Some(prev) = map.remove(&profile_id) {
            prev.abort();
            debug!("⏱️ CronSync: Debounce resetado para perfil {}", profile_id);
        }

        let sync_service = self.sync_service.clone();
        let auth_service = self.auth_service.clone();
        let ws = self.ws.clone();
        let pid = profile_id.clone();
        let tasks_map = self.pending_tasks.clone();
        let running_checker = self.running_checker.clone();
        let semaphore = self.upload_semaphore.clone();
        let in_flight = self.in_flight.clone();

        let handle = tokio::spawn(async move {
            // Aguarda 3 segundos de inatividade
            tokio::time::sleep(Duration::from_secs(3)).await;

            {
                let mut m = tasks_map.lock().unwrap();
                m.remove(&pid);
            }

            // 1. Não executa se estiver deslogado
            if auth_service.get_current_user().await.is_none() {
                debug!("⏸️ CronSync: Usuário offline, upload ignorado para perfil {}", pid);
                return;
            }

            // 2. Não executa se o navegador ainda estiver aberto com esse perfil
            if let Some(checker) = running_checker.lock().unwrap().as_ref() {
                if checker(&pid) {
                    info!("⏸️ CronSync: Perfil {} ainda em execução no navegador. Adiado.", pid);
                    return;
                }
            }

            // 3. Prevenção de duplicidade em voo
            {
                let mut guard = in_flight.lock().await;
                if guard.contains(&pid) {
                    debug!("⏸️ CronSync: Perfil {} já em upload. Ignorando.", pid);
                    return;
                }
                guard.insert(pid.clone());
            }

            // 4. Semáforo de concorrência (máx 2 simultâneos)
            let _permit = match semaphore.acquire().await {
                Ok(p) => p,
                Err(_) => {
                    let mut guard = in_flight.lock().await;
                    guard.remove(&pid);
                    return;
                }
            };

            info!("🚀 CronSync: Iniciando envio do perfil {} para a nuvem...", pid);
            let upload_res = sync_service.upload_profile_with_fallback(&pid, None).await;

            {
                let mut guard = in_flight.lock().await;
                guard.remove(&pid);
            }

            match upload_res {
                Ok(res) => {
                    info!("✅ CronSync: Perfil {} sincronizado com sucesso! ({} KB)", pid, res.size_kb);
                    ws.emit(WsEvent::ProfileSynced {
                        profile_id: pid,
                        size_kb: res.size_kb,
                    });
                }
                Err(err) => {
                    warn!("⚠️ CronSync: Falha no upload automático do perfil {}: {}", pid, err);
                    ws.emit(WsEvent::ProfileSyncFailed {
                        profile_id: pid,
                        error: err,
                    });
                }
            }
        });

        map.insert(profile_id, handle);
    }

    /// Disparado quando um perfil é excluído permanentemente da lixeira:
    /// Aborta qualquer upload pendente e dispara a exclusão na nuvem
    pub fn schedule_profile_deletion(&self, profile_id: String) {
        let mut map = self.pending_tasks.lock().unwrap();

        // Se havia upload pendente na fila para este perfil, aborta imediatamente
        if let Some(prev) = map.remove(&profile_id) {
            prev.abort();
            info!("⏹️ CronSync: Upload pendente cancelado para perfil excluído: {}", profile_id);
        }

        let sync_service = self.sync_service.clone();
        let auth_service = self.auth_service.clone();
        let pid = profile_id.clone();

        tokio::spawn(async move {
            if auth_service.get_current_user().await.is_none() {
                debug!("⏸️ CronSync: Usuário offline, exclusão na nuvem ignorada para perfil {}", pid);
                return;
            }

            info!("🗑️ CronSync: Excluindo perfil '{}' no servidor Java...", pid);
            if let Err(e) = sync_service.delete_profile_from_cloud(&pid, None).await {
                warn!("⚠️ CronSync: Erro ao excluir perfil '{}' da nuvem: {}", pid, e);
            }
        });
    }

    /// Disparado ao esvaziar a lixeira:
    /// Aborta todos os uploads pendentes dos perfis e executa exclusão em lote na nuvem
    pub fn schedule_trash_empty(&self, profile_ids: Vec<String>) {
        if profile_ids.is_empty() {
            return;
        }

        {
            let mut map = self.pending_tasks.lock().unwrap();
            for id in &profile_ids {
                if let Some(prev) = map.remove(id) {
                    prev.abort();
                }
            }
        }

        let sync_service = self.sync_service.clone();
        let auth_service = self.auth_service.clone();

        tokio::spawn(async move {
            if auth_service.get_current_user().await.is_none() {
                debug!("⏸️ CronSync: Usuário offline, esvaziamento da lixeira na nuvem ignorado");
                return;
            }

            info!("🗑️ CronSync: Esvaziando {} perfis da lixeira no servidor Java...", profile_ids.len());
            if let Err(e) = sync_service.delete_trash_batch_from_cloud(&profile_ids, None).await {
                warn!("⚠️ CronSync: Erro ao esvaziar lixeira na nuvem: {}", e);
            }
        });
    }

    /// Inicia uma rotina em background que executa a cada intervalo de tempo
    pub fn iniciar_cron_periodico(self: Arc<Self>, intervalo: Duration) {
        tokio::spawn(async move {
            let mut ticker = tokio::time::interval(intervalo);
            loop {
                ticker.tick().await;
                if self.auth_service.get_current_user().await.is_some() {
                    debug!("⏰ CronSync: Ciclo periódico executado.");
                }
            }
        });
    }
}
