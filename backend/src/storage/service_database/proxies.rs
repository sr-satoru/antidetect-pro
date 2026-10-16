use super::data::{crypto::decrypt_payload, crypto::encrypt_payload, Vault};
use crate::models::{CreateProxyDto, ProxyItem, ProxyTestRequest, ProxyTestResult, UpdateProxyDto};
use rusqlite::params;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

fn now_secs() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

#[derive(serde::Serialize, serde::Deserialize)]
struct ProxyCredentials {
    user: String,
    pass: String,
}

/// Serviço de proxies com persistência direta na tabela `proxies` do Star Vault
#[derive(Clone)]
pub struct ProxyService {
    vault: Arc<Vault>,
}

pub type ProxyStorage = ProxyService;

impl ProxyService {
    pub fn new(vault: Arc<Vault>) -> Self {
        Self { vault }
    }

    pub fn list(&self) -> Result<Vec<ProxyItem>, String> {
        let conn = self.vault.conn();
        let conn_guard = conn.lock().map_err(|e| e.to_string())?;

        let mut stmt = conn_guard
            .prepare("SELECT id, name, proxy_type, host, port, credentials_enc, ip, country, status, created_at FROM proxies ORDER BY created_at DESC")
            .map_err(|e| e.to_string())?;
        let mut rows = stmt.query([]).map_err(|e| e.to_string())?;

        let mut proxies = Vec::new();
        while let Some(row) = rows.next().map_err(|e| e.to_string())? {
            let id: String = row.get(0).map_err(|e| e.to_string())?;
            let name: String = row.get(1).map_err(|e| e.to_string())?;
            let proxy_type: String = row.get(2).map_err(|e| e.to_string())?;
            let host: String = row.get(3).map_err(|e| e.to_string())?;
            let port: String = row.get(4).map_err(|e| e.to_string())?;
            let credentials_enc: Vec<u8> = row.get(5).map_err(|e| e.to_string())?;
            let ip: String = row.get(6).map_err(|e| e.to_string())?;
            let country: String = row.get(7).map_err(|e| e.to_string())?;
            let status: String = row.get(8).map_err(|e| e.to_string())?;
            let created_at: i64 = row.get(9).map_err(|e| e.to_string())?;

            let (user, pass) = match decrypt_payload(self.vault.key().as_ref(), &credentials_enc) {
                Ok(decrypted) => match serde_json::from_slice::<ProxyCredentials>(&decrypted) {
                    Ok(creds) => (creds.user, creds.pass),
                    Err(_) => (String::new(), String::new()),
                },
                Err(_) => (String::new(), String::new()),
            };

            proxies.push(ProxyItem {
                id,
                name,
                proxy_type,
                host,
                port,
                user,
                pass,
                ip,
                country,
                status,
                created_at,
            });
        }

        Ok(proxies)
    }

    pub fn create(&self, dto: CreateProxyDto) -> Result<ProxyItem, String> {
        let id = crate::id_generator::generate_proxy_id();
        let port_str = if let Some(n) = dto.port.as_u64() {
            n.to_string()
        } else if let Some(s) = dto.port.as_str() {
            s.to_string()
        } else {
            "8080".to_string()
        };

        let user = dto.username.or(dto.user).unwrap_or_default();
        let pass = dto.password.or(dto.pass).unwrap_or_default();
        let proxy_type = dto.proxy_type.unwrap_or_else(|| "socks5".to_string());
        let name = dto.name.unwrap_or_else(|| format!("Proxy {}", dto.host));
        let created_at = now_secs();
        let country = "BR - Brasil".to_string();
        let status = "active".to_string();

        let creds = ProxyCredentials {
            user: user.clone(),
            pass: pass.clone(),
        };
        let creds_bytes = serde_json::to_vec(&creds).map_err(|e| e.to_string())?;
        let credentials_enc = encrypt_payload(self.vault.key().as_ref(), &creds_bytes)?;

        let conn = self.vault.conn();
        let conn_guard = conn.lock().map_err(|e| e.to_string())?;

        conn_guard
            .execute(
                "INSERT INTO proxies (id, name, proxy_type, host, port, credentials_enc, ip, country, status, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                params![
                    id,
                    name,
                    proxy_type,
                    dto.host,
                    port_str,
                    credentials_enc,
                    dto.host,
                    country,
                    status,
                    created_at,
                ],
            )
            .map_err(|e| e.to_string())?;

