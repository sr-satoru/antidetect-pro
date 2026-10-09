use std::path::{Path, PathBuf};
use super::manifest::EngineKind;
use super::detector::{check_engine_health_for, EngineHealthStatus};

/// Retorna o nome amigável do sistema operacional atual
pub fn get_os_display_name() -> &'static str {
    #[cfg(target_os = "windows")]
    {
        "Windows"
    }
    #[cfg(target_os = "linux")]
    {
        "Linux"
    }
    #[cfg(target_os = "macos")]
    {
        "macOS"
    }
    #[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
    {
        "Desconhecido"
    }
}

/// Retorna a chave de plataforma atual para o motor padrão (Camoufox legado)
pub fn get_current_platform_key() -> Result<String, String> {
    #[cfg(all(target_os = "windows", target_arch = "x86_64"))]
    return Ok("win-x86_64".to_string());
    #[cfg(all(target_os = "linux", target_arch = "x86_64"))]
    return Ok("lin-x86_64".to_string());
    #[cfg(all(target_os = "linux", target_arch = "aarch64"))]
    return Ok("lin-arm64".to_string());
    #[cfg(all(target_os = "macos", target_arch = "aarch64"))]
    return Ok("mac-arm64".to_string());

    #[cfg(not(any(
        all(target_os = "windows", target_arch = "x86_64"),
        all(target_os = "linux", target_arch = "x86_64"),
        all(target_os = "linux", target_arch = "aarch64"),
        all(target_os = "macos", target_arch = "aarch64")
    )))]
    return Err("Plataforma não suportada".to_string());
}

/// Retorna o diretório canônico padrão de armazenamento por sistema operacional
pub fn get_canonical_app_dir() -> PathBuf {
    if let Ok(env_dir) = std::env::var("STAR_DATA_DIR") {
        let p = PathBuf::from(env_dir);
        if !p.as_os_str().is_empty() {
            return p;
        }
    }

    #[cfg(target_os = "windows")]
    {
        if let Ok(appdata) = std::env::var("LOCALAPPDATA") {
            return PathBuf::from(&appdata).join("star-multlogin");
        }
    }

    #[cfg(target_os = "macos")]
    {
        if let Ok(home) = std::env::var("HOME") {
            return PathBuf::from(&home)
                .join("Library")
                .join("Application Support")
                .join("star-multlogin");
        }
    }

    #[cfg(target_os = "linux")]
    {
        if let Ok(home) = std::env::var("HOME") {
            return PathBuf::from(&home)
                .join(".local")
                .join("share")
                .join("star-multlogin");
        }
    }

    PathBuf::from("./data")
}

/// Resolve o executável do motor Camoufox instalado (compatibilidade legada)
pub fn resolve_engine_binary(data_dir: &Path) -> Result<PathBuf, String> {
    resolve_binary_for_engine(data_dir, EngineKind::Camoufox)
}

/// Resolve o executável do motor Clearcote (Chromium) instalado
pub fn resolve_clearcote_binary(data_dir: &Path) -> Result<PathBuf, String> {
    resolve_binary_for_engine(data_dir, EngineKind::Clearcote)
}

/// Resolve o binário de qualquer motor suportado (Clearcote ou Camoufox)
pub fn resolve_binary_for_engine(data_dir: &Path, engine: EngineKind) -> Result<PathBuf, String> {
    match check_engine_health_for(data_dir, engine) {
        EngineHealthStatus::Installed { executable_path, .. } => Ok(executable_path),
        EngineHealthStatus::Broken { reason } => Err(format!(
            "O motor de navegação '{}' está corrompido: {}. É necessário baixar novamente.",
            engine.as_str(),
            reason
        )),
        EngineHealthStatus::Missing { .. } => Err(format!(
            "O motor de navegação '{}' ainda não está instalado na máquina. Abra a Central de Atualizações para baixar.",
            engine.as_str()
        )),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_platform_detection() {
        let key = get_current_platform_key();
        assert!(key.is_ok());
        let key_str = key.unwrap();
        assert!(key_str.contains('-'));
        assert!(!get_os_display_name().is_empty());
    }
}
