use std::fs;
use std::path::Path;
use serde_json::{json, Value};
use tracing::info;
use crate::models::Profile;

/// Injeta e gerencia as preferências nativas do Chromium em <profile_dir>/Default/Preferences.
/// Garante que o navegador inicie sem popups intrusivos (gerenciador de senhas, tradutor)
/// e com o idioma coerente com a fingerprint.
pub fn setup_chromium_preferences(
    profile_dir: &Path,
    profile: &Profile,
    network: &crate::network::ResolvedNetworkIdentity,
) -> Result<(), String> {
    let default_dir = profile_dir.join("Default");
    fs::create_dir_all(&default_dir)
        .map_err(|e| format!("Falha ao criar pasta Default do perfil Chromium: {e}"))?;

    let prefs_file = default_dir.join("Preferences");

    // Lê preferências pré-existentes ou cria um novo objeto
    let mut root: Value = if prefs_file.exists() {
        fs::read_to_string(&prefs_file)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_else(|| json!({}))
    } else {
        json!({})
    };

    if !root.is_object() {
        root = json!({});
    }

    let fp_map = crate::fingerprint::translator::extract_fingerprint_map(&profile.fingerprint_json);
    let (primary_lang, accept_languages) = if !network.country_code.is_empty() {
        (Some(network.primary_language.clone()), Some(network.accept_languages.clone()))
    } else if let Some(custom_l) = fp_map.get("custom_language").and_then(|v| v.as_str()).map(|s| s.trim()).filter(|s| !s.is_empty()) {
        let primary = custom_l
            .split(',')
            .next()
            .and_then(|s| s.split(';').next())
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
            .unwrap_or(custom_l);
        (Some(primary.to_string()), Some(custom_l.to_string()))
    } else {
        (None, None)
    };

    // Garante as seções fundamentais
    let root_obj = root.as_object_mut().unwrap();

    // 1. intl (apenas injeta se resolvido pela rede ou customizado; sem fallbacks arbitrários)
    if let (Some(primary), Some(accept)) = (primary_lang, accept_languages) {
        if !primary.is_empty() && !accept.is_empty() {
            let intl = root_obj.entry("intl").or_insert_with(|| json!({}));
            if let Some(intl_obj) = intl.as_object_mut() {
                intl_obj.insert("accept_languages".to_string(), Value::String(accept));
                intl_obj.insert("selected_languages".to_string(), Value::String(primary));
            }
        }
    }

    // 2. translate
    let translate = root_obj.entry("translate").or_insert_with(|| json!({}));
    if let Some(trans_obj) = translate.as_object_mut() {
        trans_obj.insert("enabled".to_string(), Value::Bool(false));
    }

    // 3. credentials / autofill (desabilita ofertas de salvar senhas para automação / multi-login limpo)
    let profile_prefs = root_obj.entry("profile").or_insert_with(|| json!({}));
    if let Some(prof_obj) = profile_prefs.as_object_mut() {
        prof_obj.insert("password_manager_enabled".to_string(), Value::Bool(false));
        // Permite cookies de terceiros essenciais para logins SSO / Google / iframes
        prof_obj.insert("cookie_controls_mode".to_string(), Value::from(0));
        prof_obj.insert("default_content_setting_values".to_string(), json!({ "cookies": 1 }));
        prof_obj.insert("exit_type".to_string(), Value::String("Normal".to_string()));
        prof_obj.insert("exited_cleanly".to_string(), Value::Bool(true));
    }

    // 4. session: preserva cookies de sessão ao reiniciar o navegador
    let session_prefs = root_obj.entry("session").or_insert_with(|| json!({}));
    if let Some(sess_obj) = session_prefs.as_object_mut() {
        sess_obj.insert("restore_on_startup".to_string(), Value::from(1));
    }

    let autofill = root_obj.entry("autofill").or_insert_with(|| json!({}));
    if let Some(auto_obj) = autofill.as_object_mut() {
        auto_obj.insert("credit_card_enabled".to_string(), Value::Bool(false));
        auto_obj.insert("profile_enabled".to_string(), Value::Bool(false));
    }

    // 5. webrtc: bloqueia conexões UDP fora do proxy para evitar vazamento de IP real
    let webrtc_prefs = root_obj.entry("webrtc").or_insert_with(|| json!({}));
    if let Some(w_obj) = webrtc_prefs.as_object_mut() {
        w_obj.insert("ip_handling_policy".to_string(), Value::String("disable_non_proxied_udp".to_string()));
    }

    root_obj.insert("credentials_enable_service".to_string(), Value::Bool(false));

    // Salva o Preferences atualizado no disco
    let content = serde_json::to_string_pretty(&root)
        .map_err(|e| format!("Falha ao serializar Chromium Preferences: {e}"))?;

    fs::write(&prefs_file, content)
        .map_err(|e| format!("Falha ao escrever Chromium Preferences em {:?}: {e}", prefs_file))?;

    info!("⚙️ [Clearcote] Preferences do Chromium gravadas com sucesso para {}", profile.id);
    Ok(())
}
