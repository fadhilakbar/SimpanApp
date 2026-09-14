import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { ArchiveRecord } from '../types/record';
import { blobDb } from './storageService';

/**
 * Mengonversi Base64 string menjadi Blob in-memory
 */
export function b64toBlob(b64Data: string, contentType = 'audio/webm'): Blob {
  try {
    const cleanB64 = b64Data.replace(/^data:[^;]+;base64,/, '');
    const byteCharacters = atob(cleanB64);
    const byteNumbers = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    return new Blob([byteNumbers.buffer as ArrayBuffer], { type: contentType });
  } catch (err) {
    console.warn('b64toBlob conversion error:', err);
    return new Blob([], { type: contentType });
  }
}

/**
 * Menyelesaikan sumber rekaman audio menjadi URL Blob in-memory yang dapat diputar secara native
 * oleh Android WebView, iOS Safari, dan Desktop browser.
 * Mengatasi kendala Android WebView yang menolak streaming HTTP dari `_capacitor_file_`.
 */
export async function getPlayableAudioUrl(record: ArchiveRecord): Promise<string | undefined> {
  const mime = record.mimeType || 'audio/webm';

  // 1. Jika sudah berupa Blob URL aktif, gunakan langsung
  if (record.originalDataUrl && record.originalDataUrl.startsWith('blob:')) {
    return record.originalDataUrl;
  }

  // 2. Jika berupa Data URL Base64 (data:audio/...)
  if (record.originalDataUrl && record.originalDataUrl.startsWith('data:')) {
    try {
      const blob = b64toBlob(record.originalDataUrl, mime);
      if (blob.size > 0) {
        return URL.createObjectURL(blob);
      }
    } catch {
      return record.originalDataUrl;
    }
  }

  // 3. Jika berkas tersimpan di Documents/SIMPAN (Native Capacitor)
  if (Capacitor.isNativePlatform()) {
    const pathsToTry = [
      record.localFilePath,
      record.originalFileName ? `SIMPAN/${record.originalFileName}` : undefined,
    ].filter(Boolean) as string[];

    for (const filePath of pathsToTry) {
      try {
        let readResult;
        if (filePath.startsWith('/') || filePath.startsWith('file://')) {
          readResult = await Filesystem.readFile({ path: filePath });
        } else {
          readResult = await Filesystem.readFile({
            path: filePath,
            directory: Directory.Documents,
          });
        }
        const b64Data = typeof readResult.data === 'string' ? readResult.data : '';
        if (b64Data) {
          const blob = b64toBlob(b64Data, mime);
          if (blob.size > 0) {
            return URL.createObjectURL(blob);
          }
        }
      } catch (_err) {
        // Coba jalur berikutnya jika ada
      }
    }
  }

  // 4. Jika disimpan di browser blob store (blob://)
  if (record.localFilePath && record.localFilePath.startsWith('blob://')) {
    try {
      const blobId = record.localFilePath.replace('blob://', '');
      const item = await blobDb.blobs.get(blobId);
      if (item && item.blob) {
        return URL.createObjectURL(item.blob);
      }
    } catch (err) {
      console.warn('Gagal membaca blobDb:', err);
    }
  }

  // 5. Jika ada URL HTTP / Capacitor, unduh via fetch() menjadi in-memory Blob
  // Ini memotong batasan Chromium Android WebView yang menolak streaming Range request dari _capacitor_file_
  const possibleHttpUrl = record.originalDataUrl || record.thumbnailDataUrl;
  if (
    possibleHttpUrl &&
    (possibleHttpUrl.startsWith('http://') ||
      possibleHttpUrl.startsWith('https://') ||
      possibleHttpUrl.startsWith('capacitor://'))
  ) {
    try {
      const res = await fetch(possibleHttpUrl);
      if (res.ok) {
        const fetchedBlob = await res.blob();
        if (fetchedBlob.size > 0) {
          return URL.createObjectURL(fetchedBlob);
        }
      }
    } catch (fetchErr) {
      console.warn('Gagal fetch audio ke blob:', fetchErr);
    }
  }

  // 6. Fallback ke originalDataUrl atau thumbnailDataUrl
  return record.originalDataUrl || record.thumbnailDataUrl;
}

/**
 * Player Audio Cadangan berbasis Web Audio API (AudioContext)
 * Berjalan pada level hardware audio buffer untuk menjamin suara selalu dapat diputar
 * bahkan jika tag <audio> mengalami kendala codec di perangkat tertentu.
 */
class WebAudioPlayer {
  private ctx: AudioContext | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private startTime = 0;
  private pauseOffset = 0;
  private isPlayingState = false;
  private timerInterval: any = null;

  async load(urlOrBase64: string): Promise<boolean> {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return false;
      if (!this.ctx || this.ctx.state === 'closed') {
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      let arrayBuffer: ArrayBuffer;
      if (urlOrBase64.startsWith('data:')) {
        const parts = urlOrBase64.split(',');
        const b64 = parts[1] || parts[0];
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        arrayBuffer = bytes.buffer;
      } else {
        const res = await fetch(urlOrBase64);
        arrayBuffer = await res.arrayBuffer();
      }

      this.audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
      this.pauseOffset = 0;
      return true;
    } catch (err) {
      console.warn('Web Audio API decode error:', err);
      return false;
    }
  }

  play(onEnded?: () => void, onTimeUpdate?: (sec: number) => void): boolean {
    if (!this.ctx || !this.audioBuffer) return false;
    try {
      this.stop();
      const source = this.ctx.createBufferSource();
      source.buffer = this.audioBuffer;
      source.connect(this.ctx.destination);
      source.onended = () => {
        this.isPlayingState = false;
        if (this.timerInterval) clearInterval(this.timerInterval);
        if (onEnded) onEnded();
      };

      this.startTime = this.ctx.currentTime - this.pauseOffset;
      source.start(0, this.pauseOffset);
      this.sourceNode = source;
      this.isPlayingState = true;

      if (onTimeUpdate) {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
          if (this.isPlayingState && this.ctx) {
            const current = Math.min(
              this.getDuration(),
              this.ctx.currentTime - this.startTime
            );
            onTimeUpdate(Math.round(current));
          }
        }, 250);
      }

      return true;
    } catch (err) {
      console.warn('Web Audio API play error:', err);
      return false;
    }
  }

  pause() {
    if (!this.ctx || !this.sourceNode || !this.isPlayingState) return;
    try {
      this.pauseOffset = this.ctx.currentTime - this.startTime;
      this.sourceNode.stop();
      this.sourceNode.disconnect();
      this.sourceNode = null;
      this.isPlayingState = false;
      if (this.timerInterval) clearInterval(this.timerInterval);
    } catch {}
  }

  stop() {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch {}
      this.sourceNode = null;
    }
    this.isPlayingState = false;
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  seek(sec: number) {
    this.pauseOffset = Math.max(0, Math.min(this.getDuration(), sec));
  }

  getDuration(): number {
    return this.audioBuffer ? this.audioBuffer.duration : 0;
  }

  isPlaying(): boolean {
    return this.isPlayingState;
  }
}

export const webAudioPlayer = new WebAudioPlayer();
