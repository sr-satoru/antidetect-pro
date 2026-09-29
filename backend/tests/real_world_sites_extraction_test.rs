use rusqlite::Connection;
use std::collections::HashMap;
use std::fs;
use star_multlogin_backend::extraction_session::{
    fire_fox::{
        escape_firefox_origin, extract_cookies, extract_local_storage, extract_unified_session,
    },
    UnifiedCookie,
};
use star_multlogin_backend::launcher::engine::injection::{
    inject_cookies, inject_local_storage,
};

/// 1. Simulação Realista: Google / YouTube / OAuth 2.0 Multi-Subdomínios e Cookies __Secure- / __Host-
#[test]
fn test_real_world_google_oauth_multi_subdomain() {
    let temp_dir = std::env::temp_dir().join(format!("star_real_google_{}", uuid::Uuid::new_v4()));
    fs::create_dir_all(&temp_dir).unwrap();
    let profile_dir = &temp_dir;

    let google_cookies = vec![
        // Cookie Raiz Google
        UnifiedCookie {
            name: "__Secure-1PSID".to_string(),
            value: "g.a000kAgiRealSecretTokenGoogle123".to_string(),
            domain: ".google.com".to_string(),
            path: "/".to_string(),
            expiry: Some(1893456000), // Ano 2030
            is_secure: true,
            is_http_only: true,
            same_site: "None".to_string(),
        },
        UnifiedCookie {
            name: "SID".to_string(),
            value: "g.a000kAgjRootSessionId456".to_string(),
            domain: ".google.com".to_string(),
            path: "/".to_string(),
            expiry: Some(1893456000),
            is_secure: true,
            is_http_only: true,
            same_site: "None".to_string(),
        },
        UnifiedCookie {
            name: "SAPISID".to_string(),
            value: "google_client_apisid_789".to_string(),
            domain: ".google.com".to_string(),
            path: "/".to_string(),
            expiry: Some(1893456000),
            is_secure: true,
            is_http_only: false, // JavaScript lê SAPISID para gerar hash SHA1
            same_site: "None".to_string(),
        },
        // Cookie Específico do Contas / Login
        UnifiedCookie {
            name: "__Host-GAPS".to_string(),
            value: "1:RealAccountsGoogleHostAuthCookie:xyz".to_string(),
            domain: "accounts.google.com".to_string(),
            path: "/".to_string(),
            expiry: Some(1893456000),
            is_secure: true,
            is_http_only: true,
            same_site: "Lax".to_string(),
        },
        // Cookie do YouTube
        UnifiedCookie {
            name: "LOGIN_INFO".to_string(),
            value: "AFmmF2swRAIgYouTubeSessionTokenRealExample".to_string(),
            domain: ".youtube.com".to_string(),
            path: "/".to_string(),
            expiry: Some(1893456000),
            is_secure: true,
            is_http_only: true,
            same_site: "None".to_string(),
        },
    ];

    // Injeção de alta performance
    let res = inject_cookies(profile_dir, &google_cookies).expect("Falha ao injetar cookies Google");
    assert_eq!(res.imported, 5);
    assert_eq!(res.skipped, 0);

    // Extração com separação por domínio
    let stats = extract_cookies(profile_dir).expect("Falha ao extrair cookies Google");
    assert_eq!(stats.total_count, 5);
    assert_eq!(stats.domains.len(), 3); // .google.com, accounts.google.com, .youtube.com

    // Valida que .google.com é o primeiro domínio pelo ranking de quantidade
    assert_eq!(stats.domains[0].domain, ".google.com");
    assert_eq!(stats.domains[0].count, 3);

    // Verifica captura de flags de segurança
    let gaps = stats.cookies.iter().find(|c| c.name == "__Host-GAPS").unwrap();
    assert_eq!(gaps.domain, "accounts.google.com");
    assert!(gaps.is_secure);
    assert!(gaps.is_http_only);
    assert_eq!(gaps.same_site, "Lax");

    let sapisid = stats.cookies.iter().find(|c| c.name == "SAPISID").unwrap();
    assert!(!sapisid.is_http_only);

    let _ = fs::remove_dir_all(&temp_dir);
}

