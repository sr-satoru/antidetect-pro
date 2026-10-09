use std::path::{Path, PathBuf};
use async_trait::async_trait;
use crate::models::Profile;
use crate::network::NetworkSetupResult;
use crate::extraction_session::{ImportCookieResult, UnifiedCookie, UnifiedSession};

/// Resultado consolidado da preparação de ambiente específica do motor
pub struct EnginePrepResult {
    pub net_setup: NetworkSetupResult,
    pub addon_paths: Vec<String>,
    pub proxy_ip: Option<String>,
}

/// Contrato desacoplado para qualquer motor de navegação stealth integrado ao sistema.
/// Permite isolamento total de funções, garantindo que atualizações em um navegador
/// (como Camoufox ou Clearcote) não afetem os demais.
#[async_trait]
pub trait BrowserEngine: Send + Sync {
    /// Nome canônico do kernel (ex: "AstroFox", "AstroBrowser")
    fn kernel_name(&self) -> &'static str;

    /// Localiza e valida o executável do motor
    fn resolve_binary(&self, data_dir: &Path) -> Result<PathBuf, String>;

    /// Remove travas de arquivos órfãs específicas do motor
    fn clear_profile_locks(&self, profile_dir: &Path);

    /// Prepara preferências, proxy, diretórios e extensões antes do disparo
    async fn prepare_profile_dir(
        &self,
        profile_dir: &Path,
        profile: &Profile,
        data_dir: &Path,
        client: &reqwest::Client,
        cdp: bool,
    ) -> Result<EnginePrepResult, String>;

    /// Constrói o comando de execução do processo com todas as flags/variáveis nativas
    fn build_launch_command(
        &self,
        binary_path: &Path,
        profile_dir: &Path,
        profile: &Profile,
        debug_port: Option<u16>,
        prep: &EnginePrepResult,
        initial_url: Option<&str>,
    ) -> Result<tokio::process::Command, String>;

    /// Extrai a sessão completa atualizada (cookies e storage) ao fechar o navegador
    fn extract_session(&self, profile_dir: &Path) -> Result<UnifiedSession, String>;

    /// Injeta sessão e cookies no banco de dados do perfil antes da inicialização
    fn inject_session(
        &self,
        profile_dir: &Path,
        cookies: &[UnifiedCookie],
    ) -> Result<ImportCookieResult, String>;
}
