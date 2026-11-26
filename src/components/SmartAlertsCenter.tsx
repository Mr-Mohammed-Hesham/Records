import React, { useMemo, useState } from 'react';
import {
  BellRing,
  X,
  Calendar,
  MessageCircle,
  Users,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ListPlus,
  Copy,
  Check,
  Layers,
  EyeOff,
  Eye,
} from 'lucide-react';
import {
  StructureSmartAlert,
  SmartAlertSeverity,
  getTodayLocalDateKey,
} from '../utils/smartAlerts';
import { normalizeWhatsAppNumber } from './StructureReminderModal';
import { useLanguage } from '../utils/i18n';

const SEVERITY_STYLES: Record<
  SmartAlertSeverity,
  {
    badge: string;
    cardBg: string;
    labelAr: string;
    labelEn: string;
    countdownClass: string;
  }
> = {
  critical: {
    badge:
      'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-800',
    cardBg:
      'bg-rose-50/70 dark:bg-rose-950/25 border-rose-200 dark:border-rose-900/60',
    labelAr: 'تنبيه عاجل',
    labelEn: 'Urgent Alert',
    countdownClass: 'text-rose-700 dark:text-rose-300',
  },
  warning: {
    badge:
      'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-800',
    cardBg:
      'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50',
    labelAr: 'اقترب الامتحان',
    labelEn: 'Exam Approaching',
    countdownClass: 'text-amber-700 dark:text-amber-300',
  },
  needs_attention: {
    badge:
      'bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-200 border-sky-300 dark:border-sky-800',
    cardBg:
      'bg-sky-50/60 dark:bg-sky-950/20 border-sky-200 dark:border-sky-900/50',
    labelAr: 'يتطلب متابعة',
    labelEn: 'Needs Follow-up',
    countdownClass: 'text-sky-700 dark:text-sky-300',
  },
  upcoming: {
    badge:
      'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    cardBg:
      'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700',
    labelAr: 'قادم قريباً',
    labelEn: 'Upcoming',
    countdownClass: 'text-slate-700 dark:text-slate-300',
  },
};

export interface SmartAlertsDashboardBannerProps {
  alerts: StructureSmartAlert[];
  dismissedToday: boolean;
  onToggleDismissToday: (dismiss: boolean) => void;
  onOpenAlertsDrawer: () => void;
  onOpenBulkReminder: (
    alert: StructureSmartAlert,
    targetMode: 'lagging' | 'incomplete'
  ) => void;
  onUpdateStructureExamDate?: (
    structureId: string,
    examDate: string
  ) => Promise<void>;
  onCreateTaskFromAlert?: (alert: StructureSmartAlert) => Promise<void>;
  onOpenStructures?: () => void;
}

export const SmartAlertsDashboardBanner: React.FC<
  SmartAlertsDashboardBannerProps
