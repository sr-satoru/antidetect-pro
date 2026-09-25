use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::{Arc, Mutex};
use tracing::info;

use crate::models::{Profile, ProfileProxyConfig};

/// Gerenciador de processos do navegador Camoufox.
///
/// TODO: No futuro, compilar e empacotar o executável do navegador junto ao app
/// (gerando binários integrados para Linux, Windows e macOS).
///
/// Atualmente no Linux, o disparo é configurado especificamente para rodar
/// pelo comando/caminho da máquina local do desenvolvedor (`/home/vanir/.local/bin/camoufox`),
/// onde o binário já possui permissões de execução (chmod +x).
pub struct ProcessManager {
    running: Arc<Mutex<HashMap<String, u32>>>,
}

impl ProcessManager {
    pub fn new() -> Self {
        Self {
            running: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Resolve o executável do Camoufox na máquina.
    ///
    /// TODO: No futuro, compilar e empacotar o executável do navegador dentro do próprio
    /// instalador/app para execução cross-platform em Windows, macOS e outras distros Linux.
    /// No momento no Linux, inicia especificamente pelo executável configurado no seu PC.
    pub fn resolve_browser_binary() -> Result<PathBuf, String> {
        // Caminho prioritário específico do PC do desenvolvedor (já com chmod configurado)
        let dev_pc_camoufox = PathBuf::from("/home/vanir/.local/bin/camoufox");
        if dev_pc_camoufox.exists() {
            return Ok(dev_pc_camoufox);
        }

        // Fallback secundário: verificar se o comando 'camoufox' está no PATH
        if let Ok(output) = Command::new("which").arg("camoufox").output() {
            if output.status.success() {
                let path_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !path_str.is_empty() {
                    return Ok(PathBuf::from(path_str));
                }
            }
        }

        Err(
            "Executável do Camoufox não foi encontrado em '/home/vanir/.local/bin/camoufox' nem no PATH do sistema."
                .to_string(),
        )
    }

    /// Prepara a pasta isolada do perfil e injeta configurações (Proxy, WebRTC, etc.) no user.js
    pub fn prepare_profile_dir(profile_dir: &Path, proxy: &ProfileProxyConfig) -> Result<(), String> {
        fs::create_dir_all(profile_dir)
            .map_err(|e| format!("Erro ao criar diretório do perfil: {e}"))?;

        // Gera o arquivo user.js dentro da pasta do perfil Firefox/Camoufox
        let mut user_js = String::new();
        user_js.push_str("// Configurações geradas automaticamente pelo Fury Browser\n");
        user_js.push_str("user_pref(\"browser.shell.checkDefaultBrowser\", false);\n");
        user_js.push_str("user_pref(\"browser.sessionstore.resume_from_crash\", false);\n");
        user_js.push_str("user_pref(\"browser.warnOnQuit\", false);\n");
        user_js.push_str("user_pref(\"browser.aboutwelcome.enabled\", false);\n");

        if proxy.proxy_type != "none" && proxy.host.is_some() && proxy.port.is_some() {
            let host = proxy.host.as_deref().unwrap();
            let port = proxy.port.unwrap();

            match proxy.proxy_type.to_lowercase().as_str() {
                "socks5" | "socks4" => {
                    let version = if proxy.proxy_type.to_lowercase() == "socks4" { 4 } else { 5 };
                    user_js.push_str("user_pref(\"network.proxy.type\", 1);\n");
                    user_js.push_str(&format!("user_pref(\"network.proxy.socks\", \"{host}\");\n"));
                    user_js.push_str(&format!("user_pref(\"network.proxy.socks_port\", {port});\n"));
                    user_js.push_str(&format!("user_pref(\"network.proxy.socks_version\", {version});\n"));
                    user_js.push_str("user_pref(\"network.proxy.socks_remote_dns\", true);\n");
                    // Hardening WebRTC contra vazamento do IP real fora do túnel proxy
                    user_js.push_str("user_pref(\"media.peerconnection.ice.proxy_only_if_behind_proxy\", true);\n");
                    user_js.push_str("user_pref(\"media.peerconnection.ice.default_address_only\", true);\n");
                }
                "http" | "https" => {
                    user_js.push_str("user_pref(\"network.proxy.type\", 1);\n");
                    user_js.push_str(&format!("user_pref(\"network.proxy.http\", \"{host}\");\n"));
                    user_js.push_str(&format!("user_pref(\"network.proxy.http_port\", {port});\n"));
                    user_js.push_str(&format!("user_pref(\"network.proxy.ssl\", \"{host}\");\n"));
                    user_js.push_str(&format!("user_pref(\"network.proxy.ssl_port\", {port});\n"));
                }
                _ => {}
            }
        } else {
            user_js.push_str("user_pref(\"network.proxy.type\", 0);\n");
        }

        let user_js_path = profile_dir.join("user.js");
        fs::write(user_js_path, user_js)
            .map_err(|e| format!("Erro ao gravar user.js do perfil: {e}"))?;

        Ok(())
    }

    /// Dispara o navegador Camoufox para o perfil especificado
    pub fn launch(&self, profile: &Profile, profile_base_dir: &Path) -> Result<u32, String> {
        let mut map = self.running.lock().unwrap();

        // Se já constar como em execução, checa se o processo ainda está vivo no SO
        if let Some(&pid) = map.get(&profile.id) {
            if Self::is_pid_alive(pid) {
                info!("Perfil {} já está em execução no PID {}", profile.id, pid);
                return Ok(pid);
            } else {
                map.remove(&profile.id);
            }
        }

        let binary_path = Self::resolve_browser_binary()?;
        let profile_dir = profile_base_dir.join(&profile.id).join("profile");
        Self::prepare_profile_dir(&profile_dir, &profile.proxy)?;

        info!(
            "🚀 Disparando Camoufox para o perfil '{}' ({}) via {:?}",
            profile.name, profile.id, binary_path
        );

        let mut cmd = Command::new(&binary_path);
        cmd.arg("--profile").arg(&profile_dir);
        cmd.arg("--new-instance");

        let child = cmd.spawn().map_err(|e| {
            format!("Falha ao executar {:?}: {}", binary_path, e)
        })?;

        let pid = child.id();
        info!("✅ Camoufox iniciado com PID {} para o perfil {}", pid, profile.id);
        map.insert(profile.id.clone(), pid);

        Ok(pid)
    }

    /// Encerra a execução do navegador para o perfil informado
    pub fn stop(&self, profile_id: &str) -> Result<(), String> {
        let mut map = self.running.lock().unwrap();
        if let Some(pid) = map.remove(profile_id) {
            if Self::is_pid_alive(pid) {
                info!("🛑 Encerrando processo PID {} para perfil {}", pid, profile_id);
                #[cfg(unix)]
                {
                    let _ = Command::new("kill").arg(pid.to_string()).status();
                }
                #[cfg(windows)]
                {
                    let _ = Command::new("taskkill")
                        .arg("/F")
                        .arg("/PID")
                        .arg(pid.to_string())
                        .status();
                }
            }
        }
        Ok(())
    }

    /// Verifica se o perfil está com processo ativo no SO
    pub fn is_running(&self, profile_id: &str) -> bool {
        let mut map = self.running.lock().unwrap();
        if let Some(&pid) = map.get(profile_id) {
            if Self::is_pid_alive(pid) {
                return true;
            } else {
                map.remove(profile_id);
            }
        }
        false
    }

    fn is_pid_alive(pid: u32) -> bool {
        #[cfg(unix)]
        {
            match Command::new("kill").arg("-0").arg(pid.to_string()).output() {
                Ok(output) => output.status.success(),
                Err(_) => false,
            }
        }
        #[cfg(windows)]
        {
            false
        }
    }
}
