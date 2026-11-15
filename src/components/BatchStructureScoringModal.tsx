import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X,
  Save,
  CheckSquare,
  Square,
  Users,
  Sparkles,
  History,
  RotateCcw,
} from 'lucide-react';
import {
  Student,
  ExamStructure,
  StudentStructureProgress,
  StructureQuestionScore,
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

export interface BatchStructureScoringModalProps {
  isOpen: boolean;
  structure: ExamStructure;
  selectedStudents: Student[];
  existingProgressByStudent: Map<string, StudentStructureProgress[]>;
  gradesList: string[];
  subjectsList: string[];
  tracksList: string[];
  yearsList: string[];
  onClose: () => void;
  onSaveBatch: (
    records: Array<Omit<StudentStructureProgress, 'id'> & { id?: string }>
  ) => Promise<void>;
}

interface BatchStructureDraftPayload {
  grade: string;
  term: string;
  track: string;
  academicYear: string;
  subject: string;
  group: string;
  date: string;
  notes: string;
  batchMode: 'update_or_create' | 'new_improvement';
  questionScores: StructureQuestionScore[];
}

export const BatchStructureScoringModal: React.FC<BatchStructureScoringModalProps> = ({
  isOpen,
  structure,
  selectedStudents,
  existingProgressByStudent,
  gradesList,
  subjectsList,
  tracksList,
  yearsList,
  onClose,
  onSaveBatch,
}) => {
  const totalQ = Math.max(1, structure.totalQuestions || structure.questions?.length || 1);
  const draftKey = `batch_${structure.id}`;

  const [activeStudents, setActiveStudents] = useState<Student[]>(selectedStudents);
  const [grade, setGrade] = useState(structure.grade);
  const [term, setTerm] = useState(structure.term || ACADEMIC_TERMS[0]);
  const [track, setTrack] = useState(structure.track || ACADEMIC_TRACKS[0]);
  const [academicYear, setAcademicYear] = useState(structure.academicYear || ACADEMIC_YEARS[0]);
  const [subject, setSubject] = useState(structure.subject);
  const [group, setGroup] = useState(structure.group || 'الكل');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [batchMode, setBatchMode] = useState<'update_or_create' | 'new_improvement'>('update_or_create');

  // Quick solved count + accuracy applier
  const [quickSolvedCount, setQuickSolvedCount] = useState<number>(totalQ);
  const [quickAccuracy, setQuickAccuracy] = useState<number>(100);

  const [questionScores, setQuestionScores] = useState<StructureQuestionScore[]>(() =>
    Array.from({ length: totalQ }, (_, idx) => ({
      questionNumber: idx + 1,
      solved: false,
      accuracyPercentage: 0,
      notes: '',
      attemptNumber: 1,
      attemptLabel: 'المحاولة الأساسية',
      isImprovement: false,
    }))
  );

  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<{
    payload: BatchStructureDraftPayload;
    updatedAt: string;
  } | null>(null);

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

  const hydratedRef = useRef(false);

  // Sync state when opened
  useEffect(() => {
    if (!isOpen) {
      hydratedRef.current = false;
      return;
    }
    setActiveStudents(selectedStudents);
    setGrade(structure.grade);
    setTerm(structure.term || ACADEMIC_TERMS[0]);
    setTrack(structure.track || ACADEMIC_TRACKS[0]);
    setAcademicYear(structure.academicYear || ACADEMIC_YEARS[0]);
    setSubject(structure.subject);
    setGroup(structure.group || 'الكل');
    setDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setBatchMode('update_or_create');
    setQuickSolvedCount(totalQ);
    setQuickAccuracy(100);
    setQuestionScores(
      Array.from({ length: totalQ }, (_, idx) => ({
        questionNumber: idx + 1,
        solved: false,
        accuracyPercentage: 0,
        notes: '',
        attemptNumber: 1,
        attemptLabel: 'المحاولة الأساسية',
        isImprovement: false,
      }))
    );
    setIsDirty(false);

    const savedDraft = loadStructureScoringDraft<BatchStructureDraftPayload>(draftKey);
    if (savedDraft && savedDraft.payload) {
      setPendingDraft(savedDraft);
    } else {
      setPendingDraft(null);
    }
    hydratedRef.current = true;
  }, [isOpen, structure.id]);

  // Auto-save progress draft whenever dirty
  useEffect(() => {
    if (!isOpen || !hydratedRef.current || !isDirty) return;
    saveStructureScoringDraft<BatchStructureDraftPayload>(draftKey, {
      grade,
      term,
      track,
      academicYear,
      subject,
      group,
      date,
      notes,
      batchMode,
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
    batchMode,
    questionScores,
  ]);

  const studentsWithPriorCount = useMemo(
    () =>
      activeStudents.filter((st) => (existingProgressByStudent.get(st.id) || []).length > 0)
        .length,
    [activeStudents, existingProgressByStudent]
  );

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
    return { solvedCount, completionPercentage, overallAccuracyPercentage };
  }, [questionScores, totalQ]);

  const requestSafeClose = () => {
    if (!isDirty) {
      onClose();
      return;
    }
    setConfirmState({
      isOpen: true,
      title: 'تحذير: تعديلات غير محفوظة',
      message: `لديك رصد غير محفوظ للهيكل "${structure.title}" لعدد (${activeStudents.length}) طالب. في حال الخروج الآن سيتم تجاهل التعديلات غير المحفوظة. هل تريد الخروج دون حفظ؟`,
      confirmText: 'تجاهل التعديلات والخروج',
      cancelText: 'البقاء ومتابعة الرصد',
      isDestructive: true,
      onConfirm: () => {
        clearStructureScoringDraft(draftKey);
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
        onClose();
      },
    });
  };

  // Intercept Escape key in capture phase
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
    setGrade(p.grade || structure.grade);
    setTerm(p.term || ACADEMIC_TERMS[0]);
    setTrack(p.track || ACADEMIC_TRACKS[0]);
    setAcademicYear(p.academicYear || ACADEMIC_YEARS[0]);
    setSubject(p.subject || structure.subject);
    setGroup(p.group || 'الكل');
    setDate(p.date || new Date().toISOString().split('T')[0]);
    setNotes(p.notes || '');
    setBatchMode(p.batchMode || 'update_or_create');
    if (Array.isArray(p.questionScores) && p.questionScores.length > 0) {
      setQuestionScores(
        Array.from({ length: totalQ }, (_, idx) => {
          const found = p.questionScores.find((q) => q.questionNumber === idx + 1);
          return (
            found || {
              questionNumber: idx + 1,
              solved: false,
              accuracyPercentage: 0,
              notes: '',
              attemptNumber: 1,
              attemptLabel: 'المحاولة الأساسية',
              isImprovement: false,
            }
          );
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

  const applyQuickSolvedCount = () => {
    const k = Math.max(0, Math.min(totalQ, Math.floor(quickSolvedCount || 0)));
    const acc = Math.max(0, Math.min(100, Math.round(quickAccuracy || 0)));
    markDirty();
    setQuestionScores((prev) =>
      prev.map((q) => ({
        ...q,
        solved: q.questionNumber <= k,
        accuracyPercentage: q.questionNumber <= k ? acc : 0,
      }))
    );
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
      title: 'تأكيد تفريغ جميع الأسئلة',
      message: `هل تريد إلغاء تحديد جميع الأسئلة المحلولة (${liveStats.solvedCount} سؤال) وإرجاع نسبتها إلى 0%؟`,
      confirmText: 'تفريغ الكل',
      cancelText: 'تراجع',
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
      prev.map((q) =>
        q.questionNumber === qNum
          ? { ...q, solved: true, accuracyPercentage: clamped }
          : q
      )
    );
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeStudents.length === 0) return;

    try {
      setSaving(true);
      const now = new Date().toISOString();

      const records: Array<Omit<StudentStructureProgress, 'id'> & { id?: string }> =
        activeStudents.map((st, idx) => {
          const attempts = existingProgressByStudent.get(st.id) || [];
          const latest = attempts.length > 0 ? attempts[attempts.length - 1] : null;
          const maxAttempt = attempts.length > 0 ? Math.max(...attempts.map((a) => a.attemptNumber || 1), 1) : 1;

          const createImprovement = batchMode === 'new_improvement' && latest !== null;
          const nextAttemptNum = createImprovement
            ? maxAttempt + 1
            : latest
            ? latest.attemptNumber || 1
            : 1;
          const isImp = createImprovement || Boolean(latest?.isImprovement) || nextAttemptNum > 1;

          const recordId = createImprovement
            ? `${structure.id}__${st.id}__attempt_${nextAttemptNum}_${Date.now()}_${idx}`
            : latest?.id || `${structure.id}__${st.id}`;

          const perStudentQuestions: StructureQuestionScore[] = questionScores.map((qs) => {
            const baselineQ = createImprovement
              ? latest?.questionScores?.find((item) => item.questionNumber === qs.questionNumber)
              : undefined;
            const prevQAcc = baselineQ?.solved ? baselineQ.accuracyPercentage : undefined;
            const isQChanged =
              createImprovement &&
              qs.solved &&
              prevQAcc !== undefined &&
              qs.accuracyPercentage !== prevQAcc;

            return {
              ...qs,
              attemptNumber: createImprovement ? nextAttemptNum : qs.attemptNumber || 1,
              attemptLabel: createImprovement
                ? `تحسين درجة (محاولة ${nextAttemptNum})`
                : qs.attemptLabel || 'المحاولة الأساسية',
              isImprovement: isQChanged || (createImprovement && qs.solved && !baselineQ?.solved),
              previousAccuracy: prevQAcc,
            };
          });

          const impCount = perStudentQuestions.filter((q) => q.isImprovement).length;

          return {
            id: recordId,
            structureId: structure.id,
            structureTitle: structure.title,
            studentDocId: st.id,
            studentId: st.studentId,
            studentName: st.name,
            grade,
            term,
            track,
            academicYear,
            subject,
            group: st.group || group || 'الكل',
            date,
            totalQuestions: totalQ,
            solvedCount: liveStats.solvedCount,
            completionPercentage: liveStats.completionPercentage,
            overallAccuracyPercentage: liveStats.overallAccuracyPercentage,
            questionScores: perStudentQuestions,
            attemptNumber: nextAttemptNum,
            attemptLabel: createImprovement
              ? `تحسين درجة (محاولة ${nextAttemptNum})`
              : latest?.attemptLabel || 'المحاولة الأساسية',
            isImprovement: isImp,
            previousAccuracy: createImprovement
              ? latest?.overallAccuracyPercentage
              : latest?.previousAccuracy,
            previousSolvedCount: createImprovement
              ? latest?.solvedCount
              : latest?.previousSolvedCount,
            improvementsCount: impCount,
            notes: notes.trim() || '',
            createdAt: createImprovement ? now : latest?.createdAt || now,
          };
        });

      await onSaveBatch(records);
      clearStructureScoringDraft(draftKey);
      setIsDirty(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) requestSafeClose();
        }}
      >
        <div
          id="batch-structure-scoring-modal"
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-right"
        >
          {/* Header */}
          <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" />
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  تسجيل ورصد درجة الهيكل لعدد ({activeStudents.length}) طالب مرة واحدة
                </h3>
                {isDirty && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                    <History className="w-3 h-3" />
                    مسودة تقدم محفوظة
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                الهيكل: <strong className="text-amber-600 dark:text-amber-400">{structure.title}</strong> • إجمالي الأسئلة: <strong className="font-mono">{totalQ}</strong>
              </p>
            </div>
            <button
              type="button"
              onClick={requestSafeClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSaveSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
            {/* Pending Draft Recovery Banner */}
            {pendingDraft && (
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="font-bold text-amber-900 dark:text-amber-100">
                    توجد مسودة رصد جماعي محفوظة تلقائياً لهذا الهيكل من جلسة سابقة
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleRestoreDraft}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>استعادة التقدم</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDiscardDraft}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold cursor-pointer"
                  >
                    تجاهل المسودة
                  </button>
                </div>
              </div>
            )}

            {/* Selected Students Chips */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  الطلاب المحددين للتسجيل الجماعي ({activeStudents.length} طالب):
                </span>
                {studentsWithPriorCount > 0 && (
                  <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
                    تنبيه: ({studentsWithPriorCount}) طالب لديهم سجل مسبق في هذا الهيكل
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {activeStudents.map((st) => {
                  const hasPrior = (existingProgressByStudent.get(st.id) || []).length > 0;
                  return (
                    <span
                      key={st.id}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                        hasPrior
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <span>{st.name}</span>
                      {hasPrior && <Sparkles className="w-3 h-3 text-amber-500" />}
                      {activeStudents.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setActiveStudents((prev) => prev.filter((item) => item.id !== st.id))
                          }
                          className="text-slate-400 hover:text-rose-600 cursor-pointer"
                          title="إزالة من التحديد"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>

              {/* Behavior Toggle for Students who already have a prior record */}
              {studentsWithPriorCount > 0 && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-600 dark:text-slate-300">
                    للطلاب الذين لديهم سجل مسبق:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      markDirty();
                      setBatchMode('update_or_create');
                    }}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] border cursor-pointer transition ${
                      batchMode === 'update_or_create'
                        ? 'bg-amber-500 text-slate-950 border-amber-500'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    تحديث السجل الحالي للمرصودين وإنشاء للمستجدين
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      markDirty();
                      setBatchMode('new_improvement');
                    }}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] border cursor-pointer transition ${
                      batchMode === 'new_improvement'
                        ? 'bg-amber-500 text-slate-950 border-amber-500'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>إضافة كمحاولة تحسين جديدة (+ تحسين) لمن لديه سجل سابق</span>
                  </button>
                </div>
              )}
            </div>

            {/* Live Summary KPIs */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">الأسئلة المحلولة</span>
                <span className="text-xl font-black font-mono tabular-nums text-slate-900 dark:text-white">
                  {liveStats.solvedCount} / {totalQ} سؤال
                </span>
              </div>
              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/70 text-center">
                <span className="text-[11px] text-amber-700 dark:text-amber-400 block">نسبة إنجاز الهيكل</span>
                <span className="text-xl font-black font-mono tabular-nums text-amber-600 dark:text-amber-400">
                  {liveStats.completionPercentage}%
                </span>
              </div>
              <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/70 text-center">
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block">متوسط نسبة الصحة</span>
                <span className="text-xl font-black font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                  {liveStats.overallAccuracyPercentage}%
                </span>
              </div>
            </div>

            {/* Metadata */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="font-bold text-slate-700 dark:text-slate-300 block">
                بيانات القيد الأكاديمي الموحدة للمجموعة:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                <select
                  value={grade}
                  onChange={(e) => {
                    markDirty();
                    setGrade(e.target.value);
                  }}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
                >
                  {Array.from(new Set([...gradesList, grade])).map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
                <select
                  value={term}
                  onChange={(e) => {
                    markDirty();
                    setTerm(e.target.value);
                  }}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
                >
                  {ACADEMIC_TERMS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <select
                  value={track}
                  onChange={(e) => {
                    markDirty();
                    setTrack(e.target.value);
                  }}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
                >
                  {Array.from(new Set([...tracksList, track])).map((tr) => (
                    <option key={tr} value={tr}>{tr}</option>
                  ))}
                </select>
                <select
                  value={academicYear}
                  onChange={(e) => {
                    markDirty();
                    setAcademicYear(e.target.value);
                  }}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-semibold"
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
                >
                  {Array.from(new Set([...subjectsList, subject])).map((sb) => (
                    <option key={sb} value={sb}>{sb}</option>
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
                />
              </div>
            </div>

            {/* Quick Bulk Generator Controls */}
            <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-800/60 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-black text-amber-900 dark:text-amber-200">
                    ضبط سريع لكل المحددين:
                  </span>
                  <div className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-amber-200 dark:border-amber-800">
                    <span className="text-[11px] text-slate-600 dark:text-slate-300">عدد الأسئلة المحلولة:</span>
                    <input
                      type="number"
                      min={0}
                      max={totalQ}
                      value={quickSolvedCount}
                      onChange={(e) => setQuickSolvedCount(Math.max(0, Math.min(totalQ, Number(e.target.value) || 0)))}
                      className="w-14 px-1.5 py-0.5 text-center font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded"
                    />
                    <span className="text-[11px] text-slate-400 font-mono">/ {totalQ}</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-amber-200 dark:border-amber-800">
                    <span className="text-[11px] text-slate-600 dark:text-slate-300">نسبة الصحة:</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={quickAccuracy}
                      onChange={(e) => setQuickAccuracy(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                      className="w-14 px-1.5 py-0.5 text-center font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded"
                    />
                    <span className="text-[11px] text-slate-500 font-mono">%</span>
                  </div>
                  <button
                    type="button"
                    onClick={applyQuickSolvedCount}
                    className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] cursor-pointer"
                  >
                    تطبيق التوزيع
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAllQuestionsState(true, 100)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] cursor-pointer hover:bg-emerald-500"
                  >
                    حل الكل (100%)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyAccuracyToSolved(75)}
                    className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 font-bold text-[11px] cursor-pointer"
                  >
                    75% للمحلول
                  </button>
                  <button
                    type="button"
                    onClick={() => applyAccuracyToSolved(50)}
                    className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold text-[11px] cursor-pointer"
                  >
                    50% للمحلول
                  </button>
                  <button
                    type="button"
                    onClick={requestClearAllQuestions}
                    className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] cursor-pointer"
                  >
                    تفريغ الكل
                  </button>
                </div>
              </div>
            </div>

            {/* Per-Question Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2.5 px-3 min-w-[120px]">السؤال</th>
                    <th className="py-2.5 px-3">حالة الحل</th>
                    <th className="py-2.5 px-3">نسبة صحة السؤال (0% - 100%)</th>
                    <th className="py-2.5 px-3 hidden md:table-cell">تحديد سريع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {questionScores.map((qs) => {
                    const qMeta = structure.questions?.find(
                      (item) => item.questionNumber === qs.questionNumber
                    );
                    return (
                      <tr
                        key={qs.questionNumber}
                        className={
                          qs.solved
                            ? 'bg-emerald-50/20 dark:bg-emerald-950/10'
                            : 'bg-white dark:bg-slate-900'
                        }
                      >
                        <td className="py-2 px-3">
                          <span className="font-mono font-black text-slate-900 dark:text-white">
                            س{qs.questionNumber}
                          </span>
                          {qMeta?.title && (
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 mr-1.5">
                              • {qMeta.title}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <button
                            type="button"
                            onClick={() => toggleQuestionSolved(qs.questionNumber)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-[11px] border cursor-pointer transition ${
                              qs.solved
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {qs.solved ? (
                              <>
                                <CheckSquare className="w-3.5 h-3.5" />
                                <span>تم الحل</span>
                              </>
                            ) : (
                              <>
                                <Square className="w-3.5 h-3.5" />
                                <span>لم يُحل</span>
                              </>
                            )}
                          </button>
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={1}
                              value={qs.accuracyPercentage}
                              onChange={(e) =>
                                updateQuestionAccuracy(qs.questionNumber, Number(e.target.value))
                              }
                              className="w-20 px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-center text-slate-900 dark:text-white"
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                ملاحظة موحدة للطلاب المحددين (اختياري)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => {
                  markDirty();
                  setNotes(e.target.value);
                }}
                placeholder="مثال: تم رصد أداء المجموعة في الهيكل النهائي..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={requestSafeClose}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={saving || activeStudents.length === 0}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black cursor-pointer disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                <span>
                  {saving
                    ? 'جاري الحفظ الجماعي...'
                    : `حفظ ورصد الهيكل لـ (${activeStudents.length}) طالب`}
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
