import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useSwipeBack } from '../../utils/useSwipeBack';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'md',
  showCloseButton = true,
}) => {
  const swipeBackRef = useSwipeBack<HTMLDivElement>({
    onBack: onClose,
    enabled: isOpen,
    threshold: 70,
  });
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

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-4xl',
  }[maxWidth];

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          ref={swipeBackRef}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none"
        >
          {/* Backdrop with Frosted Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Dialog Container */}
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.93, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300, mass: 0.8 }}
            className={`relative w-full ${maxWidthStyles} bg-[#FAF9F6] rounded-[28px] shadow-2xl border border-stone-200/80 overflow-hidden flex flex-col max-h-[90vh] z-10`}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div className="px-6 pt-5 pb-3.5 flex items-start justify-between border-b border-stone-200/60 bg-white/70">
                <div>
                  {title && (
                    <h3 className="text-lg font-bold text-stone-900 tracking-tight">
                      {title}
                    </h3>
                  )}
                  {description && (
                    <p className="text-xs text-stone-500 mt-0.5">{description}</p>
                  )}
                </div>
                {showCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 active:scale-95 transition-all -mr-1 cursor-pointer"
                    aria-label="Tutup"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}

            {/* Body Content */}
            <div className="p-6 overflow-y-auto flex-1">{children}</div>

            {/* Optional Footer */}
            {footer && (
              <div className="px-6 py-4 bg-white/80 border-t border-stone-200/60 flex items-center justify-end gap-2.5">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
