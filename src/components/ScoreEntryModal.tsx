import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Save,
  Search,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ArrowDown,
  Check,
  Paperclip,
  ShieldCheck,
  Plus,
  Trash2,
  Sparkles,
  CheckSquare,
  Square,
  Users,
  RotateCcw,
  History,
} from 'lucide-react';
import { Student, Exam, ExamResult, TeacherSettings, ResultAttachment } from '../types';
import { getGradeRating } from '../utils/grading';
import { exportExamResultsExcel } from '../utils/excel';
import { DEFAULT_SETTINGS, saveBatchResults, deleteResult } from '../services/firebase';
import {
  saveScoreEntryDraft,
  loadScoreEntryDraft,
  clearScoreEntryDraft,
} from '../utils/activityTracker';
import { AttachmentModal } from './AttachmentModal';
import { AttachmentThumbnail } from './AttachmentThumbnail';
import { ConfirmModal } from './ConfirmModal';
import {
  useLanguage,
  translateGrade,
  translateTerm,
  translateTrack,
  translateSubject,
} from '../utils/i18n';

interface ScoreEntryModalProps {
  isOpen: boolean;
  exam: Exam | null;
  exams?: Exam[];
  onSelectExam?: (exam: Exam) => void;
  students?: Student[];
  existingResults?: ExamResult[];
  settings?: TeacherSettings;
  preselectedStudent?: Student | null;
  onClose: () => void;
  onSaveBatch?: (
    results: Array<ExamResult>
  ) => Promise<void>;
  onSaveScores?: (
    results: Array<ExamResult>
  ) => Promise<void>;
  onDeleteResult?: (resultId: string) => Promise<void>;
  onUpdateResultAttachment?: (resultId: string, attachment: ResultAttachment | null) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
}

interface ScoreRowState {
  rowKey: string;
  resultId?: string;
  studentDocId: string;
  studentId: string;
  studentName: string;
  grade: string;
  group: string;
  score: string;
  notes: string;
  attachment?: ResultAttachment | null;
  attemptNumber: number;
  attemptLabel?: string;
  isImprovement: boolean;
  previousScore?: number;
  isModified: boolean;
  isExisting: boolean;
}

