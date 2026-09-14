import '../polyfills';
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
// @ts-ignore
import { WorkerMessageHandler } from 'pdfjs-dist/legacy/build/pdf.worker.mjs';
import { runRealOCR } from './ocrService';

if (typeof window !== 'undefined' && (pdfjsLib as any).GlobalWorkerOptions) {
  (pdfjsLib as any).GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';
}

/**
 * Membuat in-memory PDFWorker langsung via MessageChannel (Zero External File, 100% Offline)
 * Bekerja sempurna pada iOS WKWebView & Android WebView tanpa terhalang CORS, MIME type, atau sandboxing.
 */
function createDirectPdfWorker(): any {
  try {
    if (typeof window !== 'undefined' && typeof MessageChannel !== 'undefined') {
      const channel = new MessageChannel();
      if (typeof channel.port1.start === 'function') channel.port1.start();
      if (typeof channel.port2.start === 'function') channel.port2.start();
      WorkerMessageHandler.initializeFromPort(channel.port1);
      return new (pdfjsLib as any).PDFWorker({ port: channel.port2 });
    }
  } catch (err: any) {
    console.warn('In-memory PDFWorker init error:', err);
  }
  return undefined;
}

/**
 * Render halaman spesifik dokumen PDF ke DataURL JPEG
 */
export async function renderPdfPageToDataUrl(
  dataUrlOrBytes: string | Uint8Array,
  pageNumber: number = 1,
  targetMaxDim: number = 1200
): Promise<string | null> {
  try {
    if (typeof document === 'undefined') return null;
    let bytes: Uint8Array;
    if (typeof dataUrlOrBytes === 'string') {
      bytes = await getPdfUint8Array(dataUrlOrBytes);
    } else {
      bytes = dataUrlOrBytes;
    }

    if (pageNumber === 1) {
      const embedded = extractEmbeddedJpegsFromPdf(bytes);
      if (embedded.length > 0 && embedded[0]) {
        return embedded[0];
      }
    }

    const directWorker = createDirectPdfWorker();
    const loadingTask = (pdfjsLib as any).getDocument({
      data: bytes,
      useSystemFonts: true,
      worker: directWorker,
    });

    const pdfDoc = await loadingTask.promise;
    if (!pdfDoc || pageNumber < 1 || pageNumber > pdfDoc.numPages) return null;

    const page = await pdfDoc.getPage(pageNumber);
    const unscaledViewport = page.getViewport({ scale: 1.0 });
    const computedScale = Math.min(
      1.6,
      Math.max(0.7, Math.min(targetMaxDim / unscaledViewport.width, targetMaxDim / unscaledViewport.height))
    );
    const viewport = page.getViewport({ scale: computedScale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport } as any).promise;
    const res = canvas.toDataURL('image/jpeg', 0.82);
    canvas.width = 0;
    canvas.height = 0;
    return res;
  } catch (err) {
    console.warn(`renderPdfPageToDataUrl hal ${pageNumber} failed:`, err);
    return null;
  }
}

/**
 * Mendapatkan jumlah total halaman dokumen PDF
 */
export async function getPdfPageCount(
  dataUrlOrBytes: string | Uint8Array
): Promise<number> {
  try {
    let bytes: Uint8Array;
    if (typeof dataUrlOrBytes === 'string') {
      bytes = await getPdfUint8Array(dataUrlOrBytes);
    } else {
      bytes = dataUrlOrBytes;
    }
    const directWorker = createDirectPdfWorker();
    const loadingTask = (pdfjsLib as any).getDocument({
      data: bytes,
      worker: directWorker,
    });
    const pdfDoc = await loadingTask.promise;
    return pdfDoc?.numPages || 1;
  } catch (_e) {
    return 1;
  }
}

export async function renderPdfFirstPageToDataUrl(
  dataUrlOrBytes: string | Uint8Array
): Promise<string | null> {
  return renderPdfPageToDataUrl(dataUrlOrBytes, 1, 1000);
}

export interface PdfExtractResult {
  fullText: string;
  summary: string;
  pageCount: number;
  thumbnailDataUrl?: string;
  thumbnails?: string[];
  metadata?: {
    title?: string;
    author?: string;
    creationDate?: string;
    producer?: string;
  };
}

