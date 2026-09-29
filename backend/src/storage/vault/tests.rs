#[cfg(test)]
mod tests {
    use crate::models::{CreateProxyDto, ProfileProxyConfig};
    use crate::storage::vault::StarVault;
    use crate::cloud_auth::service::PersistedAuthSession;
    use crate::models::CloudUser;
    use std::fs;
    use std::path::PathBuf;

    fn get_temp_data_dir() -> PathBuf {
        let path = std::env::temp_dir().join(format!(
            "star_vault_test_{}_{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let _ = fs::create_dir_all(&path);
        path
    }

    #[test]
    fn test_vault_initialization_and_clean_slate_purge() {
        let temp_dir = get_temp_data_dir();

        // 1. Simula a presença de arquivos legados .json desprotegidos no disco
        let legacy_tag_file = temp_dir.join("tags.json");
        fs::write(&legacy_tag_file, "[{\"id\":\"1\",\"name\":\"old_tag\"}]").unwrap();

        let legacy_proxy_dir = temp_dir.join("proxies");
        fs::create_dir_all(&legacy_proxy_dir).unwrap();
        let legacy_proxy_file = legacy_proxy_dir.join("old_proxy.json");
        fs::write(&legacy_proxy_file, "{\"host\":\"1.2.3.4\"}").unwrap();

        let legacy_profile_dir = temp_dir.join("profiles").join("prof_123");
        fs::create_dir_all(&legacy_profile_dir).unwrap();
        let legacy_profile_file = legacy_profile_dir.join("metadata.json");
        fs::write(&legacy_profile_file, "{\"name\":\"leak_profile\"}").unwrap();

        let legacy_token_file = temp_dir.join("api-token");
        fs::write(&legacy_token_file, "plaintext_token_123").unwrap();

        // 2. Inicializa o StarVault
        let _vault = StarVault::new(&temp_dir).expect("Falha ao inicializar StarVault");

        // 3. Valida a criação do star_vault.db
        let db_path = temp_dir.join("star_vault.db");
        assert!(db_path.exists(), "star_vault.db deve ter sido criado!");

        // 4. Valida que NENHUM dos arquivos legados em texto puro sobreviveu (Clean Slate / Item 999)
        assert!(!legacy_tag_file.exists(), "tags.json deve ser purgado!");
        assert!(!legacy_proxy_file.exists(), "old_proxy.json deve ser purgado!");
        assert!(!legacy_profile_file.exists(), "metadata.json legado deve ser purgado!");
        assert!(!legacy_token_file.exists(), "api-token legado deve ser purgado!");

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_vault_proxies_tde_encryption_at_rest() {
        let temp_dir = get_temp_data_dir();
        let vault = StarVault::new(&temp_dir).expect("Falha ao inicializar StarVault");

        let secret_user = "secret_vpn_user_99";
        let secret_pass = "UltraSecretPassword!@#123";

        // Cria proxy com credenciais confidenciais
        let _proxy_item = vault.proxies().create(CreateProxyDto {
            name: Some("Private Dedicated Proxy".to_string()),
            proxy_type: Some("http".to_string()),
            host: "192.168.10.50".to_string(),
            port: serde_json::json!(8080),
            username: Some(secret_user.to_string()),
            user: None,
            password: Some(secret_pass.to_string()),
            pass: None,
        }).expect("Falha ao salvar proxy");

        // Recupera via repositório desacoplado e verifica decifragem correta
        let list = vault.proxies().list().expect("Falha ao listar proxies");
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].user, secret_user);
        assert_eq!(list[0].pass, secret_pass);

        // Inspeção forense no banco SQLite: verifica que em repouso as credenciais são cifradas (Zero Plaintext)
        let db_bytes = fs::read(temp_dir.join("star_vault.db")).unwrap();
        let db_str = String::from_utf8_lossy(&db_bytes);
        assert!(!db_str.contains(secret_user), "O usuário do proxy NÃO pode existir em texto puro no SQLite!");
        assert!(!db_str.contains(secret_pass), "A senha do proxy NÃO pode existir em texto puro no SQLite!");

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_vault_profile_crud_and_trash_lifecycle() {
        let temp_dir = get_temp_data_dir();
        let vault = StarVault::new(&temp_dir).expect("Falha ao inicializar StarVault");

        let profile = crate::models::Profile {
            id: "star_prof_test_001".to_string(),
            name: "Forensic Secure Profile".to_string(),
            group: "Banking".to_string(),
            tags: vec!["finances".to_string()],
            notes: "Conta crítica bancária".to_string(),
            status: "ready".to_string(),
            kernel: "Camoufox".to_string(),
            browser_version: "135.0".to_string(),
            os: "linux".to_string(),
            created_at: 1000,
            updated_at: 1000,
            last_launch: None,
            is_deleted: false,
            deleted_at: None,
            proxy: ProfileProxyConfig::default(),
            fingerprint_json: serde_json::json!({ "screen": { "width": 1920, "height": 1080 } }),
            extension_mode: None,
            extension_category: None,
            extensions: None,
        };

        // Salva perfil
        vault.profiles().save(&profile).expect("Falha ao salvar perfil");

        // Obtém perfil
        let loaded = vault.profiles().get("star_prof_test_001").expect("Falha ao consultar").expect("Perfil não encontrado");
        assert_eq!(loaded.name, "Forensic Secure Profile");
        assert_eq!(loaded.notes, "Conta crítica bancária");

        // Envia para a lixeira (Soft Delete)
        vault.profiles().delete_soft("star_prof_test_001").expect("Falha no soft delete");
        let active_list = vault.profiles().list(None, None).expect("Falha ao listar");
        assert_eq!(active_list.len(), 0);

        let trash_list = vault.profiles().list_trash().expect("Falha ao listar lixeira");
        assert_eq!(trash_list.len(), 1);
        assert_eq!(trash_list[0].id, "star_prof_test_001");

        // Restaura da lixeira
        let restored = vault.profiles().restore("star_prof_test_001").expect("Falha ao restaurar").expect("Perfil não encontrado");
        assert!(!restored.is_deleted);
        assert_eq!(vault.profiles().list(None, None).unwrap().len(), 1);

        // Exclui permanentemente
        vault.profiles().delete_permanent("star_prof_test_001").expect("Falha na exclusão permanente");
        assert!(vault.profiles().get("star_prof_test_001").unwrap().is_none());

        let _ = fs::remove_dir_all(&temp_dir);
    }

    #[test]
    fn test_vault_auth_and_mcp_zero_plaintext() {
        let temp_dir = get_temp_data_dir();
        let vault = StarVault::new(&temp_dir).expect("Falha ao inicializar StarVault");

        // 1. Auth session roundtrip
        let auth_session = PersistedAuthSession {
            user: CloudUser {
                id: "user_uuid_456".to_string(),
                email: "trader@star-multlogin.com".to_string(),
                name: Some("Elite Trader".to_string()),
                plan: "VIP".to_string(),
                max_profiles: 500,
                profile_count: 42,
            },
            access_token: "jwt_access_token_secret_xyz789".to_string(),
            refresh_token: "jwt_refresh_token_ultra_secret_abc123".to_string(),
            expires_at: 1780000000,
        };

        vault.auth().save(&auth_session).expect("Falha ao persistir sessão");
        let retrieved = vault.auth().get().expect("Falha ao buscar sessão").expect("Sessão vazia");
        assert_eq!(retrieved.access_token, "jwt_access_token_secret_xyz789");
        assert_eq!(retrieved.refresh_token, "jwt_refresh_token_ultra_secret_abc123");

        // 2. MCP token roundtrip
        let mcp_token = "star_sec_abcdef0123456789abcdef0123456789";
        vault.mcp().save_token(mcp_token).expect("Falha ao salvar token MCP");
        assert_eq!(vault.mcp().get_token().unwrap(), Some(mcp_token.to_string()));

        // 3. Inspeção forense no arquivo SQLite: NENHUM token em texto puro existe no disco
        let db_bytes = fs::read(temp_dir.join("star_vault.db")).unwrap();
        let db_str = String::from_utf8_lossy(&db_bytes);
        assert!(!db_str.contains("jwt_access_token_secret_xyz789"), "Access token vazou em texto puro!");
        assert!(!db_str.contains("jwt_refresh_token_ultra_secret_abc123"), "Refresh token vazou em texto puro!");
        assert!(!db_str.contains(mcp_token), "MCP token vazou em texto puro!");

        let _ = fs::remove_dir_all(&temp_dir);
    }
}
