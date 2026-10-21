use std::collections::HashMap;
use serde_json::Value;
use crate::models::Profile;
use crate::network::NetworkSetupResult;

/// Constrói o mapa de preferências em formato JSON para injeção via `CAMOU_PREFS_1..N`.
/// Estas preferências são lidas diretamente em memória no início da execução pelo `camoufox.cfg`,
/// antes que qualquer janela seja aberta ou qualquer script de página seja executado.
/// Isso elimina completamente a necessidade de gravar dados no arquivo `user.js` em disco.
pub fn build_camou_prefs(
    profile: &Profile,
    debug_port: Option<u16>,
    net_setup: &NetworkSetupResult,
) -> HashMap<String, Value> {
    let mut prefs = HashMap::new();
    let fp_map = crate::fingerprint::translator::extract_fingerprint_map(&profile.fingerprint_json);

    // 1. Integridade e Silêncio do Navegador (Sem diálogos intrusivos)
    prefs.insert("browser.shell.checkDefaultBrowser".to_string(), Value::Bool(false));
    prefs.insert("browser.warnOnQuit".to_string(), Value::Bool(false));
    prefs.insert("browser.aboutwelcome.enabled".to_string(), Value::Bool(false));
    prefs.insert("browser.tabs.warnOnClose".to_string(), Value::Bool(false));

    // 2. Localização e Idioma Nativos (sem fallbacks prejudiciais)
    let (primary_locale, lang) = if !net_setup.resolved_network.country_code.is_empty() {
        (
            net_setup.resolved_network.primary_language.clone(),
            net_setup.resolved_network.accept_languages.clone(),
        )
    } else if let Some(custom_l) = fp_map.get("custom_language").and_then(|v| v.as_str()) {
        let clean = custom_l.trim();
        let primary = clean
            .split(',')
            .next()
            .and_then(|s| s.split(';').next())
            .unwrap_or("en-US")
            .trim();
        (primary.to_string(), clean.to_string())
    } else {
        (
            net_setup.resolved_network.primary_language.clone(),
            net_setup.resolved_network.accept_languages.clone(),
        )
    };
    prefs.insert("intl.locale.requested".to_string(), Value::String(primary_locale));
    prefs.insert("intl.accept_languages".to_string(), Value::String(lang));

    // 3. Ativação de Fontes Empacotadas e Coerência de Scrollbars
    prefs.insert("gfx.bundled-fonts.activate".to_string(), Value::Number(1.into()));

    let target_os = crate::fingerprint::resolve_os(profile, &fp_map);
    let ua = crate::fingerprint::resolve_user_agent(&target_os, &fp_map);
    let is_win10 = target_os == "windows" && (ua.contains("Windows NT 10.0") && !ua.contains("Windows 11"));
    if is_win10 {
        // Windows 10 clássico usa barra de rolagem nativa de 17px
        prefs.insert("ui.useOverlayScrollbars".to_string(), Value::Number(0.into()));
    } else {
        // Windows 11, macOS e Linux moderno usam overlay scrollbars
        prefs.insert("ui.useOverlayScrollbars".to_string(), Value::Number(1.into()));
    }

    if target_os == "linux" {
        // No Linux, desativa fallback assíncrono de fontes para evitar caixas vazias (.notdef) no canvas
        prefs.insert("gfx.font_rendering.fallback.async".to_string(), Value::Bool(false));
    }

    // 4. Sessão e Restauração Automática (estilo navegador multilogin profissional)
    prefs.insert("browser.startup.page".to_string(), Value::Number(3.into())); // Restaura sessão anterior
    prefs.insert("browser.startup.homepage".to_string(), Value::String("about:blank".to_string()));
    prefs.insert("browser.sessionstore.resume_from_crash".to_string(), Value::Bool(true));
    prefs.insert("browser.sessionstore.max_resumed_crashes".to_string(), Value::Number((-1).into()));
    prefs.insert("browser.sessionstore.resuming_after_os_restart".to_string(), Value::Bool(true));
    prefs.insert("browser.sessionstore.privacy_level".to_string(), Value::Number(0.into()));
    prefs.insert("browser.sessionstore.privacy_level_deferred".to_string(), Value::Number(0.into()));
    prefs.insert("browser.sessionstore.interval".to_string(), Value::Number(1000.into())); // Intervalo de 1s
    prefs.insert("browser.sessionstore.max_tabs_undo".to_string(), Value::Number(100.into()));
    prefs.insert("browser.sessionstore.max_windows_undo".to_string(), Value::Number(25.into()));
    prefs.insert("browser.sessionstore.restore_on_demand".to_string(), Value::Bool(false));
    prefs.insert("browser.sessionstore.restore_tabs_lazily".to_string(), Value::Bool(false));
    prefs.insert("browser.sessionstore.restore_hidden_tabs".to_string(), Value::Bool(true));

    // 5. Preservação de Formulários, Logins e Sessões de Contas
    prefs.insert("browser.formfill.enable".to_string(), Value::Bool(true));
    prefs.insert("signon.autofillForms".to_string(), Value::Bool(true));
    prefs.insert("signon.rememberSignons".to_string(), Value::Bool(true));
    prefs.insert("privacy.clearOnShutdown.formdata".to_string(), Value::Bool(false));
    prefs.insert("privacy.sanitize.sanitizeOnShutdown".to_string(), Value::Bool(false));
    prefs.insert("privacy.clearOnShutdown.cookies".to_string(), Value::Bool(false));
    prefs.insert("privacy.clearOnShutdown.sessions".to_string(), Value::Bool(false));
    prefs.insert("privacy.clearOnShutdown.history".to_string(), Value::Bool(false));
    prefs.insert("privacy.clearOnShutdown.openWindows".to_string(), Value::Bool(false));
    prefs.insert("privacy.clearOnShutdown.cache".to_string(), Value::Bool(false));

    // 6. Configurações de Depuração Remota (CDP)
    if debug_port.is_some() {
        prefs.insert("remote.allow-origins".to_string(), Value::String("*".to_string()));
        prefs.insert("remote.allow-hosts".to_string(), Value::String("localhost,127.0.0.1,[::1]".to_string()));
    }

    // 7. Auto-ativação de Extensões sem telas de aviso
    prefs.insert("extensions.autoDisableScopes".to_string(), Value::Number(0.into()));
    prefs.insert("extensions.enabledScopes".to_string(), Value::Number(15.into()));
    prefs.insert("extensions.startupScanScopes".to_string(), Value::Number(15.into()));
    prefs.insert("xpinstall.signatures.required".to_string(), Value::Bool(false));
    prefs.insert("extensions.experiments.enabled".to_string(), Value::Bool(true));

    // 8. Proteção de Rede e WebRTC
    if profile.proxy.proxy_type != "none" {
        prefs.insert("media.peerconnection.ice.proxy_only_if_behind_proxy".to_string(), Value::Bool(true));
        // Desativa resolução de IPv6 no DNS interno para evitar vazamento do IPv6 da operadora fora do proxy
        prefs.insert("network.dns.disableIPv6".to_string(), Value::Bool(true));
        if profile.proxy.proxy_type.to_lowercase().contains("socks") {
            prefs.insert("network.proxy.socks_remote_dns".to_string(), Value::Bool(true));
        }
    }

    // 9. Parsing de eventuais snippets adicionais vindos de net_setup (ex: proxy user_pref)
    for line in net_setup.user_js_snippet.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("user_pref(\"") {
            if let Some(content) = trimmed.strip_prefix("user_pref(\"") {
                if let Some((k, rest)) = content.split_once("\",") {
                    let v_str = rest.trim().trim_end_matches(';').trim_end_matches(')').trim();
                    if let Ok(json_v) = serde_json::from_str::<Value>(v_str) {
                        prefs.insert(k.to_string(), json_v);
                    }
                }
            }
        }
    }

    // 10. Segmentações Avançadas do Perfil (Hardware, WebGPU, Battery, Geo, DNT e TLS)
    let cpu_cores = crate::browser::fingerprint::translator::parse_opt_u32(fp_map.get("cpu_cores")).unwrap_or(8);
    prefs.insert("dom.maxHardwareConcurrency".to_string(), Value::Number(cpu_cores.into()));

    let webgpu_mode = fp_map.get("webgpu_mode").and_then(|v| v.as_str());
    if webgpu_mode == Some("block") {
        prefs.insert("dom.webgpu.enabled".to_string(), Value::Bool(false));
    } else {
        prefs.insert("dom.webgpu.enabled".to_string(), Value::Bool(true));
    }

    let battery_mode = fp_map.get("battery_mode").and_then(|v| v.as_str());
    if battery_mode == Some("block") {
        prefs.insert("dom.battery.enabled".to_string(), Value::Bool(false));
    } else {
        prefs.insert("dom.battery.enabled".to_string(), Value::Bool(true));
    }

    let location_mode = fp_map.get("location_mode").and_then(|v| v.as_str());
    if location_mode == Some("block") {
        prefs.insert("geo.enabled".to_string(), Value::Bool(false));
        prefs.insert("permissions.default.geo".to_string(), Value::Number(2.into()));
    } else if location_mode == Some("custom")
        || (fp_map.contains_key("custom_latitude") && fp_map.contains_key("custom_longitude"))
    {
        prefs.insert("geo.enabled".to_string(), Value::Bool(true));
        // Permissão auto-concedida para bater com o C++ e com navigator.permissions.query()
        prefs.insert("permissions.default.geo".to_string(), Value::Number(1.into()));
    } else {
        prefs.insert("geo.enabled".to_string(), Value::Bool(true));
    }

    let do_not_track_mode = fp_map.get("do_not_track_mode").and_then(|v| v.as_str());
    let dnt_enabled = do_not_track_mode == Some("open");
    prefs.insert("privacy.donottrackheader.enabled".to_string(), Value::Bool(dnt_enabled));

    let gpc_mode = fp_map.get("global_privacy_control").and_then(|v| v.as_str());
    let gpc_enabled = gpc_mode == Some("open") || gpc_mode == Some("true");
    prefs.insert("privacy.globalprivacycontrol.enabled".to_string(), Value::Bool(gpc_enabled));

    let disable_tls_features = fp_map.get("disable_tls_features").and_then(|v| v.as_str());
    if disable_tls_features == Some("open") {
        prefs.insert("security.tls.enable_0rtt_data".to_string(), Value::Bool(false));
    }

    // Desativa resistFingerprinting para evitar que o Gecko quebre o spoofing nativo em C++ do Camoufox
    prefs.insert("privacy.resistFingerprinting".to_string(), Value::Bool(false));

    prefs
}