export interface PdfExtractOptions {
  password?: string;
  onPasswordRequired?: (promptMessage: string) => Promise<string | null>;
  onProgress?: (status: string, currentStep: number, totalSteps: number) => void;
}

/**
 * Ekstraksi blok teks /BT...ET/ dari string PDF
 */
function extractTextFromRawPdfString(text: string): string {
  try {
    const textBlocks: string[] = [];
    const btRegex = /BT[\s\S]*?ET/g;
    let match: RegExpExecArray | null;

    while ((match = btRegex.exec(text)) !== null) {
      const block = match[0];
      const tjRegex = /(?:\(([^()\\\\]*(?:\\\\.[^()\\\\]*)*)\)|\[([^\]]*)\])\s*T[Jj]/g;
      let tjMatch: RegExpExecArray | null;

      while ((tjMatch = tjRegex.exec(block)) !== null) {
        if (tjMatch[1] !== undefined) {
          const unescaped = tjMatch[1].replace(/\\\\([()\\\\])/g, '$1').trim();
          if (unescaped) textBlocks.push(unescaped);
        } else if (tjMatch[2] !== undefined) {
          const inner = tjMatch[2];
          const strRegex = /\(([^()\\\\]*(?:\\\\.[^()\\\\]*)*)\)/g;
          let strMatch: RegExpExecArray | null;
          let line = '';
          while ((strMatch = strRegex.exec(inner)) !== null) {
            line += strMatch[1].replace(/\\\\([()\\\\])/g, '$1');
          }
          if (line.trim()) textBlocks.push(line.trim());
        }
      }
    }

    return textBlocks.join('\n').trim();
  } catch (_e) {
    return '';
  }
}

/**
 * Ekstraksi teks langsung dari raw PDF content stream (Sangat cepat ~5ms, zero worker dependency)
 */
export function extractTextFromRawPdfBytes(bytes: Uint8Array): string {
  try {
    let text = '';
    if (typeof TextDecoder !== 'undefined') {
      try {
        text = new TextDecoder('latin1').decode(bytes);
      } catch (_e) {
        text = '';
      }
    }
    if (!text) {
      const len = bytes.length;
      const chunk = 8192;
      for (let i = 0; i < len; i += chunk) {
        text += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunk, len)) as any);
      }
    }
    return extractTextFromRawPdfString(text);
  } catch (err) {
    console.warn('Raw stream text extraction error:', err);
    return '';
  }
}

/**
 * Ekstraksi teks dari stream terkompresi FlateDecode (zlib) menggunakan DecompressionStream bawaan
 */
export async function extractTextFromFlateStreams(bytes: Uint8Array): Promise<string> {
  if (typeof DecompressionStream === 'undefined') return '';
  try {
    const textBlocks: string[] = [];
    const len = bytes.length;
    let i = 0;

    while (i < len - 10) {
      if (
        bytes[i] === 115 && // s
        bytes[i + 1] === 116 && // t
        bytes[i + 2] === 114 && // r
        bytes[i + 3] === 101 && // e
        bytes[i + 4] === 97 && // a
        bytes[i + 5] === 109 // m
      ) {
        let streamStart = i + 6;
        if (bytes[streamStart] === 13) streamStart++;
        if (bytes[streamStart] === 10) streamStart++;

        let streamEnd = -1;
        let j = streamStart;
        while (j < len - 9) {
          if (
            bytes[j] === 101 && // e
            bytes[j + 1] === 110 && // n
            bytes[j + 2] === 100 && // d
            bytes[j + 3] === 115 && // s
            bytes[j + 4] === 116 && // t
            bytes[j + 5] === 114 && // r
            bytes[j + 6] === 101 && // e
            bytes[j + 7] === 97 && // a
            bytes[j + 8] === 109 // m
          ) {
            streamEnd = j;
            break;
          }
          j++;
        }

        if (streamEnd > streamStart && streamEnd - streamStart > 10) {
          const chunk = bytes.subarray(streamStart, streamEnd);
          // Format zlib FlateDecode umumnya diawali byte 0x78
          if (chunk[0] === 0x78) {
            try {
              const ds = new DecompressionStream('deflate');
              const writer = ds.writable.getWriter();
              writer.write(chunk as any);
              writer.close();

              const reader = ds.readable.getReader();
              const decompressedChunks: Uint8Array[] = [];
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (value) decompressedChunks.push(value);
              }

              if (decompressedChunks.length > 0) {
                let totalLen = 0;
                for (const dc of decompressedChunks) totalLen += dc.length;
                const merged = new Uint8Array(totalLen);
                let off = 0;
                for (const dc of decompressedChunks) {
                  merged.set(dc, off);
                  off += dc.length;
                }
                const decompStr = new TextDecoder('latin1').decode(merged);
                const text = extractTextFromRawPdfString(decompStr);
                if (text && text.length > 5) {
                  textBlocks.push(text);
                }
              }
            } catch (_inflateErr) {}
          }
          i = streamEnd + 9;
        } else {
          i += 6;
        }
      } else {
        i++;
      }
    }

    return textBlocks.join('\n\n').trim();
  } catch (_e) {
    return '';
  }
}

