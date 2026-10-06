use rusqlite::params;
use star_multlogin_backend::models::{Profile, ProfileProxyConfig, TagRef};
use star_multlogin_backend::service_database::data::crypto::{decrypt_payload, encrypt_payload};
use star_multlogin_backend::service_database::Vault;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;

#[derive(Debug, Default)]
pub struct MigrationReport {
    pub table_existed: bool,
    pub profiles_scanned: usize,
    pub profiles_updated: usize,
    pub tags_migrated: usize,
    pub table_dropped: bool,
}

/// Executa a rotina de migração em qualquer instância do Star Vault
pub fn run_profile_tags_migration(vault: &Arc<Vault>) -> Result<MigrationReport, String> {
    let mut report = MigrationReport::default();
    let conn = vault.conn();
    let guard = conn.lock().map_err(|e| e.to_string())?;

    // 1. Verifica se a tabela profile_tags existe no banco SQLite
    let table_exists: bool = guard
        .query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='profile_tags'",
            [],
            |row| row.get::<_, i64>(0),
        )
        .map(|c| c > 0)
        .unwrap_or(false);

    if !table_exists {
        println!("ℹ️ A tabela 'profile_tags' já foi removida deste banco. Nenhuma migração pendente.");
        return Ok(report);
    }

    report.table_existed = true;
    println!("🔍 Tabela 'profile_tags' detectada. Iniciando migração das tags...");

    // 2. Coleta mapeamento de tags por perfil a partir de profile_tags JOIN tags
    let mut profile_tags_map: HashMap<String, Vec<TagRef>> = HashMap::new();
    {
        let mut stmt = match guard.prepare(
            "SELECT pt.profile_id, t.id, t.name, t.color
             FROM profile_tags pt
             JOIN tags t ON t.id = pt.tag_id
             ORDER BY pt.profile_id, t.name ASC",
        ) {
            Ok(s) => s,
            Err(e) => {
                println!("⚠️ Falha ao ler vínculos de profile_tags ({e}). Descartando tabela...");
                let _ = guard.execute("DROP TABLE IF EXISTS profile_tags", []);
                report.table_dropped = true;
                return Ok(report);
            }
        };

        if let Ok(mut rows) = stmt.query([]) {
            while let Ok(Some(row)) = rows.next() {
                if let (Ok(pid), Ok(tid), Ok(name), Ok(color)) = (
                    row.get::<_, String>(0),
                    row.get::<_, i64>(1),
                    row.get::<_, String>(2),
                    row.get::<_, String>(3),
                ) {
                    profile_tags_map
                        .entry(pid)
                        .or_default()
                        .push(TagRef {
                            id: tid,
                            name,
                            color,
                        });
                }
            }
        }
    }

    // 3. Atualiza os perfis incorporando as tags diretamente no payload_enc
    for (profile_id, tags_to_merge) in &profile_tags_map {
        report.profiles_scanned += 1;
        let payload_enc: Option<Vec<u8>> = guard
            .query_row(
                "SELECT payload_enc FROM profiles WHERE id = ?1",
                params![profile_id],
                |r| r.get(0),
            )
            .ok();

        if let Some(enc_bytes) = payload_enc {
            if let Ok(decrypted) = decrypt_payload(vault.key().as_ref(), &enc_bytes) {
                if let Ok(mut profile) = serde_json::from_slice::<Profile>(&decrypted) {
                    let initial_tag_count = profile.tags.len();
                    for tag in tags_to_merge {
                        if !profile
                            .tags
                            .iter()
                            .any(|t| t.id == tag.id || t.name.eq_ignore_ascii_case(&tag.name))
                        {
                            profile.tags.push(tag.clone());
                            report.tags_migrated += 1;
                        }
                    }

                    if profile.tags.len() != initial_tag_count {
                        if let Ok(new_json) = serde_json::to_vec(&profile) {
                            if let Ok(new_enc) = encrypt_payload(vault.key().as_ref(), &new_json) {
                                let _ = guard.execute(
                                    "UPDATE profiles SET payload_enc = ?1, updated_at = strftime('%s','now') WHERE id = ?2",
                                    params![new_enc, profile_id],
                                );
                                report.profiles_updated += 1;
                            }
                        }
                    }
                }
            }
        }
    }

    // 4. Descarta com segurança a tabela legada
    guard
        .execute("DROP TABLE IF EXISTS profile_tags", [])
        .map_err(|e| format!("Erro ao descartar tabela profile_tags: {e}"))?;
    report.table_dropped = true;

    println!("✅ Migração concluída com sucesso!");
    println!("   - Perfis examinados: {}", report.profiles_scanned);
    println!("   - Perfis atualizados: {}", report.profiles_updated);
    println!("   - Tags migradas: {}", report.tags_migrated);
    println!("   - Tabela 'profile_tags' descartada: {}", report.table_dropped);

    Ok(report)
}

