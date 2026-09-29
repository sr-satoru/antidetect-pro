use std::ops::Deref;
use zeroize::{Zeroize, ZeroizeOnDrop};

/// Ativa a blindagem do processo na memória RAM:
/// Desativa Core Dumps e anexos de debuggers/ptrace (/proc/$PID/mem).
pub fn harden_process_memory() {
    #[cfg(target_os = "linux")]
    unsafe {
        let res = libc_prctl_dumpable(0);
        if res == 0 {
            tracing::info!("🛡️ Process Memory Hardening ativado: Anti-Dump & Anti-Ptrace");
        }
    }
}

#[cfg(target_os = "linux")]
unsafe fn libc_prctl_dumpable(dumpable: i32) -> i32 {
    unsafe extern "C" {
        fn prctl(option: i32, arg2: u64, arg3: u64, arg4: u64, arg5: u64) -> i32;
    }
    const PR_SET_DUMPABLE: i32 = 4;
    unsafe { prctl(PR_SET_DUMPABLE, dumpable as u64, 0, 0, 0) }
}

/// Estrutura de chave de 256 bits com ZeroizeOnDrop (garante sobrescrita com 0x00 ao ser descartada da memória)
#[derive(Clone, Zeroize, ZeroizeOnDrop)]
pub struct ProtectedKey(pub [u8; 32]);

impl ProtectedKey {
    pub fn new(bytes: [u8; 32]) -> Self {
        Self(bytes)
    }

    pub fn as_bytes(&self) -> &[u8; 32] {
        &self.0
    }
}

impl Deref for ProtectedKey {
    type Target = [u8; 32];

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl AsRef<[u8]> for ProtectedKey {
    fn as_ref(&self) -> &[u8] {
        &self.0
    }
}

impl AsRef<[u8; 32]> for ProtectedKey {
    fn as_ref(&self) -> &[u8; 32] {
        &self.0
    }
}
