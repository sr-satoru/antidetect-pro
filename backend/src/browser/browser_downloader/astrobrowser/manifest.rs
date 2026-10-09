use std::collections::HashMap;
use serde::{Deserialize, Serialize};

pub use super::extractor::ArchiveFormat;
use super::error::AstrobrowserError;

pub const ASTROBROWSER_RELEASE_TAG: &str = "v0.1.0-pre.23";
pub const ASTROBROWSER_CHROMIUM_VERSION: &str = "150.0.7871.114";

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

/// Representação da máquina anfitriã para AstroBrowser
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

    pub fn astrobrowser_platform_key(&self) -> Result<&'static str, AstrobrowserError> {
        match (self.os, self.arch) {
            (Os::Windows, Arch::X86_64) => Ok("windows-x64"),
            (Os::Linux, Arch::X86_64) => Ok("linux-x64"),
            (os, arch) => Err(AstrobrowserError::UnsupportedPlatform(format!(
                "Motor AstroBrowser não possui binário oficial para SO '{}' com arquitetura '{}'",
                os.display_name(),
                arch.display_name()
            ))),
        }
    }

    #[must_use]
    pub fn is_astrobrowser_supported(&self) -> bool {
        self.astrobrowser_platform_key().is_ok()
    }
}

/// Metadados do artefato binário oficial do AstroBrowser (Clearcote Stealth)
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AstrobrowserArtifact {
    pub platform_key: &'static str,
    pub filename: &'static str,
    pub url: &'static str,
    pub exe_name: &'static str,
    pub archive_format: ArchiveFormat,
    pub sha256: &'static str,
    pub exe_sha256: &'static str,
    pub size_mb: u64,
}

pub static WINDOWS_X64_ARTIFACT: AstrobrowserArtifact = AstrobrowserArtifact {
    platform_key: "windows-x64",
    filename: "clearcote-150.0.7871.114-windows-x64.zip",
    url: "https://github.com/clearcote-browser/clearcote/releases/download/v0.1.0-pre.23/clearcote-150.0.7871.114-windows-x64.zip",
    exe_name: "chrome.exe",
    archive_format: ArchiveFormat::Zip,
    sha256: "93fc03c45b931d8d82f714814318892929f44dd671b0993788332071d53f3135",
    exe_sha256: "f49b0d6bc5a08857e34f951ddc456abc643283ae45ff330ee7c2c39cd75b4869",
    size_mb: 180,
};

pub static LINUX_X64_ARTIFACT: AstrobrowserArtifact = AstrobrowserArtifact {
    platform_key: "linux-x64",
    filename: "clearcote-150.0.7871.114-linux-x64.tar.xz",
    url: "https://github.com/clearcote-browser/clearcote/releases/download/v0.1.0-pre.23/clearcote-150.0.7871.114-linux-x64.tar.xz",
    exe_name: "chrome",
    archive_format: ArchiveFormat::TarXz,
    sha256: "92ebd3de6fbf2c1349d3eb3c210952fcdb8dc9ed35655a35297cd68431fc8ef2",
    exe_sha256: "cc192460484b7dcb1de8df3b3b7bea6f78962d560b6347012d9dbedd3f66720d",
    size_mb: 220,
};

/// Obtém o artefato oficial correspondente à máquina especificada.
pub fn get_artifact(
    machine: &HostMachine,
) -> Result<&'static AstrobrowserArtifact, AstrobrowserError> {
    match (machine.os, machine.arch) {
        (Os::Windows, Arch::X86_64) => Ok(&WINDOWS_X64_ARTIFACT),
        (Os::Linux, Arch::X86_64) => Ok(&LINUX_X64_ARTIFACT),
        (os, arch) => Err(AstrobrowserError::UnsupportedPlatform(format!(
            "AstroBrowser não possui binário oficial para {} ({})",
            os.display_name(),
            arch.display_name()
        ))),
    }
}

/// Obtém o artefato oficial para a máquina anfitriã atual detectada.
pub fn get_current_artifact() -> Result<&'static AstrobrowserArtifact, AstrobrowserError> {
    let machine = HostMachine::detect();
    get_artifact(&machine)
}

