#[cfg(target_os = "windows")]
pub mod windows;
#[cfg(target_os = "windows")]
pub use windows::*;

#[cfg(target_os = "linux")]
pub mod linux;
#[cfg(target_os = "linux")]
pub use linux::*;

#[cfg(any(target_os = "macos", all(unix, not(target_os = "linux"))))]
pub mod macos;
#[cfg(any(target_os = "macos", all(unix, not(target_os = "linux"))))]
pub use macos::*;
