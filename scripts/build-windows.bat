@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo       BUILD SIMPAN DESKTOP UNTUK WINDOWS (EXE / MSI)
echo ========================================================
echo.

:: 1. Cek Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js belum terinstall! Silakan install dari https://nodejs.org
    pause
    exit /b 1
)

:: 2. Cek Rust / Cargo
where cargo >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Rust / Cargo belum terinstall! Silakan install dari https://rustup.rs
    pause
    exit /b 1
)

:: 3. Cek node_modules
if not exist "node_modules" (
    echo [1/4] Menginstall dependencies npm...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Gagal npm install!
        pause
        exit /b 1
    )
) else (
    echo [1/4] Dependencies npm sudah siap.
)

:: 4. Build Frontend Vite
echo [2/4] Melakukan build frontend web...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Gagal build frontend!
    pause
    exit /b 1
)

:: 5. Build Tauri Windows Installer
echo [3/4] Melakukan kompilasi Tauri Desktop untuk Windows...
call npx tauri build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Gagal tauri build! Pastikan WebView2 runtime dan Visual Studio C++ Build Tools terpasang.
    pause
    exit /b 1
)

:: 6. Salin hasil build ke build-desktop
echo [4/4] Mengumpulkan installer ke folder build-desktop...
if not exist "build-desktop" mkdir "build-desktop"

for /R "src-tauri\target\release\bundle\nsis" %%f in (*.exe) do (
    copy /Y "%%f" "build-desktop\" >nul
    echo [+] Installer EXE: %%~nxf tersalin ke build-desktop\
)

for /R "src-tauri\target\release\bundle\msi" %%f in (*.msi) do (
    copy /Y "%%f" "build-desktop\" >nul
    echo [+] Installer MSI: %%~nxf tersalin ke build-desktop\
)

echo.
echo ========================================================
echo   BUILD WINDOWS BERHASIL! File ada di folder build-desktop
echo ========================================================
echo.
explorer "build-desktop"
pause
