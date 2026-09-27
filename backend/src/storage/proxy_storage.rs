use crate::models::{CreateProxyDto, ProxyItem};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

pub struct ProxyStorage {
    data_dir: PathBuf,
}

impl ProxyStorage {
    pub fn new<P: AsRef<Path>>(data_dir: P) -> Self {
        let dir = data_dir.as_ref().join("proxies");
        let _ = fs::create_dir_all(&dir);
        Self { data_dir: dir }
    }

    fn now_secs() -> i64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs() as i64
    }

    pub fn list(&self) -> Vec<ProxyItem> {
        let mut proxies = Vec::new();
        if let Ok(entries) = fs::read_dir(&self.data_dir) {
            for entry in entries.flatten() {
                if let Ok(file_type) = entry.file_type() {
                    if file_type.is_file() && entry.path().extension().and_then(|s| s.to_str()) == Some("json") {
                        if let Ok(content) = fs::read_to_string(entry.path()) {
                            if let Ok(proxy) = serde_json::from_str::<ProxyItem>(&content) {
                                proxies.push(proxy);
                            }
                        }
                    }
                }
            }
        }
        proxies.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        proxies
    }

    pub fn create(&self, dto: CreateProxyDto) -> Result<ProxyItem, String> {
        let id = uuid::Uuid::new_v4().to_string();
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

        let item = ProxyItem {
            id: id.clone(),
            name,
            proxy_type,
            host: dto.host.clone(),
            port: port_str,
            user,
            pass,
            ip: dto.host,
            country: "BR - Brasil".to_string(),
            status: "active".to_string(),
            created_at: Self::now_secs(),
        };

        let file_path = self.data_dir.join(format!("{id}.json"));
        let json_str = serde_json::to_string_pretty(&item).map_err(|e| e.to_string())?;
        fs::write(file_path, json_str).map_err(|e| e.to_string())?;

        Ok(item)
    }



    pub fn delete(&self, id: &str) -> Result<(), String> {
        let file_path = self.data_dir.join(format!("{id}.json"));
        if file_path.exists() {
            fs::remove_file(file_path).map_err(|e| e.to_string())?;
        }
        Ok(())
    }
}
