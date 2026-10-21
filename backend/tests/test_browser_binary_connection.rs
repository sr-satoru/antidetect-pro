use star_multlogin_backend::browser_downloader::detector::{check_engine_health, EngineHealthStatus};
use star_multlogin_backend::browser_downloader::resolve_engine_binary;
use star_multlogin_backend::camoufox::build_browser_command;
use star_multlogin_backend::models::{Profile, ProfileProxyConfig};
use star_multlogin_backend::network::NetworkSetupResult;
use star_multlogin_backend::service_database::Vault;
use star_multlogin_backend::ws::WsState;
use std::path::PathBuf;
use std::sync::Arc;

#[test]
fn test_engine_health_detection_on_real_binary() {
    let app_data = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("app-data");
    let health = check_engine_health(&app_data);

    match health {
        EngineHealthStatus::Installed { executable_path, version, size_bytes } => {
            println!("✅ Motor detectado com sucesso:");
            println!("   - Executável: {:?}", executable_path);
            println!("   - Versão: {}", version);
            println!("   - Tamanho: {} bytes", size_bytes);

            assert!(executable_path.exists(), "Executável deve existir fisicamente");
            assert!(executable_path.is_file(), "Executável deve ser um arquivo regular");
            assert_eq!(version, star_multlogin_backend::browser_downloader::astrofox::ASTROFOX_RELEASE_TAG);

            let resolved = resolve_engine_binary(&app_data);
            assert!(resolved.is_ok(), "resolve_engine_binary deve retornar Ok");
            assert_eq!(resolved.unwrap(), executable_path);
        }
        EngineHealthStatus::Missing { reason } => {
            panic!("Motor ausente: {}", reason);
        }
        EngineHealthStatus::Broken { reason } => {
            panic!("Motor corrompido: {}", reason);
        }
    }
}

#[tokio::test]
async fn test_browser_command_assembly_and_environment() {
    let app_data = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("app-data");
    let binary_path = resolve_engine_binary(&app_data).expect("Motor deve estar instalado");

    let temp_profile_dir = std::env::temp_dir().join(format!(
        "star_test_profile_{}",
        std::time::SystemTime::now().elapsed().unwrap().as_nanos()
    ));
    let _ = std::fs::create_dir_all(&temp_profile_dir);

    let profile = Profile {
        id: "test-profile-001".to_string(),
        name: "Perfil de Teste de Conexão".to_string(),
        group: "Default".to_string(),
        tags: vec![],
        notes: String::new(),
        status: "ready".to_string(),
        kernel: "Camoufox".to_string(),
        browser_version: "152.0.4".to_string(),
        os: "windows".to_string(),
        is_deleted: false,
        deleted_at: None,
        proxy: ProfileProxyConfig::default(),
        fingerprint_json: serde_json::json!({
            "os": "windows",
            "screen": { "width": 1920, "height": 1080 },
            "hardware": { "concurrency": 8 },
            "custom_language": "pt-BR,pt;q=0.9,en-US;q=0.8"
        }),
        created_at: 0,
        updated_at: 0,
        last_launch: None,
        extension_mode: Some("none".to_string()),
        extension_category: None,
        extensions: None,
    };

    let net_setup = NetworkSetupResult::default();
    let debug_port = Some(19222);

    let cmd_result = build_browser_command(
        &binary_path,
        &temp_profile_dir,
        &profile,
        debug_port,
        &net_setup,
        &[],
        None,
        Some("about:blank"),
    );

    assert!(cmd_result.is_ok(), "build_browser_command deve retornar Ok");

    let _ = std::fs::remove_dir_all(&temp_profile_dir);
}

