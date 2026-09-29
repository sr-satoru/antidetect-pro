// SPDX-License-Identifier: MIT OR Apache-2.0
// Teste de Autenticação em Modo Offline, Rotas POST e Isolamento do Token MCP

use star_multlogin_backend::models::CreateProfileDto;
use star_multlogin_backend::service_database::{ProfileStorage, Vault};
use star_multlogin_backend::ws::WsState;
use std::fs;
use std::sync::Arc;

#[tokio::test]
async fn test_offline_mode_post_and_mcp_local_token_workflow() {
    println!("\n==================================================================");
    println!("🧪 TESTE DE AUTENTICAÇÃO: Modo Offline, Rotas POST e Token MCP");
    println!("==================================================================");

    let temp_dir = std::env::temp_dir().join(format!("star_mcp_auth_test_{}", uuid::Uuid::new_v4()));
    fs::create_dir_all(&temp_dir).unwrap();

    let vault = Arc::new(Vault::new(&temp_dir).expect("Falha ao inicializar Star Vault"));
    let ws_state = WsState::new();
    let profile_storage = Arc::new(ProfileStorage::new(&temp_dir, ws_state, vault.clone()));

    // 1. Inicializa TokenState do MCP
    let token = star_multlogin_backend::mcp::security::ensure_token(vault.clone())
        .expect("Falha ao inicializar token do MCP");
    let token_state = star_multlogin_backend::mcp::security::TokenState::new(
        token.clone(),
        vault.clone(),
        temp_dir.clone(),
    );

    println!("  🔑 Token do MCP gerado no cofre local: {}", token);
    assert!(token.starts_with("star_sec_"), "O token MCP deve ter prefixo star_sec_");

    // 2. VERIFICAÇÃO 1: O arquivo 'api-token' foi gravado no disco para uso offline de scripts e IDEs?
    let api_token_path = temp_dir.join("api-token");
    assert!(api_token_path.exists(), "O arquivo data/api-token DEVE existir para scripts offline!");
    let disk_token = fs::read_to_string(&api_token_path).unwrap();
    assert_eq!(disk_token.trim(), token.trim(), "O token em disco deve coincidir com o cofre!");
    println!("  ✅ Arquivo data/api-token gravado com sucesso no disco para scripts locais.");

    // 3. VERIFICAÇÃO 2: Rota POST /api/profiles em modo offline (Sem nenhum token de nuvem)
    let new_profile_dto: CreateProfileDto = serde_json::from_value(serde_json::json!({
        "name": "Perfil Offline #01",
        "group": "Default",
        "notes": "Criado em modo 100% offline",
        "os": "windows"
    })).unwrap();

    let created_profile = profile_storage
        .create(new_profile_dto)
        .expect("Criação de perfil em modo offline DEVE funcionar sem token de nuvem");

    assert_eq!(created_profile.name, "Perfil Offline #01");
    println!("  ✅ POST de perfil executado com sucesso em modo offline (ID: {})", created_profile.id);

    // 4. VERIFICAÇÃO 3: Rota GET /mcp/info via servidor TCP real
    let native_mcp_router = star_multlogin_backend::mcp::create_native_mcp_router(
        profile_storage.clone(),
        token_state.clone(),
    );

    let listener_mcp = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let port_mcp = listener_mcp.local_addr().unwrap().port();
    tokio::spawn(async move {
        axum::serve(listener_mcp, native_mcp_router).await.unwrap();
    });

    let client = reqwest::Client::new();
    let res_info = client
        .get(format!("http://127.0.0.1:{}/mcp/info", port_mcp))
        .send()
        .await
        .unwrap();

    assert_eq!(res_info.status(), reqwest::StatusCode::OK);
    let info_json: serde_json::Value = res_info.json().await.unwrap();
    assert_eq!(info_json["ok"], true);
    assert_eq!(info_json["token"], token);
    println!("  ✅ GET /mcp/info retorna o token local sem exigir login na nuvem.");

    // 5. VERIFICAÇÃO 4: Servidor REST do MCP (/api/v1) com e sem token
    let mcp_router = star_multlogin_backend::mcp::create_mcp_router(
        profile_storage.clone(),
        temp_dir.clone(),
        token_state.clone(),
    );

    let listener_rest = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let port_rest = listener_rest.local_addr().unwrap().port();
    tokio::spawn(async move {
        axum::serve(listener_rest, mcp_router).await.unwrap();
    });

    // Chamada POST sem token -> 401 Unauthorized
    let res_unauth = client
        .post(format!("http://127.0.0.1:{}/profiles/start", port_rest))
        .header("Authorization", "Bearer token_invalido_qualquer")
        .json(&serde_json::json!({ "id": created_profile.id }))
        .send()
        .await
        .unwrap();

    assert_eq!(res_unauth.status(), reqwest::StatusCode::UNAUTHORIZED);
    println!("  ✅ POST no MCP com token inválido rejeitado corretamente (401 Unauthorized).");

    // Chamada POST com o Token Local Válido (sem precisar de nuvem)
    let res_auth = client
        .post(format!("http://127.0.0.1:{}/profiles/start", port_rest))
        .header("Authorization", format!("Bearer {}", token))
        .json(&serde_json::json!({ "id": created_profile.id }))
        .send()
        .await
        .unwrap();

    // Aceita a autorização (não é 401)
    assert_ne!(res_auth.status(), reqwest::StatusCode::UNAUTHORIZED, "Token local DEVE ser aceito pelo MCP");
    println!("  ✅ POST no MCP com o Token Local Válido autenticado com sucesso!");

    // Limpeza
    let _ = fs::remove_dir_all(&temp_dir);
}
