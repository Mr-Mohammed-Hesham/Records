import React from 'react';
import {
  FileText,
  Mail,
  Paperclip,
  Eye,
  FileCheck,
  Image as ImageIcon,
  Download,
} from 'lucide-react';
import { ResultAttachment } from '../types';
import { getAttachmentCategory, formatFileSize } from '../utils/attachment';

interface AttachmentThumbnailProps {
  attachment?: ResultAttachment | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  readOnly?: boolean;
  onClick?: () => void;
  onAttach?: () => void;
  className?: string;
  tooltipPrefix?: string;
}

export const AttachmentThumbnail: React.FC<AttachmentThumbnailProps> = ({
  attachment,
  size = 'sm',
  showLabel = false,
  readOnly = false,
  onClick,
  onAttach,
  className = '',
  tooltipPrefix = '',
}) => {
  // Size dimensions configuration
  const sizeConfig = {
    xs: {
      box: 'w-6 h-6 min-w-6',
      img: 'w-6 h-6',
      icon: 'w-3 h-3',
      badgeText: 'text-[8px]',
      btnPadding: 'p-1',
    },
    sm: {
      box: 'w-7 h-7 min-w-7',
      img: 'w-7 h-7',
      icon: 'w-3.5 h-3.5',
      badgeText: 'text-[9px]',
      btnPadding: 'p-1',
    },
    md: {
      box: 'w-9 h-9 min-w-9',
      img: 'w-9 h-9',
      icon: 'w-4 h-4',
      badgeText: 'text-[10px]',
      btnPadding: 'p-1.5',
    },
    lg: {
      box: 'w-12 h-12 min-w-12',
      img: 'w-12 h-12',
      icon: 'w-5 h-5',
      badgeText: 'text-xs',
      btnPadding: 'p-2',
    },
  }[size];

  // Case 1: No attachment exists
  if (!attachment) {
    if (readOnly) {
      return (
        <span className="text-slate-300 dark:text-slate-600 font-mono text-xs select-none">
          -
        </span>
      );
    }

    if (onAttach) {
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAttach();
          }}
          className={`inline-flex items-center gap-1 rounded-xl text-[11px] font-bold text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-slate-800 border border-dashed border-slate-200 dark:border-slate-700 transition-all cursor-pointer ${
            showLabel ? 'px-2.5 py-1' : sizeConfig.btnPadding
          } ${className}`}
          title="إرفاق صورة أو إيميل لإثبات المصداقية"
        >
          <Paperclip className={sizeConfig.icon} />
          {showLabel && <span>إرفاق</span>}
        </button>
      );
    }

    return null;
  }

  // Case 2: Attachment exists
  const category = getAttachmentCategory(attachment);
  const isImage = category === 'image';
  const isPdf = category === 'pdf';
  const isEmail = category === 'email';

  const ext = attachment.name?.split('.').pop()?.toUpperCase() || '';
  const tooltip = `${tooltipPrefix ? `${tooltipPrefix}: ` : ''}${attachment.name} (${formatFileSize(attachment.size)}) - انقر للمعاينة السريعة`;

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        className={`relative ${sizeConfig.box} rounded-lg overflow-hidden border transition-all duration-200 cursor-pointer group shrink-0 shadow-xs active:scale-95 ${
          isImage
            ? 'border-emerald-300 dark:border-emerald-700/80 bg-slate-100 dark:bg-slate-800 ring-1 ring-emerald-500/20 hover:ring-2 hover:ring-amber-500 hover:scale-105'
            : isPdf
            ? 'border-rose-300 dark:border-rose-800/80 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:border-rose-500 hover:scale-105'
            : isEmail
            ? 'border-sky-300 dark:border-sky-800/80 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 hover:border-sky-500 hover:scale-105'
            : 'border-amber-300 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:border-amber-500 hover:scale-105'
        }`}
        title={tooltip}
      >
        {/* Render actual image thumbnail */}
        {isImage ? (
          <>
            <img
              src={attachment.dataUrl}
              alt={attachment.name}
              className={`${sizeConfig.img} object-cover w-full h-full rounded-md`}
              referrerPolicy="no-referrer"
              loading="lazy"
            />
            {/* Quick hover eye overlay */}
            <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[0.5px]">
              <Eye className="w-3.5 h-3.5 text-white drop-shadow" />
            </div>
            {/* Tiny green corner verified pip */}
            <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 border border-white dark:border-slate-900 rounded-full" />
          </>
        ) : isPdf ? (
          <div className="w-full h-full flex flex-col items-center justify-center relative">
            <FileText className={`${sizeConfig.icon} text-rose-600 dark:text-rose-400`} />
            <span className={`font-black font-mono leading-none tracking-tighter text-rose-700 dark:text-rose-300 ${sizeConfig.badgeText}`}>
              PDF
            </span>
            <div className="absolute inset-0 bg-rose-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-md">
              <Eye className="w-3 h-3 text-white" />
            </div>
          </div>
        ) : isEmail ? (
          <div className="w-full h-full flex flex-col items-center justify-center relative">
            <Mail className={`${sizeConfig.icon} text-sky-600 dark:text-sky-400`} />
            <span className={`font-black font-mono leading-none tracking-tighter text-sky-700 dark:text-sky-300 ${sizeConfig.badgeText}`}>
              EML
            </span>
            <div className="absolute inset-0 bg-sky-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-md">
              <Eye className="w-3 h-3 text-white" />
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center relative">
            <FileCheck className={`${sizeConfig.icon} text-amber-700 dark:text-amber-400`} />
            <span className={`font-black font-mono leading-none tracking-tighter text-amber-800 dark:text-amber-300 ${sizeConfig.badgeText}`}>
              {ext.slice(0, 3) || 'DOC'}
            </span>
            <div className="absolute inset-0 bg-amber-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-md">
              <Eye className="w-3 h-3 text-white" />
            </div>
          </div>
        )}
      </button>

      {showLabel && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
          className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-200 hover:underline cursor-pointer flex items-center gap-1"
          title={tooltip}
        >
          <span>معاينة المرفق</span>
        </button>
      )}
    </div>
  );
};
