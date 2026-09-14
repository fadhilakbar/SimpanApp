import React, { useState } from 'react';
import { ArchiveRecord, RecordType } from '../../types/record';
import { ShoppingBag, FileText, PenLine, Mic, Image as ImageIcon, Sparkles } from 'lucide-react';
import { getFileKind, isImageSource } from '../../utils/fileExport';

export interface RecordThumbnailProps {
  record: Pick<ArchiveRecord, 'type' | 'thumbnailDataUrl' | 'originalDataUrl' | 'title'>;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const RecordThumbnail: React.FC<RecordThumbnailProps> = ({
  record,
  size = 'md',
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: 'w-10 h-10 min-w-[40px] min-h-[40px] max-w-[40px] max-h-[40px] rounded-lg',
    md: 'w-12 h-12 min-w-[48px] min-h-[48px] max-w-[48px] max-h-[48px] rounded-xl',
    lg: 'w-14 h-14 min-w-[56px] min-h-[56px] max-w-[56px] max-h-[56px] rounded-2xl',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const isAudioRecord =
    record.type === 'audio' ||
    getFileKind(record.thumbnailDataUrl || record.originalDataUrl, record.type) === 'audio';

  // Audio records strictly render the voice badge and NEVER mount an <img> tag!
  if (isAudioRecord) {
    const iconCls = iconSizes[size];
    return (
      <div
        className={`${sizeClasses[size]} overflow-hidden shrink-0 flex items-center justify-center relative select-none bg-purple-50 border border-purple-200/70 text-purple-600 ${className}`}
      >
        <Mic className={iconCls} />
      </div>
    );
  }

  // Only consider thumbnail image if type is image/scan/receipt, OR document with actual image thumbnail
  // Note records should NEVER attempt to render an <img> tag with raw text data!
  const isEligibleForImage =
    record.type !== 'note' &&
    (record.type === 'image' ||
      record.type === 'scan' ||
      record.type === 'receipt' ||
      (record.type === 'document' && Boolean(record.thumbnailDataUrl))) &&
    !imageError;

  const rawUrl = record.thumbnailDataUrl || (record.type !== 'note' ? record.originalDataUrl : undefined);
  const hasValidImage = Boolean(
    isEligibleForImage &&
      rawUrl &&
      isImageSource(rawUrl, record.type) &&
      (rawUrl.startsWith('data:image') || rawUrl.startsWith('http') || rawUrl.startsWith('blob:'))
  );

  const renderIcon = () => {
    const iconCls = iconSizes[size];
    switch (record.type) {
      case 'receipt':
        return (
          <div className="w-full h-full bg-rose-50 border border-rose-200/70 flex items-center justify-center text-rose-600">
            <ShoppingBag className={iconCls} />
          </div>
        );
      case 'document':
        return (
          <div className="w-full h-full bg-sky-50 border border-sky-200/70 flex items-center justify-center text-sky-600">
            <FileText className={iconCls} />
          </div>
        );
      case 'note':
        return (
          <div className="w-full h-full bg-amber-50 border border-amber-200/70 flex items-center justify-center text-amber-600">
            <PenLine className={iconCls} />
          </div>
        );
      case 'audio':
        return (
          <div className="w-full h-full bg-purple-50 border border-purple-200/70 flex items-center justify-center text-purple-600">
            <Mic className={iconCls} />
          </div>
        );
      case 'image':
      case 'scan':
      default:
        return (
          <div className="w-full h-full bg-emerald-50 border border-emerald-200/70 flex items-center justify-center text-emerald-600">
            <ImageIcon className={iconCls} />
          </div>
        );
    }
  };

  return (
    <div
      className={`${sizeClasses[size]} overflow-hidden shrink-0 flex items-center justify-center relative select-none ${className}`}
    >
      {hasValidImage && rawUrl ? (
        <img
          src={rawUrl}
          alt={record.title || 'Thumbnail'}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover rounded-inherit"
          loading="lazy"
        />
      ) : (
        renderIcon()
      )}
    </div>
  );
};
