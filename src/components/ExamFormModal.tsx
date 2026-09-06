import React, { useState, useEffect } from 'react';
import { X, FileSpreadsheet, Save, Calendar, Award, CheckSquare, Layers, BookOpen, Plus } from 'lucide-react';
import { Exam, ExamType, TeacherSettings } from '../types';
import { DEFAULT_SETTINGS, UAE_GRADES } from '../services/firebase';

interface ExamFormModalProps {
  isOpen: boolean;
  exam?: Exam | null; // If editing
  examToEdit?: Exam | null;
  settings?: TeacherSettings;
  onClose: () => void;
  onSave: (examData: Omit<Exam, 'id'>, examId?: string, openGrading?: boolean) => Promise<void>;
}

export const ExamFormModal: React.FC<ExamFormModalProps> = ({
  isOpen,
  exam,
  examToEdit,
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
  const [date, setDate] = useState('');
  const [totalScore, setTotalScore] = useState<number>(20);
  const [passScore, setPassScore] = useState<number>(12);
  const [type, setType] = useState<ExamType>('Quiz');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const gradeList = settings?.grades && settings.grades.length > 0 ? settings.grades : UAE_GRADES;

  useEffect(() => {
    if (activeExam) {
      setTitle(activeExam.title);
      const availableSubjects = settings?.subjects || [];
      if (availableSubjects.includes(activeExam.subject)) {
        setSubject(activeExam.subject);
        setIsCustomSubject(false);
        setCustomSubjectText('');
      } else {
        setSubject(activeExam.subject);
        setIsCustomSubject(true);
        setCustomSubjectText(activeExam.subject);
      }
      setGrade(activeExam.grade || gradeList[0]);
      setDate(activeExam.date);
      setTotalScore(activeExam.totalScore);
      setPassScore(activeExam.passScore);
      setType(activeExam.type);
      setNotes(activeExam.notes || '');
    } else {
      const today = new Date().toISOString().split('T')[0];
      setTitle('');
      setSubject(settings?.defaultSubject || settings?.subjects?.[0] || 'الفيزياء');
      setIsCustomSubject(false);
      setCustomSubjectText('');
      setGrade(gradeList[0] || 'الصف العاشر (Grade 10)');
      setDate(today);
      setTotalScore(20);
      setPassScore(12);
      setType('Quiz');
      setNotes('');
    }
    setError('');
  }, [activeExam, isOpen, settings]);

  // When total score changes, auto-suggest pass score (default 60%)
  const handleTotalScoreChange = (val: number) => {
    setTotalScore(val);
    const suggested = Math.round((val * (settings.passPercentage / 100)) * 10) / 10;
    setPassScore(suggested);
  };

  if (!isOpen) return null;

  const handleSubmit = async (openGradingImmediately = true) => {
    if (!title.trim()) {
      setError('يرجى كتابة اسم الامتحان أو الاختبار');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div 
        id="exam-form-modal"
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-100 dark:border-slate-800 my-8 text-right animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">
                {exam ? 'تعديل بيانات الامتحان' : 'تسجيل درجات امتحان جديد'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                حدد بيانات الامتحان والدرجة الكلية لبدء رصد درجات الطلاب يدوياً
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm rounded-xl">
            {error}
          </div>
        )}

        <div className="mt-5 space-y-4">
          {/* Exam Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              اسم أو عنوان الامتحان <span className="text-rose-500">*</span>
            </label>
            <input
              id="exam-title-input"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: اختبار شهر أكتوبر أو كويز قوانين نيوتن"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 dark:text-white transition-all text-right font-medium"
            />
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

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              إلغاء
            </button>

            <button
              id="save-exam-btn"
              type="button"
              disabled={loading}
              onClick={() => handleSubmit(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-slate-950 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-98 rounded-xl shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <CheckSquare className="w-4 h-4" />
              {loading ? 'جاري الحفظ...' : exam ? 'حفظ التعديلات' : 'حفظ وبدء رصد الدرجات يدوياً'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

