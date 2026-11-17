import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Save, 
  User, 
  BookOpen, 
  Plus, 
  Trash2, 
  Sliders, 
  Download, 
  Upload, 
  Database, 
  RefreshCw, 
  Check, 
  Sparkles,
  AlertCircle,
  LogOut,
  ShieldCheck,
  LockKeyhole
} from 'lucide-react';
import { TeacherSettings, GradingScaleItem, Student, Exam, ExamResult } from '../types';
import { DEFAULT_SETTINGS, saveTeacherSettings } from '../services/firebase';

interface SettingsViewProps {
  settings: TeacherSettings;
  students: Student[];
  exams: Exam[];
  allResults: ExamResult[];
  currentUser?: any;
  onLogout?: () => void;
  onUpdateSettings: (newSettings: TeacherSettings) => Promise<void>;
  onSeedSampleData: () => Promise<void>;
  onClearAllData: () => Promise<void>;
  onImportJsonBackup: (data: { students: Student[]; exams: Exam[]; results: ExamResult[]; settings?: TeacherSettings }) => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  students,
  exams,
  allResults,
  currentUser,
  onLogout,
  onUpdateSettings,
  onSeedSampleData,
  onClearAllData,
  onImportJsonBackup,
}) => {
  const [formData, setFormData] = useState<TeacherSettings>({
    ...DEFAULT_SETTINGS,
    ...(settings || {}),
    grades: settings?.grades || DEFAULT_SETTINGS.grades,
    groups: settings?.groups || DEFAULT_SETTINGS.groups,
    subjects: settings?.subjects || DEFAULT_SETTINGS.subjects,
    examTypes: settings?.examTypes || DEFAULT_SETTINGS.examTypes,
    gradingScale: settings?.gradingScale || DEFAULT_SETTINGS.gradingScale,
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        ...DEFAULT_SETTINGS,
        ...settings,
        grades: settings.grades || DEFAULT_SETTINGS.grades,
        groups: settings.groups || DEFAULT_SETTINGS.groups,
        subjects: settings.subjects || DEFAULT_SETTINGS.subjects,
        examTypes: settings.examTypes || DEFAULT_SETTINGS.examTypes,
        gradingScale: settings.gradingScale || DEFAULT_SETTINGS.gradingScale,
      });
    }
  }, [settings]);
  const [newGrade, setNewGrade] = useState('');
  const [newGroup, setNewGroup] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [statusNotice, setStatusNotice] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [pendingAction, setPendingAction] = useState<null | 'seed' | 'clear' | { type: 'import'; data: any }>(null);

  const showNotice = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setStatusNotice({ text, type });
    setTimeout(() => setStatusNotice(null), 3500);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await onUpdateSettings(formData);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error(err);
      showNotice('حدث خطأ أثناء حفظ الإعدادات', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Add/Remove Grade
  const handleAddGrade = () => {
    if (!newGrade.trim() || formData.grades.includes(newGrade.trim())) return;
    setFormData(prev => ({ ...prev, grades: [...prev.grades, newGrade.trim()] }));
    setNewGrade('');
  };

  const handleRemoveGrade = (g: string) => {
    setFormData(prev => ({ ...prev, grades: prev.grades.filter(x => x !== g) }));
  };

  // Add/Remove Group
  const handleAddGroup = () => {
    if (!newGroup.trim() || formData.groups.includes(newGroup.trim())) return;
    setFormData(prev => ({ ...prev, groups: [...prev.groups, newGroup.trim()] }));
    setNewGroup('');
  };

  const handleRemoveGroup = (grp: string) => {
    setFormData(prev => ({ ...prev, groups: prev.groups.filter(x => x !== grp) }));
  };

  // Add/Remove Subject
  const handleAddSubject = () => {
    if (!newSubject.trim() || formData.subjects.includes(newSubject.trim())) return;
    setFormData(prev => ({ ...prev, subjects: [...prev.subjects, newSubject.trim()] }));
    setNewSubject('');
  };

  const handleRemoveSubject = (s: string) => {
    setFormData(prev => ({ ...prev, subjects: prev.subjects.filter(x => x !== s) }));
  };

  // Grading scale adjustments
  const handleScaleChange = (index: number, field: keyof GradingScaleItem, value: any) => {
    const updated = [...formData.gradingScale];
    updated[index] = { ...updated[index], [field]: value };
    setFormData(prev => ({ ...prev, gradingScale: updated }));
  };

  // Export JSON backup
  const handleExportJsonBackup = () => {
    const backup = {
      app: 'Mr Mohammed Hesham Records',
      exportDate: new Date().toISOString(),
      students,
      exams,
      results: allResults,
      settings: formData,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `نسخة_احتياطية_Mr_Mohammed_Hesham_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON backup
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.students && Array.isArray(parsed.students)) {
          setPendingAction({ type: 'import', data: parsed });
        } else {
          showNotice('ملف النسخة الاحتياطية غير صالح', 'error');
        }
      } catch (err) {
        showNotice('حدث خطأ أثناء قراءة ملف النسخة الاحتياطية', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div id="settings-view" className="space-y-5 text-right">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-indigo-600 dark:text-amber-400 shrink-0" />
            <span>إعدادات التطبيق وتخصيص النظام</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            تعديل بيانات المدرس، نظام التقييم، الصفوف والمجموعات والنسخ الاحتياطي
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-98 rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold rounded-xl flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>تم حفظ الإعدادات بنجاح في قاعدة بيانات Firestore!</span>
        </div>
      )}

      {statusNotice && (
        <div
          className={`p-3 border text-xs font-bold rounded-xl flex items-center gap-2 ${
            statusNotice.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
          }`}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{statusNotice.text}</span>
        </div>
      )}

      {/* Teacher Profile & App Identity */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4">
        <h3 className="font-bold text-slate-900 dark:text-white text-base pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <User className="w-4 h-4 text-indigo-600 dark:text-amber-400" />
          <span>البيانات الأساسية للمدرس والتطبيق</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              اسم المدرس
            </label>
            <input
              type="text"
              value={formData.teacherName}
              onChange={(e) => setFormData(prev => ({ ...prev, teacherName: e.target.value }))}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-950 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-right"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              اسم التطبيق
            </label>
            <input
              type="text"
              value={formData.appTitle}
              onChange={(e) => setFormData(prev => ({ ...prev, appTitle: e.target.value }))}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-950 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-right"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              المادة الافتراضية
            </label>
            <input
              type="text"
              value={formData.defaultSubject}
              onChange={(e) => setFormData(prev => ({ ...prev, defaultSubject: e.target.value }))}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-950 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-right"
            />
          </div>
        </div>
      </div>

      {/* Grading Scale Configuration (نظام التقييم والنسب) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600 dark:text-amber-400" />
              <span>تعديل نظام التقييم والنسب المئوية</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              تحديد التقديرات بناءً على النسبة المئوية التي يحصل عليها الطالب تلقائياً
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, gradingScale: DEFAULT_SETTINGS.gradingScale }))}
            className="text-xs text-indigo-600 dark:text-amber-400 hover:underline font-semibold cursor-pointer"
          >
            استعادة الافتراضي
          </button>
        </div>

        <div className="space-y-3">
          {formData.gradingScale.map((item, idx) => (
            <div key={item.id} className="grid grid-cols-2 sm:grid-cols-12 items-end gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/70 text-xs">
              <div className="col-span-2 sm:col-span-3">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">اسم التقدير</span>
                <input
                  type="text"
                  value={item.label}
                  onChange={(e) => handleScaleChange(idx, 'label', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white text-right"
                />
              </div>

              <div className="col-span-1 sm:col-span-2">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">الحد الأدنى %</span>
                <input
                  type="number"
                  value={item.minPercent}
                  onChange={(e) => handleScaleChange(idx, 'minPercent', parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-center font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="col-span-1 sm:col-span-2">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">الحد الأقصى %</span>
                <input
                  type="number"
                  value={item.maxPercent}
                  onChange={(e) => handleScaleChange(idx, 'maxPercent', parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-center font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="col-span-1 sm:col-span-2 flex items-center h-8">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.isPass}
                    onChange={(e) => handleScaleChange(idx, 'isPass', e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">يعتبر ناجحاً</span>
                </label>
              </div>

              <div className="col-span-1 sm:col-span-3 flex justify-end">
                <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${item.badgeBg}`}>
                  معاينة: {item.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grades & Groups & Subjects Management */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Grades */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-3">
          <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center justify-between">
            <span>الصفوف الدراسية</span>
            <span className="text-xs text-slate-400 font-normal font-mono">({(formData.grades || []).length})</span>
          </h4>

          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={newGrade}
              onChange={(e) => setNewGrade(e.target.value)}
              placeholder="صف دراسي جديد..."
              className="flex-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
            />
            <button
              onClick={handleAddGrade}
              className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {(formData.grades || []).map(g => (
              <div key={g} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs">
                <span className="text-slate-700 dark:text-slate-200 font-medium">{g}</span>
                <button
                  onClick={() => handleRemoveGrade(g)}
                  className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Groups */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-3">
          <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center justify-between">
            <span>المجموعات والفصول</span>
            <span className="text-xs text-slate-400 font-normal font-mono">({(formData.groups || []).length})</span>
          </h4>

          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={newGroup}
              onChange={(e) => setNewGroup(e.target.value)}
              placeholder="مجموعة جديدة..."
              className="flex-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
            />
            <button
              onClick={handleAddGroup}
              className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {(formData.groups || []).map(grp => (
              <div key={grp} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs">
                <span className="text-slate-700 dark:text-slate-200 font-medium">{grp}</span>
                <button
                  onClick={() => handleRemoveGroup(grp)}
                  className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Subjects */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-3">
          <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center justify-between">
            <span>المواد الدراسية</span>
            <span className="text-xs text-slate-400 font-normal font-mono">({(formData.subjects || []).length})</span>
          </h4>

          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              placeholder="مادة جديدة..."
              className="flex-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
            />
            <button
              onClick={handleAddSubject}
              className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {(formData.subjects || []).map(s => (
              <div key={s} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs">
                <span className="text-slate-700 dark:text-slate-200 font-medium">{s}</span>
                <button
                  onClick={() => handleRemoveSubject(s)}
                  className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Backup, Restore & Data Tools */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4">
        <h3 className="font-bold text-slate-900 dark:text-white text-base pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>النسخ الاحتياطي وإدارة البيانات</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Export JSON */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/70 flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">تصدير نسخة احتياطية كاملة</h4>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                تحميل ملف JSON يحتوي على كافة بيانات الطلاب والامتحانات والنتائج والإعدادات لحفظها في أمان.
              </p>
            </div>
            <button
              onClick={handleExportJsonBackup}
              className="mt-4 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white font-bold rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              تحميل نسخة احتياطية (JSON)
            </button>
          </div>

          {/* Import JSON */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/70 flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">استيراد نسخة احتياطية</h4>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                استعادة البيانات من ملف نسخة احتياطية سابق (JSON) ومزامنتها مع قاعدة البيانات.
              </p>
            </div>
            <label className="mt-4 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>اختيار ملف للاستيراد</span>
              <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
            </label>
          </div>

          {/* Quick Demo Sample Data & Reset */}
          <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/50 flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-indigo-950 dark:text-indigo-200 text-sm mb-1">بيانات تجريبية واختبار</h4>
              <p className="text-indigo-900/70 dark:text-indigo-300/80 text-[11px] leading-relaxed">
                يمكنك ملء التطبيق ببيانات تجريبية أو إدارة إعادة الضبط من خلال النوافذ الآمنة.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                disabled={seeding}
                onClick={() => setPendingAction('seed')}
                className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {seeding ? 'جاري التوليد...' : 'توليد بيانات تجريبية'}
              </button>

              <button
                type="button"
                onClick={() => setPendingAction('clear')}
                className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                title="إفراغ كافة البيانات الأكاديمية"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Account & Security Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4">
        <h3 className="font-bold text-slate-900 dark:text-white text-base pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <LockKeyhole className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            الأمان والحساب الأكاديمي
          </span>
          <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            Google SSO محمي
          </span>
        </h3>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70">
          <div className="space-y-1 min-w-0">
            <div className="text-xs text-slate-500 dark:text-slate-400">حساب Google النشط حالياً:</div>
            <div className="font-mono font-bold text-slate-900 dark:text-white text-sm truncate max-w-full" dir="ltr">
              {currentUser?.email || 'mr.mohamed.hesham93@gmail.com'}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              تسجيل الدخول مقتصر على حسابات الأستاذ محمد هشام الرسمية المعتمدة فقط.
            </div>
          </div>

          {onLogout && (
            <button
              id="btn-settings-logout"
              type="button"
              onClick={onLogout}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-600 dark:hover:bg-rose-600 text-rose-700 dark:text-rose-400 hover:text-white border border-rose-200 dark:border-rose-900/50 hover:border-rose-600 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج من الحساب</span>
            </button>
          )}
        </div>
      </div>

      {/* Safe Responsive Confirmation Dialog for Backup/Seed/Clear */}
      {pendingAction && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-hidden"
          onClick={() => setPendingAction(null)}
          dir="rtl"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[92dvh] overflow-y-auto"
          >
            <h4 className="font-black text-base text-slate-900 dark:text-white">
              {pendingAction === 'clear'
                ? 'تأكيد إفراغ البيانات الأكاديمية'
                : pendingAction === 'seed'
                ? 'توليد بيانات تجريبية'
                : 'تأكيد استيراد النسخة الاحتياطية'}
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {pendingAction === 'clear'
                ? 'هل أنت متأكد تماماً من حذف جميع الطلاب والامتحانات والنتائج؟ (سجلات قسم المالية والأوفر تايم محمية ولا تُمس).'
                : pendingAction === 'seed'
                ? 'هل ترغب في تشغيل دالة التحقق من البيانات التجريبية؟'
                : `تم العثور على نسخة احتياطية تحتوي على ${pendingAction.data.students?.length || 0} طالب و ${pendingAction.data.exams?.length || 0} امتحان. هل ترغب في استيرادها؟`}
            </p>
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPendingAction(null)}
                className="px-4 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl cursor-pointer text-center"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={async () => {
                  const act = pendingAction;
                  setPendingAction(null);
                  if (act === 'seed') {
                    setSeeding(true);
                    await onSeedSampleData();
                    setSeeding(false);
                  } else if (act === 'clear') {
                    await onClearAllData();
                  } else {
                    await onImportJsonBackup(act.data);
                    showNotice('تم استيراد النسخة الاحتياطية بنجاح!');
                  }
                }}
                className={`px-4 py-2 text-xs font-black text-white rounded-xl cursor-pointer text-center ${
                  pendingAction === 'clear' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                تأكيد المتابعة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
