import React, { useState, useEffect } from 'react';
import {
  Home,
  Search,
  Clock,
  Folder,
  Camera,
  Upload,
  FileText,
  Mic,
  Lock,
  Receipt,
  FileCode,
  Image,
  Star,
  Trash2,
  Plus,
  Tag,
  Sparkles,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { TabType } from './TabBar';
import { haptics } from '../../utils/haptics';
import { BrandAvatar } from '../ui/BrandAvatar';
import { ArchiveRecord } from '../../types/record';
import { CustomCollection, getCustomCollections } from '../../services/collectionService';

export interface DesktopSidebarProps {
  currentTab: TabType;
  onChangeTab: (tab: TabType) => void;
  onOpenCapture: (type?: 'camera' | 'upload' | 'note' | 'voice') => void;
  onOpenProfile: () => void;
  onLockApp: () => void;
  recordCount?: number;
  trashCount?: number;
  activeCategory?: string | null;
  onSelectCategory?: (categoryId: string) => void;
  onAddCategory?: () => void;
  records?: ArchiveRecord[];
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  currentTab,
  onChangeTab,
  onOpenCapture,
  onOpenProfile,
  onLockApp,
  recordCount = 0,
  trashCount = 0,
  activeCategory = null,
  onSelectCategory,
  onAddCategory,
  records = [],
}) => {
  const [customCols, setCustomCols] = useState<CustomCollection[]>([]);

  useEffect(() => {
    setCustomCols(getCustomCollections());
  }, [records]);

  const navItems = [
    { id: 'home' as TabType, label: 'Beranda', icon: Home },
    { id: 'search' as TabType, label: 'Pencarian', icon: Search },
    { id: 'timeline' as TabType, label: 'Linimasa', icon: Clock },
    { id: 'collections' as TabType, label: 'Koleksi & Kategori', icon: Folder, count: recordCount },
  ];

  // Calculate counts
  const strukCount = records.filter((r) => r.type === 'receipt').length;
  const dokumenCount = records.filter((r) => r.type === 'document').length;
  const fotoCount = records.filter((r) => r.type === 'image' || r.type === 'scan').length;
  const catatanCount = records.filter((r) => r.type === 'note').length;
  const audioCount = records.filter((r) => r.type === 'audio').length;
  const favoritCount = records.filter((r) => r.isFavorite).length;

  const categories = [
    { id: 'receipt', label: 'Struk & Transaksi', icon: Receipt, color: 'text-amber-600', count: strukCount },
    { id: 'document', label: 'Dokumen & Surat', icon: FileCode, color: 'text-blue-600', count: dokumenCount },
    { id: 'image', label: 'Foto & Galeri', icon: Image, color: 'text-purple-600', count: fotoCount },
    { id: 'note', label: 'Catatan Tulisan', icon: FileText, color: 'text-emerald-600', count: catatanCount },
    { id: 'audio', label: 'Catatan Suara', icon: Mic, color: 'text-rose-600', count: audioCount },
    { id: 'favorite', label: 'Favorit', icon: Star, color: 'text-amber-500', count: favoritCount },
  ];

  const handleCategoryClick = (catId: string) => {
    haptics.impactLight();
    if (onSelectCategory) {
      onSelectCategory(catId);
    } else {
      onChangeTab('collections');
    }
  };

  return (
    <aside className="hidden md:flex flex-col w-64 lg:w-72 h-full bg-[#FAF9F6] border-r border-stone-200/90 select-none shrink-0 z-30 justify-between">
      {/* Top Brand Header */}
      <div className="p-5 border-b border-stone-200/70 bg-white/70 backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0d3b31] to-[#165a4c] text-white flex items-center justify-center shadow-md shadow-emerald-900/20">
              <span className="font-extrabold text-base tracking-wider">S</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-extrabold text-sm tracking-tight text-stone-900">SIMPAN</h1>
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[9px]">
                  Desktop
                </span>
              </div>
              <p className="text-[10px] text-stone-400 font-medium leading-none mt-0.5">
                Personal Digital Archive
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onLockApp}
            title="Kunci Aplikasi"
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Capture Action Button */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => onOpenCapture('camera')}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-tr from-[#165a4c] to-emerald-600 hover:from-[#124b3f] hover:to-emerald-700 active:scale-[0.98] text-white font-bold text-xs shadow-md shadow-[#165a4c]/20 transition-all cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Pindai Dokumen Baru</span>
          </button>

          {/* Quick Sub Actions */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => onOpenCapture('upload')}
              className="py-1.5 px-2 rounded-lg bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 text-[11px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer"
              title="Unggah Berkas (PDF/Foto)"
            >
              <Upload className="w-3.5 h-3.5 text-stone-500" />
              <span>Berkas</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenCapture('note')}
              className="py-1.5 px-2 rounded-lg bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 text-[11px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer"
              title="Tulis Catatan Cepat"
            >
              <FileText className="w-3.5 h-3.5 text-stone-500" />
              <span>Catatan</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenCapture('voice')}
              className="py-1.5 px-2 rounded-lg bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 text-[11px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer"
              title="Rekam Catatan Suara"
            >
              <Mic className="w-3.5 h-3.5 text-stone-500" />
              <span>Suara</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        <div>
          <span className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
            Navigasi Utama
          </span>
          <nav className="mt-2 space-y-1">
            {navItems.map((item) => {
              const isActive = currentTab === item.id && (!activeCategory || item.id === 'collections');
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    haptics.impactLight();
                    onChangeTab(item.id);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-800/10 text-[#165a4c] font-bold border border-emerald-800/20'
                      : 'text-stone-600 hover:bg-stone-200/60 hover:text-stone-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#165a4c]' : 'text-stone-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-200/70 text-stone-600 font-bold">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Quick Category Filters */}
        <div>
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
              Kategori Arsip
            </span>
            {onAddCategory && (
              <button
                type="button"
                onClick={() => {
                  haptics.impactLight();
                  onAddCategory();
                }}
                className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-0.5 cursor-pointer"
                title="Tambah Kategori Baru"
              >
                <Plus className="w-3 h-3" />
                <span>Tambah</span>
              </button>
            )}
          </div>

          <div className="space-y-0.5 text-xs font-medium">
            {categories.map((cat) => {
              const isCatActive = activeCategory === cat.id;
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategoryClick(cat.id)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg transition-all text-left cursor-pointer ${
                    isCatActive
                      ? 'bg-emerald-100/70 text-emerald-900 font-bold border border-emerald-200'
                      : 'text-stone-600 hover:bg-stone-200/60 hover:text-stone-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`w-3.5 h-3.5 ${cat.color}`} />
                    <span>{cat.label}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-stone-200/60 text-stone-500 font-semibold">
                    {cat.count}
                  </span>
                </button>
              );
            })}

            {/* Custom Collections Created by User */}
            {customCols.map((col) => {
              const isColActive = activeCategory === col.id;
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => handleCategoryClick(col.id)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg transition-all text-left cursor-pointer ${
                    isColActive
                      ? 'bg-emerald-100/70 text-emerald-900 font-bold border border-emerald-200'
                      : 'text-stone-600 hover:bg-stone-200/60 hover:text-stone-900'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Folder className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span className="truncate">{col.name}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-stone-200/60 text-stone-500 font-semibold shrink-0">
                    {col.recordIds?.length || 0}
                  </span>
                </button>
              );
            })}

            {/* Add Category Prompt Button */}
            {onAddCategory && (
              <button
                type="button"
                onClick={onAddCategory}
                className="w-full mt-2 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-dashed border-stone-300 hover:border-emerald-500 hover:bg-emerald-50/50 text-stone-500 hover:text-emerald-700 text-xs font-semibold transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Kategori Baru</span>
              </button>
            )}

            {trashCount > 0 && (
              <button
                onClick={() => onChangeTab('collections')}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-rose-50 text-rose-600 transition-colors text-left font-semibold mt-2"
              >
                <div className="flex items-center gap-2">
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Sampah</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700">
                  {trashCount}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Profile Bar */}
      <div className="p-3 border-t border-stone-200/70 bg-white/50 backdrop-blur-md">
        <button
          type="button"
          onClick={onOpenProfile}
          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-stone-200/60 active:scale-[0.99] transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <BrandAvatar size="sm" onClick={onOpenProfile} />
            <div className="text-left">
              <span className="block text-xs font-bold text-stone-900 leading-tight">Pengaturan</span>
              <span className="block text-[10px] text-stone-500">Profil & Keamanan</span>
            </div>
          </div>
          <span className="text-[10px] font-bold text-[#165a4c]">Buka ➔</span>
        </button>
      </div>
    </aside>
  );
};
