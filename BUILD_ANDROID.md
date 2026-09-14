# Build Android (APK/AAB) — SIMPAN

Panduan build project SIMPAN jadi file APK (testing) atau AAB (submit ke Play Store), pakai Android Studio GUI.

## Prasyarat

- **Android Studio** terinstall (sudah ada Android SDK bawaannya)
- Akun **Google Play Console** aktif ($25 sekali bayar, seumur hidup) — https://play.google.com/console
- Node.js + npm terinstall
- Java/JDK (biasanya sudah dibundle Android Studio)

## 1. Build web assets

```bash
cd simpan-app
npm install
npm run build
```

Ini menghasilkan folder `dist/` (hasil build Vite + React).

## 2. Sync ke project Android (Capacitor)

Kalau folder `android/` belum ada (baru pertama kali):

```bash
npm install @capacitor/android
npx cap add android
```

Kalau folder `android/` sudah ada, cukup sync ulang tiap ada perubahan web:

```bash
npx cap sync android
```

## 3. Buka project di Android Studio

```bash
npx cap open android
```

Tunggu **Gradle sync** selesai (proses pertama kali biasanya agak lama, download dependency).

## 4. Set versi app

Buka `android/app/build.gradle`, cari bagian `defaultConfig`:

```gradle
defaultConfig {
    applicationId "com.kynandev.simpan"
    versionCode 1        // naikkan tiap upload baru ke Play Console
    versionName "1.0.0"  // versi yang tampil ke user
}
```

## 5A. Build APK (buat testing manual / install langsung ke HP)

Di Android Studio:
- Menu **Build → Build Bundle(s) / APK(s) → Build APK(s)**
- Setelah selesai, klik notifikasi **locate** untuk buka folder hasil (`android/app/build/outputs/apk/debug/` atau `release/`)

Atau lewat CLI:

```bash
cd android
./gradlew assembleDebug      # APK debug, tanpa signing, buat testing
```

## 5B. Build AAB (wajib untuk submit ke Play Store)

Google Play Store sekarang mewajibkan format **.aab** (Android App Bundle), bukan .apk.

### Bikin Keystore (sekali saja, simpan baik-baik!)

```bash
keytool -genkey -v -keystore simpan-release.keystore \
  -alias simpan -keyalg RSA -keysize 2048 -validity 10000
```

Isi password dan data yang diminta. **Simpan file `.keystore` dan passwordnya di tempat aman** — kalau hilang, lo tidak bisa update app yang sudah live di Play Store lagi (harus bikin app baru).

### Konfigurasi signing

Buat file `android/keystore.properties` (jangan di-commit ke git):

```properties
storeFile=../simpan-release.keystore
storePassword=PASSWORD_KEYSTORE_LO
keyAlias=simpan
keyPassword=PASSWORD_KEY_LO
```

Tambahkan ke `android/app/build.gradle` (sebelum blok `android { ... }`):

```gradle
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
```

Lalu di dalam blok `android { }`, tambahkan:

```gradle
signingConfigs {
    release {
        storeFile file(keystoreProperties['storeFile'])
        storePassword keystoreProperties['storePassword']
        keyAlias keystoreProperties['keyAlias']
        keyPassword keystoreProperties['keyPassword']
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
    }
}
```

### Build AAB

Lewat Android Studio:
- Menu **Build → Generate Signed Bundle / APK**
- Pilih **Android App Bundle**
- Pilih keystore yang sudah dibuat, isi password
- Pilih build variant **release**
- Hasil ada di `android/app/release/app-release.aab`

Atau lewat CLI:

```bash
cd android
./gradlew bundleRelease
```

## 6. Upload ke Google Play Console

1. Buka https://play.google.com/console
2. Buat App baru (kalau belum ada), isi data app (nama, deskripsi, screenshot, dll)
3. Ke menu **Release → Production** (atau Internal/Closed testing dulu buat coba-coba)
4. Upload file `.aab`
5. Isi release notes, submit untuk review

## Troubleshooting

| Masalah | Solusi |
|---|---|
| Gradle sync gagal | Cek koneksi internet, atau **File → Invalidate Caches / Restart** di Android Studio |
| "SDK location not found" | Buat file `android/local.properties` isi `sdk.dir=/Users/USERNAME/Library/Android/sdk` |
| Keystore lupa password | Tidak bisa di-reset — kalau app sudah pernah live, harus pakai keystore yang sama selamanya |
| versionCode belum dinaikkan | Play Console menolak upload kalau `versionCode` sama/lebih kecil dari yang sudah live |
