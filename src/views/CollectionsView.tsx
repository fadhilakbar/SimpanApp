import React, { useState, useMemo, useEffect } from 'react';
import {
  FolderPlus,
  ShoppingBag,
  FileText,
  PenLine,
  Image as ImageIcon,
  Briefcase,
  Home as HomeIcon,
  Car,
  Wallet,
  Sparkles,
  Calendar,
  ShieldCheck,
  Coins,
  ChevronRight,
  ChevronLeft,
  MoreHorizontal,
  Folder,
  Heart,
  Coffee,
  Utensils,
  Plane,
  X,
  ArrowLeft,
  Trash2,
  Check,
  Plus,
} from 'lucide-react';
import { ArchiveRecord } from '../types/record';
import { formatDeviceDate, formatDeviceDateTime } from '../utils/dateFormatter';
import {
  CustomCollection,
  getCustomCollections,
  createCustomCollection,
  deleteCustomCollection,
} from '../services/collectionService';
import { getPaginatedRecords, PaginatedResult } from '../services/db';
import { haptics } from '../utils/haptics';
import { showConfirm } from '../utils/swal';
import { RecordThumbnail } from '../components/record/RecordThumbnail';
import { BrandLoader } from '../components/ui/BrandLoader';
import { useSwipeBack } from '../utils/useSwipeBack';

export interface CollectionsViewProps {
  records: ArchiveRecord[];
  loading?: boolean;
  deletedRecords?: ArchiveRecord[];
  onSelectRecord: (record: ArchiveRecord) => void;
  onRestoreRecord?: (id: string) => void;
  onPermanentDelete?: (id: string) => void;
  onClearTrash?: () => void;
  onOpenSettings?: () => void;
  onOpenAvatar?: () => void;
}

// Icon dictionary for collections
const ICON_OPTIONS = [
  { id: 'folder', label: 'Folder', icon: Folder },
  { id: 'heart', label: 'Favorit', icon: Heart },
  { id: 'briefcase', label: 'Kerja', icon: Briefcase },
  { id: 'shopping', label: 'Belanja', icon: ShoppingBag },
  { id: 'wallet', label: 'Keuangan', icon: Wallet },
  { id: 'file', label: 'Dokumen', icon: FileText },
  { id: 'car', label: 'Kendaraan', icon: Car },
  { id: 'home', label: 'Rumah', icon: HomeIcon },
  { id: 'sparkles', label: 'Ide', icon: Sparkles },
  { id: 'utensils', label: 'Kuliner', icon: Utensils },
  { id: 'plane', label: 'Liburan', icon: Plane },
  { id: 'coffee', label: 'Hobi', icon: Coffee },
];

// Color & Gradient presets
const COLOR_PRESETS = [
  {
    id: 'emerald',
    name: 'Zamrud',
    gradient: 'from-emerald-500 to-teal-700',
    bgLight: 'bg-emerald-50 border-emerald-200/80',
    textColor: 'text-emerald-700',
    dot: 'bg-emerald-600',
  },
  {
    id: 'rose',
    name: 'Mawar',
    gradient: 'from-rose-500 to-red-600',
    bgLight: 'bg-rose-50 border-rose-200/80',
    textColor: 'text-rose-700',
    dot: 'bg-rose-500',
  },
  {
    id: 'sky',
    name: 'Samudra',
    gradient: 'from-sky-500 to-blue-600',
    bgLight: 'bg-sky-50 border-sky-200/80',
    textColor: 'text-sky-700',
    dot: 'bg-sky-500',
  },
  {
    id: 'amber',
    name: 'Matahari',
    gradient: 'from-amber-400 to-orange-500',
    bgLight: 'bg-amber-50 border-amber-200/80',
    textColor: 'text-amber-800',
    dot: 'bg-amber-500',
  },
  {
    id: 'purple',
    name: 'Anggrek',
    gradient: 'from-purple-500 to-indigo-600',
    bgLight: 'bg-purple-50 border-purple-200/80',
    textColor: 'text-purple-700',
    dot: 'bg-purple-500',
  },
  {
    id: 'teal',
    name: 'Mint',
    gradient: 'from-teal-400 to-emerald-600',
    bgLight: 'bg-teal-50 border-teal-200/80',
    textColor: 'text-teal-800',
    dot: 'bg-teal-500',
  },
];

interface DisplayCollection {
  title: string;
  description: string;
  itemCount: number;
  updatedAt: string;
  items: ArchiveRecord[];
  isCustom: boolean;
  customId?: string;
  iconName?: string;
  gradient?: string;
}

