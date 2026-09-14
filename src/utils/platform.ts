import { Capacitor } from '@capacitor/core';

/**
 * Platform Detection Helper
 * Mengidentifikasi lingkungan eksekusi secara aman:
 * - isCapacitor: native Android / iOS
 * - isTauri: native Windows / macOS desktop
 * - isDesktop: layar desktop atau runtime Tauri
 */

export const isCapacitor = (): boolean => {
  return Capacitor.isNativePlatform();
};

export const isTauri = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    '__TAURI_INTERNALS__' in window ||
    '__TAURI__' in window ||
    Boolean((window as any).__TAURI_METADATA__)
  );
};

export const isMobile = (): boolean => {
  if (isCapacitor()) return true;
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

export const isDesktop = (): boolean => {
  return isTauri() || !isMobile();
};
