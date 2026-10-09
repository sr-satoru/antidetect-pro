use std::path::{Path, PathBuf};

/// Retorna o diretório canônico de destino do AstroFox no macOS
pub fn get_target_dir(data_dir: &Path) -> PathBuf {
    let base = if data_dir.ends_with("profiles") {
        data_dir.parent().unwrap_or(data_dir)
    } else {
        data_dir
    };
    base.join("binaries").join("astrofox")
}

/// Retorna o caminho do executável principal no macOS
pub fn get_executable_path(target_dir: &Path) -> PathBuf {
    let app_exe = target_dir
        .join("Camoufox.app")
        .join("Contents")
        .join("MacOS")
        .join("camoufox");
    if app_exe.exists() {
        return app_exe;
    }
    target_dir.join("star-engine")
}
