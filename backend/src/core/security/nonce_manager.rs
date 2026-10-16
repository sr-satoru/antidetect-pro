use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};
use uuid::Uuid;

/// Ticket de uso único gerado pelo canal seguro nativo (Tauri IPC ou Dev Handshake)
#[derive(Debug, Clone)]
struct TicketEntry {
    scope: String,
    created_at: Instant,
    ttl: Duration,
}

/// Sessão efêmera do aplicativo desktop mantida exclusivamente em memória RAM
#[derive(Debug, Clone)]
struct SessionEntry {
    #[allow(dead_code)]
    created_at: Instant,
    last_activity: Instant,
    max_idle: Duration,
}

/// Gerenciador de Nonces, Tickets de uso único e Sessões efêmeras do Star Multlogin
#[derive(Debug)]
pub struct NonceManager {
    tickets: Mutex<HashMap<String, TicketEntry>>,
    sessions: Mutex<HashMap<String, SessionEntry>>,
}

impl Default for NonceManager {
    fn default() -> Self {
        Self::new()
    }
}

impl NonceManager {
    /// Cria uma nova instância com armazenamento em memória vazio
    pub fn new() -> Self {
        Self {
            tickets: Mutex::new(HashMap::new()),
            sessions: Mutex::new(HashMap::new()),
        }
    }

    /// Gera um ticket criptograficamente aleatório de uso único com escopo e TTL
    /// Formato: `ticket_<uuid4_sem_hifens>`
    pub fn create_ticket(&self, scope: &str, ttl_secs: u64) -> String {
        let id = format!("ticket_{}", Uuid::new_v4().simple());
        let entry = TicketEntry {
            scope: scope.to_string(),
            created_at: Instant::now(),
            ttl: Duration::from_secs(ttl_secs),
        };

        if let Ok(mut map) = self.tickets.lock() {
            map.insert(id.clone(), entry);
        }
        id
    }

    /// Consome um ticket em tempo constante (uso único estrito).
    /// Remove o ticket imediatamente do HashMap no primeiro acesso.
    /// Retorna `true` apenas se o ticket existir, coincidir com o escopo requerido e não estiver expirado.
    pub fn consume_ticket(&self, ticket_id: &str, required_scope: &str) -> bool {
        let mut map = match self.tickets.lock() {
            Ok(m) => m,
            Err(poisoned) => poisoned.into_inner(),
        };

        if let Some(entry) = map.remove(ticket_id) {
            let is_scope_valid = entry.scope == required_scope;
            let is_not_expired = entry.created_at.elapsed() < entry.ttl;
            is_scope_valid && is_not_expired
        } else {
            false
        }
    }

    /// Cria uma sessão efêmera para a interface do aplicativo desktop
    /// Formato: `ses_<uuid4_sem_hifens>`
    pub fn create_session(&self, max_idle_secs: u64) -> String {
        let id = format!("ses_{}", Uuid::new_v4().simple());
        let now = Instant::now();
        let entry = SessionEntry {
            created_at: now,
            last_activity: now,
            max_idle: Duration::from_secs(max_idle_secs),
        };

        let mut map = match self.sessions.lock() {
            Ok(m) => m,
            Err(poisoned) => poisoned.into_inner(),
        };
        map.insert(id.clone(), entry);
        id
    }

    /// Valida uma sessão desktop e renova o tempo de inatividade (sliding window)
    pub fn validate_session(&self, session_id: &str) -> bool {
        let mut map = match self.sessions.lock() {
            Ok(m) => m,
            Err(poisoned) => poisoned.into_inner(),
        };

        if let Some(entry) = map.get_mut(session_id) {
            if entry.last_activity.elapsed() < entry.max_idle {
                entry.last_activity = Instant::now();
                return true;
            }
            // Expirada por inatividade: remove da memória
            map.remove(session_id);
        }
        false
    }

    /// Revoga imediatamente uma sessão ativa
    pub fn invalidate_session(&self, session_id: &str) {
        let mut map = match self.sessions.lock() {
            Ok(m) => m,
            Err(poisoned) => poisoned.into_inner(),
        };
        map.remove(session_id);
    }

    /// Limpa tickets expirados e sessões que ultrapassaram a janela de inatividade
    pub fn cleanup(&self) {
        if let Ok(mut tickets) = self.tickets.lock() {
            tickets.retain(|_, v| v.created_at.elapsed() < v.ttl);
        }

        if let Ok(mut sessions) = self.sessions.lock() {
            sessions.retain(|_, v| v.last_activity.elapsed() < v.max_idle);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::thread::sleep;

    #[test]
    fn test_ticket_creation_and_single_use() {
        let nm = NonceManager::new();
        let ticket = nm.create_ticket("handshake", 30);
        assert!(ticket.starts_with("ticket_"));

        // Primeiro consumo: sucesso
        assert!(nm.consume_ticket(&ticket, "handshake"));

        // Segundo consumo (replay attack): deve falhar
        assert!(!nm.consume_ticket(&ticket, "handshake"));
    }

    #[test]
    fn test_ticket_wrong_scope() {
        let nm = NonceManager::new();
        let ticket = nm.create_ticket("handshake", 30);

        // Scope divergente: falha e consome/remove o ticket para prevenir brute-force
        assert!(!nm.consume_ticket(&ticket, "apply_update"));
        // Já não existe mais
        assert!(!nm.consume_ticket(&ticket, "handshake"));
    }

    #[test]
    fn test_ticket_expiration() {
        let nm = NonceManager::new();
        let ticket = nm.create_ticket("quick", 0); // 0 segundos de TTL
        sleep(Duration::from_millis(15));
        assert!(!nm.consume_ticket(&ticket, "quick"));
    }

    #[test]
    fn test_session_sliding_window() {
        let nm = NonceManager::new();
        let session = nm.create_session(1); // 1 segundo de TTL
        assert!(session.starts_with("ses_"));

        // Válido imediatamente
        assert!(nm.validate_session(&session));

        // Aguarda 1.1s -> deve expirar
        sleep(Duration::from_millis(1100));
        assert!(!nm.validate_session(&session));
    }

    #[test]
    fn test_session_invalidation() {
        let nm = NonceManager::new();
        let session = nm.create_session(300);
        assert!(nm.validate_session(&session));

        nm.invalidate_session(&session);
        assert!(!nm.validate_session(&session));
    }

    #[test]
    fn test_cleanup() {
        let nm = NonceManager::new();
        let ticket = nm.create_ticket("tmp", 0);
        let session = nm.create_session(0);
        sleep(Duration::from_millis(10));

        nm.cleanup();
        assert!(!nm.consume_ticket(&ticket, "tmp"));
        assert!(!nm.validate_session(&session));
    }
}
