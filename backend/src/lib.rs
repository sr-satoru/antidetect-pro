use axum::{
    http::{HeaderName, HeaderValue, Method},
    routing::{delete, get, post, put},
    Router,
};
use std::net::SocketAddr;
use std::sync::{Arc, OnceLock};
use tower_http::cors::CorsLayer;

// 6 Domínios Principais do Monorepo
pub mod api;
pub mod browser;
pub mod core;
pub mod network;
pub mod storage;
pub mod sync;
pub mod swagger;

#[path = "mcp__publicApi/mod.rs"]
pub mod mcp_public_api;

#[allow(non_snake_case)]
pub use mcp_public_api as mcp__publicApi;

// Re-exportações e Aliases para 100% de compatibilidade com testes e rotas existentes
pub use browser::browser_downloader;
pub use browser::engines::camoufox;
pub use browser::extensions;
pub use browser::extraction_session;
pub use browser::fingerprint;
pub use browser::launcher;

pub use network::validator as proxy_validator;

pub use storage::service_database;
pub use sync::server_sync;

pub use swagger::openapi;
pub use api::routes;
pub use api::ws;

pub use core::id_generator;
pub use core::models;
pub use core::security;
pub use core::security::NonceManager;

pub use server_sync::{cloud_auth, cloud_sync};

use extensions::ExtensionStorage;
use service_database::{ExtensionCategoryStorage, ProfileStorage, ProxyStorage, TagStorage, Vault};

/// Resolve o diretório raiz de dados do aplicativo.
///
/// Prioridade de resolução:
/// 1. Variável de ambiente `STAR_DATA_DIR` (se informada e não vazia).
/// 2. `data_dir_override` explícito passado via parâmetro (ex: Tauri em produção).
/// 3. Modo desenvolvimento (`cargo run` / `cfg!(debug_assertions)`):
///    Usa a pasta `./app-data` localizada no próprio diretório do backend (`CARGO_MANIFEST_DIR/app-data`),
///    isolando completamente o banco `star_vault.db` e perfis de teste do banco de dados oficial do sistema.
/// 4. Modo produção (Release):
///    Usa o diretório canônico padrão do sistema operacional (`get_canonical_app_dir`).
fn resolve_data_dir(data_dir_override: Option<String>) -> String {
    // 1. Variável de ambiente explícita
    if let Ok(dir) = std::env::var("STAR_DATA_DIR") {
        if !dir.trim().is_empty() {
            return dir;
        }
    }

    // 2. Parâmetro explícito
    if let Some(dir) = data_dir_override {
        if !dir.trim().is_empty() {
            return dir;
        }
    }

    // 3. Modo desenvolvimento (cargo run) -> pasta local ./app-data no diretório do backend
    if cfg!(debug_assertions) {
        let dev_dir = if let Some(manifest_dir) = option_env!("CARGO_MANIFEST_DIR") {
            std::path::PathBuf::from(manifest_dir).join("app-data")
        } else {
            std::path::PathBuf::from("./app-data")
        };
        let _ = std::fs::create_dir_all(&dev_dir);
        return dev_dir.to_string_lossy().to_string();
    }

    // 4. Modo produção (Release) -> diretório canônico oficial do SO
    browser_downloader::platform::get_canonical_app_dir()
        .to_string_lossy()
        .to_string()
}

static GLOBAL_NONCE_MANAGER: OnceLock<Arc<NonceManager>> = OnceLock::new();

/// Retorna a instância global de NonceManager (compartilhada entre Axum e Tauri)
pub fn get_or_init_nonce_manager() -> Arc<NonceManager> {
    GLOBAL_NONCE_MANAGER
        .get_or_init(|| Arc::new(NonceManager::new()))
        .clone()
}

/// Inicia a tarefa em segundo plano para limpeza de tickets e sessões expiradas a cada 5 minutos
pub fn start_cleanup_task(nm: Arc<NonceManager>) {
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(300));
        loop {
            interval.tick().await;
            nm.cleanup();
        }
    });
}

/// Constrói o roteador Axum completo com instância padrão compartilhada de NonceManager
pub fn build_app_router(
    data_dir: &str,
    profile_storage: Arc<ProfileStorage>,
    proxy_storage: Arc<ProxyStorage>,
    tag_storage: Arc<TagStorage>,
    extension_storage: Arc<ExtensionStorage>,
    extension_category_storage: Arc<ExtensionCategoryStorage>,
    auth_service: Arc<cloud_auth::CloudAuthService>,
    cloud_sync_service: Arc<cloud_sync::CloudSyncService>,
    browser_state: routes::browser::BrowserRouteState,
    ws_state: ws::WsState,
) -> Router {
    build_app_router_with_nonce_manager(
        data_dir,
        profile_storage,
        proxy_storage,
        tag_storage,
        extension_storage,
        extension_category_storage,
        auth_service,
        cloud_sync_service,
        browser_state,
        ws_state,
        get_or_init_nonce_manager(),
    )
}

