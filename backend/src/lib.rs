use axum::{
    routing::{delete, get, post, put},
    Router,
};
use utoipa::OpenApi;
use std::net::SocketAddr;
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};

pub mod browser_downloader;
pub mod server_sync;
pub use server_sync::{cloud_auth, cloud_sync};
pub mod cookie_manager;
pub mod extensions;
pub mod fingerprint;
pub mod id_generator;
pub mod launcher;
pub mod mcp;
pub mod models;
pub mod network;
pub mod proxy_validator;
pub mod routes;
pub mod security;
pub mod service_database;
pub mod tab_manager;
pub mod openapi;
pub mod version_app;
pub mod ws;

use extensions::ExtensionStorage;
use service_database::{ExtensionCategoryStorage, ProfileStorage, ProxyStorage, TagStorage, Vault};

/// Inicia o servidor Axum do ecossistema Star Multlogin na porta e diretório especificados
pub async fn start_star_server(
    data_dir_override: Option<String>,
    port: u16,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let data_dir = data_dir_override
        .or_else(|| std::env::var("STAR_DATA_DIR").ok())
        .or_else(|| std::env::var("STAR_DATA_DIR").ok())
        .unwrap_or_else(|| {
            let local_data = std::path::Path::new("./data");
            if local_data.exists() && local_data.is_dir() {
                "./data".to_string()
            } else {
                browser_downloader::platform::get_canonical_app_dir()
                    .to_string_lossy()
                    .to_string()
            }
        });

    let _ = std::fs::create_dir_all(&data_dir);
    let _ = std::fs::create_dir_all(std::path::Path::new(&data_dir).join("profiles"));
    let _ = std::fs::create_dir_all(std::path::Path::new(&data_dir).join("binaries"));

    // 1. Blindagem de memória RAM anti-trojan/anti-poking
    crate::security::harden_process_memory();

    // 2. Inicialização do cofre criptografado Star Vault em service_database/data
    let vault = Arc::new(Vault::new(std::path::Path::new(&data_dir))
        .map_err(|e| format!("Falha ao inicializar Star Vault: {}", e))?);

    let ws_state = ws::WsState::new();
    let profile_storage = Arc::new(ProfileStorage::new(&data_dir, ws_state.clone(), vault.clone()));
    let proxy_storage = Arc::new(ProxyStorage::new(vault.clone()));
    let tag_storage = Arc::new(TagStorage::new(vault.clone()));
    let extension_storage = Arc::new(ExtensionStorage::new(&data_dir));
    let extension_category_storage = Arc::new(ExtensionCategoryStorage::new(vault.clone()));

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
        .route(
            "/{id}/tabs",
            get(routes::tabs::get_profile_tabs).post(routes::tabs::open_profile_tab),
        )
        .route("/{id}/tabs/{tab_id}", delete(routes::tabs::close_profile_tab))
        .route(
            "/{id}/cookies",
            get(routes::cookies::get_profile_cookies)
                .post(routes::cookies::import_profile_cookies)
                .delete(routes::cookies::clear_profile_cookies),
        )
        .with_state(profile_storage.clone());

    let proxy_routes = Router::new()
        .route("/", get(routes::proxies::list_proxies).post(routes::proxies::create_proxy))
        .route("/test", post(routes::proxies::test_proxy))
        .route("/{id}", delete(routes::proxies::delete_proxy))
        .with_state(proxy_storage);

    let extension_routes = Router::new()
        .route("/", get(routes::extensions::list_extensions).post(routes::extensions::create_extension))
        .route("/{id}", put(routes::extensions::update_extension).delete(routes::extensions::delete_extension))
        .route("/catalog", get(routes::extensions::get_catalog))
        .with_state(extension_storage);

    let extension_category_routes = Router::new()
        .route(
            "/",
            get(routes::extension_categories::list_categories)
                .post(routes::extension_categories::create_category),
        )
        .route(
            "/{id}",
            get(routes::extension_categories::get_category)
                .put(routes::extension_categories::update_category)
                .delete(routes::extension_categories::delete_category),
        )
        .with_state(extension_category_storage);

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
    profile_storage.set_auto_sync(auto_sync_engine.clone());

    let auth_routes = Router::new()
        .route("/start-login", post(routes::auth::start_login))
        .route("/start-register", post(routes::auth::start_register))
        .route("/callback", get(routes::auth::callback))
        .route("/session/{session_id}", get(routes::auth::get_session_status))
        .route("/me", get(routes::auth::me))
        .route("/logout", post(routes::auth::logout))
        .with_state(auth_service);

    let cloud_sync_routes = Router::new()
        .route("/pull", post(routes::cloud_sync::pull_all_cloud_profiles))
        .route("/two-way", post(routes::cloud_sync::two_way_sync))
        .route("/sync-all", post(routes::cloud_sync::two_way_sync))
        .route("/{id}/sync", post(routes::cloud_sync::sync_to_cloud))
        .route("/{id}/restore", post(routes::cloud_sync::restore_from_cloud))
        .route("/{id}/stat", get(routes::cloud_sync::get_cloud_stat))
        .route("/{id}/cloud-sync", post(routes::cloud_sync::sync_to_cloud))
        .route("/{id}/cloud-restore", post(routes::cloud_sync::restore_from_cloud))
        .route("/{id}/cloud-status", get(routes::cloud_sync::get_cloud_stat))
        .route("/health", get(routes::cloud_sync::check_cloud_health))
        .with_state(cloud_sync_service);

    let tag_routes = Router::new()
        .route("/", get(routes::tags::list_tags).post(routes::tags::create_tag))
        .route(
            "/{id}",
            get(routes::tags::get_tag)
                .put(routes::tags::update_tag)
                .delete(routes::tags::delete_tag),
        )
        .route("/batch-delete", post(routes::tags::batch_delete_tags))
        .with_state(tag_storage);

    let browser_download_service = Arc::new(browser_downloader::BrowserDownloadService::new(
        std::path::Path::new(&data_dir),
        ws_state.clone(),
    ));

    let browser_route_state = routes::browser::BrowserRouteState {
        service: browser_download_service.clone(),
        data_dir: std::path::PathBuf::from(&data_dir),
    };

    let browser_routes = Router::new()
        .route("/status", get(routes::browser::get_browser_status))
        .route("/download", post(routes::browser::trigger_browser_download))
        .route("/manifest", get(routes::browser::get_browser_manifest))
        .with_state(browser_route_state);

    let app_version_service = Arc::new(version_app::AppVersionService::new());
    let app_version_routes = version_app::create_app_version_routes(app_version_service);

    let ws_routes = Router::new()
        .route("/", get(ws::ws_handler))
        .with_state(ws_state);

    let token = mcp::security::ensure_token(vault.clone())
        .map_err(|e| format!("Falha ao inicializar api-token: {}", e))?;
    let token_state = mcp::security::TokenState::new(token, vault.clone(), std::path::PathBuf::from(&data_dir));

    let mcp_routes = mcp::create_mcp_router(
        profile_storage.clone(),
        std::path::PathBuf::from(&data_dir),
        token_state.clone(),
    );

    let native_mcp_routes = mcp::create_native_mcp_router(
        profile_storage.clone(),
        token_state,
    );

    let app = Router::new()
        .merge(
            utoipa_swagger_ui::SwaggerUi::new("/docs")
                .url("/docs/openapi.json", openapi::ApiDoc::openapi()),
        )
        .nest("/api/profiles", profile_routes)
        .nest("/api/cloud-sync", cloud_sync_routes)
        .nest("/api/proxies", proxy_routes)
        .nest("/api/extensions", extension_routes)
        .nest("/api/extension-categories", extension_category_routes)
        .nest("/api/tags", tag_routes)
        .nest("/api/auth", auth_routes)
        .nest("/api/browser", browser_routes)
        .nest("/api/app", app_version_routes)
        .nest("/api/ws", ws_routes)
        .nest("/api/v1", mcp_routes.clone())
        .nest("/v1", mcp_routes)
        .merge(native_mcp_routes)
        .layer(cors);

    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    tracing::info!("🚀 Star Multlogin Backend Rust iniciado com sucesso em http://{}", addr);
    tracing::info!("📑 Documentação Swagger UI disponível em http://{}/docs", addr);

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .map_err(|e| format!("Falha ao abrir porta {}: {}", port, e))?;

    axum::serve(listener, app)
        .await
        .map_err(|e| format!("Erro ao executar servidor Axum: {}", e))?;

    Ok(())
}

/// Alias para manter compatibilidade com chamadas legadas
#[inline]
pub async fn start_fury_server(
    data_dir_override: Option<String>,
    port: u16,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    start_star_server(data_dir_override, port).await
}
