use std::fs;
use std::path::Path;
use tracing::warn;

/// Extrai o Gecko Add-on ID diretamente do manifest.json contido no pacote .xpi (arquivo ZIP).
/// Padrões aceitos pela Mozilla WebExtensions:
/// - browser_specific_settings.gecko.id (padrão moderno)
/// - applications.gecko.id (padrão legado)
pub fn extract_addon_id_from_xpi<P: AsRef<Path>>(xpi_path: P) -> Option<String> {
    let file = fs::File::open(xpi_path.as_ref()).ok()?;
    let mut archive = zip::ZipArchive::new(file).ok()?;
    let mut manifest_file = archive.by_name("manifest.json").ok()?;
    let val: serde_json::Value = serde_json::from_reader(&mut manifest_file).ok()?;

    let id = val
        .pointer("/browser_specific_settings/gecko/id")
        .or_else(|| val.pointer("/applications/gecko/id"))
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(String::from);

    if id.is_none() {
        warn!(
            "manifest.json em {:?} não possui ID explícito de gecko/applications.",
            xpi_path.as_ref()
        );
    }

    id
}
