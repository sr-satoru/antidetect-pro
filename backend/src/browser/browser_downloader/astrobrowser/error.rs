use std::fmt;

/// Erros específicos do pipeline de download, integridade criptográfica e extração do motor AstroBrowser (Clearcote/Chromium)
#[derive(Debug)]
pub enum AstrobrowserError {
    UnsupportedPlatform(String),
    DownloadFailed(String),
    HttpError(String),
    ChecksumMismatch { expected: String, got: String },
    ExtractionFailed(String),
    CorruptedPackage(String),
    IoError(String),
    Cancelled,
    AlreadyRunning,
    Io(std::io::Error),
    Json(serde_json::Error),
}

impl fmt::Display for AstrobrowserError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::UnsupportedPlatform(msg) => write!(f, "Plataforma não suportada pelo AstroBrowser: {msg}"),
            Self::DownloadFailed(msg) => write!(f, "Falha no download do AstroBrowser: {msg}"),
            Self::HttpError(msg) => write!(f, "Erro de rede / HTTP no AstroBrowser: {msg}"),
            Self::ChecksumMismatch { expected, got } => {
                write!(
                    f,
                    "Falha na validação SHA-256 do AstroBrowser! Esperado: {expected}, Obtido: {got}"
                )
            }
            Self::ExtractionFailed(msg) => write!(f, "Falha na descompactação do AstroBrowser: {msg}"),
            Self::CorruptedPackage(msg) => write!(f, "Pacote do AstroBrowser corrompido: {msg}"),
            Self::IoError(msg) => write!(f, "Erro de E/S no AstroBrowser: {msg}"),
            Self::Cancelled => write!(f, "Download do AstroBrowser cancelado pelo usuário."),
            Self::AlreadyRunning => write!(f, "Já existe um download do AstroBrowser em andamento."),
            Self::Io(err) => write!(f, "Erro de E/S de disco no AstroBrowser: {err}"),
            Self::Json(err) => write!(f, "Erro JSON no AstroBrowser: {err}"),
        }
    }
}

impl std::error::Error for AstrobrowserError {}

impl From<std::io::Error> for AstrobrowserError {
    fn from(err: std::io::Error) -> Self {
        Self::Io(err)
    }
}

impl From<serde_json::Error> for AstrobrowserError {
    fn from(err: serde_json::Error) -> Self {
        Self::Json(err)
    }
}
