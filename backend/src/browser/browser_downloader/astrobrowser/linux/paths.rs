use std::path::{Path, PathBuf};

/// Retorna o diretório canônico de destino do AstroBrowser no Linux
pub fn get_target_dir(data_dir: &Path) -> PathBuf {
    let base = if data_dir.ends_with("profiles") {
        data_dir.parent().unwrap_or(data_dir)
    } else {
        data_dir
    };
    base.join("binaries").join("astrobrowser")
}

/// Retorna o caminho do executável principal no Linux (com suporte a subpastas de descompactação)
pub fn get_executable_path(target_dir: &Path) -> PathBuf {
    let direct = target_dir.join("chrome");
    if direct.exists() && direct.is_file() {
        return direct;
    }

    if let Ok(entries) = std::fs::read_dir(target_dir) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_dir() {
                let sub = p.join("chrome");
                if sub.exists() && sub.is_file() {
                    return sub;
                }
            }
        }
    }

    direct
}
