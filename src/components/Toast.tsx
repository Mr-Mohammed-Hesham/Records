import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title?: string;
  message?: string;
  description?: string;
  duration?: number;
}

export type ToastNotification = ToastMessage;

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss?: (id: string) => void;
  onClose?: (id: string) => void;
}

const ToastItem: React.FC<{
  toast: ToastMessage;
  onClose: (id: string) => void;
}> = ({ toast, onClose }) => {
  useEffect(() => {
    const duration = toast.duration ?? 3500;
    if (duration <= 0) return;

    const timer = setTimeout(() => {
      onClose(toast.id);
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onClose]);

  return (
    <div
      id={`toast-${toast.id}`}
      role="alert"
      className={`pointer-events-auto flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl shadow-xl border backdrop-blur-md transition-all duration-300 transform translate-y-0 animate-in fade-in slide-in-from-bottom-3 ${
        toast.type === 'success'
          ? 'bg-white/95 dark:bg-slate-900/95 border-emerald-300 dark:border-emerald-700/60 text-emerald-950 dark:text-emerald-100 shadow-emerald-500/10'
          : toast.type === 'error'
          ? 'bg-white/95 dark:bg-slate-900/95 border-rose-300 dark:border-rose-700/60 text-rose-950 dark:text-rose-100 shadow-rose-500/10'
          : 'bg-white/95 dark:bg-slate-900/95 border-amber-300 dark:border-amber-700/60 text-slate-900 dark:text-slate-100 shadow-amber-500/10'
      }`}
    >
      {toast.type === 'success' && (
        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
      )}
      {toast.type === 'error' && (
        <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
      )}
      {toast.type === 'info' && (
        <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
      )}

      <div className="flex-1 min-w-0 pr-1">
        <h4 className="text-xs sm:text-sm font-bold leading-snug">
          {toast.title || toast.message}
        </h4>
        {toast.description && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
            {toast.description}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => onClose(toast.id)}
        aria-label="إغلاق الإشعار"
        className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
  onClose,
}) => {
  if (toasts.length === 0) return null;

  const handleClose = (id: string) => {
    if (onDismiss) onDismiss(id);
    if (onClose) onClose(id);
  };

  return (
    <div
      id="toast-container"
      className="fixed bottom-5 left-5 z-50 flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2.5rem)] sm:w-full pointer-events-none"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onClose={handleClose} />
      ))}
    </div>
  );
};
