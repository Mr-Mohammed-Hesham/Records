import React, { useState } from 'react';
import { 
  ArrowRight, 
  User, 
  Phone, 
  BookOpen, 
  School, 
  Calendar, 
  Award, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  FileSpreadsheet, 
  Edit3, 
  Trash2, 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Clock,
  Sparkles,
  ChevronDown,
  GraduationCap,
  Eye,
  Paperclip,
  ShieldCheck
} from 'lucide-react';
import { Student, Exam, ExamResult, TeacherSettings, ResultAttachment } from '../types';
import { calculateStudentStats, getGradeRating } from '../utils/grading';
import { exportSingleStudentAcademicReport } from '../utils/excel';
import { StudentAcademicReportModal } from './StudentAcademicReportModal';
import { AttachmentModal } from './AttachmentModal';
import { AttachmentThumbnail } from './AttachmentThumbnail';

interface StudentProfileViewProps {
  student: Student;
  exams: Exam[];
  results: ExamResult[];
  settings: TeacherSettings;
  onBack: () => void;
  onEditStudent: (student: Student) => void;
  onDeleteResult: (resultId: string) => Promise<void>;
  onUpdateResult: (resultId: string, updatedScore: number, notes: string) => Promise<void>;
  onUpdateResultAttachment?: (resultId: string, attachment: ResultAttachment | null) => Promise<void>;
  onAddScoreForStudent: (student: Student) => void;
}

