use std::fs;
use std::path::{Path, PathBuf};
use tracing::info;

/// Extrai o slug de uma URL do catálogo Mozilla Add-ons (AMO) ou de uma string simples.
/// Exemplos suportados:
/// - "https://addons.mozilla.org/pt-BR/firefox/addon/ublock-origin/" -> "ublock-origin"
/// - "https://addons.mozilla.org/en-US/firefox/addon/darkreader/?utm_source=..." -> "darkreader"
/// - "ublock-origin" -> "ublock-origin"
pub fn extract_amo_slug(url_or_slug: &str) -> Option<String> {
    let trimmed = url_or_slug.trim();
    if trimmed.is_empty() {
        return None;
    }

    if trimmed.contains("addons.mozilla.org") {
        let sub = trimmed.split("/addon/").nth(1)?;
        let slug = sub.split(['/', '?', '#']).next()?.trim();
        if !slug.is_empty() {
            return Some(slug.to_string());
        }
    } else if !trimmed.contains('/') && !trimmed.contains(':') {
        return Some(trimmed.to_string());
    }

    None
}

/// Baixa e faz cache de uma extensão a partir do slug do AMO ou link direto.
/// Retorna o PathBuf do arquivo .xpi no cache e o GUID (se obtido via API do AMO).
pub async fn download_and_cache_xpi(
    slug_or_url: &str,
    cache_dir: &Path,
    client: &reqwest::Client,
) -> Result<(PathBuf, Option<String>), String> {
    let slug = extract_amo_slug(slug_or_url).unwrap_or_else(|| {
        slug_or_url
            .split(['/', '?', '#'])
            .filter(|s| !s.is_empty())
            .last()
            .unwrap_or("ext")
            .to_string()
    });

    let cached_file = cache_dir.join(format!("{slug}.xpi"));

    // Se já estiver no cache e não for arquivo vazio
    if cached_file.exists() && cached_file.metadata().map(|m| m.len() > 0).unwrap_or(false) {
        return Ok((cached_file, None));
    }

    // 1. Consulta a API oficial do AMO (v5) para resolver GUID e link de download
    let amo_api_url = format!("https://addons.mozilla.org/api/v5/addons/addon/{slug}/");
    let mut resolved_guid: Option<String> = None;
    let mut download_url = format!("https://addons.mozilla.org/firefox/downloads/latest/{slug}/latest.xpi");

    if let Ok(resp) = client.get(&amo_api_url).send().await {
        if resp.status().is_success() {
            if let Ok(json) = resp.json::<serde_json::Value>().await {
                resolved_guid = json
                    .get("guid")
                    .and_then(|v| v.as_str())
                    .map(str::trim)
                    .filter(|g| !g.is_empty())
                    .map(String::from);

                if let Some(url) = json.pointer("/current_version/files/0/url").and_then(|u| u.as_str()) {
                    let trimmed_url = url.trim();
                    if !trimmed_url.is_empty() {
                        download_url = trimmed_url.to_string();
                    }
                }
            }
        }
    }

    // 2. Baixa o binário do .xpi
    info!("⬇️ Baixando extensão '{slug}' de {download_url}");
    let resp = client
        .get(&download_url)
        .send()
        .await
        .map_err(|e| format!("Falha de conexão ao baixar extensão '{slug}': {e}"))?;

    if !resp.status().is_success() {
        return Err(format!("Servidor AMO retornou status {} ao baixar '{slug}'", resp.status()));
    }

    let bytes = resp
        .bytes()
        .await
        .map_err(|e| format!("Erro ao ler bytes da extensão '{slug}': {e}"))?;

    if bytes.is_empty() {
        return Err(format!("Download da extensão '{slug}' retornou 0 bytes"));
    }

    fs::write(&cached_file, &bytes)
        .map_err(|e| format!("Falha ao salvar .xpi no cache ({cached_file:?}): {e}"))?;

    info!("✅ Extensão '{slug}' ({} bytes) salva no cache com sucesso", bytes.len());

    Ok((cached_file, resolved_guid))
}
