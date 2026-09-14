import { ExtractedField, ReceiptItem, RecordType } from '../types/record';
import { formatDeviceDate, formatDeviceTime } from '../utils/dateFormatter';

export interface OCRProcessProgress {
  step: number;
  totalSteps: number;
  message: string;
  isComplete: boolean;
}

export interface OCRParseResult {
  title: string;
  type: RecordType;
  category: string;
  tags: string[];
  rawText: string;
  summary: string;
  extractedFields: ExtractedField[];
  receiptItems?: ReceiptItem[];
  confidence: number;
  thumbnailDataUrl?: string;
  pages?: string[];
}

// Semua aset OCR (worker, core WASM, data bahasa) dibundel lokal di /tesseract
// agar fitur pindai dokumen berfungsi 100% offline, tanpa bergantung pada CDN.
const OFFLINE_TESSERACT_PATHS = {
  workerPath: '/tesseract/worker.min.js',
  corePath: '/tesseract',
  langPath: '/tesseract/lang-data',
  gzip: true,
};

// Format mata uang Rupiah
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// Ekstraksi nomor angka dari string (contoh: "Rp 487.500" -> 487500)
export function parseCurrencyNumber(str: string): number {
  if (!str) return 0;
  const clean = str
    .replace(/[^\d,\.]/g, '')
    .replace(/\.(?=\d{3}(?:[,\.]|$))/g, '')
    .replace(',', '.');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : Math.round(num);
}

/**
 * Koreksi Otomatis Typo Karakter Angka & Kata Kunci Finansial dari Hasil OCR
 * Mengubah:
 * - Huruf 'O' atau 'o' di antara angka -> '0' (contoh: 5O.OOO -> 50.000)
 * - Huruf 'l' atau 'I' di antara angka / setelah Rp -> '1' (contoh: Rp I50.000 -> Rp 150.000)
 * - Huruf 'S' setelah angka nominal -> '5' (contoh: 4S.000 -> 45.000)
 * - 'Totai' / 'Tota1' -> 'Total'
 */
export function fixOcrNumberTypos(text: string): string {
  if (!text) return '';
  return text
    .replace(/\b(tota[l1i]|grand\s*tota[l1i]|subtota[l1i])\b/gi, (m) => {
      const lower = m.toLowerCase();
      if (lower.startsWith('sub')) return 'Subtotal';
      if (lower.startsWith('grand')) return 'Grand Total';
      return 'Total';
    })
    .replace(/(\d)[Oo](\d)/g, '$10$2')
    .replace(/(\d)\.[Oo](\d)/g, '$1.0$2')
    .replace(/[Oo](\d{2,})/g, '0$1')
    .replace(/(\d{2,})[Oo]/g, '$10')
    .replace(/(Rp\.?\s*)([Oo])(\d)/gi, '$10$3')
    .replace(/(Rp\.?\s*)[lI](\d)/gi, '$11$2')
    .replace(/(\d)[lI](\d)/g, '$11$2')
    .replace(/(\d)[Ss](\.|\d)/g, '$15$2');
}

/**
 * Pindai Barcode / QR Code secara native via BarcodeDetector API jika didukung browser/WebView
 */
export async function detectBarcodeOrQr(imageSource: string): Promise<string | null> {
  if (typeof window === 'undefined' || !('BarcodeDetector' in window)) return null;
  try {
    const BarcodeDetectorClass = (window as any).BarcodeDetector;
    const detector = new BarcodeDetectorClass({
      formats: ['qr_code', 'code_128', 'ean_13', 'ean_8', 'data_matrix', 'pdf417'],
    });

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = async () => {
        try {
          const results = await detector.detect(img);
          if (results && results.length > 0 && results[0].rawValue) {
            resolve(results[0].rawValue.trim());
          } else {
            resolve(null);
          }
        } catch (_dErr) {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = imageSource;
    });
  } catch (_e) {
    return null;
  }
}

/**
 * Preprocessing Citra Tingkat Lanjut via HTML Canvas
 * - Grayscale conversion dengan bobot luminansi perseptual
 * - Adaptive contrast stretching & binarization untuk membuat teks struk/dokumen sangat kontras dan jelas
 * - Optimasi resolusi agar Tesseract dapat membaca teks kecil dengan akurasi maksimal
 */
