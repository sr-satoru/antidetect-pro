use std::net::SocketAddr;
use std::sync::Arc;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::oneshot;
use tracing::{error, info};

pub struct Socks5LoopbackTunnel {
    pub local_port: u16,
    shutdown_tx: Option<oneshot::Sender<()>>,
}

impl Socks5LoopbackTunnel {
    /// Inicia um túnel local SOCKS5 loopback que escuta em 127.0.0.1 e autentica
    /// de forma transparente no proxy SOCKS5 remoto fornecido.
    pub async fn start(
        remote_host: String,
        remote_port: u16,
        username: String,
        password: String,
    ) -> Result<Self, String> {
        let listener = TcpListener::bind("127.0.0.1:0")
            .await
            .map_err(|e| format!("Falha ao vincular porta loopback local: {e}"))?;

        let local_port = listener
            .local_addr()
            .map_err(|e| format!("Erro ao obter porta loopback: {e}"))?
            .port();

        let (shutdown_tx, mut shutdown_rx) = oneshot::channel::<()>();

        let r_host = Arc::new(remote_host);
        let r_user = Arc::new(username);
        let r_pass = Arc::new(password);

        info!(
            "🚇 Micro-túnel SOCKS5 loopback ativo em 127.0.0.1:{} -> {}:{}",
            local_port, r_host, remote_port
        );

        tokio::spawn(async move {
            loop {
                tokio::select! {
                    accept_res = listener.accept() => {
                        match accept_res {
                            Ok((client_stream, client_addr)) => {
                                let h = Arc::clone(&r_host);
                                let u = Arc::clone(&r_user);
                                let p = Arc::clone(&r_pass);
                                tokio::spawn(async move {
                                    if let Err(e) = handle_socks5_client(client_stream, client_addr, h, remote_port, u, p).await {
                                        tracing::debug!("Conexão loopback finalizada: {e}");
                                    }
                                });
                            }
                            Err(e) => {
                                error!("Erro no listener loopback: {e}");
                                break;
                            }
                        }
                    }
                    _ = &mut shutdown_rx => {
                        info!("🛑 Encerrando micro-túnel loopback da porta {}", local_port);
                        break;
                    }
                }
            }
        });

        Ok(Self {
            local_port,
            shutdown_tx: Some(shutdown_tx),
        })
    }

    pub fn stop(&mut self) {
        if let Some(tx) = self.shutdown_tx.take() {
            let _ = tx.send(());
        }
    }
}

impl Drop for Socks5LoopbackTunnel {
    fn drop(&mut self) {
        self.stop();
    }
}

