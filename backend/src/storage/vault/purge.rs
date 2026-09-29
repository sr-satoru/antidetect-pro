use std::path::Path;

/// Executa a purga definitiva e limpeza de arquivos legados soltos do disco (Item 999: Clean Slate)
pub fn clean_slate_purge_legacy_files(data_dir: &Path) {
    tracing::info!("🧹 Executando Clean Slate (Item 999): Expurgo de arquivos soltos legados...");

    // 1. Remove data/proxies/ e todos os .json internos
    let proxies_dir = data_dir.join("proxies");
    if proxies_dir.exists() {
        if let Err(e) = std::fs::remove_dir_all(&proxies_dir) {
            tracing::warn!("Aviso ao remover pasta legada proxies: {}", e);
        } else {
            tracing::info!("🗑️ Pasta legada proxies/ removida com sucesso");
        }
    }

    // 2. Remove data/tags.json
    let tags_file = data_dir.join("tags.json");
    if tags_file.exists() {
        let _ = std::fs::remove_file(tags_file);
        tracing::info!("🗑️ Arquivo legado tags.json removido");
    }

    // 3. Remove sessões soltas legadas
    let auth_json = data_dir.join("auth_session.json");
    if auth_json.exists() {
        let _ = std::fs::remove_file(auth_json);
    }
    let auth_enc = data_dir.join("auth_session.enc");
    if auth_enc.exists() {
        let _ = std::fs::remove_file(auth_enc);
    }

    // 4. Remove tokens soltos legados
    let api_tok = data_dir.join("api-token");
    if api_tok.exists() {
        let _ = std::fs::remove_file(api_tok);
    }
    let api_enc = data_dir.join("api-token.enc");
    if api_enc.exists() {
        let _ = std::fs::remove_file(api_enc);
    }
    let old_salt = data_dir.join(".mcp_salt");
    if old_salt.exists() {
        let _ = std::fs::remove_file(old_salt);
    }

    // 5. Remove metadata.json soltos dentro de cada perfil em profiles/
    let profiles_dir = data_dir.join("profiles");
    if profiles_dir.exists() {
        if let Ok(entries) = std::fs::read_dir(&profiles_dir) {
            for entry in entries.flatten() {
                if let Ok(ft) = entry.file_type() {
                    if ft.is_dir() {
                        let meta_file = entry.path().join("metadata.json");
                        if meta_file.exists() {
                            let _ = std::fs::remove_file(&meta_file);
                            tracing::info!("🗑️ Arquivo legado metadata.json removido de {:?}", entry.path());
                        }
                    }
                }
            }
        }
    }

    tracing::info!("✨ Clean Slate concluído: Todos os arquivos legados de texto puro foram eliminados");
}
