use std::fs;
use std::path::Path;
use serde_json::{json, Value};
use tracing::info;
use crate::models::Profile;
use crate::fingerprint::translator::extract_fingerprint_map;

/// Injeta e gerencia as preferências nativas do Chromium em <profile_dir>/Default/Preferences.
/// Garante que o navegador inicie sem popups intrusivos (gerenciador de senhas, tradutor)
/// e com o idioma coerente com a fingerprint.
pub fn setup_chromium_preferences(
    profile_dir: &Path,
    profile: &Profile,
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

    let fp = extract_fingerprint_map(&profile.fingerprint_json);
    let locale_obj = fp.get("locale");
    let primary_lang = locale_obj
        .and_then(|l| l.get("primary_language"))
        .and_then(|v| v.as_str())
        .unwrap_or("pt-BR");

    let accept_languages = locale_obj
        .and_then(|l| l.get("languages"))
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|x| x.as_str().map(|s| s.split(';').next().unwrap_or("").trim()))
                .filter(|s| !s.is_empty())
                .collect::<Vec<_>>()
                .join(",")
        })
        .unwrap_or_else(|| format!("{},en-US,en", primary_lang));

    // Garante as seções fundamentais
    let root_obj = root.as_object_mut().unwrap();

    // 1. intl
    let intl = root_obj.entry("intl").or_insert_with(|| json!({}));
    if let Some(intl_obj) = intl.as_object_mut() {
        intl_obj.insert("accept_languages".to_string(), Value::String(accept_languages));
        intl_obj.insert("selected_languages".to_string(), Value::String(primary_lang.to_string()));
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

    root_obj.insert("credentials_enable_service".to_string(), Value::Bool(false));

    // Salva o Preferences atualizado no disco
    let content = serde_json::to_string_pretty(&root)
        .map_err(|e| format!("Falha ao serializar Chromium Preferences: {e}"))?;

    fs::write(&prefs_file, content)
        .map_err(|e| format!("Falha ao escrever Chromium Preferences em {:?}: {e}", prefs_file))?;

    info!("⚙️ [Clearcote] Preferences do Chromium gravadas com sucesso para {}", profile.id);
    Ok(())
}
