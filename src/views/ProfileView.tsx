import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Lock,
  Download,
  Upload,
  ShieldCheck,
  KeyRound,
  Camera,
  Image as ImageIcon,
  Trash2,
  HardDrive,
  RotateCcw,
  Mail,
  Check,
  ChevronRight,
  Sparkles,
  Smartphone,
  User,
  Info,
  Eye,
  EyeOff,
  Cloud,
  Crown,
  FolderCheck,
} from 'lucide-react';
import { useToast } from '../components/ui';
import { BrandHeader } from '../components/ui/BrandHeader';
import { BrandAvatar } from '../components/ui/BrandAvatar';
import {
  getUserProfile,
  setUserProfile,
  useUserProfile,
  getSecuritySettings,
  setSecurityLock,
  isBiometricsAvailable,
  authenticateWithBiometrics,
  SecuritySettings,
  UserProfile,
} from '../services/authService';
import { exportDatabaseBackup, importDatabaseBackup } from '../services/db';
import { compressAvatar } from '../utils/imageCompressor';
import { haptics } from '../utils/haptics';
import { saveOrShareTextFile } from '../utils/fileExport';
import { encryptData, decryptData } from '../services/cryptoService';
import { showPrompt, SimpanSwal } from '../utils/swal';
import { ArchiveRecord } from '../types/record';
import { copyToClipboard } from '../utils/clipboard';
import { useSwipeBack } from '../utils/useSwipeBack';

