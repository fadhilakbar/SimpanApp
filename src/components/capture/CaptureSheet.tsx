import React, { useRef, useState } from 'react';
import {
  Camera,
  Image as ImageIcon,
  FileText,
  PenLine,
  Mic,
  ScanLine,
  ChevronRight,
  Lightbulb,
  X,
  ArrowLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArchiveRecord } from '../../types/record';
import { PlantBadge } from '../ui/PlantBadge';
import { BrandLoader } from '../ui/BrandLoader';
import { haptics } from '../../utils/haptics';
import { formatDeviceDate } from '../../utils/dateFormatter';
import { RecordThumbnail } from '../record/RecordThumbnail';
import { useSwipeBack } from '../../utils/useSwipeBack';

export interface CaptureSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCamera: () => void;
  onSelectGallery: (file: File) => void;
  onSelectPDF: (file: File) => void;
  onSelectBatchFiles?: (files: File[]) => void;
  onSelectNote: () => void;
  onSelectVoice: () => void;
  onSelectQuickScan: () => void;
  recentRecords?: ArchiveRecord[];
  onSelectRecord?: (record: ArchiveRecord) => void;
  onOpenAvatar?: () => void;
  isProcessing?: boolean;
}

export const CaptureSheet: React.FC<CaptureSheetProps> = ({
  isOpen,
  onClose,
  onSelectCamera,
  onSelectGallery,
  onSelectPDF,
  onSelectBatchFiles,
  onSelectNote,
  onSelectVoice,
  onSelectQuickScan,
  recentRecords = [],
  onSelectRecord,
  onOpenAvatar: _onOpenAvatar,
  isProcessing = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [showTip, setShowTip] = useState(true);

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      e.target.value = '';
      haptics.impactMedium();
      onClose();
      if (files.length > 1 && onSelectBatchFiles) {
        onSelectBatchFiles(files);
      } else {
        onSelectGallery(files[0]);
      }
    }
  };

  const handlePDFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      e.target.value = '';
      haptics.impactMedium();
      onClose();
      if (files.length > 1 && onSelectBatchFiles) {
        onSelectBatchFiles(files);
      } else {
        onSelectPDF(files[0]);
      }
    }
  };

  const isBusy = isProcessing;

  const swipeBackRef = useSwipeBack<HTMLDivElement>({
    onBack: onClose,
    enabled: isOpen,
    threshold: 60,
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={swipeBackRef}
          key="capture-sheet"
          initial={{ y: '100%', opacity: 0.8 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0.8 }}
          transition={{ type: 'spring', damping: 30, stiffness: 260, mass: 0.85 }}
          className="absolute inset-0 z-20 bg-[#FAF9F6] overflow-y-auto pb-28 select-none"
        >
          {/* Global SIMPAN Loader Overlay when busy */}
          {isBusy && (
            <BrandLoader
              mode="overlay"
              size="lg"
              title="Sedang Memproses..."
              subtitle="Membaca dan menyiapkan dokumen Anda"
            />
          )}

          {/* Hidden file inputs */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleGalleryChange}
            accept="image/*"
            multiple
            className="hidden"
          />
          <input
            type="file"
            ref={pdfInputRef}
            onChange={handlePDFChange}
            accept="*/*"
            multiple
            className="hidden"
          />

          {/* Greeting & Title Area matching mockup/tambah_baru.png */}
          <div className="px-5 pt-4 pb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight">
            Simpan Apa Hari Ini?
          </h2>
          <p className="text-[11px] text-stone-500 mt-0.5">
            Ambil dari mana saja, nanti kami rapikan.
          </p>
        </div>

        {/* Small artistic banner on top right */}
        <div className="bg-emerald-50/90 border border-emerald-200/80 rounded-xl py-1 px-2.5 flex items-center gap-1.5 shadow-2xs shrink-0">
          <div className="w-4 h-4 rounded-md bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <FileText className="w-2.5 h-2.5" />
          </div>
          <span className="text-[9px] font-serif italic text-emerald-900 font-medium leading-tight">
            Tetap berarti.
          </span>
        </div>
      </div>

      {/* 6 Action Cards (Compact 2 Columns) */}
      <div className="px-5 grid grid-cols-2 gap-2.5 mb-3.5">
        {/* 1. Kamera */}
        <div
          onClick={onSelectCamera}
          className="bg-white rounded-2xl p-3 border border-stone-200/80 shadow-2xs hover:border-emerald-300 hover:shadow-xs active:scale-[0.98] transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/80">
              <Camera className="w-4 h-4" />
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-stone-300" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-stone-900">Kamera</h4>
            <p className="text-[10px] text-stone-400 mt-0.5 line-clamp-1">
              Foto atau scan dokumen
            </p>
          </div>
        </div>

        {/* 2. Galeri */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="bg-white rounded-2xl p-3 border border-stone-200/80 shadow-2xs hover:border-sky-300 hover:shadow-xs active:scale-[0.98] transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100/80">
              <ImageIcon className="w-4 h-4" />
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-stone-300" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-stone-900">Galeri</h4>
            <p className="text-[10px] text-stone-400 mt-0.5 line-clamp-1">
              Pilih dari galeri foto
            </p>
          </div>
        </div>

        {/* 3. PDF / File */}
        <div
          onClick={() => pdfInputRef.current?.click()}
          className="bg-white rounded-2xl p-3 border border-stone-200/80 shadow-2xs hover:border-rose-300 hover:shadow-xs active:scale-[0.98] transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100/80">
              <FileText className="w-4 h-4" />
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-stone-300" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-stone-900">PDF / File</h4>
            <p className="text-[10px] text-stone-400 mt-0.5 line-clamp-1">
              Impor PDF atau file
            </p>
          </div>
        </div>

        {/* 4. Catatan */}
        <div
          onClick={onSelectNote}
          className="bg-white rounded-2xl p-3 border border-stone-200/80 shadow-2xs hover:border-amber-300 hover:shadow-xs active:scale-[0.98] transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100/80">
              <PenLine className="w-4 h-4" />
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-stone-300" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-stone-900">Catatan</h4>
            <p className="text-[10px] text-stone-400 mt-0.5 line-clamp-1">
              Ide dan pengingat
            </p>
          </div>
        </div>

        {/* 5. Rekam Suara */}
        <div
          onClick={onSelectVoice}
          className="bg-white rounded-2xl p-3 border border-stone-200/80 shadow-2xs hover:border-purple-300 hover:shadow-xs active:scale-[0.98] transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100/80">
              <Mic className="w-4 h-4" />
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-stone-300" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-stone-900">Rekam Suara</h4>
            <p className="text-[10px] text-stone-400 mt-0.5 line-clamp-1">
              Memo suara & transkrip
            </p>
          </div>
        </div>

        {/* 6. Pindai Cepat Berkas */}
        <div
          onClick={onSelectQuickScan}
          className="bg-white rounded-2xl p-3 border border-stone-200/80 shadow-2xs hover:border-teal-300 hover:shadow-xs active:scale-[0.98] transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100/80">
              <ScanLine className="w-4 h-4" />
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-stone-300" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-stone-900">Pindai Cepat File</h4>
            <p className="text-[10px] text-stone-400 mt-0.5 line-clamp-1">
              PDF, DOCX, XLSX sekaligus
            </p>
          </div>
        </div>
      </div>

      {/* Tip Banner (Compact) */}
      {showTip && (
        <div className="px-5 mb-3.5">
          <div className="bg-amber-50/70 border border-amber-200/70 rounded-2xl p-3 flex items-start gap-2.5 relative">
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Lightbulb className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 pr-5">
              <h5 className="text-[11px] font-bold text-stone-900">
                Tips: Simpan Lebih Cepat
              </h5>
              <p className="text-[10px] text-stone-500 mt-0.5 leading-snug">
                Objek akan otomatis dikenali dan diberi kategori.
              </p>
            </div>
            <button
              onClick={() => setShowTip(false)}
              className="absolute top-2.5 right-2.5 text-stone-400 hover:text-stone-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Terakhir Ditambahkan Carousel */}
      {recentRecords.length > 0 && (
        <div className="mb-5">
          <div className="px-5 mb-2.5 flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-900">Terakhir Ditambahkan</h3>
          </div>
          <div className="flex items-center gap-3 overflow-x-auto px-5 pb-2 scrollbar-none">
            {recentRecords.slice(0, 5).map((r) => (
              <div
                key={r.id}
                onClick={() => {
                  if (onSelectRecord) {
                    onClose();
                    onSelectRecord(r);
                  }
                }}
                className="w-32 shrink-0 bg-white rounded-2xl p-2.5 border border-stone-200/80 shadow-xs hover:shadow-sm cursor-pointer active:scale-95 transition-all"
              >
                <div className="w-full h-24 rounded-xl overflow-hidden relative mb-2 flex items-center justify-center">
                  <RecordThumbnail record={r} size="lg" className="w-full !h-24 !max-w-none !max-h-none rounded-xl" />
                  {/* Category mini pill */}
                  <span className="absolute bottom-1.5 right-1.5 text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-black/60 text-white backdrop-blur-xs capitalize">
                    {r.type}
                  </span>
                </div>
                <h5 className="text-xs font-bold text-stone-900 truncate">
                  {r.title}
                </h5>
                <p className="text-[10px] text-stone-400 truncate mt-0.5">
                  {formatDeviceDate(r.createdAt, { withYear: false })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Plant Banner */}
      <div className="px-5 mt-3">
        <PlantBadge
          variant="banner"
          text="Setiap hal yang Anda simpan, adalah bagian dari cerita Anda."
          subtext="Simpan hari ini. Temukan kapan saja."
        />
      </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
