pub mod distributor;
pub mod error;
pub mod linux;
pub mod macos;
pub mod windows;

pub use distributor::{
    check_health, download_astrofox, get_current_artifact, get_engine_manifest,
    resolve_binary, AstrofoxArtifact, ASTROFOX_CAMOUFOX_VERSION, ASTROFOX_RELEASE_TAG,
};
