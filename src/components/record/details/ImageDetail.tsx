import React from 'react';
import {
  Calendar,
  Image as ImageIcon,
  FileText,
  Tag as TagIcon,
  Share2,
  Download,
  Scan,
  FolderInput,
  Trash2,
  Maximize2,
} from 'lucide-react';
import { ArchiveRecord } from '../../../types/record';
import { PlantBadge } from '../../ui';
import { haptics } from '../../../utils/haptics';
import { showConfirm } from '../../../utils/swal';

export interface ImageDetailProps {
  record: ArchiveRecord;
  dateVal: string;
  descriptionVal: string;
  tags: string[];
  onOpenOCRModal: () => void;
  onOpenZoomModal: () => void;
  onOpenMoveModal: () => void;
  onDeleteRecord: (id: string) => void;
  onDownload: () => void;
  onShare: () => void;
}

export const ImageDetail: React.FC<ImageDetailProps> = ({
  record,
  dateVal,
  descriptionVal,
  tags,
  onOpenOCRModal,
  onOpenZoomModal,
  onOpenMoveModal,
  onDeleteRecord,
  onDownload,
  onShare,
}) => {
  const imageSource = record.originalDataUrl || record.thumbnailDataUrl;

  return (
    <div className="space-y-4">
      {/* 1. HERO PREVIEW: Framed High-Res Image with Zoom Trigger */}
      <div className="w-full bg-white rounded-3xl border border-stone-200/90 shadow-sm p-3.5 flex flex-col items-center relative overflow-hidden">
        {imageSource ? (
          <div
            onClick={onOpenZoomModal}
            className="w-full max-h-84 overflow-hidden rounded-2xl bg-stone-100 flex items-center justify-center border border-stone-100 relative group cursor-pointer"
          >
            <img
              src={imageSource}
              alt={record.title}
              className="w-full h-full object-contain max-h-80 group-hover:scale-[1.02] transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/75 text-white text-xs font-bold px-3.5 py-1.5 rounded-full backdrop-blur-xs flex items-center gap-1.5 shadow-md">
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Perbesar Foto</span>
              </span>
            </div>
            <span className="absolute bottom-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-full bg-black/65 text-white backdrop-blur-xs shadow-xs">
              1/1 Foto
            </span>
          </div>
        ) : (
          <div className="w-full h-56 rounded-2xl bg-stone-100 flex flex-col items-center justify-center gap-2 text-stone-400">
            <ImageIcon className="w-10 h-10" />
            <span className="text-xs font-medium">Gambar tersimpan secara offline</span>
          </div>
        )}
      </div>

      {/* 2. METADATA INFORMATION CARD (NO NOMINAL!) */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] space-y-4">
        <div>
          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 shadow-2xs">
            Bukti Foto
          </span>
          <h1 className="text-xl font-black text-stone-900 tracking-tight leading-snug mt-1.5">
            {record.title}
          </h1>
        </div>

        <div className="space-y-3 pt-2 border-t border-stone-100">
          {/* Tanggal Ambil */}
          <div className="flex items-center gap-3 text-xs">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/70 flex items-center justify-center shrink-0 shadow-2xs">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="flex-1 flex items-center justify-between">
              <span className="text-stone-400 font-medium">Tanggal Ambil</span>
              <span className="text-stone-900 font-bold">{dateVal}</span>
            </div>
          </div>

          {/* Format Berkas */}
          <div className="flex items-center gap-3 text-xs">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/70 flex items-center justify-center shrink-0 shadow-2xs">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div className="flex-1 flex items-center justify-between">
              <span className="text-stone-400 font-medium">Format Berkas</span>
              <span className="text-stone-900 font-bold">Gambar HD • Kualitas Asli</span>
            </div>
          </div>

          {/* Keterangan */}
          <div className="flex items-start gap-3 text-xs">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 border border-purple-200/70 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
              <FileText className="w-4 h-4" />
            </div>
            <div className="flex-1 flex items-start justify-between gap-3">
              <span className="text-stone-400 font-medium shrink-0">Keterangan</span>
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

      {/* 3. CONTROL CENTER ACTION BUTTONS (TAILORED FOR IMAGES) */}
      <div className="grid grid-cols-3 gap-2.5 pt-1">
        {/* Perbesar Foto */}
        <button
          type="button"
          onClick={() => {
            haptics.impactLight();
            onOpenZoomModal();
          }}
          className="group bg-gradient-to-b from-blue-50/90 to-white rounded-2xl p-3 border border-blue-200/90 shadow-2xs hover:border-blue-300 hover:shadow-xs flex flex-col items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-xs shadow-blue-500/25 group-hover:scale-105 transition-transform">
            <Maximize2 className="w-5 h-5" />
          </div>
          <div className="text-center">
            <h4 className="text-xs font-bold text-blue-950">Perbesar</h4>
            <p className="text-[9px] text-blue-700/80 font-medium">Layar Penuh</p>
          </div>
        </button>

        {/* Unduh Foto */}
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
            <p className="text-[9px] text-teal-700/80 font-medium">Simpan Foto</p>
          </div>
        </button>

        {/* Pindai OCR Teks */}
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
            <h4 className="text-xs font-bold text-emerald-950">Pindai OCR</h4>
            <p className="text-[9px] text-emerald-700/80 font-medium">Ekstrak Teks</p>
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
            <p className="text-[9px] text-sky-700/80 font-medium">Ke Aplikasi Lain</p>
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
              title: 'Hapus Foto Ini?',
              text: `Foto "${record.title}" akan dipindahkan ke Sampah.`,
              confirmText: 'Hapus Foto',
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
          text="Foto Anda tersimpan aman secara offline di perangkat."
        />
      </div>
    </div>
  );
};
