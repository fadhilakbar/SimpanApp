import React from 'react';
import { X } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      clearable = false,
      onClear,
      className = '',
      value,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label className="block text-xs font-semibold text-stone-600 tracking-tight">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 text-stone-400 pointer-events-none flex items-center">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            value={value}
            disabled={disabled}
            className={`w-full bg-white text-stone-900 placeholder:text-stone-400 text-sm rounded-2xl border transition-all duration-150 py-2.5 ${
              leftIcon ? 'pl-10' : 'pl-3.5'
            } ${clearable && value ? 'pr-10' : 'pr-3.5'} ${
              error
                ? 'border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                : 'border-stone-200/90 hover:border-stone-300 focus:border-stone-800 focus:ring-2 focus:ring-stone-800/10 shadow-sm'
            } disabled:bg-stone-50 disabled:text-stone-400 disabled:cursor-not-allowed ${className}`}
            {...props}
          />
          {clearable && value && !disabled && (
            <button
              type="button"
              onClick={onClear}
              className="absolute right-3 p-1 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {error ? (
          <p className="text-xs text-rose-500">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-stone-400">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
