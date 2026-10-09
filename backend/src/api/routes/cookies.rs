use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use std::collections::HashMap;
use std::sync::Arc;

use crate::extraction_session::{
    fire_fox::{
        extract_cookies, extract_local_storage, extract_unified_session, parse_cookies_input,
    },
    CookieStats, DomainSummary, UnifiedSession,
};
use crate::launcher::engine::injection::{
    clear_profile_cookies as clear_cookies_engine,
    clear_profile_storage as clear_storage_engine,
};
use crate::service_database::{ProfileStorage, SessionService};

#[derive(Debug, Deserialize)]
pub struct ImportCookiesDto {
    pub cookies_raw: String,
}

/// Lê todos os cookies e estatísticas de domínios do perfil (Módulo 1)
/// Prioriza o disco ativo (se navegador aberto) ou o Star Vault criptografado (se navegador fechado / Zero-Trace)
pub async fn get_profile_cookies(
    State(storage): State<Arc<ProfileStorage>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let profile_dir = storage.get_profile_dir(&id);
    let cookie_db = profile_dir.join("cookies.sqlite");
    let chromium_cookie_db = profile_dir.join("Default").join("Cookies");
    let chromium_net_cookie_db = profile_dir.join("Default").join("Network").join("Cookies");

    if cookie_db.exists() {
        match extract_cookies(&profile_dir) {
            Ok(stats) => return Ok(Json(stats)),
            Err(err) => return Err((StatusCode::INTERNAL_SERVER_ERROR, err)),
        }
    } else if chromium_cookie_db.exists() || chromium_net_cookie_db.exists() {
        let engine = crate::browser::engines::get_engine("AstroBrowser");
        if let Ok(session) = engine.extract_session(&profile_dir) {
            let mut domain_counts: HashMap<String, usize> = HashMap::new();
            for cookie in &session.cookies {
                *domain_counts.entry(cookie.domain.clone()).or_insert(0) += 1;
            }

            let mut domains: Vec<DomainSummary> = domain_counts
                .into_iter()
                .map(|(domain, count)| DomainSummary { domain, count })
                .collect();
            domains.sort_by(|a, b| b.count.cmp(&a.count).then_with(|| a.domain.cmp(&b.domain)));

            return Ok(Json(CookieStats {
                total_count: session.cookies.len(),
                domains,
                cookies: session.cookies,
            }));
        }
    }

    // Se o disco estiver limpo (Zero-Trace), busca no Vault criptografado
    let session_svc = SessionService::new(storage.vault().clone());
    if let Ok(Some(session)) = session_svc.load_session(&id) {
        let mut domain_counts: HashMap<String, usize> = HashMap::new();
        for cookie in &session.cookies {
            *domain_counts.entry(cookie.domain.clone()).or_insert(0) += 1;
        }

        let mut domains: Vec<DomainSummary> = domain_counts
            .into_iter()
            .map(|(domain, count)| DomainSummary { domain, count })
            .collect();
        domains.sort_by(|a, b| b.count.cmp(&a.count).then_with(|| a.domain.cmp(&b.domain)));

        return Ok(Json(CookieStats {
            total_count: session.cookies.len(),
            domains,
            cookies: session.cookies,
        }));
    }

    Ok(Json(CookieStats {
        total_count: 0,
        domains: vec![],
        cookies: vec![],
    }))
}

/// Lê todo o LocalStorage / Tokens extraídos do perfil (Módulo 2)
pub async fn get_profile_storage(
    State(storage): State<Arc<ProfileStorage>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let profile_dir = storage.get_profile_dir(&id);
    let storage_dir = profile_dir.join("storage").join("default");

    if storage_dir.exists() {
        match extract_local_storage(&profile_dir) {
            Ok(storage_map) => return Ok(Json(storage_map)),
            Err(err) => return Err((StatusCode::INTERNAL_SERVER_ERROR, err)),
        }
    }

    let session_svc = SessionService::new(storage.vault().clone());
    if let Ok(Some(session)) = session_svc.load_session(&id) {
        return Ok(Json(session.local_storage));
    }

    Ok(Json(HashMap::new()))
}

