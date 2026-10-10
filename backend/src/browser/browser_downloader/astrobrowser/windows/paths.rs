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

/// Resolve o data_dir canônico a partir do target_dir ou de qualquer subdiretório
fn resolve_data_dir_from_target(target_dir: &Path) -> &Path {
    let mut curr = target_dir;
    while let Some(parent) = curr.parent() {
        if curr.file_name().and_then(|s| s.to_str()) == Some("binaries") {
            return parent;
        }
        if parent.join("engine_paths.json").exists() {
            return parent;
        }
        curr = parent;
    }
    target_dir
}

/// Busca recursiva por executáveis do Clearcote em até 3 níveis de subpastas
fn find_executable_in_tree(dir: &Path, depth: usize, max_depth: usize) -> Option<PathBuf> {
    if depth > max_depth {
        return None;
    }
    if let Ok(entries) = fs::read_dir(dir) {
        let mut subdirs = Vec::new();
        // 1. Procura na pasta atual pelos nomes candidatos prioritários
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    for cand in &EXECUTABLE_CANDIDATES {
                        if name.eq_ignore_ascii_case(cand) {
                            return Some(path);
                        }
                    }
                }
            } else if path.is_dir() {
                let dname = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
                if !dname.starts_with('.') && dname != "__MACOSX" {
                    subdirs.push(path);
                }
            }
        }
        // 2. Busca recursiva em subpastas (ex: chrome-win64, clearcote, chrome-win)
        for sub in subdirs {
            if let Some(found) = find_executable_in_tree(&sub, depth + 1, max_depth) {
                return Some(found);
            }
        }
    }
    None
}

/// Retorna o diretório de destino do AstroBrowser no Windows com consulta ao registro persistente e auto-descoberta
pub fn get_target_dir(data_dir: &Path) -> PathBuf {
    // 1. Consulta o registro persistente engine_paths.json (aceita clearcote ou astrobrowser)
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
                if let Some(_) = find_executable_in_tree(&p, 0, 2) {
                    return p;
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
    let possible_data_dir = resolve_data_dir_from_target(target_dir);

    // 1. Tenta recuperar do registro persistente
    if let Some(reg) = path_registry::get_registered_engine(possible_data_dir, "clearcote") {
        if reg.executable_path.exists() && reg.executable_path.is_file() {
            return reg.executable_path;
        }
    }

    // 2. Busca na raiz e em qualquer subpasta (ex: chrome-win64, clearcote-windows)
    if let Some(found_exe) = find_executable_in_tree(target_dir, 0, 3) {
        let _ = path_registry::register_engine(
            possible_data_dir,
            "clearcote",
            "150.0.7871.114",
            target_dir,
            &found_exe,
        );
        return found_exe;
    }

    // 3. Varredura flexível por qualquer .exe acompanhado de dlls/paks
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
