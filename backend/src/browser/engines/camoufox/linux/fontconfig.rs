use std::fs;
use std::path::{Path, PathBuf};
use sha2::{Digest, Sha256};
use tracing::{debug, warn};

/// Resolve ou gera dinamicamente o arquivo FONTCONFIG_FILE para execução do Camoufox no Linux.
///
/// O Camoufox empacota subconjuntos de fontes por sistema operacional. No Linux,
/// o motor gráfico depende exclusivamente do Fontconfig. Para evitar vazamento de fontes
/// de outros sistemas no fallback de glifos, o Fontconfig deve apontar exatamente para
/// as pastas de fontes permitidas pelo SO emulado.
pub fn setup_linux_fontconfig(engine_dir: &Path, target_os: &str) -> Option<PathBuf> {
    let os_dir = match target_os.to_lowercase().as_str() {
        "windows" | "win" => "windows",
        "macos" | "mac" | "darwin" => "macos",
        _ => "linux",
    };

    let os_key = match os_dir {
        "windows" => "win",
        "macos" => "mac",
        _ => "lin",
    };

    // 1. Localiza a pasta de fontconfig dentro do pacote do motor
    let fc_base = if engine_dir.join("fontconfig").join(os_dir).join("fonts.conf").exists() {
        engine_dir.join("fontconfig").join(os_dir)
    } else if engine_dir.join("fontconfigs").join(os_dir).join("fonts.conf").exists() {
        engine_dir.join("fontconfigs").join(os_dir)
    } else {
        // Fallback para caminhos genéricos
        let generic_fc = engine_dir.join("fontconfig");
        if generic_fc.exists() {
            return Some(generic_fc);
        }
        return None;
    };

    let fonts_conf_src = fc_base.join("fonts.conf");
    let fonts_dir = engine_dir.join("fonts");

    // 2. Determina quais pastas de fontes escanear (lendo groups.json se existir)
    let mut scan_dirs: Vec<PathBuf> = Vec::new();
    let groups_path = fonts_dir.join("groups.json");

    if groups_path.exists() {
        if let Ok(content) = fs::read_to_string(&groups_path) {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(read_by) = json.get("readBy").and_then(|r| r.get(os_key)).and_then(|a| a.as_array()) {
                    for group_val in read_by {
                        if let Some(group_name) = group_val.as_str() {
                            let g_path = fonts_dir.join(group_name);
                            if g_path.is_dir() {
                                scan_dirs.push(g_path);
                            }
                        }
                    }
                }
            }
        }
    }

    if scan_dirs.is_empty() {
        let os_fonts_sub = fonts_dir.join(os_dir);
        if os_fonts_sub.is_dir() {
            scan_dirs.push(os_fonts_sub);
        } else if fonts_dir.is_dir() {
            scan_dirs.push(fonts_dir);
        }
    }

    // 3. Lê o template do fonts.conf e substitui o caminho relativo por caminhos absolutos
    let conf_content = match fs::read_to_string(&fonts_conf_src) {
        Ok(c) => c,
        Err(e) => {
            warn!("Não foi possível ler fonts.conf de {:?}: {}", fonts_conf_src, e);
            return Some(fc_base);
        }
    };

    let dir_tags = scan_dirs
        .iter()
        .map(|d| format!("<dir>{}</dir>", d.to_string_lossy()))
        .collect::<Vec<_>>()
        .join("\n\t");

    let final_conf = conf_content.replace("<dir prefix=\"cwd\">fonts</dir>", &dir_tags);

    // 4. Salva em cache temporário no sistema (/tmp/star_multlogin_fontconfig/...)
    let mut hasher = Sha256::new();
    hasher.update(final_conf.as_bytes());
    let hash = format!("{:x}", hasher.finalize());
    let short_hash = &hash[..12];

    let cache_dir = std::env::temp_dir().join("star_multlogin_fontconfig");
    let _ = fs::create_dir_all(&cache_dir);

    let output_conf_path = cache_dir.join(format!("fonts-{os_dir}-{short_hash}.conf"));
    if !output_conf_path.exists() {
        if let Err(e) = fs::write(&output_conf_path, &final_conf) {
            warn!("Erro ao salvar runtime fontconfig em {:?}: {}", output_conf_path, e);
            return Some(fonts_conf_src);
        }
    }

    debug!("🎯 Linux FONTCONFIG_FILE resolvido: {:?}", output_conf_path);
    Some(output_conf_path)
}