export const StudentProfileView: React.FC<StudentProfileViewProps> = ({
  student,
  exams,
  results,
  settings,
  onBack,
  onEditStudent,
  onDeleteResult,
  onUpdateResult,
  onUpdateResultAttachment,
  onAddScoreForStudent,
}) => {
  const [editingResultId, setEditingResultId] = useState<string | null>(null);
  const [editScoreVal, setEditScoreVal] = useState<string>('');
  const [editNotesVal, setEditNotesVal] = useState<string>('');
  const [showAcademicReportModal, setShowAcademicReportModal] = useState(false);
  const [activeAttachmentResult, setActiveAttachmentResult] = useState<ExamResult | null>(null);

  const stats = calculateStudentStats(results, settings.gradingScale);

  // Chronological results for chart
  const timelineResults = [...results].sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime());

  const handleStartEdit = (res: ExamResult) => {
    setEditingResultId(res.id);
    setEditScoreVal(String(res.score));
    setEditNotesVal(res.notes || '');
  };

  const handleSaveEdit = async (res: ExamResult) => {
    const num = parseFloat(editScoreVal);
    if (isNaN(num)) return;
    const clamped = Math.max(0, Math.min(res.totalScore, num));
    await onUpdateResult(res.id, clamped, editNotesVal);
    setEditingResultId(null);
  };

  const handleExportExcel = () => {
    exportSingleStudentAcademicReport(student, results, stats);
  };

  return (
    <div id="student-profile-view" className="space-y-6 text-right animate-in fade-in duration-200">
      {/* Top Bar with Back Button and Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer flex items-center gap-1 font-semibold text-sm"
          >
            <ArrowRight className="w-4 h-4" />
            العودة لقائمة الطلاب
          </button>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
          <span className="text-xs text-slate-400">ملف الطالب الشخصي</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowAcademicReportModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer shadow-xs"
          >
            <Eye className="w-4 h-4 text-amber-500" />
            التقرير الأكاديمي الشامل
          </button>

          <button
            id="export-student-excel-btn"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 rounded-xl transition-all cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            تصدير التقرير لـ Excel
          </button>

          <button
            onClick={() => onEditStudent(student)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            تعديل البيانات
          </button>
        </div>
      </div>

      {/* Basic Student Info Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {/* Avatar / Photo */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-600 text-white flex items-center justify-center text-xl font-black shadow-md shadow-indigo-500/20 shrink-0">
              {student.photoUrl ? (
                <img 
                  src={student.photoUrl} 
                  alt={student.name} 
                  className="w-full h-full object-cover rounded-2xl" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                student.name.charAt(0) || 'ط'
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-bold text-slate-900">{student.name}</h1>
                <span className="font-mono text-xs px-2.5 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded-lg border border-indigo-100">
                  {student.studentId}
                </span>
                <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                  stats.status === 'ممتاز'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : stats.status === 'جيد'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  مستوى الطالب: {stats.status}
                </span>
              </div>

              <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-3">
                <span>الصف: <strong className="text-slate-700">{student.grade}</strong></span>
                <span>•</span>
                <span>المجموعة: <strong className="text-slate-700">{student.group}</strong></span>
                <span>•</span>
                <span>المادة: <strong className="text-slate-700">{student.subject}</strong></span>
                {student.school && (
                  <>
                    <span>•</span>
                    <span>المدرسة: <strong className="text-slate-700">{student.school}</strong></span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-100 w-full md:w-auto">
            <div>
              <span className="text-slate-400 block mb-0.5">هاتف الطالب:</span>
              <span className="font-mono font-bold text-slate-800" dir="ltr">
                {student.phone || 'غير مسجل'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">هاتف ولي الأمر:</span>
              <span className="font-mono font-bold text-slate-800" dir="ltr">
                {student.parentPhone || 'غير مسجل'}
              </span>
            </div>
            {student.email && (
              <div className="sm:col-span-2">
                <span className="text-slate-400 block mb-0.5">البريد الإلكتروني:</span>
                <span className="font-mono text-slate-700" dir="ltr">
                  {student.email}
                </span>
              </div>
            )}
            <div className="sm:col-span-2 text-[11px] text-slate-400">
              تاريخ الإضافة: {student.createdAt ? new Date(student.createdAt).toLocaleDateString('ar-EG') : '-'}
            </div>
          </div>
        </div>

        {student.notes && (
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600 bg-amber-50/40 p-3 rounded-xl border border-amber-100">
            <strong className="text-amber-900 block mb-1">ملاحظات المدرس الخاصة:</strong>
            <p>{student.notes}</p>
          </div>
        )}
      </div>

      {/* Student Statistics Cards (إحصائيات الطالب) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Exams */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-xs text-slate-500 block mb-1">الامتحانات المسجلة</span>
          <span className="text-2xl font-black text-slate-900 font-mono">{stats.totalExams}</span>
          <span className="text-[11px] text-slate-400 block mt-0.5">امتحان مكتمل</span>
        </div>

        {/* Average Percentage */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-xs text-slate-500 block mb-1">متوسط الدرجات</span>
          <span className="text-2xl font-black text-indigo-600 font-mono">
            {stats.averagePercentage}%
          </span>
          <span className="text-[11px] text-slate-400 block mt-0.5">
            معدل {stats.averageScore} درجات
          </span>
        </div>

        {/* Highest Score */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-xs text-slate-500 block mb-1">أعلى درجة</span>
          <span className="text-2xl font-black text-emerald-600 font-mono">
            {stats.highestPercentage}%
          </span>
          <span className="text-[11px] text-emerald-700/70 block mt-0.5 font-mono">
            ({stats.highestScore} درجة)
          </span>
        </div>

        {/* Lowest Score */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-xs text-slate-500 block mb-1">أقل درجة</span>
          <span className="text-2xl font-black text-rose-600 font-mono">
            {stats.lowestPercentage}%
          </span>
          <span className="text-[11px] text-rose-700/70 block mt-0.5 font-mono">
            ({stats.lowestScore} درجة)
          </span>
        </div>

        {/* Latest Result */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-xs text-slate-500 block mb-1">آخر نتيجة</span>
          <span className="text-2xl font-black text-sky-600 font-mono">
            {stats.latestPercentage !== null ? `${stats.latestPercentage}%` : '-'}
          </span>
          <span className="text-[11px] text-slate-400 block mt-0.5 truncate" title={stats.latestExamTitle || ''}>
            {stats.latestExamTitle || 'لا يوجد'}
          </span>
        </div>

        {/* Pass Rate */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-xs text-slate-500 block mb-1">نسبة النجاح</span>
          <span className="text-2xl font-black text-emerald-700 font-mono">
            {stats.passRate}%
          </span>
          <span className="text-[11px] text-slate-400 block mt-0.5">في جميع الامتحانات</span>
        </div>
      </div>

      {/* Student Level Analysis & Progress Chart (تحليل مستوى الطالب) */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${
              stats.trend === 'improving' 
                ? 'bg-emerald-50 text-emerald-600' 
                : stats.trend === 'declining'
                ? 'bg-rose-50 text-rose-600'
                : 'bg-indigo-50 text-indigo-600'
            }`}>
              {stats.trend === 'improving' && <TrendingUp className="w-5 h-5" />}
              {stats.trend === 'declining' && <TrendingDown className="w-5 h-5" />}
              {stats.trend === 'steady' && <Minus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">تحليل مستوى الطالب ومسار التطور</h3>
              <p className="text-xs text-slate-500">متابعة درجات الطالب عبر الوقت وتحديد مؤشر التحسن</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">حالة المسار:</span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 ${
              stats.trend === 'improving'
                ? 'bg-emerald-100 text-emerald-800'
                : stats.trend === 'declining'
                ? 'bg-rose-100 text-rose-800'
                : 'bg-slate-100 text-slate-800'
            }`}>
              {stats.trend === 'improving' && '📈 في تحسن مستمر'}
              {stats.trend === 'declining' && '📉 يتراجع ويحتاج متابعة'}
              {stats.trend === 'steady' && '📊 مستوى ثابت'}
            </span>
          </div>
        </div>

        {/* Analytical Trajectory Message */}
        <div className={`mt-4 p-4 rounded-xl border text-xs sm:text-sm font-medium flex items-start gap-3 ${
          stats.trend === 'improving'
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
            : stats.trend === 'declining'
            ? 'bg-rose-50/70 border-rose-200 text-rose-950'
            : 'bg-indigo-50/70 border-indigo-200 text-indigo-950'
        }`}>
          <Sparkles className="w-5 h-5 shrink-0 mt-0.5 text-indigo-600" />
          <div>
            <span className="font-bold block mb-0.5">التقييم التحليلي لـ Mr. Mohamed Hesham:</span>
            <p className="leading-relaxed">{stats.trendMessage}</p>
          </div>
        </div>

        {/* Interactive Responsive Score Progression Visual Chart */}
        <div className="mt-6">
          <h4 className="text-xs font-bold text-slate-600 mb-3">رسم بياني لتطور نتائج الامتحانات عبر الزمن:</h4>
          {timelineResults.length === 0 ? (
            <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs">
              لم يتم رصد نتائج امتحانات لهذا الطالب حتى الآن لعرض الرسم البياني.
            </div>
          ) : (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 overflow-hidden">
              {/* Bars visualization */}
              <div className="relative w-full">
                {/* Reference Grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-12 pr-7 pl-1">
                  {[100, 75, 50, 25, 0].map((val) => (
                    <div key={val} className="w-full flex items-center gap-2">
                      <span className="text-[8px] font-mono text-slate-300 w-5 text-left shrink-0">
                        {val}%
                      </span>
                      <div className="flex-1 border-b border-dashed border-slate-200" />
                    </div>
                  ))}
                </div>

                <div className="relative z-10 h-44 flex items-end gap-2 sm:gap-3 pt-6 pb-2 pr-8 pl-1 overflow-x-auto overflow-y-hidden">
                  {timelineResults.map((r) => {
                    const heightPercent = Math.max(10, Math.min(100, r.percentage));
                    return (
                      <div key={r.id} className="flex-1 min-w-[46px] max-w-[70px] flex flex-col items-center h-full justify-end group relative shrink">
                        {/* Tooltip */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 z-20 bg-slate-900 text-white text-[10px] py-1 px-2.5 rounded-lg whitespace-nowrap pointer-events-none shadow-md">
                          <span className="font-bold">{r.examTitle}</span>: {r.score}/{r.totalScore} ({r.percentage}%)
                        </div>

                        <span className="text-[10px] font-mono font-bold text-slate-700 mb-1 leading-none shrink-0">
                          {r.percentage}%
                        </span>

                        {/* Bar */}
                        <div className="w-full flex-1 flex items-end justify-center min-h-0">
                          <div 
                            style={{ height: `${heightPercent}%` }}
                            className={`w-6 sm:w-7 max-w-[28px] sm:max-w-[34px] rounded-t-lg transition-all duration-300 ${
                              r.percentage >= 90
                                ? 'bg-emerald-500 hover:bg-emerald-600'
                                : r.percentage >= 80
                                ? 'bg-blue-500 hover:bg-blue-600'
                                : r.percentage >= 70
                                ? 'bg-amber-500 hover:bg-amber-600'
                                : r.percentage >= 60
                                ? 'bg-orange-500 hover:bg-orange-600'
                                : 'bg-rose-500 hover:bg-rose-600'
                            }`}
                          />
                        </div>

                        {/* Exam Title & Date Label */}
                        <div className="w-full text-center mt-1.5 pt-1 border-t border-slate-200 shrink-0">
                          <span className="text-[9px] text-slate-600 font-medium truncate block w-full text-center leading-tight" title={r.examTitle}>
                            {r.examTitle}
                          </span>
                          <span className="text-[8px] text-slate-400 font-mono block mt-0.5">
                            {r.examDate ? r.examDate.slice(5) : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chart Legend */}
              <div className="flex flex-wrap items-center justify-center gap-4 mt-4 pt-3 border-t border-slate-200 text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> ممتاز (90%+)</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> جيد جداً (80-89%)</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> جيد (70-79%)</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> مقبول (60-69%)</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> يحتاج تحسين (&lt;60%)</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Exam History Table (سجل الامتحانات) */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base">سجل الامتحانات والنتائج التفصيلي</h3>
            <p className="text-xs text-slate-500">جميع الامتحانات التي شارك بها الطالب مع إمكانية تعديل أو حذف أي نتيجة</p>
          </div>

          <button
            onClick={() => onAddScoreForStudent(student)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors cursor-pointer border border-indigo-200"
          >
            <Plus className="w-4 h-4" />
            رصد نتيجة امتحان جديد لهذا الطالب
          </button>
        </div>

        <div className="mt-4 overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3.5">اسم الامتحان</th>
                <th className="py-3 px-3.5">التاريخ</th>
                <th className="py-3 px-3.5 text-center">الدرجة</th>
                <th className="py-3 px-3.5 text-center">الدرجة الكلية</th>
                <th className="py-3 px-3.5 text-center">النسبة %</th>
                <th className="py-3 px-3.5 text-center">التقدير</th>
                <th className="py-3 px-3.5 text-center">الحالة</th>
                <th className="py-3 px-3 text-center">مرفق / إثبات</th>
                <th className="py-3 px-3.5">ملاحظات المدرس</th>
                <th className="py-3 px-3.5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    لم يتم تسجيل نتائج امتحانات لهذا الطالب بعد. اضغط "رصد نتيجة امتحان جديد" للإضافة.
                  </td>
                </tr>
              ) : (
                results.map((res) => {
                  const isEditing = editingResultId === res.id;
                  const rating = getGradeRating(res.percentage, settings.gradingScale);

                  return (
                    <tr key={res.id} className="hover:bg-slate-50 transition-colors">
                      {/* Exam Title */}
                      <td className="py-3 px-3.5 font-semibold text-slate-900">
                        {res.examTitle}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3.5 text-slate-500 font-mono text-[11px]">
                        {res.examDate}
                      </td>

                      {/* Score Obtained */}
                      <td className="py-3 px-3.5 text-center">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max={res.totalScore}
                            value={editScoreVal}
                            onChange={(e) => setEditScoreVal(e.target.value)}
                            className="w-16 px-1.5 py-1 border border-indigo-400 rounded text-center font-bold text-xs"
                          />
                        ) : (
                          <span className="font-bold text-slate-900 text-sm font-mono">
                            {res.score}
                          </span>
                        )}
                      </td>

                      {/* Total Score */}
                      <td className="py-3 px-3.5 text-center font-mono text-slate-500">
                        {res.totalScore}
                      </td>

                      {/* Percentage */}
                      <td className="py-3 px-3.5 text-center font-bold font-mono text-slate-800">
                        {res.percentage}%
                      </td>

                      {/* Rating */}
                      <td className="py-3 px-3.5 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-md font-bold text-[11px] border ${rating.badgeBg}`}>
                          {res.gradeRating}
                        </span>
                      </td>

                      {/* Pass/Fail */}
                      <td className="py-3 px-3.5 text-center">
                        <span className={`inline-flex items-center gap-1 font-bold text-[11px] ${
                          res.passed ? 'text-emerald-700' : 'text-rose-600'
                        }`}>
                          {res.passed ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" /> ناجح
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3.5 h-3.5" /> راسب
                            </>
                          )}
                        </span>
                      </td>

                      {/* Attachment Proof Thumbnail & Quick Preview */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center">
                          <AttachmentThumbnail
                            attachment={res.attachment}
                            size="sm"
                            tooltipPrefix={`امتحان: ${res.examTitle}`}
                            onClick={() => setActiveAttachmentResult(res)}
                            onAttach={() => setActiveAttachmentResult(res)}
                          />
                        </div>
                      </td>

                      {/* Notes */}
                      <td className="py-3 px-3.5 text-slate-600">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editNotesVal}
                            onChange={(e) => setEditNotesVal(e.target.value)}
                            placeholder="ملاحظات..."
                            className="w-full px-2 py-1 border border-slate-300 rounded text-xs text-right"
                          />
                        ) : (
                          res.notes || <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleSaveEdit(res)}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold cursor-pointer"
                              >
                                حفظ
                              </button>
                              <button
                                onClick={() => setEditingResultId(null)}
                                className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[11px] cursor-pointer"
                              >
                                إلغاء
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleStartEdit(res)}
                                className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                                title="تعديل النتيجة"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm(`هل أنت متأكد من حذف نتيجة امتحان "${res.examTitle}" لهذا الطالب؟`)) {
                                    onDeleteResult(res.id);
                                  }
                                }}
                                className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                title="حذف النتيجة"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
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
      </div>

      {showAcademicReportModal && (
        <StudentAcademicReportModal
          student={student}
          results={results}
          settings={settings}
          onClose={() => setShowAcademicReportModal(false)}
        />
      )}

      {activeAttachmentResult && (
        <AttachmentModal
          isOpen={!!activeAttachmentResult}
          title="إثبات ومرفق مصداقية الامتحان"
          subtitle={`طالب: ${student.name} | امتحان: ${activeAttachmentResult.examTitle} | الدرجة: ${activeAttachmentResult.score} من ${activeAttachmentResult.totalScore}`}
          attachment={activeAttachmentResult.attachment || null}
          onSave={async (attachment) => {
            if (onUpdateResultAttachment) {
              await onUpdateResultAttachment(activeAttachmentResult.id, attachment);
            }
            setActiveAttachmentResult(null);
          }}
          onClose={() => setActiveAttachmentResult(null)}
        />
      )}
    </div>
  );
};
