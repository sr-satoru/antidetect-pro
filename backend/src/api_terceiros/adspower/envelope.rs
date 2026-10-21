use serde::Serialize;

/// Envelope padrão para compatibilidade com a AdsPower Local API.
/// Todas as respostas da AdsPower seguem:
/// { "code": 0, "msg": "success", "data": { ... } }
#[derive(Debug, Clone, Serialize)]
pub struct AdsPowerEnvelope<T: Serialize> {
    pub code: i32,
    pub msg: String,
    pub data: T,
}

impl<T: Serialize> AdsPowerEnvelope<T> {
    pub fn success(data: T) -> Self {
        Self {
            code: 0,
            msg: "success".to_string(),
            data,
        }
    }

    pub fn error(code: i32, msg: impl Into<String>, data: T) -> Self {
        Self {
            code,
            msg: msg.into(),
            data,
        }
    }
}
