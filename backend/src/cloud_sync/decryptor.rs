use std::fs;
use std::io::Cursor;
use std::path::{Path, PathBuf};
use tracing::{info, warn};
use uuid::Uuid;
use zip::ZipArchive;

pub const MAGIC_HEADER_V1: &[u8; 8] = crate::cloud_sync::crypto::MAGIC_HEADER_V1;
pub const MAGIC_HEADER_V2: &[u8; 8] = crate::cloud_sync::crypto::MAGIC_HEADER_V2;
pub const MAGIC_HEADER: &[u8; 8] = crate::cloud_sync::crypto::MAGIC_HEADER;
pub const SALT_LEN: usize = crate::cloud_sync::crypto::SALT_LEN;
pub const NONCE_LEN: usize = crate::cloud_sync::crypto::NONCE_LEN;
pub const MIN_PAYLOAD_LEN: usize = crate::cloud_sync::crypto::MIN_PAYLOAD_LEN;

/// Módulo dedicado à decriptação Zero-Knowledge (E2EE) e restauração atômica de perfis
pub struct ProfileDecryptor;

impl ProfileDecryptor {
    /// Deriva a chave de decriptação de 256 bits a partir da chave do usuário e do salt da cápsula (V2 padrão)
    pub fn derive_key(user_key: &str, salt: &[u8; SALT_LEN]) -> [u8; 32] {
        crate::cloud_sync::crypto::derive_key_v2(user_key, salt)
    }

    /// Descriptografa uma cápsula binária cifrada .enc com suporte a STARENC2 e retrocompatibilidade com STARENC1
    pub fn decrypt_capsule(encrypted_data: &[u8], user_key: &str) -> Result<Vec<u8>, String> {
        crate::cloud_sync::crypto::decrypt_capsule(encrypted_data, user_key)
    }

    /// Descompacta com máxima segurança contra Zip-Slip e de forma atômica
    pub fn unpack_atomic(capsule_zip: &[u8], target_dir: &Path) -> Result<(), String> {
        let parent_dir = target_dir
            .parent()
            .ok_or_else(|| "Diretório de perfis inválido".to_string())?;

        fs::create_dir_all(parent_dir)
            .map_err(|e| format!("Erro ao criar diretório pai {:?}: {}", parent_dir, e))?;

        let temp_dir_name = format!(
            "{}.restore_{}",
            target_dir
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("profile"),
            Uuid::new_v4().to_string().replace('-', "")
        );
        let temp_dir = parent_dir.join(temp_dir_name);

        fs::create_dir_all(&temp_dir)
            .map_err(|e| format!("Erro ao criar diretório temporário {:?}: {}", temp_dir, e))?;

        // Executa a extração no diretório temporário
        let extraction_result = Self::extract_zip_safely(capsule_zip, &temp_dir);

        if let Err(err) = extraction_result {
            // Em caso de falha, limpa o diretório temporário para não deixar lixo
            let _ = fs::remove_dir_all(&temp_dir);
            return Err(err);
        }

        // Validação de integridade pós-extração: deve conter metadata.json válido
        let meta_path = temp_dir.join("metadata.json");
        if !meta_path.exists() {
            let _ = fs::remove_dir_all(&temp_dir);
            return Err("Cápsula inválida: arquivo 'metadata.json' ausente na raiz do perfil".to_string());
        }

        let meta_content = fs::read_to_string(&meta_path)
            .map_err(|e| format!("Erro ao ler metadata.json extraído: {}", e))?;

        if serde_json::from_str::<serde_json::Value>(&meta_content).is_err() {
            let _ = fs::remove_dir_all(&temp_dir);
            return Err("Cápsula corrompida: 'metadata.json' não contém JSON válido".to_string());
        }

        // Substituição atômica: se o diretório alvo já existia, remove para substituí-lo
        if target_dir.exists() {
            let backup_dir = parent_dir.join(format!("{}.old_{}", temp_dir.file_name().unwrap().to_str().unwrap(), Uuid::new_v4()));
            if let Err(e) = fs::rename(target_dir, &backup_dir) {
                let _ = fs::remove_dir_all(&temp_dir);
                return Err(format!("Falha ao mover perfil existente para backup: {}", e));
            }
            if let Err(e) = fs::rename(&temp_dir, target_dir) {
                // Tenta restaurar backup
                let _ = fs::rename(&backup_dir, target_dir);
                let _ = fs::remove_dir_all(&temp_dir);
                return Err(format!("Falha ao mover diretório temporário para o destino final: {}", e));
            }
            let _ = fs::remove_dir_all(&backup_dir);
        } else {
            if let Err(e) = fs::rename(&temp_dir, target_dir) {
                let _ = fs::remove_dir_all(&temp_dir);
                return Err(format!("Falha ao mover diretório temporário para o destino final: {}", e));
            }
        }

        info!("🛡️ ProfileDecryptor: Perfil restaurado e verificado com sucesso em {:?}", target_dir);
        Ok(())
    }

