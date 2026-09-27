use std::fs;
use std::path::{Path, PathBuf};

const EXTENSION_ID: &str = "fury-proxy-auth@antidetect.fury";

/// Gera e instala a WebExtension interna de autenticação automática de proxy no perfil.
///
/// Essa extensão utiliza a API oficial 'browser.webRequest.onAuthRequired' com flag 'blocking',
/// interceptando o desafio HTTP 407 e fornecendo as credenciais instantaneamente.
/// Elimina 100% de janelas modais, popups ou travamentos de requisição.
pub fn install_proxy_auth_extension(
    profile_dir: &Path,
    username: &str,
    password: &str,
) -> Result<PathBuf, String> {
    let ext_dir = profile_dir.join("extensions").join(EXTENSION_ID);
    fs::create_dir_all(&ext_dir)
        .map_err(|e| format!("Falha ao criar diretório da extensão de proxy auth: {e}"))?;

    let manifest = serde_json::json!({
        "manifest_version": 2,
        "name": "Fury Proxy Auth",
        "version": "1.0.0",
        "description": "Autenticador transparente de proxy para o Fury Browser",
        "permissions": [
            "webRequest",
            "webRequestBlocking",
            "<all_urls>"
        ],
        "background": {
            "scripts": ["background.js"]
        },
        "browser_specific_settings": {
            "gecko": {
                "id": EXTENSION_ID
            }
        }
    });

    let manifest_content = serde_json::to_string_pretty(&manifest)
        .map_err(|e| format!("Erro ao serializar manifest.json: {e}"))?;
    fs::write(ext_dir.join("manifest.json"), manifest_content)
        .map_err(|e| format!("Erro ao gravar manifest.json da extensão de proxy: {e}"))?;

    // Escape seguro de strings JS usando serialização JSON
    let safe_user = serde_json::to_string(username).unwrap_or_else(|_| "\"\"".to_string());
    let safe_pass = serde_json::to_string(password).unwrap_or_else(|_| "\"\"".to_string());

    let background_js = format!(
        r#"(function() {{
  const authUser = {safe_user};
  const authPass = {safe_pass};

  browser.webRequest.onAuthRequired.addListener(
    function(details) {{
      if (details.isProxy) {{
        return {{
          authCredentials: {{
            username: authUser,
            password: authPass
          }}
        }};
      }}
    }},
    {{ urls: ["<all_urls>"] }},
    ["blocking"]
  );
}})();
"#
    );

    fs::write(ext_dir.join("background.js"), background_js)
        .map_err(|e| format!("Erro ao gravar background.js da extensão de proxy: {e}"))?;

    Ok(ext_dir)
}
