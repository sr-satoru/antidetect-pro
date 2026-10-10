use std::fs;
use std::path::{Path, PathBuf};

/// Retorna o diretório canônico de destino do AstroFox no Windows
pub fn get_target_dir(data_dir: &Path) -> PathBuf {
    let base = if data_dir.ends_with("profiles") {
        data_dir.parent().unwrap_or(data_dir)
    } else {
        data_dir
    };

    let binaries = base.join("binaries");
    let candidate_dirs = ["astrofox", "camoufox", "firefox"];
    for dir in &candidate_dirs {
        let path = binaries.join(dir);
        if path.exists() && path.is_dir() {
            return path;
        }
    }

    binaries.join("astrofox")
}

/// Retorna o caminho do executável principal no Windows
pub fn get_executable_path(target_dir: &Path) -> PathBuf {
    let candidates = ["star-engine.exe", "camoufox.exe", "astrofox.exe", "firefox.exe", "star-engine", "camoufox", "firefox"];

    // 1. Checa na raiz do target_dir
    for name in &candidates {
        let p = target_dir.join(name);
        if p.exists() && p.is_file() {
            return p;
        }
    }

    // 2. Checa em subdiretórios de 1º nível
    if let Ok(entries) = fs::read_dir(target_dir) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_dir() {
                for name in &candidates {
                    let sub_p = p.join(name);
                    if sub_p.exists() && sub_p.is_file() {
                        return sub_p;
                    }
                }
            }
        }
    }

    target_dir.join("star-engine.exe")
}
