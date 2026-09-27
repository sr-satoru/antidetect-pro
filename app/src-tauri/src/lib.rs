#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // Inicia o daemon local Fury (Axum na porta 12540) em segundo plano
      tauri::async_runtime::spawn(async move {
        if let Err(e) = fury_backend::start_fury_server(None, 12540).await {
          eprintln!("Erro no servidor interno Fury: {}", e);
        }
      });

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
