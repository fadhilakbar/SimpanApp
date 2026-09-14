import React, { useState } from 'react';
import {
  Camera,
  Image as ImageIcon,
  FileText,
  PenLine,
  Mic,
  Search,
  SlidersHorizontal,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import { haptics } from '../../utils/haptics';

export interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const handleNext = () => {
    haptics.impactMedium();
    if (currentSlide < 2) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      onFinish();
    }
  };

  const handleBack = () => {
    haptics.impactLight();
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (diff > 45) {
      // Swiped left -> next
      handleNext();
    } else if (diff < -45) {
      // Swiped right -> prev
      handleBack();
    }
    setTouchStartX(null);
  };

  return (
    <div className="fixed inset-0 z-[110] bg-[#FAF9F6] text-stone-900 select-none flex flex-col justify-between overflow-hidden">
      {/* Subtle background aesthetic blobs */}
      <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-emerald-100/40 blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-24 w-80 h-80 rounded-full bg-emerald-50/60 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 left-1/4 w-80 h-80 rounded-full bg-teal-50/50 blur-3xl pointer-events-none" />

      {/* Top Safe Area */}
      <div
        className="w-full relative z-10"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 24px)' }}
      />

      {/* Main Slide Carousel Area with Touch Swipe Support */}
      <div
        className="flex-1 min-h-0 flex flex-col items-center justify-center px-6 relative z-10 max-w-md mx-auto w-full touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* SLIDE 1: WELCOME & LOGO */}
        {currentSlide === 0 && (
          <div className="w-full flex flex-col items-center text-center animate-fade-in">
            {/* 3D App Logo */}
            <div className="w-24 h-24 mb-4 drop-shadow-md transition-transform duration-500 hover:scale-105">
              <img
                src="/simpan-logo.png"
                alt="Logo SIMPAN"
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>

            <h1 className="text-3xl font-black tracking-tight text-[#16302B] uppercase">
              SIMPAN
            </h1>
            <p className="text-stone-500 font-medium text-sm mt-1.5 leading-snug">
              Simpan hari ini.<br />Temukan kapan saja.
            </p>

            {/* 3D Container Illustration with Floating Papers */}
            <div className="relative my-6 w-full max-w-[320px] h-64 flex items-center justify-center">
              {/* Decorative Mint Box & Documents */}
              <div className="relative w-64 h-48 bg-gradient-to-br from-emerald-100/90 to-teal-100/70 rounded-3xl border border-emerald-200/60 shadow-lg shadow-emerald-900/5 flex flex-col justify-end p-4 overflow-visible">
                
                {/* Document Stacks emerging from box */}
                {/* 1. Struk */}
                <div className="absolute -top-8 left-4 w-28 bg-white rounded-xl shadow-md border border-stone-200/70 p-2.5 -rotate-6 transform transition-transform hover:-translate-y-1">
                  <div className="text-[10px] font-bold text-stone-800 tracking-wider">STRUK</div>
                  <div className="h-0.5 w-8 bg-stone-200 my-1" />
                  <div className="space-y-1 text-[8px] text-stone-400 font-mono">
                    <div className="flex justify-between"><span>Minimarket</span><span>487k</span></div>
                    <div className="flex justify-between"><span>Total</span><span>487k</span></div>
                  </div>
                </div>

                {/* 2. Photo / Image card */}
                <div className="absolute -top-12 left-24 w-28 h-32 bg-gradient-to-b from-sky-400 to-indigo-500 rounded-xl shadow-lg border-2 border-white p-1.5 rotate-3 transform transition-transform hover:-translate-y-1 overflow-hidden">
                  <div className="w-full h-full bg-sky-300/40 rounded-lg relative flex items-end justify-center">
                    <div className="w-16 h-12 bg-indigo-700/60 rounded-full translate-y-3 -translate-x-4 blur-xs" />
                    <div className="w-20 h-16 bg-indigo-900/60 rounded-full translate-y-4 translate-x-3 blur-xs" />
                    <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-amber-200" />
                  </div>
                </div>

                {/* 3. Catatan Note card */}
                <div className="absolute -top-4 right-2 w-28 bg-amber-50 rounded-xl shadow-md border border-amber-200/80 p-2.5 rotate-12 transform transition-transform hover:-translate-y-1">
                  <div className="text-[10px] font-bold text-amber-900">CATATAN</div>
                  <div className="text-[8px] text-amber-700/80 mt-1 italic leading-tight">
                    Ide aplikasi hari ini! ♡
                  </div>
                </div>

                {/* Sprouting Green Leaves */}
                <div className="absolute -left-2 bottom-12 flex items-center gap-1 transform -rotate-12 pointer-events-none">
                  <div className="w-6 h-10 bg-emerald-500 rounded-full rounded-tr-none rotate-45 shadow-sm" />
                  <div className="w-5 h-8 bg-teal-600 rounded-full rounded-tl-none -rotate-12 shadow-sm" />
                </div>

                {/* Box front highlight */}
                <div className="w-full bg-white/40 backdrop-blur-xs rounded-xl py-2 px-3 flex items-center justify-between border border-white/60">
                  <span className="text-[10px] font-semibold text-emerald-900">Arsip Terlindungi</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                </div>
              </div>

              {/* Hand-drawn Green Script Annotation */}
              <div className="absolute -bottom-3 right-0 transform translate-x-2 rotate-2 text-emerald-800 font-medium text-xs font-serif italic bg-emerald-50/90 px-3 py-1 rounded-full border border-emerald-300/60 shadow-xs">
                Semua yang berarti, di satu tempat. 🌿
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 2: SIMPAN DENGAN CARA ANDA */}
        {currentSlide === 1 && (
          <div className="w-full flex flex-col items-center text-center animate-fade-in">
            <h2 className="text-2xl font-bold tracking-tight text-stone-900">
              Simpan dengan Cara Anda
            </h2>
            <p className="text-stone-500 text-xs sm:text-sm mt-1.5 max-w-xs leading-relaxed">
              Foto, struk, dokumen, catatan, rekaman suara — apa pun bisa disimpan.
            </p>

            {/* Scanner Mockup + Floating Action Pills */}
            <div className="relative my-6 w-full max-w-[340px] h-72 flex items-center justify-center">
              {/* Dark Scanner Mockup */}
              <div className="w-48 h-64 bg-stone-900 rounded-2xl shadow-xl p-2.5 flex flex-col justify-between border border-stone-700 relative overflow-hidden -rotate-2">
                {/* Scanner Target Frame */}
                <div className="relative flex-1 bg-stone-800/80 rounded-xl p-2 flex flex-col items-center justify-center border border-dashed border-emerald-400/60">
                  {/* Scanned Receipt Simulation */}
                  <div className="w-32 bg-white text-stone-800 rounded p-2 text-left font-mono text-[7px] leading-tight shadow-sm">
                    <div className="font-bold text-center border-b border-stone-300 pb-1 mb-1">
                      MINIMARKET NUSANTARA
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex justify-between"><span>Beras 5kg</span><span>72.500</span></div>
                      <div className="flex justify-between"><span>Minyak Goreng</span><span>34.000</span></div>
                      <div className="flex justify-between"><span>Telur</span><span>28.500</span></div>
                      <div className="flex justify-between"><span>Susu UHT</span><span>24.900</span></div>
                    </div>
                    <div className="border-t border-stone-300 mt-1 pt-0.5 font-bold flex justify-between">
                      <span>TOTAL</span><span>159.900</span>
                    </div>
                  </div>

                  {/* Corner brackets */}
                  <div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-emerald-400" />
                  <div className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-emerald-400" />
                  <div className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-emerald-400" />
                  <div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-emerald-400" />
                </div>

                {/* Shutter Bar */}
                <div className="pt-2 flex items-center justify-around text-[8px] text-stone-400 font-medium">
                  <span>FOTO</span>
                  <span className="text-amber-400 font-bold">PINDAI</span>
                  <span>DOKUMEN</span>
                </div>
              </div>

              {/* Floating Action Badges on the right */}
              <div className="absolute right-0 top-3 flex flex-col gap-2 transform translate-x-1">
                <div className="bg-white/95 backdrop-blur-md rounded-xl py-1.5 px-3 shadow-md border border-stone-200/80 flex items-center gap-2 text-xs font-semibold text-stone-800">
                  <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Camera className="w-3.5 h-3.5" />
                  </div>
                  <span>Kamera</span>
                </div>

                <div className="bg-white/95 backdrop-blur-md rounded-xl py-1.5 px-3 shadow-md border border-stone-200/80 flex items-center gap-2 text-xs font-semibold text-stone-800">
                  <div className="w-6 h-6 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                    <ImageIcon className="w-3.5 h-3.5" />
                  </div>
                  <span>Galeri</span>
                </div>

                <div className="bg-white/95 backdrop-blur-md rounded-xl py-1.5 px-3 shadow-md border border-stone-200/80 flex items-center gap-2 text-xs font-semibold text-stone-800">
                  <div className="w-6 h-6 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <span>PDF / File</span>
                </div>

                <div className="bg-white/95 backdrop-blur-md rounded-xl py-1.5 px-3 shadow-md border border-stone-200/80 flex items-center gap-2 text-xs font-semibold text-stone-800">
                  <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                    <PenLine className="w-3.5 h-3.5" />
                  </div>
                  <span>Catatan</span>
                </div>

                <div className="bg-white/95 backdrop-blur-md rounded-xl py-1.5 px-3 shadow-md border border-stone-200/80 flex items-center gap-2 text-xs font-semibold text-stone-800">
                  <div className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                    <Mic className="w-3.5 h-3.5" />
                  </div>
                  <span>Rekam Suara</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 3: TEMUKAN KAPAN SAJA */}
        {currentSlide === 2 && (
          <div className="w-full flex flex-col items-center text-center animate-fade-in">
            <h2 className="text-2xl font-bold tracking-tight text-stone-900">
              Temukan Kapan Saja
            </h2>
            <p className="text-stone-500 text-xs sm:text-sm mt-1.5 max-w-xs leading-relaxed">
              Cari, lihat, dan kelola semua yang pernah Anda simpan. Cepat dan mudah.
            </p>

            {/* Search Mockup Card */}
            <div className="relative my-6 w-full max-w-[320px] h-72 flex items-center justify-center">
              <div className="w-full bg-white rounded-2xl shadow-xl border border-stone-200/90 p-4 text-left space-y-2.5">
                {/* Search Bar Input Mockup */}
                <div className="w-full bg-stone-50 rounded-xl py-2 px-3 flex items-center gap-2 border border-stone-200 text-stone-400 text-xs">
                  <Search className="w-3.5 h-3.5" />
                  <span className="flex-1 truncate text-stone-600 font-medium">Cari struk, dokumen, catatan...</span>
                  <SlidersHorizontal className="w-3 h-3 text-stone-400" />
                </div>

                {/* List Items */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-stone-50/70 border border-stone-100">
                    <div>
                      <div className="text-xs font-bold text-stone-900">Minimarket Berkah</div>
                      <div className="text-[10px] text-stone-500">13 Sep 2026 · Rp 487.500</div>
                    </div>
                    <span className="text-[9px] font-semibold bg-rose-50 text-rose-600 px-2 py-0.5 rounded-md border border-rose-200/50">
                      Struk
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-stone-50/70 border border-stone-100">
                    <div>
                      <div className="text-xs font-bold text-stone-900">Meeting Notes</div>
                      <div className="text-[10px] text-stone-500">12 Sep 2026</div>
                    </div>
                    <span className="text-[9px] font-semibold bg-sky-50 text-sky-600 px-2 py-0.5 rounded-md border border-sky-200/50">
                      Catatan
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-stone-50/70 border border-stone-100">
                    <div>
                      <div className="text-xs font-bold text-stone-900">Kontrak Kerja.pdf</div>
                      <div className="text-[10px] text-stone-500">11 Sep 2026</div>
                    </div>
                    <span className="text-[9px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200/50">
                      Dokumen
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-stone-50/70 border border-stone-100">
                    <div>
                      <div className="text-xs font-bold text-stone-900">Ide Aplikasi</div>
                      <div className="text-[10px] text-stone-500">10 Sep 2026</div>
                    </div>
                    <span className="text-[9px] font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md border border-amber-200/50">
                      Catatan
                    </span>
                  </div>
                </div>
              </div>

              {/* Hand-drawn Green Annotation */}
              <div className="absolute -top-3 -right-2 transform rotate-3 text-emerald-800 font-medium text-[11px] font-serif italic bg-emerald-50/95 px-2.5 py-1 rounded-full border border-emerald-300/70 shadow-sm">
                Yang penting, selalu bisa ditemukan. 🌿
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls Area */}
      <div
        className="w-full max-w-md mx-auto px-6 pb-8 relative z-10 flex flex-col items-center"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 24px)' }}
      >
        {/* Dynamic 3 Dots Pagination with Generous Touch Target */}
        <div className="flex items-center gap-1 mb-4">
          {[0, 1, 2].map((idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                haptics.impactLight();
                setCurrentSlide(idx);
              }}
              aria-label={`Ke slide ${idx + 1}`}
              className="p-3.5 flex items-center justify-center cursor-pointer touch-manipulation active:scale-90 transition-transform"
            >
              <span
                className={`h-2 rounded-full transition-all duration-300 pointer-events-none block ${
                  currentSlide === idx
                    ? 'w-7 bg-[#165a4c]'
                    : 'w-2.5 bg-stone-300 hover:bg-stone-400'
                }`}
              />
            </button>
          ))}
        </div>

        {/* Footer Actions Based on Slide */}
        {currentSlide === 0 && (
          <div className="w-full flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={handleNext}
              className="w-full py-4 px-6 rounded-full bg-[#165a4c] hover:bg-[#134e48] active:scale-[0.98] text-white font-bold text-base shadow-lg shadow-[#165a4c]/20 transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
            >
              <span>Mulai</span>
            </button>
            <div className="text-center space-y-0.5">
              <p className="text-[11px] text-stone-400 font-medium">
                Tanpa akun. Tanpa cloud. Hanya milik Anda.
              </p>
              <p className="text-[10px] text-stone-400/80 font-medium">
                Dikembangkan oleh <span className="text-[#165a4c] font-semibold">Nur Fadhillah Chaerul Akbar</span>
              </p>
            </div>
          </div>
        )}

        {currentSlide === 1 && (
          <div className="w-full flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                haptics.impactLight();
                onFinish();
              }}
              className="text-stone-500 hover:text-stone-800 font-medium text-sm py-2 px-3 active:scale-95 transition-all cursor-pointer touch-manipulation"
            >
              Lewati
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 text-[#165a4c] hover:text-[#134e48] font-bold text-sm py-2.5 px-4 rounded-full hover:bg-emerald-50/80 active:scale-95 transition-all cursor-pointer touch-manipulation"
            >
              <span>Selanjutnya</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {currentSlide === 2 && (
          <div className="w-full flex flex-col items-center gap-3">
            <div className="w-full flex items-center justify-between">
              <button
                type="button"
                onClick={handleBack}
                className="text-stone-500 hover:text-stone-800 font-medium text-sm py-2 px-3 flex items-center gap-1 active:scale-95 transition-all cursor-pointer touch-manipulation"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  haptics.notificationSuccess();
                  onFinish();
                }}
                className="py-3 px-6 rounded-full bg-[#165a4c] hover:bg-[#134e48] active:scale-95 text-white font-bold text-sm shadow-md shadow-[#165a4c]/20 transition-all flex items-center gap-2 cursor-pointer touch-manipulation"
              >
                <span>Mulai Sekarang</span>
              </button>
            </div>
            <div className="text-center space-y-0.5">
              <p className="text-[11px] text-stone-400 font-medium">
                Simpan hari ini. Temukan kapan saja.
              </p>
              <p className="text-[10px] text-stone-400/80 font-medium">
                Dikembangkan oleh <span className="text-[#165a4c] font-semibold">Nur Fadhillah Chaerul Akbar</span>
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
