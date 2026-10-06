

/// Escolhe uma porta TCP local disponível
pub fn pick_available_port() -> u16 {
    std::net::TcpListener::bind("127.0.0.1:0")
        .and_then(|l| l.local_addr())
        .map(|a| a.port())
        .unwrap_or(18922)
}

/// Aguarda a porta TCP do Camoufox abrir e retorna o endpoint de depuração e automação
pub async fn wait_for_devtools_endpoint(port: u16) -> Option<String> {
    let addr = format!("127.0.0.1:{port}");
    
    // Tenta conectar na porta TCP local (abre em poucos milissegundos)
    for _ in 0..40 {
        if tokio::net::TcpStream::connect(&addr).await.is_ok() {
            return Some(format!("ws://127.0.0.1:{port}/session"));
        }
        tokio::time::sleep(std::time::Duration::from_millis(50)).await;
    }

    // Endpoint canônico para conexões Playwright / depuração remota
    Some(format!("ws://127.0.0.1:{port}/session"))
}

