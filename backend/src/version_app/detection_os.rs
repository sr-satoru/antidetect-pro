use std::path::PathBuf;
use super::models::GitHubAsset;

#[derive(Debug, Clone, PartialEq)]
pub enum LinuxPackageType {
    AppImage(Option<PathBuf>),
    Deb,
    Generic,
}

#[derive(Debug, Clone, PartialEq)]
pub enum OsPackageType {
    Linux(LinuxPackageType),
    Windows,
    MacOs,
    Unknown,
}

#[derive(Debug, Clone)]
pub struct OsDetectionInfo {
    pub os: String,
    pub arch: String,
    pub package_type: OsPackageType,
    pub display_name: String,
    pub is_appimage: bool,
}

impl OsDetectionInfo {
    /// Detecta com precisão o Sistema Operacional, a Arquitetura e o tipo de empacotamento
    pub fn detect() -> Self {
        let os = std::env::consts::OS.to_string();
        let arch = match std::env::consts::ARCH {
            "x86_64" => "x86_64".to_string(),
            "aarch64" => "aarch64".to_string(),
            other => other.to_string(),
        };

        match os.as_str() {
            "linux" => {
                // 1. Checa a variável nativa obrigatória criada pelo runtime do AppImage
                if let Ok(appimage_env) = std::env::var("APPIMAGE") {
                    let path = PathBuf::from(&appimage_env);
                    Self {
                        os,
                        arch: arch.clone(),
                        package_type: OsPackageType::Linux(LinuxPackageType::AppImage(Some(path))),
                        display_name: format!("Linux ({}) [AppImage]", arch),
                        is_appimage: true,
                    }
                } else if std::path::Path::new("/etc/debian_version").exists() {
                    Self {
                        os,
                        arch: arch.clone(),
                        package_type: OsPackageType::Linux(LinuxPackageType::Deb),
                        display_name: format!("Linux ({}) [Debian/Ubuntu]", arch),
                        is_appimage: false,
                    }
                } else {
                    Self {
                        os,
                        arch: arch.clone(),
                        package_type: OsPackageType::Linux(LinuxPackageType::AppImage(None)),
                        display_name: format!("Linux ({}) [AppImage Portátil]", arch),
                        is_appimage: true,
                    }
                }
            }
            "windows" => Self {
                os,
                arch: arch.clone(),
                package_type: OsPackageType::Windows,
                display_name: format!("Windows ({})", arch),
                is_appimage: false,
            },
            "macos" => Self {
                os,
                arch: arch.clone(),
                package_type: OsPackageType::MacOs,
                display_name: format!("macOS ({})", arch),
                is_appimage: false,
            },
            _ => Self {
                os: os.clone(),
                arch: arch.clone(),
                package_type: OsPackageType::Unknown,
                display_name: format!("Desconhecido ({}-{})", os, arch),
                is_appimage: false,
            },
        }
    }

    /// Localiza na lista de assets do GitHub o arquivo exato compatível com o sistema
    pub fn match_asset<'a>(&self, assets: &'a [GitHubAsset]) -> Option<&'a GitHubAsset> {
        let arch_match = |name: &str| -> bool {
            match self.arch.as_str() {
                "x86_64" => name.contains("x86_64") || name.contains("amd64") || name.contains("x64"),
                "aarch64" => name.contains("aarch64") || name.contains("arm64"),
                _ => true,
            }
        };

        for asset in assets {
            let name = asset.name.as_deref().unwrap_or("").to_lowercase();

            let matched = match &self.package_type {
                OsPackageType::Linux(LinuxPackageType::AppImage(_)) => {
                    name.ends_with(".appimage") && arch_match(&name)
                }
                OsPackageType::Linux(LinuxPackageType::Deb) => {
                    name.ends_with(".deb") && arch_match(&name)
                }
                OsPackageType::Linux(LinuxPackageType::Generic) => {
                    (name.ends_with(".appimage") || name.ends_with(".deb")) && arch_match(&name)
                }
                OsPackageType::Windows => {
                    (name.ends_with(".exe") || name.ends_with(".msi")) && arch_match(&name)
                }
                OsPackageType::MacOs => {
                    name.ends_with(".dmg") || name.ends_with(".app.tar.gz")
                }
                OsPackageType::Unknown => false,
            };

            if matched {
                return Some(asset);
            }
        }

        None
    }
}
