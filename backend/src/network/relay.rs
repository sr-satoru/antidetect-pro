// SPDX-License-Identifier: MIT OR Apache-2.0
// Universal In-Process Proxy Relay for Star Multlogin (Camoufox)

use std::io;
use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use tracing::{debug, warn};

const CONNECT_TIMEOUT: Duration = Duration::from_secs(20);
const HANDSHAKE_TIMEOUT: Duration = Duration::from_secs(15);

#[derive(Clone)]
pub struct Credentials {
    pub username: String,
    pub password: String,
}

impl std::fmt::Debug for Credentials {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Credentials")
            .field("username", &self.username)
            .field("password", &"***")
            .finish()
    }
}

#[derive(Debug, Clone)]
pub enum Upstream {
    Http {
        host: String,
        port: u16,
        auth: Option<Credentials>,
    },
    Socks5 {
        host: String,
        port: u16,
        auth: Option<Credentials>,
    },
    Direct,
}

#[derive(Debug, Clone)]
pub struct RelayConfig {
    pub upstream: Upstream,
    pub port_scan_protection: bool,
    pub allowed_ports: Vec<u16>,
}

pub struct ProxyRelay {
    pub port: u16,
    shutdown_sender: Option<tokio::sync::oneshot::Sender<()>>,
}

impl ProxyRelay {
    /// Inicia o Proxy Relay em um porto loopback dinâmico (127.0.0.1:0)
    pub async fn start(config: RelayConfig) -> Result<Self, io::Error> {
        let listener = TcpListener::bind(SocketAddr::from(([127, 0, 0, 1], 0))).await?;
        let port = listener.local_addr()?.port();
        let (tx, rx) = tokio::sync::oneshot::channel::<()>();

        let config = Arc::new(config);

        tokio::spawn(async move {
            tokio::select! {
                _ = rx => {
                    debug!("ProxyRelay na porta {} encerrado via shutdown.", port);
                }
                _ = run_listener(listener, config) => {}
            }
        });

        debug!("🛡️ ProxyRelay ativo em 127.0.0.1:{}", port);
        Ok(Self {
            port,
            shutdown_sender: Some(tx),
        })
    }

    /// Envia sinal para terminar o listener do relay
    pub fn stop(&mut self) {
        if let Some(tx) = self.shutdown_sender.take() {
            let _ = tx.send(());
        }
    }
}

impl Drop for ProxyRelay {
    fn drop(&mut self) {
        self.stop();
    }
}

async fn run_listener(listener: TcpListener, config: Arc<RelayConfig>) {
    loop {
        let (client, _) = match listener.accept().await {
            Ok(v) => v,
            Err(e) => {
                warn!("ProxyRelay accept falhou: {}", e);
                tokio::time::sleep(Duration::from_millis(50)).await;
                continue;
            }
        };

        let conf = Arc::clone(&config);
        tokio::spawn(async move {
            if let Err(e) = handle_client(client, conf).await {
                debug!("Sessão do cliente finalizada: {}", e);
            }
        });
    }
}

async fn handle_client(mut client: TcpStream, config: Arc<RelayConfig>) -> Result<(), io::Error> {
    let (head, leftover) = read_request_head(&mut client).await?;
    let (method, target) = match parse_request_line(&head) {
        Some(m) => m,
        None => {
            let _ = client.write_all(b"HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n").await;
            return Ok(());
        }
    };

    let (host, port) = if method == "CONNECT" {
        match split_host_port(&target, 443) {
            Some(hp) => hp,
            None => {
                let _ = client.write_all(b"HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n").await;
                return Ok(());
            }
        }
    } else {
        match absolute_uri_host(&target)
            .or_else(|| header_host(&head))
            .and_then(|h| split_host_port(&h, 80))
        {
            Some(hp) => hp,
            None => {
                let _ = client.write_all(b"HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n").await;
                return Ok(());
            }
        }
    };

    // Verificação de Port Scan Protection / Acesso a redes internas e loopback
    if is_blocked_target(&host, port, config.port_scan_protection, &config.allowed_ports) {
        warn!("🚫 Alvo bloqueado por Port Scan Protection: {}:{}", host, port);
        let _ = client
            .write_all(b"HTTP/1.1 502 Bad Gateway\r\nContent-Type: text/plain\r\nConnection: close\r\n\r\nBlocked by port scan protection\r\n")
            .await;
        return Ok(());
    }

    // Kill-Switch: Conexão ao upstream. Se falhar, retorna 502 e NUNCA vaza conexão direta.
    let mut upstream = match dial_upstream(&config.upstream, &host, port).await {
        Ok(s) => s,
        Err(e) => {
            warn!("⚠️ Upstream proxy falhou para {}:{} ({}) - Acionando Kill-Switch (502)", host, port, e);
            let _ = client
                .write_all(b"HTTP/1.1 502 Bad Gateway\r\nContent-Type: text/plain\r\nX-Kill-Switch: active\r\nConnection: close\r\n\r\nUpstream proxy connection failed (Kill-Switch Active)\r\n")
                .await;
            return Ok(());
        }
    };

    if method == "CONNECT" {
        client
            .write_all(b"HTTP/1.1 200 Connection Established\r\n\r\n")
            .await?;
    } else {
        let cleaned = strip_proxy_headers(&head);
        upstream.write_all(cleaned.as_bytes()).await?;
        if !leftover.is_empty() {
            upstream.write_all(&leftover).await?;
        }
    }

    let _ = tokio::io::copy_bidirectional(&mut client, &mut upstream).await;
    Ok(())
}

