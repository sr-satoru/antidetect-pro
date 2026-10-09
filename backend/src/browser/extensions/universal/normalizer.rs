use std::fs;
use std::io::Write;
use std::path::Path;
use serde_json::Value;
use tracing::{debug, info};

#[derive(Debug, Clone)]
pub struct NormalizedExtensionInfo {
    pub name: String,
    pub version: String,
    pub description: String,
    pub gecko_id: String,
    pub icon_rel_path: Option<String>,
}

/// Normaliza uma extensão descompactada e gera o pacote .xpi correspondente.
/// Garante que `manifest.json` possua `browser_specific_settings.gecko.id` para que
/// funcione perfeitamente no Firefox, além de manter compatibilidade nativa com Chromium.
pub fn normalize_and_package_extension<P: AsRef<Path>>(
    unpacked_dir: P,
    output_xpi: P,
    slug_hint: &str,
) -> Result<NormalizedExtensionInfo, String> {
    let unpacked_dir = unpacked_dir.as_ref();
    let output_xpi = output_xpi.as_ref();

    let manifest_path = unpacked_dir.join("manifest.json");
    if !manifest_path.is_file() {
        return Err(format!("manifest.json não encontrado em {unpacked_dir:?}"));
    }

    let manifest_content = fs::read_to_string(&manifest_path)
        .map_err(|e| format!("Falha ao ler manifest.json: {e}"))?;

    let mut manifest: Value = serde_json::from_str(&manifest_content)
        .map_err(|e| format!("manifest.json inválido: {e}"))?;

    // 1. Extração do Nome da Extensão
    let raw_name = manifest.get("name")
        .and_then(|v| v.as_str())
        .unwrap_or(slug_hint)
        .trim();

    // Se o nome for uma chave de localização (__MSG_appName__), tenta ler dos locales
    let name = if raw_name.starts_with("__MSG_") && raw_name.ends_with("__") {
        let msg_key = &raw_name[6..raw_name.len() - 2];
        resolve_locale_string(unpacked_dir, msg_key).unwrap_or_else(|| slug_hint.to_string())
    } else {
        raw_name.to_string()
    };

    // 2. Extração da Versão
    let version = manifest.get("version")
        .and_then(|v| v.as_str())
        .unwrap_or("1.0.0")
        .to_string();

    // 3. Extração da Descrição
    let raw_desc = manifest.get("description")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim();

    let description = if raw_desc.starts_with("__MSG_") && raw_desc.ends_with("__") {
        let msg_key = &raw_desc[6..raw_desc.len() - 2];
        resolve_locale_string(unpacked_dir, msg_key).unwrap_or_else(|| "Extensão adicionada à equipe.".to_string())
    } else if !raw_desc.is_empty() {
        raw_desc.to_string()
    } else {
        "Extensão adicionada à equipe do Star Multlogin.".to_string()
    };

    // 4. Verificação / Injeção de Gecko Add-on ID (Requisito indispensável do Firefox)
    let existing_gecko_id = manifest
        .pointer("/browser_specific_settings/gecko/id")
        .or_else(|| manifest.pointer("/applications/gecko/id"))
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    let gecko_id = match existing_gecko_id {
        Some(id) => {
            debug!("Extensão já possui Gecko ID: {id}");
            id
        }
        None => {
            let sanitized_slug = sanitize_slug(if slug_hint.is_empty() { &name } else { slug_hint });
            let generated_id = format!("{sanitized_slug}@star-multilogin.local");
            info!("Injetando Gecko ID sintético no manifest: {generated_id}");

            // Garante o objeto browser_specific_settings.gecko
            if manifest.get("browser_specific_settings").is_none() {
                manifest["browser_specific_settings"] = serde_json::json!({});
            }
            if manifest["browser_specific_settings"].get("gecko").is_none() {
                manifest["browser_specific_settings"]["gecko"] = serde_json::json!({});
            }
            manifest["browser_specific_settings"]["gecko"]["id"] = Value::String(generated_id.clone());

            // Grava o manifest.json atualizado
            let pretty_manifest = serde_json::to_string_pretty(&manifest)
                .map_err(|e| format!("Erro ao serializar manifest.json atualizado: {e}"))?;
            fs::write(&manifest_path, pretty_manifest)
                .map_err(|e| format!("Erro ao salvar manifest.json atualizado: {e}"))?;

            generated_id
        }
    };

    // 5. Extração do Ícone Principal
    let icon_rel_path = extract_best_icon_path(&manifest, unpacked_dir);

    // 6. Empacotamento para package.xpi (Formato ZIP padrão lido pelo Firefox)
    create_xpi_archive(unpacked_dir, output_xpi)?;

    Ok(NormalizedExtensionInfo {
        name,
        version,
        description,
        gecko_id,
        icon_rel_path,
    })
}

