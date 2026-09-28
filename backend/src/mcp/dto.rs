use serde::{Deserialize, Serialize};

/// Projeção estrita de menor privilégio para a API externa e MCP (Zero-Leakage).
/// Contém EXCLUSIVAMENTE os 5 campos essenciais para identificar e selecionar o perfil.
/// NENHUM campo de proxy, IP, senha, porta ou sementes de hardware é exposto.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MinimalProfileSummary {
    /// Identificador único do perfil (ex: "prf_shopee_01" ou UUID)
    pub id: String,
    /// Nome amigável atribuído ao perfil
    pub name: String,
    /// Grupo ou pasta organizacional do perfil
    pub group: String,
    /// Lista de tags associadas (ex: ["farm", "teste", "ads"])
    pub tags: Vec<String>,
    /// Estado operacional em tempo real: "ready" ou "running"
    pub status: String,
}

/// Requisição para iniciar um perfil de forma segura.
/// O cliente só precisa enviar o `id` do perfil.
#[derive(Debug, Clone, Deserialize)]
pub struct LaunchProfileRequest {
    /// ID do perfil a ser iniciado
    pub id: String,
    /// Se true (padrão), habilita a porta de depuração CDP/BiDi para automação
    #[serde(default = "default_true")]
    pub cdp: bool,
    /// Se true, executa o Camoufox em modo headless
    #[serde(default)]
    pub headless: bool,
}

fn default_true() -> bool {
    true
}

/// Resposta de lançamento seguro do perfil.
/// Fornece apenas as informações necessárias para conexão Playwright/Selenium/CDP.
#[derive(Debug, Clone, Serialize)]
pub struct LaunchProfileResponse {
    pub status: String,
    pub profile_id: String,
    pub pid: u32,
    pub debug_port: Option<u16>,
    pub ws_endpoint: Option<String>,
}

/// Requisição para encerrar um perfil em execução.
#[derive(Debug, Clone, Deserialize)]
pub struct StopProfileRequest {
    pub id: String,
}

/// Resposta de encerramento gracioso do perfil.
#[derive(Debug, Clone, Serialize)]
pub struct StopProfileResponse {
    pub status: String,
    pub profile_id: String,
    pub cookies_saved: usize,
    pub message: String,
}

/// Resposta de status e saúde do motor Star Multlogin.
#[derive(Debug, Clone, Serialize)]
pub struct StatusResponse {
    pub ok: bool,
    pub engine: String,
    pub version: String,
    pub running_count: usize,
    pub loopback_only: bool,
}

/// Resposta de rotação manual de token de autenticação.
#[derive(Debug, Clone, Serialize)]
pub struct TokenRefreshResponse {
    pub ok: bool,
    pub new_token: String,
    pub message: String,
}

/// Informações sobre uma aba de página aberta no perfil.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TabInfo {
    pub id: String,
    pub title: String,
    pub url: String,
}

/// Resposta com a lista de abas ativas.
#[derive(Debug, Clone, Serialize)]
pub struct TabListResponse {
    pub tabs: Vec<TabInfo>,
}

/// Requisição para abrir uma nova aba com URL específica.
#[derive(Debug, Clone, Deserialize)]
pub struct OpenTabRequest {
    pub url: String,
}
