# Review Notes & Status Implementasi Aplikasi SIMPAN

Dokumen audit dan checklist review aplikasi setelah proses build, perbaikan bug, pemurnian OCR, penambahan mode CamScanner, dan pengamanan data lokal.

---

## 🚨 Critical / Blocker — Audit & Status

- [x] **Data yang belum tersimpan harus aman saat aplikasi ditutup / crash / background**
  - *Implementasi*: Draft aktif di-backup secara real-time ke `localStorage` (`simpan_active_draft_backup`). Saat aplikasi dibuka kembali setelah ditutup paksa atau crash, draft otomatis dipulihkan disertai notifikasi *toast info*.
- [x] **Konfirmasi sebelum menghapus data agar tidak ada accidental delete**
  - *Implementasi*: Dialog SweetAlert (`showConfirm`) wajib muncul sebelum memindahkan berkas ke Sampah, menghapus permanen, maupun mengosongkan folder Sampah.
- [x] **Validasi data wajib sebelum data bisa disimpan**
  - *Implementasi*: Judul dokumen wajib diisi (`isTitleValid`) di `DraftRecordReviewModal` dan `NoteModal`. Tombol simpan dinonaktifkan jika field belum memenuhi syarat.
- [x] **Duplicate detection saat data yang sama ditambahkan berkali-kali**
  - *Implementasi*: `handleConfirmDraftSave` otomatis memindai kueri teks dokumen (`rawText`), ringkasan, atau judul dan kategori yang identik. Jika terdeteksi duplikasi, pengguna diberikan peringatan konfirmasi sebelum melanjutkan.
- [x] **Permission handling kamera / microphone harus jelas ketika permission ditolak**
  - *Implementasi*: Pesan instruksi ramah tampil jika izin kamera/mikrofon ditolak, lengkap dengan opsi *fallback* (tombol unggah berkas / galeri untuk kamera).
- [x] **Jika OCR gagal membaca, user harus tetap bisa input/edit manual**
  - *Implementasi*: Semua hasil OCR masuk ke `DraftRecordReviewModal` dan dapat diketik/diedit manual tanpa hambatan.
- [x] **Jangan sampai data hasil OCR berubah tanpa user sadari**
  - *Implementasi*: Seluruh mock/halusinasi otomatis dihapus. Nilai `rawText` disimpan apa adanya sesuai hasil pembacaan nyata.
- [x] **Session/lock state harus konsisten ketika app masuk background → foreground**
  - *Implementasi*: Event listener ganda (`visibilitychange` di browser & `appStateChange` di Capacitor) langsung mengunci aplikasi saat berpindah jendela / background.
- [x] **App harus tetap usable tanpa internet dan tidak muncul error seolah-olah membutuhkan koneksi**
  - *Implementasi*: Berbasis Dexie IndexedDB dan aset Tesseract lokal (`/tesseract`) tanpa dependensi jaringan eksternal.

---

## ⚠️ Bug & Perbaikan — Audit & Status

- [x] **Keyboard tidak menutupi field/input saat tambah/edit**
  - *Implementasi*: Area formulir modal menggunakan kontainer fleksibel dengan `overflow-y-auto` dan ruang bawah (*padding bottom*) yang aman untuk virtual keyboard.
- [x] **Focus cursor setelah OCR/edit harus berada di field yang benar**
  - *Implementasi*: Auto-focus terarah ke field Judul atau teks saat modal dibuka.
- [x] **Loading state harus jelas saat proses OCR / AI / transcript**
  - *Implementasi*: `ProcessingModal` dan `BrandLoader` menampilkan tahapan progres ("Mendeteksi teks...", "Mengekstrak informasi...", dsb.).
- [x] **Double tap tombol simpan tidak membuat duplicate data**
  - *Implementasi*: Flag `isSaving` dan *disabled state* langsung mengunci tombol setelah klik pertama.
- [x] **Tombol back Android dan gesture back iOS punya behavior yang konsisten**
  - *Implementasi*: Menggunakan hook `useSwipeBack` terstandarisasi yang otomatis dinonaktifkan saat mode edit aktif atau ada foto yang belum disimpan.
- [x] **State halaman tidak reset ketika berpindah tab**
  - *Implementasi*: State catatan, filter kategori, dan pencarian tersimpan di state induk (`App.tsx` & Dexie cache).
- [x] **Data tetap muncul setelah app di-background-kan lalu dibuka kembali**
  - *Implementasi*: Database persisten Dexie IndexedDB menjamin data tersimpan permanen di storage perangkat.
- [x] **Empty state ketika belum ada data**
  - *Implementasi*: Menampilkan `EmptyState` dengan ilustrasi elegan dan tombol aksi jelas (CTA).
- [x] **Error state ketika OCR gagal / audio gagal diproses**
  - *Implementasi*: Banner error dengan warna kontras dan opsi coba lagi / pilih berkas manual.
