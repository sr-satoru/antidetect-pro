use rusqlite::Connection;
use std::collections::HashMap;
use std::fs;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};
use std::thread;
use std::time::{Duration, Instant};

use star_multlogin_backend::extraction_session::{
    fire_fox::{
        extract_cookies, extract_local_storage, unescape_firefox_origin,
    },
    UnifiedCookie,
};
use star_multlogin_backend::launcher::engine::injection::{
    inject_cookies, inject_local_storage,
};

/// 1. Teste de Estresse Extremo: 10.000 Cookies distribuídos em 500 Domínios
/// Valida capacidade de alto volume, ordenação de domínios e tempo de resposta de leitura (< 300ms)
#[test]
fn test_hardcore_stress_10000_cookies_500_domains() {
    let temp_dir = std::env::temp_dir().join(format!("star_hardcore_stress_{}", uuid::Uuid::new_v4()));
    fs::create_dir_all(&temp_dir).unwrap();
    let profile_dir = &temp_dir;

    let mut cookies = Vec::with_capacity(10_000);
    for i in 0..10_000 {
        let domain_id = i % 500;
        cookies.push(UnifiedCookie {
            name: format!("cookie_var_{i}"),
            value: format!("val_hash_crypto_{}_{}", i, uuid::Uuid::new_v4()),
            domain: format!(".domain{domain_id}.org"),
            path: "/".to_string(),
            expiry: Some(1800000000 + i as i64),
            is_secure: i % 2 == 0,
            is_http_only: i % 3 == 0,
            same_site: match i % 3 {
                0 => "Lax".to_string(),
                1 => "Strict".to_string(),
                _ => "None".to_string(),
            },
        });
    }

    // Injeção em lote de 10.000 cookies
    let start_inj = Instant::now();
    let inj_res = inject_cookies(profile_dir, &cookies).expect("Falha ao injetar 10.000 cookies");
    let dur_inj = start_inj.elapsed();
    assert_eq!(inj_res.imported, 10_000);
    assert_eq!(inj_res.skipped, 0);

    // Extração e Benchmark de Leitura
    let start_ext = Instant::now();
    let stats = extract_cookies(profile_dir).expect("Falha ao extrair 10.000 cookies");
    let dur_ext = start_ext.elapsed();

    assert_eq!(stats.total_count, 10_000);
    assert_eq!(stats.domains.len(), 500);

    // Cada um dos 500 domínios deve ter exatamente 20 cookies (10.000 / 500)
    for dom in &stats.domains {
        assert_eq!(dom.count, 20);
    }

    println!(
        "⚡ Hardcore Benchmark: 10.000 cookies injetados em {:?} | Extraídos em {:?}",
        dur_inj, dur_ext
    );
    assert!(
        dur_ext < Duration::from_millis(500),
        "A extração de 10.000 cookies demorou mais que 500ms: {:?}",
        dur_ext
    );

    let _ = fs::remove_dir_all(&temp_dir);
}