    /// Descompacta o ZIP verificando cada caminho contra vulnerabilidades de travessia (Zip-Slip)
    fn extract_zip_safely(zip_bytes: &[u8], destination_root: &Path) -> Result<(), String> {
        let reader = Cursor::new(zip_bytes);
        let mut archive = ZipArchive::new(reader)
            .map_err(|e| format!("Arquivo de cápsula inválido ou não reconhecido como ZIP: {}", e))?;

        for i in 0..archive.len() {
            let mut file = archive
                .by_index(i)
                .map_err(|e| format!("Erro ao ler entrada {} do arquivo ZIP: {}", i, e))?;

            let raw_name = file.name().to_string();

            // Proteção estrita contra Zip-Slip (travessia de diretório)
            if raw_name.contains("..") || raw_name.starts_with('/') || raw_name.starts_with('\\') {
                warn!("⚠️ Entrada maliciosa ou inválida ignorada por segurança: {}", raw_name);
                continue;
            }

            let outpath: PathBuf = destination_root.join(&raw_name);

            // Garante que o caminho canônico do arquivo não escapa da raiz de destino
            if let Ok(canon_root) = destination_root.canonicalize() {
                if let Some(parent) = outpath.parent() {
                    let _ = fs::create_dir_all(parent);
                    if let Ok(canon_parent) = parent.canonicalize() {
                        if !canon_parent.starts_with(&canon_root) {
                            warn!("⚠️ Tentativa de Zip-Slip bloqueada: {:?}", outpath);
                            continue;
                        }
                    }
                }
            }

            if file.is_dir() {
                fs::create_dir_all(&outpath)
                    .map_err(|e| format!("Erro ao criar pasta {:?}: {}", outpath, e))?;
            } else {
                if let Some(parent) = outpath.parent() {
                    if !parent.exists() {
                        fs::create_dir_all(parent)
                            .map_err(|e| format!("Erro ao criar pasta pai {:?}: {}", parent, e))?;
                    }
                }
                let mut outfile = fs::File::create(&outpath)
                    .map_err(|e| format!("Erro ao criar arquivo de destino {:?}: {}", outpath, e))?;
                std::io::copy(&mut file, &mut outfile)
                    .map_err(|e| format!("Erro ao gravar dados no arquivo {:?}: {}", outpath, e))?;
            }
        }

        Ok(())
    }

    /// Descriptografa os bytes cifrados e restaura atômica e seguramente no diretório local do perfil
    pub fn decrypt_and_restore(
        encrypted_bytes: &[u8],
        user_key: &str,
        target_dir: &Path,
    ) -> Result<(), String> {
        let capsule_zip = Self::decrypt_capsule(encrypted_bytes, user_key)?;
        Self::unpack_atomic(&capsule_zip, target_dir)?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::cloud_sync::crypto::encrypt_capsule;

    #[test]
    fn test_decrypt_and_unpack() {
        let key = "usr_test_secret_12345";
        let temp_dir = std::env::temp_dir().join(format!("star_test_profile_{}", Uuid::new_v4()));

        // Cria um zip fictício contendo metadata.json
        let mut buffer = Vec::new();
        {
            let mut zip = zip::ZipWriter::new(Cursor::new(&mut buffer));
            let options = zip::write::SimpleFileOptions::default()
                .compression_method(zip::CompressionMethod::Deflated);
            zip.start_file("metadata.json", options).unwrap();
            use std::io::Write;
            zip.write_all(b"{\"id\":\"test\",\"name\":\"Test Profile\"}").unwrap();
            zip.finish().unwrap();
        }

        let encrypted = encrypt_capsule(&buffer, key).expect("Cifra com sucesso");
        let result = ProfileDecryptor::decrypt_and_restore(&encrypted, key, &temp_dir);

        assert!(result.is_ok());
        assert!(temp_dir.join("metadata.json").exists());

        // Limpeza
        let _ = fs::remove_dir_all(&temp_dir);
    }
}
