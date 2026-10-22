use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::Arc;
use reqwest::StatusCode;
use serde_json::Value;

use star_multlogin_backend::{
    build_app_router_with_nonce_manager,
    core::security::NonceManager,
    extensions::ExtensionStorage,
    import_export::adspower_parser::{
        decode_export_bytes, normalize_cookies, parse_block, parse_proxy_string,
        parse_resolution, split_records,
    },
    server_sync::{cloud_auth::CloudAuthService, cloud_sync::CloudSyncService},
    service_database::{
        ExtensionCategoryStorage, ProfileStorage, ProxyStorage, SessionService, TagStorage, Vault,
    },
    ws::WsState,
};

const SAMPLE_ADSPOWER: &str = r#"acc_id=476436
id=k1d0cd11
group=919_2011hotmail_28.05.26
name=sophiaskye852
remark=test_remark
tags=
platform=
username=
password=secretpw
fakey=ABCD1234
cookie=[{"name":"auth_token","value":"v1","domain":".x.com","path":"/","httpOnly":true,"secure":true,"sameSite":"no_restriction","session":false,"expires":1788000000},{"name":"ext","value":"x","domain":"browserext.adspower.net","path":"/","session":true}]
proxytype=http
proxy=5.249.176.244:5432:user1:pass1
ua=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36
resolution=1680*1050
******************
acc_id=476433
id=k1d0ccwr
group=919_2011hotmail_28.05.26
name=sofi_z31
password=pw2
fakey=
cookie=[]
proxytype=socks5
proxy=37.19.65.146:5432:z0zt7:k9i76bob
ua=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36
resolution=1920*1080
******************"#;

struct TempDirGuard(pub PathBuf);
impl Drop for TempDirGuard {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.0);
    }
}