/// Constrói o roteador Axum completo com todos os módulos, documentação Swagger,
/// controle restritivo de CORS e middleware de segurança em camadas
pub fn build_app_router_with_nonce_manager(
    data_dir: &str,
    profile_storage: Arc<ProfileStorage>,
    proxy_storage: Arc<ProxyStorage>,
    tag_storage: Arc<TagStorage>,
    extension_storage: Arc<ExtensionStorage>,
    extension_category_storage: Arc<ExtensionCategoryStorage>,
    auth_service: Arc<cloud_auth::CloudAuthService>,
    cloud_sync_service: Arc<cloud_sync::CloudSyncService>,
    browser_state: routes::browser::BrowserRouteState,
    ws_state: ws::WsState,
    nonce_manager: Arc<NonceManager>,
) -> Router {
    // ═══ Módulo 6: CORS Restritivo ═══
    let allowed_origins = [
        "http://localhost:1254".parse::<HeaderValue>().unwrap(),
        "http://127.0.0.1:1254".parse::<HeaderValue>().unwrap(),
        "http://localhost:5173".parse::<HeaderValue>().unwrap(),
        "http://127.0.0.1:5173".parse::<HeaderValue>().unwrap(),
        "tauri://localhost".parse::<HeaderValue>().unwrap(),
        "https://tauri.localhost".parse::<HeaderValue>().unwrap(),
    ];

    let cors = CorsLayer::new()
        .allow_origin(allowed_origins)
        .allow_methods([
            Method::GET, Method::POST, Method::PUT, Method::DELETE, Method::OPTIONS,
        ])
        .allow_headers([
            HeaderName::from_static("content-type"),
            HeaderName::from_static("authorization"),
            HeaderName::from_static("x-session-token"),
            HeaderName::from_static("x-action-ticket"),
            HeaderName::from_static("x-mcp-token"),
        ]);

    let profile_routes = Router::new()
        .route("/", get(routes::profiles::list_profiles).post(routes::profiles::create_profile))
        .route("/public", get(routes::profiles::get_public_profiles).post(routes::profiles::lookup_public_profile))
        .route("/trash", get(routes::profiles::list_trash))
        .route("/trash/empty", delete(routes::profiles::empty_trash))
        .route(
            "/{id}",
            get(routes::profiles::get_profile)
                .put(routes::profiles::update_profile)
                .delete(routes::profiles::delete_profile),
        )
        .route("/{id}/public", get(routes::profiles::get_public_profile_by_id))
        .route("/{id}/launch", post(routes::profiles::launch_profile))
        .route("/{id}/stop", post(routes::profiles::stop_profile))
        .route("/{id}/playwright", get(routes::profiles::get_profile_playwright))
        .route("/{id}/clone", post(routes::profiles::clone_profile))
        .route("/{id}/restore", post(routes::profiles::restore_profile))
        .route("/{id}/permanent", delete(routes::profiles::delete_permanent))
        .route(
            "/{id}/cookies",
            get(routes::cookies::get_profile_cookies)
                .post(routes::cookies::import_profile_cookies)
                .delete(routes::cookies::clear_profile_cookies),
        )
        .route(
            "/{id}/storage",
            get(routes::cookies::get_profile_storage)
                .delete(routes::cookies::clear_profile_storage),
        )
        .route(
            "/{id}/session",
            get(routes::cookies::get_profile_session),
        )
        .with_state(profile_storage.clone());

    let proxy_routes = Router::new()
        .route("/", get(routes::proxies::list_proxies).post(routes::proxies::create_proxy))
        .route("/test", post(routes::proxies::test_proxy))
        .route("/{id}", put(routes::proxies::update_proxy).delete(routes::proxies::delete_proxy))
        .with_state(proxy_storage);

    let extension_routes = Router::new()
        .route("/", get(routes::extensions::list_extensions).post(routes::extensions::create_extension))
        .route("/upload", post(routes::extensions::upload_extension))
        .route("/{id}", put(routes::extensions::update_extension).delete(routes::extensions::delete_extension))
        .route("/catalog", get(routes::extensions::get_catalog))
        .with_state(extension_storage);

    let extension_category_routes = Router::new()
        .route("/", get(routes::extension_categories::list_categories).post(routes::extension_categories::create_category))
        .route(
            "/{id}",
            get(routes::extension_categories::get_category)
                .put(routes::extension_categories::update_category)
                .delete(routes::extension_categories::delete_category),
        )
        .with_state(extension_category_storage);

    let tag_routes = Router::new()
        .route("/", get(routes::tags::list_tags).post(routes::tags::create_tag))
        .route("/{id}", get(routes::tags::get_tag).put(routes::tags::update_tag).delete(routes::tags::delete_tag))
        .route("/batch-delete", post(routes::tags::batch_delete_tags))
        .with_state(tag_storage);

    // ═══ 🅰 Auth Cloud (OAuth2 PKCE) — namespace separado ═══
    let cloud_auth_routes = Router::new()
        .route("/start-login", post(routes::auth::start_login))
        .route("/start-register", post(routes::auth::start_register))
        .route("/callback", get(routes::auth::callback))
        .route("/session/{session_id}", get(routes::auth::get_session_status))
        .route("/me", get(routes::auth::me))
        .route("/logout", post(routes::auth::logout))
        .with_state(auth_service);

    // ═══ 🅲🅳 Auth Local (Handshake, Fallback Loopback e Action Tickets) ═══
    let local_auth_routes = Router::new()
        .route("/handshake", post(routes::local_auth::handshake))
        .route("/dev-handshake", post(routes::local_auth::dev_handshake))
        .route("/action-ticket", post(routes::local_auth::request_action_ticket))
        .with_state(nonce_manager.clone());

    let cloud_sync_routes = Router::new()
        .route("/health", get(routes::cloud_sync::check_cloud_health))
        .route("/pull", post(routes::cloud_sync::pull_all_cloud_profiles))
        .route("/{id}/sync", post(routes::cloud_sync::sync_to_cloud))
        .route("/{id}/restore", post(routes::cloud_sync::restore_from_cloud))
        .route("/{id}/stat", get(routes::cloud_sync::get_cloud_stat))
        .route("/{id}", delete(routes::cloud_sync::delete_from_cloud))
        .with_state(cloud_sync_service);

    let browser_routes = Router::new()
        .route("/status", get(routes::browser::get_browser_status))
        .route("/download", post(routes::browser::trigger_browser_download))
        .route("/manifest", get(routes::browser::get_browser_manifest))
        .route("/verify", get(routes::browser::verify_browser_installation).post(routes::browser::verify_browser_installation))
        .with_state(browser_state);

    let app_update_service = Arc::new(routes::app_update::AppUpdateService::new(
        std::path::Path::new(data_dir),
        ws_state.clone(),
    ));

    let app_routes = Router::new()
        .route("/check-update", get(routes::app_update::check_app_update_handler))
        .route("/download", post(routes::app_update::trigger_app_download_handler))
        .route("/download-status", get(routes::app_update::get_app_download_status_handler))
        .route("/cancel-download", post(routes::app_update::cancel_app_download_handler))
        .route("/apply-update", post(routes::app_update::apply_app_update_handler))
        .with_state(app_update_service);

    let ws_routes = Router::new()
        .route("/", get(ws::ws_handler))
        .with_state(ws_state);

    let fingerprint_routes = Router::new()
        .route("/random", get(routes::fingerprints::get_random_preset))
        .route("/presets", get(routes::fingerprints::list_presets))
        .route("/fonts", get(routes::fingerprints::get_fonts))
        .route("/media-devices", get(routes::fingerprints::get_media_devices));

    let mcp_routes = mcp_public_api::router(profile_storage.clone());

    let security_state = api::SecurityState {
        nonce_manager: nonce_manager.clone(),
        profile_storage: profile_storage.clone(),
    };

    let app = Router::new()
        // Auth local — Handshake e Tickets (não passa por auth prévia)
        .nest("/api/local-auth", local_auth_routes)
        // Perfis e MCP
        .nest("/api/profiles", profile_routes.clone())
        .nest("/api/v1/profiles", profile_routes)
        .route("/api/v1/status", get(mcp_public_api::get_mcp_status).with_state(profile_storage.clone()))
        .nest("/mcp", mcp_routes)
        .nest("/api/fingerprints", fingerprint_routes)
        // Cloud Sync e Cloud Auth
        .nest("/api/cloud-sync", cloud_sync_routes)
        .nest("/api/cloud-auth", cloud_auth_routes.clone())
        .nest("/api/auth", cloud_auth_routes) // Alias de compatibilidade com chamadas legadas
        // Recursos Desktop
        .nest("/api/proxies", proxy_routes)
        .nest("/api/extensions", extension_routes)
        .nest("/api/extension-categories", extension_category_routes)
        .nest("/api/tags", tag_routes)
        .nest("/api/browser", browser_routes)
        .nest("/api/app", app_routes)
        .nest("/api/ws", ws_routes)
        // ═══ Middleware de Autenticação em Camadas ═══
        .layer(axum::middleware::from_fn_with_state(
            security_state,
            api::security_layer,
        ));

    // Monta Swagger UI com a camada de CORS mais externa
    swagger::mount_swagger_ui(app).layer(cors)
}

