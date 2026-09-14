import Dexie, { Table } from 'dexie';
import { ArchiveRecord, BackupData } from '../types/record';
import { deletePhysicalFile } from './storageService';

class SimpanDatabase extends Dexie {
  records!: Table<ArchiveRecord, string>;

  constructor() {
    super('SimpanDatabase');
    this.version(1).stores({
      records: 'id, type, createdAt, category, isFavorite, isDeleted, deletedAt, updatedAt',
    });
  }
}

export const db = new SimpanDatabase();

// Daftar ID seed bawaan yang dihapus secara permanen
const LEGACY_SEED_IDS = [
  'rec_belanja_berkah_01',
  'rec_kontrak_kerja_02',
  'rec_ide_aplikasi_03',
  'rec_tokopedia_hub_04',
  'rec_voice_arsip_05',
  'rec_bpr_laporan_06',
];

// Inisialisasi database: bersihkan data seed bawaan lama dari IndexedDB pengguna
export async function initializeDatabase(): Promise<void> {
  try {
    await db.records.bulkDelete(LEGACY_SEED_IDS);
  } catch (err) {
    console.warn('Gagal membersihkan data seed:', err);
  }
}

export async function getAllRecords(filterDeleted = false): Promise<ArchiveRecord[]> {
  let query = db.records.toCollection();
  const list = await query.toArray();
  return list
    .filter((r) => (filterDeleted ? r.isDeleted : !r.isDeleted))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getRecordById(id: string): Promise<ArchiveRecord | undefined> {
  return await db.records.get(id);
}

export async function saveRecord(record: ArchiveRecord): Promise<void> {
  record.updatedAt = new Date().toISOString();
  await db.records.put(record);
}

export async function bulkSaveRecords(records: ArchiveRecord[]): Promise<void> {
  const now = new Date().toISOString();
  const prepared = records.map((r) => ({
    ...r,
    updatedAt: now,
  }));
  await db.records.bulkPut(prepared);
}

export async function updateRecordFields(
  id: string,
  updates: Partial<ArchiveRecord>
): Promise<void> {
  const existing = await db.records.get(id);
  if (!existing) return;
  const updated: ArchiveRecord = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await db.records.put(updated);
}

export async function softDeleteRecord(id: string): Promise<void> {
  await db.records.update(id, {
    isDeleted: true,
    deletedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export async function restoreRecord(id: string): Promise<void> {
  await db.records.update(id, {
    isDeleted: false,
    deletedAt: undefined,
    updatedAt: new Date().toISOString(),
  });
}

export async function permanentDeleteRecord(id: string): Promise<void> {
  const rec = await db.records.get(id);
  if (rec && rec.localFilePath && !rec.isZeroCopy) {
    await deletePhysicalFile(rec.localFilePath);
  }
  await db.records.delete(id);
}

export async function clearTrash(): Promise<void> {
  const deletedRecords = await db.records.filter((r) => r.isDeleted).toArray();
  for (const rec of deletedRecords) {
    if (rec.localFilePath && !rec.isZeroCopy) {
      await deletePhysicalFile(rec.localFilePath);
    }
  }
  const ids = deletedRecords.map((r) => r.id);
  await db.records.bulkDelete(ids);
}

export async function toggleFavorite(id: string): Promise<boolean> {
  const rec = await db.records.get(id);
  if (!rec) return false;
  const newState = !rec.isFavorite;
  await db.records.update(id, { isFavorite: newState, updatedAt: new Date().toISOString() });
  return newState;
}

// Deep Search: Title, OCR rawText, Summary, Tags, Category, Extracted Field values, Merchant, Notes
export async function searchRecords(searchTerm: string): Promise<ArchiveRecord[]> {
  const query = searchTerm.toLowerCase().trim();
  if (!query) return getAllRecords(false);

  const all = await db.records.filter((r) => !r.isDeleted).toArray();

  return all.filter((r) => {
    // 1. Title
    if (r.title.toLowerCase().includes(query)) return true;
    // 2. Category
    if (r.category && r.category.toLowerCase().includes(query)) return true;
    // 3. Tags
    if (r.tags.some((t) => t.toLowerCase().includes(query))) return true;
    // 4. OCR Raw Text
    if (r.rawText && r.rawText.toLowerCase().includes(query)) return true;
    // 5. Summary
    if (r.summary && r.summary.toLowerCase().includes(query)) return true;
    // 6. User notes
    if (r.userNotes && r.userNotes.toLowerCase().includes(query)) return true;
    // 7. Extracted fields (key, label, rawValue, currentValue)
    if (
      r.extractedFields.some(
        (f) =>
          f.label.toLowerCase().includes(query) ||
          f.currentValue.toLowerCase().includes(query) ||
          f.rawValue.toLowerCase().includes(query)
      )
    )
      return true;
    // 8. Receipt items
    if (
      r.receiptItems?.some(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          (item.rawName && item.rawName.toLowerCase().includes(query))
      )
    )
      return true;

    return false;
  });
}

// Export encrypted/structured backup format (.simpan)
export async function exportDatabaseBackup(): Promise<BackupData> {
  const records = await db.records.toArray();
  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    recordCount: records.length,
    records,
  };
}

// Restore from backup
export async function importDatabaseBackup(data: BackupData): Promise<number> {
  if (!data || !Array.isArray(data.records)) {
    throw new Error('Format file backup tidak valid.');
  }
  await db.records.bulkPut(data.records);
  return data.records.length;
}

export interface PaginatedOptions {
  page?: number;
  pageSize?: number;
  filterDeleted?: boolean;
  type?: string;
  category?: string;
  tag?: string;
  recordIds?: string[];
  isFavorite?: boolean;
  searchQuery?: string;
  specificDate?: string | null;
  year?: number;
  monthIdx?: number;
  sortBy?: 'newest' | 'oldest';
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

// Server-side style database-level paginated query
export async function getPaginatedRecords(
  options: PaginatedOptions = {}
): Promise<PaginatedResult<ArchiveRecord>> {
  const {
    page = 1,
    pageSize = 10,
    filterDeleted = false,
    type = 'all',
    category,
    tag,
    recordIds,
    isFavorite,
    searchQuery = '',
    specificDate,
    year,
    monthIdx,
    sortBy = 'newest',
  } = options;

  const q = searchQuery.toLowerCase().trim();

  let all = await db.records
    .filter((r) => (filterDeleted ? r.isDeleted : !r.isDeleted))
    .toArray();

  // Apply filter: Type
  if (type && type !== 'all') {
    if (type === 'image') {
      all = all.filter((r) => r.type === 'image' || r.type === 'scan');
    } else {
      all = all.filter((r) => r.type === type);
    }
  }

  // Apply filter: Category
  if (category) {
    all = all.filter((r) => (r.category || 'Lainnya') === category);
  }

  // Apply filter: Tag
  if (tag) {
    all = all.filter((r) => r.tags && r.tags.includes(tag));
  }

  // Apply filter: Record IDs list
  if (recordIds && recordIds.length > 0) {
    const idSet = new Set(recordIds);
    all = all.filter((r) => idSet.has(r.id));
  }

  // Apply filter: Favorite
  if (isFavorite !== undefined) {
    all = all.filter((r) => Boolean(r.isFavorite) === isFavorite);
  }

  // Apply filter: Specific Date (YYYY-MM-DD)
  if (specificDate) {
    all = all.filter((r) => {
      const d = new Date(r.createdAt);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}` === specificDate;
    });
  } else if (year !== undefined && monthIdx !== undefined) {
    all = all.filter((r) => {
      const d = new Date(r.createdAt);
      return d.getFullYear() === year && d.getMonth() === monthIdx;
    });
  }

  // Apply filter: Search Query
  if (q) {
    all = all.filter((r) => {
      if (r.title.toLowerCase().includes(q)) return true;
      if (r.category && r.category.toLowerCase().includes(q)) return true;
      if (r.tags?.some((t) => t.toLowerCase().includes(q))) return true;
      if (r.rawText && r.rawText.toLowerCase().includes(q)) return true;
      if (r.summary && r.summary.toLowerCase().includes(q)) return true;
      if (r.userNotes && r.userNotes.toLowerCase().includes(q)) return true;
      if (
        r.extractedFields?.some(
          (f) =>
            f.label.toLowerCase().includes(q) ||
            f.currentValue.toLowerCase().includes(q) ||
            f.rawValue.toLowerCase().includes(q)
        )
      )
        return true;
      if (
        r.receiptItems?.some(
          (item) =>
            item.name.toLowerCase().includes(q) ||
            (item.rawName && item.rawName.toLowerCase().includes(q))
        )
      )
        return true;
      return false;
    });
  }

  // Sort
  all.sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    return sortBy === 'oldest' ? timeA - timeB : timeB - timeA;
  });

  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const items = all.slice(startIndex, startIndex + pageSize);
  const hasMore = currentPage < totalPages;

  return {
    items,
    total,
    page: currentPage,
    pageSize,
    totalPages,
    hasMore,
  };
}