async fn dial_upstream(upstream: &Upstream, target_host: &str, target_port: u16) -> Result<TcpStream, io::Error> {
    match upstream {
        Upstream::Http { host, port, auth } => {
            let mut stream = connect_with_timeout(host, *port).await?;
            http_connect(&mut stream, target_host, target_port, auth.as_ref()).await?;
            Ok(stream)
        }
        Upstream::Socks5 { host, port, auth } => {
            let mut stream = connect_with_timeout(host, *port).await?;
            socks5_connect(&mut stream, target_host, target_port, auth.as_ref()).await?;
            Ok(stream)
        }
        Upstream::Direct => {
            connect_with_timeout(target_host, target_port).await
        }
    }
}

async fn connect_with_timeout(host: &str, port: u16) -> Result<TcpStream, io::Error> {
    match tokio::time::timeout(CONNECT_TIMEOUT, TcpStream::connect((host, port))).await {
        Ok(Ok(stream)) => Ok(stream),
        Ok(Err(e)) => Err(e),
        Err(_) => Err(io::Error::new(
            io::ErrorKind::TimedOut,
            format!("Timeout ao conectar a {}:{}", host, port),
        )),
    }
}

async fn http_connect(
    s: &mut TcpStream,
    target_host: &str,
    target_port: u16,
    auth: Option<&Credentials>,
) -> Result<(), io::Error> {
    let mut req = format!("CONNECT {target_host}:{target_port} HTTP/1.1\r\nHost: {target_host}:{target_port}\r\n");
    if let Some(c) = auth {
        use base64::engine::general_purpose::STANDARD as BASE64;
        use base64::Engine;
        let token = BASE64.encode(format!("{}:{}", c.username, c.password).as_bytes());
        req.push_str(&format!("Proxy-Authorization: Basic {token}\r\n"));
    }
    req.push_str("Proxy-Connection: Keep-Alive\r\n\r\n");

    s.write_all(req.as_bytes()).await?;

    let (head, _) = tokio::time::timeout(HANDSHAKE_TIMEOUT, read_request_head(s))
        .await
        .map_err(|_| io::Error::new(io::ErrorKind::TimedOut, "Handshake timeout HTTP proxy"))??;

    if !head.starts_with("HTTP/") {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "Resposta do proxy HTTP não inicia com HTTP/",
        ));
    }

    let status = head
        .split_whitespace()
        .nth(1)
        .and_then(|c| c.parse::<u16>().ok())
        .unwrap_or(0);

    if (200..=299).contains(&status) {
        Ok(())
    } else {
        Err(io::Error::new(
            io::ErrorKind::PermissionDenied,
            format!("Proxy HTTP retornou status {}", status),
        ))
    }
}

