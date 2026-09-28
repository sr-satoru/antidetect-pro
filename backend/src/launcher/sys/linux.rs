use std::path::Path;
use std::process::Command;

/// Verifica se o processo está em execução no Linux lendo atomicamente /proc/{pid}/status
/// Implementação original preservada com 100% de compatibilidade e zero alteração.
pub fn is_pid_alive(pid: u32) -> bool {
    if let Ok(status) = std::fs::read_to_string(format!("/proc/{}/status", pid)) {
        for line in status.lines() {
            if line.starts_with("State:") {
                let is_dead = line.contains('Z') || line.contains('X');
                return !is_dead;
            }
        }
        return true;
    }
    false
}

/// No Linux, o ciclo de vida do processo é perfeitamente monitorado pelo kernel (/proc/{pid}/status)
/// e pelo child.wait(). O Firefox no Linux não remove o arquivo .parentlock do disco (ele persiste com 0 bytes).
/// Portanto, a verificação de atividade no Linux depende unicamente do PID do processo e do child.wait().
pub fn is_profile_locked(_profile_dir: &Path) -> bool {
    false
}

/// Encerra o processo no Linux via sinal kill padrão
pub fn terminate_process_tree(pid: u32) -> Result<(), String> {
    let _ = Command::new("kill").arg(pid.to_string()).status();
    Ok(())
}

/// Configura argumentos do comando de execução do navegador para Linux
pub fn configure_browser_command(cmd: &mut tokio::process::Command, profile_dir: &Path) {
    cmd.arg("--profile").arg(profile_dir);
    cmd.arg("--new-instance");
    cmd.arg("--no-remote");
    cmd.env("MOZ_NO_REMOTE", "1");
}
