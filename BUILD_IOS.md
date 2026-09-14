# Build iOS (IPA) — SIMPAN

Panduan build project SIMPAN jadi file .ipa untuk submit ke App Store, pakai Xcode GUI.

## Prasyarat

- macOS + Xcode terinstall (cek: `xcodebuild -version`)
- Akun **Apple Developer Program** aktif ($99/tahun) — https://developer.apple.com
- Node.js + npm terinstall

## 1. Build web assets

```bash
cd simpan-app
npm install
npm run build
```

Ini menghasilkan folder `dist/` (hasil build Vite + React).

## 2. Sync ke project iOS (Capacitor)

```bash
npx cap sync ios
```

Command ini nge-copy `dist/` ke `ios/App/App/public` dan update dependency native.
Project ini pakai **Swift Package Manager** untuk plugin Capacitor, jadi **tidak perlu** `pod install`.

## 3. Buka project di Xcode

```bash
npx cap open ios
```

## 4. Set Signing & Team

- Klik project **App** di navigator kiri → target **App** → tab **Signing & Capabilities**
- Centang **Automatically manage signing**
- Pilih **Team** = akun Apple Developer lo
- Pastikan **Bundle Identifier** = `com.kynandev.simpan`
  - Kalau App ID ini belum terdaftar di developer.apple.com, Xcode biasanya bisa auto-create asal Team sudah dipilih

## 5. Set versi & build number

Masih di tab **General**:
- **Version** → misal `1.0.0`
- **Build** → misal `1` (harus naik tiap kali upload ulang ke App Store Connect)

## 6. Pilih target device

Di toolbar atas Xcode, ganti device dari simulator ke **Any iOS Device (arm64)**.
Archive **tidak bisa** dibuat kalau target masih simulator.

## 7. Archive

- Menu **Product → Archive**
- Tunggu proses build selesai
- Jendela **Organizer** otomatis muncul menampilkan hasil archive

## 8. Distribute

Di Organizer, pilih archive-nya → klik **Distribute App**:

- **App Store Connect → Upload** — langsung upload ke App Store Connect (paling umum)
- **App Store Connect → Export** — kalau mau file `.ipa` fisik dulu sebelum upload manual

Ikuti wizard, biarkan default "Automatically manage signing".

## 9. App Store Connect

1. Buka https://appstoreconnect.apple.com
2. Buat App baru (kalau belum ada) dengan Bundle ID `com.kynandev.simpan`
3. Tunggu proses processing build (~10-30 menit)
4. Build muncul di tab **TestFlight**, atau langsung dipasang ke versi App Store yang sedang disiapkan

## Troubleshooting

| Masalah | Solusi |
|---|---|
| "No account for team" | Login Apple ID di Xcode → Settings → Accounts |
| Bundle ID conflict | Ganti `appId` di `capacitor.config.ts`, lalu `npx cap sync ios` ulang |
| Archive disabled (abu-abu) | Pastikan device target = "Any iOS Device (arm64)", bukan simulator |
| Build number sudah dipakai | Naikkan angka **Build** di tab General sebelum archive ulang |
