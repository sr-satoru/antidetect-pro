use std::fs;
use std::path::{Path, PathBuf};
use serde_json::Value;
use tracing::info;

use crate::models::Profile;

// Inclusão estática dos assets para garantir 100% de portabilidade e zero dependência externa
// AstroBrowser (Chromium / Clearcote)
const CHROME_MANIFEST: &str = include_str!("../../extensions/astrobrowser/manifest.json");
const CHROME_HTML: &str = include_str!("../../extensions/astrobrowser/popup.html");
const CHROME_CSS: &str = include_str!("../../extensions/astrobrowser/popup.css");
const CHROME_JS: &str = include_str!("../../extensions/astrobrowser/popup.js");
const ICON_BYTES: &[u8] = include_bytes!("../../extensions/astrobrowser/icon.png");

// AstroFox (Firefox / Camoufox)
const FOX_MANIFEST: &str = include_str!("../../extensions/astrofox/manifest.json");
const FOX_HTML: &str = include_str!("../../extensions/astrofox/popup.html");
const FOX_CSS: &str = include_str!("../../extensions/astrofox/popup.css");
const FOX_JS: &str = include_str!("../../extensions/astrofox/popup.js");

pub struct CredentialsExtensionManager;

impl CredentialsExtensionManager {
    /// Extrai e valida as contas vinculadas à plataforma no perfil.
    /// Retorna `Some(Vec<Value>)` se houver ao menos uma credencial ou chave 2FA preenchida.
    pub fn extract_valid_accounts(profile: &Profile) -> Option<Vec<Value>> {
        let fp = &profile.fingerprint_json;

        let accounts_val = fp
            .get("platform_accounts")
            .or_else(|| fp.get("platformAccounts"))?;

        let accounts_arr = accounts_val.as_array()?;
        if accounts_arr.is_empty() {
            return None;
        }

        // Filtra apenas contas que possuam ao menos um dos campos relevantes
        let valid_accounts: Vec<Value> = accounts_arr
            .iter()
            .filter(|acc| {
                let has_user = acc.get("username").and_then(|v| v.as_str()).map(|s| !s.trim().is_empty()).unwrap_or(false);
                let has_pass = acc.get("password").and_then(|v| v.as_str()).map(|s| !s.trim().is_empty()).unwrap_or(false);
                let has_2fa = acc.get("twoFactorKey").and_then(|v| v.as_str()).map(|s| !s.trim().is_empty()).unwrap_or(false);
                has_user || has_pass || has_2fa
            })
            .cloned()
            .collect();

        if valid_accounts.is_empty() {
            None
        } else {
            Some(valid_accounts)
        }
    }

    /// Prepara a extensão interna de credenciais e autenticador 2FA no diretório do perfil.
    /// Retorna o caminho do diretório da extensão descompactada se o perfil contiver credenciais.
    pub fn prepare_extension(
        profile_dir: &Path,
        profile: &Profile,
        kernel: &str,
    ) -> Result<Option<PathBuf>, String> {
        let valid_accounts = match Self::extract_valid_accounts(profile) {
            Some(accs) => accs,
            None => return Ok(None),
        };

        let target_dir = profile_dir.join("credentials_vault_extension");
        fs::create_dir_all(&target_dir)
            .map_err(|e| format!("Falha ao criar diretório da extensão de credenciais: {e}"))?;

        // Identifica se o motor alvo é Firefox/Gecko ou Chromium
        let is_firefox = kernel.eq_ignore_ascii_case("AstroFox") 
            || kernel.to_lowercase().contains("fox") 
            || kernel.to_lowercase().contains("camou");

        let (manifest_content, html_content, css_content, js_content) = if is_firefox {
            (FOX_MANIFEST, FOX_HTML, FOX_CSS, FOX_JS)
        } else {
            (CHROME_MANIFEST, CHROME_HTML, CHROME_CSS, CHROME_JS)
        };

        // Grava os arquivos da extensão
        fs::write(target_dir.join("manifest.json"), manifest_content)
            .map_err(|e| format!("Falha ao gravar manifest.json da extensão: {e}"))?;

        fs::write(target_dir.join("popup.html"), html_content)
            .map_err(|e| format!("Falha ao gravar popup.html da extensão: {e}"))?;

        fs::write(target_dir.join("popup.css"), css_content)
            .map_err(|e| format!("Falha ao gravar popup.css da extensão: {e}"))?;

        fs::write(target_dir.join("popup.js"), js_content)
            .map_err(|e| format!("Falha ao gravar popup.js da extensão: {e}"))?;

        fs::write(target_dir.join("icon.png"), ICON_BYTES)
            .map_err(|e| format!("Falha ao gravar icon.png da extensão: {e}"))?;

        // Grava o arquivo de credenciais daquele perfil específico (JSON e JS síncrono para velocidade instantânea)
        let credentials_payload = serde_json::json!({
            "profileId": profile.id,
            "profileName": profile.name,
            "accounts": valid_accounts,
        });

        let credentials_json = serde_json::to_string_pretty(&credentials_payload)
            .map_err(|e| format!("Falha ao serializar credentials.json: {e}"))?;

        fs::write(target_dir.join("credentials.json"), &credentials_json)
            .map_err(|e| format!("Falha ao gravar credentials.json no perfil: {e}"))?;

        let credentials_js = format!("window.STAR_CREDENTIALS = {};\n", credentials_json);
        fs::write(target_dir.join("credentials.js"), credentials_js)
            .map_err(|e| format!("Falha ao gravar credentials.js no perfil: {e}"))?;

        info!(
            "🛡️ [Vault & 2FA] Extensão de credenciais preparada com sucesso para o perfil '{}' ({}) em {}",
            profile.name,
            profile.id,
            target_dir.display()
        );

        Ok(Some(target_dir))
    }
}
