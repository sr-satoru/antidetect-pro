use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::Arc;
use reqwest::StatusCode;
use serde_json::Value;

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

struct TempDirGuard(pub PathBuf);
impl Drop for TempDirGuard {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.0);
    }
}

async fn spawn_adspower_test_server() -> (String, Arc<ProfileStorage>, TempDirGuard) {
    let temp_dir = std::env::temp_dir().join(format!(
        "star_adspower_test_{}",
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
        nonce_manager,
    );

    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let port = listener.local_addr().unwrap().port();
    let base_url = format!("http://127.0.0.1:{}", port);

    tokio::spawn(async move {
        axum::serve(listener, router.into_make_service_with_connect_info::<SocketAddr>())
            .await
            .unwrap();
    });

    (base_url, profile_storage, TempDirGuard(temp_dir))
}

#[tokio::test]
async fn test_adspower_anti_csrf_guard_blocks_unauthorized_web_origins() {
    let (base_url, _storage, _guard) = spawn_adspower_test_server().await;
    let client = reqwest::Client::new();

    // 1. Origem maliciosa da web -> bloqueado com 403 Forbidden
    let evil_resp = client
        .get(format!("{}/api/v1/group/list", base_url))
        .header("Origin", "https://evil-attacker.com")
        .send()
        .await
        .unwrap();

    assert_eq!(evil_resp.status(), StatusCode::FORBIDDEN);

    // 2. Origem local legítima -> permitida
    let good_resp = client
        .get(format!("{}/api/v1/group/list", base_url))
        .header("Origin", "http://127.0.0.1:3000")
        .send()
        .await
        .unwrap();

    assert_eq!(good_resp.status(), StatusCode::OK);

    // 3. Chamada de automação sem Origin (Python / Node / Puppeteer / cURL) -> permitida
    let automation_resp = client
        .get(format!("{}/api/v1/group/list", base_url))
        .send()
        .await
        .unwrap();

    assert_eq!(automation_resp.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_adspower_group_endpoints_full_lifecycle() {
    let (base_url, storage, _guard) = spawn_adspower_test_server().await;
    let client = reqwest::Client::new();

    // 1. Cria perfil inicial associado a um grupo
    let _ = storage.create(star_multlogin_backend::core::models::CreateProfileDto {
        id: None,
        name: Some("Seed Profile".to_string()),
        group: Some("Marketing".to_string()),
        tags: None,
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
    });

    // 2. GET /api/v1/group/list
    let list_resp: Value = client
        .get(format!("{}/api/v1/group/list", base_url))
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();

    assert_eq!(list_resp["code"], 0);
    assert_eq!(list_resp["msg"], "success");
    let groups = list_resp["data"]["list"].as_array().unwrap();
    assert!(groups.iter().any(|g| g["group_id"] == "0"));
    assert!(groups.iter().any(|g| g["group_name"] == "Marketing"));

    // 3. POST /api/v1/group/create
    let create_resp: Value = client
        .post(format!("{}/api/v1/group/create", base_url))
        .json(&serde_json::json!({ "group_name": "Financeiro" }))
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();

    assert_eq!(create_resp["code"], 0);
    assert_eq!(create_resp["data"]["group_id"], "Financeiro");

    // 4. POST /api/v1/group/create sem nome -> erro -1
    let empty_resp: Value = client
        .post(format!("{}/api/v1/group/create", base_url))
        .json(&serde_json::json!({}))
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();

    assert_eq!(empty_resp["code"], -1);
}

#[tokio::test]
async fn test_adspower_user_crud_and_query_filters() {
    let (base_url, _storage, _guard) = spawn_adspower_test_server().await;
    let client = reqwest::Client::new();

    // 1. POST /api/v1/user/create
    let create_resp: Value = client
        .post(format!("{}/api/v1/user/create", base_url))
        .json(&serde_json::json!({
            "name": "AdsPower-Account-01",
            "group_id": "Social",
            "domain_name": "x.com",
            "username": "ads_user",
            "password": "ads_password",
            "user_proxy_config": {
                "proxy_type": "socks5",
                "proxy_host": "127.0.0.1",
                "proxy_port": 1080,
                "proxy_user": "puser",
                "proxy_password": "ppass"
            },
            "fingerprint_config": {
                "screen_resolution": "1920_1080"
            }
        }))
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();

    assert_eq!(create_resp["code"], 0);
    let user_id = create_resp["data"]["id"].as_str().unwrap().to_string();

    // 2. GET /api/v1/user/list?user_id=...
    let list_resp: Value = client
        .get(format!("{}/api/v1/user/list?user_id={}", base_url, user_id))
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();

    assert_eq!(list_resp["code"], 0);
    assert_eq!(list_resp["data"]["total"], 1);
    let item = &list_resp["data"]["list"][0];
    assert_eq!(item["user_id"], user_id);
    assert_eq!(item["name"], "AdsPower-Account-01");
    assert_eq!(item["group_id"], "Social");

    // 3. POST /api/v1/user/update
    let update_resp: Value = client
        .post(format!("{}/api/v1/user/update", base_url))
        .json(&serde_json::json!({
            "user_id": user_id,
            "name": "AdsPower-Account-01-Renamed"
        }))
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();

    assert_eq!(update_resp["code"], 0);

    // 4. POST /api/v1/user/delete
    let delete_resp: Value = client
        .post(format!("{}/api/v1/user/delete", base_url))
        .json(&serde_json::json!({
            "user_ids": [user_id]
        }))
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();

    assert_eq!(delete_resp["code"], 0);
    assert_eq!(delete_resp["data"]["deleted"], 1);
}

#[tokio::test]
async fn test_adspower_browser_control_endpoints() {
    let (base_url, storage, _guard) = spawn_adspower_test_server().await;
    let client = reqwest::Client::new();

    let prof = storage
        .create(star_multlogin_backend::core::models::CreateProfileDto {
            id: None,
            name: Some("Browser Control Test".to_string()),
            group: None,
            tags: None,
            tag_ids: None,
            notes: None,
            status: None,
            kernel: Some("AstroBrowser".to_string()),
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

    // 1. GET /api/v1/browser/active
    let active_resp: Value = client
        .get(format!("{}/api/v1/browser/active?user_id={}", base_url, prof.id))
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();

    assert_eq!(active_resp["code"], 0);
    assert_eq!(active_resp["data"]["status"], "Inactive");

    // 2. GET /api/v1/browser/stop (idempotente)
    let stop_resp: Value = client
        .get(format!("{}/api/v1/browser/stop?user_id={}", base_url, prof.id))
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();

    assert_eq!(stop_resp["code"], 0);

    // 3. GET /api/v1/browser/cookies
    let cookies_resp: Value = client
        .get(format!("{}/api/v1/browser/cookies?user_id={}", base_url, prof.id))
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();

    assert_eq!(cookies_resp["code"], 0);
    assert!(cookies_resp["data"].is_array());
}