export const ScoreEntryModal: React.FC<ScoreEntryModalProps> = ({
  isOpen,
  exam,
  exams,
  onSelectExam,
  students = [],
  existingResults = [],
  settings = DEFAULT_SETTINGS,
  preselectedStudent,
  onClose,
  onSaveBatch,
  onSaveScores,
  onDeleteResult,
  onUpdateResultAttachment,
  onDirtyChange,
}) => {
  const [rows, setRows] = useState<ScoreRowState[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllStudents, setShowAllStudents] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [attachmentTargetRow, setAttachmentTargetRow] = useState<ScoreRowState | null>(null);

  // Multi-selection & bulk score entry states
  const [selectedRowKeys, setSelectedRowKeys] = useState<Set<string>>(new Set());
  const [selectCountInput, setSelectCountInput] = useState<number>(5);
  const [bulkScoreValue, setBulkScoreValue] = useState<string>('');
  const [bulkNotesValue, setBulkNotesValue] = useState<string>('');

  // Draft recovery banner state
  const [pendingDraft, setPendingDraft] = useState<{
    rows: Record<string, { score: string; notes: string }>;
    updatedAt: string;
  } | null>(null);

  const { lang, dir, tr } = useLanguage();

  const translateRating = (label: string) => {
    if (lang === 'ar') return label;
    if (label === 'ممتاز') return 'Excellent';
    if (label === 'جيد جداً') return 'Very Good';
    if (label === 'جيد') return 'Good';
    if (label === 'مقبول') return 'Acceptable';
    if (label === 'يحتاج إلى تحسين') return 'Needs Improvement';
    return label;
  };

  // ConfirmModal state for destructive deletes, bulk overwrite & unsaved exit
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
    confirmText: tr('تأكيد', 'Confirm'),
    cancelText: tr('تراجع', 'Cancel'),
    isDestructive: true,
    onConfirm: () => {},
  });

  const inputRefs = useRef<{
    [key: string]: HTMLInputElement | null;
  }>({});

  /*
   * الحصول على مواد الطالب.
   */
  const getStudentSubjects = (student: Student): string[] => {
    if (
      Array.isArray(student.subjects) &&
      student.subjects.length > 0
    ) {
      return student.subjects;
    }

    if (student.subject) {
      return [student.subject];
    }

    return [];
  };

  useEffect(() => {
    if (!exam || !isOpen) return;

    /*
     * تحديد الطلاب المؤهلين للامتحان
     */
    const eligibleStudents = students.filter((student) => {
      const matchesGrade =
        !exam.grade || student.grade === exam.grade;

      const matchesTrack =
        !exam.track || !student.track || student.track === exam.track;

      const studentSubjects = getStudentSubjects(student);
      const hasNoSubjectData = studentSubjects.length === 0;

      const matchesSubject =
        hasNoSubjectData ||
        studentSubjects.includes(exam.subject);

      return matchesGrade && matchesTrack && matchesSubject;
    });

    const relevantStudents = showAllStudents
      ? students
      : eligibleStudents;

    /*
     * خريطة النتائج الحالية مجمعة لكل طالب لدعم تعدد الدرجات ومحاولات التحسين
     */
    const studentResultsMap = new Map<string, ExamResult[]>();
    existingResults.forEach((result) => {
      const docKey = result.studentDocId;
      if (docKey) {
        const list = studentResultsMap.get(docKey) || [];
        list.push(result);
        studentResultsMap.set(docKey, list);
      }
      const codeKey = result.studentId;
      if (codeKey && codeKey !== docKey) {
        const list = studentResultsMap.get(codeKey) || [];
        list.push(result);
        studentResultsMap.set(codeKey, list);
      }
    });

    /*
     * إنشاء صفوف الطلاب مع دعم تعدد المحاولات
     */
    const initialRows: ScoreRowState[] = [];

    relevantStudents.forEach((student) => {
      const studentResults =
        studentResultsMap.get(student.id) ||
        (student.studentId ? studentResultsMap.get(student.studentId) : undefined);

      if (studentResults && studentResults.length > 0) {
        // ترتيب محاولات الطالب تصاعدياً حسب رقم المحاولة
        studentResults.sort((a, b) => (a.attemptNumber || 1) - (b.attemptNumber || 1));

        studentResults.forEach((res, idx) => {
          initialRows.push({
            rowKey: res.id || `${student.id}_attempt_${idx + 1}`,
            resultId: res.id,
            studentDocId: student.id,
            studentId: student.studentId,
            studentName: student.name,
            grade: student.grade,
            group: student.group || '',
            score: String(res.score),
            notes: res.notes || '',
            attachment: res.attachment || null,
            attemptNumber: res.attemptNumber || (idx + 1),
            attemptLabel: res.attemptLabel || (idx === 0 ? 'المحاولة الأساسية' : `تحسين درجة (محاولة ${idx + 1})`),
            isImprovement: !!res.isImprovement || idx > 0,
            previousScore: res.previousScore !== undefined ? res.previousScore : (idx > 0 ? studentResults[idx - 1]?.score : undefined),
            isModified: false,
            isExisting: true,
          });
        });
      } else {
        // طالب لم يُرصد له امتحان بعد
        initialRows.push({
          rowKey: `${student.id}_attempt_1`,
          studentDocId: student.id,
          studentId: student.studentId,
          studentName: student.name,
          grade: student.grade,
          group: student.group || '',
          score: '',
          notes: '',
          attachment: null,
          attemptNumber: 1,
          attemptLabel: 'المحاولة الأساسية',
          isImprovement: false,
          isModified: false,
          isExisting: false,
        });
      }
    });

    /*
     * إضافة أي نتائج محفوظة لطلاب خارج القائمة المؤهلة
     */
    existingResults.forEach((result) => {
      const alreadyAdded = initialRows.some(
        (row) => (row.resultId && row.resultId === result.id) || (row.studentDocId === result.studentDocId && row.attemptNumber === (result.attemptNumber || 1))
      );

      if (!alreadyAdded) {
        const student = students.find((s) => s.id === result.studentDocId);
        initialRows.push({
          rowKey: result.id || `${result.studentDocId}_attempt_${result.attemptNumber || 1}_${Date.now()}`,
          resultId: result.id,
          studentDocId: result.studentDocId,
          studentId: student ? student.studentId : '-',
          studentName: result.studentName,
          grade: student?.grade || '-',
          group: student?.group || '',
          score: String(result.score),
          notes: result.notes || '',
          attachment: result.attachment || null,
          attemptNumber: result.attemptNumber || 1,
          attemptLabel: result.attemptLabel || (result.isImprovement ? 'تحسين درجة' : 'المحاولة الأساسية'),
          isImprovement: !!result.isImprovement,
          previousScore: result.previousScore,
          isModified: false,
          isExisting: true,
        });
      }
    });

    /*
     * ترتيب صفوف الجدول أبجدياً حسب اسم الطالب، ثم حسب رقم المحاولة
     */
    initialRows.sort((a, b) => {
      const nameCompare = a.studentName.localeCompare(
        b.studentName,
        lang === 'en' ? 'en' : 'ar'
      );
      if (nameCompare !== 0) return nameCompare;
      return a.attemptNumber - b.attemptNumber;
    });

    setRows(initialRows);
    setSelectedRowKeys(new Set());
    setBulkScoreValue('');
    setBulkNotesValue('');
    setErrorMessage('');
    setSearchTerm(preselectedStudent ? preselectedStudent.name : '');
    setSaveSuccess(false);

    // Check if an unsaved progress draft exists for this exam
    const draft = loadScoreEntryDraft(exam.id);
    if (draft && Object.keys(draft.rows).length > 0) {
      setPendingDraft(draft);
    } else {
      setPendingDraft(null);
    }
  }, [
    exam,
    isOpen,
    students,
    existingResults,
    showAllStudents,
    preselectedStudent,
  ]);

  const modifiedRowsCount = rows.filter((r) => r.isModified).length;
  const hasUnsavedChanges = modifiedRowsCount > 0;

  useEffect(() => {
    onDirtyChange?.(isOpen && hasUnsavedChanges);
  }, [isOpen, hasUnsavedChanges, onDirtyChange]);

  useEffect(() => {
    return () => {
      onDirtyChange?.(false);
    };
  }, [onDirtyChange]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isOpen && hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isOpen, hasUnsavedChanges]);

  // Auto-save progress draft whenever rows are modified
  useEffect(() => {
    if (!isOpen || !exam) return;
    if (!hasUnsavedChanges) return;

    const draftMap: Record<string, { score: string; notes: string }> = {};
    rows.forEach((r) => {
      if (r.isModified) {
        draftMap[r.rowKey] = { score: r.score, notes: r.notes };
      }
    });
    if (Object.keys(draftMap).length > 0) {
      saveScoreEntryDraft(exam.id, draftMap);
    }
  }, [rows, hasUnsavedChanges, isOpen, exam]);

  // Safe close & safe exam switch guards
  const requestSafeClose = () => {
    if (!hasUnsavedChanges) {
      onClose();
      return;
    }
    setConfirmState({
      isOpen: true,
      title: tr('تحذير: تعديلات غير محفوظة', 'Warning: Unsaved Changes'),
      message: tr(
        `يوجد (${modifiedRowsCount}) درجة/تعديل لم يتم حفظه بعد في امتحان "${exam?.title || ''}". في حال الخروج الآن سيتم تجاهل التعديلات غير المحفوظة. هل تريد الخروج دون حفظ؟`,
        `There are (${modifiedRowsCount}) unsaved score/edit(s) in "${exam?.title || ''}". Closing now will discard unsaved changes. Exit without saving?`
      ),
      confirmText: tr('تجاهل التعديلات والخروج', 'Discard & Close'),
      cancelText: tr('البقاء وحفظ الدرجات', 'Stay & Save Scores'),
      isDestructive: true,
      onConfirm: () => {
        if (exam) clearScoreEntryDraft(exam.id);
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
        onClose();
      },
    });
  };

  const requestSafeSwitchExam = (chosenExam: Exam) => {
    if (!onSelectExam || !exam || chosenExam.id === exam.id) return;
    if (!hasUnsavedChanges) {
      onSelectExam(chosenExam);
      return;
    }
    setConfirmState({
      isOpen: true,
      title: tr('تحذير: الانتقال لامتحان آخر قبل الحفظ', 'Warning: Switch Exam Before Saving'),
      message: tr(
        `لديك (${modifiedRowsCount}) تعديل غير محفوظ في امتحان "${exam.title}". الانتقال إلى "${chosenExam.title}" سيتجاهل التعديلات الحالية غير المحفوظة. هل تريد المتابعة؟`,
        `You have (${modifiedRowsCount}) unsaved edit(s) in "${exam.title}". Switching to "${chosenExam.title}" will discard current unsaved changes. Continue?`
      ),
      confirmText: tr('الانتقال بدون حفظ', 'Switch Without Saving'),
      cancelText: tr('البقاء في الامتحان الحالي', 'Stay on Current Exam'),
      isDestructive: true,
      onConfirm: () => {
        clearScoreEntryDraft(exam.id);
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
        onSelectExam(chosenExam);
      },
    });
  };

  // Intercept Escape key in capture phase so App.tsx doesn't bypass unsaved warning
  useEffect(() => {
    if (!isOpen) return;
    const handleEscCapture = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (attachmentTargetRow) return;
      e.preventDefault();
      e.stopPropagation();
      if (confirmState.isOpen) {
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
      } else {
        requestSafeClose();
      }
    };
    window.addEventListener('keydown', handleEscCapture, { capture: true });
    return () => window.removeEventListener('keydown', handleEscCapture, { capture: true });
  });

  if (!isOpen || !exam) return null;

  /*
   * تغيير الدرجة
   */
  const handleScoreChange = (
    rowKey: string,
    value: string
  ) => {
    setRows((previousRows) =>
      previousRows.map((row) => {
        if (row.rowKey === rowKey) {
          return {
            ...row,
            score: value,
            isModified: true,
          };
        }
        return row;
      })
    );
  };

  /*
   * إضافة محاولة تحسين جديدة لنفس الطالب لنفس الامتحان
   */
  const handleAddImprovementAttempt = (studentDocId: string) => {
    const studentRows = rows.filter((r) => r.studentDocId === studentDocId);
    if (studentRows.length === 0) return;

    const lastRow = studentRows[studentRows.length - 1];
    const maxAttempt = Math.max(...studentRows.map((r) => r.attemptNumber), 1);
    const nextAttempt = maxAttempt + 1;
    const prevScoreNum = parseFloat(lastRow.score);

    const newRowKey = `${studentDocId}_attempt_${nextAttempt}_${Date.now()}`;

    const newRow: ScoreRowState = {
      rowKey: newRowKey,
      studentDocId: lastRow.studentDocId,
      studentId: lastRow.studentId,
      studentName: lastRow.studentName,
      grade: lastRow.grade,
      group: lastRow.group,
      score: '',
      notes: 'تحسين درجة بعد إعادة الامتحان',
      attachment: null,
      attemptNumber: nextAttempt,
      attemptLabel: `تحسين درجة (محاولة ${nextAttempt})`,
      isImprovement: true,
      previousScore: !isNaN(prevScoreNum) ? prevScoreNum : undefined,
      isModified: true,
      isExisting: false,
    };

    // إدراج الصف الجديد مباشرة بعد صفوف هذا الطالب
    const lastIndex = rows.map((r, idx) => ({ r, idx }))
      .filter(({ r }) => r.studentDocId === studentDocId)
      .pop()?.idx ?? rows.length - 1;

    const updated = [...rows];
    updated.splice(lastIndex + 1, 0, newRow);
    setRows(updated);

    // التركيز التلقائي على حقل الدرجة الجديد
    setTimeout(() => {
      inputRefs.current[newRowKey]?.focus();
    }, 60);
  };

  /*
   * حذف أو إلغاء محاولة تحسين (مع رسالة تحذيرية مؤكدة)
   */
  const executeRemoveAttempt = async (rowKey: string, resultId?: string) => {
    if (resultId) {
      try {
        if (onDeleteResult) {
          await onDeleteResult(resultId);
        } else {
          await deleteResult(resultId);
        }
      } catch (err) {
        console.error('Delete attempt error:', err);
      }
    }
    setRows((prev) => prev.filter((r) => r.rowKey !== rowKey));
    setSelectedRowKeys((prev) => {
      const next = new Set(prev);
      next.delete(rowKey);
      return next;
    });
  };

  const requestRemoveAttempt = (row: ScoreRowState) => {
    setConfirmState({
      isOpen: true,
      title: row.resultId
        ? tr('حذف محاولة تحسين محفوظة', 'Delete Saved Improvement Attempt')
        : tr('إلغاء صف محاولة التحسين', 'Remove Improvement Attempt Row'),
      message: row.resultId
        ? tr(
            `هل أنت متأكد من حذف محاولة التحسين رقم (${row.attemptNumber}) للطالب "${row.studentName}" (${row.score || '-'}/${exam.totalScore}) نهائياً من قاعدة البيانات؟`,
            `Are you sure you want to permanently delete improvement attempt #${row.attemptNumber} for "${row.studentName}" (${row.score || '-'}/${exam.totalScore}) from the database?`
          )
        : tr(
            `هل تريد إلغاء صف محاولة التحسين رقم (${row.attemptNumber}) للطالب "${row.studentName}"؟`,
            `Remove improvement attempt row #${row.attemptNumber} for "${row.studentName}"?`
          ),
      confirmText: row.resultId
        ? tr('تأكيد الحذف النهائي', 'Confirm Permanent Delete')
        : tr('إزالة الصف', 'Remove Row'),
      cancelText: tr('تراجع', 'Cancel'),
      isDestructive: true,
      onConfirm: async () => {
        await executeRemoveAttempt(row.rowKey, row.resultId);
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  /*
   * تغيير الملاحظات
   */
  const handleNotesChange = (
    rowKey: string,
    value: string
  ) => {
    setRows((previousRows) =>
      previousRows.map((row) => {
        if (row.rowKey === rowKey) {
          return {
            ...row,
            notes: value,
            isModified: true,
          };
        }
        return row;
      })
    );
  };

  /*
   * التنقل بين درجات الطلاب بالكيبورد
   */
  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    currentIndex: number
  ) => {
    if (
      event.key === 'Enter' ||
      event.key === 'ArrowDown'
    ) {
      event.preventDefault();

      const nextRow =
        filteredRows[currentIndex + 1];

      if (
        nextRow &&
        inputRefs.current[nextRow.rowKey]
      ) {
        inputRefs.current[nextRow.rowKey]?.focus();
        inputRefs.current[nextRow.rowKey]?.select();
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();

      const previousRow =
        filteredRows[currentIndex - 1];

      if (
        previousRow &&
        inputRefs.current[previousRow.rowKey]
      ) {
        inputRefs.current[previousRow.rowKey]?.focus();
        inputRefs.current[previousRow.rowKey]?.select();
      }
    }
  };

  /*
   * إعطاء الدرجة الكاملة للجميع (بتحذير ConfirmModal بدلاً من window.confirm)
   */
  const handleSetFullScoreForAll = () => {
    setConfirmState({
      isOpen: true,
      title: tr('تأكيد رصد الدرجة النهائية للجميع', 'Confirm Full Score for All'),
      message: tr(
        `هل أنت متأكد من رصد الدرجة النهائية (${exam.totalScore}) لجميع الطلاب في القائمة (${rows.length} صف)؟ سيتم تعديل أي درجات مسجلة سابقاً قبل الضغط على حفظ.`,
        `Are you sure you want to set the full score (${exam.totalScore}) for all students in the list (${rows.length} rows)? Previously entered scores will be updated before saving.`
      ),
      confirmText: tr(`تعيين ${exam.totalScore} للكل`, `Set ${exam.totalScore} for All`),
      cancelText: tr('إلغاء', 'Cancel'),
      isDestructive: false,
      onConfirm: () => {
        setRows((previousRows) =>
          previousRows.map((row) => ({
            ...row,
            score: String(exam.totalScore),
            isModified: true,
          }))
        );
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  /*
   * إعطاء درجة النجاح للطلاب الذين لم يتم رصد درجاتهم
   */
  const handleSetPassingScoreForEmpty = () => {
    setRows((previousRows) =>
      previousRows.map((row) => {
        if (row.score === '') {
          return {
            ...row,
            score: String(exam.passScore),
            isModified: true,
          };
        }
        return row;
      })
    );
  };

  /*
   * البحث
   */
  const filteredRows = rows.filter((row) => {
    const term = searchTerm
      .trim()
      .toLowerCase();

    if (!term) return true;

    return (
      row.studentName
        .toLowerCase()
        .includes(term) ||
      row.studentId
        .toLowerCase()
        .includes(term)
    );
  });

  /*
   * الإحصائيات
   */
  const filledRows = rows.filter(
    (row) =>
      row.score.trim() !== '' &&
      !isNaN(Number(row.score))
  );

  const totalEntered = filledRows.length;

  const passedCount = filledRows.filter(
    (row) =>
      Number(row.score) >= exam.passScore
  ).length;

  /*
   * دوال التحديد المتعدد وتسجيل الدرجة للمحددين مرة واحدة
   */
  const filteredRowKeys = filteredRows.map((r) => r.rowKey);
  const allFilteredSelected =
    filteredRows.length > 0 && filteredRowKeys.every((k) => selectedRowKeys.has(k));

  const toggleSelectRow = (rowKey: string) => {
    setSelectedRowKeys((prev) => {
      const next = new Set(prev);
      if (next.has(rowKey)) next.delete(rowKey);
      else next.add(rowKey);
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    setSelectedRowKeys(new Set(filteredRowKeys));
  };

  const handleSelectUnrecordedFiltered = () => {
    setSelectedRowKeys(
      new Set(filteredRows.filter((r) => r.score.trim() === '').map((r) => r.rowKey))
    );
  };

  const handleSelectSpecificCount = (countRaw: number) => {
    const count = Math.max(1, Math.min(filteredRows.length, Math.floor(countRaw || 1)));
    setSelectedRowKeys(new Set(filteredRows.slice(0, count).map((r) => r.rowKey)));
  };

  const handleClearSelection = () => {
    setSelectedRowKeys(new Set());
  };

  const handleRestoreDraft = () => {
    if (!pendingDraft) return;
    setRows((prev) =>
      prev.map((row) => {
        const draftEntry = pendingDraft.rows[row.rowKey];
        if (!draftEntry) return row;
        return {
          ...row,
          score: draftEntry.score,
          notes: draftEntry.notes,
          isModified: true,
        };
      })
    );
    setPendingDraft(null);
  };

  const handleDiscardDraft = () => {
    if (exam) clearScoreEntryDraft(exam.id);
    setPendingDraft(null);
  };

  const buildExamResultsFromRows = (targetRows: ScoreRowState[]): ExamResult[] => {
    const out: ExamResult[] = [];
    for (const row of targetRows) {
      if (row.score.trim() === '') continue;
      const numericScore = parseFloat(row.score);
      if (isNaN(numericScore)) continue;
      const clampedScore = Math.max(0, Math.min(exam.totalScore, numericScore));
      const percentage = Math.round((clampedScore / exam.totalScore) * 1000) / 10;
      const rating = getGradeRating(percentage, settings.gradingScale);
      const passed = clampedScore >= exam.passScore;

      out.push({
        id: row.resultId || '',
        examId: exam.id,
        studentId: row.studentId,
        studentDocId: row.studentDocId,
        studentName: row.studentName,
        examTitle: exam.title,
        examDate: exam.date,
        score: clampedScore,
        totalScore: exam.totalScore,
        percentage,
        gradeRating: rating.label,
        passed,
        notes: row.notes,
        attachment: row.attachment || null,
        attemptNumber: row.attemptNumber,
        attemptLabel: row.attemptLabel,
        isImprovement: row.isImprovement,
        previousScore: row.previousScore,
        updatedAt: new Date().toISOString(),
      });
    }
    return out;
  };

  const handleApplyScoreToSelected = () => {
    if (selectedRowKeys.size === 0) return;
    if (bulkScoreValue.trim() === '' || isNaN(Number(bulkScoreValue))) {
      setErrorMessage(
        tr(
          'يرجى إدخال الدرجة الموحدة أولاً لتطبيقها على الطلاب المحددين.',
          'Please enter a unified score first to apply it to selected students.'
        )
      );
      return;
    }
    const clampedVal = String(
      Math.max(0, Math.min(exam.totalScore, parseFloat(bulkScoreValue)))
    );
    setErrorMessage('');
    setRows((prev) =>
      prev.map((row) =>
        selectedRowKeys.has(row.rowKey)
          ? {
              ...row,
              score: clampedVal,
              notes: bulkNotesValue.trim() !== '' ? bulkNotesValue.trim() : row.notes,
              isModified: true,
            }
          : row
      )
    );
  };

  const handleSaveSelectedOnce = async () => {
    if (selectedRowKeys.size === 0) return;
    const hasBulkScore = bulkScoreValue.trim() !== '' && !isNaN(Number(bulkScoreValue));
    const clampedBulk = hasBulkScore
      ? String(Math.max(0, Math.min(exam.totalScore, parseFloat(bulkScoreValue))))
      : null;

    const updatedRows = rows.map((row) => {
      if (!selectedRowKeys.has(row.rowKey)) return row;
      return {
        ...row,
        score: clampedBulk !== null ? clampedBulk : row.score,
        notes: bulkNotesValue.trim() !== '' ? bulkNotesValue.trim() : row.notes,
        isModified: true,
      };
    });

    const selectedTargetRows = updatedRows.filter((r) => selectedRowKeys.has(r.rowKey));
    const toSave = buildExamResultsFromRows(selectedTargetRows);

    if (toSave.length === 0) {
      setErrorMessage(
        tr(
          'يرجى إدخال درجة موحدة في الشريط العلوي أو في خانات الطلاب المحددين قبل الحفظ.',
          'Please enter a unified score in the bar above or in the selected student rows before saving.'
        )
      );
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');
      const saveFn = onSaveBatch || onSaveScores;
      if (saveFn) {
        await saveFn(toSave);
      } else {
        await saveBatchResults(toSave);
      }

      const savedRowKeys = new Set(selectedTargetRows.filter((r) => r.score.trim() !== '').map((r) => r.rowKey));
      setRows(
        updatedRows.map((r) =>
          savedRowKeys.has(r.rowKey)
            ? { ...r, isModified: false, isExisting: true }
            : r
        )
      );
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (error) {
      console.error('Error saving selected rows:', error);
      setErrorMessage(
        tr(
          'حدث خطأ أثناء حفظ درجات الطلاب المحددين.',
          'An error occurred while saving selected student scores.'
        )
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * حفظ أو تحديث مرفق إثبات المصداقية للصف فوراً
   */
  const handleSaveAttachmentForRow = async (
    targetRow: ScoreRowState,
    attachment: ResultAttachment | null
  ) => {
    // 1. تحديث فوري للحالة في الجدول
    setRows((prev) =>
      prev.map((r) =>
        r.rowKey === targetRow.rowKey
          ? { ...r, attachment, isModified: true }
          : r
      )
    );
    setAttachmentTargetRow(null);

    // 2. إذا كانت النتيجة مسجلة ولها معرف (resultId)، يتم الحفظ المباشر في قاعدة البيانات
    if (targetRow.resultId) {
      try {
        if (onUpdateResultAttachment) {
          await onUpdateResultAttachment(targetRow.resultId, attachment);
        }
      } catch (err) {
        console.error('Error saving attachment immediately for existing result:', err);
      }
    } else if (targetRow.score.trim() !== '' && exam) {
      // 3. إذا كان المعلم قد رصد درجة بالفعل ولكن لم يضغط حفظ الكل، ننشئ النتيجة فوراً متضمنة المرفق
      const numericScore = parseFloat(targetRow.score);
      if (!isNaN(numericScore)) {
        const clampedScore = Math.max(0, Math.min(exam.totalScore, numericScore));
        const percentage = Math.round((clampedScore / exam.totalScore) * 1000) / 10;
        const rating = getGradeRating(percentage, settings.gradingScale);
        const passed = clampedScore >= exam.passScore;

        const resultToSave: ExamResult = {
          id: targetRow.resultId || '',
          examId: exam.id,
          studentId: targetRow.studentId,
          studentDocId: targetRow.studentDocId,
          studentName: targetRow.studentName,
          examTitle: exam.title,
          examDate: exam.date,
          score: clampedScore,
          totalScore: exam.totalScore,
          percentage,
          gradeRating: rating.label,
          passed,
          notes: targetRow.notes,
          attachment: attachment || null,
          attemptNumber: targetRow.attemptNumber,
          attemptLabel: targetRow.attemptLabel,
          isImprovement: targetRow.isImprovement,
          previousScore: targetRow.previousScore,
          updatedAt: new Date().toISOString(),
        };

        try {
          const saveFn = onSaveBatch || onSaveScores;
          if (saveFn) {
            await saveFn([resultToSave]);
          } else {
            await saveBatchResults([resultToSave]);
          }
        } catch (err) {
          console.error('Error auto-saving result with attachment:', err);
        }
      }
    }
  };

  /*
   * حفظ النتائج مع دعم التعدد ومحاولات التحسين
   */
  const handleSave = async () => {
    try {
      setLoading(true);

      const toSave: ExamResult[] = [];

      for (const row of rows) {
        if (row.score.trim() === '') {
          continue;
        }

        const numericScore = parseFloat(
          row.score
        );

        if (isNaN(numericScore)) {
          continue;
        }

        const clampedScore = Math.max(
          0,
          Math.min(
            exam.totalScore,
            numericScore
          )
        );

        const percentage =
          Math.round(
            (clampedScore /
              exam.totalScore) *
              1000
          ) / 10;

        const rating = getGradeRating(
          percentage,
          settings.gradingScale
        );

        const passed =
          clampedScore >= exam.passScore;

        toSave.push({
          id: row.resultId || '',
          examId: exam.id,
          studentId: row.studentId,
          studentDocId: row.studentDocId,
          studentName: row.studentName,
          examTitle: exam.title,
          examDate: exam.date,
          score: clampedScore,
          totalScore: exam.totalScore,
          percentage,
          gradeRating: rating.label,
          passed,
          notes: row.notes,
          attachment: row.attachment || null,
          attemptNumber: row.attemptNumber,
          attemptLabel: row.attemptLabel,
          isImprovement: row.isImprovement,
          previousScore: row.previousScore,
          updatedAt: new Date().toISOString(),
        });
      }

      if (toSave.length === 0) {
        setErrorMessage(
          tr(
            'لم يتم إدخال أي درجات للحفظ. يرجى إدخال درجة واحدة على الأقل.',
            'No scores entered to save. Please enter at least one score.'
          )
        );
        return;
      }

      setErrorMessage('');

      // حفظ موحد إما عبر معالج الحفظ الممرر أو عبر saveBatchResults مباشرة
      const saveFn = onSaveBatch || onSaveScores;
      if (saveFn) {
        await saveFn(toSave);
      } else {
        await saveBatchResults(toSave);
      }

      // تحديث حالة الصفوف لتعيينها كبيانات محفوظة ومثبتة ومسح المسودة
      clearScoreEntryDraft(exam.id);
      setPendingDraft(null);
      setRows((prev) =>
        prev.map((r) => {
          if (r.score.trim() !== '') {
            return {
              ...r,
              isModified: false,
              isExisting: true,
            };
          }
          return r;
        })
      );

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3500);
    } catch (error) {
      console.error('Error saving batch scores in modal:', error);
      setErrorMessage(
        tr(
          'حدث خطأ أثناء حفظ النتائج. يرجى المحاولة مرة أخرى.',
          'An error occurred while saving results. Please try again.'
        )
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * تصدير نتائج الامتحان إلى Excel مع تفاصيل التحسين (يدعم المحددين أو الكل)
   */
  const handleExportExcel = () => {
    const sourceRows =
      selectedRowKeys.size > 0
        ? rows.filter((r) => selectedRowKeys.has(r.rowKey))
        : rows;

    const resultsForExport: ExamResult[] = [];
    const selectedStudentDocIds: string[] = [];

    for (const row of sourceRows) {
      if (selectedRowKeys.size > 0 && !selectedStudentDocIds.includes(row.studentDocId)) {
        selectedStudentDocIds.push(row.studentDocId);
      }
      if (row.score.trim() === '') {
        continue;
      }

      const numericScore = parseFloat(row.score);
      if (isNaN(numericScore)) continue;

      const clampedScore = Math.max(
        0,
        Math.min(exam.totalScore, numericScore)
      );

      const percentage =
        Math.round(
          (clampedScore / exam.totalScore) * 1000
        ) / 10;

      const rating = getGradeRating(
        percentage,
        settings.gradingScale
      );

      const passed = clampedScore >= exam.passScore;

      resultsForExport.push({
        id: row.resultId || 'tmp_' + row.rowKey,
        examId: exam.id,
        studentId: row.studentId,
        studentDocId: row.studentDocId,
        studentName: row.studentName,
        examTitle: exam.title,
        examDate: exam.date,
        score: clampedScore,
        totalScore: exam.totalScore,
        percentage,
        gradeRating: rating.label,
        passed,
        notes: row.notes,
        attemptNumber: row.attemptNumber,
        attemptLabel: row.attemptLabel,
        isImprovement: row.isImprovement,
        previousScore: row.previousScore,
        updatedAt: new Date().toISOString(),
      });
    }

    exportExamResultsExcel(
      exam,
      resultsForExport,
      students,
      selectedRowKeys.size > 0
        ? { studentIds: selectedStudentDocIds }
        : undefined
    );
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-hidden"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            requestSafeClose();
          }
        }}
      >
      <div
        id="score-entry-modal"
        dir={dir}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-5xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-start flex flex-col max-h-[92dvh] sm:max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl">
              <FileSpreadsheet className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">
                  {tr('رصد درجات الامتحان:', 'Exam Score Entry:')} {exam.title}
                </h3>

                {hasUnsavedChanges && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                    <History className="w-3 h-3" />
                    {tr(`مسودة غير محفوظة (${modifiedRowsCount})`, `Unsaved Draft (${modifiedRowsCount})`)}
                  </span>
                )}

                {exams && exams.length > 1 && onSelectExam && (
                  <div className="flex items-center gap-1.5 bg-indigo-50/80 dark:bg-indigo-950/60 px-2 py-1 rounded-xl border border-indigo-200 dark:border-indigo-800/80 max-w-full">
                    <span className="text-[11px] text-indigo-700 dark:text-indigo-300 font-bold shrink-0">
                      {tr('تغيير الامتحان:', 'Switch Exam:')}
                    </span>
                    <select
                      id="score-modal-exam-dropdown"
                      value={exam.id}
                      onChange={(e) => {
                        const chosen = exams.find((x) => x.id === e.target.value);
                        if (chosen) requestSafeSwitchExam(chosen);
                      }}
                      className="bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 rounded-lg px-2 py-1 border border-slate-200 dark:border-slate-700 focus:outline-hidden cursor-pointer max-w-[150px] sm:max-w-xs truncate"
                    >
                      {exams.map((ex) => (
                        <option key={ex.id} value={ex.id}>
                          {ex.title} ({ex.grade ? translateGrade(ex.grade, lang) : tr('عام', 'General')} - {translateSubject(ex.subject, lang)})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <span className="px-2.5 py-0.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg">
                  {translateGrade(exam.grade, lang)}
                </span>

                {exam.track && (
                  <span className={`px-2.5 py-0.5 text-xs font-bold rounded-lg border ${
                    exam.track === 'متقدم'
                      ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                      : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  }`}>
                    {tr(`مسار ${exam.track}`, `${translateTrack(exam.track, lang)} Track`)}
                  </span>
                )}

                {exam.term && (
                  <span className="px-2.5 py-0.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700">
                    {translateTerm(exam.term, lang)}
                  </span>
                )}

                <span className="px-2.5 py-0.5 text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 rounded-lg border border-amber-500/20">
                  {translateSubject(exam.subject, lang)}
                </span>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                <span>
                  {tr('الدرجة الكلية:', 'Total Score:')}{' '}
                  <strong className="text-slate-800 dark:text-slate-200 font-mono">
                    {exam.totalScore}
                  </strong>
                </span>
                <span>|</span>
                <span>
                  {tr('درجة النجاح:', 'Pass Score:')}{' '}
                  <strong className="text-emerald-600 dark:text-emerald-400 font-mono">
                    {exam.passScore}
                  </strong>
                </span>
                {exam.academicYear && (
                  <>
                    <span>|</span>
                    <span>
                      {tr('السنة:', 'Year:')}{' '}
                      <strong className="text-slate-700 dark:text-slate-300 font-mono">{exam.academicYear}</strong>
                    </span>
                  </>
                )}
                <span>|</span>
                <span>{tr('التاريخ:', 'Date:')} {exam.date}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 rounded-xl transition-all cursor-pointer whitespace-nowrap"
              title={tr('تصدير نتائج هذا الامتحان (الكل أو المحددين) إلى ملف Excel', 'Export this exam results (all or selected) to Excel')}
            >
              <FileSpreadsheet className="w-4 h-4" />
              {selectedRowKeys.size > 0
                ? tr(`تصدير المحددين Excel (${selectedRowKeys.size})`, `Export Selected Excel (${selectedRowKeys.size})`)
                : tr('تصدير Excel', 'Export Excel')}
            </button>

            <button
              type="button"
              onClick={requestSafeClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={tr('إغلاق', 'Close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats & Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700/60 text-xs">
          <div>
            <span className="text-slate-400 dark:text-slate-500 block">
              {tr('إجمالي الصفوف والنتائج:', 'Total Rows & Results:')}
            </span>

            <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
              {rows.length} {tr('نتيجة', 'results')}
            </span>
          </div>

          <div>
            <span className="text-slate-400 dark:text-slate-500 block">
              {tr('تم رصد درجاتهم:', 'Scores Entered:')}
            </span>

            <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">
              {totalEntered} {tr('من', 'of')} {rows.length}
            </span>
          </div>

          <div>
            <span className="text-slate-400 dark:text-slate-500 block">
              {tr('نسبة النجاح الحالية:', 'Current Pass Rate:')}
            </span>

            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
              {totalEntered > 0
                ? `${Math.round(
                    (passedCount /
                      totalEntered) *
                      100
                  )}%`
                : '0%'}
            </span>
          </div>

          <div className="flex items-center justify-end gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={handleSetFullScoreForAll}
              className="px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-lg cursor-pointer transition-colors"
              title={tr('رصد الدرجة الكاملة للكل', 'Set full score for all')}
            >
              {tr('درجة كاملة للكل', 'Full Score All')}
            </button>

            <button
              type="button"
              onClick={handleSetPassingScoreForEmpty}
              className="px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-lg cursor-pointer transition-colors"
              title={tr('رصد درجة النجاح لمن لم يرصد بعد', 'Set pass score for unrecorded')}
            >
              {tr('نجاح للمتبقي', 'Pass Empty')}
            </button>
          </div>
        </div>

        {/* Pending Draft Restore Banner */}
        {pendingDraft && (
          <div className="mt-3 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="font-bold text-amber-900 dark:text-amber-100">
                {tr(
                  `توجد مسودة تقدم محفوظة تلقائياً (${Object.keys(pendingDraft.rows).length} تعديل غير محفوظ)`,
                  `Auto-saved progress draft found (${Object.keys(pendingDraft.rows).length} unsaved edits)`
                )}
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
                {tr('تجاهل المسودة', 'Discard Draft')}
              </button>
            </div>
          </div>
        )}

        {/* Search & Improvement note */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder={tr('ابحث عن طالب بالاسم أو الرقم التعريفي...', 'Search student by name or ID...')}
              className="w-full ps-9 pe-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 dark:text-white text-start"
            />

            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-2.5 pointer-events-none" />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowAllStudents(!showAllStudents)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              {showAllStudents
                ? tr('← إظهار طلاب المادة والصف فقط', 'Show matching subject & grade only')
                : tr('عرض جميع الطلاب المسجلين', 'Show All Registered Students')}
            </button>

            <span className="text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800/50">
              {tr(
                '💡 يمكنك إضافة أكثر من درجة لنفس الامتحان إذا قام الطالب بالتحسين بالضغط على "+ تحسين"',
                '💡 You can add multiple scores for the same exam for improvement attempts via "+ Improve"'
              )}
            </span>
          </div>
        </div>

        {/* Multi-Selection Controls Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 p-2.5 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 me-1">
              <Users className="w-3.5 h-3.5 text-amber-500" />
              <span>{tr('تحديد الطلاب:', 'Select Students:')}</span>
            </span>

            <button
              type="button"
              onClick={handleSelectAllFiltered}
              disabled={filteredRows.length === 0}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] hover:border-amber-500 cursor-pointer disabled:opacity-40"
            >
              {tr(`تحديد الكل (${filteredRows.length})`, `Select All (${filteredRows.length})`)}
            </button>

            <button
              type="button"
              onClick={handleSelectUnrecordedFiltered}
              disabled={filteredRows.length === 0}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] hover:border-amber-500 cursor-pointer disabled:opacity-40"
            >
              {tr('تحديد غير المرصودين', 'Select Unrecorded')}
            </button>

            <div className="inline-flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-1.5 py-0.5">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">{tr('تحديد عدد:', 'Select count:')}</span>
              <input
                type="number"
                min={1}
                max={Math.max(1, filteredRows.length)}
                value={selectCountInput}
                onChange={(e) => setSelectCountInput(Math.max(1, Number(e.target.value) || 1))}
                className="w-12 px-1 py-0.5 text-center font-mono font-bold text-[11px] bg-slate-50 dark:bg-slate-800 rounded text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700"
              />
              <button
                type="button"
                onClick={() => handleSelectSpecificCount(selectCountInput)}
                disabled={filteredRows.length === 0}
                className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] cursor-pointer disabled:opacity-40"
              >
                {tr('تحديد', 'Select')}
              </button>
            </div>

            {selectedRowKeys.size > 0 && (
              <button
                type="button"
                onClick={handleClearSelection}
                className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold text-[11px] cursor-pointer hover:bg-rose-100"
              >
                {tr(`إلغاء التحديد (${selectedRowKeys.size})`, `Clear (${selectedRowKeys.size})`)}
              </button>
            )}
          </div>

          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 font-mono">
            {tr('المحدد:', 'Selected:')} <strong className="text-amber-600 dark:text-amber-400">{selectedRowKeys.size}</strong>
          </span>
        </div>

        {/* Bulk Score Entry Action Bar (visible when >= 1 selected) */}
        {selectedRowKeys.size > 0 && (
          <div className="mb-2.5 p-3 rounded-xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 flex flex-wrap items-center justify-between gap-2.5 text-xs animate-in fade-in duration-150">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-black text-amber-900 dark:text-amber-200">
                {tr(`رصد درجة مرة واحدة للمحددين (${selectedRowKeys.size}):`, `Batch Score for Selected (${selectedRowKeys.size}):`)}
              </span>

              <div className="inline-flex items-center gap-1">
                <input
                  type="number"
                  step="0.5"
                  min={0}
                  max={exam.totalScore}
                  value={bulkScoreValue}
                  onChange={(e) => setBulkScoreValue(e.target.value)}
                  placeholder={tr(`الدرجة / ${exam.totalScore}`, `Score / ${exam.totalScore}`)}
                  className="w-28 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 font-mono font-bold text-center text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setBulkScoreValue(String(exam.totalScore))}
                  className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 cursor-pointer hover:bg-emerald-50"
                >
                  {tr(`كاملة (${exam.totalScore})`, `Full (${exam.totalScore})`)}
                </button>
                <button
                  type="button"
                  onClick={() => setBulkScoreValue(String(exam.passScore))}
                  className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-amber-700 dark:text-amber-300 cursor-pointer hover:bg-amber-50"
                >
                  {tr(`نجاح (${exam.passScore})`, `Pass (${exam.passScore})`)}
                </button>
              </div>

              <input
                type="text"
                value={bulkNotesValue}
                onChange={(e) => setBulkNotesValue(e.target.value)}
                placeholder={tr('ملاحظة موحدة (اختياري)...', 'Unified note (optional)...')}
                className="w-44 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handleApplyScoreToSelected}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-amber-400 dark:border-amber-700 text-amber-800 dark:text-amber-200 font-bold text-[11px] cursor-pointer hover:bg-amber-100/70"
              >
                {tr('تعبئة للمحددين', 'Fill Selected')}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleSaveSelectedOnce}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{tr(`رصد وحفظ المحددين فوراً (${selectedRowKeys.size})`, `Save Selected Now (${selectedRowKeys.size})`)}</span>
              </button>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center justify-between animate-in fade-in mb-2">
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage('')}
              className="text-rose-500 hover:text-rose-700 font-bold px-2 py-0.5 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-2.5 w-10 text-center">
                  <button
                    type="button"
                    onClick={() =>
                      allFilteredSelected ? handleClearSelection() : handleSelectAllFiltered()
                    }
                    className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-amber-600 dark:text-amber-400 cursor-pointer inline-flex items-center justify-center"
                    title={allFilteredSelected ? tr('إلغاء تحديد الكل', 'Deselect All') : tr('تحديد الكل', 'Select All')}
                  >
                    {allFilteredSelected ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </th>
                <th className="py-2.5 px-2 w-9 text-center">#</th>
                <th className="py-2.5 px-3">{tr('اسم الطالب والمحاولة', 'Student & Attempt')}</th>
                <th className="py-2.5 px-3 w-24">{tr('الصف', 'Grade')}</th>
                <th className="py-2.5 px-3 w-32 text-center">
                  {tr('الدرجة', 'Score')}{' '}
                  <span className="text-slate-400 font-normal">
                    / {exam.totalScore}
                  </span>
                </th>
                <th className="py-2.5 px-3 w-20 text-center">{tr('النسبة %', 'Pct %')}</th>
                <th className="py-2.5 px-3 w-24 text-center">{tr('التقدير', 'Rating')}</th>
                <th className="py-2.5 px-3 w-20 text-center">{tr('الحالة', 'Status')}</th>
                <th className="py-2.5 px-3 min-w-[140px]">{tr('ملاحظات', 'Notes')}</th>
                <th className="py-2.5 px-3 w-24 text-center">{tr('المرفق', 'Proof')}</th>
                <th className="py-2.5 px-3 w-28 text-center">{tr('التحسين', 'Improve')}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="py-10 text-center text-slate-400 dark:text-slate-500"
                  >
                    {tr('لا يوجد طلاب مسجلون في مادة', 'No students enrolled in')}{' '}
                    <strong>{translateSubject(exam.subject, lang)}</strong>{' '}
                    {tr('ومطابقون للصف المحدد.', 'matching the selected grade.')}
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, index) => {
                  const scoreNum = parseFloat(row.score);
                  const isEntered = row.score.trim() !== '' && !isNaN(scoreNum);
                  const clamped = isEntered
                    ? Math.max(0, Math.min(exam.totalScore, scoreNum))
                    : 0;
                  const percent = isEntered
                    ? Math.round((clamped / exam.totalScore) * 1000) / 10
                    : 0;
                  const rating = isEntered
                    ? getGradeRating(percent, settings.gradingScale)
                    : null;
                  const isPassed = isEntered ? clamped >= exam.passScore : null;
                  const isInvalid = isEntered && scoreNum > exam.totalScore;

                  const isImprovement = row.attemptNumber > 1 || row.isImprovement;
                  const isRowSelected = selectedRowKeys.has(row.rowKey);

                  return (
                    <tr
                      key={row.rowKey}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                        isRowSelected
                          ? 'bg-amber-100/50 dark:bg-amber-900/25'
                          : isImprovement
                          ? 'bg-amber-50/40 dark:bg-amber-950/20 border-s-4 border-s-amber-500'
                          : row.isModified
                          ? 'bg-amber-500/10 dark:bg-amber-950/20'
                          : ''
                      }`}
                    >
                      <td className="py-2.5 px-2.5 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectRow(row.rowKey);
                          }}
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer inline-flex items-center justify-center"
                          title={isRowSelected ? tr('إلغاء تحديد الطالب', 'Deselect Student') : tr('تحديد الطالب', 'Select Student')}
                        >
                          {isRowSelected ? (
                            <CheckSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </td>

                      <td className="py-2.5 px-2 text-center text-slate-400 font-mono text-[11px]">
                        {index + 1}
                      </td>

                      {/* Student Name & Attempt details */}
                      <td className="py-2.5 px-3">
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-slate-900 dark:text-slate-50 text-sm">
                              {row.studentName}
                            </span>
                            <span className="text-[10px] text-slate-600 dark:text-slate-300 font-mono font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                              #{row.studentId}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 mt-0.5">
                            {isImprovement ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                                <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                                {tr(`تحسين (محاولة ${row.attemptNumber})`, `Improvement (Attempt ${row.attemptNumber})`)}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                                {tr('المحاولة الأساسية', 'Primary Attempt')}
                              </span>
                            )}

                            {row.previousScore !== undefined && (
                              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                                ({tr('الدرجة السابقة:', 'Prev:')} {row.previousScore})
                              </span>
                            )}

                            {isImprovement && isEntered && row.previousScore !== undefined && (
                              <span className={`text-[10px] font-mono font-bold ${
                                clamped > row.previousScore
                                  ? 'text-emerald-600'
                                  : clamped < row.previousScore
                                  ? 'text-rose-600'
                                  : 'text-slate-500'
                              }`}>
                                {clamped > row.previousScore ? `+${(clamped - row.previousScore).toFixed(1)} ↑` : `${(clamped - row.previousScore).toFixed(1)}`}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Grade */}
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 text-[11px]">
                        {row.grade !== '-' ? translateGrade(row.grade, lang) : '-'}
                      </td>

                      {/* Score Input */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="relative inline-block w-24">
                          <input
                            ref={(element) => {
                              inputRefs.current[row.rowKey] = element;
                            }}
                            type="number"
                            step="0.5"
                            min="0"
                            max={exam.totalScore}
                            value={row.score}
                            onChange={(event) =>
                              handleScoreChange(row.rowKey, event.target.value)
                            }
                            onKeyDown={(event) =>
                              handleKeyDown(event, index)
                            }
                            placeholder="-"
                            className={`w-full text-center py-1.5 px-2 rounded-xl font-bold font-mono text-sm border transition-all focus:outline-hidden focus:ring-2 ${
                              isInvalid
                                ? 'border-rose-400 bg-rose-50 text-rose-700 focus:ring-rose-400/30'
                                : isEntered
                                ? isPassed
                                  ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 focus:ring-emerald-500/30'
                                  : 'border-rose-300 dark:border-rose-800 bg-rose-50/60 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 focus:ring-rose-500/30'
                                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:ring-amber-500/30'
                            }`}
                          />
                        </div>
                      </td>

                      {/* Percentage */}
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                        {isEntered ? `${percent}%` : '-'}
                      </td>

                      {/* Rating */}
                      <td className="py-2.5 px-3 text-center">
                        {rating ? (
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md font-bold text-[11px] border ${rating.badgeBg}`}
                          >
                            {translateRating(rating.label)}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">
                            -
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 text-center">
                        {isPassed !== null ? (
                          <span
                            className={`inline-flex items-center gap-1 font-bold text-[11px] ${
                              isPassed
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {isPassed ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                {tr('ناجح', 'Passed')}
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-3.5 h-3.5" />
                                {tr('راسب', 'Failed')}
                              </>
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600">
                            -
                          </span>
                        )}
                      </td>

                      {/* Notes */}
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={row.notes}
                          onChange={(event) =>
                            handleNotesChange(row.rowKey, event.target.value)
                          }
                          placeholder={tr('ملاحظات فردية...', 'Individual notes...')}
                          className="w-full text-xs py-1 px-2 bg-transparent border-b border-transparent focus:border-slate-300 dark:focus:border-slate-600 focus:bg-slate-50 dark:focus:bg-slate-800 rounded transition-all text-start text-slate-800 dark:text-slate-200"
                        />
                      </td>

                      {/* Attachment / Proof */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center">
                          {row.attachment ? (
                            <div className="inline-flex items-center gap-1.5 bg-emerald-50/90 dark:bg-emerald-950/50 py-1 px-2 rounded-xl border border-emerald-300/90 dark:border-emerald-700/80 shadow-2xs">
                              <AttachmentThumbnail
                                attachment={row.attachment}
                                size="sm"
                                tooltipPrefix={`${tr('طالب:', 'Student:')} ${row.studentName}`}
                                onClick={() => setAttachmentTargetRow(row)}
                              />
                              <button
                                type="button"
                                onClick={() => setAttachmentTargetRow(row)}
                                className="text-[11px] font-extrabold text-emerald-800 dark:text-emerald-300 hover:underline cursor-pointer flex items-center gap-0.5"
                                title={tr('معاينة أو استبدال المرفق', 'Preview or replace attachment')}
                              >
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span>{tr('معتمد', 'Verified')}</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setAttachmentTargetRow(row)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-300/80 dark:border-amber-700/80 rounded-xl transition-all cursor-pointer shadow-2xs group"
                              title={tr('إرفاق ورقة الإجابة أو صورة إثبات المصداقية', 'Attach answer sheet or proof image')}
                            >
                              <Paperclip className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform text-amber-600 dark:text-amber-400" />
                              <span>{tr('إرفاق ورقة', 'Attach')}</span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Improvement & Actions */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleAddImprovementAttempt(row.studentDocId)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-300/80 dark:border-amber-700/80 rounded-lg transition-all cursor-pointer shadow-2xs"
                            title={tr('إضافة درجة تحسين جديدة لنفس الطالب لنفس الامتحان', 'Add new improvement score for this student')}
                          >
                            <Plus className="w-3 h-3" />
                            {tr('تحسين', 'Improve')}
                          </button>

                          {isImprovement && (
                            <button
                              type="button"
                              onClick={() => requestRemoveAttempt(row)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded cursor-pointer transition-colors"
                              title={tr('حذف محاولة التحسين', 'Delete Improvement Attempt')}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 mt-2 border-t border-slate-100 dark:border-slate-800 pb-safe shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {tr('عدد النتائج الجاهزة للحفظ:', 'Results ready to save:')}{' '}
              <strong className="text-slate-900 dark:text-white font-mono">
                {filledRows.length}
              </strong>
            </span>

            {saveSuccess && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in duration-300">
                <CheckCircle2 className="w-4 h-4" />
                {tr('تم حفظ الدرجات ومحاولات التحسين بنجاح!', 'Scores and improvement attempts saved successfully!')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={requestSafeClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              {tr('إغلاق', 'Close')}
            </button>

            <button
              id="save-scores-btn"
              type="button"
              disabled={loading}
              onClick={handleSave}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-slate-950 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-98 rounded-xl shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />

              {loading
                ? tr('جاري الحفظ الآمن...', 'Saving safely...')
                : tr('حفظ جميع الدرجات', 'Save All Scores')}
            </button>
          </div>
        </div>
      </div>

      </div>

      {/* Attachment Modal rendered outside backdrop to avoid closing ScoreEntryModal */}
      {attachmentTargetRow && exam && (
        <AttachmentModal
          isOpen={!!attachmentTargetRow}
          title={tr('إثبات ومرفق مصداقية النتيجة', 'Result Proof & Attachment')}
          subtitle={tr(
            `طالب: ${attachmentTargetRow.studentName} | امتحان: ${exam.title} | الدرجة: ${attachmentTargetRow.score || '-'}/${exam.totalScore}`,
            `Student: ${attachmentTargetRow.studentName} | Exam: ${exam.title} | Score: ${attachmentTargetRow.score || '-'}/${exam.totalScore}`
          )}
          attachment={attachmentTargetRow.attachment || null}
          onSave={(attachment) => handleSaveAttachmentForRow(attachmentTargetRow, attachment)}
          onClose={() => setAttachmentTargetRow(null)}
        />
      )}

      {/* Confirm Warning Dialog layered above ScoreEntryModal */}
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