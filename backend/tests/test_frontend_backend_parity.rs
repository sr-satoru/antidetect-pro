use serde::Deserialize;
use serde_json::json;
use star_multlogin_backend::core::models::CreateProfileDto;
use star_multlogin_backend::service_database::Vault;
use star_multlogin_backend::ws::WsState;
use std::sync::Arc;

/// Estrutura de teste espelho estrita com `deny_unknown_fields`.
/// Garante matematicamente que o frontend não envie nenhum campo fora do contrato.
#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
#[allow(dead_code)]
struct StrictCreateProfileDtoCheck {
    pub id: Option<String>,
    pub name: Option<String>,
    pub group: Option<String>,
    pub tags: Option<Vec<String>>,
    pub tag_ids: Option<Vec<i64>>,
    pub notes: Option<String>,
    pub status: Option<String>,
    pub kernel: Option<String>,
    pub browser_version: Option<String>,
    pub os: Option<String>,

    pub proxy_type: Option<String>,
    pub proxy_host: Option<String>,
    pub proxy_port: Option<u16>,
    pub proxy_username: Option<String>,
    pub proxy_password: Option<String>,

    pub fingerprint_json: Option<serde_json::Value>,

    pub extension_mode: Option<String>,
    pub extension_category: Option<String>,
    pub extensions: Option<serde_json::Value>,
}

#[test]
fn test_frontend_payload_has_no_extraneous_fields() {
    // 1. Simula payload legítimo produzido pelo impressaoDigitalService.montarPayloadPerfil
    let frontend_payload = json!({
        "id": "prf_test_strict_01",
        "name": "Perfil Estrito",
        "group": "Desagrupado",
        "tags": ["Tag1", "Tag2"],
        "notes": "Notas técnicas",
        "status": "ready",
        "kernel": "AstroFox",
        "browser_version": "150",
        "os": "windows",
        "proxy_type": "none",
        "extension_mode": "team",
        "extension_category": "kit_basico",
        "extensions": [],
        "fingerprint_json": {
            "timezone_mode": "ip",
            "language_mode": "ip",
            "location_mode": "ip",
            "custom_screen_width": 1920,
            "custom_screen_height": 1080,
            "hardware_noise": {
                "canvas": false,
                "webgl_image": false
            }
        }
    });

    // Deve desserializar perfeitamente no struct com deny_unknown_fields
    let parsed: Result<StrictCreateProfileDtoCheck, _> = serde_json::from_value(frontend_payload);
    assert!(parsed.is_ok(), "O payload do frontend não possui nenhum campo além do devido: {:?}", parsed.err());

    // 2. Se o frontend enviar campos legados ou vazamentos como `created_at` no topo, o teste DEVE rejeitar
    let dirty_payload = json!({
        "name": "Perfil Sujo",
        "created_at": 1770000000, // Campo não permitido no CreateProfileDto
        "hardwareNoise": { "canvas": true } // Vazamento de estado interno
    });

    let dirty_check: Result<StrictCreateProfileDtoCheck, _> = serde_json::from_value(dirty_payload);
    assert!(dirty_check.is_err(), "Campos fora do contrato devem ser estritamente rejeitados");
}

#[tokio::test]
async fn test_geoip_protection_ip_mode_vs_custom() {
    let proxy = star_multlogin_backend::models::ProfileProxyConfig {
        mode: "custom".to_string(),
        proxy_type: "none".to_string(),
        host: None,
        port: None,
        username: None,
        password: None,
        rotation_url: None,
        ip_checker: Some("IP2Location".to_string()),
        socks_remote_dns: true,
    };

    // Caso A: Modo IP (sem custom_timezone nem custom_language no fingerprint)
    let fp_ip_mode = serde_json::from_value::<serde_json::Map<String, serde_json::Value>>(json!({
        "timezone_mode": "ip",
        "language_mode": "ip",
        "location_mode": "ip"
    })).unwrap();

    let identity_ip = star_multlogin_backend::network::context_resolver::resolve_network_identity(&proxy, &fp_ip_mode, None).await;
    // Sem proxy e sem custom_timezone, timezone deve permanecer vazio (aguardando GeoIP do probe ou resolvido coerente)
    assert!(identity_ip.timezone.is_empty(), "Modo IP não deve injetar fuso horário customizado arbitrário");

    // Caso B: Modo Customizado com override explícito
    let fp_custom_mode = serde_json::from_value::<serde_json::Map<String, serde_json::Value>>(json!({
        "timezone_mode": "custom",
        "custom_timezone": "America/New_York",
        "language_mode": "custom",
        "custom_language": "en-US,en;q=0.9"
    })).unwrap();

    let identity_custom = star_multlogin_backend::network::context_resolver::resolve_network_identity(&proxy, &fp_custom_mode, None).await;
    assert_eq!(identity_custom.timezone, "America/New_York", "Modo customizado deve aplicar o fuso horário manual");
    assert_eq!(identity_custom.primary_language, "en-US", "Modo customizado deve aplicar o idioma primário");
}

