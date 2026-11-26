import React, { useRef, useState } from 'react';
import {
  X,
  FileSpreadsheet,
  Printer,
  Award,
  TrendingUp,
  GraduationCap,
  Smartphone,
  Monitor,
  BarChart3,
} from 'lucide-react';
import {
  Student,
  ExamResult,
  TeacherSettings,
  ExamStructure,
  StudentStructureProgress,
} from '../types';
import { calculateStudentStats } from '../utils/grading';
import {
  exportSingleStudentAcademicReport,
  exportSingleStudentStructuresReport,
  getSavedExcelPreferences,
  saveExcelPreferences,
} from '../utils/excel';
import { getEffectiveEnrollmentStatus, ENROLLMENT_STATUS_META } from '../utils/studentStatus';
import { DynamicGradesChart } from './DynamicGradesChart';
import { AttachmentModal } from './AttachmentModal';
import { AttachmentThumbnail } from './AttachmentThumbnail';
import { useLanguage, translateGrade, translateSubject } from '../utils/i18n';

interface StudentAcademicReportModalProps {
  student: Student;
  results: ExamResult[];
  settings: TeacherSettings;
  structures?: ExamStructure[];
  structureProgress?: StudentStructureProgress[];
  onClose: () => void;
}

export const StudentAcademicReportModal: React.FC<StudentAcademicReportModalProps> = ({
  student,
  results,
  settings,
  structures = [],
  structureProgress = [],
  onClose,
}) => {
  const { lang, dir, tr } = useLanguage();
  const printRef = useRef<HTMLDivElement>(null);
  const [inspectAttachmentResult, setInspectAttachmentResult] = useState<ExamResult | null>(null);
  const savedExcelPrefs = getSavedExcelPreferences();
  const [excelLayoutMode, setExcelLayoutMode] = useState<'mobile' | 'desktop'>(savedExcelPrefs.layoutMode);
  const [excelIncludeChart, setExcelIncludeChart] = useState<boolean>(savedExcelPrefs.includeChart);

  // Logo display toggle state (supports including or excluding logo in report)
  const [showLogo, setShowLogo] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('mh_report_show_logo');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const handleToggleLogo = () => {
    const nextVal = !showLogo;
    setShowLogo(nextVal);
    try {
      localStorage.setItem('mh_report_show_logo', String(nextVal));
    } catch {
      // ignore
    }
  };

  const stats = calculateStudentStats(results, settings.gradingScale);
  const enrollmentStatus = getEffectiveEnrollmentStatus(student);
  const statusMeta = ENROLLMENT_STATUS_META[enrollmentStatus];

  const formatAcademicStatus = (status: string) => {
    if (lang === 'ar') return status;
    if (status === 'ممتاز') return 'Excellent';
    if (status === 'جيد') return 'Good';
    if (status === 'يحتاج متابعة') return 'Needs Follow-up';
    return status;
  };

  // Sorted exam results by date
  const sortedResults = [...results].sort(
    (a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime()
  );

  const chartData = sortedResults.map((r) => ({
    id: r.id,
    name: r.examTitle,
    value: r.percentage,
    secondaryValue: `${r.score}/${r.totalScore}`,
    date: r.examDate,
    rating: r.gradeRating,
  }));

  const handleExportExcel = () => {
    saveExcelPreferences({
      layoutMode: excelLayoutMode,
      includeChart: excelIncludeChart,
      includeLogoHeader: showLogo,
    });
    exportSingleStudentAcademicReport(student, sortedResults, stats, {
      layoutMode: excelLayoutMode,
      includeChart: excelIncludeChart,
      includeLogoHeader: showLogo,
    });
  };

  const handleExportStructuresExcel = () => {
    saveExcelPreferences({
      layoutMode: excelLayoutMode,
      includeChart: excelIncludeChart,
      includeLogoHeader: showLogo,
    });
    exportSingleStudentStructuresReport(student, structureProgress, structures, {
      layoutMode: excelLayoutMode,
      includeChart: excelIncludeChart,
      includeLogoHeader: showLogo,
    });
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
        dir={dir}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-3xl w-full flex flex-col max-h-[92dvh] sm:max-h-[90vh] shadow-2xl border border-slate-200 dark:border-slate-800 text-start overflow-hidden animate-in fade-in zoom-in-95 duration-200 print:shadow-none print:border-none print:max-h-none print:w-full"
      >
        {/* Modal Header */}
        <div className="shrink-0 p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg">
                {tr('التقرير الأكاديمي للطالب', 'Student Academic Report')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {tr('سجل الامتحانات ومؤشرات التقدم المعتمدة', 'Approved exam records & progress indicators')}
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

          {/* Header Card: Strictly Student Name and Grade with Optional Official Logo */}
          <div className="bg-gradient-to-l from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-slate-700/50 print:bg-white print:text-black print:border-b-2 print:border-black print:rounded-none print:p-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {showLogo && (
                  <div className="shrink-0 w-20 h-14 sm:w-24 sm:h-16 rounded-xl overflow-hidden border border-amber-500/40 shadow-md bg-black/40 print:border-black">
                    <img
                      src={`${import.meta.env.BASE_URL}teacher-logo.jpg`}
                      alt={tr('شعار الهوية', 'Teacher Logo')}
                      className="w-full h-full object-cover"
                      crossOrigin="anonymous"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (!target.src.endsWith('/teacher-logo.jpg')) {
                          target.src = '/teacher-logo.jpg';
                        }
                      }}
                    />
                  </div>
                )}
                <div>
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                    {tr('تقرير الأداء الأكاديمي', 'Academic Performance Report')}
                  </span>
                  <h1 className="text-2xl font-black text-white print:text-black">
                    {student.name}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-300 print:text-slate-700">
                    <span className="bg-slate-800/80 print:bg-slate-100 px-3 py-1 rounded-lg border border-slate-700 print:border-slate-300 font-bold">
                      {tr('الصف الدراسي:', 'Grade:')} {translateGrade(student.grade, lang)}
                    </span>
                    <span className="bg-amber-500/20 text-amber-300 print:bg-slate-100 print:text-black px-3 py-1 rounded-lg border border-amber-500/40 font-bold">
                      {tr('حالة الملف:', 'File Status:')} {lang === 'en' ? statusMeta.labelEn : statusMeta.label}
                    </span>
                    {student.subject && (
                      <span className="bg-slate-800/80 print:bg-slate-100 px-3 py-1 rounded-lg border border-slate-700 print:border-slate-300 font-bold">
                        {tr('المادة:', 'Subject:')} {translateSubject(student.subject, lang)}
                      </span>
                    )}
                    {student.group && (
                      <span className="bg-slate-800/80 print:bg-slate-100 px-3 py-1 rounded-lg border border-slate-700 print:border-slate-300">
                        {tr('الشعبة:', 'Section:')} {student.group}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-end sm:text-start shrink-0 border-t sm:border-t-0 sm:border-s border-slate-700/80 sm:ps-5 pt-3 sm:pt-0">
                <span className="text-[11px] text-slate-400 block">{tr('سجلات الأستاذ', 'Educator Records')}</span>
                <span className="text-sm font-black text-amber-400 print:text-black">
                  Mr. Mohamed Hesham
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
            </div>
          </div>

          {/* Academic Overview Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-center">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                {tr('عدد الامتحانات', 'Exams Count')}
              </span>
              <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {stats.totalExams}
              </span>
            </div>

            <div className="bg-amber-500/10 dark:bg-amber-500/15 p-3.5 rounded-2xl border border-amber-500/20 text-center">
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 block mb-1">
                {tr('المتوسط العام', 'Overall Average')}
              </span>
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
                {stats.averagePercentage}%
              </span>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 text-center">
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 block mb-1">
                {tr('نسبة النجاح', 'Pass Rate')}
              </span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {stats.passRate}%
              </span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-center">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                {tr('التقييم العام', 'Overall Rating')}
              </span>
              <span className="text-base font-black text-slate-900 dark:text-white block mt-1">
                {formatAcademicStatus(stats.status)}
              </span>
            </div>
          </div>

          {/* Progress and Growth Notes */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            <div className="flex items-center gap-2 mb-1.5 font-bold text-slate-900 dark:text-white text-sm">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              <span>{tr('ملاحظات التقدم ومسار التطور الأكاديمي:', 'Academic Progress & Trajectory Notes:')}</span>
            </div>
            <p className="font-medium text-slate-600 dark:text-slate-300">
              {stats.trendMessage}
            </p>
            {student.notes && (
              <p className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                <strong className="text-slate-700 dark:text-slate-300">{tr('ملاحظات خاصة:', 'Private Notes:')} </strong>
                {student.notes}
              </p>
            )}
          </div>

          {/* Interactive Chart Switcher in Modal */}
          {chartData.length > 0 && (
            <DynamicGradesChart
              data={chartData}
              mode="percentage"
              storageKey="mh_academic_modal_chart_type_v1"
              title={tr('الرسم البياني لتطور درجات الطالب وتوزيع التقديرات', 'Student Score Progression & Grade Distribution Chart')}
              subtitle={tr('يمكنك التبديل بين الأعمدة أو الدائرة أو المنحنى أو الشكل الشبكي', 'Switch between bar, pie, area, or radar chart views')}
              height={240}
            />
          )}

          {/* Individual Exam Results Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <span>
                  {tr(
                    `سجل درجات الامتحانات على حدة (${sortedResults.length} امتحان)`,
                    `Individual Exam Results (${sortedResults.length})`
                  )}
                </span>
              </h4>
            </div>

            {sortedResults.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 text-xs">
                {tr('لم يتم تسجيل أي درجات امتحانات لهذا الطالب حتى الآن', 'No exam scores recorded for this student yet')}
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-700/80 rounded-2xl">
                <table className="w-full text-start text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-3 px-3.5">{tr('اسم الامتحان', 'Exam Title')}</th>
                      <th className="py-3 px-3 text-center">{tr('التاريخ', 'Date')}</th>
                      <th className="py-3 px-3 text-center">{tr('الدرجة', 'Score')}</th>
                      <th className="py-3 px-3 text-center">{tr('النسبة', 'Percentage')}</th>
                      <th className="py-3 px-3 text-center">{tr('التقدير', 'Grade')}</th>
                      <th className="py-3 px-3 text-center">{tr('النتيجة', 'Result')}</th>
                      <th className="py-3 px-3.5">{tr('ملاحظات الامتحان', 'Exam Notes')}</th>
                      <th className="py-3 px-3 text-center print:hidden">{tr('إثبات ومصداقية', 'Proof')}</th>
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
                            {r.passed ? tr('ناجح', 'Passed') : tr('راسب', 'Failed')}
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
                              tooltipPrefix={`${tr('امتحان:', 'Exam:')} ${r.examTitle}`}
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
        <div className="shrink-0 p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-safe print:hidden">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 rounded-xl transition-all cursor-pointer shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              {tr('تصدير التقرير لـ Excel (مع الرسم البياني)', 'Export Excel Report (with Chart)')}
            </button>

            {structureProgress.length > 0 && (
              <button
                type="button"
                onClick={handleExportStructuresExcel}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-indigo-800 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 rounded-xl transition-all cursor-pointer shadow-xs"
              >
                <FileSpreadsheet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                {tr('تصدير الهياكل (Excel)', 'Export Structures (Excel)')}
              </button>
            )}

            {/* Quick Excel Mobile / Desktop & Chart Toggles */}
            <div className="inline-flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px]">
              <button
                type="button"
                onClick={() => setExcelLayoutMode('mobile')}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg font-bold cursor-pointer transition-colors ${
                  excelLayoutMode === 'mobile'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title={tr('مقاس متناسق مع شاشة الهاتف', 'Compact mobile-friendly layout')}
              >
                <Smartphone className="w-3 h-3" />
                <span>{tr('وضع الهاتف', 'Mobile')}</span>
              </button>
              <button
                type="button"
                onClick={() => setExcelLayoutMode('desktop')}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg font-bold cursor-pointer transition-colors ${
                  excelLayoutMode === 'desktop'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title={tr('مقاس واسع للكمبيوتر', 'Wide desktop layout')}
              >
                <Monitor className="w-3 h-3" />
                <span>{tr('كمبيوتر', 'Desktop')}</span>
              </button>
              <button
                type="button"
                onClick={() => setExcelIncludeChart(!excelIncludeChart)}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg font-bold cursor-pointer transition-colors ${
                  excelIncludeChart
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title={tr('تضمين الرسم البياني للدرجات في شيت الإكسيل', 'Include grade chart in Excel sheet')}
              >
                <BarChart3 className="w-3 h-3" />
                <span>{excelIncludeChart ? tr('بالمخطط ✔', 'With Chart ✔') : tr('بدون مخطط', 'No Chart')}</span>
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              {tr('طباعة / PDF', 'Print / PDF')}
            </button>

            {/* Logo Toggle: Option to add or exclude logo */}
            <button
              type="button"
              onClick={handleToggleLogo}
              className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                showLogo
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40 hover:bg-amber-500/25'
                  : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              title={tr('إمكانية إضافة أو عدم إضافة شعار الهوية (اللوجو) للتقرير المطبوع والمصدر', 'Toggle identity logo in printed and exported reports')}
            >
              <span>{showLogo ? tr('🖼️ اللوجو مفعّل بالتقرير ✔', '🖼️ Logo Included ✔') : tr('🖼️ التقرير بدون لوجو', '🖼️ Without Logo')}</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            {tr('إغلاق', 'Close')}
          </button>
        </div>
      </div>

      {inspectAttachmentResult && (
        <AttachmentModal
          isOpen={!!inspectAttachmentResult}
          readOnly={true}
          title={tr('معاينة إثبات ومرفق مصداقية الامتحان', 'Preview Exam Verification Attachment')}
          subtitle={`${tr('طالب:', 'Student:')} ${student.name} | ${tr('امتحان:', 'Exam:')} ${inspectAttachmentResult.examTitle} | ${tr('الدرجة:', 'Score:')} ${inspectAttachmentResult.score}/${inspectAttachmentResult.totalScore}`}
          attachment={inspectAttachmentResult.attachment || null}
          onClose={() => setInspectAttachmentResult(null)}
        />
      )}
    </div>
  );
};
