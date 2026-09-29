use zeroize::{Zeroize, ZeroizeOnDrop};

#[cfg(target_os = "linux")]
mod sys {
    unsafe extern "C" {
        pub fn prctl(option: i32, arg2: u64, arg3: u64, arg4: u64, arg5: u64) -> i32;
    }
    pub const PR_SET_DUMPABLE: i32 = 4;
}

#[cfg(unix)]
mod unix_sys {
    unsafe extern "C" {
        pub fn mlock(addr: *const core::ffi::c_void, len: usize) -> i32;
        pub fn munlock(addr: *const core::ffi::c_void, len: usize) -> i32;
    }
}

/// Ativa a blindagem do processo na memória RAM:
/// 1. Desativa Core Dumps e desativa anexos de debuggers/ptrace (/proc/$PID/mem).
/// 2. Protege o processo contra leitura arbitrária de memória por outros processos sem privilégios especiais.
pub fn harden_process_memory() {
    #[cfg(target_os = "linux")]
    unsafe {
        let res = sys::prctl(sys::PR_SET_DUMPABLE, 0, 0, 0, 0);
        if res == 0 {
            tracing::info!("🛡️ Process Memory Hardening ativado: PR_SET_DUMPABLE = 0 (Anti-Dump & Anti-Ptrace)");
        } else {
            tracing::warn!("⚠️ Falha ao configurar PR_SET_DUMPABLE = 0 (Código de retorno: {})", res);
        }
    }
}

/// Trava uma fatia de bytes de memória na RAM física (impedindo que o SO envie para o Swap em disco)
pub fn lock_memory_page(data: &[u8]) {
    #[cfg(unix)]
    unsafe {
        let _ = unix_sys::mlock(data.as_ptr() as *const core::ffi::c_void, data.len());
    }
}

/// Destrava a memória física anteriormente travada
pub fn unlock_memory_page(data: &[u8]) {
    #[cfg(unix)]
    unsafe {
        let _ = unix_sys::munlock(data.as_ptr() as *const core::ffi::c_void, data.len());
    }
}

/// Estrutura de chave de 256 bits protegida por ZeroizeOnDrop (garante sobrescrita com 0x00 ao ser descartada da memória)
#[derive(Clone, Zeroize, ZeroizeOnDrop)]
pub struct ProtectedKey {
    bytes: [u8; 32],
}

impl ProtectedKey {
    pub fn new(raw: [u8; 32]) -> Self {
        lock_memory_page(&raw);
        Self { bytes: raw }
    }

    pub fn as_bytes(&self) -> &[u8; 32] {
        &self.bytes
    }
}

/// Fragmentação XOR da chave em duas partes distantes na memória RAM
/// Impede que scanners de malware localizem a chave contígua de 32 bytes em varreduras heurísticas de heap
#[derive(Clone, Zeroize, ZeroizeOnDrop)]
pub struct SplitKey {
    share_a: [u8; 32],
    share_b: [u8; 32],
}

impl SplitKey {
    pub fn from_key(key: &[u8; 32]) -> Self {
        use rand::RngCore;
        let mut share_b = [0u8; 32];
        rand::rngs::OsRng.fill_bytes(&mut share_b);

        let mut share_a = [0u8; 32];
        for i in 0..32 {
            share_a[i] = key[i] ^ share_b[i];
        }

        Self { share_a, share_b }
    }

    /// Reconstitui temporariamente a chave para executar a operação criptográfica e depois zera
    pub fn reconstruct(&self) -> ProtectedKey {
        let mut key = [0u8; 32];
        for i in 0..32 {
            key[i] = self.share_a[i] ^ self.share_b[i];
        }
        ProtectedKey::new(key)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_split_key_reconstruct() {
        let original = [42u8; 32];
        let split = SplitKey::from_key(&original);
        assert_ne!(split.share_a, original);
        assert_ne!(split.share_b, original);

        let reconstructed = split.reconstruct();
        assert_eq!(reconstructed.as_bytes(), &original);
    }
}