/// 2. Simulação Realista: Cloudflare Anti-Bot Turnstile & WAF Clearance Protection
#[test]
fn test_real_world_cloudflare_turnstile_and_waf() {
    let temp_dir = std::env::temp_dir().join(format!("star_real_cf_{}", uuid::Uuid::new_v4()));
    fs::create_dir_all(&temp_dir).unwrap();
    let profile_dir = &temp_dir;

    let cf_cookies = vec![
        UnifiedCookie {
            name: "cf_clearance".to_string(),
            value: "01abc123CloudflareClearanceBypassTokenRealFormat.X9-09".to_string(),
            domain: ".cloudflare.com".to_string(),
            path: "/".to_string(),
            expiry: Some(1780000000),
            is_secure: true,
            is_http_only: true,
            same_site: "None".to_string(),
        },
        UnifiedCookie {
            name: "__cf_bm".to_string(),
            value: "b0m998182BotManagementMicroCookieCloudflare".to_string(),
            domain: ".cloudflare.com".to_string(),
            path: "/".to_string(),
            expiry: Some(1780001800), // 30 min expiry
            is_secure: true,
            is_http_only: true,
            same_site: "None".to_string(),
        },
    ];

    inject_cookies(profile_dir, &cf_cookies).expect("Falha ao injetar cookies Cloudflare");
    let stats = extract_cookies(profile_dir).expect("Falha ao extrair Cloudflare");

    assert_eq!(stats.total_count, 2);
    let clearance = stats.cookies.iter().find(|c| c.name == "cf_clearance").unwrap();
    assert!(clearance.is_http_only);
    assert!(clearance.is_secure);
    assert_eq!(clearance.same_site, "None");

    let _ = fs::remove_dir_all(&temp_dir);
}

/// 3. Simulação Realista: Discord Web (SPA moderna sem cookies — 100% LocalStorage / Tokens JWT)
#[test]
fn test_real_world_discord_spa_token_and_user_store() {
    let temp_dir = std::env::temp_dir().join(format!("star_real_discord_{}", uuid::Uuid::new_v4()));
    fs::create_dir_all(&temp_dir).unwrap();
    let profile_dir = &temp_dir;

    let mut discord_ls = HashMap::new();
    // O Discord salva strings com aspas literais no JSON do LocalStorage
    discord_ls.insert("token".to_string(), "\"mfa.ABC123Def456Ghi789_RealMfaTokenFormat\"".to_string());
    discord_ls.insert("user_id_cache".to_string(), "\"987654321098765432\"".to_string());
    discord_ls.insert("UserSettingsStore".to_string(), "{\"theme\":\"dark\",\"locale\":\"pt-BR\",\"inlineAttachmentMedia\":true}".to_string());
    discord_ls.insert("SelectedChannelId".to_string(), "\"112233445566778899\"".to_string());

    // Injeta na pasta nativa particionada do Camoufox
    let count = inject_local_storage(profile_dir, "https://discord.com", &discord_ls)
        .expect("Falha ao injetar LocalStorage do Discord");
    assert_eq!(count, 4);

    // Extração
    let storage = extract_local_storage(profile_dir).expect("Falha ao extrair LocalStorage do Discord");
    let discord_data = storage.get("https://discord.com").expect("Origem https://discord.com não encontrada");

    assert_eq!(
        discord_data.get("token").unwrap(),
        "\"mfa.ABC123Def456Ghi789_RealMfaTokenFormat\""
    );
    assert_eq!(
        discord_data.get("user_id_cache").unwrap(),
        "\"987654321098765432\""
    );
    assert!(discord_data.get("UserSettingsStore").unwrap().contains("\"theme\":\"dark\""));

    // Valida extração na Sessão Unificada
    let session = extract_unified_session(profile_dir).expect("Falha na sessão unificada");
    assert_eq!(session.total_cookies, 0); // Discord não precisa de cookies para extrair a conta!
    assert_eq!(session.total_storage_items, 4);

    let _ = fs::remove_dir_all(&temp_dir);
}

/// 4. Simulação Realista: WhatsApp Web & Telegram Web no mesmo perfil
#[test]
fn test_real_world_whatsapp_and_telegram_multi_messaging() {
    let temp_dir = std::env::temp_dir().join(format!("star_real_msg_{}", uuid::Uuid::new_v4()));
    fs::create_dir_all(&temp_dir).unwrap();
    let profile_dir = &temp_dir;

    let mut wa_storage = HashMap::new();
    wa_storage.insert("WAToken1".to_string(), "{\"token\":\"wa_secret_token_1\"}".to_string());
    wa_storage.insert("WAToken2".to_string(), "{\"token\":\"wa_secret_token_2\"}".to_string());
    wa_storage.insert("last-wid-md".to_string(), "\"5511999998888@c.us\"".to_string());

    let mut tg_storage = HashMap::new();
    tg_storage.insert("dc_id".to_string(), "4".to_string());
    tg_storage.insert("user_auth".to_string(), "{\"id\":99887766,\"dc\":4,\"date\":1727635200}".to_string());

    inject_local_storage(profile_dir, "https://web.whatsapp.com", &wa_storage).unwrap();
    inject_local_storage(profile_dir, "https://web.telegram.org", &tg_storage).unwrap();

    let extracted = extract_local_storage(profile_dir).unwrap();
    assert_eq!(extracted.len(), 2);

    let wa = extracted.get("https://web.whatsapp.com").unwrap();
    assert_eq!(wa.get("last-wid-md").unwrap(), "\"5511999998888@c.us\"");

    let tg = extracted.get("https://web.telegram.org").unwrap();
    assert_eq!(tg.get("dc_id").unwrap(), "4");

    let _ = fs::remove_dir_all(&temp_dir);
}

