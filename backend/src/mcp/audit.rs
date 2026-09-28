use chrono::Utc;
use serde::Serialize;
use std::fs::OpenOptions;
use std::io::Write;
use std::path::Path;

#[derive(Serialize)]
struct AuditEvent<'a> {
    timestamp: String,
    event: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    profile_id: Option<&'a str>,
    status: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    details: Option<&'a str>,
}

/// Registra eventos de segurança e automação em formato estruturado JSONL (Blue Team SIEM Ready).
/// Nenhuma senha, token ou cookie é jamais registrado neste arquivo.
pub fn log_event(
    data_dir: &Path,
    event: &str,
    profile_id: Option<&str>,
    status: &str,
    details: Option<&str>,
) {
    let logs_dir = data_dir.join("logs");
    let _ = std::fs::create_dir_all(&logs_dir);
    let log_file = logs_dir.join("audit.jsonl");

    let audit_entry = AuditEvent {
        timestamp: Utc::now().to_rfc3339(),
        event,
        profile_id,
        status,
        details,
    };

    if let Ok(json_line) = serde_json::to_string(&audit_entry) {
        if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(&log_file) {
            let _ = writeln!(file, "{}", json_line);
        }
    }
}
