use std::fs;
use std::path::{Path, PathBuf};

/// Retorna o diretório canônico de destino do AstroBrowser no Windows
pub fn get_target_dir(data_dir: &Path) -> PathBuf {
    let base = if data_dir.ends_with("profiles") {
        data_dir.parent().unwrap_or(data_dir)
    } else {
        data_dir
    };
    base.join("binaries").join("astrobrowser")
}

/// Retorna o caminho do executável principal no Windows
pub fn get_executable_path(target_dir: &Path) -> PathBuf {
    let candidates = ["chrome.exe", "clearcote.exe", "astrobrowser.exe", "chrome", "clearcote"];

    // 1. Checa diretamente na raiz do target_dir
    for name in &candidates {
        let p = target_dir.join(name);
        if p.exists() && p.is_file() {
            return p;
        }
    }

    // 2. Checa em subdiretórios de 1º nível (ex: wrapper de descompactação)
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

    // Fallback padrão se ainda não extraído/instalado
    target_dir.join("chrome.exe")
}
