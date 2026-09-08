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
  Printer
} from 'lucide-react';
import { Student, Exam, ExamResult, TeacherSettings } from '../types';
import { calculateStudentStats } from '../utils/grading';
import { exportSingleStudentExcel, exportAllDataExcel, exportExamResultsExcel } from '../utils/excel';

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
  >('all_students');

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

  const gradeResults = useMemo(() => {
    const studentIds = new Set(gradeStudents.map(s => s.id));
    return dateFilteredResults.filter(r => studentIds.has(r.studentDocId));
  }, [dateFilteredResults, gradeStudents]);

  // Group reports
  const groupStudents = useMemo(() => {
    return students.filter(s => s.group === selectedGroup);
  }, [students, selectedGroup]);

  const groupResults = useMemo(() => {
    const studentIds = new Set(groupStudents.map(s => s.id));
    return dateFilteredResults.filter(r => studentIds.has(r.studentDocId));
  }, [dateFilteredResults, groupStudents]);

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
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            التقارير الأكاديمية والتحليلات
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            استخراج تقارير تفصيلية للطلاب والصفوف والامتحانات مع إمكانية المقارنة والتصدير
          </p>
        </div>

        {/* Global Print or Export */}
        <button
          onClick={() => exportAllDataExcel(students, exams, allResults, settings)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all cursor-pointer shadow-xs"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          تصدير التقرير الشامل (جميع الجداول)
        </button>
      </div>

      {/* Report Type Tabs & Date Filter */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 space-y-4">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
          <button
            onClick={() => setReportType('all_students')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              reportType === 'all_students'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            تقرير جميع الطلاب
          </button>
          <button
            onClick={() => setReportType('single_student')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              reportType === 'single_student'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            تقرير طالب معين
          </button>
          <button
            onClick={() => setReportType('single_exam')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              reportType === 'single_exam'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            تقرير امتحان معين
          </button>
          <button
            onClick={() => setReportType('by_grade')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              reportType === 'by_grade'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            تقرير حسب الصف الدراسي
          </button>
          <button
            onClick={() => setReportType('by_group')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              reportType === 'by_group'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200/60 dark:border-slate-700/60'
            }`}
          >
            تقرير حسب المجموعة
          </button>
          <button
            onClick={() => setReportType('exam_comparison')}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              reportType === 'exam_comparison'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200/60 dark:border-slate-700/60'
            }`}
          >
            مقارنة امتحانات
          </button>
        </div>

        {/* Filters bar: Date Range & Selector */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
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
                  <option key={s.id} value={s.id}>{s.name} ({s.studentId})</option>
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
              <span className="text-slate-600 dark:text-slate-300 font-bold">اختر المجموعة:</span>
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

      {/* 1. All Students Report */}
      {reportType === 'all_students' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-base">تقرير أداء جميع الطلاب</h3>
              <p className="text-xs text-slate-500">إحصائيات إجمالية ومعدلات كل طالب في النظام</p>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">#</th>
                  <th className="py-3 px-3">اسم الطالب</th>
                  <th className="py-3 px-3">الصف</th>
                  <th className="py-3 px-3">المجموعة</th>
                  <th className="py-3 px-3 text-center">الامتحانات</th>
                  <th className="py-3 px-3 text-center">متوسط %</th>
                  <th className="py-3 px-3 text-center">أعلى %</th>
                  <th className="py-3 px-3 text-center">نسبة النجاح</th>
                  <th className="py-3 px-3 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((st, i) => {
                  const res = dateFilteredResults.filter(r => r.studentDocId === st.id);
                  const stStats = calculateStudentStats(res, settings.gradingScale);
                  return (
                    <tr 
                      key={st.id} 
                      onClick={() => onOpenStudentProfile(st)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">{i + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{st.name}</td>
                      <td className="py-2.5 px-3 text-slate-600">{st.grade}</td>
                      <td className="py-2.5 px-3 text-slate-600">{st.group}</td>
                      <td className="py-2.5 px-3 text-center font-mono">{stStats.totalExams}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-indigo-600">{stStats.averagePercentage}%</td>
                      <td className="py-2.5 px-3 text-center font-mono text-emerald-600">{stStats.highestPercentage}%</td>
                      <td className="py-2.5 px-3 text-center font-mono">{stStats.passRate}%</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          stStats.status === 'ممتاز' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          stStats.status === 'جيد' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-rose-50 text-rose-700 border-rose-200'
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

      {/* 2. Single Student Report */}
      {reportType === 'single_student' && currentStudent && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-lg">
                تقرير الطالب: {currentStudent.name} ({currentStudent.studentId})
              </h3>
              <p className="text-xs text-slate-500">
                {currentStudent.grade} | {currentStudent.group} | {currentStudent.subject}
              </p>
            </div>
            <button
              onClick={() => exportSingleStudentExcel(currentStudent, currentStudentResults, currentStudentStats)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              تصدير تقرير الطالب إلى Excel
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
              <span className="text-[11px] text-slate-400 block">إجمالي الامتحانات</span>
              <span className="text-lg font-black text-slate-800 font-mono">{currentStudentStats.totalExams}</span>
            </div>
            <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-center">
              <span className="text-[11px] text-indigo-500 block">متوسط النسبة المئوية</span>
              <span className="text-lg font-black text-indigo-600 font-mono">{currentStudentStats.averagePercentage}%</span>
            </div>
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 text-center">
              <span className="text-[11px] text-emerald-600 block">نسبة النجاح</span>
              <span className="text-lg font-black text-emerald-700 font-mono">{currentStudentStats.passRate}%</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
              <span className="text-[11px] text-slate-400 block">الحالة العامة</span>
              <span className="text-sm font-bold text-slate-800 block mt-1">{currentStudentStats.status}</span>
            </div>
          </div>

          {/* Analytical Note */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
            <strong>المسار التحليلي: </strong>{currentStudentStats.trendMessage}
          </div>

          {/* Exam Results Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">الامتحان</th>
                  <th className="py-2.5 px-3">التاريخ</th>
                  <th className="py-2.5 px-3 text-center">الدرجة</th>
                  <th className="py-2.5 px-3 text-center">النسبة</th>
                  <th className="py-2.5 px-3 text-center">التقدير</th>
                  <th className="py-2.5 px-3 text-center">النتيجة</th>
                  <th className="py-2.5 px-3">الملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentStudentResults.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{r.examTitle}</td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">{r.examDate}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold">{r.score}/{r.totalScore}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-indigo-600">{r.percentage}%</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {r.gradeRating}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`text-[11px] font-bold ${r.passed ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {r.passed ? 'ناجح' : 'راسب'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">{r.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Single Exam Report */}
      {reportType === 'single_exam' && currentExam && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-lg">
                تقرير نتائج امتحان: {currentExam.title}
              </h3>
              <p className="text-xs text-slate-500">
                التاريخ: {currentExam.date} | الدرجة الكلية: {currentExam.totalScore} | درجة النجاح: {currentExam.passScore}
              </p>
            </div>
            <button
              onClick={() => exportExamResultsExcel(currentExam, currentExamResults, students)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              تصدير نتائج الامتحان إلى Excel
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">اسم الطالب</th>
                  <th className="py-2.5 px-3 text-center">الدرجة</th>
                  <th className="py-2.5 px-3 text-center">النسبة</th>
                  <th className="py-2.5 px-3 text-center">التقدير</th>
                  <th className="py-2.5 px-3 text-center">الحالة</th>
                  <th className="py-2.5 px-3">ملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentExamResults.map((r, i) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">{i + 1}</td>
                    <td className="py-2 px-3 font-semibold text-slate-900">{r.studentName}</td>
                    <td className="py-2 px-3 text-center font-mono font-bold">{r.score}/{r.totalScore}</td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-indigo-600">{r.percentage}%</td>
                    <td className="py-2 px-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {r.gradeRating}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={`text-[11px] font-bold ${r.passed ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {r.passed ? 'ناجح' : 'راسب'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-500">{r.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Grade & Group Reports */}
      {(reportType === 'by_grade' || reportType === 'by_group') && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-base">
              {reportType === 'by_grade' ? `تقرير طلاب صف: ${selectedGrade}` : `تقرير طلاب مجموعة: ${selectedGroup}`}
            </h3>
            <p className="text-xs text-slate-500">
              إجمالي الطلاب في هذا التصنيف: {reportType === 'by_grade' ? gradeStudents.length : groupStudents.length} طالب
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">اسم الطالب</th>
                  <th className="py-2.5 px-3">الرقم التعريفي</th>
                  <th className="py-2.5 px-3 text-center">عدد الامتحانات</th>
                  <th className="py-2.5 px-3 text-center">متوسط النسبة</th>
                  <th className="py-2.5 px-3 text-center">نسبة النجاح</th>
                  <th className="py-2.5 px-3 text-center">التقييم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(reportType === 'by_grade' ? gradeStudents : groupStudents).map((st) => {
                  const res = dateFilteredResults.filter(r => r.studentDocId === st.id);
                  const stStats = calculateStudentStats(res, settings.gradingScale);
                  return (
                    <tr 
                      key={st.id}
                      onClick={() => onOpenStudentProfile(st)}
                      className="hover:bg-slate-50 cursor-pointer"
                    >
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{st.name}</td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono">{st.studentId}</td>
                      <td className="py-2.5 px-3 text-center font-mono">{stStats.totalExams}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-indigo-600">{stStats.averagePercentage}%</td>
                      <td className="py-2.5 px-3 text-center font-mono">{stStats.passRate}%</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          stStats.status === 'ممتاز' ? 'bg-emerald-50 text-emerald-700' :
                          stStats.status === 'جيد' ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700'
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
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base">مقارنة نتائج امتحانين أو أكثر</h3>
            <p className="text-xs text-slate-500 mt-0.5">حدد الامتحانات التي ترغب في وضعها جنباً إلى جنب لمقارنة النتائج</p>
          </div>

          {/* Exam Selection Checkboxes */}
          <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            {exams.map(e => (
              <button
                key={e.id}
                type="button"
                onClick={() => toggleCompareExam(e.id)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                  compareExamIds.includes(e.id)
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
              >
                {e.title} ({e.date})
              </button>
            ))}
          </div>

          {/* Comparison Cards / Table */}
          {comparedExamsData.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              حدد امتحانين على الأقل من القائمة أعلاه للمقارنة بينهما.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {comparedExamsData.map(({ exam, attended, avg, passRate }) => (
                <div key={exam?.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <h4 className="font-bold text-slate-900 text-sm truncate">{exam?.title}</h4>
                  <p className="text-[11px] text-slate-400 font-mono">{exam?.date} | {exam?.grade}</p>

                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="p-2 bg-white rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 block">المتوسط العام</span>
                      <span className="font-black text-indigo-600 font-mono text-base">{avg}%</span>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 block">نسبة النجاح</span>
                      <span className="font-black text-emerald-600 font-mono text-base">{passRate}%</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 text-center">
                    الطلاب الحاضرين: <strong>{attended}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
