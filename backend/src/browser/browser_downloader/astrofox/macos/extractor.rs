use std::fs::{self, File};
use std::path::{Path, PathBuf};
use tracing::warn;
use zip::ZipArchive;

use super::super::error::AstrofoxError;

/// Extrai arquivo ZIP no macOS e limpa quarentena
pub fn extract_zip(zip_path: &Path, dest_dir: &Path) -> Result<(), AstrofoxError> {
    fs::create_dir_all(dest_dir)?;
    let file = File::open(zip_path)?;
    let mut archive = ZipArchive::new(file).map_err(|e| {
        AstrofoxError::CorruptedPackage(format!("Arquivo ZIP inválido: {e}"))
    })?;

    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| {
            AstrofoxError::ExtractionFailed(format!("Falha ao ler entrada {i} do zip: {e}"))
        })?;

        let enclosed = match entry.enclosed_name() {
            Some(path) => path.to_owned(),
            None => {
                warn!("Entrada suspeita ignorada no zip (Zip Slip): {:?}", entry.name());
                continue;
            }
        };

        let outpath = dest_dir.join(enclosed);
        if !outpath.starts_with(dest_dir) {
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

    flatten_wrapper_dir(dest_dir)?;

    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("xattr")
            .args(["-cr"])
            .arg(dest_dir)
            .status();
    }

    Ok(())
}

/// Achatamento de pasta wrapper se necessário
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
