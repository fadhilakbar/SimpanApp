/**
 * Utility Kompresi Citra Dokumen & Generator Thumbnail WebP
 * Mengompres foto beresolusi tinggi (misal 12MP-48MP dari kamera HP)
 * menjadi ukuran optimal ~150-300 KB tanpa mengorbankan keterbacaan teks OCR,
 * serta menghasilkan thumbnail ultra-ringan (~10 KB) untuk kelancaran rendering feed.
 */

export interface CompressionResult {
  compressedDataUrl: string;
  thumbnailDataUrl: string;
  blob: Blob;
  mimeType: string;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  savedPercent: number;
}

export interface CompressionOptions {
  maxDimension?: number; // Default: 1600px
  quality?: number; // Default: 0.80 (80%)
  thumbnailMaxDimension?: number; // Default: 220px
  thumbnailQuality?: number; // Default: 0.65
}

/**
 * Format bytes ke format human-readable (B, KB, MB, GB)
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const formatted = (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0);
  return `${formatted} ${units[i]}`;
}

/**
 * Mengubah Data URL atau Blob menjadi HTMLImageElement
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('Gagal memuat gambar: ' + e));
    img.src = src;
  });
}

/**
 * Menghitung perkiraan ukuran byte dari Data URL
 */
export function estimateDataUrlSize(dataUrl: string): number {
  if (!dataUrl) return 0;
  const parts = dataUrl.split(',');
  if (parts.length < 2) return dataUrl.length;
  return Math.round((parts[1].length * 3) / 4);
}

/**
 * Kompres gambar ke format WebP (atau JPEG fallback) dan buat thumbnail ringan
 */
export async function compressImageToWebP(
  source: string | Blob,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxDimension = 1600,
    quality = 0.8,
    thumbnailMaxDimension = 220,
    thumbnailQuality = 0.65,
  } = options;

  let sourceUrl = '';
  let originalSizeBytes = 0;
  let shouldRevokeSourceUrl = false;

  if (typeof source === 'string') {
    sourceUrl = source;
    originalSizeBytes = estimateDataUrlSize(source);
  } else {
    sourceUrl = URL.createObjectURL(source);
    originalSizeBytes = source.size;
    shouldRevokeSourceUrl = true;
  }

  try {
    const img = await loadImage(sourceUrl);
    const origWidth = img.naturalWidth || img.width;
    const origHeight = img.naturalHeight || img.height;

    // 1. Hitung dimensi target kompresi utama (Downscale jika lebih besar dari maxDimension)
    let targetWidth = origWidth;
    let targetHeight = origHeight;

    if (targetWidth > maxDimension || targetHeight > maxDimension) {
      if (targetWidth > targetHeight) {
        targetHeight = Math.round((targetHeight * maxDimension) / targetWidth);
        targetWidth = maxDimension;
      } else {
        targetWidth = Math.round((targetWidth * maxDimension) / targetHeight);
        targetHeight = maxDimension;
      }
    }

    // 2. Render ke Canvas untuk gambar utama
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context tidak tersedia.');
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    // Coba export ke image/webp, fallback ke image/jpeg jika browser tidak mendukung
    let mimeType = 'image/webp';
    let compressedDataUrl = canvas.toDataURL(mimeType, quality);
    if (!compressedDataUrl.startsWith('data:image/webp')) {
      mimeType = 'image/jpeg';
      compressedDataUrl = canvas.toDataURL(mimeType, quality);
    }

    const compressedSizeBytes = estimateDataUrlSize(compressedDataUrl);

    // Konversi Data URL menjadi Blob
    const res = await fetch(compressedDataUrl);
    const blob = await res.blob();

    // 3. Render Thumbnail ultra-ringan
    let thumbWidth = origWidth;
    let thumbHeight = origHeight;
    if (thumbWidth > thumbnailMaxDimension || thumbHeight > thumbnailMaxDimension) {
      if (thumbWidth > thumbHeight) {
        thumbHeight = Math.round((thumbHeight * thumbnailMaxDimension) / thumbWidth);
        thumbWidth = thumbnailMaxDimension;
      } else {
        thumbWidth = Math.round((thumbWidth * thumbnailMaxDimension) / thumbHeight);
        thumbHeight = thumbnailMaxDimension;
      }
    }

    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = thumbWidth;
    thumbCanvas.height = thumbHeight;
    const thumbCtx = thumbCanvas.getContext('2d');
    if (thumbCtx) {
      thumbCtx.imageSmoothingEnabled = true;
      thumbCtx.imageSmoothingQuality = 'medium';
      thumbCtx.drawImage(img, 0, 0, thumbWidth, thumbHeight);
    }

    const thumbnailDataUrl = thumbCanvas.toDataURL(mimeType, thumbnailQuality);

    // 4. Hitung persentase penghematan ukuran
    const savedBytes = Math.max(0, originalSizeBytes - compressedSizeBytes);
    const savedPercent =
      originalSizeBytes > 0 ? Math.round((savedBytes / originalSizeBytes) * 100) : 0;

    return {
      compressedDataUrl,
      thumbnailDataUrl,
      blob,
      mimeType,
      originalSizeBytes,
      compressedSizeBytes,
      savedPercent,
    };
  } finally {
    if (shouldRevokeSourceUrl) {
      URL.revokeObjectURL(sourceUrl);
    }
  }
}

/**
 * Mengompres foto avatar profil pengguna menjadi format WebP ringan (~15-30 KB)
 */
export async function compressAvatar(file: File, maxDimension = 256): Promise<string> {
  const result = await compressImageToWebP(file, {
    maxDimension,
    quality: 0.8,
    thumbnailMaxDimension: maxDimension,
  });
  return result.compressedDataUrl;
}