/**
 * Ekstraksi metadata dokumen langsung dari byte PDF (/Title, /Author, /CreationDate)
 */
function extractRawPdfMetadata(bytes: Uint8Array): { title?: string; author?: string; creationDate?: string } {
  const meta: { title?: string; author?: string; creationDate?: string } = {};
  try {
    const text = new TextDecoder('latin1').decode(bytes.subarray(0, Math.min(bytes.length, 32768)));
    const titleMatch = text.match(/\/Title\s*\(([^)]+)\)/);
    if (titleMatch && titleMatch[1]) meta.title = titleMatch[1].replace(/\\([()])/g, '$1').trim();

    const authorMatch = text.match(/\/Author\s*\(([^)]+)\)/);
    if (authorMatch && authorMatch[1]) meta.author = authorMatch[1].replace(/\\([()])/g, '$1').trim();

    const dateMatch = text.match(/\/CreationDate\s*\(([^)]+)\)/);
    if (dateMatch && dateMatch[1]) meta.creationDate = dateMatch[1].replace(/\\([()])/g, '$1').trim();
  } catch (_e) {}
  return meta;
}

/**
 * Prompt sandi jika PDF terkunci
 */
async function promptPdfPassword(message?: string): Promise<string | null> {
  try {
    const { showPrompt } = await import('../utils/swal');
    return await showPrompt({
      title: 'Dokumen PDF Terkunci',
      text:
        message ||
        'Dokumen PDF ini dilindungi kata sandi (misal: e-statement bank, tanggal lahir DDMMYYYY atau nomor HP):',
      inputType: 'password',
      placeholder: 'Ketik sandi PDF di sini...',
      confirmText: 'Buka Dokumen',
      cancelText: 'Batal',
    });
  } catch (_e) {
    return null;
  }
}

/**
 * Ekstraksi berkas citra JPEG halaman hasil scan langsung dari byte PDF (Bebas crash & worker)
 */
export function extractEmbeddedJpegsFromPdf(bytes: Uint8Array): string[] {
  const dataUrls: string[] = [];
  try {
    const len = bytes.length;
    let i = 0;
    while (i < len - 4) {
      if (bytes[i] === 0xff && bytes[i + 1] === 0xd8 && bytes[i + 2] === 0xff) {
        const start = i;
        i += 3;
        while (i < len - 1) {
          if (bytes[i] === 0xff && bytes[i + 1] === 0xd9) {
            const end = i + 2;
            const jpegBytes = bytes.subarray(start, end);
            if (jpegBytes.length >= 4096) {
              let binary = '';
              const chunk = 8192;
              for (let c = 0; c < jpegBytes.length; c += chunk) {
                const sub = jpegBytes.subarray(c, Math.min(c + chunk, jpegBytes.length));
                binary += String.fromCharCode.apply(null, sub as any);
              }
              const b64 = btoa(binary);
              dataUrls.push(`data:image/jpeg;base64,${b64}`);
            }
            i = end;
            break;
          }
          i++;
        }
      } else {
        i++;
      }
    }
  } catch (err) {
    console.warn('Embedded JPEG extraction error:', err);
  }
  return dataUrls;
}

