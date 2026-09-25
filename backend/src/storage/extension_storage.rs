use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use tracing::{info, warn};

use crate::models::{CreateExtensionDto, ExtensionItem, RecommendedExtension, UpdateExtensionDto};

pub struct ExtensionStorage {
    data_dir: PathBuf,
    client: reqwest::Client,
}

impl ExtensionStorage {
    pub fn new<P: AsRef<Path>>(data_dir: P) -> Self {
        let dir = data_dir.as_ref().join("extensions");
        let _ = fs::create_dir_all(&dir);

        let client = reqwest::Client::builder()
            .user_agent("Mozilla/5.0 (X11; Linux x86_64; rv:150.0) Gecko/20100101 Firefox/150.0 FuryBrowser/1.0")
            .timeout(std::time::Duration::from_secs(8))
            .build()
            .unwrap_or_default();

        Self {
            data_dir: dir,
            client,
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

    /// Retorna as extensões salvas na equipe (sem nada pré-adicionado)
    pub fn list(&self) -> Vec<ExtensionItem> {
        let mut list = Vec::new();
        if let Ok(entries) = fs::read_dir(&self.data_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().map(|e| e == "json").unwrap_or(false) {
                    if let Ok(content) = fs::read_to_string(path) {
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
        if let Ok(content) = fs::read_to_string(path) {
            serde_json::from_str::<ExtensionItem>(&content).ok()
        } else {
            None
        }
    }

    /// Salva uma nova extensão adicionada pelo usuário
    pub fn create(&self, dto: CreateExtensionDto) -> Result<ExtensionItem, String> {
        let id = dto.id.unwrap_or_else(Self::now_millis);

        let item = ExtensionItem {
            id,
            name: dto.name.unwrap_or_else(|| format!("Extensão #{id}")),
            icon_type: dto.icon_type.or(Some("custom".to_string())),
            icon_url: dto.icon_url,
            icon_bg: dto.icon_bg.or(Some("#2F80ED".to_string())), // Cor padrão do app (Fury Blue)
            enabled: dto.enabled.unwrap_or(true),
            status: dto.status.unwrap_or_else(|| "available".to_string()),
            description: dto.description.unwrap_or_else(|| "Extensão adicionada à equipe.".to_string()),
            provider: dto.provider.unwrap_or_else(|| "Firefox Add-ons".to_string()),
            provider_url: dto.provider_url,
            tab: dto.tab.unwrap_or_else(|| "team".to_string()),
            version: dto.version.or(Some("1.0.0".to_string())),
        };

        self.save_extension(&item)?;
        info!("Nova extensão salva na equipe: '{}' (ID: {})", item.name, item.id);
        Ok(item)
    }

    /// Altera o status (ex: ligar/desligar) ou metadados da extensão
    pub fn update(&self, id: u64, dto: UpdateExtensionDto) -> Result<ExtensionItem, String> {
        let mut item = self.get(id).ok_or_else(|| format!("Extensão {id} não encontrada"))?;

        if let Some(name) = dto.name {
            if !name.trim().is_empty() {
                item.name = name.trim().to_string();
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

    /// Busca extensões diretamente da API oficial do Mozilla Add-ons (AMO) em tempo real
    pub async fn search_catalog(
        &self,
        query: Option<&str>,
        category: Option<&str>,
        store: Option<&str>,
    ) -> Vec<RecommendedExtension> {
        let q = query.unwrap_or("").trim();
        // Se a busca estiver vazia, busca as mais populares
        let search_term = if q.is_empty() { "privacy" } else { q };

        let url = format!(
            "https://addons.mozilla.org/api/v5/addons/search/?q={}&type=extension&page_size=20",
            urlencoding(search_term)
        );

        match self.client.get(&url).send().await {
            Ok(resp) => {
                if let Ok(json) = resp.json::<serde_json::Value>().await {
                    if let Some(results) = json.get("results").and_then(|r| r.as_array()) {
                        let items: Vec<RecommendedExtension> = results
                            .iter()
                            .filter_map(|item| {
                                let name = extract_localized_string(item.get("name"))?;
                                let desc = extract_localized_string(item.get("summary"))
                                    .unwrap_or_else(|| "Extensão oficial do Firefox Add-ons.".to_string());
                                let icon_url = item.get("icon_url").and_then(|i| i.as_str()).map(|s| s.to_string());
                                let addon_url = item.get("url").and_then(|u| u.as_str()).map(|s| s.to_string());
                                let id = item.get("guid")
                                    .and_then(|g| g.as_str())
                                    .or_else(|| item.get("slug").and_then(|s| s.as_str()))
                                    .unwrap_or_else(|| &name)
                                    .to_string();

                                let raw_categories = item.get("categories").and_then(|c| c.as_array());
                                let mapped_cat = map_amo_category(raw_categories);

                                Some(RecommendedExtension {
                                    id,
                                    name,
                                    category: mapped_cat,
                                    description: desc,
                                    provider: "Firefox Add-ons".to_string(),
                                    provider_url: addon_url,
                                    icon_type: "puzzle".to_string(),
                                    icon_bg: "#2F80ED".to_string(), // Cor padrão do app
                                    icon_url,
                                    featured: Some(false),
                                })
                            })
                            .filter(|ext| {
                                // Filtro de categoria se informado
                                if let Some(cat) = category {
                                    if cat != "All" && !ext.category.eq_ignore_ascii_case(cat) {
                                        return false;
                                    }
                                }
                                // Filtro de loja (Firefox Add-ons vs Chrome)
                                if let Some(st) = store {
                                    if st.eq_ignore_ascii_case("chrome") {
                                        return false;
                                    }
                                }
                                true
                            })
                            .collect();

                        return items;
                    }
                }
            }
            Err(err) => {
                warn!("Erro ao consultar API do Mozilla Add-ons (AMO): {}", err);
            }
        }

        Vec::new()
    }
}

fn urlencoding(input: &str) -> String {
    let mut encoded = String::new();
    for b in input.bytes() {
        match b {
            b'a'..=b'z' | b'A'..=b'Z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                encoded.push(b as char);
            }
            _ => {
                encoded.push_str(&format!("%{:02X}", b));
            }
        }
    }
    encoded
}

fn extract_localized_string(val: Option<&serde_json::Value>) -> Option<String> {
    match val {
        Some(serde_json::Value::String(s)) => Some(s.clone()),
        Some(serde_json::Value::Object(map)) => {
            if let Some(serde_json::Value::String(s)) = map.get("pt-BR") {
                Some(s.clone())
            } else if let Some(serde_json::Value::String(s)) = map.get("en-US") {
                Some(s.clone())
            } else if let Some((_, serde_json::Value::String(s))) = map.iter().next() {
                Some(s.clone())
            } else {
                None
            }
        }
        _ => None,
    }
}

fn map_amo_category(cats: Option<&Vec<serde_json::Value>>) -> String {
    if let Some(arr) = cats {
        for c in arr {
            if let Some(slug) = c.as_str() {
                match slug {
                    "privacy-security" => return "Privacy and security".to_string(),
                    "developer-tools" => return "Developer tools".to_string(),
                    "appearance" | "accessibility" => return "Accessibility".to_string(),
                    "feeds-news-blogging" | "social-communication" | "tabs" => return "Workflow and planning".to_string(),
                    "shopping" => return "Shopping".to_string(),
                    _ => {}
                }
            }
        }
    }
    "Tools".to_string()
}
