# PowerShell script untuk build SIMPAN Desktop Windows
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "      BUILD SIMPAN DESKTOP UNTUK WINDOWS (EXE / MSI)     " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Cek Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js belum terpasang! Silakan unduh dari https://nodejs.org"
    exit 1
}

# 2. Cek Rust & Cargo
if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
    Write-Error "Rust / Cargo belum terpasang! Silakan unduh dari https://rustup.rs"
    exit 1
}

# 3. Dependencies
if (-not (Test-Path "node_modules")) {
    Write-Host "[1/4] Menginstall dependencies npm..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} else {
    Write-Host "[1/4] Dependencies npm sudah siap." -ForegroundColor Green
}

# 4. Build Vite
Write-Host "[2/4] Melakukan build frontend web..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# 5. Build Tauri
Write-Host "[3/4] Melakukan kompilasi Tauri Desktop untuk Windows..." -ForegroundColor Yellow
npx tauri build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# 6. Salin Installer
Write-Host "[4/4] Mengumpulkan installer ke folder build-desktop..." -ForegroundColor Yellow
if (-not (Test-Path "build-desktop")) {
    New-Item -ItemType Directory -Path "build-desktop" | Out-Null
}

$exeFiles = Get-ChildItem -Path "src-tauri\target\release\bundle\nsis" -Filter "*.exe" -Recurse -ErrorAction SilentlyContinue
foreach ($f in $exeFiles) {
    Copy-Item $f.FullName -Destination "build-desktop\" -Force
    Write-Host "[+] Tersalin EXE: $($f.Name)" -ForegroundColor Green
}

$msiFiles = Get-ChildItem -Path "src-tauri\target\release\bundle\msi" -Filter "*.msi" -Recurse -ErrorAction SilentlyContinue
foreach ($f in $msiFiles) {
    Copy-Item $f.FullName -Destination "build-desktop\" -Force
    Write-Host "[+] Tersalin MSI: $($f.Name)" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  BUILD WINDOWS BERHASIL! File ada di folder build-desktop " -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan
Invoke-Item "build-desktop"
