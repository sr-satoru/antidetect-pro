pub mod fonts;
pub mod media_devices;
pub mod translator;

pub use translator::{build_camou_config, extract_fingerprint_map, resolve_os, resolve_user_agent};
