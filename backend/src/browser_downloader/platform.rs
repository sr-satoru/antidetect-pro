use std::path::PathBuf;

/// Detecta a chave da plataforma atual (ex: "lin-x86_64", "win-x86_64", "mac-arm64")
pub fn get_current_platform_key() -> Result<String, String> {
    let os = if cfg!(target_os = "windows") {
        "win"
    } else if cfg!(target_os = "macos") {
        "mac"
    } else if cfg!(target_os = "linux") {
        "lin"
    } else {
        return Err("Sistema operacional não suportado.".to_string());
    };

    let arch = if cfg!(target_arch = "x86_64") {
        "x86_64"
    } else if cfg!(target_arch = "aarch64") {
        "arm64"
    } else if cfg!(target_arch = "x86") {
        #[cfg(target_os = "windows")]
        {
            // Se o binário é 32-bit rodando sob WOW64 em um Windows 64-bit
            if std::env::var("PROCESSOR_ARCHITEW6432").is_ok() {
                "x86_64"
            } else {
                "i686"
            }
        }
        #[cfg(not(target_os = "windows"))]
        {
            "i686"
        }
    } else {
        return Err("Arquitetura de processador não suportada.".to_string());
    };

    Ok(format!("{}-{}", os, arch))
}

/// Retorna o nome amigável do sistema operacional atual
pub fn get_os_display_name() -> &'static str {
    if cfg!(target_os = "windows") {
        "Windows"
    } else if cfg!(target_os = "macos") {
        "macOS"
    } else if cfg!(target_os = "linux") {
        "Linux"
    } else {
        "Desconhecido"
    }
}

/// Retorna o diretório canônico padrão de armazenamento por sistema operacional
#[allow(dead_code)]
pub fn get_canonical_app_dir() -> PathBuf {
    if let Ok(env_dir) = std::env::var("STAR_DATA_DIR").or_else(|_| std::env::var("FURY_DATA_DIR")) {
        let p = PathBuf::from(env_dir);
        if !p.as_os_str().is_empty() {
            return p;
        }
    }

    #[cfg(target_os = "windows")]
    {
        if let Ok(appdata) = std::env::var("LOCALAPPDATA") {
            let star_dir = PathBuf::from(&appdata).join("star-multlogin");
            if star_dir.exists() {
                return star_dir;
            }
            let legacy_dir = PathBuf::from(&appdata).join("Fury");
            if legacy_dir.exists() {
                return legacy_dir;
            }
            return star_dir;
        }
    }

    #[cfg(target_os = "macos")]
    {
        if let Ok(home) = std::env::var("HOME") {
            let star_dir = PathBuf::from(&home)
                .join("Library")
                .join("Application Support")
                .join("star-multlogin");
            if star_dir.exists() {
                return star_dir;
            }
            let legacy_dir = PathBuf::from(&home)
                .join("Library")
                .join("Application Support")
                .join("Fury");
            if legacy_dir.exists() {
                return legacy_dir;
            }
            return star_dir;
        }
    }

    #[cfg(target_os = "linux")]
    {
        if let Ok(home) = std::env::var("HOME") {
            let star_dir = PathBuf::from(&home).join(".local").join("share").join("star-multlogin");
            if star_dir.exists() {
                return star_dir;
            }
            let legacy_dir = PathBuf::from(&home).join(".local").join("share").join("fury");
            if legacy_dir.exists() {
                return legacy_dir;
            }
            return star_dir;
        }
    }

    PathBuf::from("./data")
}
