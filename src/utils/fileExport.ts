import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export interface ShareContentOptions {
  title?: string;
  text?: string;
  dataUrl?: string;
  filename?: string;
  mimeType?: string;
}

/**
 * Konversi blob atau URL apapun menjadi Base64 string murni
 */
async function urlToBase64(url: string): Promise<{ base64Data: string; mimeType: string }> {
  if (url.startsWith('data:')) {
    const mimeMatch = url.match(/^data:([^;]+);base64,(.*)$/);
    const mime = mimeMatch?.[1] || 'application/octet-stream';
    const base64Data = mimeMatch?.[2] || url.split(',')[1] || '';
    return { base64Data, mimeType: mime };
  }

  const response = await fetch(url);
  const blob = await response.blob();
  const mime = blob.type || 'application/octet-stream';

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1] || '';
      resolve({ base64Data, mimeType: mime });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Mendapatkan ekstensi file yang tepat berdasarkan MIME type atau nama file
 */
function getSafeExtension(filename?: string, mime?: string, fallback = 'bin'): string {
  if (filename && filename.includes('.')) {
    const parts = filename.split('.');
    const ext = parts[parts.length - 1].toLowerCase();
    if (ext.length >= 2 && ext.length <= 5) return ext;
  }

  if (mime) {
    if (mime.includes('pdf')) return 'pdf';
    if (mime.includes('png')) return 'png';
    if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
    if (mime.includes('webp')) return 'webp';
    if (mime.includes('wav')) return 'wav';
    if (mime.includes('audio/webm') || mime.includes('webm')) return 'webm';
    if (mime.includes('m4a') || mime.includes('mp4') || mime.includes('audio/')) return 'm4a';
    if (mime.includes('json')) return 'json';
    if (mime.includes('plain') || mime.includes('text')) return 'txt';
  }

  return fallback;
}

/**
 * Membagikan teks dan/atau berkas lewat native Share Sheet.
 * Mendukung Android, iOS, Desktop, dan Web.
 */
export async function shareContent(options: ShareContentOptions): Promise<void> {
  const { title, text, dataUrl, filename, mimeType } = options;

  if (Capacitor.isNativePlatform()) {
    // 1. Jika URL adalah native path Capacitor WebView:
    if (dataUrl && dataUrl.includes('/_capacitor_file_')) {
      const nativePath = dataUrl.replace(/^https?:\/\/[^/]+\/_capacitor_file_/, '');
      const fileUri = nativePath.startsWith('file://') ? nativePath : `file://${nativePath}`;
      try {
        await Share.share({
          title,
          text,
          url: fileUri,
          dialogTitle: 'Bagikan Berkas',
        });
        return;
      } catch (nativeErr) {
        console.warn('Gagal share via native file URI, fallback copy ke Cache:', nativeErr);
      }
    }

    // 2. Jika berkas berupa data URL, blob, atau HTTP:
    if (dataUrl) {
      try {
        const { base64Data, mimeType: detectedMime } = await urlToBase64(dataUrl);
        const finalMime = mimeType || detectedMime;
        const ext = getSafeExtension(filename, finalMime, 'bin');
        const safeBaseName = (filename || title || 'berkas_simpan')
          .replace(/\.[^/.]+$/, '')
          .replace(/[^a-zA-Z0-9_-]/g, '_');
        const safeFileName = `${safeBaseName}.${ext}`;

        const { uri } = await Filesystem.writeFile({
          path: safeFileName,
          data: base64Data,
          directory: Directory.Cache,
        });

        await Share.share({
          title,
          text,
          url: uri,
          dialogTitle: 'Bagikan Berkas',
        });
        return;
      } catch (err) {
        console.error('Gagal menulis berkas ke cache untuk share:', err);
      }
    }

    // Fallback share teks saja jika tidak ada berkas atau gagal
    await Share.share({
      title,
      text: text || title || 'Arsip SIMPAN',
      dialogTitle: 'Bagikan',
    });
    return;
  }

  // 3. Web & Desktop PWA: Web Share API jika tersedia
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      if (dataUrl) {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const finalMime = mimeType || blob.type || 'application/octet-stream';
        const ext = getSafeExtension(filename, finalMime, 'bin');
        const safeBaseName = (filename || title || 'berkas_simpan')
          .replace(/\.[^/.]+$/, '')
          .replace(/[^a-zA-Z0-9_-]/g, '_');
        const file = new File([blob], `${safeBaseName}.${ext}`, { type: finalMime });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title, text });
          return;
        }
      }

      await navigator.share({ title, text });
      return;
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
    }
  }

  // 4. Fallback Desktop / Browser: Unduh berkas langsung
  if (dataUrl) {
    const ext = getSafeExtension(filename, mimeType, 'bin');
    const safeBaseName = (filename || title || 'berkas_simpan')
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${safeBaseName}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  // 5. Fallback Teks Clipboard
  if (text && typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(text);
  }
}