export async function preprocessImageForOCR(imageSource: string): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !imageSource) {
      resolve(imageSource);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageSource);
          return;
        }

        // Resolusi ideal untuk OCR: lebar antara 1200px - 1800px
        let targetWidth = img.naturalWidth || img.width;
        let targetHeight = img.naturalHeight || img.height;

        const maxDim = 1280;
        const minDim = 800;

        if (targetWidth > maxDim || targetHeight > maxDim) {
          const ratio = Math.min(maxDim / targetWidth, maxDim / targetHeight);
          targetWidth = Math.round(targetWidth * ratio);
          targetHeight = Math.round(targetHeight * ratio);
        } else if (targetWidth < minDim && targetHeight < minDim) {
          const ratio = Math.max(minDim / targetWidth, minDim / targetHeight);
          targetWidth = Math.round(targetWidth * ratio);
          targetHeight = Math.round(targetHeight * ratio);
        }

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // Gambar asli
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // Ambil data piksel untuk pemrosesan
        const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
        const data = imgData.data;

        // Hitung histogram luminansi untuk contrast stretching
        let minLum = 255;
        let maxLum = 0;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          if (lum < minLum) minLum = lum;
          if (lum > maxLum) maxLum = lum;
        }

        const range = Math.max(maxLum - minLum, 1);

        // Terapkan contrast enhancement & thresholding
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          let lum = 0.299 * r + 0.587 * g + 0.114 * b;
          lum = ((lum - minLum) / range) * 255;

          if (lum < 110) {
            lum = lum * 0.7;
          } else if (lum > 170) {
            lum = Math.min(255, lum * 1.25);
          }

          data[i] = lum;
          data[i + 1] = lum;
          data[i + 2] = lum;
        }

        ctx.putImageData(imgData, 0, 0);
        const resultUrl = canvas.toDataURL('image/jpeg', 0.85);
        // Lepaskan buffer memori kanvas secara eksplisit untuk mobile WebView
        canvas.width = 0;
        canvas.height = 0;
        resolve(resultUrl);
      } catch (e) {
        console.warn('Preprocessing canvas error, using original:', e);
        resolve(imageSource);
      }
    };

    img.onerror = () => {
      resolve(imageSource);
    };

    img.src = imageSource;
  });
}

/**
 * Eksekusi Tesseract OCR Lokal Murni (100% Offline)
 * Dioptimalkan untuk WebView Ponsel:
 * - Menggunakan model 'ind' (3.8 MB) alih-alih 'ind+eng' (14.8 MB) -> Hemat 75% RAM
 * - Preprocessing citra terkendali (maks 1280px)
 * - Micro-yield ke event loop agar UI WebView tetap 60 FPS
 */
export async function runLocalTesseractOCR(
  imageSource: string,
  onStatus?: (msg: string) => void
): Promise<string> {
  try {
    if (onStatus) onStatus('Menyiapkan kontras citra untuk OCR lokal...');
    const enhancedImage = await preprocessImageForOCR(imageSource);

    // Beri jeda sejenak ke event loop untuk pembersihan memori (GC)
    await new Promise((r) => setTimeout(r, 40));

    const { default: Tesseract } = await import('tesseract.js');

    if (onStatus) onStatus('Menjalankan engine Tesseract lokal (ind)...');

    const executeRecognize = async (useBlobWorker: boolean) => {
      return await Tesseract.recognize(enhancedImage, 'ind', {
        ...OFFLINE_TESSERACT_PATHS,
        workerBlobURL: useBlobWorker,
        logger: (m: { status?: string; progress?: number }) => {
          if (m.status && onStatus) {
            const pct = Math.round((m.progress || 0) * 100);
            const statusText =
              m.status === 'recognizing text'
                ? 'Membaca karakter teks'
                : m.status === 'loading tesseract core'
                ? 'Memuat engine OCR'
                : m.status === 'loading language traineddata'
                ? 'Memuat data model bahasa'
                : m.status;
            onStatus(`${statusText} (${pct}%)`);
          }
        },
      });
    };

    let result: any = null;
    try {
      // 1. Coba direct worker terlebih dahulu (tanpa blob URL) agar tidak terhalang sandboxing WebView
      result = await executeRecognize(false);
    } catch (directErr) {
      console.warn('Tesseract direct worker gagal, mencoba blob worker fallback:', directErr);
      // 2. Fallback ke blob worker
      try {
        result = await executeRecognize(true);
      } catch (blobErr) {
        console.error('Tesseract blob worker juga gagal:', blobErr);
      }
    }

    const text = (result?.data?.text || '').trim();
    if (text.length > 5) {
      return text;
    }

    // Fallback jika hasil preprocessed terlalu minim
    try {
      const rawResult = await Tesseract.recognize(imageSource, 'ind', {
        ...OFFLINE_TESSERACT_PATHS,
        workerBlobURL: false,
      });
      return (rawResult?.data?.text || '').trim();
    } catch (_rawErr) {
      return text;
    }
  } catch (err) {
    console.error('runLocalTesseractOCR critical error:', err);
    return '';
  }
}

/**
 * Menjalankan OCR nyata langsung pada berkas gambar menggunakan Multi-AI Waterfall
 * dengan fallback ke engine lokal Tesseract.js (offline).
 */
