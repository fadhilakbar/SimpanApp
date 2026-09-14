import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  X,
  FileText,
  ShoppingBag,
  PenLine,
  Image as ImageIcon,
  Mic,
  MoreHorizontal,
  ChevronDown,
  Sparkles,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { ArchiveRecord } from '../types/record';
import { BrandHeader, BrandLoader } from '../components/ui';
import { formatDeviceDateTime } from '../utils/dateFormatter';
import { getPaginatedRecords, PaginatedResult } from '../services/db';
import { haptics } from '../utils/haptics';
import { RecordThumbnail } from '../components/record/RecordThumbnail';

export interface SearchViewProps {
  records?: ArchiveRecord[];
  loading?: boolean;
  onSelectRecord: (record: ArchiveRecord) => void;
  onToggleFavorite?: (id: string) => void;
  onOpenAvatar?: () => void;
  initialQuery?: string;
}

export const SearchView: React.FC<SearchViewProps> = ({
  records = [],
  loading = false,
  onSelectRecord,
  onOpenAvatar,
  initialQuery = '',
}) => {
  const [query, setQuery] = useState<string>(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState<string>(initialQuery);
  const [activeType, setActiveType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [page, setPage] = useState<number>(1);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [paginatedData, setPaginatedData] = useState<PaginatedResult<ArchiveRecord>>({
    items: [],
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 1,
    hasMore: false,
  });

  // Sync initial query if passed from HomeView
  useEffect(() => {
    if (initialQuery !== undefined && initialQuery !== query) {
      setQuery(initialQuery);
      setDebouncedQuery(initialQuery);
    }
  }, [initialQuery]);

  // Debounce query input to optimize database queries
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 220);
    return () => clearTimeout(timer);
  }, [query]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, activeType, sortBy]);

  // Query database directly ONLY when query has characters (Jangan auto-fetch saat kosong!)
  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (!trimmed) {
      setPaginatedData({
        items: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 1,
        hasMore: false,
      });
      setIsFetching(false);
      return;
    }

    let isCancelled = false;
    setIsFetching(true);
    getPaginatedRecords({
      page,
      pageSize: 10,
      searchQuery: trimmed,
      type: activeType,
      sortBy,
      filterDeleted: false,
    }).then((res) => {
      if (!isCancelled) {
        setPaginatedData(res);
        setIsFetching(false);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [debouncedQuery, activeType, sortBy, page, records]);

  // Counts by category
  const counts = useMemo(() => {
    return {
      all: records.length,
      receipt: records.filter((r) => r.type === 'receipt').length,
      document: records.filter((r) => r.type === 'document').length,
      image: records.filter((r) => r.type === 'image' || r.type === 'scan').length,
      note: records.filter((r) => r.type === 'note').length,
      audio: records.filter((r) => r.type === 'audio').length,
      other: records.filter((r) => r.type === 'other').length,
    };
  }, [records]);

  return (
    <div className="w-full pb-28 sm:pb-32 animate-fade-in select-none pt-2">
      <div className="w-full max-w-4xl lg:max-w-5xl mx-auto py-2 md:py-6 px-4 sm:px-8">
      {/* Greeting & Decorative Magnifier Bubble */}
      <div className="pt-2 pb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Cari</h2>
          <p className="text-xs text-stone-500 mt-1">
            Temukan apa pun yang Anda simpan.
          </p>
        </div>

        {/* Decorative Green Bubble with Magnifying Glass */}
        <div className="bg-emerald-50/90 border border-emerald-200/80 rounded-2xl py-1.5 px-3 flex items-center gap-2 shadow-xs shrink-0 max-w-[170px]">
          <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <Search className="w-3.5 h-3.5" />
          </div>
          <span className="text-[11px] font-serif italic text-emerald-900 font-medium leading-tight">
            Kata kunci kecil, kenangan besar.
          </span>
        </div>
      </div>

      {/* Search Bar Input */}
      <div className="px-5 mb-4">
        <div className="w-full bg-white rounded-2xl py-3 px-4 flex items-center gap-3 border border-stone-200/80 shadow-xs focus-within:border-emerald-600 transition-all">
          <Search className="w-4 h-4 text-stone-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari kata kunci, tanggal, nama..."
            className="flex-1 text-sm bg-transparent outline-none text-stone-800 placeholder:text-stone-400 font-medium"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-full text-stone-400 hover:text-stone-700 active:scale-90 transition-all"
              aria-label="Hapus kata kunci"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Category Chips Bar */}
      <div className="px-5 mb-5 overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center gap-2 min-w-max">
          {/* Semua */}
          <button
            onClick={() => setActiveType('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeType === 'all'
                ? 'bg-[#165a4c] text-white shadow-xs'
                : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
            }`}
          >
            <span>Semua</span>
            <span className="opacity-80">({counts.all})</span>
          </button>

          {/* Struk */}
          <button
            onClick={() => setActiveType('receipt')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeType === 'receipt'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 text-rose-500" />
            <span>Struk</span>
            <span className="text-stone-400">({counts.receipt})</span>
          </button>

          {/* Dokumen */}
          <button
            onClick={() => setActiveType('document')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeType === 'document'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-sky-500" />
            <span>Dokumen</span>
            <span className="text-stone-400">({counts.document})</span>
          </button>

          {/* Gambar */}
          <button
            onClick={() => setActiveType('image')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeType === 'image'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-purple-500" />
            <span>Gambar</span>
            <span className="text-stone-400">({counts.image})</span>
          </button>

          {/* Catatan */}
          <button
            onClick={() => setActiveType('note')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeType === 'note'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
            }`}
          >
            <PenLine className="w-3.5 h-3.5 text-amber-500" />
            <span>Catatan</span>
            <span className="text-stone-400">({counts.note})</span>
          </button>

          {/* Audio */}
          <button
            onClick={() => setActiveType('audio')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeType === 'audio'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
            }`}
          >
            <Mic className="w-3.5 h-3.5 text-indigo-500" />
            <span>Audio</span>
            <span className="text-stone-400">({counts.audio})</span>
          </button>
        </div>
      </div>

      {/* "Hasil Pencarian" Subheader & Stats */}
      <div className="px-5 mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-stone-900">
            Hasil Pencarian {query && `("${query}")`}
          </h3>
          <span className="text-[11px] font-medium text-stone-400">
            {paginatedData.total > 0
              ? `Menampilkan ${paginatedData.items.length} dari ${paginatedData.total} data`
              : 'Tidak ada data'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              setSortBy((prev) => (prev === 'newest' ? 'oldest' : 'newest'))
            }
            className="flex items-center gap-1 text-xs font-medium text-stone-600 bg-white border border-stone-200/80 px-2.5 py-1 rounded-full shadow-2xs cursor-pointer"
          >
            <span>{sortBy === 'newest' ? 'Terbaru' : 'Terlama'}</span>
            <ChevronDown className="w-3 h-3 text-stone-400" />
          </button>
        </div>
      </div>

      {/* Results List */}
      <div className="px-5 space-y-2.5 mb-6">
        {loading || isFetching ? (
          <div className="py-12 flex justify-center">
            <BrandLoader
              mode="inline"
              size="md"
              title="Mencari..."
              subtitle="Menelusuri data dan teks lokal"
            />
          </div>
        ) : !debouncedQuery.trim() ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-stone-200/80 shadow-xs flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200/70 text-emerald-700 flex items-center justify-center mb-3 shadow-2xs">
              <Search className="w-7 h-7 text-emerald-600" />
            </div>
            <h4 className="text-sm font-bold text-stone-900">Ketik untuk Mencari</h4>
            <p className="text-xs text-stone-500 max-w-xs mt-1 leading-relaxed">
              Ketik nama toko, judul berkas, atau isi teks catatan untuk menemukan arsip Anda.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-4">
              <span className="text-[10px] text-stone-400 font-bold uppercase w-full mb-1">
                Saran Pencarian
              </span>
              {['Struk Belanja', 'Kwitansi', 'Catatan', 'Dokumen', 'Tagihan'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setQuery(s)}
                  className="text-xs font-semibold px-3 py-1 rounded-full bg-stone-100 hover:bg-emerald-50 text-stone-700 hover:text-emerald-800 border border-stone-200 transition-colors cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : paginatedData.items.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-stone-200/80 shadow-xs">
            <p className="text-xs font-medium text-stone-500">
              Tidak ada arsip yang cocok dengan kata kunci "{debouncedQuery}".
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {paginatedData.items.map((r) => {
              const dateStr = formatDeviceDateTime(r.createdAt);
              const amountField = r.extractedFields?.find(
                (f) => f.key === 'total_amount' || f.key === 'amount'
              );
              const amountVal = amountField ? ` · ${amountField.currentValue}` : '';

              return (
                <div
                  key={r.id}
                  onClick={() => onSelectRecord(r)}
                  className="bg-white rounded-2xl p-3 border border-stone-200/80 shadow-xs hover:border-stone-300 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 overflow-hidden min-w-0 flex-1">
                    <RecordThumbnail record={r} size="md" />

                    <div className="overflow-hidden min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-stone-900 truncate">
                        {r.title}
                      </h4>
                      <p className="text-[11px] text-stone-400 mt-0.5 truncate">
                        {dateStr} {amountVal}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 border border-rose-200/60">
                          {r.type}
                        </span>
                        {r.category && (
                          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            {r.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectRecord(r);
                    }}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 shrink-0"
                    aria-label="Aksi"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Server-side style Pagination Controls */}
        {paginatedData.totalPages > 1 && (
          <div className="flex items-center justify-between pt-3 pb-1">
            <button
              type="button"
              disabled={page <= 1 || isFetching}
              onClick={() => {
                haptics.impactLight();
                setPage((p) => Math.max(1, p - 1));
              }}
              className="px-3 py-1.5 rounded-full border border-stone-200/80 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition-all shadow-2xs cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Sebelumnya</span>
            </button>

            <span className="text-xs font-semibold text-stone-500">
              Halaman {page} dari {paginatedData.totalPages}
            </span>

            <button
              type="button"
              disabled={page >= paginatedData.totalPages || isFetching}
              onClick={() => {
                haptics.impactLight();
                setPage((p) => Math.min(paginatedData.totalPages, p + 1));
              }}
              className="px-3 py-1.5 rounded-full border border-stone-200/80 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition-all shadow-2xs cursor-pointer"
            >
              <span>Berikutnya</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Bottom Hint Card */}
      <div>
        <div className="bg-emerald-50/50 border border-emerald-200/60 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-emerald-950">
                Tidak menemukan yang dicari?
              </h5>
              <p className="text-[11px] text-emerald-800/80 mt-0.5">
                Coba gunakan kata lain, atau jelajahi dengan filter.
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-emerald-600 shrink-0" />
        </div>
      </div>
      </div>
    </div>
  );
};
