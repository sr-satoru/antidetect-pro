use std::path::{Path, PathBuf};
use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use super::detector::EngineHealthStatus;

/// Formato do pacote de distribuição compactado
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum ArchiveFormat {
    #[default]
    Zip,
    #[serde(rename = "tar.xz")]
    TarXz,
}

/// Contrato formal para operações especializadas por Sistema Operacional
#[async_trait]
pub trait PlatformOperations: Send + Sync {
    type Error: std::error::Error + Send + Sync + 'static;

    /// Retorna o diretório canônico onde os arquivos do motor devem ser salvos
    fn get_target_dir(&self, data_dir: &Path) -> PathBuf;

    /// Retorna o caminho do executável principal
    fn get_executable_path(&self, target_dir: &Path) -> PathBuf;

    /// Descompacta o arquivo baixado para o diretório de staging
    async fn extract_archive(&self, archive_path: &Path, staging_dir: &Path) -> Result<(), Self::Error>;

    /// Avalia a integridade física e arquivos vitais da instalação
    fn verify_installation(&self, target_dir: &Path) -> Result<EngineHealthStatus, Self::Error>;

    /// Limpa instalações corrompidas, diretórios staging e resíduos de temporários
    async fn cleanup_installation(&self, data_dir: &Path) -> Result<(), Self::Error>;
}
