/**
 * CamScanner Image Enhancement & Auto-Straightening Engine
 * Otomatis meluruskan dokumen (Deskewing), memotong tepi meja (Auto-Crop),
 * memutihkan kertas (Retinex Background Normalization), dan mempertajam tinta teks
 * serta mempertahankan warna stempel / tanda tangan nyata secara otomatis tanpa pilihan manual.
 */

/**
 * Mendeteksi kemiringan dokumen (-10° hingga +10°) menggunakan varians proyeksi horizontal
 * dan merotasi canvas agar teks dan garis dokumen lurus sempurna.
 */
function deskewCanvas(canvas: HTMLCanvasElement): HTMLCanvasElement {
  try {
    const width = canvas.width;
    const height = canvas.height;
    if (width < 60 || height < 60) return canvas;

    // Gunakan thumbnail resolusi rendah untuk deteksi sudut ultra cepat (<25ms)
    const scale = Math.min(1, 380 / Math.max(width, height));
    const smallW = Math.round(width * scale);
    const smallH = Math.round(height * scale);

    const smallCanvas = document.createElement('canvas');
    smallCanvas.width = smallW;
    smallCanvas.height = smallH;
    const smallCtx = smallCanvas.getContext('2d');
    if (!smallCtx) return canvas;

    smallCtx.drawImage(canvas, 0, 0, smallW, smallH);
    const imgData = smallCtx.getImageData(0, 0, smallW, smallH);
    const data = imgData.data;

    // Ekstrak citra gradien horizontal (mendeteksi garis baris teks)
    const edges = new Uint8Array(smallW * smallH);
    for (let y = 1; y < smallH - 1; y++) {
      for (let x = 1; x < smallW - 1; x++) {
        const top = ((y - 1) * smallW + x) * 4;
        const btm = ((y + 1) * smallW + x) * 4;
        const lumT = 0.299 * data[top] + 0.587 * data[top + 1] + 0.114 * data[top + 2];
        const lumB = 0.299 * data[btm] + 0.587 * data[btm + 1] + 0.114 * data[btm + 2];
        edges[y * smallW + x] = Math.abs(lumT - lumB) > 22 ? 1 : 0;
      }
    }

    let bestAngle = 0;
    let maxVariance = -1;

    // Uji rentang sudut kemiringan dari -8° s/d +8° dengan interval 0.5°
    for (let deg = -8; deg <= 8; deg += 0.5) {
      if (deg === 0) continue;
      const rad = (deg * Math.PI) / 180;
      const tan = Math.tan(rad);
      const halfW = smallW / 2;

      const rowSums = new Float32Array(smallH);
      for (let y = 6; y < smallH - 6; y++) {
        let sum = 0;
        for (let x = 10; x < smallW - 10; x += 2) {
          const shiftedY = Math.round(y + (x - halfW) * tan);
          if (shiftedY >= 0 && shiftedY < smallH) {
            sum += edges[shiftedY * smallW + x];
          }
        }
        rowSums[y] = sum;
      }

      // Hitung varians baris: saat lurus sempurna, baris teks menghasilkan puncak dan lembah tertinggi
      let mean = 0;
      let count = 0;
      for (let y = 6; y < smallH - 6; y++) {
        mean += rowSums[y];
        count++;
      }
      mean /= Math.max(1, count);

      let variance = 0;
      for (let y = 6; y < smallH - 6; y++) {
        const diff = rowSums[y] - mean;
        variance += diff * diff;
      }

      if (variance > maxVariance) {
        maxVariance = variance;
        bestAngle = deg;
      }
    }

    // Terapkan rotasi jika terdeteksi kemiringan nyata (|angle| >= 0.75°)
    if (Math.abs(bestAngle) >= 0.75) {
      const rotCanvas = document.createElement('canvas');
      rotCanvas.width = width;
      rotCanvas.height = height;
      const rotCtx = rotCanvas.getContext('2d');
      if (rotCtx) {
        rotCtx.fillStyle = '#FFFFFF';
        rotCtx.fillRect(0, 0, width, height);
        rotCtx.save();
        rotCtx.translate(width / 2, height / 2);
        rotCtx.rotate((-bestAngle * Math.PI) / 180);
        rotCtx.drawImage(canvas, -width / 2, -height / 2);
        rotCtx.restore();
        return rotCanvas;
      }
    }
  } catch (err) {
    console.warn('Auto-deskew failed, using original rotation:', err);
  }
  return canvas;
}

