use std::path::Path;
use std::time::Duration;
use tracing::{info, warn};

use super::models::{AppVersionInfo, GitHubRelease, GitHubTag};

const REPO_OWNER_NAME: &str = "sr-satoru/antidetect-pro";
const DEFAULT_VERSION: &str = "0.1.1";

#[derive(Clone)]
pub struct AppVersionService {
    http_client: reqwest::Client,
}

impl Default for AppVersionService {
    fn default() -> Self {
        Self::new()
    }
}

impl AppVersionService {
    pub fn new() -> Self {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(10))
            .user_agent("Fury-Antidetect/1.0")
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());

        Self {
            http_client: client,
        }
    }

    /// Obtém a versão atual configurada para o aplicativo
    pub fn get_local_version(&self) -> String {
        // Tenta ler app/package.json se disponível
        let candidate_paths = [
            "app/package.json",
            "../app/package.json",
            "app/src-tauri/tauri.conf.json",
            "../app/src-tauri/tauri.conf.json",
        ];

        for path_str in &candidate_paths {
            let path = Path::new(path_str);
            if path.exists() {
                if let Ok(content) = std::fs::read_to_string(path) {
                    if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&content) {
                        if let Some(v) = parsed.get("version").and_then(|v| v.as_str()) {
                            if !v.is_empty() {
                                return v.to_string();
                            }
                        }
                    }
                }
            }
        }

        DEFAULT_VERSION.to_string()
    }

    /// Verifica no GitHub se há uma versão/tag mais recente para o Fury Desktop
    pub async fn check_update(&self, client_override_version: Option<String>) -> Result<AppVersionInfo, String> {
        let current_version = client_override_version
            .filter(|v| !v.trim().is_empty())
            .unwrap_or_else(|| self.get_local_version());

        let os_str = std::env::consts::OS;
        let arch_str = std::env::consts::ARCH;

        // 1. Tenta obter /releases/latest
        let mut release_info = self.fetch_latest_release().await;

        // 2. Fallback para primeira release pública de /releases
        if release_info.is_none() {
            release_info = self.fetch_first_available_release().await;
        }

        // 3. Fallback para tag Git em /tags
        let (tag_name, name, body, published_at, html_url, assets) = if let Some(rel) = release_info {
            let tag = rel.tag_name.unwrap_or_else(|| format!("v{}", current_version));
            let name = rel.name.unwrap_or_else(|| format!("Fury Antidetect {}", tag));
            let body = rel.body.unwrap_or_default();
            let published = rel.published_at.unwrap_or_else(|| chrono::Utc::now().to_rfc3339());
            let html = rel.html_url.unwrap_or_else(|| format!("https://github.com/{}/releases", REPO_OWNER_NAME));
            (tag, name, body, published, html, rel.assets)
        } else if let Some(latest_tag) = self.fetch_latest_git_tag().await {
            let tag = latest_tag;
            let name = format!("Fury Antidetect {}", tag);
            let body = format!("Nova tag {} encontrada no repositório GitHub.", tag);
            let published = chrono::Utc::now().to_rfc3339();
            let html = format!("https://github.com/{}/releases/tag/{}", REPO_OWNER_NAME, tag);
            (tag, name, body, published, html, Vec::new())
        } else {
            // Nenhuma versão remota encontrada, assume versão local
            return Ok(AppVersionInfo {
                current_version: current_version.clone(),
                latest_version: current_version.clone(),
                tag_name: format!("v{}", current_version),
                name: format!("Fury Antidetect v{}", current_version),
                body: "Versão local em execução.".to_string(),
                published_at: chrono::Utc::now().to_rfc3339(),
                html_url: format!("https://github.com/{}/releases", REPO_OWNER_NAME),
                has_update: false,
                download_url: None,
                platform: os_str.to_string(),
                arch: arch_str.to_string(),
            });
        };

        let latest_version = tag_name.trim_start_matches('v').to_string();
        let has_update = Self::compare_semver(&latest_version, &current_version) > 0;

        // Localiza asset compatível com o sistema operacional atual
        let mut download_url = Some(html_url.clone());
        if !assets.is_empty() {
            let matched_asset = assets.iter().find(|asset| {
                let name = asset.name.as_deref().unwrap_or("").to_lowercase();
                match os_str {
                    "linux" => name.ends_with(".deb") || name.ends_with(".appimage"),
                    "windows" => name.ends_with(".exe") || name.ends_with(".msi"),
                    "macos" => name.ends_with(".dmg") || name.ends_with(".app.tar.gz"),
                    _ => false,
                }
            });

            if let Some(asset) = matched_asset {
                if let Some(url) = &asset.browser_download_url {
                    download_url = Some(url.clone());
                }
            }
        }

        info!(
            "🔍 [AppUpdater] Atual: v{} | Remoto: {} | Tem update: {}",
            current_version, latest_version, has_update
        );

        Ok(AppVersionInfo {
            current_version,
            latest_version,
            tag_name,
            name,
            body,
            published_at,
            html_url,
            has_update,
            download_url,
            platform: os_str.to_string(),
            arch: arch_str.to_string(),
        })
    }

    /// Consulta /releases/latest no repositório
    async fn fetch_latest_release(&self) -> Option<GitHubRelease> {
        let url = format!("https://api.github.com/repos/{}/releases/latest", REPO_OWNER_NAME);
        match self.http_client.get(&url).send().await {
            Ok(resp) if resp.status().is_success() => {
                resp.json::<GitHubRelease>().await.ok()
            }
            Ok(resp) => {
                warn!("[AppUpdater] /releases/latest retornou HTTP {}", resp.status());
                None
            }
            Err(e) => {
                warn!("[AppUpdater] Erro ao consultar /releases/latest: {}", e);
                None
            }
        }
    }

    /// Consulta /releases para obter a release mais recente (mesmo se pré-release)
    async fn fetch_first_available_release(&self) -> Option<GitHubRelease> {
        let url = format!("https://api.github.com/repos/{}/releases?per_page=5", REPO_OWNER_NAME);
        match self.http_client.get(&url).send().await {
            Ok(resp) if resp.status().is_success() => {
                let list = resp.json::<Vec<GitHubRelease>>().await.ok()?;
                list.into_iter().find(|r| !r.draft.unwrap_or(false))
            }
            _ => None,
        }
    }

    /// Consulta /tags para obter a tag Git mais recente caso não haja release formal
    async fn fetch_latest_git_tag(&self) -> Option<String> {
        let url = format!("https://api.github.com/repos/{}/tags?per_page=5", REPO_OWNER_NAME);
        match self.http_client.get(&url).send().await {
            Ok(resp) if resp.status().is_success() => {
                let tags = resp.json::<Vec<GitHubTag>>().await.ok()?;
                tags.first().map(|t| t.name.clone())
            }
            _ => None,
        }
    }

    /// Compara duas versões no formato semver (ex: "0.1.2" vs "0.1.1")
    /// Retorna > 0 se v1 > v2, < 0 se v1 < v2, 0 se iguais
    pub fn compare_semver(v1: &str, v2: &str) -> i32 {
        let clean1 = v1.trim_start_matches('v');
        let clean2 = v2.trim_start_matches('v');

        let p1: Vec<u64> = clean1.split('.').filter_map(|s| s.parse().ok()).collect();
        let p2: Vec<u64> = clean2.split('.').filter_map(|s| s.parse().ok()).collect();

        let len = std::cmp::max(p1.len(), p2.len());
        for i in 0..len {
            let n1 = p1.get(i).copied().unwrap_or(0);
            let n2 = p2.get(i).copied().unwrap_or(0);
            if n1 > n2 {
                return 1;
            }
            if n1 < n2 {
                return -1;
            }
        }
        0
    }

    /// Abre a URL no navegador ou utilitário padrão do sistema operacional
    pub fn open_external_url(&self, url: &str) -> Result<(), String> {
        if !url.starts_with("http://") && !url.starts_with("https://") {
            return Err("A URL deve iniciar com http:// ou https://".to_string());
        }

        info!("🌐 [AppUpdater] Abrindo URL externa no SO: {}", url);

        #[cfg(target_os = "windows")]
        {
            std::process::Command::new("cmd")
                .args(["/C", "start", "", url])
                .spawn()
                .map_err(|e| format!("Falha ao abrir navegador no Windows: {}", e))?;
        }

        #[cfg(target_os = "macos")]
        {
            std::process::Command::new("open")
                .arg(url)
                .spawn()
                .map_err(|e| format!("Falha ao abrir navegador no macOS: {}", e))?;
        }

        #[cfg(target_os = "linux")]
        {
            std::process::Command::new("xdg-open")
                .arg(url)
                .spawn()
                .map_err(|e| format!("Falha ao abrir navegador no Linux: {}", e))?;
        }

        Ok(())
    }
}