        Ok(ProxyItem {
            id,
            name,
            proxy_type,
            host: dto.host.clone(),
            port: port_str,
            user,
            pass,
            ip: dto.host,
            country,
            status,
            created_at,
        })
    }

    pub fn get(&self, id: &str) -> Result<ProxyItem, String> {
        let conn = self.vault.conn();
        let conn_guard = conn.lock().map_err(|e| e.to_string())?;

        let mut stmt = conn_guard
            .prepare("SELECT id, name, proxy_type, host, port, credentials_enc, ip, country, status, created_at FROM proxies WHERE id = ?1")
            .map_err(|e| e.to_string())?;

        let row = stmt.query_row(params![id], |row| {
            let id: String = row.get(0)?;
            let name: String = row.get(1)?;
            let proxy_type: String = row.get(2)?;
            let host: String = row.get(3)?;
            let port: String = row.get(4)?;
            let credentials_enc: Vec<u8> = row.get(5)?;
            let ip: String = row.get(6)?;
            let country: String = row.get(7)?;
            let status: String = row.get(8)?;
            let created_at: i64 = row.get(9)?;
            Ok((id, name, proxy_type, host, port, credentials_enc, ip, country, status, created_at))
        }).map_err(|_| "Proxy não encontrado".to_string())?;

        let (user, pass) = match decrypt_payload(self.vault.key().as_ref(), &row.5) {
            Ok(decrypted) => match serde_json::from_slice::<ProxyCredentials>(&decrypted) {
                Ok(creds) => (creds.user, creds.pass),
                Err(_) => (String::new(), String::new()),
            },
            Err(_) => (String::new(), String::new()),
        };

        Ok(ProxyItem {
            id: row.0,
            name: row.1,
            proxy_type: row.2,
            host: row.3,
            port: row.4,
            user,
            pass,
            ip: row.6,
            country: row.7,
            status: row.8,
            created_at: row.9,
        })
    }

    pub fn update(&self, id: &str, dto: UpdateProxyDto) -> Result<ProxyItem, String> {
        let existing = self.get(id)?;
        let new_name = dto.name.unwrap_or(existing.name);
        let new_type = dto.proxy_type.unwrap_or(existing.proxy_type);
        let new_host = dto.host.unwrap_or(existing.host);
        let new_port = if let Some(p) = dto.port {
            if let Some(n) = p.as_u64() {
                n.to_string()
            } else if let Some(s) = p.as_str() {
                s.to_string()
            } else {
                existing.port
            }
        } else {
            existing.port
        };

        let new_user = dto.username.or(dto.user).unwrap_or(existing.user);
        let new_pass = dto.password.or(dto.pass).unwrap_or(existing.pass);
        let new_country = dto.country.unwrap_or(existing.country);
        let new_status = dto.status.unwrap_or(existing.status);
        let new_ip = new_host.clone();

        let creds = ProxyCredentials {
            user: new_user.clone(),
            pass: new_pass.clone(),
        };
        let creds_bytes = serde_json::to_vec(&creds).map_err(|e| e.to_string())?;
        let credentials_enc = encrypt_payload(self.vault.key().as_ref(), &creds_bytes)?;

        let conn = self.vault.conn();
        let conn_guard = conn.lock().map_err(|e| e.to_string())?;

        conn_guard
            .execute(
                "UPDATE proxies SET name = ?1, proxy_type = ?2, host = ?3, port = ?4, credentials_enc = ?5, ip = ?6, country = ?7, status = ?8 WHERE id = ?9",
                params![
                    new_name,
                    new_type,
                    new_host,
                    new_port,
                    credentials_enc,
                    new_ip,
                    new_country,
                    new_status,
                    id,
                ],
            )
            .map_err(|e| e.to_string())?;

        Ok(ProxyItem {
            id: id.to_string(),
            name: new_name,
            proxy_type: new_type,
            host: new_host,
            port: new_port,
            user: new_user,
            pass: new_pass,
            ip: new_ip,
            country: new_country,
            status: new_status,
            created_at: existing.created_at,
        })
    }

    pub fn delete(&self, id: &str) -> Result<(), String> {
        let conn = self.vault.conn();
        let conn_guard = conn.lock().map_err(|e| e.to_string())?;
        conn_guard
            .execute("DELETE FROM proxies WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub async fn test_proxy(&self, dto: &ProxyTestRequest) -> ProxyTestResult {
        let proxy_type = dto.proxy_type.as_deref().unwrap_or("socks5");
        crate::proxy_validator::ProxyValidator::validate(
            proxy_type,
            &dto.host,
            dto.get_port(),
            dto.get_username(),
            dto.get_password(),
        )
        .await
    }
}
