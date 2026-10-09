pub mod detector;
pub mod downloader;
pub mod error;
pub mod extractor;
pub mod manifest;
pub mod verifier;

pub use detector::{check_health, find_clearcote_executable, resolve_binary};
pub use downloader::{download_astrobrowser, download_astrobrowser_for};
pub use error::AstrobrowserError;
pub use extractor::{
    apply_unix_permissions, extract_archive, extract_tar_xz, extract_zip, flatten_wrapper_dir,
    ArchiveFormat,
};
pub use manifest::{
    get_artifact, get_current_artifact, get_engine_manifest, get_platform_map,
    AstrobrowserArtifact, HostMachine, Arch, Os, ASTROBROWSER_CHROMIUM_VERSION,
    ASTROBROWSER_RELEASE_TAG,
};
pub use verifier::{compute_file_sha256, verify_file_sha256};
