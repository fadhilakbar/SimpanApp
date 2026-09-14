import React, { useState } from 'react';
import {
  X,
  Check,
  Calendar,
  Tag as TagIcon,
  ShoppingBag,
  Plus,
  Trash2,
  AlertCircle,
  FileText,
  FileCode,
  FileSpreadsheet,
  ChevronDown,
  Maximize2,
  Sparkles,
  Mic,
  Volume2,
  Play,
  Pause,
} from 'lucide-react';
import { ArchiveRecord, ReceiptItem } from '../../types/record';
import { haptics } from '../../utils/haptics';
import { showConfirm } from '../../utils/swal';
import { BrandLoader } from '../ui';
import { isImageSource, getFileKind } from '../../utils/fileExport';

import { getAllCategories, addQuickCategory } from '../../services/collectionService';

export interface DraftRecordReviewModalProps {
  draft: ArchiveRecord;
  isOpen: boolean;
  onConfirmSave: (finalRecord: ArchiveRecord) => Promise<void>;
  onCancel: () => void;
}

export const DraftRecordReviewModal: React.FC<DraftRecordReviewModalProps> = ({
  draft,
  isOpen,
  onConfirmSave,
  onCancel,
}) => {
  if (!isOpen) return null;

  // Form Fields
  const [title, setTitle] = useState<string>(draft.title || '');
  const [category, setCategory] = useState<string>(draft.category || 'Dokumen & Surat');
  const [categoriesList, setCategoriesList] = useState<string[]>(() => getAllCategories());
  const [isAddingNewCategory, setIsAddingNewCategory] = useState<boolean>(false);
  const [customCategoryInput, setCustomCategoryInput] = useState<string>('');
  const [tags, setTags] = useState<string[]>(draft.tags && draft.tags.length > 0 ? draft.tags : ['Arsip']);
  const [newTagInput, setNewTagInput] = useState<string>('');
  const [isAddingTag, setIsAddingTag] = useState<boolean>(false);
  const [rawText, setRawText] = useState<string>(draft.rawText || '');
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>(draft.receiptItems || []);
  const [summary, setSummary] = useState<string>(draft.summary || '');

  // Validation & Saving State (Anti Double-Tap)
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isZoomingImage, setIsZoomingImage] = useState<boolean>(false);
  const [showOCRDetails, setShowOCRDetails] = useState<boolean>(false);

  const docType = draft.type || 'document';
  const previewImage = draft.originalDataUrl || draft.thumbnailDataUrl;

  const handleAddTag = () => {
    const trimmed = newTagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setNewTagInput('');
      setIsAddingTag(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleAddItem = () => {
    haptics.impactLight();
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
  };

  const handleRemoveItem = (idx: number) => {
    haptics.impactLight();
    setReceiptItems(receiptItems.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, field: keyof ReceiptItem, value: any) => {
    const updated = [...receiptItems];
    updated[idx] = { ...updated[idx], [field]: value };
    setReceiptItems(updated);
  };

  const handleCancel = async () => {
    haptics.impactLight();
    const confirmed = await showConfirm({
      title: 'Batalkan Penyimpanan?',
      text: 'Data draf dan hasil pemindaian belum disimpan. Yakin ingin membuang draf ini?',
      confirmText: 'Ya, Buang',
      isDestructive: true,
    });
    if (confirmed) {
      onCancel();
    }
  };

  const handleSave = async () => {
    if (isSaving) return; // Anti-double-tap protection

    // Validation: Judul wajib diisi
    if (!title.trim()) {
      haptics.notificationWarning();
      setErrorMessage('Judul arsip wajib diisi sebelum menyimpan.');
      return;
    }

    setErrorMessage('');
    setIsSaving(true);
    haptics.impactMedium();

    try {
      const finalRecord: ArchiveRecord = {
        ...draft,
        title: title.trim(),
        category,
        tags,
        rawText,
        summary: summary || (rawText ? rawText.slice(0, 120) : draft.summary || ''),
        receiptItems: docType === 'receipt' ? receiptItems : draft.receiptItems,
        updatedAt: new Date().toISOString(),
      };

      await onConfirmSave(finalRecord);
    } catch (err) {
      console.error('Failed to save record:', err);
      setIsSaving(false);
      setErrorMessage('Terjadi kesalahan saat menyimpan berkas.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 select-none">
      {/* Zoom Modal if clicked */}
      {isZoomingImage && previewImage && (
        <div
          onClick={() => setIsZoomingImage(false)}
          className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer select-none animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg flex flex-col max-h-[90vh]"
          >
            {/* Top Bar */}
            <div className="w-full flex items-center justify-between pb-3 text-white">
              <span className="text-sm font-bold truncate pr-2">
                {title || draft.title || 'Pratinjau Berkas'}
              </span>
              <button
                type="button"
                onClick={() => setIsZoomingImage(false)}
                className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Preview */}
            {docType === 'audio' || draft.type === 'audio' || getFileKind(previewImage, docType) === 'audio' ? (
              <div className="bg-[#122b24] text-white rounded-3xl p-6 shadow-2xl border border-emerald-500/30 flex flex-col items-center space-y-4 max-h-[80vh] overflow-y-auto w-full">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center justify-center shadow-sm">
                  <Mic className="w-8 h-8 animate-pulse" />
                </div>
                <div className="text-center w-full">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider mb-2 bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                    Rekaman Suara Nyata
                  </span>
                  <h3 className="text-base font-extrabold text-white truncate">
                    {title || draft.title || 'Catatan Suara'}
                  </h3>
                  <p className="text-xs text-emerald-200/80 mt-1">
                    {summary || draft.summary || 'Berkas audio asli tersimpan aman di perangkat.'}
                  </p>
                </div>
                {(rawText || draft.rawText) && (
                  <div className="w-full bg-white/10 rounded-2xl p-4 border border-white/15 text-xs text-emerald-50 leading-relaxed font-sans max-h-48 overflow-y-auto whitespace-pre-line text-left">
                    <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider mb-1">
                      Keterangan / Catatan Suara
                    </p>
                    {rawText || draft.rawText}
                  </div>
                )}
              </div>
            ) : isImageSource(previewImage, docType) ? (
              <div className="flex-1 overflow-auto flex items-center justify-center">
                <img
                  src={previewImage}
                  alt="Preview Dokumen"
                  className="max-h-[80vh] max-w-full object-contain rounded-2xl shadow-2xl"
                />
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-6 shadow-2xl border border-stone-200 flex flex-col items-center text-stone-900 space-y-4 max-h-[80vh] overflow-y-auto">
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm ${
                    getFileKind(previewImage, docType) === 'pdf'
                      ? 'bg-rose-50 text-rose-600 border border-rose-100'
                      : getFileKind(previewImage, docType) === 'excel'
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                      : 'bg-sky-50 text-sky-600 border border-sky-100'
                  }`}
                >
                  {getFileKind(previewImage, docType) === 'pdf' ? (
                    <FileCode className="w-8 h-8" />
                  ) : getFileKind(previewImage, docType) === 'excel' ? (
                    <FileSpreadsheet className="w-8 h-8" />
                  ) : (
                    <FileText className="w-8 h-8" />
                  )}
                </div>

                <div className="text-center w-full">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider mb-2 ${
                      getFileKind(previewImage, docType) === 'pdf'
                        ? 'bg-rose-100/70 text-rose-800'
                        : getFileKind(previewImage, docType) === 'excel'
                        ? 'bg-emerald-100/70 text-emerald-800'
                        : 'bg-sky-100/70 text-sky-800'
                    }`}
                  >
                    {getFileKind(previewImage, docType) === 'pdf'
                      ? 'Dokumen PDF'
                      : getFileKind(previewImage, docType) === 'excel'
                      ? 'Lembar Kerja Excel'
                      : 'Dokumen Terlampir'}
                  </span>
                  <h3 className="text-base font-extrabold text-stone-900 truncate">
                    {title || draft.title || 'Berkas Dokumen'}
                  </h3>
                  <p className="text-xs text-stone-500 mt-1">
                    {summary || draft.summary || 'Berkas dokumen tersimpan siap diarsipkan.'}
                  </p>
                </div>

                {/* Text excerpt preview */}
                {(rawText || draft.rawText) && (
                  <div className="w-full bg-stone-50 rounded-2xl p-4 border border-stone-200 text-xs text-stone-700 leading-relaxed font-sans max-h-48 overflow-y-auto whitespace-pre-line text-left">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                      Kutipan Teks Hasil Pindai
                    </p>
                    {rawText || draft.rawText}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setIsZoomingImage(false)}
                  className="w-full py-3 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <span>Tutup Pratinjau</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Bottom Sheet / Modal */}
      <div className="w-full max-w-lg max-h-[92vh] flex flex-col bg-[#FDFCF9] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-stone-200/90 overflow-hidden animate-in slide-in-from-bottom duration-250">
        {/* Header */}
        <div className="px-5 py-4 bg-white border-b border-stone-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-stone-900">Review & Periksa Draf</h2>
              <p className="text-[10px] text-stone-500 font-medium">
                Periksa dan edit hasil pemindaian sebelum disimpan ke arsip
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors disabled:opacity-50"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Error message alert */}
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 rounded-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Photo / Document / Audio Preview */}
          {previewImage && (
            <div className="w-full bg-stone-100 rounded-2xl p-2 border border-stone-200 flex items-center gap-3">
              <div
                onClick={() => setIsZoomingImage(true)}
                className="w-20 h-20 rounded-xl overflow-hidden bg-white border border-stone-200 shrink-0 relative group cursor-pointer flex items-center justify-center"
              >
                {docType === 'audio' || draft.type === 'audio' || getFileKind(previewImage, docType) === 'audio' ? (
                  <div className="w-full h-full bg-purple-50 flex flex-col items-center justify-center text-purple-600 p-1">
                    <Mic className="w-7 h-7 mb-0.5" />
                    <span className="text-[9px] font-black uppercase tracking-wider">Audio</span>
                  </div>
                ) : isImageSource(previewImage, docType) ? (
                  <img
                    src={previewImage}
                    alt="Thumbnail"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div
                    className={`w-full h-full flex flex-col items-center justify-center p-1.5 text-center ${
                      getFileKind(previewImage, docType) === 'pdf'
                        ? 'bg-rose-50 text-rose-600'
                        : getFileKind(previewImage, docType) === 'excel'
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-sky-50 text-sky-600'
                    }`}
                  >
                    {getFileKind(previewImage, docType) === 'pdf' ? (
                      <FileCode className="w-6 h-6 mb-0.5" />
                    ) : getFileKind(previewImage, docType) === 'excel' ? (
                      <FileSpreadsheet className="w-6 h-6 mb-0.5" />
                    ) : (
                      <FileText className="w-6 h-6 mb-0.5" />
                    )}
                    <span className="text-[9px] font-black uppercase tracking-wider">
                      {getFileKind(previewImage, docType)}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Maximize2 className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <span
                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${
                    docType === 'audio' || draft.type === 'audio' || getFileKind(previewImage, docType) === 'audio'
                      ? 'bg-purple-50 text-purple-800 border-purple-200'
                      : docType === 'receipt'
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}
                >
                  {docType === 'audio' || draft.type === 'audio' || getFileKind(previewImage, docType) === 'audio'
                    ? 'Rekaman Suara'
                    : docType === 'receipt'
                    ? 'Struk Belanja'
                    : 'Dokumen Arsip'}
                </span>
                <p className="text-xs font-bold text-stone-800 truncate mt-1">
                  {docType === 'audio' || draft.type === 'audio' || getFileKind(previewImage, docType) === 'audio'
                    ? 'Berkas Audio Terlampir'
                    : 'Foto / Berkas Terlampir'}
                </p>
                <button
                  type="button"
                  onClick={() => setIsZoomingImage(true)}
                  className="text-[11px] text-emerald-700 font-bold hover:underline mt-0.5 flex items-center gap-1 cursor-pointer"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>Ketuk untuk pratinjau</span>
                </button>
              </div>
            </div>
          )}

          {/* Judul Dokumen (Wajib) */}
          <div>
            <label className="text-xs font-bold text-stone-800 flex items-center justify-between">
              <span>
                Judul Arsip <span className="text-rose-500">*</span>
              </span>
              <span className="text-[10px] text-stone-400 font-normal">Wajib diisi</span>
            </label>
            <div className="mt-1 flex items-center bg-white px-3.5 py-2.5 rounded-2xl border border-stone-200 shadow-2xs focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/10 transition-all">
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder="Contoh: Belanja Bulanan / Kontrak Kerja..."
                className="w-full bg-transparent outline-none text-xs font-bold text-stone-900 placeholder:text-stone-400"
                autoFocus
              />
              {title && (
                <button
                  type="button"
                  onClick={() => setTitle('')}
                  className="text-stone-400 hover:text-stone-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Kategori & Tag Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Kategori */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-800">Kategori</label>
                <button
                  type="button"
                  onClick={() => setIsAddingNewCategory(!isAddingNewCategory)}
                  className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
                >
                  {isAddingNewCategory ? 'Pilih dari List' : '+ Kategori Baru'}
                </button>
              </div>

              {isAddingNewCategory ? (
                <div className="mt-1 flex items-center gap-1.5">
                  <input
                    type="text"
                    value={customCategoryInput}
                    onChange={(e) => setCustomCategoryInput(e.target.value)}
                    placeholder="Ketik kategori baru..."
                    className="flex-1 bg-white px-3 py-2 rounded-xl border border-emerald-500 shadow-2xs text-xs font-bold text-stone-900 outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customCategoryInput.trim()) {
                        const newCat = addQuickCategory(customCategoryInput.trim());
                        setCategoriesList(getAllCategories());
                        setCategory(newCat);
                        setCustomCategoryInput('');
                        setIsAddingNewCategory(false);
                        haptics.notificationSuccess();
                      }
                    }}
                    className="px-2.5 py-2 bg-[#165a4c] text-white text-xs font-bold rounded-xl"
                  >
                    Simpan
                  </button>
                </div>
              ) : (
                <div className="mt-1 relative">
                  <select
                    value={category}
                    onChange={(e) => {
                      if (e.target.value === '__add_new__') {
                        setIsAddingNewCategory(true);
                      } else {
                        setCategory(e.target.value);
                      }
                    }}
                    className="w-full appearance-none bg-white px-3.5 py-2.5 rounded-2xl border border-stone-200 shadow-2xs text-xs font-semibold text-stone-900 outline-none focus:border-emerald-600 cursor-pointer"
                  >
                    {categoriesList.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="__add_new__">+ Tambah Kategori Baru...</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-stone-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              )}
            </div>

            {/* Tag */}
            <div>
              <label className="text-xs font-bold text-stone-800">Tag</label>
              <div className="mt-1 flex flex-wrap gap-1 p-2 bg-white rounded-2xl border border-stone-200 shadow-2xs min-h-[42px] items-center">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700"
                  >
                    <span>#{t}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="hover:text-rose-600"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}

                {!isAddingTag ? (
                  <button
                    type="button"
                    onClick={() => setIsAddingTag(true)}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 flex items-center gap-0.5"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    <span>Tag</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      placeholder="Tag..."
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                      className="text-[10px] px-1.5 py-0.5 border rounded-md outline-none w-16"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="text-[10px] font-bold text-emerald-700"
                    >
                      OK
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Collapsible Accordion: Detail Hasil OCR & Ekstraksi (Opsional) */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowOCRDetails(!showOCRDetails)}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-stone-100/80 hover:bg-stone-200/70 border border-stone-200/80 text-xs font-bold text-stone-700 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Lihat Detail Hasil OCR & Item (Opsional)</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-stone-500 transition-transform duration-200 ${showOCRDetails ? 'rotate-180' : ''}`} />
            </button>

            {showOCRDetails && (
              <div className="mt-3 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* KHUSUS STRUK: DAFTAR ITEM BELANJA TERSTRUKTUR */}
                {docType === 'receipt' && (
                  <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                          <ShoppingBag className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-stone-900">Daftar Item Struk Belanja</h4>
                          <p className="text-[10px] text-stone-400">Rincian barang & harga dari struk</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Tambah Item</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {receiptItems.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          className="p-2 bg-stone-50 rounded-xl border border-stone-200/80 flex items-center gap-2"
                        >
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(idx, 'quantity', parseInt(e.target.value, 10) || 1)
                            }
                            className="w-10 bg-white text-center font-mono font-bold text-xs p-1 rounded-lg border border-stone-200 outline-none"
                            title="Jumlah (Qty)"
                          />
                          <input
                            type="text"
                            placeholder="Nama barang..."
                            value={item.name}
                            onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                            className="flex-1 text-xs font-semibold text-stone-900 bg-transparent outline-none px-1"
                          />
                          <div className="flex items-center bg-white rounded-lg px-2 py-1 border border-stone-200">
                            <span className="text-[10px] font-bold text-stone-400 mr-1">Rp</span>
                            <input
                              type="number"
                              placeholder="0"
                              value={item.totalPrice || ''}
                              onChange={(e) =>
                                handleItemChange(idx, 'totalPrice', parseInt(e.target.value, 10) || 0)
                              }
                              className="w-20 text-xs font-mono font-bold text-stone-900 bg-transparent outline-none"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-stone-400 hover:text-rose-600 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      {receiptItems.length === 0 && (
                        <div className="py-3 text-center text-xs text-stone-400 italic bg-stone-50 rounded-xl border border-dashed border-stone-200">
                          Tidak ada item struk yang terdeteksi otomatis. Tekan "+ Tambah Item" jika ingin mencatat rincian barang.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TEKS HASIL BACA OCR (RAW TEXT) */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-stone-500" />
                      <span>Teks Hasil Bacaan OCR</span>
                    </label>
                    <span className="text-[10px] text-stone-400">Dapat disesuaikan secara manual</span>
                  </div>
                  <textarea
                    rows={4}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="Teks dokumen yang dibaca OCR atau ketik manual..."
                    className="mt-1 w-full bg-white p-3 rounded-2xl border border-stone-200 shadow-2xs outline-none text-xs font-mono text-stone-800 leading-relaxed focus:border-emerald-600"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-white border-t border-stone-100 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className="px-4 py-2.5 rounded-full text-xs font-bold text-stone-600 hover:bg-stone-100 active:scale-95 transition-all disabled:opacity-50"
          >
            Batalkan
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 flex items-center justify-center gap-2 bg-[#165a4c] hover:bg-[#134e48] active:scale-98 text-white px-5 py-3 rounded-full text-xs font-black shadow-md shadow-emerald-900/20 transition-all disabled:opacity-60 cursor-pointer"
          >
            {isSaving ? (
              <>
                <BrandLoader mode="inline" size="sm" />
                <span>Menyimpan ke Arsip...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Simpan ke Arsip</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
