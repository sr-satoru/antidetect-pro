use std::collections::HashMap;
use serde::{Deserialize, Serialize};

use super::error::AstrofoxError;

pub const ASTROFOX_RELEASE_TAG: &str = "v2.1.0";
pub const ASTROFOX_CAMOUFOX_VERSION: &str = "152.0.4-beta.31";

/// Sistema operacional detectado
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Os {
    Windows,
    Linux,
    MacOS,
    Unknown,
}

impl Os {
    #[must_use]
    pub const fn detect() -> Self {
        #[cfg(target_os = "windows")]
        {
            Self::Windows
        }
        #[cfg(target_os = "linux")]
        {
            Self::Linux
        }
        #[cfg(target_os = "macos")]
        {
            Self::MacOS
        }
        #[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
        {
            Self::Unknown
        }
    }

    #[must_use]
    pub const fn display_name(&self) -> &'static str {
        match self {
            Self::Windows => "Windows",
            Self::Linux => "Linux",
            Self::MacOS => "macOS",
            Self::Unknown => "Desconhecido",
        }
    }
}

/// Arquitetura de CPU detectada
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Arch {
    X86_64,
    Aarch64,
    Unknown,
}

impl Arch {
    #[must_use]
    pub const fn detect() -> Self {
        #[cfg(target_arch = "x86_64")]
        {
            Self::X86_64
        }
        #[cfg(target_arch = "aarch64")]
        {
            Self::Aarch64
        }
        #[cfg(not(any(target_arch = "x86_64", target_arch = "aarch64")))]
        {
            Self::Unknown
        }
    }

    #[must_use]
    pub const fn display_name(&self) -> &'static str {
        match self {
            Self::X86_64 => "x86_64 (64-bit)",
            Self::Aarch64 => "ARM64 (Apple Silicon / AArch64)",
            Self::Unknown => "Arquitetura não suportada",
        }
    }
}

/// Representação da máquina anfitriã para AstroFox
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct HostMachine {
    pub os: Os,
    pub arch: Arch,
}

impl HostMachine {
    #[must_use]
    pub fn detect() -> Self {
        Self {
            os: Os::detect(),
            arch: Arch::detect(),
        }
    }

    #[must_use]
    pub const fn new(os: Os, arch: Arch) -> Self {
        Self { os, arch }
    }

    pub fn astrofox_platform_key(&self) -> Result<&'static str, AstrofoxError> {
        match (self.os, self.arch) {
            (Os::Windows, Arch::X86_64) => Ok("win-x86_64"),
            (Os::Linux, Arch::X86_64) => Ok("lin-x86_64"),
            (Os::Linux, Arch::Aarch64) => Ok("lin-arm64"),
            (Os::MacOS, Arch::Aarch64) => Ok("mac-arm64"),
            (os, arch) => Err(AstrofoxError::UnsupportedPlatform(format!(
                "Motor AstroFox não suporta SO '{}' com arquitetura '{}'",
                os.display_name(),
                arch.display_name()
            ))),
        }
    }
}

/// Metadados do artefato binário oficial do AstroFox (Camoufox / Gecko)
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AstrofoxArtifact {
    pub platform_key: &'static str,
    pub filename: &'static str,
    pub url: &'static str,
    pub exe_name: &'static str,
    pub size_mb: u64,
}

pub static WIN_X64_ARTIFACT: AstrofoxArtifact = AstrofoxArtifact {
    platform_key: "win-x86_64",
    filename: "camoufox-152.0.4-beta.31-win.x86_64.zip",
    url: "https://github.com/sr-satoru/navegador/releases/download/v2.1.0/camoufox-152.0.4-beta.31-win.x86_64.zip",
    exe_name: "star-engine.exe",
    size_mb: 456,
};

pub static LIN_X64_ARTIFACT: AstrofoxArtifact = AstrofoxArtifact {
    platform_key: "lin-x86_64",
    filename: "camoufox-152.0.4-beta.31-lin.x86_64.zip",
    url: "https://github.com/sr-satoru/navegador/releases/download/v2.1.0/camoufox-152.0.4-beta.31-lin.x86_64.zip",
    exe_name: "star-engine",
    size_mb: 632,
};

pub static LIN_ARM64_ARTIFACT: AstrofoxArtifact = AstrofoxArtifact {
    platform_key: "lin-arm64",
    filename: "camoufox-152.0.4-beta.31-lin.arm64.zip",
    url: "https://github.com/sr-satoru/navegador/releases/download/v2.1.0/camoufox-152.0.4-beta.31-lin.arm64.zip",
    exe_name: "star-engine",
    size_mb: 623,
};

