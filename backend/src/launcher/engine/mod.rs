pub mod cdp;
pub mod command;
pub mod injection;
pub mod manager;
pub mod prefs;
pub mod tab_manager;
pub mod watcher;

pub use manager::ProcessManager;
pub use tab_manager::{TabInfo, TabManager};

