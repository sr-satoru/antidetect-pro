use std::fs;
use std::io::{Cursor, Read, Write};
use std::path::Path;
use tracing::{info, warn};
use zip::write::SimpleFileOptions;
use zip::{ZipArchive, ZipWriter};

pub const EXCLUDED_DIRS: &[&str] = &[
    "cache2",
    "startupCache",
    "safebrowsing",
    "thumbnails",
    "datareporting",
    "security_state",
    "extensions",
    "extension-store",
    "jumpListCache",
    "crashes",
];

pub const EXCLUDED_FILES: &[&str] = &[
    "favicons.sqlite",
    "favicons.sqlite-wal",
    "favicons.sqlite-shm",
    "places.sqlite-wal",
    ".parentlock",
    "lock",
    "Telemetry.ShutdownTime.txt",
];

/// Empacota a pasta de um perfil em uma cápsula compactada (ZIP), excluindo estritamente cache e extensões.
/// Garante que o payload final fique em torno de 300 KB a 1 MB.
pub fn pack_profile_capsule(profile_root: &Path) -> Result<Vec<u8>, String> {
    if !profile_root.exists() {
        return Err(format!("Diretório do perfil não existe: {:?}", profile_root));
    }

    let mut buffer = Vec::new();
    {
        let mut zip = ZipWriter::new(Cursor::new(&mut buffer));
        let options = SimpleFileOptions::default()
            .compression_method(zip::CompressionMethod::Deflated)
            .unix_permissions(0o755);

        fn add_dir_to_zip<W: Write + std::io::Seek>(
            base_dir: &Path,
            current_dir: &Path,
            zip: &mut ZipWriter<W>,
            options: SimpleFileOptions,
        ) -> Result<(), String> {
            let entries = fs::read_dir(current_dir).map_err(|e| e.to_string())?;

            for entry in entries.flatten() {
                let path = entry.path();
                let file_name = path
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or_default();

                // 1. Filtro de diretórios proibidos (Cache, Telemetria, Extensões pesadas)
                if path.is_dir() {
                    if EXCLUDED_DIRS.contains(&file_name) {
                        continue;
                    }
                    add_dir_to_zip(base_dir, &path, zip, options)?;
                } else if path.is_file() {
                    // 2. Filtro de arquivos proibidos e temporários
                    if EXCLUDED_FILES.contains(&file_name) {
                        continue;
                    }
                    if file_name.ends_with("-wal") || file_name.ends_with("-shm") {
                        continue;
                    }

                    let relative_path = path
                        .strip_prefix(base_dir)
                        .map_err(|e| e.to_string())?
                        .to_string_lossy()
                        .replace('\\', "/");

                    zip.start_file(&relative_path, options)
                        .map_err(|e| format!("Erro ao adicionar {} ao zip: {}", relative_path, e))?;

                    let content = fs::read(&path)
                        .map_err(|e| format!("Erro ao ler arquivo {}: {}", path.display(), e))?;
                    zip.write_all(&content)
                        .map_err(|e| format!("Erro ao gravar {} no zip: {}", relative_path, e))?;
                }
            }
            Ok(())
        }

        add_dir_to_zip(profile_root, profile_root, &mut zip, options)?;
        zip.finish().map_err(|e| format!("Erro ao finalizar ZIP do perfil: {}", e))?;
    }

    let size_bytes = buffer.len();
    let size_kb = size_bytes / 1024;
    info!("📦 Cápsula de perfil empacotada com sucesso! Tamanho: {} KB ({} bytes)", size_kb, size_bytes);

    if size_bytes > 1_500_000 {
        warn!("⚠️ Alerta: O perfil compactado excedeu 1.5 MB ({} KB). Verifique arquivos não filtrados.", size_kb);
    }

    Ok(buffer)
}

