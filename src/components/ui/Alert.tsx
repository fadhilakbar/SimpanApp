import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

export interface AlertProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string | React.ReactNode;
  onClose?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  message,
  onClose,
  action,
  className = '',
}) => {
  const configs = {
    info: {
      bg: 'bg-sky-50/80 border-sky-200/80 text-sky-950',
      icon: <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />,
      actionBtn: 'text-sky-700 hover:text-sky-900',
    },
    success: {
      bg: 'bg-emerald-50/80 border-emerald-200/80 text-emerald-950',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />,
      actionBtn: 'text-emerald-700 hover:text-emerald-900',
    },
    warning: {
      bg: 'bg-amber-50/80 border-amber-200/80 text-amber-950',
      icon: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />,
      actionBtn: 'text-amber-700 hover:text-amber-900',
    },
    error: {
      bg: 'bg-rose-50/80 border-rose-200/80 text-rose-950',
      icon: <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />,
      actionBtn: 'text-rose-700 hover:text-rose-900',
    },
  }[type];

  return (
    <div
      className={`flex items-start gap-3 p-3.5 rounded-2xl border ${configs.bg} text-xs sm:text-sm ${className}`}
      role="alert"
    >
      {configs.icon}
      <div className="flex-1 min-w-0">
        {title && <h5 className="font-semibold mb-0.5 tracking-tight">{title}</h5>}
        <div className="leading-relaxed opacity-90">{message}</div>
        {action && (
          <button
            onClick={action.onClick}
            className={`mt-2 font-semibold underline text-xs ${configs.actionBtn}`}
          >
            {action.label}
          </button>
        )}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="p-1 rounded-md opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Tutup"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
