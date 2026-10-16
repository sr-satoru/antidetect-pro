use star_multlogin_backend::models::{CreateProfileDto, UpdateProfileDto};
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

#[tokio::test]
async fn test_profile_kernel_immutability_on_update() {
    let temp_dir = std::env::temp_dir().join(format!(
        "star_profile_kernel_immutability_test_{}",
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

    // 1. Cria perfil com AstroFox
    let create_fox = CreateProfileDto {
        id: None,
        name: Some("Perfil Fox Original".to_string()),
        group: Some("Default".to_string()),
        tags: Some(vec![]),
        tag_ids: None,
        notes: Some(String::new()),
        status: None,
        kernel: Some("AstroFox".to_string()),
        browser_version: Some("150".to_string()),
        os: Some("windows".to_string()),
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
    let created_fox = storage.create(create_fox).expect("Falha ao criar perfil Fox");
    assert_eq!(created_fox.kernel, "AstroFox");

    // 2. Tenta atualizar o kernel para AstroBrowser
    let update_dto = UpdateProfileDto {
        name: Some("Perfil Fox Tentativa Troca".to_string()),
        group: None,
        notes: None,
        status: None,
        tags: None,
        tag_ids: None,
        os: None,
        kernel: Some("AstroBrowser".to_string()),
        browser_version: None,
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

    let updated = storage.update(&created_fox.id, update_dto).expect("Falha ao atualizar");
    assert_eq!(
        updated.kernel, "AstroFox",
        "O motor DEVE permanecer AstroFox mesmo se dto solicitar AstroBrowser"
    );

    let reloaded = storage.get(&created_fox.id).expect("Perfil não encontrado");
    assert_eq!(
        reloaded.kernel, "AstroFox",
        "No banco de dados, o kernel deve permanecer estritamente imutável"
    );

    let _ = std::fs::remove_dir_all(temp_dir);
}

#[test]
fn test_extract_domain_from_url() {
    use star_multlogin_backend::service_database::profiles::lifecycle::extract_domain_from_url;

    assert_eq!(extract_domain_from_url("https://x.com"), Some("x.com".to_string()));
    assert_eq!(extract_domain_from_url("https://x.com/home"), Some("x.com".to_string()));
    assert_eq!(extract_domain_from_url("https://www.facebook.com/login"), Some("facebook.com".to_string()));
    assert_eq!(extract_domain_from_url("http://facebook.com"), Some("facebook.com".to_string()));
    assert_eq!(extract_domain_from_url("accounts.google.com"), Some("accounts.google.com".to_string()));
    assert_eq!(extract_domain_from_url("http://localhost:3000/app"), Some("localhost".to_string()));
    assert_eq!(extract_domain_from_url("about:blank"), None);
    assert_eq!(extract_domain_from_url(""), None);
}

#[test]
fn test_is_url_in_browser_history_chromium() {
    use star_multlogin_backend::service_database::profiles::lifecycle::is_url_in_browser_history;

    let temp_dir = std::env::temp_dir().join(format!(
        "star_hist_chrom_{}",
        std::time::SystemTime::now().elapsed().unwrap().as_nanos()
    ));
    let default_dir = temp_dir.join("Default");
    std::fs::create_dir_all(&default_dir).unwrap();

    let db_path = default_dir.join("History");
    let conn = rusqlite::Connection::open(&db_path).unwrap();
    conn.execute("CREATE TABLE urls (id INTEGER PRIMARY KEY, url TEXT)", []).unwrap();
    conn.execute("INSERT INTO urls (url) VALUES ('https://x.com/explore')", []).unwrap();
    drop(conn);

    // Domínio presente no histórico deve retornar true
    assert!(is_url_in_browser_history(&temp_dir, "AstroBrowser", "https://x.com"));
    assert!(is_url_in_browser_history(&temp_dir, "AstroBrowser", "x.com"));

    // Domínio não presente deve retornar false
    assert!(!is_url_in_browser_history(&temp_dir, "AstroBrowser", "https://facebook.com"));

    let _ = std::fs::remove_dir_all(temp_dir);
}

#[test]
fn test_is_url_in_browser_history_firefox() {
    use star_multlogin_backend::service_database::profiles::lifecycle::is_url_in_browser_history;

    let temp_dir = std::env::temp_dir().join(format!(
        "star_hist_fox_{}",
        std::time::SystemTime::now().elapsed().unwrap().as_nanos()
    ));
    std::fs::create_dir_all(&temp_dir).unwrap();

    let db_path = temp_dir.join("places.sqlite");
    let conn = rusqlite::Connection::open(&db_path).unwrap();
    conn.execute("CREATE TABLE moz_places (id INTEGER PRIMARY KEY, url TEXT)", []).unwrap();
    conn.execute("INSERT INTO moz_places (url) VALUES ('https://www.facebook.com/feed')", []).unwrap();
    drop(conn);

    // Domínio presente deve retornar true
    assert!(is_url_in_browser_history(&temp_dir, "AstroFox", "https://facebook.com"));
    assert!(is_url_in_browser_history(&temp_dir, "AstroFox", "https://www.facebook.com"));

    // Domínio não presente deve retornar false
    assert!(!is_url_in_browser_history(&temp_dir, "AstroFox", "https://tiktok.com"));

    let _ = std::fs::remove_dir_all(temp_dir);
}

#[test]
fn test_resolve_all_initial_urls_multiple_platforms() {
    use star_multlogin_backend::service_database::profiles::lifecycle::resolve_all_initial_urls;
    use star_multlogin_backend::models::{Profile, ProfileProxyConfig};

    let profile = Profile {
        id: "test_multi_plat".to_string(),
        name: "Multi Platform Test".to_string(),
        group: "default".to_string(),
        tags: vec![],
        notes: String::new(),
        status: "ready".to_string(),
        kernel: "AstroBrowser".to_string(),
        browser_version: "150".to_string(),
        os: "windows".to_string(),
        created_at: 0,
        updated_at: 0,
        last_launch: None,
        is_deleted: false,
        deleted_at: None,
        proxy: ProfileProxyConfig {
            mode: "custom".to_string(),
            proxy_type: "none".to_string(),
            host: None,
            port: None,
            username: None,
            password: None,
            rotation_url: None,
            ip_checker: None,
            socks_remote_dns: true,
        },
        fingerprint_json: serde_json::json!({
            "platform_accounts": [
                { "platform": "facebook", "customDomain": "facebook.com" },
                { "platform": "x", "customDomain": "x.com" },
                { "platform": "instagram", "customDomain": "instagram.com" },
                { "platform": "google", "customDomain": "accounts.google.com" },
                { "platform": "other", "customDomain": "github.com" }
            ],
            "open_tabs_urls": "https://bing.com\nhttps://reddit.com"
        }),
        extension_mode: None,
        extension_category: None,
        extensions: None,
    };

    let urls = resolve_all_initial_urls(&profile, None);
    assert_eq!(urls.len(), 7);
    assert_eq!(urls[0], "https://bing.com");
    assert_eq!(urls[1], "https://reddit.com");
    assert_eq!(urls[2], "https://facebook.com");
    assert_eq!(urls[3], "https://x.com");
    assert_eq!(urls[4], "https://instagram.com");
    assert_eq!(urls[5], "https://accounts.google.com");
    assert_eq!(urls[6], "https://github.com");
}

#[tokio::test]
async fn test_public_profile_endpoint_authentication() {
    use axum::extract::{Query, State};
    use axum::http::{header, HeaderMap, StatusCode};
    use star_multlogin_backend::api::routes::profiles::get_public_profiles;
    use star_multlogin_backend::models::PublicProfileQuery;
    use star_multlogin_backend::service_database::ProfileStorage;

    let temp_dir = std::env::temp_dir().join(format!(
        "star_public_auth_test_{}",
        std::time::SystemTime::now().elapsed().unwrap().as_nanos()
    ));
    let _ = std::fs::create_dir_all(&temp_dir);
    let vault = Arc::new(Vault::new(&temp_dir).unwrap());
    let ws = WsState::new();
    let storage = Arc::new(ProfileStorage::new(&temp_dir, ws, vault));

    let token = storage.get_mcp_token();

    // 1. Sem header de autenticação -> DEVE retornar 401 Unauthorized
    let no_headers = HeaderMap::new();
    let res_no_auth = get_public_profiles(
        State(storage.clone()),
        no_headers,
        Query(PublicProfileQuery { id: None, name: None, tag: None }),
    ).await;
    assert!(res_no_auth.is_err());
    if let Err((status, _)) = res_no_auth {
        assert_eq!(status, StatusCode::UNAUTHORIZED);
    }

    // 2. Com token inválido (TOKEN_AQUI) -> DEVE retornar 401 Unauthorized
    let mut invalid_headers = HeaderMap::new();
    invalid_headers.insert(header::AUTHORIZATION, "Bearer TOKEN_AQUI".parse().unwrap());
    let res_invalid = get_public_profiles(
        State(storage.clone()),
        invalid_headers,
        Query(PublicProfileQuery { id: None, name: None, tag: None }),
    ).await;
    assert!(res_invalid.is_err());
    if let Err((status, _)) = res_invalid {
        assert_eq!(status, StatusCode::UNAUTHORIZED);
    }

    // 3. Com token válido real do cofre -> DEVE retornar 200 OK
    let mut valid_headers = HeaderMap::new();
    valid_headers.insert(header::AUTHORIZATION, format!("Bearer {token}").parse().unwrap());
    let res_valid = get_public_profiles(
        State(storage.clone()),
        valid_headers,
        Query(PublicProfileQuery { id: None, name: None, tag: None }),
    ).await;
    assert!(res_valid.is_ok());

    let _ = std::fs::remove_dir_all(temp_dir);
}
