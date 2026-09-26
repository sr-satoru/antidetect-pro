use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CloudUser {
    pub id: String,
    pub email: String,
    pub name: Option<String>,
    pub plan: String,
    #[serde(default)]
    pub max_profiles: i64,
    #[serde(default)]
    pub profile_count: i64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SessionRecord {
    pub session_id: String,
    pub action: String, // "login" | "register"
    pub state: String,
    pub status: String, // "pending" | "authenticated" | "failed"
    pub created_at: i64,
    pub user: Option<CloudUser>,
    pub token: Option<String>,
    #[serde(default)]
    pub refresh_token: Option<String>,
}
