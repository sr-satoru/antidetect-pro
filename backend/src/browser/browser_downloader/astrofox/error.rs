use std::fmt;

/// Erros específicos do pipeline de download, extração e validação do motor AstroFox (Camoufox/Gecko)
#[derive(Debug)]
pub enum AstrofoxError {
    UnsupportedPlatform(String),
    DownloadFailed(String),
    HttpError(String),
    ExtractionFailed(String),
    CorruptedPackage(String),
    IoError(String),
    Cancelled,
    AlreadyRunning,
    EngineInUse(String),
    Io(std::io::Error),
    Json(serde_json::Error),
}

impl fmt::Display for AstrofoxError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::UnsupportedPlatform(msg) => write!(f, "Plataforma não suportada pelo AstroFox: {msg}"),
            Self::DownloadFailed(msg) => write!(f, "Falha no download do AstroFox: {msg}"),
            Self::HttpError(msg) => write!(f, "Erro de rede / HTTP no AstroFox: {msg}"),
            Self::ExtractionFailed(msg) => write!(f, "Falha na descompactação do AstroFox: {msg}"),
            Self::CorruptedPackage(msg) => write!(f, "Pacote do AstroFox corrompido: {msg}"),
            Self::IoError(msg) => write!(f, "Erro de E/S no AstroFox: {msg}"),
            Self::Cancelled => write!(f, "Download do AstroFox cancelado pelo usuário."),
            Self::AlreadyRunning => write!(f, "Já existe um download do AstroFox em andamento."),
            Self::EngineInUse(msg) => write!(f, "{msg}"),
            Self::Io(err) => write!(f, "Erro de E/S de disco no AstroFox: {err}"),
            Self::Json(err) => write!(f, "Erro JSON no AstroFox: {err}"),
        }
    }
}

impl std::error::Error for AstrofoxError {}

impl From<std::io::Error> for AstrofoxError {
    fn from(err: std::io::Error) -> Self {
        Self::Io(err)
    }
}

impl From<serde_json::Error> for AstrofoxError {
    fn from(err: serde_json::Error) -> Self {
        Self::Json(err)
    }
}
