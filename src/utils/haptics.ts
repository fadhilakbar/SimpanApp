import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/**
 * SIMPAN Haptic Engine
 * Native Taptic Engine (iOS) & Vibrator (Android) lewat @capacitor/haptics.
 * `navigator.vibrate` tidak pernah didukung di WKWebView/Safari iOS, jadi
 * jalur native wajib lewat plugin ini agar getaran benar-benar terasa.
 * Fallback navigator.vibrate + Web Audio dipakai saat berjalan di browser/PWA.
 */

const isNative = Capacitor.isNativePlatform();

class HapticEngine {
  private audioCtx: AudioContext | null = null;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtxClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  // Sintesis audio klik haptic mikro khas iOS (dipakai hanya sebagai fallback web)
  private playMicroPulse(freq: number, durationMs: number, gainVal: number) {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(gainVal, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        ctx.currentTime + durationMs / 1000
      );

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + durationMs / 1000);
    } catch {
      // safe fallback
    }
  }

  private fallbackVibrate(pattern: number | number[]) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch {}
    }
  }

  // Sentuhan ringan (misal: tombol keyboard PIN, filter chip, toggle)
  impactLight() {
    if (isNative) {
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
      return;
    }
    this.fallbackVibrate(10);
    this.playMicroPulse(160, 20, 0.04);
  }

  // Sentuhan menengah (misal: tab bar click, simpan tombol)
  impactMedium() {
    if (isNative) {
      Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
      return;
    }
    this.fallbackVibrate(25);
    this.playMicroPulse(130, 30, 0.08);
  }

  // Sentuhan tombol kamera / shutter
  shutter() {
    if (isNative) {
      Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
      return;
    }
    this.fallbackVibrate([15, 30, 20]);
    this.playMicroPulse(220, 35, 0.12);
  }

  // Sukses (simpan arsip, ganti PIN sukses)
  notificationSuccess() {
    if (isNative) {
      Haptics.notification({ type: NotificationType.Success }).catch(() => {});
      return;
    }
    this.fallbackVibrate([15, 50, 25]);
    this.playMicroPulse(320, 45, 0.1);
  }

  // Peringatan / Salah PIN
  notificationWarning() {
    if (isNative) {
      Haptics.notification({ type: NotificationType.Warning }).catch(() => {});
      return;
    }
    this.fallbackVibrate([40, 60, 40]);
    this.playMicroPulse(90, 60, 0.15);
  }
}

export const haptics = new HapticEngine();