async fn spawn_test_server() -> (String, Arc<ProfileStorage>, Arc<Vault>, TempDirGuard) {
    let temp_dir = std::env::temp_dir().join(format!(
        "star_import_test_{}",
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

    (base_url, profile_storage, vault, TempDirGuard(temp_dir))
}

#[test]
fn test_adspower_parser_split_records_and_sample() {
    let records = split_records(SAMPLE_ADSPOWER);
    assert_eq!(records.len(), 2);

    let r0 = &records[0];
    assert_eq!(r0.get("id").unwrap(), "k1d0cd11");
    assert_eq!(r0.get("name").unwrap(), "sophiaskye852");
    assert_eq!(r0.get("fakey").unwrap(), "ABCD1234");

    let r1 = &records[1];
    assert_eq!(r1.get("id").unwrap(), "k1d0ccwr");
    assert_eq!(r1.get("name").unwrap(), "sofi_z31");
}

#[test]
fn test_parse_block_preserves_equal_sign_in_values() {
    let block = "id=abc\ncookie=[{\"key\":\"a=b=c\"}]\nempty=";
    let map = parse_block(block);
    assert_eq!(map.get("id").unwrap(), "abc");
    assert_eq!(map.get("cookie").unwrap(), "[{\"key\":\"a=b=c\"}]");
    assert_eq!(map.get("empty").unwrap(), "");
}

#[test]
fn test_adspower_cookie_normalization_and_extension_stripping() {
    let raw_cookies = r#"[
        {"name":"auth_token","value":"v1","domain":".x.com","path":"/","sameSite":"no_restriction","secure":false,"session":false,"expires":1788000000},
        {"name":"ext","value":"x","domain":"browserext.adspower.net","path":"/","session":true},
        {"name":"session_c","value":"v2","domain":".x.com","path":"/","session":true,"expires":999999}
    ]"#;

    let normalized = normalize_cookies(raw_cookies);
    // Extensão do AdsPower deve ser descartada
    assert_eq!(normalized.len(), 2);

    let c0 = &normalized[0];
    assert_eq!(c0["name"], "auth_token");
    // no_restriction -> None, e None força secure = true
    assert_eq!(c0["sameSite"], "None");
    assert_eq!(c0["secure"], true);

    let c1 = &normalized[1];
    assert_eq!(c1["name"], "session_c");
    // Cookie de sessão deve ter o expiry removido
    assert!(c1.get("expires").is_none());
}

#[test]
fn test_adspower_proxy_parsing_and_colon_passwords() {
    // 1. Proxy padrão com 4 partes
    let (t1, h1, p1, u1, pass1) = parse_proxy_string(Some("http"), Some("5.249.176.244:5432:user1:pass1"));
    assert_eq!(t1.unwrap(), "http");
    assert_eq!(h1.unwrap(), "5.249.176.244");
    assert_eq!(p1.unwrap(), 5432);
    assert_eq!(u1.unwrap(), "user1");
    assert_eq!(pass1.unwrap(), "pass1");

    // 2. Senha contendo múltiplos dois pontos (ex: pa:ss:word)
    let (_, h2, p2, u2, pass2) = parse_proxy_string(Some("socks5"), Some("proxy.com:1080:myuser:pa:ss:word"));
    assert_eq!(h2.unwrap(), "proxy.com");
    assert_eq!(p2.unwrap(), 1080);
    assert_eq!(u2.unwrap(), "myuser");
    assert_eq!(pass2.unwrap(), "pa:ss:word");

    // 3. String vazia
    let (_, h3, _, _, _) = parse_proxy_string(Some("http"), Some("   "));
    assert!(h3.is_none());
}

#[test]
fn test_parse_resolution_variations() {
    assert_eq!(parse_resolution("1680*1050"), (Some(1680), Some(1050)));
    assert_eq!(parse_resolution("1920x1080"), (Some(1920), Some(1080)));
    assert_eq!(parse_resolution("1366_768"), (Some(1366), Some(768)));
    assert_eq!(parse_resolution("invalid"), (None, None));
}

#[test]
fn test_decode_export_bytes_utf8_and_utf16() {
    let plain = "id=k1d0cd11\nname=teste";
    // UTF-8
    assert_eq!(decode_export_bytes(plain.as_bytes()), plain);

    // UTF-16LE com BOM
    let mut u16_le = vec![0xff, 0xfe];
    for b in plain.encode_utf16() {
        u16_le.extend_from_slice(&b.to_le_bytes());
    }
    assert_eq!(decode_export_bytes(&u16_le), plain);
}

#[tokio::test]
async fn test_batch_import_endpoint_full_lifecycle() {
    let (base_url, storage, vault, _guard) = spawn_test_server().await;
    let client = reqwest::Client::new();

    let hs_res = client
        .post(format!("{}/api/local-auth/dev-handshake", base_url))
        .send()
        .await
        .unwrap();
    let hs_json: Value = hs_res.json().await.unwrap();
    let session_token = hs_json["session_token"].as_str().unwrap();

    // Dispara POST /api/profiles/import enviando o SAMPLE do AdsPower
    let resp = client
        .post(format!("{}/api/profiles/import", base_url))
        .header("X-Session-Token", session_token)
        .json(&serde_json::json!({
            "raw_text": SAMPLE_ADSPOWER,
            "default_kernel": "AstroFox",
            "default_platform": "Twitter"
        }))
        .send()
        .await
        .unwrap();

    assert_eq!(resp.status(), StatusCode::OK);

    let body: Value = resp.json().await.unwrap();
    assert_eq!(body["total"], 2);
    assert_eq!(body["imported"], 2);
    assert_eq!(body["failed"], 0);

    // Verifica perfis criados no storage
    let profiles = storage.list(None, None);
    assert_eq!(profiles.len(), 2);

    let p0 = profiles.iter().find(|p| p.name == "sophiaskye852").expect("Perfil 1 deve existir");
    assert_eq!(p0.group, "919_2011hotmail_28.05.26");
    assert_eq!(p0.kernel, "AstroFox");
    assert_eq!(p0.proxy.host.as_deref(), Some("5.249.176.244"));
    assert_eq!(p0.proxy.port, Some(5432));

    // Verifica que os cookies foram salvos criptografados na sessão
    let session_svc = SessionService::new(vault);
    let session = session_svc.load_session(&p0.id).unwrap().expect("Sessão deve existir");
    assert_eq!(session.cookies.len(), 1);
    assert_eq!(session.cookies[0].name, "auth_token");
    assert_eq!(session.cookies[0].domain, ".x.com");
}
