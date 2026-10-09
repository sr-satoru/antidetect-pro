use axum::{
    extract::{Path, Query, State},
    http::{header, HeaderMap, StatusCode},
    Json,
};
use serde_json::{json, Value};
use star_multlogin_backend::{
    api::routes::mcp::{
        get_mcp_info, get_mcp_profile, get_mcp_profile_bearer, handle_mcp_jsonrpc,
        handle_mcp_sse, list_mcp_profiles, list_mcp_profiles_bearer, stop_mcp_profile,
        McpQueryParams,
    },
    core::models::CreateProfileDto,
    service_database::{ProfileStorage, Vault},
    ws::WsState,
};
use std::sync::Arc;

fn make_dto(name: &str, kernel: &str) -> CreateProfileDto {
    CreateProfileDto {
        id: None,
        name: Some(name.to_string()),
        group: Some("Marketing".to_string()),
        tags: Some(vec!["Automacao".to_string()]),
        tag_ids: None,
        notes: None,
        status: Some("ready".to_string()),
        kernel: Some(kernel.to_string()),
        browser_version: Some("135".to_string()),
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
    }
}

#[tokio::test]
async fn test_mcp_endpoints_suite() {
    let temp_dir = std::env::temp_dir().join(format!(
        "star_mcp_endpoints_test_{}",
        std::time::SystemTime::now().elapsed().unwrap().as_nanos()
    ));
    let vault = Arc::new(Vault::new(&temp_dir).unwrap());
    let ws = WsState::new();
    let profile_storage = Arc::new(ProfileStorage::new(&temp_dir, ws, vault));

    // 1. Cria 2 perfis no banco local (AstroFox e AstroBrowser)
    let p_fox = profile_storage
        .create(make_dto("Perfil AstroFox 01", "AstroFox"))
        .unwrap();

    let p_chrome = profile_storage
        .create(make_dto("Perfil AstroBrowser 01", "AstroBrowser"))
        .unwrap();

    // 2. Obtém o token dinâmico persistido
    let token = profile_storage.get_mcp_token();

    // =========================================================================
    // Teste 1: GET /mcp/info -> retorna token e URLs na porta 12540
    // =========================================================================
    let Json(info) = get_mcp_info(State(profile_storage.clone())).await;
    assert_eq!(info["token"], token);
    assert_eq!(info["server_url"], "http://127.0.0.1:12540");
    assert_eq!(info["mcp_url"], format!("http://127.0.0.1:12540/mcp/{token}/sse"));

    // =========================================================================
    // Teste 2: GET /mcp/{token}/profiles (Lista perfis autenticado por Path)
    // =========================================================================
    let resp = list_mcp_profiles(
        State(profile_storage.clone()),
        Path(token.clone()),
        HeaderMap::new(),
        Query(McpQueryParams::default()),
    )
    .await;

    assert_eq!(resp.status(), StatusCode::OK);
    let bytes = axum::body::to_bytes(resp.into_body(), usize::MAX).await.unwrap();
    let profiles: Vec<Value> = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(profiles.len(), 2);
    let ids: Vec<&str> = profiles.iter().map(|p| p["id"].as_str().unwrap()).collect();
    assert!(ids.contains(&p_fox.id.as_str()));
    assert!(ids.contains(&p_chrome.id.as_str()));

    // =========================================================================
    // Teste 3: GET /mcp/profiles (Lista perfis via Header Authorization Bearer)
    // =========================================================================
    let mut headers = HeaderMap::new();
    headers.insert(
        header::AUTHORIZATION,
        format!("Bearer {}", token).parse().unwrap(),
    );

    let resp_bearer = list_mcp_profiles_bearer(
        State(profile_storage.clone()),
        headers.clone(),
        Query(McpQueryParams::default()),
    )
    .await;

    assert_eq!(resp_bearer.status(), StatusCode::OK);
    let bytes_b = axum::body::to_bytes(resp_bearer.into_body(), usize::MAX).await.unwrap();
    let profiles_b: Vec<Value> = serde_json::from_slice(&bytes_b).unwrap();
    assert_eq!(profiles_b.len(), 2);

    // =========================================================================
    // Teste 4: GET /mcp/profiles/{id} (Busca perfil por ID via Bearer)
    // =========================================================================
    let resp_single = get_mcp_profile_bearer(
        State(profile_storage.clone()),
        Path(p_fox.id.clone()),
        headers.clone(),
        Query(McpQueryParams::default()),
    )
    .await;

    assert_eq!(resp_single.status(), StatusCode::OK);
    let bytes_s = axum::body::to_bytes(resp_single.into_body(), usize::MAX).await.unwrap();
    let p_fox_json: Value = serde_json::from_slice(&bytes_s).unwrap();
    assert_eq!(p_fox_json["id"], p_fox.id);
    assert_eq!(p_fox_json["kernel"], "AstroFox");

    // Teste 4b: GET /mcp/{token}/profiles/{id} (Busca perfil por ID via Path token)
    let resp_path_single = get_mcp_profile(
        State(profile_storage.clone()),
        Path((token.clone(), p_chrome.id.clone())),
        HeaderMap::new(),
        Query(McpQueryParams::default()),
    )
    .await;
    assert_eq!(resp_path_single.status(), StatusCode::OK);
    let bytes_ps = axum::body::to_bytes(resp_path_single.into_body(), usize::MAX).await.unwrap();
    let p_chrome_json: Value = serde_json::from_slice(&bytes_ps).unwrap();
    assert_eq!(p_chrome_json["id"], p_chrome.id);
    assert_eq!(p_chrome_json["kernel"], "AstroBrowser");

    // =========================================================================
    // Teste 5: Rejeição de Token Inválido (401 Unauthorized)
    // =========================================================================
    let mut invalid_headers = HeaderMap::new();
    invalid_headers.insert(
        header::AUTHORIZATION,
        "Bearer token_invalido_123".parse().unwrap(),
    );

    let resp_unauth = list_mcp_profiles_bearer(
        State(profile_storage.clone()),
        invalid_headers,
        Query(McpQueryParams::default()),
    )
    .await;

    assert_eq!(resp_unauth.status(), StatusCode::UNAUTHORIZED);

    // =========================================================================
    // Teste 6: POST /mcp/{token}/profiles/{id}/stop (Para o perfil pelo ID)
    // =========================================================================
    let resp_stop = stop_mcp_profile(
        State(profile_storage.clone()),
        Path((token.clone(), p_fox.id.clone())),
        HeaderMap::new(),
        Query(McpQueryParams::default()),
    )
    .await;

    assert_eq!(resp_stop.status(), StatusCode::OK);
    let bytes_stop = axum::body::to_bytes(resp_stop.into_body(), usize::MAX).await.unwrap();
    let stop_json: Value = serde_json::from_slice(&bytes_stop).unwrap();
    assert_eq!(stop_json["status"], "stopped");

    // =========================================================================
    // Teste 7: GET /mcp/{token}/sse (Handshake SSE com endpoint formatado)
    // =========================================================================
    let resp_sse = handle_mcp_sse(
        State(profile_storage.clone()),
        Path(token.clone()),
        HeaderMap::new(),
        Query(McpQueryParams::default()),
    )
    .await;
    assert_eq!(resp_sse.status(), StatusCode::OK);

    // =========================================================================
    // Teste 8: POST /mcp/{token} (JSON-RPC tools/call star_profiles)
    // =========================================================================
    let rpc_call = json!({
        "jsonrpc": "2.0",
        "id": 99,
        "method": "tools/call",
        "params": {
            "name": "star_profiles",
            "arguments": {}
        }
    });

    let resp_rpc = handle_mcp_jsonrpc(
        State(profile_storage.clone()),
        Path(token.clone()),
        HeaderMap::new(),
        Query(McpQueryParams::default()),
        Json(rpc_call),
    )
    .await;

    assert_eq!(resp_rpc.status(), StatusCode::OK);
    let bytes_rpc = axum::body::to_bytes(resp_rpc.into_body(), usize::MAX).await.unwrap();
    let rpc_res: Value = serde_json::from_slice(&bytes_rpc).unwrap();
    assert_eq!(rpc_res["id"], 99);
    let content_txt = rpc_res["result"]["content"][0]["text"].as_str().unwrap();
    let parsed_list: Vec<Value> = serde_json::from_str(content_txt).unwrap();
    assert_eq!(parsed_list.len(), 2);

    let _ = std::fs::remove_dir_all(temp_dir);
}