/// Inicia o servidor Axum do ecossistema Star Multlogin na porta e diretório especificados
pub async fn start_star_server(
    data_dir_override: Option<String>,
    port: u16,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let nonce_manager = get_or_init_nonce_manager();
    start_star_server_with_nonce_manager(data_dir_override, port, nonce_manager).await
}

/// Inicia o servidor Axum permitindo injetar uma instância customizada de NonceManager
pub async fn start_star_server_with_nonce_manager(
    data_dir_override: Option<String>,
    port: u16,
    nonce_manager: Arc<NonceManager>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let data_dir = resolve_data_dir(data_dir_override);
    tracing::info!("📂 Diretório raiz de dados Star Multlogin: {}", data_dir);

    let _ = std::fs::create_dir_all(&data_dir);
    let _ = std::fs::create_dir_all(std::path::Path::new(&data_dir).join("profiles"));
    let _ = std::fs::create_dir_all(std::path::Path::new(&data_dir).join("binaries"));

    // 1. Blindagem de memória RAM anti-trojan/anti-poking
    crate::security::harden_process_memory();

    // 2. Inicialização do cofre criptografado Star Vault
    let vault = Arc::new(
        Vault::new(std::path::Path::new(&data_dir))
            .map_err(|e| format!("Falha ao inicializar Star Vault: {}", e))?,
    );

    let ws_state = ws::WsState::new();
    let profile_storage = Arc::new(ProfileStorage::new(&data_dir, ws_state.clone(), vault.clone()));
    let proxy_storage = Arc::new(ProxyStorage::new(vault.clone()));
    let tag_storage = Arc::new(TagStorage::new(vault.clone()));
    let extension_storage = Arc::new(ExtensionStorage::new(&data_dir));
    let extension_category_storage = Arc::new(ExtensionCategoryStorage::new(vault.clone()));

    // 3. Sincronização em nuvem e auto-sync
    let auth_service = Arc::new(cloud_auth::CloudAuthService::new(vault.clone()));
    let cloud_sync_service = Arc::new(
        cloud_sync::CloudSyncService::new(vault.clone(), auth_service.clone())
            .with_ws(ws_state.clone()),
    );
    let pm = profile_storage.get_process_manager();
    cloud_sync_service.set_running_checker(Arc::new(move |pid: &str| pm.is_running(pid)));

    let auto_sync_engine = Arc::new(cloud_sync::AutoSyncEngine::new(
        cloud_sync_service.clone(),
        auth_service.clone(),
        ws_state.clone(),
    ));
    profile_storage.set_auto_sync(auto_sync_engine);

    // 4. Inicia tarefa periódica de limpeza de tickets e sessões
    start_cleanup_task(nonce_manager.clone());

    // 5. Download e monitoramento de engine do navegador
    let browser_download_service = Arc::new(browser_downloader::BrowserDownloadService::new(
        std::path::Path::new(&data_dir),
        ws_state.clone(),
    ));
    let browser_state = routes::browser::BrowserRouteState {
        service: browser_download_service,
        data_dir: std::path::PathBuf::from(&data_dir),
    };

    // 6. Montagem do aplicativo Axum com segurança em camadas
    let app = build_app_router_with_nonce_manager(
        &data_dir,
        profile_storage,
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

    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    tracing::info!("🚀 Inicializando Star Multlogin Backend Rust em http://{}", addr);

    let mut listener_opt = None;
    for attempt in 1..=5 {
        match tokio::net::TcpListener::bind(addr).await {
            Ok(l) => {
                listener_opt = Some(l);
                break;
            }
            Err(e) => {
                if attempt == 5 {
                    return Err(format!("Falha ao abrir porta {}: {}", port, e).into());
                }
                tracing::warn!("Porta {} temporariamente ocupada (tentativa {}/5): {}. Aguardando 400ms...", port, attempt, e);
                tokio::time::sleep(tokio::time::Duration::from_millis(400)).await;
            }
        }
    }
    let listener = listener_opt.unwrap();
    tracing::info!("🚀 Star Multlogin Backend Rust escutando com sucesso em http://{}", addr);

    axum::serve(listener, app.into_make_service_with_connect_info::<SocketAddr>())
        .await
        .map_err(|e| format!("Erro ao executar servidor Axum: {}", e))?;

    Ok(())
}
