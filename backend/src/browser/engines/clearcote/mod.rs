pub mod command;
pub mod cookies;
pub mod flags;
pub mod metadata;
pub mod preferences;

use std::fs;
use std::path::{Path, PathBuf};
use async_trait::async_trait;
use tracing::info;

use crate::models::Profile;
use crate::extraction_session::{ImportCookieResult, UnifiedCookie, UnifiedSession};
use super::trait_engine::{BrowserEngine, EnginePrepResult};

/// Implementação desacoplada do motor Clearcote (Chromium stealth).
pub struct ClearcoteEngine;

impl ClearcoteEngine {
    pub fn new() -> Self {
        Self
    }

    /// Localiza o executável chrome / chrome.exe do Clearcote
    fn find_executable(base_dir: &Path) -> Option<PathBuf> {
        #[cfg(windows)]
        let candidates = ["chrome.exe", "clearcote.exe", "star-chromium.exe"];
        #[cfg(not(windows))]
        let candidates = ["chrome", "clearcote", "star-chromium"];

        for c in &candidates {
            let p = base_dir.join(c);
            if p.exists() && p.is_file() {
                return Some(p);
            }
            let sub = base_dir.join("browser").join(c);
            if sub.exists() && sub.is_file() {
                return Some(sub);
            }
        }
        None
    }
}

#[async_trait]
impl BrowserEngine for ClearcoteEngine {
    fn kernel_name(&self) -> &'static str {
        "AstroBrowser"
    }

    fn resolve_binary(&self, data_dir: &Path) -> Result<PathBuf, String> {
        let base = if data_dir.ends_with("profiles") {
            data_dir.parent().unwrap_or(data_dir)
        } else {
            data_dir
        };

        // 1. Prioridade: app-data local em dev ou binaries da aplicação em prod (.engine-chromium)
        let primary_dir = base.join("binaries").join(".engine-chromium");
        if let Some(exe) = Self::find_executable(&primary_dir) {
            return Ok(exe);
        }

        // 2. Diretório alternativo binaries/astrobrowser
        let alt_dir = base.join("binaries").join("astrobrowser");
        if let Some(exe) = Self::find_executable(&alt_dir) {
            return Ok(exe);
        }

        // 3. Fallback inteligente para cache pré-instalado do clearcote (~/.cache/clearcote/*/browser/chrome)
        #[cfg(unix)]
        {
            if let Ok(home) = std::env::var("HOME") {
                let cache_base = PathBuf::from(home).join(".cache").join("clearcote");
                if cache_base.exists() {
                    if let Ok(entries) = fs::read_dir(&cache_base) {
                        for entry in entries.flatten() {
                            let p = entry.path().join("browser");
                            if let Some(exe) = Self::find_executable(&p) {
                                info!("💡 [Clearcote] Binário detectado no cache local: {:?}", exe);
                                return Ok(exe);
                            }
                        }
                    }
                }
            }
        }

        #[cfg(windows)]
        {
            if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
                let cache_base = PathBuf::from(local_app_data).join("clearcote").join("Cache");
                if cache_base.exists() {
                    if let Ok(entries) = fs::read_dir(&cache_base) {
                        for entry in entries.flatten() {
                            let p = entry.path().join("browser");
                            if let Some(exe) = Self::find_executable(&p) {
                                info!("💡 [Clearcote] Binário detectado no cache local: {:?}", exe);
                                return Ok(exe);
                            }
                        }
                    }
                }
            }
        }

        Err(
            "O motor Chromium (AstroBrowser / Clearcote) não foi encontrado no sistema. \
             Verifique se o binário foi instalado na pasta binaries/.engine-chromium."
                .to_string(),
        )
    }

    fn clear_profile_locks(&self, profile_dir: &Path) {
        metadata::ChromiumMetadataManager::clean_orphan_locks(profile_dir);
    }

    async fn prepare_profile_dir(
        &self,
        profile_dir: &Path,
        profile: &Profile,
        data_dir: &Path,
        client: &reqwest::Client,
        _cdp: bool,
    ) -> Result<EnginePrepResult, String> {
        fs::create_dir_all(profile_dir)
            .map_err(|e| format!("Erro ao criar diretório do perfil Chromium: {e}"))?;

        // 1. Limpa locks órfãos
        self.clear_profile_locks(profile_dir);

        // 2. Prepara infraestrutura de Proxy Universal Relay
        let net_setup = crate::network::prepare_network(&profile.proxy, &profile.fingerprint_json).await?;

        // 3. Prepara extensões
        let ext_paths = crate::extensions::import_profile_extensions(
            profile,
            profile_dir,
            data_dir,
            client,
            "clearcote",
        )
        .await?;

        let mut all_addon_paths = net_setup.addon_paths.clone();
        all_addon_paths.extend(ext_paths);

        // 4. Injeta Preferences nativas do Chromium em Default/Preferences
        preferences::setup_chromium_preferences(profile_dir, profile)?;

        // 5. Salva metadados do perfil no disco
        metadata::ChromiumMetadataManager::save_profile_metadata(profile_dir, profile)?;

        Ok(EnginePrepResult {
            net_setup,
            addon_paths: all_addon_paths,
            proxy_ip: None,
        })
    }

    fn build_launch_command(
        &self,
        binary_path: &Path,
        profile_dir: &Path,
        profile: &Profile,
        debug_port: Option<u16>,
        prep: &EnginePrepResult,
        initial_url: Option<&str>,
    ) -> Result<tokio::process::Command, String> {
        // Se houver Universal Proxy Relay ativo, o proxy do Chromium aponta para o loopback
        let proxy_url = prep.net_setup.relay.as_ref().map(|relay| {
            format!("http://127.0.0.1:{}", relay.port)
        });

        command::build_clearcote_command(
            binary_path,
            profile_dir,
            profile,
            debug_port,
            proxy_url.as_deref(),
            &prep.addon_paths,
            initial_url,
        )
    }

    fn extract_session(&self, profile_dir: &Path) -> Result<UnifiedSession, String> {
        // Extrai cookies do SQLite Default/Network/Cookies
        let session = cookies::extract_chromium_session(profile_dir)?;

        // Zero-trace: expurga arquivos de cache transitórios
        metadata::ChromiumMetadataManager::purge_ephemeral_cache(profile_dir);

        Ok(session)
    }

    fn inject_session(
        &self,
        profile_dir: &Path,
        cookies: &[UnifiedCookie],
    ) -> Result<ImportCookieResult, String> {
        cookies::inject_chromium_cookies(profile_dir, cookies)
    }
}