async fn socks5_connect(
    s: &mut TcpStream,
    target_host: &str,
    target_port: u16,
    auth: Option<&Credentials>,
) -> Result<(), io::Error> {
    let methods: &[u8] = if auth.is_some() { &[0x00, 0x02] } else { &[0x00] };
    let mut greeting = vec![0x05, methods.len() as u8];
    greeting.extend_from_slice(methods);
    s.write_all(&greeting).await?;

    let mut resp = [0u8; 2];
    tokio::time::timeout(HANDSHAKE_TIMEOUT, s.read_exact(&mut resp))
        .await
        .map_err(|_| io::Error::new(io::ErrorKind::TimedOut, "Timeout no greeting SOCKS5"))??;

    if resp[0] != 0x05 {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            format!("Resposta inesperada do servidor SOCKS5: 0x{:02x}", resp[0]),
        ));
    }

    match resp[1] {
        0x00 => {} // Sem autenticação necessária
        0x02 => {
            // Autenticação RFC 1929 Username/Password
            let c = auth.ok_or_else(|| {
                io::Error::new(io::ErrorKind::PermissionDenied, "Proxy SOCKS5 exige autenticação")
            })?;
            let u_bytes = c.username.as_bytes();
            let p_bytes = c.password.as_bytes();
            if u_bytes.len() > 255 || p_bytes.len() > 255 {
                return Err(io::Error::new(
                    io::ErrorKind::InvalidInput,
                    "Credenciais SOCKS5 excedem 255 bytes",
                ));
            }

            let mut auth_req = vec![0x01, u_bytes.len() as u8];
            auth_req.extend_from_slice(u_bytes);
            auth_req.push(p_bytes.len() as u8);
            auth_req.extend_from_slice(p_bytes);
            s.write_all(&auth_req).await?;

            let mut auth_resp = [0u8; 2];
            tokio::time::timeout(HANDSHAKE_TIMEOUT, s.read_exact(&mut auth_resp))
                .await
                .map_err(|_| io::Error::new(io::ErrorKind::TimedOut, "Timeout na autenticação SOCKS5"))??;

            if auth_resp[1] != 0x00 {
                return Err(io::Error::new(
                    io::ErrorKind::PermissionDenied,
                    "Autenticação SOCKS5 recusada pelo upstream",
                ));
            }
        }
        _ => {
            return Err(io::Error::new(
                io::ErrorKind::PermissionDenied,
                format!("Método SOCKS5 0x{:02x} não suportado", resp[1]),
            ));
        }
    }

    // SOCKS5 CONNECT com ATYP=0x03 (Domain Name) para garantir resolução remota (SOCKS5h) e prevenir vazamento de DNS
    let host_bytes = target_host.as_bytes();
    if host_bytes.len() > 255 {
        return Err(io::Error::new(io::ErrorKind::InvalidInput, "Nome de domínio muito longo (>255)"));
    }

    let mut connect_req = vec![0x05, 0x01, 0x00, 0x03, host_bytes.len() as u8];
    connect_req.extend_from_slice(host_bytes);
    connect_req.extend_from_slice(&target_port.to_be_bytes());
    s.write_all(&connect_req).await?;

    let mut head = [0u8; 4];
    tokio::time::timeout(HANDSHAKE_TIMEOUT, s.read_exact(&mut head))
        .await
        .map_err(|_| io::Error::new(io::ErrorKind::TimedOut, "Timeout aguardando resposta SOCKS5 CONNECT"))??;

    if head[1] != 0x00 {
        return Err(io::Error::new(
            io::ErrorKind::ConnectionRefused,
            format!("SOCKS5 CONNECT recusado com código 0x{:02x}", head[1]),
        ));
    }

    // Consome o endereço de bind retornado
    match head[3] {
        0x01 => {
            let mut skip = [0u8; 4 + 2];
            s.read_exact(&mut skip).await?;
        }
        0x03 => {
            let mut len = [0u8; 1];
            s.read_exact(&mut len).await?;
            let mut skip = vec![0u8; len[0] as usize + 2];
            s.read_exact(&mut skip).await?;
        }
        0x04 => {
            let mut skip = [0u8; 16 + 2];
            s.read_exact(&mut skip).await?;
        }
        _ => {
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                format!("ATYP desconhecido na resposta SOCKS5: 0x{:02x}", head[3]),
            ));
        }
    }

    Ok(())
}

async fn read_request_head(s: &mut TcpStream) -> Result<(String, Vec<u8>), io::Error> {
    let mut buf = Vec::with_capacity(2048);
    let mut chunk = [0u8; 1024];
    loop {
        let n = s.read(&mut chunk).await?;
        if n == 0 {
            return Err(io::Error::new(io::ErrorKind::UnexpectedEof, "Cliente encerrou prematuramente"));
        }
        buf.extend_from_slice(&chunk[..n]);

        if let Some(pos) = find_headers_end(&buf) {
            let head = String::from_utf8_lossy(&buf[..pos]).into_owned();
            let leftover = buf[pos..].to_vec();
            return Ok((head, leftover));
        }
        if buf.len() > 64 * 1024 {
            return Err(io::Error::new(io::ErrorKind::InvalidData, "Cabeçalho HTTP muito grande (>64KB)"));
        }
    }
}

