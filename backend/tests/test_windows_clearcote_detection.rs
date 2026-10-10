///! Bateria massiva de testes para o pipeline de detecção do Clearcote/AstroBrowser no Windows.
///!
///! Objetivo: Reproduzir e diagnosticar o bug em que o frontend mostra "Clearcote não instalado"
///! mesmo com os arquivos corretamente extraídos no disco.
///!
///! Os testes simulam a estrutura de diretórios como ela existiria no Windows, usando
///! diretórios temporários com o layout canônico:
///!   data_dir/binaries/astrobrowser/chrome.exe
///!   data_dir/binaries/astrobrowser/icudtl.dat
///!   data_dir/binaries/astrobrowser/resources.pak
///!   data_dir/engine_paths.json

use std::fs;
use std::path::{Path, PathBuf};

use star_multlogin_backend::browser_downloader::{
    detector::{
        check_engine_health_for, find_clearcote_executable, verify_installed_engine,
        EngineHealthStatus,
    },
    path_registry::{
        get_registered_engine, invalidate_engine, load_registry, register_engine,
    },
    EngineKind,
};

// =============================================================================
// Helpers de teste
// =============================================================================

/// Cria um diretório temporário isolado e único para cada teste
fn create_test_data_dir(test_name: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!(
        "star_win_clearcote_{}_{}_{}",
        test_name,
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos()
    ));
    let _ = fs::create_dir_all(&dir);
    dir
}

/// Monta a estrutura FLAT canônica do AstroBrowser:
///   binaries/astrobrowser/chrome.exe (ou chrome no Linux)
///   binaries/astrobrowser/icudtl.dat
///   binaries/astrobrowser/resources.pak
///   binaries/astrobrowser/v8_context_snapshot.bin
///   binaries/astrobrowser/installed.json
fn setup_flat_astrobrowser(data_dir: &Path) -> (PathBuf, PathBuf) {
    let ab_dir = data_dir.join("binaries").join("astrobrowser");
    fs::create_dir_all(&ab_dir).unwrap();

    let exe_name = if cfg!(target_os = "windows") {
        "chrome.exe"
    } else {
        "chrome"
    };
    let exe_path = ab_dir.join(exe_name);

    // Cria um executável fake de tamanho realista (>5 MB check)
    let fake_binary = vec![0u8; 6_000_000];
    fs::write(&exe_path, &fake_binary).unwrap();

    // Cria arquivos vitais
    fs::write(ab_dir.join("icudtl.dat"), "fake icu data").unwrap();
    fs::write(ab_dir.join("resources.pak"), "fake resources").unwrap();
    fs::write(ab_dir.join("v8_context_snapshot.bin"), "fake v8").unwrap();

    // Cria installed.json na raiz
    let installed = serde_json::json!({
        "engine_name": "clearcote",
        "version": "150.0.7871.114",
        "release_tag": "v0.1.0-pre.23",
        "platform": "windows-x64",
        "installed_at": "2026-10-10T00:00:00Z",
        "executable": exe_name,
    });
    fs::write(
        ab_dir.join("installed.json"),
        serde_json::to_string_pretty(&installed).unwrap(),
    )
    .unwrap();

    #[cfg(target_os = "linux")]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = fs::set_permissions(&exe_path, fs::Permissions::from_mode(0o755));
    }

    (ab_dir, exe_path)
}

/// Monta a estrutura NESTED (wrapper dir não achatado):
///   binaries/astrobrowser/chrome-win64/chrome.exe
///   binaries/astrobrowser/chrome-win64/icudtl.dat
///   binaries/astrobrowser/installed.json  (na raiz, fora do wrapper)
fn setup_nested_astrobrowser(data_dir: &Path) -> (PathBuf, PathBuf) {
    let ab_dir = data_dir.join("binaries").join("astrobrowser");
    let wrapper = ab_dir.join("chrome-win64");
    fs::create_dir_all(&wrapper).unwrap();

    let exe_name = if cfg!(target_os = "windows") {
        "chrome.exe"
    } else {
        "chrome"
    };
    let exe_path = wrapper.join(exe_name);
    let fake_binary = vec![0u8; 6_000_000];
    fs::write(&exe_path, &fake_binary).unwrap();

    // Vital files dentro do wrapper (como faz o ZIP original)
    fs::write(wrapper.join("icudtl.dat"), "fake icu").unwrap();
    fs::write(wrapper.join("resources.pak"), "fake resources").unwrap();

    // installed.json NA RAIZ (escrito pelo distributor, não pelo ZIP)
    let installed = serde_json::json!({
        "engine_name": "clearcote",
        "version": "150.0.7871.114",
    });
    fs::write(
        ab_dir.join("installed.json"),
        serde_json::to_string_pretty(&installed).unwrap(),
    )
    .unwrap();

    #[cfg(target_os = "linux")]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = fs::set_permissions(&exe_path, fs::Permissions::from_mode(0o755));
    }

    (ab_dir, exe_path)
}

