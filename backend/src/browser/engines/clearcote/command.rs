use std::path::Path;
use tracing::info;
use crate::models::Profile;
use super::flags::build_clearcote_flags;

/// Constrói o processo tokio::process::Command para o Clearcote Chromium
pub fn build_clearcote_command(
    binary_path: &Path,
    profile_dir: &Path,
    profile: &Profile,
    debug_port: Option<u16>,
    proxy_url: Option<&str>,
    addon_paths: &[String],
    initial_url: Option<&str>,
) -> Result<tokio::process::Command, String> {
    let mut cmd = tokio::process::Command::new(binary_path);

    // Diretório de trabalho apontando para a pasta onde residem as libs do engine
    if let Some(parent_dir) = binary_path.parent() {
        cmd.current_dir(parent_dir);

        #[cfg(target_os = "linux")]
        {
            let current_ld = std::env::var("LD_LIBRARY_PATH").unwrap_or_default();
            let new_ld = if current_ld.is_empty() {
                parent_dir.to_string_lossy().to_string()
            } else {
                format!("{}:{}", parent_dir.to_string_lossy(), current_ld)
            };
            cmd.env("LD_LIBRARY_PATH", new_ld);

            // Font wiring nativo do Clearcote: isola fontes do Linux com clones métricos do Windows
            let fonts_dir = parent_dir.join("fonts");
            let template = fonts_dir.join("fonts.conf.template");
            if template.is_file() {
                let cache_dir = std::env::temp_dir().join("cc-fc-cache");
                let _ = std::fs::create_dir_all(&cache_dir);
                if let Ok(raw_template) = std::fs::read_to_string(&template) {
                    let conf = raw_template
                        .replace("@FONTS_DIR@", &fonts_dir.to_string_lossy())
                        .replace("@CACHE_DIR@", &cache_dir.to_string_lossy());
                    let conf_path = fonts_dir.join("fonts.generated.conf");
                    if std::fs::write(&conf_path, conf).is_ok() {
                        cmd.env("FONTCONFIG_FILE", conf_path);
                    }
                }
            }

            // Define LANGUAGE para GLib/Chromium coincidir com a UI do perfil
            let fp_map = crate::fingerprint::translator::extract_fingerprint_map(&profile.fingerprint_json);
            let lang = fp_map.get("locale")
                .and_then(|l| l.get("primary_language"))
                .and_then(|v| v.as_str())
                .unwrap_or("pt_BR")
                .replace("-", "_");
            cmd.env("LANGUAGE", lang);
        }
    }

    let flags = build_clearcote_flags(
        profile_dir,
        profile,
        debug_port,
        proxy_url,
        addon_paths,
        initial_url,
    );

    info!(
        "🚀 [Clearcote] Disparando Chromium com {} flags para o perfil '{}' ({})",
        flags.len(),
        profile.name,
        profile.id
    );

    for flag in &flags {
        cmd.arg(flag);
    }

    Ok(cmd)
}
