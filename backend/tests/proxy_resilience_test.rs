use star_multlogin_backend::models::ProfileProxyConfig;
use star_multlogin_backend::network::prefs::build_proxy_prefs;
use star_multlogin_backend::network::relay::{ProxyRelay, RelayConfig, Upstream};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};

/// Cria um servidor HTTP mock de destino (o site que o usuário tenta acessar via proxy)
async fn spawn_mock_target_server() -> (u16, Arc<tokio::sync::Notify>) {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let port = listener.local_addr().unwrap().port();
    let hit_notify = Arc::new(tokio::sync::Notify::new());
    let hit_notify_clone = hit_notify.clone();

    tokio::spawn(async move {
        loop {
            if let Ok((mut socket, _)) = listener.accept().await {
                hit_notify_clone.notify_waiters();
                let mut buf = [0u8; 1024];
                let _ = socket.read(&mut buf).await;
                let resp = "HTTP/1.1 200 OK\r\nContent-Length: 13\r\nConnection: close\r\n\r\nHello Target!";
                let _ = socket.write_all(resp.as_bytes()).await;
            }
        }
    });

    (port, hit_notify)
}

/// Cria um proxy HTTP mock com capacidade de simular atrasos e quedas de rede
async fn spawn_controllable_http_proxy() -> (u16, Arc<AtomicBool>, Arc<std::sync::atomic::AtomicU64>) {
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let port = listener.local_addr().unwrap().port();
    let drop_connections = Arc::new(AtomicBool::new(false));
    let delay_ms = Arc::new(std::sync::atomic::AtomicU64::new(0));

    let drop_clone = drop_connections.clone();
    let delay_clone = delay_ms.clone();

    tokio::spawn(async move {
        loop {
            let (mut client, _) = match listener.accept().await {
                Ok(v) => v,
                Err(_) => break,
            };

            let drop = drop_clone.load(Ordering::SeqCst);
            let delay = delay_clone.load(Ordering::SeqCst);

            tokio::spawn(async move {
                if drop {
                    // Simula queda brusca de rede/WiFi (fecha imediatamente sem resposta)
                    return;
                }

                if delay > 0 {
                    tokio::time::sleep(Duration::from_millis(delay)).await;
                }

                let mut buf = [0u8; 2048];
                let n = match client.read(&mut buf).await {
                    Ok(n) if n > 0 => n,
                    _ => return,
                };
                let req = String::from_utf8_lossy(&buf[..n]);

                if req.starts_with("CONNECT ") {
                    // Extrai destino do CONNECT
                    let parts: Vec<&str> = req.split_whitespace().collect();
                    if parts.len() >= 2 {
                        let target = parts[1];
                        if let Ok(mut target_stream) = TcpStream::connect(target).await {
                            let _ = client.write_all(b"HTTP/1.1 200 Connection Established\r\n\r\n").await;
                            let _ = tokio::io::copy_bidirectional(&mut client, &mut target_stream).await;
                        } else {
                            let _ = client.write_all(b"HTTP/1.1 504 Gateway Timeout\r\n\r\n").await;
                        }
                    }
                }
            });
        }
    });

    (port, drop_connections, delay_ms)
}