#[tokio::test]
async fn test_full_launch_and_stop_lifecycle_with_binary() {
    let app_data = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("app-data");
    let vault = Arc::new(Vault::new(&app_data).expect("Vault"));
    let ws = WsState::new();
    let mut rx = ws.tx.subscribe();

    let storage = star_multlogin_backend::service_database::profiles::ProfileService::new(
        &app_data,
        ws.clone(),
        vault.clone(),
    );

    // Cria perfil de teste
    let create_dto = star_multlogin_backend::models::CreateProfileDto {
        id: None,
        name: Some("Teste Ciclo Real Binario".to_string()),
        group: Some("Testes".to_string()),
        tags: None,
        tag_ids: None,
        notes: None,
        status: None,
        kernel: Some("Camoufox".to_string()),
        browser_version: Some("152".to_string()),
        os: Some("linux".to_string()),
        proxy_type: Some("none".to_string()),
        proxy_host: None,
        proxy_port: None,
        proxy_username: None,
        proxy_password: None,
        fingerprint_json: Some(serde_json::json!({
            "os": "linux",
            "screen": { "width": 1280, "height": 720 },
            "custom_language": "pt-BR"
        })),
        extension_mode: None,
        extension_category: None,
        extensions: None,
    };

    let created = storage.create(create_dto).expect("Erro ao criar perfil");
    println!("📋 Perfil criado para teste: {}", created.id);

    // Dispara o navegador via storage.launch_with_options (com URL about:blank)
    let launch_res = storage.launch_with_options(&created.id, true, Some("about:blank")).await;
    match launch_res {
        Ok((prof, pid, debug_port, ws_endpoint)) => {
            println!("🚀 Navegador binário disparado com sucesso!");
            println!("   - Profile ID: {}", prof.id);
            println!("   - PID: {}", pid);
            println!("   - Debug Port: {:?}", debug_port);
            println!("   - WS Endpoint: {:?}", ws_endpoint);

            assert!(pid > 0, "PID deve ser válido maior que 0");
            let pm = storage.get_process_manager();
            assert!(pm.is_running(&created.id), "ProcessManager deve indicar is_running = true");

            // Verifica se o evento WebSocket 'profile_status = running' foi recebido
            let mut got_running_event = false;
            while let Ok(event) = rx.try_recv() {
                if let star_multlogin_backend::ws::WsEvent::ProfileStatus { profile_id, status } = event {
                    if profile_id == created.id && status == "running" {
                        got_running_event = true;
                    }
                }
            }
            assert!(got_running_event, "Deve ter emitido WsEvent::ProfileStatus 'running'");

            // Aguarda 1 segundo e encerra
            tokio::time::sleep(std::time::Duration::from_millis(1000)).await;

            let stop_res = storage.stop(&created.id);
            assert!(stop_res.is_ok(), "storage.stop deve retornar Ok");

            // Aguarda encerramento
            tokio::time::sleep(std::time::Duration::from_millis(500)).await;
            assert!(!pm.is_running(&created.id), "ProcessManager deve indicar is_running = false após stop");

            // Limpa o perfil criado
            let _ = storage.permanent_delete(&created.id);
            println!("✅ Teste de ciclo de vida completo do binário passou com sucesso!");
        }
        Err(e) => {
            panic!("Falha ao disparar navegador binário: {}", e);
        }
    }
}

