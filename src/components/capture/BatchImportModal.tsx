import React, { useState } from 'react';
import {
  FileText,
  Sparkles,
  Check,
  X,
  FileSpreadsheet,
  FileCode,
  FolderDown,
  ArrowRight,
  Layers,
  Edit3,
  Loader2,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArchiveRecord } from '../../types/record';
import { haptics } from '../../utils/haptics';
import {
  cleanFileNameToTitle,
  detectCategoryFromFileName,
  convertLocalFileToRecord,
} from '../../services/documentImportService';

export interface BatchImportModalProps {
  isOpen: boolean;
  files: File[];
  onClose: () => void;
  onConfirmBatchSave: (records: ArchiveRecord[]) => Promise<void>;
  onReviewSingle?: (record: ArchiveRecord) => void;
}

export const BatchImportModal: React.FC<BatchImportModalProps> = ({
  isOpen,
  files,
  onClose,
  onConfirmBatchSave,
  onReviewSingle,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>(files);
  const [checkedIndices, setCheckedIndices] = useState<Set<number>>(() => {
    return new Set(files.map((_, idx) => idx));
  });
  const [automationMode, setAutomationMode] = useState<'auto' | 'review'>('auto');
  const [batchCategory, setBatchCategory] = useState<string>('Otomatis');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressText, setProgressText] = useState<string>('');

  // Update selected files if props change
  React.useEffect(() => {
    setSelectedFiles(files);
    setCheckedIndices(new Set(files.map((_, idx) => idx)));
  }, [files]);

  if (!isOpen || selectedFiles.length === 0) return null;

  const categories = ['Otomatis', 'Keuangan', 'Pekerjaan', 'Legal', 'Pribadi', 'Dokumen'];

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
    }
    if (ext === 'docx' || ext === 'doc') {
      return <FileText className="w-5 h-5 text-blue-600" />;
    }
    if (ext === 'pdf') {
      return <FileCode className="w-5 h-5 text-rose-600" />;
    }
    return <FileText className="w-5 h-5 text-amber-600" />;
  };

  const toggleCheck = (index: number) => {
    haptics.impactLight();
    setCheckedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const toggleCheckAll = () => {
    haptics.impactLight();
    if (checkedIndices.size === selectedFiles.length) {
      setCheckedIndices(new Set());
    } else {
      setCheckedIndices(new Set(selectedFiles.map((_, idx) => idx)));
    }
  };

  const handleRemoveFile = (index: number) => {
    haptics.impactLight();
    const updated = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updated);
    setCheckedIndices((prev) => {
      const next = new Set<number>();
      Array.from(prev).forEach((oldIdx) => {
        if (oldIdx < index) next.add(oldIdx);
        else if (oldIdx > index) next.add(oldIdx - 1);
      });
      return next;
    });
    if (updated.length === 0) {
      onClose();
    }
  };

  const handleProceed = async () => {
    const filesToArchive = selectedFiles.filter((_, idx) => checkedIndices.has(idx));
    if (filesToArchive.length === 0) {
      haptics.notificationWarning();
      return;
    }

    haptics.impactMedium();

    if (automationMode === 'auto') {
      // Langsung tutup modal agar pengguna tidak terblokir
      onClose();
      try {
        const recordsToSave: ArchiveRecord[] = [];
        for (let i = 0; i < filesToArchive.length; i++) {
          const file = filesToArchive[i];
          const customCat = batchCategory === 'Otomatis' ? undefined : batchCategory;
          const rec = await convertLocalFileToRecord(file, customCat);
          recordsToSave.push(rec);
        }
        await onConfirmBatchSave(recordsToSave);
        haptics.notificationSuccess();
      } catch (err) {
        console.error('Batch import failed:', err);
      }
    } else {
      setIsProcessing(true);
      try {
        const firstFile = filesToArchive[0];
        const customCat = batchCategory === 'Otomatis' ? undefined : batchCategory;
        const rec = await convertLocalFileToRecord(firstFile, customCat);
        if (onReviewSingle) {
          onReviewSingle(rec);
        }
        onClose();
      } catch (err) {
        console.error('Review single failed:', err);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 sm:p-4 select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-lg bg-[#FDFCF9] rounded-3xl shadow-2xl border border-stone-200/90 overflow-hidden flex flex-col max-h-[88vh]"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-white border-b border-stone-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#165a4c] border border-emerald-200/80 flex items-center justify-center">
              <FolderDown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-stone-900">
                  Impor & Pindai Dokumen Lokal
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[#165a4c] text-[10px] font-bold">
                  {selectedFiles.length} Berkas
                </span>
              </div>
              <p className="text-xs text-stone-500">
                PDF, Word (.docx), Excel (.xlsx), atau Berkas Catatan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="w-8 h-8 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Prompt Otomatisasi */}
          <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
              <h4 className="text-xs font-bold text-emerald-950">
                Mau langsung diotomatiskan?
              </h4>
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed mb-3">
              Judul dokumen akan otomatis dibersihkan dari nama file. Kamu bisa langsung
              menyimpan semuanya secara instan atau memilih review satu per satu.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  haptics.impactLight();
                  setAutomationMode('auto');
                }}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  automationMode === 'auto'
                    ? 'bg-white border-[#165a4c] shadow-xs text-stone-900 ring-2 ring-emerald-600/20'
                    : 'bg-emerald-50/50 border-emerald-200/60 text-emerald-800 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-extrabold flex items-center gap-1.5">
                    <span>🚀 Otomatis</span>
                  </span>
                  {automationMode === 'auto' && (
                    <Check className="w-3.5 h-3.5 text-[#165a4c] stroke-[3]" />
                  )}
                </div>
                <p className="text-[10px] text-stone-500">
                  Simpan semua sekaligus dengan judul nama file
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  haptics.impactLight();
                  setAutomationMode('review');
                }}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  automationMode === 'review'
                    ? 'bg-white border-[#165a4c] shadow-xs text-stone-900 ring-2 ring-emerald-600/20'
                    : 'bg-emerald-50/50 border-emerald-200/60 text-emerald-800 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-extrabold flex items-center gap-1.5">
                    <span>📝 Review Dulu</span>
                  </span>
                  {automationMode === 'review' && (
                    <Check className="w-3.5 h-3.5 text-[#165a4c] stroke-[3]" />
                  )}
                </div>
                <p className="text-[10px] text-stone-500">
                  Buka di modal draft untuk diperiksa satu per satu
                </p>
              </button>
            </div>
          </div>

          {/* Kategori Pilihan */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-2">
              Kategori Arsip untuk Berkas Ini:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => {
                const isSelected = batchCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      haptics.impactLight();
                      setBatchCategory(cat);
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#165a4c] text-white shadow-xs'
                        : 'bg-white hover:bg-stone-100 text-stone-600 border border-stone-200'
                    }`}
                  >
                    {cat === 'Otomatis' ? '✨ ' + cat + ' (Cerdas)' : cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Daftar Berkas Terpilih dengan Checkbox */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-stone-700">
                Pilih Berkas yang Mau Diarsipkan ({checkedIndices.size} dari {selectedFiles.length}):
              </label>

              <button
                type="button"
                onClick={toggleCheckAll}
                className="text-[11px] font-bold text-[#165a4c] hover:underline cursor-pointer"
              >
                {checkedIndices.size === selectedFiles.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
              </button>
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {selectedFiles.map((file, idx) => {
                const isChecked = checkedIndices.has(idx);
                const cleanTitle = cleanFileNameToTitle(file.name);
                const detectedCat =
                  batchCategory === 'Otomatis'
                    ? detectCategoryFromFileName(file.name)
                    : batchCategory;
                const sizeKb = (file.size / 1024).toFixed(1);

                return (
                  <div
                    key={idx}
                    onClick={() => toggleCheck(idx)}
                    className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer select-none ${
                      isChecked
                        ? 'bg-emerald-50/50 border-emerald-300 shadow-2xs'
                        : 'bg-white border-stone-200/80 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Checkbox Icon */}
                      <div
                        className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all shrink-0 ${
                          isChecked
                            ? 'bg-[#165a4c] text-white shadow-xs'
                            : 'border-2 border-stone-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>

                      <div className="w-8 h-8 rounded-xl bg-white border border-stone-200 flex items-center justify-center shrink-0 shadow-2xs">
                        {getFileIcon(file.name)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h5 className="text-xs font-bold text-stone-900 truncate">
                          {cleanTitle}
                        </h5>
                        <div className="flex items-center gap-2 text-[10px] text-stone-400">
                          <span className="truncate max-w-[130px] font-mono">{file.name}</span>
                          <span>•</span>
                          <span>{sizeKb} KB</span>
                          <span>•</span>
                          <span className="font-semibold text-emerald-700 bg-emerald-100/60 px-1.5 py-0.2 rounded-md">
                            {detectedCat}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile(idx);
                      }}
                      className="text-stone-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Hapus dari daftar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-white border-t border-stone-100 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 rounded-xl text-xs font-bold text-stone-500 hover:bg-stone-100 transition-colors"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleProceed}
            disabled={isProcessing || checkedIndices.size === 0}
            className="flex-1 py-2.5 px-4 rounded-xl bg-[#165a4c] hover:bg-[#11473c] active:scale-[0.98] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-900/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{progressText || 'Memproses berkas...'}</span>
              </>
            ) : automationMode === 'auto' ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Arsipkan ({checkedIndices.size} Berkas Terpilih)</span>
              </>
            ) : (
              <>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                <span>Review Berkas ({checkedIndices.size} Terpilih)</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
