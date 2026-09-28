#[cfg(target_os = "windows")]
pub mod windows;
#[cfg(target_os = "windows")]
pub use windows::*;

#[cfg(target_os = "linux")]
pub mod linux;
#[cfg(target_os = "linux")]
pub use linux::*;

#[cfg(all(unix, not(target_os = "linux")))]
pub mod unix;
#[cfg(all(unix, not(target_os = "linux")))]
pub use unix::*;
