use std::path::PathBuf;
use rusqlite::Connection;
use star_multlogin_backend::browser::engines::clearcote::cookies::get_chromium_cookie_db_path;
use star_multlogin_backend::browser::engines::clearcote::flags::build_clearcote_flags;
use star_multlogin_backend::extraction_session::fire_fox::{
    extract_cookies, parse_cookies_input,
};
use star_multlogin_backend::launcher::engine::injection::ensure_cookie_db_schema;
use star_multlogin_backend::models::{CreateProfileDto, Profile, ProfileProxyConfig};
use star_multlogin_backend::service_database::{SessionService, Vault};
use std::sync::Arc;

fn get_temp_test_dir(sub: &str) -> PathBuf {
    let dir = std::env::temp_dir()
        .join("star_multlogin_cookie_tests")
        .join(sub);
    let _ = std::fs::remove_dir_all(&dir);
    let _ = std::fs::create_dir_all(&dir);
    dir
}

#[test]
fn test_parse_cookies_input_all_formats() {
    // 1. JSON Array
    let json_array = r#"[
        {"name": "sess_json", "value": "123", "domain": ".example.com", "path": "/"}
    ]"#;
    let res1 = parse_cookies_input(json_array).expect("JSON array deve ser válido");
    assert_eq!(res1.len(), 1);
    assert_eq!(res1[0].name, "sess_json");
    assert_eq!(res1[0].value, "123");

    // 2. JSON Object com campo cookies
    let json_obj = r#"{
        "cookies": [
            {"name": "sess_obj", "value": "abc", "domain": "test.org", "path": "/api"}
        ]
    }"#;
    let res2 = parse_cookies_input(json_obj).expect("JSON object deve ser válido");
    assert_eq!(res2.len(), 1);
    assert_eq!(res2[0].name, "sess_obj");
    assert_eq!(res2[0].value, "abc");

    // 3. Netscape Format
    let netscape = ".google.com\tTRUE\t/\tTRUE\t1800000000\tSID\tsecret_google\n";
    let res3 = parse_cookies_input(netscape).expect("Netscape format deve ser válido");
    assert_eq!(res3.len(), 1);
    assert_eq!(res3[0].name, "SID");
    assert_eq!(res3[0].value, "secret_google");

    // 4. Name=Value format
    let name_value = "token=xyz987; tracker=track_123";
    let res4 = parse_cookies_input(name_value).expect("Name=Value format deve ser válido");
    assert_eq!(res4.len(), 2);
    assert_eq!(res4[0].name, "token");
    assert_eq!(res4[0].value, "xyz987");
    assert_eq!(res4[1].name, "tracker");
    assert_eq!(res4[1].value, "track_123");
}

#[test]
fn test_firefox_moz_meta_schema_created() {
    let temp_dir = get_temp_test_dir("moz_meta_test");
    let db_path = temp_dir.join("cookies.sqlite");

    ensure_cookie_db_schema(&db_path).expect("Schema deve ser criado");

    let conn = Connection::open(&db_path).expect("Deve abrir o banco");
    let version: String = conn
        .query_row(
            "SELECT value FROM moz_meta WHERE key = 'version'",
            [],
            |row| row.get(0),
        )
        .expect("Tabela moz_meta com key='version' deve existir");

    assert_eq!(version, "14");
}

#[test]
fn test_firefox_wal_mode_cookies_readable() {
    let temp_dir = get_temp_test_dir("wal_test");
    let db_path = temp_dir.join("cookies.sqlite");

    ensure_cookie_db_schema(&db_path).expect("Schema deve ser criado");

    // Abre banco e ativa WAL explicitamente (como o Firefox faz)
    {
        let conn = Connection::open(&db_path).expect("Deve abrir para escrita");
        conn.execute_batch(
            "PRAGMA journal_mode=WAL;
             INSERT INTO moz_cookies (name, value, host, path, expiry, lastAccessed, creationTime, isSecure, isHttpOnly)
             VALUES ('wal_cookie', 'wal_secret', '.camoufox.com', '/', 1900000000, 1000, 1000, 1, 1);",
        )
        .expect("Deve inserir cookie no modo WAL");
    }

    // Extrai cookies sem immutable=1 e comprova leitura
    let stats = extract_cookies(&temp_dir).expect("Deve extrair cookies do WAL");
    assert_eq!(stats.total_count, 1);
    assert_eq!(stats.cookies[0].name, "wal_cookie");
    assert_eq!(stats.cookies[0].value, "wal_secret");
}

