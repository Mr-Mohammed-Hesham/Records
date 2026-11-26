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
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react';
import {
  Student,
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
  onDirtyChange?: (dirty: boolean) => void;
}

type ConflictPolicy = 'keep_existing' | 'higher_wins' | 'replace_selected';

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
  conflictPolicy: ConflictPolicy;
  questionScores: StructureQuestionScore[];
  includedQuestionNumbers: number[];
}

interface MergedStudentResult {
  student: Student;
  latest: StudentStructureProgress | null;
  record: Omit<StudentStructureProgress, 'id'> & { id?: string };
  preservedPriorQuestionsCount: number;
  newlyAppliedQuestionsCount: number;
  upgradedQuestionsCount: number;
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
  onDirtyChange,
}) => {
  const { lang, dir, tr } = useLanguage();
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
  // Default is strictly non-destructive: keep every student's existing recorded question score untouched!
  const [conflictPolicy, setConflictPolicy] = useState<ConflictPolicy>('keep_existing');

  // Explicit tracking of which questions the teacher selected/modified in this batch session.
  // Questions NOT in this set are guaranteed NEVER to be touched or overwritten for any student.
  const [includedQuestions, setIncludedQuestions] = useState<Set<number>>(() => new Set());

  // Quick range + accuracy applier (non-destructive: leaves questions outside range untouched)
  const [quickStartQ, setQuickStartQ] = useState<number>(1);
  const [quickEndQ, setQuickEndQ] = useState<number>(totalQ);
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
    setConflictPolicy('keep_existing');
    setIncludedQuestions(new Set());
    setQuickStartQ(1);
    setQuickEndQ(totalQ);
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

  useEffect(() => {
    onDirtyChange?.(isOpen && isDirty);
  }, [isOpen, isDirty, onDirtyChange]);

  useEffect(() => {
    return () => {
      onDirtyChange?.(false);
    };
  }, [onDirtyChange]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isOpen && isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isOpen, isDirty]);

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
      conflictPolicy,
      questionScores,
      includedQuestionNumbers: Array.from(includedQuestions),
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
    conflictPolicy,
    questionScores,
    includedQuestions,
  ]);

  const studentsWithPriorCount = useMemo(
    () =>
      activeStudents.filter((st) => (existingProgressByStudent.get(st.id) || []).length > 0)
        .length,
    [activeStudents, existingProgressByStudent]
  );

  // Per-question existing summary across selected students so teacher sees prior scores
  const existingStatsByQuestion = useMemo(() => {
    const map = new Map<
      number,
      { recordedCount: number; minAcc: number; maxAcc: number }
    >();

    for (let qNum = 1; qNum <= totalQ; qNum++) {
      let count = 0;
      let minAcc = 100;
      let maxAcc = 0;
      activeStudents.forEach((st) => {
        const attempts = existingProgressByStudent.get(st.id) || [];
        const latest = attempts.length > 0 ? attempts[attempts.length - 1] : null;
        const pq = latest?.questionScores?.find((q) => q.questionNumber === qNum);
        if (pq && pq.solved) {
          count += 1;
          const acc = Number(pq.accuracyPercentage) || 0;
          if (acc < minAcc) minAcc = acc;
          if (acc > maxAcc) maxAcc = acc;
        }
      });
      map.set(qNum, {
        recordedCount: count,
        minAcc: count > 0 ? minAcc : 0,
        maxAcc: count > 0 ? maxAcc : 0,
      });
    }

    return map;
  }, [activeStudents, existingProgressByStudent, totalQ]);

  const batchTemplateStats = useMemo(() => {
    const includedList = questionScores.filter((q) => includedQuestions.has(q.questionNumber));
    const includedSolved = includedList.filter((q) => q.solved);
    const avgIncludedAcc =
      includedSolved.length > 0
        ? Math.round(
            (includedSolved.reduce((acc, q) => acc + (Number(q.accuracyPercentage) || 0), 0) /
              includedSolved.length) *
              10
          ) / 10
        : 0;
    return {
      includedCount: includedList.length,
      includedSolvedCount: includedSolved.length,
      avgIncludedAcc,
    };
  }, [questionScores, includedQuestions]);

  // Shared pure merge engine: computes exact final records for BOTH live preview and submission!
  const mergedResultsPreview = useMemo<MergedStudentResult[]>(() => {
    const now = new Date().toISOString();
    return activeStudents.map((st, idx) => {
      const attempts = existingProgressByStudent.get(st.id) || [];
      const latest = attempts.length > 0 ? attempts[attempts.length - 1] : null;
      const maxAttempt =
        attempts.length > 0 ? Math.max(...attempts.map((a) => a.attemptNumber || 1), 1) : 1;

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

      let preservedPriorQuestionsCount = 0;
      let newlyAppliedQuestionsCount = 0;
      let upgradedQuestionsCount = 0;

      const perStudentQuestions: StructureQuestionScore[] = questionScores.map((batchQ) => {
        const qNum = batchQ.questionNumber;
        const prevQ = latest?.questionScores?.find((item) => item.questionNumber === qNum);
        const hasPrevSolved = Boolean(prevQ && prevQ.solved);
        const isTargeted = includedQuestions.has(qNum);

        // Rule 1: Untouched question -> ALWAYS preserve student's prior question score untouched!
        if (!isTargeted) {
          if (hasPrevSolved && prevQ) {
            preservedPriorQuestionsCount += 1;
            return { ...prevQ };
          }
          if (prevQ) {
            return { ...prevQ };
          }
          return {
            questionNumber: qNum,
            solved: false,
            accuracyPercentage: 0,
            notes: '',
            attemptNumber: createImprovement ? nextAttemptNum : 1,
            attemptLabel: createImprovement
              ? `محمّل من المحاولة السابقة`
              : 'المحاولة الأساسية',
            isImprovement: false,
          };
        }

        // Rule 2: Question WAS selected in this batch, and student ALREADY solved it earlier
        if (hasPrevSolved && prevQ) {
          const prevAcc = Number(prevQ.accuracyPercentage) || 0;
          const batchAcc = batchQ.solved ? Number(batchQ.accuracyPercentage) || 0 : 0;

          if (conflictPolicy === 'keep_existing') {
            // Safest policy: never overwrite an existing solved question
            preservedPriorQuestionsCount += 1;
            return { ...prevQ };
          }

          if (conflictPolicy === 'higher_wins' && (!batchQ.solved || batchAcc <= prevAcc)) {
            preservedPriorQuestionsCount += 1;
            return { ...prevQ };
          }

          // Applying updated/higher accuracy while preserving question attempt history
          upgradedQuestionsCount += 1;
          const prevAttemptNum = prevQ.attemptNumber || latest?.attemptNumber || 1;
          const nextQAttempt = createImprovement ? nextAttemptNum : prevAttemptNum;
          const prevHistory: StructureQuestionAttempt[] =
            prevQ.attempts && prevQ.attempts.length > 0
              ? [...prevQ.attempts]
              : [
                  {
                    attemptNumber: prevAttemptNum,
                    attemptLabel: prevQ.attemptLabel || 'المحاولة الأساسية',
                    accuracyPercentage: prevAcc,
                    previousAccuracy: prevQ.previousAccuracy,
                    date: latest?.date || date,
                  },
                ];

          const isChanged = batchAcc !== prevAcc || !batchQ.solved;
          const nextHistory =
            createImprovement && isChanged
              ? [
                  ...prevHistory,
                  {
                    attemptNumber: nextAttemptNum,
                    attemptLabel: `تحسين درجة (محاولة ${nextAttemptNum})`,
                    accuracyPercentage: batchAcc,
                    previousAccuracy: prevAcc,
                    date,
                  },
                ]
              : prevQ.attempts;

          return {
            ...prevQ,
            questionNumber: qNum,
            solved: batchQ.solved,
            accuracyPercentage: batchQ.solved ? batchAcc : 0,
            notes: prevQ.notes || '',
            attemptNumber: nextQAttempt,
            attemptLabel: createImprovement
              ? `تحسين درجة (محاولة ${nextAttemptNum})`
              : prevQ.attemptLabel || 'المحاولة الأساسية',
            isImprovement:
              (createImprovement && isChanged) ||
              Boolean(prevQ.isImprovement) ||
              (isChanged && batchAcc > prevAcc),
            previousAccuracy: isChanged ? prevAcc : prevQ.previousAccuracy,
            attempts: nextHistory,
          };
        }

        // Rule 3: Question WAS selected in this batch and NOT solved earlier by this student
        if (batchQ.solved) {
          newlyAppliedQuestionsCount += 1;
        }
        return {
          ...batchQ,
          notes: prevQ?.notes || batchQ.notes || '',
          attemptNumber: createImprovement ? nextAttemptNum : 1,
          attemptLabel: createImprovement
            ? `تحسين درجة (محاولة ${nextAttemptNum})`
            : 'المحاولة الأساسية',
          isImprovement: createImprovement && batchQ.solved,
          previousAccuracy: createImprovement ? 0 : undefined,
        };
      });

      // Compute student's true totals from their merged perStudentQuestions
      const studentSolvedItems = perStudentQuestions.filter((q) => q.solved);
      const studentSolvedCount = studentSolvedItems.length;
      const studentCompletionPct = Math.round((studentSolvedCount / totalQ) * 1000) / 10;
      const studentOverallAcc =
        studentSolvedCount > 0
          ? Math.round(
              (studentSolvedItems.reduce(
                (acc, q) => acc + (Number(q.accuracyPercentage) || 0),
                0
              ) /
                studentSolvedCount) *
                10
            ) / 10
          : 0;

      const impCount = perStudentQuestions.filter((q) => q.isImprovement).length;

      // Preserve existing student notes unless teacher provided a distinct new note
      const trimmedNewNote = notes.trim();
      const existingNote = (latest?.notes || '').trim();
      const mergedNotes = !trimmedNewNote
        ? existingNote
        : createImprovement
        ? trimmedNewNote
        : !existingNote
        ? trimmedNewNote
        : existingNote.includes(trimmedNewNote)
        ? existingNote
        : `${existingNote} | ${trimmedNewNote}`;

      return {
        student: st,
        latest,
        preservedPriorQuestionsCount,
        newlyAppliedQuestionsCount,
        upgradedQuestionsCount,
        record: {
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
          solvedCount: studentSolvedCount,
          completionPercentage: studentCompletionPct,
          overallAccuracyPercentage: studentOverallAcc,
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
          notes: mergedNotes,
          createdAt: createImprovement ? now : latest?.createdAt || now,
        },
      };
    });
  }, [
    activeStudents,
    existingProgressByStudent,
    batchMode,
    conflictPolicy,
    structure.id,
    structure.title,
    questionScores,
    includedQuestions,
    totalQ,
    grade,
    term,
    track,
    academicYear,
    subject,
    group,
    date,
    notes,
  ]);

  const requestSafeClose = () => {
    if (!isDirty) {
      onClose();
      return;
    }
    setConfirmState({
      isOpen: true,
      title: tr('تحذير: تعديلات غير محفوظة', 'Warning: Unsaved Changes'),
      message: tr(
        `لديك رصد غير محفوظ للهيكل "${structure.title}" لعدد (${activeStudents.length}) طالب. في حال الخروج الآن سيتم تجاهل التعديلات غير المحفوظة ولن تتغير أي درجات محفوظة سابقاً. هل تريد الخروج دون حفظ؟`,
        `You have unsaved batch edits for "${structure.title}" (${activeStudents.length} students). Closing now will discard unsaved edits without changing saved scores. Exit without saving?`
      ),
      confirmText: tr('تجاهل التعديلات والخروج', 'Discard & Exit'),
      cancelText: tr('البقاء ومتابعة الرصد', 'Stay & Continue'),
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
    setConflictPolicy(p.conflictPolicy || 'keep_existing');
    if (Array.isArray(p.includedQuestionNumbers)) {
      setIncludedQuestions(new Set(p.includedQuestionNumbers));
    }
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

  const applyQuickRange = () => {
    const start = Math.max(1, Math.min(totalQ, Math.floor(quickStartQ || 1)));
    const end = Math.max(start, Math.min(totalQ, Math.floor(quickEndQ || start)));
    const acc = Math.max(0, Math.min(100, Math.round(quickAccuracy || 0)));
    markDirty();
    setIncludedQuestions((prev) => {
      const next = new Set(prev);
      for (let q = start; q <= end; q++) {
        next.add(q);
      }
      return next;
    });
    setQuestionScores((prev) =>
      prev.map((q) =>
        q.questionNumber >= start && q.questionNumber <= end
          ? {
              ...q,
              solved: true,
              accuracyPercentage: acc,
            }
          : q
      )
    );
  };

  const setAllQuestionsState = (accuracy: number) => {
    markDirty();
    setIncludedQuestions(new Set(Array.from({ length: totalQ }, (_, i) => i + 1)));
    setQuestionScores((prev) =>
      prev.map((q) => ({
        ...q,
        solved: true,
        accuracyPercentage: accuracy,
      }))
    );
  };

  const requestClearBatchSelection = () => {
    if (includedQuestions.size === 0) return;
    setConfirmState({
      isOpen: true,
      title: tr('إلغاء تحديد الأسئلة في هذه الدفعة', 'Clear Selected Questions'),
      message: tr(
        `هل تريد إلغاء تحديد الأسئلة المختارة في هذه النافذة (${includedQuestions.size} سؤال)؟ لن تتأثر أي درجات سابقة للطلاب.`,
        `Deselect all ${includedQuestions.size} chosen questions in this batch? Existing student scores will not be affected.`
      ),
      confirmText: tr('تفريغ التحديد', 'Clear Selection'),
      cancelText: tr('تراجع', 'Cancel'),
      isDestructive: false,
      onConfirm: () => {
        setIncludedQuestions(new Set());
        setQuestionScores((prev) =>
          prev.map((q) => ({
            ...q,
            solved: false,
            accuracyPercentage: 0,
          }))
        );
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const applyAccuracyToIncluded = (accuracy: number) => {
    markDirty();
    // If nothing included yet, apply to all; otherwise only to currently included solved questions
    const targetAll = includedQuestions.size === 0;
    if (targetAll) {
      setIncludedQuestions(new Set(Array.from({ length: totalQ }, (_, i) => i + 1)));
    }
    setQuestionScores((prev) =>
      prev.map((q) =>
        targetAll || (includedQuestions.has(q.questionNumber) && q.solved)
          ? { ...q, solved: true, accuracyPercentage: accuracy }
          : q
      )
    );
  };

  const toggleIncludeQuestion = (qNum: number) => {
    markDirty();
    setIncludedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(qNum)) {
        next.delete(qNum);
      } else {
        next.add(qNum);
        setQuestionScores((scores) =>
          scores.map((q) =>
            q.questionNumber === qNum && !q.solved
              ? { ...q, solved: true, accuracyPercentage: 100 }
              : q
          )
        );
      }
      return next;
    });
  };

  const toggleQuestionSolved = (qNum: number) => {
    markDirty();
    setIncludedQuestions((prev) => {
      const next = new Set(prev);
      next.add(qNum);
      return next;
    });
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
    setIncludedQuestions((prev) => {
      const next = new Set(prev);
      next.add(qNum);
      return next;
    });
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
    if (activeStudents.length === 0 || includedQuestions.size === 0) return;

    try {
      setSaving(true);
      const records = mergedResultsPreview.map((item) => item.record);
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
        className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 overflow-hidden"
        onClick={(e) => {
          if (e.target === e.currentTarget) requestSafeClose();
        }}
      >
        <div
          id="batch-structure-scoring-modal"
          dir={dir}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[94dvh] sm:max-h-[92vh] text-start"
        >
          {/* Header */}
          <div className="shrink-0 px-4 sm:px-5 py-3.5 sm:py-4 bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" />
                <h3 className="font-black text-base text-slate-900 dark:text-white">
                  {tr(
                    `تسجيل ورصد درجة الهيكل لعدد (${activeStudents.length}) طالب مرة واحدة`,
                    `Batch Record Structure Scores (${activeStudents.length} Students)`
                  )}
                </h3>
                {isDirty && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                    <History className="w-3 h-3" />
                    {tr('مسودة تقدم محفوظة', 'Progress draft saved')}
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
              title={tr('إغلاق', 'Close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSaveSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
            {/* Safety Guarantee Banner */}
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/35 border border-emerald-300 dark:border-emerald-800/70 flex items-start gap-2.5 text-emerald-900 dark:text-emerald-200">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5 leading-relaxed">
                <div className="font-black text-xs sm:text-sm">
                  {tr('حماية الدرجات السابقة مفعّلة تلقائياً (لن تُفقد أي درجة مرصودة سابقاً)', 'Prior Score Protection Active Automatically (No previous scores will be lost)')}
                </div>
                <p className="text-[11px] opacity-90">
                  {tr(
                    'الأسئلة التي لا تحددها هنا تبقى محتفظة بدرجاتها السابقة لكل طالب كما هي تماماً، ويتم دمج الأسئلة الجديدة وإعادة حساب المجموع والنسبة لكل طالب بشكل مستقل.',
                    'Questions not included here keep each student’s previous recorded scores intact. New entries are merged and totals recalculated per student.'
                  )}
                </p>
              </div>
            </div>

            {/* Pending Draft Recovery Banner */}
            {pendingDraft && (
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="font-bold text-amber-900 dark:text-amber-100">
                    {tr('توجد مسودة رصد جماعي محفوظة تلقائياً لهذا الهيكل من جلسة سابقة', 'Auto-saved batch draft found from a previous session')}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleRestoreDraft}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{tr('استعادة التقدم', 'Restore Draft')}</span>
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

            {/* Selected Students Chips + Merge Rules */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  {tr(`الطلاب المحددين للتسجيل الجماعي (${activeStudents.length} طالب):`, `Selected Students for Batch Recording (${activeStudents.length}):`)}
                </span>
                {studentsWithPriorCount > 0 && (
                  <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
                    {tr(`(${studentsWithPriorCount}) طالب لديهم درجات سابقة محفوظة في هذا الهيكل`, `${studentsWithPriorCount} student(s) have existing scores in this structure`)}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {activeStudents.map((st) => {
                  const attempts = existingProgressByStudent.get(st.id) || [];
                  const latest = attempts.length > 0 ? attempts[attempts.length - 1] : null;
                  return (
                    <span
                      key={st.id}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                        latest
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <span>{st.name}</span>
                      {latest && (
                        <span className="font-mono text-[10px] opacity-80">
                          ({latest.solvedCount}/{totalQ} • {latest.overallAccuracyPercentage}%)
                        </span>
                      )}
                      {activeStudents.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setActiveStudents((prev) => prev.filter((item) => item.id !== st.id))
                          }
                          className="text-slate-400 hover:text-rose-600 cursor-pointer"
                          title={tr('إزالة من التحديد', 'Remove from selection')}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>

              {studentsWithPriorCount > 0 && (
                <div className="pt-2.5 border-t border-slate-200 dark:border-slate-700 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-bold text-slate-600 dark:text-slate-300 me-1">
                      {tr('نظام حفظ السجل للطلاب المرصودين مسبقاً:', 'Save Mode for Previously Recorded Students:')}
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
                      {tr('دمج في نفس السجل (مع إبقاء الدرجات السابقة)', 'Merge into Existing Record (Keep Prior)')}
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
                      <span>{tr('إضافة كمحاولة تحسين جديدة (+ إبقاء السجل السابق + وراثة الأسئلة)', 'Add New Retake Attempt (Keep Prior + Inherit)')}</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-bold text-slate-600 dark:text-slate-300 me-1">
                      {tr('إذا كان السؤال المحدد الآن مرصوداً مسبقاً للطالب:', 'If a Selected Question Already Has a Score:')}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        markDirty();
                        setConflictPolicy('keep_existing');
                      }}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] border cursor-pointer transition ${
                        conflictPolicy === 'keep_existing'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {tr('الاحتفاظ بدرجته السابقة كما هي (الأضمن)', 'Keep Existing Score (Safest)')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        markDirty();
                        setConflictPolicy('higher_wins');
                      }}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] border cursor-pointer transition ${
                        conflictPolicy === 'higher_wins'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {tr('ترقية للدرجة الأعلى فقط', 'Keep Higher Score Only')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        markDirty();
                        setConflictPolicy('replace_selected');
                      }}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] border cursor-pointer transition ${
                        conflictPolicy === 'replace_selected'
                          ? 'bg-sky-600 text-white border-sky-600'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {tr('تحديث الأسئلة المحددة فقط بالدرجة الجديدة', 'Overwrite Selected Questions Only')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Live Batch Selection KPIs */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                  {tr('الأسئلة المشمولة في الدفعة', 'Questions Included')}
                </span>
                <span className="text-lg sm:text-xl font-black font-mono tabular-nums text-slate-900 dark:text-white">
                  {batchTemplateStats.includedCount} / {totalQ} {tr('سؤال', 'Q')}
                </span>
              </div>
              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/70 text-center">
                <span className="text-[11px] text-amber-700 dark:text-amber-400 block">
                  {tr('الأسئلة غير المحددة (تُترك كما هي)', 'Untouched Questions (Preserved)')}
                </span>
                <span className="text-lg sm:text-xl font-black font-mono tabular-nums text-amber-600 dark:text-amber-400">
                  {totalQ - batchTemplateStats.includedCount} {tr('سؤال محفوظ', 'Preserved')}
                </span>
              </div>
              <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/70 text-center">
                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block">
                  {tr('نسبة الأسئلة المحددة حالياً', 'Selected Avg Accuracy')}
                </span>
                <span className="text-lg sm:text-xl font-black font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                  {batchTemplateStats.avgIncludedAcc}%
                </span>
              </div>
            </div>

            {/* Metadata */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="font-bold text-slate-700 dark:text-slate-300 block">
                {tr('بيانات القيد الأكاديمي الموحدة للمجموعة:', 'Unified Academic Metadata for Batch:')}
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
                />
              </div>
            </div>

            {/* Quick Bulk Range Generator Controls */}
            <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-800/60 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-black text-amber-900 dark:text-amber-200">
                    {tr('ضبط نطاق أسئلة للمحددين:', 'Set Question Range for Selected:')}
                  </span>
                  <div className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-amber-200 dark:border-amber-800">
                    <span className="text-[11px] text-slate-600 dark:text-slate-300">{tr('من س', 'From Q')}</span>
                    <input
                      type="number"
                      min={1}
                      max={totalQ}
                      value={quickStartQ}
                      onChange={(e) => {
                        const val = Math.max(1, Math.min(totalQ, Number(e.target.value) || 1));
                        setQuickStartQ(val);
                        if (quickEndQ < val) setQuickEndQ(val);
                      }}
                      className="w-12 px-1 py-0.5 text-center font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded"
                    />
                    <span className="text-[11px] text-slate-600 dark:text-slate-300">{tr('إلى س', 'to Q')}</span>
                    <input
                      type="number"
                      min={quickStartQ}
                      max={totalQ}
                      value={quickEndQ}
                      onChange={(e) =>
                        setQuickEndQ(Math.max(quickStartQ, Math.min(totalQ, Number(e.target.value) || totalQ)))
                      }
                      className="w-12 px-1 py-0.5 text-center font-mono font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded"
                    />
                  </div>
                  <div className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-amber-200 dark:border-amber-800">
                    <span className="text-[11px] text-slate-600 dark:text-slate-300">{tr('نسبة الصحة:', 'Accuracy:')}</span>
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
                    onClick={applyQuickRange}
                    className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] cursor-pointer"
                  >
                    {tr('تطبيق النطاق', 'Apply Range')}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAllQuestionsState(100)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] cursor-pointer hover:bg-emerald-500"
                  >
                    {tr('تحديد الكل (100%)', 'Select All (100%)')}
                  </button>
                  <button
                    type="button"
                    onClick={() => applyAccuracyToIncluded(75)}
                    className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 font-bold text-[11px] cursor-pointer"
                  >
                    {tr('75% للمحدد', '75% Selected')}
                  </button>
                  <button
                    type="button"
                    onClick={() => applyAccuracyToIncluded(50)}
                    className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold text-[11px] cursor-pointer"
                  >
                    {tr('50% للمحدد', '50% Selected')}
                  </button>
                  <button
                    type="button"
                    onClick={requestClearBatchSelection}
                    disabled={includedQuestions.size === 0}
                    className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] cursor-pointer disabled:opacity-50"
                  >
                    {tr('إلغاء تحديد الأسئلة', 'Clear Selection')}
                  </button>
                </div>
              </div>
            </div>

            {/* Per-Question Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto">
              <table className="w-full text-start text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2.5 px-3 min-w-[130px]">{tr('السؤال', 'Question')}</th>
                    <th className="py-2.5 px-3 min-w-[135px]">{tr('شمل السؤال بالدفعة', 'Include in Batch')}</th>
                    <th className="py-2.5 px-3">{tr('حالة الحل', 'Solved Status')}</th>
                    <th className="py-2.5 px-3">{tr('نسبة صحة السؤال (0% - 100%)', 'Accuracy (0% - 100%)')}</th>
                    <th className="py-2.5 px-3 hidden md:table-cell">{tr('تحديد سريع', 'Quick Pick')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {questionScores.map((qs) => {
                    const qMeta = structure.questions?.find(
                      (item) => item.questionNumber === qs.questionNumber
                    );
                    const isIncluded = includedQuestions.has(qs.questionNumber);
                    const priorSummary = existingStatsByQuestion.get(qs.questionNumber);

                    return (
                      <tr
                        key={qs.questionNumber}
                        className={
                          isIncluded
                            ? 'bg-emerald-50/30 dark:bg-emerald-950/15'
                            : 'bg-white dark:bg-slate-900 opacity-90'
                        }
                      >
                        <td className="py-2 px-3">
                          <div className="flex flex-col gap-0.5">
                            <div>
                              <span className="font-mono font-black text-slate-900 dark:text-white">
                                {tr('س', 'Q')}{qs.questionNumber}
                              </span>
                              {qMeta?.title && (
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 ms-1.5">
                                  • {qMeta.title}
                                </span>
                              )}
                            </div>
                            {priorSummary && priorSummary.recordedCount > 0 && (
                              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">
                                {tr('مرصود سابقاً لـ', 'Prior for')} {priorSummary.recordedCount}/{activeStudents.length} (
                                {priorSummary.minAcc === priorSummary.maxAcc
                                  ? `${priorSummary.maxAcc}%`
                                  : `${priorSummary.minAcc}%–${priorSummary.maxAcc}%`}
                                )
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <button
                            type="button"
                            onClick={() => toggleIncludeQuestion(qs.questionNumber)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-[11px] border cursor-pointer transition ${
                              isIncluded
                                ? 'bg-amber-500 text-slate-950 border-amber-500'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {isIncluded ? (
                              <>
                                <CheckSquare className="w-3.5 h-3.5" />
                                <span>{tr('مشمول بالتحديث', 'Included')}</span>
                              </>
                            ) : (
                              <>
                                <Square className="w-3.5 h-3.5" />
                                <span>{tr('يُترك كما هو', 'Leave As-Is')}</span>
                              </>
                            )}
                          </button>
                        </td>
                        <td className="py-2 px-3">
                          <button
                            type="button"
                            onClick={() => toggleQuestionSolved(qs.questionNumber)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-[11px] border cursor-pointer transition ${
                              isIncluded && qs.solved
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {isIncluded && qs.solved ? (
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
                              type="number"
                              min={0}
                              max={100}
                              step={1}
                              value={isIncluded ? qs.accuracyPercentage : ''}
                              placeholder="—"
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
                              value={isIncluded ? qs.accuracyPercentage : 0}
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
                                  isIncluded && qs.solved && qs.accuracyPercentage === val
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

            {/* Live Per-Student Merge Preview */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-black text-slate-800 dark:text-slate-100">
                  {tr('معاينة نتيجة الدمج لكل طالب قبل الحفظ:', 'Per-Student Merge Preview Before Saving:')}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {tr('يضمن بقاء الدرجات السابقة + إضافة الجديد', 'Preserves prior scores + merges new ones')}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                {mergedResultsPreview.map(
                  ({
                    student,
                    latest,
                    record,
                    preservedPriorQuestionsCount,
                    newlyAppliedQuestionsCount,
                    upgradedQuestionsCount,
                  }) => (
                    <div
                      key={student.id}
                      className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 space-y-1"
                    >
                      <div className="font-bold text-slate-900 dark:text-white truncate">
                        {student.name}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] font-mono tabular-nums flex-wrap">
                        <span className="text-slate-500 dark:text-slate-400">
                          {latest
                            ? `${tr('سابقاً:', 'Prior:')} ${latest.solvedCount}/${totalQ} (${latest.overallAccuracyPercentage}%)`
                            : tr('مستجد', 'New')}
                        </span>
                        <ArrowLeft className="w-3 h-3 text-amber-500 shrink-0 ltr:rotate-180" />
                        <span className="font-black text-emerald-600 dark:text-emerald-400">
                          {tr('بعد الحفظ:', 'After:')} {record.solvedCount}/{totalQ} ({record.overallAccuracyPercentage}%)
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {tr('محفوظ سابقاً:', 'Preserved:')} {preservedPriorQuestionsCount} • {tr('مضاف جديد:', 'Added:')} {newlyAppliedQuestionsCount}
                        {upgradedQuestionsCount > 0 ? ` • ${tr('محدّث:', 'Updated:')} ${upgradedQuestionsCount}` : ''}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {tr('ملاحظة موحدة للطلاب المحددين (اختياري — لن تمسح الملاحظات السابقة)', 'Unified Note for Selected Students (Optional — will not erase prior notes)')}
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => {
                  markDirty();
                  setNotes(e.target.value);
                }}
                placeholder={tr('مثال: تم رصد أداء المجموعة في الهيكل النهائي...', 'e.g. Recorded group performance in final structure...')}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                {includedQuestions.size === 0
                  ? tr('اختر سؤالاً واحداً على الأقل من الجدول أعلاه لتطبيقه على الطلاب المحددين', 'Select at least one question above to apply to selected students')
                  : tr(`سيتم حفظ (${includedQuestions.size}) سؤال مع حماية كل الدرجات السابقة`, `${includedQuestions.size} question(s) will be saved with full prior score protection`)}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={requestSafeClose}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                >
                  {tr('إلغاء', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saving || activeStudents.length === 0 || includedQuestions.size === 0}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {saving
                      ? tr('جاري الحفظ الآمن...', 'Saving safely...')
                      : tr(`حفظ ودمج الدرجات لـ (${activeStudents.length}) طالب`, `Save & Merge for (${activeStudents.length}) Students`)}
                  </span>
                </button>
              </div>
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