/**
 * Mendeteksi batas dokumen kertas dan memotong latar belakang gelap/meja di sekelilingnya
 */
function autoCropDocumentBounds(canvas: HTMLCanvasElement): HTMLCanvasElement {
  try {
    const width = canvas.width;
    const height = canvas.height;
    if (width < 200 || height < 200) return canvas;

    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // Ambil rata-rata luminansi bagian tengah (kertas)
    const midX = Math.floor(width * 0.25);
    const midY = Math.floor(height * 0.25);
    let centerLumSum = 0;
    let centerCount = 0;

    for (let y = midY; y < height - midY; y += 4) {
      for (let x = midX; x < width - midX; x += 4) {
        const i = (y * width + x) * 4;
        centerLumSum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        centerCount++;
      }
    }
    const centerAvgLum = centerCount > 0 ? centerLumSum / centerCount : 200;
    const bgCutoff = Math.max(45, centerAvgLum * 0.65);

    let top = 0;
    let bottom = height - 1;
    let left = 0;
    let right = width - 1;

    const maxScanY = Math.floor(height * 0.14);
    for (let y = 0; y < maxScanY; y += 2) {
      let rowLum = 0;
      let samples = 0;
      for (let x = Math.floor(width * 0.2); x < width * 0.8; x += 6) {
        const i = (y * width + x) * 4;
        rowLum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        samples++;
      }
      if (rowLum / Math.max(1, samples) < bgCutoff) {
        top = y;
      }
    }

    for (let y = height - 1; y > height - maxScanY; y -= 2) {
      let rowLum = 0;
      let samples = 0;
      for (let x = Math.floor(width * 0.2); x < width * 0.8; x += 6) {
        const i = (y * width + x) * 4;
        rowLum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        samples++;
      }
      if (rowLum / Math.max(1, samples) < bgCutoff) {
        bottom = y;
      }
    }

    const maxScanX = Math.floor(width * 0.14);
    for (let x = 0; x < maxScanX; x += 2) {
      let colLum = 0;
      let samples = 0;
      for (let y = Math.floor(height * 0.2); y < height * 0.8; y += 6) {
        const i = (y * width + x) * 4;
        colLum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        samples++;
      }
      if (colLum / Math.max(1, samples) < bgCutoff) {
        left = x;
      }
    }

    for (let x = width - 1; x > width - maxScanX; x -= 2) {
      let colLum = 0;
      let samples = 0;
      for (let y = Math.floor(height * 0.2); y < height * 0.8; y += 6) {
        const i = (y * width + x) * 4;
        colLum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        samples++;
      }
      if (colLum / Math.max(1, samples) < bgCutoff) {
        right = x;
      }
    }

    const cropW = right - left;
    const cropH = bottom - top;

    // Pastikan hasil crop valid dan tidak memotong teks isi dokumen
    if (cropW > width * 0.78 && cropH > height * 0.78 && (left > 0 || top > 0 || right < width - 1 || bottom < height - 1)) {
      const croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = cropW;
      croppedCanvas.height = cropH;
      const croppedCtx = croppedCanvas.getContext('2d');
      if (croppedCtx) {
        croppedCtx.drawImage(canvas, left, top, cropW, cropH, 0, 0, cropW, cropH);
        return croppedCanvas;
      }
    }
  } catch (err) {
    console.warn('Auto-crop bounds skipped:', err);
  }
  return canvas;
}

/**
 * Filter Magic Color Otomatis ala CamScanner:
 * - Menghilangkan bayangan lampu & memutihkan kertas (Retinex background normalization)
 * - Mempertegas tinta hitam teks cetak & tulisan tangan
 * - Mempertahankan warna stempel merah/biru dan tanda tangan
 */
