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

        let is_dir = entry.is_dir()
            || entry.name().ends_with('/')
            || entry.name().ends_with('\\');

        if is_dir {
            let _ = fs::create_dir_all(&outpath);
        } else {
            if let Some(parent) = outpath.parent().filter(|p| !p.exists()) {
                let _ = fs::create_dir_all(parent);
            }
            if outpath.exists() {
                let _ = fs::remove_file(&outpath);
            }
            let mut outfile = File::create(&outpath)?;
            std::io::copy(&mut entry, &mut outfile)?;
        }
    }

    flatten_wrapper_dir(dest_dir)?;

    // Padroniza chrome.exe caso o zip venha com clearcote.exe
    let target_exe = dest_dir.join("chrome.exe");
    if !target_exe.exists() {
        let clearcote_exe = dest_dir.join("clearcote.exe");
        if clearcote_exe.exists() {
            let _ = fs::rename(&clearcote_exe, &target_exe);
        }
    }

    Ok(())
}

/// Achatamento de wrapper único caso exista (sem corromper subpastas legítimas como locales/)
pub fn flatten_wrapper_dir(dir: &Path) -> Result<(), AstrobrowserError> {
    let entries: Vec<PathBuf> = fs::read_dir(dir)?
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .collect();

    // Filtra itens ignorando arquivos ocultos de sistema (.DS_Store, __MACOSX)
    let non_hidden: Vec<PathBuf> = entries
        .iter()
        .filter(|p| {
            let name = p.file_name().and_then(|n| n.to_str()).unwrap_or("");
            !name.starts_with('.') && name != "__MACOSX"
        })
        .cloned()
        .collect();

    // REGRA DE OURO: Só é um wrapper se existir EXATAMENTE UM item na raiz do destino e esse item for um diretório!
    // Se já existirem arquivos na raiz (como chrome.exe + pasta locales/), NÃO é um wrapper!
    // Trata-se da estrutura legítima e já descompactada do Chromium (idêntica ao WinRAR), que NUNCA deve ser alterada.
    if non_hidden.len() == 1 && non_hidden[0].is_dir() {
        let wrapper = &non_hidden[0];
        let sub_entries: Vec<PathBuf> = fs::read_dir(wrapper)?
            .filter_map(|e| e.ok())
            .map(|e| e.path())
            .collect();

        for item in sub_entries {
            if let Some(file_name) = item.file_name() {
                let target = dir.join(file_name);
                if target.exists() {
                    let _ = fs::remove_file(&target);
                }
                if fs::rename(&item, &target).is_err() {
                    let _ = copy_dir_all(&item, &target);
                    let _ = fs::remove_dir_all(&item);
                }
            }
        }
        let _ = fs::remove_dir_all(wrapper);
    }

    Ok(())
}

fn copy_dir_all(src: &Path, dst: &Path) -> std::io::Result<()> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        if ty.is_dir() {
            copy_dir_all(&entry.path(), &dst.join(entry.file_name()))?;
        } else {
            let target = dst.join(entry.file_name());
            if target.exists() {
                let _ = fs::remove_file(&target);
            }
            fs::copy(entry.path(), target)?;
        }
    }
    Ok(())
}
