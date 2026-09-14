import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ScanFace,
  Lock,
  Zap,
  ChevronLeft,
  Delete,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  verifyPin,
  authenticateWithBiometrics,
  isBiometricsAvailable,
  getSecuritySettings,
} from '../../services/authService';
import { haptics } from '../../utils/haptics';

export interface LockScreenProps {
  onUnlocked: () => void;
}

const KEYPAD_BUTTONS = [
  { num: '1', letters: '' },
  { num: '2', letters: 'ABC' },
  { num: '3', letters: 'DEF' },
  { num: '4', letters: 'GHI' },
  { num: '5', letters: 'JKL' },
  { num: '6', letters: 'MNO' },
  { num: '7', letters: 'PQRS' },
  { num: '8', letters: 'TUV' },
  { num: '9', letters: 'WXYZ' },
];

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlocked }) => {
  const [hasBiometrics, setHasBiometrics] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'faceid' | 'pin'>('pin');
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isAuthenticatingBio, setIsAuthenticatingBio] = useState(false);
  const [shakeError, setShakeError] = useState(false);

  const triggerFaceId = async () => {
    haptics.impactMedium();
    setIsAuthenticatingBio(true);
    setError('');
    const success = await authenticateWithBiometrics('Buka kunci SIMPAN');
    setIsAuthenticatingBio(false);
    if (success) {
      haptics.notificationSuccess();
      onUnlocked();
    } else {
      haptics.notificationWarning();
      setError('Biometrik tidak cocok atau dibatalkan. Masukkan PIN.');
      setAuthMode('pin');
    }
  };

  useEffect(() => {
    const checkBio = async () => {
      try {
        const available = await isBiometricsAvailable();
        const settings = getSecuritySettings();
        if (available && settings.useFaceId) {
          setHasBiometrics(true);
        } else {
          setHasBiometrics(false);
        }
      } catch {
        setHasBiometrics(false);
      }
      // Jangan otomatis trigger Face ID, selalu siapkan PIN mode
      setAuthMode('pin');
    };
    checkBio();
  }, []);

  const handleKeyPress = (digit: string) => {
    if (pin.length < 6) {
      haptics.impactLight();
      const nextPin = pin + digit;
      setPin(nextPin);
      setError('');

      if (nextPin.length === 6) {
        if (verifyPin(nextPin)) {
          haptics.notificationSuccess();
          onUnlocked();
        } else {
          haptics.notificationWarning();
          setError('PIN tidak tepat. Silakan coba lagi.');
          setShakeError(true);
          setTimeout(() => setShakeError(false), 500);
          setTimeout(() => setPin(''), 400);
        }
      }
    }
  };

  const handleDelete = () => {
    haptics.impactMedium();
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  return (
    <div
      className="fixed inset-0 z-[9999] w-full h-full bg-[#FAF9F6] text-stone-900 flex flex-col justify-between select-none overflow-hidden touch-none overscroll-none px-6 py-6 sm:py-8"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        touchAction: 'none',
        overscrollBehavior: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
    >
      {/* Ambient Decorative Glows (Pure light tints without dark transparency) */}
      <div className="absolute -top-16 -left-16 w-80 h-80 rounded-full bg-emerald-100/60 blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-16 w-80 h-80 rounded-full bg-teal-100/50 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 left-1/4 w-80 h-80 rounded-full bg-emerald-100/40 blur-3xl pointer-events-none" />

      {/* Top Bar */}
      <div
        className="w-full relative z-10 flex items-center justify-between text-xs font-semibold"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 10px)' }}
      >
        <div className="w-20" />

        {/* Status Lock Pill */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-emerald-800/15 shadow-2xs backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <Lock className="w-3.5 h-3.5 text-[#165a4c]" />
          <span className="text-[11px] font-bold text-[#165a4c] tracking-tight">Terkunci Aman</span>
        </div>

        <div className="w-20 flex justify-end">
          {hasBiometrics ? (
            <button
              type="button"
              onClick={triggerFaceId}
              disabled={isAuthenticatingBio}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-[#165a4c] font-bold text-xs border border-emerald-200/70 shadow-2xs active:scale-95 transition-all cursor-pointer"
              title="Gunakan Face ID / Sidik Jari"
            >
              <ScanFace className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>Face ID</span>
            </button>
          ) : (
            <div className="w-6 h-6" />
          )}
        </div>
      </div>

      {/* MODE 1: FACE ID & BIOMETRIC VERIFICATION */}
      {authMode === 'faceid' && hasBiometrics && (
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full my-4">
          <div className="mb-2 flex flex-col items-center">
            <img
              src="/logo.png"
              alt="SIMPAN"
              className="h-20 sm:h-24 w-auto object-contain drop-shadow-sm"
            />
          </div>
          <p className="text-xs text-stone-500 font-medium mb-6 text-center">
            Akses privat & terlindungi di perangkat Anda
          </p>

          {/* Frosted Security Assurance Cards */}
          <div className="w-full space-y-2.5 mb-6">
            <div className="flex items-center gap-3 p-3.5 bg-white/95 backdrop-blur-md rounded-2xl border border-stone-200/80 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-stone-900">Privat di Perangkat</h4>
                <p className="text-[11px] text-stone-500">Data tidak diunggah ke internet atau cloud.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 bg-white/95 backdrop-blur-md rounded-2xl border border-stone-200/80 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-stone-900">Enkripsi Lokal</h4>
                <p className="text-[11px] text-stone-500">Dijaga biometrik Face ID / Touch ID perangkat.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 bg-white/95 backdrop-blur-md rounded-2xl border border-stone-200/80 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 shadow-2xs">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-stone-900">Buka Cepat & Mulus</h4>
                <p className="text-[11px] text-stone-500">Satu sentuhan untuk membuka data Anda.</p>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-xs text-rose-600 font-semibold mb-3">
              {error}
            </p>
          )}

          {/* Action Buttons */}
          <div className="w-full space-y-3">
            <button
              type="button"
              onClick={triggerFaceId}
              disabled={isAuthenticatingBio}
              className="w-full py-3.5 px-6 rounded-full bg-gradient-to-r from-[#124b3f] to-[#165a4c] hover:from-[#0e3b31] hover:to-[#124b3f] active:scale-98 text-white font-bold text-sm shadow-md shadow-emerald-950/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ScanFace className="w-5 h-5" />
              <span>{isAuthenticatingBio ? 'Memverifikasi...' : 'Buka dengan Face ID'}</span>
            </button>

            <button
              type="button"
              onClick={() => setAuthMode('pin')}
              className="w-full py-2.5 text-stone-600 font-bold text-xs hover:text-stone-900 active:scale-95 transition-all text-center cursor-pointer"
            >
              Gunakan PIN 6-Digit
            </button>
          </div>
        </div>
      )}

      {/* MODE 2: 6-DIGIT PIN ENTRY SCREEN (Sleek, Clean & Luxurious) */}
      {authMode === 'pin' && (
        <div className="relative z-10 flex-1 flex flex-col items-center justify-between max-w-xs mx-auto w-full my-auto py-2">
          {/* Header Info */}
          <div className="flex flex-col items-center text-center">
            {/* Logo */}
            <div className="mb-2 flex flex-col items-center">
              <img
                src="/logo.png"
                alt="SIMPAN"
                className="h-16 sm:h-20 w-auto object-contain drop-shadow-sm"
              />
            </div>

            <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-stone-900 mt-1">
              Masukkan PIN Akses
            </h2>
            <p className="text-xs text-stone-500 mt-1 max-w-[240px] leading-relaxed">
              Untuk membuka seluruh catatan pribadi Anda
            </p>

            {/* 6 PIN Indicator Beads */}
            <motion.div
              animate={shakeError ? { x: [-10, 10, -8, 8, -4, 4, 0] } : {}}
              transition={{ duration: 0.4 }}
              className="flex items-center justify-center gap-3.5 my-6"
            >
              {[0, 1, 2, 3, 4, 5].map((idx) => {
                const isFilled = idx < pin.length;
                return (
                  <motion.div
                    key={idx}
                    initial={false}
                    animate={isFilled ? { scale: [1, 1.25, 1.1] } : { scale: 1 }}
                    transition={{ duration: 0.18 }}
                    className={`w-3.5 h-3.5 rounded-full transition-colors duration-200 ${
                      isFilled
                        ? 'bg-[#165a4c] shadow-xs shadow-emerald-900/30 ring-4 ring-emerald-500/20'
                        : 'border-2 border-stone-300 bg-white/90 shadow-2xs'
                    }`}
                  />
                );
              })}
            </motion.div>

            {error ? (
              <p className="text-xs text-rose-600 font-semibold -mt-3 mb-2 animate-bounce">
                {error}
              </p>
            ) : (
              <div className="h-4 -mt-3 mb-2" />
            )}
          </div>

          {/* Premium iOS Keypad */}
          <div className="w-full max-w-[280px] mx-auto">
            <div className="grid grid-cols-3 gap-y-3 gap-x-4 text-center justify-items-center">
              {KEYPAD_BUTTONS.map((k) => (
                <button
                  key={k.num}
                  type="button"
                  onClick={() => handleKeyPress(k.num)}
                  className="w-16 h-16 sm:w-[68px] sm:h-[68px] rounded-full bg-white hover:bg-stone-50 active:bg-[#165a4c] active:text-white border border-stone-200/90 shadow-2xs active:scale-92 transition-all flex flex-col items-center justify-center cursor-pointer group select-none"
                >
                  <span className="text-2xl font-bold text-stone-800 group-active:text-white leading-none">
                    {k.num}
                  </span>
                  {k.letters ? (
                    <span className="text-[9px] font-semibold text-stone-400 group-active:text-emerald-100 tracking-wider mt-0.5">
                      {k.letters}
                    </span>
                  ) : (
                    <span className="h-1.5" />
                  )}
                </button>
              ))}

              {/* Bottom Keypad Row: FaceID / Empty, 0, Backspace */}
              {hasBiometrics ? (
                <button
                  type="button"
                  onClick={triggerFaceId}
                  className="w-16 h-16 sm:w-[68px] sm:h-[68px] rounded-full bg-emerald-50/70 hover:bg-emerald-100/70 active:scale-90 transition-all flex items-center justify-center text-[#165a4c] cursor-pointer border border-emerald-200/60 shadow-2xs"
                  title="Gunakan Face ID"
                >
                  <ScanFace className="w-6 h-6 stroke-[2.2]" />
                </button>
              ) : (
                <div className="w-16 h-16 sm:w-[68px] sm:h-[68px]" />
              )}

              <button
                type="button"
                onClick={() => handleKeyPress('0')}
                className="w-16 h-16 sm:w-[68px] sm:h-[68px] rounded-full bg-white hover:bg-stone-50 active:bg-[#165a4c] active:text-white border border-stone-200/90 shadow-2xs active:scale-92 transition-all flex flex-col items-center justify-center cursor-pointer group select-none"
              >
                <span className="text-2xl font-bold text-stone-800 group-active:text-white leading-none">
                  0
                </span>
                <span className="h-1.5" />
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className="w-16 h-16 sm:w-[68px] sm:h-[68px] rounded-full hover:bg-stone-100 active:scale-90 transition-all flex items-center justify-center text-stone-600 hover:text-stone-900 cursor-pointer"
                aria-label="Hapus Digit"
              >
                <Delete className="w-6 h-6 stroke-[2]" />
              </button>
            </div>
          </div>

          {/* Bottom Security Capsule */}
          <div className="w-full mt-6 px-3.5 py-2.5 bg-white border border-stone-200/80 rounded-2xl flex items-center justify-center gap-2 text-center shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-[#165a4c]" />
            <span className="text-[11px] font-bold text-stone-700">
              100% Offline & Terenkripsi di Perangkat
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
