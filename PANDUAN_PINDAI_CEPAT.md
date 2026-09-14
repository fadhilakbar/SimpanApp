# 📑 Panduan Trik Pindai Cepat Multi-Dokumen (iOS & Android) — SIMPAN

Panduan praktis untuk memilih, memindai, dan mengarsipkan banyak dokumen sekaligus (`.pdf`, `.docx`, `.xlsx`, `.csv`, `.txt`, `.pptx`) ke dalam aplikasi **SIMPAN**.

---

## 🔒 Mengapa Tidak Bisa "Auto-Scan" Otomatis Seluruh File HP?

Pada sistem operasi modern:
* **Apple iOS (iPhone/iPad)** menerapkan **Sandboxing Privasi**.
* **Google Android (Android 11+)** menerapkan **Scoped Storage**.

Kedua sistem ini **melarang keras** aplikasi pihak ketiga untuk membaca atau merayapi seluruh isi memori internal secara diam-diam tanpa persetujuan pemilik perangkat. Ini adalah fitur keamanan resmi dari Apple dan Google agar dokumen sensitif pengguna tidak disadap oleh aplikasi apa pun.

Sebagai gantinya, SIMPAN menyediakan fitur **Pindai Cepat File** yang terhubung langsung ke pemilih berkas native sistem, lalu menyajikannya dalam bentuk **Checklist Interaktif** di dalam aplikasi.

---

## 🍏 Trik Multi-Select di iPhone / iPad (iOS)

Pada aplikasi **Files** di iOS, secara *default* mengetuk file akan langsung membukanya. Ikuti trik berikut untuk memilih puluhan file sekaligus:

### Langkah-langkah:
1. Di aplikasi SIMPAN, buka tombol **`+` (Menu Tambah)** lalu ketuk kartu **"Pindai Cepat File"**.
2. Jendela **Apple Files** akan langsung terbuka.
3. Ketuk tombol **titik tiga (`...`)** di pojok kanan atas layar Files.
4. Pilih menu **"Pilih"** (atau **"Select"**).
5. **Trik Cepat**: 
   * Anda bisa mengetuk satu per satu file yang ingin diimpor.
   * Atau **geser jari ke bawah (drag)** di sepanjang daftar file untuk mencentang banyak file dalam 1 detik!
6. Ketuk tombol **"Buka"** (atau **"Open"**) di kanan atas layar.
7. 🎉 **Selesai!** Seluruh dokumen tersebut langsung masuk ke modal **Checklist SIMPAN**.
8. Ceklis dokumen yang ingin disimpan, lalu tekan tombol **"Arsipkan (X Berkas Terpilih)"**.

---

## 🤖 Trik Multi-Select di Android (Samsung, Xiaomi, Oppo, Vivo, Pixel, dll)

Pada Android, pemilih berkas sistem menggunakan *Android Storage Access Framework (DocumentsUI)*.

### Kenapa Sebelumnya Malah "Pindah Ceklis" (Radio Button)?
Pada Android, jika aplikasi membatasi format secara kaku (misal diawali `.pdf`), file picker Android menganggap permintaan tersebut sebagai pemilihan file tunggal (*single-choice / radio button*). Akibatnya, saat mengetuk file lain, tanda centangnya malah berpindah.

**Sekarang masalah ini sudah diperbaiki 100%:**
* Menu **"Pindai Cepat File"** maupun **"PDF / File"** kini diaktifkan dengan mode `*/*` dan `multiple=true`.
* Pengelola berkas Android kini **resmi membuka mode Multi-Select dengan kotak centang (checkbox)**.

### Cara Memilih Banyak Berkas di Android:
1. Di aplikasi SIMPAN, buka menu **`+`** lalu pilih **"Pindai Cepat File"** atau **"PDF / File"**.
2. Pengelola berkas sistem Android (*Files / Dokumen / Unduhan*) akan terbuka.
3. Anda sekarang bisa:
   * **Langsung mengetuk kotak centang (checkbox)** di setiap berkas.
   * Atau **Tekan dan tahan (Long-press)** file pertama hingga muncul tanda centang biru, lalu ketuk file-file lainnya.
   * Atau ketuk tombol **titik tiga (`⋮`)** di pojok kanan atas layar ➔ pilih **"Pilih Semua" (Select All)** untuk memilih semua file dalam folder.
4. Tekan tombol **"Pilih"** (atau tanda centang **`✓` / "Buka"**) di bagian atas layar.
5. 🎉 Seluruh file langsung tampil di antarmuka **Checklist SIMPAN** untuk difinalisasi sebelum diarsipkan!

---

## ✨ Fitur Cerdas di Modal Checklist SIMPAN

Saat berkas berhasil diimpor ke modal checklist:
* **Checkbox per Berkas**: Anda bebas mencentang atau menghapus centang berkas mana pun sebelum disimpan permanen.
* **Tombol Pilih Semua / Batal Pilih**: Menghemat waktu ketika mengimpor ratusan berkas.
* **Pembersihan Judul Otomatis**: Nama file berantakan seperti `Laporan_Keuangan_Final_Rev2.pdf` otomatis dibersihkan menjadi `Laporan Keuangan Final Rev2`.
* **Deteksi Kategori Pintar**: Berkas Excel otomatis dikategorikan ke **Keuangan**, berkas Word ke **Pekerjaan**, dan sebagainya.
* **100% Offline**: Seluruh file disimpan di memori internal perangkat (Dexie IndexedDB & Native Filesystem) tanpa pernah diunggah ke server pihak ketiga.

---

> 💡 **Tip:** Anda juga bisa menggunakan fitur **Drag & Drop** jika menjalankan SIMPAN di tablet, iPad (Split View), atau laptop/desktop!