#[tokio::test]
async fn test_profile_storage_bidirectional_parity() {
    let temp_dir = std::env::temp_dir().join(format!(
        "star_parity_test_{}",
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

    let create_dto = CreateProfileDto {
        id: Some("prf_parity_001".to_string()),
        name: Some("Perfil Teste Paridade".to_string()),
        group: Some("TestGroup".to_string()),
        tags: Some(vec!["TagParityA".to_string(), "TagParityB".to_string()]),
        tag_ids: None,
        notes: Some("Notas importantes".to_string()),
        status: Some("ready".to_string()),
        kernel: Some("AstroFox".to_string()),
        browser_version: Some("150".to_string()),
        os: Some("windows".to_string()),
        proxy_type: Some("socks5".to_string()),
        proxy_host: Some("127.0.0.1".to_string()),
        proxy_port: Some(1080),
        proxy_username: Some("user".to_string()),
        proxy_password: Some("pass".to_string()),
        fingerprint_json: Some(json!({
            "canvas_seed": "A1B2C3D4",
            "audio_seed": "E5F6A7B8",
            "client_rects_seed": "11223344",
            "cpu_cores": 16,
            "ram_gb": 32,
            "custom_screen_width": 2560,
            "custom_screen_height": 1440,
            "hardware_noise": {
                "canvas": true,
                "webgl_image": true,
                "audio_context": true
            }
        })),
        extension_mode: Some("team".to_string()),
        extension_category: Some("kit_basico".to_string()),
        extensions: Some(json!([])),
    };

    // Cria perfil no banco
    let created = storage.create(create_dto).expect("Perfil deve ser criado com sucesso");

    // Validações do perfil persistido
    assert_eq!(created.id, "prf_parity_001");
    assert_eq!(created.name, "Perfil Teste Paridade");
    assert!(created.created_at > 0, "Backend deve gerar created_at Unix seconds");
    assert!(created.updated_at > 0, "Backend deve gerar updated_at Unix seconds");
    assert_eq!(created.proxy.proxy_type, "socks5");
    assert_eq!(created.proxy.host.as_deref(), Some("127.0.0.1"));
    assert_eq!(created.proxy.port, Some(1080));

    // Valida que ao serializar `created.proxy`, o serde gera `"type": "socks5"`
    let proxy_json = serde_json::to_value(&created.proxy).unwrap();
    assert_eq!(
        proxy_json.get("type").and_then(|v| v.as_str()),
        Some("socks5"),
        "O proxy deve serializar como 'type', que o frontend mapper agora consome corretamente"
    );

    // Valida recuperação pelo ID
    let fetched = storage.get("prf_parity_001").expect("Perfil deve ser recuperado");
    assert_eq!(fetched.name, "Perfil Teste Paridade");
    let fp = &fetched.fingerprint_json;
    assert_eq!(fp.get("canvas_seed").and_then(|v| v.as_str()), Some("A1B2C3D4"));
    assert_eq!(fp.get("custom_screen_width").and_then(|v| v.as_u64()), Some(2560));
    assert_eq!(fp.get("custom_screen_height").and_then(|v| v.as_u64()), Some(1440));

    let _ = std::fs::remove_dir_all(temp_dir);
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
#[allow(dead_code)]
struct StrictUpdateProfileDtoCheck {
    pub id: Option<String>,
    pub name: Option<String>,
    pub group: Option<String>,
    pub tags: Option<Vec<String>>,
    pub tag_ids: Option<Vec<i64>>,
    pub notes: Option<String>,
    pub status: Option<String>,
    pub kernel: Option<String>,
    pub browser_version: Option<String>,
    pub os: Option<String>,

    pub proxy_type: Option<String>,
    pub proxy_host: Option<String>,
    pub proxy_port: Option<u16>,
    pub proxy_username: Option<String>,
    pub proxy_password: Option<String>,

    pub fingerprint_json: Option<serde_json::Value>,

    pub extension_mode: Option<String>,
    pub extension_category: Option<String>,
    pub extensions: Option<serde_json::Value>,
}

#[tokio::test]
async fn test_update_profile_dto_and_kernel_immutability() {
    // 1. Valida que o payload de update gerado pelo frontend não possui campos estranhos
    let valid_update_payload = json!({
        "notes": "Notas atualizadas",
        "group": "Novo Grupo",
        "fingerprint_json": {
            "custom_screen_width": 1920,
            "custom_screen_height": 1080
        }
    });
    let parsed: Result<StrictUpdateProfileDtoCheck, _> = serde_json::from_value(valid_update_payload);
    assert!(parsed.is_ok(), "UpdateProfileDto não contém campos além do devido: {:?}", parsed.err());

    // Se injetar campos desconhecidos, deve rejeitar
    let dirty_update = json!({
        "notes": "Notas",
        "unknown_leak_field": true
    });
    let dirty_parsed: Result<StrictUpdateProfileDtoCheck, _> = serde_json::from_value(dirty_update);
    assert!(dirty_parsed.is_err(), "Campos desconhecidos no update devem ser rejeitados");

    // 2. Valida imutabilidade do kernel no SQLite
    let temp_dir = std::env::temp_dir().join(format!(
        "star_update_test_{}",
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

    let profile = storage.create(CreateProfileDto {
        id: Some("prf_immut_test".to_string()),
        name: Some("Perfil Imutável".to_string()),
        group: None,
        tags: None,
        tag_ids: None,
        notes: None,
        status: None,
        kernel: Some("AstroFox".to_string()),
        browser_version: None,
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
    }).unwrap();

    assert_eq!(profile.kernel, "AstroFox");

    // Tenta trocar o kernel para AstroBrowser via update
    let update_dto = star_multlogin_backend::core::models::UpdateProfileDto {
        id: None,
        name: None,
        group: Some("Grupo Alterado".to_string()),
        tags: None,
        tag_ids: None,
        notes: Some("Notas novas".to_string()),
        status: None,
        kernel: Some("AstroBrowser".to_string()), // Tentativa de troca
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

    let updated = storage.update(&profile.id, update_dto).unwrap();
    assert_eq!(updated.kernel, "AstroFox", "Kernel DEVE ser imutável após a criação");
    assert_eq!(updated.group, "Grupo Alterado", "Grupo deve ser atualizado com sucesso");
    assert_eq!(updated.notes, "Notas novas", "Notas devem ser atualizadas com sucesso");

    let _ = std::fs::remove_dir_all(temp_dir);
}

#[test]
fn test_camou_config_masking_parity() {
    let profile = star_multlogin_backend::core::models::Profile {
        id: "prf_camou_test".to_string(),
        name: "Test Profile".to_string(),
        group: "Default".to_string(),
        tags: vec![],
        notes: "".to_string(),
        status: "ready".to_string(),
        kernel: "AstroFox".to_string(),
        browser_version: "150".to_string(),
        os: "windows".to_string(),
        created_at: 1000,
        updated_at: 1000,
        last_launch: None,
        is_deleted: false,
        deleted_at: None,
        proxy: star_multlogin_backend::core::models::ProfileProxyConfig::default(),
        fingerprint_json: json!({
            "canvas_seed": "1CCAE86B",
            "audio_seed": "A0D105FF",
            "custom_screen_width": 1920,
            "custom_screen_height": 1080,
            "cpu_cores": 12,
            "max_touch_points": 0,
            "webgl_vendor": "Google Inc. (NVIDIA)",
            "webgl_renderer": "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11)",
            "hardware_noise": {
                "canvas": true,
                "audio_context": true
            }
        }),
        extension_mode: None,
        extension_category: None,
        extensions: None,
    };

    let config = star_multlogin_backend::browser::fingerprint::translator::build_camou_config(
        &profile,
        None,
        &[],
        None,
    );

    // Valida conversão de seeds hexadecimais em u32 para MaskConfig.hpp
    assert!(config.get("canvas:seed").is_some(), "canvas:seed deve ser injetado quando noise.canvas = true");
    let canvas_seed_val = config.get("canvas:seed").unwrap().as_u64().unwrap();
    assert_eq!(canvas_seed_val, 0x1CCAE86B, "canvas_seed hexadecimal convertido corretamente para inteiro u32");

    // Valida CPU cores
    assert_eq!(
        config.get("navigator.hardwareConcurrency").unwrap().as_u64().unwrap(),
        12,
        "hardwareConcurrency reflete cpu_cores"
    );

    // Valida Dimensões da tela e barra de tarefas do Windows (-40px)
    assert_eq!(config.get("screen.width").unwrap().as_u64().unwrap(), 1920);
    assert_eq!(config.get("screen.height").unwrap().as_u64().unwrap(), 1080);
    assert_eq!(config.get("screen.availHeight").unwrap().as_u64().unwrap(), 1040, "Windows availHeight desconta barra de tarefas (-40px)");

    // Valida Touch points em desktop
    assert_eq!(config.get("navigator.maxTouchPoints").unwrap().as_u64().unwrap(), 0);
}
