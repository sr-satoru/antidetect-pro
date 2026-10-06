use std::path::Path;

/// Configura argumentos de linha de comando compatíveis com o Gecko/Camoufox no Windows
pub fn configure_browser_command(cmd: &mut tokio::process::Command, profile_dir: &Path) {
    cmd.arg("-profile").arg(profile_dir);
    cmd.arg("-new-instance");
    cmd.arg("-no-remote");
    cmd.env("MOZ_NO_REMOTE", "1");
}
