use axum::{
    routing::{delete, get, post, put},
    Router,
};
use std::net::SocketAddr;
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod models;
mod routes;
mod storage;

use storage::{ProfileStorage, ProxyStorage};

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Diretório de dados local (estilo Donut Browser)
    let data_dir = std::env::var("FURY_DATA_DIR").unwrap_or_else(|_| "./data".to_string());
    let profile_storage = Arc::new(ProfileStorage::new(&data_dir));
    let proxy_storage = Arc::new(ProxyStorage::new(&data_dir));

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
        .route("/{id}/restore", post(routes::profiles::restore_profile))
        .route("/{id}/permanent", delete(routes::profiles::delete_permanent))
        .with_state(profile_storage);

    let proxy_routes = Router::new()
        .route("/", get(routes::proxies::list_proxies).post(routes::proxies::create_proxy))
        .route("/test", post(routes::proxies::test_proxy))
        .route("/{id}", delete(routes::proxies::delete_proxy))
        .with_state(proxy_storage);

    let extension_routes = Router::new()
        .route("/", get(routes::extensions::list_extensions).post(routes::extensions::create_extension))
        .route("/{id}", put(routes::extensions::update_extension).delete(routes::extensions::delete_extension))
        .route("/catalog", get(routes::extensions::get_catalog));

    let auth_routes = Router::new()
        .route("/login", post(routes::auth::login))
        .route("/register", post(routes::auth::register))
        .route("/me", get(routes::auth::me));

    let app = Router::new()
        .nest("/api/profiles", profile_routes)
        .nest("/api/proxies", proxy_routes)
        .nest("/api/extensions", extension_routes)
        .nest("/api/auth", auth_routes)
        .layer(cors);

    let addr = SocketAddr::from(([127, 0, 0, 1], 8000));
    tracing::info!("🚀 Fury Backend Rust iniciado com sucesso em http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("Falha ao abrir porta 8000");

    axum::serve(listener, app)
        .await
        .expect("Erro ao executar servidor Axum");
}
