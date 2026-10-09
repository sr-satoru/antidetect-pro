use std::fs;
use std::io::Cursor;
use std::path::Path;
use tracing::{debug, info};

/// Extrai um arquivo empacotado (.zip, .xpi, .crx2 ou .crx3) para um diretório de destino.
/// Lida de forma transparente com o cabeçalho binário Cr24 de extensões do Chrome.
pub fn extract_extension_package<P: AsRef<Path>>(
    bytes: &[u8],
    dest_dir: P,
) -> Result<(), String> {
    let dest_dir = dest_dir.as_ref();
    fs::create_dir_all(dest_dir)
        .map_err(|e| format!("Falha ao criar diretório de destino {dest_dir:?}: {e}"))?;

    let zip_offset = find_zip_offset(bytes)
        .ok_or_else(|| "Formato de arquivo não reconhecido (não é ZIP, XPI ou CRX válido)".to_string())?;

    debug!("Iniciando extração ZIP a partir do offset {zip_offset} (total bytes: {})", bytes.len());

    let cursor = Cursor::new(&bytes[zip_offset..]);
    let mut archive = zip::ZipArchive::new(cursor)
        .map_err(|e| format!("Erro ao abrir arquivo ZIP: {e}"))?;

    for i in 0..archive.len() {
        let mut file = archive
            .by_index(i)
            .map_err(|e| format!("Erro ao ler entrada #{i} do arquivo: {e}"))?;

        let raw_name = file.name();
        // Previne Directory Traversal (ex: ../../etc/passwd)
        let safe_path = sanitize_archive_path(raw_name)
            .ok_or_else(|| format!("Caminho inválido ou inseguro no arquivo: {raw_name}"))?;

        let outpath = dest_dir.join(safe_path);

        if file.is_dir() {
            fs::create_dir_all(&outpath)
                .map_err(|e| format!("Erro ao criar pasta {outpath:?}: {e}"))?;
        } else {
            if let Some(parent) = outpath.parent() {
                if !parent.exists() {
                    fs::create_dir_all(parent)
                        .map_err(|e| format!("Erro ao criar pasta pai {parent:?}: {e}"))?;
                }
            }
            let mut outfile = fs::File::create(&outpath)
                .map_err(|e| format!("Erro ao criar arquivo {outpath:?}: {e}"))?;
            std::io::copy(&mut file, &mut outfile)
                .map_err(|e| format!("Erro ao extrair conteúdo para {outpath:?}: {e}"))?;
        }
    }

    info!("✅ Pacote descompactado com sucesso ({archive_len} itens) em {dest_dir:?}", archive_len = archive.len());
    Ok(())
}

/// Identifica onde o fluxo ZIP padrão (PK\x03\x04) começa dentro dos bytes fornecidos.
pub fn find_zip_offset(bytes: &[u8]) -> Option<usize> {
    if bytes.len() < 4 {
        return None;
    }

    // 1. Caso padrão: Já é um arquivo ZIP / XPI nativo (PK\x03\x04 ou PK\x05\x06)
    if bytes.starts_with(b"PK\x03\x04") || bytes.starts_with(b"PK\x05\x06") {
        return Some(0);
    }

    // 2. Extensão Chrome (.crx) com cabeçalho 'Cr24'
    if bytes.starts_with(b"Cr24") && bytes.len() >= 16 {
        let version = u32::from_le_bytes([bytes[4], bytes[5], bytes[6], bytes[7]]);
        match version {
            3 => {
                // CRX3: 4b magic + 4b version + 4b header_size + header_size bytes protobuf
                let header_size = u32::from_le_bytes([bytes[8], bytes[9], bytes[10], bytes[11]]) as usize;
                let zip_start = 12 + header_size;
                if zip_start < bytes.len() && bytes[zip_start..].starts_with(b"PK\x03\x04") {
                    return Some(zip_start);
                }
            }
            2 => {
                // CRX2: 4b magic + 4b version + 4b pubkey_len + 4b sig_len + pubkey + sig
                let pubkey_len = u32::from_le_bytes([bytes[8], bytes[9], bytes[10], bytes[11]]) as usize;
                let sig_len = u32::from_le_bytes([bytes[12], bytes[13], bytes[14], bytes[15]]) as usize;
                let zip_start = 16 + pubkey_len + sig_len;
                if zip_start < bytes.len() && bytes[zip_start..].starts_with(b"PK\x03\x04") {
                    return Some(zip_start);
                }
            }
            _ => {}
        }
    }

    // 3. Fallback: Escaneamento linear dos primeiros 128KB pelo marcador PK\x03\x04
    let scan_limit = bytes.len().min(131_072);
    for i in 0..scan_limit.saturating_sub(4) {
        if &bytes[i..i + 4] == b"PK\x03\x04" {
            return Some(i);
        }
    }

    None
}

/// Sanitiza caminhos de arquivos dentro do ZIP para prevenir Directory Traversal
fn sanitize_archive_path(path_str: &str) -> Option<std::path::PathBuf> {
    let path = Path::new(path_str);
    let mut clean = std::path::PathBuf::new();
    for component in path.components() {
        match component {
            std::path::Component::Normal(c) => clean.push(c),
            std::path::Component::CurDir => continue,
            _ => return None, // ParentDir (..) ou Prefix / RootDir não permitidos
        }
    }
    if clean.as_os_str().is_empty() {
        None
    } else {
        Some(clean)
    }
}
