use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::Read;
use std::path::Path;

use super::error::AstrobrowserError;

/// Calcula o hash SHA-256 de um arquivo local
pub fn compute_file_sha256(path: &Path) -> Result<String, AstrobrowserError> {
    let mut file = File::open(path)?;
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 1024 * 1024]; // buffer de 1MB

    loop {
        let count = file.read(&mut buffer)?;
        if count == 0 {
            break;
        }
        hasher.update(&buffer[..count]);
    }

    let result = hasher.finalize();
    Ok(format!("{:x}", result))
}

/// Verifica se o hash SHA-256 de um arquivo confere com o valor esperado
pub fn verify_file_sha256(path: &Path, expected: &str) -> Result<(), AstrobrowserError> {
    let computed = compute_file_sha256(path)?;
    if !computed.eq_ignore_ascii_case(expected.trim()) {
        return Err(AstrobrowserError::ChecksumMismatch {
            expected: expected.trim().to_lowercase(),
            got: computed,
        });
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn test_sha256_verification() -> Result<(), Box<dyn std::error::Error>> {
        let temp_dir = std::env::temp_dir().join(format!(
            "sha_ab_test_{}",
            std::time::SystemTime::now().elapsed()?.as_nanos()
        ));
        std::fs::create_dir_all(&temp_dir)?;
        let file_path = temp_dir.join("test.txt");

        let mut file = File::create(&file_path)?;
        file.write_all(b"clearcote browser verification test")?;
        drop(file);

        let hash = compute_file_sha256(&file_path)?;
        assert_eq!(hash.len(), 64);
        assert!(verify_file_sha256(&file_path, &hash).is_ok());

        let bad_verify = verify_file_sha256(
            &file_path,
            "0000000000000000000000000000000000000000000000000000000000000000",
        );
        assert!(bad_verify.is_err());

        let _ = std::fs::remove_dir_all(&temp_dir);
        Ok(())
    }
}
