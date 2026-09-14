import React from 'react';
import {
  Calendar,
  Building2,
  FileCheck,
  Award,
  FileText,
  FileCode,
  FileSpreadsheet,
  Tag as TagIcon,
  Share2,
  Download,
  Scan,
  Volume2,
  FolderInput,
  Trash2,
  Maximize2,
  CheckCircle,
  ExternalLink,
  Copy,
} from 'lucide-react';
import { ArchiveRecord } from '../../../types/record';
import { PlantBadge } from '../../ui';
import { DocumentMultiPageViewer } from '../DocumentMultiPageViewer';
import { haptics } from '../../../utils/haptics';
import { showConfirm, showSuccess } from '../../../utils/swal';
import { copyToClipboard } from '../../../utils/clipboard';
import { isImageSource, isPdfSource, getFileKind } from '../../../utils/fileExport';

export interface DocumentDetailProps {
  record: ArchiveRecord;
  dateVal: string;
  docNoVal: string;
  companyVal: string;
  roleVal: string;
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

export const DocumentDetail: React.FC<DocumentDetailProps> = ({
  record,
  dateVal,
  docNoVal,
  companyVal,
  roleVal,
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
  const fileSource = record.thumbnailDataUrl || record.originalDataUrl;
  const hasFileUrl = Boolean(fileSource);
  const isImage = isImageSource(fileSource, record.type);
  const fileKind = getFileKind(record.originalDataUrl || fileSource, record.type);

  return (
    <div className="space-y-4">
      {/* 1. HERO PREVIEW: File Image, Multi-Page PDF Viewer, or Rich Document Reader */}
      {hasFileUrl ? (
        <DocumentMultiPageViewer
          record={record}
          onOpenZoomModal={onOpenZoomModal}
        />
      ) : (
        /* Official Legal Certificate / Contract Sheet */
        <div className="w-full bg-white rounded-3xl border border-stone-200/90 shadow-[0_6px_24px_-8px_rgba(0,0,0,0.06)] p-5.5 font-sans relative overflow-hidden">
          {/* Header Seal */}
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 border border-sky-200/80 text-[10px] font-black text-sky-800 shadow-2xs">
              <FileCheck className="w-3.5 h-3.5 text-sky-600" />
              <span>DOKUMEN RESMI TERSIMPAN</span>
            </div>
            {docNoVal && (
              <span className="text-[10px] font-mono font-bold text-stone-500 bg-stone-100 px-2.5 py-0.5 rounded-md border border-stone-200/60">
                {docNoVal}
              </span>
            )}
          </div>

          {/* Title & Institutional Parties */}
          <div className="py-3.5 border-b border-stone-100 space-y-1.5">
            <h3 className="text-base font-black text-stone-900 tracking-tight leading-snug">
              {record.title}
            </h3>
            {companyVal && (
              <p className="text-xs font-bold text-stone-700 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-sky-600 shrink-0" />
                <span>{companyVal}</span>
              </p>
            )}
            {roleVal && (
              <p className="text-[11px] font-medium text-stone-500 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500 shrink-0" />
                <span>{roleVal}</span>
              </p>
            )}
          </div>

          {/* Extracted Contract Text / Clauses */}
          <div className="py-3 text-xs leading-relaxed text-stone-700 font-sans whitespace-pre-line max-h-48 overflow-y-auto bg-stone-50/60 p-3.5 rounded-2xl border border-stone-200/60 my-2">
            {rawTextVal || record.summary || 'Arsip dokumen tersimpan lengkap secara aman dalam format offline.'}
          </div>

          {/* Verification Footnote */}
          <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-[10px] text-stone-400">
            <span>Tanggal: {dateVal}</span>
            <span className="text-emerald-800 font-extrabold flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Integritas Terverifikasi</span>
            </span>
          </div>
        </div>
      )}

      {/* 2. METADATA INFORMATION CARD (NO NOMINAL!) */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] space-y-4">
        <div>
          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200/80 shadow-2xs">
            Dokumen Resmi
          </span>
          <h1 className="text-xl font-black text-stone-900 tracking-tight leading-snug mt-1.5">
            {record.title}
          </h1>
        </div>

        <div className="space-y-3 pt-2 border-t border-stone-100">
          {/* Tanggal Dokumen */}
          <div className="flex items-center gap-3 text-xs">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/70 flex items-center justify-center shrink-0 shadow-2xs">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="flex-1 flex items-center justify-between">
              <span className="text-stone-400 font-medium">Tanggal Dokumen</span>
              <span className="text-stone-900 font-bold">{dateVal}</span>
            </div>
          </div>

          {/* Nomor Perjanjian / Dokumen */}
          {docNoVal && (
            <div className="flex items-center gap-3 text-xs">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/70 flex items-center justify-center shrink-0 shadow-2xs">
                <FileCheck className="w-4 h-4" />
              </div>
              <div className="flex-1 flex items-center justify-between">
                <span className="text-stone-400 font-medium">Nomor Dokumen</span>
                <span className="text-stone-900 font-mono font-bold">{docNoVal}</span>
              </div>
            </div>
          )}

          {/* Instansi / Pihak Terkait */}
          {companyVal && (
            <div className="flex items-center gap-3 text-xs">
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 border border-sky-200/70 flex items-center justify-center shrink-0 shadow-2xs">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="flex-1 flex items-center justify-between">
                <span className="text-stone-400 font-medium">Pihak / Instansi</span>
                <span className="text-stone-900 font-bold truncate max-w-[190px]">{companyVal}</span>
              </div>
            </div>
          )}

          {/* Jabatan / Perihal */}
          {roleVal && (
            <div className="flex items-center gap-3 text-xs">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 border border-purple-200/70 flex items-center justify-center shrink-0 shadow-2xs">
                <Award className="w-4 h-4" />
              </div>
              <div className="flex-1 flex items-center justify-between">
                <span className="text-stone-400 font-medium">Jabatan / Perihal</span>
                <span className="text-stone-900 font-bold truncate max-w-[190px]">{roleVal}</span>
              </div>
            </div>
          )}

          {/* Deskripsi */}
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

      {/* 2b. TEKS LENGKAP HASIL PINDAI / OCR SELURUH DOKUMEN */}
      {(rawTextVal || record.rawText) && (
        <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/70 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-stone-900">Isi Teks Dokumen Lengkap</h3>
                <p className="text-[10px] text-stone-400">Hasil ekstraksi seluruh halaman & OCR</p>
              </div>
            </div>
            <button
              type="button"
              onClick={async () => {
                haptics.impactLight();
                await copyToClipboard(rawTextVal || record.rawText || '');
                showSuccess('Teks Disalin', 'Seluruh teks dokumen berhasil disalin ke papan klip.');
              }}
              className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 active:scale-95 transition-all text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              title="Salin Seluruh Teks"
            >
              <Copy className="w-3.5 h-3.5" />
              <span className="text-[10px]">Salin</span>
            </button>
          </div>

          <div className="bg-stone-50 rounded-2xl p-3.5 border border-stone-200/80 text-xs text-stone-800 leading-relaxed font-sans max-h-72 overflow-y-auto whitespace-pre-line select-text">
            {rawTextVal || record.rawText}
          </div>
        </div>
      )}

      {/* 3. CONTROL CENTER BUTTONS (TAILORED FOR DOCUMENTS: OCR, PREVIEW, DOWNLOAD, SHARE, MOVE, DELETE) */}
      <div className="grid grid-cols-3 gap-2.5 pt-1">
        {/* Pindai OCR (Ekstrak Teks) */}
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

        {/* Unduh Berkas Dokumen */}
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

        {/* Pratinjau / Perbesar */}
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
            <h4 className="text-xs font-bold text-blue-950">Pratinjau</h4>
            <p className="text-[9px] text-blue-700/80 font-medium">Layar Penuh</p>
          </div>
        </button>

        {/* AI Suara (Dengarkan isi dokumen) */}
        <button
          type="button"
          onClick={onToggleAudio}
          className={`group rounded-2xl p-3 border shadow-2xs flex flex-col items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer ${isPlayingAudio
            ? 'bg-gradient-to-b from-purple-600 to-indigo-700 text-white border-purple-600 shadow-md animate-pulse'
            : 'bg-gradient-to-b from-purple-50/90 to-white border-purple-200/90 hover:border-purple-300 hover:shadow-xs'
            }`}
        >
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs transition-transform group-hover:scale-105 ${isPlayingAudio
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
            <p className="text-[9px] text-sky-700/80 font-medium">Dokumen & Teks</p>
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
              title: 'Hapus Dokumen Ini?',
              text: `Dokumen "${record.title}" akan dihapus.`,
              confirmText: 'Hapus Dokumen',
              cancelText: 'Batal',
              isDestructive: true,
            });
            if (confirmed) {
              onDeleteRecord(record.id);
            }
          }}
          className="col-span-3 group bg-gradient-to-b from-rose-50/80 to-white rounded-2xl p-2.5 border border-rose-200 shadow-2xs hover:border-rose-300 flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer text-rose-700 mt-1"
        >
          <Trash2 className="w-4 h-4 text-rose-600" />
          <span className="text-xs font-bold">Hapus Dokumen</span>
        </button>
      </div>

      {/* Plant Banner */}
      <div className="pt-2">
        <PlantBadge
          variant="banner"
          text="Dokumen penting Anda terenkripsi aman secara offline di perangkat."
        />
      </div>
    </div>
  );
};
