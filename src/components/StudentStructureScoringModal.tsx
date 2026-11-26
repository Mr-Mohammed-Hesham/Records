import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  X,
  Save,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Sparkles,
  History,
  RotateCcw,
} from 'lucide-react';
import {
  Student,
  TeacherSettings,
  ExamStructure,
  StudentStructureProgress,
  StructureQuestionScore,
  StructureQuestionAttempt,
} from '../types';
import {
  ACADEMIC_YEARS,
  ACADEMIC_TERMS,
  ACADEMIC_TRACKS,
} from '../services/firebase';
import {
  saveStructureScoringDraft,
  loadStructureScoringDraft,
  clearStructureScoringDraft,
} from '../utils/activityTracker';
import { ConfirmModal } from './ConfirmModal';
import {
  useLanguage,
  translateGrade,
  translateTerm,
  translateTrack,
  translateSubject,
} from '../utils/i18n';

export interface StudentStructureScoringModalProps {
  isOpen: boolean;
  structure: ExamStructure;
  student: Student;
  existingProgress: StudentStructureProgress | null;
  /** عند التفعيل، يتم إنشاء محاولة تحسين جديدة على مستوى الطالب بالكامل في الهيكل انطلاقاً من baselineProgress */
  isNewImprovementAttempt?: boolean;
  baselineProgress?: StudentStructureProgress | null;
  nextAttemptNumber?: number;
  settings: TeacherSettings;
  gradesList: string[];
  subjectsList: string[];
  tracksList: string[];
  yearsList: string[];
  onClose: () => void;
  onSave: (record: Omit<StudentStructureProgress, 'id'> & { id?: string }) => Promise<void>;
}

