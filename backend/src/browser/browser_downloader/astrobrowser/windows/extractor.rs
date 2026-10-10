use std::fs::{self, File};
use std::path::{Path, PathBuf};
use tracing::warn;
use zip::ZipArchive;

use super::super::error::AstrobrowserError;

/// Extrai pacote ZIP no Windows com mitigação de Zip Slip
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
                warn!("Entrada suspeita ignorada no zip (potencial Zip Slip): {:?}", entry.name());
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
        }
    }

    // No Windows, preservamos a árvore original extraída sem forçar renomeações perigosas.
    // O sistema de detecção e lançamento (command.rs) já suporta e localiza o executável em qualquer subpasta.
    flatten_wrapper_dir(dest_dir)?;
    Ok(())
}

/// Achatamento suave e não-destrutivo: no Windows, os arquivos são mantidos intactos
/// em sua estrutura extraída para evitar quebras por locks do sistema operacional ou antivírus.
pub fn flatten_wrapper_dir(dir: &Path) -> Result<(), AstrobrowserError> {
    let entries: Vec<PathBuf> = fs::read_dir(dir)?
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .collect();

    let subdirs: Vec<PathBuf> = entries
        .iter()
        .filter(|p| {
            if !p.is_dir() {
                return false;
            }
            let name = p.file_name().and_then(|n| n.to_str()).unwrap_or("");
            !name.starts_with('.') && name != "__MACOSX"
        })
        .cloned()
        .collect();

    // Se houver wrapper, tenta mover apenas se o destino não existir, sem quebrar
    if subdirs.len() == 1 {
        let wrapper = &subdirs[0];
        if let Ok(sub_entries) = fs::read_dir(wrapper) {
            for item in sub_entries.flatten() {
                if let Some(file_name) = item.file_name().to_str() {
                    let target = dir.join(file_name);
                    if !target.exists() {
                        let _ = fs::rename(item.path(), &target);
                    }
                }
            }
            let _ = fs::remove_dir(wrapper);
        }
    }

    Ok(())
}
