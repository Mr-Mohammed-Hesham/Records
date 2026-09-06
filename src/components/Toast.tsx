import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title?: string;
  message?: string;
  description?: string;
}

export type ToastNotification = ToastMessage;

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss?: (id: string) => void;
  onClose?: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss, onClose }) => {
  if (toasts.length === 0) return null;

  const handleClose = (id: string) => {
    if (onDismiss) onDismiss(id);
    if (onClose) onClose(id);
  };

  return (
    <div id="toast-container" className="fixed bottom-5 left-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          id={`toast-${t.id}`}
          className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border transition-all duration-300 transform translate-y-0 ${
            t.type === 'success'
              ? 'bg-white border-emerald-200 text-emerald-950 shadow-emerald-500/10'
              : t.type === 'error'
              ? 'bg-white border-rose-200 text-rose-950 shadow-rose-500/10'
              : 'bg-white border-sky-200 text-sky-950 shadow-sky-500/10'
          }`}
        >
          {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
          {t.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
          {t.type === 'info' && <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />}

          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold">{t.title || t.message}</h4>
            {t.description && <p className="text-xs text-slate-600 mt-0.5">{t.description}</p>}
          </div>

          <button
            onClick={() => handleClose(t.id)}
            className="text-slate-400 hover:text-slate-600 p-0.5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
