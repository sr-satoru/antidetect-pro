use star_multlogin_backend::service_database::profiles::quota::check_profile_limit;
use star_multlogin_backend::service_database::Vault;
use star_multlogin_backend::ws::WsState;
use std::sync::Arc;

#[tokio::test]
async fn test_check_profile_limit_offline_ok() {
    let temp_dir = std::env::temp_dir().join(format!(
        "star_quota_test_{}",
        std::time::SystemTime::now().elapsed().unwrap().as_nanos()
    ));
    let _ = std::fs::create_dir_all(&temp_dir);
    let vault = Arc::new(Vault::new(&temp_dir).unwrap());
    let ws = WsState::new();

    // Sem sessão salva na nuvem (modo offline / recém instalado), a checagem deve passar sem erros
    let result = check_profile_limit(&vault, 5, &ws);
    assert!(result.is_ok());

    let _ = std::fs::remove_dir_all(temp_dir);
}

#[tokio::test]
async fn test_profile_tags_persistence_without_profile_tags_table() {
    let temp_dir = std::env::temp_dir().join(format!(
        "star_profile_tag_test_{}",
        std::time::SystemTime::now().elapsed().unwrap().as_nanos()
    ));
    let _ = std::fs::create_dir_all(&temp_dir);
    let vault = Arc::new(Vault::new(&temp_dir).unwrap());
    let ws = WsState::new();
    let storage = star_multlogin_backend::service_database::profiles::ProfileService::new(
        &temp_dir,
        ws,
        vault.clone(),
    );

    // 1. Verifica que a tabela profile_tags não existe no SQLite
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
        assert_eq!(count, 0, "A tabela profile_tags não deve existir no SQLite");
    }

    // 2. Cria perfil com tags
    let create_dto = star_multlogin_backend::models::CreateProfileDto {
        id: None,
        name: Some("Perfil Teste Tags".to_string()),
        group: Some("Testes".to_string()),
        tags: Some(vec!["Marketing".to_string(), "Facebook".to_string()]),
        tag_ids: None,
        notes: None,
        status: None,
        kernel: None,
        browser_version: None,
        os: None,
        proxy_type: None,
        proxy_host: None,
        proxy_port: None,
        proxy_username: None,
        proxy_password: None,
        fingerprint_json: None,
        extension_mode: None,
        extension_category: None,
        extensions: None,
    };

    let created = storage.create(create_dto).expect("Erro ao criar perfil");
    assert_eq!(created.tags.len(), 2);
    assert!(created.tags.iter().any(|t| t.name == "Marketing"));
    assert!(created.tags.iter().any(|t| t.name == "Facebook"));

    // 3. Recupera o perfil do banco e valida persistência de tags
    let fetched = storage.get(&created.id).expect("Perfil não encontrado");
    assert_eq!(fetched.tags.len(), 2);
    assert!(fetched.tags.iter().any(|t| t.name == "Marketing"));
    assert!(fetched.tags.iter().any(|t| t.name == "Facebook"));

    // 4. Atualiza removendo uma tag e adicionando outra
    let update_dto = star_multlogin_backend::models::UpdateProfileDto {
        name: None,
        group: None,
        tags: Some(vec!["Google".to_string()]),
        tag_ids: None,
        notes: None,
        status: None,
        kernel: None,
        browser_version: None,
        os: None,
        proxy_type: None,
        proxy_host: None,
        proxy_port: None,
        proxy_username: None,
        proxy_password: None,
        fingerprint_json: None,
        extension_mode: None,
        extension_category: None,
        extensions: None,
    };

    let updated = storage.update(&created.id, update_dto).expect("Erro ao atualizar");
    assert_eq!(updated.tags.len(), 1);
    assert_eq!(updated.tags[0].name, "Google");

    let fetched_again = storage.get(&created.id).expect("Perfil não encontrado");
    assert_eq!(fetched_again.tags.len(), 1);
    assert_eq!(fetched_again.tags[0].name, "Google");

    let _ = std::fs::remove_dir_all(temp_dir);
}

#[tokio::test]
async fn test_profile_get_playwright_options() {
    let temp_dir = std::env::temp_dir().join(format!(
        "star_profile_playwright_test_{}",
        std::time::SystemTime::now().elapsed().unwrap().as_nanos()
    ));
    let _ = std::fs::create_dir_all(&temp_dir);
    let vault = Arc::new(Vault::new(&temp_dir).unwrap());
    let ws = WsState::new();
    let storage = star_multlogin_backend::service_database::profiles::ProfileService::new(
        &temp_dir,
        ws,
        vault.clone(),
    );

    let create_dto = star_multlogin_backend::models::CreateProfileDto {
        id: None,
        name: Some("Perfil Camoufox Playwright".to_string()),
        group: Some("Testes".to_string()),
        tags: None,
        tag_ids: None,
        notes: None,
        status: None,
        kernel: Some("Camoufox".to_string()),
        browser_version: Some("150".to_string()),
        os: Some("windows".to_string()),
        proxy_type: Some("http".to_string()),
        proxy_host: Some("1.2.3.4".to_string()),
        proxy_port: Some(8080),
        proxy_username: Some("user".to_string()),
        proxy_password: Some("pass".to_string()),
        fingerprint_json: Some(serde_json::json!({
            "os": "windows",
            "custom_latitude": -23.55,
            "custom_longitude": -46.63,
            "location_mode": "custom"
        })),
        extension_mode: None,
        extension_category: None,
        extensions: None,
    };

    let created = storage.create(create_dto).expect("Erro ao criar perfil");

    let pw_opts = storage.get_playwright_options(&created.id).expect("Erro ao gerar opções Playwright");

    assert_eq!(pw_opts["profile_id"], created.id);
    assert_eq!(pw_opts["os"], "windows");
    assert!(pw_opts["user_data_dir"].as_str().unwrap().contains(&created.id));
    assert_eq!(pw_opts["proxy"]["server"], "http://1.2.3.4:8080");
    assert_eq!(pw_opts["proxy"]["username"], "user");
    assert_eq!(pw_opts["proxy"]["password"], "pass");

    // Valida que o config traz a geolocalização e as fontes traduzidas para o Camoufox
    let cfg = pw_opts.get("config").unwrap().as_object().unwrap();
    assert_eq!(cfg.get("geolocation:latitude").unwrap().as_f64().unwrap(), -23.55);
    assert!(cfg.contains_key("fonts"));

    let _ = std::fs::remove_dir_all(temp_dir);
}