fn find_headers_end(buf: &[u8]) -> Option<usize> {
    buf.windows(4).position(|w| w == b"\r\n\r\n").map(|p| p + 4)
}

fn parse_request_line(head: &str) -> Option<(String, String)> {
    let line = head.lines().next()?;
    let mut parts = line.split_whitespace();
    let method = parts.next()?.to_string();
    let target = parts.next()?.to_string();
    Some((method, target))
}

fn split_host_port(s: &str, default_port: u16) -> Option<(String, u16)> {
    if let Some(rest) = s.strip_prefix('[') {
        let (host, tail) = rest.split_once(']')?;
        let port = tail
            .strip_prefix(':')
            .and_then(|p| p.parse().ok())
            .unwrap_or(default_port);
        return Some((host.to_string(), port));
    }
    match s.rsplit_once(':') {
        Some((h, p)) if !h.is_empty() => Some((h.to_string(), p.parse().ok()?)),
        _ => Some((s.to_string(), default_port)),
    }
}

fn absolute_uri_host(target: &str) -> Option<String> {
    let rest = target
        .strip_prefix("http://")
        .or_else(|| target.strip_prefix("https://"))?;
    Some(rest.split('/').next()?.to_string())
}

fn header_host(head: &str) -> Option<String> {
    head.lines()
        .find(|l| l.to_ascii_lowercase().starts_with("host:"))
        .and_then(|l| l.split_once(':'))
        .map(|(_, v)| v.trim().to_string())
}

fn strip_proxy_headers(head: &str) -> String {
    let mut out = String::with_capacity(head.len());
    for (i, line) in head.lines().enumerate() {
        if i == 0 {
            let mut parts = line.split_whitespace();
            let (m, t, v) = (
                parts.next().unwrap_or("GET"),
                parts.next().unwrap_or("/"),
                parts.next().unwrap_or("HTTP/1.1"),
            );
            let path = t
                .strip_prefix("http://")
                .or_else(|| t.strip_prefix("https://"))
                .and_then(|r| r.find('/').map(|idx| &r[idx..]))
                .unwrap_or(if t.starts_with("http") { "/" } else { t });
            out.push_str(&format!("{m} {path} {v}\r\n"));
            continue;
        }
        let lower = line.to_ascii_lowercase();
        if lower.starts_with("proxy-connection:") || lower.starts_with("proxy-authorization:") {
            continue;
        }
        out.push_str(line);
        out.push_str("\r\n");
    }
    out.push_str("\r\n");
    out
}

/// Identifica se o endereço alvo pertence a loopback ou faixa privada LAN
pub fn is_local_target(host: &str) -> bool {
    let h = host.trim_start_matches('[').trim_end_matches(']').to_ascii_lowercase();
    if h == "localhost" || h.ends_with(".localhost") || h.ends_with(".local") {
        return true;
    }
    if let Ok(v4) = h.parse::<std::net::Ipv4Addr>() {
        let o = v4.octets();
        return v4.is_loopback()
            || v4.is_private()
            || v4.is_link_local()
            || v4.is_unspecified()
            || (o[0] == 100 && (64..=127).contains(&o[1]));
    }
    if let Ok(v6) = h.parse::<std::net::Ipv6Addr>() {
        let seg = v6.segments();
        return v6.is_loopback()
            || v6.is_unspecified()
            || (seg[0] & 0xfe00) == 0xfc00
            || (seg[0] & 0xffc0) == 0xfe80
            || v6.to_ipv4_mapped().is_some_and(|m| is_local_target(&m.to_string()));
    }
    false
}

/// Bloqueia se for alvo local e port scan protection estiver ativado (a menos que a porta esteja em allowed_ports)
pub fn is_blocked_target(host: &str, port: u16, port_scan_protection: bool, allowed_ports: &[u16]) -> bool {
    if is_local_target(host) {
        if port_scan_protection {
            if allowed_ports.contains(&port) {
                return false;
            }
            return true;
        }
    }
    false
}