#[test]
fn test_clearcote_network_cookies_default_path() {
    let temp_dir = get_temp_test_dir("clearcote_path_test");
    // Diretório vazio sem arquivos prévios
    let default_path = get_chromium_cookie_db_path(&temp_dir);
    assert_eq!(
        default_path,
        temp_dir.join("Default").join("Network").join("Cookies")
    );
}

#[test]
fn test_clearcote_flags_contain_portable_and_third_party() {
    let temp_dir = get_temp_test_dir("clearcote_flags_test");
    let profile = Profile {
        id: "p1".to_string(),
        name: "Test Profile".to_string(),
        group: "Default".to_string(),
        tags: vec![],
        notes: String::new(),
        status: "ready".to_string(),
        kernel: "AstroBrowser".to_string(),
        browser_version: "150".to_string(),
        os: "linux".to_string(),
        created_at: 100,
        updated_at: 100,
        last_launch: None,
        is_deleted: false,
        deleted_at: None,
        proxy: ProfileProxyConfig::default(),
        fingerprint_json: serde_json::json!({}),
        extension_mode: None,
        extension_category: None,
        extensions: None,
    };

    let flags = build_clearcote_flags(&temp_dir, &profile, None, None, &[], None, None);
    assert!(
        flags.iter().any(|f| f == "--portable-profile"),
        "Flags do Clearcote devem conter --portable-profile"
    );
    assert!(
        flags.iter().any(|f| f == "--allow-third-party-cookies"),
        "Flags do Clearcote devem conter --allow-third-party-cookies"
    );
}

#[test]
fn test_profile_creation_with_cookies_persists_to_vault() {
    let temp_dir = get_temp_test_dir("profile_vault_cookies_test");
    let vault = Arc::new(Vault::new(&temp_dir).expect("Vault deve abrir"));
    let ws = star_multlogin_backend::ws::WsState::new();
    let storage = star_multlogin_backend::service_database::profiles::ProfileService::new(&temp_dir, ws, vault.clone());

    let dto = CreateProfileDto {
        id: Some("cookie_prof_1".to_string()),
        name: Some("Perfil com Cookies".to_string()),
        group: None,
        tags: None,
        tag_ids: None,
        notes: None,
        status: None,
        kernel: Some("AstroFox".to_string()),
        browser_version: None,
        os: Some("linux".to_string()),
        proxy_type: None,
        proxy_host: None,
        proxy_port: None,
        proxy_username: None,
        proxy_password: None,
        fingerprint_json: Some(serde_json::json!({
            "cookies": "[{\"name\":\"login_token\",\"value\":\"token_super_secreto\",\"domain\":\".site.com\",\"path\":\"/\"}]"
        })),
        extension_mode: None,
        extension_category: None,
        extensions: None,
    };

    let created = storage.create(dto).expect("Perfil deve ser criado");
    assert_eq!(created.id, "cookie_prof_1");

    // Verifica que o Vault recebeu a sessão imediatamente
    let session_svc = SessionService::new(vault);
    let session = session_svc
        .load_session("cookie_prof_1")
        .expect("Deve consultar Vault")
        .expect("Sessão deve existir no Vault");

    assert_eq!(session.total_cookies, 1);
    assert_eq!(session.cookies[0].name, "login_token");
    assert_eq!(session.cookies[0].value, "token_super_secreto");
}
