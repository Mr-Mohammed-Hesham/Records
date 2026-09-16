import React, { useState, useEffect, useMemo } from 'react';
import { X, FileSpreadsheet, Save, Calendar, Award, CheckSquare, Layers, BookOpen, Plus, Compass, AlertTriangle } from 'lucide-react';
import { Exam, ExamType, TeacherSettings } from '../types';
import { 
  DEFAULT_SETTINGS, 
  UAE_GRADES,
  ACADEMIC_YEARS,
  ACADEMIC_TERMS,
  ACADEMIC_TRACKS,
} from '../services/firebase';
import { ConfirmModal } from './ConfirmModal';

interface ExamFormModalProps {
  isOpen: boolean;
  exam?: Exam | null; // If editing
  examToEdit?: Exam | null;
  existingExams?: Exam[];
  settings?: TeacherSettings;
  onClose: () => void;
  onSave: (examData: Omit<Exam, 'id'>, examId?: string, openGrading?: boolean) => Promise<void>;
}

export const ExamFormModal: React.FC<ExamFormModalProps> = ({
  isOpen,
  exam,
  examToEdit,
  existingExams = [],
  settings = DEFAULT_SETTINGS,
  onClose,
  onSave,
}) => {
  const activeExam = exam || examToEdit;
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [isCustomSubject, setIsCustomSubject] = useState(false);
  const [customSubjectText, setCustomSubjectText] = useState('');
  const [grade, setGrade] = useState('');
  const [academicYear, setAcademicYear] = useState(ACADEMIC_YEARS[0] || '2025 - 2026');
  const [term, setTerm] = useState(ACADEMIC_TERMS[0] || 'الفصل الأول');
  const [track, setTrack] = useState(ACADEMIC_TRACKS[0] || 'عام');
  const [date, setDate] = useState('');
  const [totalScore, setTotalScore] = useState<number>(20);
  const [passScore, setPassScore] = useState<number>(12);
  const [type, setType] = useState<ExamType>('Quiz');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  // Snapshot for dirty check
  const [initialSnapshot, setInitialSnapshot] = useState({
    title: '',
    subject: '',
    isCustomSubject: false,
    customSubjectText: '',
    grade: '',
    academicYear: '',
    term: '',
    track: '',
    date: '',
    totalScore: 20,
    passScore: 12,
    type: 'Quiz' as ExamType,
    notes: '',
  });

  const configuredGrades =
    settings?.grades && settings.grades.length > 0
      ? settings.grades
      : UAE_GRADES;

  const baseGrades = configuredGrades.includes('أخرى')
    ? configuredGrades
    : [...configuredGrades, 'أخرى'];

  const gradeList =
    grade && !baseGrades.includes(grade)
      ? [grade, ...baseGrades]
      : baseGrades;

  useEffect(() => {
    if (activeExam) {
      const availableSubjects = settings?.subjects || [];
      const isCustom = !availableSubjects.includes(activeExam.subject);
      const sub = activeExam.subject;
      const gr = activeExam.grade || gradeList[0];
      const loadedYear = activeExam.academicYear || ACADEMIC_YEARS[0] || '2025 - 2026';
      const loadedTerm = activeExam.term || ACADEMIC_TERMS[0] || 'الفصل الأول';
      const loadedTrack = activeExam.track || ACADEMIC_TRACKS[0] || 'عام';

      setTitle(activeExam.title);
      setSubject(sub);
      setIsCustomSubject(isCustom);
      setCustomSubjectText(isCustom ? sub : '');
      setGrade(gr);
      setAcademicYear(loadedYear);
      setTerm(loadedTerm);
      setTrack(loadedTrack);
      setDate(activeExam.date);
      setTotalScore(activeExam.totalScore);
      setPassScore(activeExam.passScore);
      setType(activeExam.type);
      setNotes(activeExam.notes || '');

      setInitialSnapshot({
        title: activeExam.title || '',
        subject: sub,
        isCustomSubject: isCustom,
        customSubjectText: isCustom ? sub : '',
        grade: gr,
        academicYear: loadedYear,
        term: loadedTerm,
        track: loadedTrack,
        date: activeExam.date || '',
        totalScore: activeExam.totalScore,
        passScore: activeExam.passScore,
        type: activeExam.type,
        notes: activeExam.notes || '',
      });
    } else {
      const today = new Date().toISOString().split('T')[0];
      const initialSub = settings?.defaultSubject || settings?.subjects?.[0] || 'الفيزياء';
      const initialGr = gradeList[0] || 'الصف العاشر (Grade 10)';
      const defaultYear = ACADEMIC_YEARS[0] || '2025 - 2026';
      const defaultTerm = ACADEMIC_TERMS[0] || 'الفصل الأول';
      const defaultTrack = ACADEMIC_TRACKS[0] || 'عام';

      setTitle('');
      setSubject(initialSub);
      setIsCustomSubject(false);
      setCustomSubjectText('');
      setGrade(initialGr);
      setAcademicYear(defaultYear);
      setTerm(defaultTerm);
      setTrack(defaultTrack);
      setDate(today);
      setTotalScore(20);
      setPassScore(12);
      setType('Quiz');
      setNotes('');

      setInitialSnapshot({
        title: '',
        subject: initialSub,
        isCustomSubject: false,
        customSubjectText: '',
        grade: initialGr,
        academicYear: defaultYear,
        term: defaultTerm,
        track: defaultTrack,
        date: today,
        totalScore: 20,
        passScore: 12,
        type: 'Quiz',
        notes: '',
      });
    }
    setError('');
    setShowConfirmClose(false);
  }, [activeExam, isOpen, settings]);

  // Compute dirty status
  const isDirty = useMemo(() => {
    if (!isOpen) return false;
    if (title !== initialSnapshot.title) return true;
    if (subject !== initialSnapshot.subject) return true;
    if (isCustomSubject !== initialSnapshot.isCustomSubject) return true;
    if (customSubjectText !== initialSnapshot.customSubjectText) return true;
    if (grade !== initialSnapshot.grade) return true;
    if (academicYear !== initialSnapshot.academicYear) return true;
    if (term !== initialSnapshot.term) return true;
    if (track !== initialSnapshot.track) return true;
    if (date !== initialSnapshot.date) return true;
    if (totalScore !== initialSnapshot.totalScore) return true;
    if (passScore !== initialSnapshot.passScore) return true;
    if (type !== initialSnapshot.type) return true;
    if (notes !== initialSnapshot.notes) return true;
    return false;
  }, [
    isOpen,
    title,
    subject,
    isCustomSubject,
    customSubjectText,
    grade,
    academicYear,
    term,
    track,
    date,
    totalScore,
    passScore,
    type,
    notes,
    initialSnapshot,
  ]);

  // Before unload protection
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

  const handleRequestClose = () => {
    if (isDirty) {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  };

  const handleForceClose = () => {
    setShowConfirmClose(false);
    onClose();
  };

  // When total score changes, auto-suggest pass score (default 60%)
  const handleTotalScoreChange = (val: number) => {
    setTotalScore(val);
    const suggested = Math.round((val * (settings.passPercentage / 100)) * 10) / 10;
    setPassScore(suggested);
  };

  // Check if title already exists in another exam
  const duplicateExam = useMemo(() => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || !existingExams || existingExams.length === 0) return null;
    return (
      existingExams.find((e) => {
        // If editing an existing exam, skip itself
        const currentId = activeExam?.id;
        if (currentId && e.id === currentId) return false;
        return e.title.trim().toLowerCase() === trimmedTitle.toLowerCase();
      }) || null
    );
  }, [title, existingExams, activeExam]);

  if (!isOpen) return null;

  const handleSubmit = async (openGradingImmediately = true) => {
    if (!title.trim()) {
      setError('يرجى كتابة اسم الامتحان أو الاختبار');
      return;
    }

    if (duplicateExam) {
      setError(`اسم الامتحان "${title.trim()}" غير متاح؛ يوجد امتحان مسجل مسبقاً بهذا الاسم. يرجى اختيار اسم آخر.`);
      return;
    }

    const finalSubject = isCustomSubject ? customSubjectText.trim() : subject.trim();
    if (!finalSubject) {
      setError('يرجى تحديد أو كتابة مادة الامتحان');
      return;
    }

    if (totalScore <= 0) {
      setError('الدرجة الكلية يجب أن تكون أكبر من الصفر');
      return;
    }
    if (passScore > totalScore) {
      setError('درجة النجاح لا يمكن أن تتجاوز الدرجة الكلية');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await onSave(
        {
          title: title.trim(),
          subject: finalSubject,
          grade: grade.trim(),
          academicYear: academicYear.trim(),
          term: term.trim(),
          track: track.trim(),
          group: '', // Groups removed per user request
          date: date || new Date().toISOString().split('T')[0],
          totalScore: Number(totalScore),
          passScore: Number(passScore),
          type,
          notes: notes.trim(),
          createdAt: exam ? exam.createdAt : new Date().toISOString(),
        },
        exam ? exam.id : undefined,
        openGradingImmediately
      );
      onClose();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حفظ سجل الامتحان');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-hidden"
        onClick={handleRequestClose}
      >
        <div 
          id="exam-form-modal"
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-xl w-full flex flex-col max-h-[92dvh] sm:max-h-[90vh] shadow-2xl border border-slate-200 dark:border-slate-800 text-right overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        >
          <div className="shrink-0 p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg">
                    {exam ? 'تعديل بيانات الامتحان' : 'تسجيل درجات امتحان جديد'}
                  </h3>
                  {isDirty && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse">
                      تعديلات غير محفوظة
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  حدد بيانات الامتحان والدرجة الكلية لبدء رصد درجات الطلاب يدوياً
                </p>
              </div>
            </div>
            <button
              onClick={handleRequestClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        {error && (
          <div className="mx-4 sm:mx-6 mt-4 p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs sm:text-sm rounded-xl">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Exam Title */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                اسم أو عنوان الامتحان <span className="text-rose-500">*</span>
              </label>
              {duplicateExam && (
                <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  اسم غير متاح (مكرر)
                </span>
              )}
            </div>
            <input
              id="exam-title-input"
              type="text"
              required
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError('');
              }}
              placeholder="مثال: اختبار شهر أكتوبر أو كويز قوانين نيوتن"
              className={`w-full px-3.5 py-2.5 rounded-xl text-sm focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 transition-all text-right font-medium ${
                duplicateExam
                  ? 'bg-rose-50/50 dark:bg-rose-950/20 border-2 border-rose-500 focus:ring-rose-500/20 focus:border-rose-500 text-slate-900 dark:text-white'
                  : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 dark:text-white'
              }`}
            />

            {/* Duplicate exam warning box */}
            {duplicateExam && (
              <div className="mt-2 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/80 rounded-xl flex items-start gap-2.5 text-rose-800 dark:text-rose-200 animate-fadeIn">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <p className="font-extrabold text-rose-700 dark:text-rose-300">
                    هذا الاسم غير متاح لوجود امتحان سابق بنفس الاسم:
                  </p>
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">
                    يوجد امتحان مسجل مسبقاً بعنوان <strong className="underline">"{duplicateExam.title}"</strong> ({duplicateExam.grade} - {duplicateExam.subject} - تاريخ: {duplicateExam.date}).
                  </p>
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">
                    يرجى تغيير الاسم أو إضافة تمييز له (مثال: "اختبار شهر أكتوبر - نموذج أ").
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Subject (with manual add option) */}
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  المادة الدراسية <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomSubject(!isCustomSubject)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline"
                >
                  {isCustomSubject ? '← اختيار من المواد' : '+ كتابة مادة يدوياً'}
                </button>
              </div>

              {isCustomSubject ? (
                <input
                  id="exam-custom-subject-input"
                  type="text"
                  required
                  value={customSubjectText}
                  onChange={(e) => setCustomSubjectText(e.target.value)}
                  placeholder="اكتب اسم المادة يدوياً..."
                  className="w-full px-3.5 py-2.5 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl text-sm focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 dark:text-white transition-all text-right font-medium"
                  autoFocus
                />
              ) : (
                <select
                  id="exam-subject-select"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 dark:text-white transition-all text-right cursor-pointer"
                >
                  {settings.subjects.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Grade (UAE Grades 1 to 12) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                الصف الدراسي (منهج الإمارات) <span className="text-rose-500">*</span>
              </label>
              <select
                id="exam-grade-select"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 dark:text-white transition-all text-right cursor-pointer"
              >
                {gradeList.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* Academic Info Dropdowns: Academic Year, Term, and Track */}
            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-amber-500/5 dark:bg-amber-500/[0.03] p-3.5 rounded-2xl border border-amber-500/20">
              {/* Academic Year */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-500" />
                  <span>السنة الدراسية</span>
                </label>
                <select
                  id="exam-academic-year-select"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 dark:text-white transition-all text-right cursor-pointer"
                >
                  {ACADEMIC_YEARS.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              {/* Term (أول - ثاني - ثالث) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-500" />
                  <span>الفصل الدراسي</span>
                </label>
                <select
                  id="exam-term-select"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 dark:text-white transition-all text-right cursor-pointer"
                >
                  {ACADEMIC_TERMS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Track (عام - متقدم) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-amber-500" />
                  <span>المسار</span>
                </label>
                <select
                  id="exam-track-select"
                  value={track}
                  onChange={(e) => setTrack(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 dark:text-white transition-all text-right cursor-pointer"
                >
                  {ACADEMIC_TRACKS.map((tr) => (
                    <option key={tr} value={tr}>
                      {tr === 'عام' ? 'عام (General)' : tr === 'متقدم' ? 'متقدم (Advanced)' : tr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Exam Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                نوع الامتحان <span className="text-rose-500">*</span>
              </label>
              <select
                id="exam-type-select"
                value={type}
                onChange={(e) => setType(e.target.value as ExamType)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 dark:text-white transition-all text-right cursor-pointer font-medium"
              >
                {settings.examTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                تاريخ الامتحان <span className="text-rose-500">*</span>
              </label>
              <input
                id="exam-date-input"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 dark:text-white transition-all text-right"
              />
            </div>

            {/* Total Score & Pass Score */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  الدرجة الكلية <span className="text-rose-500">*</span>
                </label>
                <input
                  id="exam-total-score-input"
                  type="number"
                  min="1"
                  step="0.5"
                  required
                  value={totalScore}
                  onChange={(e) => handleTotalScoreChange(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-center font-bold font-mono focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 dark:text-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  درجة النجاح <span className="text-rose-500">*</span>
                </label>
                <input
                  id="exam-pass-score-input"
                  type="number"
                  min="0"
                  max={totalScore}
                  step="0.5"
                  required
                  value={passScore}
                  onChange={(e) => setPassScore(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-center font-bold font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              ملاحظات أو توصيف الامتحان (اختياري)
            </label>
            <textarea
              id="exam-notes-input"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: يغطي الوحدة الأولى والثانية..."
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 dark:text-white transition-all text-right"
            />
          </div>
        </div>

        {/* Action buttons footer */}
        <div className="shrink-0 p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm flex flex-wrap items-center justify-between gap-3 pb-safe">
          <button
            type="button"
            onClick={handleRequestClose}
            className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            إلغاء
          </button>

          <button
            id="save-exam-btn"
            type="button"
            disabled={loading || !!duplicateExam}
            onClick={() => handleSubmit(true)}
            title={duplicateExam ? 'اسم الامتحان مستخدم مسبقاً، يرجى تغييره' : ''}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-950 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-98 rounded-xl shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckSquare className="w-4 h-4" />
            {loading ? 'جاري الحفظ...' : exam ? 'حفظ التعديلات' : 'حفظ وبدء رصد الدرجات يدوياً'}
          </button>
        </div>
      </div>
    </div>

    {/* Unsaved changes confirmation dialog */}
    <ConfirmModal
      isOpen={showConfirmClose}
      title="تنبيه: تعديلات غير محفوظة"
      message={`هناك بيانات أو تعديلات تم إدخالها في امتحان "${title.trim() || 'بدون عنوان'}" ولم يتم حفظها بعد. هل أنت متأكد من رغبتك في إغلاق النموذج وتجاهل التعديلات؟`}
      confirmText="نعم، تجاهل التغييرات وأغلق"
      cancelText="الرجوع ومتابعة الحفظ"
      isDestructive={true}
      onConfirm={handleForceClose}
      onCancel={() => setShowConfirmClose(false)}
      onClose={() => setShowConfirmClose(false)}
    />
  </>
  );
};