async fn handle_socks5_client(
    mut client: TcpStream,
    _client_addr: SocketAddr,
    remote_host: Arc<String>,
    remote_port: u16,
    remote_user: Arc<String>,
    remote_pass: Arc<String>,
) -> Result<(), String> {
    // 1. Handshake local com o Firefox (versão 5)
    let ver = client.read_u8().await.map_err(|e| format!("read ver: {e}"))?;
    if ver != 5 {
        return Err("Apenas SOCKS5 suportado".to_string());
    }

    let nmethods = client.read_u8().await.map_err(|e| format!("read nmethods: {e}"))?;
    let mut methods = vec![0u8; nmethods as usize];
    client.read_exact(&mut methods).await.map_err(|e| format!("read methods: {e}"))?;

    // Responde ao Firefox: 0x05 (SOCKS5), 0x00 (NO AUTH REQUIRED no loopback local)
    client.write_all(&[5, 0]).await.map_err(|e| format!("write no auth: {e}"))?;

    // 2. Lê a requisição de conexão (CONNECT) do Firefox
    let mut req_header = [0u8; 4];
    client.read_exact(&mut req_header).await.map_err(|e| format!("read req: {e}"))?;
    // req_header: [ver=5, cmd=1 (connect), rsv=0, atyp]
    let atyp = req_header[3];
    let mut dest_buf = Vec::new();

    match atyp {
        1 => {
            // IPv4: 4 bytes + 2 bytes porta
            let mut addr = [0u8; 4 + 2];
            client.read_exact(&mut addr).await.map_err(|e| format!("read ipv4: {e}"))?;
            dest_buf.extend_from_slice(&addr);
        }
        3 => {
            // Domain: 1 byte len + domain bytes + 2 bytes porta
            let len = client.read_u8().await.map_err(|e| format!("read domain len: {e}"))?;
            let mut domain = vec![0u8; len as usize + 2];
            client.read_exact(&mut domain).await.map_err(|e| format!("read domain: {e}"))?;
            dest_buf.push(len);
            dest_buf.extend_from_slice(&domain);
        }
        4 => {
            // IPv6: 16 bytes + 2 bytes porta
            let mut addr = [0u8; 16 + 2];
            client.read_exact(&mut addr).await.map_err(|e| format!("read ipv6: {e}"))?;
            dest_buf.extend_from_slice(&addr);
        }
        _ => return Err(format!("Tipo de endereço SOCKS5 não suportado: {atyp}")),
    }

    // 3. Conecta ao proxy SOCKS5 remoto
    let remote_target = format!("{}:{}", remote_host, remote_port);
    let mut upstream = TcpStream::connect(&remote_target)
        .await
        .map_err(|e| format!("Erro ao conectar no proxy upstream {}: {e}", remote_target))?;

    // 4. Handshake de autenticação com o proxy remoto (RFC 1928 / RFC 1929)
    // Envia: 0x05 (SOCKS5), 1 método, 0x02 (Username/Password)
    upstream.write_all(&[5, 1, 2]).await.map_err(|e| format!("upstream greeting: {e}"))?;

    let mut auth_resp = [0u8; 2];
    upstream.read_exact(&mut auth_resp).await.map_err(|e| format!("upstream auth resp: {e}"))?;
    if auth_resp[0] != 5 || auth_resp[1] != 2 {
        return Err("Proxy upstream não aceitou autenticação por usuário/senha".to_string());
    }

    // Envia credenciais (subnegociação RFC 1929)
    let user_bytes = remote_user.as_bytes();
    let pass_bytes = remote_pass.as_bytes();

    let mut creds = Vec::with_capacity(3 + user_bytes.len() + pass_bytes.len());
    creds.push(1); // subnegociação versão 1
    creds.push(user_bytes.len() as u8);
    creds.extend_from_slice(user_bytes);
    creds.push(pass_bytes.len() as u8);
    creds.extend_from_slice(pass_bytes);

    upstream.write_all(&creds).await.map_err(|e| format!("upstream creds: {e}"))?;

    let mut creds_status = [0u8; 2];
    upstream.read_exact(&mut creds_status).await.map_err(|e| format!("upstream creds status: {e}"))?;
    if creds_status[1] != 0 {
        return Err("Usuário ou senha rejeitados pelo proxy upstream".to_string());
    }

    // 5. Repassa a requisição CONNECT do Firefox para o proxy remoto
    let mut full_req = Vec::with_capacity(4 + dest_buf.len());
    full_req.extend_from_slice(&req_header);
    full_req.extend_from_slice(&dest_buf);

    upstream.write_all(&full_req).await.map_err(|e| format!("upstream connect req: {e}"))?;

    // 6. Lê a resposta do CONNECT do upstream e encaminha ao Firefox
    let mut up_resp_hdr = [0u8; 4];
    upstream.read_exact(&mut up_resp_hdr).await.map_err(|e| format!("upstream connect resp: {e}"))?;

    let up_atyp = up_resp_hdr[3];
    let mut up_bnd_buf = Vec::new();
    match up_atyp {
        1 => {
            let mut addr = [0u8; 6];
            upstream.read_exact(&mut addr).await.map_err(|e| format!("read up ipv4: {e}"))?;
            up_bnd_buf.extend_from_slice(&addr);
        }
        3 => {
            let len = upstream.read_u8().await.map_err(|e| format!("read up domain len: {e}"))?;
            let mut domain = vec![0u8; len as usize + 2];
            upstream.read_exact(&mut domain).await.map_err(|e| format!("read up domain: {e}"))?;
            up_bnd_buf.push(len);
            up_bnd_buf.extend_from_slice(&domain);
        }
        4 => {
            let mut addr = [0u8; 18];
            upstream.read_exact(&mut addr).await.map_err(|e| format!("read up ipv6: {e}"))?;
            up_bnd_buf.extend_from_slice(&addr);
        }
        _ => return Err(format!("Tipo de endereço upstream não suportado: {up_atyp}")),
    }

    client.write_all(&up_resp_hdr).await.map_err(|e| format!("client send resp hdr: {e}"))?;
    client.write_all(&up_bnd_buf).await.map_err(|e| format!("client send bnd buf: {e}"))?;

    // 7. Túnel bidirecional de dados
    let _ = tokio::io::copy_bidirectional(&mut client, &mut upstream).await;

    Ok(())
}
