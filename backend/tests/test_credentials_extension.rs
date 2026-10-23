use star_multlogin_backend::models::{Profile, ProfileProxyConfig};
use star_multlogin_backend::extensions::CredentialsExtensionManager;
use serde_json::json;
use std::fs;

fn create_mock_profile(kernel: &str, accounts: Option<serde_json::Value>) -> Profile {
    let mut fp = serde_json::Map::new();
    if let Some(accs) = accounts {
        fp.insert("platform_accounts".to_string(), accs);
    }

    Profile {
        id: "test-profile-123".to_string(),
        name: "Perfil Facebook 01".to_string(),
        group: "Testes".to_string(),
        tags: vec![],
        notes: String::new(),
        status: "ready".to_string(),
        kernel: kernel.to_string(),
        browser_version: "150".to_string(),
        os: "windows".to_string(),
        created_at: 1000,
        updated_at: 1000,
        last_launch: None,
        is_deleted: false,
        deleted_at: None,
        proxy: ProfileProxyConfig::default(),
        fingerprint_json: serde_json::Value::Object(fp),
        extension_mode: Some("none".to_string()),
        extension_category: None,
        extensions: None,
    }
}

#[test]
fn test_prepare_extension_none_when_no_accounts() {
    let temp_dir = std::env::temp_dir().join(format!(
        "test_cred_ext_none_{}",
        std::time::SystemTime::now().elapsed().unwrap().as_nanos()
    ));
    let _ = fs::create_dir_all(&temp_dir);

    let profile = create_mock_profile("AstroBrowser", None);
    let res = CredentialsExtensionManager::prepare_extension(&temp_dir, &profile, "AstroBrowser");

    assert!(res.is_ok());
    assert_eq!(res.unwrap(), None);

    let _ = fs::remove_dir_all(&temp_dir);
}

#[test]
fn test_prepare_extension_none_when_accounts_empty_or_whitespace() {
    let temp_dir = std::env::temp_dir().join(format!(
        "test_cred_ext_empty_{}",
        std::time::SystemTime::now().elapsed().unwrap().as_nanos()
    ));
    let _ = fs::create_dir_all(&temp_dir);

    let empty_accounts = json!([
        {
            "platform": "facebook",
            "username": "",
            "password": "   ",
            "twoFactorKey": ""
        }
    ]);

    let profile = create_mock_profile("AstroBrowser", Some(empty_accounts));
    let res = CredentialsExtensionManager::prepare_extension(&temp_dir, &profile, "AstroBrowser");

    assert!(res.is_ok());
    assert_eq!(res.unwrap(), None);

    let _ = fs::remove_dir_all(&temp_dir);
}

#[test]
fn test_prepare_extension_astrobrowser_success() {
    let temp_dir = std::env::temp_dir().join(format!(
        "test_cred_ext_chrome_{}",
        std::time::SystemTime::now().elapsed().unwrap().as_nanos()
    ));
    let _ = fs::create_dir_all(&temp_dir);

    let accounts = json!([
        {
            "id": "1",
            "platform": "facebook",
            "customDomain": "facebook.com",
            "username": "usuario@teste.com",
            "password": "senhaSuperSecreta123",
            "twoFactorKey": "JBSWY3DPEHPK3PXP"
        }
    ]);

    let profile = create_mock_profile("AstroBrowser", Some(accounts));
    let res = CredentialsExtensionManager::prepare_extension(&temp_dir, &profile, "AstroBrowser");

    assert!(res.is_ok());
    let ext_path = res.unwrap().expect("Deveria retornar caminho da extensão");

    assert_eq!(ext_path, temp_dir.join("credentials_vault_extension"));
    assert!(ext_path.join("manifest.json").exists());
    assert!(ext_path.join("popup.html").exists());
    assert!(ext_path.join("popup.css").exists());
    assert!(ext_path.join("popup.js").exists());
    assert!(ext_path.join("icon.png").exists());
    assert!(ext_path.join("credentials.json").exists());

    // Verifica que o manifest é Manifest V3 para AstroBrowser
    let manifest_str = fs::read_to_string(ext_path.join("manifest.json")).unwrap();
    assert!(manifest_str.contains("\"manifest_version\": 3"));
    assert!(manifest_str.contains("\"action\""));

    // Verifica conteúdo de credentials.json
    let creds_str = fs::read_to_string(ext_path.join("credentials.json")).unwrap();
    let creds_json: serde_json::Value = serde_json::from_str(&creds_str).unwrap();
    assert_eq!(creds_json["profileName"], "Perfil Facebook 01");
    assert_eq!(creds_json["accounts"][0]["username"], "usuario@teste.com");
    assert_eq!(creds_json["accounts"][0]["twoFactorKey"], "JBSWY3DPEHPK3PXP");

    let _ = fs::remove_dir_all(&temp_dir);
}

#[test]
fn test_prepare_extension_astrofox_success() {
    let temp_dir = std::env::temp_dir().join(format!(
        "test_cred_ext_fox_{}",
        std::time::SystemTime::now().elapsed().unwrap().as_nanos()
    ));
    let _ = fs::create_dir_all(&temp_dir);

    let accounts = json!([
        {
            "id": "2",
            "platform": "google",
            "customDomain": "accounts.google.com",
            "username": "googleuser@gmail.com",
            "password": "googlePassword456",
            "twoFactorKey": "HXDMVJECJJWSRB3H"
        }
    ]);

    let profile = create_mock_profile("AstroFox", Some(accounts));
    let res = CredentialsExtensionManager::prepare_extension(&temp_dir, &profile, "AstroFox");

    assert!(res.is_ok());
    let ext_path = res.unwrap().expect("Deveria retornar caminho da extensão");

    assert_eq!(ext_path, temp_dir.join("credentials_vault_extension"));
    assert!(ext_path.join("manifest.json").exists());
    assert!(ext_path.join("credentials.json").exists());

    // Verifica que o manifest é compatível com Firefox para AstroFox
    let manifest_str = fs::read_to_string(ext_path.join("manifest.json")).unwrap();
    assert!(manifest_str.contains("\"manifest_version\": 2"));
    assert!(manifest_str.contains("\"browser_action\""));
    assert!(manifest_str.contains("gecko"));

    let _ = fs::remove_dir_all(&temp_dir);
}
