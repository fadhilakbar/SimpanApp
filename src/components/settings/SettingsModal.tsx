import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Lock,
  Download,
  Upload,
  User,
  ShieldCheck,
  Eye,
  KeyRound,
  Check,
  Sparkles,
  Camera,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useToast } from '../ui';
import {
  getUserProfile,
  setUserProfile,
  getSecuritySettings,
  setSecurityLock,
  isBiometricsAvailable,
  SecuritySettings,
  UserProfile,
} from '../../services/authService';
import { exportDatabaseBackup, importDatabaseBackup } from '../../services/db';
import { compressAvatar } from '../../utils/imageCompressor';
import { haptics } from '../../utils/haptics';
import { saveOrShareTextFile } from '../../utils/fileExport';
import { encryptData, decryptData } from '../../services/cryptoService';
import { BrandAvatar } from '../ui/BrandAvatar';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated?: () => void;
  onDataRestored?: () => void;
  onShowOnboarding?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onProfileUpdated,
  onDataRestored,
  onShowOnboarding,
}) => {
  const toast = useToast();
  const [profile, setProfileState] = useState<UserProfile>(getUserProfile());
  const [securitySettings, setLocalSecuritySettings] = useState<SecuritySettings>(
    getSecuritySettings()
  );
  const [isEditingPin, setIsEditingPin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [isProcessingAvatar, setIsProcessingAvatar] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setProfileState(getUserProfile());
      setLocalSecuritySettings(getSecuritySettings());
      isBiometricsAvailable().then(setHasBiometrics);
      setIsEditingPin(false);
      setNewPin('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveProfileName = (name: string) => {
    setUserProfile({ name });
    setProfileState((prev) => ({ ...prev, name }));
    if (onProfileUpdated) onProfileUpdated();
  };

  const handleSelectAvatar = (avatarId: string) => {
    haptics.impactLight();
    setUserProfile({ avatar: avatarId });
    setProfileState((prev) => ({ ...prev, avatar: avatarId }));
    if (onProfileUpdated) onProfileUpdated();
    toast.success('Avatar diperbarui.');
  };

  // Upload foto avatar dari Kamera atau Galeri
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingAvatar(true);
    try {
      haptics.impactMedium();
      const compressedDataUrl = await compressAvatar(file);
      setUserProfile({ avatar: compressedDataUrl });
      setProfileState((prev) => ({ ...prev, avatar: compressedDataUrl }));
      if (onProfileUpdated) onProfileUpdated();
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

  const handleToggleLock = () => {
    haptics.impactLight();
    const nextState = !securitySettings.isLockEnabled;
    setSecurityLock(nextState, securitySettings.pin, securitySettings.useFaceId);
    setLocalSecuritySettings(getSecuritySettings());
    toast.success(
      nextState ? 'Kunci Aplikasi Diaktifkan.' : 'Kunci Aplikasi Dimatikan.'
    );
  };

  const handleToggleFaceId = () => {
    haptics.impactLight();
    const nextFaceId = !securitySettings.useFaceId;
    setSecurityLock(securitySettings.isLockEnabled, securitySettings.pin, nextFaceId);
    setLocalSecuritySettings(getSecuritySettings());
    toast.success(nextFaceId ? 'Face ID diaktifkan.' : 'Face ID dimatikan.');
  };

  const handleSavePin = () => {
    if (newPin.length !== 6 || !/^\d+$/.test(newPin)) {
      haptics.notificationWarning();
      toast.error('PIN harus berupa 6 digit angka.');
      return;
    }
    haptics.notificationSuccess();
    setSecurityLock(securitySettings.isLockEnabled, newPin, securitySettings.useFaceId);
    setLocalSecuritySettings(getSecuritySettings());
    setIsEditingPin(false);
    setNewPin('');
    toast.success('PIN 6-digit berhasil diperbarui.');
  };

  const handleExportBackup = async () => {
    try {
      haptics.impactMedium();
      const backup = await exportDatabaseBackup();
      let jsonStr = JSON.stringify(backup, null, 2);

      // Jika kunci aktif, enkripsi cadangan dengan PIN
      if (securitySettings.isLockEnabled && securitySettings.pin) {
        const encrypted = await encryptData(jsonStr, securitySettings.pin);
        jsonStr = JSON.stringify({
          encrypted: true,
          data: encrypted,
          app: 'SIMPAN',
          version: '1.0',
        });
      }

      const filename = `SIMPAN_Backup_${new Date()
        .toISOString()
        .slice(0, 10)}.simpan`;
      await saveOrShareTextFile(filename, jsonStr, 'application/json');
      haptics.notificationSuccess();
      toast.success('Berkas backup .simpan berhasil diekspor.');
    } catch (err) {
      toast.error('Gagal mengekspor backup.');
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        let text = event.target?.result as string;
        let parsed = JSON.parse(text);

        // Jika terenkripsi, minta dekripsi
        if (parsed && parsed.encrypted && parsed.data) {
          const pin = prompt('Masukkan PIN 6-digit arsip untuk membuka backup:');
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
        onClose();
      } catch (err) {
        haptics.notificationWarning();
        toast.error('Berkas .simpan tidak valid, salah PIN, atau rusak.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const isCustomAvatar =
    profile.avatar.startsWith('data:image') ||
    profile.avatar.startsWith('blob:') ||
    profile.avatar.startsWith('http');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pengaturan"
      description="SIMPAN — Brankas Arsip Pribadi Offline"
      maxWidth="md"
    >
      {/* Hidden file inputs untuk Camera & Gallery Avatar */}
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

      <div className="space-y-5 select-none pb-2">
        {/* 1. Profil Pengguna (Nama & Avatar) */}
        <div className="bg-white rounded-2xl border border-stone-200/80 p-4 space-y-4 shadow-xs">
          <h4 className="text-xs font-bold tracking-wider text-stone-500 uppercase flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-[#165a4c]" />
            <span>Profil Pengguna</span>
          </h4>

          {/* Avatar Preview & Upload Action */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <BrandAvatar size="lg" avatarSrc={profile.avatar} />
              {isProcessingAvatar && (
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            <div className="flex-1 space-y-2">
              <p className="text-xs font-bold text-stone-800">Foto Profil</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    haptics.impactLight();
                    cameraInputRef.current?.click();
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-semibold flex items-center gap-1.5 border border-emerald-200/60 active:scale-95 transition-all shadow-2xs"
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Kamera</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    haptics.impactLight();
                    galleryInputRef.current?.click();
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-semibold flex items-center gap-1.5 border border-stone-200 active:scale-95 transition-all shadow-2xs"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-stone-600" />
                  <span>Galeri</span>
                </button>

                {isCustomAvatar && (
                  <button
                    type="button"
                    onClick={() => handleSelectAvatar('default')}
                    className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/60 active:scale-95 transition-all"
                    title="Hapus foto & kembali ke kartun"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Edit Nama */}
          <div>
            <label className="text-xs font-semibold text-stone-700">Nama Anda</label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => handleSaveProfileName(e.target.value)}
              placeholder="Masukkan nama Anda..."
              className="mt-1 w-full px-3 py-2 bg-stone-50 rounded-xl border border-stone-200 text-sm font-medium text-stone-800 outline-none focus:border-[#165a4c] focus:bg-white transition-all"
            />
          </div>

          {/* Pilihan Avatar Karakter Preset */}
          <div>
            <label className="text-[11px] font-semibold text-stone-500">
              Atau Pilih Karakter Bawaan
            </label>
            <div className="flex items-center gap-2 mt-1.5">
              {[
                { id: 'default', label: 'Klasik', color: 'bg-[#F3ECE4] border-[#E6DCD1]' },
                { id: 'mint', label: 'Mint', color: 'bg-emerald-100 border-emerald-200' },
                { id: 'sky', label: 'Sky', color: 'bg-sky-100 border-sky-200' },
                { id: 'peach', label: 'Peach', color: 'bg-amber-100 border-amber-200' },
              ].map((av) => (
                <button
                  key={av.id}
                  onClick={() => handleSelectAvatar(av.id)}
                  className={`w-9 h-9 rounded-full ${av.color} border flex items-center justify-center transition-all ${
                    profile.avatar === av.id ? 'ring-2 ring-[#165a4c] scale-105 shadow-sm' : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  <span className="text-xs font-bold text-stone-700">😊</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2. Keamanan (Face ID & PIN 6 Digit) */}
        <div className="bg-white rounded-2xl border border-stone-200/80 p-4 space-y-3 shadow-xs">
          <h4 className="text-xs font-bold tracking-wider text-stone-500 uppercase flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-[#165a4c]" />
            <span>Kunci Masuk & Keamanan</span>
          </h4>

          {/* Toggle Kunci */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-stone-800">
                Aktifkan Kunci Masuk
              </p>
              <p className="text-[10px] text-stone-400">
                {hasBiometrics ? 'Minta Face ID / PIN saat buka aplikasi' : 'Minta PIN saat buka aplikasi'}
              </p>
            </div>

            <button
              onClick={handleToggleLock}
              className={`w-11 h-6 rounded-full transition-colors duration-200 p-0.5 ${
                securitySettings.isLockEnabled ? 'bg-[#165a4c]' : 'bg-stone-200'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform duration-200 ${
                  securitySettings.isLockEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Opsi Biometrik (Hanya jika sensor ada di perangkat) */}
          {securitySettings.isLockEnabled && hasBiometrics && (
            <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-stone-800">
                  Gunakan Real Face ID / Touch ID
                </p>
                <p className="text-[10px] text-stone-400">
                  Buka kunci otomatis menggunakan biometrik perangkat
                </p>
              </div>

              <button
                onClick={handleToggleFaceId}
                className={`w-11 h-6 rounded-full transition-colors duration-200 p-0.5 ${
                  securitySettings.useFaceId ? 'bg-emerald-600' : 'bg-stone-200'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform duration-200 ${
                    securitySettings.useFaceId ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )}

          {/* Pengaturan PIN 6-digit */}
          {securitySettings.isLockEnabled && (
            <div className="pt-2 border-t border-stone-100 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-stone-800">
                    PIN Keamanan 6-Digit
                  </p>
                  <p className="text-[10px] text-stone-400">
                    Kunci master jika biometrik tidak tersedia
                  </p>
                </div>
                <button
                  onClick={() => setIsEditingPin(!isEditingPin)}
                  className="text-xs font-semibold text-[#165a4c] hover:underline"
                >
                  {isEditingPin ? 'Batal' : 'Ganti PIN'}
                </button>
              </div>

              {isEditingPin && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="password"
                    maxLength={6}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="Masukkan 6 angka baru..."
                    className="flex-1 px-3 py-1.5 bg-stone-50 rounded-xl border border-stone-200 text-sm font-mono tracking-widest text-center text-stone-800 outline-none focus:border-[#165a4c]"
                  />
                  <Button size="sm" onClick={handleSavePin} disabled={newPin.length !== 6}>
                    Simpan
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. Cadangan & Pemulihan (.simpan) */}
        <div className="bg-white rounded-2xl border border-stone-200/80 p-4 space-y-3 shadow-xs">
          <h4 className="text-xs font-bold tracking-wider text-stone-500 uppercase flex items-center gap-1.5">
            <Download className="w-3.5 h-3.5 text-[#165a4c]" />
            <span>Cadangan & Pemulihan</span>
          </h4>
          <p className="text-xs text-stone-500">
            Simpan semua data arsip Anda ke berkas <strong>.simpan</strong> atau pulihkan ke perangkat lain.
            {securitySettings.isLockEnabled && ' Berkas otomatis diamankan dengan PIN Anda.'}
          </p>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportBackup}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Ekspor .simpan
            </Button>

            <label className="cursor-pointer flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-xs font-semibold text-stone-700 active:scale-95 transition-all">
              <Upload className="w-4 h-4 text-stone-600" />
              <span>Impor .simpan</span>
              <input
                type="file"
                accept=".simpan,.json"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* 4. Onboarding & Informasi Pengembang */}
        <div className="bg-stone-50 rounded-2xl border border-stone-200/60 p-3.5 space-y-2 text-stone-500">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-stone-700">Splash Screen</div>
            {onShowOnboarding && (
              <button
                onClick={() => {
                  onClose();
                  onShowOnboarding();
                }}
                className="text-xs font-semibold text-[#165a4c] hover:underline"
              >
                Lihat Panduan
              </button>
            )}
          </div>

          <div className="pt-2 border-t border-stone-200/50 flex flex-col gap-0.5 text-[11px] text-stone-400">
            <div className="font-semibold text-stone-600">
              SIMPAN - PERSONAL ARCHIVE v1.0 (Build com.kynandev.simpan)
            </div>
            <div>Dikembangkan oleh: <strong>Nur Fadhillah Chaerul Akbar</strong></div>
            <div className="text-[10px] text-stone-400">Arsip Offline & Aman di Perangkat Anda</div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
