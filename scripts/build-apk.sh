#!/bin/bash
set -e

# Pastikan script selalu berjalan di root direktori proyek simpan-app
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🚀 [1/3] Menyiapkan web assets dan sinkronisasi Capacitor Android..."
npm run build
npx cap sync android

# Deteksi Java 21 (Android Studio JBR atau system JAVA_HOME)
if [ -d "/Applications/Android Studio.app/Contents/jbr/Contents/Home" ]; then
  export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
  export PATH="$JAVA_HOME/bin:$PATH"
fi

echo "⚙️ [2/3] Mengompilasi APK Android via Gradle (Java: $(java -version 2>&1 | head -n 1))..."
cd android

# Cek apakah bisa build Release dengan keystore yang ada, jika tidak fallback ke Debug
if ./gradlew assembleRelease; then
  APK_PATH=$(find app/build/outputs/apk/release -name "*.apk" 2>/dev/null | head -n 1)
  BUILD_TYPE="Release"
else
  echo "⚠️ Build Release belum berhasil/keystore belum cocok, beralih ke assembleDebug..."
  ./gradlew assembleDebug
  APK_PATH=$(find app/build/outputs/apk/debug -name "*.apk" 2>/dev/null | head -n 1)
  BUILD_TYPE="Debug"
fi

cd ..

OUTPUT_DIR="$(pwd)/build-apk"
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

if [ -n "$APK_PATH" ] && [ -f "android/$APK_PATH" ]; then
  cp "android/$APK_PATH" "$OUTPUT_DIR/Simpan.apk"
  echo ""
  echo "🎉 [3/3] Berhasil! File APK ($BUILD_TYPE) telah diekspor ke:"
  echo "👉 $OUTPUT_DIR/Simpan.apk"
else
  echo "❌ Error: File APK tidak ditemukan di android/app/build/outputs/apk/"
  exit 1
fi
