import React from 'react';
import { Sparkles, Scan, UserCheck, Edit3 } from 'lucide-react';
import { FieldSource, RecordType } from '../../types/record';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'receipt' | 'document' | 'note' | 'audio' | 'scan' | 'neutral' | 'success' | 'warning' | 'error';
  size?: 'xs' | 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'sm',
  className = '',
  ...props
}) => {
  const sizeStyles = {
    xs: 'text-[10px] px-1.5 py-0.5 rounded-md font-medium tracking-tight',
    sm: 'text-xs px-2.5 py-0.5 rounded-full font-medium',
    md: 'text-sm px-3 py-1 rounded-full font-medium',
  }[size];

  const variantStyles = {
    default: 'bg-stone-100 text-stone-700 border border-stone-200/60',
    receipt: 'bg-emerald-50 text-emerald-700 border border-emerald-200/70',
    document: 'bg-sky-50 text-sky-700 border border-sky-200/70',
    note: 'bg-amber-50 text-amber-800 border border-amber-200/70',
    audio: 'bg-purple-50 text-purple-700 border border-purple-200/70',
    scan: 'bg-indigo-50 text-indigo-700 border border-indigo-200/70',
    neutral: 'bg-warm-100 text-stone-600 border border-stone-200/40',
    success: 'bg-emerald-100/70 text-emerald-800 border border-emerald-300/60',
    warning: 'bg-amber-100/70 text-amber-800 border border-amber-300/60',
    error: 'bg-rose-100/70 text-rose-800 border border-rose-300/60',
  }[variant];

  return (
    <span className={`inline-flex items-center gap-1 shrink-0 ${sizeStyles} ${variantStyles} ${className}`} {...props}>
      {children}
    </span>
  );
};

export const RecordTypeBadge: React.FC<{ type: RecordType; size?: 'xs' | 'sm' | 'md' }> = ({ type, size = 'sm' }) => {
  const map: Record<RecordType, { label: string; icon: string; variant: BadgeProps['variant'] }> = {
    receipt: { label: 'Struk', icon: '🧾', variant: 'receipt' },
    document: { label: 'Dokumen', icon: '📄', variant: 'document' },
    note: { label: 'Catatan', icon: '📝', variant: 'note' },
    image: { label: 'Gambar', icon: '🖼', variant: 'neutral' },
    audio: { label: 'Audio', icon: '🎙', variant: 'audio' },
    scan: { label: 'Pindai', icon: '📑', variant: 'scan' },
    other: { label: 'Lainnya', icon: '📁', variant: 'neutral' },
  };

  const item = map[type] || map.other;

  return (
    <Badge variant={item.variant} size={size}>
      <span className="text-[11px]">{item.icon}</span>
      <span>{item.label}</span>
    </Badge>
  );
};

export const ProvenanceBadge: React.FC<{
  source: FieldSource;
  confidence?: number;
  isEdited?: boolean;
}> = ({ source, confidence, isEdited }) => {
  if (isEdited) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full font-medium">
        <Edit3 className="w-3 h-3 text-amber-600" />
        <span>Diedit oleh Anda</span>
      </span>
    );
  }

  if (source === 'ocr') {
    const percent = confidence ? Math.round(confidence * 100) : 95;
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full font-medium">
        <Scan className="w-3 h-3 text-emerald-600" />
        <span>OCR ({percent}%)</span>
      </span>
    );
  }

  if (source === 'ai') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-indigo-800 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-full font-medium">
        <Sparkles className="w-3 h-3 text-indigo-600" />
        <span>Saran AI</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-stone-600 bg-stone-100 border border-stone-200/60 px-2 py-0.5 rounded-full font-medium">
      <UserCheck className="w-3 h-3 text-stone-500" />
      <span>Manual</span>
    </span>
  );
};
