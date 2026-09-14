import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, Sparkles, ShieldCheck } from 'lucide-react';
import { OCRProcessProgress } from '../../services/ocrService';

export interface ProcessingModalProps {
  isOpen: boolean;
  progress?: OCRProcessProgress;
}

export const ProcessingModal: React.FC<ProcessingModalProps> = ({
  isOpen,
  progress,
}) => {
  const currentStep = progress ? progress.step : 1;

  const stepsList = [
    'Mendeteksi lembar berkas',
    'Mengenali teks & angka',
    'Menemukan tanggal & waktu',
    'Mengekstrak rincian & nominal',
    'Mengategorikan otomatis...',
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
          {/* Backdrop with Frosted Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-stone-900/40 backdrop-blur-md"
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ type: 'spring', damping: 26, stiffness: 280, mass: 0.8 }}
            className="relative w-full max-w-xs bg-[#FAF9F6] rounded-[28px] shadow-2xl border border-emerald-800/15 p-6 flex flex-col items-center text-center z-10 overflow-hidden"
          >
            {/* Ambient Background Glow */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-200/40 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-teal-200/30 rounded-full blur-2xl pointer-events-none" />

            {/* Spinner Icon */}
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#124b3f] to-[#165a4c] flex items-center justify-center text-white mb-4 shadow-md shadow-emerald-950/20">
              <Loader2 className="w-8 h-8 animate-spin stroke-[2.2] text-emerald-100" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-400 text-stone-950 flex items-center justify-center border-2 border-white shadow-2xs">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
            </div>

            <h3 className="text-base font-extrabold text-stone-900 tracking-tight">
              Menganalisis Dokumen
            </h3>
            <p className="text-xs text-stone-500 mt-0.5 mb-4">
              {progress?.message || 'Memproses OCR lokal di perangkat Anda'}
            </p>

            {/* Step-by-step progress checklist */}
            <div className="w-full space-y-2 text-left bg-white/90 p-3.5 rounded-2xl border border-stone-200/80 shadow-2xs">
              {stepsList.map((stepText, idx) => {
                const stepNum = idx + 1;
                const isDone = currentStep > stepNum;
                const isCurrent = currentStep === stepNum;

                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-2.5 text-xs transition-colors duration-200 ${
                      isDone
                        ? 'text-[#165a4c] font-semibold'
                        : isCurrent
                        ? 'text-stone-900 font-bold'
                        : 'text-stone-400 font-medium'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 transition-all ${
                        isDone
                          ? 'bg-[#165a4c] text-white shadow-2xs'
                          : isCurrent
                          ? 'border-2 border-[#165a4c] border-t-transparent animate-spin'
                          : 'border border-stone-300 bg-stone-100'
                      }`}
                    >
                      {isDone && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                    <span className="truncate">{stepText}</span>
                  </div>
                );
              })}
            </div>

            {/* Offline badge */}
            <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-[10px] font-bold text-emerald-800 border border-emerald-200/80 shadow-2xs">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>100% Offline di Perangkat</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
