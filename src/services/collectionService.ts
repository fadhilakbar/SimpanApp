export interface CustomCollection {
  id: string;
  name: string;
  description?: string;
  icon: string; // e.g. 'folder', 'heart', 'briefcase', 'wallet', 'car', 'shopping', 'file', 'sparkles'
  color: string; // e.g. 'emerald', 'rose', 'sky', 'amber', 'purple', 'teal'
  gradient: string; // Tailwind class
  recordIds: string[];
  createdAt: string;
}

const STORAGE_KEY = 'simpan_custom_collections_v1';

export const DEFAULT_CATEGORIES = [
  'Struk & Transaksi',
  'Dokumen & Surat',
  'Foto & Galeri',
  'Catatan',
  'Belanja Harian',
  'Keuangan',
  'Pekerjaan',
  'Kendaraan',
  'Pribadi',
];

export const getAllCategories = (): string[] => {
  try {
    const custom = getCustomCollections().map((c) => c.name);
    const set = new Set([...DEFAULT_CATEGORIES, ...custom]);
    return Array.from(set);
  } catch {
    return DEFAULT_CATEGORIES;
  }
};

export const addQuickCategory = (name: string): string => {
  const trimmed = name.trim();
  if (!trimmed) return 'Dokumen & Surat';
  const existing = getCustomCollections();
  const found = existing.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
  if (!found) {
    createCustomCollection({
      name: trimmed,
      icon: 'folder',
      color: 'emerald',
      gradient: 'from-emerald-500 to-teal-700',
    });
  }
  return trimmed;
};

export const getCustomCollections = (): CustomCollection[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Gagal membaca koleksi kustom:', e);
    return [];
  }
};

export const saveCustomCollections = (collections: CustomCollection[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collections));
  } catch (e) {
    console.warn('Gagal menyimpan koleksi kustom:', e);
  }
};

export const createCustomCollection = (data: {
  name: string;
  description?: string;
  icon: string;
  color: string;
  gradient: string;
  recordIds?: string[];
}): CustomCollection => {
  const current = getCustomCollections();
  const newCol: CustomCollection = {
    id: 'col_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    name: data.name.trim(),
    description: data.description?.trim() || '',
    icon: data.icon || 'folder',
    color: data.color || 'emerald',
    gradient: data.gradient || 'from-emerald-500 to-teal-600',
    recordIds: data.recordIds || [],
    createdAt: new Date().toISOString(),
  };

  const updated = [newCol, ...current];
  saveCustomCollections(updated);
  return newCol;
};

export const deleteCustomCollection = (id: string): void => {
  const current = getCustomCollections();
  const updated = current.filter((c) => c.id !== id);
  saveCustomCollections(updated);
};

export const toggleRecordInCollection = (
  collectionId: string,
  recordId: string
): boolean => {
  const current = getCustomCollections();
  let isInCollection = false;
  const updated = current.map((c) => {
    if (c.id === collectionId) {
      const exists = c.recordIds.includes(recordId);
      const newIds = exists
        ? c.recordIds.filter((id) => id !== recordId)
        : [...c.recordIds, recordId];
      isInCollection = !exists;
      return { ...c, recordIds: newIds };
    }
    return c;
  });
  saveCustomCollections(updated);
  return isInCollection;
};