/// Monta estrutura onde flatten PARCIAL ocorreu:
///   binaries/astrobrowser/chrome.exe     (movido com sucesso)
///   binaries/astrobrowser/chrome-win64/  (wrapper residual)
///   binaries/astrobrowser/chrome-win64/icudtl.dat  (NÃO movido — falha silenciosa)
///   binaries/astrobrowser/resources.pak  (movido com sucesso)
///   binaries/astrobrowser/installed.json
fn setup_partial_flatten_astrobrowser(data_dir: &Path) -> (PathBuf, PathBuf) {
    let ab_dir = data_dir.join("binaries").join("astrobrowser");
    let wrapper = ab_dir.join("chrome-win64");
    fs::create_dir_all(&wrapper).unwrap();

    let exe_name = if cfg!(target_os = "windows") {
        "chrome.exe"
    } else {
        "chrome"
    };
    let exe_path = ab_dir.join(exe_name);
    let fake_binary = vec![0u8; 6_000_000];
    fs::write(&exe_path, &fake_binary).unwrap();

    // resources.pak movido para raiz com sucesso
    fs::write(ab_dir.join("resources.pak"), "fake resources").unwrap();

    // icudtl.dat ficou preso no wrapper (flatten falhou para este arquivo)
    fs::write(wrapper.join("icudtl.dat"), "fake icu").unwrap();

    // installed.json na raiz
    let installed = serde_json::json!({ "version": "150.0.7871.114" });
    fs::write(
        ab_dir.join("installed.json"),
        serde_json::to_string_pretty(&installed).unwrap(),
    )
    .unwrap();

    #[cfg(target_os = "linux")]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = fs::set_permissions(&exe_path, fs::Permissions::from_mode(0o755));
    }

    (ab_dir, exe_path)
}

/// Monta estrutura onde APENAS o staging existe (promoção atômica falhou):
///   binaries/.astrobrowser-staging/chrome.exe
///   binaries/.astrobrowser-staging/icudtl.dat
///   binaries/astrobrowser/  (velho, NÃO removido)
fn setup_stuck_staging(data_dir: &Path) -> PathBuf {
    let binaries = data_dir.join("binaries");
    let staging = binaries.join(".astrobrowser-staging");
    let old_target = binaries.join("astrobrowser");

    fs::create_dir_all(&staging).unwrap();
    fs::create_dir_all(&old_target).unwrap();

    let exe_name = if cfg!(target_os = "windows") {
        "chrome.exe"
    } else {
        "chrome"
    };

    // Staging tem tudo, mas nunca foi promovido
    let fake_binary = vec![0u8; 6_000_000];
    fs::write(staging.join(exe_name), &fake_binary).unwrap();
    fs::write(staging.join("icudtl.dat"), "new icu").unwrap();
    fs::write(staging.join("resources.pak"), "new pak").unwrap();

    // old_target está vazio ou com versão corrompida
    fs::write(old_target.join("corrupted.txt"), "old broken").unwrap();

    staging
}

fn cleanup(dir: &Path) {
    let _ = fs::remove_dir_all(dir);
}

// =============================================================================
// TESTES: Path Registry
// =============================================================================

#[test]
fn t01_registry_register_and_retrieve() {
    let data_dir = create_test_data_dir("t01");
    let (target_dir, exe_path) = setup_flat_astrobrowser(&data_dir);

    let res = register_engine(&data_dir, "clearcote", "150.0.7871.114", &target_dir, &exe_path);
    assert!(res.is_ok(), "Registro deve ter sucesso: {:?}", res);

    let reg = get_registered_engine(&data_dir, "clearcote");
    assert!(reg.is_some(), "Motor registrado deve ser encontrado");

    let info = reg.unwrap();
    assert_eq!(info.engine, "clearcote");
    assert_eq!(info.version, "150.0.7871.114");
    assert_eq!(info.executable_path, exe_path);
    assert_eq!(info.target_dir, target_dir);

    cleanup(&data_dir);
}