#[tokio::test]
async fn test_http_api_flow_matches_app_frontend() {
    let app_data = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("app-data");
    let data_dir_str = app_data.to_string_lossy().to_string();

    let vault = Arc::new(Vault::new(&app_data).expect("Vault"));
    let ws_state = WsState::new();

    let profile_storage = Arc::new(star_multlogin_backend::service_database::ProfileStorage::new(
        &data_dir_str,
        ws_state.clone(),
        vault.clone(),
    ));
    let proxy_storage = Arc::new(star_multlogin_backend::service_database::ProxyStorage::new(vault.clone()));
    let tag_storage = Arc::new(star_multlogin_backend::service_database::TagStorage::new(vault.clone()));
    let extension_storage = Arc::new(star_multlogin_backend::extensions::ExtensionStorage::new(&data_dir_str));
    let extension_category_storage = Arc::new(star_multlogin_backend::service_database::ExtensionCategoryStorage::new(vault.clone()));

    let auth_service = Arc::new(star_multlogin_backend::cloud_auth::CloudAuthService::new(vault.clone()));
    let cloud_sync_service = Arc::new(
        star_multlogin_backend::cloud_sync::CloudSyncService::new(vault.clone(), auth_service.clone())
            .with_ws(ws_state.clone()),
    );

    let browser_download_service = Arc::new(star_multlogin_backend::browser_downloader::BrowserDownloadService::new(
        &app_data,
        ws_state.clone(),
    ));
    let browser_state = star_multlogin_backend::api::routes::browser::BrowserRouteState {
        service: browser_download_service,
        data_dir: app_data.clone(),
    };

    let router = star_multlogin_backend::build_app_router(
        &data_dir_str,
        profile_storage.clone(),
        proxy_storage,
        tag_storage,
        extension_storage,
        extension_category_storage,
        auth_service,
        cloud_sync_service,
        browser_state,
        ws_state,
    );

    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let port = listener.local_addr().unwrap().port();
    let base_url = format!("http://127.0.0.1:{}", port);

    tokio::spawn(async move {
        axum::serve(listener, router.into_make_service_with_connect_info::<std::net::SocketAddr>()).await.unwrap();
    });

    let client = reqwest::Client::new();

    // 1. Frontend chama GET /api/browser/status
    let status_res = client
        .get(format!("{}/api/browser/status", base_url))
        .send()
        .await
        .unwrap();
    assert_eq!(status_res.status(), 200);
    let status_json: serde_json::Value = status_res.json().await.unwrap();
    println!("📡 GET /api/browser/status => {:?}", status_json["health"]["status"]);
    assert_eq!(status_json["health"]["status"], "installed");
    assert_eq!(
        status_json["available_version"],
        star_multlogin_backend::browser_downloader::astrobrowser::ASTROBROWSER_CHROMIUM_VERSION
    );

    // Handshake para simular frontend autenticado
    let hs_res = client
        .post(format!("{}/api/local-auth/dev-handshake", base_url))
        .send()
        .await
        .unwrap();
    let hs_json: serde_json::Value = hs_res.json().await.unwrap();
    let session_token = hs_json["session_token"].as_str().unwrap();

    // 2. Frontend chama POST /api/profiles
    let create_body = serde_json::json!({
        "name": "Perfil E2E HTTP Test",
        "group": "Testes",
        "kernel": "Camoufox",
        "browser_version": "152",
        "os": "linux",
        "proxy_type": "none"
    });
    let create_res = client
        .post(format!("{}/api/profiles", base_url))
        .header("X-Session-Token", session_token)
        .json(&create_body)
        .send()
        .await
        .unwrap();
    assert!(create_res.status().is_success());
    let created_profile: serde_json::Value = create_res.json().await.unwrap();
    let profile_id = created_profile["id"].as_str().unwrap().to_string();
    println!("📋 POST /api/profiles => Perfil criado com ID: {}", profile_id);

    // 3. Frontend chama GET /api/profiles/{id}/playwright
    let pw_res = client
        .get(format!("{}/api/profiles/{}/playwright", base_url, profile_id))
        .header("X-Session-Token", session_token)
        .send()
        .await
        .unwrap();
    assert_eq!(pw_res.status(), 200);
    let pw_json: serde_json::Value = pw_res.json().await.unwrap();
    let exe_path = pw_json["executable_path"].as_str().unwrap();
    assert!(std::path::Path::new(exe_path).exists(), "Caminho retornado para o Playwright deve existir");
    println!("🎭 GET /api/profiles/{}/playwright => Executável: {}", profile_id, exe_path);

    // 4. Frontend chama POST /api/profiles/{id}/launch
    let launch_res = client
        .post(format!("{}/api/profiles/{}/launch?url=about:blank", base_url, profile_id))
        .header("X-Session-Token", session_token)
        .send()
        .await
        .unwrap();
    assert_eq!(launch_res.status(), 200);
    let launch_json: serde_json::Value = launch_res.json().await.unwrap();
    assert_eq!(launch_json["status"], "launched");
    assert!(launch_json["profile"].is_object(), "Deve conter objeto 'profile' para atualização no React");
    let pid = launch_json["pid"].as_u64().unwrap();
    assert!(pid > 0);
    println!("🚀 POST /api/profiles/{}/launch => Sucesso PID: {}", profile_id, pid);

    tokio::time::sleep(std::time::Duration::from_millis(800)).await;

    // 5. Frontend chama POST /api/profiles/{id}/stop
    let stop_res = client
        .post(format!("{}/api/profiles/{}/stop", base_url, profile_id))
        .header("X-Session-Token", session_token)
        .send()
        .await
        .unwrap();
    assert_eq!(stop_res.status(), 200);
    let stop_json: serde_json::Value = stop_res.json().await.unwrap();
    assert_eq!(stop_json["status"], "stopped");
    println!("🛑 POST /api/profiles/{}/stop => Sucesso: {}", profile_id, stop_json["status"]);

    // 6. Limpeza
    let _ = profile_storage.permanent_delete(&profile_id);
    println!("✨ Fluxo completo HTTP E2E validado com 100% de sucesso!");
}

