#!/bin/bash
set -e

# Pastikan script selalu berjalan di root direktori proyek simpan-app
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# Menghasilkan IPA yang SUDAH DITANDATANGANI (development signing) sehingga
# bisa langsung diinstall lewat Diawi/sideload ke device yang sudah terdaftar
# di akun Apple Developer (via Xcode > Devices, atau pernah di-run lewat kabel).

echo "🚀 [1/3] Menyiapkan web assets dan sinkronisasi Capacitor..."
npm run build
npx cap sync ios

echo "⚙️ [2/3] Meng-archive aplikasi iOS (Release, signed otomatis)..."
BUILD_DIR="$(pwd)/build-ipa"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

xcodebuild -project ios/App/App.xcodeproj \
  -scheme App \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$BUILD_DIR/App.xcarchive" \
  archive \
  CODE_SIGN_STYLE=Automatic \
  DEVELOPMENT_TEAM=3T3K93N5VA

echo "📦 [3/3] Mengekspor ke Simpan.ipa (signed, siap sideload)..."
xcodebuild -exportArchive \
  -archivePath "$BUILD_DIR/App.xcarchive" \
  -exportOptionsPlist ios/exportOptions.plist \
  -exportPath "$BUILD_DIR/Export"

mv "$BUILD_DIR/Export/App.ipa" "$BUILD_DIR/Simpan.ipa"

echo "✅ Selesai! File IPA (signed) Anda siap di:"
echo "👉 $(pwd)/build-ipa/Simpan.ipa"
echo "   Upload file ini ke https://www.diawi.com untuk sideload ke iPhone Anda."