#[test]
fn t02_registry_self_healing_removes_when_exe_deleted() {
    let data_dir = create_test_data_dir("t02");
    let (target_dir, exe_path) = setup_flat_astrobrowser(&data_dir);

    register_engine(&data_dir, "clearcote", "150.0.7871.114", &target_dir, &exe_path).unwrap();

    // Simula exclusão do exe (como Windows Defender ou remoção manual)
    fs::remove_file(&exe_path).unwrap();

    let reg = get_registered_engine(&data_dir, "clearcote");
    assert!(
        reg.is_none(),
        "Self-healing deve remover entrada quando exe não existe mais"
    );

    // Verifica que o JSON foi persistido sem a entrada
    let disk_data = load_registry(&data_dir);
    assert!(
        !disk_data.engines.contains_key("clearcote"),
        "engine_paths.json deve estar limpo"
    );

    cleanup(&data_dir);
}

#[test]
fn t03_registry_survives_when_exe_exists() {
    let data_dir = create_test_data_dir("t03");
    let (target_dir, exe_path) = setup_flat_astrobrowser(&data_dir);

    register_engine(&data_dir, "clearcote", "150.0.7871.114", &target_dir, &exe_path).unwrap();

    // Múltiplas consultas — o registro deve sobreviver
    for _ in 0..10 {
        let reg = get_registered_engine(&data_dir, "clearcote");
        assert!(
            reg.is_some(),
            "Registro deve persistir enquanto exe existir"
        );
    }

    cleanup(&data_dir);
}

#[test]
fn t04_registry_invalidate_removes_entry() {
    let data_dir = create_test_data_dir("t04");
    let (target_dir, exe_path) = setup_flat_astrobrowser(&data_dir);

    register_engine(&data_dir, "clearcote", "150.0.7871.114", &target_dir, &exe_path).unwrap();
    invalidate_engine(&data_dir, "clearcote");

    let reg = get_registered_engine(&data_dir, "clearcote");
    assert!(reg.is_none(), "Motor invalidado não deve ser retornado");

    cleanup(&data_dir);
}

#[test]
fn t05_registry_path_normalization() {
    let data_dir = create_test_data_dir("t05");
    let (target_dir, exe_path) = setup_flat_astrobrowser(&data_dir);

    // Registra com path normal
    register_engine(&data_dir, "clearcote", "150.0.7871.114", &target_dir, &exe_path).unwrap();

    // Lê registry com data_dir terminando diferente
    let alt_data_dir = data_dir.clone();
    let reg = get_registered_engine(&alt_data_dir, "clearcote");
    assert!(reg.is_some(), "Deve funcionar com path normalizado");

    // Testa com data_dir/profiles (variante que o app pode passar)
    let profiles_dir = data_dir.join("profiles");
    fs::create_dir_all(&profiles_dir).unwrap();
    let reg2 = get_registered_engine(&profiles_dir, "clearcote");
    assert!(
        reg2.is_some(),
        "path_registry com data_dir terminando em 'profiles' deve resolver para parent"
    );

    cleanup(&data_dir);
}

#[test]
fn t06_registry_dual_engine_isolation() {
    let data_dir = create_test_data_dir("t06");
    let (target_cc, exe_cc) = setup_flat_astrobrowser(&data_dir);

    // Cria motor camoufox fake
    let fox_dir = data_dir.join("binaries").join("astrofox");
    fs::create_dir_all(&fox_dir).unwrap();
    let fox_exe = fox_dir.join(if cfg!(target_os = "windows") {
        "star-engine.exe"
    } else {
        "star-engine"
    });
    fs::write(&fox_exe, vec![0u8; 1_000_000]).unwrap();
    #[cfg(target_os = "linux")]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = fs::set_permissions(&fox_exe, fs::Permissions::from_mode(0o755));
    }

    register_engine(&data_dir, "clearcote", "150.0.7871.114", &target_cc, &exe_cc).unwrap();
    register_engine(&data_dir, "camoufox", "152.0.4", &fox_dir, &fox_exe).unwrap();

    let reg_cc = get_registered_engine(&data_dir, "clearcote");
    let reg_fox = get_registered_engine(&data_dir, "camoufox");

    assert!(reg_cc.is_some(), "clearcote deve estar registrado");
    assert!(reg_fox.is_some(), "camoufox deve estar registrado");
    assert_ne!(
        reg_cc.unwrap().executable_path,
        reg_fox.unwrap().executable_path,
        "Motores devem ter caminhos distintos"
    );

    cleanup(&data_dir);
}

// =============================================================================
// TESTES: find_clearcote_executable
// =============================================================================

#[test]
fn t07_find_exe_flat_structure() {
    let data_dir = create_test_data_dir("t07");
    let (ab_dir, expected_exe) = setup_flat_astrobrowser(&data_dir);

    let found = find_clearcote_executable(&ab_dir);
    assert!(found.is_some(), "Deve encontrar exe na estrutura flat");
    assert_eq!(found.unwrap(), expected_exe);

    cleanup(&data_dir);
}

