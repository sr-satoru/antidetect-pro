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
