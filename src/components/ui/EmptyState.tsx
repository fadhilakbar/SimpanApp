import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 my-6 max-w-sm mx-auto ${className}`}
    >
      {icon ? (
        <div className="w-16 h-16 rounded-3xl bg-warm-100 flex items-center justify-center text-stone-600 mb-4 border border-stone-200/50 shadow-sm">
          {icon}
        </div>
      ) : (
        <div className="w-16 h-16 rounded-3xl bg-emerald-50/80 flex items-center justify-center text-2xl mb-4 border border-emerald-100 shadow-sm">
          📥
        </div>
      )}
      <h3 className="text-base font-semibold text-stone-800 tracking-tight mb-1.5">
        {title}
      </h3>
      {description && (
        <p className="text-xs sm:text-sm text-stone-500 leading-relaxed mb-5 whitespace-pre-line">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button variant="primary" size="md" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
