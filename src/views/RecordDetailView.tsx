import React, { useState, useEffect } from 'react';
import {
  Star,
  Edit3,
  CheckCircle,
  X,
  Camera,
  ShoppingBag,
  Briefcase,
  Home as HomeIcon,
  Car,
  Wallet,
  Check,
  Folder,
  Image as ImageIcon,
  PenLine,
  ChevronDown,
  Plus,
  FileText,
  FolderInput,
  FileCode,
  FileSpreadsheet,
  Download,
  Share2,
  Volume2,
  Mic,
} from 'lucide-react';
import { ArchiveRecord, ExtractedField, ReceiptItem, RecordType } from '../types/record';
import { BrandHeader } from '../components/ui/BrandHeader';
import { OCRScannerModal } from '../components/record/OCRScannerModal';
import { aiSoundReader } from '../services/aiSoundReader';
import { haptics } from '../utils/haptics';
import { showSuccess, showConfirm } from '../utils/swal';
import { formatDeviceDateTime } from '../utils/dateFormatter';
import { getCustomCollections, CustomCollection } from '../services/collectionService';
import {
  ReceiptDetail,
  AudioDetail,
  DocumentDetail,
  ImageDetail,
  NoteDetail,
} from '../components/record/details';
import { safeDownloadOrViewFile } from '../utils/safariViewer';
import { shareContent, isImageSource, isPdfSource } from '../utils/fileExport';
import { useSwipeBack } from '../utils/useSwipeBack';
import { CreateCategoryModal } from '../components/collection/CreateCategoryModal';
import { DocumentMultiPageViewer } from '../components/record/DocumentMultiPageViewer';

export interface RecordDetailViewProps {
  record: ArchiveRecord;
  onBack: () => void;
  onUpdateRecord: (updated: ArchiveRecord) => void;
  onDeleteRecord: (id: string) => void;
  onNavigateToCollection?: () => void;
}

