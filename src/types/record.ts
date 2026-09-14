export type RecordType =
  | 'receipt'
  | 'document'
  | 'note'
  | 'image'
  | 'audio'
  | 'scan'
  | 'other';

export type FieldSource = 'ocr' | 'ai' | 'manual' | 'imported';

export type FieldValueType = 'text' | 'number' | 'date' | 'currency';

export interface ExtractedField {
  id: string;
  key: string;
  label: string;
  rawValue: string; // Nilai asli pertama kali dari OCR/AI (tidak pernah di-overwrite)
  currentValue: string; // Nilai saat ini (dapat diedit pengguna)
  valueType: FieldValueType;
  confidence?: number; // Nilai 0.0 - 1.0 (misal 0.98 = 98%)
  source: FieldSource;
  isEdited: boolean;
}

export interface ReceiptItem {
  id: string;
  name: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  isEdited: boolean;
  rawName?: string;
  rawTotalPrice?: number;
}

export interface AIInsight {
  id: string;
  type: 'category' | 'entity' | 'date' | 'summary' | 'action_item';
  label: string;
  value: string;
  confidence: number;
  isAccepted: boolean;
}

export interface ArchiveRecord {
  id: string;
  type: RecordType;
  title: string;
  createdAt: string; // ISO 8601
  capturedAt?: string; // ISO 8601
  updatedAt: string; // ISO 8601

  // File data (Local-first / Base64 Data URL or Blob Storage)
  originalDataUrl?: string; // Resolved on-demand or small asset
  thumbnailDataUrl?: string; // Lightweight WebP thumbnail preview (~10KB)
  originalFileName?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  originalFileSizeBytes?: number; // Size before compression
  audioDurationSeconds?: number;

  // Decoupled Physical Storage & Zero-Copy Pointer
  localFilePath?: string; // Relative path in Documents/SIMPAN or native file URI
  isZeroCopy?: boolean; // True if file remains in external directory (Download/WA) without duplication
  isCompressed?: boolean; // True if WebP compressed
  isMissingPhysicalFile?: boolean; // True if external file was moved/deleted

  // Multi-page scans
  pages?: string[]; // Array of DataURLs if multi-page scan

  // Raw & Processed Text
  rawText?: string; // Teks OCR lengkap
  summary?: string; // AI Summary
  rawSummary?: string; // Initial AI summary

  // Classification & Discovery
  category: string;
  tags: string[];
  isFavorite: boolean;

  // Structured Information & Provenance
  extractedFields: ExtractedField[];
  receiptItems?: ReceiptItem[];
  aiInsights?: AIInsight[];
  userNotes?: string;

  // Soft-Delete (Recently Deleted / Trash)
  isDeleted: boolean;
  deletedAt?: string;

  createdManually: boolean;
}

export interface BackupData {
  version: string;
  exportedAt: string;
  recordCount: number;
  records: ArchiveRecord[];
  checksum?: string;
}
