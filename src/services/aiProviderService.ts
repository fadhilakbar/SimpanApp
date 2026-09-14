import { ExtractedField, ReceiptItem, RecordType } from '../types/record';
import { OCRParseResult } from './ocrService';

// Default Keys (bisa diisi via .env atau Settings pengguna di aplikasi)
const DEFAULT_KEYS = {
  gemini: '',
  openrouter: '',
  groq: '',
};

export function getProviderKey(provider: 'gemini' | 'openrouter' | 'groq'): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem(`simpan_${provider}_api_key`);
    if (custom && custom.trim()) return custom.trim();
  }
  const envKey =
    provider === 'gemini'
      ? (import.meta as any).env?.VITE_GEMINI_API_KEY
      : provider === 'openrouter'
      ? (import.meta as any).env?.VITE_OPENROUTER_API_KEY
      : (import.meta as any).env?.VITE_GROQ_API_KEY;

  if (envKey && typeof envKey === 'string' && envKey.trim()) {
    return envKey.trim();
  }
  return DEFAULT_KEYS[provider] || '';
}

export function setProviderKey(provider: 'gemini' | 'openrouter' | 'groq', key: string): void {
  if (typeof window !== 'undefined') {
    if (key && key.trim()) {
      localStorage.setItem(`simpan_${provider}_api_key`, key.trim());
    } else {
      localStorage.removeItem(`simpan_${provider}_api_key`);
    }
  }
}

const EXTRACT_PROMPT = (fileName: string) =>
  `Kamu adalah asisten pengarsip dokumen pintar untuk aplikasi SIMPAN (Indonesia).
Tugasmu: baca berkas ini (${fileName}) dan kembalikan HANYA JSON murni tanpa markdown/penjelasan dengan struktur:
{
  "title": "Judul spesifik (contoh: 'Struk Indomaret', 'Tagihan Listrik PLN', 'KTP Republik Indonesia')",
  "merchant": "Nama instansi/toko (contoh: 'Indomaret', 'PLN', 'BCA')",
  "date": "DD/MM/YYYY",
  "time": "HH:MM",
  "totalAmount": "nominal angka total (contoh: '150000' atau '0')",
  "subtotalAmount": "subtotal jika ada",
  "paymentMethod": "contoh: 'QRIS', 'Tunai', 'Debit'",
  "category": "'Belanja Harian' | 'Kuliner & Kafe' | 'Tagihan & Utilitas' | 'Finansial & Bank' | 'Identitas & Kependudukan' | 'Kesehatan' | 'Transportasi' | 'Dokumen Resmi'",
  "type": "'receipt' | 'document'",
  "tags": ["Tag1", "Tag2"],
  "summary": "Ringkasan 1-2 kalimat bahasa Indonesia alami.",
  "fullText": "SELURUH teks lengkap dokumen tanpa terpotong.",
  "items": [{ "name": "Item", "quantity": 1, "price": 10000 }],
  "extraMetadata": [{ "key": "nik", "label": "NIK", "value": "" }]
}`;

function extractJsonFromAiResponse(raw: string): any {
  // 1. Bersihkan tag <think>...</think> jika model menggunakan reasoning chain
  let text = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // 2. Ambil blok kode ```json ... ``` jika ada
  const codeBlockMatch = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(text);
  if (codeBlockMatch) {
    text = codeBlockMatch[1].trim();
  }

  // 3. Ekstrak substring dari kurung kurawal pertama '{' sampai terakhir '}'
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.substring(firstBrace, lastBrace + 1).trim();
  }

  return JSON.parse(text);
}