const CATEGORY_OPTIONS = [
  { name: 'Belanja Harian', icon: ShoppingBag, gradient: 'from-rose-500 to-pink-600', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
  { name: 'Dokumen', icon: FileText, gradient: 'from-sky-500 to-blue-600', bg: 'bg-sky-50 text-sky-700 border-sky-200' },
  { name: 'Catatan', icon: PenLine, gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-50 text-amber-800 border-amber-200' },
  { name: 'Keuangan', icon: Wallet, gradient: 'from-teal-500 to-emerald-600', bg: 'bg-teal-50 text-teal-800 border-teal-200' },
  { name: 'Pekerjaan', icon: Briefcase, gradient: 'from-emerald-500 to-teal-700', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  { name: 'Kendaraan', icon: Car, gradient: 'from-blue-500 to-cyan-600', bg: 'bg-blue-50 text-blue-800 border-blue-200' },
  { name: 'Pribadi', icon: HomeIcon, gradient: 'from-rose-500 to-red-600', bg: 'bg-rose-50 text-rose-800 border-rose-200' },
  { name: 'Gambar', icon: ImageIcon, gradient: 'from-purple-500 to-indigo-600', bg: 'bg-purple-50 text-purple-800 border-purple-200' },
];

const formatRupiah = (val: string | number | undefined): string => {
  if (!val) return '0';
  const str = String(val).trim();
  const digits = str.replace(/\D/g, '');
  if (!digits) return str;
  const num = parseInt(digits, 10);
  return num.toLocaleString('id-ID');
};

export const RecordDetailView: React.FC<RecordDetailViewProps> = ({
  record,
  onBack,
  onUpdateRecord,
  onDeleteRecord,
  onNavigateToCollection: _onNavigateToCollection,
}) => {
  const docType: RecordType = record.type || 'document';

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>(record.receiptItems || []);

  const handleCancelEdit = async () => {
    const confirmed = await showConfirm({
      title: 'Batalkan Perubahan?',
      text: 'Perubahan yang belum disimpan akan hilang.',
      confirmText: 'Ya, Batalkan',
      isDestructive: true,
    });
    if (confirmed) {
      setTitle(record.title);
      setCategory(record.category || 'Belanja Harian');
      setTags(record.tags && record.tags.length > 0 ? record.tags : ['Arsip']);
      setReceiptItems(record.receiptItems || []);
      setRawTextVal(record.rawText || '');
      setDescriptionVal(record.summary || '');
      setIsEditing(false);
    }
  };

  const handleRequestBack = () => {
    if (isEditing) {
      handleCancelEdit();
    } else {
      onBack();
    }
  };

  const swipeRef = useSwipeBack<HTMLDivElement>({
    onBack: handleRequestBack,
    enabled: !isEditing, // Swipe back dimatikan saat edit agar tidak terjadi accidental exit
  });

  const [showSavedToast, setShowSavedToast] = useState<boolean>(false);
  const [isOCRModalOpen, setIsOCRModalOpen] = useState<boolean>(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState<boolean>(false);
  const [isZoomModalOpen, setIsZoomModalOpen] = useState<boolean>(false);
  const [isCreateCategoryModalOpen, setIsCreateCategoryModalOpen] = useState<boolean>(false);
  const [customCollections, setCustomCollections] = useState<CustomCollection[]>([]);

  // Edit Form Fields
  const [title, setTitle] = useState(record.title);
  const [category, setCategory] = useState(record.category || 'Belanja Harian');
  const [tags, setTags] = useState<string[]>(
    record.tags && record.tags.length > 0 ? record.tags : ['Arsip']
  );
  const [newTagInput, setNewTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  // Common Date field
  const dateField =
    record.extractedFields?.find((f) => f.key === 'date' || f.key === 'signDate')?.currentValue ||
    formatDeviceDateTime(record.createdAt);

  // Receipt specific fields (tanpa angka fiktif buatan)
  const rawNominalField =
    record.extractedFields?.find(
      (f) => f.key === 'total' || f.key === 'total_amount' || f.key === 'amount'
    )?.currentValue ||
    record.receiptItems?.reduce((acc, it) => acc + (it.totalPrice || 0), 0) ||
    '0';

  const merchantField = record.extractedFields?.find(
    (f) => f.key === 'merchant' || f.key === 'store' || f.key === 'location'
  )?.currentValue;

  // Document specific fields (tanpa mock fiktif buatan)
  const docNoField =
    record.extractedFields?.find(
      (f) => f.key === 'documentNumber' || f.key === 'doc_no' || f.key === 'invoice'
    )?.currentValue || '';

  const companyField =
    record.extractedFields?.find(
      (f) => f.key === 'company' || f.key === 'issuer' || f.key === 'institution'
    )?.currentValue || '';

  const roleField =
    record.extractedFields?.find(
      (f) => f.key === 'role' || f.key === 'subject' || f.key === 'topic'
    )?.currentValue || '';

  // Form State bindings
  const [dateVal, setDateVal] = useState(dateField);
  const nominalVal = formatRupiah(rawNominalField);
  const locationVal = merchantField || record.title || 'Arsip Dokumen';
  const [docNoVal, setDocNoVal] = useState(docNoField);
  const [companyVal, setCompanyVal] = useState(companyField);
  const [roleVal, setRoleVal] = useState(roleField);
  const [descriptionVal, setDescriptionVal] = useState(
    record.summary || 'Detail arsip dokumen tersimpan secara aman di perangkat.'
  );
  const [rawTextVal, setRawTextVal] = useState(record.rawText || '');

  // Load custom collections for move modal
  useEffect(() => {
    setCustomCollections(getCustomCollections());
  }, []);

  const handleToggleFavorite = () => {
    haptics.impactLight();
    onUpdateRecord({
      ...record,
      isFavorite: !record.isFavorite,
    });
  };

  const handleToggleAudio = () => {
    haptics.impactLight();
    if (isPlayingAudio) {
      aiSoundReader.stop();
      setIsPlayingAudio(false);
    } else {
      setIsPlayingAudio(true);
      const textToRead = rawTextVal || descriptionVal || record.title;
      aiSoundReader.speak(textToRead, () => {
        setIsPlayingAudio(false);
      });
    }
  };

  const handleSaveEdit = () => {
    haptics.notificationSuccess();
    const updatedFields: ExtractedField[] = [
      ...(record.extractedFields || []).filter(
        (f) =>
          f.key !== 'date' &&
          f.key !== 'total' &&
          f.key !== 'total_amount' &&
          f.key !== 'amount' &&
          f.key !== 'merchant' &&
          f.key !== 'documentNumber' &&
          f.key !== 'company' &&
          f.key !== 'role'
      ),
      {
        id: 'f_date_' + Date.now(),
        key: 'date',
        label: 'Tanggal',
        rawValue: dateVal,
        currentValue: dateVal,
        valueType: 'date',
        confidence: 1.0,
        source: 'manual',
        isEdited: true,
      },
    ];

    if (docType === 'receipt') {
      updatedFields.push({
        id: 'f_amount_' + Date.now(),
        key: 'total',
        label: 'Nominal Transaksi',
        rawValue: nominalVal,
        currentValue: nominalVal,
        valueType: 'currency',
        confidence: 1.0,
        source: 'manual',
        isEdited: true,
      });
      updatedFields.push({
        id: 'f_merchant_' + Date.now(),
        key: 'merchant',
        label: 'Lokasi / Toko',
        rawValue: locationVal,
        currentValue: locationVal,
        valueType: 'text',
        confidence: 1.0,
        source: 'manual',
        isEdited: true,
      });
    }

    if (docType === 'document' || docType === 'scan') {
      if (docNoVal) {
        updatedFields.push({
          id: 'f_docno_' + Date.now(),
          key: 'documentNumber',
          label: 'Nomor Dokumen',
          rawValue: docNoVal,
          currentValue: docNoVal,
          valueType: 'text',
          confidence: 1.0,
          source: 'manual',
          isEdited: true,
        });
      }
      if (companyVal) {
        updatedFields.push({
          id: 'f_comp_' + Date.now(),
          key: 'company',
          label: 'Instansi / Perusahaan',
          rawValue: companyVal,
          currentValue: companyVal,
          valueType: 'text',
          confidence: 1.0,
          source: 'manual',
          isEdited: true,
        });
      }
      if (roleVal) {
        updatedFields.push({
          id: 'f_role_' + Date.now(),
          key: 'role',
          label: 'Jabatan / Perihal',
          rawValue: roleVal,
          currentValue: roleVal,
          valueType: 'text',
          confidence: 1.0,
          source: 'manual',
          isEdited: true,
        });
      }
    }

    const updated: ArchiveRecord = {
      ...record,
      title: title.trim() || record.title,
      category,
      tags,
      summary: descriptionVal,
      rawText: rawTextVal,
      receiptItems: docType === 'receipt' ? receiptItems : record.receiptItems,
      extractedFields: updatedFields,
      updatedAt: new Date().toISOString(),
    };

    onUpdateRecord(updated);
    setIsEditing(false);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 3500);
  };

  const handleAddTag = () => {
    if (newTagInput.trim() && !tags.includes(newTagInput.trim())) {
      setTags([...tags, newTagInput.trim()]);
      setNewTagInput('');
      setIsAddingTag(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // 1. PINDAH KATEGORI LANGSUNG
  const handleSelectCategory = (newCategory: string) => {
    haptics.notificationSuccess();
    setCategory(newCategory);
    onUpdateRecord({
      ...record,
      category: newCategory,
      updatedAt: new Date().toISOString(),
    });
    setIsMoveModalOpen(false);
    showSuccess('Kategori Diperbarui', `Dokumen berhasil dipindahkan ke "${newCategory}".`);
  };

  // 2. UNDUH BERKAS (Safe Download / Direct Export)
  const handleDownload = async () => {
    haptics.impactMedium();
    const fileUrl = record.originalDataUrl || record.thumbnailDataUrl;

    const ext =
      docType === 'document'
        ? (record.originalFileName?.split('.').pop() || 'pdf')
        : docType === 'audio'
          ? 'wav'
          : docType === 'note'
            ? 'txt'
            : 'jpg';
    const safeFileName = `${record.title.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'arsip'}.${ext}`;

    const textContent = `==============================\n` +
      `      SIMPAN - PERSONAL ARCHIVE\n` +
      `==============================\n` +
      `Jenis: ${docType.toUpperCase()}\n` +
      `Judul: ${record.title}\n` +
      `Kategori: ${record.category || 'Dokumen'}\n` +
      `Tanggal: ${dateVal}\n` +
      (docType === 'receipt' ? `Nominal: Rp ${nominalVal}\nLokasi: ${locationVal}\n` : '') +
      (docType === 'document' ? `No Dokumen: ${docNoVal}\nInstansi: ${companyVal}\n` : '') +
      `\nRingkasan:\n${descriptionVal}\n\n` +
      `Rincian Isi Arsip:\n${rawTextVal || record.summary || ''}\n\n` +
      `------------------------------\n` +
      `Tersimpan aman secara offline dengan Aplikasi SIMPAN.\n` +
      `==============================`;

    await safeDownloadOrViewFile({
      title: record.title || 'Arsip Simpan',
      dataUrl: fileUrl,
      filename: safeFileName,
      textContent: fileUrl ? undefined : textContent,
      mimeType:
        docType === 'document'
          ? 'application/pdf'
          : docType === 'image'
            ? 'image/jpeg'
            : docType === 'audio'
              ? 'audio/wav'
              : 'text/plain',
    });
  };

  // 3. BAGIKAN DOKUMEN + DESKRIPSI LENGKAP
  const handleShare = async () => {
    haptics.impactLight();

    const tagsStr = tags && tags.length > 0 ? tags.map((t) => `#${t.replace(/\s+/g, '')}`).join(' ') : '';
    let shareText = `📄 *${record.title}*\n` +
      `📂 Kategori: ${record.category || 'Dokumen'}\n` +
      `📅 Tanggal: ${dateVal}\n`;

    if (docType === 'receipt') {
      shareText += `💰 Nominal: Rp ${nominalVal}\n📍 Lokasi: ${locationVal}\n`;
    } else if (docType === 'document') {
      if (docNoVal) shareText += `📑 Nomor: ${docNoVal}\n`;
      if (companyVal) shareText += `🏢 Pihak: ${companyVal}\n`;
    }

    if (descriptionVal) {
      shareText += `📝 Ringkasan: ${descriptionVal}\n`;
    }

    if (tagsStr) {
      shareText += `🏷️ ${tagsStr}\n`;
    }

    const fileUrl = record.originalDataUrl || record.thumbnailDataUrl;
    const ext =
      docType === 'document'
        ? (record.originalFileName?.split('.').pop() || 'pdf')
        : docType === 'audio'
          ? 'wav'
          : docType === 'note'
            ? 'txt'
            : 'jpg';
    const safeFileName = `${record.title.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'arsip'}.${ext}`;

    await shareContent({
      title: record.title,
      text: shareText,
      dataUrl: fileUrl,
      filename: safeFileName,
      mimeType:
        docType === 'document'
          ? 'application/pdf'
          : docType === 'image'
            ? 'image/jpeg'
            : docType === 'audio'
              ? 'audio/wav'
              : 'text/plain',
    });
  };

  return (
    <div
      ref={swipeRef}
      className="h-full w-full overflow-y-auto overscroll-y-contain touch-pan-y pb-28 flex flex-col bg-gradient-to-b from-[#FDFCF9] via-[#FAF9F6] to-stone-100 font-sans text-stone-900 select-none antialiased"
    >
      {/* Visual notification when saved */}
      {showSavedToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#165a4c] text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top duration-200">
          <CheckCircle className="w-4 h-4 text-emerald-300" />
          <span>Perubahan berhasil disimpan!</span>
          <button
            onClick={() => setShowSavedToast(false)}
            className="text-white/80 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. BRANDHEADER: ALWAYS PRESENT WITH WIDE LOGO, OFFLINE BADGE & ACTIONS */}
      <BrandHeader
        onBack={handleRequestBack}
        rightElement={
          isEditing ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-xs font-semibold text-stone-500 hover:text-stone-800 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="text-xs font-extrabold text-white bg-[#165a4c] hover:bg-[#134e48] px-4 py-1.5 rounded-full shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                Simpan
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleFavorite}
                className={`w-9 h-9 flex items-center justify-center rounded-full border transition-all active:scale-90 cursor-pointer shadow-2xs ${record.isFavorite
                  ? 'bg-amber-50 border-amber-300 text-amber-500 shadow-amber-200/50'
                  : 'bg-white/90 border-stone-200/80 text-stone-400 hover:text-stone-600'
                  }`}
                aria-label="Favorit"
              >
                <Star
                  className={`w-4.5 h-4.5 ${record.isFavorite ? 'fill-amber-400 text-amber-500' : ''
                    }`}
                />
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="text-xs font-bold text-[#165a4c] bg-emerald-50 hover:bg-emerald-100 px-3.5 py-1.5 rounded-full border border-emerald-200/80 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            </div>
          )
        }
      />

      {/* VIEW MODE: SPECIALIZED PER DOCUMENT TYPE */}
      {!isEditing && (
        <div className="px-4.5 sm:px-6 md:px-8 pt-4 pb-12 space-y-5 max-w-3xl lg:max-w-4xl mx-auto w-full">
          {docType === 'audio' ? (
            <AudioDetail
              record={record}
              dateVal={dateVal}
              descriptionVal={descriptionVal}
              rawTextVal={rawTextVal}
              tags={tags}
              onOpenMoveModal={() => setIsMoveModalOpen(true)}
              onDeleteRecord={onDeleteRecord}
              onDownload={handleDownload}
              onShare={handleShare}
            />
          ) : docType === 'note' ? (
            <NoteDetail
              record={record}
              dateVal={dateVal}
              descriptionVal={descriptionVal}
              rawTextVal={rawTextVal}
              tags={tags}
              isPlayingAudio={isPlayingAudio}
              onToggleAudio={handleToggleAudio}
              onOpenMoveModal={() => setIsMoveModalOpen(true)}
              onDeleteRecord={onDeleteRecord}
              onDownload={handleDownload}
              onShare={handleShare}
            />
          ) : docType === 'image' ? (
            <ImageDetail
              record={record}
              dateVal={dateVal}
              descriptionVal={descriptionVal}
              tags={tags}
              onOpenOCRModal={() => setIsOCRModalOpen(true)}
              onOpenZoomModal={() => setIsZoomModalOpen(true)}
              onOpenMoveModal={() => setIsMoveModalOpen(true)}
              onDeleteRecord={onDeleteRecord}
              onDownload={handleDownload}
              onShare={handleShare}
            />
          ) : docType === 'document' || docType === 'scan' ? (
            <DocumentDetail
              record={record}
              dateVal={dateVal}
              docNoVal={docNoVal}
              companyVal={companyVal}
              roleVal={roleVal}
              descriptionVal={descriptionVal}
              rawTextVal={rawTextVal}
              tags={tags}
              isPlayingAudio={isPlayingAudio}
              onToggleAudio={handleToggleAudio}
              onOpenOCRModal={() => setIsOCRModalOpen(true)}
              onOpenZoomModal={() => setIsZoomModalOpen(true)}
              onOpenMoveModal={() => setIsMoveModalOpen(true)}
              onDeleteRecord={onDeleteRecord}
              onDownload={handleDownload}
              onShare={handleShare}
            />
          ) : (
            <ReceiptDetail
              record={record}
              dateVal={dateVal}
              nominalVal={nominalVal}
              locationVal={locationVal}
              descriptionVal={descriptionVal}
              rawTextVal={rawTextVal}
              tags={tags}
              isPlayingAudio={isPlayingAudio}
              onToggleAudio={handleToggleAudio}
              onOpenOCRModal={() => setIsOCRModalOpen(true)}
              onOpenZoomModal={() => setIsZoomModalOpen(true)}
              onOpenMoveModal={() => setIsMoveModalOpen(true)}
              onDeleteRecord={onDeleteRecord}
              onDownload={handleDownload}
              onShare={handleShare}
            />
          )}
        </div>
      )}

      {/* EDIT MODE (ADAPTIVE FIELDS ACCORDING TO DOCUMENT TYPE) */}
      {isEditing && (
        <div className="px-5 sm:px-6 md:px-8 pt-4 pb-12 space-y-5 max-w-3xl lg:max-w-4xl mx-auto w-full">
          {/* Thumbnail preview + Ganti Foto */}
          <div className="flex items-center gap-3">
            <div className="w-24 h-24 rounded-2xl bg-stone-100 border border-stone-200/70 overflow-hidden shrink-0 flex items-center justify-center">
              {record.type === 'audio' ? (
                <div className="w-full h-full bg-purple-50 flex items-center justify-center text-purple-600">
                  <Volume2 className="w-8 h-8" />
                </div>
              ) : isImageSource(record.originalDataUrl || record.thumbnailDataUrl, record.type) ? (
                <img
                  src={record.originalDataUrl || record.thumbnailDataUrl}
                  alt={record.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-sky-50 flex items-center justify-center text-sky-600">
                  <FileText className="w-8 h-8" />
                </div>
              )}
            </div>

            <div className="flex-1 h-24 bg-white rounded-2xl border border-dashed border-stone-300 flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-stone-50 active:scale-98 transition-all">
              <Camera className="w-5 h-5 text-stone-400" />
              <span className="text-xs font-semibold text-stone-600">Ganti Foto</span>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-3.5">
            {/* Judul * */}
            <div>
              <label className="text-xs font-bold text-stone-800">
                Judul <span className="text-rose-500">*</span>
              </label>
              <div className="mt-1 flex items-center justify-between bg-white px-3.5 py-2.5 rounded-2xl border border-stone-200/80 shadow-xs focus-within:border-[#165a4c]">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-transparent outline-none text-xs font-semibold text-stone-900"
                />
                {title && (
                  <button onClick={() => setTitle('')} className="text-stone-400">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Kategori */}
            <div>
              <label className="text-xs font-bold text-stone-800">Kategori</label>
              <div
                onClick={() => setIsMoveModalOpen(true)}
                className="mt-1 flex items-center justify-between bg-white px-3.5 py-2.5 rounded-2xl border border-stone-200/80 shadow-xs cursor-pointer hover:border-[#165a4c]"
              >
                <span className="text-xs font-semibold text-stone-900">{category}</span>
                <ChevronDown className="w-4 h-4 text-stone-400" />
              </div>
            </div>

            {/* Tag Selector */}
            <div>
              <label className="text-xs font-bold text-stone-800">Tag</label>
              <div className="mt-1 flex flex-wrap gap-1.5 p-2 bg-white rounded-2xl border border-stone-200/80 shadow-xs items-center">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                  >
                    <span>{t}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="hover:text-rose-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {!isAddingTag ? (
                  <button
                    type="button"
                    onClick={() => setIsAddingTag(true)}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 border border-stone-200 flex items-center gap-0.5 hover:bg-stone-200"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Tambah Tag</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      placeholder="Tag baru..."
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                      className="text-[10px] px-2 py-0.5 border rounded-md outline-none focus:border-[#165a4c] w-24"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="text-[10px] font-bold text-[#165a4c]"
                    >
                      OK
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAddingTag(false)}
                      className="text-[10px] text-stone-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Tanggal Disimpan */}
            <div>
              <label className="text-xs font-bold text-stone-800">Tanggal Disimpan</label>
              <div className="mt-1 flex items-center justify-between bg-white px-3.5 py-2.5 rounded-2xl border border-stone-200/80 shadow-xs">
                <input
                  type="text"
                  value={dateVal}
                  onChange={(e) => setDateVal(e.target.value)}
                  className="w-full bg-transparent outline-none text-xs font-semibold text-stone-900"
                />
              </div>
            </div>

            {/* KHUSUS STRUK: DAFTAR ITEM BELANJA & TEKS OCR */}
            {docType === 'receipt' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-800">
                    Daftar Item Belanja Struk
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setReceiptItems([
                        ...receiptItems,
                        {
                          id: 'item_' + Date.now(),
                          name: '',
                          quantity: 1,
                          unitPrice: 0,
                          totalPrice: 0,
                          isEdited: true,
                        },
                      ]);
                    }}
                    className="text-[10px] font-bold text-[#165a4c] bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200/80 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Tambah Item</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {receiptItems.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="bg-white p-2.5 rounded-2xl border border-stone-200/80 shadow-2xs flex items-center gap-2"
                    >
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 1;
                          const updated = [...receiptItems];
                          updated[idx] = { ...updated[idx], quantity: val };
                          setReceiptItems(updated);
                        }}
                        className="w-10 bg-stone-50 text-center font-mono font-bold text-xs p-1.5 rounded-xl border border-stone-200 outline-none"
                        title="Jumlah"
                      />
                      <input
                        type="text"
                        placeholder="Nama barang..."
                        value={item.name}
                        onChange={(e) => {
                          const updated = [...receiptItems];
                          updated[idx] = { ...updated[idx], name: e.target.value };
                          setReceiptItems(updated);
                        }}
                        className="flex-1 text-xs font-semibold text-stone-900 bg-transparent outline-none px-1"
                      />
                      <div className="flex items-center bg-stone-50 rounded-xl px-2 py-1 border border-stone-200/80">
                        <span className="text-[10px] font-bold text-stone-400 mr-1">Rp</span>
                        <input
                          type="number"
                          placeholder="0"
                          value={item.totalPrice || ''}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0;
                            const updated = [...receiptItems];
                            updated[idx] = { ...updated[idx], totalPrice: val };
                            setReceiptItems(updated);
                          }}
                          className="w-20 text-xs font-mono font-bold text-stone-900 bg-transparent outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setReceiptItems(receiptItems.filter((_, i) => i !== idx));
                        }}
                        className="p-1 text-stone-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {receiptItems.length === 0 && (
                    <div className="p-3 bg-stone-50 rounded-xl border border-dashed border-stone-200 text-center text-[11px] text-stone-400">
                      Belum ada item belanja. Tekan "+ Tambah Item" di atas.
                    </div>
                  )}
                </div>

                {/* Teks Asli OCR untuk Struk */}
                <div>
                  <label className="text-xs font-bold text-stone-800">
                    Teks Hasil Bacaan OCR (Raw Text)
                  </label>
                  <textarea
                    rows={4}
                    value={rawTextVal}
                    onChange={(e) => setRawTextVal(e.target.value)}
                    placeholder="Teks lengkap terbaca dari struk..."
                    className="mt-1 w-full bg-white p-3 rounded-2xl border border-stone-200/80 shadow-xs outline-none text-xs font-mono text-stone-900 focus:border-[#165a4c]"
                  />
                </div>
              </div>
            )}

            {/* FIELD KHUSUS: DOKUMEN RESMI (Nomor Dokumen & Instansi) */}
            {(docType === 'document' || docType === 'scan') && (
              <>
                <div>
                  <label className="text-xs font-bold text-stone-800">Nomor Dokumen</label>
                  <div className="mt-1 flex items-center justify-between bg-white px-3.5 py-2.5 rounded-2xl border border-stone-200/80 shadow-xs">
                    <input
                      type="text"
                      value={docNoVal}
                      onChange={(e) => setDocNoVal(e.target.value)}
                      placeholder="Contoh: PKWT/2026/IX/0892"
                      className="w-full bg-transparent outline-none text-xs font-semibold text-stone-900 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-800">Instansi / Perusahaan</label>
                  <div className="mt-1 flex items-center justify-between bg-white px-3.5 py-2.5 rounded-2xl border border-stone-200/80 shadow-xs">
                    <input
                      type="text"
                      value={companyVal}
                      onChange={(e) => setCompanyVal(e.target.value)}
                      placeholder="Contoh: PT Inovasi Digital"
                      className="w-full bg-transparent outline-none text-xs font-semibold text-stone-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-800">Jabatan / Perihal</label>
                  <div className="mt-1 flex items-center justify-between bg-white px-3.5 py-2.5 rounded-2xl border border-stone-200/80 shadow-xs">
                    <input
                      type="text"
                      value={roleVal}
                      onChange={(e) => setRoleVal(e.target.value)}
                      placeholder="Contoh: Senior Mobile Engineer / Kontrak Kerja"
                      className="w-full bg-transparent outline-none text-xs font-semibold text-stone-900"
                    />
                  </div>
                </div>
              </>
            )}

            {/* FIELD KHUSUS: CATATAN & SUARA (Isi Lengkap / Catatan Suara) */}
            {(docType === 'note' || docType === 'audio') && (
              <div>
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-stone-800">
                    {docType === 'audio' ? 'Catatan / Keterangan Rekaman' : 'Isi Lengkap Catatan'}
                  </label>
                </div>
                <textarea
                  rows={4}
                  value={rawTextVal}
                  onChange={(e) => setRawTextVal(e.target.value)}
                  placeholder="Isi catatan atau keterangan rekaman suara..."
                  className="mt-1 w-full bg-white p-3 rounded-2xl border border-stone-200/80 shadow-xs outline-none text-xs font-medium text-stone-900 focus:border-[#165a4c]"
                />
              </div>
            )}

            {/* Deskripsi / Ringkasan */}
            <div>
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-stone-800">Ringkasan Deskripsi</label>
                <span className="text-[10px] text-stone-400 font-mono">
                  {descriptionVal.length}/500
                </span>
              </div>
              <textarea
                rows={3}
                maxLength={500}
                value={descriptionVal}
                onChange={(e) => setDescriptionVal(e.target.value)}
                className="mt-1 w-full bg-white p-3 rounded-2xl border border-stone-200/80 shadow-xs outline-none text-xs font-medium text-stone-900 focus:border-[#165a4c]"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              onClick={handleSaveEdit}
              className="w-full py-3.5 px-6 rounded-full bg-[#165a4c] hover:bg-[#134e48] active:scale-98 text-white font-semibold text-sm shadow-md shadow-[#165a4c]/20 transition-all text-center cursor-pointer"
            >
              Simpan Perubahan
            </button>
          </div>
        </div>
      )}

      {/* MODAL PICKER: PINDAH KE KATEGORI / KOLEKSI LANGSUNG */}
      {isMoveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-stone-200 animate-slide-up max-h-[85vh] overflow-y-auto">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
                  <FolderInput className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-stone-900">
                    Pindah Kategori
                  </h3>
                  <p className="text-xs text-stone-400">
                    Pilih kategori atau koleksi tujuan arsip ini
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMoveModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List Kategori Standar */}
            <div className="space-y-4">
              <div>
                <h4 className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-2">
                  Kategori Sistem
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORY_OPTIONS.map((cat) => {
                    const IconComp = cat.icon;
                    const isCurrent = (record.category || 'Belanja Harian') === cat.name;
                    return (
                      <button
                        key={cat.name}
                        type="button"
                        onClick={() => handleSelectCategory(cat.name)}
                        className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${isCurrent
                          ? 'bg-emerald-50 border-[#165a4c] shadow-xs'
                          : 'bg-stone-50/60 hover:bg-white border-stone-200/80'
                          }`}
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <div
                            className={`w-7 h-7 rounded-xl bg-gradient-to-tr ${cat.gradient} text-white flex items-center justify-center shrink-0 shadow-2xs`}
                          >
                            <IconComp className="w-3.5 h-3.5" />
                          </div>
                          <span
                            className={`text-xs font-bold truncate ${isCurrent ? 'text-[#165a4c]' : 'text-stone-800'
                              }`}
                          >
                            {cat.name}
                          </span>
                        </div>
                        {isCurrent && <Check className="w-4 h-4 text-[#165a4c] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* List Koleksi Kustom Pengguna (Jika Ada) */}
              {customCollections.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-2">
                    Koleksi Kustom Anda
                  </h4>
                  <div className="space-y-2">
                    {customCollections.map((col) => {
                      const isCurrent = record.category === col.name;
                      return (
                        <button
                          key={col.id}
                          type="button"
                          onClick={() => handleSelectCategory(col.name)}
                          className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${isCurrent
                            ? 'bg-emerald-50 border-[#165a4c] shadow-xs'
                            : 'bg-stone-50/60 hover:bg-white border-stone-200/80'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${col.gradient} text-white flex items-center justify-center shrink-0 shadow-2xs`}
                            >
                              <Folder className="w-4 h-4" />
                            </div>
                            <div>
                              <h5 className="text-xs font-bold text-stone-900">
                                {col.name}
                              </h5>
                              <p className="text-[10px] text-stone-400">
                                {col.description || 'Koleksi Kustom'}
                              </p>
                            </div>
                          </div>
                          {isCurrent && <Check className="w-4 h-4 text-[#165a4c] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tambah Kategori Baru */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateCategoryModalOpen(true)}
                  className="w-full p-3 rounded-2xl border border-dashed border-stone-300 hover:border-emerald-600 hover:bg-emerald-50/50 text-stone-600 hover:text-emerald-800 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Buat Kategori / Koleksi Baru</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Category Modal */}
      <CreateCategoryModal
        isOpen={isCreateCategoryModalOpen}
        onClose={() => setIsCreateCategoryModalOpen(false)}
        onCreated={(col) => {
          setCustomCollections(getCustomCollections());
          handleSelectCategory(col.name);
        }}
      />

      {/* ZOOM MODAL: FULLSCREEN PHOTO / DOCUMENT PREVIEW */}
      {isZoomModalOpen && (
        <div
          onClick={() => setIsZoomModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fade-in select-none"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg flex flex-col max-h-[90vh]"
          >
            {/* Top Bar */}
            <div className="w-full flex items-center justify-between pb-3 text-white">
              <span className="text-sm font-bold truncate pr-2">{record.title}</span>
              <button
                type="button"
                onClick={() => setIsZoomModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Display */}
            {record.type === 'audio' ? (
              <div className="bg-[#122b24] text-white rounded-3xl p-6 shadow-2xl border border-emerald-500/30 flex flex-col items-center space-y-4 max-w-sm w-full mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center justify-center shadow-sm">
                  <Mic className="w-8 h-8 animate-pulse" />
                </div>
                <div className="text-center w-full">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider mb-2 bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                    Memo Suara Offline
                  </span>
                  <h3 className="text-base font-extrabold text-white truncate">{record.title}</h3>
                  <p className="text-xs text-emerald-200/80 mt-1">
                    {record.summary || 'Berkas rekaman suara tersimpan aman secara offline.'}
                  </p>
                </div>
                {record.rawText && (
                  <div className="w-full bg-white/10 rounded-2xl p-4 border border-white/15 text-xs text-emerald-50 leading-relaxed font-sans max-h-48 overflow-y-auto whitespace-pre-line text-left">
                    <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider mb-1">
                      Catatan / Keterangan
                    </p>
                    {record.rawText}
                  </div>
                )}
              </div>
            ) : isImageSource(record.originalDataUrl || record.thumbnailDataUrl, record.type) ? (
              <div className="flex-1 overflow-auto flex items-center justify-center">
                <img
                  src={record.originalDataUrl || record.thumbnailDataUrl}
                  alt={record.title}
                  className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
                />
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-4 shadow-2xl border border-stone-200 flex flex-col items-center text-stone-900 space-y-3 max-h-[85vh] overflow-y-auto w-full">
                <DocumentMultiPageViewer record={record} className="border-0 shadow-none p-0" />

                {/* Action Buttons */}
                <div className="w-full flex items-center gap-2 pt-2 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsZoomModalOpen(false);
                      handleDownload();
                    }}
                    className="flex-1 py-3 px-4 rounded-xl bg-[#165a4c] hover:bg-[#11473c] active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Buka / Unduh Berkas</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsZoomModalOpen(false);
                      handleShare();
                    }}
                    className="py-3 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-800 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-stone-200"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Bagikan</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* OCR Scanner Modal */}
      <OCRScannerModal
        isOpen={isOCRModalOpen}
        onClose={() => setIsOCRModalOpen(false)}
        rawText={rawTextVal}
        imageSource={record.originalDataUrl || record.thumbnailDataUrl}
        title={record.title}
        onSaveText={(newText) => {
          setRawTextVal(newText);
          onUpdateRecord({
            ...record,
            rawText: newText,
          });
        }}
      />
    </div>
  );
};
