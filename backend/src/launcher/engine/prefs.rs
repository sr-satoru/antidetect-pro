use std::fs;
use std::path::Path;

use crate::models::Profile;

/// Prepara a pasta isolada do perfil e injeta configurações (Proxy, Extensões, Fingerprint, WebRTC, etc.) no user.js
pub async fn prepare_profile_dir(
    profile_dir: &Path,
    profile: &Profile,
    data_dir: &Path,
    client: &reqwest::Client,
    cdp: bool,
) -> Result<(crate::network::NetworkSetupResult, crate::fingerprint::FingerprintSetupResult), String> {
    fs::create_dir_all(profile_dir)
        .map_err(|e| format!("Erro ao criar diretório do perfil: {e}"))?;

    // 1. Gera o arquivo user.js dentro da pasta do perfil Firefox/Camoufox
    let mut user_js = String::new();
    user_js.push_str("// Configurações geradas automaticamente pelo Star Multlogin\n");
    user_js.push_str("user_pref(\"browser.shell.checkDefaultBrowser\", false);\n");
    user_js.push_str("user_pref(\"browser.warnOnQuit\", false);\n");
    user_js.push_str("user_pref(\"browser.aboutwelcome.enabled\", false);\n");

    // Restauração de Sessão e Abas anteriores (estilo Donut Browser)
    user_js.push_str("// Restauração automática de abas e sessão\n");
    user_js.push_str("user_pref(\"browser.startup.page\", 3);\n");
    user_js.push_str("user_pref(\"browser.startup.homepage\", \"about:blank\");\n");
    user_js.push_str("user_pref(\"browser.sessionstore.resume_from_crash\", true);\n");
    user_js.push_str("user_pref(\"browser.sessionstore.max_resumed_crashes\", -1);\n");
    user_js.push_str("user_pref(\"browser.sessionstore.resuming_after_os_restart\", true);\n");
    user_js.push_str("user_pref(\"browser.sessionstore.privacy_level\", 0);\n");
    user_js.push_str("user_pref(\"browser.sessionstore.privacy_level_deferred\", 0);\n");
    user_js.push_str("user_pref(\"browser.sessionstore.interval\", 1000);\n"); // Salva estado da sessão a cada 1 segundo no disco
    user_js.push_str("user_pref(\"browser.sessionstore.max_tabs_undo\", 100);\n");
    user_js.push_str("user_pref(\"browser.sessionstore.max_windows_undo\", 25);\n");
    user_js.push_str("user_pref(\"browser.sessionstore.restore_on_demand\", false);\n");
    user_js.push_str("user_pref(\"browser.sessionstore.restore_tabs_lazily\", false);\n");
    user_js.push_str("user_pref(\"browser.sessionstore.restore_hidden_tabs\", true);\n");
    user_js.push_str("user_pref(\"browser.tabs.warnOnClose\", false);\n");

    // Preserva o que o usuário digita (formulários, pesquisas, logins e histórico de digitação)
    user_js.push_str("user_pref(\"browser.formfill.enable\", true);\n");
    user_js.push_str("user_pref(\"signon.autofillForms\", true);\n");
    user_js.push_str("user_pref(\"signon.rememberSignons\", true);\n");
    user_js.push_str("user_pref(\"privacy.clearOnShutdown.formdata\", false);\n");
    user_js.push_str("user_pref(\"privacy.sanitize.sanitizeOnShutdown\", false);\n");

    user_js.push_str("user_pref(\"privacy.clearOnShutdown.cookies\", false);\n");
    user_js.push_str("user_pref(\"privacy.clearOnShutdown.sessions\", false);\n");
    user_js.push_str("user_pref(\"privacy.clearOnShutdown.history\", false);\n");
    user_js.push_str("user_pref(\"privacy.clearOnShutdown.openWindows\", false);\n");
    user_js.push_str("user_pref(\"privacy.clearOnShutdown.cache\", false);\n");
    user_js.push_str("user_pref(\"toolkit.legacyUserProfileCustomizations.stylesheets\", true);\n");

    // Preferências de Automação e Protocolos CDP / WebDriver BiDi injetadas somente quando CDP estiver ativo
    if cdp {
        user_js.push_str("user_pref(\"remote.active-protocols\", 3);\n");
        user_js.push_str("user_pref(\"remote.allow-origins\", \"*\");\n");
        user_js.push_str("user_pref(\"remote.allow-hosts\", \"localhost,127.0.0.1,[::1]\");\n");
    }

    // Preferências nativas do Firefox para auto-ativação e sideload de extensões
    user_js.push_str("// Carregamento automático de extensões no perfil Camoufox\n");
    user_js.push_str("user_pref(\"extensions.autoDisableScopes\", 0);\n");
    user_js.push_str("user_pref(\"extensions.enabledScopes\", 15);\n");
    user_js.push_str("user_pref(\"extensions.startupScanScopes\", 15);\n");
    user_js.push_str("user_pref(\"xpinstall.signatures.required\", false);\n");
    user_js.push_str("user_pref(\"extensions.experiments.enabled\", true);\n");

    // 1. Delegação de Proxy Universal Relay e WebRTC via módulo desacoplado network
    let net_setup = crate::network::prepare_network(&profile.proxy, &profile.fingerprint_json).await?;
    user_js.push_str(&net_setup.user_js_snippet);

    // 2. Importação e preparação das extensões via módulo desacoplado extensions
    let ext_paths = crate::extensions::import_profile_extensions(
        profile,
        profile_dir,
        data_dir,
        client,
    )
    .await?;

    let mut all_addon_paths = net_setup.addon_paths.clone();
    all_addon_paths.extend(ext_paths);

    // 3. Delegação de Fingerprint e Sistema Operacional com IPv4 estrito para WebRTC
    let proxy_ip: Option<String> = if profile.proxy.proxy_type != "none" {
        if let Some(host) = profile.proxy.host.as_deref().filter(|h| !h.trim().is_empty()) {
            if host.parse::<std::net::Ipv4Addr>().is_ok() {
                Some(host.to_string())
            } else {
                let port = profile.proxy.port.unwrap_or(8080);
                tokio::net::lookup_host(format!("{}:{}", host, port))
                    .await
                    .ok()
                    .and_then(|mut iter| {
                        iter.find_map(|addr| {
                            if let std::net::SocketAddr::V4(v4) = addr {
                                Some(v4.ip().to_string())
                            } else {
                                None
                            }
                        })
                    })
            }
        } else {
            None
        }
    } else {
        None
    };

    let fp_setup = crate::fingerprint::prepare_fingerprint(profile, proxy_ip.as_deref(), &all_addon_paths);
    user_js.push_str(&fp_setup.user_js_snippet);

    let user_js_path = profile_dir.join("user.js");
    fs::write(user_js_path, user_js)
        .map_err(|e| format!("Erro ao gravar user.js do perfil: {e}"))?;

    // Garante ocultação de qualquer banner de automação/depuração e listras vermelhas no Camoufox
    let chrome_dir = profile_dir.join("chrome");
    let _ = fs::create_dir_all(&chrome_dir);
    let user_chrome_css = r#"
/* Oculta completamente o ícone de robô de controle remoto e seu container */
:root[remotecontrol] #remote-control-box,
#remote-control-box,
#remote-control-icon,
.remote-control-icon {
    display: none !important;
    visibility: collapse !important;
    width: 0 !important;
    height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
}

/* Remove completamente as listras diagonais vermelhas e bordas de alerta */
:root[remotecontrol] #urlbar-background,
:root[remotecontrol] #urlbar[focused="true"] > #urlbar-background,
#urlbar[remotecontrol] #urlbar-background,
#urlbar-background {
    background-image: none !important;
    box-shadow: none !important;
}
"#;
    let _ = fs::write(chrome_dir.join("userChrome.css"), user_chrome_css);

    Ok((net_setup, fp_setup))
}
