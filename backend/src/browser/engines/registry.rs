use std::sync::Arc;
use super::camoufox::CamoufoxEngine;
use super::clearcote::ClearcoteEngine;
use super::trait_engine::BrowserEngine;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum KernelKind {
    Firefox,
    Chromium,
}

/// Normaliza a string do kernel vinda do perfil para identificar a família do motor
pub fn normalize_kernel(kernel: &str) -> KernelKind {
    let k = kernel.trim().to_lowercase();
    if k.contains("astrobrowser") || k.contains("chrom") || k.contains("blink") || k.contains("clear") {
        KernelKind::Chromium
    } else {
        KernelKind::Firefox
    }
}

/// Factory que retorna a instância correspondente do motor de navegação desacoplado
pub fn get_engine(kernel: &str) -> Arc<dyn BrowserEngine> {
    match normalize_kernel(kernel) {
        KernelKind::Chromium => Arc::new(ClearcoteEngine::new()),
        KernelKind::Firefox => Arc::new(CamoufoxEngine::new()),
    }
}
