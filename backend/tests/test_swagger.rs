use star_multlogin_backend::swagger::{mount_swagger_ui, ApiDoc};
use utoipa::OpenApi;

#[tokio::test]
async fn test_swagger_module_structure_and_spec_generation() {
    // 1. Valida geração da especificação OpenAPI pelo ApiDoc
    let openapi = ApiDoc::openapi();
    assert_eq!(openapi.info.title, "Star Multlogin API");
    assert_eq!(openapi.info.version, "1.0.0");

    // 2. Valida que os endpoints principais estão documentados no paths
    let paths = &openapi.paths.paths;
    assert!(paths.contains_key("/api/profiles"), "Deve conter rota /api/profiles");
    assert!(paths.contains_key("/api/profiles/public"), "Deve conter rota /api/profiles/public");
    assert!(paths.contains_key("/api/proxies"), "Deve conter rota /api/proxies");

    // 3. Valida montagem do router do Swagger UI
    let router = axum::Router::new();
    let app = mount_swagger_ui(router);

    // O app deve compilar e instanciar sem pânico
    drop(app);
}

#[tokio::test]
async fn test_mcp_handshake_and_info() {
    let temp_dir = std::env::temp_dir().join(format!(
        "star_mcp_test_{}",
        std::time::SystemTime::now().elapsed().unwrap().as_nanos()
    ));
    let vault = std::sync::Arc::new(star_multlogin_backend::service_database::Vault::new(&temp_dir).unwrap());
    let ws = star_multlogin_backend::ws::WsState::new();
    let storage = std::sync::Arc::new(star_multlogin_backend::service_database::ProfileStorage::new(&temp_dir, ws, vault));

    let res = star_multlogin_backend::api::routes::mcp::get_mcp_info(axum::extract::State(storage.clone())).await;
    // Valida que o endpoint de MCP info retorna formato esperado e dinamicamente gerado
    let axum::Json(val) = res;
    let token = val["token"].as_str().unwrap();
    assert!(token.starts_with("star_sec_"));
    assert!(token.len() >= 32, "Token deve ter entropia suficiente");
    assert_eq!(val["server_url"], "http://127.0.0.1:12540");
    assert_eq!(val["mcp_url"], format!("http://127.0.0.1:12540/mcp/{token}/sse"));

    // Valida que o token foi persistido e verificado
    assert!(storage.verify_mcp_token(token));

    let _ = std::fs::remove_dir_all(temp_dir);
}
