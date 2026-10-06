use std::fs;
use star_multlogin_backend::extensions::import_extensions_web::downloader;
use star_multlogin_backend::extensions::import_profile_extensions;
use star_multlogin_backend::models::{ExtensionItem, Profile, ProfileProxyConfig};

#[test]
fn test_extract_amo_slug_variations() {
    assert_eq!(
        downloader::extract_amo_slug("https://addons.mozilla.org/pt-BR/firefox/addon/ublock-origin/"),
        Some("ublock-origin".to_string())
    );
    assert_eq!(
        downloader::extract_amo_slug("https://addons.mozilla.org/en-US/firefox/addon/darkreader/?utm_source=test"),
        Some("darkreader".to_string())
    );
    assert_eq!(
        downloader::extract_amo_slug("canvasblocker"),
        Some("canvasblocker".to_string())
    );
    assert_eq!(downloader::extract_amo_slug("   "), None);
}

#[tokio::test]
async fn test_import_extensions_mode_none() {
    let temp_dir = std::env::temp_dir().join("test_star_none");
    let _ = fs::create_dir_all(&temp_dir);

    let profile = Profile {
        id: "test-none".to_string(),
        name: "Test None".to_string(),
        group: "Default".to_string(),
        tags: vec![],
        notes: "".to_string(),
        status: "ready".to_string(),
        kernel: "Camoufox".to_string(),
        browser_version: "150".to_string(),
        os: "windows".to_string(),
        created_at: 100,
        updated_at: 100,
        last_launch: None,
        is_deleted: false,
        deleted_at: None,
        proxy: ProfileProxyConfig::default(),
        fingerprint_json: serde_json::json!({}),
        extension_mode: Some("none".to_string()),
        extension_category: None,
        extensions: None,
    };

    let client = reqwest::Client::new();
    let result = import_profile_extensions(&profile, &temp_dir, &temp_dir, &client).await.unwrap();
    assert!(result.is_empty());

    let _ = fs::remove_dir_all(&temp_dir);
}

#[tokio::test]
async fn test_import_extensions_fallback_enrichment() {
    let temp_dir = std::env::temp_dir().join("test_star_enrichment");
    let extensions_dir = temp_dir.join("extensions");
    let _ = fs::create_dir_all(&extensions_dir);

    let sample_team_ext = ExtensionItem {
        id: 9999,
        name: "Test AdBlocker".to_string(),
        icon_type: None,
        icon_url: None,
        icon_bg: None,
        enabled: true,
        status: "available".to_string(),
        description: "Test".to_string(),
        provider: "Firefox Add-ons".to_string(),
        provider_url: Some("https://addons.mozilla.org/pt-BR/firefox/addon/ublock-origin/".to_string()),
        tab: "team".to_string(),
        version: None,
    };
    let _ = fs::write(
        extensions_dir.join("9999.json"),
        serde_json::to_string(&sample_team_ext).unwrap(),
    );

    let profile = Profile {
        id: "test-category".to_string(),
        name: "Test Category".to_string(),
        group: "Default".to_string(),
        tags: vec![],
        notes: "".to_string(),
        status: "ready".to_string(),
        kernel: "Camoufox".to_string(),
        browser_version: "150".to_string(),
        os: "windows".to_string(),
        created_at: 100,
        updated_at: 100,
        last_launch: None,
        is_deleted: false,
        deleted_at: None,
        proxy: ProfileProxyConfig::default(),
        fingerprint_json: serde_json::json!({}),
        extension_mode: Some("category".to_string()),
        extension_category: Some("cat_custom".to_string()),
        extensions: Some(serde_json::json!([
            {
                "id": "9999",
                "name": "Test AdBlocker"
            }
        ])),
    };

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_millis(500))
        .build()
        .unwrap_or_default();
    let _ = import_profile_extensions(&profile, &temp_dir, &temp_dir, &client).await;

    let _ = fs::remove_dir_all(&temp_dir);
}