export const StudentStructureScoringModal: React.FC<StudentStructureScoringModalProps> = ({
  isOpen,
  structure,
  student,
  existingProgress,
  isNewImprovementAttempt = false,
  baselineProgress = null,
  nextAttemptNumber = 2,
  gradesList,
  subjectsList,
  tracksList,
  yearsList,
  onClose,
  onSave,
}) => {
  const { lang, dir, tr } = useLanguage();
  const totalQ = Math.max(1, structure.totalQuestions || structure.questions?.length || 1);
  const inputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  const seedRecord = isNewImprovementAttempt ? baselineProgress : existingProgress;

  const isStudentImprovement =
    isNewImprovementAttempt ||
    Boolean(existingProgress?.isImprovement) ||
    Boolean(existingProgress?.attemptNumber && existingProgress.attemptNumber > 1);

  const effectiveAttemptNumber = isNewImprovementAttempt
    ? nextAttemptNumber
    : existingProgress?.attemptNumber || 1;

  const effectivePreviousAccuracy = isNewImprovementAttempt
    ? baselineProgress?.overallAccuracyPercentage
    : existingProgress?.previousAccuracy;

  const effectivePreviousSolvedCount = isNewImprovementAttempt
    ? baselineProgress?.solvedCount
    : existingProgress?.previousSolvedCount;

  const [grade, setGrade] = useState(
    seedRecord?.grade || structure.grade || student.grade
  );
  const [term, setTerm] = useState(
    seedRecord?.term || structure.term || student.term || ACADEMIC_TERMS[0]
  );
  const [track, setTrack] = useState(
    seedRecord?.track || structure.track || student.track || ACADEMIC_TRACKS[0]
  );
  const [academicYear, setAcademicYear] = useState(
    seedRecord?.academicYear || structure.academicYear || student.academicYear || ACADEMIC_YEARS[0]
  );
  const [subject, setSubject] = useState(
    seedRecord?.subject || structure.subject || student.subject
  );
  const [group, setGroup] = useState(
    seedRecord?.group || student.group || structure.group || 'الكل'
  );
  const [date, setDate] = useState(
    isNewImprovementAttempt
      ? new Date().toISOString().split('T')[0]
      : existingProgress?.date || new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState(
    isNewImprovementAttempt
      ? 'تحسين درجة بعد إعادة الهيكل'
      : existingProgress?.notes || ''
  );

  const [questionScores, setQuestionScores] = useState<StructureQuestionScore[]>(() => {
    const existingMap = new Map<number, StructureQuestionScore>(
      (seedRecord?.questionScores || []).map((item) => [item.questionNumber, item])
    );

    return Array.from({ length: totalQ }, (_, idx) => {
      const qNum = idx + 1;
      const found = existingMap.get(qNum);

      if (!found) {
        return {
          questionNumber: qNum,
          solved: false,
          accuracyPercentage: 0,
          notes: '',
          attemptNumber: isNewImprovementAttempt ? effectiveAttemptNumber : 1,
          attemptLabel: isNewImprovementAttempt
            ? `تحسين درجة (محاولة ${effectiveAttemptNumber})`
            : 'المحاولة الأساسية',
          isImprovement: false,
        };
      }

      if (isNewImprovementAttempt) {
        // Carry forward question's previous score as baseline for comparison in the new student-level attempt
        const prevAcc = found.solved ? Number(found.accuracyPercentage) || 0 : 0;
        const baseAttempts: StructureQuestionAttempt[] =
          found.attempts && found.attempts.length > 0
            ? [...found.attempts]
            : found.solved
            ? [
                {
                  attemptNumber: found.attemptNumber || 1,
                  attemptLabel: found.attemptLabel || 'المحاولة الأساسية',
                  accuracyPercentage: prevAcc,
                  previousAccuracy: found.previousAccuracy,
                  date: seedRecord?.date,
                },
              ]
            : [];

        return {
          ...found,
          previousAccuracy: found.solved ? prevAcc : undefined,
          attemptNumber: found.attemptNumber || 1,
          attemptLabel: found.attemptLabel || 'المحاولة الأساسية',
          isImprovement: false,
          attempts: baseAttempts,
        };
      }

      return {
        ...found,
        attemptNumber: found.attemptNumber || 1,
        attemptLabel:
          found.attemptLabel ||
          (found.isImprovement ? `تحسين درجة (محاولة ${found.attemptNumber || 2})` : 'المحاولة الأساسية'),
      };
    });
  });

  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const draftKey = `${structure.id}__${student.id}__${
    existingProgress?.id || (isNewImprovementAttempt ? `imp_${effectiveAttemptNumber}` : 'base')
  }`;

  interface ScoringDraftPayload {
    grade: string;
    term: string;
    track: string;
    academicYear: string;
    subject: string;
    group: string;
    date: string;
    notes: string;
    questionScores: StructureQuestionScore[];
  }

  const [pendingDraft, setPendingDraft] = useState<{
    payload: ScoringDraftPayload;
    updatedAt: string;
  } | null>(() => (isOpen ? loadStructureScoringDraft<ScoringDraftPayload>(draftKey) : null));

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    isDestructive: boolean;
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'تأكيد',
    cancelText: 'تراجع',
    isDestructive: true,
    onConfirm: () => {},
  });

  // Auto-save progress draft whenever dirty
  useEffect(() => {
    if (!isOpen || !isDirty) return;
    saveStructureScoringDraft<ScoringDraftPayload>(draftKey, {
      grade,
      term,
      track,
      academicYear,
      subject,
      group,
      date,
      notes,
      questionScores,
    });
  }, [
    isOpen,
    isDirty,
    draftKey,
    grade,
    term,
    track,
    academicYear,
    subject,
    group,
    date,
    notes,
    questionScores,
  ]);

  // Computed live stats
  const liveStats = useMemo(() => {
    const solvedItems = questionScores.filter((q) => q.solved);
    const solvedCount = solvedItems.length;
    const completionPercentage = Math.round((solvedCount / totalQ) * 1000) / 10;
    const overallAccuracyPercentage =
      solvedCount > 0
        ? Math.round(
            (solvedItems.reduce((acc, q) => acc + (Number(q.accuracyPercentage) || 0), 0) /
              solvedCount) *
              10
          ) / 10
        : 0;
    const improvedQuestionsCount = questionScores.filter(
      (q) =>
        Boolean(q.isImprovement) ||
        (q.attemptNumber !== undefined && q.attemptNumber > 1 && !isNewImprovementAttempt) ||
        (isNewImprovementAttempt &&
          q.solved &&
          q.previousAccuracy !== undefined &&
          q.accuracyPercentage !== q.previousAccuracy)
    ).length;

    return {
      solvedCount,
      completionPercentage,
      overallAccuracyPercentage,
      improvedQuestionsCount,
    };
  }, [questionScores, totalQ, isNewImprovementAttempt]);

  const requestSafeClose = () => {
    if (!isDirty) {
      onClose();
      return;
    }
    setConfirmState({
      isOpen: true,
      title: tr('تحذير: تعديلات غير محفوظة', 'Warning: Unsaved Changes'),
      message: tr(
        `لديك تعديلات غير محفوظة للطالب "${student.name}" في هيكل "${structure.title}". في حال الخروج الآن سيتم تجاهل التعديلات غير المحفوظة. هل تريد الخروج دون حفظ؟`,
        `You have unsaved changes for "${student.name}" in structure "${structure.title}". Closing now will discard unsaved edits. Exit without saving?`
      ),
      confirmText: tr('تجاهل التعديلات والخروج', 'Discard & Exit'),
      cancelText: tr('البقاء وحفظ التعديلات', 'Stay & Save'),
      isDestructive: true,
      onConfirm: () => {
        clearStructureScoringDraft(draftKey);
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
        onClose();
      },
    });
  };

  // Capture Escape key so App.tsx doesn't force-close without checking unsaved changes
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      if (confirmState.isOpen) {
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
      } else {
        requestSafeClose();
      }
    };
    window.addEventListener('keydown', handleEsc, { capture: true });
    return () => window.removeEventListener('keydown', handleEsc, { capture: true });
  });

  if (!isOpen) return null;

  const markDirty = () => {
    if (!isDirty) setIsDirty(true);
  };

  const handleRestoreDraft = () => {
    if (!pendingDraft) return;
    const p = pendingDraft.payload;
    setGrade(p.grade || grade);
    setTerm(p.term || term);
    setTrack(p.track || track);
    setAcademicYear(p.academicYear || academicYear);
    setSubject(p.subject || subject);
    setGroup(p.group || group);
    setDate(p.date || date);
    setNotes(p.notes || '');
    if (Array.isArray(p.questionScores) && p.questionScores.length > 0) {
      setQuestionScores(
        Array.from({ length: totalQ }, (_, idx) => {
          const found = p.questionScores.find((q) => q.questionNumber === idx + 1);
          return found || questionScores[idx];
        })
      );
    }
    setPendingDraft(null);
    setIsDirty(true);
  };

  const handleDiscardDraft = () => {
    clearStructureScoringDraft(draftKey);
    setPendingDraft(null);
  };

  const setAllQuestionsState = (solved: boolean, accuracy: number) => {
    markDirty();
    setQuestionScores((prev) =>
      prev.map((q) => ({
        ...q,
        solved,
        accuracyPercentage: solved ? accuracy : 0,
      }))
    );
  };

  const requestClearAllQuestions = () => {
    if (liveStats.solvedCount === 0) return;
    setConfirmState({
      isOpen: true,
      title: tr('تأكيد تفريغ جميع الأسئلة', 'Confirm Clear All Questions'),
      message: tr(
        `هل تريد إلغاء تحديد جميع الأسئلة المحلولة (${liveStats.solvedCount} سؤال) وإرجاع نسبتها إلى 0%؟`,
        `Clear all ${liveStats.solvedCount} solved questions and reset accuracy to 0%?`
      ),
      confirmText: tr('تفريغ الكل', 'Clear All'),
      cancelText: tr('تراجع', 'Cancel'),
      isDestructive: true,
      onConfirm: () => {
        setAllQuestionsState(false, 0);
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const applyAccuracyToSolved = (accuracy: number) => {
    markDirty();
    setQuestionScores((prev) =>
      prev.map((q) => (q.solved ? { ...q, accuracyPercentage: accuracy } : q))
    );
  };

  const toggleQuestionSolved = (qNum: number) => {
    markDirty();
    setQuestionScores((prev) =>
      prev.map((q) => {
        if (q.questionNumber !== qNum) return q;
        const nextSolved = !q.solved;
        return {
          ...q,
          solved: nextSolved,
          accuracyPercentage: nextSolved ? (q.accuracyPercentage > 0 ? q.accuracyPercentage : 100) : 0,
        };
      })
    );
  };

  const updateQuestionAccuracy = (qNum: number, rawVal: number) => {
    const clamped = Math.max(0, Math.min(100, isNaN(rawVal) ? 0 : rawVal));
    markDirty();
    setQuestionScores((prev) =>
      prev.map((q) => {
        if (q.questionNumber !== qNum) return q;

        const updatedAttempts =
          q.attempts && q.attempts.length > 0 && (q.isImprovement || (q.attemptNumber || 1) > 1)
            ? q.attempts.map((att, idx) =>
                idx === q.attempts!.length - 1 ? { ...att, accuracyPercentage: clamped } : att
              )
            : q.attempts;

        // In student-level improvement mode, changing accuracy relative to baseline automatically flags the question as improved
        const autoFlagImprovement =
          isNewImprovementAttempt &&
          q.previousAccuracy !== undefined &&
          clamped !== q.previousAccuracy;

        return {
          ...q,
          solved: true,
          accuracyPercentage: clamped,
          isImprovement: q.isImprovement || autoFlagImprovement,
          attemptNumber:
            q.isImprovement || autoFlagImprovement
              ? Math.max(q.attemptNumber || 1, effectiveAttemptNumber > 1 ? effectiveAttemptNumber : 2)
              : q.attemptNumber || 1,
          attemptLabel:
            q.isImprovement || autoFlagImprovement
              ? q.attemptLabel || `تحسين درجة (محاولة ${Math.max(q.attemptNumber || 1, 2)})`
              : q.attemptLabel,
          attempts: updatedAttempts,
        };
      })
    );
  };

  /**
   * إضافة محاولة تحسين لسؤال محدد (مثل "+ تحسين" في الامتحانات العادية تماماً)
   */
  const handleAddQuestionImprovement = (qNum: number) => {
    markDirty();
    setQuestionScores((prev) =>
      prev.map((q) => {
        if (q.questionNumber !== qNum) return q;
        const currentAcc = q.solved ? Number(q.accuracyPercentage) || 0 : 0;
        const currentAttempt = q.attemptNumber || 1;
        const nextQAttempt = currentAttempt + 1;

        const existingHistory: StructureQuestionAttempt[] =
          q.attempts && q.attempts.length > 0
            ? [...q.attempts]
            : [
                {
                  attemptNumber: currentAttempt,
                  attemptLabel: q.attemptLabel || 'المحاولة الأساسية',
                  accuracyPercentage: currentAcc,
                  previousAccuracy: q.previousAccuracy,
                  date,
                },
              ];

        const nextAttemptEntry: StructureQuestionAttempt = {
          attemptNumber: nextQAttempt,
          attemptLabel: `تحسين درجة (محاولة ${nextQAttempt})`,
          accuracyPercentage: currentAcc,
          previousAccuracy: currentAcc,
          date: new Date().toISOString().split('T')[0],
        };

        return {
          ...q,
          solved: true,
          accuracyPercentage: currentAcc,
          attemptNumber: nextQAttempt,
          attemptLabel: `تحسين درجة (محاولة ${nextQAttempt})`,
          isImprovement: true,
          previousAccuracy: currentAcc,
          attempts: [...existingHistory, nextAttemptEntry],
        };
      })
    );

    setTimeout(() => {
      inputRefs.current[qNum]?.focus();
      inputRefs.current[qNum]?.select();
    }, 50);
  };

  /**
   * التراجع عن آخر محاولة تحسين لسؤال محدد (مع رسالة تحذيرية مؤكدة)
   */
  const executeRemoveQuestionImprovement = (qNum: number) => {
    markDirty();
    setQuestionScores((prev) =>
      prev.map((q) => {
        if (q.questionNumber !== qNum) return q;
        const history = q.attempts && q.attempts.length > 1 ? q.attempts.slice(0, -1) : [];
        const prevEntry = history.length > 0 ? history[history.length - 1] : null;
        const revertedAcc =
          prevEntry !== null
            ? prevEntry.accuracyPercentage
            : q.previousAccuracy !== undefined
            ? q.previousAccuracy
            : q.accuracyPercentage;
        const revertedAttemptNum = prevEntry ? prevEntry.attemptNumber : 1;

        return {
          ...q,
          solved: true,
          accuracyPercentage: revertedAcc,
          attemptNumber: revertedAttemptNum,
          attemptLabel:
            revertedAttemptNum > 1
              ? `تحسين درجة (محاولة ${revertedAttemptNum})`
              : 'المحاولة الأساسية',
          isImprovement: revertedAttemptNum > 1,
          previousAccuracy: prevEntry?.previousAccuracy,
          attempts: history.length > 0 ? history : undefined,
        };
      })
    );
  };

  const requestRemoveQuestionImprovement = (qs: StructureQuestionScore) => {
    setConfirmState({
      isOpen: true,
      title: tr(`حذف محاولة التحسين للسؤال س${qs.questionNumber}`, `Remove Retake Attempt for Q${qs.questionNumber}`),
      message: tr(
        `هل أنت متأكد من التراجع عن محاولة التحسين رقم (${qs.attemptNumber || 2}) للسؤال س${qs.questionNumber} وإرجاع النسبة إلى المحاولة السابقة؟`,
        `Revert retake attempt #${qs.attemptNumber || 2} for Q${qs.questionNumber} back to the previous accuracy?`
      ),
      confirmText: tr('حذف محاولة التحسين', 'Remove Retake'),
      cancelText: tr('تراجع', 'Cancel'),
      isDestructive: true,
      onConfirm: () => {
        executeRemoveQuestionImprovement(qs.questionNumber);
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  /**
   * بدء تحسين لجميع الأسئلة غير الكاملة (< 100% أو غير محلولة) بضغطة واحدة
   */
  const handleImproveIncompleteQuestions = () => {
    markDirty();
    setQuestionScores((prev) =>
      prev.map((q) => {
        const currentAcc = q.solved ? Number(q.accuracyPercentage) || 0 : 0;
        if (q.solved && currentAcc >= 100) return q;
        const currentAttempt = q.attemptNumber || 1;
        const nextQAttempt = currentAttempt + 1;
        const existingHistory: StructureQuestionAttempt[] =
          q.attempts && q.attempts.length > 0
            ? [...q.attempts]
            : [
                {
                  attemptNumber: currentAttempt,
                  attemptLabel: q.attemptLabel || 'المحاولة الأساسية',
                  accuracyPercentage: currentAcc,
                  previousAccuracy: q.previousAccuracy,
                  date,
                },
              ];

        return {
          ...q,
          solved: true,
          accuracyPercentage: currentAcc,
          attemptNumber: nextQAttempt,
          attemptLabel: `تحسين درجة (محاولة ${nextQAttempt})`,
          isImprovement: true,
          previousAccuracy: currentAcc,
          attempts: [
            ...existingHistory,
            {
              attemptNumber: nextQAttempt,
              attemptLabel: `تحسين درجة (محاولة ${nextQAttempt})`,
              accuracyPercentage: currentAcc,
              previousAccuracy: currentAcc,
              date: new Date().toISOString().split('T')[0],
            },
          ],
        };
      })
    );
  };

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const recordId = isNewImprovementAttempt
        ? `${structure.id}__${student.id}__attempt_${effectiveAttemptNumber}_${Date.now()}`
        : existingProgress?.id || `${structure.id}__${student.id}`;

      await onSave({
        id: recordId,
        structureId: structure.id,
        structureTitle: structure.title,
        studentDocId: student.id,
        studentId: student.studentId,
        studentName: student.name,
        grade,
        term,
        track,
        academicYear,
        subject,
        group,
        date,
        totalQuestions: totalQ,
        solvedCount: liveStats.solvedCount,
        completionPercentage: liveStats.completionPercentage,
        overallAccuracyPercentage: liveStats.overallAccuracyPercentage,
        questionScores,
        attemptNumber: effectiveAttemptNumber,
        attemptLabel: isStudentImprovement
          ? existingProgress?.attemptLabel || `تحسين درجة (محاولة ${effectiveAttemptNumber})`
          : 'المحاولة الأساسية',
        isImprovement: isStudentImprovement,
        previousAccuracy: effectivePreviousAccuracy,
        previousSolvedCount: effectivePreviousSolvedCount,
        improvementsCount: liveStats.improvedQuestionsCount,
        notes: notes.trim() || '',
        createdAt: isNewImprovementAttempt
          ? new Date().toISOString()
          : existingProgress?.createdAt || new Date().toISOString(),
      });
      clearStructureScoringDraft(draftKey);
      setIsDirty(false);
    } finally {
      setSaving(false);
    }
  };

  const accuracyDiff =
    effectivePreviousAccuracy !== undefined
      ? Math.round((liveStats.overallAccuracyPercentage - effectivePreviousAccuracy) * 10) / 10
      : null;

  return (
    <>
    <div
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) requestSafeClose();
      }}
    >
      <div
        dir={dir}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[94dvh] sm:max-h-[92vh] text-start"
      >
        {/* Header */}
        <div className="shrink-0 px-4 sm:px-5 py-3.5 sm:py-4 bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-black text-base text-slate-900 dark:text-white">
                {isNewImprovementAttempt
                  ? tr(`تحسين درجة الهيكل للطالب: ${student.name}`, `Improve Structure Score for: ${student.name}`)
                  : tr(`رصد حل أسئلة الهيكل للطالب: ${student.name}`, `Record Structure Questions for: ${student.name}`)}
              </h3>
              {isDirty && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                  <History className="w-3 h-3" />
                  {tr('مسودة تقدم محفوظة', 'Progress draft saved')}
                </span>
              )}
              {isStudentImprovement && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  {tr(`تحسين (محاولة ${effectiveAttemptNumber})`, `Retake (Attempt ${effectiveAttemptNumber})`)}
                </span>
              )}
              {effectivePreviousAccuracy !== undefined && (
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  ({tr('النسبة السابقة:', 'Prev Accuracy:')} {effectivePreviousAccuracy}%
                  {accuracyDiff !== null && (
                    <strong
                      className={`ms-1 ${
                        accuracyDiff > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : accuracyDiff < 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-500'
                      }`}
                    >
                      {accuracyDiff > 0 ? `+${accuracyDiff}% ↑` : `${accuracyDiff}%`}
                    </strong>
                  )}
                  )
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {tr('الهيكل:', 'Structure:')} <strong className="text-amber-600 dark:text-amber-400">{structure.title}</strong> • {tr('إجمالي الأسئلة:', 'Total Questions:')} <strong className="font-mono">{totalQ}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={requestSafeClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSaveRecord} className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {/* Pending Draft Restore Banner */}
          {pendingDraft && (
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="font-bold text-amber-900 dark:text-amber-100">
                  {tr('توجد مسودة تقدم محفوظة تلقائياً لهذا الطالب من جلسة سابقة', 'Auto-saved progress draft found from a previous session')}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleRestoreDraft}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{tr('استعادة التعديلات', 'Restore Edits')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDiscardDraft}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold cursor-pointer"
                >
                  {tr('تجاهل المسودة', 'Discard')}
                </button>
              </div>
            </div>
          )}
          {/* Live Summary Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">{tr('قام بحل', 'Solved')}</span>
              <span className="text-xl font-black font-mono tabular-nums text-slate-900 dark:text-white">
                {liveStats.solvedCount} / {totalQ} {tr('سؤال', 'Q')}
              </span>
            </div>
            <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/70 text-center">
              <span className="text-[11px] text-amber-700 dark:text-amber-400 block">{tr('نسبة إنجاز الهيكل', 'Completion Rate')}</span>
              <span className="text-xl font-black font-mono tabular-nums text-amber-600 dark:text-amber-400">
                {liveStats.completionPercentage}%
              </span>
            </div>
            <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/70 text-center">
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block">{tr('متوسط نسبة الصحة', 'Avg Accuracy')}</span>
              <span className="text-xl font-black font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                {liveStats.overallAccuracyPercentage}%
              </span>
            </div>
            <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-800/70 text-center">
              <span className="text-[11px] text-indigo-700 dark:text-indigo-400 block">{tr('الأسئلة المحسّنة', 'Improved Questions')}</span>
              <span className="text-xl font-black font-mono tabular-nums text-indigo-600 dark:text-indigo-400">
                {liveStats.improvedQuestionsCount} {tr('سؤال', 'Q')}
              </span>
            </div>
          </div>

          {/* Complete Academic Metadata */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
            <span className="font-bold text-slate-700 dark:text-slate-300 block">
              {tr('بيانات القيد الأكاديمي لهذا السجل (الصف / الفصل / المسار / السنة / المادة):', 'Academic Metadata for This Record (Grade / Term / Track / Year / Subject):')}
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
              <select
                value={grade}
                onChange={(e) => {
                  markDirty();
                  setGrade(e.target.value);
                }}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
                title={tr('الصف', 'Grade')}
              >
                {Array.from(new Set([...gradesList, grade])).map((g) => (
                  <option key={g} value={g}>{translateGrade(g, lang)}</option>
                ))}
              </select>

              <select
                value={term}
                onChange={(e) => {
                  markDirty();
                  setTerm(e.target.value);
                }}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
                title={tr('الفصل', 'Term')}
              >
                {ACADEMIC_TERMS.map((t) => (
                  <option key={t} value={t}>{translateTerm(t, lang)}</option>
                ))}
              </select>

              <select
                value={track}
                onChange={(e) => {
                  markDirty();
                  setTrack(e.target.value);
                }}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
                title={tr('المسار', 'Track')}
              >
                {Array.from(new Set([...tracksList, track])).map((trVal) => (
                  <option key={trVal} value={trVal}>{translateTrack(trVal, lang)}</option>
                ))}
              </select>

              <select
                value={academicYear}
                onChange={(e) => {
                  markDirty();
                  setAcademicYear(e.target.value);
                }}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-semibold"
                title={tr('السنة الدراسية', 'Academic Year')}
              >
                {Array.from(new Set([...yearsList, academicYear])).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              <select
                value={subject}
                onChange={(e) => {
                  markDirty();
                  setSubject(e.target.value);
                }}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
                title={tr('المادة', 'Subject')}
              >
                {Array.from(new Set([...subjectsList, subject])).map((sb) => (
                  <option key={sb} value={sb}>{translateSubject(sb, lang)}</option>
                ))}
              </select>

              <input
                type="date"
                value={date}
                onChange={(e) => {
                  markDirty();
                  setDate(e.target.value);
                }}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                title={tr('تاريخ التقييم', 'Evaluation Date')}
              />
            </div>
          </div>

          {/* Improvement tip + Quick Bulk Presets */}
          <div className="space-y-2">
            <div className="text-[11px] font-medium text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800/50">
              💡 {tr('يمكنك إضافة محاولة تحسين لأي سؤال بالضغط على «+ تحسين» بجانب السؤال، كما يمكنك إضافة محاولة تحسين كاملة للطالب من جدول الهياكل تماماً مثل الامتحانات العادية.', 'You can add a retake attempt for any question via "+ Retake", or add a full student improvement attempt from the structures table.')}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="font-bold text-slate-600 dark:text-slate-300">{tr('إجراءات سريعة للأسئلة:', 'Quick Question Actions:')}</span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setAllQuestionsState(true, 100)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] cursor-pointer hover:bg-emerald-500"
                >
                  {tr('حل الكل (100%)', 'Solve All (100%)')}
                </button>
                <button
                  type="button"
                  onClick={() => applyAccuracyToSolved(100)}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-[11px] cursor-pointer"
                >
                  {tr('تعيين 100% للمحلول', 'Set 100% for Solved')}
                </button>
                <button
                  type="button"
                  onClick={() => applyAccuracyToSolved(50)}
                  className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold text-[11px] cursor-pointer"
                >
                  {tr('تعيين 50% للمحلول', 'Set 50% for Solved')}
                </button>
                <button
                  type="button"
                  onClick={handleImproveIncompleteQuestions}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 font-bold text-[11px] cursor-pointer hover:bg-amber-200/70"
                  title={tr('فتح محاولة تحسين لكل الأسئلة الأقل من 100% أو غير المحلولة', 'Open retake attempt for all questions below 100% or unsolved')}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{tr('تحسين الأسئلة الناقصة (<100%)', 'Improve Incomplete (<100%)')}</span>
                </button>
                <button
                  type="button"
                  onClick={requestClearAllQuestions}
                  className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] cursor-pointer"
                >
                  {tr('تفريغ الكل', 'Clear All')}
                </button>
              </div>
            </div>
          </div>

          {/* Per-Question List */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-3 min-w-[140px]">{tr('السؤال والمحاولة', 'Question & Attempt')}</th>
                  <th className="py-2.5 px-3">{tr('حالة الحل', 'Solved Status')}</th>
                  <th className="py-2.5 px-3">{tr('نسبة صحة السؤال (0% - 100%)', 'Accuracy (0% - 100%)')}</th>
                  <th className="py-2.5 px-3 hidden md:table-cell">{tr('تحديد سريع', 'Quick Pick')}</th>
                  <th className="py-2.5 px-3 text-center w-28">{tr('التحسين', 'Retake')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {questionScores.map((qs) => {
                  const qMeta = structure.questions?.find(
                    (item) => item.questionNumber === qs.questionNumber
                  );
                  const isQImp = Boolean(qs.isImprovement) || (qs.attemptNumber !== undefined && qs.attemptNumber > 1 && !isNewImprovementAttempt);
                  const prevAcc = qs.previousAccuracy;
                  const diff =
                    prevAcc !== undefined && qs.solved
                      ? Math.round((qs.accuracyPercentage - prevAcc) * 10) / 10
                      : null;

                  return (
                    <tr
                      key={qs.questionNumber}
                      className={`transition-colors ${
                        isQImp || (isNewImprovementAttempt && diff !== null && diff !== 0)
                          ? 'bg-amber-50/40 dark:bg-amber-950/20 border-s-4 border-s-amber-500'
                          : qs.solved
                          ? 'bg-emerald-50/20 dark:bg-emerald-950/10'
                          : 'bg-white dark:bg-slate-900'
                      }`}
                    >
                      <td className="py-2 px-3">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-black text-slate-900 dark:text-white">
                              {tr('س', 'Q')}{qs.questionNumber}
                            </span>
                            {qMeta?.title && (
                              <span className="text-[11px] text-slate-600 dark:text-slate-300 truncate max-w-[140px]">
                                • {qMeta.title}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isQImp ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                                <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                                {tr(`تحسين (محاولة ${qs.attemptNumber || 2})`, `Retake (Attempt ${qs.attemptNumber || 2})`)}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                {tr('المحاولة الأساسية', 'Initial Attempt')}
                              </span>
                            )}

                            {prevAcc !== undefined && (
                              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                                ({tr('السابقة:', 'Prev:')} {prevAcc}%)
                              </span>
                            )}

                            {diff !== null && (isQImp || isNewImprovementAttempt) && (
                              <span
                                className={`text-[10px] font-mono font-bold ${
                                  diff > 0
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : diff < 0
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : 'text-slate-500'
                                }`}
                              >
                                {diff > 0 ? `+${diff}% ↑` : `${diff}%`}
                              </span>
                            )}
                          </div>

                          {qs.attempts && qs.attempts.length > 1 && (
                            <div className="flex items-center gap-1 flex-wrap text-[9px] font-mono text-slate-400">
                              {qs.attempts.map((att, idx) => (
                                <span key={idx}>
                                  {idx > 0 ? ' ← ' : ''}{tr('م', 'A')}{att.attemptNumber}: {att.accuracyPercentage}%
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-2 px-3">
                        <button
                          type="button"
                          onClick={() => toggleQuestionSolved(qs.questionNumber)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-[11px] border cursor-pointer transition ${
                            qs.solved
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {qs.solved ? (
                            <>
                              <CheckSquare className="w-3.5 h-3.5" />
                              <span>{tr('تم الحل', 'Solved')}</span>
                            </>
                          ) : (
                            <>
                              <Square className="w-3.5 h-3.5" />
                              <span>{tr('لم يُحل', 'Unsolved')}</span>
                            </>
                          )}
                        </button>
                      </td>

                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <input
                            ref={(el) => {
                              inputRefs.current[qs.questionNumber] = el;
                            }}
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                            value={qs.accuracyPercentage}
                            onChange={(e) =>
                              updateQuestionAccuracy(qs.questionNumber, Number(e.target.value))
                            }
                            className="w-20 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-center text-slate-900 dark:text-white"
                          />
                          <span className="font-mono font-bold text-slate-500">%</span>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            value={qs.accuracyPercentage}
                            onChange={(e) =>
                              updateQuestionAccuracy(qs.questionNumber, Number(e.target.value))
                            }
                            className="hidden lg:block w-24 accent-amber-500 cursor-pointer"
                          />
                        </div>
                      </td>

                      <td className="py-2 px-3 hidden md:table-cell">
                        <div className="inline-flex items-center gap-1 font-mono">
                          {[100, 75, 50, 25, 0].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => updateQuestionAccuracy(qs.questionNumber, val)}
                              className={`px-2 py-1 rounded text-[10px] font-bold border cursor-pointer ${
                                qs.solved && qs.accuracyPercentage === val
                                  ? val >= 75
                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                    : val >= 50
                                    ? 'bg-amber-500 text-slate-950 border-amber-500'
                                    : 'bg-rose-600 text-white border-rose-600'
                                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {val}%
                            </button>
                          ))}
                        </div>
                      </td>

                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleAddQuestionImprovement(qs.questionNumber)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-300/80 dark:border-amber-700/80 rounded-lg transition-all cursor-pointer shadow-2xs"
                            title={tr('إضافة محاولة تحسين جديدة لهذا السؤال', 'Add retake attempt for this question')}
                          >
                            <Plus className="w-3 h-3" />
                            {tr('تحسين', 'Retake')}
                          </button>

                          {isQImp && (
                            <button
                              type="button"
                              onClick={() => requestRemoveQuestionImprovement(qs)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded cursor-pointer transition-colors"
                              title={tr('حذف محاولة التحسين الأخيرة لهذا السؤال', 'Remove latest retake attempt')}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              {tr('ملاحظات على أداء الطالب في هذا الهيكل', 'Notes on Student Performance in This Structure')}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => {
                markDirty();
                setNotes(e.target.value);
              }}
              placeholder={tr('مثال: متقن لأسئلة الرسم البياني وتم تحسين السؤال 4 بنجاح...', 'e.g. Strong on graphing questions, improved Q4...')}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
            />
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={requestSafeClose}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
            >
              {tr('إلغاء', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black cursor-pointer disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>
                {saving
                  ? tr('جاري الحفظ...', 'Saving...')
                  : isNewImprovementAttempt
                  ? tr(`حفظ محاولة التحسين (${effectiveAttemptNumber})`, `Save Retake Attempt (${effectiveAttemptNumber})`)
                  : tr('حفظ رصد الهيكل للطالب', 'Save Student Structure Record')}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <ConfirmModal
      isOpen={confirmState.isOpen}
      zIndexClass="z-[70]"
      title={confirmState.title}
      message={confirmState.message}
      confirmText={confirmState.confirmText}
      cancelText={confirmState.cancelText}
      isDestructive={confirmState.isDestructive}
      onConfirm={confirmState.onConfirm}
      onCancel={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
    />
    </>
  );
};
