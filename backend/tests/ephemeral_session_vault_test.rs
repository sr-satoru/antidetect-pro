use std::collections::HashMap;
use std::fs;
use std::sync::Arc;

use star_multlogin_backend::extraction_session::{
    UnifiedCookie, UnifiedSession,
};
use star_multlogin_backend::launcher::engine::injection::{
    inject_cookies, inject_local_storage, purge_ephemeral_session_files,
};
use star_multlogin_backend::models::CreateProfileDto;
use star_multlogin_backend::service_database::{ProfileService, SessionService, Vault};
use star_multlogin_backend::ws::WsState;

#[tokio::test]
async fn test_ephemeral_vault_session_full_lifecycle() {
    let temp_dir = std::env::temp_dir().join(format!("star_ephemeral_test_{}", uuid::Uuid::new_v4()));
    fs::create_dir_all(&temp_dir).unwrap();

    let vault = Arc::new(Vault::new(&temp_dir).expect("Falha ao inicializar Star Vault"));
    let ws_state = WsState::new();
    let profile_service = Arc::new(ProfileService::new(&temp_dir, ws_state, vault.clone()));
    let session_service = SessionService::new(vault.clone());

    let created_profile = profile_service
        .create(CreateProfileDto {
            id: None,
            name: Some("Conta Discord & Google Segura".to_string()),
            group: None,
            tags: None,
            tag_ids: None,
            notes: None,
            status: None,
            kernel: None,
            browser_version: None,
            os: Some("linux".to_string()),
            proxy_type: None,
            proxy_host: None,
            proxy_port: None,
            proxy_username: None,
            proxy_password: None,
            fingerprint_json: None,
            extension_mode: None,
            extension_category: None,
            extensions: None,
        })
        .expect("Falha ao criar perfil");
    let profile_id = created_profile.id.clone();

    let profile_dir = profile_service.get_profile_dir(&profile_id);
    fs::create_dir_all(&profile_dir).unwrap();

    // 1. Inicialmente, o disco do perfil NÃO tem nenhum arquivo de cookies ou storage (Zero-Trace)
    assert!(!profile_dir.join("cookies.sqlite").exists());
    assert!(!profile_dir.join("storage").join("default").exists());

    // 2. Prepara uma sessão inicial (Cookies + LocalStorage) e salva de forma criptografada no Vault
    let mut initial_storage = HashMap::new();
    let mut discord_keys = HashMap::new();
    discord_keys.insert("token".to_string(), "\"mfa.EncryptedVaultToken123\"".to_string());
    initial_storage.insert("https://discord.com".to_string(), discord_keys);

    let initial_session = UnifiedSession {
        cookies: vec![
            UnifiedCookie {
                name: "__Secure-1PSID".to_string(),
                value: "g.a000SecretEncryptedGoogleVal".to_string(),
                domain: ".google.com".to_string(),
                path: "/".to_string(),
                expiry: Some(1900000000),
                is_secure: true,
                is_http_only: true,
                same_site: "None".to_string(),
            },
        ],
        local_storage: initial_storage,
        total_cookies: 1,
        total_storage_items: 1,
    };

    session_service
        .save_session(&profile_id, &initial_session)
        .expect("Falha ao salvar sessão inicial no Vault");

    // Valida que no banco SQLite o blob salvo NÃO está em texto puro (está criptografado em AES-256-GCM)
    {
        let conn = vault.conn();
        let guard = conn.lock().unwrap();
        let raw_blob: Vec<u8> = guard
            .query_row(
                "SELECT session_enc FROM profile_sessions WHERE profile_id = ?1",
                rusqlite::params![profile_id],
                |row| row.get(0),
            )
            .expect("Sessão não encontrada no SQLite do Vault");
        
        let blob_str = String::from_utf8_lossy(&raw_blob);
        assert!(!blob_str.contains("__Secure-1PSID"), "A sessão no banco NÃO pode estar em texto puro!");
        assert!(!blob_str.contains("mfa.EncryptedVaultToken123"), "O token no banco NÃO pode estar em texto puro!");
    }

    // 3. Simulação de Launch (Boot do Camoufox):
    // Descriptografa do Vault e monta os arquivos SQLite temporários no disco
    let loaded = session_service
        .load_session(&profile_id)
        .expect("Falha ao carregar sessão")
        .expect("Sessão deveria existir");
    assert_eq!(loaded.total_cookies, 1);
    assert_eq!(loaded.total_storage_items, 1);

    inject_cookies(&profile_dir, &loaded.cookies).expect("Falha ao montar cookies temporários");
    for (orig, items) in &loaded.local_storage {
        inject_local_storage(&profile_dir, orig, items).expect("Falha ao montar storage temporário");
    }

    // Agora os arquivos temporários existem para o Camoufox ler
    assert!(profile_dir.join("cookies.sqlite").exists());
    assert!(profile_dir.join("storage").join("default").exists());

    // 4. Simulação de Navegação Ativa (Usuário faz login em mais um site):
    let new_cookies = vec![
        UnifiedCookie {
            name: "cf_clearance".to_string(),
            value: "cf_new_session_during_browse".to_string(),
            domain: ".cloudflare.com".to_string(),
            path: "/".to_string(),
            expiry: Some(1900000000),
            is_secure: true,
            is_http_only: true,
            same_site: "None".to_string(),
        },
    ];
    inject_cookies(&profile_dir, &new_cookies).unwrap();

    let mut tg_storage = HashMap::new();
    tg_storage.insert("user_auth".to_string(), "{\"id\":12345}".to_string());
    inject_local_storage(&profile_dir, "https://web.telegram.org", &tg_storage).unwrap();

    // 5. Simulação de Fechamento do Navegador (Clique no 'X' ou Stop):
    // O Watcher extrai os novos dados completos da sessão
    let fresh_session = star_multlogin_backend::extraction_session::fire_fox::extract_unified_session(&profile_dir)
        .expect("Falha ao extrair sessão no fechamento");
    assert_eq!(fresh_session.total_cookies, 2); // 1 antigo + 1 novo
    assert_eq!(fresh_session.total_storage_items, 2); // Discord + Telegram

    // Persiste no Vault criptografado
    session_service
        .save_session(&profile_id, &fresh_session)
        .expect("Falha ao atualizar sessão no Vault");

    // Zero-Trace: Expurgar arquivos temporários do disco
    purge_ephemeral_session_files(&profile_dir);

    // 6. Verificação Zero-Trace: O disco NÃO contém mais nenhum arquivo de sessão em texto puro!
    assert!(!profile_dir.join("cookies.sqlite").exists(), "cookies.sqlite deveria ter sido destruído!");
    assert!(!profile_dir.join("storage").join("default").exists(), "storage/default deveria ter sido destruído!");

    // 7. Próxima Inicialização: Os dados são restaurados integralmente do Vault
    let reloaded = session_service
        .load_session(&profile_id)
        .unwrap()
        .expect("Sessão recarregada do Vault");
    assert_eq!(reloaded.total_cookies, 2);
    assert_eq!(reloaded.total_storage_items, 2);
    assert!(reloaded.cookies.iter().any(|c| c.name == "cf_clearance"));
    assert!(reloaded.cookies.iter().any(|c| c.name == "__Secure-1PSID"));
    assert!(reloaded.local_storage.contains_key("https://discord.com"));
    assert!(reloaded.local_storage.contains_key("https://web.telegram.org"));

    // Limpeza da pasta de testes
    let _ = fs::remove_dir_all(&temp_dir);
}
