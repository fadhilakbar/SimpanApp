import React from 'react';
import { ArchiveRecord } from '../../types/record';
import { RecordTypeBadge } from '../ui/Badge';
import { Star, ChevronRight, FileText, Image, Mic, Receipt, PenLine, Clock } from 'lucide-react';
import { formatRupiah, parseCurrencyNumber } from '../../services/ocrService';
import { formatDeviceDate } from '../../utils/dateFormatter';
import { isImageSource } from '../../utils/fileExport';

export interface RecordCardProps {
  record: ArchiveRecord;
  onClick: () => void;
  onToggleFavorite?: (e: React.MouseEvent) => void;
}

export const RecordCard: React.FC<RecordCardProps> = ({
  record,
  onClick,
  onToggleFavorite,
}) => {
  // Ambil nominal jika struk
  const totalField = record.extractedFields.find((f) => f.key === 'total');
  const totalAmount = totalField ? parseCurrencyNumber(totalField.currentValue) : null;

  // Format tanggal singkat
  const formattedDate = formatDeviceDate(record.createdAt);

  const getThumbnailIcon = () => {
    switch (record.type) {
      case 'receipt':
        return <Receipt className="w-5 h-5 text-emerald-700" />;
      case 'document':
        return <FileText className="w-5 h-5 text-sky-700" />;
      case 'note':
        return <PenLine className="w-5 h-5 text-amber-800" />;
      case 'audio':
        return <Mic className="w-5 h-5 text-purple-700" />;
      default:
        return <Image className="w-5 h-5 text-stone-700" />;
    }
  };

  const getThumbnailBg = () => {
    switch (record.type) {
      case 'receipt':
        return 'bg-emerald-50 border-emerald-200/60';
      case 'document':
        return 'bg-sky-50 border-sky-200/60';
      case 'note':
        return 'bg-amber-50 border-amber-200/60';
      case 'audio':
        return 'bg-purple-50 border-purple-200/60';
      default:
        return 'bg-warm-100 border-stone-200/50';
    }
  };

  return (
    <div
      onClick={onClick}
      className="group relative bg-white rounded-2xl p-3.5 sm:p-4 border border-stone-200/80 shadow-ios hover:shadow-ios-hover active:scale-[0.99] transition-all duration-150 cursor-pointer flex items-center gap-3.5"
    >
      {/* Thumbnail or Type Icon */}
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${getThumbnailBg()} transition-transform group-hover:scale-105`}
      >
        {record.type !== 'audio' &&
        record.type !== 'note' &&
        record.thumbnailDataUrl &&
        isImageSource(record.thumbnailDataUrl, record.type) ? (
          <img
            src={record.thumbnailDataUrl}
            alt={record.title}
            className="w-full h-full object-cover rounded-xl"
          />
        ) : (
          getThumbnailIcon()
        )}
      </div>

      {/* Main Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <h4 className="text-sm font-semibold text-stone-900 truncate tracking-tight group-hover:text-emerald-900 transition-colors">
            {record.title}
          </h4>
          {onToggleFavorite && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(e);
              }}
              className="p-1 text-stone-300 hover:text-amber-400 active:scale-90 transition-all -mr-1"
              aria-label="Tandai favorit"
            >
              <Star
                className={`w-4 h-4 ${
                  record.isFavorite
                    ? 'fill-amber-400 text-amber-400'
                    : 'stroke-[1.7]'
                }`}
              />
            </button>
          )}
        </div>

        {/* Date & Amount / Secondary details */}
        <div className="flex items-center gap-2 text-xs text-stone-500 mb-1.5 flex-wrap">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-stone-400" />
            {formattedDate}
          </span>
          {totalAmount ? (
            <>
              <span className="text-stone-300">•</span>
              <span className="font-semibold text-emerald-700">
                {formatRupiah(totalAmount)}
              </span>
            </>
          ) : null}
          {record.audioDurationSeconds ? (
            <>
              <span className="text-stone-300">•</span>
              <span className="font-mono text-purple-700 font-medium">
                00:{record.audioDurationSeconds.toString().padStart(2, '0')}
              </span>
            </>
          ) : null}
        </div>

        {/* Badges and Category */}
        <div className="flex items-center gap-1.5">
          <RecordTypeBadge type={record.type} size="xs" />
          {record.category && (
            <span className="text-[10px] text-stone-500 bg-warm-100 px-2 py-0.5 rounded-full font-medium truncate max-w-[120px]">
              {record.category}
            </span>
          )}
        </div>
      </div>

      <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-stone-500 transition-colors shrink-0" />
    </div>
  );
};
