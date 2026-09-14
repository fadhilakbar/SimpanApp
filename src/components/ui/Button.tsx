import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'pill' | 'subtle';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      className = '',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-2xl transition-all duration-150 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100';

    const sizeStyles = {
      xs: 'text-xs px-2.5 py-1 gap-1.5 rounded-lg',
      sm: 'text-xs px-3 py-1.5 gap-1.5 rounded-xl',
      md: 'text-sm px-4 py-2.5 gap-2 rounded-2xl',
      lg: 'text-base px-5 py-3 gap-2.5 rounded-2xl',
      icon: 'p-2.5 rounded-full aspect-square',
    }[size];

    const variantStyles = {
      primary:
        'bg-stone-900 text-white hover:bg-stone-800 shadow-sm active:bg-black',
      secondary:
        'bg-stone-100 text-stone-800 hover:bg-stone-200 active:bg-stone-300',
      outline:
        'border border-stone-200/80 bg-white text-stone-700 hover:bg-stone-50 shadow-sm',
      ghost:
        'text-stone-600 hover:bg-stone-100/80 active:bg-stone-200/60',
      destructive:
        'bg-rose-50 text-rose-600 hover:bg-rose-100 active:bg-rose-200/80 border border-rose-100',
      pill:
        'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/20 rounded-full',
      subtle:
        'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 active:bg-emerald-200/80',
    }[variant];

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
