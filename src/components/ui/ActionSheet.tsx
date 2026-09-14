import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ActionSheetOption {
  id: string;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  destructive?: boolean;
  onClick: () => void;
}

export interface ActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  options?: ActionSheetOption[];
  children?: React.ReactNode;
}

export const ActionSheet: React.FC<ActionSheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  options,
  children,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Sheet Container */}
      <div
        className="relative w-full max-w-lg bg-white rounded-t-[32px] shadow-2xl border-t border-stone-200/80 overflow-hidden flex flex-col max-h-[85vh] animate-slide-up z-10"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
      >
        {/* iOS Grabber handle */}
        <div className="pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1.5 bg-stone-300 rounded-full" />
        </div>

        {/* Title Section */}
        {(title || subtitle) && (
          <div className="px-6 py-3 border-b border-stone-100/80 flex items-start justify-between">
            <div>
              {title && (
                <h3 className="text-lg font-bold text-stone-900 tracking-tight">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-stone-500 mt-0.5">{subtitle}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Custom Content or Options List */}
        <div className="p-4 overflow-y-auto flex-1">
          {children ? (
            children
          ) : (
            <div className="space-y-1.5">
              {options?.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    opt.onClick();
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-left transition-all duration-150 active:scale-[0.98] ${
                    opt.destructive
                      ? 'bg-rose-50/50 hover:bg-rose-100/60 text-rose-600'
                      : 'hover:bg-stone-50 text-stone-800'
                  }`}
                >
                  {opt.icon && (
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        opt.iconBgColor || (opt.destructive ? 'bg-rose-100' : 'bg-warm-100')
                      } ${opt.iconColor || (opt.destructive ? 'text-rose-600' : 'text-stone-700')}`}
                    >
                      {opt.icon}
                    </div>
                  )}
                  <div className="flex-1 truncate">
                    <p className={`font-semibold text-sm ${opt.destructive ? 'text-rose-600' : 'text-stone-900'}`}>
                      {opt.label}
                    </p>
                    {opt.sublabel && (
                      <p className="text-xs text-stone-400 truncate">{opt.sublabel}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
