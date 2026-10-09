pub mod cws_downloader;
pub mod extractor;
pub mod normalizer;

pub use cws_downloader::{download_cws_crx, extract_cws_id};
pub use extractor::{extract_extension_package, find_zip_offset};
pub use normalizer::{normalize_and_package_extension, NormalizedExtensionInfo};

use std::fs;
use std::path::Path;

/// Processa completamente um pacote binário (bytes) de extensão:
/// 1. Cria diretório `storage/<id>/unpacked/` e descompacta o arquivo (.crx, .xpi, .zip).
/// 2. Inspeciona o `manifest.json`, injeta `browser_specific_settings.gecko.id` se ausente para Firefox.
/// 3. Compacta `storage/<id>/unpacked/` gerando `storage/<id>/package.xpi` para Firefox.
/// 4. Retorna as informações normalizadas com nome, versão, gecko_id e ícone.
pub fn process_extension_binary<P: AsRef<Path>>(
    bytes: &[u8],
    storage_dir: P,
    slug_hint: &str,
) -> Result<NormalizedExtensionInfo, String> {
    let storage_dir = storage_dir.as_ref();
    let unpacked_dir = storage_dir.join("unpacked");
    let package_xpi = storage_dir.join("package.xpi");

    // Limpa versões anteriores se existirem
    if unpacked_dir.exists() {
        let _ = fs::remove_dir_all(&unpacked_dir);
    }
    if package_xpi.exists() {
        let _ = fs::remove_file(&package_xpi);
    }

    extract_extension_package(bytes, &unpacked_dir)?;
    let info = normalize_and_package_extension(&unpacked_dir, &package_xpi, slug_hint)?;

    Ok(info)
}