#[test]
fn t08_find_exe_nested_structure() {
    let data_dir = create_test_data_dir("t08");
    let (ab_dir, expected_exe) = setup_nested_astrobrowser(&data_dir);

    let found = find_clearcote_executable(&ab_dir);
    assert!(
        found.is_some(),
        "Deve encontrar exe dentro de subpasta wrapper"
    );
    assert_eq!(found.unwrap(), expected_exe);

    cleanup(&data_dir);
}

#[test]
fn t09_find_exe_empty_dir() {
    let data_dir = create_test_data_dir("t09");
    let ab_dir = data_dir.join("binaries").join("astrobrowser");
    fs::create_dir_all(&ab_dir).unwrap();

    let found = find_clearcote_executable(&ab_dir);
    assert!(
        found.is_none(),
        "Não deve encontrar exe em diretório vazio"
    );

    cleanup(&data_dir);
}

#[test]
fn t10_find_exe_partial_flatten() {
    let data_dir = create_test_data_dir("t10");
    let (ab_dir, expected_exe) = setup_partial_flatten_astrobrowser(&data_dir);

    let found = find_clearcote_executable(&ab_dir);
    assert!(
        found.is_some(),
        "Deve encontrar exe na raiz mesmo com flatten parcial"
    );
    assert_eq!(found.unwrap(), expected_exe);

    cleanup(&data_dir);
}

// =============================================================================
// TESTES: check_engine_health_for (pipeline completo)
// =============================================================================

#[test]
fn t11_health_flat_installed() {
    let data_dir = create_test_data_dir("t11");
    let (_ab_dir, _exe_path) = setup_flat_astrobrowser(&data_dir);

    let health = check_engine_health_for(&data_dir, EngineKind::Clearcote);
    match &health {
        EngineHealthStatus::Installed {
            executable_path,
            version,
            size_bytes,
        } => {
            println!("✅ Detectado: exe={:?}, version={}, size={}", executable_path, version, size_bytes);
            assert!(executable_path.exists(), "Exe deve existir");
            assert!(*size_bytes >= 5_000_000, "Tamanho deve ser >= 5MB");
        }
        EngineHealthStatus::Missing { reason } => {
            panic!(
                "❌ FALSO NEGATIVO (Missing): {}\n\
                Este é o bug do Windows! O motor está instalado mas reportou Missing.",
                reason
            );
        }
        EngineHealthStatus::Broken { reason } => {
            panic!(
                "❌ FALSO NEGATIVO (Broken): {}\n\
                O motor está completo mas reportou Broken.",
                reason
            );
        }
    }

    cleanup(&data_dir);
}

#[test]
fn t12_health_nested_wrapper_not_flattened() {
    let data_dir = create_test_data_dir("t12");
    let (_ab_dir, _exe_path) = setup_nested_astrobrowser(&data_dir);

    let health = check_engine_health_for(&data_dir, EngineKind::Clearcote);
    match &health {
        EngineHealthStatus::Installed { executable_path, .. } => {
            println!("✅ Detectado com wrapper não achatado: {:?}", executable_path);
        }
        EngineHealthStatus::Missing { reason } => {
            panic!(
                "❌ BUG: Wrapper não achatado causou Missing: {}\n\
                O motor está em subdirectory mas a detecção falhou.\n\
                Este é EXATAMENTE o bug do Windows se o flatten_wrapper_dir falhar!",
                reason
            );
        }
        EngineHealthStatus::Broken { reason } => {
            panic!(
                "❌ BUG: Wrapper não achatado causou Broken: {}\n\
                Provável causa: vital files checados no local errado.",
                reason
            );
        }
    }

    cleanup(&data_dir);
}

#[test]
fn t13_health_partial_flatten() {
    let data_dir = create_test_data_dir("t13");
    let (_ab_dir, _exe_path) = setup_partial_flatten_astrobrowser(&data_dir);

    let health = check_engine_health_for(&data_dir, EngineKind::Clearcote);
    match &health {
        EngineHealthStatus::Installed { .. } => {
            println!("✅ Detectado mesmo com flatten parcial (icudtl.dat no wrapper residual)");
        }
        EngineHealthStatus::Missing { reason } => {
            panic!(
                "❌ Flatten parcial causou Missing: {}\n\
                Bug: icudtl.dat ficou no wrapper enquanto exe está na raiz.",
                reason
            );
        }
        EngineHealthStatus::Broken { reason } => {
            // ESTE é o resultado esperado se o BUG 5 estiver ativo:
            // vital files são checados em exe_dir (raiz) mas icudtl.dat está no wrapper
            println!(
                "⚠️ Broken com flatten parcial (esperado com BUG 5 ativo): {}",
                reason
            );
        }
    }

    cleanup(&data_dir);
}

