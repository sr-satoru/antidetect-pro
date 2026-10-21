use std::time::Duration;
use serde::{Deserialize, Serialize};
use tracing::{info, warn};
use crate::models::ProfileProxyConfig;

/// Identidade de rede resolvida de forma limpa e coerente para o perfil.
/// Usada de forma desacoplada tanto pelo Clearcote (Chromium) quanto pelo Camoufox (Firefox).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResolvedNetworkIdentity {
    /// IP público de saída real que acessa os sites (ex: "185.220.101.5")
    pub egress_ip: Option<String>,
    /// Fuso horário IANA correspondente ao IP (ex: "America/New_York", "Europe/London")
    pub timezone: String,
    /// Latitude geográfica
    pub latitude: f64,
    /// Longitude geográfica
    pub longitude: f64,
    /// Código do país ISO-2 (ex: "US", "DE", "BR")
    pub country_code: String,
    /// Idioma primário resolvido (ex: "en-US", "pt-BR")
    pub primary_language: String,
    /// Lista de idiomas para cabeçalho Accept-Language (ex: "en-US,en;q=0.9")
    pub accept_languages: String,
}

impl Default for ResolvedNetworkIdentity {
    fn default() -> Self {
        Self {
            egress_ip: None,
            timezone: String::new(),
            latitude: 0.0,
            longitude: 0.0,
            country_code: String::new(),
            primary_language: String::new(),
            accept_languages: String::new(),
        }
    }
}

#[derive(Deserialize)]
struct IpApiGeoResponse {
    query: Option<String>,
    timezone: Option<String>,
    lat: Option<f64>,
    lon: Option<f64>,
    #[serde(rename = "countryCode")]
    country_code: Option<String>,
}

#[derive(Deserialize)]
struct IpSbGeoResponse {
    ip: Option<String>,
    timezone: Option<String>,
    latitude: Option<f64>,
    longitude: Option<f64>,
    country_code: Option<String>,
}

/// Mapeia código ISO-2 do país para locale primário e string Accept-Language coerente
pub fn country_to_locale_and_languages(country: &str) -> (String, String) {
    let c = country.to_uppercase();
    match c.as_str() {
        "US" => ("en-US".to_string(), "en-US,en;q=0.9".to_string()),
        "GB" => ("en-GB".to_string(), "en-GB,en;q=0.9,en-US;q=0.8".to_string()),
        "CA" => ("en-CA".to_string(), "en-CA,en-US;q=0.9,en;q=0.8".to_string()),
        "AU" => ("en-AU".to_string(), "en-AU,en-GB;q=0.9,en;q=0.8".to_string()),
        "BR" => ("pt-BR".to_string(), "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7".to_string()),
        "PT" => ("pt-PT".to_string(), "pt-PT,pt;q=0.9,en-US;q=0.8,en;q=0.7".to_string()),
        "DE" => ("de-DE".to_string(), "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7".to_string()),
        "AT" => ("de-AT".to_string(), "de-AT,de;q=0.9,en-US;q=0.8,en;q=0.7".to_string()),
        "CH" => ("de-CH".to_string(), "de-CH,de;q=0.9,fr-CH;q=0.8,en;q=0.7".to_string()),
        "FR" => ("fr-FR".to_string(), "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7".to_string()),
        "ES" => ("es-ES".to_string(), "es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7".to_string()),
        "MX" => ("es-MX".to_string(), "es-MX,es;q=0.9,en-US;q=0.8,en;q=0.7".to_string()),
        "AR" => ("es-AR".to_string(), "es-AR,es;q=0.9,en-US;q=0.8,en;q=0.7".to_string()),
        "CO" => ("es-CO".to_string(), "es-CO,es;q=0.9,en-US;q=0.8,en;q=0.7".to_string()),
        "IT" => ("it-IT".to_string(), "it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7".to_string()),
        "NL" => ("nl-NL".to_string(), "nl-NL,nl;q=0.9,en-US;q=0.8,en;q=0.7".to_string()),
        "PL" => ("pl-PL".to_string(), "pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7".to_string()),
        "RU" => ("ru-RU".to_string(), "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7".to_string()),
        "UA" => ("uk-UA".to_string(), "uk-UA,uk;q=0.9,ru;q=0.8,en-US;q=0.7".to_string()),
        "JP" => ("ja-JP".to_string(), "ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7".to_string()),
        "KR" => ("ko-KR".to_string(), "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7".to_string()),
        "CN" => ("zh-CN".to_string(), "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7".to_string()),
        "TW" => ("zh-TW".to_string(), "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7".to_string()),
        "TR" => ("tr-TR".to_string(), "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7".to_string()),
        "IN" => ("en-IN".to_string(), "en-IN,en;q=0.9,hi;q=0.8".to_string()),
        other => {
            let low = other.to_lowercase();
            (format!("{}-{}", low, other), format!("{}-{},en-US;q=0.9,en;q=0.8", low, other))
        }
    }
}

