import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Plus, 
  Calendar, 
  Award, 
  Users, 
  CheckCircle2, 
  Edit3, 
  Trash2, 
  Search, 
  Filter, 
  BarChart2, 
  ChevronRight,
  BookOpen,
  Paperclip
} from 'lucide-react';
import { Exam, ExamResult, Student, TeacherSettings, ResultAttachment } from '../types';
import { exportExamResultsExcel } from '../utils/excel';
import { AttachmentModal } from './AttachmentModal';

interface ExamsViewProps {
  exams: Exam[];
  students: Student[];
  allResults: ExamResult[];
  settings: TeacherSettings;
  onAddExam: () => void;
  onEditExam: (exam: Exam) => void;
  onDeleteExam: (exam: Exam) => void;
  onOpenScoring: (exam: Exam) => void;
  onUpdateExamAttachment?: (examId: string, attachment: ResultAttachment | null) => Promise<void>;
}

export const ExamsView: React.FC<ExamsViewProps> = ({
  exams,
  students,
  allResults,
  settings,
  onAddExam,
  onEditExam,
  onDeleteExam,
  onOpenScoring,
  onUpdateExamAttachment,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState('الكل');
  const [typeFilter, setTypeFilter] = useState('الكل');
  const [attachmentExam, setAttachmentExam] = useState<Exam | null>(null);

  // Pre-calculate stats per exam
  const examStatsList = useMemo(() => {
    return exams.map(exam => {
      const results = allResults.filter(r => r.examId === exam.id);
      const attended = results.length;
      let totalScoreSum = 0;
      let passCount = 0;
      let highest = 0;

      results.forEach(r => {
        totalScoreSum += r.score;
        if (r.passed) passCount++;
        if (r.score > highest) highest = r.score;
      });

      const avgScore = attended > 0 ? Math.round((totalScoreSum / attended) * 10) / 10 : 0;
      const avgPercentage = exam.totalScore > 0 ? Math.round((avgScore / exam.totalScore) * 1000) / 10 : 0;
      const passRate = attended > 0 ? Math.round((passCount / attended) * 100) : 0;

      return {
        exam,
        results,
        attended,
        avgScore,
        avgPercentage,
        passRate,
        highest,
      };
    });
  }, [exams, allResults]);

  // Filter exams
  const filteredExams = useMemo(() => {
    return examStatsList.filter(({ exam }) => {
      const searchLower = searchTerm.toLowerCase();
      const matchSearch =
        exam.title.toLowerCase().includes(searchLower) ||
        exam.subject.toLowerCase().includes(searchLower);

      if (!matchSearch) return false;
      if (gradeFilter !== 'الكل' && exam.grade !== gradeFilter) return false;
      if (typeFilter !== 'الكل' && exam.type !== typeFilter) return false;

      return true;
    });
  }, [examStatsList, searchTerm, gradeFilter, typeFilter]);

  return (
    <div id="exams-view" className="space-y-5 text-right">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            سجلات درجات الامتحانات ({exams.length})
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            سجلات رصد درجات الطلاب يدوياً لكل امتحان ومتابعة متوسطات الدرجات وتصدير كشوف النتائج
          </p>
        </div>

        <button
          id="add-exam-main-btn"
          onClick={onAddExam}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-950 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-98 rounded-xl shadow-md shadow-amber-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          + تسجيل درجات امتحان جديد
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6 relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث باسم الامتحان أو المادة..."
              className="w-full pr-9 pl-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 dark:text-white transition-all text-right font-medium"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
          </div>

          <div className="md:col-span-3">
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden text-slate-900 dark:text-white text-right cursor-pointer"
            >
              <option value="الكل">كل الصفوف الدراسية</option>
              {(settings.grades || []).map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden text-slate-900 dark:text-white text-right cursor-pointer font-medium"
            >
              <option value="الكل">كل أنواع الامتحانات</option>
              {(settings.examTypes || []).map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Exams Grid / Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredExams.length === 0 ? (
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm text-slate-400">
            <FileSpreadsheet className="w-12 h-12 mx-auto text-amber-500/40 mb-3" />
            <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">لا توجد سجلات امتحانات مسجلة</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">ابدأ بتسجيل أول امتحان لتضع درجات الطلاب يدوياً وتتابع إحصائياتهم</p>
            <button
              onClick={onAddExam}
              className="mt-4 px-5 py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all cursor-pointer shadow-md shadow-amber-500/20"
            >
              تسجيل درجات امتحان الآن
            </button>
          </div>
        ) : (
          filteredExams.map(({ exam, results, attended, avgScore, avgPercentage, passRate, highest }) => (
            <div
              key={exam.id}
              className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-200/80 dark:border-slate-800 hover:border-amber-400/50 dark:hover:border-amber-500/30 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Card Top */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 rounded-lg border border-amber-500/20">
                        {exam.type}
                      </span>
                      <span className="px-2.5 py-0.5 text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg">
                        {exam.grade}
                      </span>
                    </div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white text-base mt-2">
                      {exam.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                      <span>المادة: <strong className="text-slate-700 dark:text-slate-300">{exam.subject}</strong></span>
                      <span>•</span>
                      <span className="font-mono">{exam.date}</span>
                    </p>
                  </div>

                  {/* Actions dropdown or buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setAttachmentExam(exam)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer relative ${
                        exam.attachment
                          ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                          : 'text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-slate-800'
                      }`}
                      title={
                        exam.attachment
                          ? `عرض الإثبات والمرفق المعتمد للامتحان (${exam.attachment.name})`
                          : 'إرفاق صورة أو ملف إثبات للامتحان (إيميل / نموذج الإجابة)'
                      }
                    >
                      <Paperclip className="w-4 h-4" />
                      {exam.attachment && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
                      )}
                    </button>
                    <button
                      onClick={() => onEditExam(exam)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      title="تعديل بيانات الامتحان"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`هل أنت متأكد من حذف سجل "${exam.title}" وجميع درجات الطلاب المسجلة له؟`)) {
                          onDeleteExam(exam);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
                      title="حذف الامتحان"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Exam Key Metrics */}
                <div className="grid grid-cols-4 gap-2 my-4 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700/60 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block">الدرجة الكلية</span>
                    <span className="font-mono font-black text-slate-800 dark:text-slate-100 text-sm">{exam.totalScore}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block">درجة النجاح</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">{exam.passScore}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block">رُصدت درجاتهم</span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-sm">{attended} طالب</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block">متوسط الدرجات</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                      {attended > 0 ? `${avgPercentage}%` : '-'}
                    </span>
                  </div>
                </div>

                {exam.notes && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 mb-3">
                    {exam.notes}
                  </p>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => exportExamResultsExcel(exam, results, students)}
                  disabled={attended === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                  title="تصدير كشف درجات هذا الامتحان إلى Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  تصدير كشف الدرجات (.xlsx)
                </button>

                <button
                  onClick={() => onOpenScoring(exam)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-98 rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  رصد الدرجات يدوياً ({attended})
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {attachmentExam && (
        <AttachmentModal
          isOpen={!!attachmentExam}
          title="مرفق وإثبات مصداقية الامتحان الرسمي"
          subtitle={`امتحان: ${attachmentExam.title} | المادة: ${attachmentExam.subject} | التاريخ: ${attachmentExam.date}`}
          attachment={attachmentExam.attachment || null}
          onSave={async (attachment) => {
            if (onUpdateExamAttachment) {
              await onUpdateExamAttachment(attachmentExam.id, attachment);
            }
            setAttachmentExam(null);
          }}
          onClose={() => setAttachmentExam(null)}
        />
      )}
    </div>
  );
};
