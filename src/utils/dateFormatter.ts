/**
 * Format helper untuk tanggal dan jam lokal perangkat (Real Device Time).
 * Menjamin penulisan jam menggunakan titik dua (contoh: 21:00, bukan 21.01)
 * dan selalu mengacu pada waktu lokal perangkat pengguna (menghindari selisih jam UTC).
 */

/**
 * Format jam lokal perangkat ke format standar digital "HH:mm" (contoh: "21:00", "09:45").
 * Selalu menggunakan pemisah colon (:) dan zona waktu lokal perangkat pengguna.
 */
export function formatDeviceTime(dateInput?: Date | string | number | null): string {
  if (!dateInput) {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Format tanggal lokal perangkat (contoh: "13 Sep 2026" atau "13 September 2026").
 */
export function formatDeviceDate(
  dateInput?: Date | string | number | null,
  options: { monthFormat?: 'short' | 'long'; withYear?: boolean } = {
    monthFormat: 'short',
    withYear: true,
  }
): string {
  if (!dateInput) return '';
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return '';

  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: options.monthFormat || 'short',
    ...(options.withYear !== false ? { year: 'numeric' } : {}),
  });
}

/**
 * Format tanggal & jam lokal lengkap (contoh: "13 Sep 2026, 21:00").
 */
export function formatDeviceDateTime(
  dateInput?: Date | string | number | null,
  options: { monthFormat?: 'short' | 'long' } = { monthFormat: 'short' }
): string {
  if (!dateInput) return '';
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return '';

  const dateStr = formatDeviceDate(d, options);
  const timeStr = formatDeviceTime(d);
  return `${dateStr}, ${timeStr}`;
}

/**
 * Normalisasi string jam dari OCR atau input teks agar selalu menggunakan format "HH:mm".
 * Mengubah "21.00" atau "21.01" menjadi "21:00" atau "21:01".
 * Jika tidak ditemukan jam, mengembalikan jam perangkat saat ini.
 */
export function normalizeDeviceTime(timeStr?: string): string {
  if (!timeStr) {
    return formatDeviceTime();
  }

  const match = timeStr.match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/);
  if (match) {
    const h = match[1].padStart(2, '0');
    const m = match[2];
    return `${h}:${m}`;
  }

  return formatDeviceTime();
}
