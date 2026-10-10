use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let data_dir = std::env::var("STAR_DATA_DIR").ok();
    let port: u16 = std::env::var("STAR_BACKEND_PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(12540);

    if let Err(e) = star_multlogin_backend::start_star_server(data_dir, port).await {
        tracing::error!("Erro no servidor Star Multlogin Backend: {}", e);
    }
}
