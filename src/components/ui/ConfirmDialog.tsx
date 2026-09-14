import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, Trash2, HelpCircle } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Konfirmasi',
  cancelLabel = 'Batal',
  destructive = false,
  loading = false,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="sm" showCloseButton={false}>
      <div className="text-center py-2">
        <div
          className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-3.5 ${
            destructive ? 'bg-rose-100 text-rose-600' : 'bg-warm-200/80 text-stone-700'
          }`}
        >
          {destructive ? (
            <Trash2 className="w-6 h-6" />
          ) : (
            <HelpCircle className="w-6 h-6" />
          )}
        </div>
        <h4 className="text-base font-bold text-stone-900 mb-1">{title}</h4>
        <p className="text-xs sm:text-sm text-stone-500 leading-relaxed max-w-xs mx-auto">
          {message}
        </p>

        <div className="grid grid-cols-2 gap-2.5 mt-6">
          <Button
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={loading}
            className="w-full"
          >
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'destructive' : 'primary'}
            size="md"
            onClick={onConfirm}
            loading={loading}
            className="w-full"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