/// Consulta o IP de saída real e geolocalização correspondente através de um cliente HTTP
async fn probe_geoip_via_client(client: &reqwest::Client) -> Option<ResolvedNetworkIdentity> {
    // 1. Tenta ip-api.com
    if let Ok(resp) = client
        .get("http://ip-api.com/json")
        .timeout(Duration::from_secs(6))
        .send()
        .await
    {
        if resp.status().is_success() {
            if let Ok(data) = resp.json::<IpApiGeoResponse>().await {
                if let Some(ip) = data.query.filter(|s| !s.trim().is_empty()) {
                    let country = data.country_code.unwrap_or_default();
                    let (primary, accept) = if !country.is_empty() {
                        country_to_locale_and_languages(&country)
                    } else {
                        (String::new(), String::new())
                    };
                    return Some(ResolvedNetworkIdentity {
                        egress_ip: Some(ip),
                        timezone: data.timezone.unwrap_or_default(),
                        latitude: data.lat.unwrap_or(0.0),
                        longitude: data.lon.unwrap_or(0.0),
                        country_code: country,
                        primary_language: primary,
                        accept_languages: accept,
                    });
                }
            }
        }
    }

    // 2. Fallback ip.sb
    if let Ok(resp) = client
        .get("https://api.ip.sb/geoip")
        .timeout(Duration::from_secs(6))
        .send()
        .await
    {
        if resp.status().is_success() {
            if let Ok(data) = resp.json::<IpSbGeoResponse>().await {
                if let Some(ip) = data.ip.filter(|s| !s.trim().is_empty()) {
                    let country = data.country_code.unwrap_or_default();
                    let (primary, accept) = if !country.is_empty() {
                        country_to_locale_and_languages(&country)
                    } else {
                        (String::new(), String::new())
                    };
                    return Some(ResolvedNetworkIdentity {
                        egress_ip: Some(ip),
                        timezone: data.timezone.unwrap_or_default(),
                        latitude: data.latitude.unwrap_or(0.0),
                        longitude: data.longitude.unwrap_or(0.0),
                        country_code: country,
                        primary_language: primary,
                        accept_languages: accept,
                    });
                }
            }
        }
    }

    None
}

/// Constrói a identidade de rede resolvida de forma determinística e segura para o perfil
pub async fn resolve_network_identity(
    proxy: &ProfileProxyConfig,
    fp_map: &serde_json::Map<String, serde_json::Value>,
    relay_port: Option<u16>,
) -> ResolvedNetworkIdentity {
    let has_proxy = proxy.proxy_type != "none" && !proxy.host.as_deref().unwrap_or("").trim().is_empty();

    // 1. Se possuir proxy, busca o IP real de saída via probe através do Proxy Relay loopback
    if has_proxy {
        if let Some(port) = relay_port {
            let proxy_url = format!("http://127.0.0.1:{}", port);
            if let Ok(req_proxy) = reqwest::Proxy::all(&proxy_url) {
                if let Ok(client) = reqwest::Client::builder()
                    .proxy(req_proxy)
                    .timeout(Duration::from_secs(8))
                    .build()
                {
                    if let Some(mut identity) = probe_geoip_via_client(&client).await {
                        info!(
                            "🌐 [GeoIP] Proxy resolvido: IP={}, Timezone={}, País={}, Lat={}, Lng={}",
                            identity.egress_ip.as_deref().unwrap_or("?"),
                            identity.timezone,
                            identity.country_code,
                            identity.latitude,
                            identity.longitude
                        );

                        // Se o perfil especificou override MANUAL explícito de timezone, respeita
                        if let Some(custom_tz) = fp_map.get("custom_timezone").and_then(|v| v.as_str()) {
                            let clean = custom_tz.trim();
                            if !clean.is_empty() && clean != "Automatic" && clean != "auto" {
                                identity.timezone = clean.to_string();
                            }
                        }

                        // Se o perfil especificou override MANUAL explícito de idioma, respeita
                        if let Some(custom_lang) = fp_map.get("custom_language").and_then(|v| v.as_str()) {
                            let clean = custom_lang.trim();
                            if !clean.is_empty() {
                                identity.accept_languages = clean.to_string();
                                identity.primary_language = clean
                                    .split(',')
                                    .next()
                                    .unwrap_or(&clean)
                                    .split(';')
                                    .next()
                                    .unwrap_or(&clean)
                                    .trim()
                                    .to_string();
                            }
                        }

                        return identity;
                    }
                }
            }
        }

        warn!("⚠️ [GeoIP] Falha ao consultar IP de saída via proxy. Usando resolução de emergência coerente.");
    }

    // 2. Modo Conexão Direta (Sem proxy) ou fallback offline
    let mut identity = ResolvedNetworkIdentity::default();

    // Timezone do fingerprint ou fallback seguro
    if let Some(custom_tz) = fp_map.get("custom_timezone").and_then(|v| v.as_str()) {
        let clean = custom_tz.trim();
        if !clean.is_empty() {
            identity.timezone = clean.to_string();
        }
    } else if let Some(tz_obj) = fp_map.get("timezone").and_then(|t| t.get("timezone_id")).and_then(|v| v.as_str()) {
        identity.timezone = tz_obj.trim().to_string();
    }

    // Idioma do fingerprint
    if let Some(custom_lang) = fp_map.get("custom_language").and_then(|v| v.as_str()) {
        let clean = custom_lang.trim();
        if !clean.is_empty() {
            identity.accept_languages = clean.to_string();
            identity.primary_language = clean
                .split(',')
                .next()
                .unwrap_or(&clean)
                .split(';')
                .next()
                .unwrap_or(&clean)
                .trim()
                .to_string();
        }
    } else if let Some(locale_obj) = fp_map.get("locale") {
        if let Some(primary) = locale_obj.get("primary_language").and_then(|v| v.as_str()) {
            identity.primary_language = primary.to_string();
        }
        if let Some(arr) = locale_obj.get("languages").and_then(|v| v.as_array()) {
            let list = arr.iter().filter_map(|x| x.as_str()).collect::<Vec<_>>().join(",");
            if !list.is_empty() {
                identity.accept_languages = list;
            }
        }
    }

    // Geolocalização
    if let Some(lat) = fp_map.get("custom_latitude").and_then(|v| v.as_f64()) {
        identity.latitude = lat;
    }
    if let Some(lon) = fp_map.get("custom_longitude").and_then(|v| v.as_f64()) {
        identity.longitude = lon;
    }

    identity
}
