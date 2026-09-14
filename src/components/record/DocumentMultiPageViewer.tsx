import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  FileCode,
  FileText,
  FileSpreadsheet,
  BookOpen,
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Loader2,
  Search,
  Eye,
  Type,
  Sun,
  Moon,
  Coffee,
  X,
  Share2,
  Download,
  Sliders,
  Layers,
  Sparkles,
} from 'lucide-react';
import { ArchiveRecord } from '../../types/record';
import { isImageSource, isPdfSource, getFileKind, shareContent } from '../../utils/fileExport';
import { renderPdfPageToDataUrl, getPdfPageCount } from '../../services/pdfExtractService';
import { safeDownloadOrViewFile } from '../../utils/safariViewer';
import { copyToClipboard } from '../../utils/clipboard';
import { haptics } from '../../utils/haptics';

export interface DocumentMultiPageViewerProps {
  record: ArchiveRecord;
  onOpenZoomModal?: () => void;
  className?: string;
  initialMode?: 'visual' | 'reader';
}

type ReaderTheme = 'light' | 'sepia' | 'dark';

export const DocumentMultiPageViewer: React.FC<DocumentMultiPageViewerProps> = ({
  record,
  onOpenZoomModal,
  className = '',
  initialMode,
}) => {
  const fileSource = record.originalDataUrl || record.thumbnailDataUrl || '';
  const isImage = isImageSource(fileSource, record.type);
  const isPdf = isPdfSource(fileSource) || (record.mimeType && record.mimeType.includes('pdf'));
  const fileKind = getFileKind(fileSource, record.type);
  const hasExtractedText = Boolean(record.rawText || record.summary);

  // Default mode: visual untuk PDF/gambar, reader untuk Word/teks
  const defaultMode =
    initialMode ||
    (fileKind === 'word' || fileKind === 'excel' || (!isPdf && !isImage && hasExtractedText)
      ? 'reader'
      : 'visual');

  const [activeTab, setActiveTab] = useState<'visual' | 'reader'>(defaultMode);

  // Fullscreen State
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showThumbnailsRail, setShowThumbnailsRail] = useState<boolean>(true);

  // Multi-Page State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(() => {
    if (record.pages && record.pages.length > 0) return record.pages.length;
    return 1;
  });

  // Page Cache (Halaman 1, 2, ..., N)
  const [pageCache, setPageCache] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    if (record.thumbnailDataUrl) initial[1] = record.thumbnailDataUrl;
    if (record.pages && record.pages.length > 0) {
      record.pages.forEach((url, idx) => {
        if (url) initial[idx + 1] = url;
      });
    }
    return initial;
  });

  const [isLoadingPage, setIsLoadingPage] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  // Reader Mode State
  const [fontSize, setFontSize] = useState<number>(13); // px
  const [readerTheme, setReaderTheme] = useState<ReaderTheme>('light');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isExpandedFull, setIsExpandedFull] = useState<boolean>(false);

  // Touch swipe gesture refs
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  // Deteksi jumlah total halaman PDF on-demand
  useEffect(() => {
    let isMounted = true;
    if (isPdf && record.originalDataUrl && (!record.pages || record.pages.length <= 1)) {
      getPdfPageCount(record.originalDataUrl).then((count) => {
        if (isMounted && count > 1) {
          setTotalPages(count);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [isPdf, record.originalDataUrl, record.pages]);

  // Muat halaman PDF aktif secara dinamis jika belum ada di cache
  useEffect(() => {
    let isMounted = true;
    if (isPdf && record.originalDataUrl && !pageCache[currentPage]) {
      setIsLoadingPage(true);
      renderPdfPageToDataUrl(record.originalDataUrl, currentPage, 1400)
        .then((url) => {
          if (isMounted && url) {
            setPageCache((prev) => ({ ...prev, [currentPage]: url }));
          }
        })
        .finally(() => {
          if (isMounted) setIsLoadingPage(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [currentPage, isPdf, record.originalDataUrl, pageCache]);

  const activePageImageUrl =
    pageCache[currentPage] || (currentPage === 1 ? record.thumbnailDataUrl : null);

  const handlePrevPage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentPage > 1) {
      haptics.impactLight();
      setCurrentPage((p) => p - 1);
    }
  };

  const handleNextPage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentPage < totalPages) {
      haptics.impactLight();
      setCurrentPage((p) => p + 1);
    }
  };

  const handleZoomIn = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    haptics.impactLight();
    setZoomLevel((z) => Math.min(3.0, +(z + 0.25).toFixed(2)));
  };

  const handleZoomOut = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    haptics.impactLight();
    setZoomLevel((z) => Math.max(0.5, +(z - 0.25).toFixed(2)));
  };

  const handleResetZoom = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    haptics.impactLight();
    setZoomLevel(1);
    setRotation(0);
  };

  const handleRotate = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    haptics.impactLight();
    setRotation((r) => (r + 90) % 360);
  };

  const handleCopyText = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const textToCopy = record.rawText || record.summary || '';
    if (!textToCopy) return;
    try {
      await copyToClipboard(textToCopy);
      setIsCopied(true);
      haptics.notificationSuccess();
      setTimeout(() => setIsCopied(false), 2000);
    } catch (_e) {}
  };

  const handleDownload = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    haptics.impactLight();
    await safeDownloadOrViewFile({
      title: record.title || 'Berkas Dokumen',
      dataUrl: fileSource,
      textContent: fileSource ? undefined : (record.rawText || record.summary),
      filename: `${(record.title || 'dokumen').replace(/[^a-zA-Z0-9_-]/g, '_')}.${
        isPdf ? 'pdf' : fileKind === 'word' ? 'docx' : fileKind === 'excel' ? 'xlsx' : 'jpg'
      }`,
    });
  };

  const handleShare = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    haptics.impactLight();
    await shareContent({
      title: record.title,
      text: record.summary || record.title,
      dataUrl: fileSource,
      filename: `${(record.title || 'dokumen').replace(/[^a-zA-Z0-9_-]/g, '_')}.${
        isPdf ? 'pdf' : fileKind === 'word' ? 'docx' : fileKind === 'excel' ? 'xlsx' : 'jpg'
      }`,
    });
  };

  // Touch handlers for natural page flipping
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 55) {
      if (diff > 0 && currentPage < totalPages) {
        handleNextPage();
      } else if (diff < 0 && currentPage > 1) {
        handlePrevPage();
      }
    }
  };

  // Keyboard navigation when in fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        handleNextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        handlePrevPage();
      } else if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, currentPage, totalPages]);

  // Parser teks untuk Reader Mode (Word, Text, OCR)
  const fullDocumentText = record.rawText || record.summary || '';
  const paragraphs = fullDocumentText.split('\n').filter((l) => l.trim().length > 0);
  const wordCount = fullDocumentText.trim().split(/\s+/).filter(Boolean).length;

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. EMBEDDED CARD READER (TAMPILAN NORMAL PADA HALAMAN DETAIL RECORD)       */}
      {/* ========================================================================= */}
      <div
        className={`w-full bg-white rounded-3xl border border-stone-200/90 shadow-sm p-4 flex flex-col relative overflow-hidden ${className}`}
      >
        {/* Top Header Toolbar */}
        <div className="w-full flex items-center justify-between pb-3 border-b border-stone-100 gap-2">
          {/* Title & Document Badge */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                isPdf
                  ? 'bg-rose-50 text-rose-600 border border-rose-200'
                  : fileKind === 'word'
                  ? 'bg-sky-50 text-sky-600 border border-sky-200'
                  : isImage
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                  : 'bg-stone-100 text-stone-700 border border-stone-200'
              }`}
            >
              {isPdf ? (
                <FileCode className="w-5 h-5" />
              ) : fileKind === 'word' ? (
                <FileText className="w-5 h-5" />
              ) : fileKind === 'excel' ? (
                <FileSpreadsheet className="w-5 h-5" />
              ) : (
                <BookOpen className="w-5 h-5" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-stone-500">
                  {isPdf
                    ? 'PDF Reader'
                    : fileKind === 'word'
                    ? 'DOCX Reader'
                    : isImage
                    ? 'Image Viewer'
                    : 'Document Reader'}
                </span>
                {totalPages > 1 && (
                  <span className="text-[10px] font-extrabold px-2 py-0.2 rounded-md bg-stone-100 text-stone-700 border border-stone-200">
                    {totalPages} Halaman
                  </span>
                )}
              </div>
              <p className="text-xs font-bold text-stone-900 truncate">{record.title}</p>
            </div>
          </div>

          {/* Mode Selector & Expand Action */}
          <div className="flex items-center gap-1.5 shrink-0">
            {hasExtractedText && (activePageImageUrl || isPdf || isImage) && (
              <div className="flex items-center bg-stone-100 p-0.5 rounded-xl border border-stone-200/80 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => {
                    haptics.impactLight();
                    setActiveTab('visual');
                  }}
                  className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                    activeTab === 'visual'
                      ? 'bg-white text-stone-900 shadow-2xs font-extrabold'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                  title="Tampilan Halaman Visual Asli"
                >
                  <Eye className="w-3 h-3" />
                  <span className="hidden sm:inline">Visual</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    haptics.impactLight();
                    setActiveTab('reader');
                  }}
                  className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                    activeTab === 'reader'
                      ? 'bg-[#165a4c] text-white shadow-2xs font-extrabold'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                  title="Tampilan Mode Baca Teks Terstruktur"
                >
                  <Type className="w-3 h-3" />
                  <span className="hidden sm:inline">Teks Baca</span>
                </button>
              </div>
            )}

            {/* Tombol Masuk Mode Fullscreen Reader */}
            <button
              type="button"
              onClick={() => {
                haptics.impactMedium();
                setIsFullscreen(true);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-[#165a4c] hover:bg-[#11473c] text-white active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-xs"
              title="Buka PDF Reader Layar Penuh"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Layar Penuh</span>
            </button>
          </div>
        </div>

        {/* Body Visual Tab */}
        {activeTab === 'visual' ? (
          <div className="flex flex-col mt-2.5">
            <div
              onClick={() => {
                haptics.impactMedium();
                setIsFullscreen(true);
              }}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
              className="w-full relative rounded-2xl bg-stone-100/90 border border-stone-200 flex items-center justify-center overflow-hidden min-h-[300px] max-h-[440px] cursor-pointer group select-none shadow-inner"
            >
              {activePageImageUrl ? (
                <div
                  className="w-full h-full flex items-center justify-center transition-transform duration-200"
                  style={{
                    transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                  }}
                >
                  <img
                    src={activePageImageUrl}
                    alt={`Halaman ${currentPage} - ${record.title}`}
                    className="max-h-[410px] w-auto max-w-full object-contain drop-shadow-md rounded-md"
                  />
                </div>
              ) : isLoadingPage ? (
                <div className="flex flex-col items-center justify-center p-8 space-y-2 text-stone-500">
                  <Loader2 className="w-8 h-8 text-[#165a4c] animate-spin" />
                  <p className="text-xs font-semibold">Memuat halaman {currentPage}...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 space-y-2 text-stone-400">
                  <FileCode className="w-10 h-10 text-stone-300" />
                  <p className="text-xs font-semibold">Pratinjau halaman {currentPage} siap diproses</p>
                </div>
              )}

              {/* Floating Quick Navigation */}
              {totalPages > 1 && (
                <>
                  {currentPage > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrevPage();
                      }}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer z-10 backdrop-blur-xs"
                      title="Halaman Sebelumnya"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  )}
                  {currentPage < totalPages && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNextPage();
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer z-10 backdrop-blur-xs"
                      title="Halaman Selanjutnya"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  )}
                </>
              )}

              {/* Tooltip Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors flex items-center justify-center pointer-events-none">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/75 text-white text-xs font-bold px-4 py-2 rounded-full backdrop-blur-xs flex items-center gap-1.5 shadow-lg">
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Ketuk untuk Mode Layar Penuh</span>
                </span>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="w-full mt-3 pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200/70">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= 0.75}
                  className="p-1 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-white active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                  title="Perkecil"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono font-bold text-stone-600 px-1 select-none">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= 2.5}
                  className="p-1 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-white active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                  title="Perbesar"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleRotate}
                  className="p-1 ml-1 border-l border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-white active:scale-95 transition-all cursor-pointer"
                  title="Putar 90°"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {totalPages > 1 ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={handlePrevPage}
                    className="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 disabled:opacity-30 disabled:pointer-events-none text-stone-700 font-bold text-xs flex items-center gap-0.5 transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">Prev</span>
                  </button>

                  <span className="text-[11px] font-extrabold text-stone-700 px-2 select-none">
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={handleNextPage}
                    className="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 disabled:opacity-30 disabled:pointer-events-none text-stone-700 font-bold text-xs flex items-center gap-0.5 transition-all cursor-pointer"
                  >
                    <span className="hidden xs:inline">Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <span className="text-[10px] font-bold text-stone-500 bg-stone-100 px-2.5 py-1 rounded-lg">
                  1 Lembar
                </span>
              )}
            </div>

            {/* Quick Page Jump Thumbnails Strip */}
            {totalPages > 1 && (
              <div className="w-full mt-2 flex items-center gap-1 overflow-x-auto py-1 px-1 no-scrollbar">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                  const isActive = p === currentPage;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        haptics.impactLight();
                        setCurrentPage(p);
                      }}
                      className={`min-w-[32px] h-7 px-1.5 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                        isActive
                          ? 'bg-[#165a4c] text-white shadow-xs scale-105'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      Hal {p}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Body Reader Tab (DOCX / Structured Text) */
          <div className="flex flex-col mt-2.5 space-y-3">
            <div className="flex items-center justify-between gap-2 bg-stone-100/90 p-2 rounded-2xl border border-stone-200/80">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setFontSize((s) => Math.max(11, s - 1))}
                  className="w-7 h-7 rounded-lg bg-white text-stone-700 font-bold text-xs shadow-2xs hover:bg-stone-50 active:scale-95 cursor-pointer flex items-center justify-center"
                  title="Perkecil Font"
                >
                  A-
                </button>
                <span className="text-[10px] font-mono font-bold text-stone-600 px-1 select-none">
                  {fontSize}px
                </span>
                <button
                  type="button"
                  onClick={() => setFontSize((s) => Math.min(18, s + 1))}
                  className="w-7 h-7 rounded-lg bg-white text-stone-700 font-bold text-xs shadow-2xs hover:bg-stone-50 active:scale-95 cursor-pointer flex items-center justify-center"
                  title="Perbesar Font"
                >
                  A+
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setReaderTheme('light')}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                    readerTheme === 'light'
                      ? 'bg-white text-stone-900 border-stone-400 shadow-2xs scale-105'
                      : 'bg-stone-200/60 text-stone-500 border-transparent'
                  }`}
                  title="Kertas Putih Bersih"
                >
                  <Sun className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setReaderTheme('sepia')}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                    readerTheme === 'sepia'
                      ? 'bg-[#fbf0d9] text-[#5f4b32] border-[#cbb292] shadow-2xs scale-105'
                      : 'bg-stone-200/60 text-stone-500 border-transparent'
                  }`}
                  title="Kertas Sepia Nyaman"
                >
                  <Coffee className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setReaderTheme('dark')}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                    readerTheme === 'dark'
                      ? 'bg-stone-900 text-stone-100 border-stone-700 shadow-2xs scale-105'
                      : 'bg-stone-200/60 text-stone-500 border-transparent'
                  }`}
                  title="Mode Gelap"
                >
                  <Moon className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleCopyText}
                className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-stone-50 text-stone-800 text-[11px] font-bold shadow-2xs active:scale-95 transition-all cursor-pointer flex items-center gap-1 border border-stone-200"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Tersalin' : 'Salin Teks'}</span>
              </button>
            </div>

            {fullDocumentText.length > 200 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-50 border border-stone-200/80 focus-within:border-[#165a4c] transition-colors">
                <Search className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari kata kunci dalam dokumen..."
                  className="w-full bg-transparent text-xs outline-none text-stone-800 placeholder:text-stone-400 font-sans"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-[10px] font-bold text-stone-400 hover:text-stone-600 cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
            )}

            <div
              className={`rounded-2xl p-4.5 border transition-colors shadow-2xs relative ${
                readerTheme === 'sepia'
                  ? 'bg-[#fdf6e2] text-[#433422] border-[#e2d5ba]'
                  : readerTheme === 'dark'
                  ? 'bg-stone-900 text-stone-100 border-stone-800'
                  : 'bg-stone-50/90 text-stone-900 border-stone-200/90'
              }`}
            >
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-black/10 dark:border-white/10">
                <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-60">
                  {wordCount > 0 ? `${wordCount} Kata • ${paragraphs.length} Bagian` : 'Isi Dokumen'}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 opacity-75">
                  Format Teks Terstruktur
                </span>
              </div>

              <div
                style={{ fontSize: `${fontSize}px`, lineHeight: 1.65 }}
                className={`font-sans space-y-2.5 select-text ${
                  !isExpandedFull ? 'max-h-64 overflow-hidden relative' : 'max-h-[600px] overflow-y-auto pr-1'
                }`}
              >
                {paragraphs.length > 0 ? (
                  paragraphs.map((paragraph, idx) => {
                    if (searchQuery && searchQuery.trim().length > 0) {
                      const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                      const parts = paragraph.split(regex);
                      return (
                        <p key={idx} className="whitespace-pre-wrap">
                          {parts.map((part, pIdx) =>
                            part.toLowerCase() === searchQuery.toLowerCase() ? (
                              <mark key={pIdx} className="bg-amber-300 text-stone-900 rounded-xs px-0.5 font-bold">
                                {part}
                              </mark>
                            ) : (
                              part
                            )
                          )}
                        </p>
                      );
                    }
                    return (
                      <p key={idx} className="whitespace-pre-wrap">
                        {paragraph}
                      </p>
                    );
                  })
                ) : (
                  <p className="opacity-50 italic">Belum ada teks yang dapat diekstrak.</p>
                )}

                {!isExpandedFull && paragraphs.length > 5 && (
                  <div
                    className={`absolute inset-x-0 bottom-0 h-24 pointer-events-none bg-gradient-to-t ${
                      readerTheme === 'sepia'
                        ? 'from-[#fdf6e2] to-transparent'
                        : readerTheme === 'dark'
                        ? 'from-stone-900 to-transparent'
                        : 'from-stone-50 to-transparent'
                    }`}
                  />
                )}
              </div>

              {paragraphs.length > 5 && (
                <div className="mt-3 pt-2 border-t border-black/10 dark:border-white/10 flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      haptics.impactLight();
                      setIsExpandedFull((prev) => !prev);
                    }}
                    className="text-xs font-bold text-[#165a4c] dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer py-1 px-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>
                      {isExpandedFull
                        ? 'Sembunyikan Sebagian'
                        : `Baca Seluruh Isi Dokumen (${paragraphs.length} Bagian)`}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. DEDICATED TRUE FULLSCREEN PDF / DOCUMENT READER OVERLAY                 */}
      {/* ========================================================================= */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-[9999] bg-[#0c100f] text-white flex flex-col select-none animate-fade-in"
          style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {/* Top Fullscreen Glass Bar */}
          <div className="w-full bg-[#141b18]/90 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center justify-between gap-2 z-20">
            {/* Close / Back */}
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => {
                  haptics.impactLight();
                  setIsFullscreen(false);
                }}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white cursor-pointer shrink-0"
                title="Tutup Layar Penuh"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white truncate max-w-[180px] sm:max-w-md">
                  {record.title}
                </h3>
                <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                  <span>{isPdf ? 'Dokumen PDF' : fileKind === 'word' ? 'Dokumen Word' : 'Pratinjau Citra'}</span>
                  {totalPages > 1 && <span>• Hal {currentPage} dari {totalPages}</span>}
                </p>
              </div>
            </div>

            {/* Top Toolbar Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              {hasExtractedText && (
                <div className="flex items-center bg-white/10 p-0.5 rounded-xl text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      haptics.impactLight();
                      setActiveTab('visual');
                    }}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-bold flex items-center gap-1 ${
                      activeTab === 'visual' ? 'bg-[#165a4c] text-white shadow-xs' : 'text-stone-300 hover:text-white'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Visual</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      haptics.impactLight();
                      setActiveTab('reader');
                    }}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-bold flex items-center gap-1 ${
                      activeTab === 'reader' ? 'bg-[#165a4c] text-white shadow-xs' : 'text-stone-300 hover:text-white'
                    }`}
                  >
                    <Type className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Teks</span>
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={handleRotate}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white cursor-pointer"
                title="Putar 90°"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-white cursor-pointer"
                title="Bagikan Dokumen"
              >
                <Share2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleDownload}
                className="p-2 rounded-xl bg-[#165a4c] hover:bg-[#11473c] active:scale-95 transition-all text-white cursor-pointer"
                title="Unduh / Buka Asli"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Fullscreen Body */}
          <div className="flex-1 relative overflow-hidden flex items-center justify-center">
            {activeTab === 'visual' ? (
              <div
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
                className="w-full h-full overflow-auto flex items-center justify-center p-2 sm:p-6"
              >
                {activePageImageUrl ? (
                  <div
                    className="transition-transform duration-200 flex items-center justify-center"
                    style={{
                      transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                    }}
                  >
                    <img
                      src={activePageImageUrl}
                      alt={`Halaman ${currentPage}`}
                      className="max-h-[82vh] max-w-[95vw] object-contain rounded-lg shadow-2xl drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]"
                    />
                  </div>
                ) : isLoadingPage ? (
                  <div className="flex flex-col items-center justify-center p-10 space-y-3 text-stone-300">
                    <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
                    <p className="text-sm font-semibold">Memuat halaman {currentPage}...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-10 space-y-3 text-stone-500">
                    <FileCode className="w-12 h-12" />
                    <p className="text-sm font-semibold">Halaman {currentPage} siap ditampilkan</p>
                  </div>
                )}

                {/* Fullscreen Floating Prev / Next Buttons */}
                {totalPages > 1 && (
                  <>
                    {currentPage > 1 && (
                      <button
                        type="button"
                        onClick={handlePrevPage}
                        className="fixed left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center shadow-2xl active:scale-95 transition-all cursor-pointer z-30 backdrop-blur-md border border-white/10"
                        title="Halaman Sebelumnya"
                      >
                        <ChevronLeft className="w-7 h-7" />
                      </button>
                    )}
                    {currentPage < totalPages && (
                      <button
                        type="button"
                        onClick={handleNextPage}
                        className="fixed right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center shadow-2xl active:scale-95 transition-all cursor-pointer z-30 backdrop-blur-md border border-white/10"
                        title="Halaman Selanjutnya"
                      >
                        <ChevronRight className="w-7 h-7" />
                      </button>
                    )}
                  </>
                )}
              </div>
            ) : (
              /* Fullscreen Reader Sheet */
              <div className="w-full h-full overflow-y-auto p-4 sm:p-8 flex justify-center">
                <div className="w-full max-w-2xl bg-white text-stone-900 rounded-3xl p-6 sm:p-10 shadow-2xl border border-stone-200 my-auto font-sans leading-relaxed select-text space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                    <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                      {wordCount} Kata • Format Teks Utuh
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyText}
                      className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      <span>{isCopied ? 'Tersalin' : 'Salin Teks'}</span>
                    </button>
                  </div>

                  <div className="space-y-3" style={{ fontSize: `${fontSize + 2}px` }}>
                    {paragraphs.map((p, i) => (
                      <p key={i} className="whitespace-pre-wrap leading-relaxed text-stone-800">
                        {p}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Fullscreen Control & Thumbnail Bar */}
          <div className="w-full bg-[#141b18]/95 backdrop-blur-md border-t border-white/10 px-4 py-2.5 flex flex-col gap-2 z-20">
            {/* Horizontal Thumbnails Rail (Jika dokumen multi-halaman) */}
            {totalPages > 1 && showThumbnailsRail && (
              <div className="w-full flex items-center gap-2 overflow-x-auto py-1 px-1 no-scrollbar border-b border-white/10 pb-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                  const isActive = p === currentPage;
                  const thumbImg = pageCache[p];
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        haptics.impactLight();
                        setCurrentPage(p);
                      }}
                      className={`relative rounded-xl overflow-hidden shrink-0 transition-all cursor-pointer border-2 ${
                        isActive
                          ? 'border-emerald-400 scale-105 shadow-[0_0_15px_rgba(52,211,153,0.4)]'
                          : 'border-white/20 opacity-60 hover:opacity-100'
                      } w-14 h-18 bg-stone-800 flex flex-col items-center justify-center`}
                    >
                      {thumbImg ? (
                        <img src={thumbImg} alt={`Hal ${p}`} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[11px] font-bold text-stone-300">Hal {p}</span>
                      )}
                      <span className="absolute bottom-0 inset-x-0 bg-black/75 text-[9px] font-bold text-white py-0.5 text-center">
                        {p}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Bottom Controls: Zoom, Reset, Page Navigation, Thumbnail Toggle */}
            <div className="w-full flex items-center justify-between gap-2">
              {/* Zoom controls */}
              <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= 0.5}
                  className="p-1.5 rounded-lg text-white hover:bg-white/20 active:scale-95 disabled:opacity-30 cursor-pointer"
                  title="Perkecil"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="text-xs font-mono font-bold text-stone-200 px-2 hover:text-white cursor-pointer"
                  title="Reset Zoom ke 100%"
                >
                  {Math.round(zoomLevel * 100)}%
                </button>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= 3.0}
                  className="p-1.5 rounded-lg text-white hover:bg-white/20 active:scale-95 disabled:opacity-30 cursor-pointer"
                  title="Perbesar"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>

              {/* Page Navigator */}
              {totalPages > 1 ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => handlePrevPage()}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none text-white font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Prev</span>
                  </button>

                  <span className="text-xs font-extrabold text-emerald-400 px-1 select-none">
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => handleNextPage()}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none text-white font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <span className="text-xs font-bold text-stone-400 bg-white/5 px-3 py-1 rounded-xl">
                  1 Halaman Dokumen
                </span>
              )}

              {/* Thumbnail Rail Toggle */}
              {totalPages > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    haptics.impactLight();
                    setShowThumbnailsRail((v) => !v);
                  }}
                  className={`p-2 rounded-xl transition-all cursor-pointer ${
                    showThumbnailsRail ? 'bg-emerald-500 text-black font-bold' : 'bg-white/10 text-white'
                  }`}
                  title="Tampilkan / Sembunyikan Bilah Halaman"
                >
                  <Layers className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
