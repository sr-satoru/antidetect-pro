use std::path::Path;
use std::process::Command;
use tracing::info;

/// Verifica se o processo está vivo no Windows 10 e Windows 11 (32 e 64 bits)
/// usando diretamente a API do subsistema Win32 (kernel32.dll).
pub fn is_pid_alive(pid: u32) -> bool {
    #[allow(non_snake_case)]
    unsafe {
        #[link(name = "kernel32")]
        unsafe extern "system" {
            fn OpenProcess(desired_access: u32, inherit_handle: i32, process_id: u32) -> isize;
            fn CloseHandle(handle: isize) -> i32;
            fn GetExitCodeProcess(handle: isize, exit_code: *mut u32) -> i32;
        }

        const PROCESS_QUERY_LIMITED_INFORMATION: u32 = 0x1000;
        const STILL_ACTIVE: u32 = 259;

        let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
        if handle == 0 {
            return false;
        }

        let mut exit_code: u32 = 0;
        let success = GetExitCodeProcess(handle, &mut exit_code);
        CloseHandle(handle);

        success != 0 && exit_code == STILL_ACTIVE
    }
}

/// Verifica se o perfil Firefox/Camoufox está com trava exclusiva no Windows (parent.lock).
pub fn is_profile_locked(profile_dir: &Path) -> bool {
    let lock_path = profile_dir.join("parent.lock");
    if !lock_path.exists() {
        return false;
    }

    match std::fs::OpenOptions::new().write(true).open(&lock_path) {
        Ok(_) => false,
        Err(e) => {
            if e.raw_os_error() == Some(32) || e.kind() == std::io::ErrorKind::PermissionDenied {
                true
            } else {
                false
            }
        }
    }
}

/// Encerra limpa e recursivamente toda a árvore de processos no Windows 10 e 11
pub fn terminate_process_tree(pid: u32) -> Result<(), String> {
    info!("🛑 [Windows] Encerrando árvore de processos PID {}", pid);

    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;
    let _ = Command::new("taskkill")
        .args(["/F", "/T", "/PID", &pid.to_string()])
        .creation_flags(CREATE_NO_WINDOW)
        .status();

    Ok(())
}
