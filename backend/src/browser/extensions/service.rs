use std::fmt::Write as _;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use tracing::info;

use super::cache::ExtensionCache;
use crate::models::{CreateExtensionDto, ExtensionItem, RecommendedExtension, UpdateExtensionDto};

pub struct ExtensionStorage {
    data_dir: PathBuf,
    client: reqwest::Client,
    cache: ExtensionCache,
}

impl ExtensionStorage {
    pub fn new<P: AsRef<Path>>(data_dir: P) -> Self {
        let dir = data_dir.as_ref().join("extensions");
        let _ = fs::create_dir_all(&dir);

        let client = reqwest::Client::builder()
            .user_agent("Mozilla/5.0 (X11; Linux x86_64; rv:150.0) Gecko/20100101 Firefox/150.0 StarMultlogin/1.0")
            .timeout(std::time::Duration::from_secs(15))
            .build()
            .unwrap_or_default();

        Self {
            data_dir: dir,
            client,
            cache: ExtensionCache::default(),
        }
    }

    fn now_millis() -> u64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64
    }

    fn save_extension(&self, item: &ExtensionItem) -> Result<(), String> {
        let path = self.data_dir.join(format!("{}.json", item.id));
        let content = serde_json::to_string_pretty(item).map_err(|e| e.to_string())?;
        fs::write(path, content).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn list(&self) -> Vec<ExtensionItem> {
        let mut list = Vec::new();
        if let Ok(entries) = fs::read_dir(&self.data_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().map_or(false, |e| e == "json") {
                    if let Ok(content) = fs::read_to_string(&path) {
                        if let Ok(item) = serde_json::from_str::<ExtensionItem>(&content) {
                            list.push(item);
                        }
                    }
                }
            }
        }
        list.sort_by_key(|e| e.id);
        list
    }

    pub fn get(&self, id: u64) -> Option<ExtensionItem> {
        let path = self.data_dir.join(format!("{id}.json"));
        let content = fs::read_to_string(path).ok()?;
        serde_json::from_str::<ExtensionItem>(&content).ok()
    }

    pub fn create(&self, dto: CreateExtensionDto) -> Result<ExtensionItem, String> {
        let id = dto.id.unwrap_or_else(Self::now_millis);

        let item = ExtensionItem {
            id,
            name: dto.name.unwrap_or_else(|| format!("Extensão #{id}")),
            icon_type: dto.icon_type.or_else(|| Some("custom".to_string())),
            icon_url: dto.icon_url,
            icon_bg: dto.icon_bg.or_else(|| Some("#2F80ED".to_string())),
            enabled: dto.enabled.unwrap_or(true),
            status: dto.status.unwrap_or_else(|| "available".to_string()),
            description: dto.description.unwrap_or_else(|| "Extensão adicionada à equipe.".to_string()),
            provider: dto.provider.unwrap_or_else(|| "Firefox Add-ons".to_string()),
            provider_url: dto.provider_url,
            tab: dto.tab.unwrap_or_else(|| "team".to_string()),
            version: dto.version.or_else(|| Some("1.0.0".to_string())),
        };

        self.save_extension(&item)?;
        info!("Nova extensão salva na equipe: '{}' (ID: {})", item.name, item.id);
        Ok(item)
    }

    pub fn update(&self, id: u64, dto: UpdateExtensionDto) -> Result<ExtensionItem, String> {
        let mut item = self.get(id).ok_or_else(|| format!("Extensão {id} não encontrada"))?;

        if let Some(name) = dto.name {
            let trimmed = name.trim();
            if !trimmed.is_empty() {
                item.name = trimmed.to_string();
            }
        }
        if let Some(enabled) = dto.enabled {
            item.enabled = enabled;
            item.status = if enabled { "available".to_string() } else { "disabled".to_string() };
        }
        if let Some(status) = dto.status {
            item.status = status;
        }
        if let Some(description) = dto.description {
            item.description = description;
        }
        if let Some(icon_bg) = dto.icon_bg {
            item.icon_bg = Some(icon_bg);
        }
        if let Some(version) = dto.version {
            item.version = Some(version);
        }

        self.save_extension(&item)?;
        Ok(item)
    }

    pub fn delete(&self, id: u64) -> Result<(), String> {
        let path = self.data_dir.join(format!("{id}.json"));
        if path.exists() {
            fs::remove_file(path).map_err(|e| e.to_string())?;
        }
        info!("Extensão {} removida da equipe", id);
        Ok(())
    }

    pub async fn search_catalog(
        &self,
        query: Option<&str>,
        category: Option<&str>,
        store: Option<&str>,
    ) -> Vec<RecommendedExtension> {
        let q = query.unwrap_or("").trim();
        let cat = category.unwrap_or("All");
        let st = store.unwrap_or("all");

        if let Some(cached) = self.cache.get(query, category, store) {
            return cached;
        }

        let (amo_cat_slug, is_all_cat) = match cat {
            "Privacy and security" => (Some("privacy-security"), false),
            "Developer tools" => (Some("web-development"), false),
            "Shopping" => (Some("shopping"), false),
            "Workflow and planning" => (Some("tabs"), false),
            "Accessibility" => (Some("appearance"), false),
            "Education" => (Some("language-support"), false),
            "Tools" => (Some("search-tools"), false),
            _ => (None, true),
        };

        let url = match (q.is_empty(), amo_cat_slug) {
            (false, Some(slug)) => format!(
                "https://addons.mozilla.org/api/v5/addons/search/?q={}&category={slug}&type=extension&page_size=30",
                urlencode(q)
            ),
            (false, None) => format!(
                "https://addons.mozilla.org/api/v5/addons/search/?q={}&type=extension&page_size=30",
                urlencode(q)
            ),
            (true, Some(slug)) => format!(
                "https://addons.mozilla.org/api/v5/addons/search/?category={slug}&type=extension&sort=users&page_size=30"
            ),
            (true, None) => {
                "https://addons.mozilla.org/api/v5/addons/search/?type=extension&sort=users&page_size=30".to_string()
            }
        };

        let is_chrome = st.eq_ignore_ascii_case("chrome");
        let provider = if is_chrome { "Chrome Web Store" } else { "Firefox Add-ons" };

        let fetched_items: Vec<RecommendedExtension> = match self.client.get(&url).send().await {
            Ok(resp) if resp.status().is_success() => {
                let json = resp.json::<serde_json::Value>().await.unwrap_or_default();
                json.get("results")
                    .and_then(|r| r.as_array())
                    .map(|results| {
                        results
                            .iter()
                            .filter_map(|item| {
                                let name = extract_localized_string(item.get("name"))?;
                                let desc = extract_localized_string(item.get("summary"))
                                    .unwrap_or_else(|| "Extensão oficial do catálogo.".to_string());
                                let icon_url = item.get("icon_url").and_then(|i| i.as_str()).map(String::from);
                                let addon_url = item.get("url").and_then(|u| u.as_str()).map(String::from);
                                let id = item
                                    .get("guid")
                                    .and_then(|g| g.as_str())
                                    .or_else(|| item.get("slug").and_then(|s| s.as_str()))
                                    .unwrap_or(&name)
                                    .to_string();

                                let mapped_cat = if !is_all_cat {
                                    cat.to_string()
                                } else {
                                    map_amo_category(
                                        item.get("categories")
                                            .and_then(|c| c.as_array())
                                            .map(|v| v.as_slice()),
                                    )
                                    .to_string()
                                };

                                let provider_url = if is_chrome {
                                    Some(format!(
                                        "https://chromewebstore.google.com/search?q={}",
                                        urlencode(&name)
                                    ))
                                } else {
                                    addon_url
                                };

                                Some(RecommendedExtension {
                                    id,
                                    name,
                                    category: mapped_cat,
                                    description: desc,
                                    provider: provider.to_string(),
                                    provider_url,
                                    icon_type: "puzzle".to_string(),
                                    icon_bg: String::new(),
                                    icon_url,
                                    featured: Some(false),
                                })
                            })
                            .collect()
                    })
                    .unwrap_or_default()
            }
            Ok(resp) => {
                tracing::warn!("⚠️ Catálogo AMO retornou status {} para {}", resp.status(), url);
                Vec::new()
            }
            Err(err) => {
                tracing::warn!("⚠️ Erro ao consultar catálogo AMO ({}): {}", url, err);
                Vec::new()
            }
        };

        if !fetched_items.is_empty() {
            self.cache.set(query, category, store, fetched_items.clone());
        }

        fetched_items
    }
}

