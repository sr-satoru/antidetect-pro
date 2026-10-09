pub mod command;
pub mod cookies;
pub mod flags;
pub mod metadata;
pub mod preferences;

use std::fs;
use std::path::{Path, PathBuf};
use async_trait::async_trait;

use crate::models::Profile;
use crate::extraction_session::{ImportCookieResult, UnifiedCookie, UnifiedSession};
use super::trait_engine::{BrowserEngine, EnginePrepResult};

/// Implementação desacoplada do motor Clearcote (Chromium stealth).
pub struct ClearcoteEngine;

impl ClearcoteEngine {
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl BrowserEngine for ClearcoteEngine {
    fn kernel_name(&self) -> &'static str {
        "AstroBrowser"
    }

    fn resolve_binary(&self, data_dir: &Path) -> Result<PathBuf, String> {
        crate::browser_downloader::resolve_clearcote_binary(data_dir)
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
