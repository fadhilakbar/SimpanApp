import Swal, { SweetAlertIcon } from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import { haptics } from './haptics';

/**
 * SIMPAN Custom Themed SweetAlert2 Mixin
 * Dirancang khusus agar menyatu 100% dengan tema iOS, palet zamrud (#165a4c),
 * sudut squircle halus (rounded-3xl), serta umpan balik getaran (haptics).
 */
const BASE_CUSTOM_CLASS = {
  popup:
    'rounded-3xl bg-white border border-stone-200/90 shadow-2xl p-6 select-none font-sans max-w-[340px] sm:max-w-sm',
  title: 'text-stone-900 font-extrabold text-base tracking-tight pt-1',
  htmlContainer: 'text-stone-600 text-xs leading-relaxed mt-2',
  actions: 'flex items-center justify-center gap-2 mt-5 w-full',
  confirmButton:
    'py-2.5 px-5 rounded-full bg-gradient-to-r from-[#165a4c] to-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-950/15 active:scale-95 transition-all outline-none cursor-pointer',
  cancelButton:
    'py-2.5 px-5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs active:scale-95 transition-all outline-none cursor-pointer border border-stone-200/70',
  denyButton:
    'py-2.5 px-5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs active:scale-95 transition-all outline-none cursor-pointer shadow-md',
  input:
    'w-full px-4 py-2.5 rounded-2xl bg-stone-50 border border-stone-200 text-stone-900 text-xs font-semibold focus:bg-white focus:border-[#165a4c] focus:outline-none transition-all mt-3',
};

export const SimpanSwal = Swal.mixin({
  customClass: BASE_CUSTOM_CLASS,
  buttonsStyling: false,
  backdrop: 'rgba(0, 0, 0, 0.45)',
  reverseButtons: true, // Format Apple iOS (Batal di kiri, Aksi di kanan)
  showClass: {
    popup: 'swal2-show animate-scale-up',
    backdrop: 'swal2-backdrop-show animate-fade-in',
  },
  hideClass: {
    popup: 'swal2-hide',
    backdrop: 'swal2-backdrop-hide',
  },
});

/**
 * Reusable Dialog Helpers
 */

/**
 * 1. Alert Biasa (Informasi / Peringatan / Sukses)
 */
export const showAlert = async (options: {
  title: string;
  text?: string;
  icon?: SweetAlertIcon;
  confirmText?: string;
}) => {
  if (options.icon === 'success') haptics.notificationSuccess();
  else if (options.icon === 'error' || options.icon === 'warning')
    haptics.notificationWarning();
  else haptics.impactLight();

  return SimpanSwal.fire({
    title: options.title,
    text: options.text,
    icon: options.icon,
    confirmButtonText: options.confirmText || 'Mengerti',
  });
};

/**
 * 2. Prompt Dialog (Input teks dari pengguna, misal: PIN, ganti judul, nama koleksi)
 */
export const showPrompt = async (options: {
  title: string;
  text?: string;
  placeholder?: string;
  defaultValue?: string;
  inputType?: 'text' | 'password' | 'number' | 'email';
  confirmText?: string;
  cancelText?: string;
  validator?: (value: string) => string | null;
}): Promise<string | null> => {
  haptics.impactLight();

  const result = await SimpanSwal.fire({
    title: options.title,
    text: options.text,
    input: options.inputType || 'text',
    inputPlaceholder: options.placeholder || 'Ketik di sini...',
    inputValue: options.defaultValue || '',
    showCancelButton: true,
    confirmButtonText: options.confirmText || 'Simpan',
    cancelButtonText: options.cancelText || 'Batal',
    inputValidator: (val: string) => {
      const valueStr = val || '';
      if (options.validator) {
        return options.validator(valueStr);
      }
      if (!valueStr.trim()) {
        return 'Kolom ini tidak boleh kosong!';
      }
      return null;
    },
  });

  if (result.isConfirmed && result.value !== undefined) {
    haptics.notificationSuccess();
    return result.value as string;
  }

  return null;
};

/**
 * 3. Confirm Dialog (Konfirmasi aksi, misal: Hapus Arsip, Hapus Koleksi, Reset)
 */
export const showConfirm = async (options: {
  title: string;
  text?: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  icon?: SweetAlertIcon;
}): Promise<boolean> => {
  if (options.isDestructive) {
    haptics.notificationWarning();
  } else {
    haptics.impactMedium();
  }

  const result = await SimpanSwal.fire({
    title: options.title,
    text: options.text,
    icon: options.icon || (options.isDestructive ? 'warning' : 'question'),
    showCancelButton: true,
    confirmButtonText:
      options.confirmText || (options.isDestructive ? 'Hapus' : 'Ya, Lanjutkan'),
    cancelButtonText: options.cancelText || 'Batal',
    customClass: {
      ...BASE_CUSTOM_CLASS,
      confirmButton: options.isDestructive
        ? 'py-2.5 px-5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-950/15 active:scale-95 transition-all outline-none cursor-pointer'
        : 'py-2.5 px-5 rounded-full bg-gradient-to-r from-[#165a4c] to-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-950/15 active:scale-95 transition-all outline-none cursor-pointer',
    },
  });

  if (result.isConfirmed) {
    if (options.isDestructive) haptics.notificationWarning();
    else haptics.notificationSuccess();
    return true;
  }

  return false;
};

/**
 * 4. Success Quick Notification
 */
export const showSuccess = async (title: string, text?: string) => {
  haptics.notificationSuccess();
  return SimpanSwal.fire({
    title,
    text,
    icon: 'success',
    timer: 2000,
    showConfirmButton: false,
  });
};

/**
 * 5. Error Notification
 */
export const showError = async (title: string, text?: string) => {
  haptics.notificationWarning();
  return SimpanSwal.fire({
    title,
    text,
    icon: 'error',
    confirmButtonText: 'Tutup',
  });
};