function parseAIJsonToResult(rawJsonText: string, fileName: string, fallbackThumb?: string): OCRParseResult {
  let parsed: any;
  try {
    parsed = extractJsonFromAiResponse(rawJsonText);
  } catch (parseErr) {
    console.warn('Gagal parse JSON AI, mencoba format fallback teks mentah:', parseErr);
    parsed = {
      title: fileName,
      category: 'Dokumen',
      type: 'document',
      summary: rawJsonText.slice(0, 180).replace(/\s+/g, ' '),
      fullText: rawJsonText,
    };
  }

  const items: ReceiptItem[] = (parsed.items || []).map((it: any, idx: number) => ({
    id: `item_${idx}`,
    name: it.name || `Item #${idx + 1}`,
    quantity: Number(it.quantity) || 1,
    unitPrice: Number(it.price) || 0,
    totalPrice: (Number(it.quantity) || 1) * (Number(it.price) || 0),
    isEdited: false,
  }));

  const extractedFields: ExtractedField[] = [];

  if (parsed.date) {
    extractedFields.push({
      id: 'f_dt_' + Date.now(),
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
          id: `f_extra_${idx}_` + Date.now(),
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
      id: 'f_merchant_' + Date.now(),
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
      id: 'f_total_' + Date.now(),
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
      id: 'f_pay_' + Date.now(),
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

  return {
    title: parsed.title || fileName,
    category: parsed.category || 'Dokumen',
    type: (parsed.type === 'receipt' ? 'receipt' : 'document') as RecordType,
    summary: parsed.summary || 'Dokumen diproses via AI.',
    rawText: parsed.fullText || parsed.summary || '',
    extractedFields,
    receiptItems: items.length > 0 ? items : undefined,
    confidence: 0.98,
    tags: Array.isArray(parsed.tags) ? parsed.tags : [parsed.category || 'Dokumen'],
    thumbnailDataUrl: fallbackThumb,
  };
}

/**
 * 1. Panggilan Google Gemini Flash
 */
export async function executeGemini(
  dataUrlOrBase64: string,
  mimeType: string,
  fileName: string
): Promise<OCRParseResult> {
  const apiKey = getProviderKey('gemini');
  if (!apiKey) throw new Error('Gemini API Key kosong');

  let base64Clean = dataUrlOrBase64;
  if (dataUrlOrBase64.includes(',')) base64Clean = dataUrlOrBase64.split(',')[1];
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

  const prompt = EXTRACT_PROMPT(fileName);
  const models = ['gemini-3.6-flash', 'gemini-flash-latest'];
  let lastError: any = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inline_data: { mime_type: effectiveMime, data: base64Clean } },
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
        throw new Error(errJson?.error?.message || `HTTP ${response.status}`);
      }

      const resData = await response.json();
      const rawJson = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawJson) throw new Error('Gemini tidak mengembalikan teks.');

      let thumbUrl: string | undefined = undefined;
      if (effectiveMime.startsWith('image/')) {
        thumbUrl = dataUrlOrBase64.startsWith('data:')
          ? dataUrlOrBase64
          : `data:${effectiveMime};base64,${dataUrlOrBase64}`;
      }

      return parseAIJsonToResult(rawJson, fileName, thumbUrl);
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error('Gagal memproses via Gemini AI.');
}

/**
 * 2. Panggilan OpenRouter Vision (Free Tier Models)
 */
export async function executeOpenRouter(
  dataUrl: string,
  fileName: string
): Promise<OCRParseResult> {
  const apiKey = getProviderKey('openrouter');
  if (!apiKey) throw new Error('OpenRouter API Key kosong');

  // OpenRouter menerima format OpenAI image_url (data URL base64 gambar)
  let imageUrl = dataUrl;
  if (!imageUrl.startsWith('data:image/')) {
    throw new Error('OpenRouter Vision memerlukan berkas gambar (data:image).');
  }

  const prompt = EXTRACT_PROMPT(fileName);
  const candidateModels = [
    'inclusionai/ling-3.0-flash-vl:free',
    'nex-agi/nex-n2.5-pro:free',
    'google/gemma-4-26b-a4b-it:free',
  ];

  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://simpan.app',
          'X-Title': 'SIMPAN App',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: imageUrl } },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || `HTTP ${response.status}`);
      }

      const resData = await response.json();
      const content = resData?.choices?.[0]?.message?.content;
      if (!content) throw new Error('OpenRouter tidak mengembalikan respons teks.');

      return parseAIJsonToResult(content, fileName, imageUrl);
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error('Gagal memproses via OpenRouter Vision.');
}

/**
 * 3. Panggilan Groq (Llama / Qwen) untuk ekstraksi semantik teks OCR
 */
export async function executeGroqText(
  extractedText: string,
  fileName: string,
  thumbnailUrl?: string
): Promise<OCRParseResult> {
  const apiKey = getProviderKey('groq');
  if (!apiKey) throw new Error('Groq API Key kosong');

  const prompt = `${EXTRACT_PROMPT(fileName)}

Berikut adalah teks mentah dokumen hasil OCR:
"""
${extractedText.slice(0, 8000)}
"""`;

  const models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
  let lastError: any = null;

  for (const model of models) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || `HTTP ${response.status}`);
      }

      const resData = await response.json();
      const content = resData?.choices?.[0]?.message?.content;
      if (!content) throw new Error('Groq tidak mengembalikan teks.');

      return parseAIJsonToResult(content, fileName, thumbnailUrl);
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error('Gagal memproses via Groq.');
}

/**
 * Universal Waterfall Runner (Gemini -> OpenRouter -> Groq -> Fallback ke lokal)
 */