/// Lê a sessão unificada completa do perfil (Cookies + LocalStorage)
pub async fn get_profile_session(
    State(storage): State<Arc<ProfileStorage>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let profile_dir = storage.get_profile_dir(&id);
    let cookie_db = profile_dir.join("cookies.sqlite");
    let chromium_cookie_db = profile_dir.join("Default").join("Cookies");
    let chromium_net_cookie_db = profile_dir.join("Default").join("Network").join("Cookies");

    if cookie_db.exists() {
        match extract_unified_session(&profile_dir) {
            Ok(session) => return Ok(Json(session)),
            Err(err) => return Err((StatusCode::INTERNAL_SERVER_ERROR, err)),
        }
    } else if chromium_cookie_db.exists() || chromium_net_cookie_db.exists() {
        let engine = crate::browser::engines::get_engine("AstroBrowser");
        if let Ok(session) = engine.extract_session(&profile_dir) {
            return Ok(Json(session));
        }
    }

    let session_svc = SessionService::new(storage.vault().clone());
    if let Ok(Some(session)) = session_svc.load_session(&id) {
        return Ok(Json(session));
    }

    Ok(Json(UnifiedSession::default()))
}

/// Importa cookies em formato JSON ou Netscape, injeta no disco e persiste no Vault criptografado
pub async fn import_profile_cookies(
    State(storage): State<Arc<ProfileStorage>>,
    Path(id): Path<String>,
    Json(payload): Json<ImportCookiesDto>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let parsed_cookies = match parse_cookies_input(&payload.cookies_raw) {
        Ok(c) => c,
        Err(err) => return Err((StatusCode::BAD_REQUEST, err)),
    };

    let profile = storage
        .get(&id)
        .ok_or_else(|| (StatusCode::NOT_FOUND, "Perfil não encontrado".to_string()))?;

    let profile_dir = storage.get_profile_dir(&id);
    let session_svc = SessionService::new(storage.vault().clone());

    // 1. Injeta nos arquivos do motor correspondente (Camoufox ou Clearcote)
    let _ = std::fs::create_dir_all(&profile_dir);
    let engine = crate::browser::engines::get_engine(&profile.kernel);
    let import_res = engine
        .inject_session(&profile_dir, &parsed_cookies)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;

    // 2. Persiste de forma atômica e criptografada no Star Vault
    let mut current_session = session_svc
        .load_session(&id)
        .unwrap_or(None)
        .unwrap_or_default();

    // Mescla cookies
    current_session.cookies.retain(|existing| {
        !parsed_cookies.iter().any(|new_c| new_c.name == existing.name && new_c.domain == existing.domain && new_c.path == existing.path)
    });
    current_session.cookies.extend(parsed_cookies);
    current_session.total_cookies = current_session.cookies.len();

    let _ = session_svc.save_session(&id, &current_session);

    Ok(Json(import_res))
}

/// Limpa todos os cookies do perfil (no disco e no Vault)
pub async fn clear_profile_cookies(
    State(storage): State<Arc<ProfileStorage>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let profile_dir = storage.get_profile_dir(&id);
    let profile = storage.get(&id);
    let kernel = profile.map(|p| p.kernel).unwrap_or_else(|| "AstroFox".to_string());

    let deleted = if kernel == "AstroBrowser" {
        let _ = std::fs::remove_file(profile_dir.join("Default").join("Cookies"));
        let _ = std::fs::remove_file(profile_dir.join("Default").join("Network").join("Cookies"));
        0
    } else {
        clear_cookies_engine(&profile_dir).unwrap_or(0)
    };

    let session_svc = SessionService::new(storage.vault().clone());
    if let Ok(Some(mut session)) = session_svc.load_session(&id) {
        session.cookies.clear();
        session.total_cookies = 0;
        let _ = session_svc.save_session(&id, &session);
    }

    Ok(Json(serde_json::json!({
        "status": "cleared",
        "deleted_count": deleted
    })))
}

/// Limpa todo o LocalStorage do perfil (no disco e no Vault)
pub async fn clear_profile_storage(
    State(storage): State<Arc<ProfileStorage>>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let profile_dir = storage.get_profile_dir(&id);
    let _ = clear_storage_engine(&profile_dir);

    let session_svc = SessionService::new(storage.vault().clone());
    if let Ok(Some(mut session)) = session_svc.load_session(&id) {
        session.local_storage.clear();
        session.total_storage_items = 0;
        let _ = session_svc.save_session(&id, &session);
    }

    Ok(Json(serde_json::json!({
        "status": "cleared",
        "type": "storage"
    })))
}
