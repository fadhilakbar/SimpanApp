import React from 'react';
import {
  CheckCircle2,
  FileText,
  Plus,
  Search,
  Sparkles,
  X,
  ChevronRight,
  ShoppingBag,
  PenLine,
  Mic,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArchiveRecord } from '../../types/record';
import { BrandHeader } from '../ui/BrandHeader';
import { PlantBadge } from '../ui/PlantBadge';
import { formatDeviceDate, formatDeviceTime } from '../../utils/dateFormatter';
import { haptics } from '../../utils/haptics';
import { useSwipeBack } from '../../utils/useSwipeBack';
import { isImageSource } from '../../utils/fileExport';

export interface SaveSuccessModalProps {
  isOpen: boolean;
  record: ArchiveRecord | null;
  onClose: () => void;
  onViewDetail: (record: ArchiveRecord) => void;
  onSaveAgain: () => void;
  onOpenSearch: () => void;
}

export const SaveSuccessModal: React.FC<SaveSuccessModalProps> = ({
  isOpen,
  record,
  onClose,
  onViewDetail,
  onSaveAgain,
  onOpenSearch,
}) => {
  const dateStr = record ? formatDeviceDate(record.createdAt) : '';
  const timeStr = record ? formatDeviceTime(record.createdAt) : '';
  const amountField = record?.extractedFields?.find(
    (f) => f.key === 'total_amount' || f.key === 'amount'
  );
  const amountVal = amountField ? ` · ${amountField.currentValue}` : '';

  const swipeBackRef = useSwipeBack<HTMLDivElement>({
    onBack: onClose,
    enabled: Boolean(isOpen && record),
    threshold: 60,
  });

  return (
    <AnimatePresence>
      {isOpen && record && (
        <motion.div
          ref={swipeBackRef}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 280, mass: 0.85 }}
          className="fixed inset-0 z-50 bg-[#FAF9F6] overflow-y-auto pb-12 flex flex-col justify-between select-none"
        >
          <div>
            {/* Header with Close Button */}
            <BrandHeader
              title="Tersimpan"
              rightElement={
                <button
                  type="button"
                  onClick={() => {
                    haptics.impactLight();
                    onClose();
                  }}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-stone-100/90 hover:bg-stone-200/90 text-stone-700 border border-stone-200/80 active:scale-90 transition-all cursor-pointer shadow-2xs"
                  aria-label="Tutup"
                >
                  <X className="w-5 h-5 stroke-[2.2]" />
                </button>
              }
            />

            {/* Hero Success Illustration */}
            <div className="flex flex-col items-center text-center px-6 pt-4 pb-2">
              <div className="relative w-36 h-36 flex items-center justify-center my-2">
                <div className="w-24 h-30 bg-white rounded-2xl shadow-md border border-stone-200/80 p-3 flex flex-col justify-between -rotate-3">
                  <div className="space-y-1.5">
                    <div className="h-2 w-12 bg-stone-200 rounded-sm" />
                    <div className="h-1.5 w-16 bg-stone-100 rounded-sm" />
                    <div className="h-1.5 w-10 bg-stone-100 rounded-sm" />
                  </div>
                  <div className="h-1.5 w-14 bg-stone-200 rounded-sm" />
                </div>

                {/* Glowing Green Check Circle */}
                <div className="absolute bottom-2 right-4 w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-950/20 border-2 border-white">
                  <CheckCircle2 className="w-7 h-7" />
                </div>

                {/* Decorative dots */}
                <div className="absolute top-2 left-3 w-2 h-2 rounded-full bg-emerald-400" />
                <div className="absolute top-4 right-2 w-1.5 h-1.5 rounded-full bg-amber-400" />
                <div className="absolute bottom-4 left-4 w-2 h-2 rounded-full bg-teal-300" />
              </div>

              <h2 className="text-2xl font-black tracking-tight text-stone-900 mt-2">
                Berhasil Disimpan!
              </h2>
              <p className="text-xs text-stone-500 mt-1 max-w-xs leading-relaxed">
                Arsip &ldquo;{record.title}&rdquo; telah tersimpan di perangkat Anda.
              </p>
            </div>

            {/* Record Card Preview */}
            <div className="px-6 my-4">
              <div className="bg-white rounded-3xl p-3.5 border border-stone-200/80 shadow-2xs flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-stone-100 border border-stone-200/60 overflow-hidden shrink-0 flex items-center justify-center">
                  {record.type === 'audio' ? (
                    <div className="w-full h-full bg-purple-50 flex items-center justify-center text-purple-600">
                      <Mic className="w-6 h-6" />
                    </div>
                  ) : isImageSource(record.thumbnailDataUrl || record.originalDataUrl, record.type) ? (
                    <img
                      src={record.thumbnailDataUrl || record.originalDataUrl}
                      alt={record.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-stone-700">
                      {record.type === 'receipt' ? (
                        <ShoppingBag className="w-6 h-6 text-rose-600" />
                      ) : record.type === 'note' ? (
                        <PenLine className="w-6 h-6 text-amber-600" />
                      ) : (
                        <FileText className="w-6 h-6 text-sky-600" />
                      )}
                    </div>
                  )}
                </div>

                <div className="overflow-hidden flex-1">
                  <h4 className="text-sm font-bold text-stone-900 truncate">
                    {record.title}
                  </h4>
                  <p className="text-[11px] text-stone-500 mt-0.5 truncate">
                    {dateStr}, {timeStr} {amountVal}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200">
                      {record.type}
                    </span>
                    {record.category && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                        {record.category}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="px-6 space-y-3">
              {/* Primary: Lihat Detail */}
              <button
                type="button"
                onClick={() => {
                  haptics.impactLight();
                  onViewDetail(record);
                }}
                className="w-full py-3.5 px-6 rounded-full bg-gradient-to-r from-[#124b3f] to-[#165a4c] hover:from-[#0e3b31] hover:to-[#124b3f] active:scale-98 text-white font-bold text-sm shadow-md shadow-emerald-950/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>Lihat Detail</span>
              </button>

              {/* Secondary Buttons Row */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    haptics.impactLight();
                    onSaveAgain();
                  }}
                  className="py-3 px-4 rounded-full bg-white hover:bg-stone-50 border border-stone-200/80 active:scale-95 text-stone-800 font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Simpan Lagi</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    haptics.impactLight();
                    onOpenSearch();
                  }}
                  className="py-3 px-4 rounded-full bg-white hover:bg-stone-50 border border-stone-200/80 active:scale-95 text-stone-800 font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5 text-stone-500" />
                  <span>Cari di Simpan</span>
                </button>
              </div>
            </div>

            {/* Organization / Tag Suggestion Card */}
            <div className="px-6 my-5">
              <div className="bg-white rounded-3xl p-4 border border-stone-200/80 shadow-2xs">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200/60 shadow-2xs">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-stone-900">
                        Ingin lebih rapi?
                      </h5>
                      <p className="text-[10px] text-stone-400">
                        Tambahkan kategori atau tag agar lebih mudah ditemukan nanti.
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-300 shrink-0" />
                </div>

                {/* Tag Pills */}
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300/80 px-2.5 py-1 rounded-full flex items-center gap-1 shadow-2xs">
                    <span>{record.category || 'Belanja Harian'}</span>
                    <span>✓</span>
                  </span>
                  <span className="text-[10px] font-medium bg-stone-50 hover:bg-stone-100 text-stone-600 border border-stone-200 px-2.5 py-1 rounded-full cursor-pointer transition-colors">
                    Kebutuhan Rumah
                  </span>
                  <span className="text-[10px] font-medium bg-stone-50 hover:bg-stone-100 text-stone-600 border border-stone-200 px-2.5 py-1 rounded-full cursor-pointer transition-colors">
                    Supermarket
                  </span>
                  <span className="text-[10px] font-bold text-[#165a4c] px-2 py-1 cursor-pointer hover:underline">
                    + Tag Lainnya
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Plant Banner */}
          <div className="px-6">
            <PlantBadge
              variant="banner"
              text="Sedikit hari ini, berarti banyak nanti."
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