/**
 * Menyimpan teks/JSON ke berkas dan membukanya lewat native Share Sheet
 */
export async function saveOrShareTextFile(
  filename: string,
  content: string,
  mimeType = 'application/json'
): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const { uri } = await Filesystem.writeFile({
      path: filename,
      data: content,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });

    await Share.share({
      title: filename,
      url: uri,
      dialogTitle: 'Simpan atau Bagikan Berkas',
    });
    return;
  }

  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Cek apakah string URL/data merupakan format gambar asli yang bisa dirender tag <img>
 */
export function isImageSource(urlOrData?: string, fallbackType?: string): boolean {
  if (fallbackType === 'audio' || fallbackType === 'note') return false;
  if (!urlOrData) return false;
  const lower = urlOrData.toLowerCase();
  if (lower.startsWith('data:image/')) return true;
  if (
    lower.startsWith('data:application/') ||
    lower.startsWith('data:text/') ||
    lower.startsWith('data:audio/') ||
    lower.startsWith('data:video/')
  ) {
    return false;
  }
  if (
    lower.endsWith('.pdf') ||
    lower.endsWith('.docx') ||
    lower.endsWith('.doc') ||
    lower.endsWith('.xlsx') ||
    lower.endsWith('.xls') ||
    lower.endsWith('.csv') ||
    lower.endsWith('.txt') ||
    lower.endsWith('.wav') ||
    lower.endsWith('.mp3') ||
    lower.endsWith('.m4a') ||
    lower.endsWith('.ogg') ||
    lower.endsWith('.aac') ||
    lower.endsWith('.flac') ||
    lower.endsWith('.opus') ||
    lower.endsWith('.webm') ||
    lower.endsWith('.json') ||
    lower.endsWith('.zip')
  ) {
    return false;
  }
  if (
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.png') ||
    lower.endsWith('.webp') ||
    lower.endsWith('.gif') ||
    lower.endsWith('.svg') ||
    lower.endsWith('.bmp') ||
    lower.endsWith('.avif')
  ) {
    return true;
  }
  return false;
}

/**
 * Cek apakah sumber berkas merupakan dokumen PDF
 */
export function isPdfSource(urlOrData?: string): boolean {
  if (!urlOrData) return false;
  const lower = urlOrData.toLowerCase();
  return (
    lower.startsWith('data:application/pdf') ||
    lower.endsWith('.pdf') ||
    lower.includes('.pdf?') ||
    lower.includes('application/pdf')
  );
}

/**
 * Identifikasi jenis berkas untuk rendering icon dan preview yang tepat
 */
export function getFileKind(
  urlOrData?: string,
  fallbackType?: string
): 'image' | 'pdf' | 'word' | 'excel' | 'audio' | 'text' | 'file' {
  if (fallbackType === 'audio') return 'audio';
  if (fallbackType === 'note') return 'text';
  if (!urlOrData) {
    if (fallbackType === 'receipt' || fallbackType === 'image') return 'image';
    return 'file';
  }
  const lower = urlOrData.toLowerCase();
  if (
    lower.startsWith('data:audio/') ||
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
  if (
    lower.startsWith('data:image/') ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.png') ||
    lower.endsWith('.webp') ||
    lower.endsWith('.gif') ||
    lower.endsWith('.svg') ||
    lower.endsWith('.bmp') ||
    lower.endsWith('.avif')
  ) {
    return 'image';
  }
  if (isPdfSource(lower)) {
    return 'pdf';
  }
  if (lower.endsWith('.docx') || lower.endsWith('.doc') || lower.includes('wordprocessingml')) {
    return 'word';
  }
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.csv') || lower.includes('spreadsheetml')) {
    return 'excel';
  }
  if (lower.startsWith('data:text/') || lower.endsWith('.txt') || lower.endsWith('.md') || lower.endsWith('.json')) {
    return 'text';
  }
  return isImageSource(urlOrData, fallbackType) ? 'image' : 'file';
}