#[test]
fn t14_health_missing_dir() {
    let data_dir = create_test_data_dir("t14");
    // Não cria nenhuma estrutura — data_dir está vazio

    let health = check_engine_health_for(&data_dir, EngineKind::Clearcote);
    match &health {
        EngineHealthStatus::Missing { reason } => {
            println!("✅ Correto: Missing quando dir não existe: {}", reason);
        }
        other => {
            panic!("Deveria ser Missing, mas retornou: {:?}", other);
        }
    }

    cleanup(&data_dir);
}

#[test]
fn t15_health_exe_too_small() {
    let data_dir = create_test_data_dir("t15");
    let ab_dir = data_dir.join("binaries").join("astrobrowser");
    fs::create_dir_all(&ab_dir).unwrap();

    let exe_name = if cfg!(target_os = "windows") {
        "chrome.exe"
    } else {
        "chrome"
    };
    // Executável truncado/corrompido (< 5MB)
    fs::write(ab_dir.join(exe_name), vec![0u8; 1000]).unwrap();
    fs::write(ab_dir.join("icudtl.dat"), "icu").unwrap();
    fs::write(ab_dir.join("resources.pak"), "pak").unwrap();

    #[cfg(target_os = "linux")]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = fs::set_permissions(
            &ab_dir.join(exe_name),
            fs::Permissions::from_mode(0o755),
        );
    }

    let health = check_engine_health_for(&data_dir, EngineKind::Clearcote);
    match &health {
        EngineHealthStatus::Broken { reason } => {
            println!("✅ Correto: Broken para exe truncado: {}", reason);
            assert!(
                reason.contains("incompleto") || reason.contains("bytes") || reason.contains("truncado"),
                "Mensagem deve indicar tamanho insuficiente"
            );
        }
        other => {
            panic!(
                "Deveria ser Broken para exe < 5MB, mas retornou: {:?}",
                other
            );
        }
    }

    cleanup(&data_dir);
}

#[test]
fn t16_health_no_vital_files() {
    let data_dir = create_test_data_dir("t16");
    let ab_dir = data_dir.join("binaries").join("astrobrowser");
    fs::create_dir_all(&ab_dir).unwrap();

    let exe_name = if cfg!(target_os = "windows") {
        "chrome.exe"
    } else {
        "chrome"
    };
    // Exe grande mas SEM vital files
    fs::write(ab_dir.join(exe_name), vec![0u8; 6_000_000]).unwrap();

    #[cfg(target_os = "linux")]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = fs::set_permissions(
            &ab_dir.join(exe_name),
            fs::Permissions::from_mode(0o755),
        );
    }

    let health = check_engine_health_for(&data_dir, EngineKind::Clearcote);
    match &health {
        EngineHealthStatus::Broken { reason } => {
            println!("✅ Correto: Broken sem vital files: {}", reason);
        }
        EngineHealthStatus::Missing { reason } => {
            // No Linux a detecção é diferente, pode reportar Missing
            println!("ℹ️ Missing sem vital files (aceitável): {}", reason);
        }
        EngineHealthStatus::Installed { .. } => {
            panic!("❌ NÃO deveria ser Installed sem vital files!");
        }
    }

    cleanup(&data_dir);
}

#[test]
fn t17_health_stuck_in_staging() {
    let data_dir = create_test_data_dir("t17");
    let _staging = setup_stuck_staging(&data_dir);

    // O check_health NÃO olha staging — só olha target_dir
    let health = check_engine_health_for(&data_dir, EngineKind::Clearcote);
    match &health {
        EngineHealthStatus::Missing { .. } | EngineHealthStatus::Broken { .. } => {
            println!(
                "⚠️ Staging preso causou {:?} — este é o BUG 4. \
                O download completou mas os arquivos ficaram em .astrobrowser-staging.",
                health
            );
        }
        EngineHealthStatus::Installed { .. } => {
            // Se chegar aqui, o velho target_dir tem resíduos que parecem válidos
            println!(
                "ℹ️ Installed com staging preso (target_dir antigo tem resíduos que passaram)"
            );
        }
    }

    cleanup(&data_dir);
}

// =============================================================================
// TESTES: verify_installed_engine (auditoria profunda)
// =============================================================================

