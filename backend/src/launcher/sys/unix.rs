use std::path::Path;
use std::process::Command;

/// Fallback para sistemas Unix genéricos (ex: macOS)
pub fn is_pid_alive(pid: u32) -> bool {
    match Command::new("kill").arg("-0").arg(pid.to_string()).output() {
        Ok(output) => output.status.success(),
        Err(_) => false,
    }
}

pub fn is_profile_locked(_profile_dir: &Path) -> bool {
    false
}

pub fn terminate_process_tree(pid: u32) -> Result<(), String> {
    let _ = Command::new("kill").arg(pid.to_string()).status();
    Ok(())
}

pub fn configure_browser_command(cmd: &mut tokio::process::Command, profile_dir: &Path) {
    cmd.arg("--profile").arg(profile_dir);
    cmd.arg("--new-instance");
    cmd.arg("--no-remote");
    cmd.env("MOZ_NO_REMOTE", "1");
}
