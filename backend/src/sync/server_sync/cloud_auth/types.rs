use crate::models::CloudUser;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AuthSession {
    pub user: CloudUser,
    pub access_token: String,
    pub refresh_token: String,
    pub expires_at: i64,
}

#[derive(Serialize, Deserialize)]
pub struct EncryptedSessionTokens {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_at: i64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum ConnectionStatus {
    Online,
    OfflineServerUnreachable,
    Unauthenticated,
}

#[derive(Clone, Debug)]
pub struct PkcePair {
    pub code_verifier: String,
    pub code_challenge: String,
}

#[derive(Clone, Debug)]
pub struct PendingPkce {
    pub code_verifier: String,
    pub expires_at: i64,
}
