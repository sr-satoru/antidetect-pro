use axum::{
    routing::{delete, get, post, put},
    Router,
};
use std::net::SocketAddr;
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};

pub mod browser_downloader;
pub mod extensions;
pub mod extraction_session;
pub mod fingerprint;
pub mod id_generator;
pub mod launcher;
pub mod mcp;
pub mod models;
pub mod network;
pub mod openapi;
pub mod proxy_validator;
pub mod routes;
pub mod security;
pub mod server_sync;
pub mod service_database;
pub mod ws;

pub use server_sync::{cloud_auth, cloud_sync};

use extensions::ExtensionStorage;
use service_database::{ExtensionCategoryStorage, ProfileStorage, ProxyStorage, TagStorage, Vault};

/// Resolve o diretório raiz de dados do aplicativo
fn resolve_data_dir(data_dir_override: Option<String>) -> String {
    data_dir_override
        .or_else(|| std::env::var("STAR_DATA_DIR").ok())
        .unwrap_or_else(|| {
            let local_data = std::path::Path::new("./data");
            if local_data.is_dir() {
                "./data".to_string()
            } else {
                browser_downloader::platform::get_canonical_app_dir()
                    .to_string_lossy()
                    .to_string()
            }
        })
}

/// Constrói o roteador Axum completo com todos os módulos, documentação Swagger e middlewares
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
    token_state: mcp::security::TokenState,
) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let profile_routes = Router::new()
        .route("/", get(routes::profiles::list_profiles).post(routes::profiles::create_profile))
        .route("/trash", get(routes::profiles::list_trash))
        .route("/trash/empty", delete(routes::profiles::empty_trash))
        .route(
            "/{id}",
            get(routes::profiles::get_profile)
                .put(routes::profiles::update_profile)
                .delete(routes::profiles::delete_profile),
        )
        .route("/{id}/launch", post(routes::profiles::launch_profile))
        .route("/{id}/stop", post(routes::profiles::stop_profile))
        .route("/{id}/clone", post(routes::profiles::clone_profile))
        .route("/{id}/restore", post(routes::profiles::restore_profile))
        .route("/{id}/permanent", delete(routes::profiles::delete_permanent))
        .route("/{id}/tabs", get(routes::tabs::get_profile_tabs).post(routes::tabs::open_profile_tab))
        .route("/{id}/tabs/{tab_id}", delete(routes::tabs::close_profile_tab))
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

    let auth_routes = Router::new()
        .route("/start-login", post(routes::auth::start_login))
        .route("/start-register", post(routes::auth::start_register))
        .route("/callback", get(routes::auth::callback))
        .route("/session/{session_id}", get(routes::auth::get_session_status))
        .route("/me", get(routes::auth::me))
        .route("/logout", post(routes::auth::logout))
        .with_state(auth_service);

    let cloud_sync_routes = Router::new()
        .route("/health", get(routes::cloud_sync::check_cloud_health))
        .route("/pull", post(routes::cloud_sync::pull_all_cloud_profiles))
        .route("/two-way", post(routes::cloud_sync::two_way_sync))
        .route("/{id}/sync", post(routes::cloud_sync::sync_to_cloud))
        .route("/{id}/restore", post(routes::cloud_sync::restore_from_cloud))
        .route("/{id}/stat", get(routes::cloud_sync::get_cloud_stat))
        .with_state(cloud_sync_service);

    let browser_routes = Router::new()
        .route("/status", get(routes::browser::get_browser_status))
        .route("/download", post(routes::browser::trigger_browser_download))
        .route("/manifest", get(routes::browser::get_browser_manifest))
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
        .with_state(app_update_service);

    let ws_routes = Router::new()
        .route("/", get(ws::ws_handler))
        .with_state(ws_state);

    let mcp_routes = mcp::create_mcp_router(
        profile_storage.clone(),
        std::path::PathBuf::from(data_dir),
        token_state.clone(),
    );

    let native_mcp_routes = mcp::create_native_mcp_router(profile_storage, token_state);

    Router::new()
        .nest("/api/profiles", profile_routes)
        .nest("/api/cloud-sync", cloud_sync_routes)
        .nest("/api/proxies", proxy_routes)
        .nest("/api/extensions", extension_routes)
        .nest("/api/extension-categories", extension_category_routes)
        .nest("/api/tags", tag_routes)
        .nest("/api/auth", auth_routes)
        .nest("/api/browser", browser_routes)
        .nest("/api/app", app_routes)
        .nest("/api/ws", ws_routes)
        .nest("/api/v1", mcp_routes.clone())
        .nest("/v1", mcp_routes)
        .merge(native_mcp_routes)
        .layer(cors)
}

/// Inicia o servidor Axum do ecossistema Star Multlogin na porta e diretório especificados
pub async fn start_star_server(
    data_dir_override: Option<String>,
    port: u16,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let data_dir = resolve_data_dir(data_dir_override);

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
        cloud_sync::CloudSyncService::new(&data_dir, auth_service.clone())
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

    // 4. Token e rotas do subsistema MCP
    let token = mcp::security::ensure_token(vault.clone())
        .map_err(|e| format!("Falha ao inicializar api-token: {}", e))?;
    let token_state = mcp::security::TokenState::new(
        token,
        vault.clone(),
        std::path::PathBuf::from(&data_dir),
    );

    // 5. Download e monitoramento de engine do navegador
    let browser_download_service = Arc::new(browser_downloader::BrowserDownloadService::new(
        std::path::Path::new(&data_dir),
        ws_state.clone(),
    ));
    let browser_state = routes::browser::BrowserRouteState {
        service: browser_download_service,
        data_dir: std::path::PathBuf::from(&data_dir),
    };

    // 6. Montagem do aplicativo Axum
    let app = build_app_router(
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
        token_state,
    );

    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    tracing::info!("🚀 Star Multlogin Backend Rust iniciado com sucesso em http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .map_err(|e| format!("Falha ao abrir porta {}: {}", port, e))?;

    axum::serve(listener, app)
        .await
        .map_err(|e| format!("Erro ao executar servidor Axum: {}", e))?;

    Ok(())
}
