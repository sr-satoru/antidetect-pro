// SPDX-License-Identifier: MIT OR Apache-2.0
// Sistema Central de Migrações Seguras para Perfis do Fury Browser

pub mod backup;
pub mod notifier;
pub mod v1_purge_auth_extension;
pub mod v2_metadata_upgrade;

pub use notifier::MigrationNotifier;

use std::fs;
use std::path::{Path, PathBuf};
use tracing::{info, warn};

#[derive(Debug, Clone)]
pub struct MigrationReport {
    pub profile_id: String,
    pub applied_migrations: Vec<String>,
    pub backup_path: Option<PathBuf>,
}

/// Verifica se um perfil necessita de migração de versões anteriores
pub fn needs_migration(profile_dir: &Path, metadata_file: Option<&Path>) -> bool {
    let needs_v1 = profile_dir
        .join("extensions")
        .join("fury-proxy-auth@antidetect.fury")
        .exists();

    let meta_path_buf = metadata_file.map(PathBuf::from).or_else(|| {
        profile_dir.parent().map(|p| p.join("metadata.json"))
    });

    let needs_v2 = if let Some(ref m_path) = meta_path_buf {
        if let Ok(content) = fs::read_to_string(m_path) {
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&content) {
                let proxy_needs = v.get("proxy").and_then(|p| p.as_object()).map_or(false, |p| !p.contains_key("mode"));
                let fp_needs = v.get("fingerprint_json").and_then(|f| f.as_object()).map_or(false, |f| !f.contains_key("webrtc_mode") || !f.contains_key("hardware_noise"));
                proxy_needs || fp_needs
            } else {
                false
            }
        } else {
            false
        }
    } else {
        false
    };

    needs_v1 || needs_v2
}

/// Executa todas as migrações aplicáveis a um perfil específico de forma segura com backup prévio
pub fn migrate_profile(profile_dir: &Path, metadata_file: Option<&Path>) -> Result<MigrationReport, String> {
    let profile_id = profile_dir
        .parent()
        .and_then(|p| p.file_name())
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    let mut applied = Vec::new();
    let mut backup_dir: Option<PathBuf> = None;

    let meta_path_buf = metadata_file.map(PathBuf::from).or_else(|| {
        profile_dir.parent().map(|p| p.join("metadata.json"))
    });

    if needs_migration(profile_dir, metadata_file) {
        info!("🛡️ Iniciando migração com backup de segurança para o perfil '{}'...", profile_id);
        let b = backup::create_migration_backup(profile_dir, "auto_migration")?;
        backup_dir = Some(b);
    }

    // 1. Executa Migração V1 (Expurgar senhas em texto claro de extensões legadas)
    if v1_purge_auth_extension::run(profile_dir, backup_dir.as_deref())? {
        applied.push(v1_purge_auth_extension::MIGRATION_ID.to_string());
    }

    // 2. Executa Migração V2 (Atualizar schema do metadata.json)
    if let Some(ref m_path) = meta_path_buf {
        if v2_metadata_upgrade::run(m_path, backup_dir.as_deref())? {
            applied.push(v2_metadata_upgrade::MIGRATION_ID.to_string());
        }
    }

    // Limpa backups muito antigos mantendo até 3
    if let Some(parent) = profile_dir.parent() {
        backup::prune_old_backups(parent, 3);
    }

    if !applied.is_empty() {
        info!("🎉 Migrações concluídas para o perfil '{}': {:?}", profile_id, applied);
    }

    Ok(MigrationReport {
        profile_id,
        applied_migrations: applied,
        backup_path: backup_dir,
    })
}

/// Varre e migra todos os perfis existentes na pasta de perfis do aplicativo
pub fn migrate_all_profiles(data_dir: &Path) -> Vec<MigrationReport> {
    let profiles_root = if data_dir.ends_with("profiles") {
        data_dir.to_path_buf()
    } else {
        data_dir.join("profiles")
    };

    let mut reports = Vec::new();

    if let Ok(entries) = fs::read_dir(&profiles_root) {
        for entry in entries.flatten() {
            if let Ok(ft) = entry.file_type() {
                if ft.is_dir() {
                    let profile_dir = entry.path().join("profile");
                    let meta_file = entry.path().join("metadata.json");

                    if profile_dir.exists() {
                        match migrate_profile(&profile_dir, Some(&meta_file)) {
                            Ok(rep) => {
                                if !rep.applied_migrations.is_empty() {
                                    reports.push(rep);
                                }
                            }
                            Err(e) => {
                                warn!("Falha ao migrar perfil em {:?}: {}", entry.path(), e);
                            }
                        }
                    }
                }
            }
        }
    }

    reports
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_migration_v1_and_v2_with_backup() {
        let temp_dir = std::env::temp_dir().join(format!("fury_mig_test_{}", uuid::Uuid::new_v4()));
        let profile_root = temp_dir.join("test-profile-123");
        let profile_dir = profile_root.join("profile");
        let meta_file = profile_root.join("metadata.json");

        fs::create_dir_all(&profile_dir).unwrap();

        // 1. Simula estado antigo com extensão de senha em texto claro
        let legacy_ext = profile_dir.join("extensions").join("fury-proxy-auth@antidetect.fury");
        fs::create_dir_all(&legacy_ext).unwrap();
        fs::write(legacy_ext.join("manifest.json"), "{\"name\":\"fury-proxy-auth\"}").unwrap();
        fs::write(legacy_ext.join("background.js"), "const pass = 'secret123';").unwrap();

        // 2. Simula metadata.json antigo sem novos campos
        let legacy_meta = r#"{
            "id": "test-profile-123",
            "name": "Legacy Profile",
            "proxy": {
                "type": "http",
                "host": "1.2.3.4",
                "port": 8080
            },
            "fingerprint_json": {
                "os": "windows"
            }
        }"#;
        fs::write(&meta_file, legacy_meta).unwrap();

        // Executa a migração
        let report = migrate_profile(&profile_dir, Some(&meta_file)).expect("Migração bem sucedida");

        // Valida que as duas migrações rodaram
        assert_eq!(report.applied_migrations.len(), 2);
        assert!(report.applied_migrations.contains(&v1_purge_auth_extension::MIGRATION_ID.to_string()));
        assert!(report.applied_migrations.contains(&v2_metadata_upgrade::MIGRATION_ID.to_string()));

        // Valida que o backup foi criado
        assert!(report.backup_path.is_some());
        let b_path = report.backup_path.unwrap();
        assert!(b_path.exists());
        assert!(b_path.join("metadata.json").exists());
        assert!(b_path.join("extensions").join("fury-proxy-auth@antidetect.fury").join("manifest.json").exists());

        // Valida que a extensão antiga foi purgada do perfil ativo
        assert!(!legacy_ext.exists());

        // Valida que o metadata.json foi atualizado com novos campos
        let updated_meta = fs::read_to_string(&meta_file).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&updated_meta).unwrap();
        assert_eq!(parsed["proxy"]["mode"], "custom");
        assert_eq!(parsed["fingerprint_json"]["webrtc_mode"], "substitute");
        assert_eq!(parsed["fingerprint_json"]["port_scan_protection"], "close");

        // Limpeza
        let _ = fs::remove_dir_all(&temp_dir);
    }
}
