use std::fs;
use std::path::{Path, PathBuf};
use crate::browser_downloader::path_registry;

/// Valida se o executável possui bibliotecas e recursos vitais adjacentes no mesmo diretório (has_sibling_dll).
/// Evita registrar executáveis órfãos ou incompletos.
pub fn has_sibling_dll(exe_path: &Path) -> bool {
    let parent = match exe_path.parent() {
        Some(p) => p,
        None => return false,
    };

    if let Ok(entries) = fs::read_dir(parent) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                let ext = path
                    .extension()
                    .and_then(|e| e.to_str())
                    .unwrap_or("")
                    .to_lowercase();
                if ext == "dll" || ext == "pak" || ext == "dat" || ext == "bin" {
                    return true;
                }
            }
        }
    }

    false
}

/// Nomes de executáveis candidatos para o AstroBrowser / Clearcote no Windows
pub const EXECUTABLE_CANDIDATES: [&str; 8] = [
    "chrome.exe",
    "clearcote.exe",
    "astrobrowser.exe",
    "star-chromium.exe",
    "chromium.exe",
    "chrome",
    "clearcote",
    "star-chromium",
];

/// Nomes de diretórios candidatos dentro da pasta `binaries` no Windows
pub const DIRECTORY_CANDIDATES: [&str; 9] = [
    "astrobrowser",
    "astro browser",
    "astro-browser",
    "astro_browser",
    "clearcote",
    "clearcote-browser",
    "chrome-win",
    "chrome",
    "chromium",
];

/// Retorna o diretório de destino do AstroBrowser no Windows com consulta ao registro persistente e auto-descoberta
pub fn get_target_dir(data_dir: &Path) -> PathBuf {
    // 1. Consulta o registro persistente engine_paths.json
    if let Some(reg) = path_registry::get_registered_engine(data_dir, "clearcote") {
        if reg.target_dir.exists() && reg.target_dir.is_dir() {
            return reg.target_dir;
        }
    }

    let base = if data_dir.ends_with("profiles") {
        data_dir.parent().unwrap_or(data_dir)
    } else {
        data_dir
    };

    let binaries = if base.ends_with("binaries") {
        base.to_path_buf()
    } else {
        base.join("binaries")
    };

    // 2. Checa lista expandida de candidatos conhecidos
    for dir in &DIRECTORY_CANDIDATES {
        let path = binaries.join(dir);
        if path.exists() && path.is_dir() {
            return path;
        }
    }

    // 3. Varredura ativa dinâmica: inspeciona qualquer subpasta de binaries procurando por chrome.exe/clearcote.exe
    if let Ok(entries) = fs::read_dir(&binaries) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_dir() {
                for exe in &EXECUTABLE_CANDIDATES {
                    let candidate = p.join(exe);
                    if candidate.exists() && candidate.is_file() {
                        return p;
                    }
                }
            }
        }
    }

    // 4. Caso o executável esteja diretamente na raiz de binaries
    for exe in &EXECUTABLE_CANDIDATES {
        let root_exe = binaries.join(exe);
        if root_exe.exists() && root_exe.is_file() && has_sibling_dll(&root_exe) {
            return binaries;
        }
    }

    // Fallback padrão canônico
    binaries.join("astrobrowser")
}

/// Retorna o caminho do executável principal no Windows
pub fn get_executable_path(target_dir: &Path) -> PathBuf {
    // 1. Tenta recuperar do registro persistente se target_dir pertencer ao data_dir
    let possible_data_dir = if target_dir.ends_with("binaries") {
        target_dir.parent().unwrap_or(target_dir)
    } else if let Some(bin_dir) = target_dir.parent() {
        bin_dir.parent().unwrap_or(bin_dir)
    } else {
        target_dir
    };

    if let Some(reg) = path_registry::get_registered_engine(possible_data_dir, "clearcote") {
        if reg.executable_path.exists() && reg.executable_path.is_file() {
            return reg.executable_path;
        }
    }

    // 2. Checa diretamente na raiz do target_dir
    for name in &EXECUTABLE_CANDIDATES {
        let p = target_dir.join(name);
        if p.exists() && p.is_file() {
            let _ = path_registry::register_engine(
                possible_data_dir,
                "clearcote",
                "150.0.7871.114",
                target_dir,
                &p,
            );
            return p;
        }
    }

    // 3. Checa em subdiretórios de 1º nível (ex: wrapper de descompactação como chrome-win)
    if let Ok(entries) = fs::read_dir(target_dir) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_dir() {
                for name in &EXECUTABLE_CANDIDATES {
                    let sub_p = p.join(name);
                    if sub_p.exists() && sub_p.is_file() {
                        let _ = path_registry::register_engine(
                            possible_data_dir,
                            "clearcote",
                            "150.0.7871.114",
                            target_dir,
                            &sub_p,
                        );
                        return sub_p;
                    }
                }
            }
        }
    }

    // 4. Varredura por qualquer .exe com has_sibling_dll
    if let Ok(entries) = fs::read_dir(target_dir) {
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_file() {
                let is_exe = p.extension().map(|e| e.eq_ignore_ascii_case("exe")).unwrap_or(false);
                if is_exe && has_sibling_dll(&p) {
                    let _ = path_registry::register_engine(
                        possible_data_dir,
                        "clearcote",
                        "150.0.7871.114",
                        target_dir,
                        &p,
                    );
                    return p;
                }
            }
        }
    }

    // Fallback padrão se ainda não extraído
    target_dir.join("chrome.exe")
}
