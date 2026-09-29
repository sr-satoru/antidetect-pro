use std::fs;
use std::path::{Path, PathBuf};
use tracing::{info, warn};

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
        if let Some(pos) = trimmed.find("/addon/") {
            let sub = &trimmed[pos + 7..];
            let slug = sub.split('/').next()?.split('?').next()?.split('#').next()?.trim();
            if !slug.is_empty() {
                return Some(slug.to_string());
            }
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
            .split('/')
            .last()
            .unwrap_or("ext")
            .split('?')
            .next()
            .unwrap_or("ext")
            .to_string()
    });

    let cached_file = cache_dir.join(format!("{}.xpi", slug));

    // Se já estiver no cache e não for arquivo vazio
    if cached_file.exists() && cached_file.metadata().map(|m| m.len() > 0).unwrap_or(false) {
        return Ok((cached_file, None));
    }

    // 1. Consulta a API oficial do AMO (v5)
    let amo_api_url = format!("https://addons.mozilla.org/api/v5/addons/addon/{}/", slug);
    let mut resolved_guid: Option<String> = None;
    let mut download_url = format!(
        "https://addons.mozilla.org/firefox/downloads/latest/{}/latest.xpi",
        slug
    );

    match client.get(&amo_api_url).send().await {
        Ok(resp) if resp.status().is_success() => {
            if let Ok(json) = resp.json::<serde_json::Value>().await {
                if let Some(g) = json.get("guid").and_then(|v| v.as_str()) {
                    let trimmed_g = g.trim();
                    if !trimmed_g.is_empty() {
                        resolved_guid = Some(trimmed_g.to_string());
                    }
                }
                if let Some(url) = json
                    .get("current_version")
                    .and_then(|v| v.get("files"))
                    .and_then(|f| f.as_array())
                    .and_then(|arr| arr.first())
                    .and_then(|f| f.get("url"))
                    .and_then(|u| u.as_str())
                {
                    if !url.trim().is_empty() {
                        download_url = url.trim().to_string();
                    }
                }
            }
        }
        Err(err) => {
            warn!(
                "Consulta à API do AMO falhou para '{}' (tentando URL direta): {}",
                slug, err
            );
        }
        _ => {}
    }

    // 2. Baixa o binário do .xpi
    info!("⬇️ Baixando extensão '{}' de {}", slug, download_url);
    let resp = client
        .get(&download_url)
        .send()
        .await
        .map_err(|e| format!("Falha de conexão ao baixar extensão '{}': {}", slug, e))?;

    if !resp.status().is_success() {
        return Err(format!(
            "Servidor AMO retornou status {} ao baixar '{}'",
            resp.status(),
            slug
        ));
    }

    let bytes = resp
        .bytes()
        .await
        .map_err(|e| format!("Erro ao ler bytes da extensão '{}': {}", slug, e))?;

    if bytes.is_empty() {
        return Err(format!("Download da extensão '{}' retornou 0 bytes", slug));
    }

    fs::write(&cached_file, &bytes)
        .map_err(|e| format!("Falha ao salvar .xpi no cache ({:?}): {}", cached_file, e))?;

    info!(
        "✅ Extensão '{}' ({} bytes) salva no cache com sucesso",
        slug,
        bytes.len()
    );

    Ok((cached_file, resolved_guid))
}