/// 5. Simulação Realista: Internet Banking / FinTech (SameSite=Strict e Sessão sem Expiração)
#[test]
fn test_real_world_fintech_strict_security() {
    let temp_dir = std::env::temp_dir().join(format!("star_real_bank_{}", uuid::Uuid::new_v4()));
    fs::create_dir_all(&temp_dir).unwrap();
    let profile_dir = &temp_dir;

    let bank_cookies = vec![
        UnifiedCookie {
            name: "JSESSIONID".to_string(),
            value: "B92D8741E09AF27181048B82A41.bank_node_02".to_string(),
            domain: "bank.itau.com.br".to_string(),
            path: "/banking/".to_string(),
            expiry: None, // Cookie de sessão (expira ao fechar janela)
            is_secure: true,
            is_http_only: true,
            same_site: "Strict".to_string(),
        },
        UnifiedCookie {
            name: "X-CSRF-TOKEN".to_string(),
            value: "csrf_token_secret_validation_982".to_string(),
            domain: "bank.itau.com.br".to_string(),
            path: "/".to_string(),
            expiry: None,
            is_secure: true,
            is_http_only: false,
            same_site: "Strict".to_string(),
        },
    ];

    inject_cookies(profile_dir, &bank_cookies).unwrap();
    let stats = extract_cookies(profile_dir).unwrap();

    assert_eq!(stats.total_count, 2);
    let jsession = stats.cookies.iter().find(|c| c.name == "JSESSIONID").unwrap();
    assert_eq!(jsession.same_site, "Strict");
    assert!(jsession.is_http_only);
    assert_eq!(jsession.expiry, None); // Garante que a ausência de expiração seja preservada

    let _ = fs::remove_dir_all(&temp_dir);
}

/// 6. Simulação Realista: Gecko BLOB Nativo com Codificação UTF-16 no LocalStorage
#[test]
fn test_real_world_gecko_utf16_blob_local_storage() {
    let temp_dir = std::env::temp_dir().join(format!("star_real_utf16_{}", uuid::Uuid::new_v4()));
    fs::create_dir_all(&temp_dir).unwrap();
    let profile_dir = &temp_dir;

    let origin = "https://complex-spa.app";
    let escaped = escape_firefox_origin(origin);
    let ls_dir = profile_dir.join("storage").join("default").join(escaped).join("ls");
    fs::create_dir_all(&ls_dir).unwrap();

    let db_path = ls_dir.join("data.sqlite");
    let conn = Connection::open(&db_path).unwrap();
    conn.execute(
        "CREATE TABLE IF NOT EXISTS data (key TEXT PRIMARY KEY, value BLOB)",
        [],
    )
    .unwrap();

    // Codifica "Sessão Segura Camoufox 🦊" em bytes UTF-16 Little Endian
    let text = "Sessão Segura Camoufox 🦊";
    let utf16_bytes: Vec<u8> = text
        .encode_utf16()
        .flat_map(|u| u.to_le_bytes().to_vec())
        .collect();

    conn.execute(
        "INSERT INTO data (key, value) VALUES (?1, ?2)",
        rusqlite::params!["auth_blob", utf16_bytes],
    )
    .unwrap();
    drop(conn);

    // O nosso extrator deve decodificar perfeitamente o BLOB sem corromper
    let storage = extract_local_storage(profile_dir).unwrap();
    let data = storage.get(origin).expect("Origem não encontrada");
    assert_eq!(data.get("auth_blob"), Some(&text.to_string()));

    let _ = fs::remove_dir_all(&temp_dir);
}

/// 7. Simulação Realista de Concorrência: Camoufox Aberto com Lock e WAL Mode
#[test]
fn test_real_world_concurrent_read_while_browser_open_in_wal() {
    let temp_dir = std::env::temp_dir().join(format!("star_real_concurrency_{}", uuid::Uuid::new_v4()));
    fs::create_dir_all(&temp_dir).unwrap();
    let profile_dir = &temp_dir;

    let cookies = vec![
        UnifiedCookie {
            name: "session_id".to_string(),
            value: "live_active_user_123".to_string(),
            domain: ".example.com".to_string(),
            path: "/".to_string(),
            expiry: Some(1800000000),
            is_secure: true,
            is_http_only: true,
            same_site: "Lax".to_string(),
        },
    ];

    inject_cookies(profile_dir, &cookies).unwrap();

    // Simula o Camoufox aberto: abre o banco com WAL mode e mantém a conexão ativa
    let db_path = profile_dir.join("cookies.sqlite");
    let browser_conn = Connection::open(&db_path).unwrap();
    browser_conn.execute_batch("PRAGMA journal_mode = WAL;").unwrap();

    // Enquanto o navegador fictício está com o arquivo aberto, nossa extração deve ler sem erro SQLITE_BUSY
    let stats = extract_cookies(profile_dir).expect("Falha ao extrair com navegador em execução em WAL mode");
    assert_eq!(stats.total_count, 1);
    assert_eq!(stats.cookies[0].value, "live_active_user_123");

    drop(browser_conn);
    let _ = fs::remove_dir_all(&temp_dir);
}