#[tokio::test]
async fn test_public_profile_api_strictly_id_and_name() {
    let temp_dir = std::env::temp_dir().join(format!(
        "star_profile_public_test_{}",
        std::time::SystemTime::now().elapsed().unwrap().as_nanos()
    ));
    let _ = std::fs::create_dir_all(&temp_dir);
    let vault = Arc::new(Vault::new(&temp_dir).unwrap());
    let ws = WsState::new();
    let storage = star_multlogin_backend::service_database::profiles::ProfileService::new(
        &temp_dir,
        ws,
        vault.clone(),
    );

    // 1. Cria 2 perfis com dados sensíveis e tags para agentes
    let p1 = storage
        .create(star_multlogin_backend::models::CreateProfileDto {
            id: None,
            name: Some("Perfil Publico 01".to_string()),
            group: Some("G1".to_string()),
            tags: Some(vec!["shopee".to_string(), "aquecimento".to_string()]),
            tag_ids: None,
            notes: Some("Notas ultra confidenciais".to_string()),
            status: None,
            kernel: None,
            browser_version: None,
            os: None,
            proxy_type: Some("socks5".to_string()),
            proxy_host: Some("1.2.3.4".to_string()),
            proxy_port: Some(1080),
            proxy_username: Some("segredo".to_string()),
            proxy_password: Some("senha123".to_string()),
            fingerprint_json: None,
            extension_mode: None,
            extension_category: None,
            extensions: None,
        })
        .unwrap();

    let p2 = storage
        .create(star_multlogin_backend::models::CreateProfileDto {
            id: None,
            name: Some("Perfil Publico 02".to_string()),
            group: None,
            tags: Some(vec!["ml".to_string(), "vendedor".to_string()]),
            tag_ids: None,
            notes: None,
            status: None,
            kernel: None,
            browser_version: None,
            os: None,
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
        .unwrap();

    // 2. Busca todos: deve retornar somente ID, Nome e Tags de cada um
    let all_public = storage.get_public(None, None, None);
    assert_eq!(all_public.len(), 2);
    assert_eq!(all_public[0].id, p1.id);
    assert_eq!(all_public[0].name, "Perfil Publico 01");
    assert_eq!(all_public[0].tags, vec!["shopee", "aquecimento"]);
    assert_eq!(all_public[1].id, p2.id);
    assert_eq!(all_public[1].name, "Perfil Publico 02");
    assert_eq!(all_public[1].tags, vec!["ml", "vendedor"]);

    // 3. Busca por ID
    let by_id = storage.get_public(Some(&p1.id), None, None);
    assert_eq!(by_id.len(), 1);
    assert_eq!(by_id[0].id, p1.id);
    assert_eq!(by_id[0].name, "Perfil Publico 01");
    assert_eq!(by_id[0].tags, vec!["shopee", "aquecimento"]);

    // 4. Busca por Nome (case-insensitive)
    let by_name = storage.get_public(None, Some("perfil publico 02"), None);
    assert_eq!(by_name.len(), 1);
    assert_eq!(by_name[0].id, p2.id);
    assert_eq!(by_name[0].name, "Perfil Publico 02");

    // 5. Busca por Tag (para controle de agentes)
    let by_tag = storage.get_public(None, None, Some("shopee"));
    assert_eq!(by_tag.len(), 1);
    assert_eq!(by_tag[0].id, p1.id);

    let by_tag2 = storage.get_public(None, None, Some("vendedor"));
    assert_eq!(by_tag2.len(), 1);
    assert_eq!(by_tag2[0].id, p2.id);

    // 6. Validação de segurança: deserializador DEVE aceitar apenas id, name e tag
    let valid_json = r#"{"id":"test-123","name":"Nome Teste","tag":"shopee"}"#;
    let query_ok: Result<star_multlogin_backend::models::PublicProfileQuery, _> =
        serde_json::from_str(valid_json);
    assert!(query_ok.is_ok(), "Deve aceitar estritamente id, name e tag");

    // Teste de JSON com campo extra proibido -> DEVE falhar devido ao deny_unknown_fields
    let invalid_json = r#"{"id":"test-123","name":"Nome Teste","proxy":"injetado"}"#;
    let query_err: Result<star_multlogin_backend::models::PublicProfileQuery, _> =
        serde_json::from_str(invalid_json);
    assert!(
        query_err.is_err(),
        "Deve rejeitar qualquer campo além de id, name e tag"
    );

    let _ = std::fs::remove_dir_all(temp_dir);
}