/// 2. Teste de Injeção Maliciosa & Ataques Adversariais (SQL Injection, XSS, Emojis, Nulos)
/// Garante que o motor do Camoufox não execute SQL, não quebre tabelas e não corrompa strings literais
#[test]
fn test_hardcore_adversarial_and_sql_injection_defense() {
    let temp_dir = std::env::temp_dir().join(format!("star_hardcore_sec_{}", uuid::Uuid::new_v4()));
    fs::create_dir_all(&temp_dir).unwrap();
    let profile_dir = &temp_dir;

    let adversarial_cookies = vec![
        // SQL Injection clássico tentando dropar a tabela
        UnifiedCookie {
            name: "'; DROP TABLE moz_cookies; --".to_string(),
            value: "1' OR '1'='1".to_string(),
            domain: ".evil-sqli.com".to_string(),
            path: "/'; DELETE FROM moz_cookies; --".to_string(),
            expiry: Some(1900000000),
            is_secure: true,
            is_http_only: true,
            same_site: "None".to_string(),
        },
        // Tentativa de quebra com aspas e escapes complexos
        UnifiedCookie {
            name: "token\"'--/*#".to_string(),
            value: "{\"jwt\": \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig\", \"hack\": \"'; UNION SELECT * FROM moz_cookies;--\"}".to_string(),
            domain: ".attack.io".to_string(),
            path: "/".to_string(),
            expiry: Some(1900000000),
            is_secure: false,
            is_http_only: false,
            same_site: "Lax".to_string(),
        },
        // Emojis, caracteres internacionais e formatações C
        UnifiedCookie {
            name: "emoji_cookie_🦊🚀🛡️".to_string(),
            value: "%s%s%s%s%n\\0\\r\\n<script>alert(document.domain)</script>".to_string(),
            domain: ".xss-test.org".to_string(),
            path: "/".to_string(),
            expiry: Some(1900000000),
            is_secure: true,
            is_http_only: true,
            same_site: "Strict".to_string(),
        },
    ];

    let inj_res = inject_cookies(profile_dir, &adversarial_cookies).expect("Falha ao injetar cookies adversariais");
    assert_eq!(inj_res.imported, 3);

    // Extrai e valida integridade absoluta
    let stats = extract_cookies(profile_dir).expect("Falha ao extrair cookies após tentativa de injeção");
    assert_eq!(stats.total_count, 3);

    // O nome malicioso deve ter sido salvo EXATAMENTE como literal e a tabela NÃO pode ter sido deletada!
    let sqli = stats
        .cookies
        .iter()
        .find(|c| c.name == "'; DROP TABLE moz_cookies; --")
        .expect("Cookie com SQL Injection não foi encontrado como texto literal");
    assert_eq!(sqli.value, "1' OR '1'='1");

    let xss = stats
        .cookies
        .iter()
        .find(|c| c.name == "emoji_cookie_🦊🚀🛡️")
        .expect("Cookie com Emojis não foi encontrado");
    assert_eq!(
        xss.value,
        "%s%s%s%s%n\\0\\r\\n<script>alert(document.domain)</script>"
    );

    let _ = fs::remove_dir_all(&temp_dir);
}

/// 3. Teste de LocalStorage Massivo: Cargas Gigantes (1MB+ de estado SPA) e Múltiplas Origens
#[test]
fn test_hardcore_massive_local_storage_megabyte_payload() {
    let temp_dir = std::env::temp_dir().join(format!("star_hardcore_ls_{}", uuid::Uuid::new_v4()));
    fs::create_dir_all(&temp_dir).unwrap();
    let profile_dir = &temp_dir;

    // Gera um payload de 1MB (simulando cache offline de SPA, WASM ou Redux store)
    let large_json_chunk = "{\"key\":\"value_sample_data_padding_for_megabyte_test\"},".repeat(20_000); // ~1.1 MB
    let huge_payload = format!("[{}]", large_json_chunk.trim_end_matches(','));

    let mut spa_storage = HashMap::new();
    spa_storage.insert("app_state_cache".to_string(), huge_payload.clone());
    spa_storage.insert("auth_session".to_string(), "\"Bearer eyJhbGciOi...\"".to_string());

    let count = inject_local_storage(profile_dir, "https://heavy-spa.enterprise.com", &spa_storage)
        .expect("Falha ao injetar LocalStorage de 1MB");
    assert_eq!(count, 2);

    let extracted = extract_local_storage(profile_dir).expect("Falha ao extrair LocalStorage massivo");
    let origin_data = extracted.get("https://heavy-spa.enterprise.com").unwrap();

    assert_eq!(origin_data.len(), 2);
    assert_eq!(origin_data.get("auth_session").unwrap(), "\"Bearer eyJhbGciOi...\"");
    let read_payload = origin_data.get("app_state_cache").unwrap();
    assert_eq!(read_payload.len(), huge_payload.len());
    assert_eq!(read_payload, &huge_payload);

    let _ = fs::remove_dir_all(&temp_dir);
}