> = ({
  alerts,
  dismissedToday,
  onToggleDismissToday,
  onOpenAlertsDrawer,
  onOpenBulkReminder,
  onUpdateStructureExamDate,
  onCreateTaskFromAlert,
  onOpenStructures,
}) => {
  const { lang, tr } = useLanguage();
  const [editingDateId, setEditingDateId] = useState<string | null>(null);
  const [draftDate, setDraftDate] = useState('');
  const [savingDateId, setSavingDateId] = useState<string | null>(null);
  const [createdTaskAlertIds, setCreatedTaskAlertIds] = useState<Set<string>>(
    new Set()
  );

  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const warningCount = alerts.filter((a) => a.severity === 'warning').length;
  const totalIncompleteStudents = useMemo(() => {
    const ids = new Set<string>();
    alerts.forEach((a) =>
      a.incompleteStudents.forEach((s) => ids.add(s.student.id))
    );
    return ids.size;
  }, [alerts]);

  if (alerts.length === 0) {
    return (
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
              {tr(
                `لا توجد تنبيهات امتحانية حرجة اليوم (${getTodayLocalDateKey()})`,
                `No critical exam alerts today (${getTodayLocalDateKey()})`
              )}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {tr(
                'يمكنك تحديد «موعد الامتحان» داخل أي هيكل لتفعيل التنبيهات اليومية التلقائية عند اقتراب الاختبار.',
                'Set an Exam Date on any structure to activate automated daily exam alerts.'
              )}
            </p>
          </div>
        </div>
        {onOpenStructures && (
          <button
            type="button"
            onClick={onOpenStructures}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer transition whitespace-nowrap"
          >
            {tr('مراجعة مواعيد الهياكل', 'Review Structure Dates')}
          </button>
        )}
      </section>
    );
  }

  if (dismissedToday) {
    return (
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-300/60 dark:border-amber-800/60 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 text-xs">
          <BellRing className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="font-bold text-slate-800 dark:text-slate-100">
            {tr(
              `تمت مراجعة التنبيهات اليومية (${alerts.length} تنبيه · ${totalIncompleteStudents} طالب غير مكتمل)`,
              `Daily alerts reviewed (${alerts.length} alerts · ${totalIncompleteStudents} incomplete students)`
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleDismissToday(false)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold text-[11px] border border-amber-200 dark:border-amber-800 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{tr('إظهار التنبيهات', 'Show Alerts')}</span>
          </button>
          <button
            type="button"
            onClick={onOpenAlertsDrawer}
            className="px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 font-bold text-[11px] cursor-pointer"
          >
            {tr('مركز التنبيهات', 'Alerts Center')}
          </button>
        </div>
      </section>
    );
  }

  const topAlerts = alerts.slice(0, 3);

  return (
    <section
      id="smart-daily-alerts-banner"
      className="bg-white dark:bg-slate-900 rounded-3xl border border-amber-300/70 dark:border-amber-700/50 p-4 sm:p-5 shadow-xs space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 text-white flex items-center justify-center shadow-sm shrink-0">
            <BellRing className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                {tr(
                  'نظام التنبيهات اليومي الذكي — مستر محمد هشام',
                  'Smart Daily Alerts — Mr. Mohamed Hesham'
                )}
              </h2>
              <span className="font-mono tabular-nums text-[11px] font-bold text-slate-500 dark:text-slate-400">
                {getTodayLocalDateKey()}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              {criticalCount > 0
                ? tr(`${criticalCount} تنبيه عاجل لاقتراب الامتحان`, `${criticalCount} urgent exam alerts`)
                : warningCount > 0
                ? tr(`${warningCount} هيكل يقترب موعد امتحانه خلال أيام`, `${warningCount} upcoming exams within days`)
                : tr(`${alerts.length} هيكل يتطلب متابعة الطلاب المتأخرين`, `${alerts.length} structures need student follow-up`)}{' '}
              · <span className="font-mono tabular-nums font-bold">{totalIncompleteStudents}</span>{' '}
              {tr('طالب غير مكتمل إجمالاً', 'incomplete students total')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenAlertsDrawer}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-amber-500 hover:bg-slate-800 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-black text-xs cursor-pointer transition whitespace-nowrap"
          >
            <BellRing className="w-3.5 h-3.5" />
            <span>{tr(`عرض كل التنبيهات (${alerts.length})`, `View All Alerts (${alerts.length})`)}</span>
          </button>
          <button
            type="button"
            onClick={() => onToggleDismissToday(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[11px] cursor-pointer transition whitespace-nowrap"
            title={tr(
              'طي تنبيهات اليوم حتى الغد (تظل متاحة في جرس التنبيهات)',
              'Collapse today’s alerts until tomorrow (still available in bell icon)'
            )}
          >
            <EyeOff className="w-3.5 h-3.5" />
            <span>{tr('تمت المراجعة اليوم', 'Reviewed Today')}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {topAlerts.map((alert) => {
          const st = SEVERITY_STYLES[alert.severity];
          const isEditingThisDate = editingDateId === alert.structure.id;
          const taskAlreadyAdded = createdTaskAlertIds.has(alert.id);
          const laggingCount = alert.laggingStudents.length;

          return (
            <div
              key={alert.id}
              className={`rounded-2xl border p-3.5 flex flex-col justify-between gap-3 ${st.cardBg}`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border font-black ${st.badge}`}
                  >
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>{lang === 'ar' ? st.labelAr : st.labelEn}</span>
                  </span>
                  <span className={`font-mono tabular-nums font-black ${st.countdownClass}`}>
                    {alert.countdownLabel}
                  </span>
                </div>

                <div>
                  <h4 className="font-black text-sm text-slate-900 dark:text-white leading-snug">
                    {alert.structure.title}
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                    {alert.structure.grade} · {alert.structure.subject} · {alert.structure.track}
                  </p>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                  {alert.reason}
                </p>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-600 dark:text-slate-300">
                      {tr('نسبة إنجاز الطلاب بالهيكل', 'Student Completion')}
                    </span>
                    <span className="font-mono tabular-nums text-slate-900 dark:text-white">
                      {alert.avgCompletionPct}% ({alert.completedStudentsCount}/{alert.totalEligibleCount} {tr('مكتمل', 'done')})
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/80 dark:bg-slate-800 overflow-hidden border border-slate-200/60 dark:border-slate-700">
                    <div
                      style={{ width: `${Math.min(100, alert.avgCompletionPct)}%` }}
                      className={`h-full rounded-full ${
                        alert.avgCompletionPct >= 75
                          ? 'bg-emerald-500'
                          : alert.avgCompletionPct >= 45
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Inline quick examDate setter */}
                {isEditingThisDate && onUpdateStructureExamDate ? (
                  <div className="flex items-center gap-1.5 pt-1">
                    <input
                      type="date"
                      value={draftDate}
                      onChange={(e) => setDraftDate(e.target.value)}
                      className="flex-1 px-2 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                    />
                    <button
                      type="button"
                      disabled={savingDateId === alert.structure.id || !draftDate}
                      onClick={async () => {
                        setSavingDateId(alert.structure.id);
                        try {
                          await onUpdateStructureExamDate(alert.structure.id, draftDate);
                          setEditingDateId(null);
                        } finally {
                          setSavingDateId(null);
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold cursor-pointer disabled:opacity-50"
                    >
                      {tr('حفظ', 'Save')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingDateId(null)}
                      className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold cursor-pointer"
                    >
                      {tr('إلغاء', 'Cancel')}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-mono tabular-nums">
                      {tr('موعد الامتحان:', 'Exam Date:')} {alert.structure.examDate || tr('غير محدد', 'Unset')}
                    </span>
                    {onUpdateStructureExamDate && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingDateId(alert.structure.id);
                          setDraftDate(alert.structure.examDate || getTodayLocalDateKey());
                        }}
                        className="text-amber-700 dark:text-amber-300 font-bold hover:underline cursor-pointer"
                      >
                        {alert.structure.examDate ? tr('تعديل الموعد', 'Edit Date') : tr('تحديد الموعد', 'Set Date')}
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200/70 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() =>
                    onOpenBulkReminder(
                      alert,
                      laggingCount > 0 ? 'lagging' : 'incomplete'
                    )
                  }
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] cursor-pointer transition whitespace-nowrap"
                >
                  <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {tr('تذكير واتساب', 'WhatsApp Remind')} ({laggingCount > 0 ? laggingCount : alert.incompleteStudents.length})
                  </span>
                </button>

                {onCreateTaskFromAlert && (
                  <button
                    type="button"
                    disabled={taskAlreadyAdded}
                    onClick={async () => {
                      await onCreateTaskFromAlert(alert);
                      setCreatedTaskAlertIds((prev) => new Set([...prev, alert.id]));
                    }}
                    className="inline-flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-amber-400 font-bold text-[11px] cursor-pointer transition disabled:opacity-60 whitespace-nowrap"
                    title={tr('تحويل هذا التنبيه إلى مهمة في مساحة عمل المعلم', 'Add to Teacher Workspace Tasks')}
                  >
                    {taskAlreadyAdded ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{tr('أضيفت كمهمة', 'Added')}</span>
                      </>
                    ) : (
                      <>
                        <ListPlus className="w-3.5 h-3.5 text-amber-500" />
                        <span>{tr('مهمة', 'Task')}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export interface SmartAlertsDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: StructureSmartAlert[];
  teacherName?: string;
  onOpenBulkReminder: (
    alert: StructureSmartAlert,
    targetMode: 'lagging' | 'incomplete'
  ) => void;
  onUpdateStructureExamDate: (
    structureId: string,
    examDate: string
  ) => Promise<void>;
  onCreateTaskFromAlert: (alert: StructureSmartAlert) => Promise<void>;
  onNavigateToStructures: () => void;
}

export const SmartAlertsDrawerModal: React.FC<SmartAlertsDrawerModalProps> = ({
  isOpen,
  onClose,
  alerts,
  teacherName = 'أ/ محمد هشام',
  onOpenBulkReminder,
  onUpdateStructureExamDate,
  onCreateTaskFromAlert,
  onNavigateToStructures,
}) => {
  const { lang, dir, tr } = useLanguage();
  const [severityFilter, setSeverityFilter] = useState<'all' | SmartAlertSeverity>('all');
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);
  const [editingDateId, setEditingDateId] = useState<string | null>(null);
  const [draftDate, setDraftDate] = useState('');
  const [savingDate, setSavingDate] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [addedTaskIds, setAddedTaskIds] = useState<Set<string>>(new Set());

  const filteredAlerts = useMemo(() => {
    if (severityFilter === 'all') return alerts;
    return alerts.filter((a) => a.severity === severityFilter);
  }, [alerts, severityFilter]);

  if (!isOpen) return null;

  const buildQuickWhatsAppMessage = (
    alert: StructureSmartAlert,
    snap: StructureSmartAlert['incompleteStudents'][number]
  ): string => {
    const missingText =
      snap.missingQuestionNumbers.length === 0
        ? 'استكمال المراجعة'
        : snap.missingQuestionNumbers.length <= 8
        ? snap.missingQuestionNumbers.map((q) => `س${q}`).join('، ')
        : `${snap.missingQuestionNumbers.slice(0, 6).map((q) => `س${q}`).join('، ')} (+${snap.missingQuestionNumbers.length - 6})`;
    const examLine = alert.structure.examDate
      ? `موعد الامتحان: ${alert.structure.examDate} (${alert.countdownLabel})`
      : `يرجى الاستكمال قبل موعد الامتحان`;

    return (
      `السلام عليكم ${snap.student.name} 📚\n` +
      `تذكير هام باستكمال حل أسئلة «${alert.structure.title}» (${alert.structure.subject}).\n` +
      `${examLine}\n` +
      `إنجازك الحالي: ${snap.solvedCount} من ${snap.totalQuestions} (${snap.completionPct}%)\n` +
      `الأسئلة المتبقية: ${missingText}\n` +
      `يرجى سرعة الحل والمراجعة.\n` +
      `${teacherName}`
    );
  };

  const handleCopyBatchBundle = async (alert: StructureSmartAlert) => {
    const bundle = alert.incompleteStudents
      .map((snap, idx) => {
        const phone = snap.student.phone || snap.student.parentPhone || 'بدون رقم';
        return `${idx + 1}. ${snap.student.name} (${phone})\n${buildQuickWhatsAppMessage(alert, snap)}`;
      })
      .join('\n\n──────────────────\n\n');
    try {
      await navigator.clipboard.writeText(bundle);
      setCopiedKey(alert.id);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 overflow-hidden"
      onClick={onClose}
      dir={dir}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]"
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 text-white flex items-center justify-center shrink-0">
              <BellRing className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate">
                {tr(
                  'مركز التنبيهات الذكية والتذكير الجماعي (واتساب)',
                  'Smart Alerts & Bulk WhatsApp Reminder Center'
                )}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {tr(
                  'متابعة الهياكل التي اقترب موعد امتحانها والطلاب المتأخرين في الحل على مستوى المنصة',
                  'Monitor approaching exam structures and lagging students across the platform'
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-700 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="px-4 sm:px-6 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0 bg-white dark:bg-slate-900">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'all', label: tr(`الكل (${alerts.length})`, `All (${alerts.length})`) },
                {
                  id: 'critical',
                  label: tr(
                    `عاجل (${alerts.filter((a) => a.severity === 'critical').length})`,
                    `Urgent (${alerts.filter((a) => a.severity === 'critical').length})`
                  ),
                },
                {
                  id: 'warning',
                  label: tr(
                    `خلال أسبوع (${alerts.filter((a) => a.severity === 'warning').length})`,
                    `This Week (${alerts.filter((a) => a.severity === 'warning').length})`
                  ),
                },
                {
                  id: 'needs_attention',
                  label: tr(
                    `بدون موعد / متابعة (${alerts.filter((a) => a.severity === 'needs_attention').length})`,
                    `Unscheduled (${alerts.filter((a) => a.severity === 'needs_attention').length})`
                  ),
                },
              ] as Array<{ id: 'all' | SmartAlertSeverity; label: string }>
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSeverityFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition whitespace-nowrap ${
                  severityFilter === f.id
                    ? 'bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onNavigateToStructures();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{tr('فتح قسم الهياكل', 'Open Structures')}</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {filteredAlerts.length === 0 ? (
            <div className="py-12 text-center space-y-2 text-slate-400">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                {tr('لا توجد تنبيهات مطابقة حالياً', 'No matching alerts right now')}
              </p>
              <p className="text-xs">
                {tr(
                  'جميع الهياكل في هذا النطاق إما مكتملة أو لم يحن موعد تنبيهها بعد.',
                  'All structures in this range are completed or not yet due.'
                )}
              </p>
            </div>
          ) : (
            filteredAlerts.map((alert) => {
              const st = SEVERITY_STYLES[alert.severity];
              const isExpanded = expandedAlertId === alert.id;
              const isEditingDate = editingDateId === alert.structure.id;
              const isTaskAdded = addedTaskIds.has(alert.id);

              return (
                <div
                  key={alert.id}
                  className={`rounded-2xl border p-4 space-y-3 ${st.cardBg}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        <span className={`px-2 py-0.5 rounded-lg border font-black ${st.badge}`}>
                          {lang === 'ar' ? st.labelAr : st.labelEn}
                        </span>
                        <span className={`font-mono tabular-nums font-black ${st.countdownClass}`}>
                          {alert.countdownLabel}
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-600 dark:text-slate-300 font-semibold">
                          {alert.structure.grade} · {alert.structure.subject} · {alert.structure.track}
                        </span>
                      </div>

                      <h3 className="text-base font-black text-slate-900 dark:text-white">
                        {alert.structure.title}
                      </h3>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        {alert.reason}
                      </p>

                      {/* Exam date inline setter */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                        <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                        {isEditingDate ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="date"
                              value={draftDate}
                              onChange={(e) => setDraftDate(e.target.value)}
                              className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs"
                            />
                            <button
                              type="button"
                              disabled={savingDate || !draftDate}
                              onClick={async () => {
                                setSavingDate(true);
                                try {
                                  await onUpdateStructureExamDate(
                                    alert.structure.id,
                                    draftDate
                                  );
                                  setEditingDateId(null);
                                } finally {
                                  setSavingDate(false);
                                }
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                            >
                              {tr('حفظ', 'Save')}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingDateId(null)}
                              className="px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
                            >
                              {tr('إلغاء', 'Cancel')}
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="font-mono tabular-nums font-bold text-slate-700 dark:text-slate-200">
                              {tr('موعد الامتحان:', 'Exam Date:')} {alert.structure.examDate || tr('غير محدد', 'Unset')}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingDateId(alert.structure.id);
                                setDraftDate(
                                  alert.structure.examDate || getTodayLocalDateKey()
                                );
                              }}
                              className="text-amber-700 dark:text-amber-300 font-bold hover:underline cursor-pointer"
                            >
                              {alert.structure.examDate
                                ? tr('تغيير الموعد', 'Change Date')
                                : tr('+ تحديد موعد الامتحان', '+ Set Exam Date')}
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* KPI & Actions */}
                    <div className="flex flex-col sm:items-end gap-2 shrink-0">
                      <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
                        <div className="text-center px-3 py-1.5 rounded-xl bg-white/80 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700">
                          <div className="text-[10px] text-slate-500">
                            {tr('متوسط الإنجاز', 'Avg Completion')}
                          </div>
                          <div className="font-black text-slate-900 dark:text-white">
                            {alert.avgCompletionPct}%
                          </div>
                        </div>
                        <div className="text-center px-3 py-1.5 rounded-xl bg-white/80 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700">
                          <div className="text-[10px] text-slate-500">
                            {tr('غير مكتمل', 'Incomplete')}
                          </div>
                          <div className="font-black text-rose-600 dark:text-rose-400">
                            {alert.incompleteStudents.length} / {alert.totalEligibleCount}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            onOpenBulkReminder(
                              alert,
                              alert.laggingStudents.length > 0 ? 'lagging' : 'incomplete'
                            )
                          }
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs cursor-pointer transition"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>
                            {tr('مركز التذكير الجماعي (واتساب / Excel)', 'Bulk Reminder (WhatsApp / Excel)')}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopyBatchBundle(alert)}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer hover:border-amber-400"
                          title={tr('نسخ رسائل التذكير لجميع الطلاب المتأخرين دفعة واحدة', 'Copy all reminder messages')}
                        >
                          {copiedKey === alert.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {copiedKey === alert.id
                              ? tr('تم النسخ', 'Copied')
                              : tr('نسخ الكل', 'Copy All')}
                          </span>
                        </button>

                        <button
                          type="button"
                          disabled={isTaskAdded}
                          onClick={async () => {
                            await onCreateTaskFromAlert(alert);
                            setAddedTaskIds((prev) => new Set([...prev, alert.id]));
                          }}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer hover:border-amber-400 disabled:opacity-60"
                        >
                          {isTaskAdded ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <ListPlus className="w-3.5 h-3.5 text-amber-500" />
                          )}
                          <span>
                            {isTaskAdded
                              ? tr('تمت الإضافة للمهام', 'Added to Tasks')
                              : tr('إضافة كمهمة', 'Add as Task')}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setExpandedAlertId(isExpanded ? null : alert.id)
                          }
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-900/5 dark:bg-white/10 text-slate-800 dark:text-slate-100 font-bold text-xs cursor-pointer"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>
                            {tr(
                              `قائمة المتأخرين (${alert.incompleteStudents.length})`,
                              `Lagging Students (${alert.incompleteStudents.length})`
                            )}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Quick inline WhatsApp list */}
                  {isExpanded && (
                    <div className="pt-3 border-t border-slate-200/70 dark:border-slate-700/70">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto px-1">
                        {alert.incompleteStudents.map((snap) => {
                          const msg = buildQuickWhatsAppMessage(alert, snap);
                          const stWa = normalizeWhatsAppNumber(snap.student.phone);
                          const parentWa = normalizeWhatsAppNumber(
                            snap.student.parentPhone
                          );

                          return (
                            <div
                              key={snap.student.id}
                              className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 text-xs"
                            >
                              <div className="min-w-0">
                                <div className="font-extrabold text-slate-900 dark:text-white truncate">
                                  {snap.student.name}
                                </div>
                                <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                                  {tr('إنجاز', 'Progress')} {snap.completionPct}% ({snap.solvedCount}/{snap.totalQuestions})
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {stWa && (
                                  <a
                                    href={`https://wa.me/${stWa}?text=${encodeURIComponent(msg)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px]"
                                  >
                                    <MessageCircle className="w-3 h-3" />
                                    <span>{tr('طالب', 'Student')}</span>
                                  </a>
                                )}
                                {parentWa && (
                                  <a
                                    href={`https://wa.me/${parentWa}?text=${encodeURIComponent(msg)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px]"
                                  >
                                    <MessageCircle className="w-3 h-3" />
                                    <span>{tr('ولي أمر', 'Parent')}</span>
                                  </a>
                                )}
                                {!stWa && !parentWa && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        await navigator.clipboard.writeText(msg);
                                        setCopiedKey(snap.student.id);
                                        setTimeout(() => setCopiedKey(null), 1500);
                                      } catch {}
                                    }}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-[11px] cursor-pointer"
                                  >
                                    {copiedKey === snap.student.id ? (
                                      <Check className="w-3 h-3 text-emerald-500" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                    <span>{tr('نسخ', 'Copy')}</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
