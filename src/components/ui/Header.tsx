import React from 'react';
import { ChevronLeft } from 'lucide-react';

export interface HeaderProps {
  title?: string;
  subtitle?: string;
  largeTitle?: boolean;
  onBack?: () => void;
  backLabel?: string;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  className?: string;
  border?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  largeTitle = false,
  onBack,
  backLabel = 'Kembali',
  leftAction,
  rightAction,
  className = '',
  border = true,
}) => {
  return (
    <header
      className={`sticky top-0 z-30 bg-warm-50/90 backdrop-blur-md transition-all duration-200 ${
        border ? 'border-b border-stone-200/50' : ''
      } ${className}`}
      style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}
    >
      <div className="px-4 py-2.5 flex items-center justify-between min-h-[48px] gap-2">
        {/* Left Side */}
        <div className="flex items-center gap-1.5 min-w-[70px]">
          {onBack ? (
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 active:opacity-60 transition-opacity font-normal text-sm py-1 -ml-1.5 px-1.5 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
              <span className="text-[15px]">{backLabel}</span>
            </button>
          ) : (
            leftAction
          )}
        </div>

        {/* Center Title (when not largeTitle) */}
        {!largeTitle && (
          <div className="flex-1 text-center truncate px-2">
            {title && (
              <h1 className="text-base font-semibold text-stone-900 tracking-tight truncate">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-[11px] text-stone-500 truncate -mt-0.5">{subtitle}</p>
            )}
          </div>
        )}

        {/* Right Side */}
        <div className="flex items-center justify-end gap-1.5 min-w-[70px]">
          {rightAction}
        </div>
      </div>

      {/* Large Title (iOS standard style) */}
      {largeTitle && (
        <div className="px-5 pt-1 pb-3">
          {subtitle && (
            <p className="text-xs uppercase tracking-wider font-semibold text-stone-600 mb-0.5">
              {subtitle}
            </p>
          )}
          {title && (
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
              {title}
            </h1>
          )}
        </div>
      )}
    </header>
  );
};