interface CollectionDetailTarget {
  title: string;
  description: string;
  iconName?: string;
  gradient?: string;
  isCustom?: boolean;
  customId?: string;
  filter: {
    category?: string;
    tag?: string;
    recordIds?: string[];
    isFavorite?: boolean;
    type?: string;
  };
}

export const CollectionsView: React.FC<CollectionsViewProps> = ({
  records,
  loading = false,
  onSelectRecord,
  onOpenSettings: _onOpenSettings,
  onOpenAvatar: _onOpenAvatar,
}) => {
  const [selectedSmartFilter, setSelectedSmartFilter] = useState<string | null>(null);
  const [customCollections, setCustomCollections] = useState<CustomCollection[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCollectionDetail, setSelectedCollectionDetail] = useState<CollectionDetailTarget | null>(null);
  const [detailPage, setDetailPage] = useState(1);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<PaginatedResult<ArchiveRecord>>({
    items: [],
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 1,
    hasMore: false,
  });

  // Query server-side style paginated records for selected collection
  useEffect(() => {
    if (!selectedCollectionDetail) return;
    let active = true;
    setDetailLoading(true);

    getPaginatedRecords({
      page: detailPage,
      pageSize: 10,
      ...selectedCollectionDetail.filter,
    })
      .then((res) => {
        if (active) {
          setDetailData(res);
          setDetailLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to query collection records:', err);
        if (active) setDetailLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedCollectionDetail, detailPage, records]);

  // Form state for creating a new collection
  const [newColName, setNewColName] = useState('');
  const [newColDesc, setNewColDesc] = useState('');
  const [newColIcon, setNewColIcon] = useState('folder');
  const [newColColor, setNewColColor] = useState(COLOR_PRESETS[0]);
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [modalRecordSearch, setModalRecordSearch] = useState('');

  // Load custom collections on mount
  useEffect(() => {
    setCustomCollections(getCustomCollections());
  }, []);

  // Handle Save New Collection
  const handleCreateCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;

    haptics.notificationSuccess();
    const created = createCustomCollection({
      name: newColName,
      description: newColDesc,
      icon: newColIcon,
      color: newColColor.id,
      gradient: newColColor.gradient,
      recordIds: selectedRecordIds,
    });

    setCustomCollections(getCustomCollections());
    setIsAddModalOpen(false);

    // Reset Form
    setNewColName('');
    setNewColDesc('');
    setNewColIcon('folder');
    setNewColColor(COLOR_PRESETS[0]);
    setSelectedRecordIds([]);
  };

  // Handle Delete Custom Collection with SweetAlert
  const handleDeleteCustomCol = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const confirmed = await showConfirm({
      title: 'Hapus Koleksi Ini?',
      text: 'Koleksi akan dihapus. Data di dalamnya tetap tersimpan aman di aplikasi Anda.',
      confirmText: 'Hapus Koleksi',
      cancelText: 'Batal',
      isDestructive: true,
    });
    if (confirmed) {
      deleteCustomCollection(id);
      setCustomCollections(getCustomCollections());
      if (selectedCollectionDetail?.customId === id) {
        setSelectedCollectionDetail(null);
      }
    }
  };

  // Group records dynamically by category from database records
  const dynamicCategories = useMemo(() => {
    const categoryMap: { [cat: string]: number } = {};

    records.forEach((r) => {
      const cat = r.category || 'Lainnya';
      categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    });

    // Default category definitions with rich vibrant styling
    const defaultConfigs: {
      [key: string]: {
        icon: React.ReactNode;
        bg: string;
        accentGradient: string;
      };
    } = {
      'Belanja Harian': {
        icon: <ShoppingBag className="w-5 h-5 text-white" />,
        bg: 'bg-gradient-to-br from-rose-50/90 via-pink-50/50 to-white border-rose-200/80',
        accentGradient: 'bg-gradient-to-br from-rose-500 to-pink-600',
      },
      Belanja: {
        icon: <ShoppingBag className="w-5 h-5 text-white" />,
        bg: 'bg-gradient-to-br from-rose-50/90 via-pink-50/50 to-white border-rose-200/80',
        accentGradient: 'bg-gradient-to-br from-rose-500 to-pink-600',
      },
      Dokumen: {
        icon: <FileText className="w-5 h-5 text-white" />,
        bg: 'bg-gradient-to-br from-sky-50/90 via-blue-50/50 to-white border-sky-200/80',
        accentGradient: 'bg-gradient-to-br from-sky-500 to-blue-600',
      },
      Catatan: {
        icon: <PenLine className="w-5 h-5 text-white" />,
        bg: 'bg-gradient-to-br from-amber-50/90 via-yellow-50/50 to-white border-amber-200/80',
        accentGradient: 'bg-gradient-to-br from-amber-500 to-orange-500',
      },
      Gambar: {
        icon: <ImageIcon className="w-5 h-5 text-white" />,
        bg: 'bg-gradient-to-br from-purple-50/90 via-violet-50/50 to-white border-purple-200/80',
        accentGradient: 'bg-gradient-to-br from-purple-500 to-indigo-600',
      },
      Pekerjaan: {
        icon: <Briefcase className="w-5 h-5 text-white" />,
        bg: 'bg-gradient-to-br from-emerald-50/90 via-teal-50/50 to-white border-emerald-200/80',
        accentGradient: 'bg-gradient-to-br from-emerald-500 to-teal-600',
      },
      Pribadi: {
        icon: <HomeIcon className="w-5 h-5 text-white" />,
        bg: 'bg-gradient-to-br from-rose-50/90 via-red-50/50 to-white border-rose-200/80',
        accentGradient: 'bg-gradient-to-br from-rose-500 to-red-600',
      },
      Kendaraan: {
        icon: <Car className="w-5 h-5 text-white" />,
        bg: 'bg-gradient-to-br from-blue-50/90 via-cyan-50/50 to-white border-blue-200/80',
        accentGradient: 'bg-gradient-to-br from-blue-500 to-cyan-600',
      },
      Keuangan: {
        icon: <Wallet className="w-5 h-5 text-white" />,
        bg: 'bg-gradient-to-br from-teal-50/90 via-emerald-50/50 to-white border-teal-200/80',
        accentGradient: 'bg-gradient-to-br from-teal-500 to-emerald-600',
      },
    };

    return Object.entries(categoryMap).map(([label, count]) => {
      const config = defaultConfigs[label] || {
        icon: <Folder className="w-5 h-5 text-white" />,
        bg: 'bg-gradient-to-br from-stone-50 via-stone-100/50 to-white border-stone-200/80',
        accentGradient: 'bg-gradient-to-br from-[#165a4c] to-emerald-600',
      };
      return {
        label,
        count,
        icon: config.icon,
        bg: config.bg,
        accentGradient: config.accentGradient,
      };
    });
  }, [records]);

  // Group collections dynamically based on database tags
  const dynamicTagCollections = useMemo<DisplayCollection[]>(() => {
    const tagMap: { [tag: string]: ArchiveRecord[] } = {};

    records.forEach((r) => {
      if (r.tags && r.tags.length > 0) {
        r.tags.forEach((t) => {
          if (!tagMap[t]) {
            tagMap[t] = [];
          }
          tagMap[t].push(r);
        });
      }
    });

    return Object.entries(tagMap).map(([title, items]) => {
      const latestItem = items[0];
      const updatedAt = latestItem
        ? formatDeviceDate(latestItem.updatedAt || latestItem.createdAt)
        : '-';

      return {
        title,
        description:
          items
            .map((i) => i.title)
            .slice(0, 3)
            .join(', ') + (items.length > 3 ? ', dll.' : ''),
        itemCount: items.length,
        updatedAt,
        items,
        isCustom: false,
        iconName: 'folder',
        gradient: 'from-emerald-500 to-teal-700',
      };
    });
  }, [records]);

  // Combine custom collections with database tag collections
  const allUserCollections = useMemo<DisplayCollection[]>(() => {
    const customList: DisplayCollection[] = customCollections.map((c) => {
      const matchedItems = records.filter(
        (r) =>
          c.recordIds.includes(r.id) ||
          r.tags?.includes(c.name) ||
          r.category === c.name
      );
      return {
        title: c.name,
        description: c.description || `${matchedItems.length} item tersimpan`,
        itemCount: matchedItems.length,
        updatedAt: formatDeviceDate(c.createdAt, { withYear: false }),
        items: matchedItems,
        isCustom: true,
        customId: c.id,
        iconName: c.icon,
        gradient: c.gradient,
      };
    });

    return [...customList, ...dynamicTagCollections];
  }, [customCollections, dynamicTagCollections, records]);

  // Helper to render icon by name
  const renderCollectionIcon = (
    iconName?: string,
    gradient: string = 'from-emerald-500 to-teal-700'
  ) => {
    const found = ICON_OPTIONS.find((i) => i.id === iconName);
    const IconComp = found ? found.icon : Folder;
    return (
      <div
        className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${gradient} text-white flex items-center justify-center shrink-0 shadow-sm`}
      >
        <IconComp className="w-5 h-5 stroke-[2.2]" />
      </div>
    );
  };

  // Smart filtered records
  const smartFilteredRecords = useMemo(() => {
    if (!selectedSmartFilter) return [];
    if (selectedSmartFilter === 'month') {
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      return records.filter((r) => {
        const d = new Date(r.createdAt);
        return (
          r.type === 'receipt' &&
          d.getMonth() === currentMonth &&
          d.getFullYear() === currentYear
        );
      });
    }
    if (selectedSmartFilter === 'important') {
      return records.filter((r) => r.isFavorite);
    }
    if (selectedSmartFilter === 'date') {
      return records.filter((r) =>
        r.extractedFields?.some((f) => f.key === 'date')
      );
    }
    if (selectedSmartFilter === 'amount') {
      return records.filter((r) =>
        r.extractedFields?.some(
          (f) => f.key === 'total_amount' || f.key === 'amount' || f.key === 'total'
        )
      );
    }
    return [];
  }, [records, selectedSmartFilter]);

  const [smartFilterPage, setSmartFilterPage] = useState(1);
  const SMART_PAGE_SIZE = 5;
  const paginatedSmartRecords = useMemo(() => {
    const start = (smartFilterPage - 1) * SMART_PAGE_SIZE;
    return smartFilteredRecords.slice(start, start + SMART_PAGE_SIZE);
  }, [smartFilteredRecords, smartFilterPage]);
  const totalSmartPages = Math.max(1, Math.ceil(smartFilteredRecords.length / SMART_PAGE_SIZE));

  useEffect(() => {
    setSmartFilterPage(1);
  }, [selectedSmartFilter]);

  const [colListPage, setColListPage] = useState(1);
  const COL_PAGE_SIZE = 6;
  const totalColPages = Math.max(1, Math.ceil(allUserCollections.length / COL_PAGE_SIZE));
  const paginatedUserCollections = useMemo(() => {
    const start = (colListPage - 1) * COL_PAGE_SIZE;
    return allUserCollections.slice(start, start + COL_PAGE_SIZE);
  }, [allUserCollections, colListPage]);

  const swipeBackRef = useSwipeBack<HTMLDivElement>({
    onBack: () => setSelectedCollectionDetail(null),
    enabled: Boolean(selectedCollectionDetail),
  });

  // 1. DETAIL VIEW FOR A SELECTED COLLECTION
  if (selectedCollectionDetail) {
    return (
      <div ref={swipeBackRef} className="w-full pb-28 sm:pb-32 animate-fade-in select-none pt-2">
        <div className="w-full max-w-5xl lg:max-w-6xl mx-auto py-2 md:py-6 px-4 sm:px-8">
        {/* Sticky Detail Top Bar */}
        <div
          className="sticky top-0 z-30 px-4 pt-3 pb-3 bg-[#FAF9F6]/90 backdrop-blur-xl border-b border-stone-200/50 flex items-center justify-between shadow-2xs"
          style={{ paddingTop: 'max(env(safe-area-inset-top), 10px)' }}
        >
          <button
            onClick={() => {
              haptics.impactLight();
              setSelectedCollectionDetail(null);
            }}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-full bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-700 font-semibold text-xs transition-all border border-stone-200/60"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali</span>
          </button>

          <h3 className="text-sm font-bold text-stone-900 truncate max-w-[180px]">
            {selectedCollectionDetail.title}
          </h3>

          {selectedCollectionDetail.isCustom && selectedCollectionDetail.customId ? (
            <button
              onClick={(e) =>
                handleDeleteCustomCol(selectedCollectionDetail.customId!, e)
              }
              className="p-2 rounded-full text-rose-500 hover:bg-rose-50 active:scale-95"
              aria-label="Hapus Koleksi"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-8" />
          )}
        </div>

        {/* Collection Hero Showcase */}
        <div className="px-5 pt-4 pb-2">
          <div
            className={`p-5 rounded-3xl bg-gradient-to-tr ${
              selectedCollectionDetail.gradient || 'from-[#165a4c] to-emerald-600'
            } text-white shadow-md`}
          >
            <div className="flex items-center gap-3.5 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30">
                <Folder className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black">{selectedCollectionDetail.title}</h2>
                <p className="text-xs text-white/80">
                  {detailData.total} item dalam koleksi ini
                </p>
              </div>
            </div>
            {selectedCollectionDetail.description && (
              <p className="text-xs text-white/90 mt-2 font-medium bg-black/10 p-2.5 rounded-xl border border-white/10">
                {selectedCollectionDetail.description}
              </p>
            )}
          </div>
        </div>

        {/* Records inside this collection */}
        <div className="px-5 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider">
              Daftar Catatan
            </h4>
            <span className="text-[11px] font-semibold text-stone-500">
              Menampilkan {detailData.items.length} dari {detailData.total} item
            </span>
          </div>

          {detailLoading ? (
            <div className="py-12 flex justify-center">
              <BrandLoader
                mode="inline"
                size="md"
                title="Memuat Koleksi..."
                subtitle="Mengambil data lokal"
              />
            </div>
          ) : detailData.items.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-stone-200/80 shadow-xs">
              <Folder className="w-10 h-10 mx-auto text-stone-300 mb-2" />
              <p className="text-xs text-stone-500">
                Belum ada catatan di koleksi ini.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {detailData.items.map((r) => (
                <div
                  key={r.id}
                  onClick={() => onSelectRecord(r)}
                  className="bg-white rounded-2xl p-3 border border-stone-200/80 shadow-xs hover:border-stone-300 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 overflow-hidden min-w-0 flex-1">
                    <RecordThumbnail record={r} size="md" />
                    <div className="overflow-hidden min-w-0 flex-1">
                      <h5 className="text-sm font-bold text-stone-900 truncate">
                        {r.title}
                      </h5>
                      <p className="text-[11px] text-stone-400 mt-0.5 truncate">
                        {formatDeviceDateTime(r.createdAt)}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
                </div>
              ))}

              {/* Server-side Pagination Controls */}
              {detailData.totalPages > 1 && (
                <div className="flex items-center justify-between pt-3 pb-2">
                  <button
                    type="button"
                    disabled={detailPage <= 1 || detailLoading}
                    onClick={() => {
                      haptics.impactLight();
                      setDetailPage((p) => Math.max(1, p - 1));
                    }}
                    className="px-3 py-1.5 rounded-full border border-stone-200/80 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition-all shadow-2xs cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Sebelumnya</span>
                  </button>

                  <span className="text-xs font-semibold text-stone-500">
                    Halaman {detailPage} dari {detailData.totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={detailPage >= detailData.totalPages || detailLoading}
                    onClick={() => {
                      haptics.impactLight();
                      setDetailPage((p) => Math.min(detailData.totalPages, p + 1));
                    }}
                    className="px-3 py-1.5 rounded-full border border-stone-200/80 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition-all shadow-2xs cursor-pointer"
                  >
                    <span>Berikutnya</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        </div>
      </div>
    );
  }

  // 2. MAIN COLLECTIONS VIEW
  return (
    <div className="w-full pb-28 sm:pb-32 animate-fade-in select-none pt-2">
      <div className="w-full max-w-5xl lg:max-w-6xl mx-auto py-2 md:py-6 px-4 sm:px-8">
      {/* Heading & "+ Koleksi Baru" Button */}
      <div className="px-5 pt-3 pb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 tracking-tight">
            Koleksi
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Kelompokkan catatan sesuai kebutuhan Anda.
          </p>
        </div>

        {/* Real "+ Koleksi Baru" Action Button with Glowing Gradient */}
        <button
          onClick={() => {
            haptics.impactMedium();
            setIsAddModalOpen(true);
          }}
          className="bg-gradient-to-r from-[#165a4c] to-emerald-600 hover:from-[#134e48] hover:to-emerald-700 active:scale-95 text-white rounded-full py-2 px-3.5 flex items-center gap-1.5 text-xs font-bold shadow-md shadow-emerald-900/20 transition-all shrink-0 cursor-pointer"
        >
          <FolderPlus className="w-4 h-4" />
          <span>Koleksi Baru</span>
        </button>
      </div>

      {/* "Kategori Populer" Grid (Elevated Vibrant Coloring & Duotones) */}
      <div className="px-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-stone-900">Kategori Populer</h3>
          <span className="text-xs font-bold text-[#165a4c] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
            {dynamicCategories.length} Kategori
          </span>
        </div>

        {loading ? (
          <div className="py-10 flex justify-center">
            <BrandLoader
              mode="inline"
              size="md"
              title="Memuat Koleksi..."
              subtitle="Menyinkronkan kategori & folder"
            />
          </div>
        ) : dynamicCategories.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center border border-stone-200/70 shadow-xs">
            <p className="text-xs text-stone-500">
              Belum ada kategori di database.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {dynamicCategories.map((cat) => (
              <div
                key={cat.label}
                onClick={() => {
                  haptics.impactLight();
                  setSelectedCollectionDetail({
                    title: cat.label,
                    description: `Semua catatan dalam kategori ${cat.label}`,
                    gradient: cat.accentGradient.replace('bg-gradient-to-br ', ''),
                    filter: { category: cat.label },
                  });
                  setDetailPage(1);
                }}
                className={`${cat.bg} rounded-2xl p-3.5 border shadow-xs hover:shadow-md active:scale-98 transition-all cursor-pointer flex flex-col justify-between`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className={`w-9 h-9 rounded-xl ${cat.accentGradient} text-white shadow-xs flex items-center justify-center`}
                  >
                    {cat.icon}
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-400 mt-1" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-900 truncate">
                    {cat.label}
                  </h4>
                  <p className="text-[10px] text-stone-500 font-semibold mt-0.5">
                    {cat.count} item
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* "Koleksi Pintar" Section with Lush Ambient Shimmer */}
      <div className="px-5 mb-6">
        <div className="bg-gradient-to-br from-[#E8F7EE] via-[#F3F9F5] to-teal-50/70 rounded-3xl p-4 border border-emerald-300/70 shadow-xs relative overflow-hidden">
          <div className="flex items-start justify-between gap-3 mb-3 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-950">Koleksi Pintar</h4>
                <p className="text-[10px] text-emerald-800/80 font-medium">
                  Dibuat otomatis berdasarkan catatan Anda.
                </p>
              </div>
            </div>
          </div>

          {/* Smart Pills */}
          <div className="flex flex-wrap gap-2 relative z-10">
            <button
              onClick={() =>
                setSelectedSmartFilter(
                  selectedSmartFilter === 'month' ? null : 'month'
                )
              }
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedSmartFilter === 'month'
                  ? 'bg-[#165a4c] text-white shadow-xs'
                  : 'bg-white text-emerald-900 border border-emerald-200/80 hover:bg-emerald-50'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>Struk Bulan Ini</span>
            </button>

            <button
              onClick={() =>
                setSelectedSmartFilter(
                  selectedSmartFilter === 'important' ? null : 'important'
                )
              }
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedSmartFilter === 'important'
                  ? 'bg-[#165a4c] text-white shadow-xs'
                  : 'bg-white text-emerald-900 border border-emerald-200/80 hover:bg-emerald-50'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Dokumen Penting</span>
            </button>

            <button
              onClick={() =>
                setSelectedSmartFilter(
                  selectedSmartFilter === 'date' ? null : 'date'
                )
              }
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedSmartFilter === 'date'
                  ? 'bg-[#165a4c] text-white shadow-xs'
                  : 'bg-white text-emerald-900 border border-emerald-200/80 hover:bg-emerald-50'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>Ada Tanggal</span>
            </button>

            <button
              onClick={() =>
                setSelectedSmartFilter(
                  selectedSmartFilter === 'amount' ? null : 'amount'
                )
              }
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                selectedSmartFilter === 'amount'
                  ? 'bg-[#165a4c] text-white shadow-xs'
                  : 'bg-white text-emerald-900 border border-emerald-200/80 hover:bg-emerald-50'
              }`}
            >
              <Coins className="w-3.5 h-3.5 text-emerald-600" />
              <span>Ada Nominal</span>
            </button>
          </div>

          {/* Smart Filter Results Dropdown/List */}
          {selectedSmartFilter && (
            <div className="mt-3 pt-3 border-t border-emerald-200/60 space-y-2 relative z-10">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-emerald-900">
                  Hasil Koleksi Pintar ({smartFilteredRecords.length} item):
                </p>
                {smartFilteredRecords.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      haptics.impactLight();
                      const filterObj =
                        selectedSmartFilter === 'month'
                          ? { type: 'receipt' }
                          : selectedSmartFilter === 'important'
                          ? { isFavorite: true }
                          : {};
                      setSelectedCollectionDetail({
                        title:
                          selectedSmartFilter === 'month'
                            ? 'Struk Bulan Ini'
                            : selectedSmartFilter === 'important'
                            ? 'Dokumen Penting'
                            : selectedSmartFilter === 'date'
                            ? 'Catatan Ada Tanggal'
                            : 'Catatan Ada Nominal',
                        description: `Filter pintar berdasarkan data (${smartFilteredRecords.length} item)`,
                        gradient: 'from-emerald-600 to-teal-700',
                        filter:
                          selectedSmartFilter === 'month' || selectedSmartFilter === 'important'
                            ? filterObj
                            : { recordIds: smartFilteredRecords.map((r) => r.id) },
                      });
                      setDetailPage(1);
                    }}
                    className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                  >
                    Buka Semua
                  </button>
                )}
              </div>
              {smartFilteredRecords.length === 0 ? (
                <p className="text-[11px] text-stone-400 italic">
                  Tidak ada data yang cocok dengan kriteria ini.
                </p>
              ) : (
                <>
                  {paginatedSmartRecords.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => onSelectRecord(r)}
                      className="p-2.5 bg-white rounded-xl border border-emerald-100 flex items-center justify-between cursor-pointer hover:border-emerald-300 shadow-2xs"
                    >
                      <span className="text-xs font-semibold text-stone-800 truncate max-w-[200px]">
                        {r.title}
                      </span>
                      <span className="text-[10px] text-stone-400">
                        {formatDeviceDateTime(r.createdAt)}
                      </span>
                    </div>
                  ))}

                  {totalSmartPages > 1 && (
                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        disabled={smartFilterPage <= 1}
                        onClick={() => {
                          haptics.impactLight();
                          setSmartFilterPage((p) => Math.max(1, p - 1));
                        }}
                        className="px-2.5 py-1 rounded-full border border-emerald-200/80 bg-white text-emerald-800 text-[10px] font-bold flex items-center gap-1 disabled:opacity-40 active:scale-95 transition-all shadow-2xs cursor-pointer"
                      >
                        <ChevronLeft className="w-3 h-3" />
                        <span>Prev</span>
                      </button>
                      <span className="text-[10px] font-semibold text-emerald-900">
                        Hal {smartFilterPage} dari {totalSmartPages}
                      </span>
                      <button
                        type="button"
                        disabled={smartFilterPage >= totalSmartPages}
                        onClick={() => {
                          haptics.impactLight();
                          setSmartFilterPage((p) => Math.min(totalSmartPages, p + 1));
                        }}
                        className="px-2.5 py-1 rounded-full border border-emerald-200/80 bg-white text-emerald-800 text-[10px] font-bold flex items-center gap-1 disabled:opacity-40 active:scale-95 transition-all shadow-2xs cursor-pointer"
                      >
                        <span>Next</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* "Koleksi Saya" Section (Custom User Collections + Tags) */}
      <div className="px-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-stone-900">Koleksi Saya</h3>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 bg-white border border-stone-200/80 px-3 py-1 rounded-full shadow-2xs">
            <span>{allUserCollections.length} Koleksi</span>
          </div>
        </div>

        {allUserCollections.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-stone-200/80 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3 shadow-2xs">
              <FolderPlus className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-bold text-stone-900 mb-1">
              Belum Ada Koleksi
            </h4>
            <p className="text-xs text-stone-500 max-w-xs mx-auto mb-4">
              Buat koleksi pertama Anda untuk mengelompokkan struk, garansi, atau ide proyek.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 rounded-full bg-[#165a4c] text-white text-xs font-bold hover:bg-[#134e48] active:scale-95 shadow-sm transition-all"
            >
              + Buat Koleksi Sekarang
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {paginatedUserCollections.map((col, idx) => (
              <div
                key={col.customId || idx}
                onClick={() => {
                  haptics.impactLight();
                  setSelectedCollectionDetail({
                    title: col.title,
                    description: col.description,
                    iconName: col.iconName,
                    gradient: col.gradient,
                    isCustom: col.isCustom,
                    customId: col.customId,
                    filter:
                      col.isCustom && col.customId
                        ? { recordIds: col.items.map((i) => i.id) }
                        : { tag: col.title },
                  });
                  setDetailPage(1);
                }}
                className="bg-white rounded-2xl p-3.5 border border-stone-200/80 shadow-xs hover:border-emerald-200 hover:shadow-sm active:scale-[0.99] transition-all cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3.5 overflow-hidden">
                  {renderCollectionIcon(col.iconName, col.gradient)}
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-stone-900 truncate">
                        {col.title}
                      </h4>
                      {col.isCustom && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 shrink-0">
                          Kustom
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-400 truncate mt-0.5">
                      {col.description}
                    </p>
                    <p className="text-[10px] text-stone-500 mt-1 font-medium">
                      {col.itemCount} item · {col.updatedAt}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {col.isCustom && col.customId && (
                    <button
                      onClick={(e) => handleDeleteCustomCol(col.customId!, e)}
                      className="p-1.5 rounded-lg text-stone-300 hover:text-rose-500 hover:bg-rose-50 transition-all"
                      aria-label="Hapus Koleksi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <ChevronRight className="w-4 h-4 text-stone-400" />
                </div>
              </div>
            ))}

            {/* Pagination for Koleksi Saya */}
            {totalColPages > 1 && (
              <div className="flex items-center justify-between pt-3 pb-1">
                <button
                  type="button"
                  disabled={colListPage <= 1}
                  onClick={() => {
                    haptics.impactLight();
                    setColListPage((p) => Math.max(1, p - 1));
                  }}
                  className="px-3 py-1.5 rounded-full border border-stone-200/80 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition-all shadow-2xs cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Sebelumnya</span>
                </button>

                <span className="text-xs font-semibold text-stone-500">
                  Halaman {colListPage} dari {totalColPages}
                </span>

                <button
                  type="button"
                  disabled={colListPage >= totalColPages}
                  onClick={() => {
                    haptics.impactLight();
                    setColListPage((p) => Math.min(totalColPages, p + 1));
                  }}
                  className="px-3 py-1.5 rounded-full border border-stone-200/80 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none active:scale-95 transition-all shadow-2xs cursor-pointer"
                >
                  <span>Berikutnya</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      </div>

      {/* 3. MODAL TAMBAH KOLEKSI BARU */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-stone-200 animate-slide-up max-h-[90vh] overflow-y-auto">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${newColColor.gradient} text-white flex items-center justify-center shadow-xs`}
                >
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">
                    Koleksi Baru
                  </h3>
                  <p className="text-xs text-stone-400">
                    Kelompokkan catatan sesuai keinginan Anda
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCollection} className="space-y-4">
              {/* Nama Koleksi */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  Nama Koleksi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Belanja Bulanan, Garansi, Pajak"
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-stone-900 text-sm focus:bg-white focus:border-[#165a4c] focus:outline-none transition-all"
                  autoFocus
                />
              </div>

              {/* Deskripsi Koleksi */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  Deskripsi Singkat (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Keterangan singkat koleksi..."
                  value={newColDesc}
                  onChange={(e) => setNewColDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-stone-900 text-sm focus:bg-white focus:border-[#165a4c] focus:outline-none transition-all"
                />
              </div>

              {/* Pilih Icon */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-2">
                  Pilih Ikon
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {ICON_OPTIONS.map((item) => {
                    const IconC = item.icon;
                    const isSelected = newColIcon === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          haptics.impactLight();
                          setNewColIcon(item.id);
                        }}
                        className={`p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-emerald-50 border-[#165a4c] text-[#165a4c] shadow-xs scale-105'
                            : 'border-stone-200 text-stone-500 hover:bg-stone-50'
                        }`}
                      >
                        <IconC className="w-5 h-5 stroke-[2]" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pilih Warna Tema */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-2">
                  Pilih Warna Aksen
                </label>
                <div className="flex items-center gap-3 overflow-x-auto pb-1">
                  {COLOR_PRESETS.map((color) => {
                    const isSelected = newColColor.id === color.id;
                    return (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => {
                          haptics.impactLight();
                          setNewColColor(color);
                        }}
                        className={`w-9 h-9 rounded-full bg-gradient-to-tr ${
                          color.gradient
                        } flex items-center justify-center shadow-xs transition-transform ${
                          isSelected
                            ? 'ring-4 ring-[#165a4c]/30 scale-110'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        {isSelected && <Check className="w-4 h-4 text-white stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pilih Arsip Awal (Opsional) */}
              {records.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-stone-700">
                      Pilih Catatan Terkait (Opsional)
                    </label>
                    {selectedRecordIds.length > 0 && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                        {selectedRecordIds.length} dipilih
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Cari catatan untuk ditautkan..."
                    value={modalRecordSearch}
                    onChange={(e) => setModalRecordSearch(e.target.value)}
                    className="w-full mb-2 px-3 py-1.5 rounded-lg bg-stone-50 border border-stone-200 text-stone-900 text-xs focus:bg-white focus:border-[#165a4c] outline-none transition-all"
                  />
                  <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-stone-50 border border-stone-200">
                    {records
                      .filter((r) =>
                        r.title.toLowerCase().includes(modalRecordSearch.toLowerCase())
                      )
                      .slice(0, 30)
                      .map((r) => {
                        const isChecked = selectedRecordIds.includes(r.id);
                        return (
                          <div
                            key={r.id}
                            onClick={() => {
                              setSelectedRecordIds((prev) =>
                                isChecked
                                  ? prev.filter((id) => id !== r.id)
                                  : [...prev, r.id]
                              );
                            }}
                            className={`p-2 rounded-lg flex items-center justify-between text-xs cursor-pointer transition-all ${
                              isChecked
                                ? 'bg-emerald-100 text-emerald-900 font-semibold'
                                : 'hover:bg-white text-stone-700'
                            }`}
                          >
                            <span className="truncate max-w-[240px]">{r.title}</span>
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center ${
                                isChecked
                                  ? 'bg-[#165a4c] border-[#165a4c] text-white'
                                  : 'border-stone-300'
                              }`}
                            >
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2.5 rounded-full border border-stone-200 font-bold text-xs text-stone-600 hover:bg-stone-50 active:scale-95 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-2.5 rounded-full bg-gradient-to-r ${newColColor.gradient} text-white font-bold text-xs shadow-md active:scale-95 transition-all`}
                >
                  Simpan Koleksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
