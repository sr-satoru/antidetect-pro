use std::collections::HashMap;
use std::fs;
use std::path::Path;
use serde::{Deserialize, Serialize};

use crate::browser_downloader::platform;

const EMBEDDED_MANIFEST_JSON: &str = include_str!("browser_manifest.json");

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlatformConfig {
    pub filename: String,
    pub url: String,
    pub exe_name: String,
    pub source_candidates: Vec<String>,
    pub size_mb: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrowserManifest {
    pub engine_name: String,
    pub version: String,
    pub platforms: HashMap<String, PlatformConfig>,
}

impl BrowserManifest {
    /// Carrega o manifesto de browser_manifest.json:
    /// 1. Tenta carregar de data_dir/browser_manifest.json (customização do usuário).
    /// 2. Tenta carregar de ./browser_manifest.json no diretório de execução.
    /// 3. Fallback garantido: usa o JSON padrão embutido no binário.
    pub fn load(data_dir: &Path) -> Result<Self, String> {
        let external_path = data_dir.join("browser_manifest.json");
        let local_path = Path::new("browser_manifest.json");

        let content = if external_path.exists() {
            fs::read_to_string(&external_path)
                .map_err(|e| format!("Falha ao ler {}: {}", external_path.display(), e))?
        } else if local_path.exists() {
            fs::read_to_string(local_path)
                .map_err(|e| format!("Falha ao ler {}: {}", local_path.display(), e))?
        } else {
            EMBEDDED_MANIFEST_JSON.to_string()
        };

        serde_json::from_str::<BrowserManifest>(&content)
            .map_err(|e| format!("Erro ao decodificar browser_manifest.json: {}", e))
    }

    /// Retorna a configuração específica para a plataforma do sistema operacional atual
    pub fn get_current_platform_config(&self) -> Result<(&PlatformConfig, String), String> {
        let platform_key = platform::get_current_platform_key()?;
        let config = self
            .platforms
            .get(&platform_key)
            .ok_or_else(|| format!("Plataforma '{}' não encontrada no browser_manifest.json", platform_key))?;

        Ok((config, platform_key))
    }
}
