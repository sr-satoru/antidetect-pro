use std::collections::BTreeSet;
use std::sync::Arc;
use axum::{
    extract::State,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::storage::ProfileStorage;
use super::envelope::AdsPowerEnvelope;

#[derive(Debug, Serialize)]
pub struct AdsGroupItem {
    pub group_id: String,
    pub group_name: String,
}

#[derive(Debug, Serialize)]
pub struct AdsGroupListData {
    pub list: Vec<AdsGroupItem>,
    pub total: usize,
}

#[derive(Debug, Deserialize)]
pub struct CreateGroupBody {
    pub group_name: Option<String>,
    pub group_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct CreateGroupData {
    pub group_id: String,
    pub group_name: String,
}

/// GET /api/v1/group/list
pub async fn list_groups(
    State(storage): State<Arc<ProfileStorage>>,
) -> Json<AdsPowerEnvelope<AdsGroupListData>> {
    let profiles = storage.list(None, None);
    let mut distinct_groups = BTreeSet::new();

    // Grupo padrão ungrouped id "0" do AdsPower
    distinct_groups.insert("0".to_string());

    for p in &profiles {
        let clean = p.group.trim();
        if !clean.is_empty() && clean != "Desagrupado" && clean != "Ungrouped" {
            distinct_groups.insert(clean.to_string());
        }
    }

    let list: Vec<AdsGroupItem> = distinct_groups
        .into_iter()
        .map(|g| {
            let name = if g == "0" {
                "Ungrouped".to_string()
            } else {
                g.clone()
            };
            AdsGroupItem {
                group_id: g,
                group_name: name,
            }
        })
        .collect();

    let total = list.len();
    Json(AdsPowerEnvelope::success(AdsGroupListData { list, total }))
}

/// POST /api/v1/group/create
pub async fn create_group(
    Json(payload): Json<CreateGroupBody>,
) -> Json<AdsPowerEnvelope<Value>> {
    let raw_name = payload
        .group_name
        .or(payload.group_id)
        .map(|s| s.trim().to_string())
        .unwrap_or_default();

    if raw_name.is_empty() {
        return Json(AdsPowerEnvelope::error(-1, "group_name is required", serde_json::json!({})));
    }

    Json(AdsPowerEnvelope::success(serde_json::json!({
        "group_id": raw_name.clone(),
        "group_name": raw_name,
    })))
}

pub fn group_routes(storage: Arc<ProfileStorage>) -> Router {
    Router::new()
        .route("/list", get(list_groups))
        .route("/create", post(create_group))
        .with_state(storage)
}