/// Gera as configurações de plataforma de todos os artefatos do AstroBrowser
pub fn get_platform_map() -> HashMap<String, crate::browser_downloader::PlatformConfig> {
    let mut platforms = HashMap::new();

    let win_chrome = crate::browser_downloader::PlatformConfig {
        filename: WINDOWS_X64_ARTIFACT.filename.to_string(),
        url: WINDOWS_X64_ARTIFACT.url.to_string(),
        exe_name: WINDOWS_X64_ARTIFACT.exe_name.to_string(),
        archive_format: ArchiveFormat::Zip,
        sha256: Some(WINDOWS_X64_ARTIFACT.sha256.to_string()),
        exe_sha256: Some(WINDOWS_X64_ARTIFACT.exe_sha256.to_string()),
        source_candidates: vec!["chrome.exe".into(), "clearcote.exe".into(), "star-chromium.exe".into()],
        size_mb: WINDOWS_X64_ARTIFACT.size_mb as usize,
    };
    platforms.insert("win-x86_64".to_string(), win_chrome.clone());
    platforms.insert("windows-x64".to_string(), win_chrome);

    let lin_chrome = crate::browser_downloader::PlatformConfig {
        filename: LINUX_X64_ARTIFACT.filename.to_string(),
        url: LINUX_X64_ARTIFACT.url.to_string(),
        exe_name: LINUX_X64_ARTIFACT.exe_name.to_string(),
        archive_format: ArchiveFormat::TarXz,
        sha256: Some(LINUX_X64_ARTIFACT.sha256.to_string()),
        exe_sha256: Some(LINUX_X64_ARTIFACT.exe_sha256.to_string()),
        source_candidates: vec!["chrome".into(), "clearcote".into(), "star-chromium".into()],
        size_mb: LINUX_X64_ARTIFACT.size_mb as usize,
    };
    platforms.insert("lin-x86_64".to_string(), lin_chrome.clone());
    platforms.insert("linux-x64".to_string(), lin_chrome);

    platforms
}

/// Constrói o manifesto de motor para o AstroBrowser
pub fn get_engine_manifest() -> crate::browser_downloader::EngineManifest {
    crate::browser_downloader::EngineManifest {
        engine_name: "Clearcote".to_string(),
        version: ASTROBROWSER_CHROMIUM_VERSION.to_string(),
        release_tag: ASTROBROWSER_RELEASE_TAG.to_string(),
        target_dir: ".engine-chromium".to_string(),
        platforms: get_platform_map(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_astrobrowser_artifact_resolution() {
        let win = HostMachine::new(Os::Windows, Arch::X86_64);
        let win_art = get_artifact(&win).unwrap();
        assert_eq!(win_art.exe_name, "chrome.exe");
        assert_eq!(win_art.archive_format, ArchiveFormat::Zip);
        assert!(!win_art.sha256.is_empty());

        let lin = HostMachine::new(Os::Linux, Arch::X86_64);
        let lin_art = get_artifact(&lin).unwrap();
        assert_eq!(lin_art.exe_name, "chrome");
        assert_eq!(lin_art.archive_format, ArchiveFormat::TarXz);
        assert!(!lin_art.sha256.is_empty());

        let mac = HostMachine::new(Os::MacOS, Arch::Aarch64);
        assert!(get_artifact(&mac).is_err());
    }

    #[test]
    fn test_astrobrowser_platform_keys() {
        assert_eq!(
            HostMachine::new(Os::Windows, Arch::X86_64)
                .astrobrowser_platform_key()
                .unwrap(),
            "windows-x64"
        );
        assert_eq!(
            HostMachine::new(Os::Linux, Arch::X86_64)
                .astrobrowser_platform_key()
                .unwrap(),
            "linux-x64"
        );

        let mac_unsupported = HostMachine::new(Os::MacOS, Arch::Aarch64);
        assert!(mac_unsupported.astrobrowser_platform_key().is_err());
        assert!(!mac_unsupported.is_astrobrowser_supported());
    }
}
