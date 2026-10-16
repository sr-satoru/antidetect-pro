use std::net::SocketAddr;
use std::sync::Arc;
use star_multlogin_backend::{
    build_app_router_with_nonce_manager,
    core::security::NonceManager,
    extensions::ExtensionStorage,
    server_sync::{cloud_auth::CloudAuthService, cloud_sync::CloudSyncService},
    service_database::{
        ExtensionCategoryStorage, ProfileStorage, ProxyStorage, TagStorage, Vault,
    },
    ws::WsState,
};

async fn spawn_test_server() -> (String, Arc<NonceManager>, Arc<ProfileStorage>, tempfile_guard::TempDirGuard) {
    let temp_dir = std::env::temp_dir().join(format!(
        "star_sec_test_{}",
        std::time::SystemTime::now().elapsed().unwrap().as_nanos()
    ));
    let _ = std::fs::create_dir_all(&temp_dir);
    let data_dir_str = temp_dir.to_string_lossy().to_string();

    let vault = Arc::new(Vault::new(&temp_dir).unwrap());
    let ws_state = WsState::new();
    let profile_storage = Arc::new(ProfileStorage::new(&data_dir_str, ws_state.clone(), vault.clone()));
    let proxy_storage = Arc::new(ProxyStorage::new(vault.clone()));
    let tag_storage = Arc::new(TagStorage::new(vault.clone()));
    let extension_storage = Arc::new(ExtensionStorage::new(&data_dir_str));
    let extension_category_storage = Arc::new(ExtensionCategoryStorage::new(vault.clone()));

    let auth_service = Arc::new(CloudAuthService::new(vault.clone()));
    let cloud_sync_service = Arc::new(
        CloudSyncService::new(vault.clone(), auth_service.clone()).with_ws(ws_state.clone()),
    );

    let browser_download_service = Arc::new(
        star_multlogin_backend::browser_downloader::BrowserDownloadService::new(
            &temp_dir,
            ws_state.clone(),
        ),
    );
    let browser_state = star_multlogin_backend::api::routes::browser::BrowserRouteState {
        service: browser_download_service,
        data_dir: temp_dir.clone(),
    };

    let nonce_manager = Arc::new(NonceManager::new());

    let router = build_app_router_with_nonce_manager(
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
        nonce_manager.clone(),
    );

    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let port = listener.local_addr().unwrap().port();
    let base_url = format!("http://127.0.0.1:{}", port);

    tokio::spawn(async move {
        axum::serve(listener, router.into_make_service_with_connect_info::<SocketAddr>())
            .await
            .unwrap();
    });

    (base_url, nonce_manager, profile_storage, tempfile_guard::TempDirGuard(temp_dir))
}

mod tempfile_guard {
    use std::path::PathBuf;
    pub struct TempDirGuard(pub PathBuf);
    impl Drop for TempDirGuard {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.0);
        }
    }
}

#[tokio::test]
async fn test_unauthenticated_request_rejected() {
    let (base_url, _nm, _storage, _guard) = spawn_test_server().await;
    let client = reqwest::Client::new();

    // 1. Tentar ler perfis sem header de autenticação -> 401
    let res = client
        .get(format!("{}/api/profiles", base_url))
        .send()
        .await
        .unwrap();
    assert_eq!(res.status(), 401);

    let json: serde_json::Value = res.json().await.unwrap();
    assert_eq!(json["code"], "UNAUTHORIZED");

    // 2. Tentar listar proxies sem auth -> 401
    let res = client
        .get(format!("{}/api/proxies", base_url))
        .send()
        .await
        .unwrap();
    assert_eq!(res.status(), 401);
}

#[tokio::test]
async fn test_cloud_jwt_rejected_on_local_endpoints() {
    let (base_url, _nm, _storage, _guard) = spawn_test_server().await;
    let client = reqwest::Client::new();

    // Enviar Cloud JWT no header Authorization para rota desktop -> deve rejeitar
    let res = client
        .get(format!("{}/api/profiles", base_url))
        .header("Authorization", "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake")
        .send()
        .await
        .unwrap();
    assert_eq!(res.status(), 401);

    let json: serde_json::Value = res.json().await.unwrap();
    assert_eq!(json["code"], "TOKEN_DISALLOWED_CLOUD_JWT");
}

#[tokio::test]
async fn test_mcp_api_key_forbidden_on_desktop_sensitive_routes() {
    let (base_url, _nm, storage, _guard) = spawn_test_server().await;
    let client = reqwest::Client::new();

    let mcp_token = storage.get_mcp_token();

    // Chamar GET /api/profiles com MCP Key -> 403 Forbidden (chave de automação não pode acessar rota desktop)
    let res = client
        .get(format!("{}/api/profiles", base_url))
        .header("Authorization", format!("Bearer {}", mcp_token))
        .send()
        .await
        .unwrap();
    assert_eq!(res.status(), 403);

    let json: serde_json::Value = res.json().await.unwrap();
    assert_eq!(json["code"], "FORBIDDEN_MCP_KEY_ON_DESKTOP_ROUTE");
}

