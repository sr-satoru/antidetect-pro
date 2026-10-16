/// Comando Tauri: Gera ticket de uso único para handshake do desktop
/// Este comando é restrito ao IPC interno do Tauri (inacessível por websites externos)
#[tauri::command]
fn get_handshake_ticket() -> Result<String, String> {
  let nm = star_multlogin_backend::get_or_init_nonce_manager();
  Ok(nm.create_ticket("desktop_handshake", 30))
}

/// Comando Tauri: Gera action ticket de uso único para operações de alto risco
#[tauri::command]
fn get_action_ticket(action: Option<String>) -> Result<String, String> {
  let nm = star_multlogin_backend::get_or_init_nonce_manager();
  let action_name = action.unwrap_or_else(|| "apply_update".to_string());
  let scope = format!("action_{}", action_name);
  Ok(nm.create_ticket(&scope, 15))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_process::init())
    .invoke_handler(tauri::generate_handler![
      get_handshake_ticket,
      get_action_ticket,
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // Inicia o daemon local Star Multlogin (Axum na porta 12540) em segundo plano usando o diretório canônico padrão
      tauri::async_runtime::spawn(async move {
        let canonical_dir = star_multlogin_backend::browser_downloader::platform::get_canonical_app_dir();
        let data_dir_str = canonical_dir.to_string_lossy().to_string();
        if let Err(e) = star_multlogin_backend::start_star_server(Some(data_dir_str), 12540).await {
          eprintln!("Erro no servidor interno Star Multlogin: {}", e);
        }
      });

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
