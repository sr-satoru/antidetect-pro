// SPDX-License-Identifier: MIT OR Apache-2.0
// Módulo Especializado de Notificações para o Sistema de Migrações do Star Multlogin

use std::path::Path;
use tracing::info;
use crate::ws::{WsEvent, WsState};
use super::{migrate_profile, needs_migration, MigrationReport};

/// Notificador especializado e desacoplado para eventos de migração
pub struct MigrationNotifier<'a> {
    ws: Option<&'a WsState>,
}

impl<'a> MigrationNotifier<'a> {
    /// Cria um novo notificador de migração (com ou sem canal WebSocket)
    pub fn new(ws: Option<&'a WsState>) -> Self {
        Self { ws }
    }

    /// Emite notificação de início de migração para um perfil
    pub fn notify_start(&self, profile_id: &str, message: &str) {
        info!("📢 [MigrationNotifier] Início: Perfil '{}' - {}", profile_id, message);
        if let Some(ws) = self.ws {
            ws.emit(WsEvent::ProfileMigrating {
                profile_id: profile_id.to_string(),
                message: message.to_string(),
            });
        }
    }

    /// Emite notificação de conclusão de migração com status e relatório
    pub fn notify_completion(
        &self,
        profile_id: &str,
        success: bool,
        message: &str,
        applied: Vec<String>,
    ) {
        info!(
            "📢 [MigrationNotifier] Conclusão: Perfil '{}' (sucesso: {}) - {}",
            profile_id, success, message
        );
        if let Some(ws) = self.ws {
            ws.emit(WsEvent::ProfileMigrated {
                profile_id: profile_id.to_string(),
                success,
                message: message.to_string(),
                applied,
            });
        }
    }

    /// Executa a migração de um perfil notificando o frontend apenas quando houver migrações reais a aplicar
    pub fn migrate_profile_with_notification(
        &self,
        profile_dir: &Path,
        metadata_file: Option<&Path>,
    ) -> Result<MigrationReport, String> {
        let profile_id = profile_dir
            .parent()
            .and_then(|p| p.file_name())
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();

        let needs = needs_migration(profile_dir, metadata_file);
        if needs {
            self.notify_start(
                &profile_id,
                "Atualizando perfil para a nova versão segura com backup de integridade...",
            );
        }

        match migrate_profile(profile_dir, metadata_file) {
            Ok(report) => {
                if needs || !report.applied_migrations.is_empty() {
                    let msg = format!(
                        "Migração concluída com sucesso. {} atualizações aplicadas.",
                        report.applied_migrations.len()
                    );
                    self.notify_completion(&profile_id, true, &msg, report.applied_migrations.clone());
                }
                Ok(report)
            }
            Err(err) => {
                if needs {
                    self.notify_completion(
                        &profile_id,
                        false,
                        &format!("Falha na migração do perfil: {}", err),
                        vec![],
                    );
                }
                Err(err)
            }
        }
    }

    /// Executa a migração em lote de todos os perfis com notificações individuais
    pub fn migrate_all_with_notifications(
        &self,
        data_dir: &Path,
    ) -> Vec<MigrationReport> {
        let profiles_root = if data_dir.ends_with("profiles") {
            data_dir.to_path_buf()
        } else {
            data_dir.join("profiles")
        };

        let mut reports = Vec::new();

        if let Ok(entries) = std::fs::read_dir(&profiles_root) {
            for entry in entries.flatten() {
                if let Ok(ft) = entry.file_type() {
                    if ft.is_dir() {
                        let profile_dir = entry.path().join("profile");
                        let meta_file = entry.path().join("metadata.json");

                        if profile_dir.exists() {
                            if let Ok(rep) = self.migrate_profile_with_notification(&profile_dir, Some(&meta_file)) {
                                if !rep.applied_migrations.is_empty() {
                                    reports.push(rep);
                                }
                            }
                        }
                    }
                }
            }
        }

        reports
    }
}
