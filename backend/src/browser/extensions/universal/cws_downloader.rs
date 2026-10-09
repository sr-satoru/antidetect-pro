use tracing::info;

/// Extrai o ID de 32 caracteres da extensão na Chrome Web Store.
/// Exemplos:
/// - "https://chromewebstore.google.com/detail/dark-reader/eimadpbcbfnmbkopoojfekhnkhdbieeh" -> "eimadpbcbfnmbkopoojfekhnkhdbieeh"
/// - "https://chrome.google.com/webstore/detail/ublock-origin-lite/ddkjiahejlhfcafbddmgiahcphecmpfh?hl=pt" -> "ddkjiahejlhfcafbddmgiahcphecmpfh"
/// - "eimadpbcbfnmbkopoojfekhnkhdbieeh" -> "eimadpbcbfnmbkopoojfekhnkhdbieeh"
pub fn extract_cws_id(url_or_id: &str) -> Option<String> {
    let trimmed = url_or_id.trim();
    if trimmed.is_empty() {
        return None;
    }

    // Se já for uma string direta de 32 caracteres em [a-p]
    if trimmed.len() == 32 && trimmed.chars().all(|c| ('a'..='p').contains(&c)) {
        return Some(trimmed.to_string());
    }

    // Se for URL da Chrome Web Store
    if trimmed.contains("chromewebstore.google.com") || trimmed.contains("chrome.google.com/webstore") {
        // Divide os segmentos da URL
        let segments: Vec<&str> = trimmed
            .split(['/', '?', '#'])
            .filter(|s| !s.is_empty())
            .collect();

        // O ID do CWS é tipicamente o último segmento ou vem após /detail/
        for seg in segments.iter().rev() {
            let clean = seg.trim().to_lowercase();
            if clean.len() == 32 && clean.chars().all(|c| ('a'..='p').contains(&c)) {
                return Some(clean);
            }
        }
    }

    None
}

/// Efetua download direto do pacote .crx oficial a partir dos servidores de update do Google.
pub async fn download_cws_crx(
    ext_id: &str,
    client: &reqwest::Client,
) -> Result<Vec<u8>, String> {
    let clean_id = ext_id.trim().to_lowercase();
    if clean_id.len() != 32 || !clean_id.chars().all(|c| ('a'..='p').contains(&c)) {
        return Err(format!("ID da Chrome Web Store inválido: '{clean_id}' (esperado 32 caracteres entre a-p)"));
    }

    let download_url = format!(
        "https://clients2.google.com/service/update2/crx?response=redirect&prod=chromecrx&prodversion=130.0.0.0&acceptformat=crx3&x=id%3D{clean_id}%26uc"
    );

    info!("⬇️ Baixando extensão da Chrome Web Store: {clean_id} de {download_url}");

    let resp = client
        .get(&download_url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36")
        .send()
        .await
        .map_err(|e| format!("Falha de conexão ao baixar CRX da CWS ({clean_id}): {e}"))?;

    if !resp.status().is_success() {
        return Err(format!(
            "Servidor Google retornou status HTTP {} ao baixar extensão '{clean_id}'",
            resp.status()
        ));
    }

    let bytes = resp
        .bytes()
        .await
        .map_err(|e| format!("Erro ao ler bytes do download da CWS ({clean_id}): {e}"))?;

    if bytes.is_empty() {
        return Err(format!("Download da extensão CWS '{clean_id}' retornou 0 bytes"));
    }

    info!("✅ Extensão CWS '{clean_id}' baixada com sucesso ({} bytes)", bytes.len());
    Ok(bytes.to_vec())
}
