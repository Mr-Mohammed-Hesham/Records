import React, { useRef } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  Printer, 
  Award, 
  BookOpen, 
  Calendar, 
  CheckCircle2, 
  TrendingUp, 
  Sparkles,
  GraduationCap,
  Paperclip
} from 'lucide-react';
import { Student, ExamResult, TeacherSettings } from '../types';
import { calculateStudentStats } from '../utils/grading';
import { exportSingleStudentAcademicReport } from '../utils/excel';
import { AttachmentModal } from './AttachmentModal';
import { AttachmentThumbnail } from './AttachmentThumbnail';

interface StudentAcademicReportModalProps {
  student: Student;
  results: ExamResult[];
  settings: TeacherSettings;
  onClose: () => void;
}

export const StudentAcademicReportModal: React.FC<StudentAcademicReportModalProps> = ({
  student,
  results,
  settings,
  onClose,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [inspectAttachmentResult, setInspectAttachmentResult] = React.useState<ExamResult | null>(null);
  const stats = calculateStudentStats(results, settings.gradingScale);

  // Sorted exam results by date
  const sortedResults = [...results].sort(
    (a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime()
  );

  const handleExportExcel = () => {
    exportSingleStudentAcademicReport(student, sortedResults, stats);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-hidden print:p-0 print:bg-white"
      onClick={onClose}
    >
      <div
        id="student-academic-report-modal"
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-3xl w-full flex flex-col max-h-[92dvh] sm:max-h-[90vh] shadow-2xl border border-slate-200 dark:border-slate-800 text-right overflow-hidden animate-in fade-in zoom-in-95 duration-200 print:shadow-none print:border-none print:max-h-none print:w-full"
      >
        {/* Modal Header */}
        <div className="shrink-0 p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg">
                التقرير الأكاديمي للطالب
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                سجل الامتحانات ومؤشرات التقدم المعتمدة
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Printable Report Body */}
        <div ref={printRef} className="flex-1 overflow-y-auto p-4 sm:p-7 space-y-6">
          
          {/* Header Card: Strictly Student Name and Grade */}
          <div className="bg-gradient-to-l from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-slate-700/50 print:bg-white print:text-black print:border-b-2 print:border-black print:rounded-none print:p-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                  تقرير الأداء الأكاديمي
                </span>
                <h1 className="text-2xl font-black text-white print:text-black">
                  {student.name}
                </h1>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-300 print:text-slate-700">
                  <span className="bg-slate-800/80 print:bg-slate-100 px-3 py-1 rounded-lg border border-slate-700 print:border-slate-300 font-bold">
                    الصف الدراسي: {student.grade}
                  </span>
                  {student.subject && (
                    <span className="bg-slate-800/80 print:bg-slate-100 px-3 py-1 rounded-lg border border-slate-700 print:border-slate-300 font-bold">
                      المادة: {student.subject}
                    </span>
                  )}
                  {student.group && (
                    <span className="bg-slate-800/80 print:bg-slate-100 px-3 py-1 rounded-lg border border-slate-700 print:border-slate-300">
                      الشعبة: {student.group}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-left sm:text-right shrink-0 border-t sm:border-t-0 sm:border-r border-slate-700/80 sm:pr-5 pt-3 sm:pt-0">
                <span className="text-[11px] text-slate-400 block">سجلات الأستاذ</span>
                <span className="text-sm font-black text-amber-400 print:text-black">
                  Mr. Mohamed Hesham
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
            </div>
          </div>

          {/* Academic Overview Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-center">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                عدد الامتحانات
              </span>
              <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {stats.totalExams}
              </span>
            </div>

            <div className="bg-amber-500/10 dark:bg-amber-500/15 p-3.5 rounded-2xl border border-amber-500/20 text-center">
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 block mb-1">
                المتوسط العام
              </span>
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
                {stats.averagePercentage}%
              </span>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 text-center">
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 block mb-1">
                نسبة النجاح
              </span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {stats.passRate}%
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-center">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                التقييم العام
              </span>
              <span className="text-base font-black text-slate-900 dark:text-white block mt-1">
                {stats.status}
              </span>
            </div>
          </div>

          {/* Progress and Growth Notes */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            <div className="flex items-center gap-2 mb-1.5 font-bold text-slate-900 dark:text-white text-sm">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              <span>ملاحظات التقدم ومسار التطور الأكاديمي:</span>
            </div>
            <p className="font-medium text-slate-600 dark:text-slate-300">
              {stats.trendMessage}
            </p>
            {student.notes && (
              <p className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                <strong className="text-slate-700 dark:text-slate-300">ملاحظات خاصة: </strong>
                {student.notes}
              </p>
            )}
          </div>

          {/* Individual Exam Results Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <span>سجل درجات الامتحانات على حدة ({sortedResults.length} امتحان)</span>
              </h4>
            </div>

            {sortedResults.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 text-xs">
                لم يتم تسجيل أي درجات امتحانات لهذا الطالب حتى الآن
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-700/80 rounded-2xl">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-3 px-3.5">اسم الامتحان</th>
                      <th className="py-3 px-3 text-center">التاريخ</th>
                      <th className="py-3 px-3 text-center">الدرجة</th>
                      <th className="py-3 px-3 text-center">النسبة</th>
                      <th className="py-3 px-3 text-center">التقدير</th>
                      <th className="py-3 px-3 text-center">النتيجة</th>
                      <th className="py-3 px-3.5">ملاحظات الامتحان</th>
                      <th className="py-3 px-3 text-center print:hidden">إثبات ومصداقية</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {sortedResults.map((r) => (
                      <tr 
                        key={r.id} 
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="py-3 px-3.5 font-bold text-slate-900 dark:text-white">
                          {r.examTitle}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                          {r.examDate}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-800 dark:text-slate-100">
                          {r.score} <span className="text-slate-400 dark:text-slate-500 font-normal">/ {r.totalScore}</span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-amber-600 dark:text-amber-400">
                          {r.percentage}%
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {r.gradeRating}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.passed 
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50' 
                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50'
                          }`}>
                            {r.passed ? 'ناجح' : 'راسب'}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-slate-500 dark:text-slate-400 text-[11px]">
                          {r.notes || '-'}
                        </td>
                        <td className="py-3 px-3 text-center print:hidden">
                          <div className="flex items-center justify-center">
                            <AttachmentThumbnail
                              attachment={r.attachment}
                              size="sm"
                              readOnly={true}
                              tooltipPrefix={`امتحان: ${r.examTitle}`}
                              onClick={() => setInspectAttachmentResult(r)}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="shrink-0 p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm flex flex-wrap items-center justify-between gap-3 pb-safe print:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 rounded-xl transition-all cursor-pointer shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              تصدير التقرير لـ Excel
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              طباعة / حفظ PDF
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>

      {inspectAttachmentResult && (
        <AttachmentModal
          isOpen={!!inspectAttachmentResult}
          readOnly={true}
          title="معاينة إثبات ومرفق مصداقية الامتحان"
          subtitle={`طالب: ${student.name} | امتحان: ${inspectAttachmentResult.examTitle} | الدرجة: ${inspectAttachmentResult.score}/${inspectAttachmentResult.totalScore}`}
          attachment={inspectAttachmentResult.attachment || null}
          onClose={() => setInspectAttachmentResult(null)}
        />
      )}
    </div>
  );
};
