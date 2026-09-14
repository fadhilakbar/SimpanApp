# 📦 SIMPAN (Sistem Manajemen & Arsip Digital)

<div align="center">

![SIMPAN Logo](public/icons/icon-192.png)

**Aplikasi Pengarsipan Digital Cerdas, Offline-First & Multi-Platform**  
*Tersedia untuk Desktop (macOS & Windows), Mobile (Android & iOS), dan Web.*

[![GitHub Workflow](https://img.shields.io/github/actions/workflow/status/fadhilakbar/SimpanApp/desktop-build.yml?branch=main&label=Desktop%20Build%20(CI%2FCD)&style=for-the-badge&logo=github)](https://github.com/fadhilakbar/SimpanApp/actions)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131?style=for-the-badge&logo=tauri&logoColor=black)](https://tauri.app/)
[![Capacitor](https://img.shields.io/badge/Capacitor-8.0-119EFF?style=for-the-badge&logo=capacitor&logoColor=white)](https://capacitorjs.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-emerald?style=for-the-badge)](LICENSE)

[Fitur Utama](#-fitur-unggulan) •
[Arsitektur](#-arsitektur--teknologi) •
[Cara Menjalankan](#-cara-menjalankan-secara-lokal) •
[Build Desktop](#-build-desktop-macos--windows) •
[Build Mobile](#-build-mobile-android--ios)

</div>

---

## 🌟 Tentang SIMPAN

**SIMPAN** adalah aplikasi manajemen dokumen dan arsip cerdas yang dirancang dengan filosofi **Offline-First**. Seluruh dokumen, struk belanja, surat berharga, catatan, rekaman suara, dan sertifikat tersimpan 100% aman di penyimpanan lokal perangkat Anda tanpa bergantung pada koneksi internet atau server pihak ketiga.

Dilengkapi dengan integrasi Optical Character Recognition (OCR), AI Vision & Sound Reader, pencarian instan, filter kategori cerdas, serta antarmuka modern yang responsif untuk layar Desktop (macOS / Windows) maupun smartphone (Android / iOS).

---

## ✨ Fitur Unggulan

### 1. 📂 Manajemen Arsip & Kategori Dinamis
- **Kategori Adaptif**: Pengarsipan struk belanja, dokumen resmi, sertifikat, invoice, rekaman suara, hingga catatan personal.
- **Koleksi Kustom**: Buat dan sesuaikan folder kategori baru secara instan lengkap dengan pemilihan ikon dan warna tema.
- **Sidebar Desktop Interaktif**: Akses cepat ke arsip kategori dengan filter langsung dan indikator jumlah dokumen (*live counters*).

### 2. ⚡ Offline-First & Privasi Terjamin
- **100% Penyimpanan Lokal**: Menggunakan basis data terenkripsi IndexedDB (Dexie.js). Tidak ada data pribadi yang dikirim ke cloud tanpa izin Anda.
- **Backup & Restore Mandiri**: Ekspor seluruh database dan berkas ke dalam file ZIP/JSON cadangan yang dapat dipulihkan kapan saja.

### 3. 📷 Pemindai Cerdas & OCR Multi-Page
- **Pindai Dokumen Real-time**: Dukungan kamera langsung dengan filter peningkatan kontras (CamScanner style) dan auto-cropping.
- **Multi-Page Document Reader**: Penampil berkas PDF dan dokumen multi-halaman dengan zoom, navigasi lembar kerja, dan rotasi.
- **Ekstraksi Teks Otomatis**: Membaca tanggal, nama toko/pihak penerbit, nomor dokumen, dan total transaksi secara otomatis.

### 4. 🎙️ Voice Notes & AI Audio Memo
- Perekaman catatan suara berdurasi panjang dengan visualisasi gelombang suara (*waveform*).
- Kompatibel penuh untuk perekaman suara di browser, macOS WKWebView, Windows, maupun native mobile.

### 5. 🖥️ Tampilan Desktop-First Modern
- Antarmuka berkelas yang mengadopsi prinsip desain ergonomis desktop: layout lebar proporsional (`max-w-6xl`), navigasi keyboard, drawer & modal terpusat, dan responsivitas layar lebar hingga monitor ultrawide.

### 6. 🔒 Keamanan & Proteksi Akses
- Kunci aplikasi menggunakan **PIN Sandi Keamanan**.
- Dukungan autentikasi biometrik (**Face ID / Fingerprint**) pada perangkat yang mendukung.

---

## 🛠️ Arsitektur & Teknologi

| Komponen | Teknologi | Keterangan |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19 + TypeScript | UI deklaratif dengan state yang sangat cepat |
| **Styling** | Tailwind CSS | Desain modern, glassmorphism & palet warna harmonis |
| **Desktop Runtime** | Tauri 2 (Rust + WebKit/WebView2) | Performa tinggi, hemat memori (~35MB), tanpa Chromium bloat |
| **Mobile Runtime** | Capacitor 8 | Native bridge untuk Android & iOS |
| **Database Lokal** | Dexie.js (IndexedDB) | Relational indexing offline yang andal dan cepat |
| **Icons & Media** | Lucide React + Canvas Confetti | Ikonografi modern dan mikro-interaksi responsif |
| **Build & Bundler** | Vite 8 + Rolldown | HMR instan dan build bundle teroptimasi |

---

## 🚀 Cara Menjalankan Secara Lokal

### Prasyarat:
- [Node.js](https://nodejs.org/) versi 18 atau lebih baru
- [Rust & Cargo](https://rustup.rs/) (jika ingin menjalankan Tauri Desktop)

### 1. Clone Repository & Install Dependencies:
```bash
git clone https://github.com/fadhilakbar/SimpanApp.git
cd SimpanApp
npm install
```

### 2. Jalankan Mode Web (Browser):
```bash
npm run dev
```
Buka `http://localhost:5173` di browser Anda.

### 3. Jalankan Mode Desktop (Tauri Dev):
```bash
npm run desktop:dev
```

---

## 🖥️ Build Desktop (macOS & Windows)

### Melalui GitHub Actions (Otomatis & Disarankan):
Repository ini sudah dikonfigurasi dengan CI/CD otomatis di `.github/workflows/desktop-build.yml`.
Setiap kali ada push ke branch `main`, GitHub Actions akan otomatis menghasilkan:
- 🍏 **macOS**: `SIMPAN_0.1.0_aarch64.dmg` & `SIMPAN.app`
- 🪟 **Windows**: `SIMPAN_0.1.0_x64-setup.exe` (NSIS) & `SIMPAN_0.1.0_x64_en-US.msi` (WiX)

Unduh hasilnya langsung di tab **[Actions > Artifacts](https://github.com/fadhilakbar/SimpanApp/actions)**.

---

### Build Manual di Komputer Sendiri:

#### 🍏 Di macOS:
```bash
npm run desktop:build:mac
# Hasil DMG tersimpan di: src-tauri/target/release/bundle/dmg/
```

#### 🪟 Di Windows:
Cukup jalankan script batch 1-klik yang sudah disediakan:
```cmd
scripts\build-windows.bat
```
*Atau via PowerShell:*
```powershell
.\scripts\build-windows.ps1
```
*Atau via NPM:*
```bash
npm run desktop:build:windows
```
File installer `.exe` dan `.msi` akan otomatis terkumpul di folder `build-desktop/`.

---

## 📱 Build Mobile (Android & iOS)

### 🤖 Android:
```bash
# Build APK rilis mandiri
./scripts/build-apk.sh

# Atau buka di Android Studio
npx cap open android
```

### 🍏 iOS:
```bash
# Build IPA rilis
./scripts/build-ipa.sh

# Atau buka di Xcode
npx cap open ios
```

---

## 📁 Struktur Direktori

```text
SimpanApp/
├── .github/workflows/         # CI/CD pipeline (Desktop automated build)
├── android/                   # Konfigurasi native Android (Capacitor)
├── ios/                       # Konfigurasi native iOS (Xcode)
├── src-tauri/                 # Core Desktop Backend (Rust, Tauri v2)
│   ├── src/main.rs            # Entrypoint Rust aplikasi desktop
│   ├── tauri.conf.json        # Pengaturan window, bundle, dan icon desktop
│   ├── Info.plist             # Izin WKWebView mikrofon & kamera macOS
│   └── Entitlements.plist     # Hardware entitlements macOS
├── scripts/                   # Skrip otomatis build (Windows, Android, iOS)
│   ├── build-windows.bat      # 1-klik build installer Windows
│   ├── build-windows.ps1      # PowerShell build installer Windows
│   ├── build-apk.sh           # Build Android APK
│   └── build-ipa.sh           # Build iOS IPA
├── src/                       # Frontend Source Code (React 19 + TS)
│   ├── components/            # Komponen modular (capture, record, navigation, ui)
│   ├── views/                 # Halaman utama (Home, Timeline, Collections, Search, Profile)
│   ├── services/              # Layanan logika bisnis (DB, OCR, Audio, Ekspor, AI)
│   ├── types/                 # Definisi tipe TypeScript arsip & dokumen
│   └── utils/                 # Utility helpers (haptics, formatting, platform detection)
├── package.json
└── vite.config.ts
```

---

## 📄 Lisensi

Proyek ini didistribusikan di bawah lisensi **MIT License**. Lihat berkas [LICENSE](LICENSE) untuk informasi lebih lanjut.

---

<div align="center">
  Dibuat dengan ❤️ untuk kemudahan dan keamanan pengarsipan digital mandiri.
</div>
