import { ExtractedField, ReceiptItem, RecordType } from '../types/record';
import { OCRParseResult } from './ocrService';

// Default API Key (dapat diisi via .env atau Pengaturan aplikasi)
const EMBEDDED_GEMINI_KEY = '';

/**
 * Mendapatkan API Key aktif (LocalStorage > .env > Default Embedded)
 */
export function getGeminiApiKey(): string {
  if (typeof window !== 'undefined') {
    const customKey = localStorage.getItem('simpan_gemini_api_key');
    if (customKey && customKey.trim()) return customKey.trim();
  }
  const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (envKey && typeof envKey === 'string' && envKey.trim()) {
    return envKey.trim();
  }
  return EMBEDDED_GEMINI_KEY;
}

export function setGeminiApiKey(key: string): void {
  if (typeof window !== 'undefined') {
    if (key && key.trim()) {
      localStorage.setItem('simpan_gemini_api_key', key.trim());
    } else {
      localStorage.removeItem('simpan_gemini_api_key');
    }
  }
}

export function isGeminiConfigured(): boolean {
  return Boolean(getGeminiApiKey());
}

/**
 * Ekstraksi Data Dokumen / PDF / Citra menggunakan Google Gemini Vision AI
 */
export async function analyzeDocumentWithGemini(
  dataUrlOrBase64: string,
  mimeType: string,
  fileName = 'Dokumen'
): Promise<OCRParseResult> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Google Gemini API Key belum terpasang.');
  }

  // Bersihkan base64 string
  let base64Clean = dataUrlOrBase64;
  if (dataUrlOrBase64.includes(',')) {
    base64Clean = dataUrlOrBase64.split(',')[1];
  }
  base64Clean = base64Clean.replace(/\s+/g, '');

  let effectiveMime = mimeType;
  if (effectiveMime.includes('pdf') || fileName.toLowerCase().endsWith('.pdf')) {
    effectiveMime = 'application/pdf';
  } else if (effectiveMime.includes('png') || fileName.toLowerCase().endsWith('.png')) {
    effectiveMime = 'image/png';
  } else if (effectiveMime.includes('webp') || fileName.toLowerCase().endsWith('.webp')) {
    effectiveMime = 'image/webp';
  } else if (effectiveMime.startsWith('image/')) {
    effectiveMime = 'image/jpeg';
  }

  const prompt = `Kamu adalah asisten pengarsip dokumen cerdas untuk aplikasi SIMPAN (arsip pribadi & finansial Indonesia).
Tugasmu adalah memindai dan membaca seluruh dokumen ini (${fileName}) dengan sangat teliti.

Ekstrak seluruh informasi dokumen dan kembalikan HANYA JSON valid dengan struktur berikut:
{
  "title": "Judul ringkas & spesifik dari dokumen (contoh: 'Invoice Listrik PLN Maret 2026', 'Struk Belanja Indomaret', 'KTP Republik Indonesia', 'Surat Perjanjian Kerja')",
  "merchant": "Nama penerbit/toko/instansi/perusahaan (contoh: 'Indomaret', 'PLN', 'BCA', 'Kementerian Keuangan')",
  "date": "DD/MM/YYYY (tanggal resmi dokumen jika ada, atau tanggal hari ini)",
  "time": "HH:MM (jam transaksi jika tertera)",
  "totalAmount": "nominal total angka bersih tanpa simbol Rp (contoh: '150.000', '48.500', atau '0' jika bukan dokumen berbayar)",
  "subtotalAmount": "subtotal angka jika tertera",
  "paymentMethod": "metode bayar jika tertera (contoh: 'QRIS', 'Tunai', 'BCA', 'Mandiri', 'Kartu Debit')",
  "category": "Kategori yang paling cocok: 'Belanja Harian', 'Kuliner & Kafe', 'Tagihan & Utilitas', 'Finansial & Bank', 'Identitas & Kependudukan', 'Kesehatan', 'Transportasi', atau 'Dokumen Resmi'",
  "type": "Salah satu dari: 'receipt' (jika struk/tagihan/biaya), atau 'document' (jika surat/sertifikat/kontrak/identitas/dokumen umum)",
  "tags": ["Tag1", "Tag2", "Tag3"],
  "summary": "Ringkasan padat dan informatif isi dokumen dalam 1-3 kalimat bahasa Indonesia alami.",
  "fullText": "SELURUH teks lengkap dari semua halaman dokumen tanpa dipotong, termasuk tabel, nomor, keterangan, dan detail penting.",
  "items": [
    {
      "name": "Nama item/produk/rincian biaya",
      "quantity": 1,
      "price": 10000
    }
  ],
  "extraMetadata": [
    { "key": "nik", "label": "NIK", "value": "16 digit NIK jika KTP" },
    { "key": "nomor_rekening", "label": "No. Rekening", "value": "nomor rekening jika dokumen bank" },
    { "key": "npwp", "label": "NPWP", "value": "nomor NPWP jika ada" },
    { "key": "jatuh_tempo", "label": "Jatuh Tempo", "value": "tanggal jatuh tempo jika tagihan" }
  ]
}`;

  // Coba model terbaru gemini-3.6-flash terlebih dahulu, fallback ke gemini-2.5-flash jika perlu
  const candidateModels = ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];
  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: effectiveMime,
                    data: base64Clean,
                  },
                },
                { text: prompt },
              ],
            },
          ],
          generationConfig: {
            response_mime_type: 'application/json',
            temperature: 0.1,
          },
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const errMsg = errJson?.error?.message || `HTTP ${response.status} ${response.statusText}`;
        lastError = new Error(`Gemini (${model}) error: ${errMsg}`);
        continue;
      }

      const resData = await response.json();
      const rawJson = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawJson) {
        throw new Error('Gemini tidak mengembalikan respons teks.');
      }

      const parsed = JSON.parse(rawJson);

      const items: ReceiptItem[] = (parsed.items || []).map((it: any, idx: number) => ({
        id: `gemini_item_${idx}`,
        name: it.name || `Item #${idx + 1}`,
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.price) || 0,
        totalPrice: (Number(it.quantity) || 1) * (Number(it.price) || 0),
        isEdited: false,
      }));

      const extractedFields: ExtractedField[] = [];

      if (parsed.date) {
        extractedFields.push({
          id: 'f_gemini_dt_' + Date.now(),
          key: 'date',
          label: 'Tanggal Dokumen',
          rawValue: parsed.date,
          currentValue: parsed.date,
          valueType: 'date',
          confidence: 0.99,
          source: 'ocr',
          isEdited: false,
        });
      }

      if (Array.isArray(parsed.extraMetadata)) {
        parsed.extraMetadata.forEach((meta: any, idx: number) => {
          if (meta.key && meta.value) {
            extractedFields.push({
              id: `f_gemini_extra_${idx}_` + Date.now(),
              key: meta.key,
              label: meta.label || meta.key,
              rawValue: String(meta.value),
              currentValue: String(meta.value),
              valueType: 'text',
              confidence: 0.99,
              source: 'ocr',
              isEdited: false,
            });
          }
        });
      }

      if (parsed.merchant) {
        extractedFields.push({
          id: 'f_gemini_merchant_' + Date.now(),
          key: 'merchant',
          label: 'Penerbit / Toko',
          rawValue: parsed.merchant,
          currentValue: parsed.merchant,
          valueType: 'text',
          confidence: 0.99,
          source: 'ocr',
          isEdited: false,
        });
      }

      if (parsed.totalAmount && parsed.totalAmount !== '0') {
        extractedFields.push({
          id: 'f_gemini_total_' + Date.now(),
          key: 'totalAmount',
          label: 'Total Pembayaran',
          rawValue: String(parsed.totalAmount),
          currentValue: String(parsed.totalAmount),
          valueType: 'currency',
          confidence: 0.99,
          source: 'ocr',
          isEdited: false,
        });
      }

      if (parsed.paymentMethod) {
        extractedFields.push({
          id: 'f_gemini_pay_' + Date.now(),
          key: 'paymentMethod',
          label: 'Metode Pembayaran',
          rawValue: parsed.paymentMethod,
          currentValue: parsed.paymentMethod,
          valueType: 'text',
          confidence: 0.99,
          source: 'ocr',
          isEdited: false,
        });
      }

      let thumbUrl: string | undefined = undefined;
      if (effectiveMime.startsWith('image/')) {
        thumbUrl = dataUrlOrBase64.startsWith('data:')
          ? dataUrlOrBase64
          : `data:${effectiveMime};base64,${dataUrlOrBase64}`;
      }

      return {
        title: parsed.title || fileName,
        category: parsed.category || 'Dokumen',
        type: (parsed.type === 'receipt' ? 'receipt' : 'document') as RecordType,
        summary: parsed.summary || 'Dokumen diproses via Google Gemini AI.',
        rawText: parsed.fullText || parsed.summary || '',
        extractedFields,
        receiptItems: items.length > 0 ? items : undefined,
        confidence: 0.98,
        tags: Array.isArray(parsed.tags) ? parsed.tags : [parsed.category || 'Dokumen'],
        thumbnailDataUrl: thumbUrl,
      };
    } catch (modelErr: any) {
      lastError = modelErr;
    }
  }

  throw lastError || new Error('Gagal menghubungi Google Gemini AI.');
}
