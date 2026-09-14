import React, { useState } from 'react';
import {
  X,
  Folder,
  ShoppingBag,
  FileText,
  Heart,
  Briefcase,
  Wallet,
  Car,
  Home as HomeIcon,
  Sparkles,
  Utensils,
  Plane,
  Coffee,
  Check,
} from 'lucide-react';
import { createCustomCollection, CustomCollection } from '../../services/collectionService';
import { haptics } from '../../utils/haptics';

export interface CreateCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (collection: CustomCollection) => void;
}

const ICON_LIST = [
  { id: 'folder', label: 'Folder', icon: Folder },
  { id: 'file', label: 'Dokumen', icon: FileText },
  { id: 'shopping', label: 'Belanja', icon: ShoppingBag },
  { id: 'wallet', label: 'Keuangan', icon: Wallet },
  { id: 'briefcase', label: 'Kerja', icon: Briefcase },
  { id: 'heart', label: 'Pribadi', icon: Heart },
  { id: 'car', label: 'Kendaraan', icon: Car },
  { id: 'home', label: 'Rumah', icon: HomeIcon },
  { id: 'sparkles', label: 'Ide', icon: Sparkles },
  { id: 'coffee', label: 'Hobi', icon: Coffee },
  { id: 'utensils', label: 'Kuliner', icon: Utensils },
  { id: 'plane', label: 'Liburan', icon: Plane },
];

const COLOR_LIST = [
  { id: 'emerald', name: 'Zamrud', gradient: 'from-emerald-500 to-teal-700', bg: 'bg-emerald-500' },
  { id: 'sky', name: 'Samudra', gradient: 'from-sky-500 to-blue-600', bg: 'bg-sky-500' },
  { id: 'amber', name: 'Emas', gradient: 'from-amber-500 to-orange-600', bg: 'bg-amber-500' },
  { id: 'rose', name: 'Mawar', gradient: 'from-rose-500 to-red-600', bg: 'bg-rose-500' },
  { id: 'purple', name: 'Anggur', gradient: 'from-purple-500 to-indigo-600', bg: 'bg-purple-500' },
  { id: 'stone', name: 'Granit', gradient: 'from-stone-600 to-stone-800', bg: 'bg-stone-600' },
];

export const CreateCategoryModal: React.FC<CreateCategoryModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  if (!isOpen) return null;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('folder');
  const [selectedColor, setSelectedColor] = useState(COLOR_LIST[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    haptics.notificationSuccess();
    const created = createCustomCollection({
      name: name.trim(),
      description: description.trim(),
      icon: selectedIcon,
      color: selectedColor.id,
      gradient: selectedColor.gradient,
    });

    onCreated(created);
    onClose();
    setName('');
    setDescription('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-stone-200/90 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${selectedColor.gradient} text-white flex items-center justify-center shadow-xs`}>
              <Folder className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-stone-900">Tambah Kategori Baru</h3>
              <p className="text-[10px] text-stone-500">Kelompokkan arsip dan dokumen Anda</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name Field */}
          <div>
            <label className="block text-xs font-bold text-stone-800 mb-1">
              Nama Kategori <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Pajak & Legal, Proyek 2026..."
              className="w-full px-3.5 py-2.5 bg-stone-50 rounded-xl border border-stone-200 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/10 outline-none text-xs font-semibold text-stone-900 transition-all"
              autoFocus
            />
          </div>

          {/* Description Field */}
          <div>
            <label className="block text-xs font-bold text-stone-800 mb-1">
              Keterangan <span className="text-stone-400 font-normal">(Opsional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deskripsi singkat kumpulan dokumen ini..."
              className="w-full px-3.5 py-2.5 bg-stone-50 rounded-xl border border-stone-200 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/10 outline-none text-xs text-stone-900 transition-all"
            />
          </div>

          {/* Icon Selector */}
          <div>
            <label className="block text-xs font-bold text-stone-800 mb-1.5">
              Pilih Ikon
            </label>
            <div className="grid grid-cols-6 gap-2">
              {ICON_LIST.map((item) => {
                const Icon = item.icon;
                const isSelected = selectedIcon === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedIcon(item.id)}
                    className={`p-2.5 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-600 shadow-xs scale-105'
                        : 'bg-stone-100/70 text-stone-600 hover:bg-stone-200/70'
                    }`}
                    title={item.label}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Selector */}
          <div>
            <label className="block text-xs font-bold text-stone-800 mb-1.5">
              Warna Tema
            </label>
            <div className="flex items-center gap-2">
              {COLOR_LIST.map((c) => {
                const isSelected = selectedColor.id === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedColor(c)}
                    className={`w-7 h-7 rounded-full ${c.bg} flex items-center justify-center transition-all cursor-pointer ${
                      isSelected ? 'ring-2 ring-offset-2 ring-stone-800 scale-110' : 'hover:opacity-90'
                    }`}
                    title={c.name}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-5 py-2 rounded-xl bg-[#165a4c] hover:bg-[#124b3f] active:scale-95 text-white font-bold text-xs shadow-md shadow-emerald-900/20 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Simpan Kategori</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
