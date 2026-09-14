import { Capacitor } from '@capacitor/core';
import { Clipboard } from '@capacitor/clipboard';

/**
 * Menyalin teks ke clipboard. Android System WebView tidak selalu
 * mengekspos navigator.clipboard secara konsisten, jadi jalur native
 * wajib lewat @capacitor/clipboard agar selalu berhasil.
 */
export async function copyToClipboard(text: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await Clipboard.write({ string: text });
    return;
  }
  await navigator.clipboard.writeText(text);
}
