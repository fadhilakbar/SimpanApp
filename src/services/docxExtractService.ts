import mammoth from 'mammoth';
import JSZip from 'jszip';
import { runRealOCR } from './ocrService';

export interface DocxMetadata {
  title?: string;
  creator?: string;
  created?: string;
  description?: string;
}

export interface DocxExtractResult {
  fullText: string;
  summary: string;
  thumbnailDataUrl?: string;
  hasImages: boolean;
  metadata?: DocxMetadata;
  tableItems?: Array<{ name: string; price: number; quantity?: number }>;
}

/**
 * Konversi HTML dari Mammoth menjadi teks berstruktur (Preservasi Tabel Markdown)
 * dan ekstraksi otomatis baris produk/biaya ke daftar item
 */
function convertHtmlToStructuredText(html: string): {
  structuredText: string;
  tableItems: Array<{ name: string; price: number; quantity?: number }>;
} {
  const tableItems: Array<{ name: string; price: number; quantity?: number }> = [];

  let processed = html;
  const tableRegex = /<table>([\s\S]*?)<\/table>/gi;
  processed = processed.replace(tableRegex, (_match, tableContent) => {
    const rows: string[][] = [];
    const trRegex = /<tr>([\s\S]*?)<\/tr>/gi;
    let trMatch: RegExpExecArray | null;

    while ((trMatch = trRegex.exec(tableContent)) !== null) {
      const rowContent = trMatch[1];
      const cells: string[] = [];
      const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      let cellMatch: RegExpExecArray | null;
      while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
        const cellText = cellMatch[1].replace(/<[^>]+>/g, '').trim();
        cells.push(cellText);
      }
      if (cells.length > 0) {
        rows.push(cells);
      }
    }

    if (rows.length === 0) return '';

    const tableLines: string[] = [];
    rows.forEach((row, rIdx) => {
      tableLines.push(`| ${row.join(' | ')} |`);
      if (rIdx === 0) {
        tableLines.push(`| ${row.map(() => '---').join(' | ')} |`);
      }

      // Deteksi baris yang memuat nama item & nominal harga
      if (row.length >= 2) {
        for (let c = 1; c < row.length; c++) {
          const numMatch = row[c].match(/(?:rp\.?|idr)?\s*([0-9\.\,]+)/i);
          if (numMatch) {
            const rawNum = numMatch[1].replace(/\./g, '').replace(',', '.');
            const price = parseFloat(rawNum);
            if (!isNaN(price) && price > 0 && price < 1000000000) {
              const name = row[0].replace(/[|]/g, '').trim();
              if (name && name.length >= 2 && !/^(total|subtotal|jumlah|harga|item|no|qty)/i.test(name)) {
                let quantity = 1;
                if (row.length >= 3 && c === 2) {
                  const qtyCandidate = parseInt(row[1], 10);
                  if (!isNaN(qtyCandidate) && qtyCandidate > 0 && qtyCandidate < 1000) {
                    quantity = qtyCandidate;
                  }
                }
                tableItems.push({ name, price: Math.round(price), quantity });
                break;
              }
            }
          }
        }
      }
    });

    return '\n\n' + tableLines.join('\n') + '\n\n';
  });

  // Bersihkan format tag lain
  processed = processed
    .replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, '\n### $1\n')
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n$1\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { structuredText: processed, tableItems };
}

/**
 * Ekstraksi metadata Word dari zip (docProps/core.xml)
 */
async function extractDocxMetadata(zip: JSZip): Promise<DocxMetadata> {
  const meta: DocxMetadata = {};
  try {
    const coreXmlFile = zip.file('docProps/core.xml');
    if (coreXmlFile) {
      const xml = await coreXmlFile.async('text');
      const titleMatch = xml.match(/<dc:title>([\s\S]*?)<\/dc:title>/i);
      if (titleMatch && titleMatch[1].trim()) meta.title = titleMatch[1].trim();

      const creatorMatch = xml.match(/<dc:creator>([\s\S]*?)<\/dc:creator>/i);
      if (creatorMatch && creatorMatch[1].trim()) meta.creator = creatorMatch[1].trim();

      const createdMatch = xml.match(/<dcterms:created[^>]*>([\s\S]*?)<\/dcterms:created>/i);
      if (createdMatch && createdMatch[1].trim()) meta.created = createdMatch[1].trim();

      const descMatch = xml.match(/<dc:description>([\s\S]*?)<\/dc:description>/i);
      if (descMatch && descMatch[1].trim()) meta.description = descMatch[1].trim();
    }
  } catch (_e) {}
  return meta;
}

/**
 * Konversi sumber data DOCX ke ArrayBuffer
 */
async function getDocxArrayBuffer(source: string | ArrayBuffer | Uint8Array): Promise<ArrayBuffer> {
  if (source instanceof ArrayBuffer) {
    return source;
  }
  if (source instanceof Uint8Array) {
    const buf = new ArrayBuffer(source.byteLength);
    new Uint8Array(buf).set(source);
    return buf;
  }
  if (typeof source === 'string') {
    if (source.startsWith('data:')) {
      const base64 = source.split(',')[1];
      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;
    }

    const response = await fetch(source);
    return await response.arrayBuffer();
  }

  throw new Error('Format sumber berkas Word tidak valid');
}

