// SPDX-License-Identifier: MIT OR Apache-2.0
// Migração V2: Atualização de Schema e Normalização de Metadados e Fingerprint
// Garante que perfis legados recebam valores padrão seguros para as novas segmentações

use std::fs;
use std::path::Path;
use tracing::info;

pub const MIGRATION_ID: &str = "0002_metadata_and_fingerprint_schema_upgrade";

/// Executa a migração V2 com backup atômico
pub fn run(metadata_file: &Path, backup_dir: Option<&Path>) -> Result<bool, String> {
    if !metadata_file.exists() {
        return Ok(false);
    }

    let content = fs::read_to_string(metadata_file)
        .map_err(|e| format!("Erro ao ler metadata.json para migração V2: {}", e))?;

    let mut json_val: serde_json::Value = match serde_json::from_str(&content) {
        Ok(v) => v,
        Err(_) => return Ok(false), // Arquivo corrompido ou inválido, ignora
    };

    let obj = match json_val.as_object_mut() {
        Some(o) => o,
        None => return Ok(false),
    };

    let mut modified = false;

    // 1. Normaliza proxy caso não tenha mode ou socks_remote_dns
    if let Some(proxy_val) = obj.get_mut("proxy").and_then(|v| v.as_object_mut()) {
        if !proxy_val.contains_key("mode") {
            proxy_val.insert("mode".to_string(), serde_json::json!("custom"));
            modified = true;
        }
        if !proxy_val.contains_key("socks_remote_dns") {
            proxy_val.insert("socks_remote_dns".to_string(), serde_json::json!(true));
            modified = true;
        }
    }

    // 2. Normaliza fingerprint_json garantindo segmentações padrão seguras
    if let Some(fp_val) = obj.get_mut("fingerprint_json").and_then(|v| v.as_object_mut()) {
        if !fp_val.contains_key("webrtc_mode") {
            fp_val.insert("webrtc_mode".to_string(), serde_json::json!("substitute"));
            modified = true;
        }
        if !fp_val.contains_key("port_scan_protection") {
            fp_val.insert("port_scan_protection".to_string(), serde_json::json!("close"));
            modified = true;
        }
        if !fp_val.contains_key("hardware_noise") {
            fp_val.insert(
                "hardware_noise".to_string(),
                serde_json::json!({
                    "canvas": true,
                    "webgl_image": true,
                    "audio_context": true,
                    "media_devices": true,
                    "client_rects": true,
                    "speech_voices": true
                }),
            );
            modified = true;
        }
        if !fp_val.contains_key("location_mode") {
            fp_val.insert("location_mode".to_string(), serde_json::json!("ip"));
            modified = true;
        }
    }

    if modified {
        info!("🔄 Executando Migração [{}]: atualizando schema de metadata em {:?}", MIGRATION_ID, metadata_file);

        // Backup de segurança do metadata original
        if let Some(b_dir) = backup_dir {
            let backup_dest = b_dir.join("metadata.json");
            let _ = fs::copy(metadata_file, &backup_dest);
        }

        // Gravação atômica via arquivo temporário
        let tmp_file = metadata_file.with_extension("tmp_mig");
        let updated_str = serde_json::to_string_pretty(&json_val)
            .map_err(|e| format!("Erro ao serializar metadata atualizado: {}", e))?;

        fs::write(&tmp_file, updated_str)
            .map_err(|e| format!("Erro ao gravar metadata temporário: {}", e))?;

        if let Err(_) = fs::rename(&tmp_file, metadata_file) {
            fs::copy(&tmp_file, metadata_file)
                .map_err(|e| format!("Falha na substituição de metadata.json: {}", e))?;
            let _ = fs::remove_file(&tmp_file);
        }

        info!("✅ Migração [{}] concluída com sucesso", MIGRATION_ID);
        return Ok(true);
    }

    Ok(false)
}