pub static MAC_ARM64_ARTIFACT: AstrofoxArtifact = AstrofoxArtifact {
    platform_key: "mac-arm64",
    filename: "camoufox-152.0.4-beta.31-mac.arm64.zip",
    url: "https://github.com/sr-satoru/navegador/releases/download/v2.1.0/camoufox-152.0.4-beta.31-mac.arm64.zip",
    exe_name: "star-engine",
    size_mb: 298,
};

/// Obtém o artefato oficial correspondente à máquina especificada.
pub fn get_artifact(
    machine: &HostMachine,
) -> Result<&'static AstrofoxArtifact, AstrofoxError> {
    match (machine.os, machine.arch) {
        (Os::Windows, Arch::X86_64) => Ok(&WIN_X64_ARTIFACT),
        (Os::Linux, Arch::X86_64) => Ok(&LIN_X64_ARTIFACT),
        (Os::Linux, Arch::Aarch64) => Ok(&LIN_ARM64_ARTIFACT),
        (Os::MacOS, Arch::Aarch64) => Ok(&MAC_ARM64_ARTIFACT),
        (os, arch) => Err(AstrofoxError::UnsupportedPlatform(format!(
            "AstroFox não suporta {} ({})",
            os.display_name(),
            arch.display_name()
        ))),
    }
}

/// Obtém o artefato oficial para a máquina anfitriã atual detectada.
pub fn get_current_artifact() -> Result<&'static AstrofoxArtifact, AstrofoxError> {
    let machine = HostMachine::detect();
    get_artifact(&machine)
}

/// Gera as configurações de plataforma de todos os artefatos do AstroFox
pub fn get_platform_map() -> HashMap<String, crate::browser_downloader::PlatformConfig> {
    let mut platforms = HashMap::new();
    let artifacts = [
        &WIN_X64_ARTIFACT,
        &LIN_X64_ARTIFACT,
        &LIN_ARM64_ARTIFACT,
        &MAC_ARM64_ARTIFACT,
    ];

    for art in artifacts {
        platforms.insert(
            art.platform_key.to_string(),
            crate::browser_downloader::PlatformConfig {
                filename: art.filename.to_string(),
                url: art.url.to_string(),
                exe_name: art.exe_name.to_string(),
                archive_format: crate::browser_downloader::ArchiveFormat::Zip,
                sha256: None,
                exe_sha256: None,
                source_candidates: vec!["star-engine.exe".into(), "camoufox.exe".into(), "star-engine".into(), "camoufox".into()],
                size_mb: art.size_mb as usize,
            },
        );
    }

    platforms
}

/// Constrói o manifesto de motor para o AstroFox
pub fn get_engine_manifest() -> crate::browser_downloader::EngineManifest {
    crate::browser_downloader::EngineManifest {
        engine_name: "Camoufox".to_string(),
        version: ASTROFOX_CAMOUFOX_VERSION.to_string(),
        release_tag: ASTROFOX_RELEASE_TAG.to_string(),
        target_dir: ".engine".to_string(),
        platforms: get_platform_map(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_astrofox_artifact_resolution() {
        let win = HostMachine::new(Os::Windows, Arch::X86_64);
        let win_art = get_artifact(&win).unwrap();
        assert_eq!(win_art.exe_name, "star-engine.exe");

        let lin = HostMachine::new(Os::Linux, Arch::X86_64);
        let lin_art = get_artifact(&lin).unwrap();
        assert_eq!(lin_art.exe_name, "star-engine");

        let lin_arm = HostMachine::new(Os::Linux, Arch::Aarch64);
        let lin_arm_art = get_artifact(&lin_arm).unwrap();
        assert_eq!(lin_arm_art.platform_key, "lin-arm64");

        let mac = HostMachine::new(Os::MacOS, Arch::Aarch64);
        let mac_art = get_artifact(&mac).unwrap();
        assert_eq!(mac_art.platform_key, "mac-arm64");
    }

    #[test]
    fn test_astrofox_platform_keys() {
        assert_eq!(
            HostMachine::new(Os::Windows, Arch::X86_64)
                .astrofox_platform_key()
                .unwrap(),
            "win-x86_64"
        );
        assert_eq!(
            HostMachine::new(Os::Linux, Arch::X86_64)
                .astrofox_platform_key()
                .unwrap(),
            "lin-x86_64"
        );
        assert_eq!(
            HostMachine::new(Os::Linux, Arch::Aarch64)
                .astrofox_platform_key()
                .unwrap(),
            "lin-arm64"
        );
        assert_eq!(
            HostMachine::new(Os::MacOS, Arch::Aarch64)
                .astrofox_platform_key()
                .unwrap(),
            "mac-arm64"
        );

        let unsupported = HostMachine::new(Os::MacOS, Arch::X86_64);
        assert!(unsupported.astrofox_platform_key().is_err());
    }
}