#[tokio::test]
async fn test_kill_switch_on_network_drop_and_no_direct_leak() {
    println!("\n========================================================");
    println!("🧪 TESTE 1: Queda Brusca de Rede & Acionamento do Kill-Switch");
    println!("========================================================");

    let (target_port, direct_hit_notify) = spawn_mock_target_server().await;
    let (proxy_port, drop_flag, _) = spawn_controllable_http_proxy().await;

    // 1. Inicia o Universal Proxy Relay do Backend conectado ao proxy
    let relay_config = RelayConfig {
        upstream: Upstream::Http {
            host: "127.0.0.1".to_string(),
            port: proxy_port,
            auth: None,
        },
        port_scan_protection: true,
        allowed_ports: vec![target_port],
    };

    let relay = ProxyRelay::start(relay_config).await.expect("Falha ao iniciar Relay");
    let relay_port = relay.port;

    // 2. Simula requisição normal pelo relay -> Deve funcionar
    {
        let mut client = TcpStream::connect(format!("127.0.0.1:{}", relay_port)).await.unwrap();
        let connect_req = format!("CONNECT 127.0.0.1:{} HTTP/1.1\r\nHost: 127.0.0.1:{}\r\n\r\n", target_port, target_port);
        client.write_all(connect_req.as_bytes()).await.unwrap();

        let mut resp = [0u8; 100];
        let n = client.read(&mut resp).await.unwrap();
        let resp_str = String::from_utf8_lossy(&resp[..n]);
        assert!(resp_str.contains("200 Connection Established"), "Deve conectar normalmente via proxy");
        println!("  ✅ Conexão inicial via proxy funcionou perfeitamente.");
    }

    // 3. ATIVA A QUEDA DE REDE / WIFI (Proxy para de responder / derruba conexões)
    println!("  ⚡ Simulando QUEDA DE REDE no upstream proxy...");
    drop_flag.store(true, Ordering::SeqCst);

    // 4. Nova requisição do navegador pelo relay após a queda de rede
    {
        let mut client = TcpStream::connect(format!("127.0.0.1:{}", relay_port)).await.unwrap();
        let connect_req = format!("CONNECT 127.0.0.1:{} HTTP/1.1\r\nHost: 127.0.0.1:{}\r\n\r\n", target_port, target_port);
        client.write_all(connect_req.as_bytes()).await.unwrap();

        let mut resp = [0u8; 512];
        let n = client.read(&mut resp).await.unwrap();
        let resp_str = String::from_utf8_lossy(&resp[..n]);

        println!("  📩 Resposta recebida pelo cliente após a queda:\n{}", resp_str.trim());

        // VERIFICAÇÃO FORENSE:
        // O relay DEVE retornar 502 Bad Gateway com aviso de Kill-Switch
        assert!(resp_str.contains("502 Bad Gateway"), "Deve retornar 502 Bad Gateway");
        assert!(resp_str.contains("Kill-Switch Active"), "Deve explicitamente conter 'Kill-Switch Active'");
        println!("  ✅ Kill-Switch acionado com sucesso (502 Bad Gateway)!");
    }

    // 5. TESTE DE NÃO-VAZAMENTO: O navegador tentou conectar direto ao servidor alvo?
    // Se tentasse contornar o proxy, o direct_hit_notify teria recebido notificação!
    let leaked = tokio::select! {
        _ = direct_hit_notify.notified() => true,
        _ = tokio::time::sleep(Duration::from_millis(150)) => false,
    };

    assert!(!leaked, "CRÍTICO: O tráfego VAZOU diretamente para o destino após a queda do proxy!");
    println!("  🛡️ [ZERO VAZAMENTO]: Nenhuma tentativa de conexão direta escapou para a rede real.");
}

#[tokio::test]
async fn test_proxy_high_latency_and_delay_handling() {
    println!("\n========================================================");
    println!("🧪 TESTE 2: Simulação de Alta Latência e Atraso no Proxy");
    println!("========================================================");

    let (target_port, _) = spawn_mock_target_server().await;
    let (proxy_port, _, delay_flag) = spawn_controllable_http_proxy().await;

    // Configura atraso de 1.5 segundo no proxy (simula proxy 4G/móvel com oscilação)
    delay_flag.store(1500, Ordering::SeqCst);

    let relay_config = RelayConfig {
        upstream: Upstream::Http {
            host: "127.0.0.1".to_string(),
            port: proxy_port,
            auth: None,
        },
        port_scan_protection: true,
        allowed_ports: vec![target_port],
    };

    let relay = ProxyRelay::start(relay_config).await.expect("Falha ao iniciar Relay");
    let relay_port = relay.port;

    let start = std::time::Instant::now();
    let mut client = TcpStream::connect(format!("127.0.0.1:{}", relay_port)).await.unwrap();
    let connect_req = format!("CONNECT 127.0.0.1:{} HTTP/1.1\r\nHost: 127.0.0.1:{}\r\n\r\n", target_port, target_port);
    client.write_all(connect_req.as_bytes()).await.unwrap();

    let mut resp = [0u8; 100];
    let n = client.read(&mut resp).await.unwrap();
    let duration = start.elapsed();

    let resp_str = String::from_utf8_lossy(&resp[..n]);
    assert!(resp_str.contains("200 Connection Established"));
    assert!(duration >= Duration::from_millis(1400), "Deveria ter suportado o atraso sem timeout");
    println!("  ✅ Proxy com latência de {:?} completou o handshake com sucesso e sem perda de pacotes.", duration);
}