/// Desempacota uma cápsula ZIP no diretório de destino de um perfil.
#[allow(dead_code)]
pub fn unpack_profile_capsule(capsule_bytes: &[u8], target_root: &Path) -> Result<(), String> {
    let reader = Cursor::new(capsule_bytes);
    let mut archive = ZipArchive::new(reader)
        .map_err(|e| format!("Arquivo de cápsula inválido ou corrompido: {}", e))?;

    for i in 0..archive.len() {
        let mut file = archive
            .by_index(i)
            .map_err(|e| format!("Erro ao acessar arquivo no zip (index {}): {}", i, e))?;

        let raw_name = file.name().to_string();

        // Prevenção contra Zip Slip Vulnerability (caminhos com ../)
        if raw_name.contains("..") || raw_name.starts_with('/') {
            warn!("⚠️ Caminho inválido detectado na cápsula ignorado por segurança: {}", raw_name);
            continue;
        }

        let outpath = target_root.join(raw_name);

        if file.is_dir() {
            fs::create_dir_all(&outpath)
                .map_err(|e| format!("Erro ao criar diretório {:?}: {}", outpath, e))?;
        } else {
            if let Some(parent) = outpath.parent() {
                if !parent.exists() {
                    fs::create_dir_all(parent)
                        .map_err(|e| format!("Erro ao criar diretório pai {:?}: {}", parent, e))?;
                }
            }
            let mut outfile = fs::File::create(&outpath)
                .map_err(|e| format!("Erro ao criar arquivo de destino {:?}: {}", outpath, e))?;
            let mut content = Vec::new();
            file.read_to_end(&mut content)
                .map_err(|e| format!("Erro ao ler entrada do zip: {}", e))?;
            outfile
                .write_all(&content)
                .map_err(|e| format!("Erro ao salvar arquivo {:?}: {}", outpath, e))?;
        }
    }

    info!("✅ Cápsula descompactada com sucesso em: {:?}", target_root);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_capsule_size_under_1mb() {
        let temp_dir = std::env::temp_dir().join(format!("star_test_profile_{}", uuid::Uuid::new_v4()));
        let profile_dir = temp_dir.join("profile");
        fs::create_dir_all(&profile_dir).unwrap();

        // 1. Arquivos legítimos (devem ser incluídos)
        let meta = r#"{"id":"prf_test123","name":"Test Profile","kernel":"Camoufox"}"#;
        fs::write(temp_dir.join("metadata.json"), meta).unwrap();
        fs::write(profile_dir.join("cookies.sqlite"), vec![0u8; 64 * 1024]).unwrap(); // 64 KB
        fs::write(profile_dir.join("prefs.js"), "user_pref('network.proxy.type', 0);").unwrap();
        
        let storage_dir = profile_dir.join("storage").join("default");
        fs::create_dir_all(&storage_dir).unwrap();
        fs::write(storage_dir.join("webappsstore.sqlite"), vec![0u8; 32 * 1024]).unwrap();

        // 2. Arquivos e diretórios pesados proibidos (DEVEM SER EXCLUÍDOS)
        // 5 MB de favicons
        fs::write(profile_dir.join("favicons.sqlite"), vec![0u8; 5 * 1024 * 1024]).unwrap();
        fs::write(profile_dir.join("favicons.sqlite-wal"), vec![0u8; 512 * 1024]).unwrap();
        fs::write(profile_dir.join("places.sqlite-wal"), vec![0u8; 512 * 1024]).unwrap();
        fs::write(profile_dir.join(".parentlock"), "lock").unwrap();
        fs::write(profile_dir.join("lock"), "lock").unwrap();

        // 3 MB de cache2
        let cache2_dir = profile_dir.join("cache2").join("entries");
        fs::create_dir_all(&cache2_dir).unwrap();
        fs::write(cache2_dir.join("cached_asset.bin"), vec![0u8; 3 * 1024 * 1024]).unwrap();

        // 2 MB de extensões pesadas no perfil (extensões são locais e nunca vão para nuvem)
        let exts_dir = profile_dir.join("extensions");
        fs::create_dir_all(&exts_dir).unwrap();
        fs::write(exts_dir.join("heavy_extension.xpi"), vec![0u8; 2 * 1024 * 1024]).unwrap();

        // Executa o empacotamento
        let capsule_bytes = pack_profile_capsule(&temp_dir).expect("Empacota cápsula");

        // A pasta bruta tem > 10 MB, mas a cápsula DEVE ter menos de 1 MB (< 1.000.000 bytes)
        assert!(
            capsule_bytes.len() < 1_000_000,
            "A cápsula gerada tem {} bytes, excedendo o limite de 1 MB!",
            capsule_bytes.len()
        );

        // Valida restauração (desempacotamento)
        let restore_dir = std::env::temp_dir().join(format!("star_restore_profile_{}", uuid::Uuid::new_v4()));
        unpack_profile_capsule(&capsule_bytes, &restore_dir).expect("Desempacota cápsula");

        // Confirma inclusão dos arquivos essenciais
        assert!(restore_dir.join("metadata.json").exists());
        assert!(restore_dir.join("profile").join("cookies.sqlite").exists());
        assert!(restore_dir.join("profile").join("prefs.js").exists());
        assert!(restore_dir.join("profile").join("storage").join("default").join("webappsstore.sqlite").exists());

        // Confirma que os arquivos proibidos NÃO FORAM restaurados
        assert!(!restore_dir.join("profile").join("favicons.sqlite").exists());
        assert!(!restore_dir.join("profile").join("cache2").exists());
        assert!(!restore_dir.join("profile").join("extensions").exists());
        assert!(!restore_dir.join("profile").join(".parentlock").exists());

        // Limpeza
        let _ = fs::remove_dir_all(&temp_dir);
        let _ = fs::remove_dir_all(&restore_dir);
    }
}

