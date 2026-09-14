import { ArchiveRecord, RecordType } from '../types/record';
import { compressImageToWebP } from '../utils/imageCompressor';

/**
 * Utility Service untuk Impor & Pemindaian Berkas Dokumen Lokal
 * Mendukung: PDF, Word (.docx, .doc), Excel (.xlsx, .xls), CSV, Text, Gambar
 */

/**
 * Membersihkan nama berkas menjadi judul dokumen yang rapi
 * Contoh: "Invoice_PLN_Bulan_Agustus_2026.pdf" -> "Invoice PLN Bulan Agustus 2026"
 */
export function cleanFileNameToTitle(fileName: string): string {
  if (!fileName) return 'Dokumen Tanpa Judul';

  // Buang ekstensi berkas
  const withoutExt = fileName.replace(/\.[a-zA-Z0-9]+$/, '');

  // Ubah underscore, dash, dan multiple space menjadi 1 spasi
  const spaced = withoutExt.replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ').trim();

  // Kapitalisasi huruf awal setiap kata
  return spaced
    .split(' ')
    .map((word) => {
      if (word.length <= 3 && word.toUpperCase() === word) return word; // Biarkan akronim (PLN, KTP, PDF)
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Mendeteksi kategori secara cerdas berdasarkan nama dan ekstensi berkas
 */
export function detectCategoryFromFileName(fileName: string): string {
  const lower = fileName.toLowerCase();

  // Keuangan / Transaksi
  if (
    lower.includes('invoice') ||
    lower.includes('struk') ||
    lower.includes('nota') ||
    lower.includes('receipt') ||
    lower.includes('tagihan') ||
    lower.includes('pembayaran') ||
    lower.includes('gaji') ||
    lower.includes('transfer') ||
    lower.includes('rekening') ||
    lower.includes('finansial') ||
    lower.includes('budget') ||
    lower.includes('pajak') ||
    lower.endsWith('.xlsx') ||
    lower.endsWith('.xls') ||
    lower.endsWith('.csv')
  ) {
    return 'Keuangan';
  }

  // Pekerjaan / Bisnis
  if (
    lower.includes('laporan') ||
    lower.includes('report') ||
    lower.includes('proposal') ||
    lower.includes('proyek') ||
    lower.includes('project') ||
    lower.includes('kerja') ||
    lower.includes('notulen') ||
    lower.includes('meeting') ||
    lower.includes('resume') ||
    lower.includes('cv') ||
    lower.includes('presentasi') ||
    lower.endsWith('.docx') ||
    lower.endsWith('.doc')
  ) {
    return 'Pekerjaan';
  }

  // Legal / Dokumen Penting
  if (
    lower.includes('kontrak') ||
    lower.includes('perjanjian') ||
    lower.includes('surat') ||
    lower.includes('ktp') ||
    lower.includes('sim') ||
    lower.includes('paspor') ||
    lower.includes('ijazah') ||
    lower.includes('sertifikat') ||
    lower.includes('akta') ||
    lower.includes('legal') ||
    lower.includes('mou')
  ) {
    return 'Legal';
  }

  // Pribadi / Catatan
  if (
    lower.includes('catatan') ||
    lower.includes('note') ||
    lower.includes('resep') ||
    lower.includes('harian') ||
    lower.includes('jadwal') ||
    lower.endsWith('.txt') ||
    lower.endsWith('.md')
  ) {
    return 'Pribadi';
  }

  return 'Dokumen';
}

/**
 * Mendeteksi tipe record berdasarkan ekstensi berkas
 */
export function detectRecordTypeFromExtension(fileName: string): RecordType {
  const lower = fileName.toLowerCase();
  if (
    lower.includes('struk') ||
    lower.includes('nota') ||
    lower.includes('receipt')
  ) {
    return 'receipt';
  }
  if (
    lower.endsWith('.png') ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.webp') ||
    lower.endsWith('.gif') ||
    lower.endsWith('.bmp') ||
    lower.endsWith('.svg') ||
    lower.endsWith('.avif')
  ) {
    return 'image';
  }
  if (
    lower.endsWith('.mp3') ||
    lower.endsWith('.wav') ||
    lower.endsWith('.m4a') ||
    lower.endsWith('.webm') ||
    lower.endsWith('.ogg') ||
    lower.endsWith('.aac') ||
    lower.endsWith('.flac') ||
    lower.endsWith('.opus')
  ) {
    return 'audio';
  }
  if (lower.endsWith('.txt') || lower.endsWith('.md')) {
    return 'note';
  }
  return 'document';
}

/**
 * Membaca berkas lokal dan mengonversinya menjadi objek ArchiveRecord
 */
export async function convertLocalFileToRecord(
  file: File,
  customCategory?: string
): Promise<ArchiveRecord> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    const isTextFile =
      file.type === 'text/plain' ||
      file.name.endsWith('.txt') ||
      file.name.endsWith('.csv') ||
      file.name.endsWith('.md');

    reader.onload = async (event) => {
      const dataUrlOrText = (event.target?.result as string) || '';
      let cleanTitle = cleanFileNameToTitle(file.name);
      let category = customCategory || detectCategoryFromFileName(file.name);
      let recordType = detectRecordTypeFromExtension(file.name);
      let customExtractedFields: any[] | undefined = undefined;
      let customReceiptItems: any[] | undefined = undefined;
      const now = new Date().toISOString();

      let rawText = '';
      let summary = '';
      let dataUrl = isTextFile ? undefined : dataUrlOrText;
      let thumbnailDataUrl: string | undefined = undefined;
      let isCompressed = false;
      let finalFileSize = file.size;
      const recordId = 'rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

      // Siapkan thumbnail cepat & kompresi awal jika berkas adalah gambar
      if (file.type.startsWith('image/')) {
        try {
          const comp = await compressImageToWebP(dataUrlOrText, { maxDimension: 1600, quality: 0.8 });
          thumbnailDataUrl = comp.thumbnailDataUrl;
          dataUrl = comp.compressedDataUrl;
          finalFileSize = comp.compressedSizeBytes;
          isCompressed = true;
        } catch (_e) {
          thumbnailDataUrl = dataUrlOrText;
        }
      } else if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        try {
          const { renderPdfFirstPageToDataUrl } = await import('./pdfExtractService');
          thumbnailDataUrl = (await renderPdfFirstPageToDataUrl(dataUrlOrText)) || undefined;
        } catch (_e) {}
      }

      const ext = file.name.split('.').pop()?.toUpperCase() || 'BERKAS';
      const sizeFormatted = (file.size / 1024).toFixed(1) + ' KB';
      summary = `Berkas ${ext} (${sizeFormatted}) - Sedang dipindai AI di latar belakang...`;
      rawText = cleanTitle;

      const record: ArchiveRecord = {
        id: recordId,
        type: recordType,
        title: cleanTitle,
        createdAt: now,
        capturedAt: now,
        updatedAt: now,
        category,
        tags: ['Lokal', category, ext],
        isFavorite: false,
        isDeleted: false,
        createdManually: false,
        originalDataUrl: dataUrl,
        thumbnailDataUrl: thumbnailDataUrl || (file.type.startsWith('image/') ? dataUrl : undefined),
        originalFileName: file.name,
        fileSizeBytes: finalFileSize,
        originalFileSizeBytes: file.size,
        isZeroCopy: true,
        isCompressed,
        mimeType: file.type || 'application/octet-stream',
        rawText: isTextFile ? dataUrlOrText : cleanTitle,
        summary: isTextFile ? dataUrlOrText.slice(0, 150) : summary,
        receiptItems: undefined,
        extractedFields: [
          {
            id: 'f_fn_' + Date.now(),
            key: 'fileName',
            label: 'Nama Berkas Asli',
            rawValue: file.name,
            currentValue: file.name,
            valueType: 'text',
            confidence: 1.0,
            source: 'imported',
            isEdited: false,
          },
          {
            id: 'f_sz_' + Date.now(),
            key: 'fileSize',
            label: 'Ukuran Berkas',
            rawValue: sizeFormatted,
            currentValue: sizeFormatted,
            valueType: 'text',
            confidence: 1.0,
            source: 'imported',
            isEdited: false,
          },
        ],
      };

      // 1. Simpan dulu ke arsip (langsung selesaikan proses impor tanpa menunggu antrean AI)
      resolve(record);

      // 2. Jalankan pemindaian teks & Multi-AI di latar belakang (Background Worker)
      const sourceForOCR = dataUrl || dataUrlOrText;
      setTimeout(async () => {
        try {
          const { processDocumentWithOCR } = await import('./ocrService');
          const { updateRecordFields } = await import('./db');
          const ocrRes = await processDocumentWithOCR(sourceForOCR, file.name);
          if (ocrRes) {
            const updates = {
              rawText: ocrRes.rawText || cleanTitle,
              summary: ocrRes.summary || `Dokumen ${file.name} selesai dipindai.`,
              title: ocrRes.title && ocrRes.title !== file.name ? ocrRes.title : undefined,
              category: !customCategory && ocrRes.category ? ocrRes.category : undefined,
              type: ocrRes.type || recordType,
              extractedFields: ocrRes.extractedFields && ocrRes.extractedFields.length > 0 ? ocrRes.extractedFields : undefined,
              receiptItems: ocrRes.receiptItems && ocrRes.receiptItems.length > 0 ? ocrRes.receiptItems : undefined,
              thumbnailDataUrl: ocrRes.thumbnailDataUrl || thumbnailDataUrl,
              pages: ocrRes.pages && ocrRes.pages.length > 0 ? ocrRes.pages : undefined,
            };
            await updateRecordFields(recordId, updates);
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('simpan_record_updated', {
                  detail: { recordId, updates },
                })
              );
            }
            console.log(`[Background AI OCR] Sukses memperbarui dokumen: ${file.name}`);
          }
        } catch (bgErr) {
          console.warn('[Background AI OCR] Gagal memproses teks di background:', bgErr);
        }
      }, 300);
    };

    if (isTextFile) {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file);
    }
  });
}
