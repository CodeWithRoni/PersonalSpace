use serde::Serialize;

#[derive(Serialize)]
struct AppInfo {
    runtime: &'static str,
    os: &'static str,
    version: String,
}

/// Basic info about where the app is running. Called from `src/lib/platform.ts`.
#[tauri::command]
fn app_info(app: tauri::AppHandle) -> AppInfo {
    let runtime = if cfg!(mobile) { "mobile" } else { "desktop" };
    AppInfo {
        runtime,
        os: std::env::consts::OS,
        version: app.package_info().version.to_string(),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![app_info])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
