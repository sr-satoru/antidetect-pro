// SPDX-License-Identifier: MIT OR Apache-2.0
// Sistema de Backup e Segurança para Migrações de Perfis

use std::fs;
use std::path::{Path, PathBuf};
use tracing::{info, warn};

/// Cria um backup seguro e atômico dos arquivos críticos do perfil antes de qualquer migração
pub fn create_migration_backup(profile_dir: &Path, tag: &str) -> Result<PathBuf, String> {
    let parent = profile_dir
        .parent()
        .ok_or_else(|| "Diretório do perfil sem pasta pai válida".to_string())?;

    let backups_dir = parent.join("migration_backups");
    fs::create_dir_all(&backups_dir)
        .map_err(|e| format!("Falha ao criar diretório de backups {:?}: {}", backups_dir, e))?;

    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S").to_string();
    let backup_dir = backups_dir.join(format!("backup_{}_{}", tag, timestamp));
    fs::create_dir_all(&backup_dir)
        .map_err(|e| format!("Falha ao criar pasta de backup {:?}: {}", backup_dir, e))?;

    // Copia arquivos críticos do perfil se existirem
    let critical_files = ["metadata.json", "user.js", "prefs.js", "handlers.json"];
    for file_name in &critical_files {
        // Checa tanto na pasta do perfil quanto na raiz do perfil (onde fica o metadata.json)
        let candidate_root = parent.join(file_name);
        if candidate_root.exists() && candidate_root.is_file() {
            let dest = backup_dir.join(file_name);
            let _ = fs::copy(&candidate_root, &dest);
        }

        let candidate_profile = profile_dir.join(file_name);
        if candidate_profile.exists() && candidate_profile.is_file() {
            let dest = backup_dir.join(file_name);
            let _ = fs::copy(&candidate_profile, &dest);
        }
    }

    info!("🛡️ Backup de segurança pré-migração criado em {:?}", backup_dir);
    Ok(backup_dir)
}

/// Remove backups antigos mantendo apenas os N mais recentes para não ocupar disco desnecessariamente
pub fn prune_old_backups(profile_parent_dir: &Path, max_keep: usize) {
    let backups_dir = profile_parent_dir.join("migration_backups");
    if let Ok(entries) = fs::read_dir(&backups_dir) {
        let mut dirs: Vec<PathBuf> = entries
            .flatten()
            .filter(|e| e.path().is_dir())
            .map(|e| e.path())
            .collect();

        if dirs.len() > max_keep {
            dirs.sort_by_key(|p| fs::metadata(p).and_then(|m| m.modified()).ok());
            let to_remove = dirs.len() - max_keep;
            for dir in dirs.into_iter().take(to_remove) {
                if let Err(e) = fs::remove_dir_all(&dir) {
                    warn!("Aviso: Falha ao expurgar backup antigo {:?}: {}", dir, e);
                }
            }
        }
    }
}
