pub mod astrobrowser;
pub mod astrofox;
pub mod detector;
pub mod error;
pub mod manifest;
pub mod platform;
pub mod service;
pub mod traits;

pub use astrobrowser::{
    check_health as check_astrobrowser_health, resolve_binary as resolve_astrobrowser_binary,
    AstrobrowserArtifact, ASTROBROWSER_CHROMIUM_VERSION, ASTROBROWSER_RELEASE_TAG,
};
pub use astrofox::{
    check_health as check_astrofox_health, resolve_binary as resolve_astrofox_binary,
    AstrofoxArtifact, ASTROFOX_CAMOUFOX_VERSION, ASTROFOX_RELEASE_TAG,
};
pub use detector::{
    check_clearcote_health, check_engine_health, check_engine_health_for, clean_broken_engine,
    clean_broken_engine_for, clean_temp_downloads, find_clearcote_executable,
    find_or_standardize_executable, get_engine_dir, get_engine_dir_for, EngineHealthStatus,
    EngineVerificationReport, verify_installed_engine,
};
pub use error::BrowserDownloadError;
pub use manifest::{BrowserManifest, EngineKind, EngineManifest, PlatformConfig};
pub use platform::{
    get_canonical_app_dir, get_current_platform_key, get_os_display_name, resolve_binary_for_engine,
    resolve_clearcote_binary, resolve_engine_binary,
};
pub use service::{BrowserDownloadEvent, BrowserDownloadService, DownloadStatus};
pub use traits::{ArchiveFormat, PlatformOperations};
