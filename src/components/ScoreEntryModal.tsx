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
} from 'lucide-react';
import { Student, Exam, ExamResult, TeacherSettings } from '../types';
import { getGradeRating } from '../utils/grading';
import { exportExamResultsExcel } from '../utils/excel';
import { DEFAULT_SETTINGS } from '../services/firebase';

interface ScoreEntryModalProps {
  isOpen: boolean;
  exam: Exam | null;
  students?: Student[];
  existingResults?: ExamResult[];
  settings?: TeacherSettings;
  onClose: () => void;
  onSaveBatch?: (
    results: Array<Omit<ExamResult, 'id'>>
  ) => Promise<void>;
  onSaveScores?: (
    results: Array<Omit<ExamResult, 'id'>>
  ) => Promise<void>;
}

interface ScoreRowState {
  studentDocId: string;
  studentId: string;
  studentName: string;
  grade: string;
  group: string;
  score: string;
  notes: string;
  isModified: boolean;
  isExisting: boolean;
}

export const ScoreEntryModal: React.FC<ScoreEntryModalProps> = ({
  isOpen,
  exam,
  students = [],
  existingResults = [],
  settings = DEFAULT_SETTINGS,
  onClose,
  onSaveBatch,
  onSaveScores,
}) => {
  const [rows, setRows] = useState<ScoreRowState[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllStudents, setShowAllStudents] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const inputRefs = useRef<{
    [key: string]: HTMLInputElement | null;
  }>({});

  /*
   * الحصول على مواد الطالب.
   *
   * الطلاب الجدد:
   * subjects: ['رياضيات', 'فيزياء']
   *
   * الطلاب القدامى:
   * subject: 'رياضيات'
   *
   * نحافظ على الاثنين لضمان التوافق مع البيانات القديمة.
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
     * تحديد الطلاب المؤهلين للامتحان:
     *
     * 1. نفس الصف.
     * 2. مسجل في مادة الامتحان.
     *
     * إذا كان الطالب قديمًا ولا توجد له مادة، نسمح له بالظهور
     * حتى لا نكسر البيانات القديمة.
     */
    const eligibleStudents = students.filter((student) => {
      const matchesGrade =
        !exam.grade || student.grade === exam.grade;

      const studentSubjects = getStudentSubjects(student);

      const hasNoSubjectData = studentSubjects.length === 0;

      const matchesSubject =
        hasNoSubjectData ||
        studentSubjects.includes(exam.subject);

      return matchesGrade && matchesSubject;
    });

    /*
     * زر عرض جميع الطلاب:
     * عند تفعيله نعرض كل الطلاب، كما كان النظام القديم.
     *
     * عند إيقافه نعرض فقط الطلاب المؤهلين للمادة والصف.
     */
    const relevantStudents = showAllStudents
      ? students
      : eligibleStudents;

    /*
     * خريطة النتائج الموجودة بالفعل لهذا الامتحان.
     *
     * الاعتماد على studentDocId + examId الموجودين في البيانات
     * يحافظ على استقلالية نتائج كل امتحان.
     */
    const resultMap = new Map<string, ExamResult>();

    existingResults.forEach((result) => {
      resultMap.set(result.studentDocId, result);
    });

    /*
     * إنشاء صفوف الطلاب.
     */
    const initialRows: ScoreRowState[] = relevantStudents.map(
      (student) => {
        const result = resultMap.get(student.id);

        return {
          studentDocId: student.id,
          studentId: student.studentId,
          studentName: student.name,
          grade: student.grade,
          group: student.group || '',
          score:
            result !== undefined
              ? String(result.score)
              : '',
          notes: result?.notes || '',
          isModified: false,
          isExisting: result !== undefined,
        };
      }
    );

    /*
     * نضيف أي طالب لديه نتيجة محفوظة لهذا الامتحان
     * حتى لو تغير صفه أو بياناته لاحقًا.
     *
     * هذا مهم جدًا حتى لا تختفي النتائج القديمة.
     */
    existingResults.forEach((result) => {
      if (
        !initialRows.find(
          (row) =>
            row.studentDocId === result.studentDocId
        )
      ) {
        const student = students.find(
          (studentItem) =>
            studentItem.id === result.studentDocId
        );

        initialRows.push({
          studentDocId: result.studentDocId,
          studentId: student
            ? student.studentId
            : '-',
          studentName: result.studentName,
          grade: student?.grade || '-',
          group: student?.group || '',
          score: String(result.score),
          notes: result.notes || '',
          isModified: false,
          isExisting: true,
        });
      }
    });

    /*
     * ترتيب الطلاب أبجديًا.
     */
    initialRows.sort((a, b) =>
      a.studentName.localeCompare(
        b.studentName,
        'ar'
      )
    );

    setRows(initialRows);
    setSearchTerm('');
    setSaveSuccess(false);
  }, [
    exam,
    isOpen,
    students,
    existingResults,
    showAllStudents,
  ]);

  if (!isOpen || !exam) return null;

  /*
   * تغيير الدرجة.
   */
  const handleScoreChange = (
    studentDocId: string,
    value: string
  ) => {
    setRows((previousRows) =>
      previousRows.map((row) => {
        if (row.studentDocId === studentDocId) {
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
   * تغيير الملاحظات.
   */
  const handleNotesChange = (
    studentDocId: string,
    value: string
  ) => {
    setRows((previousRows) =>
      previousRows.map((row) => {
        if (row.studentDocId === studentDocId) {
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
   * التنقل بين درجات الطلاب بالكيبورد.
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
        inputRefs.current[nextRow.studentDocId]
      ) {
        inputRefs.current[
          nextRow.studentDocId
        ]?.focus();

        inputRefs.current[
          nextRow.studentDocId
        ]?.select();
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();

      const previousRow =
        filteredRows[currentIndex - 1];

      if (
        previousRow &&
        inputRefs.current[
          previousRow.studentDocId
        ]
      ) {
        inputRefs.current[
          previousRow.studentDocId
        ]?.focus();

        inputRefs.current[
          previousRow.studentDocId
        ]?.select();
      }
    }
  };

  /*
   * إعطاء الدرجة الكاملة للجميع.
   */
  const handleSetFullScoreForAll = () => {
    if (
      !window.confirm(
        `هل أنت متأكد من رصد الدرجة النهائية (${exam.totalScore}) لجميع الطلاب في القائمة؟`
      )
    ) {
      return;
    }

    setRows((previousRows) =>
      previousRows.map((row) => ({
        ...row,
        score: String(exam.totalScore),
        isModified: true,
      }))
    );
  };

  /*
   * إعطاء درجة النجاح للطلاب الذين لم يتم رصد درجاتهم.
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
   * البحث.
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
   * الإحصائيات.
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
   * حفظ النتائج.
   */
  const handleSave = async () => {
    try {
      setLoading(true);

      const toSave: Array<
        Omit<ExamResult, 'id'>
      > = [];

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
          updatedAt:
            new Date().toISOString(),
        });
      }

      const saveFn =
        onSaveBatch || onSaveScores;

      if (saveFn) {
        await saveFn(toSave);
      }

      setSaveSuccess(true);

      setTimeout(() => {
        setSaveSuccess(false);
      }, 2500);
    } catch (error) {
      console.error(error);
      alert(
        'حدث خطأ أثناء حفظ النتائج'
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * تصدير نتائج الامتحان إلى Excel.
   */
  const handleExportExcel = () => {
    const resultsForExport: ExamResult[] =
      [];

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

      resultsForExport.push({
        id:
          'tmp_' +
          row.studentDocId,
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
        updatedAt:
          new Date().toISOString(),
      });
    }

    exportExamResultsExcel(
      exam,
      resultsForExport,
      students
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div
        id="score-entry-modal"
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-5xl w-full p-4 sm:p-6 shadow-2xl border border-slate-100 dark:border-slate-800 my-4 text-right flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
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
                  رصد درجات يدوياً: {exam.title}
                </h3>

                <span className="px-2.5 py-0.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg">
                  {exam.grade}
                </span>

                <span className="px-2.5 py-0.5 text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 rounded-lg border border-amber-500/20">
                  {exam.subject}
                </span>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                الدرجة الكلية:{' '}
                <strong className="text-slate-800 dark:text-slate-200 font-mono">
                  {exam.totalScore}
                </strong>{' '}
                | درجة النجاح:{' '}
                <strong className="text-emerald-600 dark:text-emerald-400 font-mono">
                  {exam.passScore}
                </strong>{' '}
                | التاريخ: {exam.date}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 rounded-xl transition-all cursor-pointer"
              title="تصدير نتائج هذا الامتحان إلى ملف Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              تصدير Excel
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700/60 text-xs">
          <div>
            <span className="text-slate-400 dark:text-slate-500 block">
              إجمالي الطلاب في الكشف:
            </span>

            <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
              {rows.length} طالب
            </span>
          </div>

          <div>
            <span className="text-slate-400 dark:text-slate-500 block">
              تم رصد درجاتهم:
            </span>

            <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">
              {totalEntered} من {rows.length}
            </span>
          </div>

          <div>
            <span className="text-slate-400 dark:text-slate-500 block">
              نسبة النجاح الحالية:
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
              onClick={
                handleSetFullScoreForAll
              }
              className="px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-lg cursor-pointer transition-colors"
              title="رصد الدرجة الكاملة للكل"
            >
              درجة كاملة للكل
            </button>

            <button
              type="button"
              onClick={
                handleSetPassingScoreForEmpty
              }
              className="px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-lg cursor-pointer transition-colors"
              title="رصد درجة النجاح لمن لم يرصد بعد"
            >
              نجاح للمتبقي
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(
                  event.target.value
                )
              }
              placeholder="ابحث عن طالب بالاسم أو الرقم التعريفي..."
              className="w-full pr-9 pl-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 dark:text-white text-right"
            />

            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
          </div>

          <button
            type="button"
            onClick={() =>
              setShowAllStudents(
                !showAllStudents
              )
            }
            className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            {showAllStudents
              ? '← إظهار طلاب المادة والصف فقط'
              : 'عرض جميع الطلاب المسجلين'}
          </button>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <ArrowDown className="w-3.5 h-3.5 text-amber-500" />
            اضغط Enter أو السهم للأسفل للتنقل الفوري للسطر التالي
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">
                  #
                </th>

                <th className="py-2.5 px-3">
                  اسم الطالب
                </th>

                <th className="py-2.5 px-3 w-28">
                  الصف
                </th>

                <th className="py-2.5 px-3 w-32 text-center">
                  الدرجة{' '}
                  <span className="text-slate-400 font-normal">
                    / {exam.totalScore}
                  </span>
                </th>

                <th className="py-2.5 px-3 w-20 text-center">
                  النسبة %
                </th>

                <th className="py-2.5 px-3 w-24 text-center">
                  التقدير
                </th>

                <th className="py-2.5 px-3 w-20 text-center">
                  الحالة
                </th>

                <th className="py-2.5 px-3 min-w-[140px]">
                  ملاحظات
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-10 text-center text-slate-400 dark:text-slate-500"
                  >
                    لا يوجد طلاب مسجلون في مادة{' '}
                    <strong>
                      {exam.subject}
                    </strong>{' '}
                    ومطابقون للصف المحدد.
                  </td>
                </tr>
              ) : (
                filteredRows.map(
                  (row, index) => {
                    const scoreNum =
                      parseFloat(row.score);

                    const isEntered =
                      row.score.trim() !== '' &&
                      !isNaN(scoreNum);

                    const clamped = isEntered
                      ? Math.max(
                          0,
                          Math.min(
                            exam.totalScore,
                            scoreNum
                          )
                        )
                      : 0;

                    const percent = isEntered
                      ? Math.round(
                          (clamped /
                            exam.totalScore) *
                            1000
                        ) / 10
                      : 0;

                    const rating = isEntered
                      ? getGradeRating(
                          percent,
                          settings.gradingScale
                        )
                      : null;

                    const isPassed =
                      isEntered
                        ? clamped >=
                          exam.passScore
                        : null;

                    const isInvalid =
                      isEntered &&
                      scoreNum >
                        exam.totalScore;

                    return (
                      <tr
                        key={
                          row.studentDocId
                        }
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                          row.isModified
                            ? 'bg-amber-500/10 dark:bg-amber-950/20'
                            : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                          {index + 1}
                        </td>

                        {/* Student */}
                        <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-1.5">
                            <span>
                              {
                                row.studentName
                              }
                            </span>

                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                              {row.studentId}
                            </span>
                          </div>
                        </td>

                        {/* Grade */}
                        <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 text-[11px]">
                          {row.grade}
                        </td>

                        {/* Score */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="relative inline-block w-24">
                            <input
                              ref={(element) => {
                                inputRefs.current[
                                  row.studentDocId
                                ] = element;
                              }}
                              type="number"
                              step="0.5"
                              min="0"
                              max={
                                exam.totalScore
                              }
                              value={row.score}
                              onChange={(
                                event
                              ) =>
                                handleScoreChange(
                                  row.studentDocId,
                                  event.target
                                    .value
                                )
                              }
                              onKeyDown={(
                                event
                              ) =>
                                handleKeyDown(
                                  event,
                                  index
                                )
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
                          {isEntered
                            ? `${percent}%`
                            : '-'}
                        </td>

                        {/* Rating */}
                        <td className="py-2.5 px-3 text-center">
                          {rating ? (
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md font-bold text-[11px] border ${rating.badgeBg}`}
                            >
                              {rating.label}
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
                                  ناجح
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  راسب
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
                              handleNotesChange(
                                row.studentDocId,
                                event.target.value
                              )
                            }
                            placeholder="ملاحظات فردية..."
                            className="w-full text-xs py-1 px-2 bg-transparent border-b border-transparent focus:border-slate-300 dark:focus:border-slate-600 focus:bg-slate-50 dark:focus:bg-slate-800 rounded transition-all text-right text-slate-800 dark:text-slate-200"
                          />
                        </td>
                      </tr>
                    );
                  }
                )
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 mt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              عدد النتائج الجاهزة للحفظ:{' '}
              <strong className="text-slate-900 dark:text-white font-mono">
                {filledRows.length}
              </strong>
            </span>

            {saveSuccess && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in duration-300">
                <CheckCircle2 className="w-4 h-4" />
                تم حفظ الدرجات بنجاح في قاعدة البيانات وملفات الطلاب!
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              إغلاق
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
                ? 'جاري الحفظ في Firestore...'
                : 'حفظ الدرجات للجميع'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};