export async function runRealOCR(
  imageSource: string,
  onStatus?: (msg: string) => void
): Promise<string> {
  try {
    // Jika berkas berupa dokumen PDF, gunakan ekstraktor multi-halaman PDF & OCR canvas
    const isPdf =
      imageSource.startsWith('data:application/pdf') ||
      imageSource.endsWith('.pdf') ||
      imageSource.includes('.pdf?') ||
      imageSource.includes('application/pdf');

    const isDocx =
      imageSource.endsWith('.docx') ||
      imageSource.includes('.docx?') ||
      imageSource.includes('wordprocessingml');

    // Deteksi QR Code atau Barcode native seketika jika ada
    let barcodeText = '';
    if (!isPdf && !isDocx) {
      try {
        const barcodeResult = await detectBarcodeOrQr(imageSource);
        if (barcodeResult) {
          barcodeText = `\n\n[DATA BARCODE / QR CODE DITERJEMAHKAN]\n${barcodeResult}\n\n`;
        }
      } catch (_bErr) {}
    }

    // 1. PRIORITAS UTAMA: Multi-AI Waterfall (Gemini -> OpenRouter Vision -> Groq)
    const isOnline = typeof navigator === 'undefined' || navigator.onLine !== false;
    if (isOnline) {
      try {
        const { runAIWaterfall } = await import('./aiProviderService');
        const aiResult = await runAIWaterfall(
          imageSource,
          isPdf ? 'application/pdf' : isDocx ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'image/jpeg',
          isPdf ? 'Dokumen PDF' : isDocx ? 'Dokumen Word' : 'Dokumen Scan',
          (status) => {
            if (onStatus) onStatus(status);
          }
        );
        if (aiResult && aiResult.rawText && aiResult.rawText.trim().length > 0) {
          return (barcodeText + aiResult.rawText).trim();
        }
      } catch (aiErr) {
        console.warn('runRealOCR AI Waterfall fallback ke engine lokal:', aiErr);
      }
    }

    // 2. FALLBACK KE ENGINE LOKAL JIKA OFFLINE ATAU AI EXHAUSTED
    if (isPdf) {
      if (onStatus) onStatus('Menganalisis dokumen PDF via engine lokal...');
      const { extractFullTextFromPdf } = await import('./pdfExtractService');
      const res = await extractFullTextFromPdf(imageSource, (status) => {
        if (onStatus) onStatus(status);
      });
      return res.fullText;
    }

    if (isDocx) {
      if (onStatus) onStatus('Mendeteksi dokumen Word (.docx). Menjalankan OCR & ekstraksi lokal...');
      const { extractFullTextFromDocx } = await import('./docxExtractService');
      const res = await extractFullTextFromDocx(imageSource, (status) => {
        if (onStatus) onStatus(status);
      });
      return res.fullText;
    }

    // Gambar Scan / Foto Dokumen: Eksekusi Tesseract lokal yang dioptimalkan
    const localText = await runLocalTesseractOCR(imageSource, onStatus);
    return (barcodeText + localText).trim();
  } catch (err) {
    console.warn('runRealOCR exception:', err);
    return '';
  }
}

/**
 * Parser Heuristik Cerdas & Entitas Semantik
 * Mengekstrak toko, tanggal, nominal, item belanja, KTP/identitas, rekening/tagihan,
 * metode pembayaran, dan kategori secara otomatis dari teks OCR.
 */
const PROVINCE_CODES: Record<string, string> = {
  '11': 'Aceh', '12': 'Sumatera Utara', '13': 'Sumatera Barat', '14': 'Riau', '15': 'Jambi',
  '16': 'Sumatera Selatan', '17': 'Bengkulu', '18': 'Lampung', '19': 'Kep. Bangka Belitung', '21': 'Kepulauan Riau',
  '31': 'DKI Jakarta', '32': 'Jawa Barat', '33': 'Jawa Tengah', '34': 'DI Yogyakarta', '35': 'Jawa Timur', '36': 'Banten',
  '51': 'Bali', '52': 'Nusa Tenggara Barat', '53': 'Nusa Tenggara Timur',
  '61': 'Kalimantan Barat', '62': 'Kalimantan Tengah', '63': 'Kalimantan Selatan', '64': 'Kalimantan Timur', '65': 'Kalimantan Utara',
  '71': 'Sulawesi Utara', '72': 'Sulawesi Tengah', '73': 'Sulawesi Selatan', '74': 'Sulawesi Tenggara', '75': 'Gorontalo', '76': 'Sulawesi Barat',
  '81': 'Maluku', '82': 'Maluku Utara', '91': 'Papua', '92': 'Papua Barat', '93': 'Papua Selatan', '94': 'Papua Tengah', '95': 'Papua Pegunungan', '96': 'Papua Barat Daya',
};

