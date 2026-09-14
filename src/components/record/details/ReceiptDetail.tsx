import React from 'react';
import {
  Calendar,
  FileText,
  Tag as TagIcon,
  Share2,
  Download,
  Scan,
  Volume2,
  FolderInput,
  Trash2,
  Maximize2,
  ShoppingBag,
  Copy,
} from 'lucide-react';
import { ArchiveRecord } from '../../../types/record';
import { PlantBadge } from '../../ui';
import { haptics } from '../../../utils/haptics';
import { showConfirm, showSuccess } from '../../../utils/swal';
import { copyToClipboard } from '../../../utils/clipboard';

export interface ReceiptDetailProps {
  record: ArchiveRecord;
  dateVal: string;
  nominalVal: string;
  locationVal: string;
  descriptionVal: string;
  rawTextVal: string;
  tags: string[];
  isPlayingAudio: boolean;
  onToggleAudio: () => void;
  onOpenOCRModal: () => void;
  onOpenZoomModal: () => void;
  onOpenMoveModal: () => void;
  onDeleteRecord: (id: string) => void;
  onDownload: () => void;
  onShare: () => void;
}

export const ReceiptDetail: React.FC<ReceiptDetailProps> = ({
  record,
  dateVal,
  descriptionVal,
  rawTextVal,
  tags,
  isPlayingAudio,
  onToggleAudio,
  onOpenOCRModal,
  onOpenZoomModal,
  onOpenMoveModal,
  onDeleteRecord,
  onDownload,
  onShare,
}) => {
  const imageSource = record.originalDataUrl || record.thumbnailDataUrl;
  const items = record.receiptItems || [];

  const computedTotal = items.reduce((acc, item) => {
    const p = item.totalPrice || (item.unitPrice || 0) * (item.quantity || 1);
    return acc + (isNaN(p) ? 0 : p);
  }, 0);

  const handleCopyText = async () => {
    haptics.impactLight();
    const textToCopy = rawTextVal || record.summary || record.title;
    await copyToClipboard(textToCopy);
    showSuccess('Teks Disalin', 'Teks OCR berhasil disalin ke papan klip.');
  };

  return (
    <div className="space-y-4">
      {/* 1. HERO PREVIEW: Photo / Document Scan */}
      {imageSource ? (
        <div className="w-full bg-white rounded-3xl border border-stone-200/90 shadow-sm p-3.5 flex flex-col items-center relative overflow-hidden">
          <div
            onClick={onOpenZoomModal}
            className="w-full max-h-80 overflow-hidden rounded-2xl bg-stone-50 flex items-center justify-center border border-stone-100 relative group cursor-pointer"
          >
            <img
              src={imageSource}
              alt={record.title}
              className="w-full h-full object-contain max-h-72 group-hover:scale-[1.02] transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 text-white text-xs font-bold px-3.5 py-1.5 rounded-full backdrop-blur-xs flex items-center gap-1.5 shadow-md">
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Perbesar Foto</span>
              </span>
            </div>
            <span className="absolute bottom-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-full bg-black/65 text-white backdrop-blur-xs shadow-xs">
              1/1 Halaman
            </span>
          </div>
        </div>
      ) : null}

      {/* 2. TITLE & BASIC INFO CARD */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs">
            Struk Belanja
          </span>
          {dateVal && (
            <div className="flex items-center gap-1.5 text-xs text-stone-500 font-medium">
              <Calendar className="w-3.5 h-3.5 text-stone-400" />
              <span>{dateVal}</span>
            </div>
          )}
        </div>

        <h1 className="text-xl font-black text-stone-900 tracking-tight leading-snug">
          {record.title}
        </h1>

        {descriptionVal && (
          <p className="text-xs text-stone-600 leading-relaxed pt-1 border-t border-stone-100">
            {descriptionVal}
          </p>
        )}

        {/* Tags */}
        {tags && tags.length > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
            <TagIcon className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span
                  key={t}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200/70"
                >
                  #{t}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. KHUSUS STRUK: DAFTAR ITEM BELANJA TERSTRUKTUR */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] space-y-3">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/70 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">Daftar Item Struk</h3>
              <p className="text-[10px] text-stone-400">Rincian barang hasil bacaan OCR</p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
            {items.length} Item
          </span>
        </div>

        {items.length > 0 ? (
          <div className="divide-y divide-stone-100">
            {items.map((item, idx) => (
              <div key={item.id || idx} className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 shrink-0">
                    {item.quantity}x
                  </span>
                  <span className="text-xs font-semibold text-stone-800 truncate">
                    {item.name}
                  </span>
                </div>
                <span className="text-xs font-bold text-stone-900 font-mono shrink-0">
                  Rp {(item.totalPrice || (item.unitPrice || 0) * (item.quantity || 1)).toLocaleString('id-ID')}
                </span>
              </div>
            ))}

            {computedTotal > 0 && (
              <div className="pt-3 flex items-center justify-between">
                <span className="text-xs font-extrabold text-stone-700 uppercase">
                  Total Item
                </span>
                <span className="text-sm font-black text-emerald-800 font-mono bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200/80">
                  Rp {computedTotal.toLocaleString('id-ID')}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="py-4 text-center bg-stone-50/70 rounded-2xl border border-dashed border-stone-200 p-4">
            <p className="text-xs text-stone-500 font-medium">
              Daftar item belanja belum terdeteksi dari gambar.
            </p>
            <p className="text-[10px] text-stone-400 mt-1">
              Anda dapat menambahkan dan mengedit rincian item melalui tombol Edit di atas.
            </p>
          </div>
        )}
      </div>

      {/* 4. TEKS HASIL BACA OCR (RAW TEXT MURNI) */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] space-y-3">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 border border-purple-200/70 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900">Teks Hasil Baca OCR</h3>
              <p className="text-[10px] text-stone-400">Pembacaan teks apa adanya tanpa filter</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCopyText}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-xl border border-emerald-200 transition-colors"
          >
            <Copy className="w-3 h-3" />
            <span>Salin</span>
          </button>
        </div>

        <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/70 text-xs font-mono text-stone-700 leading-relaxed whitespace-pre-line max-h-52 overflow-y-auto select-text">
          {rawTextVal || record.rawText || (
            <span className="text-stone-400 italic">
              Tidak ada teks yang terdeteksi dari berkas ini.
            </span>
          )}
        </div>
      </div>

      {/* 5. CONTROL CENTER ACTION BUTTONS */}
      <div className="grid grid-cols-3 gap-2.5 pt-1">
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
            <p className="text-[9px] text-sky-700/80 font-medium">Dokumen & Teks</p>
          </div>
        </button>

        {/* Unduh Struk */}
        <button
          type="button"
          onClick={onDownload}
          className="group bg-gradient-to-b from-teal-50/90 to-white rounded-2xl p-3 border border-teal-200/90 shadow-2xs hover:border-teal-300 hover:shadow-xs flex flex-col items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-xs shadow-teal-500/25 group-hover:scale-105 transition-transform">
            <Download className="w-5 h-5" />
          </div>
          <div className="text-center">
            <h4 className="text-xs font-bold text-teal-950">Unduh</h4>
            <p className="text-[9px] text-teal-700/80 font-medium">Simpan Berkas</p>
          </div>
        </button>

        {/* Pindai OCR Ulang */}
        <button
          type="button"
          onClick={() => {
            haptics.impactLight();
            onOpenOCRModal();
          }}
          className="group bg-gradient-to-b from-emerald-50/90 to-white rounded-2xl p-3 border border-emerald-200/90 shadow-2xs hover:border-emerald-300 hover:shadow-xs flex flex-col items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs shadow-emerald-600/25 group-hover:scale-105 transition-transform">
            <Scan className="w-5 h-5" />
          </div>
          <div className="text-center">
            <h4 className="text-xs font-bold text-emerald-950">Pindai Ulang</h4>
            <p className="text-[9px] text-emerald-700/80 font-medium">Baca Ulang OCR</p>
          </div>
        </button>

        {/* AI Suara */}
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
              {isPlayingAudio ? 'Berhenti' : 'AI Reader'}
            </h4>
            <p className={`text-[9px] font-medium ${isPlayingAudio ? 'text-purple-100' : 'text-purple-700/80'}`}>
              Baca Teks
            </p>
          </div>
        </button>

        {/* Pindah Koleksi */}
        <button
          type="button"
          onClick={onOpenMoveModal}
          className="group bg-gradient-to-b from-amber-50/90 to-white rounded-2xl p-3 border border-amber-200/90 shadow-2xs hover:border-amber-300 hover:shadow-xs flex flex-col items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-xs shadow-amber-500/25 group-hover:scale-105 transition-transform">
            <FolderInput className="w-5 h-5" />
          </div>
          <div className="text-center">
            <h4 className="text-xs font-bold text-amber-950">Koleksi</h4>
            <p className="text-[9px] text-amber-700/80 font-medium">Ubah Kategori</p>
          </div>
        </button>

        {/* Hapus Arsip */}
        <button
          type="button"
          onClick={() => {
            haptics.notificationWarning();
            showConfirm({
              title: 'Pindahkan ke Sampah?',
              text: 'Arsip ini akan dipindahkan ke folder Sampah dan dapat dipulihkan nanti.',
              confirmText: 'Ya, Hapus',
              isDestructive: true,
            }).then((confirmed) => {
              if (confirmed) {
                onDeleteRecord(record.id);
              }
            });
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

      {/* Footer Info */}
      <div className="pt-2 pb-6 flex items-center justify-between text-[11px] text-stone-400 font-medium px-2">
        <span>Tipe: Struk Belanja</span>
        <PlantBadge text="Tersimpan aman secara offline" />
      </div>
    </div>
  );
};
