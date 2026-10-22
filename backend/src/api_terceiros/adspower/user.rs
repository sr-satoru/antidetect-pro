use std::sync::Arc;
use axum::{
    extract::{Query, State},
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::models::{CreateProfileDto, UpdateProfileDto};
use crate::storage::ProfileStorage;
use super::envelope::AdsPowerEnvelope;

#[derive(Debug, Deserialize)]
pub struct UserListQuery {
    pub page: Option<usize>,
    pub page_size: Option<usize>,
    pub group_id: Option<String>,
    pub user_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct AdsUserItem {
    pub user_id: String,
    pub name: String,
    pub group_id: String,
    pub serial_number: String,
    pub created_time: i64,
    pub last_open_time: i64,
}

#[derive(Debug, Serialize)]
pub struct AdsUserListData {
    pub list: Vec<AdsUserItem>,
    pub page: usize,
    pub page_size: usize,
    pub total: usize,
}

#[derive(Debug, Deserialize)]
pub struct AdsProxyConfig {
    pub proxy_type: Option<String>,
    pub proxy_host: Option<String>,
    pub proxy_port: Option<u16>,
    pub proxy_user: Option<String>,
    pub proxy_password: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AdsFingerprintConfig {
    pub screen_resolution: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateUserBody {
    pub name: Option<String>,
    pub group_id: Option<String>,
    pub domain_name: Option<String>,
    pub username: Option<String>,
    pub password: Option<String>,
    pub user_proxy_config: Option<AdsProxyConfig>,
    pub fingerprint_config: Option<AdsFingerprintConfig>,
    pub kernel: Option<String>,
    pub os: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateUserBody {
    pub user_id: String,
    pub name: Option<String>,
    pub group_id: Option<String>,
    pub user_proxy_config: Option<AdsProxyConfig>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct DeleteUserBody {
    pub user_ids: Vec<String>,
}

fn normalize_group(g: &str) -> String {
    let clean = g.trim();
    if clean.is_empty() || clean == "Desagrupado" || clean == "0" || clean == "Ungrouped" {
        "0".to_string()
    } else {
        clean.to_string()
    }
}

/// GET /api/v1/user/list
pub async fn list_users(
    State(storage): State<Arc<ProfileStorage>>,
    Query(query): Query<UserListQuery>,
) -> Json<AdsPowerEnvelope<AdsUserListData>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(100).clamp(1, 2000);

    let all = storage.list(None, None);

    let filtered: Vec<_> = all
        .into_iter()
        .filter(|p| {
            if let Some(ref target_id) = query.user_id {
                if &p.id != target_id {
                    return false;
                }
            }
            if let Some(ref target_grp) = query.group_id {
                let p_grp = normalize_group(&p.group);
                let t_grp = normalize_group(target_grp);
                if p_grp != t_grp {
                    return false;
                }
            }
            true
        })
        .collect();

    let total = filtered.len();
    let start = (page - 1) * page_size;
    let end = (start + page_size).min(total);

    let paged = if start < total {
        &filtered[start..end]
    } else {
        &[]
    };

    let list = paged
        .iter()
        .enumerate()
        .map(|(i, p)| AdsUserItem {
            user_id: p.id.clone(),
            name: p.name.clone(),
            group_id: normalize_group(&p.group),
            serial_number: format!("{}", start + i + 1),
            created_time: p.created_at,
            last_open_time: p.last_launch.unwrap_or(0),
        })
        .collect();

    Json(AdsPowerEnvelope::success(AdsUserListData {
        list,
        page,
        page_size,
        total,
    }))
}

/// POST /api/v1/user/create
pub async fn create_user(
    State(storage): State<Arc<ProfileStorage>>,
    Json(body): Json<CreateUserBody>,
) -> Json<AdsPowerEnvelope<Value>> {
    let name = body.name.filter(|s| !s.trim().is_empty());
    let group = body.group_id.filter(|s| !s.trim().is_empty() && s != "0");

    let (proxy_type, proxy_host, proxy_port, proxy_username, proxy_password) =
        if let Some(px) = body.user_proxy_config {
            (
                px.proxy_type,
                px.proxy_host,
                px.proxy_port,
                px.proxy_user,
                px.proxy_password,
            )
        } else {
            (None, None, None, None, None)
        };

    let mut fp_map = serde_json::Map::new();
    if let Some(fc) = body.fingerprint_config {
        if let Some(res) = fc.screen_resolution {
            let clean = res.replace('_', "x");
            if let Some((w_s, h_s)) = clean.split_once('x') {
                if let (Ok(w), Ok(h)) = (w_s.trim().parse::<u32>(), h_s.trim().parse::<u32>()) {
                    fp_map.insert("custom_screen_width".to_string(), serde_json::json!(w));
                    fp_map.insert("custom_screen_height".to_string(), serde_json::json!(h));
                }
            }
        }
    }

    let dto = CreateProfileDto {
        id: None,
        name,
        group,
        tags: None,
        tag_ids: None,
        notes: body.domain_name,
        status: Some("ready".to_string()),
        kernel: Some(body.kernel.unwrap_or_else(|| "AstroBrowser".to_string())),
        browser_version: Some("150".to_string()),
        os: Some(body.os.unwrap_or_else(|| "windows".to_string())),
        proxy_type,
        proxy_host,
        proxy_port,
        proxy_username,
        proxy_password,
        fingerprint_json: Some(Value::Object(fp_map)),
        extension_mode: None,
        extension_category: None,
        extensions: None,
    };

    match storage.create(dto) {
        Ok(profile) => Json(AdsPowerEnvelope::success(serde_json::json!({
            "id": profile.id
        }))),
        Err(e) => Json(AdsPowerEnvelope::error(-1, e, serde_json::json!({}))),
    }
}

/// POST /api/v1/user/update
pub async fn update_user(
    State(storage): State<Arc<ProfileStorage>>,
    Json(body): Json<UpdateUserBody>,
) -> Json<AdsPowerEnvelope<Value>> {
    let (proxy_type, proxy_host, proxy_port, proxy_username, proxy_password) =
        if let Some(px) = body.user_proxy_config {
            (
                px.proxy_type,
                px.proxy_host,
                px.proxy_port,
                px.proxy_user,
                px.proxy_password,
            )
        } else {
            (None, None, None, None, None)
        };

    let dto = UpdateProfileDto {
        id: None,
        name: body.name,
        group: body.group_id,
        tags: None,
        tag_ids: None,
        notes: body.notes,
        status: None,
        kernel: None,
        browser_version: None,
        os: None,
        proxy_type,
        proxy_host,
        proxy_port,
        proxy_username,
        proxy_password,
        fingerprint_json: None,
        extension_mode: None,
        extension_category: None,
        extensions: None,
    };

    match storage.update(&body.user_id, dto) {
        Ok(_) => Json(AdsPowerEnvelope::success(serde_json::json!({}))),
        Err(e) => Json(AdsPowerEnvelope::error(-1, e, serde_json::json!({}))),
    }
}

/// POST /api/v1/user/delete
pub async fn delete_user(
    State(storage): State<Arc<ProfileStorage>>,
    Json(body): Json<DeleteUserBody>,
) -> Json<AdsPowerEnvelope<Value>> {
    let mut deleted_count = 0;
    for id in &body.user_ids {
        if storage.soft_delete(id).is_ok() {
            deleted_count += 1;
        }
    }

    Json(AdsPowerEnvelope::success(serde_json::json!({
        "deleted": deleted_count,
        "locked": []
    })))
}

pub fn user_routes(storage: Arc<ProfileStorage>) -> Router {
    Router::new()
        .route("/list", get(list_users))
        .route("/create", post(create_user))
        .route("/update", post(update_user))
        .route("/delete", post(delete_user))
        .with_state(storage)
}