/**
 * Konversi sumber PDF menjadi Uint8Array dengan aman
 */
export async function getPdfUint8Array(source: string | ArrayBuffer | Uint8Array): Promise<Uint8Array> {
  if (source instanceof Uint8Array) return source;
  if (source instanceof ArrayBuffer) return new Uint8Array(source);

  if (typeof source === 'string') {
    if (source.startsWith('data:')) {
      try {
        const commaIdx = source.indexOf(',');
        const base64 = commaIdx >= 0 ? source.slice(commaIdx + 1) : source;
        const cleanB64 = base64.replace(/\s+/g, '');
        const binaryString = atob(cleanB64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
      } catch (_e) {
        // Fallback fetch
      }
    }

    const response = await fetch(source);
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }

  throw new Error('Format sumber PDF tidak valid');
}

/**
 * Ekstraksi Teks Lengkap, Metadata, dan OCR Multi-Halaman dari Dokumen PDF
 * Dilengkapi:
 * - Dukungan PDF terproteksi kata sandi (e-statement bank)
 * - Ekstraksi teks dari FlateDecode stream terkompresi
 * - Ekstraksi citra JPEG lembaran scan asli
 * - Ekstraksi metadata & multi-page thumbnails
 */
export async function extractFullTextFromPdf(
  pdfSource: string | ArrayBuffer | Uint8Array,
  optionsOrProgress?:
    | ((status: string, currentStep: number, totalSteps: number) => void)
    | PdfExtractOptions
): Promise<PdfExtractResult> {
  const onProgress =
    typeof optionsOrProgress === 'function' ? optionsOrProgress : optionsOrProgress?.onProgress;
  let userPassword: string | null | undefined =
    typeof optionsOrProgress === 'object' ? optionsOrProgress?.password : undefined;
  const passwordHandler =
    typeof optionsOrProgress === 'object' && optionsOrProgress?.onPasswordRequired
      ? optionsOrProgress.onPasswordRequired
      : promptPdfPassword;

  if (onProgress) onProgress('Membaca berkas dokumen PDF...', 1, 4);

  const pdfData = await getPdfUint8Array(pdfSource);

  // Jalankan ekstraksi langsung dari raw bytes & flate decompressed streams
  const rawStreamText = extractTextFromRawPdfBytes(pdfData);
  let flateText = '';
  try {
    flateText = await extractTextFromFlateStreams(pdfData);
  } catch (_e) {}

  const embeddedJpegs = extractEmbeddedJpegsFromPdf(pdfData);
  const rawMetadata = extractRawPdfMetadata(pdfData);

  let fullText = '';
  const thumbnails: string[] = embeddedJpegs.slice(0, 3);
  let firstPageThumbnail = thumbnails[0] || undefined;
  let pageCount = Math.max(1, embeddedJpegs.length);
  let docMetadata = { ...rawMetadata };
  const diagnosticErrors: string[] = [];

  // Coba jalankan PDF.js dengan pelindung password & timeout
  try {
    if (onProgress) onProgress('Memuat halaman dokumen PDF...', 2, 4);

    const directWorker = createDirectPdfWorker();

    let loadingTask = pdfjsLib.getDocument({
      data: pdfData,
      useSystemFonts: true,
      password: userPassword || undefined,
      worker: directWorker,
    });

    let pdfDoc: any = null;
    try {
      pdfDoc = await loadingTask.promise;
    } catch (loadErr: any) {
      // Jika butuh password atau password salah
      const isPasswordError =
        loadErr?.name === 'PasswordException' ||
        (loadErr?.message && /password/i.test(loadErr.message));

      if (isPasswordError && passwordHandler) {
        userPassword = await passwordHandler(
          loadErr.code === 2 ? 'Sandi PDF salah. Masukkan sandi yang benar:' : 'Dokumen dilindungi sandi:'
        );
        if (userPassword) {
          loadingTask = pdfjsLib.getDocument({
            data: pdfData,
            useSystemFonts: true,
            password: userPassword || undefined,
            worker: directWorker,
          });
          pdfDoc = await loadingTask.promise;
        }
      }

      if (!pdfDoc) throw loadErr;
    }

    if (pdfDoc) {
      pageCount = pdfDoc.numPages;

      // Ambil metadata dari PDF.js
      try {
        const meta = await pdfDoc.getMetadata();
        const info = meta?.info as any;
        if (info) {
          const isBogus = (str?: string) =>
            !str ||
            /^(untitled|anonymous|document|scan|microsoft\s*word|adobe\s*acrobat|print)/i.test(str.trim());

          if (info.Title && typeof info.Title === 'string' && !isBogus(info.Title)) {
            docMetadata.title = info.Title.trim();
          }
          if (info.Author && typeof info.Author === 'string' && !isBogus(info.Author)) {
            docMetadata.author = info.Author.trim();
          }
          if (info.CreationDate && typeof info.CreationDate === 'string') {
            docMetadata.creationDate = info.CreationDate.trim();
          }
        }
      } catch (_metaErr) {}

      const pageTexts: string[] = [];
      const maxPagesToProcess = Math.min(pageCount, 50);

      for (let pageNum = 1; pageNum <= maxPagesToProcess; pageNum++) {
        if (onProgress) {
          onProgress(`Membaca halaman ${pageNum} dari ${pageCount}...`, pageNum, maxPagesToProcess + 1);
        }

        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();

        // Ekstraksi teks digital terurut
        let pageText = '';
        if (textContent.items && textContent.items.length > 0) {
          const validItems = (textContent.items as any[]).filter(
            (item) => typeof item.str === 'string' && item.str.trim().length > 0
          );

          validItems.sort((a, b) => {
            const yA = a.transform ? a.transform[5] : 0;
            const yB = b.transform ? b.transform[5] : 0;
            if (Math.abs(yB - yA) > 5) {
              return yB - yA;
            }
            const xA = a.transform ? a.transform[4] : 0;
            const xB = b.transform ? b.transform[4] : 0;
            return xA - xB;
          });

          let lastY: number | null = null;
          for (const item of validItems) {
            const str = item.str.trim();
            if (str) {
              const currentY = item.transform ? Math.round(item.transform[5]) : null;
              if (lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 5) {
                pageText += '\n';
              } else if (pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
                pageText += ' ';
              }
              pageText += item.str;
              lastY = currentY;
            }
          }
        }

        pageText = pageText.trim();

        // Render kanvas tunggal efisien untuk thumbnail & OCR (jika teks digital < 80 atau untuk thumbnail)
        let pageImageUrl: string | null = null;
        if (pageNum <= 10 || pageText.length < 80) {
          try {
            const unscaled = page.getViewport({ scale: 1.0 });
            // Batasi resolusi maksimal 1280px agar hemat RAM WebView mobile
            const targetWidth = Math.min(1280, Math.max(800, unscaled.width));
            const scale = targetWidth / unscaled.width;
            const viewport = page.getViewport({ scale });

            const pageCanvas = document.createElement('canvas');
            const pageCtx = pageCanvas.getContext('2d');
            if (pageCtx) {
              pageCanvas.width = Math.round(viewport.width);
              pageCanvas.height = Math.round(viewport.height);
              pageCtx.fillStyle = '#FFFFFF';
              pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
              await page.render({ canvasContext: pageCtx, viewport } as any).promise;
              // Gunakan JPEG terkompresi (~150 KB) alih-alih PNG uncompressed (5-10 MB)
              pageImageUrl = pageCanvas.toDataURL('image/jpeg', 0.82);

              if (pageNum === 1) firstPageThumbnail = pageImageUrl;
              if (!thumbnails[pageNum - 1]) thumbnails[pageNum - 1] = pageImageUrl;

              // Bebaskan alokasi GPU/backing-store kanvas seketika
              pageCanvas.width = 0;
              pageCanvas.height = 0;
            }
          } catch (_renderErr) {}
        }

        // Jika teks digital sangat sedikit (< 80 karakter), jalankan OCR halaman dari canvas
        if (pageText.length < 80 && pageImageUrl) {
          // Pindai teks lokal pada setiap halaman dokumen scan (hingga 10 halaman)
          const shouldOcrThisPage = pageNum <= 10;

          if (shouldOcrThisPage) {
            try {
              const { runLocalTesseractOCR } = await import('./ocrService');
              const ocrResult = await runLocalTesseractOCR(pageImageUrl, (msg) => {
                if (onProgress) onProgress(`Hal ${pageNum}: ${msg}`, pageNum, pageCount + 1);
              });
              if (ocrResult && ocrResult.trim().length > 0) {
                pageText = ocrResult.trim();
              }
            } catch (_ocrErr) {}
          } else {
            pageText = `[Halaman ${pageNum} dari ${pageCount}: Citra visual tersimpan rapi dalam arsip]`;
          }
        }

        // Beri jeda sejenak untuk event loop & GC browser
        await new Promise((r) => setTimeout(r, 40));

        const header = pageCount > 1 ? `[--- Halaman ${pageNum} dari ${pageCount} ---]\n` : '';
        pageTexts.push(pageText ? `${header}${pageText}` : '');
      }

      fullText = pageTexts.filter(Boolean).join('\n\n').trim();
    }
  } catch (pdfJsErr: any) {
    const msg = `PDF.js Engine: ${pdfJsErr?.name || 'Error'} - ${pdfJsErr?.message || pdfJsErr}`;
    console.error(msg, pdfJsErr);
    diagnosticErrors.push(msg);
  }

  // Jika PDF.js gagal atau teks masih kosong, prioritaskan flateText lalu rawStreamText
  if (!fullText || fullText.length < 15) {
    if (flateText && flateText.length > 20) {
      fullText = flateText;
    } else if (rawStreamText && rawStreamText.length > 20) {
      fullText = rawStreamText;
    }
  }

  // Jika masih kosong tapi ada firstPageThumbnail (hasil render atau embedded JPEG), OCR gambar tersebut
  if ((!fullText || fullText.length < 15) && firstPageThumbnail) {
    if (onProgress) onProgress('Memindai gambar dokumen dengan Real OCR...', 3, 4);
    try {
      const { runLocalTesseractOCR } = await import('./ocrService');
      const ocrResult = await runLocalTesseractOCR(firstPageThumbnail, (msg) => {
        if (onProgress) onProgress(msg, 3, 4);
      });
      if (ocrResult && ocrResult.trim().length > 0) {
        fullText = ocrResult.trim();
      }
    } catch (_ocrErr: any) {
      const msg = `Real OCR: ${_ocrErr?.message || _ocrErr}`;
      console.error(msg, _ocrErr);
      diagnosticErrors.push(msg);
    }
  }

  if (!fullText) {
    // Jika tidak ada teks terbaca tapi dokumen valid, buat ringkasan aman agar tidak crash
    const docDisplayTitle = docMetadata.title || `Dokumen PDF (${pageCount} Halaman)`;
    if (firstPageThumbnail || pageCount > 0) {
      fullText = `[${docDisplayTitle}]\nDokumen tersimpan dengan aman dan dapat dibuka secara visual melalui penampil berkas.`;
    } else {
      if (diagnosticErrors.length > 0) {
        throw new Error(`Kendala saat memproses berkas PDF:\n${diagnosticErrors.join('\n')}`);
      }
      throw new Error('Tidak ada teks yang dapat diekstrak dari berkas PDF ini (berkas kosong atau format tidak didukung).');
    }
  }

  const cleanSample = fullText
    .replace(/\[---.*?---\]/g, '')
    .trim()
    .replace(/\s+/g, ' ');

  const summary = cleanSample
    ? cleanSample.slice(0, 180) + (cleanSample.length > 180 ? '...' : '')
    : (docMetadata.title || `Dokumen PDF (${pageCount} halaman)`);

  if (onProgress) onProgress('Pemindaian PDF selesai!', 4, 4);

  return {
    fullText,
    summary,
    pageCount,
    thumbnailDataUrl: firstPageThumbnail,
    thumbnails: thumbnails.filter(Boolean),
    metadata: docMetadata,
  };
}