#[tokio::test]
async fn test_frontend_preset_structure_and_vault_persistence() {
    let app_data = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("app-data");
    let data_dir_str = app_data.to_string_lossy().to_string();

    let vault = Arc::new(Vault::new(&app_data).expect("Vault"));
    let ws_state = WsState::new();

    let storage = star_multlogin_backend::service_database::ProfileStorage::new(
        &data_dir_str,
        ws_state.clone(),
        vault.clone(),
    );

    // Payload idêntico ao gerado pelo frontend (impressaoDigitalService.montarPayloadPerfil)
    let frontend_payload = serde_json::json!({
        "name": "Perfil Windows Preset Autêntico",
        "group": "Marketing",
        "tags": ["Instagram", "Ads"],
        "kernel": "Camoufox",
        "browser_version": "152",
        "os": "windows",
        "proxy_type": "socks5",
        "proxy_host": "189.40.12.34",
        "proxy_port": 1080,
        "proxy_username": "user",
        "proxy_password": "pass",
        "extension_mode": "team",
        "extension_category": "kit_basico",
        "fingerprint_json": {
            "os": "windows",
            "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:152.0) Gecko/20100101 Firefox/152.0",
            "cpu_cores": 16,
            "max_touch_points": 0,
            "custom_screen_width": 1920,
            "custom_screen_height": 1080,
            "device_pixel_ratio": 1.0,
            "color_depth": 24,
            "webgl_vendor": "Google Inc. (NVIDIA)",
            "webgl_renderer": "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "hardware_noise": {
                "canvas": true,
                "webgl_image": true,
                "audio_context": true,
                "media_devices": true,
                "client_rects": true
            },
            "canvas_seed": "1CCAE86B",
            "audio_seed": "2BBA9911",
            "client_rects_seed": "44332211",
            "audio_sample_rate": 48000,
            "custom_timezone": "America/Sao_Paulo",
            "custom_language": "pt-BR,pt;q=0.9,en-US;q=0.8",
            "location_mode": "custom",
            "custom_latitude": "-23.5505",
            "custom_longitude": "-46.6333",
            "custom_accuracy": 15.0,
            "micros_count": 2,
            "webcams_count": 1,
            "speakers_count": 2,
            "webrtc_mode": "substitute"
        }
    });

    let dto: star_multlogin_backend::models::CreateProfileDto = serde_json::from_value(frontend_payload)
        .expect("DTO deve deserializar com 100% de compatibilidade");

    // 1. Gravação no núcleo de banco de dados (Star Vault)
    let created = storage.create(dto).expect("Gravação no Star Vault falhou");
    println!("💾 Perfil salvo no Star Vault com ID: {}", created.id);

    // 2. Leitura e descriptografia do banco de dados
    let retrieved = storage.get(&created.id).expect("Perfil deve ser recuperado do Star Vault");
    assert_eq!(retrieved.name, "Perfil Windows Preset Autêntico");
    assert_eq!(retrieved.os, "windows");
    assert_eq!(retrieved.proxy.proxy_type, "socks5");
    assert_eq!(retrieved.proxy.host.as_deref(), Some("189.40.12.34"));
    assert_eq!(retrieved.proxy.port, Some(1080));
    let tag_names: Vec<&str> = retrieved.tags.iter().map(|t| t.name.as_str()).collect();
    assert!(tag_names.contains(&"Instagram"));
    assert!(tag_names.contains(&"Ads"));

    // 3. Validação da tradução para CAMOU_CONFIG
    let camou_config = star_multlogin_backend::camoufox::common::build_camou_config_map(
        &retrieved,
        Some("189.40.12.34"),
        &[],
        None,
    );

    assert_eq!(
        camou_config.get("navigator.userAgent").unwrap().as_str().unwrap(),
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:152.0) Gecko/20100101 Firefox/152.0"
    );
    assert_eq!(camou_config.get("navigator.platform").unwrap().as_str().unwrap(), "Win32");
    assert_eq!(camou_config.get("navigator.hardwareConcurrency").unwrap().as_u64().unwrap(), 16);
    assert_eq!(camou_config.get("screen.width").unwrap().as_u64().unwrap(), 1920);
    assert_eq!(camou_config.get("screen.height").unwrap().as_u64().unwrap(), 1080);
    assert_eq!(camou_config.get("screen.availHeight").unwrap().as_u64().unwrap(), 1040); // Desconto de 40px da barra
    assert_eq!(camou_config.get("webGl:vendor").unwrap().as_str().unwrap(), "Google Inc. (NVIDIA)");
    assert_eq!(
        camou_config.get("webGl:renderer").unwrap().as_str().unwrap(),
        "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)"
    );
    assert_eq!(camou_config.get("timezone").unwrap().as_str().unwrap(), "America/Sao_Paulo");
    assert_eq!(camou_config.get("navigator.language").unwrap().as_str().unwrap(), "pt-BR");
    assert_eq!(camou_config.get("geolocation:latitude").unwrap().as_f64().unwrap(), -23.5505);
    assert_eq!(camou_config.get("geolocation:longitude").unwrap().as_f64().unwrap(), -46.6333);
    assert_eq!(camou_config.get("mediaDevices:micros").unwrap().as_u64().unwrap(), 2);
    assert_eq!(camou_config.get("mediaDevices:webcams").unwrap().as_u64().unwrap(), 1);
    assert_eq!(camou_config.get("mediaDevices:speakers").unwrap().as_u64().unwrap(), 2);
    assert_eq!(camou_config.get("webrtc:ipv4").unwrap().as_str().unwrap(), "189.40.12.34");
    assert!(camou_config.contains_key("fonts"));

    // 4. Validação da tradução para CAMOU_PREFS
    let net_setup = star_multlogin_backend::network::NetworkSetupResult::default();
    let camou_prefs = star_multlogin_backend::camoufox::common::build_camou_prefs(
        &retrieved,
        None,
        &net_setup,
    );

    assert_eq!(camou_prefs.get("intl.locale.requested").unwrap().as_str().unwrap(), "pt-BR");
    assert_eq!(camou_prefs.get("ui.useOverlayScrollbars").unwrap().as_i64().unwrap(), 0); // Barra nativa Win10
    assert_eq!(camou_prefs.get("browser.sessionstore.resume_from_crash").unwrap().as_bool().unwrap(), true);

    // 5. Limpeza
    let _ = storage.permanent_delete(&created.id);
    println!("🏆 Teste completo de Presets + Star Vault + Tradutor C++ aprovado com louvor!");
}


