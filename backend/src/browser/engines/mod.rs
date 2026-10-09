pub mod camoufox;
pub mod clearcote;
pub mod registry;
pub mod trait_engine;

pub use registry::{get_engine, normalize_kernel, KernelKind};
pub use trait_engine::{BrowserEngine, EnginePrepResult};
