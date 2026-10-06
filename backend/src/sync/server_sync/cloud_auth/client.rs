use crate::models::CloudUser;
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
struct ExchangeRequest<'a> {
    code: &'a str,
    state: &'a str,
    code_verifier: &'a str,
}

#[derive(Deserialize)]
pub struct ExchangeResponse {
    #[serde(alias = "accessToken", alias = "access_token")]
    pub access_token: String,
    #[serde(alias = "refreshToken", alias = "refresh_token")]
    pub refresh_token: String,
    pub user: CloudUser,
    #[serde(alias = "expiresIn", alias = "expires_in", default = "default_300")]
    pub expires_in: i64,
}

#[derive(Serialize)]
struct RefreshRequest<'a> {
    #[serde(rename = "refresh_token")]
    refresh_token: &'a str,
}

#[derive(Deserialize)]
pub struct RefreshResponse {
    #[serde(alias = "access_token", alias = "accessToken")]
    pub access_token: String,
    #[serde(alias = "expires_in", alias = "expiresIn", default = "default_300")]
    pub expires_in: i64,
}

fn default_300() -> i64 {
    300
}

/// Cliente HTTP puro para comunicação remota com a API de sincronização
#[derive(Clone)]
pub struct RemoteAuthClient {
    http_client: reqwest::Client,
    cloud_api_url: String,
}

impl RemoteAuthClient {
    pub fn new(cloud_api_url: String) -> Self {
        Self {
            http_client: reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(10))
                .build()
                .unwrap_or_else(|_| reqwest::Client::new()),
            cloud_api_url,
        }
    }

    /// Troca o AuthCode pelo JWT definitivo no endpoint /api/auth/exchange-code
    pub async fn exchange_code(
        &self,
        code: &str,
        state: &str,
        verifier: &str,
    ) -> Result<ExchangeResponse, String> {
        let payload = ExchangeRequest {
            code,
            state,
            code_verifier: verifier,
        };

        let url = format!("{}/api/auth/exchange-code", self.cloud_api_url);
        let resp = self
            .http_client
            .post(&url)
            .json(&payload)
            .send()
            .await
            .map_err(|e| format!("Falha de conexão com backend comercial: {e}"))?;

        if !resp.status().is_success() {
            let err_text = resp.text().await.unwrap_or_default();
            return Err(format!("Erro ao autenticar: {err_text}"));
        }

        resp.json::<ExchangeResponse>()
            .await
            .map_err(|e| format!("Resposta de autenticação inválida: {e}"))
    }

    /// Renova o Access Token expirado usando o Refresh Token
    pub async fn refresh_access_token(&self, refresh_token: &str) -> Result<RefreshResponse, String> {
        let url = format!("{}/api/auth/refresh", self.cloud_api_url);
        let resp = self
            .http_client
            .post(&url)
            .json(&RefreshRequest { refresh_token })
            .send()
            .await
            .map_err(|e| format!("Falha ao renovar token de acesso: {e}"))?;

        if !resp.status().is_success() {
            return Err("Sessão expirada. Faça login novamente no Star Multlogin.".to_string());
        }

        resp.json::<RefreshResponse>()
            .await
            .map_err(|e| format!("Resposta de renovação inválida: {e}"))
    }

    /// Handshake ativo: consulta /api/auth/me para validar integridade da sessão
    pub async fn fetch_me(&self, access_token: &str) -> Result<CloudUser, String> {
        let url = format!("{}/api/auth/me", self.cloud_api_url);
        let resp = self
            .http_client
            .get(&url)
            .bearer_auth(access_token)
            .send()
            .await
            .map_err(|e| format!("Falha de conexão com backend: {e}"))?;

        if !resp.status().is_success() {
            return Err(format!("Status HTTP não autorizado: {}", resp.status()));
        }

        #[derive(Deserialize)]
        struct MePayload {
            id: String,
            email: String,
            name: Option<String>,
            plan: String,
            #[serde(default)]
            #[serde(rename = "maxProfiles")]
            max_profiles: i64,
            #[serde(default)]
            #[serde(rename = "profileCount")]
            profile_count: i64,
        }

        let me = resp
            .json::<MePayload>()
            .await
            .map_err(|e| format!("Erro ao decodificar dados do usuário: {e}"))?;

        Ok(CloudUser {
            id: me.id,
            email: me.email,
            name: me.name,
            plan: me.plan,
            max_profiles: me.max_profiles,
            profile_count: me.profile_count,
        })
    }
}
