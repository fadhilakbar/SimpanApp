import React from 'react';
import { X, Download, ShieldCheck, FileText, FileCode, FileSpreadsheet, Share2, Mic, Volume2 } from 'lucide-react';
import { ArchiveRecord } from '../../types/record';
import { Button } from '../ui/Button';
import { safeDownloadOrViewFile } from '../../utils/safariViewer';
import { formatDeviceDateTime } from '../../utils/dateFormatter';
import { isImageSource, getFileKind, shareContent } from '../../utils/fileExport';
import { useSwipeBack } from '../../utils/useSwipeBack';
import { DocumentMultiPageViewer } from './DocumentMultiPageViewer';

export interface OriginalViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  record?: ArchiveRecord | null;
}

export const OriginalViewerModal: React.FC<OriginalViewerModalProps> = ({
  isOpen,
  onClose,
  record,
}) => {
  const swipeBackRef = useSwipeBack<HTMLDivElement>({
    onBack: onClose,
    enabled: isOpen,
    threshold: 60,
  });

  if (!isOpen || !record) return null;

  const fileUrl = record.originalDataUrl || record.thumbnailDataUrl;
  const isImage = isImageSource(fileUrl, record.type);
  const fileKind = getFileKind(fileUrl, record.type);

  return (
    <div
      ref={swipeBackRef}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between animate-fade-in text-white select-none"
    >
      {/* Top Header */}
      <div
        className="px-4 py-3 flex items-center justify-between z-10 bg-gradient-to-b from-black/80 to-transparent"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-white truncate">
              {record.title}
            </h4>
            <p className="text-[11px] text-emerald-400 font-medium">
              Berkas Asli (Original Source of Truth)
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white"
          aria-label="Tutup"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Original Content Preview */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
        {fileUrl && isImage ? (
          <img
            src={fileUrl}
            alt={record.title}
            className="max-h-[80vh] max-w-full object-contain rounded-xl shadow-2xl"
          />
        ) : fileUrl && (fileKind === 'audio' || record.type === 'audio') ? (
          <div className="bg-white text-stone-900 rounded-3xl p-6 max-w-md w-full border border-stone-200 shadow-2xl flex flex-col items-center space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm bg-purple-50 text-purple-600 border border-purple-100">
              <Mic className="w-8 h-8" />
            </div>
            <div className="text-center w-full">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider mb-2 bg-purple-100/70 text-purple-800">
                Rekaman Audio Asli
              </span>
              <h3 className="text-base font-extrabold text-stone-900 truncate">{record.title}</h3>
              <p className="text-xs text-stone-500 mt-1">{record.summary || 'Berkas audio asli tersimpan aman.'}</p>
            </div>
          </div>
        ) : fileUrl ? (
          <div className="w-full max-w-lg bg-white text-stone-900 rounded-3xl p-4 border border-stone-200 shadow-2xl flex flex-col items-center space-y-3 max-h-[85vh] overflow-y-auto">
            <DocumentMultiPageViewer record={record} className="border-0 shadow-none p-0" />
            <div className="w-full flex items-center gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={async () => {
                  await safeDownloadOrViewFile({
                    title: record.title || 'Berkas Asli',
                    dataUrl: fileUrl,
                    textContent: fileUrl ? undefined : (record.rawText || record.summary),
                    filename: `${(record.title || 'berkas_asli').replace(/[^a-zA-Z0-9_-]/g, '_')}.${
                      fileKind === 'pdf' ? 'pdf' : fileKind === 'excel' ? 'xlsx' : fileKind === 'word' ? 'docx' : 'txt'
                    }`,
                  });
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-[#165a4c] hover:bg-[#11473c] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Buka / Unduh Berkas</span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  await shareContent({
                    title: record.title,
                    text: record.summary || record.title,
                    dataUrl: fileUrl,
                    filename: `${(record.title || 'berkas_asli').replace(/[^a-zA-Z0-9_-]/g, '_')}.${
                      fileKind === 'pdf' ? 'pdf' : fileKind === 'excel' ? 'xlsx' : fileKind === 'word' ? 'docx' : 'txt'
                    }`,
                  });
                }}
                className="py-3 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Bagikan</span>
              </button>
            </div>
          </div>
        ) : record.type === 'note' ? (
          <div className="bg-stone-900 text-stone-100 p-6 rounded-3xl max-w-md w-full border border-stone-800 shadow-xl font-mono text-sm leading-relaxed whitespace-pre-line">
            <h3 className="font-bold text-base text-amber-400 mb-3 border-b border-stone-800 pb-2">
              {record.title}
            </h3>
            {record.rawText || record.summary}
          </div>
        ) : record.type === 'audio' ? (
          <div className="bg-stone-900 text-stone-100 p-8 rounded-3xl max-w-sm w-full border border-stone-800 shadow-xl flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
              🎙
            </div>
            <h4 className="font-bold text-base mb-1">{record.title}</h4>
            <p className="text-xs text-stone-400 mb-4">Berkas Audio Asli</p>
            <audio controls className="w-full">
              <source src={record.originalDataUrl} type="audio/mpeg" />
              Browser Anda tidak mendukung pemutaran audio.
            </audio>
          </div>
        ) : (
          <div className="bg-stone-900 text-stone-300 p-8 rounded-3xl max-w-lg w-full border border-stone-800 shadow-xl font-mono text-xs leading-relaxed whitespace-pre-wrap">
            <div className="text-stone-500 text-[11px] mb-3 pb-2 border-b border-stone-800 flex items-center justify-between">
              <span>SUMBER RAW TEXT ASLI</span>
              <span>100% UNTOUCHED</span>
            </div>
            {record.rawText}
          </div>
        )}
      </div>

      {/* Bottom Info bar */}
      <div
        className="px-4 py-3 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between text-xs text-white/70"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
      >
        <span>
          Disimpan: {formatDeviceDateTime(record.createdAt, { monthFormat: 'long' })}
        </span>
        <Button
          variant="secondary"
          size="xs"
          leftIcon={<Download className="w-3.5 h-3.5" />}
          onClick={async () => {
            const fileUrl = record.originalDataUrl || record.thumbnailDataUrl;
            await safeDownloadOrViewFile({
              title: record.title || 'Berkas Asli',
              dataUrl: fileUrl,
              textContent: fileUrl ? undefined : (record.rawText || record.summary),
              filename: `${(record.title || 'berkas_asli').replace(/[^a-zA-Z0-9_-]/g, '_')}.${record.type === 'document' ? 'pdf' : record.type === 'image' ? 'jpg' : record.type === 'audio' ? 'wav' : 'txt'
                }`,
            });
          }}
        >
          Simpan / Buka
        </Button>
      </div>
    </div>
  );
};
