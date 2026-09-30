use serde::Serialize;
use tauri::{AppHandle, Emitter};
use tauri_plugin_updater::UpdaterExt;

#[derive(Debug, Clone, Serialize)]
pub struct UpdateInfo {
    pub has_update: bool,
    pub current_version: String,
    pub latest_version: String,
    pub body: String,
    pub date: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ProgressPayload {
    pub downloaded_bytes: usize,
    pub total_bytes: Option<u64>,
    pub progress: f64,
}

/// Comando Rust para verificar se há atualização publicada no GitHub Releases
#[tauri::command]
pub async fn check_app_update(app: AppHandle) -> Result<UpdateInfo, String> {
    let updater = app.updater().map_err(|e| format!("Falha ao obter gerenciador de atualização: {e}"))?;
    let update = updater.check().await.map_err(|e| format!("Falha ao verificar atualização: {e}"))?;

    if let Some(up) = update {
        Ok(UpdateInfo {
            has_update: true,
            current_version: up.current_version.clone(),
            latest_version: up.version.clone(),
            body: up.body.clone().unwrap_or_default(),
            date: up.date.map(|d| d.to_string()).unwrap_or_default(),
        })
    } else {
        let current = app.package_info().version.to_string();
        Ok(UpdateInfo {
            has_update: false,
            current_version: current.clone(),
            latest_version: current,
            body: String::new(),
            date: String::new(),
        })
    }
}

/// Comando Rust para baixar e instalar a atualização nativa em segundo plano
#[tauri::command]
pub async fn start_app_download(app: AppHandle) -> Result<(), String> {
    let updater = app.updater().map_err(|e| format!("Falha ao obter gerenciador de atualização: {e}"))?;
    let update = updater
        .check()
        .await
        .map_err(|e| format!("Falha ao verificar atualização: {e}"))?
        .ok_or_else(|| "Nenhuma atualização pendente encontrada para download".to_string())?;

    let app_handle = app.clone();
    let mut downloaded = 0usize;

    update
        .download_and_install(
            move |chunk_length, content_length| {
                downloaded += chunk_length;
                let percent = if let Some(total) = content_length {
                    if total > 0 {
                        (downloaded as f64 / total as f64) * 100.0
                    } else {
                        0.0
                    }
                } else {
                    0.0
                };

                let _ = app_handle.emit(
                    "app-update-progress",
                    ProgressPayload {
                        downloaded_bytes: downloaded,
                        total_bytes: content_length,
                        progress: percent,
                    },
                );
            },
            move || {
                let _ = app.emit("app-update-finished", ());
            },
        )
        .await
        .map_err(|e| format!("Erro durante o download e instalação: {e}"))?;

    Ok(())
}

/// Comando Rust para reiniciar a aplicação e carregar o novo executável
#[tauri::command]
pub fn restart_app(app: AppHandle) {
    app.restart();
}
