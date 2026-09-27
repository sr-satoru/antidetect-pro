/// Gera preferências do Firefox para o user.js relacionadas a User-Agent, plataforma e SO.
/// Estas diretivas atuam como camada secundária nativa no motor Gecko,
/// garantindo consistência com o spoofing C++ do Camoufox.

pub fn build_fingerprint_prefs(
    user_agent: &str,
    platform: &str,
    oscpu: &str,
    languages: &str,
    cpu_cores: u32,
) -> String {
    let mut prefs = String::new();
    prefs.push_str("\n// === FINGERPRINT & SO SPOOFING (FURY CAMOUFOX) ===\n");

    // Overrides oficiais do Firefox Gecko
    if !user_agent.trim().is_empty() {
        prefs.push_str(&format!(
            "user_pref(\"general.useragent.override\", \"{}\");\n",
            user_agent.replace('"', "\\\"")
        ));
    }
    if !platform.trim().is_empty() {
        prefs.push_str(&format!(
            "user_pref(\"general.platform.override\", \"{}\");\n",
            platform.replace('"', "\\\"")
        ));
    }
    if !oscpu.trim().is_empty() {
        prefs.push_str(&format!(
            "user_pref(\"general.oscpu.override\", \"{}\");\n",
            oscpu.replace('"', "\\\"")
        ));
    }
    if !languages.trim().is_empty() {
        prefs.push_str(&format!(
            "user_pref(\"intl.accept_languages\", \"{}\");\n",
            languages.replace('"', "\\\"")
        ));
    }

    // Hardware Concurrency no DOM
    prefs.push_str(&format!(
        "user_pref(\"dom.maxHardwareConcurrency\", {});\n",
        cpu_cores
    ));

    // Desativa resistFingerprinting para evitar que o Firefox force resoluções 200x100
    // ou bloqueie o spoofing C++ nativo do Camoufox
    prefs.push_str("user_pref(\"privacy.resistFingerprinting\", false);\n");

    prefs
}
