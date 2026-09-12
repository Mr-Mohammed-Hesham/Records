import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  Image as ImageIcon,
  Mail,
  Download,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  FileCheck,
  ZoomIn,
  ZoomOut,
  ShieldCheck,
} from 'lucide-react';
import { ResultAttachment } from '../types';
import {
  processFileForAttachment,
  formatFileSize,
  getAttachmentCategory,
  downloadAttachment,
} from '../utils/attachment';

interface AttachmentModalProps {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
  attachment?: ResultAttachment | null;
  readOnly?: boolean;
  onSave?: (attachment: ResultAttachment | null) => Promise<void> | void;
  onClose: () => void;
}

export const AttachmentModal: React.FC<AttachmentModalProps> = ({
  isOpen,
  title = 'إثبات ومرفق مصداقية الامتحان',
  subtitle,
  attachment: initialAttachment,
  readOnly = false,
  onSave,
  onClose,
}) => {
  const [currentAttachment, setCurrentAttachment] = useState<ResultAttachment | null>(
    initialAttachment || null
  );
  const [pendingFile, setPendingFile] = useState<ResultAttachment | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showFullImage, setShowFullImage] = useState(false);
  const [attachmentNotes, setAttachmentNotes] = useState<string>(
    initialAttachment?.notes || ''
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const displayAttachment = pendingFile || currentAttachment;
  const category = displayAttachment ? getAttachmentCategory(displayAttachment) : null;

  // Handle file selection
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setError(null);
    setIsProcessing(true);

    try {
      const processed = await processFileForAttachment(file);
      if (attachmentNotes) {
        processed.notes = attachmentNotes;
      }
      setPendingFile(processed);
    } catch (err: any) {
      console.error('File processing error:', err);
      setError(err?.message || 'تعذر معالجة الملف، يرجى تجربة ملف آخر.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  // Save changes
  const handleConfirmSave = async () => {
    if (!onSave) {
      onClose();
      return;
    }
    setIsSaving(true);
    setError(null);

    try {
      const toSave = pendingFile
        ? { ...pendingFile, notes: attachmentNotes.trim() }
        : currentAttachment
        ? { ...currentAttachment, notes: attachmentNotes.trim() }
        : null;

      await onSave(toSave);
      onClose();
    } catch (err: any) {
      console.error('Save attachment error:', err);
      setError('حدث خطأ أثناء حفظ المرفق، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSaving(false);
    }
  };

  // Remove attachment
  const handleRemove = async () => {
    if (!window.confirm('هل أنت متأكد من حذف ملف الإثبات المرفق؟')) {
      return;
    }

    if (pendingFile && !currentAttachment) {
      setPendingFile(null);
      return;
    }

    if (!onSave) {
      setCurrentAttachment(null);
      setPendingFile(null);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(null);
      setCurrentAttachment(null);
      setPendingFile(null);
      onClose();
    } catch (err) {
      console.error('Remove error:', err);
      setError('تعذر حذف المرفق.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      id="attachment-modal-overlay"
      className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="attachment-modal-container"
        className="w-full max-w-2xl bg-white dark:bg-slate-900 sm:rounded-3xl rounded-t-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col max-h-[92dvh] sm:max-h-[90vh] overflow-hidden text-right transition-all"
        dir="rtl"
      >
        {/* Modal Header */}
        <div className="shrink-0 p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl shrink-0">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg flex items-center gap-2">
                {title}
                {displayAttachment && (
                  <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    موثق بمرفق
                  </span>
                )}
              </h3>
              {subtitle && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-md">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs sm:text-sm">
          {displayAttachment ? (
            /* Attachment Display & Preview */
            <div className="space-y-4">
              {/* File Info Bar */}
              <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
                    {category === 'image' && <ImageIcon className="w-5 h-5" />}
                    {category === 'pdf' && <FileText className="w-5 h-5 text-rose-500" />}
                    {category === 'email' && <Mail className="w-5 h-5 text-sky-500" />}
                    {category !== 'image' && category !== 'pdf' && category !== 'email' && (
                      <FileCheck className="w-5 h-5 text-emerald-500" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md text-xs sm:text-sm" title={displayAttachment.name}>
                      {displayAttachment.name}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span>{formatFileSize(displayAttachment.size)}</span>
                      <span>•</span>
                      <span>
                        {category === 'image' && 'صورة إثبات'}
                        {category === 'pdf' && 'مستند PDF'}
                        {category === 'email' && 'بريد إلكتروني (إيميل)'}
                        {category === 'document' && 'مستند وورد'}
                        {category === 'text' && 'نص كتابي'}
                        {category === 'other' && 'ملف مرفق'}
                      </span>
                      {displayAttachment.uploadedAt && (
                        <>
                          <span>•</span>
                          <span>{displayAttachment.uploadedAt.slice(0, 10)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* File Action Buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => downloadAttachment(displayAttachment)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-indigo-200 dark:border-indigo-800"
                    title="تنزيل الملف على جهازك"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تنزيل</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const win = window.open();
                      if (win) {
                        win.document.write(
                          `<iframe src="${displayAttachment.dataUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
                        );
                      }
                    }}
                    className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                    title="فتح في نافذة مستقلة"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>

                  {!readOnly && (
                    <>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                        title="استبدال الملف بملف آخر"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={handleRemove}
                        className="p-1.5 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors cursor-pointer"
                        title="حذف الملف المرفق"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Preview Container */}
              <div className="bg-slate-100 dark:bg-slate-950/80 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4 min-h-[220px] max-h-[380px] flex flex-col items-center justify-center overflow-hidden relative group">
                {category === 'image' && (
                  <div className="w-full h-full flex flex-col items-center justify-center overflow-auto max-h-[340px]">
                    <div className="relative inline-block max-w-full">
                      <img
                        src={displayAttachment.dataUrl}
                        alt="إثبات مصداقية الامتحان"
                        className="max-h-[320px] max-w-full rounded-xl object-contain shadow-sm transition-transform duration-200"
                        style={{ transform: `scale(${zoomLevel})` }}
                      />
                    </div>

                    {/* Image Zoom & View Controls */}
                    <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-xs text-white px-2.5 py-1 rounded-xl flex items-center gap-2 text-xs opacity-90 hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => setZoomLevel((prev) => Math.max(0.6, prev - 0.2))}
                        className="hover:text-amber-400 p-0.5 cursor-pointer"
                        title="تصغير"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[10px] font-mono">{Math.round(zoomLevel * 100)}%</span>
                      <button
                        type="button"
                        onClick={() => setZoomLevel((prev) => Math.min(2.5, prev + 0.2))}
                        className="hover:text-amber-400 p-0.5 cursor-pointer"
                        title="تكبير"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {category === 'pdf' && (
                  <div className="w-full h-full flex flex-col items-center justify-center py-6 text-center space-y-3">
                    <div className="p-4 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl">
                      <FileText className="w-10 h-10" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200">
                        مستند PDF مرفق للإثبات والمصداقية
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        اضغط لفتح الملف ومعاينته أو تنزيله بالكامل
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => downloadAttachment(displayAttachment)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        تنزيل ملف الـ PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => window.open(displayAttachment.dataUrl, '_blank')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                        معاينة
                      </button>
                    </div>
                  </div>
                )}

                {category === 'email' && (
                  <div className="w-full h-full flex flex-col items-center justify-center py-6 text-center space-y-3">
                    <div className="p-4 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 rounded-2xl">
                      <Mail className="w-10 h-10" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200">
                        ملف بريد إلكتروني (إيميل) موثق
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        تم إرفاق الإيميل كملف رسمي لتأكيد مصداقية النتيجة والاختبار
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => downloadAttachment(displayAttachment)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        تنزيل ملف الإيميل (.eml)
                      </button>
                    </div>
                  </div>
                )}

                {category !== 'image' && category !== 'pdf' && category !== 'email' && (
                  <div className="w-full h-full flex flex-col items-center justify-center py-6 text-center space-y-3">
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                      <FileCheck className="w-10 h-10" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200">
                        ملف إثبات ومصداقية مرفق
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {displayAttachment.name}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => downloadAttachment(displayAttachment)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      تنزيل الملف
                    </button>
                  </div>
                )}
              </div>

              {/* Notes / Remarks about the proof */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ملاحظات أو تعليق على الإثبات المرفق (اختياري)
                </label>
                <input
                  type="text"
                  disabled={readOnly}
                  value={attachmentNotes}
                  onChange={(e) => setAttachmentNotes(e.target.value)}
                  placeholder="مثال: إيميل رسمي من الإدارة، أو صورة ورقة الإجابة الأصلية..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 dark:text-white text-right"
                />
              </div>
            </div>
          ) : (
            /* Upload Zone When No Attachment */
            <div className="space-y-4">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 sm:p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 scale-[1.01]'
                    : 'border-slate-200 dark:border-slate-700 hover:border-amber-400 hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="p-4 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-3xl mb-3 shadow-xs">
                  {isProcessing ? (
                    <RefreshCw className="w-8 h-8 sm:w-10 sm:h-10 animate-spin" />
                  ) : (
                    <Upload className="w-8 h-8 sm:w-10 sm:h-10" />
                  )}
                </div>

                <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                  {isProcessing
                    ? 'جاري معالجة الملف وضغط الصورة...'
                    : 'اسحب الملف هنا أو اضغط لاختيار ملف من جهازك'}
                </h4>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                  يدعم جميع الصيغ: <strong className="text-slate-700 dark:text-slate-300">صور (PNG, JPG, WEBP)</strong>،{' '}
                  <strong className="text-slate-700 dark:text-slate-300">مستندات (PDF)</strong>،{' '}
                  <strong className="text-slate-700 dark:text-slate-300">رسائل البريد الإلكتروني (.eml, .msg)</strong>، أو ملفات نصية.
                </p>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-400">
                  <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                    <ImageIcon className="w-3 h-3 text-emerald-500" /> ضغط تلقائي للصور
                  </span>
                  <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                    <Mail className="w-3 h-3 text-sky-500" /> إثبات المصداقية
                  </span>
                  <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                    <ShieldCheck className="w-3 h-3 text-amber-500" /> حفظ سحابي
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ملاحظات مرافقة للإثبات (اختياري)
                </label>
                <input
                  type="text"
                  value={attachmentNotes}
                  onChange={(e) => setAttachmentNotes(e.target.value)}
                  placeholder="مثال: لقطة شاشة لإيميل التأكيد، أو ورقة إجابة الطالب المعتمدة..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 dark:text-white text-right"
                />
              </div>
            </div>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.eml,.msg,.txt,.doc,.docx"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {/* Modal Footer */}
        <div className="shrink-0 p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-xs flex items-center justify-between gap-3 pb-safe">
          <div className="text-slate-500 dark:text-slate-400 text-xs">
            {pendingFile ? (
              <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> تم تجهيز ملف جديد - اضغط حفظ لتثبيته
              </span>
            ) : displayAttachment ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> الملف محفوظ وجاهز للاستعراض
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              إغلاق
            </button>

            {!readOnly && (pendingFile || attachmentNotes !== (initialAttachment?.notes || '')) && (
              <button
                type="button"
                disabled={isSaving || isProcessing}
                onClick={handleConfirmSave}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs sm:text-sm font-bold text-slate-950 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-98 rounded-xl shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    حفظ المرفق
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
