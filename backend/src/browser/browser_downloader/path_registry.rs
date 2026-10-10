use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};
use tracing::{info, warn};

/// Metadados de um motor de navegação registrado
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegisteredEngineInfo {
    pub engine: String,
    pub version: String,
    pub target_dir: PathBuf,
    pub executable_path: PathBuf,
    pub last_verified: String,
}

/// Conteúdo do arquivo de registro engine_paths.json
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct EngineRegistryData {
    pub engines: HashMap<String, RegisteredEngineInfo>,
}

/// Retorna o caminho do arquivo engine_paths.json baseado no data_dir
pub fn get_registry_path(data_dir: &Path) -> PathBuf {
    let base = if data_dir.ends_with("profiles") {
        data_dir.parent().unwrap_or(data_dir)
    } else {
        data_dir
    };
    base.join("engine_paths.json")
}

/// Carrega os dados registrados do disco
pub fn load_registry(data_dir: &Path) -> EngineRegistryData {
    let path = get_registry_path(data_dir);
    if !path.exists() {
        return EngineRegistryData::default();
    }

    match fs::read_to_string(&path) {
        Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
        Err(e) => {
            warn!("⚠️ Falha ao ler {:?}: {e}", path);
            EngineRegistryData::default()
        }
    }
}

/// Salva os dados de registro no disco
pub fn save_registry(data_dir: &Path, data: &EngineRegistryData) -> Result<(), String> {
    let path = get_registry_path(data_dir);
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }

    let json = serde_json::to_string_pretty(data)
        .map_err(|e| format!("Falha ao serializar registro de motores: {e}"))?;

    fs::write(&path, json)
        .map_err(|e| format!("Falha ao gravar {:?}: {e}", path))?;

    Ok(())
}

/// Retorna apelidos/sinônimos conhecidos para o mesmo motor de navegação
fn get_engine_key_candidates(engine_key: &str) -> Vec<&'static str> {
    if engine_key.eq_ignore_ascii_case("clearcote") || engine_key.eq_ignore_ascii_case("astrobrowser") {
        vec!["clearcote", "astrobrowser"]
    } else if engine_key.eq_ignore_ascii_case("camoufox") || engine_key.eq_ignore_ascii_case("astrofox") {
        vec!["camoufox", "astrofox"]
    } else {
        vec![]
    }
}

/// Obtém informações do motor registrado, validando se o executável ainda existe fisicamente no disco.
/// Se o arquivo não existir mais, limpa o registro obsoleto (self-healing com tolerância a locks transitórios).
pub fn get_registered_engine(data_dir: &Path, engine_key: &str) -> Option<RegisteredEngineInfo> {
    let mut data = load_registry(data_dir);

    // Constrói lista de chaves candidatas (chave original + sinônimos como clearcote/astrobrowser)
    let mut candidate_keys = vec![engine_key];
    for alias in get_engine_key_candidates(engine_key) {
        if !candidate_keys.contains(&alias) {
            candidate_keys.push(alias);
        }
    }

    for key in candidate_keys {
        if let Some(info) = data.engines.get(key).cloned() {
            if info.executable_path.exists() && info.executable_path.is_file() {
                return Some(info);
            } else {
                // Tolerância a locks no Windows: se o diretório pai ainda existe, tenta localizar alternativas
                if let Some(parent) = info.executable_path.parent() {
                    if parent.exists() && parent.is_dir() {
                        for cand in &["chrome.exe", "clearcote.exe", "star-engine.exe", "camoufox.exe", "chrome", "star-engine"] {
                            let alt = parent.join(cand);
                            if alt.exists() && alt.is_file() {
                                let mut updated = info.clone();
                                updated.executable_path = alt;
                                data.engines.insert(key.to_string(), updated.clone());
                                let _ = save_registry(data_dir, &data);
                                return Some(updated);
                            }
                        }
                    }
                }

                info!(
                    "🧹 Limpando registro obsoleto do motor '{}': {:?} não existe mais no disco.",
                    key, info.executable_path
                );
                data.engines.remove(key);
                let _ = save_registry(data_dir, &data);
            }
        }
    }
    None
}

/// Registra ou atualiza o caminho do motor de navegação no engine_paths.json
pub fn register_engine(
    data_dir: &Path,
    engine_key: &str,
    version: &str,
    target_dir: &Path,
    exe_path: &Path,
) -> Result<(), String> {
    let mut data = load_registry(data_dir);
    let now = chrono::Utc::now().to_rfc3339();

    let entry = RegisteredEngineInfo {
        engine: engine_key.to_string(),
        version: version.to_string(),
        target_dir: target_dir.to_path_buf(),
        executable_path: exe_path.to_path_buf(),
        last_verified: now,
    };

    data.engines.insert(engine_key.to_string(), entry.clone());

    // Também registra sob chaves sinônimas para compatibilidade total (ex: clearcote <-> astrobrowser)
    for alias in get_engine_key_candidates(engine_key) {
        if alias != engine_key {
            let mut alias_entry = entry.clone();
            alias_entry.engine = alias.to_string();
            data.engines.insert(alias.to_string(), alias_entry);
        }
    }

    save_registry(data_dir, &data)?;
    info!(
        "💾 [Path Registry] Motor '{}' registrado com sucesso em {:?}",
        engine_key, exe_path
    );
    Ok(())
}

/// Invalida/remove um motor do registro
pub fn invalidate_engine(data_dir: &Path, engine_key: &str) {
    let mut data = load_registry(data_dir);
    let mut changed = false;
    if data.engines.remove(engine_key).is_some() {
        changed = true;
    }
    for alias in get_engine_key_candidates(engine_key) {
        if data.engines.remove(alias).is_some() {
            changed = true;
        }
    }
    if changed {
        let _ = save_registry(data_dir, &data);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_engine_registry_lifecycle_and_self_healing() {
        let temp_dir = std::env::temp_dir().join(format!("test_star_reg_{}", uuid::Uuid::new_v4()));
        let _ = fs::create_dir_all(&temp_dir);
        let data_dir = &temp_dir;

        // 1. Cria executável fictício
        let target_dir = data_dir.join("binaries").join("astrobrowser");
        fs::create_dir_all(&target_dir).unwrap();
        let exe_path = target_dir.join("chrome.exe");
        fs::write(&exe_path, "fake chrome binary").unwrap();

        // 2. Registra
        let res = register_engine(data_dir, "clearcote", "150.0.7871.114", &target_dir, &exe_path);
        assert!(res.is_ok(), "Deve registrar com sucesso");

        // 3. Lê e valida
        let reg = get_registered_engine(data_dir, "clearcote");
        assert!(reg.is_some(), "Deve retornar motor registrado");
        let reg_info = reg.unwrap();
        assert_eq!(reg_info.engine, "clearcote");
        assert_eq!(reg_info.executable_path, exe_path);

        // 4. Testa auto-cura (self-healing): deleta o executável
        fs::remove_file(&exe_path).unwrap();
        let reg_after_delete = get_registered_engine(data_dir, "clearcote");
        assert!(reg_after_delete.is_none(), "Não deve retornar motor cujo arquivo foi removido");

        // O arquivo JSON deve ter sido atualizado sem a chave obsoleta
        let disk_data = load_registry(data_dir);
        assert!(!disk_data.engines.contains_key("clearcote"), "Chave obsoleta deve ser expurgada do JSON");

        let _ = fs::remove_dir_all(&temp_dir);
    }
}

