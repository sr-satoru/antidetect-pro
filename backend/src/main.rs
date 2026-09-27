use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let data_dir = std::env::var("FURY_DATA_DIR").ok();
    let port: u16 = std::env::var("FURY_BACKEND_PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(12540);

    if let Err(e) = fury_backend::start_fury_server(data_dir, port).await {
        tracing::error!("Erro no servidor Fury Backend: {}", e);
    }
}