#[test]
fn t18_verify_flat_reports_valid() {
    let data_dir = create_test_data_dir("t18");
    let (_ab_dir, _exe_path) = setup_flat_astrobrowser(&data_dir);

    let report = verify_installed_engine(&data_dir, EngineKind::Clearcote);
    println!("📋 Relatório de verificação:\n{:#?}", report);

    // NOTA: is_valid = is_runnable && size > 100_000. is_runnable depende de executar
    // `chrome --version` que falha em binários fake (Exec format error).
    // Portanto, verificamos que pelo menos o executável foi ENCONTRADO e o tamanho é correto.
    assert!(
        report.executable_path.is_some(),
        "executable_path não pode ser None"
    );
    assert!(report.size_bytes > 0, "size_bytes deve ser positivo");
    assert!(report.size_mb > 0.0, "size_mb deve ser positivo");
    // Em ambiente de teste com binário fake, o status será 'broken' (can't execute).
    // O importante é que NÃO seja 'missing' — o executável foi encontrado.
    assert_ne!(
        report.status, "missing",
        "Não deve ser 'missing' quando o exe existe no disco"
    );

    cleanup(&data_dir);
}

#[test]
fn t19_verify_nested_reports_valid() {
    let data_dir = create_test_data_dir("t19");
    let (_ab_dir, _exe_path) = setup_nested_astrobrowser(&data_dir);

    let report = verify_installed_engine(&data_dir, EngineKind::Clearcote);
    println!("📋 Relatório de verificação (nested):\n{:#?}", report);

    assert_ne!(
        report.status, "missing",
        "Não deve ser 'missing' quando o exe nested existe no disco"
    );

    cleanup(&data_dir);
}

#[test]
fn t20_verify_missing_reports_invalid() {
    let data_dir = create_test_data_dir("t20");
    // Não cria nada

    let report = verify_installed_engine(&data_dir, EngineKind::Clearcote);
    println!("📋 Relatório de verificação (vazio):\n{:#?}", report);

    assert!(!report.is_valid, "Motor ausente deve ser is_valid=false");
    assert_eq!(report.status, "missing");

    cleanup(&data_dir);
}

// =============================================================================
// TESTES: Registry + Health integrados
// =============================================================================

#[test]
fn t21_registry_plus_health_after_manual_register() {
    let data_dir = create_test_data_dir("t21");
    let (target_dir, exe_path) = setup_flat_astrobrowser(&data_dir);

    // Registra manualmente (simula o que o download faz no final)
    register_engine(&data_dir, "clearcote", "150.0.7871.114", &target_dir, &exe_path).unwrap();

    // Agora o health check deve usar o registry
    let health = check_engine_health_for(&data_dir, EngineKind::Clearcote);
    match &health {
        EngineHealthStatus::Installed { executable_path, .. } => {
            println!("✅ Health via registry: {:?}", executable_path);
        }
        other => {
            panic!("Deveria ser Installed via registry, mas retornou: {:?}", other);
        }
    }

    cleanup(&data_dir);
}

#[test]
fn t22_health_after_registry_invalidation() {
    let data_dir = create_test_data_dir("t22");
    let (target_dir, exe_path) = setup_flat_astrobrowser(&data_dir);

    // Registra e depois invalida
    register_engine(&data_dir, "clearcote", "150.0.7871.114", &target_dir, &exe_path).unwrap();
    invalidate_engine(&data_dir, "clearcote");

    // Health deve ainda funcionar via fallback de scan de diretórios
    let health = check_engine_health_for(&data_dir, EngineKind::Clearcote);
    match &health {
        EngineHealthStatus::Installed { .. } => {
            println!("✅ Health via fallback scan (sem registry)");
        }
        other => {
            panic!(
                "❌ Sem registry, o fallback de scan deveria encontrar, mas retornou: {:?}",
                other
            );
        }
    }

    cleanup(&data_dir);
}

#[test]
fn t23_health_with_profiles_suffix_data_dir() {
    let data_dir = create_test_data_dir("t23");
    let (_ab_dir, _exe_path) = setup_flat_astrobrowser(&data_dir);

    // Simula data_dir terminando em "profiles" (como o ProfileStorage pode passar)
    let profiles_dir = data_dir.join("profiles");
    fs::create_dir_all(&profiles_dir).unwrap();

    let health = check_engine_health_for(&profiles_dir, EngineKind::Clearcote);
    match &health {
        EngineHealthStatus::Installed { .. } => {
            println!("✅ Health com data_dir terminando em 'profiles'");
        }
        other => {
            panic!(
                "❌ data_dir com suffix 'profiles' causou falso negativo: {:?}",
                other
            );
        }
    }

    cleanup(&data_dir);
}

