import React, { useState, useEffect } from 'react';
import {
  X,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  FileText,
  Scan,
} from 'lucide-react';
import { aiSoundReader, AISoundReaderState } from '../../services/aiSoundReader';
import { runRealOCR } from '../../services/ocrService';
import { useToast, BrandLoader } from '../ui';
import { copyToClipboard } from '../../utils/clipboard';

export interface OCRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawText: string;
  imageSource?: string;
  title: string;
  onSaveText?: (newText: string) => void;
}

export const OCRScannerModal: React.FC<OCRScannerModalProps> = ({
  isOpen,
  onClose,
  rawText,
  imageSource,
  title,
  onSaveText,
}) => {
  const toast = useToast();
  const [currentText, setCurrentText] = useState(rawText);
  const [isCopied, setIsCopied] = useState(false);
  const [isReScanning, setIsReScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const [readerState, setReaderState] = useState<AISoundReaderState>({
    isPlaying: false,
    isPaused: false,
    currentText: '',
  });

  useEffect(() => {
    setCurrentText(rawText);
  }, [rawText]);

  useEffect(() => {
    // Subscribe ke status AI Sound Reader
    const unsubscribe = aiSoundReader.subscribe(setReaderState);
    return () => {
      unsubscribe();
      aiSoundReader.stop();
    };
  }, []);

  if (!isOpen) return null;

  // AI Reader Sound Controls
  const handleTogglePlay = () => {
    if (readerState.isPlaying) {
      if (readerState.isPaused) {
        aiSoundReader.resume();
      } else {
        aiSoundReader.pause();
      }
    } else {
      const textToRead = `${title}. ${currentText || 'Tidak ada teks yang dapat dibaca.'}`;
      aiSoundReader.speak(textToRead, () => {
        toast.info('Selesai membacakan dokumen.');
      });
    }
  };

  const handleStopReader = () => {
    aiSoundReader.stop();
  };

  const handleCopyText = () => {
    if (!currentText) return;
    copyToClipboard(currentText);
    setIsCopied(true);
    toast.success('Teks berhasil disalin ke clipboard.');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleReScan = async () => {
    if (!imageSource) {
      toast.error('Tidak ada berkas gambar untuk dipindai.');
      return;
    }
    setIsReScanning(true);
    setScanStatus('Menyiapkan gambar...');
    try {
      const text = await runRealOCR(imageSource, (status) => setScanStatus(status));
      if (text) {
        setCurrentText(text);
        if (onSaveText) onSaveText(text);
        toast.success('OCR selesai! Teks berhasil diekstrak.');
      } else {
        toast.info('Tidak ada karakter baru yang terdeteksi.');
      }
    } catch {
      toast.error('Gagal menjalankan OCR.');
    } finally {
      setIsReScanning(false);
      setScanStatus('');
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in select-none">
      <div className="w-full max-w-lg bg-[#FAF9F6] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh] relative">
        {isReScanning && (
          <BrandLoader
            mode="overlay"
            size="md"
            title="Memindai Ulang Dokumen..."
            subtitle={scanStatus || 'Mengekstrak karakter OCR lokal'}
          />
        )}
        {/* Header */}
        <div className="px-5 py-4 bg-white border-b border-stone-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#165a4c] flex items-center justify-center">
              <Scan className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">
                Pindai Teks &amp; AI Reader
              </h3>
              <p className="text-[10px] text-stone-400 truncate max-w-[220px]">
                {title}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              aiSoundReader.stop();
              onClose();
            }}
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 active:scale-95 transition-all"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* AI Reader Sound Control Panel */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-emerald-50 via-[#F2FAF5] to-teal-50 border-b border-emerald-200/60">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-white transition-all shadow-xs ${
                  readerState.isPlaying && !readerState.isPaused
                    ? 'bg-emerald-600 animate-pulse'
                    : 'bg-[#165a4c]'
                }`}
              >
                {readerState.isPlaying ? (
                  <Volume2 className="w-4 h-4" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
              </div>
              <div>
                <h4 className="text-xs font-bold text-stone-900">
                  AI Reader Sound
                </h4>
                <p className="text-[10px] text-stone-500">
                  {readerState.isPlaying
                    ? readerState.isPaused
                      ? 'Suara dijeda'
                      : 'Sedang membacakan dokumen...'
                    : 'Dengarkan isi dokumen secara otomatis'}
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleTogglePlay}
                className="py-1.5 px-3 rounded-full bg-[#165a4c] hover:bg-[#134e48] active:scale-95 text-white text-xs font-semibold shadow-xs flex items-center gap-1 transition-all"
              >
                {readerState.isPlaying && !readerState.isPaused ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>Jeda</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>{readerState.isPaused ? 'Lanjut' : 'Putar'}</span>
                  </>
                )}
              </button>

              {readerState.isPlaying && (
                <button
                  onClick={handleStopReader}
                  className="p-1.5 rounded-full bg-stone-200 text-stone-700 hover:bg-stone-300 active:scale-95 transition-all"
                  aria-label="Stop Suara"
                >
                  <VolumeX className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Text Body Editor / Viewer */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-stone-400" />
              <span>Teks Hasil OCR</span>
            </span>

            <div className="flex items-center gap-2">
              {imageSource && (
                <button
                  onClick={handleReScan}
                  disabled={isReScanning}
                  className="text-[11px] font-semibold text-[#165a4c] hover:underline flex items-center gap-1 disabled:opacity-50"
                >
                  <RotateCcw
                    className={`w-3 h-3 ${isReScanning ? 'animate-spin' : ''}`}
                  />
                  <span>{isReScanning ? scanStatus || 'Memindai...' : 'Pindai Ulang'}</span>
                </button>
              )}

              <button
                onClick={handleCopyText}
                className="text-[11px] font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-1 bg-white border border-stone-200 px-2.5 py-1 rounded-full shadow-2xs"
              >
                {isCopied ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>{isCopied ? 'Tersalin' : 'Salin Teks'}</span>
              </button>
            </div>
          </div>

          <textarea
            rows={10}
            value={currentText}
            onChange={(e) => {
              setCurrentText(e.target.value);
              if (onSaveText) onSaveText(e.target.value);
            }}
            placeholder="Teks belum diekstrak..."
            className="w-full bg-white p-3.5 rounded-2xl border border-stone-200/90 shadow-2xs text-xs font-mono text-stone-800 outline-none focus:border-[#165a4c] leading-relaxed resize-none"
          />
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-white border-t border-stone-200/80 flex items-center justify-between">
          <span className="text-[10px] text-stone-400">
            {currentText.length} karakter terdeteksi
          </span>
          <button
            onClick={() => {
              aiSoundReader.stop();
              onClose();
            }}
            className="py-2 px-5 rounded-full bg-[#165a4c] text-white text-xs font-semibold hover:bg-[#134e48] active:scale-95 transition-all"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
