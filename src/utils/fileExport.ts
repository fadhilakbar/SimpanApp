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

import { isTauri } from './platform';
import { showSuccess } from './swal';

export interface DirectDownloadOptions {
  filename?: string;
  title?: string;
  dataUrl?: string;
  textContent?: string;
  mimeType?: string;
}

/**
 * Konversi data URL ke Blob secara aman tanpa membebani browser memory
 */
export async function dataUrlToBlob(url: string, fallbackMime = 'application/octet-stream'): Promise<Blob> {
  if (url.startsWith('data:')) {
    const arr = url.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : fallbackMime;
    const bstr = atob(arr[1] || '');
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }
  const res = await fetch(url);
  return await res.blob();
}

/**
 * Unduh berkas langsung ke penyimpanan (Downloads di Desktop, Documents/Share di Mobile, Blob di Web)
 */
export async function downloadFileDirectly(options: DirectDownloadOptions): Promise<string> {
  const { title, textContent, mimeType, dataUrl } = options;
  const ext = getSafeExtension(options.filename, mimeType, 'txt');
  const safeBaseName = (options.filename || title || 'berkas_simpan')
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  const finalFilename = `${safeBaseName}.${ext}`;

  // 1. Desktop Tauri (macOS & Windows Native)
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      if (dataUrl) {
        const savedPath = await invoke<string>('save_file_to_downloads', {
          filename: finalFilename,
          base64Data: dataUrl,
        });
        return savedPath;
      } else if (textContent) {
        const savedPath = await invoke<string>('save_text_to_downloads', {
          filename: finalFilename,
          content: textContent,
        });
        return savedPath;
      }
    } catch (tauriErr) {
      console.warn('Tauri native save failed, falling back to web blob:', tauriErr);
    }
  }

  // 2. Mobile Capacitor Native (Android & iOS)
  if (Capacitor.isNativePlatform()) {
    if (dataUrl) {
      const { base64Data, mimeType: detectedMime } = await urlToBase64(dataUrl);
      const { uri } = await Filesystem.writeFile({
        path: finalFilename,
        data: base64Data,
        directory: Directory.Documents,
      });
      await Share.share({
        title: title || finalFilename,
        url: uri,
        dialogTitle: 'Simpan / Unduh Berkas',
      });
      return uri;
    } else if (textContent) {
      const { uri } = await Filesystem.writeFile({
        path: finalFilename,
        data: textContent,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });
      await Share.share({
        title: title || finalFilename,
        url: uri,
        dialogTitle: 'Simpan / Unduh Berkas',
      });
      return uri;
    }
  }

  // 3. Web Browser (Chrome, Edge, Safari, Firefox)
  let blob: Blob;
  if (dataUrl) {
    blob = await dataUrlToBlob(dataUrl, mimeType);
  } else {
    blob = new Blob([textContent || ''], { type: `${mimeType || 'text/plain'};charset=utf-8` });
  }

  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = finalFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 2500);
  return finalFilename;
}

/**
 * Membagikan teks dan/atau berkas lewat native Share Sheet atau Clipboard + Unduhan
 * Mendukung Android, iOS, Desktop (Tauri macOS / Windows), dan Web.
 */
export async function shareContent(options: ShareContentOptions): Promise<void> {
  const { title, text, dataUrl, filename, mimeType } = options;

  // 1. Capacitor Native (Android & iOS)
  if (Capacitor.isNativePlatform()) {
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

    await Share.share({
      title,
      text: text || title || 'Arsip SIMPAN',
      dialogTitle: 'Bagikan',
    });
    return;
  }

  // 2. Web Share API jika tersedia (Mobile Safari, Chrome Android, macOS Safari)
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      if (dataUrl) {
        const blob = await dataUrlToBlob(dataUrl, mimeType);
        const ext = getSafeExtension(filename, mimeType || blob.type, 'bin');
        const safeBaseName = (filename || title || 'berkas_simpan')
          .replace(/\.[^/.]+$/, '')
          .replace(/[^a-zA-Z0-9_-]/g, '_');
        const file = new File([blob], `${safeBaseName}.${ext}`, {
          type: blob.type || mimeType || 'application/octet-stream',
        });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title, text });
          return;
        }
      }

      await navigator.share({ title, text });
      return;
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      console.warn('Web share API dibatalkan/gagal, fallback ke clipboard:', err);
    }
  }

  // 3. Desktop (Tauri Windows / macOS / Web Desktop)
  let copied = false;
  if (text && typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch (clipErr) {
      console.warn('Clipboard write failed:', clipErr);
    }
  }

  let downloadedPath: string | null = null;
  if (dataUrl) {
    try {
      downloadedPath = await downloadFileDirectly({
        filename,
        title,
        dataUrl,
        mimeType,
      });
    } catch (dlErr) {
      console.warn('Share auto-download failed:', dlErr);
    }
  }

  if (copied && downloadedPath) {
    showSuccess(
      'Berhasil Dibagikan',
      'Teks ringkasan arsip telah disalin ke Clipboard (siap di-paste ke WhatsApp/Email)! Berkas juga otomatis tersimpan di folder Unduhan.'
    );
  } else if (copied) {
    showSuccess(
      'Teks Disalin',
      'Teks ringkasan arsip telah disalin ke Clipboard (siap di-paste ke WhatsApp/Email).'
    );
  } else if (downloadedPath) {
    showSuccess('Berkas Tersimpan', 'Berkas telah disimpan ke folder Unduhan Anda.');
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
