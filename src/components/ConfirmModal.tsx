import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  zIndexClass?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  onClose?: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  isDestructive = true,
  zIndexClass = 'z-50',
  onConfirm,
  onCancel,
  onClose,
}) => {
  if (!isOpen) return null;

  const handleCancel = () => {
    if (onCancel) onCancel();
    if (onClose) onClose();
  };

  return (
    <div 
      className={`fixed inset-0 ${zIndexClass} flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-hidden animate-in fade-in duration-200`}
      onClick={handleCancel}
      dir="rtl"
    >
      <div 
        id="confirm-modal"
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-100 dark:border-slate-800 text-right animate-in zoom-in-95 duration-200 transition-colors max-h-[92dvh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800">
          <div className={`flex items-center gap-3 ${isDestructive ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}>
            <div className={`p-2.5 rounded-2xl border shrink-0 ${
              isDestructive
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200/50 dark:border-rose-900/50'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-800/60'
            }`}>
              <AlertTriangle className={`w-5 h-5 ${isDestructive ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`} />
            </div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg">
              {title}
            </h3>
          </div>
          <button
            onClick={handleCancel}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm mt-4 leading-relaxed font-medium">
          {message}
        </p>

        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 mt-6 pt-3 border-t border-slate-100 dark:border-slate-800/80">
          <button
            id="confirm-cancel-btn"
            type="button"
            onClick={handleCancel}
            className="px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer text-center"
          >
            {cancelText}
          </button>
          <button
            id="confirm-action-btn"
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2.5 text-xs sm:text-sm font-bold text-white rounded-xl transition-all cursor-pointer shadow-md text-center ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20 active:scale-98'
                : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/20 active:scale-98'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