/// Codifica parâmetros de URL de forma leve e sem alocações excedentes
fn urlencode(input: &str) -> String {
    let mut encoded = String::with_capacity(input.len());
    for b in input.bytes() {
        match b {
            b'a'..=b'z' | b'A'..=b'Z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                encoded.push(b as char);
            }
            _ => {
                let _ = write!(encoded, "%{b:02X}");
            }
        }
    }
    encoded
}

/// Extrai a string no idioma do usuário ou com fallback seguro
fn extract_localized_string(val: Option<&serde_json::Value>) -> Option<String> {
    match val? {
        serde_json::Value::String(s) => Some(s.clone()),
        serde_json::Value::Object(map) => map
            .get("pt-BR")
            .or_else(|| map.get("en-US"))
            .or_else(|| map.values().next())
            .and_then(|v| v.as_str())
            .map(String::from),
        _ => None,
    }
}

/// Mapeia o slug da categoria do AMO para o nome amigável exibido no UI
fn map_amo_category(cats: Option<&[serde_json::Value]>) -> &'static str {
    cats.and_then(|arr| {
        arr.iter().filter_map(|c| c.as_str()).find_map(|slug| match slug {
            "privacy-security" => Some("Privacy and security"),
            "web-development" | "developer-tools" => Some("Developer tools"),
            "appearance" | "accessibility" => Some("Accessibility"),
            "feeds-news-blogging" | "social-communication" | "tabs" | "bookmarks" => {
                Some("Workflow and planning")
            }
            "shopping" => Some("Shopping"),
            "language-support" => Some("Education"),
            "download-management" | "search-tools" | "alerts-updates" => Some("Tools"),
            _ => None,
        })
    })
    .unwrap_or("Tools")
}
