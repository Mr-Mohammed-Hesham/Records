import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  FileSpreadsheet, 
  Calendar, 
  Users, 
  Award, 
  AlertTriangle, 
  ArrowLeftRight, 
  Filter, 
  CheckCircle2, 
  Clock,
  Printer,
  GraduationCap,
  TrendingUp,
  Download,
  Eye
} from 'lucide-react';
import { Student, Exam, ExamResult, TeacherSettings } from '../types';
import { calculateStudentStats } from '../utils/grading';
import { 
  exportSingleStudentAcademicReport, 
  exportCustomAcademicExcel, 
  exportAllDataExcel, 
  exportExamResultsExcel 
} from '../utils/excel';
import { ExcelExportModal } from './ExcelExportModal';
import { StudentAcademicReportModal } from './StudentAcademicReportModal';
import { AttachmentThumbnail } from './AttachmentThumbnail';
import { AttachmentModal } from './AttachmentModal';

interface ReportsViewProps {
  students: Student[];
  exams: Exam[];
  allResults: ExamResult[];
  settings: TeacherSettings;
  onOpenStudentProfile: (student: Student) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  students,
  exams,
  allResults,
  settings,
  onOpenStudentProfile,
}) => {
  const [reportType, setReportType] = useState<
    'all_students' | 'single_student' | 'single_exam' | 'by_grade' | 'by_group' | 'exam_comparison'
  >('single_student');

  // Modals state
  const [showExportModal, setShowExportModal] = useState(false);
  const [academicModalStudent, setAcademicModalStudent] = useState<Student | null>(null);
  const [previewAttachmentResult, setPreviewAttachmentResult] = useState<ExamResult | null>(null);

  // Selected student for single student report
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students?.[0]?.id || '');
  // Selected exam for single exam report
  const [selectedExamId, setSelectedExamId] = useState<string>(exams?.[0]?.id || '');
  // Selected grade & group
  const [selectedGrade, setSelectedGrade] = useState<string>(settings?.grades?.[0] || 'الأول الثانوي');
  const [selectedGroup, setSelectedGroup] = useState<string>(settings?.groups?.[0] || 'المجموعة A');

  // Multi-exam comparison selection (array of exam IDs)
  const [compareExamIds, setCompareExamIds] = useState<string[]>([]);

  // Date range filter
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Filtered results based on date range
  const dateFilteredResults = useMemo(() => {
    return allResults.filter(r => {
      if (startDate && r.examDate < startDate) return false;
      if (endDate && r.examDate > endDate) return false;
      return true;
    });
  }, [allResults, startDate, endDate]);

  // Selected student data
  const currentStudent = students.find(s => s.id === selectedStudentId);
  const currentStudentResults = useMemo(() => {
    return dateFilteredResults.filter(r => r.studentDocId === selectedStudentId);
  }, [dateFilteredResults, selectedStudentId]);

  const currentStudentStats = useMemo(() => {
    return calculateStudentStats(currentStudentResults, settings.gradingScale);
  }, [currentStudentResults, settings.gradingScale]);

  // Selected exam data
  const currentExam = exams.find(e => e.id === selectedExamId);
  const currentExamResults = useMemo(() => {
    return dateFilteredResults.filter(r => r.examId === selectedExamId);
  }, [dateFilteredResults, selectedExamId]);

  // Grade reports
  const gradeStudents = useMemo(() => {
    return students.filter(s => s.grade === selectedGrade);
  }, [students, selectedGrade]);

  // Group reports
  const groupStudents = useMemo(() => {
    return students.filter(s => s.group === selectedGroup);
  }, [students, selectedGroup]);

  // Exam comparison data
  const comparedExamsData = useMemo(() => {
    return compareExamIds.map(id => {
      const ex = exams.find(e => e.id === id);
      const res = dateFilteredResults.filter(r => r.examId === id);
      const attended = res.length;
      const avg = attended > 0 ? Math.round(res.reduce((a, b) => a + b.percentage, 0) / attended) : 0;
      const passed = res.filter(r => r.passed).length;
      const passRate = attended > 0 ? Math.round((passed / attended) * 100) : 0;
      return { exam: ex, res, attended, avg, passRate };
    }).filter(d => d.exam !== undefined);
  }, [compareExamIds, exams, dateFilteredResults]);

  const toggleCompareExam = (id: string) => {
    setCompareExamIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div id="reports-view" className="space-y-6 text-right">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-amber-500" />
            التقارير الأكاديمية وسجلات الدرجات
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            تقارير تفصيلية لكل طالب مع استخراج وتصدير ملفات Excel مخصصة حسب الصف أو المادة أو الفترة الزمنية
          </p>
        </div>

        {/* Global Export Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowExportModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-xl transition-all cursor-pointer shadow-md shadow-amber-500/20 active:scale-98"
          >
            <FileSpreadsheet className="w-4 h-4" />
            تصدير Excel مخصص (صف / مادة / فترة)
          </button>

          <button
            onClick={() => exportAllDataExcel(students, exams, allResults, settings)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            تصدير الكل
          </button>
        </div>
      </div>

      {/* Report Type Tabs & Filters Container */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <button
            onClick={() => setReportType('single_student')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              reportType === 'single_student'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80'
            }`}
          >
            تقرير طالب مخصص
          </button>
          <button
            onClick={() => setReportType('all_students')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              reportType === 'all_students'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80'
            }`}
          >
            تقرير جميع الطلاب
          </button>
          <button
            onClick={() => setReportType('single_exam')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              reportType === 'single_exam'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80'
            }`}
          >
            تقرير امتحان معين
          </button>
          <button
            onClick={() => setReportType('by_grade')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              reportType === 'by_grade'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80'
            }`}
          >
            تقرير حسب الصف الدراسي
          </button>
          <button
            onClick={() => setReportType('by_group')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              reportType === 'by_group'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80'
            }`}
          >
            تقرير حسب الشعبة
          </button>
          <button
            onClick={() => setReportType('exam_comparison')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              reportType === 'exam_comparison'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80'
            }`}
          >
            مقارنة امتحانات
          </button>
        </div>

        {/* Filters bar: Date Range & Selector */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-bold">
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              <span>فترة التقرير:</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs"
                placeholder="من"
              />
              <span className="text-slate-400">إلى</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs"
                placeholder="إلى"
              />
              {(startDate || endDate) && (
                <button
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline cursor-pointer font-bold"
                >
                  إعادة ضبط
                </button>
              )}
            </div>
          </div>

          {/* Conditional dropdown based on report type */}
          {reportType === 'single_student' && (
            <div className="flex items-center gap-2">
              <span className="text-slate-600 dark:text-slate-300 font-bold">اختر الطالب:</span>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-medium cursor-pointer"
              >
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.grade})</option>
                ))}
              </select>
            </div>
          )}

          {reportType === 'single_exam' && (
            <div className="flex items-center gap-2">
              <span className="text-slate-600 dark:text-slate-300 font-bold">اختر الامتحان:</span>
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-medium cursor-pointer"
              >
                {exams.map(e => (
                  <option key={e.id} value={e.id}>{e.title} ({e.date})</option>
                ))}
              </select>
            </div>
          )}

          {reportType === 'by_grade' && (
            <div className="flex items-center gap-2">
              <span className="text-slate-600 dark:text-slate-300 font-bold">اختر الصف:</span>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-medium cursor-pointer"
              >
                {settings.grades.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          )}

          {reportType === 'by_group' && (
            <div className="flex items-center gap-2">
              <span className="text-slate-600 dark:text-slate-300 font-bold">اختر الشعبة:</span>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-medium cursor-pointer"
              >
                {settings.groups.map(grp => (
                  <option key={grp} value={grp}>{grp}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* REPORT CONTENT SECTIONS */}

      {/* 1. Single Student Report (Strictly: Student Name, Grade, and Exam Specifications) */}
      {reportType === 'single_student' && currentStudent && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-6">
          
          {/* Header Card: Strictly Student Name & Grade */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider block mb-1">
                تقرير الطالب الأكاديمي
              </span>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                {currentStudent.name}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                الصف الدراسي: <strong className="text-slate-800 dark:text-slate-200">{currentStudent.grade}</strong>
                {currentStudent.subject && <span> • المادة: <strong className="text-slate-800 dark:text-slate-200">{currentStudent.subject}</strong></span>}
                {currentStudent.group && <span> • الشعبة: <strong className="text-slate-800 dark:text-slate-200">{currentStudent.group}</strong></span>}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setAcademicModalStudent(currentStudent)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer"
              >
                <Eye className="w-4 h-4 text-amber-500" />
                عرض التقرير الكامل والطباعة
              </button>

              <button
                onClick={() => exportSingleStudentAcademicReport(currentStudent, currentStudentResults, currentStudentStats)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 rounded-xl transition-all cursor-pointer shadow-xs"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                تصدير التقرير لـ Excel
              </button>
            </div>
          </div>

          {/* Quick Stats: Total Exams, Average, Pass Rate, Status */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-center">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">عدد الامتحانات</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">{currentStudentStats.totalExams}</span>
            </div>

            <div className="p-3.5 bg-amber-500/10 dark:bg-amber-500/15 rounded-2xl border border-amber-500/20 text-center">
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 block mb-1">المتوسط العام</span>
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">{currentStudentStats.averagePercentage}%</span>
            </div>

            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 text-center">
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 block mb-1">نسبة النجاح</span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{currentStudentStats.passRate}%</span>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-center">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">التقييم العام</span>
              <span className="text-base font-black text-slate-900 dark:text-white block mt-1">{currentStudentStats.status}</span>
            </div>
          </div>

          {/* Progress Notes */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            <div className="flex items-center gap-2 mb-1 font-bold text-slate-900 dark:text-white text-sm">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              <span>ملاحظات التقدم ومسار التطور:</span>
            </div>
            <p className="font-medium text-slate-600 dark:text-slate-300">
              {currentStudentStats.trendMessage}
            </p>
          </div>

          {/* Exam Results Table (Score of each exam individually) */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>درجة كل امتحان على حدة ({currentStudentResults.length} امتحان)</span>
            </h4>

            {currentStudentResults.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 text-xs">
                لا توجد امتحانات مسجلة لهذا الطالب خلال الفترة المحددة
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
                      <th className="py-3 px-3 text-center">إثبات ومرفق</th>
                      <th className="py-3 px-3.5">ملاحظات الامتحان</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {currentStudentResults.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-3.5 font-bold text-slate-900 dark:text-white">{r.examTitle}</td>
                        <td className="py-3 px-3 text-center text-slate-500 dark:text-slate-400 font-mono text-[11px]">{r.examDate}</td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-800 dark:text-slate-100">
                          {r.score} <span className="text-slate-400 dark:text-slate-500 font-normal">/ {r.totalScore}</span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-amber-600 dark:text-amber-400">{r.percentage}%</td>
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
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center">
                            <AttachmentThumbnail
                              attachment={r.attachment}
                              size="sm"
                              readOnly={true}
                              tooltipPrefix={`امتحان: ${r.examTitle}`}
                              onClick={() => setPreviewAttachmentResult(r)}
                            />
                          </div>
                        </td>
                        <td className="py-3 px-3.5 text-slate-500 dark:text-slate-400 text-[11px]">{r.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. All Students Report */}
      {reportType === 'all_students' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">تقرير أداء جميع الطلاب</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">إحصائيات إجمالية ومعدلات كل طالب في النظام</p>
            </div>

            <button
              onClick={() => setShowExportModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 rounded-xl transition-all cursor-pointer shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              تصدير تقرير شامل للطلاب (Excel)
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-700/80 rounded-2xl">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">#</th>
                  <th className="py-3 px-3">اسم الطالب</th>
                  <th className="py-3 px-3">الصف</th>
                  <th className="py-3 px-3">المجموعة</th>
                  <th className="py-3 px-3 text-center">الامتحانات</th>
                  <th className="py-3 px-3 text-center">المتوسط %</th>
                  <th className="py-3 px-3 text-center">أعلى %</th>
                  <th className="py-3 px-3 text-center">نسبة النجاح</th>
                  <th className="py-3 px-3 text-center">التقييم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {students.map((st, i) => {
                  const res = dateFilteredResults.filter(r => r.studentDocId === st.id);
                  const stStats = calculateStudentStats(res, settings.gradingScale);
                  return (
                    <tr 
                      key={st.id} 
                      onClick={() => onOpenStudentProfile(st)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">{i + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">{st.name}</td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{st.grade}</td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{st.group}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-700 dark:text-slate-200">{stStats.totalExams}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-600 dark:text-amber-400">{stStats.averagePercentage}%</td>
                      <td className="py-2.5 px-3 text-center font-mono text-emerald-600 dark:text-emerald-400">{stStats.highestPercentage}%</td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-700 dark:text-slate-200">{stStats.passRate}%</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          stStats.status === 'ممتاز' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' :
                          stStats.status === 'جيد' ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' :
                          'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                        }`}>
                          {stStats.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Single Exam Report */}
      {reportType === 'single_exam' && currentExam && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                تقرير نتائج امتحان: {currentExam.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                التاريخ: {currentExam.date} | الدرجة الكلية: {currentExam.totalScore} | درجة النجاح: {currentExam.passScore}
              </p>
            </div>
            <button
              onClick={() => exportExamResultsExcel(currentExam, currentExamResults, students)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 rounded-xl transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              تصدير نتائج الامتحان إلى Excel
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-700/80 rounded-2xl">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">اسم الطالب</th>
                  <th className="py-2.5 px-3 text-center">الدرجة</th>
                  <th className="py-2.5 px-3 text-center">النسبة</th>
                  <th className="py-2.5 px-3 text-center">التقدير</th>
                  <th className="py-2.5 px-3 text-center">الحالة</th>
                  <th className="py-2.5 px-3 text-center">مرفق / إثبات</th>
                  <th className="py-2.5 px-3">ملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {currentExamResults.map((r, i) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">{i + 1}</td>
                    <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">{r.studentName}</td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-slate-800 dark:text-slate-100">{r.score}/{r.totalScore}</td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-amber-600 dark:text-amber-400">{r.percentage}%</td>
                    <td className="py-2 px-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {r.gradeRating}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={`text-[11px] font-bold ${r.passed ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-400'}`}>
                        {r.passed ? 'ناجح' : 'راسب'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center">
                        <AttachmentThumbnail
                          attachment={r.attachment}
                          size="sm"
                          readOnly={true}
                          tooltipPrefix={`طالب: ${r.studentName}`}
                          onClick={() => setPreviewAttachmentResult(r)}
                        />
                      </div>
                    </td>
                    <td className="py-2 px-3 text-slate-500 dark:text-slate-400">{r.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Grade & Group Reports */}
      {(reportType === 'by_grade' || reportType === 'by_group') && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              {reportType === 'by_grade' ? `تقرير طلاب صف: ${selectedGrade}` : `تقرير طلاب شعبة: ${selectedGroup}`}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              إجمالي الطلاب في هذا التصنيف: {reportType === 'by_grade' ? gradeStudents.length : groupStudents.length} طالب
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-700/80 rounded-2xl">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-3">اسم الطالب</th>
                  <th className="py-2.5 px-3">الرقم التعريفي</th>
                  <th className="py-2.5 px-3 text-center">عدد الامتحانات</th>
                  <th className="py-2.5 px-3 text-center">متوسط النسبة</th>
                  <th className="py-2.5 px-3 text-center">نسبة النجاح</th>
                  <th className="py-2.5 px-3 text-center">التقييم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {(reportType === 'by_grade' ? gradeStudents : groupStudents).map((st) => {
                  const res = dateFilteredResults.filter(r => r.studentDocId === st.id);
                  const stStats = calculateStudentStats(res, settings.gradingScale);
                  return (
                    <tr 
                      key={st.id}
                      onClick={() => onOpenStudentProfile(st)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">{st.name}</td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-mono">{st.studentId}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-700 dark:text-slate-200">{stStats.totalExams}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-600 dark:text-amber-400">{stStats.averagePercentage}%</td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-700 dark:text-slate-200">{stStats.passRate}%</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          stStats.status === 'ممتاز' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' :
                          stStats.status === 'جيد' ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' : 
                          'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                        }`}>
                          {stStats.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Exam Comparison Tool */}
      {reportType === 'exam_comparison' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">مقارنة نتائج امتحانين أو أكثر</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">حدد الامتحانات التي ترغب في وضعها جنباً إلى جنب لمقارنة النتائج</p>
          </div>

          {/* Exam Selection Checkboxes */}
          <div className="flex flex-wrap gap-2 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
            {exams.map(e => (
              <button
                key={e.id}
                type="button"
                onClick={() => toggleCompareExam(e.id)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  compareExamIds.includes(e.id)
                    ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {e.title} ({e.date})
              </button>
            ))}
          </div>

          {/* Comparison Cards */}
          {comparedExamsData.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              حدد امتحانين على الأقل من القائمة أعلاه للمقارنة بينهما
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {comparedExamsData.map(({ exam, attended, avg, passRate }) => (
                <div key={exam?.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">{exam?.title}</h4>
                  <p className="text-[11px] text-slate-400 font-mono">{exam?.date} | {exam?.grade}</p>

                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block">المتوسط العام</span>
                      <span className="font-black text-amber-600 dark:text-amber-400 font-mono text-base">{avg}%</span>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block">نسبة النجاح</span>
                      <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono text-base">{passRate}%</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
                    الطلاب الحاضرين: <strong className="text-slate-800 dark:text-slate-200">{attended}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Excel Custom Filter Export Modal */}
      <ExcelExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        students={students}
        exams={exams}
        allResults={allResults}
        settings={settings}
      />

      {/* Student Academic Report Modal */}
      {academicModalStudent && (
        <StudentAcademicReportModal
          student={academicModalStudent}
          results={dateFilteredResults.filter(r => r.studentDocId === academicModalStudent.id)}
          settings={settings}
          onClose={() => setAcademicModalStudent(null)}
        />
      )}

      {/* Attachment Proof Quick Viewer Modal */}
      {previewAttachmentResult && (
        <AttachmentModal
          isOpen={true}
          title={`إثبات نتيجة امتحان: ${previewAttachmentResult.examTitle}`}
          subtitle={`الطالب: ${previewAttachmentResult.studentName} | الدرجة: ${previewAttachmentResult.score}/${previewAttachmentResult.totalScore}`}
          attachment={previewAttachmentResult.attachment}
          readOnly={true}
          onClose={() => setPreviewAttachmentResult(null)}
        />
      )}
    </div>
  );
};
