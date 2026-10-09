use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::path::{Path, PathBuf};
use tracing::{info, warn};
use zip::ZipArchive;

use super::error::AstrobrowserError;

/// Formatos de compactação suportados pelo AstroBrowser
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum ArchiveFormat {
    #[default]
    Zip,
    #[serde(rename = "tar.xz")]
    TarXz,
}

/// Descompacta o arquivo baixado para o diretório de destino de acordo com seu formato
pub fn extract_archive(
    archive_path: &Path,
    dest_dir: &Path,
    format: ArchiveFormat,
) -> Result<(), AstrobrowserError> {
    fs::create_dir_all(dest_dir)?;

    match format {
        ArchiveFormat::Zip => extract_zip(archive_path, dest_dir),
        ArchiveFormat::TarXz => extract_tar_xz(archive_path, dest_dir),
    }
}

/// Extração segura de arquivos ZIP com mitigação contra Zip Slip
pub fn extract_zip(zip_path: &Path, dest_dir: &Path) -> Result<(), AstrobrowserError> {
    let file = File::open(zip_path)?;
    let mut archive = ZipArchive::new(file).map_err(|e| {
        AstrobrowserError::CorruptedPackage(format!("Arquivo ZIP inválido: {e}"))
    })?;

    let total = archive.len();
    for i in 0..total {
        let mut entry = archive.by_index(i).map_err(|e| {
            AstrobrowserError::ExtractionFailed(format!("Falha ao ler entrada {i} do zip: {e}"))
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

/// Extração de pacotes TAR.XZ no Linux/Unix utilizando tar nativo do sistema operacional
pub fn extract_tar_xz(archive_path: &Path, dest_dir: &Path) -> Result<(), AstrobrowserError> {
    #[cfg(unix)]
    {
        info!(
            "📦 Descompactando .tar.xz do AstroBrowser via tar do sistema para: {:?}",
            dest_dir
        );
        let output = std::process::Command::new("tar")
            .args(["-xf"])
            .arg(archive_path)
            .args(["-C"])
            .arg(dest_dir)
            .output()
            .map_err(|e| {
                AstrobrowserError::ExtractionFailed(format!(
                    "Falha ao invocar tar do sistema: {e}"
                ))
            })?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(AstrobrowserError::ExtractionFailed(format!(
                "tar finalizou com erro (código {:?}): {stderr}",
                output.status.code()
            )));
        }

        Ok(())
    }

    #[cfg(not(unix))]
    {
        Err(AstrobrowserError::ExtractionFailed(
            "Extração de .tar.xz não é suportada nativamente no Windows sem tar no PATH."
                .to_string(),
        ))
    }
}

/// Se o arquivo foi descompactado dentro de uma única subpasta wrapper (ex: clearcote-*/),
/// move todo o seu conteúdo para a raiz do diretório de destino.
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

/// Aplica permissões executáveis (0o755) e setuid no sandbox do Chromium (0o4755) no Unix
pub fn apply_unix_permissions(base_dir: &Path, exe_path: &Path) {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = fs::set_permissions(exe_path, fs::Permissions::from_mode(0o755));

        // Chrome Sandbox (Chromium)
        let sandbox = base_dir.join("chrome-sandbox");
        if sandbox.exists() {
            let _ = fs::set_permissions(&sandbox, fs::Permissions::from_mode(0o4755));
        }

        // Permissão em binários auxiliares
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
