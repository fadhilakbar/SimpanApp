import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Calendar as CalendarIcon,
  Check,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { haptics } from '../../utils/haptics';
import { ArchiveRecord } from '../../types/record';
import { formatDeviceDate } from '../../utils/dateFormatter';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

const WEEKDAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export interface DatePickerBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string | null; // "YYYY-MM-DD" or null
  onSelectDate: (dateStr: string | null, year: number, monthIdx: number) => void;
  records?: ArchiveRecord[];
  initialYear?: number;
  initialMonthIdx?: number;
}

export const DatePickerBottomSheet: React.FC<DatePickerBottomSheetProps> = ({
  isOpen,
  onClose,
  selectedDate,
  onSelectDate,
  records = [],
  initialYear = new Date().getFullYear(),
  initialMonthIdx = new Date().getMonth(),
}) => {
  const [viewYear, setViewYear] = useState<number>(() => {
    if (selectedDate) {
      const y = parseInt(selectedDate.split('-')[0], 10);
      return isNaN(y) ? initialYear : y;
    }
    return initialYear;
  });

  const [viewMonthIdx, setViewMonthIdx] = useState<number>(() => {
    if (selectedDate) {
      const m = parseInt(selectedDate.split('-')[1], 10) - 1;
      return isNaN(m) ? initialMonthIdx : m;
    }
    return initialMonthIdx;
  });

  const [tempSelectedDate, setTempSelectedDate] = useState<string | null>(selectedDate);
  const [showYearPicker, setShowYearPicker] = useState<boolean>(false);

  // Set of dates that have records for dot indicator
  const recordDateSet = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      const d = new Date(r.createdAt);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      set.add(`${yyyy}-${mm}-${dd}`);
    });
    return set;
  }, [records]);

  // Sync state when opened
  useEffect(() => {
    if (isOpen) {
      if (selectedDate) {
        const parts = selectedDate.split('-');
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        if (!isNaN(y)) setViewYear(y);
        if (!isNaN(m)) setViewMonthIdx(m);
        setTempSelectedDate(selectedDate);
      } else {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        setViewYear(initialYear);
        setViewMonthIdx(initialMonthIdx);
        // Default to today if no date selected yet
        setTempSelectedDate(`${yyyy}-${mm}-${dd}`);
      }
      setShowYearPicker(false);
    }
  }, [isOpen, selectedDate, initialYear, initialMonthIdx]);

  // Calendar calculations
  const daysInMonth = useMemo(() => {
    return new Date(viewYear, viewMonthIdx + 1, 0).getDate();
  }, [viewYear, viewMonthIdx]);

  const firstDayOfWeek = useMemo(() => {
    return new Date(viewYear, viewMonthIdx, 1).getDay(); // 0 = Sunday
  }, [viewYear, viewMonthIdx]);

  const handlePrevMonth = () => {
    haptics.impactLight();
    if (viewMonthIdx === 0) {
      setViewMonthIdx(11);
      setViewYear((prev) => prev - 1);
    } else {
      setViewMonthIdx((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    haptics.impactLight();
    if (viewMonthIdx === 11) {
      setViewMonthIdx(0);
      setViewYear((prev) => prev + 1);
    } else {
      setViewMonthIdx((prev) => prev + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    haptics.impactLight();
    const mm = String(viewMonthIdx + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const dateStr = `${viewYear}-${mm}-${dd}`;
    setTempSelectedDate(dateStr);
  };

  const handleSelectToday = () => {
    haptics.impactLight();
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    setViewYear(yyyy);
    setViewMonthIdx(today.getMonth());
    setTempSelectedDate(dateStr);
  };

  const handleApply = () => {
    haptics.notificationSuccess();
    onSelectDate(tempSelectedDate, viewYear, viewMonthIdx);
    onClose();
  };

  const handleReset = () => {
    haptics.impactMedium();
    setTempSelectedDate(null);
    onSelectDate(null, viewYear, viewMonthIdx);
    onClose();
  };

  // Generate years list (e.g., 2020 - 2030)
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const list: number[] = [];
    for (let y = currentYear - 6; y <= currentYear + 3; y++) {
      list.push(y);
    }
    return list;
  }, []);

  const todayStr = useMemo(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  // Format label for button
  const formattedSelectedLabel = useMemo(() => {
    if (!tempSelectedDate) return 'Tampilkan Semua';
    return formatDeviceDate(tempSelectedDate, { monthFormat: 'short' });
  }, [tempSelectedDate]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex flex-col justify-end select-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs"
            onClick={onClose}
          />

          {/* Bottom Sheet Modal */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.85 }}
            className="relative w-full max-w-lg mx-auto bg-[#FAF9F6] rounded-t-[32px] border-t border-stone-200/80 shadow-2xl overflow-hidden flex flex-col z-10 max-h-[92vh]"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
          >
            {/* Top Drag Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-12 h-1.5 rounded-full bg-stone-300/90" />
            </div>

            {/* Header with Direct Action Buttons */}
            <div className="px-5 pt-1 pb-3 flex items-center justify-between border-b border-stone-200/60 bg-white/70">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#165a4c] flex items-center justify-center border border-emerald-200/60 shadow-2xs">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-stone-900">Pilih Tanggal</h3>
                  <p className="text-[11px] text-stone-500 font-medium">Linimasa Catatan</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectToday}
                  className="px-3 py-1 rounded-full text-xs font-bold text-[#165a4c] bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80 active:scale-95 transition-all cursor-pointer shadow-2xs"
                >
                  Hari Ini
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 active:scale-95 transition-all cursor-pointer"
                  aria-label="Tutup"
                >
                  <X className="w-5 h-5 stroke-[2.2]" />
                </button>
              </div>
            </div>

            {/* Month & Year Bar */}
            <div className="px-5 py-2.5 flex items-center justify-between bg-white border-b border-stone-200/60">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-full hover:bg-stone-100 active:scale-90 transition-all text-stone-600 cursor-pointer"
                aria-label="Bulan Sebelumnya"
              >
                <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
              </button>

              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-stone-900">
                  {MONTH_NAMES[viewMonthIdx]}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    haptics.impactLight();
                    setShowYearPicker(!showYearPicker);
                  }}
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                    showYearPicker
                      ? 'bg-[#165a4c] text-white border-[#165a4c]'
                      : 'bg-stone-100 hover:bg-stone-200/70 text-stone-700 border-stone-200 shadow-2xs'
                  }`}
                >
                  {viewYear}
                </button>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-full hover:bg-stone-100 active:scale-90 transition-all text-stone-600 cursor-pointer"
                aria-label="Bulan Berikutnya"
              >
                <ChevronRight className="w-5 h-5 stroke-[2.2]" />
              </button>
            </div>

            {/* Quick Year Picker Modal (if toggled) */}
            {showYearPicker && (
              <div className="px-5 py-3 bg-stone-50 border-b border-stone-200/80 animate-fade-in">
                <div className="text-[11px] font-bold text-stone-500 mb-2">Pilih Tahun:</div>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {availableYears.map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => {
                        haptics.impactLight();
                        setViewYear(yr);
                        setShowYearPicker(false);
                      }}
                      className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                        viewYear === yr
                          ? 'bg-[#165a4c] text-white border-[#165a4c] shadow-xs'
                          : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-200/80 shadow-2xs'
                      }`}
                    >
                      {yr}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Month Chips Carousel */}
            <div className="px-4 py-2 overflow-x-auto flex items-center gap-1.5 no-scrollbar bg-white/60 border-b border-stone-200/40">
              {SHORT_MONTHS.map((mName, idx) => {
                const isActive = viewMonthIdx === idx;
                return (
                  <button
                    key={mName}
                    type="button"
                    onClick={() => {
                      haptics.impactLight();
                      setViewMonthIdx(idx);
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-[#165a4c] text-white shadow-2xs scale-105'
                        : 'bg-stone-100 hover:bg-stone-200/80 text-stone-600'
                    }`}
                  >
                    {mName}
                  </button>
                );
              })}
            </div>

            {/* Calendar Weekday Names */}
            <div className="px-5 pt-3">
              <div className="grid grid-cols-7 gap-1 text-center mb-1">
                {WEEKDAY_NAMES.map((w, idx) => (
                  <span
                    key={w}
                    className={`text-[11px] font-bold ${
                      idx === 0 ? 'text-rose-500' : 'text-stone-400'
                    }`}
                  >
                    {w}
                  </span>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1 text-center py-1">
                {/* Empty leading slots */}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-9 w-full" />
                ))}

                {/* Month Days */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const mm = String(viewMonthIdx + 1).padStart(2, '0');
                  const dd = String(day).padStart(2, '0');
                  const dateStr = `${viewYear}-${mm}-${dd}`;
                  const isSelected = tempSelectedDate === dateStr;
                  const isToday = todayStr === dateStr;
                  const hasRecord = recordDateSet.has(dateStr);

                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleSelectDay(day)}
                      className={`h-9 w-full rounded-xl flex flex-col items-center justify-center relative transition-all cursor-pointer select-none active:scale-90 ${
                        isSelected
                          ? 'bg-[#165a4c] text-white font-black shadow-md ring-2 ring-[#165a4c]/30'
                          : isToday
                          ? 'bg-emerald-50 text-[#165a4c] font-bold border border-emerald-300 shadow-2xs'
                          : 'hover:bg-white text-stone-700 font-medium'
                      }`}
                    >
                      <span className="text-xs">{day}</span>
                      {hasRecord && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full -mt-0.5 ${
                            isSelected ? 'bg-amber-300' : 'bg-emerald-500 animate-pulse'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Compact Action Bar */}
            <div className="px-4 py-2.5 bg-white border-t border-stone-200/70 flex items-center gap-2 mt-1 z-20">
              <button
                type="button"
                onClick={handleReset}
                className="py-2 px-3 rounded-full border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-600 text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer shadow-2xs"
                title="Tampilkan semua data linimasa"
              >
                <RotateCcw className="w-3 h-3 text-stone-400" />
                <span>Semua</span>
              </button>

              <button
                type="button"
                onClick={handleApply}
                className="flex-1 py-2 px-4 rounded-full bg-[#165a4c] hover:bg-[#124b3f] active:scale-98 text-white text-xs font-bold shadow-xs shadow-emerald-950/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Pilih {tempSelectedDate ? formattedSelectedLabel : 'Tanggal'} (OK)</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
