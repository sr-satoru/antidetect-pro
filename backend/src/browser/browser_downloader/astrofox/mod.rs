pub mod detector;
pub mod downloader;
pub mod error;
pub mod extractor;
pub mod manifest;

pub use detector::{check_health, find_or_standardize_executable, resolve_binary};
pub use downloader::{download_astrofox, download_astrofox_for};
pub use error::AstrofoxError;
pub use extractor::{apply_unix_permissions, extract_zip, flatten_wrapper_dir};
pub use manifest::{
    get_artifact, get_current_artifact, get_engine_manifest, get_platform_map,
    AstrofoxArtifact, HostMachine, Arch, Os, ASTROFOX_CAMOUFOX_VERSION, ASTROFOX_RELEASE_TAG,
};