export async function runAIWaterfall(
  dataUrl: string,
  mimeType: string,
  fileName: string,
  onStatus?: (msg: string) => void
): Promise<OCRParseResult | null> {
  const isOnline = typeof navigator === 'undefined' || navigator.onLine !== false;
  if (!isOnline) return null;

  const isPdf =
    mimeType.includes('pdf') ||
    dataUrl.startsWith('data:application/pdf') ||
    fileName.toLowerCase().endsWith('.pdf');

  // Coba 1: Google Gemini Flash (Mendukung input PDF & Gambar langsung)
  try {
    if (onStatus) onStatus('Memindai via Google Gemini AI...');
    const res = await executeGemini(dataUrl, mimeType, fileName);
    if (res && res.rawText) return res;
  } catch (err: any) {
    console.warn('Gemini gagal/exhausted, mencoba OpenRouter/Groq:', err?.message || err);
  }

  // Coba 2: Jika berkas adalah Gambar murni -> Kirim ke OpenRouter Vision
  if (dataUrl.startsWith('data:image/')) {
    try {
      if (onStatus) onStatus('Memindai via OpenRouter Free Vision AI...');
      const res = await executeOpenRouter(dataUrl, fileName);
      if (res && res.rawText) return res;
    } catch (err: any) {
      console.warn('OpenRouter image gagal:', err?.message || err);
    }
  }

  // Coba 3: Jika berkas adalah PDF -> Ekstrak citra scan tersemat/render canvas lalu proses via OpenRouter Vision & Groq
  if (isPdf) {
    try {
      const {
        getPdfUint8Array,
        extractEmbeddedJpegsFromPdf,
        extractTextFromRawPdfBytes,
        extractTextFromFlateStreams,
        renderPdfFirstPageToDataUrl,
      } = await import('./pdfExtractService');

      const bytes = await getPdfUint8Array(dataUrl);

      // A. Dapatkan citra visual halaman 1 (Embedded JPEG atau hasil render canvas ~50ms)
      let pageImage: string | null = null;
      const embeddedJpegs = extractEmbeddedJpegsFromPdf(bytes);
      if (embeddedJpegs.length > 0 && embeddedJpegs[0]) {
        pageImage = embeddedJpegs[0];
      } else {
        try {
          pageImage = await renderPdfFirstPageToDataUrl(bytes);
        } catch (_renderErr) {
          console.warn('Render PDF canvas error:', _renderErr);
        }
      }

      // Kirim citra ke OpenRouter Vision (Berikan waktu yang cukup agar berhasil membaca detail berkas)
      if (pageImage) {
        try {
          if (onStatus) onStatus('Memindai lembar halaman PDF via OpenRouter Vision AI...');
          const res = await executeOpenRouter(pageImage, fileName);
          if (res && res.rawText && res.rawText.trim().length > 0) return res;
        } catch (orErr: any) {
          console.warn('OpenRouter PDF vision gagal, lanjut ke Groq AI:', orErr?.message || orErr);
        }
      }

      // B. Ekstrak teks digital PDF untuk Groq Fast AI (~280ms)
      let streamText = extractTextFromRawPdfBytes(bytes);
      if (!streamText || streamText.length < 20) {
        streamText = await extractTextFromFlateStreams(bytes);
      }

      if (streamText && streamText.trim().length > 10) {
        try {
          if (onStatus) onStatus('Menganalisis teks PDF via Groq Fast AI...');
          const res = await executeGroqText(streamText, fileName, pageImage || undefined);
          if (res && res.rawText && res.rawText.trim().length > 0) return res;
        } catch (groqErr: any) {
          console.warn('Groq PDF text gagal:', groqErr?.message || groqErr);
        }
      }
    } catch (pdfPrepErr: any) {
      console.warn('Ekstraksi PDF sebelum AI gagal:', pdfPrepErr?.message || pdfPrepErr);
    }
  }

  return null;
}

/**
 * Uji Coba Koneksi Provider
 */
export async function testAIProvider(
  provider: 'gemini' | 'openrouter' | 'groq'
): Promise<{ success: boolean; message: string }> {
  try {
    const key = getProviderKey(provider);
    if (!key) return { success: false, message: 'API Key belum diisi.' };

    if (provider === 'gemini') {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: 'Halo' }] }] }),
        }
      );
      if (res.ok) return { success: true, message: 'Koneksi Gemini AI Aktif & Berhasil!' };
      const err = await res.json().catch(() => ({}));
      return { success: false, message: `Gemini Error: ${err?.error?.message || res.statusText}` };
    }

    if (provider === 'openrouter') {
      const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.ok) {
        return { success: true, message: 'Koneksi OpenRouter Aktif & Siap Digunakan!' };
      }
      return { success: false, message: `OpenRouter Error HTTP ${res.status}` };
    }

    if (provider === 'groq') {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.ok) return { success: true, message: 'Koneksi Groq API Aktif & Cepat!' };
      return { success: false, message: `Groq Error HTTP ${res.status}` };
    }

    return { success: false, message: 'Provider tidak dikenal.' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Gagal tersambung.' };
  }
}