function applyCamScannerAutoColor(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const width = canvas.width;
  const height = canvas.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // 1. Grid 16x16 untuk mengestimasi luminansi latar belakang lokal (menghilangkan bayangan dan flash hotspot)
  const blockW = Math.max(16, Math.floor(width / 16));
  const blockH = Math.max(16, Math.floor(height / 16));
  const gridCols = Math.ceil(width / blockW);
  const gridRows = Math.ceil(height / blockH);
  const bgLums = new Float32Array(gridCols * gridRows);

  for (let gy = 0; gy < gridRows; gy++) {
    for (let gx = 0; gx < gridCols; gx++) {
      const startX = gx * blockW;
      const startY = gy * blockH;
      const endX = Math.min(width, startX + blockW);
      const endY = Math.min(height, startY + blockH);

      const samples: number[] = [];
      for (let y = startY; y < endY; y += 3) {
        for (let x = startX; x < endX; x += 3) {
          const i = (y * width + x) * 4;
          const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          samples.push(lum);
        }
      }
      samples.sort((a, b) => a - b);
      const p90 = samples.length > 0 ? samples[Math.floor(samples.length * 0.88)] : 220;
      bgLums[gy * gridCols + gx] = Math.max(120, p90);
    }
  }

  // 2. Normalisasi setiap pixel
  for (let y = 0; y < height; y++) {
    const gy = Math.min(gridRows - 1, Math.floor(y / blockH));
    for (let x = 0; x < width; x++) {
      const gx = Math.min(gridCols - 1, Math.floor(x / blockW));
      const localBg = bgLums[gy * gridCols + gx];
      const i = (y * width + x) * 4;

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const saturation = maxC - minC;
      const isColoredInk = saturation > 26;

      const normLum = (lum / localBg) * 255;

      if (isColoredInk) {
        // Tinta berwarna / stempel: pertahankan warna asli dan tingkatkan kejernihan
        const colorBoost = Math.min(1.4, 255 / Math.max(maxC, 1));
        data[i] = Math.min(255, Math.round(r * colorBoost));
        data[i + 1] = Math.min(255, Math.round(g * colorBoost));
        data[i + 2] = Math.min(255, Math.round(b * colorBoost));
      } else if (normLum > 172) {
        // Kertas putih bersih (hilangkan bayangan kuning/abu-abu)
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
      } else if (normLum < 118) {
        // Teks gelap dipertajam & dihitamkan pekat
        const darkFactor = 0.6;
        data[i] = Math.round(r * darkFactor);
        data[i + 1] = Math.round(g * darkFactor);
        data[i + 2] = Math.round(b * darkFactor);
      } else {
        // Midtone kontras halus
        const midRatio = (normLum - 118) / 54;
        const target = Math.round(midRatio * 255);
        data[i] = Math.min(255, Math.max(0, target));
        data[i + 1] = Math.min(255, Math.max(0, target));
        data[i + 2] = Math.min(255, Math.max(0, target));
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * Pemrosesan Pindai Otomatis CamScanner Lengkap:
 * Menggabungkan deteksi kemiringan (lurus otomatis), pemotongan batas (auto-crop),
 * dan pembersihan warna/bayangan (Magic Color) tanpa perlu intervensi manual.
 */
export async function autoEnhanceDocumentScan(imageSource: string): Promise<string> {
  if (!imageSource || typeof window === 'undefined') {
    return imageSource;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        let canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageSource);
          return;
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // 1. Auto-Crop: Potong latar luar / pinggiran meja
        canvas = autoCropDocumentBounds(canvas);

        // 2. Auto-Deskew: Luruskan posisi dokumen secara otomatis
        canvas = deskewCanvas(canvas);

        // 3. Auto-Color: Efek Magic Color CamScanner (kertas putih bersih, teks pekat, stempel hidup)
        canvas = applyCamScannerAutoColor(canvas);

        resolve(canvas.toDataURL('image/jpeg', 0.94));
      } catch (err) {
        console.warn('Gagal auto-enhance dokumen:', err);
        resolve(imageSource);
      }
    };

    img.onerror = () => resolve(imageSource);
    img.src = imageSource;
  });
}

/**
 * Kompatibilitas mundur jika dipanggil dari tempat lain
 */
export async function applyCamScannerFilter(
  imageSource: string,
  _mode?: string
): Promise<string> {
  return autoEnhanceDocumentScan(imageSource);
}