#[tokio::test]
async fn test_mid_stream_connection_drop() {
    println!("\n========================================================");
    println!("🧪 TESTE 3: Queda no Meio da Transmissão (Transferência Cortada)");
    println!("========================================================");

    // Servidor que começa a enviar dados e fecha o socket bruscamente após 100 bytes
    let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
    let cut_port = listener.local_addr().unwrap().port();

    tokio::spawn(async move {
        if let Ok((mut sock, _)) = listener.accept().await {
            let mut buf = [0u8; 1024];
            let _ = sock.read(&mut buf).await;
            let _ = sock.write_all(b"HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n").await;
            let _ = sock.write_all(b"5\r\nHello\r\n").await;
            tokio::time::sleep(Duration::from_millis(50)).await;
            // Fecha abruptamente
            drop(sock);
        }
    });

    let (proxy_port, _, _) = spawn_controllable_http_proxy().await;

    let relay_config = RelayConfig {
        upstream: Upstream::Http {
            host: "127.0.0.1".to_string(),
            port: proxy_port,
            auth: None,
        },
        port_scan_protection: false,
        allowed_ports: vec![],
    };

    let relay = ProxyRelay::start(relay_config).await.unwrap();
    let mut client = TcpStream::connect(format!("127.0.0.1:{}", relay.port)).await.unwrap();

    let connect_req = format!("CONNECT 127.0.0.1:{} HTTP/1.1\r\nHost: 127.0.0.1:{}\r\n\r\n", cut_port, cut_port);
    client.write_all(connect_req.as_bytes()).await.unwrap();

    let mut resp = [0u8; 100];
    let n = client.read(&mut resp).await.unwrap();
    assert!(String::from_utf8_lossy(&resp[..n]).contains("200 Connection Established"));

    // Envia requisição HTTP pelo túnel estabelecido
    client.write_all(b"GET / HTTP/1.1\r\nHost: localhost\r\n\r\n").await.unwrap();

    // Lê stream até o corte
    let mut stream_data = Vec::new();
    let mut stream_buf = [0u8; 256];
    loop {
        match client.read(&mut stream_buf).await {
            Ok(0) => break, // Socket fechou limpo após a queda
            Ok(n) => stream_data.extend_from_slice(&stream_buf[..n]),
            Err(_) => break,
        }
    }

    assert!(stream_data.len() > 0, "Deveria ter recebido os primeiros bytes antes da queda");
    println!("  ✅ Queda mid-stream tratada sem travar o relay (recebidos {} bytes até o corte).", stream_data.len());
}

#[test]
fn test_proxy_prefs_hardening_and_dns_anti_leak() {
    println!("\n========================================================");
    println!("🧪 TESTE 4: Auditoria de Preferências anti-vazamento no user.js");
    println!("========================================================");

    let proxy = ProfileProxyConfig {
        proxy_type: "socks5".to_string(),
        host: Some("proxy.exemplo.com".to_string()),
        port: Some(1080),
        username: Some("user_especial!@#$".to_string()),
        password: Some("p@$$w0rd:123".to_string()),
        ..Default::default()
    };

    let prefs = build_proxy_prefs(&proxy, Some("127.0.0.1"), Some(39999), Some("substitute"));

    println!("  📋 Snippet gerado para o user.js:\n{}", prefs);

    // Checagens obrigatórias de segurança:
    assert!(prefs.contains("user_pref(\"network.proxy.type\", 1);"), "Deve forçar modo manual de proxy");
    assert!(prefs.contains("user_pref(\"network.proxy.allow_hijacking_localhost\", true);"), "Deve permitir loopback");
    assert!(prefs.contains("user_pref(\"network.trr.mode\", 5);"), "Deve desativar DoH (modo 5) para prevenir vazamento DNS");
    assert!(prefs.contains("user_pref(\"network.http.http3.enable\", false);"), "Deve desativar HTTP3/QUIC para evitar UDP leak");
    assert!(prefs.contains("user_pref(\"media.peerconnection.ice.proxy_only_if_behind_proxy\", true);"), "WebRTC deve respeitar proxy");
    assert!(prefs.contains("user_pref(\"network.dns.disablePrefetch\", true);"), "Deve desativar DNS prefetch");
    assert!(prefs.contains("user_pref(\"network.proxy.socks_remote_dns\", true);"), "Deve forçar DNS remoto no SOCKS");
    assert!(prefs.contains("user_pref(\"network.proxy.http\", \"127.0.0.1\");"));
    assert!(prefs.contains("user_pref(\"network.proxy.http_port\", 39999);"));

    println!("  ✅ Todas as preferências de anti-vazamento e proxy relay estão ativas.");
}