#[tokio::test]
async fn test_open_endpoints_accessible_without_auth() {
    let (base_url, _nm, _storage, _guard) = spawn_test_server().await;
    let client = reqwest::Client::new();

    // 1. Browser status (aberto)
    let res = client
        .get(format!("{}/api/browser/status", base_url))
        .send()
        .await
        .unwrap();
    assert_eq!(res.status(), 200);

    // 2. Presets de fingerprint (aberto)
    let res = client
        .get(format!("{}/api/fingerprints/presets", base_url))
        .send()
        .await
        .unwrap();
    assert_eq!(res.status(), 200);

    // 3. MCP status público (aberto)
    let res = client
        .get(format!("{}/api/v1/status", base_url))
        .send()
        .await
        .unwrap();
    assert_eq!(res.status(), 200);
}

#[tokio::test]
async fn test_handshake_flow_and_authenticated_requests() {
    let (base_url, nm, _storage, _guard) = spawn_test_server().await;
    let client = reqwest::Client::new();

    // 1. Simula Tauri IPC gerando um ticket
    let ticket = nm.create_ticket("desktop_handshake", 30);
    assert!(ticket.starts_with("ticket_"));

    // 2. Frontend consome o ticket via POST /api/local-auth/handshake
    let handshake_res = client
        .post(format!("{}/api/local-auth/handshake", base_url))
        .json(&serde_json::json!({ "ticket": ticket }))
        .send()
        .await
        .unwrap();
    assert_eq!(handshake_res.status(), 200);

    let handshake_json: serde_json::Value = handshake_res.json().await.unwrap();
    let session_token = handshake_json["session_token"].as_str().unwrap();
    assert!(session_token.starts_with("ses_"));

    // 3. Replay attack: tentar consumir o mesmo ticket novamente deve falhar com 401
    let replay_res = client
        .post(format!("{}/api/local-auth/handshake", base_url))
        .json(&serde_json::json!({ "ticket": ticket }))
        .send()
        .await
        .unwrap();
    assert_eq!(replay_res.status(), 401);

    // 4. Frontend agora pode chamar GET /api/profiles com X-Session-Token
    let profiles_res = client
        .get(format!("{}/api/profiles", base_url))
        .header("X-Session-Token", session_token)
        .send()
        .await
        .unwrap();
    assert_eq!(profiles_res.status(), 200);
}

#[tokio::test]
async fn test_action_ticket_required_for_dangerous_operations() {
    let (base_url, nm, _storage, _guard) = spawn_test_server().await;
    let client = reqwest::Client::new();

    // Gera sessão válida
    let session_token = nm.create_session(7200);

    // 1. Tentar executar apply-update COM sessão, mas SEM action ticket -> 403 Forbidden
    let res = client
        .post(format!("{}/api/app/apply-update", base_url))
        .header("X-Session-Token", &session_token)
        .json(&serde_json::json!({ "file_path": "/fake/path" }))
        .send()
        .await
        .unwrap();
    assert_eq!(res.status(), 403);
    let json: serde_json::Value = res.json().await.unwrap();
    assert_eq!(json["code"], "ACTION_TICKET_REQUIRED");

    // 2. Solicita action ticket através da rota /api/local-auth/action-ticket
    let ticket_res = client
        .post(format!("{}/api/local-auth/action-ticket", base_url))
        .header("X-Session-Token", &session_token)
        .json(&serde_json::json!({ "action": "apply_update" }))
        .send()
        .await
        .unwrap();
    assert_eq!(ticket_res.status(), 200);

    let ticket_json: serde_json::Value = ticket_res.json().await.unwrap();
    let action_ticket = ticket_json["action_ticket"].as_str().unwrap();
    assert!(action_ticket.starts_with("ticket_"));

    // 3. Executa apply-update com X-Session-Token E X-Action-Ticket
    // (O middleware passa; se falhar na lógica interna de arquivo não encontrado é 400/500, NÃO 401/403)
    let res_with_ticket = client
        .post(format!("{}/api/app/apply-update", base_url))
        .header("X-Session-Token", &session_token)
        .header("X-Action-Ticket", action_ticket)
        .json(&serde_json::json!({ "file_path": "/fake/path" }))
        .send()
        .await
        .unwrap();

    assert_ne!(res_with_ticket.status(), 401);
    assert_ne!(res_with_ticket.status(), 403);

    // 4. Replay do action ticket: reutilizar o mesmo action ticket -> 403 (já foi consumido!)
    let replay_action = client
        .post(format!("{}/api/app/apply-update", base_url))
        .header("X-Session-Token", &session_token)
        .header("X-Action-Ticket", action_ticket)
        .json(&serde_json::json!({ "file_path": "/fake/path" }))
        .send()
        .await
        .unwrap();
    assert_eq!(replay_action.status(), 403);
}

#[tokio::test]
async fn test_dev_handshake_flow() {
    let (base_url, _nm, _storage, _guard) = spawn_test_server().await;
    let client = reqwest::Client::new();

    // Dev handshake em loopback (localhost) -> 200 e retorna sessão
    let res = client
        .post(format!("{}/api/local-auth/dev-handshake", base_url))
        .send()
        .await
        .unwrap();
    assert_eq!(res.status(), 200);

    let json: serde_json::Value = res.json().await.unwrap();
    let session_token = json["session_token"].as_str().unwrap();
    assert!(session_token.starts_with("ses_"));

    // Usa a sessão para acessar perfil
    let profiles_res = client
        .get(format!("{}/api/profiles", base_url))
        .header("X-Session-Token", session_token)
        .send()
        .await
        .unwrap();
    assert_eq!(profiles_res.status(), 200);
}
