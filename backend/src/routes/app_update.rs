use axum::{
    extract::Query,
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use std::time::Duration;

#[derive(Debug, Deserialize)]
pub struct CheckUpdateQuery {
    pub current_version: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppAssetInfo {
    pub name: String,
    pub download_url: String,
    pub size_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppUpdateResponse {
    pub has_update: bool,
    pub current_version: String,
    pub latest_version: String,
    pub tag_name: String,
    pub name: String,
    pub body: String,
    pub published_at: String,
    pub html_url: String,
    pub assets: Vec<AppAssetInfo>,
}

fn is_version_newer(latest: &str, current: &str) -> bool {
    let clean = |v: &str| -> Vec<u32> {
        v.trim_start_matches('v')
            .split('.')
            .filter_map(|s| s.parse::<u32>().ok())
            .collect()
    };
    let l = clean(latest);
    let c = clean(current);
    for i in 0..std::cmp::max(l.len(), c.len()) {
        let l_part = l.get(i).copied().unwrap_or(0);
        let c_part = c.get(i).copied().unwrap_or(0);
        if l_part > c_part {
            return true;
        }
        if l_part < c_part {
            return false;
        }
    }
    false
}

/// GET /api/app/check-update
pub async fn check_app_update_handler(
    Query(params): Query<CheckUpdateQuery>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let current_version = params.current_version.unwrap_or_else(|| "0.1.16".to_string());

    let client = reqwest::Client::builder()
        .user_agent("StarMultloginApp/1.0 (Updater; +https://github.com/sr-satoru/antidetect-pro)")
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao criar cliente HTTP: {e}")))?;

    let url = "https://api.github.com/repos/sr-satoru/antidetect-pro/releases/latest";
    let resp = match client.get(url).send().await {
        Ok(r) => r,
        Err(e) => {
            tracing::warn!("⚠️ Erro ao consultar releases no GitHub: {}", e);
            return Ok(Json(AppUpdateResponse {
                has_update: false,
                current_version: current_version.clone(),
                latest_version: current_version.clone(),
                tag_name: format!("v{current_version}"),
                name: format!("Star Multlogin v{current_version}"),
                body: String::new(),
                published_at: String::new(),
                html_url: "https://github.com/sr-satoru/antidetect-pro/releases".to_string(),
                assets: Vec::new(),
            }));
        }
    };

    if !resp.status().is_success() {
        tracing::warn!("⚠️ GitHub Releases retornou status HTTP: {}", resp.status());
        return Ok(Json(AppUpdateResponse {
            has_update: false,
            current_version: current_version.clone(),
            latest_version: current_version.clone(),
            tag_name: format!("v{current_version}"),
            name: format!("Star Multlogin v{current_version}"),
            body: String::new(),
            published_at: String::new(),
            html_url: "https://github.com/sr-satoru/antidetect-pro/releases".to_string(),
            assets: Vec::new(),
        }));
    }

    let json_data: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, format!("Erro ao processar JSON do GitHub: {e}")))?;

    let tag_name = json_data
        .get("tag_name")
        .and_then(|v| v.as_str())
        .unwrap_or_default()
        .to_string();

    let latest_version = tag_name.trim_start_matches('v').to_string();
    let has_update = is_version_newer(&latest_version, &current_version);

    let name = json_data
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or(&tag_name)
        .to_string();

    let body = json_data
        .get("body")
        .and_then(|v| v.as_str())
        .unwrap_or_default()
        .to_string();

    let published_at = json_data
        .get("published_at")
        .and_then(|v| v.as_str())
        .unwrap_or_default()
        .to_string();

    let html_url = json_data
        .get("html_url")
        .and_then(|v| v.as_str())
        .unwrap_or("https://github.com/sr-satoru/antidetect-pro/releases")
        .to_string();

    let mut assets = Vec::new();
    if let Some(arr) = json_data.get("assets").and_then(|v| v.as_array()) {
        for a in arr {
            let asset_name = a.get("name").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let download_url = a.get("browser_download_url").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let size_bytes = a.get("size").and_then(|v| v.as_u64()).unwrap_or(0);
            if !asset_name.is_empty() && !download_url.is_empty() {
                assets.push(AppAssetInfo {
                    name: asset_name,
                    download_url,
                    size_bytes,
                });
            }
        }
    }

    Ok(Json(AppUpdateResponse {
        has_update,
        current_version,
        latest_version,
        tag_name,
        name,
        body,
        published_at,
        html_url,
        assets,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_version_newer() {
        assert!(is_version_newer("0.1.18", "0.1.16"));
        assert!(is_version_newer("v0.1.18", "0.1.16"));
        assert!(is_version_newer("v0.2.0", "v0.1.18"));
        assert!(!is_version_newer("0.1.16", "0.1.18"));
        assert!(!is_version_newer("0.1.16", "0.1.16"));
        assert!(!is_version_newer("v0.1.16", "0.1.16"));
    }
}
