use std::fs::{self, File};
use std::path::{Path, PathBuf};
use tracing::{info, warn};
use zip::ZipArchive;

use super::super::error::AstrobrowserError;

/// Extrai arquivo .tar.xz no Linux
pub fn extract_tar_xz(archive_path: &Path, dest_dir: &Path) -> Result<(), AstrobrowserError> {
    #[cfg(unix)]
    {
        info!(
            "📦 Descompactando .tar.xz do AstroBrowser via tar do sistema para: {:?}",
            dest_dir
        );
        let output = {
            let mt_res = std::process::Command::new("tar")
                .args(["-I", "xz -T0", "-xf"])
                .arg(archive_path)
                .args(["-C"])
                .arg(dest_dir)
                .output();

            match mt_res {
                Ok(out) if out.status.success() => out,
                _ => std::process::Command::new("tar")
                    .args(["-xf"])
                    .arg(archive_path)
                    .args(["-C"])
                    .arg(dest_dir)
                    .output()
                    .map_err(|e| {
                        AstrobrowserError::ExtractionFailed(format!("Falha ao invocar tar do sistema: {e}"))
                    })?,
            }
        };

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(AstrobrowserError::ExtractionFailed(format!(
                "tar finalizou com erro (código {:?}): {stderr}",
                output.status.code()
            )));
        }

        flatten_wrapper_dir(dest_dir)?;
        apply_unix_permissions(dest_dir);
        Ok(())
    }

    #[cfg(not(unix))]
    {
        let _ = (archive_path, dest_dir);
        Err(AstrobrowserError::ExtractionFailed(
            "Extração de .tar.xz não é suportada nativamente em ambientes não-Unix.".to_string(),
        ))
    }
}

/// Extrai arquivo .zip no Linux caso o artefato esteja em formato zip
pub fn extract_zip(zip_path: &Path, dest_dir: &Path) -> Result<(), AstrobrowserError> {
    fs::create_dir_all(dest_dir)?;
    let file = File::open(zip_path)?;
    let mut archive = ZipArchive::new(file).map_err(|e| {
        AstrobrowserError::CorruptedPackage(format!("Arquivo ZIP inválido: {e}"))
    })?;

    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| {
            AstrobrowserError::ExtractionFailed(format!("Falha ao ler entrada {i} do zip: {e}"))
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
    apply_unix_permissions(dest_dir);
    Ok(())
}

/// Achatamento de wrapper único (ex: clearcote-*/ -> raiz)
pub fn flatten_wrapper_dir(dir: &Path) -> Result<(), AstrobrowserError> {
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

/// Aplica permissões de execução (0o755) em binários e SUID (0o4755) no chrome-sandbox
pub fn apply_unix_permissions(base_dir: &Path) {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;

        let exe_path = base_dir.join("chrome");
        if exe_path.exists() {
            let _ = fs::set_permissions(&exe_path, fs::Permissions::from_mode(0o755));
        }

        let sandbox = base_dir.join("chrome-sandbox");
        if sandbox.exists() {
            let _ = fs::set_permissions(&sandbox, fs::Permissions::from_mode(0o4755));
        }

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