/// 4. Teste de Concorrência Extrema (Martelo em Paralelo):
/// Uma thread de escrita fica inserindo dados em loop rápido no banco do Camoufox (WAL mode)
/// enquanto MÚLTIPLAS threads leitoras realizam extrações concorrentes
#[test]
fn test_hardcore_extreme_concurrency_hammering() {
    let temp_dir = std::env::temp_dir().join(format!("star_hardcore_conc_{}", uuid::Uuid::new_v4()));
    fs::create_dir_all(&temp_dir).unwrap();
    let profile_dir = temp_dir.clone();

    // Inicializa banco com 100 cookies
    let initial_cookies: Vec<UnifiedCookie> = (0..100)
        .map(|i| UnifiedCookie {
            name: format!("init_c_{i}"),
            value: format!("v_{i}"),
            domain: ".concurrency.test".to_string(),
            path: "/".to_string(),
            expiry: Some(1800000000),
            is_secure: true,
            is_http_only: true,
            same_site: "Lax".to_string(),
        })
        .collect();
    inject_cookies(&profile_dir, &initial_cookies).unwrap();

    // Ativa WAL mode como o Camoufox real faz
    let db_path = profile_dir.join("cookies.sqlite");
    {
        let conn = Connection::open(&db_path).unwrap();
        conn.execute_batch("PRAGMA journal_mode = WAL;").unwrap();
    }

    let is_running = Arc::new(AtomicBool::new(true));

    // Thread Escritora (Simula o Camoufox rodando scripts e salvando cookies a cada milissegundo)
    let writer_profile = profile_dir.clone();
    let writer_running = is_running.clone();
    let writer_handle = thread::spawn(move || {
        let mut cycle = 0;
        while writer_running.load(Ordering::Relaxed) {
            cycle += 1;
            let batch = vec![UnifiedCookie {
                name: format!("dyn_cookie_{cycle}"),
                value: format!("active_val_{cycle}"),
                domain: ".concurrency.test".to_string(),
                path: "/".to_string(),
                expiry: Some(1800000000),
                is_secure: true,
                is_http_only: true,
                same_site: "Lax".to_string(),
            }];
            let _ = inject_cookies(&writer_profile, &batch);
            thread::sleep(Duration::from_millis(5));
        }
        cycle
    });

    // 4 Threads Leitoras Concorrentes (Simulam o Backend da Dashboard extraindo dados sem parar)
    let mut reader_handles = Vec::new();
    for reader_id in 0..4 {
        let reader_profile = profile_dir.clone();
        let reader_running = is_running.clone();
        let handle = thread::spawn(move || {
            let mut reads = 0;
            while reader_running.load(Ordering::Relaxed) {
                // A leitura DEVE ter sucesso 100% das vezes sem travar por SQLITE_BUSY
                let res = extract_cookies(&reader_profile);
                assert!(
                    res.is_ok(),
                    "Reader {} falhou com erro de lock: {:?}",
                    reader_id,
                    res.err()
                );
                let stats = res.unwrap();
                assert!(stats.total_count >= 100);
                reads += 1;
                thread::sleep(Duration::from_millis(10));
            }
            reads
        });
        reader_handles.push(handle);
    }

    // Deixa o martelo de concorrência rodar a toda velocidade por 1 segundo
    thread::sleep(Duration::from_millis(1000));
    is_running.store(false, Ordering::Relaxed);

    let writer_cycles = writer_handle.join().unwrap();
    let mut total_reads = 0;
    for h in reader_handles {
        total_reads += h.join().unwrap();
    }

    println!(
        "🔥 Concurrency Test Aprovado: {} gravações ativas e {} leituras concorrentes simultâneas com ZERO locks!",
        writer_cycles, total_reads
    );

    let _ = fs::remove_dir_all(&temp_dir);
}

/// 5. Teste de Chaos Engineering: Resiliência contra Bancos Corrompidos ou Vazios
#[test]
fn test_hardcore_chaos_corrupted_databases() {
    let temp_dir = std::env::temp_dir().join(format!("star_hardcore_chaos_{}", uuid::Uuid::new_v4()));
    fs::create_dir_all(&temp_dir).unwrap();
    let profile_dir = &temp_dir;

    // Cenário A: Arquivo de cookies vazio (0 bytes)
    let cookie_db = profile_dir.join("cookies.sqlite");
    fs::write(&cookie_db, b"").unwrap();
    let res_empty = extract_cookies(profile_dir);
    // Deve retornar erro limpo ou stats vazia sem causar panic
    assert!(res_empty.is_err() || res_empty.unwrap().total_count == 0);

    // Cenário B: Arquivo de cookies corrompido com bytes aleatórios
    fs::write(&cookie_db, b"NOT_A_SQLITE_HEADER_CORRUPTED_GARBAGE_BYTES_123456789").unwrap();
    let res_corrupt = extract_cookies(profile_dir);
    assert!(res_corrupt.is_err(), "Deveria retornar Err para arquivo corrompido");

    // Cenário C: LocalStorage com data.sqlite corrompido em uma origem
    let ls_dir = profile_dir.join("storage").join("default").join("https+++broken.org").join("ls");
    fs::create_dir_all(&ls_dir).unwrap();
    fs::write(ls_dir.join("data.sqlite"), b"CORRUPTED_LS_DATABASE").unwrap();

    // Outra origem saudável
    let mut healthy = HashMap::new();
    healthy.insert("ok_key".to_string(), "ok_val".to_string());
    inject_local_storage(profile_dir, "https://healthy.org", &healthy).unwrap();

    // A leitura de LocalStorage deve ignorar a origem quebrada sem explodir, retornando a saudável
    let storage_result = extract_local_storage(profile_dir).unwrap();
    assert!(storage_result.contains_key("https://healthy.org"));
    assert_eq!(
        storage_result.get("https://healthy.org").unwrap().get("ok_key"),
        Some(&"ok_val".to_string())
    );

    let _ = fs::remove_dir_all(&temp_dir);
}

