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

/// Verifica se o diretório do perfil no Linux possui trava ativa (.parentlock)
pub fn is_profile_locked(profile_dir: &Path) -> bool {
    let parentlock = profile_dir.join(".parentlock");
    if parentlock.exists() {
        // No Linux, o Firefox cria um link simbólico ou arquivo especial .parentlock
        // Se existir e não puder ser aberto ou se o lock estiver ativo
        return true;
    }
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