#[test]
fn t24_health_with_alternative_exe_name() {
    let data_dir = create_test_data_dir("t24");
    let ab_dir = data_dir.join("binaries").join("astrobrowser");
    fs::create_dir_all(&ab_dir).unwrap();

    // No Linux, get_executable_path retorna target_dir.join("chrome") diretamente (sem scan).
    // No Windows, faz scan de EXECUTABLE_CANDIDATES que inclui clearcote.exe.
    // Este teste valida o comportamento correto de cada plataforma.
    let exe_name = if cfg!(target_os = "windows") {
        "clearcote.exe"
    } else {
        // No Linux o código é simples: paths::get_executable_path retorna target_dir.join("chrome")
        // Então no Linux testamos com o nome que funciona
        "chrome"
    };
    let exe_path = ab_dir.join(exe_name);
    fs::write(&exe_path, vec![0u8; 6_000_000]).unwrap();
    fs::write(ab_dir.join("icudtl.dat"), "icu").unwrap();
    fs::write(ab_dir.join("resources.pak"), "pak").unwrap();

    #[cfg(target_os = "linux")]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = fs::set_permissions(&exe_path, fs::Permissions::from_mode(0o755));
    }

    let health = check_engine_health_for(&data_dir, EngineKind::Clearcote);
    match &health {
        EngineHealthStatus::Installed { executable_path, .. } => {
            println!(
                "✅ Detectado com nome '{}': {:?}",
                exe_name, executable_path
            );
        }
        other => {
            panic!(
                "❌ Nome '{}' não foi reconhecido: {:?}",
                exe_name, other
            );
        }
    }

    cleanup(&data_dir);
}

#[test]
fn t25_health_with_dll_sibling_but_no_standard_vitals() {
    let data_dir = create_test_data_dir("t25");
    let ab_dir = data_dir.join("binaries").join("astrobrowser");
    fs::create_dir_all(&ab_dir).unwrap();

    let exe_name = if cfg!(target_os = "windows") {
        "chrome.exe"
    } else {
        "chrome"
    };
    fs::write(ab_dir.join(exe_name), vec![0u8; 6_000_000]).unwrap();

    // Sem icudtl.dat ou resources.pak, mas tem DLLs
    fs::write(ab_dir.join("libGLESv2.dll"), "fake dll").unwrap();
    fs::write(ab_dir.join("d3dcompiler_47.dll"), "fake dll").unwrap();

    #[cfg(target_os = "linux")]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = fs::set_permissions(
            &ab_dir.join(exe_name),
            fs::Permissions::from_mode(0o755),
        );
    }

    let health = check_engine_health_for(&data_dir, EngineKind::Clearcote);
    println!(
        "ℹ️ Health com DLLs mas sem icudtl/resources: {:?}",
        health
    );
    // No Windows, o verify_installation aceita DLLs como vital files substitutos.
    // No Linux, falha porque exige icudtl.dat E resources.pak.

    cleanup(&data_dir);
}

#[test]
fn t26_full_round_trip_register_check_verify() {
    let data_dir = create_test_data_dir("t26");
    let (target_dir, exe_path) = setup_flat_astrobrowser(&data_dir);

    // Passo 1: Registra
    register_engine(&data_dir, "clearcote", "150.0.7871.114", &target_dir, &exe_path).unwrap();

    // Passo 2: Health check
    let health = check_engine_health_for(&data_dir, EngineKind::Clearcote);
    assert!(
        matches!(health, EngineHealthStatus::Installed { .. }),
        "Health deve retornar Installed"
    );

    // Passo 3: Verify profundo
    let report = verify_installed_engine(&data_dir, EngineKind::Clearcote);
    // NOTA: is_valid = is_runnable && size > 100_000. Em teste com binário fake,
    // is_runnable=false (Exec format error), então is_valid=false.
    // O importante é que o status NÃO seja 'missing'.
    assert_ne!(
        report.status, "missing",
        "Verify não deve retornar 'missing' quando exe existe"
    );
    assert!(
        report.size_bytes >= 5_000_000,
        "size_bytes deve refletir o tamanho do exe"
    );

    // Passo 4: Registry continua válido
    let reg = get_registered_engine(&data_dir, "clearcote");
    assert!(reg.is_some(), "Registry deve persistir após health+verify");

    cleanup(&data_dir);
}

