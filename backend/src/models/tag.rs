use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tag {
    pub id: String,
    pub name: String,
    #[serde(default = "default_tag_color")]
    pub color: String,
    pub created_at: i64,
    pub updated_at: i64,
}

fn default_tag_color() -> String {
    "#1677FF".to_string()
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateTagDto {
    pub name: String,
    pub color: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateTagDto {
    pub name: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct BatchDeleteTagsDto {
    pub ids: Vec<String>,
}
