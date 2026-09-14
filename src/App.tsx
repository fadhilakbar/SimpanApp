import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptics } from './utils/haptics';
import { ArchiveRecord } from './types/record';
import {
  getAllRecords,
  initializeDatabase,
  saveRecord,
  bulkSaveRecords,
  updateRecordFields,
  softDeleteRecord,
  restoreRecord,
  permanentDeleteRecord,
  clearTrash,
  toggleFavorite as dbToggleFavorite,
} from './services/db';
import {
  cleanFileNameToTitle,
  detectCategoryFromFileName,
  detectRecordTypeFromExtension,
} from './services/documentImportService';
import {
  processDocumentWithOCR,
  OCRProcessProgress,
} from './services/ocrService';
import {
  getSecuritySettings,
  hasConfiguredPin,
  getHasCompletedOnboarding,
  setHasCompletedOnboarding,
} from './services/authService';
import { compressImageToWebP } from './utils/imageCompressor';
import { savePhysicalFile } from './services/storageService';

// Reusable UI Components
import { ToastProvider, useToast, BrandHeader, BrandAvatar } from './components/ui';

// Navigation & Views
import { TabBar, TabType } from './components/navigation/TabBar';
import { DesktopSidebar } from './components/navigation/DesktopSidebar';
import { CreateCategoryModal } from './components/collection/CreateCategoryModal';
import { HomeView } from './views/HomeView';
import { SearchView } from './views/SearchView';

// Lazy-loaded: hanya diunduh saat tab/layar ini benar-benar dibuka,
// bukan dibundel ke initial load bersama tab "Home" (default).
const TimelineView = lazy(() =>
  import('./views/TimelineView').then((m) => ({ default: m.TimelineView }))
);
const CollectionsView = lazy(() =>
  import('./views/CollectionsView').then((m) => ({ default: m.CollectionsView }))
);
const ProfileView = lazy(() =>
  import('./views/ProfileView').then((m) => ({ default: m.ProfileView }))
);
const RecordDetailView = lazy(() =>
  import('./views/RecordDetailView').then((m) => ({ default: m.RecordDetailView }))
);

// Onboarding & Lock
import { SplashScreen } from './components/onboarding/SplashScreen';
import { LockScreen } from './components/security/LockScreen';

// Modals & Sheets
import { CaptureSheet } from './components/capture/CaptureSheet';
import { CameraScannerModal } from './components/capture/CameraScannerModal';
import { ProcessingModal } from './components/capture/ProcessingModal';
import { VoiceNoteModal } from './components/capture/VoiceNoteModal';
import { NoteModal } from './components/capture/NoteModal';
import { SaveSuccessModal } from './components/capture/SaveSuccessModal';
import { DraftRecordReviewModal } from './components/capture/DraftRecordReviewModal';
import { BatchImportModal } from './components/capture/BatchImportModal';
import { BrandLoader } from './components/ui/BrandLoader';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { showConfirm } from './utils/swal';

const ViewLoadingFallback: React.FC = () => (
  <div className="w-full min-h-[40vh] flex items-center justify-center py-16">
    <BrandLoader mode="inline" size="md" title="Memuat Halaman..." subtitle="Menyiapkan tampilan SIMPAN" />
  </div>
);

