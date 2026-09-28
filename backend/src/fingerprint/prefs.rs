/// Gera preferências do Firefox para o user.js relacionadas a User-Agent, plataforma, SO
/// e segmentações avançadas (WebGPU, Battery, Geolocation, Do Not Track e TLS).
pub fn build_fingerprint_prefs(
    user_agent: &str,
    platform: &str,
    oscpu: &str,
    languages: &str,
    cpu_cores: u32,
    webgpu_mode: Option<&str>,
    battery_mode: Option<&str>,
    location_mode: Option<&str>,
    do_not_track_mode: Option<&str>,
    disable_tls_features: Option<&str>,
) -> String {
    let mut prefs = String::new();
    prefs.push_str("\n// === FINGERPRINT & SO SPOOFING (STAR MULTLOGIN CAMOUFOX) ===\n");

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

    // WebGPU Mode (real / block / noise)
    if webgpu_mode == Some("block") {
        prefs.push_str("user_pref(\"dom.webgpu.enabled\", false);\n");
    } else {
        prefs.push_str("user_pref(\"dom.webgpu.enabled\", true);\n");
    }

    // Battery Mode (real / custom / noise / block)
    if battery_mode == Some("block") {
        prefs.push_str("user_pref(\"dom.battery.enabled\", false);\n");
    } else {
        prefs.push_str("user_pref(\"dom.battery.enabled\", true);\n");
    }

    // Geolocation Mode (ip / real / custom / block)
    if location_mode == Some("block") {
        prefs.push_str("user_pref(\"geo.enabled\", false);\n");
        prefs.push_str("user_pref(\"permissions.default.geo\", 2);\n");
    } else {
        prefs.push_str("user_pref(\"geo.enabled\", true);\n");
    }

    // Do Not Track Header (open = true, close = false)
    if do_not_track_mode == Some("open") {
        prefs.push_str("user_pref(\"privacy.donottrackheader.enabled\", true);\n");
    } else {
        prefs.push_str("user_pref(\"privacy.donottrackheader.enabled\", false);\n");
    }

    // Disable TLS Features (open = desativar extensões TLS adicionais)
    if disable_tls_features == Some("open") {
        prefs.push_str("user_pref(\"security.tls.enable_0rtt_data\", false);\n");
    }

    // Desativa resistFingerprinting para evitar que o Firefox force resoluções 200x100
    // ou bloqueie o spoofing C++ nativo do Camoufox
    prefs.push_str("user_pref(\"privacy.resistFingerprinting\", false);\n");

    prefs
}
