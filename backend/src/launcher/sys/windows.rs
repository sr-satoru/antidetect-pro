use std::path::Path;
use std::process::Command;
use tracing::info;

/// Verifica se o processo está vivo no Windows 10 e Windows 11 (32 e 64 bits)
/// usando diretamente a API do subsistema Win32 (kernel32.dll).
/// Totalmente independente de tasklist.exe, PATH ou idioma do sistema operacional.
pub fn is_pid_alive(pid: u32) -> bool {
    #[allow(non_snake_case)]
    unsafe {
        #[link(name = "kernel32")]
        unsafe extern "system" {
            fn OpenProcess(desired_access: u32, inherit_handle: i32, process_id: u32) -> isize;
            fn CloseHandle(handle: isize) -> i32;
            fn GetExitCodeProcess(handle: isize, exit_code: *mut u32) -> i32;
        }

        // PROCESS_QUERY_LIMITED_INFORMATION (0x1000) é suportado no Windows 10 e 11
        // tanto em 32-bit (x86/i686) quanto 64-bit (x86_64) sem exigir privilégios de Admin
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
/// No Windows 10 e 11, enquanto qualquer janela do navegador estiver aberta:
/// O arquivo parent.lock é mantido com bloqueio exclusivo (ERROR_SHARING_VIOLATION / código 32).
/// Isso elimina falsos encerramentos caso o processo pai do Camoufox desanexe processos de abas.
pub fn is_profile_locked(profile_dir: &Path) -> bool {
    let lock_path = profile_dir.join("parent.lock");
    if !lock_path.exists() {
        return false;
    }

    // Tenta abrir o arquivo parent.lock para escrita
    match std::fs::OpenOptions::new().write(true).open(&lock_path) {
        Ok(_) => {
            // Conseguimos abrir para gravação: o arquivo existe, mas o navegador NÃO está com ele trancado
            false
        }
        Err(e) => {
            // Código 32 no Windows = ERROR_SHARING_VIOLATION ("O arquivo já está sendo usado por outro processo")
            // Ou PermissionDenied: o navegador está usando o arquivo exclusivamente
            if e.raw_os_error() == Some(32) || e.kind() == std::io::ErrorKind::PermissionDenied {
                true
            } else {
                false
            }
        }
    }
}

/// Encerra limpa e recursivamente toda a árvore de processos no Windows 10 e 11
/// (incluindo processos filhos de abas, renderizadores de conteúdo e GPU do Firefox).
pub fn terminate_process_tree(pid: u32) -> Result<(), String> {
    info!("🛑 [Windows] Encerrando árvore de processos PID {}", pid);

    // /F = Forçar encerramento
    // /T = Encerra toda a árvore de processos (Process Tree / filhos)
    let _ = Command::new("taskkill")
        .args(["/F", "/T", "/PID", &pid.to_string()])
        .status();

    Ok(())
}

/// Configura argumentos de linha de comando compatíveis com o Gecko/Camoufox no Windows
pub fn configure_browser_command(cmd: &mut tokio::process::Command, profile_dir: &Path) {
    // No Windows, a sintaxe padrão do Mozilla Firefox usa hífen simples para -profile e -no-remote
    cmd.arg("-profile").arg(profile_dir);
    cmd.arg("-new-instance");
    cmd.arg("-no-remote");
    cmd.env("MOZ_NO_REMOTE", "1");
}
