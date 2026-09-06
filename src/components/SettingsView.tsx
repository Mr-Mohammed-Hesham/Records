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
  AlertCircle
} from 'lucide-react';
import { TeacherSettings, GradingScaleItem, Student, Exam, ExamResult } from '../types';
import { DEFAULT_SETTINGS, saveTeacherSettings } from '../services/firebase';
import { exportAllDataExcel } from '../utils/excel';

interface SettingsViewProps {
  settings: TeacherSettings;
  students: Student[];
  exams: Exam[];
  allResults: ExamResult[];
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
  const [seeding, setSeeding] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await onUpdateSettings(formData);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء حفظ الإعدادات');
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
          if (window.confirm(`تم العثور على نسخة احتياطية تحتوي على ${parsed.students.length} طالب و ${parsed.exams?.length || 0} امتحان. هل ترغب في استيرادها؟`)) {
            await onImportJsonBackup(parsed);
            alert('تم استيراد النسخة الاحتياطية بنجاح!');
          }
        } else {
          alert('ملف النسخة الاحتياطية غير صالح');
        }
      } catch (err) {
        alert('حدث خطأ أثناء قراءة ملف النسخة الاحتياطية');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div id="settings-view" className="space-y-6 text-right">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-indigo-600" />
            إعدادات التطبيق وتخصيص النظام
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            تعديل بيانات المدرس، نظام التقييم، الصفوف والمجموعات والنسخ الاحتياطي
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-98 rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </button>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600" />
          تم حفظ الإعدادات بنجاح في قاعدة بيانات Firestore!
        </div>
      )}

      {/* Teacher Profile & App Identity */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
        <h3 className="font-bold text-slate-900 text-base pb-3 border-b border-slate-100 flex items-center gap-2">
          <User className="w-4 h-4 text-indigo-600" />
          البيانات الأساسية للمدرس والتطبيق
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              اسم المدرس
            </label>
            <input
              type="text"
              value={formData.teacherName}
              onChange={(e) => setFormData(prev => ({ ...prev, teacherName: e.target.value }))}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-right"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              اسم التطبيق
            </label>
            <input
              type="text"
              value={formData.appTitle}
              onChange={(e) => setFormData(prev => ({ ...prev, appTitle: e.target.value }))}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-right"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              المادة الافتراضية
            </label>
            <input
              type="text"
              value={formData.defaultSubject}
              onChange={(e) => setFormData(prev => ({ ...prev, defaultSubject: e.target.value }))}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-right"
            />
          </div>
        </div>
      </div>

      {/* Grading Scale Configuration (نظام التقييم والنسب) */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600" />
              تعديل نظام التقييم والنسب المئوية
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              تحديد التقديرات بناءً على النسبة المئوية التي يحصل عليها الطالب تلقائياً
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, gradingScale: DEFAULT_SETTINGS.gradingScale }))}
            className="text-xs text-indigo-600 hover:underline font-semibold cursor-pointer"
          >
            استعادة الافتراضي
          </button>
        </div>

        <div className="space-y-3">
          {formData.gradingScale.map((item, idx) => (
            <div key={item.id} className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div className="w-28">
                <span className="text-[11px] text-slate-400 block mb-1">اسم التقدير</span>
                <input
                  type="text"
                  value={item.label}
                  onChange={(e) => handleScaleChange(idx, 'label', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-right"
                />
              </div>

              <div className="w-24">
                <span className="text-[11px] text-slate-400 block mb-1">الحد الأدنى %</span>
                <input
                  type="number"
                  value={item.minPercent}
                  onChange={(e) => handleScaleChange(idx, 'minPercent', parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-center font-bold"
                />
              </div>

              <div className="w-24">
                <span className="text-[11px] text-slate-400 block mb-1">الحد الأقصى %</span>
                <input
                  type="number"
                  value={item.maxPercent}
                  onChange={(e) => handleScaleChange(idx, 'maxPercent', parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-center font-bold"
                />
              </div>

              <div className="pt-4 flex items-center gap-2">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.isPass}
                    onChange={(e) => handleScaleChange(idx, 'isPass', e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-medium text-slate-700">يعتبر ناجحاً</span>
                </label>
              </div>

              <div className="pt-4 mr-auto">
                <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${item.badgeBg}`}>
                  معاينة: {item.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grades & Groups & Subjects Management */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Grades */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 space-y-3">
          <h4 className="font-bold text-slate-900 text-sm flex items-center justify-between">
            <span>الصفوف الدراسية</span>
            <span className="text-xs text-slate-400 font-normal">({(formData.grades || []).length})</span>
          </h4>

          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={newGrade}
              onChange={(e) => setNewGrade(e.target.value)}
              placeholder="صف دراسي جديد..."
              className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
            <button
              onClick={handleAddGrade}
              className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {(formData.grades || []).map(g => (
              <div key={g} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-xs">
                <span className="text-slate-700 font-medium">{g}</span>
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
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 space-y-3">
          <h4 className="font-bold text-slate-900 text-sm flex items-center justify-between">
            <span>المجموعات والفصول</span>
            <span className="text-xs text-slate-400 font-normal">({(formData.groups || []).length})</span>
          </h4>

          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={newGroup}
              onChange={(e) => setNewGroup(e.target.value)}
              placeholder="مجموعة جديدة..."
              className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
            <button
              onClick={handleAddGroup}
              className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {(formData.groups || []).map(grp => (
              <div key={grp} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-xs">
                <span className="text-slate-700 font-medium">{grp}</span>
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
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 space-y-3">
          <h4 className="font-bold text-slate-900 text-sm flex items-center justify-between">
            <span>المواد الدراسية</span>
            <span className="text-xs text-slate-400 font-normal">({(formData.subjects || []).length})</span>
          </h4>

          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              placeholder="مادة جديدة..."
              className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
            <button
              onClick={handleAddSubject}
              className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {(formData.subjects || []).map(s => (
              <div key={s} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-xs">
                <span className="text-slate-700 font-medium">{s}</span>
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
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
        <h3 className="font-bold text-slate-900 text-base pb-3 border-b border-slate-100 flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-600" />
          النسخ الاحتياطي وإدارة البيانات
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Export JSON */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">تصدير نسخة احتياطية كاملة</h4>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                تحميل ملف JSON يحتوي على كافة بيانات الطلاب والامتحانات والنتائج والإعدادات لحفظها في أمان.
              </p>
            </div>
            <button
              onClick={handleExportJsonBackup}
              className="mt-4 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              تحميل نسخة احتياطية (JSON)
            </button>
          </div>

          {/* Import JSON */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">استيراد نسخة احتياطية</h4>
              <p className="text-slate-500 text-[11px] leading-relaxed">
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
          <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-indigo-950 text-sm mb-1">بيانات تجريبية واختبار</h4>
              <p className="text-indigo-900/70 text-[11px] leading-relaxed">
                يمكنك ملء التطبيق ببيانات تجريبية (10 طلاب، 3 امتحانات ونتائج) لتجربة جميع الرسوم والتقارير فوراً.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                disabled={seeding}
                onClick={async () => {
                  if (window.confirm('هل ترغب في ملء بيانات تجريبية لتجربة التطبيق؟')) {
                    setSeeding(true);
                    await onSeedSampleData();
                    setSeeding(false);
                    alert('تم إنشاء البيانات التجريبية بنجاح!');
                  }
                }}
                className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {seeding ? 'جاري التوليد...' : 'توليد بيانات تجريبية'}
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (window.confirm('تحذير: هل أنت متأكد تماماً من حذف جميع الطلاب والامتحانات والنتائج والبدء من الصفر؟')) {
                    await onClearAllData();
                    alert('تم إفراغ البيانات بالكامل.');
                  }
                }}
                className="p-2 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                title="إفراغ كافة البيانات"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
