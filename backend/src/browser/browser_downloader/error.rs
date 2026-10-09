use std::fmt;

/// Erro consolidado da camada de download do navegador
#[derive(Debug)]
pub enum BrowserDownloadError {
    Astrofox(super::astrofox::error::AstrofoxError),
    Astrobrowser(super::astrobrowser::error::AstrobrowserError),
    UnsupportedPlatform(String),
    PlatformNotFoundInManifest { platform: String, engine: String },
    ChecksumMismatch { expected: String, got: String },
    DownloadFailed(String),
    ExtractionFailed(String),
    CorruptedPackage(String),
    ManifestError(String),
    HttpError(String),
    IoError(String),
    Cancelled,
    AlreadyRunning,
    Io(std::io::Error),
    Json(serde_json::Error),
}

impl fmt::Display for BrowserDownloadError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Astrofox(e) => write!(f, "{e}"),
            Self::Astrobrowser(e) => write!(f, "{e}"),
            Self::UnsupportedPlatform(msg) => write!(f, "Plataforma não suportada: {msg}"),
            Self::PlatformNotFoundInManifest { platform, engine } => {
                write!(f, "Plataforma '{platform}' não encontrada no manifesto para o motor '{engine}'")
            }
            Self::ChecksumMismatch { expected, got } => {
                write!(f, "Falha na verificação de integridade SHA-256! Esperado: {expected}, Obtido: {got}")
            }
            Self::DownloadFailed(msg) => write!(f, "Falha no download do motor: {msg}"),
            Self::ExtractionFailed(msg) => write!(f, "Falha na descompactação do pacote: {msg}"),
            Self::CorruptedPackage(msg) => write!(f, "Pacote corrompido ou incompleto: {msg}"),
            Self::ManifestError(msg) => write!(f, "Erro no manifesto do motor: {msg}"),
            Self::HttpError(msg) => write!(f, "Erro de rede / HTTP: {msg}"),
            Self::IoError(msg) => write!(f, "Erro de sistema de arquivos: {msg}"),
            Self::Cancelled => write!(f, "Download cancelado pelo usuário."),
            Self::AlreadyRunning => write!(f, "Já existe um download em andamento."),
            Self::Io(err) => write!(f, "Erro de E/S de disco: {err}"),
            Self::Json(err) => write!(f, "Erro JSON: {err}"),
        }
    }
}

impl std::error::Error for BrowserDownloadError {}

impl From<super::astrofox::error::AstrofoxError> for BrowserDownloadError {
    fn from(err: super::astrofox::error::AstrofoxError) -> Self {
        Self::Astrofox(err)
    }
}

impl From<super::astrobrowser::error::AstrobrowserError> for BrowserDownloadError {
    fn from(err: super::astrobrowser::error::AstrobrowserError) -> Self {
        Self::Astrobrowser(err)
    }
}

impl From<std::io::Error> for BrowserDownloadError {
    fn from(err: std::io::Error) -> Self {
        Self::Io(err)
    }
}

impl From<serde_json::Error> for BrowserDownloadError {
    fn from(err: serde_json::Error) -> Self {
        Self::Json(err)
    }
}