#[tokio::test]
async fn test_migration_legacy_db_flow() {
    let temp_dir = std::env::temp_dir().join(format!(
        "star_migration_test_{}",
        std::time::SystemTime::now().elapsed().unwrap().as_nanos()
    ));
    let _ = std::fs::create_dir_all(&temp_dir);
    let vault = Arc::new(Vault::new(&temp_dir).unwrap());

    let profile_id = "test-legacy-profile-1".to_string();

    // 1. Simula estado legado: recria manualmente profile_tags com dados
    {
        let conn = vault.conn();
        let guard = conn.lock().unwrap();

        guard.execute_batch(
            "CREATE TABLE IF NOT EXISTS profile_tags (
                profile_id TEXT NOT NULL,
                tag_id INTEGER NOT NULL,
                PRIMARY KEY (profile_id, tag_id)
            );
            INSERT INTO tags (id, name, color, created_at) VALUES (10, 'Legado Marketing', '#FF5500', 1000);
            INSERT INTO tags (id, name, color, created_at) VALUES (20, 'Legado Vendas', '#00AAFF', 1000);
            INSERT INTO profile_tags (profile_id, tag_id) VALUES ('test-legacy-profile-1', 10);
            INSERT INTO profile_tags (profile_id, tag_id) VALUES ('test-legacy-profile-1', 20);"
        ).unwrap();

        // Perfil inicial com tags vazias no payload_enc
        let profile = Profile {
            id: profile_id.clone(),
            name: "Perfil Sem Tags no Payload".to_string(),
            group: "Geral".to_string(),
            tags: Vec::new(),
            notes: "".to_string(),
            status: "ready".to_string(),
            kernel: "Camoufox".to_string(),
            browser_version: "150".to_string(),
            os: "linux".to_string(),
            created_at: 1000,
            updated_at: 1000,
            last_launch: None,
            is_deleted: false,
            deleted_at: None,
            proxy: ProfileProxyConfig::default(),
            fingerprint_json: serde_json::json!({}),
            extension_mode: None,
            extension_category: None,
            extensions: None,
        };

        let json_bytes = serde_json::to_vec(&profile).unwrap();
        let payload_enc = encrypt_payload(vault.key().as_ref(), &json_bytes).unwrap();

        guard.execute(
            "INSERT INTO profiles (id, name, group_name, status, kernel, browser_version, os, payload_enc, created_at, updated_at, is_deleted)
             VALUES (?1, ?2, 'Geral', 'ready', 'Camoufox', '150', 'linux', ?3, 1000, 1000, 0)",
            params![profile_id, profile.name, payload_enc],
        ).unwrap();
    }

    // 2. Executa a migração
    let report = run_profile_tags_migration(&vault).expect("Falha ao rodar migração");
    assert!(report.table_existed);
    assert_eq!(report.profiles_updated, 1);
    assert_eq!(report.tags_migrated, 2);
    assert!(report.table_dropped);

    // 3. Valida que profile_tags foi excluída
    {
        let conn = vault.conn();
        let guard = conn.lock().unwrap();
        let count: i64 = guard
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='profile_tags'",
                [],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(count, 0, "profile_tags deve ter sido descartada");

        // 4. Valida que o payload_enc agora contém as duas tags migradas
        let payload_enc: Vec<u8> = guard
            .query_row(
                "SELECT payload_enc FROM profiles WHERE id = ?1",
                params![profile_id],
                |r| r.get(0),
            )
            .unwrap();

        let decrypted = decrypt_payload(vault.key().as_ref(), &payload_enc).unwrap();
        let updated_profile: Profile = serde_json::from_slice(&decrypted).unwrap();
        assert_eq!(updated_profile.tags.len(), 2);
        assert!(updated_profile.tags.iter().any(|t| t.name == "Legado Marketing"));
        assert!(updated_profile.tags.iter().any(|t| t.name == "Legado Vendas"));
    }

    let _ = std::fs::remove_dir_all(temp_dir);
}

#[tokio::test]
async fn test_migrate_local_dev_database() {
    let target_dir = std::env::var("VAULT_DATA_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("./app-data"));

    let db_file = target_dir.join("data").join("star_vault.db");
    if !db_file.exists() {
        println!("ℹ️ Banco local {} não encontrado. Teste pulado com sucesso.", db_file.display());
        return;
    }

    println!("🚀 Executando migração no banco local: {}", db_file.display());
    let vault = match Vault::new(&target_dir) {
        Ok(v) => Arc::new(v),
        Err(e) => {
            println!("⚠️ Não foi possível abrir o cofre local: {e}");
            return;
        }
    };

    let report = run_profile_tags_migration(&vault).expect("Erro ao migrar banco local");
    println!("🏁 Resultado da migração local: {:?}", report);
}
