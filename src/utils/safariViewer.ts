import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { showSuccess, showError } from './swal';
import { haptics } from './haptics';
import { shareContent, saveOrShareTextFile } from './fileExport';

export interface SafeDownloadOptions {
  title: string;
  dataUrl?: string;
  textContent?: string;
  mimeType?: string;
  filename?: string;
}

/**
 * Open external web URL safely in Safari View Controller on iOS
 * or standard external window on desktop/web.
 */
export async function openInSafariViewController(url: string): Promise<void> {
  try {
    haptics.impactLight();
    if (Capacitor.isNativePlatform()) {
      await Browser.open({
        url,
        windowName: '_blank',
        presentationStyle: 'fullscreen',
        toolbarColor: '#165a4c',
      });
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  } catch (err) {
    console.error('Failed to open Safari View Controller:', err);
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

import { downloadFileDirectly } from './fileExport';
import { isTauri } from './platform';

/**
 * Unduh berkas atau buka dialog simpan ke perangkat secara langsung dan aman.
 * Di Android & iOS: menyimpan ke Dokumen dan membuka Sheet "Simpan ke File".
 * Di Desktop (Tauri macOS & Windows): langsung menulis ke folder Downloads dan membuka file di Finder/Explorer.
 * Di Web: memicu unduhan Blob URL langsung ke folder browser.
 */
export async function safeDownloadOrViewFile(options: SafeDownloadOptions): Promise<void> {
  const { title, dataUrl, textContent, mimeType = 'text/plain', filename } = options;
  haptics.impactMedium();

  // If it is an online HTTP/HTTPS URL, immediately open in Safari View Controller / Browser
  if (dataUrl && (dataUrl.startsWith('http://') || dataUrl.startsWith('https://')) && !dataUrl.includes('/_capacitor_file_')) {
    await openInSafariViewController(dataUrl);
    return;
  }

  // Tentukan nama berkas aman
  const safeBase = (title || 'arsip_simpan').replace(/[^a-zA-Z0-9_-]/g, '_');
  let defaultExt = 'txt';
  if (dataUrl) {
    if (dataUrl.includes('image/png')) defaultExt = 'png';
    else if (dataUrl.includes('image/jpeg') || dataUrl.includes('image/jpg') || dataUrl.includes('image/webp')) defaultExt = 'jpg';
    else if (dataUrl.includes('application/pdf') || dataUrl.endsWith('.pdf')) defaultExt = 'pdf';
    else if (dataUrl.includes('audio/wav') || dataUrl.includes('wav')) defaultExt = 'wav';
    else if (dataUrl.includes('audio/') || dataUrl.includes('m4a')) defaultExt = 'm4a';
  }
  const finalFilename = filename || `${safeBase}.${defaultExt}`;

  try {
    const savedPath = await downloadFileDirectly({
      filename: finalFilename,
      title,
      dataUrl,
      textContent,
      mimeType,
    });

    const isDesktopApp = isTauri();
    const displayName = savedPath.split(/[/\\]/).pop() || finalFilename;
    showSuccess(
      'Berhasil Diunduh',
      isDesktopApp
        ? `Berkas tersimpan di folder Unduhan (Downloads):\n${displayName}`
        : `Berkas ${finalFilename} berhasil diunduh ke perangkat.`
    );
  } catch (err) {
    console.error('Download error:', err);
    showError('Gagal Mengunduh', 'Tidak dapat mengekspor berkas ke perangkat.');
  }
}
