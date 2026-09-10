import React, { useState, useMemo } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  Calendar, 
  Filter, 
  CheckCircle2, 
  Download,
  Users,
  BookOpen,
  GraduationCap
} from 'lucide-react';
import { Student, Exam, ExamResult, TeacherSettings } from '../types';
import { exportCustomAcademicExcel, exportAllDataExcel } from '../utils/excel';

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
  const [selectedGrade, setSelectedGrade] = useState<string>(defaultGrade || 'الكل');
  const [selectedSubject, setSelectedSubject] = useState<string>(defaultSubject || 'الكل');
  const [selectedGroup, setSelectedGroup] = useState<string>('الكل');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [exportMode, setExportMode] = useState<'academic_reports' | 'all_data'>('academic_reports');
  const [isExporting, setIsExporting] = useState(false);

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
      if (selectedSubject !== 'الكل' && s.subject !== selectedSubject) return false;
      if (selectedGroup !== 'الكل' && s.group !== selectedGroup) return false;
      return true;
    });
  }, [students, selectedGrade, selectedSubject, selectedGroup]);

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
            startDate: startDate || undefined,
            endDate: endDate || undefined,
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
        className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-xl w-full flex flex-col max-h-[92dvh] sm:max-h-[90vh] shadow-2xl border border-slate-200 dark:border-slate-800 text-right overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="shrink-0 p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg">
                مركز تصدير Excel المخصص
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                استخراج ملف Excel مفلتر حسب الصف أو المادة أو الفترة الزمنية
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
                  <span className="font-bold text-xs">تقارير الطلاب الأكاديمية (الموصى بها)</span>
                  <CheckCircle2 className={`w-4 h-4 ${exportMode === 'academic_reports' ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'}`} />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  تحتوي على: اسم الطالب، الصف، عدد الامتحانات، درجات كل امتحان، المتوسط العام، نسبة النجاح، وملاحظات التقدم
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
                  ملف شامل بـ 4 شيتات: قائمة الطلاب، سجل رصد الدرجات، بيانات الامتحانات، والإحصائيات
                </p>
              </button>
            </div>
          </div>

          {/* Filtering Options */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-amber-500" />
              <span>فلاتر الاستخراج (اختياري):</span>
            </h4>

            {/* Grade & Subject */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          <div className="bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 rounded-2xl p-3.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
              <GraduationCap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>بيانات التقرير المستخرج:</span>
            </div>
            <div className="flex items-center gap-3 font-mono font-bold text-amber-800 dark:text-amber-300">
              <span>{filteredStudents.length} طالب</span>
              <span>•</span>
              <span>{filteredResults.length} نتيجة امتحان</span>
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
