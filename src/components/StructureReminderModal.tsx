import React, { useState, useMemo, useEffect } from 'react';
import {
  BellRing,
  X,
  Search,
  Copy,
  Check,
  MessageCircle,
  Mail,
  FileSpreadsheet,
  Users,
  CheckSquare,
  Square,
  Phone,
  Sparkles,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import {
  ExamStructure,
  Student,
  StudentStructureProgress,
} from '../types';
import { getStructureStatusLabel } from '../utils/structureStatus';
import { exportStructureRemindersExcel } from '../utils/excel';
import { useLanguage, translateGrade, translateSubject } from '../utils/i18n';
import { ConfirmModal } from './ConfirmModal';

export type ReminderAudiencePreset =
  | 'custom'
  | 'incomplete'
  | 'low_progress'
  | 'not_started'
  | 'all';

type ReminderTemplateId =
  | 'friendly_completion'
  | 'parent_followup'
  | 'pre_exam_alert'
  | 'accuracy_boost';

interface ReminderLogEntry {
  remindedAt: string;
  channel: string;
}

const REMINDER_LOG_STORAGE_KEY = 'mh_structure_reminders_log_v1';

function loadReminderLogs(): Record<string, ReminderLogEntry> {
  try {
    const raw = localStorage.getItem(REMINDER_LOG_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveReminderLogs(logs: Record<string, ReminderLogEntry>) {
  try {
    localStorage.setItem(REMINDER_LOG_STORAGE_KEY, JSON.stringify(logs));
  } catch {
    // ignore storage quota errors
  }
}

export function normalizeWhatsAppNumber(raw?: string): string | null {
  if (!raw) return null;
  let digits = raw.replace(/[^\d+]/g, '');
  if (!digits) return null;
  if (digits.startsWith('+')) {
    digits = digits.slice(1);
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }
  // Convert UAE local 05xxxxxxxx -> 9715xxxxxxxx
  if (digits.length === 10 && digits.startsWith('05')) {
    digits = '971' + digits.slice(1);
  }
  // Convert Egyptian local 01xxxxxxxxx -> 201xxxxxxxxx if 11 digits starting with 01
  if (digits.length === 11 && digits.startsWith('01')) {
    digits = '2' + digits;
  }
  if (digits.length < 8) return null;
  return digits;
}

const MESSAGE_TEMPLATES: Array<{
  id: ReminderTemplateId;
  label: string;
  body: string;
}> = [
  {
    id: 'friendly_completion',
    label: 'تذكير ودّي للطالب باستكمال الهيكل',
    body:
      'السلام عليكم {اسم_الطالب} 🌟\n' +
      'تذكير مهم بمتابعة حل أسئلة «{اسم_الهيكل}» ({المادة}).\n' +
      'إنجازك الحالي: {المحلول} من {الاجمالي} سؤال ({نسبة_الإنجاز}%) | نسبة الصحة: {نسبة_الصحة}%.\n' +
      'المتبقي للاستكمال: {المتبقي} سؤال ({الأسئلة_المتبقية}).\n' +
      'يرجى استكمال الأسئلة المتبقية في أقرب وقت.\n' +
      'مع تمنياتي لك بالتوفيق، {اسم_المعلم}',
  },
  {
    id: 'parent_followup',
    label: 'متابعة ولي الأمر (تقرير إنجاز)',
    body:
      'السلام عليكم ولي أمر الطالب/ة {اسم_الطالب} المحترم،\n' +
      'نود إحاطتكم بمستوى تقدم الطالب في «{اسم_الهيكل}» لمادة {المادة} (حالة الهيكل: {حالة_الهيكل}).\n' +
      '• الأسئلة المحلولة: {المحلول} من {الاجمالي} ({نسبة_الإنجاز}%)\n' +
      '• متوسط نسبة الصحة: {نسبة_الصحة}%\n' +
      '• الأسئلة المتبقية: {المتبقي} سؤال ({الأسئلة_المتبقية})\n' +
      'نرجو متابعة الطالب لاستكمال المطلوب، مع خالص الشكر والتقدير.\n' +
      '{اسم_المعلم}',
  },
  {
    id: 'pre_exam_alert',
    label: 'تنبيه المراجعة قبل امتحان المادة',
    body:
      'تنبيه هام قبل الامتحان — الطالب/ة {اسم_الطالب} 📚\n' +
      'حالة «{اسم_الهيكل}» ({المادة}) هي: {حالة_الهيكل}.\n' +
      'رصيدك الحالي: {المحلول} من {الاجمالي} سؤال ({نسبة_الإنجاز}%).\n' +
      'يرجى سرعة مراجعة وحل الأسئلة المتبقية ({الأسئلة_المتبقية}) قبل موعد الامتحان.\n' +
      'بالتوفيق والنجاح، {اسم_المعلم}',
  },
  {
    id: 'accuracy_boost',
    label: 'تحفيز وتحسين الدرجة',
    body:
      'مرحباً {اسم_الطالب} ✨\n' +
      'أحسنت في البدء بحل «{اسم_الهيكل}» ({المادة})، وصلت نسبة صحتك إلى {نسبة_الصحة}% وإنجازك {نسبة_الإنجاز}%.\n' +
      'يمكنك رفع درجتك عبر مراجعة الأسئلة المتبقية أو تحسين المحاولات السابقة ({الأسئلة_المتبقية}).\n' +
      'أنا بانتظار إنجازك المتميز! — {اسم_المعلم}',
  },
];

interface StudentReminderRow {
  student: Student;
  latestProgress: StudentStructureProgress | null;
  solvedCount: number;
  totalQuestions: number;
  remainingCount: number;
  completionPct: number;
  accuracyPct: number;
  missingQuestionNumbers: number[];
}

interface StructureReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  structure: ExamStructure;
  students: Student[];
  progressByStudentMap: Map<string, StudentStructureProgress[]>;
  teacherName?: string;
  initialStudentIds?: string[];
  initialAudienceLabel?: string;
  onDirtyChange?: (dirty: boolean) => void;
}

export const StructureReminderModal: React.FC<StructureReminderModalProps> = ({
  isOpen,
  onClose,
  structure,
  students,
  progressByStudentMap,
  teacherName = 'أ/ محمد هشام',
  initialStudentIds,
  initialAudienceLabel,
  onDirtyChange,
}) => {
  const { lang, dir, tr } = useLanguage();
  const [audiencePreset, setAudiencePreset] = useState<ReminderAudiencePreset>(
    initialStudentIds && initialStudentIds.length > 0 ? 'custom' : 'incomplete'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [templateId, setTemplateId] = useState<ReminderTemplateId>(
    structure.completionStatus === 'studied_not_examined'
      ? 'pre_exam_alert'
      : 'friendly_completion'
  );
  const [messageTemplate, setMessageTemplate] = useState<string>(
    structure.completionStatus === 'studied_not_examined'
      ? MESSAGE_TEMPLATES[2].body
      : MESSAGE_TEMPLATES[0].body
  );
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<Set<string>>(
    new Set()
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [reminderLogs, setReminderLogs] = useState<Record<string, ReminderLogEntry>>(() =>
    loadReminderLogs()
  );
  const [confirmExitOpen, setConfirmExitOpen] = useState(false);

  // Build eligible student rows for this structure
  const cohortRows = useMemo<StudentReminderRow[]>(() => {
    const excludedSet = new Set(structure.excludedStudentIds || []);
    const totalQ = Math.max(
      1,
      structure.totalQuestions || structure.questions?.length || 1
    );

    const eligible = students.filter((st) => {
      if (excludedSet.has(st.id)) return false;
      const hasProg = progressByStudentMap.has(st.id);
      if (hasProg) return true;
      if (st.enrollmentStatus === 'completed' || st.enrollmentStatus === 'withdrawn') {
        return false;
      }
      if (st.grade !== structure.grade) return false;
      if (st.term && structure.term && st.term !== structure.term) return false;
      if (st.track && structure.track && st.track !== structure.track) return false;
      if (
        st.academicYear &&
        structure.academicYear &&
        st.academicYear !== structure.academicYear
      ) {
        return false;
      }
      return true;
    });

    return eligible
      .map((student) => {
        const attempts = progressByStudentMap.get(student.id) || [];
        const latest = attempts.length > 0 ? attempts[attempts.length - 1] : null;
        const solvedCount = latest
          ? Math.min(totalQ, Math.max(0, latest.solvedCount || 0))
          : 0;
        const completionPct = latest
          ? latest.completionPercentage ??
            Math.round((solvedQOrZero(solvedCount) / totalQ) * 1000) / 10
          : 0;
        const accuracyPct = latest ? latest.overallAccuracyPercentage || 0 : 0;

        const solvedNumbersSet = new Set<number>(
          (latest?.questionScores || [])
            .filter((q) => q.solved)
            .map((q) => q.questionNumber)
        );
        const missingQuestionNumbers: number[] = [];
        for (let q = 1; q <= totalQ; q++) {
          if (!solvedNumbersSet.has(q)) missingQuestionNumbers.push(q);
        }

        return {
          student,
          latestProgress: latest,
          solvedCount,
          totalQuestions: totalQ,
          remainingCount: Math.max(0, totalQ - solvedCount),
          completionPct,
          accuracyPct,
          missingQuestionNumbers,
        };
      })
      .sort((a, b) => a.completionPct - b.completionPct || a.student.name.localeCompare(b.student.name, 'ar'));
  }, [students, structure, progressByStudentMap]);

  function solvedQOrZero(val: number): number {
    return Number.isFinite(val) ? val : 0;
  }

  // Initialize selection when modal opens
  useEffect(() => {
    if (!isOpen) return;
    if (initialStudentIds && initialStudentIds.length > 0) {
      setAudiencePreset('custom');
      setSelectedRecipientIds(new Set(initialStudentIds));
    } else {
      setAudiencePreset('incomplete');
      setSelectedRecipientIds(
        new Set(cohortRows.filter((r) => r.completionPct < 100).map((r) => r.student.id))
      );
    }
    const defaultTpl =
      structure.completionStatus === 'studied_not_examined'
        ? MESSAGE_TEMPLATES[2]
        : MESSAGE_TEMPLATES[0];
    setTemplateId(defaultTpl.id);
    setMessageTemplate(defaultTpl.body);
    setSearchQuery('');
    setConfirmExitOpen(false);
  }, [isOpen, structure.id, initialStudentIds]);

  const activePresetTemplateBody =
    MESSAGE_TEMPLATES.find((t) => t.id === templateId)?.body || MESSAGE_TEMPLATES[0].body;
  const isTemplateModified =
    isOpen && messageTemplate.trim() !== activePresetTemplateBody.trim();

  useEffect(() => {
    onDirtyChange?.(isTemplateModified);
  }, [isTemplateModified, onDirtyChange]);

  useEffect(() => {
    return () => {
      onDirtyChange?.(false);
    };
  }, [onDirtyChange]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isTemplateModified) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isTemplateModified]);

  const requestSafeClose = () => {
    if (!isTemplateModified) {
      onClose();
      return;
    }
    setConfirmExitOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      if (confirmExitOpen) {
        setConfirmExitOpen(false);
      } else {
        requestSafeClose();
      }
    };
    window.addEventListener('keydown', handleEsc, { capture: true });
    return () => window.removeEventListener('keydown', handleEsc, { capture: true });
  });

  const applyAudiencePreset = (preset: ReminderAudiencePreset) => {
    setAudiencePreset(preset);
    if (preset === 'custom' && initialStudentIds) {
      setSelectedRecipientIds(new Set(initialStudentIds));
      return;
    }
    if (preset === 'incomplete') {
      setSelectedRecipientIds(
        new Set(cohortRows.filter((r) => r.completionPct < 100).map((r) => r.student.id))
      );
      return;
    }
    if (preset === 'low_progress') {
      setSelectedRecipientIds(
        new Set(cohortRows.filter((r) => r.completionPct <= 50).map((r) => r.student.id))
      );
      return;
    }
    if (preset === 'not_started') {
      setSelectedRecipientIds(
        new Set(cohortRows.filter((r) => r.solvedCount === 0).map((r) => r.student.id))
      );
      return;
    }
    setSelectedRecipientIds(new Set(cohortRows.map((r) => r.student.id)));
  };

  const visibleRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return cohortRows.filter((row) => {
      if (!q) return true;
      return (
        row.student.name.toLowerCase().includes(q) ||
        row.student.studentId.toLowerCase().includes(q) ||
        (row.student.phone || '').includes(q) ||
        (row.student.parentPhone || '').includes(q)
      );
    });
  }, [cohortRows, searchQuery]);

  const selectedRows = useMemo(
    () => cohortRows.filter((r) => selectedRecipientIds.has(r.student.id)),
    [cohortRows, selectedRecipientIds]
  );

  const buildPersonalizedMessage = (row: StudentReminderRow): string => {
    const missingSummary =
      row.missingQuestionNumbers.length === 0
        ? 'لا توجد أسئلة متبقية'
        : row.missingQuestionNumbers.length <= 8
        ? row.missingQuestionNumbers.map((n) => `س${n}`).join('، ')
        : `${row.missingQuestionNumbers
            .slice(0, 6)
            .map((n) => `س${n}`)
            .join('، ')} (+${row.missingQuestionNumbers.length - 6} أخرى)`;

    const structStatus = getStructureStatusLabel(structure);

    return messageTemplate
      .replace(/\{اسم_الطالب\}/g, row.student.name)
      .replace(/\{اسم_الهيكل\}/g, structure.title)
      .replace(/\{المادة\}/g, structure.subject)
      .replace(/\{الصف\}/g, structure.grade)
      .replace(/\{المحلول\}/g, String(row.solvedCount))
      .replace(/\{الاجمالي\}/g, String(row.totalQuestions))
      .replace(/\{المتبقي\}/g, String(row.remainingCount))
      .replace(/\{نسبة_الإنجاز\}/g, String(row.completionPct))
      .replace(/\{نسبة_الصحة\}/g, String(row.accuracyPct))
      .replace(/\{الأسئلة_المتبقية\}/g, missingSummary)
      .replace(/\{حالة_الهيكل\}/g, structStatus)
      .replace(/\{اسم_المعلم\}/g, teacherName || 'معلم المادة');
  };

  const markAsReminded = (studentDocId: string, channel: string) => {
    const key = `${structure.id}__${studentDocId}`;
    const updated: Record<string, ReminderLogEntry> = {
      ...reminderLogs,
      [key]: {
        remindedAt: new Date().toISOString(),
        channel,
      },
    };
    setReminderLogs(updated);
    saveReminderLogs(updated);
  };

  const handleCopyText = async (text: string, idKey: string, markStudentId?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(idKey);
      if (markStudentId) {
        markAsReminded(markStudentId, 'نسخ الرسالة');
      }
      setTimeout(() => {
        setCopiedId((prev) => (prev === idKey ? null : prev));
      }, 1800);
    } catch {
      // Clipboard blocked fallback: no crash
    }
  };

  const handleCopyAllMessages = async () => {
    if (selectedRows.length === 0) return;
    const bundle = selectedRows
      .map((row, idx) => {
        const phone = row.student.phone || row.student.parentPhone || 'بدون رقم';
        return `${idx + 1}. ${row.student.name} (${phone})\n${buildPersonalizedMessage(row)}`;
      })
      .join('\n\n────────────────────\n\n');
    await handleCopyText(bundle, '__all_msgs__');
  };

  const handleCopyPhonesList = async () => {
    const phones = Array.from(
      new Set(
        selectedRows
          .flatMap((r) => [r.student.phone, r.student.parentPhone])
          .filter((p): p is string => Boolean(p && p.trim()))
      )
    );
    if (phones.length === 0) return;
    await handleCopyText(phones.join('\n'), '__all_phones__');
  };

  const handleExportRemindersExcel = () => {
    const exportTargets = selectedRows.length > 0 ? selectedRows : cohortRows;
    exportStructureRemindersExcel(
      structure,
      exportTargets.map((r) => ({
        student: r.student,
        solvedCount: r.solvedCount,
        totalQuestions: r.totalQuestions,
        remainingCount: r.remainingCount,
        completionPercentage: r.completionPct,
        overallAccuracyPercentage: r.accuracyPct,
        missingQuestionsText:
          r.missingQuestionNumbers.length > 0
            ? r.missingQuestionNumbers.map((n) => `س${n}`).join('، ')
            : 'مكتمل',
        remindedInfo: reminderLogs[`${structure.id}__${r.student.id}`] || null,
        messageText: buildPersonalizedMessage(r),
      }))
    );
  };

  const toggleStudent = (id: string) => {
    setSelectedRecipientIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!isOpen) return null;

  const incompleteCount = cohortRows.filter((r) => r.completionPct < 100).length;
  const lowProgressCount = cohortRows.filter((r) => r.completionPct <= 50).length;
  const notStartedCount = cohortRows.filter((r) => r.solvedCount === 0).length;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) requestSafeClose();
      }}
      dir={dir}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[94dvh] sm:max-h-[90vh] text-start"
      >
        {/* Header */}
        <div className="shrink-0 px-4 sm:px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <BellRing className="w-5 h-5 text-amber-500 shrink-0" />
              <span className="truncate">{tr(`مركز تذكير ومتابعة الطلاب — ${structure.title}`, `Student Reminders Hub — ${structure.title}`)}</span>
            </h3>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5">
              <span>{translateGrade(structure.grade, lang)}</span>
              <span aria-hidden="true">·</span>
              <span>{translateSubject(structure.subject, lang)}</span>
              <span aria-hidden="true">·</span>
              <span>{getStructureStatusLabel(structure, true)}</span>
              {initialAudienceLabel && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold">
                    {initialAudienceLabel}
                  </span>
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={requestSafeClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-700 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {/* 1. Target Audience Presets */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-500" />
                <span>{tr('تحديد فئة الطلاب المستهدفين بالتذكير:', 'Select target students group:')}</span>
              </span>
              <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {tr('المحدد للإرسال:', 'Selected:')} <strong className="text-amber-600 dark:text-amber-400">{selectedRecipientIds.size}</strong> / {cohortRows.length}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              {initialStudentIds && initialStudentIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => applyAudiencePreset('custom')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer whitespace-nowrap ${
                    audiencePreset === 'custom'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60'
                  }`}
                >
                  {tr(`المحددين (${initialStudentIds.length})`, `Targeted (${initialStudentIds.length})`)}
                </button>
              )}
              <button
                type="button"
                onClick={() => applyAudiencePreset('incomplete')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer whitespace-nowrap ${
                  audiencePreset === 'incomplete'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60'
                }`}
              >
                {tr(`غير المكتملين <100% (${incompleteCount})`, `Incomplete <100% (${incompleteCount})`)}
              </button>
              <button
                type="button"
                onClick={() => applyAudiencePreset('low_progress')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer whitespace-nowrap ${
                  audiencePreset === 'low_progress'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60'
                }`}
              >
                {tr(`منخفضي الإنجاز ≤50% (${lowProgressCount})`, `Lagging ≤50% (${lowProgressCount})`)}
              </button>
              <button
                type="button"
                onClick={() => applyAudiencePreset('not_started')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer whitespace-nowrap ${
                  audiencePreset === 'not_started'
                    ? 'bg-slate-900 dark:bg-slate-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60'
                }`}
              >
                {tr(`لم يبدأوا الحل 0% (${notStartedCount})`, `Not Started 0% (${notStartedCount})`)}
              </button>
              <button
                type="button"
                onClick={() => applyAudiencePreset('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer whitespace-nowrap ${
                  audiencePreset === 'all'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60'
                }`}
              >
                {tr(`جميع طلاب الهيكل (${cohortRows.length})`, `All Cohort (${cohortRows.length})`)}
              </button>
            </div>
          </div>

          {/* 2. Message Template Selector & Customizer */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 bg-slate-50/70 dark:bg-slate-800/40 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{tr('قالب رسالة التذكير (يتخصص تلقائياً باسم وإنجاز كل طالب):', 'Reminder Message Template (auto-personalized per student):')}</span>
              </span>
              <div className="flex flex-wrap gap-1">
                {MESSAGE_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => {
                      setTemplateId(tpl.id);
                      setMessageTemplate(tpl.body);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer whitespace-nowrap ${
                      templateId === tpl.id
                        ? 'bg-amber-500 text-slate-950 border-amber-500'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                    }`}
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              rows={4}
              value={messageTemplate}
              onChange={(e) => setMessageTemplate(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs leading-relaxed focus:outline-hidden focus:border-amber-500"
            />

            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
              <span className="font-bold">متغيرات ذكية جاهزة:</span>
              {[
                '{اسم_الطالب}',
                '{اسم_الهيكل}',
                '{المحلول}',
                '{الاجمالي}',
                '{المتبقي}',
                '{نسبة_الإنجاز}',
                '{نسبة_الصحة}',
                '{الأسئلة_المتبقية}',
                '{حالة_الهيكل}',
              ].map((token) => (
                <button
                  key={token}
                  type="button"
                  onClick={() => setMessageTemplate((prev) => `${prev} ${token}`)}
                  className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-amber-400 font-mono text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  {token}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Recipient Search & Quick Select Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="relative flex-1 min-w-[210px]">
              <Search className="w-4 h-4 text-slate-400 absolute start-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={tr('ابحث بالاسم أو الكود أو رقم الهاتف...', 'Search by name, code, or phone...')}
                className="w-full ps-9 pe-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  setSelectedRecipientIds(new Set(visibleRows.map((r) => r.student.id)))
                }
                className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-[11px] hover:border-amber-500 cursor-pointer whitespace-nowrap"
              >
                {tr(`تحديد الظاهرين (${visibleRows.length})`, `Select Visible (${visibleRows.length})`)}
              </button>
              <button
                type="button"
                onClick={() => setSelectedRecipientIds(new Set())}
                className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-[11px] text-slate-600 dark:text-slate-300 hover:border-rose-400 cursor-pointer whitespace-nowrap"
              >
                {tr('إلغاء تحديد الكل', 'Clear Selection')}
              </button>
            </div>
          </div>

          {/* 4. Recipients List with Direct WhatsApp / Email / Copy / Reminded Toggle */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
            {visibleRows.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                {tr('لا يوجد طلاب مطابقين في هذا الهيكل حالياً', 'No matching students in this structure right now')}
              </div>
            ) : (
              visibleRows.map((row) => {
                const isSelected = selectedRecipientIds.has(row.student.id);
                const studentWa = normalizeWhatsAppNumber(row.student.phone);
                const parentWa = normalizeWhatsAppNumber(row.student.parentPhone);
                const personalizedMsg = buildPersonalizedMessage(row);
                const encodedMsg = encodeURIComponent(personalizedMsg);
                const logEntry = reminderLogs[`${structure.id}__${row.student.id}`];

                return (
                  <div
                    key={row.student.id}
                    className={`p-3 flex flex-wrap items-center justify-between gap-3 transition ${
                      isSelected
                        ? 'bg-amber-50/50 dark:bg-amber-950/20'
                        : 'bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => toggleStudent(row.student.id)}
                        className="mt-0.5 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer shrink-0"
                        title={isSelected ? tr('إزالة من القائمة', 'Remove from list') : tr('إضافة للقائمة', 'Add to list')}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-black text-slate-900 dark:text-white">
                            {row.student.name}
                          </span>
                          <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                            {row.solvedCount}/{row.totalQuestions} ({row.completionPct}%)
                          </span>
                          {logEntry && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>
                                {tr('تم التذكير', 'Reminded')} ({new Date(logEntry.remindedAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB')})
                              </span>
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
                          <span>
                            {tr('متبقي:', 'Remaining:')}{' '}
                            <strong className="font-mono tabular-nums text-slate-700 dark:text-slate-200">
                              {row.remainingCount}
                            </strong>{' '}
                            {tr('سؤال', 'Q')}
                          </span>
                          {row.student.phone && (
                            <span className="inline-flex items-center gap-0.5 font-mono tabular-nums">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {tr('طالب:', 'Student:')} {row.student.phone}
                            </span>
                          )}
                          {row.student.parentPhone && (
                            <span className="inline-flex items-center gap-0.5 font-mono tabular-nums">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {tr('ولي أمر:', 'Parent:')} {row.student.parentPhone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Direct Channel Actions */}
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      {studentWa && (
                        <a
                          href={`https://wa.me/${studentWa}?text=${encodedMsg}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => markAsReminded(row.student.id, 'واتساب الطالب')}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition whitespace-nowrap"
                          title={tr(`إرسال تذكير واتساب للطالب (${row.student.phone})`, `Send WhatsApp to student (${row.student.phone})`)}
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>{tr('واتساب الطالب', 'Student WhatsApp')}</span>
                        </a>
                      )}

                      {parentWa && (
                        <a
                          href={`https://wa.me/${parentWa}?text=${encodedMsg}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => markAsReminded(row.student.id, 'واتساب ولي الأمر')}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] transition whitespace-nowrap"
                          title={tr(`إرسال متابعة واتساب لولي الأمر (${row.student.parentPhone})`, `Send WhatsApp to parent (${row.student.parentPhone})`)}
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>{tr('واتساب ولي الأمر', 'Parent WhatsApp')}</span>
                        </a>
                      )}

                      {row.student.email && (
                        <a
                          href={`mailto:${encodeURIComponent(row.student.email)}?subject=${encodeURIComponent(
                            `تذكير متابعة ${structure.title} - ${structure.subject}`
                          )}&body=${encodedMsg}`}
                          onClick={() => markAsReminded(row.student.id, 'البريد الإلكتروني')}
                          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] transition whitespace-nowrap"
                          title={row.student.email}
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          handleCopyText(personalizedMsg, row.student.id, row.student.id)
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-amber-500 text-slate-700 dark:text-slate-200 font-bold text-[11px] cursor-pointer whitespace-nowrap"
                      >
                        {copiedId === row.student.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600 dark:text-emerald-400">{tr('تم النسخ', 'Copied')}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>{tr('نسخ الرسالة', 'Copy Message')}</span>
                          </>
                        )}
                      </button>

                      {!logEntry && (
                        <button
                          type="button"
                          onClick={() => markAsReminded(row.student.id, 'يدوي')}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer"
                          title={tr('تسجيل أنه تم تذكير الطالب', 'Mark as reminded')}
                        >
                          <Clock className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer Bulk Actions */}
        <div className="shrink-0 px-4 sm:px-6 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={selectedRows.length === 0}
              onClick={handleCopyAllMessages}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              {copiedId === '__all_msgs__' ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              <span>
                {copiedId === '__all_msgs__'
                  ? tr('تم نسخ جميع الرسائل المخصصة!', 'All personalized messages copied!')
                  : tr(`نسخ رسائل المحددين (${selectedRows.length})`, `Copy Selected Messages (${selectedRows.length})`)}
              </span>
            </button>

            <button
              type="button"
              disabled={selectedRows.length === 0}
              onClick={handleCopyPhonesList}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-amber-500 text-slate-800 dark:text-slate-100 font-bold transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              {copiedId === '__all_phones__' ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Phone className="w-4 h-4 text-slate-500" />
              )}
              <span>
                {copiedId === '__all_phones__' ? tr('تم نسخ الأرقام!', 'Phones Copied!') : tr('نسخ أرقام الهواتف', 'Copy Phone Numbers')}
              </span>
            </button>

            <button
              type="button"
              disabled={cohortRows.length === 0}
              onClick={handleExportRemindersExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 font-bold transition cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{tr('تصدير كشف المتابعة Excel', 'Export Follow-Up Excel')}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={requestSafeClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-bold cursor-pointer whitespace-nowrap"
          >
            {tr('إغلاق', 'Close')}
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmExitOpen}
        zIndexClass="z-[85]"
        title={tr('تحذير قبل الخروج — تعديل نص التذكير', 'Exit Warning — Unsaved Reminder Edit')}
        message={tr(
          'قمت بتعديل نص رسالة التذكير المخصصة. إذا أغلقت النافذة الآن فستفقد التعديلات على النص. هل تريد الإغلاق؟',
          'You modified the custom reminder message text. Closing now will discard your message edits. Close anyway?'
        )}
        confirmText={tr('إغلاق وتجاهل التعديل', 'Close & Discard')}
        cancelText={tr('البقاء في التذكير', 'Stay')}
        isDestructive={true}
        onConfirm={() => {
          setConfirmExitOpen(false);
          onDirtyChange?.(false);
          onClose();
        }}
        onCancel={() => setConfirmExitOpen(false)}
        onClose={() => setConfirmExitOpen(false)}
      />
    </div>
  );
};
