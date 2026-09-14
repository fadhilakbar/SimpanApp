import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { ArchiveRecord } from '../types/record';
import Dexie, { Table } from 'dexie';

// Web Fallback: Isolated Binary Blob store agar tidak mengotori tabel metadata utama
class SimpanBlobDatabase extends Dexie {
  blobs!: Table<{ id: string; blob: Blob; mimeType: string; fileName: string }, string>;

  constructor() {
    super('SimpanBlobDatabase');
    this.version(1).stores({
      blobs: 'id',
    });
  }
}

export const blobDb = new SimpanBlobDatabase();

export interface SavedFileResult {
  localFilePath: string;
  webViewUrl: string;
  fileSizeBytes: number;
}

export interface StorageStatistics {
  totalFiles: number;
  totalPhysicalSizeBytes: number;
  zeroCopyCount: number;
  databaseSizeBytes: number;
  totalSavedBytes: number;
}

const SIMPAN_DOCUMENTS_FOLDER = 'SIMPAN';

/**
 * Memastikan folder publik "SIMPAN" sudah tersedia di dalam direktori Documents
 */
async function ensureSimpanDirectory(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Filesystem.mkdir({
      path: SIMPAN_DOCUMENTS_FOLDER,
      directory: Directory.Documents,
      recursive: true,
    });
  } catch (_e) {
    // Folder mungkin sudah ada, abaikan error
  }
}

/**
 * Menyimpan berkas fisik (kamera / scan baru) ke folder publik "SIMPAN"
 * Di Android: Tersimpan di Documents/SIMPAN (terbaca di File Manager).
 * Di iOS: Tersimpan di Documents/SIMPAN (terbaca di aplikasi Files "Di iPhone Saya").
 */
export async function savePhysicalFile(
  recordId: string,
  fileName: string,
  dataUrlOrBlob: string | Blob,
  mimeType = 'application/octet-stream'
): Promise<SavedFileResult> {
  const safeName = `${recordId}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const relativePath = `${SIMPAN_DOCUMENTS_FOLDER}/${safeName}`;

  if (Capacitor.isNativePlatform()) {
    await ensureSimpanDirectory();

    let base64Data = '';
    let fileSize = 0;

    if (typeof dataUrlOrBlob === 'string') {
      const parts = dataUrlOrBlob.split(',');
      base64Data = parts[1] || parts[0];
      fileSize = Math.round((base64Data.length * 3) / 4);
    } else {
      fileSize = dataUrlOrBlob.size;
      const buffer = await dataUrlOrBlob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      base64Data = btoa(binary);
    }

    const written = await Filesystem.writeFile({
      path: relativePath,
      data: base64Data,
      directory: Directory.Documents,
      recursive: true,
    });

    const webViewUrl = Capacitor.convertFileSrc(written.uri);

    return {
      localFilePath: relativePath,
      webViewUrl,
      fileSizeBytes: fileSize,
    };
  }

  // Web & Desktop Browser Fallback (Isolated Blob Store)
  let blob: Blob;
  if (typeof dataUrlOrBlob === 'string') {
    const res = await fetch(dataUrlOrBlob);
    blob = await res.blob();
  } else {
    blob = dataUrlOrBlob;
  }

  await blobDb.blobs.put({
    id: recordId,
    blob,
    mimeType,
    fileName: safeName,
  });

  const webViewUrl = URL.createObjectURL(blob);

  return {
    localFilePath: `blob://${recordId}`,
    webViewUrl,
    fileSizeBytes: blob.size,
  };
}

/**
 * Menyelesaikan URL tampilan berkas secara on-demand.
 * Memeriksa apakah file masih ada di lokasi fisiknya.
 */
export async function resolveFileUrl(record: ArchiveRecord): Promise<string | undefined> {
  // Jika sudah ada Base64 kecil atau blob aktif, kembalikan langsung
  if (record.originalDataUrl && (record.originalDataUrl.startsWith('data:') || record.originalDataUrl.startsWith('blob:'))) {
    return record.originalDataUrl;
  }

  if (record.localFilePath) {
    if (Capacitor.isNativePlatform()) {
      try {
        const fileStat = await Filesystem.stat({
          path: record.localFilePath,
          directory: Directory.Documents,
        });

        if (fileStat) {
          const uriResult = await Filesystem.getUri({
            path: record.localFilePath,
            directory: Directory.Documents,
          });
          return Capacitor.convertFileSrc(uriResult.uri);
        }
      } catch (_err) {
        // Berkas fisik tidak ditemukan (mungkin dihapus user lewat File Manager luar)
        console.warn(`Berkas fisik hilang: ${record.localFilePath}`);
        record.isMissingPhysicalFile = true;
        return undefined;
      }
    } else if (record.localFilePath.startsWith('blob://')) {
      const blobId = record.localFilePath.replace('blob://', '');
      const item = await blobDb.blobs.get(blobId);
      if (item && item.blob) {
        return URL.createObjectURL(item.blob);
      }
    }
  }

  return record.thumbnailDataUrl || record.originalDataUrl;
}

/**
 * Menghapus berkas fisik dari penyimpanan lokal perangkat
 */
export async function deletePhysicalFile(localFilePath?: string): Promise<boolean> {
  if (!localFilePath) return false;

  try {
    if (Capacitor.isNativePlatform()) {
      await Filesystem.deleteFile({
        path: localFilePath,
        directory: Directory.Documents,
      });
      return true;
    } else if (localFilePath.startsWith('blob://')) {
      const blobId = localFilePath.replace('blob://', '');
      await blobDb.blobs.delete(blobId);
      return true;
    }
  } catch (err) {
    console.warn(`Gagal menghapus berkas fisik (${localFilePath}):`, err);
  }
  return false;
}

/**
 * Menghitung statistik penggunaan penyimpanan lokal aplikasi
 */
export function calculateStorageStatistics(records: ArchiveRecord[]): StorageStatistics {
  let totalFiles = 0;
  let totalPhysicalSizeBytes = 0;
  let zeroCopyCount = 0;
  let totalSavedBytes = 0;

  // Estimasi ukuran database dari record JSON
  const jsonStr = JSON.stringify(records);
  const databaseSizeBytes = new Blob([jsonStr]).size;

  for (const record of records) {
    if (record.isDeleted) continue;

    if (record.isZeroCopy) {
      zeroCopyCount++;
    }

    if (record.fileSizeBytes) {
      totalFiles++;
      totalPhysicalSizeBytes += record.fileSizeBytes;
    }

    if (record.originalFileSizeBytes && record.fileSizeBytes) {
      const saved = record.originalFileSizeBytes - record.fileSizeBytes;
      if (saved > 0) {
        totalSavedBytes += saved;
      }
    }
  }

  return {
    totalFiles,
    totalPhysicalSizeBytes,
    zeroCopyCount,
    databaseSizeBytes,
    totalSavedBytes,
  };
}
