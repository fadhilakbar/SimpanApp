import React, { useRef, useState } from 'react';
import { ArchiveRecord, RecordType } from '../types/record';
import {
  Search,
  SlidersHorizontal,
  Camera,
  Image as ImageIcon,
  FileText,
  PenLine,
  Mic,
  MoreHorizontal,
  BarChart2,
  ChevronRight,
  Lightbulb,
  ShoppingBag,
  Leaf,
  ShieldCheck,
  Sparkles,
  Star,
  X,
  FolderOpen,
  FolderDown,
  Lock,
} from 'lucide-react';
import { haptics } from '../utils/haptics';
import { formatDeviceDate, formatDeviceTime } from '../utils/dateFormatter';
import { BrandLoader } from '../components/ui';
import { useUserProfile } from '../services/authService';
import { RecordThumbnail } from '../components/record/RecordThumbnail';

export interface HomeViewProps {
  records: ArchiveRecord[];
  loading?: boolean;
  onSelectRecord: (record: ArchiveRecord) => void;
  onToggleFavorite: (id: string) => void;
  onOpenCapture: (type?: string) => void;
  onSelectGallery?: (file: File) => void;
  onSelectPDF?: (file: File) => void;
  onOpenBatchImport?: (files: File[]) => void;
  onOpenSearch: (query?: string) => void;
  onOpenSettings: () => void;
  onOpenProfile?: () => void;
  onViewAllRecords?: () => void;
  onViewAllStats?: () => void;
  onLockApp?: () => void;
  activeCategoryFilter?: string | null;
  onClearCategoryFilter?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  records,
  loading = false,
  onSelectRecord,
  onToggleFavorite,
  onOpenCapture,
  onSelectGallery,
  onSelectPDF,
  onOpenBatchImport,
  onOpenSearch,
  onOpenSettings: _onOpenSettings,
  onOpenProfile: _onOpenProfile,
  onViewAllRecords,
  onViewAllStats,
  onLockApp,
  activeCategoryFilter = null,
  onClearCategoryFilter,
}) => {
  // Active Filter state for Ringkasan Arsip
  const [activeTypeFilter, setActiveTypeFilter] = useState<'all' | 'receipt' | 'document' | 'note' | 'image' | 'audio'>('all');
  const [homeSearchText, setHomeSearchText] = useState<string>('');

  // Hidden file inputs for direct Gallery, PDF, and Batch Import
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const batchInputRef = useRef<HTMLInputElement>(null);

  const handleBatchFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      if (onOpenBatchImport) {
        onOpenBatchImport(filesArray);
      }
      e.target.value = '';
    }
  };

  // Dynamic greeting based on current time
  const getGreetingData = () => {
    const hour = new Date().getHours();
    if (hour < 11) return { text: 'Selamat pagi,', icon: '☀️' };
    if (hour < 15) return { text: 'Selamat siang,', icon: '🌤️' };
    if (hour < 18) return { text: 'Selamat sore,', icon: '⛅' };
    return { text: 'Selamat malam,', icon: '🌙' };
  };

  const greeting = getGreetingData();
  const { profile } = useUserProfile();
  const displayName = profile.name && profile.name.trim() ? profile.name : 'Pengguna';

  // Archive statistics counts
  const totalCount = records.length;
  const strukCount = records.filter((r) => r.type === 'receipt').length;
  const dokumenCount = records.filter((r) => r.type === 'document').length;
  const catatanCount = records.filter((r) => r.type === 'note').length;
  const gambarCount = records.filter((r) => r.type === 'image' || r.type === 'scan').length;
  const audioCount = records.filter((r) => r.type === 'audio').length;

  // Filtered records by active type filter or active sidebar category
  const filteredRecords = records.filter((r) => {
    if (activeCategoryFilter) {
      if (activeCategoryFilter === 'favorite') return r.isFavorite;
      if (activeCategoryFilter === 'receipt') return r.type === 'receipt';
      if (activeCategoryFilter === 'document') return r.type === 'document';
      if (activeCategoryFilter === 'note') return r.type === 'note';
      if (activeCategoryFilter === 'image') return r.type === 'image' || r.type === 'scan';
      if (activeCategoryFilter === 'audio') return r.type === 'audio';
      return r.category === activeCategoryFilter || r.tags?.includes(activeCategoryFilter);
    }
    if (activeTypeFilter === 'all') return true;
    if (activeTypeFilter === 'receipt') return r.type === 'receipt';
    if (activeTypeFilter === 'document') return r.type === 'document';
    if (activeTypeFilter === 'note') return r.type === 'note';
    if (activeTypeFilter === 'image') return r.type === 'image' || r.type === 'scan';
    if (activeTypeFilter === 'audio') return r.type === 'audio';
    return true;
  });

  // Favorite records (for top pinned section)
  const favoriteRecords = records.filter((r) => r.isFavorite);

  // Handle clicking a Ringkasan card to toggle or set filter
  const handleFilterClick = (type: 'all' | 'receipt' | 'document' | 'note' | 'image' | 'audio') => {
    haptics.impactLight();
    if (activeTypeFilter === type) {
      setActiveTypeFilter('all');
    } else {
      setActiveTypeFilter(type);
    }
  };

  // Direct Gallery File handler
  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      if (onSelectGallery) {
        onSelectGallery(e.target.files[0]);
      }
      e.target.value = '';
    }
  };

  // Direct PDF File handler
  const handlePDFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      if (onSelectPDF) {
        onSelectPDF(e.target.files[0]);
      }
      e.target.value = '';
    }
  };

  return (
    <div className="w-full pb-28 sm:pb-32 animate-fade-in select-none pt-2">
      <div className="w-full max-w-5xl lg:max-w-6xl mx-auto py-2 md:py-6 px-4 sm:px-8">
      {/* Hidden file inputs for direct upload actions */}
      <input
        type="file"
        ref={galleryInputRef}
        onChange={handleGalleryChange}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={pdfInputRef}
        onChange={handlePDFChange}
        accept=".pdf,application/pdf"
        className="hidden"
      />
      <input
        type="file"
        ref={batchInputRef}
        onChange={handleBatchFilesChange}
        multiple
        accept=".pdf,.docx,.doc,.xlsx,.xls,.txt,.csv,image/*"
        className="hidden"
      />

      {/* Active Sidebar Category Banner */}
      {activeCategoryFilter && (
        <div className="mb-4">
          <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-3 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
              <span className="text-xs font-bold text-emerald-950">
                Filter Kategori: <span className="capitalize">{activeCategoryFilter}</span> ({filteredRecords.length} catatan)
              </span>
            </div>
            {onClearCategoryFilter && (
              <button
                type="button"
                onClick={onClearCategoryFilter}
                className="text-xs font-bold text-emerald-800 hover:text-emerald-950 px-2.5 py-1 rounded-xl bg-white border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                Hapus Filter ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* 1. LUSH ORGANIC HERO SHOWCASE BANNER (COMPACT & SLEEK) */}
      <div className="pt-1 pb-3">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#124b3f] via-[#165a4c] to-[#0c312a] p-3.5 text-white shadow-md shadow-emerald-950/15 border border-emerald-600/30">
          {/* Ambient Glowing Orbs */}
          <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-emerald-400/20 blur-xl pointer-events-none" />
          <div className="absolute right-10 -bottom-8 w-24 h-24 rounded-full bg-teal-300/15 blur-lg pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-md text-[10px] font-medium text-emerald-100 border border-white/20">
                  <span>{greeting.icon}</span>
                  <span>{greeting.text}</span>
                </div>

                {/* Quick Lock App Button */}
                {onLockApp && (
                  <button
                    type="button"
                    onClick={() => {
                      haptics.impactMedium();
                      onLockApp();
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 text-[10px] font-semibold text-emerald-50 backdrop-blur-md border border-white/20 transition-all cursor-pointer shadow-2xs"
                    title="Kunci Aplikasi Sekarang"
                  >
                    <Lock className="w-2.5 h-2.5 text-emerald-200" />
                    <span>Kunci</span>
                  </button>
                )}
              </div>

              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white truncate">
                {displayName}
              </h2>
            </div>

            {/* Compact Botanical Emblem & Quote Pill */}
            <div className="shrink-0 flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/15 rounded-xl px-2.5 py-1.5 shadow-2xs">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-400 to-teal-300 flex items-center justify-center text-[#134e48] shadow-2xs shrink-0">
                <Leaf className="w-3.5 h-3.5 fill-current" />
              </div>
              <div className="text-left max-w-[85px]">
                <p className="text-[9px] font-serif italic text-emerald-100/90 leading-tight">
                  Tersusun rapi & tenang
                </p>
              </div>
            </div>
          </div>

          {/* Bottom quick stats indicator */}
          <div className="relative z-10 mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-emerald-100/80 font-medium">
            <div className="flex items-center gap-1.5 overflow-hidden pr-2">
              <ShieldCheck className="w-3 h-3 text-emerald-300 shrink-0" />
              <span className="truncate">Scan, Pahami, Simpan</span>
            </div>
            <div className="flex items-center gap-1 bg-white/15 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white border border-white/15 shrink-0">
              <Sparkles className="w-2.5 h-2.5 text-amber-300" />
              <span>{records.length} Tersimpan</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. QUICK SEARCH BAR (INTEGRATED DIRECTLY TO SEARCHVIEW) */}
      <div className="px-5 mb-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onOpenSearch(homeSearchText);
          }}
          className="w-full bg-white rounded-2xl py-2 px-3.5 flex items-center justify-between border border-stone-200/90 shadow-2xs hover:border-emerald-300 focus-within:border-[#165a4c] focus-within:ring-2 focus-within:ring-emerald-500/10 transition-all text-stone-700"
        >
          <div className="flex items-center gap-2.5 flex-1 overflow-hidden">
            <Search className="w-4 h-4 text-emerald-700 shrink-0" />
            <input
              type="text"
              value={homeSearchText}
              onChange={(e) => setHomeSearchText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onOpenSearch(homeSearchText);
                }
              }}
              placeholder="Cari struk, catatan, dokumen..."
              className="w-full bg-transparent outline-none text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 font-medium"
            />
            {homeSearchText && (
              <button
                type="button"
                onClick={() => setHomeSearchText('')}
                className="text-stone-400 hover:text-stone-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="p-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-colors ml-1.5 shrink-0 cursor-pointer"
            aria-label="Cari"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* 2.5 LOCAL DOCUMENT SCAN / BATCH IMPORT BANNER (PDF, DOCX, XLSX) */}
      <div className="px-5 mb-4">
        <div
          onClick={() => {
            haptics.impactLight();
            batchInputRef.current?.click();
          }}
          className="bg-gradient-to-r from-emerald-50/90 via-white to-teal-50/60 border border-emerald-200/80 rounded-2xl py-2 px-3.5 shadow-2xs flex items-center justify-between gap-3 cursor-pointer hover:border-emerald-300 active:scale-[0.99] transition-all"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#165a4c] to-emerald-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <FolderDown className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-stone-900 truncate">
                  Impor Berkas Cepat
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-[#165a4c] text-[9px] font-extrabold shrink-0">
                  PDF • Word • Excel
                </span>
              </div>
              <p className="text-[10px] text-stone-500 truncate">
                Pilih berkas dari penyimpanan untuk diarsipkan
              </p>
            </div>
          </div>

          <span className="text-[11px] font-bold text-[#165a4c] flex items-center gap-1 shrink-0 bg-white px-2.5 py-1 rounded-xl border border-emerald-200/80 shadow-2xs">
            Pilih Berkas
            <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </div>

      {/* 3. 6 VIBRANT ACTION BUTTONS ROW (Jewel Gradients & Working Direct Pickers) */}
      <div className="px-5 mb-5">
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
          {/* 1. Kamera */}
          <button
            onClick={() => onOpenCapture('camera')}
            className="flex flex-col items-center gap-1.5 min-w-[52px] group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-700/25 group-hover:scale-105 active:scale-95 transition-all">
              <Camera className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-stone-700">Kamera</span>
          </button>

          {/* 2. Galeri (Direct file picker) */}
          <button
            onClick={() => {
              haptics.impactLight();
              galleryInputRef.current?.click();
            }}
            className="flex flex-col items-center gap-1.5 min-w-[52px] group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-blue-500 text-white flex items-center justify-center shadow-md shadow-sky-600/25 group-hover:scale-105 active:scale-95 transition-all">
              <ImageIcon className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-stone-700">Galeri</span>
          </button>

          {/* 3. PDF / File (Direct file picker) */}
          <button
            onClick={() => {
              haptics.impactLight();
              pdfInputRef.current?.click();
            }}
            className="flex flex-col items-center gap-1.5 min-w-[52px] group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 to-pink-500 text-white flex items-center justify-center shadow-md shadow-rose-600/25 group-hover:scale-105 active:scale-95 transition-all">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-stone-700">PDF / File</span>
          </button>

          {/* 4. Catatan */}
          <button
            onClick={() => onOpenCapture('note')}
            className="flex flex-col items-center gap-1.5 min-w-[52px] group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-amber-500/25 group-hover:scale-105 active:scale-95 transition-all">
              <PenLine className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-stone-700">Catatan</span>
          </button>

          {/* 5. Rekam Suara */}
          <button
            onClick={() => onOpenCapture('voice')}
            className="flex flex-col items-center gap-1.5 min-w-[52px] group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-600/25 group-hover:scale-105 active:scale-95 transition-all">
              <Mic className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-stone-700">Suara</span>
          </button>

          {/* 6. Lainnya */}
          <button
            onClick={() => onOpenCapture()}
            className="flex flex-col items-center gap-1.5 min-w-[52px] group cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-stone-700 to-stone-900 text-white flex items-center justify-center shadow-md shadow-stone-900/20 group-hover:scale-105 active:scale-95 transition-all">
              <MoreHorizontal className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-stone-700">Lainnya</span>
          </button>
        </div>
      </div>

      {/* 4. ⭐ PINNED FAVORITES SECTION (Shown directly above Terbaru) */}
      {favoriteRecords.length > 0 && (
        <div className="px-5 mb-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <h3 className="text-sm sm:text-base font-bold text-stone-900">Favorit</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60">
                {favoriteRecords.length}
              </span>
            </div>
          </div>

          {/* Horizontal scroll of compact favorites */}
          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
            {favoriteRecords.map((fav) => (
              <div
                key={fav.id}
                onClick={() => onSelectRecord(fav)}
                className="shrink-0 w-48 bg-gradient-to-br from-amber-50/50 via-white to-white rounded-2xl p-2.5 border border-amber-200/80 shadow-2xs hover:border-amber-400 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 overflow-hidden min-w-0 flex-1">
                  <RecordThumbnail record={fav} size="sm" />
                  <div className="overflow-hidden">
                    <h4 className="text-xs font-bold text-stone-900 truncate leading-tight">
                      {fav.title}
                    </h4>
                    <span className="text-[9px] font-semibold text-stone-400 block mt-0.5 truncate">
                      {fav.category || 'Tersimpan'}
                    </span>
                  </div>
                </div>

                {/* Star Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    haptics.impactLight();
                    onToggleFavorite(fav.id);
                  }}
                  className="p-1 text-amber-400 hover:text-amber-500 shrink-0"
                  aria-label="Hapus Favorit"
                >
                  <Star className="w-4 h-4 fill-amber-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. DAFTAR ARSIP TERBARU (With Working Type Filter) */}
      <div className="px-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-stone-900">
              {activeTypeFilter === 'all'
                ? 'Terbaru'
                : `Terbaru (${activeTypeFilter.toUpperCase()})`}
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200/80">
              {filteredRecords.length}
            </span>
          </div>

          <button
            onClick={() => {
              if (onViewAllRecords) onViewAllRecords();
              else onOpenSearch();
            }}
            className="text-xs font-semibold text-[#165a4c] hover:text-[#134e48] flex items-center gap-0.5 cursor-pointer"
          >
            <span>Lihat Semua</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* List of Records (Compact Style) */}
        {loading ? (
          <div className="py-8 flex items-center justify-center">
            <BrandLoader
              mode="inline"
              size="md"
              title="Memuat Data..."
              subtitle="Menyinkronkan data lokal"
            />
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="bg-white rounded-2xl py-3 px-4 border border-stone-200/80 shadow-2xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#165a4c] flex items-center justify-center shrink-0 border border-emerald-100">
                <FolderOpen className="w-4 h-4" />
              </div>
              <p className="text-xs text-stone-500 font-medium truncate">
                {activeTypeFilter === 'all'
                  ? 'Belum ada arsip tersimpan'
                  : `Tidak ada catatan tipe "${activeTypeFilter}"`}
              </p>
            </div>
            {activeTypeFilter !== 'all' ? (
              <button
                onClick={() => setActiveTypeFilter('all')}
                className="text-[11px] font-bold text-[#165a4c] bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200/80 hover:bg-emerald-100 transition-all shrink-0 cursor-pointer"
              >
                Reset
              </button>
            ) : (
              <button
                onClick={() => onOpenCapture()}
                className="text-[11px] font-bold text-white bg-[#165a4c] px-3 py-1.5 rounded-xl shadow-2xs hover:bg-[#134e48] active:scale-95 transition-all shrink-0 cursor-pointer whitespace-nowrap"
              >
                + Simpan
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredRecords.slice(0, 7).map((r) => {
              const dateStr = formatDeviceDate(r.createdAt, { withYear: false });
              const timeStr = formatDeviceTime(r.createdAt);
              const amountField = r.extractedFields?.find(
                (f) => f.key === 'total_amount' || f.key === 'amount'
              );
              const amountVal = amountField ? ` · ${amountField.currentValue}` : '';

              const isReceipt = r.type === 'receipt';
              const isDoc = r.type === 'document';
              const isNote = r.type === 'note';
              const isAudio = r.type === 'audio';

              return (
                <div
                  key={r.id}
                  onClick={() => onSelectRecord(r)}
                  className="bg-white rounded-2xl py-2 px-3 border border-stone-200/80 shadow-2xs hover:border-emerald-200 hover:shadow-xs active:scale-[0.99] transition-all cursor-pointer flex items-center justify-between gap-2.5"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden min-w-0 flex-1">
                    <RecordThumbnail record={r} size="md" />

                    {/* Metadata & Badges */}
                    <div className="overflow-hidden">
                      <h4 className="text-xs sm:text-sm font-bold text-stone-900 truncate">
                        {r.title}
                      </h4>
                      <p className="text-[10px] text-stone-400 mt-0.5 truncate">
                        {dateStr}, {timeStr} {amountVal}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        {isReceipt && (
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200/60">
                            Struk
                          </span>
                        )}
                        {isDoc && (
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-sky-50 text-sky-600 border border-sky-200/60">
                            Dokumen
                          </span>
                        )}
                        {isNote && (
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/60">
                            Catatan
                          </span>
                        )}
                        {isAudio && (
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200/60">
                            Audio
                          </span>
                        )}
                        {r.category && (
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60 truncate max-w-[90px]">
                            {r.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions: Favorite Star & More */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        haptics.impactLight();
                        onToggleFavorite(r.id);
                      }}
                      className="p-1.5 rounded-lg text-stone-300 hover:text-amber-400 transition-colors"
                      aria-label="Favoritkan"
                    >
                      <Star
                        className={`w-4 h-4 ${r.isFavorite ? 'text-amber-400 fill-amber-400' : 'text-stone-300'
                          }`}
                      />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectRecord(r);
                      }}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700"
                      aria-label="Detail"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. COMPACT & FUNCTIONAL "RINGKASAN ARSIP" FILTER BUTTONS */}
      <div className="px-5 mb-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4 text-[#165a4c]" />
            <h3 className="text-sm sm:text-base font-bold text-stone-900">Ringkasan</h3>
          </div>
          <button
            onClick={() => {
              if (onViewAllRecords) onViewAllRecords();
              else if (onViewAllStats) onViewAllStats();
              else onOpenSearch();
            }}
            className="text-xs font-semibold text-[#165a4c] hover:text-[#134e48] flex items-center gap-0.5 cursor-pointer"
          >
            <span>Lihat Semua</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 6 Compact, Sleek Filter Buttons in a Single Row */}
        <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
          {/* 1. Total Item */}
          <button
            onClick={() => handleFilterClick('all')}
            className={`py-1.5 px-0.5 rounded-xl flex flex-col items-center text-center transition-all cursor-pointer ${activeTypeFilter === 'all'
              ? 'bg-emerald-50/95 border border-emerald-600 ring-1.5 ring-emerald-600/30 shadow-xs scale-[1.02]'
              : 'bg-white border border-stone-200/80 hover:border-emerald-300 active:scale-95'
              }`}
          >
            <div className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center mb-0.5 shadow-2xs">
              <FileText className="w-3 h-3" />
            </div>
            <span className="text-xs font-black text-stone-900 leading-none">{totalCount}</span>
            <span className="text-[9px] text-emerald-800 font-bold mt-0.5 truncate max-w-full tracking-tight">
              Total
            </span>
          </button>

          {/* 2. Struk */}
          <button
            onClick={() => handleFilterClick('receipt')}
            className={`py-1.5 px-0.5 rounded-xl flex flex-col items-center text-center transition-all cursor-pointer ${activeTypeFilter === 'receipt'
              ? 'bg-rose-50/95 border border-rose-600 ring-1.5 ring-rose-600/30 shadow-xs scale-[1.02]'
              : 'bg-white border border-stone-200/80 hover:border-rose-300 active:scale-95'
              }`}
          >
            <div className="w-5 h-5 rounded-md bg-rose-600 text-white flex items-center justify-center mb-0.5 shadow-2xs">
              <ShoppingBag className="w-3 h-3" />
            </div>
            <span className="text-xs font-black text-stone-900 leading-none">{strukCount}</span>
            <span className="text-[9px] text-rose-800 font-bold mt-0.5 truncate max-w-full tracking-tight">
              Struk
            </span>
          </button>

          {/* 3. Dokumen */}
          <button
            onClick={() => handleFilterClick('document')}
            className={`py-1.5 px-0.5 rounded-xl flex flex-col items-center text-center transition-all cursor-pointer ${activeTypeFilter === 'document'
              ? 'bg-sky-50/95 border border-sky-600 ring-1.5 ring-sky-600/30 shadow-xs scale-[1.02]'
              : 'bg-white border border-stone-200/80 hover:border-sky-300 active:scale-95'
              }`}
          >
            <div className="w-5 h-5 rounded-md bg-sky-600 text-white flex items-center justify-center mb-0.5 shadow-2xs">
              <FileText className="w-3 h-3" />
            </div>
            <span className="text-xs font-black text-stone-900 leading-none">{dokumenCount}</span>
            <span className="text-[9px] text-sky-800 font-bold mt-0.5 truncate max-w-full tracking-tight">
              Dokumen
            </span>
          </button>

          {/* 4. Catatan */}
          <button
            onClick={() => handleFilterClick('note')}
            className={`py-1.5 px-0.5 rounded-xl flex flex-col items-center text-center transition-all cursor-pointer ${activeTypeFilter === 'note'
              ? 'bg-amber-50/95 border border-amber-600 ring-1.5 ring-amber-600/30 shadow-xs scale-[1.02]'
              : 'bg-white border border-stone-200/80 hover:border-amber-300 active:scale-95'
              }`}
          >
            <div className="w-5 h-5 rounded-md bg-amber-500 text-white flex items-center justify-center mb-0.5 shadow-2xs">
              <PenLine className="w-3 h-3" />
            </div>
            <span className="text-xs font-black text-stone-900 leading-none">{catatanCount}</span>
            <span className="text-[9px] text-amber-900 font-bold mt-0.5 truncate max-w-full tracking-tight">
              Catatan
            </span>
          </button>

          {/* 5. Gambar */}
          <button
            onClick={() => handleFilterClick('image')}
            className={`py-1.5 px-0.5 rounded-xl flex flex-col items-center text-center transition-all cursor-pointer ${activeTypeFilter === 'image'
              ? 'bg-purple-50/95 border border-purple-600 ring-1.5 ring-purple-600/30 shadow-xs scale-[1.02]'
              : 'bg-white border border-stone-200/80 hover:border-purple-300 active:scale-95'
              }`}
          >
            <div className="w-5 h-5 rounded-md bg-purple-600 text-white flex items-center justify-center mb-0.5 shadow-2xs">
              <ImageIcon className="w-3 h-3" />
            </div>
            <span className="text-xs font-black text-stone-900 leading-none">{gambarCount}</span>
            <span className="text-[9px] text-purple-900 font-bold mt-0.5 truncate max-w-full tracking-tight">
              Gambar
            </span>
          </button>

          {/* 6. Audio */}
          <button
            onClick={() => handleFilterClick('audio')}
            className={`py-1.5 px-0.5 rounded-xl flex flex-col items-center text-center transition-all cursor-pointer ${activeTypeFilter === 'audio'
              ? 'bg-teal-50/95 border border-teal-600 ring-1.5 ring-teal-600/30 shadow-xs scale-[1.02]'
              : 'bg-white border border-stone-200/80 hover:border-teal-300 active:scale-95'
              }`}
          >
            <div className="w-5 h-5 rounded-md bg-teal-600 text-white flex items-center justify-center mb-0.5 shadow-2xs">
              <Mic className="w-3 h-3" />
            </div>
            <span className="text-xs font-black text-stone-900 leading-none">{audioCount}</span>
            <span className="text-[9px] text-teal-900 font-bold mt-0.5 truncate max-w-full tracking-tight">
              Audio
            </span>
          </button>
        </div>
      </div>

      {/* 7. "Tips Hari Ini" Card */}
      <div className="px-5 mb-8">
        <div className="bg-gradient-to-r from-amber-50/90 via-orange-50/40 to-white rounded-2xl p-3.5 border border-amber-200/90 shadow-2xs flex items-center justify-between gap-3 cursor-pointer hover:border-amber-300 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 to-orange-400 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-stone-900">Tips Hari Ini</h4>
              <p className="text-[11px] text-stone-600 mt-0.5 font-medium">
                Coba simpan struk belanja. Nanti lebih mudah dicari kapan saja.
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
        </div>
      </div>
      </div>
    </div>
  );
};
