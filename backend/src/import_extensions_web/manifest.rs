use std::fs;
use std::io::Read;
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
    let mut content = String::new();
    manifest_file.read_to_string(&mut content).ok()?;
    let val: serde_json::Value = serde_json::from_str(&content).ok()?;

    if let Some(id) = val
        .get("browser_specific_settings")
        .and_then(|b| b.get("gecko"))
        .and_then(|g| g.get("id"))
        .and_then(|i| i.as_str())
    {
        let trimmed = id.trim();
        if !trimmed.is_empty() {
            return Some(trimmed.to_string());
        }
    }

    if let Some(id) = val
        .get("applications")
        .and_then(|a| a.get("gecko"))
        .and_then(|g| g.get("id"))
        .and_then(|i| i.as_str())
    {
        let trimmed = id.trim();
        if !trimmed.is_empty() {
            return Some(trimmed.to_string());
        }
    }

    warn!(
        "manifest.json em {:?} não possui ID explícito de gecko/applications.",
        xpi_path.as_ref()
    );
    None
}
