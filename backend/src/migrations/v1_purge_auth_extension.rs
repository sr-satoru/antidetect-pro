// SPDX-License-Identifier: MIT OR Apache-2.0
// Migração V1: Expurgar extensão legada de autenticação de proxy
// Elimina o armazenamento de senhas em texto claro no disco (manifest.json e background.js)

use std::fs;
use std::path::Path;
use tracing::info;

pub const MIGRATION_ID: &str = "0001_purge_plaintext_proxy_auth_extension";

/// Executa a migração V1 com segurança e backup
pub fn run(profile_dir: &Path, backup_dir: Option<&Path>) -> Result<bool, String> {
    let legacy_ext = profile_dir
        .join("extensions")
        .join("star-proxy-auth@antidetect.star");

    if !legacy_ext.exists() {
        return Ok(false);
    }

    info!("🔄 Executando Migração [{}]: detectada extensão legada com senhas em texto claro em {:?}", MIGRATION_ID, legacy_ext);

    // Se houver diretório de backup, preserva cópia arquivada antes de remover
    if let Some(b_dir) = backup_dir {
        let backup_dest = b_dir.join("extensions").join("star-proxy-auth@antidetect.star");
        let _ = fs::create_dir_all(b_dir.join("extensions"));
        copy_dir_recursive(&legacy_ext, &backup_dest)?;
    }

    // Remove com segurança a pasta da extensão antiga
    fs::remove_dir_all(&legacy_ext).map_err(|e| {
        format!(
            "Falha ao expurgar extensão de auto-autenticação legada {:?}: {}",
            legacy_ext, e
        )
    })?;

    info!("✅ Migração [{}] concluída: senhas em texto claro eliminadas do perfil", MIGRATION_ID);
    Ok(true)
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), String> {
    fs::create_dir_all(dst).map_err(|e| format!("Erro ao criar pasta {:?}: {}", dst, e))?;
    if let Ok(entries) = fs::read_dir(src) {
        for entry in entries.flatten() {
            let path = entry.path();
            let dest_path = dst.join(entry.file_name());
            if path.is_dir() {
                copy_dir_recursive(&path, &dest_path)?;
            } else {
                let _ = fs::copy(&path, &dest_path);
            }
        }
    }
    Ok(())
}
