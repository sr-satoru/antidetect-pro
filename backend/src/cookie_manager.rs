use rusqlite::{params, Connection, OpenFlags};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use tracing::info;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnifiedCookie {
    pub name: String,
    pub value: String,
    pub domain: String,
    pub path: String,
    pub expiry: Option<i64>,
    pub is_secure: bool,
    pub is_http_only: bool,
    pub same_site: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DomainSummary {
    pub domain: String,
    pub count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CookieStats {
    pub total_count: usize,
    pub domains: Vec<DomainSummary>,
    pub cookies: Vec<UnifiedCookie>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportCookieResult {
    pub imported: usize,
    pub skipped: usize,
    pub errors: Vec<String>,
}

pub struct CookieManager;

impl CookieManager {
    /// Obtém o caminho do banco de cookies do perfil Firefox/Camoufox
    pub fn get_cookie_db_path(profile_dir: &Path) -> PathBuf {
        profile_dir.join("cookies.sqlite")
    }

    /// Garante que o banco e o schema moz_cookies existam caso o perfil nunca tenha sido iniciado
    pub fn ensure_db_schema(db_path: &Path) -> Result<(), String> {
        if let Some(parent) = db_path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        let conn = Connection::open(db_path)
            .map_err(|e| format!("Falha ao abrir/criar banco de cookies: {e}"))?;

        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS moz_cookies (
                id INTEGER PRIMARY KEY,
                originAttributes TEXT NOT NULL DEFAULT '',
                name TEXT,
                value TEXT,
                host TEXT,
                path TEXT,
                expiry INTEGER,
                lastAccessed INTEGER,
                creationTime INTEGER,
                isSecure INTEGER,
                isHttpOnly INTEGER,
                inBrowserElement INTEGER DEFAULT 0,
                sameSite INTEGER DEFAULT 0,
                schemeMap INTEGER DEFAULT 0,
                isPartitionedAttributeSet INTEGER DEFAULT 0,
                updateTime INTEGER,
                CONSTRAINT moz_uniqueid UNIQUE (name, host, path, originAttributes)
            );
            CREATE INDEX IF NOT EXISTS moz_basedomain ON moz_cookies (host);",
        )
        .map_err(|e| format!("Falha ao inicializar tabela moz_cookies: {e}"))?;

        Ok(())
    }

    /// Formata uma URI válida do SQLite compatível com Windows (file:///C:/...) e Unix (file:/...)
    pub fn format_sqlite_uri(path: &Path) -> String {
        let p_str = path.to_string_lossy().replace('\\', "/");
        if p_str.starts_with('/') {
            format!("file:{}?mode=ro&immutable=1", p_str)
        } else {
            format!("file:///{}?mode=ro&immutable=1", p_str)
        }
    }

    /// Lê os cookies do perfil (mesmo com navegador aberto, abrindo como Read-Only com URI)
    pub fn read_cookies(profile_dir: &Path) -> Result<CookieStats, String> {
        let db_path = Self::get_cookie_db_path(profile_dir);
        if !db_path.exists() {
            return Ok(CookieStats {
                total_count: 0,
                domains: vec![],
                cookies: vec![],
            });
        }

        let flags = OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_URI;
        let uri = Self::format_sqlite_uri(&db_path);
        let conn = Connection::open_with_flags(&uri, flags)
            .or_else(|_| Connection::open_with_flags(&db_path, flags))
            .map_err(|e| format!("Não foi possível abrir cookies.sqlite: {e}"))?;

        let mut stmt = conn
            .prepare(
                "SELECT name, value, host, path, expiry, isSecure, isHttpOnly, sameSite 
                 FROM moz_cookies 
                 ORDER BY host ASC, name ASC",
            )
            .map_err(|e| format!("Erro ao preparar consulta de cookies: {e}"))?;

        let mut cookies = Vec::new();
        let mut domain_counts: HashMap<String, usize> = HashMap::new();

        let rows = stmt
            .query_map([], |row| {
                let same_site_int: i32 = row.get(7).unwrap_or(0);
                let same_site_str = match same_site_int {
                    1 => "Lax",
                    2 => "Strict",
                    _ => "None",
                };

                Ok(UnifiedCookie {
                    name: row.get(0).unwrap_or_default(),
                    value: row.get(1).unwrap_or_default(),
                    domain: row.get(2).unwrap_or_default(),
                    path: row.get(3).unwrap_or_default(),
                    expiry: row.get(4).ok(),
                    is_secure: row.get::<_, i32>(5).unwrap_or(0) == 1,
                    is_http_only: row.get::<_, i32>(6).unwrap_or(0) == 1,
                    same_site: same_site_str.to_string(),
                })
            })
            .map_err(|e| format!("Erro ao ler cookies: {e}"))?;

        for cookie_result in rows {
            if let Ok(cookie) = cookie_result {
                *domain_counts.entry(cookie.domain.clone()).or_insert(0) += 1;
                cookies.push(cookie);
            }
        }

        let mut domains: Vec<DomainSummary> = domain_counts
            .into_iter()
            .map(|(domain, count)| DomainSummary { domain, count })
            .collect();
        domains.sort_by(|a, b| b.count.cmp(&a.count).then_with(|| a.domain.cmp(&b.domain)));

        let total_count = cookies.len();
        Ok(CookieStats {
            total_count,
            domains,
            cookies,
        })
    }

    /// Importa cookies em formato JSON (Puppeteer / EditThisCookie) ou Netscape cookies.txt
    pub fn import_cookies(
        profile_dir: &Path,
        raw_content: &str,
    ) -> Result<ImportCookieResult, String> {
        let db_path = Self::get_cookie_db_path(profile_dir);
        Self::ensure_db_schema(&db_path)?;

        let mut parsed_cookies = Vec::new();
        let mut errors = Vec::new();

        // 1. Tenta analisar como JSON (Puppeteer / EditThisCookie / Cookie-Editor)
        let trimmed = raw_content.trim();
        if trimmed.starts_with('[') {
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(trimmed) {
                if let Some(arr) = val.as_array() {
                    for item in arr {
                        let name = item
                            .get("name")
                            .and_then(|v| v.as_str())
                            .unwrap_or_default()
                            .to_string();
                        let value = item
                            .get("value")
                            .and_then(|v| v.as_str())
                            .unwrap_or_default()
                            .to_string();
                        let domain = item
                            .get("domain")
                            .or_else(|| item.get("host"))
                            .and_then(|v| v.as_str())
                            .unwrap_or_default()
                            .to_string();
                        let path = item
                            .get("path")
                            .and_then(|v| v.as_str())
                            .unwrap_or("/")
                            .to_string();

                        let expiry = item
                            .get("expirationDate")
                            .or_else(|| item.get("expires"))
                            .and_then(|v| {
                                v.as_i64()
                                    .or_else(|| v.as_f64().map(|f| f as i64))
                            });

                        let is_secure = item
                            .get("secure")
                            .and_then(|v| v.as_bool())
                            .unwrap_or(false);
                        let is_http_only = item
                            .get("httpOnly")
                            .and_then(|v| v.as_bool())
                            .unwrap_or(false);

                        let same_site = item
                            .get("sameSite")
                            .and_then(|v| v.as_str())
                            .unwrap_or("None")
                            .to_string();

                        if !name.is_empty() && !domain.is_empty() {
                            parsed_cookies.push(UnifiedCookie {
                                name,
                                value,
                                domain,
                                path,
                                expiry,
                                is_secure,
                                is_http_only,
                                same_site,
                            });
                        }
                    }
                }
            }
        }

        // 2. Se não parseou como JSON, tenta como Netscape cookies.txt
        if parsed_cookies.is_empty() {
            for line in trimmed.lines() {
                let line = line.trim();
                if line.is_empty() || line.starts_with('#') {
                    continue;
                }
                let parts: Vec<&str> = line.split('\t').collect();
                if parts.len() >= 7 {
                    let domain = parts[0].to_string();
                    let path = parts[2].to_string();
                    let is_secure = parts[3].eq_ignore_ascii_case("TRUE");
                    let expiry = parts[4].parse::<i64>().ok();
                    let name = parts[5].to_string();
                    let value = parts[6].to_string();

                    if !name.is_empty() && !domain.is_empty() {
                        parsed_cookies.push(UnifiedCookie {
                            name,
                            value,
                            domain,
                            path,
                            expiry,
                            is_secure,
                            is_http_only: false,
                            same_site: "None".to_string(),
                        });
                    }
                }
            }
        }

        if parsed_cookies.is_empty() {
            return Err("Nenhum cookie válido encontrado no formato JSON ou Netscape".to_string());
        }

        // 3. Escreve no banco de dados SQLite
        let mut conn = Connection::open(&db_path)
            .map_err(|e| format!("Falha ao conectar no banco para escrita: {e}"))?;

        let now_micros = chrono::Utc::now().timestamp_micros();
        let now_secs = chrono::Utc::now().timestamp();
        let far_future = now_secs + 315360000; // 10 anos padrão se não especificado

        let tx = conn
            .transaction()
            .map_err(|e| format!("Falha ao iniciar transação SQLite: {e}"))?;

        let mut imported = 0;
        let mut skipped = 0;

        for cookie in parsed_cookies {
            let expiry = cookie.expiry.unwrap_or(far_future);
            let same_site_int = match cookie.same_site.to_lowercase().as_str() {
                "lax" => 1,
                "strict" => 2,
                _ => 0,
            };

            let res = tx.execute(
                "INSERT OR REPLACE INTO moz_cookies (
                    originAttributes, name, value, host, path, expiry, lastAccessed, creationTime,
                    isSecure, isHttpOnly, inBrowserElement, sameSite, schemeMap, isPartitionedAttributeSet, updateTime
                ) VALUES (
                    '', ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 0, ?10, 0, 0, ?6
                )",
                params![
                    cookie.name,
                    cookie.value,
                    cookie.domain,
                    cookie.path,
                    expiry,
                    now_micros,
                    now_micros,
                    if cookie.is_secure { 1 } else { 0 },
                    if cookie.is_http_only { 1 } else { 0 },
                    same_site_int,
                ],
            );

            match res {
                Ok(_) => imported += 1,
                Err(e) => {
                    skipped += 1;
                    errors.push(format!("Erro ao inserir {}: {}", cookie.name, e));
                }
            }
        }

        tx.commit()
            .map_err(|e| format!("Falha ao commitar transação: {e}"))?;

        info!(
            "🍪 Cookies importados para {}: {} inseridos, {} ignorados",
            profile_dir.display(),
            imported,
            skipped
        );

        Ok(ImportCookieResult {
            imported,
            skipped,
            errors,
        })
    }

    /// Limpa todos os cookies do perfil
    pub fn clear_cookies(profile_dir: &Path) -> Result<usize, String> {
        let db_path = Self::get_cookie_db_path(profile_dir);
        if !db_path.exists() {
            return Ok(0);
        }

        let conn = Connection::open(&db_path)
            .map_err(|e| format!("Erro ao abrir cookies.sqlite: {e}"))?;

        let count = conn
            .execute("DELETE FROM moz_cookies", [])
            .map_err(|e| format!("Erro ao limpar cookies: {e}"))?;

        Ok(count)
    }
}
