import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  Calendar, 
  Filter, 
  CheckCircle2, 
  Download,
  GraduationCap,
  BarChart3,
  Smartphone,
  Monitor,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Student, Exam, ExamResult, TeacherSettings } from '../types';
import { 
  exportCustomAcademicExcel, 
  exportAllDataExcel,
  getSavedExcelPreferences,
  saveExcelPreferences,
} from '../utils/excel';
import { getEffectiveEnrollmentStatus, ENROLLMENT_STATUS_LIST } from '../utils/studentStatus';

interface ExcelExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  exams: Exam[];
  allResults: ExamResult[];
  settings: TeacherSettings;
  defaultGrade?: string;
  defaultSubject?: string;
}

const MODAL_STATE_KEY = 'mh_excel_modal_saved_filters_v1';

export const ExcelExportModal: React.FC<ExcelExportModalProps> = ({
  isOpen,
  onClose,
  students,
  exams,
  allResults,
  settings,
  defaultGrade,
  defaultSubject,
}) => {
  const initialPrefs = useMemo(() => getSavedExcelPreferences(), []);

  const [selectedGrade, setSelectedGrade] = useState<string>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(MODAL_STATE_KEY) || '{}');
      return defaultGrade || saved.selectedGrade || 'الكل';
    } catch {
      return defaultGrade || 'الكل';
    }
  });

  const [selectedSubject, setSelectedSubject] = useState<string>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(MODAL_STATE_KEY) || '{}');
      return defaultSubject || saved.selectedSubject || 'الكل';
    } catch {
      return defaultSubject || 'الكل';
    }
  });

  const [selectedGroup, setSelectedGroup] = useState<string>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(MODAL_STATE_KEY) || '{}');
      return saved.selectedGroup || 'الكل';
    } catch {
      return 'الكل';
    }
  });

  const [enrollmentStatusFilter, setEnrollmentStatusFilter] = useState<string>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(MODAL_STATE_KEY) || '{}');
      return saved.enrollmentStatusFilter || 'الكل';
    } catch {
      return 'الكل';
    }
  });

  const [startDate, setStartDate] = useState<string>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(MODAL_STATE_KEY) || '{}');
      return saved.startDate || '';
    } catch {
      return '';
    }
  });

  const [endDate, setEndDate] = useState<string>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(MODAL_STATE_KEY) || '{}');
      return saved.endDate || '';
    } catch {
      return '';
    }
  });

  const [exportMode, setExportMode] = useState<'academic_reports' | 'all_data'>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(MODAL_STATE_KEY) || '{}');
      return saved.exportMode === 'all_data' ? 'all_data' : 'academic_reports';
    } catch {
      return 'academic_reports';
    }
  });

  // Chart & Layout preferences
  const [includeChart, setIncludeChart] = useState<boolean>(initialPrefs.includeChart);
  const [layoutMode, setLayoutMode] = useState<'mobile' | 'desktop'>(initialPrefs.layoutMode);
  const [chartType, setChartType] = useState<'bars_and_columns' | 'bars_only' | 'distribution'>(
    initialPrefs.chartType
  );

  const [isExporting, setIsExporting] = useState(false);

  // Persist changes automatically
  useEffect(() => {
    saveExcelPreferences({
      includeChart,
      layoutMode,
      chartType,
    });
  }, [includeChart, layoutMode, chartType]);

  useEffect(() => {
    try {
      localStorage.setItem(
        MODAL_STATE_KEY,
        JSON.stringify({
          selectedGrade,
          selectedSubject,
          selectedGroup,
          enrollmentStatusFilter,
          startDate,
          endDate,
          exportMode,
        })
      );
    } catch {
      // ignore
    }
  }, [
    selectedGrade,
    selectedSubject,
    selectedGroup,
    enrollmentStatusFilter,
    startDate,
    endDate,
    exportMode,
  ]);

  const handleResetAll = () => {
    setSelectedGrade('الكل');
    setSelectedSubject('الكل');
    setSelectedGroup('الكل');
    setEnrollmentStatusFilter('الكل');
    setStartDate('');
    setEndDate('');
    setExportMode('academic_reports');
    setIncludeChart(true);
    setLayoutMode('mobile');
    setChartType('bars_and_columns');
    try {
      localStorage.removeItem(MODAL_STATE_KEY);
    } catch {
      // ignore
    }
  };

  // Available subjects from settings & students
  const availableSubjects = useMemo(() => {
    const set = new Set<string>();
    settings.subjects?.forEach(s => set.add(s));
    students.forEach(s => { if (s.subject) set.add(s.subject); });
    return Array.from(set);
  }, [settings.subjects, students]);

  // Filtered counts for preview
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (selectedGrade !== 'الكل' && s.grade !== selectedGrade) return false;
      if (selectedSubject !== 'الكل' && s.subject !== selectedSubject && !(Array.isArray(s.subjects) && s.subjects.includes(selectedSubject))) return false;
      if (selectedGroup !== 'الكل' && s.group !== selectedGroup) return false;
      if (enrollmentStatusFilter !== 'الكل' && getEffectiveEnrollmentStatus(s) !== enrollmentStatusFilter) return false;
      return true;
    });
  }, [students, selectedGrade, selectedSubject, selectedGroup, enrollmentStatusFilter]);

  const studentIdsSet = useMemo(() => new Set(filteredStudents.map(s => s.id)), [filteredStudents]);

  const filteredResults = useMemo(() => {
    return allResults.filter(r => {
      if (!studentIdsSet.has(r.studentDocId)) return false;
      if (startDate && r.examDate < startDate) return false;
      if (endDate && r.examDate > endDate) return false;
      return true;
    });
  }, [allResults, studentIdsSet, startDate, endDate]);

  if (!isOpen) return null;

  const handleExport = () => {
    setIsExporting(true);
    try {
      if (exportMode === 'academic_reports') {
        exportCustomAcademicExcel(
          students,
          exams,
          allResults,
          {
            grade: selectedGrade,
            subject: selectedSubject,
            group: selectedGroup,
            enrollmentStatus: enrollmentStatusFilter,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            includeChart,
            layoutMode,
            chartType,
          },
          settings.gradingScale
        );
      } else {
        exportAllDataExcel(students, exams, allResults, settings);
      }
      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 400);
    } catch (err) {
      console.error('Export failed:', err);
      setIsExporting(false);
    }
  };

  // Quick date presets
  const handleQuickPreset = (type: 'this_month' | 'last_30' | 'all') => {
    const today = new Date();
    if (type === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (type === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (type === 'last_30') {
      const priorDate = new Date();
      priorDate.setDate(today.getDate() - 30);
      setStartDate(priorDate.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-hidden"
      onClick={onClose}
    >
      <div
        id="excel-export-modal"
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-2xl w-full flex flex-col max-h-[92dvh] sm:max-h-[90vh] shadow-2xl border border-slate-200 dark:border-slate-800 text-right overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="shrink-0 p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg">
                مركز تصدير Excel والرسوم البيانية
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                إعداداتك محفوظة تلقائياً — يمكنك المتابعة أو البدء بإعدادات جديدة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetAll}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              title="البدء من جديد وإعادة ضبط إعدادات التصدير"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
              <span>البدء من جديد</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* Format Type Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              تنسيق ونوع التقرير المطلوب:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setExportMode('academic_reports')}
                className={`p-3.5 rounded-2xl border text-right transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                  exportMode === 'academic_reports'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-200 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">تقارير الطلاب الأكاديمية (مع الرسم البياني)</span>
                  <CheckCircle2 className={`w-4 h-4 ${exportMode === 'academic_reports' ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'}`} />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  تحتوي على: اسم الطالب، الصف، حالة الملف، درجات كل امتحان، الرسم البياني للتطور، وملاحظات التقدم
                </p>
              </button>

              <button
                type="button"
                onClick={() => setExportMode('all_data')}
                className={`p-3.5 rounded-2xl border text-right transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                  exportMode === 'all_data'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-200 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">سجل الجداول الشامل (جميع الشيتات)</span>
                  <CheckCircle2 className={`w-4 h-4 ${exportMode === 'all_data' ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'}`} />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  ملف شامل بـ 4 شيتات: قائمة الطلاب وحالاتهم، سجل الدرجات، بيانات الامتحانات، والإحصائيات
                </p>
              </button>
            </div>
          </div>

          {/* Chart & Sheet Layout / Mobile Sizing Options */}
          <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200/80 dark:border-indigo-800/60 space-y-3.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>إعدادات الرسم البياني ومقاسات الشيت (وضع الهاتف والكمبيوتر):</span>
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                محفوظ تلقائياً
              </span>
            </div>

            {/* Layout Mode: Mobile vs Desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setLayoutMode('mobile')}
                className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex items-start gap-2.5 ${
                  layoutMode === 'mobile'
                    ? 'bg-white dark:bg-slate-900 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'bg-white/60 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 hover:bg-white'
                }`}
              >
                <Smartphone className={`w-5 h-5 shrink-0 mt-0.5 ${layoutMode === 'mobile' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>وضع الهاتف المحمول (موصى به)</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    ضبط مساحات وأبعاد الشيت ودمج الأعمدة ليظهر التقرير والرسم البياني بوضوح تام على شاشة الهاتف بدون تمرير مزعج
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setLayoutMode('desktop')}
                className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex items-start gap-2.5 ${
                  layoutMode === 'desktop'
                    ? 'bg-white dark:bg-slate-900 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'bg-white/60 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 hover:bg-white'
                }`}
              >
                <Monitor className={`w-5 h-5 shrink-0 mt-0.5 ${layoutMode === 'desktop' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white">
                    الوضع المكتبي الواسع (كمبيوتر)
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    جداول عريضة بـ 8 أعمدة منفصلة مع مساحات واسعة للشاشات الكبيرة والطباعة المكتبية
                  </p>
                </div>
              </button>
            </div>

            {/* Include Visual Chart Toggle & Style */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-indigo-200/60 dark:border-indigo-800/50">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeChart}
                  onChange={(e) => setIncludeChart(e.target.checked)}
                  className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  إضافة الرسم البياني للدرجات والتقديرات داخل التقرير
                </span>
              </label>

              {includeChart && (
                <select
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value as any)}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-700 text-slate-800 dark:text-slate-200 rounded-xl text-[11px] font-bold cursor-pointer"
                >
                  <option value="bars_and_columns">أشرطة تقدم + مخطط أعمدة رأسي + توزيع نسبي</option>
                  <option value="bars_only">أشرطة تقدم الدرجات وتوزيع التقديرات (مدمج)</option>
                  <option value="distribution">توزيع التقديرات والنسب فقط</option>
                </select>
              )}
            </div>
          </div>

          {/* Filtering Options */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-amber-500" />
              <span>فلاتر الاستخراج (الصف / المادة / حالة ملف الطالب / الفترة):</span>
            </h4>

            {/* Grade, Subject & Student File Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  الصف الدراسي:
                </label>
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-medium cursor-pointer"
                >
                  <option value="الكل">كافة الصفوف الدراسية</option>
                  {settings.grades.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  المادة الدراسية:
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-medium cursor-pointer"
                >
                  <option value="الكل">كافة المواد الدراسية</option>
                  {availableSubjects.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  حالة ملف الطالب بالكورس:
                </label>
                <select
                  value={enrollmentStatusFilter}
                  onChange={(e) => setEnrollmentStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  <option value="الكل">كافة الطلاب (الكل)</option>
                  {ENROLLMENT_STATUS_LIST.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date Range Filtering */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>تحديد الفترة الزمنية للامتحانات:</span>
                </label>
                <div className="flex items-center gap-2 text-[10px]">
                  <button
                    type="button"
                    onClick={() => handleQuickPreset('this_month')}
                    className="text-amber-600 dark:text-amber-400 hover:underline cursor-pointer font-bold"
                  >
                    هذا الشهر
                  </button>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <button
                    type="button"
                    onClick={() => handleQuickPreset('last_30')}
                    className="text-amber-600 dark:text-amber-400 hover:underline cursor-pointer font-bold"
                  >
                    آخر 30 يوم
                  </button>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <button
                    type="button"
                    onClick={() => handleQuickPreset('all')}
                    className="text-slate-500 dark:text-slate-400 hover:underline cursor-pointer"
                  >
                    كافة الفترات
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs"
                    placeholder="من تاريخ"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5 pr-1">من تاريخ</span>
                </div>
                <div>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs"
                    placeholder="إلى تاريخ"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5 pr-1">إلى تاريخ</span>
                </div>
              </div>
            </div>
          </div>

          {/* Live Data Count Preview */}
          <div className="bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
              <GraduationCap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>بيانات التقرير المستخرج:</span>
            </div>
            <div className="flex items-center gap-3 font-mono font-bold text-amber-800 dark:text-amber-300">
              <span>{filteredStudents.length} طالب</span>
              <span>•</span>
              <span>{filteredResults.length} نتيجة امتحان</span>
              <span>•</span>
              <span>{layoutMode === 'mobile' ? '📱 مقاس الهاتف' : '💻 مقاس الكمبيوتر'}</span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="shrink-0 p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm flex items-center justify-end gap-3 pb-safe">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting || filteredStudents.length === 0}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-98 rounded-xl shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'جاري تجهيز Excel...' : 'تصدير ملف Excel الآن'}
          </button>
        </div>
      </div>
    </div>
  );
};
