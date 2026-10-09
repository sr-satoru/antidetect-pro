use std::fs::{self, File};
use std::path::{Path, PathBuf};
use tracing::warn;
use zip::ZipArchive;

use super::error::AstrofoxError;

/// Extração segura de arquivo ZIP do AstroFox com mitigação contra Zip Slip
pub fn extract_zip(zip_path: &Path, dest_dir: &Path) -> Result<(), AstrofoxError> {
    fs::create_dir_all(dest_dir)?;

    let file = File::open(zip_path)?;
    let mut archive = ZipArchive::new(file).map_err(|e| {
        AstrofoxError::CorruptedPackage(format!("Arquivo ZIP inválido: {e}"))
    })?;

    let total = archive.len();
    for i in 0..total {
        let mut entry = archive.by_index(i).map_err(|e| {
            AstrofoxError::ExtractionFailed(format!("Falha ao ler entrada {i} do zip: {e}"))
        })?;

        let enclosed = match entry.enclosed_name() {
            Some(path) => path.to_owned(),
            None => {
                warn!(
                    "Entrada suspeita ignorada no zip (potencial Zip Slip): {:?}",
                    entry.name()
                );
                continue;
            }
        };

        let outpath = dest_dir.join(enclosed);

        // Validação de contenção dentro do diretório de destino
        if !outpath.starts_with(dest_dir) {
            warn!("Caminho fora do destino ignorado: {:?}", outpath);
            continue;
        }

        if entry.is_dir() {
            let _ = fs::create_dir_all(&outpath);
        } else {
            if let Some(parent) = outpath.parent().filter(|p| !p.exists()) {
                let _ = fs::create_dir_all(parent);
            }
            let mut outfile = File::create(&outpath)?;
            std::io::copy(&mut entry, &mut outfile)?;

            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                if let Some(mode) = entry.unix_mode() {
                    let _ = fs::set_permissions(&outpath, fs::Permissions::from_mode(mode));
                }
            }
        }
    }

    Ok(())
}

/// Se o arquivo foi descompactado dentro de uma única subpasta wrapper (ex: camoufox/),
/// move todo o seu conteúdo para a raiz do diretório de destino.
pub fn flatten_wrapper_dir(dir: &Path) -> Result<(), AstrofoxError> {
    let entries: Vec<PathBuf> = fs::read_dir(dir)?
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .collect();

    if entries.len() == 1 && entries[0].is_dir() {
        let wrapper = &entries[0];
        let sub_entries: Vec<PathBuf> = fs::read_dir(wrapper)?
            .filter_map(|e| e.ok())
            .map(|e| e.path())
            .collect();

        for item in sub_entries {
            if let Some(file_name) = item.file_name() {
                let target = dir.join(file_name);
                let _ = fs::rename(&item, target);
            }
        }
        let _ = fs::remove_dir(wrapper);
    }

    Ok(())
}

/// Aplica permissões executáveis (0o755) no Unix para executáveis e binários auxiliares
pub fn apply_unix_permissions(base_dir: &Path, exe_path: &Path) {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = fs::set_permissions(exe_path, fs::Permissions::from_mode(0o755));

        if let Ok(entries) = fs::read_dir(base_dir) {
            for entry in entries.flatten() {
                let p = entry.path();
                if p.is_file() {
                    let is_executable = p
                        .metadata()
                        .map(|m| m.permissions().mode() & 0o111 != 0)
                        .unwrap_or(false);
                    if is_executable {
                        let _ = fs::set_permissions(&p, fs::Permissions::from_mode(0o755));
                    }
                }
            }
        }
    }
}
