use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

use super::error::BrowserDownloadError;
use super::traits::ArchiveFormat;

/// Tipos de motor de navegação suportados pelo sistema
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum EngineKind {
    Clearcote, // AstroBrowser / Chromium
    Camoufox,  // AstroFox / Firefox
}

impl EngineKind {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Clearcote => "clearcote",
            Self::Camoufox => "camoufox",
        }
    }

    pub fn default_target_dir(&self) -> &'static str {
        match self {
            Self::Clearcote => "astrobrowser",
            Self::Camoufox => "astrofox",
        }
    }

    #[allow(clippy::should_implement_trait)]
    pub fn from_str(s: &str) -> Option<Self> {
        if s.eq_ignore_ascii_case("clearcote")
            || s.eq_ignore_ascii_case("astrobrowser")
            || s.eq_ignore_ascii_case("chromium")
        {
            Some(Self::Clearcote)
        } else if s.eq_ignore_ascii_case("camoufox")
            || s.eq_ignore_ascii_case("astrofox")
            || s.eq_ignore_ascii_case("firefox")
        {
            Some(Self::Camoufox)
        } else {
            None
        }
    }
}

/// Configuração de download e metadados de uma plataforma
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlatformConfig {
    pub filename: String,
    pub url: String,
    pub exe_name: String,
    #[serde(default)]
    pub archive_format: ArchiveFormat,
    #[serde(default)]
    pub sha256: Option<String>,
    #[serde(default)]
    pub exe_sha256: Option<String>,
    pub source_candidates: Vec<String>,
    pub size_mb: usize,
}

/// Manifesto descritivo de um motor individual
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngineManifest {
    pub engine_name: String,
    pub version: String,
    pub release_tag: String,
    pub target_dir: String,
    pub platforms: HashMap<String, PlatformConfig>,
}

/// Manifesto global contendo todos os motores disponíveis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrowserManifest {
    pub engine_name: String,
    pub version: String,
    pub platforms: HashMap<String, PlatformConfig>,
    #[serde(default)]
    pub engines: HashMap<String, EngineManifest>,
}

impl BrowserManifest {
    /// Constrói o manifesto oficial embutido a partir dos submódulos especializados de astrobrowser e astrofox
    pub fn builtin() -> Self {
        let mut engines = HashMap::new();
        let af_engine = super::astrofox::get_engine_manifest();
        let ab_engine = super::astrobrowser::get_engine_manifest();

        let camoufox_platforms = af_engine.platforms.clone();

        engines.insert("camoufox".to_string(), af_engine);
        engines.insert("clearcote".to_string(), ab_engine);

        Self {
            engine_name: "Star Engine".to_string(),
            version: super::astrofox::ASTROFOX_RELEASE_TAG.to_string(),
            platforms: camoufox_platforms,
            engines,
        }
    }

    /// Carrega o manifesto a partir do disco se customizado, ou retorna o builtin
    pub fn load(data_dir: &Path) -> Result<Self, BrowserDownloadError> {
        let external_path = data_dir.join("browser_manifest.json");
        if external_path.exists() {
            let content = fs::read_to_string(&external_path).map_err(|e| {
                BrowserDownloadError::ManifestError(format!("Falha ao ler {}: {}", external_path.display(), e))
            })?;
            return serde_json::from_str::<BrowserManifest>(&content).map_err(|e| {
                BrowserDownloadError::ManifestError(format!("Erro ao decodificar {}: {}", external_path.display(), e))
            });
        }

        Ok(Self::builtin())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_manifest_loads_clearcote_and_camoufox() {
        let manifest = BrowserManifest::load(Path::new(".")).expect("deve carregar manifesto embutido");
        assert!(manifest.engines.contains_key("clearcote"));
        assert!(manifest.engines.contains_key("camoufox"));

        let clearcote = &manifest.engines["clearcote"];
        assert_eq!(clearcote.version, "150.0.7871.114");
        assert!(clearcote.platforms.contains_key("win-x86_64"));
        assert!(clearcote.platforms.contains_key("lin-x86_64"));

        let lin_cfg = &clearcote.platforms["lin-x86_64"];
        assert_eq!(lin_cfg.archive_format, ArchiveFormat::TarXz);
        assert_eq!(
            lin_cfg.sha256.as_deref(),
            Some("92ebd3de6fbf2c1349d3eb3c210952fcdb8dc9ed35655a35297cd68431fc8ef2")
        );
    }
}