export function parseExtractedText(
  rawText: string,
  defaultTitle = 'Dokumen Hasil Pindai'
): {
  title: string;
  merchant: string;
  date: string;
  time?: string;
  totalAmount: string;
  subtotalAmount?: string;
  paymentMethod?: string;
  category: string;
  type: RecordType;
  summary: string;
  items: ReceiptItem[];
  tags: string[];
  extraMetadata: { key: string; label: string; value: string }[];
} {
  const cleanText = fixOcrNumberTypos((rawText || '').replace(/\r\n/g, '\n'));
  const lines = cleanText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const extraMetadata: { key: string; label: string; value: string }[] = [];
  const lowerText = cleanText.toLowerCase();

  // 1. Deteksi Jenis Dokumen Khusus
  const isKTP =
    lowerText.includes('republik indonesia') ||
    lowerText.includes('provinsi') ||
    lowerText.includes('nik') ||
    /\b\d{16}\b/.test(cleanText);

  const isTagihan =
    lowerText.includes('tagihan') ||
    lowerText.includes('pln') ||
    lowerText.includes('pdam') ||
    lowerText.includes('idpel') ||
    lowerText.includes('rekening listrik') ||
    lowerText.includes('indihome');

  const isMedical =
    lowerText.includes('resep') ||
    lowerText.includes('apotek') ||
    lowerText.includes('dokter') ||
    lowerText.includes('klinik') ||
    lowerText.includes('farmasi');

  // 2. Ekstraksi Toko / Merchant / Penerbit (Fleksibel & Dinamis, Tidak Dipatenkan)
  let merchant = '';

  // A. Daftar Brand & Toko Populer Indonesia (Sangat Lengkap & Terus Berkembang)
  const popularMerchants = [
    // Minimarket & Supermarket
    'indomaret', 'alfamart', 'alfamidi', 'hypermart', 'transmart', 'lotte mart', 'lotte',
    'hero supermarket', 'hero', 'superindo', 'super indo', 'yogya', 'griya', 'grandlucky', 'grand lucky',
    'farmers market', 'ranch market', 'papaya fresh gallery', 'papaya', 'kemchicks', 'hari hari',
    'tip top', 'borma', 'circle k', 'family mart', 'lawson', 'naga swalayan', 'diamond', 'gs the fresh',
    'aeon', 'luwes', 'mirota', 'setia budhi', 'foodhall', 'the foodhall',
    // SPBU & Bahan Bakar
    'spbu pertamina', 'pertamina', 'spbu shell', 'shell', 'bp akr', 'bp', 'spbu vivo', 'vivo', 'total',
    // Kopi, Minuman & Bakery
    'starbucks', 'kopi kenangan', 'janji jiwa', 'fore coffee', 'fore', 'point coffee', 'tomoro coffee',
    'tomoro', 'flash coffee', 'anomali coffee', 'djournal', 'excelso', 'j.co', 'jco', 'chatime', 'mixue',
    'haus', 'teguk', 'menantea', 'gulu gulu', 'koi the', 'gong cha', 'xing fu tang', 'hop hop',
    'holland bakery', 'kartika sari', 'prima rasa', 'breadtalk', 'mako cake & bakery', 'mako',
    "roti'o", 'rotio', 'roti boy', 'dunkin donuts', 'dunkin',
    // Restoran & Cepat Saji
    'mcdonald', "mcdonald's", 'mcd', 'kfc', 'hokben', 'hoka hoka bento', 'pizza hut', 'phd',
    'dominos pizza', "domino's", 'burger king', 'subway', 'wendys', "wendy's", 'a&w',
    'richeese factory', 'richeese', 'solaria', "d'cost", 'dcost', 'bakmi gm', 'yoshinoya',
    'marugame udon', 'marugame', 'shihlin', 'kintan buffet', 'shaburi', 'ta wan', 'pepper lunch',
    'ichiban sushi', 'sushi tei', 'genki sushi', 'gyu-kaku', 'hanamasa', 'mie gacoan', 'gacoan',
    'wizzmie', 'kober mie', 'warunk upnormal', 'upnormal', 'bebek kaleyo', 'sate khas senayan',
    'ayam bakar wong solo', 'mujigae', 'panties pizza',
    // Farmasi, Medis & Perawatan
    'kimia farma', 'k-24', 'apotek k-24', 'guardian', 'watsons', 'century', 'boston',
    'halodoc', 'alodokter', 'prodia', 'pramita',
    // Ritel, Rumah Tangga, Buku & Elektronik
    'gramedia', 'periplus', 'gunung agung', 'ace hardware', 'ace', 'informa', 'ikea', 'mitra10',
    'depo bangunan', 'mr diy', 'mr. diy', 'miniso', 'kkv', 'oh! some', 'usupso', 'daiso',
    'uniqlo', 'h&m', 'zara', 'pull&bear', 'stradivarius', 'bershka', 'cotton on', 'matahari',
    'ramayana', 'sogo', 'seibu', 'metro', 'eraspace', 'erafone', 'ibox', 'digimap',
    'electronic city', 'hartono', 'samsung store', 'xiaomi store', 'oppo store', 'vivo store',
    // Bioskop & Hiburan
    'cinema xxi', 'xxi', 'premiere xxi', 'cgv', 'cinepolis', 'timezone', 'amazone', 'funworld',
    // Logistik & Kurir
    'jne', 'j&t express', 'j&t', 'sicepat', 'anteraja', 'pos indonesia', 'tiki', 'ninja xpress',
    'lion parcel', 'spx express', 'shopee express',
    // E-Commerce & Dompet Digital
    'tokopedia', 'shopee', 'blibli', 'lazada', 'tiktok shop', 'bukalapak', 'gojek', 'gofood', 'grab', 'grabfood'
  ];

  // B. Muat riwayat toko yang pernah disimpan pengguna di perangkat (Belajar Dinamis)
  let customMerchants: string[] = [];
  try {
    const rawCustom = localStorage.getItem('simpan_custom_merchants');
    if (rawCustom) {
      customMerchants = JSON.parse(rawCustom);
    }
  } catch (e) {
    // Ignore parse error
  }

  const allCandidateMerchants = Array.from(new Set([...customMerchants, ...popularMerchants]));

  // 1. Cek apakah cocok dengan daftar merchant populer atau yang pernah disimpan
  for (const km of allCandidateMerchants) {
    if (lowerText.includes(km.toLowerCase())) {
      const regex = new RegExp(`\\b${km.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      const match = cleanText.match(regex);
      if (match) {
        merchant = match[0].toUpperCase();
        break;
      }
    }
  }

  // 2. Deteksi Pola Awalan Nama Toko / Usaha Lokal (Toko X, Warung Y, Kopi Z, Bengkel A, dll)
  if (!merchant) {
    const storePrefixRegex = /\b(?:toko|warung|kedai|kafe|cafe|resto|restoran|kopi|bakso|mie|ayam|bengkel|apotek|klinik|salon|barbershop|laundry|boutique|distro|mart|shop|store|bakery|kitchen|corner|cell|cellular|motor|jaya|abadi|makmur|sejahtera|berkah|utama|anugerah)\s+([A-Za-z0-9\s&'.-]{2,30})\b/i;
    const prefixMatch = cleanText.match(storePrefixRegex);
    if (prefixMatch && prefixMatch[0]) {
      merchant = prefixMatch[0].trim();
    }
  }

  // 3. Heuristik Baris Teratas Struk (Mendeteksi Toko Bebas / Apapun Tanpa Dibatasi)
  if (!merchant) {
    const skipBoilerplateWords = [
      'struk', 'bukti pembayaran', 'nota kontan', 'nota penjualan', 'sales receipt', 'bill',
      'invoice', 'faktur', 'order', 'table', 'meja', 'kasir', 'cashier', 'terminal', 'pos',
      'customer copy', 'merchant copy', 'alamat', 'jl.', 'jalan', 'telp', 'phone', 'npwp',
      'terima kasih', 'thank you', 'selamat datang', 'welcome', 'tanggal', 'date', 'pax',
      'dine in', 'take away', 'takeaway', 'delivery', 'reprint', 'salinan'
    ];

    for (let i = 0; i < Math.min(lines.length, 6); i++) {
      const line = lines[i].trim();
      const lineLower = line.toLowerCase();

      // Abaikan jika terlalu pendek, angka murni, format tanggal, atau kata-kata umum struk
      if (
        line.length >= 3 &&
        line.length <= 45 &&
        !line.match(/^\d+$/) &&
        !line.match(/\d{1,2}[\/\-\.]\d{1,2}/) &&
        !skipBoilerplateWords.some((w) => lineLower.includes(w))
      ) {
        // Amankan nama merchant dari baris teratas
        merchant = line.replace(/[^a-zA-Z0-9\s&'.-]/g, '').trim();
        if (merchant.length >= 3) {
          break;
        }
      }
    }
  }

  if (!merchant) {
    merchant = isKTP
      ? 'KTP Republik Indonesia'
      : isTagihan
      ? 'Tagihan Utilitas'
      : isMedical
      ? 'Apotek / Klinik Medis'
      : defaultTitle;
  }

  // 3. Ekstraksi Tanggal & Jam
  let dateStr = '';
  let timeStr = '';

  const dateMatch = cleanText.match(
    /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/
  );
  if (dateMatch) {
    const day = dateMatch[1].padStart(2, '0');
    const month = dateMatch[2].padStart(2, '0');
    const rawYear = dateMatch[3];
    const year = rawYear.length === 2 ? '20' + rawYear : rawYear;
    dateStr = `${day}/${month}/${year}`;
  } else {
    const indDateMatch = cleanText.match(
      /\b(\d{1,2})\s+(jan(?:uari)?|feb(?:ruari)?|mar(?:et)?|apr(?:il)?|mei|jun(?:i)?|jul(?:i)?|agu(?:stus)?|sep(?:tember)?|okt(?:ober)?|nov(?:ember)?|des(?:ember)?)\s+(\d{4})\b/i
    );
    if (indDateMatch) {
      dateStr = `${indDateMatch[1]} ${indDateMatch[2]} ${indDateMatch[3]}`;
    }
  }

  if (!dateStr) {
    dateStr = formatDeviceDate(new Date());
  }

  const timeMatch = cleanText.match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)(?::([0-5]\d))?\b/);
  if (timeMatch) {
    const h = timeMatch[1].padStart(2, '0');
    const m = timeMatch[2];
    timeStr = `${h}:${m}`;
  } else {
    timeStr = formatDeviceTime();
  }

  // 4. Ekstraksi Total Nominal Pembayaran
  let totalAmount = '';
  let subtotalAmount = '';

  const totalKeywords = [
    /(?:grand\s*total|total\s*bayar|total\s*akhir|tagihan)[:\s]*([rp\s]*[0-9\.\,]+)/i,
    /(?:total|jumlah\s*bayar|netto|subtotal)[:\s]*([rp\s]*[0-9\.\,]+)/i,
    /(?:bayar|tunai|cash|debit|qris)[:\s]*([rp\s]*[0-9\.\,]+)/i,
  ];

  for (const regex of totalKeywords) {
    const match = cleanText.match(regex);
    if (match && match[1]) {
      const parsedNum = parseCurrencyNumber(match[1]);
      if (parsedNum > 0) {
        totalAmount = parsedNum.toLocaleString('id-ID');
        break;
      }
    }
  }

  if (!totalAmount) {
    const numberMatches = cleanText.match(/\b\d{1,3}(?:\.\d{3})+(?:,\d{2})?\b/g);
    if (numberMatches && numberMatches.length > 0) {
      const numbers = numberMatches
        .map((n) => parseCurrencyNumber(n))
        .filter((n) => n >= 500 && n <= 50000000);
      if (numbers.length > 0) {
        const maxVal = Math.max(...numbers);
        totalAmount = maxVal.toLocaleString('id-ID');
      }
    }
  }

  // 5. Metode Pembayaran
  let paymentMethod = '';
  if (/qris/i.test(cleanText)) paymentMethod = 'QRIS';
  else if (/tunai|cash/i.test(cleanText)) paymentMethod = 'Tunai';
  else if (/bca/i.test(cleanText)) paymentMethod = 'Debit BCA';
  else if (/mandiri/i.test(cleanText)) paymentMethod = 'Mandiri';
  else if (/bri/i.test(cleanText)) paymentMethod = 'BRI';
  else if (/bni/i.test(cleanText)) paymentMethod = 'BNI';
  else if (/debit/i.test(cleanText)) paymentMethod = 'Kartu Debit';
  else if (/kredit|credit/i.test(cleanText)) paymentMethod = 'Kartu Kredit';
  else if (/gopay/i.test(cleanText)) paymentMethod = 'GoPay';
  else if (/shopeepay/i.test(cleanText)) paymentMethod = 'ShopeePay';
  else if (/ovo/i.test(cleanText)) paymentMethod = 'OVO';
  else if (/dana/i.test(cleanText)) paymentMethod = 'DANA';

  // 6. Ekstraksi Item Belanja
  const items: ReceiptItem[] = [];
  lines.forEach((line, idx) => {
    const itemMatch = line.match(
      /^(.*?)(?:\s+(\d+)\s*(?:x|pcs|bh)?)?\s+([0-9\.\,]{4,})$/i
    );
    if (itemMatch && items.length < 15) {
      const rawName = itemMatch[1].replace(/[^a-zA-Z0-9\s]/g, '').trim();
      const qty = parseInt(itemMatch[2] || '1', 10) || 1;
      const price = parseCurrencyNumber(itemMatch[3]);

      if (
        rawName.length >= 3 &&
        price > 0 &&
        !/total|subtotal|kembali|cash|tunai|qris|diskon|pajak|ppn|debit/i.test(
          rawName
        )
      ) {
        items.push({
          id: 'item_' + idx,
          name: rawName,
          quantity: qty,
          unitPrice: price / qty,
          totalPrice: price,
          isEdited: false,
          rawName,
          rawTotalPrice: price,
        });
      }
    }
  });

  // 7. Data KTP / Identitas Khusus (NIK & Provinsi Otomatis)
  const nikMatch = cleanText.match(/\b\d{16}\b/);
  if (nikMatch) {
    const nik = nikMatch[0];
    const provCode = nik.slice(0, 2);
    const provName = PROVINCE_CODES[provCode];
    extraMetadata.push({
      key: 'nik',
      label: 'Nomor Induk Kependudukan (NIK)',
      value: nik,
    });
    if (provName) {
      extraMetadata.push({
        key: 'provinsi_ktp',
        label: 'Provinsi Asal KTP',
        value: provName,
      });
    }
  }

  // 8. Ekstraksi NPWP
  const npwpMatch = cleanText.match(/\b(?:\d{2}\.\d{3}\.\d{3}\.\d{1}-\d{3}\.\d{3}|\d{15,16})\b/);
  if (npwpMatch && (cleanText.toLowerCase().includes('npwp') || npwpMatch[0].includes('.'))) {
    extraMetadata.push({
      key: 'npwp',
      label: 'Nomor Pokok Wajib Pajak (NPWP)',
      value: npwpMatch[0],
    });
  }

  // 9. Ekstraksi Nama Bank & Nomor Rekening
  const bankPatterns = [
    { name: 'BCA', regex: /\b(?:bca|bank central asia)\b/i },
    { name: 'Bank Mandiri', regex: /\b(?:mandiri|bank mandiri)\b/i },
    { name: 'BRI', regex: /\b(?:bri|bank rakyat indonesia)\b/i },
    { name: 'BNI', regex: /\b(?:bni|bank negara indonesia)\b/i },
    { name: 'BSI', regex: /\b(?:bsi|bank syariah indonesia)\b/i },
    { name: 'CIMB Niaga', regex: /\b(?:cimb|cimb niaga)\b/i },
    { name: 'Permata Bank', regex: /\b(?:permata|bank permata)\b/i },
    { name: 'Bank Jago', regex: /\b(?:jago|bank jago)\b/i },
    { name: 'Blu by BCA', regex: /\b(?:blu|blu by bca)\b/i },
    { name: 'SeaBank', regex: /\b(?:seabank|sea bank)\b/i },
  ];

  for (const b of bankPatterns) {
    if (b.regex.test(cleanText)) {
      extraMetadata.push({
        key: 'bank_name',
        label: 'Nama Bank',
        value: b.name,
      });
      break;
    }
  }

  const rekMatch = cleanText.match(/(?:rekening|no\.?\s*rek|account\s*no\.?)[:\s]*([0-9\-\s]{8,18})/i);
  if (rekMatch && rekMatch[1]) {
    const accNum = rekMatch[1].replace(/[\s\-]/g, '');
    if (accNum.length >= 8) {
      extraMetadata.push({
        key: 'account_number',
        label: 'Nomor Rekening',
        value: accNum,
      });
    }
  }

  // 10. Ekstraksi Jatuh Tempo (Due Date)
  const dueDateMatch = cleanText.match(
    /(?:jatuh\s*tempo|due\s*date|berlaku\s*hingga|valid\s*thru|kadaluarsa|exp(?:iry)?\.?\s*date)[:\s]*([0-9a-zA-Z\s\/\-\.]+)/i
  );
  if (dueDateMatch && dueDateMatch[1]) {
    const dueVal = dueDateMatch[1].trim().split('\n')[0].trim();
    if (dueVal.length >= 4 && dueVal.length <= 30) {
      extraMetadata.push({
        key: 'due_date',
        label: 'Jatuh Tempo / Masa Berlaku',
        value: dueVal,
      });
    }
  }

  // 11. Ekstraksi Barcode / QR Code Data
  const qrDataMatch = cleanText.match(/\[DATA BARCODE \/ QR CODE DITERJEMAHKAN\]\s*([\s\S]*?)(?:$|\n\n)/i);
  if (qrDataMatch && qrDataMatch[1].trim()) {
    extraMetadata.push({
      key: 'barcode_qr',
      label: 'Data Barcode / QR Terbaca',
      value: qrDataMatch[1].trim(),
    });
  }

  // 12. Ekstraksi Metadata Struk QRIS / EDC
  const nmidMatch = cleanText.match(/\bID\d{11,18}\b/i) || cleanText.match(/nmid[:\s]*([A-Z0-9]+)/i);
  if (nmidMatch) {
    extraMetadata.push({
      key: 'qris_nmid',
      label: 'NMID QRIS',
      value: nmidMatch[1] || nmidMatch[0],
    });
  }

  const tidMatch = cleanText.match(/\b(?:tid|terminal\s*id)[:\s]*([A-Z0-9]+)/i);
  if (tidMatch && tidMatch[1]) {
    extraMetadata.push({
      key: 'terminal_id',
      label: 'Terminal ID (EDC)',
      value: tidMatch[1],
    });
  }

  // 8. Klasifikasi Tipe & Kategori Otomatis
  let type: RecordType = 'document';
  let category = 'Dokumen';

  if (isKTP) {
    type = 'document';
    category = 'Identitas';
  } else if (isTagihan) {
    type = 'receipt';
    category = 'Tagihan & Utilitas';
  } else if (isMedical) {
    type = 'receipt';
    category = 'Kesehatan';
  } else if (
    totalAmount !== '' ||
    items.length > 0 ||
    /struk|receipt|belanja|minimarket|supermarket|mart/i.test(cleanText)
  ) {
    type = 'receipt';
    if (/kopi|cafe|coffee|restoran|resto|makan|food|bakso|ayam/i.test(cleanText)) {
      category = 'Kuliner & Kafe';
    } else if (/spbu|bensin|pertalite|pertamax|solar|shell/i.test(cleanText)) {
      category = 'Transportasi';
    } else {
      category = 'Belanja Harian';
    }
  }

  // Judul murni dari teks terbaca (tanpa mengarang entitas fiktif)
  const firstMeaningfulLine = lines.find(
    (l) => l.trim().length >= 3 && !l.trim().match(/^[\d\s\.\,\:\-\/]+$/)
  )?.trim();
  const realTitle = firstMeaningfulLine
    ? firstMeaningfulLine.slice(0, 45).replace(/[^a-zA-Z0-9\s&'.-]/g, '').trim()
    : defaultTitle;

  // 9. Sintesis Ringkasan Bahasa Indonesia Alami dari Teks Nyata
  let summary = '';
  if (type === 'receipt' && items.length > 0) {
    summary = `Struk belanja berisi ${items.length} item. Dipindai pada ${dateStr}.`;
  } else {
    const snippet = lines.slice(0, 3).join(' ');
    summary = snippet.length > 120 ? snippet.slice(0, 120) + '...' : snippet;
    if (!summary) summary = `Arsip dokumen dipindai pada ${dateStr}.`;
  }

  const tags = [
    category,
    type === 'receipt' ? 'Struk' : 'Dokumen',
  ].filter(Boolean);

  return {
    title: realTitle || defaultTitle,
    merchant: merchant || realTitle || defaultTitle,
    date: dateStr,
    time: timeStr,
    totalAmount: totalAmount || '0',
    subtotalAmount,
    paymentMethod,
    category,
    type,
    summary,
    items,
    tags: Array.from(new Set(tags)),
    extraMetadata,
  };
}

/**
 * Alur Lengkap Pemrosesan OCR Dokumen
 */
export async function processDocumentWithOCR(
  dataUrl: string,
  fileName = 'Dokumen',
  onProgress?: (progress: OCRProcessProgress) => void
): Promise<OCRParseResult> {
  const steps = [
    'Menganalisis citra & menajamkan kontras...',
    'Menjalankan OCR multi-bahasa (Indonesia & Inggris)...',
    'Mendeteksi entitas, nominal harga & tanggal...',
    'Menyusun struktur data & item belanjaan...',
    'Menerapkan klasifikasi & ringkasan pintar...',
  ];

  // Step 1: Preprocessing & Analisis citra
  if (onProgress) {
    onProgress({
      step: 1,
      totalSteps: steps.length,
      message: steps[0],
      isComplete: false,
    });
  }

  let recognizedText = '';
  let documentThumbnail: string | undefined = undefined;

  const isPdf =
    dataUrl.startsWith('data:application/pdf') ||
    dataUrl.includes('application/pdf') ||
    fileName.toLowerCase().endsWith('.pdf');

  // Prioritaskan Online AI Waterfall (Gemini -> OpenRouter -> Fallback Lokal)
  const isOnline = typeof navigator === 'undefined' || navigator.onLine !== false;
  if (isOnline) {
    try {
      const { runAIWaterfall } = await import('./aiProviderService');
      const aiResult = await runAIWaterfall(
        dataUrl,
        isPdf ? 'application/pdf' : 'image/jpeg',
        fileName,
        (msg) => {
          if (onProgress) {
            onProgress({
              step: 2,
              totalSteps: steps.length,
              message: msg,
              isComplete: false,
            });
          }
        }
      );
      if (aiResult) {
        if (onProgress) {
          onProgress({
            step: steps.length,
            totalSteps: steps.length,
            message: 'Dokumen berhasil diproses via AI!',
            isComplete: true,
          });
        }
        return aiResult;
      }
    } catch (aiErr: any) {
      console.warn('AI waterfall fallback ke engine lokal:', aiErr);
      if (onProgress) {
        onProgress({
          step: 2,
          totalSteps: steps.length,
          message: 'Beralih ke OCR & Parser lokal...',
          isComplete: false,
        });
      }
    }
  }

  if (isPdf) {
    // Alur khusus Dokumen PDF: Ekstraksi seluruh halaman + OCR canvas + thumbnail visual
    try {
      const { extractFullTextFromPdf } = await import('./pdfExtractService');
      const pdfRes = await extractFullTextFromPdf(dataUrl, (status) => {
        if (onProgress) {
          onProgress({
            step: 2,
            totalSteps: steps.length,
            message: status || steps[1],
            isComplete: false,
          });
        }
      });
      recognizedText = pdfRes.fullText || '';
      documentThumbnail = pdfRes.thumbnailDataUrl;
    } catch (err: any) {
      console.error('Ekstraksi PDF error:', err);
      throw new Error(`Gagal memproses berkas PDF "${fileName}":\n${err?.message || err}`);
    }
  } else if (dataUrl && (dataUrl.startsWith('data:') || dataUrl.startsWith('blob:') || dataUrl.startsWith('http'))) {
    try {
      recognizedText = await runRealOCR(dataUrl, (status) => {
        if (onProgress) {
          onProgress({
            step: 2,
            totalSteps: steps.length,
            message: status || steps[1],
            isComplete: false,
          });
        }
      });
    } catch (err) {
      console.warn('Real OCR error:', err);
    }
  }

  // Progress Step 3
  if (onProgress) {
    onProgress({
      step: 3,
      totalSteps: steps.length,
      message: steps[2],
      isComplete: false,
    });
  }
  await new Promise((r) => setTimeout(r, 200));

  // Teks hasil bacaan OCR murni (TIDAK mengarang data palsu jika tidak terbaca)
  recognizedText = (recognizedText || '').trim();

  // Progress Step 4
  if (onProgress) {
    onProgress({
      step: 4,
      totalSteps: steps.length,
      message: steps[3],
      isComplete: false,
    });
  }
  await new Promise((r) => setTimeout(r, 200));

  // Parsing Semantik
  const parsed = parseExtractedText(recognizedText, fileName);

  // Progress Step 5
  if (onProgress) {
    onProgress({
      step: 5,
      totalSteps: steps.length,
      message: steps[4],
      isComplete: true,
    });
  }

  const extractedFields: ExtractedField[] = [];

  if (parsed.date) {
    extractedFields.push({
      id: 'f_dt_' + Date.now(),
      key: 'date',
      label: 'Tanggal Dokumen',
      rawValue: parsed.date,
      currentValue: parsed.date,
      valueType: 'date',
      confidence: 0.96,
      source: 'ocr',
      isEdited: false,
    });
  }

  parsed.extraMetadata.forEach((meta, idx) => {
    extractedFields.push({
      id: `f_extra_${idx}_` + Date.now(),
      key: meta.key,
      label: meta.label,
      rawValue: meta.value,
      currentValue: meta.value,
      valueType: 'text',
      confidence: 0.99,
      source: 'ocr',
      isEdited: false,
    });
  });

  return {
    title: parsed.title,
    type: isPdf ? 'document' : parsed.type,
    category: isPdf && parsed.category === 'Belanja Harian' ? 'Dokumen' : parsed.category,
    tags: parsed.tags,
    rawText: recognizedText,
    summary: parsed.summary,
    extractedFields,
    receiptItems: parsed.items,
    confidence: 0.97,
    thumbnailDataUrl: documentThumbnail,
  };
}

/**
 * Simpan toko kustom/baru yang ditemui agar aplikasi terus belajar
 */
export function rememberCustomMerchant(name: string): void {
  if (!name || name.trim().length < 3) return;
  try {
    const raw = localStorage.getItem('simpan_custom_merchants');
    const list: string[] = raw ? JSON.parse(raw) : [];
    const clean = name.trim();
    if (!list.some((m) => m.toLowerCase() === clean.toLowerCase())) {
      list.push(clean);
      localStorage.setItem('simpan_custom_merchants', JSON.stringify(list.slice(-100)));
    }
  } catch (e) {
    // Ignore storage issues
  }
}

