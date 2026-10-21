use std::sync::Arc;
use axum::{
    extract::{Query, State},
    response::Json,
    routing::get,
    Router,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::storage::ProfileStorage;
use super::envelope::AdsPowerEnvelope;

#[derive(Debug, Deserialize)]
pub struct BrowserControlQuery {
    pub user_id: Option<String>,
    pub serial_number: Option<String>,
    pub launch_args: Option<String>,
    pub open_tabs: Option<String>,
    pub headless: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct BrowserWsData {
    pub puppeteer: String,
    pub selenium: String,
}

#[derive(Debug, Serialize)]
pub struct BrowserStartData {
    pub ws: BrowserWsData,
    pub debug_port: String,
    pub webdriver: String,
}

#[derive(Debug, Serialize)]
pub struct BrowserActiveData {
    pub status: String,
}

fn resolve_target_id(storage: &ProfileStorage, query: &BrowserControlQuery) -> Option<String> {
    if let Some(ref uid) = query.user_id {
        let clean = uid.trim();
        if !clean.is_empty() {
            return Some(clean.to_string());
        }
    }

    if let Some(ref sn) = query.serial_number {
        if let Ok(idx) = sn.trim().parse::<usize>() {
            let all = storage.list(None, None);
            if idx > 0 && idx <= all.len() {
                return Some(all[idx - 1].id.clone());
            }
        }
    }

    None
}

/// GET /api/v1/browser/start
pub async fn browser_start(
    State(storage): State<Arc<ProfileStorage>>,
    Query(query): Query<BrowserControlQuery>,
) -> Json<AdsPowerEnvelope<Value>> {
    let target_id = match resolve_target_id(&storage, &query) {
        Some(id) => id,
        None => return Json(AdsPowerEnvelope::error(-1, "missing user_id or serial_number", serde_json::json!({}))),
    };

    match storage.launch_with_cdp(&target_id, true).await {
        Ok((profile, _pid, debug_port, ws_endpoint)) => {
            let port = debug_port.unwrap_or(9222);
            let ws_str = ws_endpoint.unwrap_or_else(|| {
                format!("ws://127.0.0.1:{}/devtools/browser/{}", port, profile.id)
            });

            Json(AdsPowerEnvelope::success(serde_json::json!({
                "ws": {
                    "puppeteer": ws_str,
                    "selenium": format!("127.0.0.1:{}", port),
                },
                "debug_port": format!("{}", port),
                "webdriver": "",
            })))
        }
        Err(e) => Json(AdsPowerEnvelope::error(-1, e, serde_json::json!({}))),
    }
}

/// GET /api/v1/browser/stop
pub async fn browser_stop(
    State(storage): State<Arc<ProfileStorage>>,
    Query(query): Query<BrowserControlQuery>,
) -> Json<AdsPowerEnvelope<Value>> {
    let target_id = match resolve_target_id(&storage, &query) {
        Some(id) => id,
        None => return Json(AdsPowerEnvelope::error(-1, "missing user_id or serial_number", serde_json::json!({}))),
    };

    let _ = storage.stop(&target_id);
    Json(AdsPowerEnvelope::success(serde_json::json!({})))
}

/// GET /api/v1/browser/active
pub async fn browser_active(
    State(storage): State<Arc<ProfileStorage>>,
    Query(query): Query<BrowserControlQuery>,
) -> Json<AdsPowerEnvelope<BrowserActiveData>> {
    let target_id = match resolve_target_id(&storage, &query) {
        Some(id) => id,
        None => {
            return Json(AdsPowerEnvelope::error(
                -1,
                "missing user_id or serial_number",
                BrowserActiveData {
                    status: "Inactive".to_string(),
                },
            ))
        }
    };

    let is_running = storage.get_process_manager().is_running(&target_id);
    let status = if is_running { "Active" } else { "Inactive" }.to_string();

    Json(AdsPowerEnvelope::success(BrowserActiveData { status }))
}

/// GET /api/v1/browser/cookies
pub async fn browser_cookies(
    State(storage): State<Arc<ProfileStorage>>,
    Query(query): Query<BrowserControlQuery>,
) -> Json<AdsPowerEnvelope<Value>> {
    let target_id = match resolve_target_id(&storage, &query) {
        Some(id) => id,
        None => return Json(AdsPowerEnvelope::error(-1, "missing user_id or serial_number", serde_json::json!({}))),
    };

    let session_svc = crate::service_database::sessions::SessionService::new(storage.vault().clone());
    let cookies_data = session_svc
        .load_session(&target_id)
        .ok()
        .flatten()
        .map(|s| serde_json::json!(s.cookies))
        .unwrap_or_else(|| serde_json::json!([]));

    Json(AdsPowerEnvelope::success(cookies_data))
}

pub fn browser_routes(storage: Arc<ProfileStorage>) -> Router {
    Router::new()
        .route("/start", get(browser_start))
        .route("/stop", get(browser_stop))
        .route("/active", get(browser_active))
        .route("/cookies", get(browser_cookies))
        .with_state(storage)
}
