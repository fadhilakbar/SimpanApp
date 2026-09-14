import React from 'react';
import {
  Calendar,
  PenLine,
  FileText,
  Tag as TagIcon,
  Share2,
  Download,
  Copy,
  Volume2,
  FolderInput,
  Trash2,
  ShieldCheck,
} from 'lucide-react';
import { ArchiveRecord } from '../../../types/record';
import { PlantBadge } from '../../ui';
import { haptics } from '../../../utils/haptics';
import { showConfirm, showSuccess } from '../../../utils/swal';
import { copyToClipboard } from '../../../utils/clipboard';

export interface NoteDetailProps {
  record: ArchiveRecord;
  dateVal: string;
  descriptionVal: string;
  rawTextVal: string;
  tags: string[];
  isPlayingAudio: boolean;
  onToggleAudio: () => void;
  onOpenMoveModal: () => void;
  onDeleteRecord: (id: string) => void;
  onDownload: () => void;
  onShare: () => void;
}

export const NoteDetail: React.FC<NoteDetailProps> = ({
  record,
  dateVal,
  descriptionVal,
  rawTextVal,
  tags,
  isPlayingAudio,
  onToggleAudio,
  onOpenMoveModal,
  onDeleteRecord,
  onDownload,
  onShare,
}) => {
  const textContent = rawTextVal || record.summary || record.title;
  const wordCount = textContent ? textContent.trim().split(/\s+/).filter(Boolean).length : 0;
  const charCount = textContent.length;

  const handleCopyText = async () => {
    haptics.impactLight();
    await copyToClipboard(textContent);
    showSuccess('Catatan Disalin', 'Isi teks catatan berhasil disalin ke papan klip.');
  };

  return (
    <div className="space-y-4">
      {/* 1. HERO PREVIEW: Digital Notepad Paper */}
      <div className="w-full bg-[#FFFDF9] rounded-3xl border border-amber-200/80 shadow-[0_6px_20px_-6px_rgba(0,0,0,0.04)] p-5.5 font-sans relative overflow-hidden">
        {/* Subtle Red Margin Line */}
        <div className="absolute left-6 top-0 bottom-0 w-[1.5px] bg-rose-200/60 pointer-events-none" />

        {/* Top bar */}
        <div className="pl-4 pb-3 border-b border-amber-100 flex items-center justify-between">
          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/70">
            CATATAN MANDIRI
          </span>
          <span className="text-[10px] font-mono font-bold text-stone-400">
            {wordCount} kata • {charCount} karakter
          </span>
        </div>

        {/* Note Title & Paragraphs */}
        <div className="pl-4 py-4 text-xs leading-relaxed text-stone-800 font-sans whitespace-pre-line space-y-2.5 max-h-72 overflow-y-auto">
          <h3 className="text-sm font-black text-stone-900 pb-1.5 border-b border-stone-100">
            {record.title}
          </h3>
          <p className="leading-loose text-stone-700 font-normal">
            {textContent}
          </p>
        </div>

        {/* Footer */}
        <div className="pl-4 pt-2 border-t border-amber-100/80 flex items-center justify-between text-[10px] text-stone-400">
          <span>Dibuat: {dateVal}</span>
          <span className="text-emerald-700 font-semibold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tersimpan di SIMPAN</span>
          </span>
        </div>
      </div>

      {/* 2. METADATA CARD (NO NOMINAL!) */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] space-y-4">
        <div>
          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs">
            Catatan Teks
          </span>
          <h1 className="text-xl font-black text-stone-900 tracking-tight leading-snug mt-1.5">
            {record.title}
          </h1>
        </div>

        <div className="space-y-3 pt-2 border-t border-stone-100">
          {/* Tanggal Dibuat */}
          <div className="flex items-center gap-3 text-xs">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/70 flex items-center justify-center shrink-0 shadow-2xs">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="flex-1 flex items-center justify-between">
              <span className="text-stone-400 font-medium">Tanggal Dibuat</span>
              <span className="text-stone-900 font-bold">{dateVal}</span>
            </div>
          </div>

          {/* Panjang Teks */}
          <div className="flex items-center gap-3 text-xs">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/70 flex items-center justify-center shrink-0 shadow-2xs">
              <PenLine className="w-4 h-4" />
            </div>
            <div className="flex-1 flex items-center justify-between">
              <span className="text-stone-400 font-medium">Panjang Catatan</span>
              <span className="text-emerald-900 font-bold bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200/70 shadow-2xs">
                {wordCount} kata ({charCount} karakter)
              </span>
            </div>
          </div>

          {/* Ringkasan */}
          <div className="flex items-start gap-3 text-xs">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 border border-purple-200/70 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
              <FileText className="w-4 h-4" />
            </div>
            <div className="flex-1 flex items-start justify-between gap-3">
              <span className="text-stone-400 font-medium shrink-0">Ringkasan</span>
              <span className="text-stone-800 font-medium text-right leading-relaxed max-w-[210px]">
                {descriptionVal}
              </span>
            </div>
          </div>

          {/* Tag */}
          <div className="flex items-start gap-3 text-xs pt-2 border-t border-stone-100">
            <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-600 border border-stone-200 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
              <TagIcon className="w-4 h-4" />
            </div>
            <div className="flex-1 flex items-center justify-between gap-2">
              <span className="text-stone-400 font-medium">Tag</span>
              <div className="flex flex-wrap gap-1.5 justify-end">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="text-[10px] font-bold px-2.5 py-0.5 rounded-lg bg-stone-100 hover:bg-emerald-50 text-stone-700 hover:text-emerald-800 border border-stone-200/80 transition-colors shadow-2xs"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. CONTROL CENTER ACTION BUTTONS (TAILORED FOR NOTES) */}
      <div className="grid grid-cols-3 gap-2.5 pt-1">
        {/* Salin Teks */}
        <button
          type="button"
          onClick={handleCopyText}
          className="group bg-gradient-to-b from-emerald-50/90 to-white rounded-2xl p-3 border border-emerald-200/90 shadow-2xs hover:border-emerald-300 hover:shadow-xs flex flex-col items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs shadow-emerald-600/25 group-hover:scale-105 transition-transform">
            <Copy className="w-5 h-5" />
          </div>
          <div className="text-center">
            <h4 className="text-xs font-bold text-emerald-950">Salin Teks</h4>
            <p className="text-[9px] text-emerald-700/80 font-medium">Ke Papan Klip</p>
          </div>
        </button>

        {/* Unduh Berkas TXT */}
        <button
          type="button"
          onClick={onDownload}
          className="group bg-gradient-to-b from-teal-50/90 to-white rounded-2xl p-3 border border-teal-200/90 shadow-2xs hover:border-teal-300 hover:shadow-xs flex flex-col items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-xs shadow-teal-500/25 group-hover:scale-105 transition-transform">
            <Download className="w-5 h-5" />
          </div>
          <div className="text-center">
            <h4 className="text-xs font-bold text-teal-950">Unduh TXT</h4>
            <p className="text-[9px] text-teal-700/80 font-medium">Simpan Berkas</p>
          </div>
        </button>

        {/* AI Suara (Dengarkan Catatan) */}
        <button
          type="button"
          onClick={onToggleAudio}
          className={`group rounded-2xl p-3 border shadow-2xs flex flex-col items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer ${
            isPlayingAudio
              ? 'bg-gradient-to-b from-purple-600 to-indigo-700 text-white border-purple-600 shadow-md animate-pulse'
              : 'bg-gradient-to-b from-purple-50/90 to-white border-purple-200/90 hover:border-purple-300 hover:shadow-xs'
          }`}
        >
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs transition-transform group-hover:scale-105 ${
              isPlayingAudio
                ? 'bg-white text-purple-700'
                : 'bg-gradient-to-tr from-purple-500 to-indigo-600 text-white shadow-purple-500/25'
            }`}
          >
            <Volume2 className="w-5 h-5" />
          </div>
          <div className="text-center">
            <h4 className={`text-xs font-bold ${isPlayingAudio ? 'text-white' : 'text-purple-950'}`}>
              {isPlayingAudio ? 'Jeda Suara' : 'AI Suara'}
            </h4>
            <p className={`text-[9px] font-medium ${isPlayingAudio ? 'text-purple-100' : 'text-purple-700/80'}`}>
              {isPlayingAudio ? 'Sedang Baca...' : 'Dengarkan Isi'}
            </p>
          </div>
        </button>

        {/* Bagikan */}
        <button
          type="button"
          onClick={onShare}
          className="group bg-gradient-to-b from-sky-50/90 to-white rounded-2xl p-3 border border-sky-200/90 shadow-2xs hover:border-sky-300 hover:shadow-xs flex flex-col items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-xs shadow-sky-500/25 group-hover:scale-105 transition-transform">
            <Share2 className="w-5 h-5" />
          </div>
          <div className="text-center">
            <h4 className="text-xs font-bold text-sky-950">Bagikan</h4>
            <p className="text-[9px] text-sky-700/80 font-medium">Catatan Teks</p>
          </div>
        </button>

        {/* Pindah Kategori */}
        <button
          type="button"
          onClick={onOpenMoveModal}
          className="group bg-gradient-to-b from-amber-50/90 to-white rounded-2xl p-3 border border-amber-200/90 shadow-2xs hover:border-amber-300 hover:shadow-xs flex flex-col items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-xs shadow-amber-500/25 group-hover:scale-105 transition-transform">
            <FolderInput className="w-5 h-5" />
          </div>
          <div className="text-center">
            <h4 className="text-xs font-bold text-amber-950">Pindah</h4>
            <p className="text-[9px] text-amber-700/80 font-medium">Ganti Kategori</p>
          </div>
        </button>

        {/* Hapus */}
        <button
          type="button"
          onClick={async () => {
            const confirmed = await showConfirm({
              title: 'Hapus Catatan Ini?',
              text: `Catatan "${record.title}" akan dipindahkan ke Sampah.`,
              confirmText: 'Hapus Catatan',
              cancelText: 'Batal',
              isDestructive: true,
            });
            if (confirmed) {
              onDeleteRecord(record.id);
            }
          }}
          className="group bg-gradient-to-b from-rose-50/90 to-white rounded-2xl p-3 border border-rose-200/90 shadow-2xs hover:border-rose-300 hover:shadow-xs flex flex-col items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-red-600 text-white flex items-center justify-center shadow-xs shadow-rose-500/25 group-hover:scale-105 transition-transform">
            <Trash2 className="w-5 h-5" />
          </div>
          <div className="text-center">
            <h4 className="text-xs font-bold text-rose-950">Hapus</h4>
            <p className="text-[9px] text-rose-700/80 font-medium">Ke Sampah</p>
          </div>
        </button>
      </div>

      {/* Plant Banner */}
      <div className="pt-2">
        <PlantBadge
          variant="banner"
          text="Ide dan catatan Anda tersimpan rapi secara offline di perangkat."
        />
      </div>
    </div>
  );
};