#[test]
fn t27_health_with_multiple_candidate_dirs() {
    let data_dir = create_test_data_dir("t27");
    let binaries = data_dir.join("binaries");

    // Cria MÚLTIPLOS diretórios candidatos — a detecção deve pegar o primeiro válido
    let dirs_to_create = ["astrobrowser", "clearcote", "chrome-win"];
    for dir in &dirs_to_create {
        let d = binaries.join(dir);
        fs::create_dir_all(&d).unwrap();
    }

    // Coloca exe válido apenas em "astrobrowser" (primeiro candidato)
    let exe_name = if cfg!(target_os = "windows") {
        "chrome.exe"
    } else {
        "chrome"
    };
    let exe_path = binaries.join("astrobrowser").join(exe_name);
    fs::write(&exe_path, vec![0u8; 6_000_000]).unwrap();
    fs::write(binaries.join("astrobrowser").join("icudtl.dat"), "icu").unwrap();
    fs::write(binaries.join("astrobrowser").join("resources.pak"), "pak").unwrap();

    #[cfg(target_os = "linux")]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = fs::set_permissions(&exe_path, fs::Permissions::from_mode(0o755));
    }

    let health = check_engine_health_for(&data_dir, EngineKind::Clearcote);
    assert!(
        matches!(health, EngineHealthStatus::Installed { .. }),
        "Deve encontrar exe no primeiro candidato válido"
    );

    cleanup(&data_dir);
}

#[test]
fn t28_health_exe_in_non_candidate_subdir() {
    let data_dir = create_test_data_dir("t28");
    let binaries = data_dir.join("binaries");
    let weird_dir = binaries.join("clearcote-150.0.7871.114-windows-x64");
    fs::create_dir_all(&weird_dir).unwrap();

    let exe_name = if cfg!(target_os = "windows") {
        "chrome.exe"
    } else {
        "chrome"
    };
    fs::write(weird_dir.join(exe_name), vec![0u8; 6_000_000]).unwrap();
    fs::write(weird_dir.join("icudtl.dat"), "icu").unwrap();
    fs::write(weird_dir.join("resources.pak"), "pak").unwrap();

    #[cfg(target_os = "linux")]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = fs::set_permissions(
            &weird_dir.join(exe_name),
            fs::Permissions::from_mode(0o755),
        );
    }

    let health = check_engine_health_for(&data_dir, EngineKind::Clearcote);
    println!(
        "ℹ️ Health com subdir não-candidato '{}': {:?}",
        weird_dir.file_name().unwrap().to_string_lossy(),
        health
    );

    // No Windows, get_target_dir scans subdirectories. No Linux, fallback para binaries/astrobrowser.
    // Este teste verifica se a varredura dinâmica funciona para nomes não previstos.

    cleanup(&data_dir);
}

#[test]
fn t29_engine_paths_json_written_correctly() {
    let data_dir = create_test_data_dir("t29");
    let (target_dir, exe_path) = setup_flat_astrobrowser(&data_dir);

    register_engine(&data_dir, "clearcote", "150.0.7871.114", &target_dir, &exe_path).unwrap();

    // Lê o JSON do disco e valida a estrutura
    let json_path = data_dir.join("engine_paths.json");
    assert!(json_path.exists(), "engine_paths.json deve existir no disco");

    let content = fs::read_to_string(&json_path).unwrap();
    let parsed: serde_json::Value = serde_json::from_str(&content).unwrap();

    assert!(
        parsed["engines"]["clearcote"].is_object(),
        "JSON deve ter engines.clearcote"
    );
    assert_eq!(
        parsed["engines"]["clearcote"]["version"].as_str().unwrap(),
        "150.0.7871.114"
    );
    assert!(
        parsed["engines"]["clearcote"]["executable_path"]
            .as_str()
            .is_some(),
        "Deve ter executable_path"
    );
    assert!(
        parsed["engines"]["clearcote"]["target_dir"]
            .as_str()
            .is_some(),
        "Deve ter target_dir"
    );
    assert!(
        parsed["engines"]["clearcote"]["last_verified"]
            .as_str()
            .is_some(),
        "Deve ter timestamp"
    );

    cleanup(&data_dir);
}

#[test]
fn t30_health_cycle_stress_test() {
    let data_dir = create_test_data_dir("t30");
    let (target_dir, exe_path) = setup_flat_astrobrowser(&data_dir);
    register_engine(&data_dir, "clearcote", "150.0.7871.114", &target_dir, &exe_path).unwrap();

    // Chama check_health 50 vezes em sequência — nunca deve retornar falso negativo
    for i in 0..50 {
        let health = check_engine_health_for(&data_dir, EngineKind::Clearcote);
        assert!(
            matches!(health, EngineHealthStatus::Installed { .. }),
            "Iteração {}: health retornou {:?} em vez de Installed",
            i,
            health
        );
    }

    // Verifica que o registry ainda está intacto após 50 leituras
    let reg = get_registered_engine(&data_dir, "clearcote");
    assert!(
        reg.is_some(),
        "Registry deve persistir após 50 ciclos de check"
    );

    cleanup(&data_dir);
}
