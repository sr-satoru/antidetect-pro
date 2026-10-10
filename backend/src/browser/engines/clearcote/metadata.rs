use std::fs;
use std::path::Path;
use tracing::info;
use crate::models::Profile;

/// Gerencia a persistência e atualização de metadados específicos do perfil Chromium.
pub struct ChromiumMetadataManager;

impl ChromiumMetadataManager {
    /// Salva ou sincroniza o arquivo metadata.json na raiz da pasta do perfil
    pub fn save_profile_metadata(profile_dir: &Path, profile: &Profile) -> Result<(), String> {
        let meta_file = profile_dir.join("metadata.json");
        let content = serde_json::to_string_pretty(profile)
            .map_err(|e| format!("Falha ao serializar metadados do perfil: {e}"))?;

        fs::write(&meta_file, content)
            .map_err(|e| format!("Falha ao salvar metadata.json em {:?}: {e}", meta_file))?;

        Ok(())
    }

    /// Atualiza o status do perfil (ex: "ready" ou "running") e timestamps LWW
    pub fn update_status(profile_dir: &Path, status: &str) -> Result<(), String> {
        let meta_file = profile_dir.join("metadata.json");
        if meta_file.exists() {
            if let Ok(content) = fs::read_to_string(&meta_file) {
                if let Ok(mut profile) = serde_json::from_str::<Profile>(&content) {
                    profile.status = status.to_string();
                    profile.updated_at = chrono::Utc::now().timestamp();
                    return Self::save_profile_metadata(profile_dir, &profile);
                }
            }
        }
        Ok(())
    }

    /// Limpa arquivos de locks órfãos e sobras temporárias do Chromium
    pub fn clean_orphan_locks(profile_dir: &Path) {
        let locks = ["SingletonLock", "SingletonCookie", "SingletonSocket", "lockfile"];
        for lock in &locks {
            let p = profile_dir.join(lock);
            if p.exists() {
                let _ = fs::remove_file(&p);
            }
        }
    }

    /// Zero-Trace: expurga caches temporários não-persistentes após o fechamento da janela
    pub fn purge_ephemeral_cache(profile_dir: &Path) {
        let cache_dir = profile_dir.join("Default").join("Cache");
        if cache_dir.exists() {
            info!("🛡️ [Zero-Trace] Limpando pasta de cache do Chromium em {:?}", cache_dir);
            let _ = fs::remove_dir_all(&cache_dir);
        }

        let code_cache = profile_dir.join("Default").join("Code Cache");
        if code_cache.exists() {
            let _ = fs::remove_dir_all(&code_cache);
        }
    }
}
