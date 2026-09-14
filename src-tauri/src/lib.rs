use std::fs;
use tauri::Manager;
use base64::prelude::*;

#[tauri::command]
fn save_file_to_downloads(app: tauri::AppHandle, filename: String, base64_data: String) -> Result<String, String> {
    let download_dir = app.path().download_dir().map_err(|e| e.to_string())?;

    // Bersihkan prefix data URL jika ada (contoh: "data:image/jpeg;base64,...")
    let raw_base64 = if let Some(idx) = base64_data.find(',') {
        &base64_data[idx + 1..]
    } else {
        &base64_data
    };

    let bytes = BASE64_STANDARD.decode(raw_base64).map_err(|e| format!("Gagal decode base64: {}", e))?;

    let mut target_path = download_dir.join(&filename);
    let mut counter = 1;
    let file_stem = target_path.file_stem().and_then(|s| s.to_str()).unwrap_or("file").to_string();
    let file_ext = target_path.extension().and_then(|s| s.to_str()).unwrap_or("").to_string();

    while target_path.exists() {
        let new_name = if file_ext.is_empty() {
            format!("{}_{}", file_stem, counter)
        } else {
            format!("{}_{}.{}", file_stem, counter, file_ext)
        };
        target_path = download_dir.join(new_name);
        counter += 1;
    }

    fs::write(&target_path, &bytes).map_err(|e| format!("Gagal menulis file: {}", e))?;

    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("open")
            .arg("-R")
            .arg(&target_path)
            .spawn();
    }

    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("explorer")
            .arg(format!("/select,\"{}\"", target_path.display()))
            .spawn();
    }

    Ok(target_path.to_string_lossy().to_string())
}

#[tauri::command]
fn save_text_to_downloads(app: tauri::AppHandle, filename: String, content: String) -> Result<String, String> {
    let download_dir = app.path().download_dir().map_err(|e| e.to_string())?;
    let mut target_path = download_dir.join(&filename);
    let mut counter = 1;
    let file_stem = target_path.file_stem().and_then(|s| s.to_str()).unwrap_or("file").to_string();
    let file_ext = target_path.extension().and_then(|s| s.to_str()).unwrap_or("txt").to_string();

    while target_path.exists() {
        let new_name = format!("{}_{}.{}", file_stem, counter, file_ext);
        target_path = download_dir.join(new_name);
        counter += 1;
    }

    fs::write(&target_path, content.as_bytes()).map_err(|e| format!("Gagal menulis file: {}", e))?;

    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("open")
            .arg("-R")
            .arg(&target_path)
            .spawn();
    }

    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("explorer")
            .arg(format!("/select,\"{}\"", target_path.display()))
            .spawn();
    }

    Ok(target_path.to_string_lossy().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_log::Builder::default().build())
    .invoke_handler(tauri::generate_handler![save_file_to_downloads, save_text_to_downloads])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