/// Cria o pacote .xpi (arquivo ZIP padrão) a partir de uma pasta descompactada
fn create_xpi_archive(source_dir: &Path, output_file: &Path) -> Result<(), String> {
    if let Some(parent) = output_file.parent() {
        let _ = fs::create_dir_all(parent);
    }

    let file = fs::File::create(output_file)
        .map_err(|e| format!("Erro ao criar arquivo de saída {output_file:?}: {e}"))?;

    let mut zip_writer = zip::ZipWriter::new(file);
    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    let mut buffer = Vec::new();
    add_dir_to_zip(&mut zip_writer, source_dir, source_dir, &mut buffer, options)?;

    zip_writer.finish()
        .map_err(|e| format!("Erro ao finalizar arquivo ZIP {output_file:?}: {e}"))?;

    debug!("✅ Pacote .xpi gerado com sucesso em {output_file:?}");
    Ok(())
}

/// Caminha recursivamente por uma pasta adicionando arquivos ao ZIP
fn add_dir_to_zip<W: Write + std::io::Seek>(
    zip: &mut zip::ZipWriter<W>,
    base_dir: &Path,
    current_dir: &Path,
    buffer: &mut Vec<u8>,
    options: zip::write::SimpleFileOptions,
) -> Result<(), String> {
    let entries = fs::read_dir(current_dir)
        .map_err(|e| format!("Erro ao ler diretório {current_dir:?}: {e}"))?;

    for entry in entries.flatten() {
        let path = entry.path();
        let rel_path = path.strip_prefix(base_dir)
            .map_err(|e| format!("Erro de prefixo de caminho: {e}"))?
            .to_string_lossy()
            .replace('\\', "/");

        if path.is_dir() {
            zip.add_directory(&rel_path, options)
                .map_err(|e| format!("Erro ao adicionar diretório {rel_path} ao ZIP: {e}"))?;
            add_dir_to_zip(zip, base_dir, &path, buffer, options)?;
        } else if path.is_file() {
            zip.start_file(&rel_path, options)
                .map_err(|e| format!("Erro ao iniciar arquivo {rel_path} no ZIP: {e}"))?;
            let mut f = fs::File::open(&path)
                .map_err(|e| format!("Erro ao abrir arquivo {path:?}: {e}"))?;
            std::io::copy(&mut f, zip)
                .map_err(|e| format!("Erro ao escrever arquivo {rel_path} no ZIP: {e}"))?;
        }
    }

    Ok(())
}

/// Extrai o caminho relativo do melhor ícone disponível no manifest (128 > 64 > 48 > 32 > 16)
fn extract_best_icon_path(manifest: &Value, base_dir: &Path) -> Option<String> {
    let icons_obj = manifest.get("icons")
        .or_else(|| manifest.pointer("/action/default_icon"))
        .or_else(|| manifest.pointer("/browser_action/default_icon"))?;

    let candidate_keys = ["128", "96", "64", "48", "32", "16"];

    if let Some(map) = icons_obj.as_object() {
        for key in candidate_keys {
            if let Some(icon_rel) = map.get(key).and_then(|v| v.as_str()) {
                let clean_rel = icon_rel.trim_start_matches('/');
                if base_dir.join(clean_rel).is_file() {
                    return Some(clean_rel.to_string());
                }
            }
        }
        // Se nenhuma chave padrão combinou, pega o primeiro ícone do mapa
        if let Some(first_icon) = map.values().find_map(|v| v.as_str()) {
            let clean_rel = first_icon.trim_start_matches('/');
            if base_dir.join(clean_rel).is_file() {
                return Some(clean_rel.to_string());
            }
        }
    } else if let Some(single_path) = icons_obj.as_str() {
        let clean_rel = single_path.trim_start_matches('/');
        if base_dir.join(clean_rel).is_file() {
            return Some(clean_rel.to_string());
        }
    }

    None
}

/// Tenta resolver uma string de localização em `_locales/pt_BR/messages.json` ou `_locales/en/messages.json`
fn resolve_locale_string(base_dir: &Path, key: &str) -> Option<String> {
    let locales = ["pt_BR", "pt", "en_US", "en"];
    for locale in locales {
        let msg_file = base_dir.join("_locales").join(locale).join("messages.json");
        if msg_file.is_file() {
            if let Ok(content) = fs::read_to_string(msg_file) {
                if let Ok(val) = serde_json::from_str::<Value>(&content) {
                    if let Some(str_val) = val.pointer(&format!("/{key}/message")).and_then(|v| v.as_str()) {
                        return Some(str_val.to_string());
                    }
                }
            }
        }
    }
    None
}

/// Sanitiza strings para formação de slug e identificador seguro
fn sanitize_slug(input: &str) -> String {
    let clean: String = input
        .to_lowercase()
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { '-' })
        .collect();

    let trimmed = clean.trim_matches('-');
    if trimmed.is_empty() {
        "ext-extension".to_string()
    } else {
        trimmed.to_string()
    }
}