/**
 * Ekstraksi Teks Lengkap, Preservasi Tabel, dan Real OCR dari Berkas Word (.docx)
 * 1. Mengekstrak teks digital & memformat tabel menjadi rapi via mammoth
 * 2. Mengekstrak metadata properti dokumen Word (docProps/core.xml)
 * 3. Memindai folder internal word/media/ untuk citra tersemat & menjalankan Tesseract OCR
 */
export async function extractFullTextFromDocx(
  docxSource: string | ArrayBuffer | Uint8Array,
  onProgress?: (status: string) => void
): Promise<DocxExtractResult> {
  try {
    if (onProgress) onProgress('Membaca berkas Word (.docx)...');
    const arrayBuffer = await getDocxArrayBuffer(docxSource);

    // 1. Ekstraksi teks digital dari dokumen dengan struktur tabel
    let digitalText = '';
    let tableItems: Array<{ name: string; price: number; quantity?: number }> = [];

    try {
      const htmlRes = await mammoth.convertToHtml({ arrayBuffer });
      if (htmlRes.value) {
        const parsed = convertHtmlToStructuredText(htmlRes.value);
        digitalText = parsed.structuredText;
        tableItems = parsed.tableItems;
      }
    } catch (_hErr) {
      try {
        const res = await mammoth.extractRawText({ arrayBuffer });
        digitalText = (res.value || '').trim();
      } catch (mErr) {
        console.warn('Mammoth text extraction warning:', mErr);
      }
    }

    // 2. Periksa berkas gambar tersemat & metadata via JSZip
    const ocrTexts: string[] = [];
    let firstImageThumb: string | undefined = undefined;
    let hasImages = false;
    let docMetadata: DocxMetadata = {};

    try {
      const zip = await JSZip.loadAsync(arrayBuffer);
      docMetadata = await extractDocxMetadata(zip);

      const imageFiles: { path: string; file: any }[] = [];

      zip.forEach((relativePath, file) => {
        if (
          relativePath.startsWith('word/media/') &&
          !file.dir &&
          /\.(png|jpe?g|webp|bmp)$/i.test(relativePath)
        ) {
          imageFiles.push({ path: relativePath, file });
        }
      });

      if (imageFiles.length > 0) {
        hasImages = true;
        if (onProgress) {
          onProgress(`Mendeteksi ${imageFiles.length} citra tersemat di Word. Menjalankan Real OCR...`);
        }

        for (let idx = 0; idx < imageFiles.length; idx++) {
          const { path, file } = imageFiles[idx];
          const imgBase64 = await file.async('base64');
          const ext = path.split('.').pop()?.toLowerCase() || 'jpeg';
          const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
          const dataUrl = `data:${mime};base64,${imgBase64}`;

          if (!firstImageThumb) {
            firstImageThumb = dataUrl;
          }

          if (onProgress) {
            onProgress(`Memindai citra Word (${idx + 1}/${imageFiles.length}) dengan OCR...`);
          }

          try {
            const ocrResult = await runRealOCR(dataUrl, (status) => {
              if (onProgress) onProgress(`Citra ${idx + 1}: ${status}`);
            });

            if (ocrResult && ocrResult.trim().length > 0) {
              ocrTexts.push(
                `[--- Hasil Pindai OCR Citra #${idx + 1} di Dokumen Word ---]\n${ocrResult.trim()}`
              );
            }
          } catch (ocrErr) {
            console.warn(`Gagal OCR citra ${path}:`, ocrErr);
          }
        }
      }
    } catch (zipErr) {
      console.warn('Gagal membaca media DOCX:', zipErr);
    }

    const parts: string[] = [];
    if (digitalText) {
      parts.push(digitalText);
    }
    if (ocrTexts.length > 0) {
      parts.push(ocrTexts.join('\n\n'));
    }

    const fullText = parts.join('\n\n').trim() || '(Dokumen Word tidak memiliki teks yang terbaca)';
    const cleanSample = fullText.replace(/\[---.*?---\]/g, '').trim().replace(/\s+/g, ' ');
    const summary = cleanSample
      ? cleanSample.slice(0, 180) + (cleanSample.length > 180 ? '...' : '')
      : docMetadata.title || 'Dokumen Word';

    if (onProgress) onProgress('Ekstraksi teks Word selesai.');

    return {
      fullText,
      summary,
      thumbnailDataUrl: firstImageThumb,
      hasImages,
      metadata: docMetadata,
      tableItems: tableItems.length > 0 ? tableItems : undefined,
    };
  } catch (err: any) {
    console.error('Ekstraksi Word (.docx) error:', err);
    throw new Error(`Gagal membaca berkas Word: ${err?.message || 'Format tidak didukung'}`);
  }
}
