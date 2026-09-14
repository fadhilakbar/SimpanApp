import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  FileText,
  PenLine,
  MoreHorizontal,
  Camera,
  Clock,
  X,
  ImageIcon,
  Mic,
} from 'lucide-react';
import { ArchiveRecord } from '../types/record';
import { haptics } from '../utils/haptics';
import { formatDeviceDate, formatDeviceTime } from '../utils/dateFormatter';
import { DatePickerBottomSheet } from '../components/timeline/DatePickerBottomSheet';
import { BrandLoader } from '../components/ui/BrandLoader';
import { getPaginatedRecords, PaginatedResult } from '../services/db';
import { RecordThumbnail } from '../components/record/RecordThumbnail';

export interface TimelineViewProps {
  records: ArchiveRecord[];
  loading?: boolean;
  onSelectRecord: (record: ArchiveRecord) => void;
  onOpenSearch?: () => void;
  onOpenAvatar?: () => void;
  onOpenCapture?: (type?: string) => void;
}

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const DAYS_OF_WEEK = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export const TimelineView: React.FC<TimelineViewProps> = ({
  records,
  loading = false,
  onSelectRecord,
  onOpenSearch: _onOpenSearch,
  onOpenAvatar: _onOpenAvatar,
  onOpenCapture = () => {},
}) => {
  const dateInputRef = useRef<HTMLInputElement>(null);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth();

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number>(
    new Date().getMonth()
  );
  const [specificDateFilter, setSpecificDateFilter] = useState<string | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState<boolean>(false);

  // Generate 6 chronological months centered on current selection
  const months = useMemo(() => {
    const list: { label: string; year: number; monthIdx: number }[] = [];
    for (let i = -3; i <= 2; i++) {
      const d = new Date(selectedYear, selectedMonthIdx + i, 1);
      list.push({
        label: MONTH_NAMES[d.getMonth()].slice(0, 3),
        year: d.getFullYear(),
        monthIdx: d.getMonth(),
      });
    }
    return list;
  }, [selectedYear, selectedMonthIdx]);

  // Handle Prev/Next Month
  const handlePrevMonth = () => {
    haptics.impactLight();
    setSpecificDateFilter(null);
    if (selectedMonthIdx === 0) {
      setSelectedMonthIdx(11);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonthIdx((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    haptics.impactLight();
    setSpecificDateFilter(null);
    if (selectedMonthIdx === 11) {
      setSelectedMonthIdx(0);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonthIdx((prev) => prev + 1);
    }
  };

  // Handle Date Picker
  const handleDatePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value; // "YYYY-MM-DD"
    if (!val) return;
    haptics.notificationSuccess();
    const parts = val.split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    setSelectedYear(y);
    setSelectedMonthIdx(m);
    setSpecificDateFilter(val);
  };

  const [page, setPage] = useState<number>(1);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [timelineData, setTimelineData] = useState<PaginatedResult<ArchiveRecord>>({
    items: [],
    total: 0,
    page: 1,
    pageSize: 15,
    totalPages: 1,
    hasMore: false,
  });

  // Reset page when month or date filter changes
  useEffect(() => {
    setPage(1);
  }, [selectedYear, selectedMonthIdx, specificDateFilter]);

  // Query database with pagination
  useEffect(() => {
    let isCancelled = false;
    setIsFetching(true);
    getPaginatedRecords({
      page,
      pageSize: 15,
      year: specificDateFilter ? undefined : selectedYear,
      monthIdx: specificDateFilter ? undefined : selectedMonthIdx,
      specificDate: specificDateFilter,
      sortBy: 'newest',
      filterDeleted: false,
    }).then((res) => {
      if (!isCancelled) {
        setTimelineData(res);
        setIsFetching(false);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [selectedYear, selectedMonthIdx, specificDateFilter, page, records]);

  // Group filtered records by day
  const groupedByDay = useMemo(() => {
    const groups: { [key: string]: { date: Date; items: ArchiveRecord[] } } = {};

    timelineData.items.forEach((r) => {
      const d = new Date(r.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!groups[key]) {
        groups[key] = { date: d, items: [] };
      }
      groups[key].items.push(r);
    });

    return Object.values(groups).sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    );
  }, [timelineData.items]);

  return (
    <div className="w-full pb-28 sm:pb-32 animate-fade-in select-none pt-2">
      <div className="w-full max-w-4xl lg:max-w-5xl mx-auto py-2 md:py-6 px-4 sm:px-8">
        {/* Hidden Native Date Input */}
        <input
          type="date"
          ref={dateInputRef}
          onChange={handleDatePicked}
          className="hidden"
        />

        {/* Heading & Date Picker Action */}
        <div className="pt-2 pb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
              Linimasa
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              Semua yang pernah Anda simpan, urut berdasarkan waktu nyata.
            </p>
          </div>

        {/* Real Date Picker Button */}
        <button
          type="button"
          onClick={() => {
            haptics.impactLight();
            setIsDatePickerOpen(true);
          }}
          className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300/80 rounded-full py-1.5 px-3.5 flex items-center gap-1.5 text-xs font-bold text-[#165a4c] shadow-2xs hover:bg-emerald-100 active:scale-95 transition-all shrink-0 cursor-pointer"
        >
          <CalendarIcon className="w-3.5 h-3.5" />
          <span>Pilih Tanggal</span>
        </button>
      </div>

      {/* Specific Date Filter Active Badge */}
      {specificDateFilter && (
        <div className="px-5 mb-4">
          <div className="bg-emerald-50 border border-emerald-300/80 rounded-xl p-2.5 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-emerald-700" />
              <span className="text-xs font-bold text-emerald-950">
                Filter: {formatDeviceDate(specificDateFilter, { monthFormat: 'long' })}
              </span>
            </div>
            <button
              onClick={() => setSpecificDateFilter(null)}
              className="text-emerald-800 hover:text-emerald-950 p-1 rounded-full hover:bg-emerald-100/60 transition-colors"
              aria-label="Hapus Filter Tanggal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Month Carousel Navigator */}
      <div className="px-5 mb-5">
        <div className="flex items-center justify-between gap-1.5 bg-white border border-stone-200/80 rounded-2xl p-1.5 shadow-2xs">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-xl text-stone-500 hover:text-stone-800 hover:bg-stone-50 active:scale-90 transition-all cursor-pointer"
            aria-label="Bulan Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
          </button>

          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {months.map((m) => {
              const isSelected =
                selectedMonthIdx === m.monthIdx && selectedYear === m.year;
              return (
                <button
                  key={`${m.year}-${m.monthIdx}`}
                  onClick={() => {
                    haptics.impactLight();
                    setSelectedYear(m.year);
                    setSelectedMonthIdx(m.monthIdx);
                    setSpecificDateFilter(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex flex-col items-center leading-tight transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-tr from-[#165a4c] to-emerald-600 text-white shadow-xs scale-105'
                      : 'text-stone-500 hover:bg-stone-100'
                  }`}
                >
                  <span>{m.label}</span>
                  <span className={`text-[9px] ${isSelected ? 'text-emerald-100' : 'opacity-60'}`}>
                    {m.year}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            onClick={handleNextMonth}
            className="p-2 rounded-xl text-stone-500 hover:text-stone-800 hover:bg-stone-50 active:scale-90 transition-all cursor-pointer"
            aria-label="Bulan Berikutnya"
          >
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Month Section Header */}
      <div className="px-5 mb-4 flex items-center justify-between">
        <h3 className="text-base font-extrabold text-stone-900">
          {MONTH_NAMES[selectedMonthIdx]} {selectedYear}
        </h3>
        <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/80">
          {timelineData.total} catatan
        </span>
      </div>

      {/* Vertical Timeline Tree */}
      <div className="px-5">
        {loading || isFetching ? (
          <div className="py-12 flex justify-center">
            <BrandLoader
              mode="inline"
              size="md"
              title="Memuat Linimasa..."
              subtitle="Menyusun catatan berdasarkan waktu"
            />
          </div>
        ) : timelineData.items.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-stone-200/80 shadow-xs flex flex-col items-center">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#165a4c] mb-3.5 shadow-2xs">
              <Clock className="w-8 h-8 stroke-[1.8]" />
            </div>
            <h4 className="text-sm font-bold text-stone-900 mb-1">
              Belum Ada Catatan di {MONTH_NAMES[selectedMonthIdx]} {selectedYear}
            </h4>
            <p className="text-xs text-stone-500 max-w-xs leading-relaxed mb-4">
              {specificDateFilter
                ? 'Tidak ada catatan pada tanggal terpilih.'
                : 'Catatan yang Anda simpan di bulan ini akan otomatis muncul tersusun rapi di sini.'}
            </p>
            <button
              onClick={() => onOpenCapture('camera')}
              className="px-4 py-2.5 rounded-full bg-gradient-to-r from-[#165a4c] to-emerald-600 hover:from-[#134e48] hover:to-emerald-700 active:scale-95 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-[#165a4c]/20 transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Mulai Simpan Sekarang</span>
            </button>
          </div>
        ) : (
          <div className="relative pl-12 space-y-6">
            {/* Vertical Green Guide Line */}
            <div className="absolute top-3 bottom-3 left-5.5 w-0.5 bg-gradient-to-b from-emerald-500 via-emerald-300 to-teal-200" />

            {groupedByDay.map((group, groupIdx) => {
              const dayNum = group.date.getDate();
              const dayOfWeek = DAYS_OF_WEEK[group.date.getDay()];
              const monthShort = MONTH_NAMES[group.date.getMonth()].slice(0, 3);

              return (
                <div key={groupIdx} className="relative">
                  {/* Left Date Marker Node */}
                  <div className="absolute -left-12 top-0 flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-white border-2 border-emerald-600 flex items-center justify-center text-xs font-black text-[#165a4c] shadow-xs">
                      {dayNum}
                    </div>
                    <span className="text-[9px] font-bold text-emerald-800 mt-1">
                      {monthShort}
                    </span>
                    <span className="text-[9px] text-stone-400 font-medium">
                      {dayOfWeek}
                    </span>
                  </div>

                  {/* Cards under this date */}
                  <div className="space-y-2.5">
                    {group.items.map((r) => {
                      const timeStr = formatDeviceTime(r.createdAt);
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
                              <h4 className="text-xs sm:text-sm font-bold text-stone-900 truncate">
                                {r.title}
                              </h4>
                              <p className="text-[10px] sm:text-[11px] text-stone-400 mt-0.5 truncate">
                                {timeStr} {amountVal}
                              </p>
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <span className="text-[9px] font-semibold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200 capitalize">
                                  {r.type}
                                </span>
                                {r.category && (
                                  <span className="text-[9px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/60 truncate">
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
                            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 shrink-0 cursor-pointer"
                            aria-label="Aksi"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Server-side style Pagination Controls */}
            {timelineData.totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 pb-2 -ml-12">
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
                  Halaman {page} dari {timelineData.totalPages}
                </span>

                <button
                  type="button"
                  disabled={page >= timelineData.totalPages || isFetching}
                  onClick={() => {
                    haptics.impactLight();
                    setPage((p) => Math.min(timelineData.totalPages, p + 1));
                  }}
                  className="px-3 py-1.5 rounded-full border border-stone-200/80 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition-all shadow-2xs cursor-pointer"
                >
                  <span>Berikutnya</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      </div>

      {/* iOS-grade Bottom Sheet Date Picker */}
      <DatePickerBottomSheet
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        selectedDate={specificDateFilter}
        records={records}
        initialYear={selectedYear}
        initialMonthIdx={selectedMonthIdx}
        onSelectDate={(dateStr, year, monthIdx) => {
          setSelectedYear(year);
          setSelectedMonthIdx(monthIdx);
          setSpecificDateFilter(dateStr);
        }}
      />
    </div>
  );
};
