import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  RotateCw,
  Trash2,
  Plus,
  Zap,
  Check,
  Sparkles,
  Upload,
  RefreshCw,
  Sliders,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrandHeader } from '../ui/BrandHeader';
import { haptics } from '../../utils/haptics';
import { useSwipeBack } from '../../utils/useSwipeBack';
import { showConfirm } from '../../utils/swal';
import { autoEnhanceDocumentScan } from '../../utils/camScannerFilter';

export interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmCapture: (pages: string[], title: string) => void;
}

export const CameraScannerModal: React.FC<CameraScannerModalProps> = ({
  isOpen,
  onClose,
  onConfirmCapture,
}) => {
  const [rawPages, setRawPages] = useState<string[]>([]);
  const [pages, setPages] = useState<string[]>([]);
  const [cameraMode, setCameraMode] = useState<'normal' | 'camscanner'>('camscanner');
  const [isProcessingFilter, setIsProcessingFilter] = useState<boolean>(false);

  const handleRequestClose = async () => {
    if (pages.length > 0) {
      const confirmed = await showConfirm({
        title: 'Batalkan Pemindaian?',
        text: 'Foto dokumen yang telah diambil akan hilang.',
        confirmText: 'Ya, Keluar',
        isDestructive: true,
      });
      if (!confirmed) return;
    }
    stopCamera();
    setRawPages([]);
    setPages([]);
    onClose();
  };

  const swipeBackRef = useSwipeBack<HTMLDivElement>({
    onBack: handleRequestClose,
    enabled: isOpen && pages.length === 0, // Matikan swipe back jika sudah ada foto yang diambil
    threshold: 70,
  });
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [rotations, setRotations] = useState<number[]>([]);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [flashOn, setFlashOn] = useState(false);
  const [autoCrop, setAutoCrop] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      try {
        const track = streamRef.current.getVideoTracks()[0];
        if (track) {
          track.applyConstraints({ advanced: [{ torch: false } as any] }).catch(() => {});
        }
      } catch {}
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setFlashOn(false);
    setIsCameraActive(false);
  };

  const toggleFlashlight = async () => {
    haptics.impactLight();
    const nextState = !flashOn;

    try {
      const track = streamRef.current?.getVideoTracks()[0];
      if (track) {
        const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as any;
        if (capabilities && 'torch' in capabilities) {
          await track.applyConstraints({
            advanced: [{ torch: nextState } as any],
          });
        }
      }
    } catch (err) {
      console.warn('Gagal mengubah status lampu kilat:', err);
    }

    setFlashOn(nextState);
  };

  const startCamera = async (targetFacing: 'environment' | 'user' = facingMode) => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Kamera tidak didukung oleh peramban ini.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: targetFacing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Gagal mengakses kamera dengan facing mode:', targetFacing, err);
      // Fallback: coba kamera apapun tanpa batasan facingMode
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        streamRef.current = fallbackStream;
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          videoRef.current.play().catch(() => {});
        }
        setIsCameraActive(true);
      } catch (fallbackErr) {
        setCameraError(
          'Izin kamera belum aktif atau kamera sedang digunakan aplikasi lain. Anda dapat memilih foto dari galeri/berkas.'
        );
        setIsCameraActive(false);
      }
    }
  };

  const toggleCameraFacing = async () => {
    haptics.impactLight();
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    stopCamera();
    await startCamera(nextFacing);
  };

  // Inisialisasi Real Camera Stream saat modal terbuka
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setRawPages([]);
      setPages([]);
      setRotations([]);
      setActivePageIndex(0);
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // Ganti mode kamera (Biasa vs Enhance CamScanner)
  const handleModeChange = async (newMode: 'normal' | 'camscanner') => {
    if (newMode === cameraMode) return;
    haptics.impactLight();
    setCameraMode(newMode);

    // Jika sudah ada halaman aktif, terapkan/batalkan filter secara interaktif
    if (hasPages && rawPages[activePageIndex]) {
      const raw = rawPages[activePageIndex];
      if (newMode === 'normal') {
        setPages((prev) => {
          const next = [...prev];
          next[activePageIndex] = raw;
          return next;
        });
      } else {
        setIsProcessingFilter(true);
        try {
          const enhanced = await autoEnhanceDocumentScan(raw);
          setPages((prev) => {
            const next = [...prev];
            next[activePageIndex] = enhanced;
            return next;
          });
        } catch (err) {
          console.warn('Gagal enhance page:', err);
        } finally {
          setIsProcessingFilter(false);
        }
      }
    }
  };

  // Proses dan tambahkan dokumen sesuai mode kamera aktif
  const processAndAddPage = async (rawUrl: string) => {
    if (cameraMode === 'normal') {
      setRawPages((prev) => [...prev, rawUrl]);
      setPages((prev) => [...prev, rawUrl]);
      setRotations((prev) => [...prev, 0]);
      setActivePageIndex(pages.length);
      haptics.notificationSuccess();
      return;
    }

    setIsProcessingFilter(true);
    try {
      const filteredUrl = await autoEnhanceDocumentScan(rawUrl);
      setRawPages((prev) => [...prev, rawUrl]);
      setPages((prev) => [...prev, filteredUrl]);
      setRotations((prev) => [...prev, 0]);
      setActivePageIndex(pages.length);
      haptics.notificationSuccess();
    } catch (err) {
      console.warn('Gagal menerapkan filter scan otomatis:', err);
      setRawPages((prev) => [...prev, rawUrl]);
      setPages((prev) => [...prev, rawUrl]);
      setRotations((prev) => [...prev, 0]);
      setActivePageIndex(pages.length);
    } finally {
      setIsProcessingFilter(false);
    }
  };

  // Jepret foto dari live video stream ke canvas
  const handleShutter = async () => {
    if (videoRef.current && isCameraActive) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        await processAndAddPage(dataUrl);
        return;
      }
    }

    // Jika kamera tidak aktif, buka picker file
    fileInputRef.current?.click();
  };

  // Pilih foto dari file / galeri kamera
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const result = event.target?.result as string;
        if (result) {
          await processAndAddPage(result);
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    e.target.value = '';
  };

  // Rotasi fisik gambar sebesar 90 derajat searah jarum jam pada canvas HTML5
  const rotateImage90Deg = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.height;
        canvas.height = img.width;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((90 * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  // Putar dokumen yang sedang aktif sebesar 90 derajat
  const handleRotate = async () => {
    if (pages.length === 0) return;
    haptics.impactLight();

    const currentPage = pages[activePageIndex];
    const currentRaw = rawPages[activePageIndex];
    if (!currentPage) return;

    try {
      const rotatedProcessed = await rotateImage90Deg(currentPage);
      const rotatedRaw = currentRaw ? await rotateImage90Deg(currentRaw) : rotatedProcessed;

      setPages((prev) => {
        const next = [...prev];
        next[activePageIndex] = rotatedProcessed;
        return next;
      });

      setRawPages((prev) => {
        const next = [...prev];
        next[activePageIndex] = rotatedRaw;
        return next;
      });

      setRotations((prev) => {
        const next = [...prev];
        next[activePageIndex] = 0;
        return next;
      });
    } catch (err) {
      console.warn('Gagal merotasi gambar:', err);
    }
  };

  const handleRemovePage = () => {
    if (pages.length === 0) return;
    setRawPages((prev) => prev.filter((_, idx) => idx !== activePageIndex));
    setPages((prev) => prev.filter((_, idx) => idx !== activePageIndex));
    setRotations((prev) => prev.filter((_, idx) => idx !== activePageIndex));
    setActivePageIndex(Math.max(0, activePageIndex - 1));
  };

  const handleDone = () => {
    if (pages.length === 0) {
      handleShutter();
      return;
    }
    stopCamera();
    onConfirmCapture(pages, `Dokumen Pindai (${pages.length} Halaman)`);
    onClose();
  };

  const hasPages = pages.length > 0;
  const currentPreview = hasPages ? pages[activePageIndex] : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={swipeBackRef}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-50 bg-stone-950 flex flex-col justify-between select-none text-white"
        >
          {/* Hidden File Input untuk upload foto */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
          />

          {/* Top Brand Header */}
          <BrandHeader
            title="Pindai Dokumen"
            onBack={handleRequestClose}
            rightElement={
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    haptics.impactLight();
                    setAutoCrop(!autoCrop);
                  }}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs ${
                    autoCrop
                      ? 'bg-[#165a4c] text-white shadow-xs'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-600 border border-stone-200/80'
                  }`}
                >
                  <Sparkles className={`w-3 h-3 ${autoCrop ? 'text-amber-300' : 'text-stone-400'}`} />
                  <span>{autoCrop ? 'Pintar: ON' : 'Pintar: OFF'}</span>
                </button>
                <button
                  type="button"
                  onClick={toggleFlashlight}
                  title={flashOn ? 'Matikan Lampu Kilat' : 'Nyalakan Lampu Kilat'}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer border shadow-2xs ${
                    flashOn
                      ? 'bg-amber-400 border-amber-500 text-black shadow-xs ring-2 ring-amber-300'
                      : 'bg-stone-100 hover:bg-stone-200 border-stone-200/80 text-stone-600'
                  }`}
                  aria-label="Lampu Kilat"
                >
                  <Zap className={`w-3.5 h-3.5 ${flashOn ? 'fill-black' : ''}`} />
                </button>
              </div>
            }
          />

      {/* Viewfinder Area */}
      <div className="relative flex-1 flex items-center justify-center p-4 overflow-hidden">
        <div className="relative max-w-sm w-full aspect-[3/4] bg-stone-950 rounded-2xl overflow-hidden border border-white/20 shadow-2xl flex items-center justify-center">
          {/* Senter Layar / Screen Illumination saat Lampu Kilat aktif */}
          {flashOn && (
            <div className="absolute inset-0 bg-white/20 pointer-events-none z-10 border-4 border-amber-300/80 rounded-2xl shadow-[inset_0_0_50px_rgba(255,255,255,0.5)]" />
          )}

          {/* Status & Mode Bar */}
          <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none z-10">
            <span
              className={`bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 shadow-md border ${
                cameraMode === 'camscanner'
                  ? 'text-emerald-300 border-emerald-500/30'
                  : 'text-stone-200 border-white/15'
              }`}
            >
              {cameraMode === 'camscanner' ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Enhance CamScanner (Lurus & Jernih)</span>
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5 text-stone-300" />
                  <span>Mode Biasa (Foto Asli)</span>
                </>
              )}
            </span>
            {hasPages && (
              <span className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] text-stone-200 font-medium border border-white/10 shadow-md">
                {activePageIndex + 1} / {pages.length} Halaman
              </span>
            )}
          </div>

          {/* Live Camera Feed */}
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              hasPages && currentPreview ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          />

          {/* Captured Document Preview */}
          {hasPages && currentPreview && (
            <img
              src={currentPreview}
              alt={`Halaman ${activePageIndex + 1}`}
              className="w-full h-full object-contain transition-transform duration-300"
              style={{
                transform: `rotate(${rotations[activePageIndex] || 0}deg)`,
              }}
            />
          )}

          {/* Processing Filter Overlay */}
          {isProcessingFilter && (
            <div className="absolute inset-0 bg-stone-950/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-30 transition-all">
              <Loader2 className="w-9 h-9 text-emerald-400 animate-spin" />
              <span className="text-xs font-semibold text-emerald-100">
                Enhance CamScanner: Meluruskan & Memutihkan Kertas...
              </span>
            </div>
          )}

          {/* Fallback jika kamera bermasalah & belum ada foto */}
          {!hasPages && cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-stone-900/90 backdrop-blur-sm z-10">
              <Camera className="w-12 h-12 text-stone-500 mb-3" />
              <p className="text-xs text-stone-300 mb-4 leading-relaxed">
                {cameraError}
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-medium text-xs flex items-center gap-2 transition-all shadow-md"
              >
                <Upload className="w-4 h-4" />
                <span>Pilih Foto dari Galeri / Kamera</span>
              </button>
            </div>
          )}

          {/* Viewfinder Target Guidelines */}
          {autoCrop && (
            <div className="absolute inset-4 border-2 border-emerald-400/80 rounded-lg pointer-events-none shadow-[0_0_15px_rgba(52,211,153,0.3)]">
              {/* Sudut Frame CamScanner */}
              <div className="absolute -top-1.5 -left-1.5 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
              <div className="absolute -top-1.5 -right-1.5 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
              <div className="absolute -bottom-1.5 -left-1.5 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
              <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />

              {/* Animasi Garis Laser Scan */}
              <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse" />

              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] text-emerald-300 font-medium whitespace-nowrap border border-emerald-500/20">
                {hasPages ? `Halaman ${activePageIndex + 1} Terpilih` : 'Posisikan Dokumen / Struk Dalam Bingkai'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls & Tools Footer */}
      <div
        className="px-4 py-3 bg-gradient-to-t from-black/95 via-black/85 to-transparent flex flex-col gap-3 z-20"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 24px)' }}
      >
        {/* Multi-page Navigation Bar */}
        {hasPages && (
          <div className="flex items-center justify-center gap-2 overflow-x-auto py-1">
            {pages.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActivePageIndex(idx)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  activePageIndex === idx
                    ? 'bg-white text-black scale-105 shadow-md'
                    : 'bg-white/20 text-white/70 hover:bg-white/30'
                }`}
              >
                Halaman {idx + 1}
              </button>
            ))}
            <button
              onClick={() => {
                // Berpindah ke mode live camera untuk ambil halaman baru
                if (!isCameraActive) startCamera();
                fileInputRef.current?.click();
              }}
              className="px-2.5 py-1 rounded-full bg-emerald-500/30 hover:bg-emerald-500/40 text-emerald-300 border border-emerald-400/40 text-xs flex items-center gap-1 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah</span>
            </button>
          </div>
        )}

        {/* Selector Opsi: Biasa vs Enhance CamScanner */}
        <div className="flex items-center justify-center pt-0.5">
          <div className="inline-flex p-1 bg-white/10 backdrop-blur-md rounded-full border border-white/15 shadow-lg">
            <button
              type="button"
              onClick={() => handleModeChange('normal')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                cameraMode === 'normal'
                  ? 'bg-white text-stone-900 shadow-md'
                  : 'text-white/75 hover:text-white hover:bg-white/5'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Biasa</span>
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('camscanner')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                cameraMode === 'camscanner'
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                  : 'text-white/75 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Enhance CamScanner</span>
            </button>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center justify-between max-w-sm mx-auto w-full px-4">
          {/* Left Action: Upload dari Galeri atau Putar */}
          {hasPages ? (
            <button
              onClick={handleRotate}
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white flex flex-col items-center gap-1"
              title="Putar Dokumen"
            >
              <RotateCw className="w-5 h-5" />
              <span className="text-[10px] text-white/70">Putar</span>
            </button>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white flex flex-col items-center gap-1"
              title="Unggah dari Berkas / Galeri"
            >
              <Upload className="w-5 h-5" />
              <span className="text-[10px] text-white/70">Berkas</span>
            </button>
          )}

          {/* Center Action: Shutter Jepret Kamera / Pindai Selesai */}
          {hasPages ? (
            <button
              onClick={handleDone}
              className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-emerald-500/40"
              aria-label="Selesai & Pindai OCR"
            >
              <Check className="w-8 h-8 stroke-[3]" />
            </button>
          ) : (
            <button
              onClick={handleShutter}
              className="w-16 h-16 rounded-full bg-white hover:bg-stone-100 active:scale-90 text-stone-900 flex items-center justify-center shadow-lg shadow-white/20 border-4 border-stone-300"
              aria-label="Ambil Foto"
            >
              <div className="w-11 h-11 rounded-full bg-stone-900 flex items-center justify-center text-white">
                <Camera className="w-5 h-5" />
              </div>
            </button>
          )}

          {/* Right Action: Hapus Halaman atau Ganti Kamera */}
          {hasPages ? (
            <button
              onClick={handleRemovePage}
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-rose-300 flex flex-col items-center gap-1"
              title="Hapus Halaman Ini"
            >
              <Trash2 className="w-5 h-5" />
              <span className="text-[10px] text-white/70">Hapus</span>
            </button>
          ) : (
            <button
              onClick={toggleCameraFacing}
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white flex flex-col items-center gap-1 cursor-pointer"
              title="Putar Kamera (Depan / Belakang)"
            >
              <RefreshCw className="w-5 h-5 transition-transform active:rotate-180 duration-300" />
              <span className="text-[10px] text-white/70">
                {facingMode === 'environment' ? 'Putar Kamera' : 'Kamera Belakang'}
              </span>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )}
</AnimatePresence>
  );
};