const AppContent: React.FC = () => {
  const toast = useToast();

  // Onboarding / Splash Screen State (Show at first launch)
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    return !getHasCompletedOnboarding();
  });

  // App Lock State: Jika sudah pernah setting PIN DAN fitur kunci aktif, wajib masuk lockscreen. Kalo belum setting PIN, langsung masuk.
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    return hasConfiguredPin() && getSecuritySettings().isLockEnabled;
  });

  // Database Records State
  const [records, setRecords] = useState<ArchiveRecord[]>([]);
  const [deletedRecords, setDeletedRecords] = useState<ArchiveRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Navigation & Search State
  const [currentTab, setCurrentTab] = useState<TabType>('home');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRecord, setSelectedRecord] = useState<ArchiveRecord | null>(null);

  // Success Modal & Draft Review Modal State
  const [justSavedRecord, setJustSavedRecord] = useState<ArchiveRecord | null>(null);
  const [draftRecord, setDraftRecord] = useState<ArchiveRecord | null>(null);

  // Capture Modals State
  const [isCaptureSheetOpen, setIsCaptureSheetOpen] = useState<boolean>(false);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState<boolean>(false);
  const [isNoteOpen, setIsNoteOpen] = useState<boolean>(false);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string | null>(null);
  const [isCreateCategoryModalOpen, setIsCreateCategoryModalOpen] = useState<boolean>(false);
  const [batchImportFiles, setBatchImportFiles] = useState<File[] | null>(null);

  const handleSelectSidebarCategory = (catId: string) => {
    if (activeCategoryFilter === catId) {
      setActiveCategoryFilter(null);
    } else {
      setActiveCategoryFilter(catId);
      if (currentTab !== 'home') {
        setCurrentTab('home');
      }
    }
  };

  const handleConfirmBatchSave = async (newRecords: ArchiveRecord[]) => {
    await bulkSaveRecords(newRecords);
    await loadRecords();
    setBatchImportFiles(null);
    toast.success(`${newRecords.length} dokumen berhasil diarsipkan!`);
    haptics.notificationSuccess();
  };

  const handleReviewSingleFromBatch = (record: ArchiveRecord) => {
    setBatchImportFiles(null);
    setDraftRecord(record);
  };

  // OCR Processing State
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [ocrProgress, setOcrProgress] = useState<OCRProcessProgress | undefined>();

  // Fetch all records from local Dexie database
  const loadRecords = async () => {
    try {
      const active = await getAllRecords(false);
      const trash = await getAllRecords(true);
      setRecords(active);
      setDeletedRecords(trash);
    } catch (err) {
      console.error('Failed to load records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initializeDatabase().then(() => {
      loadRecords();
    });

    // 0. Pulihkan draft yang belum sempat tersimpan jika app tertutup / crash
    try {
      const savedDraft = localStorage.getItem('simpan_active_draft_backup');
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed && (parsed.title || parsed.rawText || parsed.originalDataUrl)) {
          setDraftRecord(parsed);
          toast.info('Draft dokumen yang belum disimpan berhasil dipulihkan.');
        }
      }
    } catch (e) {
      console.warn('Gagal memulihkan draft:', e);
    }
  }, []);

  // Simpan backup draft ke localStorage agar aman jika aplikasi tertutup / crash / di-background
  useEffect(() => {
    try {
      if (draftRecord) {
        localStorage.setItem('simpan_active_draft_backup', JSON.stringify(draftRecord));
      } else {
        localStorage.removeItem('simpan_active_draft_backup');
      }
    } catch (e) {
      console.warn('Gagal menyimpan backup draft:', e);
    }
  }, [draftRecord]);

  // 1. Auto Lockscreen: Idle Timer 5 Menit (300.000 ms) & Graceful Background Lock
  const backgroundTimestampRef = useRef<number | null>(null);
  const justUnlockedTimestampRef = useRef<number>(Date.now());

  // App Lock State: Hanya aktif jika user sudah atur PIN DAN mengaktifkan kunci di pengaturan
  // Serta belum di-unlock dalam sesi aktif ini
  const handleUnlockApp = () => {
    justUnlockedTimestampRef.current = Date.now();
    try {
      sessionStorage.setItem('simpan_session_unlocked', 'true');
    } catch {}
    setIsLocked(false);
  };

  useEffect(() => {
    let idleTimer: any = null;
    const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 menit

    const resetIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        if (hasConfiguredPin() && getSecuritySettings().isLockEnabled) {
          setIsLocked(true);
        }
      }, IDLE_TIMEOUT_MS);
    };

    const activityEvents = ['touchstart', 'mousedown', 'keydown', 'scroll'];
    activityEvents.forEach((ev) => {
      window.addEventListener(ev, resetIdleTimer, { passive: true });
    });

    resetIdleTimer();

    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      activityEvents.forEach((ev) => {
        window.removeEventListener(ev, resetIdleTimer);
      });
    };
  }, []);

  // 2. Auto Lockscreen: Grace period saat Masuk Background (3 Menit)
  // Tidak langsung mengunci saat membuka File Picker, Kamera, atau Prompt Sistem!
  useEffect(() => {
    const BACKGROUND_LOCK_GRACE_MS = 3 * 60 * 1000; // 3 menit toleransi background

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // App baru saja masuk background atau tertutup sementara
        backgroundTimestampRef.current = Date.now();
      } else {
        // App kembali ke foreground: cek durasi background
        const bgTime = backgroundTimestampRef.current;
        backgroundTimestampRef.current = null;
        const timeSinceUnlocked = Date.now() - justUnlockedTimestampRef.current;

        // Jika baru di-unlock kurang dari 15 detik, jangan kunci
        if (timeSinceUnlocked < 15000) return;

        if (
          bgTime &&
          Date.now() - bgTime > BACKGROUND_LOCK_GRACE_MS &&
          hasConfiguredPin() &&
          getSecuritySettings().isLockEnabled
        ) {
          setIsLocked(true);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    let appStateListener: any = null;
    try {
      CapApp.addListener('appStateChange', (state) => {
        if (!state.isActive) {
          backgroundTimestampRef.current = Date.now();
        } else {
          const bgTime = backgroundTimestampRef.current;
          backgroundTimestampRef.current = null;
          const timeSinceUnlocked = Date.now() - justUnlockedTimestampRef.current;

          if (timeSinceUnlocked < 15000) return;

          if (
            bgTime &&
            Date.now() - bgTime > BACKGROUND_LOCK_GRACE_MS &&
            hasConfiguredPin() &&
            getSecuritySettings().isLockEnabled
          ) {
            setIsLocked(true);
          }
        }
      }).then((handle) => {
        appStateListener = handle;
      });
    } catch {
      // Ignore if web environment
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (appStateListener && typeof appStateListener.remove === 'function') {
        appStateListener.remove();
      }
    };
  }, []);

  // Finish Onboarding
  const handleFinishOnboarding = () => {
    setHasCompletedOnboarding(true);
    setShowOnboarding(false);
  };

  // Re-open Onboarding from Profile/Settings
  const handleShowOnboardingAgain = () => {
    setShowOnboarding(true);
  };

  // Soft Delete Record
  const handleDeleteRecord = async (id: string) => {
    await softDeleteRecord(id);
    await loadRecords();
    if (selectedRecord?.id === id) {
      setSelectedRecord(null);
    }
    toast.success('Arsip dihapus.');
  };

  // Restore Record
  const handleRestoreRecord = async (id: string) => {
    await restoreRecord(id);
    await loadRecords();
  };

  // Permanent Delete
  const handlePermanentDelete = async (id: string) => {
    const confirmed = await showConfirm({
      title: 'Hapus Permanen?',
      text: 'Arsip ini akan dihapus secara permanen dari perangkat dan tidak dapat dipulihkan lagi.',
      confirmText: 'Ya, Hapus Selamanya',
      isDestructive: true,
    });
    if (!confirmed) return;
    await permanentDeleteRecord(id);
    await loadRecords();
    toast.success('Arsip dihapus permanen.');
  };

  // Clear Trash
  const handleClearTrash = async () => {
    const confirmed = await showConfirm({
      title: 'Kosongkan Sampah?',
      text: 'Semua berkas di folder Sampah akan dihapus secara permanen.',
      confirmText: 'Ya, Kosongkan Semua',
      isDestructive: true,
    });
    if (!confirmed) return;
    await clearTrash();
    await loadRecords();
    toast.success('Folder Sampah telah dikosongkan.');
  };

  // Toggle Favorite
  const handleToggleFavorite = async (id: string) => {
    const isFav = await dbToggleFavorite(id);
    setRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isFavorite: isFav } : r))
    );
    if (selectedRecord?.id === id) {
      setSelectedRecord((prev) => (prev ? { ...prev, isFavorite: isFav } : null));
    }
    toast.success(isFav ? 'Ditambahkan ke Favorit.' : 'Dihapus dari Favorit.');
  };

  // Update Record
  const handleUpdateRecord = async (updated: ArchiveRecord) => {
    await saveRecord(updated);
    setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setSelectedRecord(updated);
  };

  // Instantly Save Record and Run OCR & Multi-AI in Background
  const runOCRAndSave = async (
    dataUrl: string,
    fileName: string,
    overrideType?: any,
    additionalPages?: string[]
  ) => {
    try {
      // 0. Tutup semua dialog & sheet unggah seketika (<1ms) agar antarmuka tidak menunggu
      setIsCaptureSheetOpen(false);
      setIsCameraOpen(false);
      setIsProcessing(false);

      const now = new Date().toISOString();
      const recordId = 'rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const cleanTitle = cleanFileNameToTitle(fileName);
      const detectedCategory = detectCategoryFromFileName(fileName);
      const detectedType = overrideType || detectRecordTypeFromExtension(fileName);

      const isImg = dataUrl.startsWith('data:image/');
      const initialThumbnail = isImg ? dataUrl : undefined;
      const ext = fileName.split('.').pop()?.toUpperCase() || 'BERKAS';
      const initialSummary = `Berkas ${ext} - Sedang dipindai AI di latar belakang...`;

      const newRecord: ArchiveRecord = {
        id: recordId,
        type: detectedType,
        title: cleanTitle,
        createdAt: now,
        capturedAt: now,
        updatedAt: now,
        category: detectedCategory,
        tags: [detectedCategory, ext],
        isFavorite: false,
        isDeleted: false,
        createdManually: false,
        originalDataUrl: dataUrl,
        thumbnailDataUrl: initialThumbnail,
        originalFileName: fileName,
        fileSizeBytes: undefined,
        originalFileSizeBytes: undefined,
        isCompressed: false,
        rawText: cleanTitle,
        summary: initialSummary,
        extractedFields: [],
        receiptItems: undefined,
        pages: additionalPages && additionalPages.length > 0 ? additionalPages : undefined,
      };

      // 1. Simpan LANGSUNG ke database & perbarui antarmuka pengguna seketika (<15ms)
      await saveRecord(newRecord);
      setRecords((prev) => [newRecord, ...prev]);

      toast.success('Berkas berhasil disimpan! AI sedang memindai di latar belakang.');
      haptics.notificationSuccess();

      // 2. Jalankan pemindaian OCR & Multi-AI di latar belakang (Background Worker)
      setTimeout(async () => {
        try {
          let processDataUrl = dataUrl;
          let thumbnailDataUrl: string | undefined = initialThumbnail;
          let compressedSizeBytes: number | undefined = undefined;
          let isCompressed = false;

          // Background image compression or PDF thumbnail generation
          if (isImg) {
            try {
              const comp = await compressImageToWebP(dataUrl, { maxDimension: 1600, quality: 0.8 });
              processDataUrl = comp.compressedDataUrl;
              thumbnailDataUrl = comp.thumbnailDataUrl;
              compressedSizeBytes = comp.compressedSizeBytes;
              isCompressed = true;
            } catch (_compErr) {
              processDataUrl = dataUrl;
            }
          } else if (dataUrl.startsWith('data:application/pdf') || fileName.toLowerCase().endsWith('.pdf')) {
            try {
              const { renderPdfFirstPageToDataUrl } = await import('./services/pdfExtractService');
              thumbnailDataUrl = (await renderPdfFirstPageToDataUrl(dataUrl)) || undefined;
            } catch (_pdfThumbErr) {}
          }

          const ocrResult = await processDocumentWithOCR(processDataUrl, fileName);
          if (ocrResult) {
            const updates: Partial<ArchiveRecord> = {
              rawText: ocrResult.rawText || cleanTitle,
              summary: ocrResult.summary || `Dokumen ${fileName} selesai dipindai.`,
              title: ocrResult.title && ocrResult.title !== fileName ? ocrResult.title : undefined,
              category: ocrResult.category || undefined,
              type: ocrResult.type || detectedType,
              extractedFields:
                ocrResult.extractedFields && ocrResult.extractedFields.length > 0
                  ? ocrResult.extractedFields
                  : undefined,
              receiptItems:
                ocrResult.receiptItems && ocrResult.receiptItems.length > 0
                  ? ocrResult.receiptItems
                  : undefined,
              thumbnailDataUrl: ocrResult.thumbnailDataUrl || thumbnailDataUrl,
              pages: ocrResult.pages && ocrResult.pages.length > 0 ? ocrResult.pages : additionalPages,
              originalDataUrl: isCompressed ? processDataUrl : undefined,
              fileSizeBytes: compressedSizeBytes,
              isCompressed: isCompressed || undefined,
            };

            await updateRecordFields(recordId, updates);

            // Perbarui state reaktif di React
            setRecords((prev) =>
              prev.map((r) => (r.id === recordId ? { ...r, ...updates } : r))
            );
            setSelectedRecord((prev) =>
              prev && prev.id === recordId ? { ...prev, ...updates } : prev
            );

            toast.info(`Pemindaian AI selesai untuk: ${updates.title || cleanTitle}`);
            haptics.impactLight();
          }
        } catch (bgOcrErr) {
          console.warn('[Background OCR] Gagal memproses teks di latar belakang:', bgOcrErr);
        }
      }, 80);
    } catch (error: any) {
      console.error('Error saat menyimpan berkas:', error);
      toast.error('Gagal menyimpan berkas ke arsip');
    }
  };

  // Penanganan Berkas / Teks Masuk dari Aplikasi Lain (Telegram, WhatsApp, Galeri, dll. via Android Intent & iOS Open-In)
  const processIncomingShare = async (shareData: {
    mimeType?: string;
    dataUrl?: string;
    text?: string;
    filename?: string;
  }) => {
    if (!shareData) return;
    toast.info('Menerima berkas dari aplikasi lain...');

    // 1. Gambar
    if (
      shareData.dataUrl &&
      (shareData.mimeType?.startsWith('image/') ||
        shareData.dataUrl.startsWith('data:image/'))
    ) {
      await runOCRAndSave(
        shareData.dataUrl,
        shareData.filename || 'Foto dari Telegram',
        'receipt'
      );
      return;
    }

    // 2. Dokumen PDF
    if (
      shareData.dataUrl &&
      (shareData.mimeType?.includes('pdf') ||
        shareData.dataUrl.startsWith('data:application/pdf'))
    ) {
      await runOCRAndSave(
        shareData.dataUrl,
        shareData.filename || 'Dokumen PDF dari Telegram',
        'document'
      );
      return;
    }

    // 3. Teks biasa / Link yang dibagikan
    if (shareData.text) {
      const now = new Date().toISOString();
      const newRecord: ArchiveRecord = {
        id: 'rec_' + Date.now(),
        type: 'note',
        title: shareData.text.slice(0, 40).split('\n')[0] || 'Catatan dari Telegram',
        createdAt: now,
        capturedAt: now,
        updatedAt: now,
        category: 'Catatan',
        tags: ['Catatan', 'Telegram'],
        isFavorite: false,
        isDeleted: false,
        createdManually: false,
        rawText: shareData.text,
        summary: shareData.text.slice(0, 120),
        extractedFields: [],
      };
      setDraftRecord(newRecord);
      toast.success('Catatan teks berhasil dimuat!');
    }
  };

  // Listener untuk Share Target (Android & iOS)
  useEffect(() => {
    // A. Listener Android Native Share Event
    const handleAndroidShare = (e: any) => {
      if (e.detail) {
        processIncomingShare(e.detail);
      }
    };
    window.addEventListener('simpan_incoming_share', handleAndroidShare);

    // Cek jika ada berkas yang dibagikan saat cold-start Android
    if ((window as any).__simpanPendingIncomingShare) {
      const pending = (window as any).__simpanPendingIncomingShare;
      (window as any).__simpanPendingIncomingShare = null;
      processIncomingShare(pending);
    }

    // B. Listener iOS Open-In / Share (appUrlOpen)
    let urlListener: any = null;
    try {
      CapApp.addListener('appUrlOpen', async (data) => {
        if (data && data.url) {
          if (data.url.startsWith('file://')) {
            try {
              const safeSrc = Capacitor.convertFileSrc(data.url);
              const res = await fetch(safeSrc);
              const blob = await res.blob();
              const mime =
                blob.type ||
                (data.url.toLowerCase().endsWith('.pdf')
                  ? 'application/pdf'
                  : 'image/jpeg');
              const reader = new FileReader();
              reader.onloadend = () => {
                const dataUrl = reader.result as string;
                processIncomingShare({
                  mimeType: mime,
                  dataUrl,
                  filename: data.url.split('/').pop() || 'Dokumen Masuk',
                });
              };
              reader.readAsDataURL(blob);
            } catch (err) {
              console.warn('Gagal membaca berkas masuk iOS:', err);
            }
          }
        }
      }).then((h) => {
        urlListener = h;
      });
    } catch {
      // Abaikan jika lingkungan bukan native Capacitor
    }

    // B. Listener untuk pembaruan record dari Background Worker (OCR / Impor)
    const handleRecordUpdated = (e: any) => {
      const { recordId, updates } = e.detail || {};
      if (!recordId || !updates) return;
      setRecords((prev) =>
        prev.map((r) => (r.id === recordId ? { ...r, ...updates } : r))
      );
      setSelectedRecord((prev) =>
        prev && prev.id === recordId ? { ...prev, ...updates } : prev
      );
    };
    window.addEventListener('simpan_record_updated', handleRecordUpdated);

    return () => {
      window.removeEventListener('simpan_incoming_share', handleAndroidShare);
      window.removeEventListener('simpan_record_updated', handleRecordUpdated);
      if (urlListener && typeof urlListener.remove === 'function') {
        urlListener.remove();
      }
    };
  }, []);

  // Confirm Camera Capture
  const handleConfirmCameraCapture = (pages: string[], title: string) => {
    const mainPage = pages[0] || '';
    runOCRAndSave(mainPage, title, 'scan', pages);
  };

  // Gallery File Select
  const handleSelectGallery = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      runOCRAndSave(result, file.name, 'receipt');
    };
    reader.readAsDataURL(file);
  };

  // PDF File Select
  const handleSelectPDF = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      runOCRAndSave(result, file.name, 'document');
    };
    reader.readAsDataURL(file);
  };

  // Desktop direct file input ref & handler
  const desktopFileInputRef = useRef<HTMLInputElement>(null);
  const handleDesktopFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type === 'application/pdf') {
      handleSelectPDF(file);
    } else if (file.type.startsWith('image/')) {
      handleSelectGallery(file);
    }
    e.target.value = '';
  };

  // Quick Scan (Pindai Cepat): Buka pemilih berkas sekaligus (PDF, DOCX, XLSX, XLS, CSV, TXT)
  const quickScanFileInputRef = useRef<HTMLInputElement>(null);

  const handleQuickScan = () => {
    setIsCaptureSheetOpen(false);
    quickScanFileInputRef.current?.click();
  };

  const handleQuickScanFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setBatchImportFiles(Array.from(files));
      haptics.notificationSuccess();
    }
    e.target.value = '';
  };

  // Save Voice Note (Ke Draft Review terlebih dahulu)
  const handleSaveVoiceNote = async (data: {
    title: string;
    duration: number;
    rawText: string;
    summary: string;
    category: string;
    tags: string[];
    audioUrl?: string;
    mimeType?: string;
  }) => {
    const ext = data.mimeType?.includes('mp4') ? 'mp4' : data.mimeType?.includes('aac') ? 'aac' : 'webm';
    const newRecord: ArchiveRecord = {
      id: 'rec_' + Date.now(),
      type: 'audio',
      title: data.title,
      createdAt: new Date().toISOString(),
      capturedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      category: data.category,
      tags: data.tags,
      isFavorite: false,
      isDeleted: false,
      createdManually: true,
      audioDurationSeconds: data.duration,
      originalDataUrl: data.audioUrl,
      thumbnailDataUrl: undefined,
      mimeType: data.mimeType || 'audio/webm',
      originalFileName: `${data.title.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Catatan_Suara'}.${ext}`,
      rawText: data.rawText,
      summary: data.summary,
      extractedFields: [
        {
          id: 'f_dur_' + Date.now(),
          key: 'duration',
          label: 'Durasi Audio',
          rawValue: `00:${data.duration.toString().padStart(2, '0')}`,
          currentValue: `00:${data.duration.toString().padStart(2, '0')}`,
          valueType: 'text',
          confidence: 1.0,
          source: 'manual',
          isEdited: false,
        },
      ],
    };

    setIsVoiceOpen(false);
    setDraftRecord(newRecord);
  };

  // Save Text Note (Ke Draft Review terlebih dahulu)
  const handleSaveNote = async (data: {
    title: string;
    content: string;
    category: string;
    tags: string[];
  }) => {
    const newRecord: ArchiveRecord = {
      id: 'rec_' + Date.now(),
      type: 'note',
      title: data.title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      category: data.category,
      tags: data.tags,
      isFavorite: false,
      isDeleted: false,
      createdManually: true,
      rawText: data.content,
      summary: data.content.slice(0, 120),
      extractedFields: [
        {
          id: 'f_top_' + Date.now(),
          key: 'category',
          label: 'Kategori',
          rawValue: data.category,
          currentValue: data.category,
          valueType: 'text',
          confidence: 1.0,
          source: 'manual',
          isEdited: false,
        },
      ],
    };

    setIsNoteOpen(false);
    setDraftRecord(newRecord);
  };

  // Konfirmasi Final Simpan Draft ke Dexie Database
  const handleConfirmDraftSave = async (finalRecord: ArchiveRecord) => {
    // Deteksi duplikasi dokumen / arsip (konten teks sama persis atau judul & kategori identik)
    const duplicate = records.find((r) => {
      if (r.id === finalRecord.id) return false;
      const sameTitle =
        r.title.trim().toLowerCase() === finalRecord.title.trim().toLowerCase();
      const sameCategory = r.category === finalRecord.category;
      const sameRaw =
        r.rawText &&
        finalRecord.rawText &&
        r.rawText.trim().length > 10 &&
        r.rawText.trim() === finalRecord.rawText.trim();
      const sameSummary =
        r.summary &&
        finalRecord.summary &&
        r.summary.trim().length > 15 &&
        r.summary.trim() === finalRecord.summary.trim();
      return Boolean(sameRaw || sameSummary || (sameTitle && sameCategory));
    });

    if (duplicate) {
      const proceed = await showConfirm({
        title: 'Arsip Serupa Terdeteksi',
        text: `Dokumen dengan konten yang serupa sudah tersimpan sebagai "${duplicate.title}". Apakah Anda yakin ingin tetap menyimpannya sebagai arsip baru?`,
        confirmText: 'Tetap Simpan',
        cancelText: 'Periksa Kembali',
        isDestructive: false,
      });
      if (!proceed) {
        setDraftRecord(finalRecord);
        return;
      }
    }

    let recordToSave = { ...finalRecord };

    // Jika ini bukan zero-copy dan memiliki berkas baru, simpan ke folder publik Documents/SIMPAN/
    if (!recordToSave.isZeroCopy && recordToSave.originalDataUrl && recordToSave.originalDataUrl.startsWith('data:')) {
      try {
        let ext = 'webp';
        let defaultMime = 'image/webp';
        if (recordToSave.type === 'audio' || recordToSave.mimeType?.startsWith('audio/')) {
          ext = 'webm';
          defaultMime = recordToSave.mimeType || 'audio/webm';
          recordToSave.thumbnailDataUrl = undefined;
        } else if (recordToSave.mimeType?.includes('pdf') || recordToSave.originalFileName?.endsWith('.pdf')) {
          ext = 'pdf';
          defaultMime = 'application/pdf';
        } else if (recordToSave.mimeType?.includes('word') || recordToSave.originalFileName?.endsWith('.docx')) {
          ext = 'docx';
          defaultMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        } else if (recordToSave.mimeType?.includes('sheet') || recordToSave.originalFileName?.endsWith('.xlsx')) {
          ext = 'xlsx';
          defaultMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        }
        const safeFileName = recordToSave.originalFileName || `${recordToSave.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.${ext}`;
        const saved = await savePhysicalFile(
          recordToSave.id,
          safeFileName,
          recordToSave.originalDataUrl,
          recordToSave.mimeType || defaultMime
        );
        recordToSave.localFilePath = saved.localFilePath;
        recordToSave.fileSizeBytes = saved.fileSizeBytes;
        // JANGAN timpa originalDataUrl audio dengan webViewUrl karena Android WebView menolak streaming HTTP Range!
        if (recordToSave.type !== 'audio' && !recordToSave.mimeType?.startsWith('audio/')) {
          recordToSave.originalDataUrl = saved.webViewUrl;
        }
      } catch (err) {
        console.warn('Gagal menyimpan berkas ke Documents/SIMPAN:', err);
      }
    }

    if (recordToSave.type === 'audio') {
      recordToSave.thumbnailDataUrl = undefined;
    }

    await saveRecord(recordToSave);
    await loadRecords();
    setDraftRecord(null);
    setJustSavedRecord(recordToSave);
  };

  const handleLockApp = async () => {
    if (!hasConfiguredPin()) {
      haptics.notificationWarning();
      const confirmed = await showConfirm({
        title: 'Belum Ada PIN Keamanan',
        text: 'Untuk mengunci aplikasi, silakan atur PIN 6-digit di menu Profil & Pengaturan Keamanan terlebih dahulu.',
        icon: 'info',
        confirmText: 'Atur PIN Sekarang',
        cancelText: 'Nanti',
      });
      if (confirmed) {
        setIsProfileOpen(true);
      }
      return;
    }
    haptics.impactMedium();
    setIsLocked(true);
  };

  return (
    <div className="h-full w-full flex flex-col bg-gradient-to-b from-emerald-50/70 via-[#FAF9F6] to-emerald-50/80 text-stone-900 font-sans select-none antialiased overflow-hidden relative">
      {/* Subtle organic green ambient glow at top and bottom */}
      <div className="absolute top-0 left-0 right-0 h-44 bg-gradient-to-b from-emerald-400/10 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-52 bg-gradient-to-t from-emerald-500/12 to-transparent pointer-events-none" />
      <div className="absolute top-0 -left-12 w-64 h-64 rounded-full bg-emerald-300/12 blur-3xl pointer-events-none" />
      <div className="absolute bottom-12 -right-12 w-72 h-72 rounded-full bg-teal-300/12 blur-3xl pointer-events-none" />

      {/* Hidden File Input untuk Desktop Quick Upload */}
      <input
        type="file"
        ref={desktopFileInputRef}
        onChange={handleDesktopFileChange}
        accept="image/*,application/pdf"
        className="hidden"
      />

      {/* Hidden File Input untuk Pindai Cepat Multi-Dokumen (PDF, DOCX, XLSX, XLS, CSV, TXT) */}
      <input
        type="file"
        ref={quickScanFileInputRef}
        onChange={handleQuickScanFileChange}
        accept="*/*"
        multiple
        className="hidden"
      />

      {/* 1. Mobile Fixed Top Brand Header (Hanya di layar mobile) */}
      <div className="md:hidden">
        <BrandHeader
          showGreeting={currentTab === 'home'}
          rightElement={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLockApp}
                title="Kunci Aplikasi"
                className="w-8 h-8 flex items-center justify-center rounded-full bg-stone-100 hover:bg-emerald-50 text-stone-600 hover:text-[#165a4c] border border-stone-200/80 active:scale-90 transition-all cursor-pointer shadow-2xs"
                aria-label="Kunci Aplikasi"
              >
                <Lock className="w-3.5 h-3.5 text-[#165a4c]" />
              </button>
              <BrandAvatar size="sm" onClick={() => setIsProfileOpen(true)} />
            </div>
          }
        />
      </div>

      {/* 2. Middle Content Area (Desktop Sidebar + Scrollable Main View) */}
      <div
        className="relative flex-1 w-full min-h-0 overflow-hidden flex flex-row"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file.type === 'application/pdf') {
              handleSelectPDF(file);
            } else if (file.type.startsWith('image/')) {
              handleSelectGallery(file);
            }
          }
        }}
      >
        {/* Desktop Sidebar (Hanya aktif dan tampil pada layar md: ke atas) */}
        <DesktopSidebar
          currentTab={currentTab}
          onChangeTab={(t) => {
            setActiveCategoryFilter(null);
            setCurrentTab(t);
          }}
          onOpenCapture={(type) => {
            if (type === 'camera') setIsCameraOpen(true);
            else if (type === 'upload') desktopFileInputRef.current?.click();
            else if (type === 'note') setIsNoteOpen(true);
            else if (type === 'voice') setIsVoiceOpen(true);
            else setIsCaptureSheetOpen(true);
          }}
          onOpenProfile={() => setIsProfileOpen(true)}
          onLockApp={handleLockApp}
          recordCount={records.length}
          trashCount={deletedRecords.length}
          activeCategory={activeCategoryFilter}
          onSelectCategory={handleSelectSidebarCategory}
          onAddCategory={() => setIsCreateCategoryModalOpen(true)}
          records={records}
        />

        <main className="h-full flex-1 min-w-0 overflow-y-auto overscroll-y-contain relative focus:outline-none z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTab}
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -14, scale: 0.98 }}
              transition={{
                duration: 0.35,
                ease: [0.16, 1, 0.3, 1], // Apple fluid cubic bezier
              }}
              className="w-full min-h-full flex flex-col"
            >
              {currentTab === 'home' && (
                <HomeView
                  records={records}
                  loading={loading}
                  onSelectRecord={(r) => setSelectedRecord(r)}
                  onToggleFavorite={handleToggleFavorite}
                  activeCategoryFilter={activeCategoryFilter}
                  onClearCategoryFilter={() => setActiveCategoryFilter(null)}
                  onOpenCapture={(type) => {
                    if (type === 'camera') setIsCameraOpen(true);
                    else if (type === 'note') setIsNoteOpen(true);
                    else if (type === 'voice') setIsVoiceOpen(true);
                    else setIsCaptureSheetOpen(true);
                  }}
                  onSelectGallery={handleSelectGallery}
                  onSelectPDF={handleSelectPDF}
                  onOpenBatchImport={(files) => setBatchImportFiles(files)}
                  onOpenSearch={(q) => {
                    if (q !== undefined) setSearchQuery(q);
                    setCurrentTab('search');
                  }}
                  onOpenSettings={() => setIsProfileOpen(true)}
                  onOpenProfile={() => setIsProfileOpen(true)}
                  onViewAllRecords={() => {
                    setSearchQuery('');
                    setCurrentTab('search');
                  }}
                  onViewAllStats={() => {
                    setSearchQuery('');
                    setCurrentTab('search');
                  }}
                  onLockApp={handleLockApp}
                />
              )}

              {currentTab === 'search' && (
                <SearchView
                  records={records}
                  loading={loading}
                  initialQuery={searchQuery}
                  onSelectRecord={(r) => setSelectedRecord(r)}
                  onToggleFavorite={handleToggleFavorite}
                  onOpenAvatar={() => setIsProfileOpen(true)}
                />
              )}

              {currentTab === 'timeline' && (
                <Suspense fallback={<ViewLoadingFallback />}>
                  <TimelineView
                    records={records}
                    loading={loading}
                    onSelectRecord={(r) => setSelectedRecord(r)}
                    onOpenSearch={() => setCurrentTab('search')}
                    onOpenAvatar={() => setIsProfileOpen(true)}
                    onOpenCapture={(type) => {
                      if (type === 'camera') setIsCameraOpen(true);
                      else setIsCaptureSheetOpen(true);
                    }}
                  />
                </Suspense>
              )}

              {currentTab === 'collections' && (
                <Suspense fallback={<ViewLoadingFallback />}>
                  <CollectionsView
                    records={records}
                    loading={loading}
                    deletedRecords={deletedRecords}
                    onSelectRecord={(r) => setSelectedRecord(r)}
                    onRestoreRecord={handleRestoreRecord}
                    onPermanentDelete={handlePermanentDelete}
                    onClearTrash={handleClearTrash}
                    onOpenSettings={() => setIsProfileOpen(true)}
                    onOpenAvatar={() => setIsProfileOpen(true)}
                  />
                </Suspense>
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Primary Capture Bottom Sheet ("Simpan Apa Hari Ini?") */}
        <CaptureSheet
          isOpen={isCaptureSheetOpen}
          onClose={() => setIsCaptureSheetOpen(false)}
          isProcessing={isProcessing}
          onSelectCamera={() => {
            setIsCaptureSheetOpen(false);
            setIsCameraOpen(true);
          }}
          onSelectGallery={handleSelectGallery}
          onSelectPDF={handleSelectPDF}
          onSelectBatchFiles={(files) => {
            setIsCaptureSheetOpen(false);
            setBatchImportFiles(files);
          }}
          onSelectNote={() => {
            setIsCaptureSheetOpen(false);
            setIsNoteOpen(true);
          }}
          onSelectVoice={() => {
            setIsCaptureSheetOpen(false);
            setIsVoiceOpen(true);
          }}
          onSelectQuickScan={handleQuickScan}
          recentRecords={records}
          onSelectRecord={(r) => setSelectedRecord(r)}
          onOpenAvatar={() => {
            setIsCaptureSheetOpen(false);
            setIsProfileOpen(true);
          }}
        />
      </div>

      {/* Floating Bottom Tab Bar - Terkunci statis di bawah layar */}
      <TabBar
        currentTab={currentTab}
        onChangeTab={(tab) => {
          setIsCaptureSheetOpen(false);
          setCurrentTab(tab);
        }}
        onOpenCapture={() => setIsCaptureSheetOpen((prev) => !prev)}
        isCaptureOpen={isCaptureSheetOpen}
      />

      {/* Save Success Modal (mockup/tambahsukses.png) */}
      <SaveSuccessModal
        isOpen={Boolean(justSavedRecord)}
        record={justSavedRecord}
        onClose={() => setJustSavedRecord(null)}
        onViewDetail={(r) => {
          setJustSavedRecord(null);
          setSelectedRecord(r);
        }}
        onSaveAgain={() => {
          setJustSavedRecord(null);
          setIsCaptureSheetOpen(true);
        }}
        onOpenSearch={() => {
          setJustSavedRecord(null);
          setCurrentTab('search');
        }}
      />

      {/* Camera Document Scanner Modal */}
      <CameraScannerModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onConfirmCapture={handleConfirmCameraCapture}
      />

      {/* Voice Note Recording Modal */}
      <VoiceNoteModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        onSaveVoiceNote={handleSaveVoiceNote}
      />

      {/* Quick Text Note Modal */}
      <NoteModal
        isOpen={isNoteOpen}
        onClose={() => setIsNoteOpen(false)}
        onSaveNote={handleSaveNote}
      />


      {/* Multi-step OCR Processing Modal */}
      <ProcessingModal isOpen={isProcessing} progress={ocrProgress} />

      {/* Draft Record Review & Edit Modal (Tampil sebelum simpan ke database) */}
      {draftRecord && (
        <DraftRecordReviewModal
          draft={draftRecord}
          isOpen={Boolean(draftRecord)}
          onConfirmSave={handleConfirmDraftSave}
          onCancel={() => setDraftRecord(null)}
        />
      )}

      {/* Batch Import Local Documents Modal (Scan PDF/Word/Excel) */}
      {batchImportFiles && (
        <BatchImportModal
          isOpen={Boolean(batchImportFiles)}
          files={batchImportFiles}
          onClose={() => setBatchImportFiles(null)}
          onConfirmBatchSave={handleConfirmBatchSave}
          onReviewSingle={handleReviewSingleFromBatch}
        />
      )}

      {/* Full screen Record Detail Overlay with tactile iOS spring slide & swipe-to-back */}
      <AnimatePresence>
        {selectedRecord && (
          <motion.div
            key="record-detail-overlay"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 280, mass: 0.8 }}
            className="fixed inset-0 z-50 bg-[#FAF9F6] overflow-hidden flex flex-col"
          >
            <Suspense fallback={<ViewLoadingFallback />}>
              <RecordDetailView
                record={selectedRecord}
                onBack={() => setSelectedRecord(null)}
                onUpdateRecord={handleUpdateRecord}
                onDeleteRecord={handleDeleteRecord}
                onNavigateToCollection={() => {
                  setSelectedRecord(null);
                  setCurrentTab('collections');
                }}
              />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile & Settings Overlay with spring slide & swipe-to-back */}
      <AnimatePresence>
        {isProfileOpen && (
          <motion.div
            key="profile-overlay"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 280, mass: 0.8 }}
            drag="x"
            dragDirectionLock
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: 0, right: 0.6 }}
            onDragEnd={(_e, info) => {
              if (info.offset.x > 80 || info.velocity.x > 300) {
                haptics.impactLight();
                setIsProfileOpen(false);
              }
            }}
            className="fixed inset-0 z-50 bg-[#FAF9F6] md:bg-black/40 md:backdrop-blur-xs flex md:items-center md:justify-center p-0 md:p-6 overflow-hidden"
          >
            <div className="w-full h-full md:max-w-3xl md:max-h-[88vh] bg-[#FAF9F6] md:rounded-3xl md:shadow-2xl md:border md:border-stone-200 overflow-y-auto flex flex-col">
              <Suspense fallback={<ViewLoadingFallback />}>
                <ProfileView
                  records={records}
                  onClose={() => setIsProfileOpen(false)}
                  onShowOnboarding={handleShowOnboardingAgain}
                  onDataRestored={loadRecords}
                />
              </Suspense>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Category Modal */}
      <CreateCategoryModal
        isOpen={isCreateCategoryModalOpen}
        onClose={() => setIsCreateCategoryModalOpen(false)}
        onCreated={() => loadRecords()}
      />

      {/* App Lock Screen Overlay (Strictly Fullscreen & Gesture-locked) */}
      <AnimatePresence>
        {isLocked && (
          <motion.div
            key="lock-screen-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] w-screen h-screen bg-[#FAF9F6] overflow-hidden select-none touch-none overscroll-none"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 9999,
              touchAction: 'none',
              overscrollBehavior: 'none',
            }}
          >
            <LockScreen onUnlocked={handleUnlockApp} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* First-launch Splash / Onboarding Screen */}
      <AnimatePresence>
        {showOnboarding && (
          <motion.div
            key="onboarding-overlay"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="fixed inset-0 z-50 overflow-hidden"
          >
            <SplashScreen onFinish={handleFinishOnboarding} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