- [x] **Long text tidak membuat layout rusak / overflow**
  - *Implementasi*: Menggunakan utilitas `break-words`, `truncate`, dan pembatasan baris CSS (`line-clamp`).
- [x] **Decimal, currency, tanggal, dan angka tidak berubah format secara tidak sengaja**
  - *Implementasi*: Menggunakan fungsi `formatRupiah`, `parseCurrencyNumber`, `formatDeviceDate`, dan `formatDeviceTime`.
- [x] **Search dengan keyword sebagian tetap menemukan data yang relevan**
  - *Implementasi*: Algoritma pencarian mencakup pencocokan parsial (*substring*) pada judul, raw text, kategori, tag, dan nama item struk belanja.

---

## 🎨 UI / UX — Audit & Status

- [x] **Ukuran font dan spacing dibuat lebih nyaman untuk penggunaan satu tangan**
  - *Implementasi*: TabBar dan CaptureSheet menempel di bagian bawah layar (*bottom-anchored*) untuk jangkauan ibu jari yang mudah.
- [x] **Area tap tombol/icon cukup besar**
  - *Implementasi*: Ukuran target sentuh minimal 44x44 piksel dengan padding yang memadai.
- [x] **Kontras text terhadap background cukup jelas**
  - *Implementasi*: Rasio kontras tinggi menggunakan palet emerald tua (`#165a4c`), teks `stone-900`, dan latar belakang lembut `#FAF9F6`.
- [x] **State tombol disabled / loading / active terlihat jelas**
  - *Implementasi*: Transisi `active:scale-95`, `cursor-not-allowed`, dan indikator animasi spinner.
- [x] **Ada feedback visual setelah berhasil save/edit/delete**
  - *Implementasi*: Notifikasi *toast*, getaran haptik (*Capacitor Haptics*), dan pop-up `SaveSuccessModal`.
- [x] **Toast/snackbar tidak menutupi elemen penting**
  - *Implementasi*: `ToastProvider` terposisi di bagian tengah atas dengan jeda otomatis.
- [x] **Empty state punya CTA yang jelas, bukan cuma tulisan "Belum ada data"**
  - *Implementasi*: Tombol "Pindai Dokumen Sekarang", "Tulis Catatan", atau "Eksplor Kategori".
- [x] **Form tambah/edit punya hierarki field yang jelas**
  - *Implementasi*: Label jelas, pratinjau thumbnail, pemilihan kategori berbasis pill, dan tabel item belanja terstruktur.
- [x] **Camera/OCR screen menjelaskan apa yang harus diarahkan user**
  - *Implementasi*: Bingkai pemandu 4 sudut (`┌ ┐ └ ┘`), garis laser scanner bergerak, dan teks panduan "Posisikan Dokumen / Struk Dalam Bingkai".
- [x] **Hasil OCR menampilkan mana data hasil scan dan mana yang bisa diedit**
  - *Implementasi*: Pemisahan jelas antara tab pratinjau dokumen asli, daftar item terstruktur, dan editor teks mentah (`rawText`).
- [x] **Transisi antar halaman tidak terasa patah / terlalu lambat**
  - *Implementasi*: Transisi halus menggunakan `framer-motion` dengan kurva bezier optimal.
- [x] **TabBar dan icon tetap nyaman digunakan di berbagai ukuran device**
  - *Implementasi*: Responsive layout dengan dukungan `safe-area-inset-bottom`.

---

## 🔍 Khusus Fitur OCR & Mode CamScanner

- [x] **Fitur CamScanner Camera Mode** (🪄 *Magic Color*, 📄 *Hitam Putih*, 🔘 *Grayscale*, 📷 *Foto Asli*)
  - *Magic Color*: Memutihkan kertas berbayang & mempertajam tinta teks tanpa merusak stempel/warna tanda tangan.
  - *Hitam Putih*: Binarisasi kontras tinggi dokumen resmi.
  - *On-the-Fly Switcher*: Pengguna bisa langsung menukar filter sesudah memotret.
- [x] **OCR teks normal berhasil**
- [x] **OCR teks kecil berhasil** (dengan canvas preprocessing & contrast stretching)
- [x] **OCR kondisi miring & pencahayaan rendah** (terbantu oleh filter pencerah kertas CamScanner)
- [x] **OCR bahasa Indonesia** (dikonfigurasi dengan kamus bahasa lokal)
- [x] **OCR angka desimal, tanggal, nama toko, dan nomor transaksi**
- [x] **OCR struk dengan banyak item & struk panjang**
- [x] **OCR tidak mengarang data yang tidak terbaca** (penghapusan mockup tiruan)
- [x] **Data yang confidence-nya rendah tetap bisa dikoreksi manual**
- [x] **Hasil scan tidak otomatis dianggap final sebelum user melakukan konfirmasi**
- [x] **Mempertahankan daftar item struk belanja sebagai data terstruktur (`receiptItems`)**