export interface ProfileViewProps {
  records: ArchiveRecord[];
  onClose?: () => void;
  onShowOnboarding?: () => void;
  onDataRestored?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  records: _records,
  onClose,
  onShowOnboarding,
  onDataRestored,
}) => {
  const toast = useToast();
  const { profile } = useUserProfile();
  const swipeRef = useSwipeBack<HTMLDivElement>({ onBack: onClose });
  const [securitySettings, setLocalSecuritySettings] = useState<SecuritySettings>(
    getSecuritySettings()
  );
  const [isEditingPin, setIsEditingPin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [showPinText, setShowPinText] = useState(false);
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [isProcessingAvatar, setIsProcessingAvatar] = useState(false);

  // Storage Stats
  const [storageUsage, setStorageUsage] = useState({
    usageMB: '0.0',
    quotaGB: '38',
    percentage: 0,
  });

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    isBiometricsAvailable().then(setHasBiometrics);

    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((estimate) => {
        if (estimate.usage) {
          const mb = (estimate.usage / (1024 * 1024)).toFixed(1);
          const totalQuota = estimate.quota
            ? (estimate.quota / (1024 * 1024 * 1024)).toFixed(0)
            : '38';
          const pct = estimate.quota
            ? Math.min(100, Math.round((estimate.usage / estimate.quota) * 100))
            : 1;
          setStorageUsage({
            usageMB: mb,
            quotaGB: totalQuota,
            percentage: Math.max(pct, 1),
          });
        }
      });
    }
  }, []);

  const handleSaveProfileName = (name: string) => {
    setUserProfile({ name });
  };

  const handleAvatarFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingAvatar(true);
      const compressedDataUrl = await compressAvatar(file);
      setUserProfile({ avatar: compressedDataUrl });
      haptics.notificationSuccess();
      toast.success('Foto profil berhasil dipasang!');
    } catch (err) {
      console.warn('Gagal memproses foto avatar:', err);
      toast.error('Gagal memproses foto.');
    } finally {
      setIsProcessingAvatar(false);
      e.target.value = '';
    }
  };

  const handleRemovePhoto = () => {
    haptics.impactLight();
    setUserProfile({ avatar: 'default' });
    toast.success('Foto profil dihapus.');
  };

  const handleToggleLock = () => {
    if (!securitySettings.hasPin && !securitySettings.isLockEnabled) {
      haptics.notificationWarning();
      toast.error('Silakan atur PIN 6-digit terlebih dahulu untuk mengaktifkan kunci.');
      setIsEditingPin(true);
      return;
    }
    haptics.impactLight();
    const nextState = !securitySettings.isLockEnabled;
    setSecurityLock(nextState, securitySettings.pin, securitySettings.useFaceId);
    setLocalSecuritySettings(getSecuritySettings());
    toast.success(
      nextState ? 'Kunci Aplikasi Diaktifkan.' : 'Kunci Aplikasi Dimatikan.'
    );
  };

  const handleToggleFaceId = async () => {
    haptics.impactLight();
    if (!securitySettings.useFaceId) {
      // Activating Face ID / Biometrics:
      // 1. Must have PIN configured first as fallback
      if (!securitySettings.hasPin) {
        haptics.notificationWarning();
        toast.error('Silakan atur PIN 6-digit terlebih dahulu sebelum mengaktifkan biometrik.');
        setIsEditingPin(true);
        return;
      }

      // 2. Check if hardware supports biometrics
      const available = await isBiometricsAvailable();
      if (!available) {
        haptics.notificationWarning();
        toast.error('Sensor biometrik tidak tersedia atau belum didaftarkan di pengaturan sistem perangkat.');
        return;
      }

      // 3. Prompt user for biometric authentication!
      toast.info('Silakan verifikasi biometrik Anda...');
      const verified = await authenticateWithBiometrics('Konfirmasi sensor biometrik untuk mengaktifkan fitur ini');
      if (!verified) {
        haptics.notificationWarning();
        toast.error('Verifikasi biometrik gagal atau dibatalkan.');
        return;
      }

      // 4. Success -> enable biometrics
      haptics.notificationSuccess();
      setSecurityLock(securitySettings.isLockEnabled, securitySettings.pin, true);
      setLocalSecuritySettings(getSecuritySettings());
      toast.success('Biometrik (Face ID / Sidik Jari) berhasil diaktifkan!');
    } else {
      // Deactivating
      setSecurityLock(securitySettings.isLockEnabled, securitySettings.pin, false);
      setLocalSecuritySettings(getSecuritySettings());
      toast.success('Biometrik dinonaktifkan.');
    }
  };

  const handleSavePin = () => {
    if (newPin.length !== 6 || !/^\d+$/.test(newPin)) {
      haptics.notificationWarning();
      toast.error('PIN harus berupa 6 digit angka.');
      return;
    }
    haptics.notificationSuccess();
    // Otomatis aktifkan kunci saat PIN berhasil disetel
    setSecurityLock(true, newPin, securitySettings.useFaceId);
    setLocalSecuritySettings(getSecuritySettings());
    setIsEditingPin(false);
    setNewPin('');
    toast.success('PIN 6-digit berhasil disimpan dan Kunci Aplikasi aktif!');
  };

  const handleExportBackup = async () => {
    try {
      haptics.impactMedium();
      toast.info('Menyiapkan cadangan aman...');
      const data = await exportDatabaseBackup();

      let exportPayload = JSON.stringify(data, null, 2);
      let filenameSuffix = 'plaintext';

      if (securitySettings.isLockEnabled && securitySettings.pin) {
        const encrypted = await encryptData(exportPayload, securitySettings.pin);
        exportPayload = JSON.stringify({
          encrypted: true,
          algorithm: 'AES-GCM-256',
          exportedAt: new Date().toISOString(),
          recordCount: data.recordCount,
          data: encrypted,
        });
        filenameSuffix = 'terenkripsi';
      }

      const filename = `simpan-backup-${filenameSuffix}-${new Date().toISOString().slice(0, 10)}.simpan`;
      await saveOrShareTextFile(filename, exportPayload, 'application/json');

      haptics.notificationSuccess();
      toast.success('Berkas cadangan berhasil diekspor!');
    } catch {
      haptics.notificationWarning();
      toast.error('Gagal mengekspor data.');
    }
  };

  const handleImportFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        let parsed = JSON.parse(text);

        if (parsed && parsed.encrypted && parsed.data) {
          const pin = await showPrompt({
            title: 'Cadangan Terenkripsi',
            text: 'Masukkan PIN 6-digit keamanan arsip untuk membuka berkas cadangan ini:',
            inputType: 'password',
            placeholder: 'PIN 6-digit...',
            confirmText: 'Buka Cadangan',
          });
          if (!pin) {
            toast.error('Impor dibatalkan: PIN dibutuhkan.');
            return;
          }
          const decryptedText = await decryptData(parsed.data, pin);
          parsed = JSON.parse(decryptedText);
        }

        const count = await importDatabaseBackup(parsed);
        haptics.notificationSuccess();
        toast.success(`${count} arsip berhasil dipulihkan!`);
        if (onDataRestored) onDataRestored();
        if (onClose) onClose();
      } catch {
        haptics.notificationWarning();
        toast.error('Berkas .simpan tidak valid atau salah PIN.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleFeedbackClick = async () => {
    haptics.impactLight();
    const developerEmail = 'fadhilakbar93@icloud.com';

    const result = await SimpanSwal.fire({
      title: 'Kirim Masukan & Saran',
      html: `
        <div class="text-left space-y-2.5 pt-1 text-xs text-stone-600">
          <p class="leading-relaxed">Punya saran, kendala, atau ide fitur baru untuk aplikasi SIMPAN?</p>
          <div class="p-3 bg-stone-100 rounded-2xl border border-stone-200/80 flex items-center justify-between font-mono font-bold text-stone-800 text-xs select-all">
            <span class="truncate">${developerEmail}</span>
          </div>
          <p class="text-[11px] text-stone-400">Silakan hubungi pengembang langsung atau salin alamat email:</p>
        </div>
      `,
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'Buka Email',
      denyButtonText: 'Salin Alamat',
      cancelButtonText: 'Tutup',
      customClass: {
        popup: 'rounded-3xl bg-white border border-stone-200/90 shadow-2xl p-6 select-none font-sans max-w-[340px] sm:max-w-sm',
        title: 'text-stone-900 font-extrabold text-base tracking-tight pt-1',
        htmlContainer: 'text-stone-600 text-xs leading-relaxed mt-2',
        actions: 'flex items-center justify-center gap-2 mt-5 w-full',
        confirmButton: 'py-2.5 px-4 rounded-full bg-[#165a4c] hover:bg-[#134e48] text-white font-bold text-xs shadow-md active:scale-95 transition-all outline-none cursor-pointer',
        denyButton: 'py-2.5 px-4 rounded-full bg-stone-800 hover:bg-stone-900 text-white font-bold text-xs active:scale-95 transition-all outline-none cursor-pointer',
        cancelButton: 'py-2.5 px-4 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs active:scale-95 transition-all outline-none cursor-pointer border border-stone-200/70',
      },
    });

    if (result.isConfirmed) {
      try {
        window.location.href = `mailto:${developerEmail}?subject=Masukan%20Aplikasi%20SIMPAN`;
      } catch {
        await copyToClipboard(developerEmail);
        toast.info('Alamat email disalin ke papan klip.');
      }
    } else if (result.isDenied) {
      await copyToClipboard(developerEmail);
      haptics.notificationSuccess();
      toast.success('Alamat email berhasil disalin!');
    }
  };

  const isCustomAvatar =
    profile.avatar.startsWith('data:image') ||
    profile.avatar.startsWith('blob:') ||
    profile.avatar.startsWith('http');

  return (
    <div
      ref={swipeRef}
      className="h-full h-[100dvh] overflow-y-auto overscroll-y-contain bg-[#FAF9F6] pb-32 animate-fade-in select-none"
    >
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleAvatarFileChange}
        accept="image/*"
        capture="user"
        className="hidden"
      />
      <input
        type="file"
        ref={galleryInputRef}
        onChange={handleAvatarFileChange}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={backupInputRef}
        onChange={handleImportFileSelected}
        accept=".simpan,.json,application/json"
        className="hidden"
      />

      {/* Top BrandHeader Navigation */}
      <BrandHeader
        onBack={onClose}
        title="Profil & Pengaturan"
        rightElement={
          onClose ? (
            <button
              type="button"
              onClick={() => {
                haptics.impactLight();
                onClose();
              }}
              className="text-xs font-bold text-white bg-[#165a4c] hover:bg-[#134e48] px-4 py-1.5 rounded-full shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              Selesai
            </button>
          ) : null
        }
      />

      <div className="px-5 py-5 space-y-6 w-full max-w-2xl lg:max-w-3xl mx-auto">
        {/* HERO AVATAR & NAME CARD (Clean Apple ID Style) */}
        <div className="flex flex-col items-center text-center pt-2">
          <div className="relative mb-3">
            <BrandAvatar size="xl" avatarSrc={profile.avatar} />
            {isProcessingAvatar && (
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                haptics.impactLight();
                cameraInputRef.current?.click();
              }}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#165a4c] text-white shadow-md flex items-center justify-center border-2 border-[#FAF9F6] active:scale-90 transition-transform cursor-pointer"
              title="Ambil foto kamera"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Avatar Actions */}
          <div className="flex items-center gap-2 mb-3">
            <button
              type="button"
              onClick={() => {
                haptics.impactLight();
                cameraInputRef.current?.click();
              }}
              className="px-3 py-1 rounded-full bg-white border border-stone-200 text-stone-700 text-xs font-semibold shadow-2xs hover:bg-stone-50 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Camera className="w-3 h-3 text-[#165a4c]" />
              <span>Kamera</span>
            </button>

            <button
              type="button"
              onClick={() => {
                haptics.impactLight();
                galleryInputRef.current?.click();
              }}
              className="px-3 py-1 rounded-full bg-white border border-stone-200 text-stone-700 text-xs font-semibold shadow-2xs hover:bg-stone-50 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <ImageIcon className="w-3 h-3 text-sky-600" />
              <span>Galeri</span>
            </button>

            {isCustomAvatar && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200/60 text-rose-600 text-xs font-semibold hover:bg-rose-100 active:scale-95 transition-all cursor-pointer"
                title="Hapus foto profil"
              >
                Hapus
              </button>
            )}
          </div>

          {/* Editable Display Name */}
          <div className="w-full max-w-xs">
            <input
              type="text"
              value={profile.name}
              onChange={(e) => handleSaveProfileName(e.target.value)}
              placeholder="Nama Pengguna"
              className="w-full text-center text-lg font-extrabold text-stone-900 bg-transparent border-b border-transparent hover:border-stone-300 focus:border-[#165a4c] focus:bg-white/60 rounded-lg py-1 px-2 outline-none transition-all"
            />
            <p className="text-[11px] text-stone-400 font-medium mt-0.5">
              Ruang berkas pribadi & terlindungi
            </p>
          </div>
        </div>

        {/* SECTION 1: KEAMANAN & PRIVASI (iOS Grouped Inset) */}
        <div>
          <h3 className="text-[11px] font-bold text-stone-400 uppercase tracking-wider px-3 mb-1.5">
            Keamanan & Privasi
          </h3>
          <div className="bg-white rounded-2xl border border-stone-200/80 divide-y divide-stone-100 shadow-2xs overflow-hidden">
            {/* Row: Kunci Aplikasi */}
            <div className="px-4 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3 pr-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#165a4c] flex items-center justify-center border border-emerald-100/80 shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-900">
                    Kunci Aplikasi
                  </p>
                  <p className="text-[10px] text-stone-400">
                    {hasBiometrics
                      ? 'Minta Face ID / PIN saat membuka'
                      : 'Minta PIN 6-digit saat membuka'}
                  </p>
                </div>
              </div>

              {/* iOS Switch */}
              <button
                type="button"
                onClick={handleToggleLock}
                className={`w-12 h-7 rounded-full transition-colors duration-200 p-0.5 shrink-0 cursor-pointer ${securitySettings.isLockEnabled ? 'bg-[#165a4c]' : 'bg-stone-200'
                  }`}
              >
                <div
                  className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200 ${securitySettings.isLockEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
              </button>
            </div>

            {/* Row: Face ID Biometrik (if available) */}
            {hasBiometrics && (
              <div className="px-4 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3 pr-2">
                  <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100 shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-stone-900">
                      Face ID / Sidik Jari
                    </p>
                    <p className="text-[10px] text-stone-400">
                      Buka kunci instan dengan sensor perangkat
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleFaceId}
                  className={`w-12 h-7 rounded-full transition-colors duration-200 p-0.5 shrink-0 cursor-pointer ${securitySettings.useFaceId ? 'bg-[#165a4c]' : 'bg-stone-200'
                    }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200 ${securitySettings.useFaceId ? 'translate-x-5' : 'translate-x-0'
                      }`}
                  />
                </button>
              </div>
            )}

            {/* Row: PIN Keamanan (Selalu tampil agar user bisa set atau ubah PIN kapan saja) */}
            <div className="px-4 py-3.5 transition-all">
              {!isEditingPin ? (
                <div
                  onClick={() => {
                    haptics.impactLight();
                    setIsEditingPin(true);
                    setNewPin('');
                  }}
                  className="flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shrink-0">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-stone-900">PIN 6-Digit</p>
                      <p className="text-[10px] text-stone-400 font-mono">
                        {securitySettings.hasPin ? '•••••• (Aktif)' : 'Belum diatur'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-[#165a4c] group-hover:text-emerald-700 transition-colors">
                    <span>{securitySettings.hasPin ? 'Ganti' : 'Atur PIN'}</span>
                    <ChevronRight className="w-4 h-4 text-stone-400" />
                  </div>
                </div>
              ) : (
                <div className="py-1 space-y-3.5 animate-fade-in">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#165a4c] flex items-center justify-center border border-emerald-100 shrink-0">
                        <KeyRound className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-stone-900">Atur PIN Baru</p>
                        <p className="text-[10px] text-stone-400">Ketik 6 digit angka rahasia</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        haptics.impactLight();
                        setIsEditingPin(false);
                        setNewPin('');
                      }}
                      className="text-[11px] font-semibold text-stone-400 hover:text-stone-700 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>

                  {/* 6-Digit OTP Box Grid with Invisible Input */}
                  <div className="relative py-1">
                    <div className="flex items-center justify-center gap-2">
                      {[0, 1, 2, 3, 4, 5].map((index) => {
                        const digit = newPin[index];
                        const isFocused = newPin.length === index;
                        return (
                          <div
                            key={index}
                            className={`w-10 h-12 sm:w-11 sm:h-13 rounded-xl flex items-center justify-center font-bold text-base transition-all ${digit
                                ? 'bg-emerald-50/80 border-2 border-[#165a4c] text-[#165a4c] shadow-2xs scale-[1.02]'
                                : isFocused
                                  ? 'bg-white border-2 border-[#165a4c] ring-3 ring-emerald-500/15 shadow-xs'
                                  : 'bg-stone-50 border border-stone-200 text-stone-300'
                              }`}
                          >
                            {digit ? (
                              showPinText ? (
                                digit
                              ) : (
                                <span className="w-2.5 h-2.5 rounded-full bg-[#165a4c]" />
                              )
                            ) : isFocused ? (
                              <span className="w-0.5 h-4 bg-[#165a4c] animate-pulse rounded-full" />
                            ) : null}
                          </div>
                        );
                      })}
                    </div>

                    {/* Overlaid invisible numeric input capturing all taps */}
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={newPin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setNewPin(val);
                        haptics.impactLight();
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-transparent selection:bg-transparent"
                      autoFocus
                      aria-label="Input PIN 6 digit"
                    />
                  </div>

                  {/* Controls below digit boxes */}
                  <div className="flex items-center justify-between px-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        haptics.impactLight();
                        setShowPinText((prev) => !prev);
                      }}
                      className="inline-flex items-center gap-1.5 text-stone-500 hover:text-stone-800 transition-colors cursor-pointer py-0.5"
                    >
                      {showPinText ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5 text-stone-400" />
                          <span>Sembunyikan Angka</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5 text-stone-400" />
                          <span>Lihat Angka</span>
                        </>
                      )}
                    </button>

                    <span className="text-[10px] font-mono text-stone-400 font-semibold">
                      {newPin.length} / 6 Digit
                    </span>
                  </div>

                  {/* Save Button */}
                  <button
                    type="button"
                    disabled={newPin.length !== 6}
                    onClick={handleSavePin}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs ${newPin.length === 6
                        ? 'bg-[#165a4c] hover:bg-[#134e48] text-white active:scale-[0.98] shadow-emerald-900/10'
                        : 'bg-stone-100 text-stone-400 cursor-not-allowed border border-stone-200/50'
                      }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{newPin.length === 6 ? 'Simpan PIN Baru' : 'Masukkan 6 Digit Angka'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION: SIMPAN CLOUD BACKUP (FITUR PREMIUM) */}
        <div>
          <div className="flex items-center justify-between px-3 mb-1.5">
            <h3 className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
              Penyimpanan Cloud
            </h3>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[9px] font-black tracking-wide shadow-xs">
              <Crown className="w-2.5 h-2.5" />
              <span>PREMIUM</span>
            </span>
          </div>

          <div
            onClick={() => {
              haptics.impactLight();
              toast.info('Fitur Cloud Backup Premium akan segera hadir di pembaruan SIMPAN Pro!');
            }}
            className="group relative bg-gradient-to-br from-amber-50/70 via-emerald-50/40 to-teal-50/60 rounded-2xl border border-amber-200/80 p-4 shadow-xs hover:border-amber-300 transition-all cursor-pointer overflow-hidden"
          >
            {/* Ambient Background Glow */}
            <div className="absolute -right-8 -top-8 w-28 h-28 bg-amber-200/40 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-start justify-between gap-3 relative z-10 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-500/25 shrink-0">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-stone-900 flex items-center gap-1.5">
                    <span>SIMPAN Cloud Backup</span>
                    <span className="px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-900 text-[9px] font-extrabold">
                      PRO
                    </span>
                  </h4>
                  <p className="text-[11px] text-stone-600 line-clamp-1">
                    Cadangan otomatis terenkripsi & sinkronisasi multi-device
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-amber-700/60 shrink-0 mt-2 group-hover:translate-x-0.5 transition-transform" />
            </div>

            {/* Cloud Storage Usage Info */}
            <div className="bg-white/80 backdrop-blur-xs rounded-xl p-3 border border-amber-200/50 mb-3 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-stone-700">Kapasitas Cloud</span>
                <span className="font-bold text-amber-700">0 B / 15 GB Tersedia</span>
              </div>
              <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full w-0" />
              </div>
            </div>

            {/* Premium Feature Highlights */}
            <div className="grid grid-cols-2 gap-2 text-[10px] text-stone-600">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Enkripsi Zero-Knowledge</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span>Multi-Device Sync</span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: PENYIMPANAN LOKAL & CADANGAN */}
        <div>
          <h3 className="text-[11px] font-bold text-stone-400 uppercase tracking-wider px-3 mb-1.5">
            Penyimpanan Perangkat & Berkas
          </h3>
          <div className="bg-white rounded-2xl border border-stone-200/80 divide-y divide-stone-100 shadow-2xs overflow-hidden">
            {/* Storage usage meter row */}
            <div className="px-4 py-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100 shrink-0">
                    <HardDrive className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-stone-900">
                      Folder Dokumen SIMPAN
                    </p>
                    <p className="text-[10px] text-stone-400">
                      {storageUsage.usageMB} MB • Terbaca di File Manager HP
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-[#165a4c] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 flex items-center gap-1">
                  <FolderCheck className="w-3 h-3" />
                  <span>Zero-Copy</span>
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                  style={{ width: `${Math.max(storageUsage.percentage, 2)}%` }}
                />
              </div>
            </div>

            {/* Ekspor Cadangan */}
            <div
              onClick={handleExportBackup}
              className="px-4 py-3.5 flex items-center justify-between cursor-pointer hover:bg-stone-50 active:bg-stone-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 shrink-0">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-900">
                    Ekspor Cadangan (.simpan)
                  </p>
                  <p className="text-[10px] text-stone-400">
                    Simpan berkas terenkripsi PIN ke memori HP
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400" />
            </div>

            {/* Impor Cadangan */}
            <div
              onClick={() => backupInputRef.current?.click()}
              className="px-4 py-3.5 flex items-center justify-between cursor-pointer hover:bg-stone-50 active:bg-stone-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100 shrink-0">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-900">
                    Pulihkan Cadangan
                  </p>
                  <p className="text-[10px] text-stone-400">
                    Impor arsip dari berkas .simpan
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400" />
            </div>
          </div>
        </div>

        {/* SECTION 3: TENTANG & LAINNYA */}
        <div>
          <h3 className="text-[11px] font-bold text-stone-400 uppercase tracking-wider px-3 mb-1.5">
            Tentang Aplikasi
          </h3>
          <div className="bg-white rounded-2xl border border-stone-200/80 divide-y divide-stone-100 shadow-2xs overflow-hidden">
            {/* Panduan Splash Screen */}
            <div
              onClick={() => {
                haptics.impactLight();
                if (onShowOnboarding) onShowOnboarding();
              }}
              className="px-4 py-3.5 flex items-center justify-between cursor-pointer hover:bg-stone-50 active:bg-stone-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shrink-0">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-900">
                    Lihat Panduan Singkat
                  </p>
                  <p className="text-[10px] text-stone-400">
                    Tampilkan 3 langkah mudah menggunakan Simpan
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400" />
            </div>

            {/* Email Pengembang */}
            <div
              onClick={handleFeedbackClick}
              className="px-4 py-3.5 flex items-center justify-between hover:bg-stone-50 active:bg-stone-100 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-900">
                    Kirim Masukan
                  </p>
                  <p className="text-[10px] text-stone-400">
                    fadhilakbar93@icloud.com
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400" />
            </div>

            {/* Versi & Pembuat */}
            <div className="px-4 py-3.5 flex items-center justify-between bg-stone-50/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-600 flex items-center justify-center border border-stone-200 shrink-0">
                  <Info className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-900">
                    SIMPAN - PERSONAL ARCHIVE v1.0.0 (Build 2026.09)
                  </p>
                  <p className="text-[10px] text-stone-400">
                    Oleh Nur Fadhillah Chaerul Akbar
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-stone-500 bg-white px-2 py-0.5 rounded-md border border-stone-200">
                Offline
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