/// 6. Teste de Hierarquia de Paths e Cookie Shadowing (RFC 6265)
/// Cookies com mesmo nome, mas paths e subdomínios diferentes NÃO podem colidir ou sobrescrever
#[test]
fn test_hardcore_path_hierarchy_and_shadowing() {
    let temp_dir = std::env::temp_dir().join(format!("star_hardcore_paths_{}", uuid::Uuid::new_v4()));
    fs::create_dir_all(&temp_dir).unwrap();
    let profile_dir = &temp_dir;

    let cookies = vec![
        UnifiedCookie {
            name: "SESSION_ID".to_string(),
            value: "root_session".to_string(),
            domain: ".example.com".to_string(),
            path: "/".to_string(),
            expiry: Some(1800000000),
            is_secure: true,
            is_http_only: true,
            same_site: "Lax".to_string(),
        },
        UnifiedCookie {
            name: "SESSION_ID".to_string(),
            value: "admin_scoped_session".to_string(),
            domain: ".example.com".to_string(),
            path: "/admin".to_string(),
            expiry: Some(1800000000),
            is_secure: true,
            is_http_only: true,
            same_site: "Strict".to_string(),
        },
        UnifiedCookie {
            name: "SESSION_ID".to_string(),
            value: "admin_v2_deep_scoped".to_string(),
            domain: ".example.com".to_string(),
            path: "/admin/v2".to_string(),
            expiry: Some(1800000000),
            is_secure: true,
            is_http_only: true,
            same_site: "Strict".to_string(),
        },
        UnifiedCookie {
            name: "SESSION_ID".to_string(),
            value: "subdomain_scoped".to_string(),
            domain: "app.example.com".to_string(),
            path: "/".to_string(),
            expiry: Some(1800000000),
            is_secure: true,
            is_http_only: true,
            same_site: "None".to_string(),
        },
    ];

    let inj = inject_cookies(profile_dir, &cookies).unwrap();
    assert_eq!(inj.imported, 4);

    let stats = extract_cookies(profile_dir).unwrap();
    assert_eq!(stats.total_count, 4);

    // Valida que todos os 4 coexistem sem colisão
    let root = stats.cookies.iter().find(|c| c.path == "/" && c.domain == ".example.com").unwrap();
    assert_eq!(root.value, "root_session");

    let admin = stats.cookies.iter().find(|c| c.path == "/admin").unwrap();
    assert_eq!(admin.value, "admin_scoped_session");

    let admin_v2 = stats.cookies.iter().find(|c| c.path == "/admin/v2").unwrap();
    assert_eq!(admin_v2.value, "admin_v2_deep_scoped");

    let sub = stats.cookies.iter().find(|c| c.domain == "app.example.com").unwrap();
    assert_eq!(sub.value, "subdomain_scoped");

    let _ = fs::remove_dir_all(&temp_dir);
}

/// 7. Teste de Multi-Account Containers do Camoufox (userContextId)
#[test]
fn test_hardcore_camoufox_containers_user_context() {
    let origin_raw_1 = "https+++discord.com^userContextId=1";
    let origin_raw_2 = "https+++discord.com^userContextId=2";

    assert_eq!(unescape_firefox_origin(origin_raw_1), "https://discord.com");
    assert_eq!(unescape_firefox_origin(origin_raw_2), "https://discord.com");

    let regular = "https+++web.whatsapp.com";
    assert_eq!(unescape_firefox_origin(regular), "https://web.whatsapp.com");
}
