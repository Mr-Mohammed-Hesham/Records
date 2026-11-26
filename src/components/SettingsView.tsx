import React, { useState, useEffect, useMemo } from 'react';
import {
  Settings,
  Save,
  User,
  Plus,
  Trash2,
  Sliders,
  Download,
  Upload,
  Database,
  Check,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  LogOut,
  ShieldCheck,
  LockKeyhole,
  Languages,
} from 'lucide-react';
import { TeacherSettings, GradingScaleItem, Student, Exam, ExamResult } from '../types';
import { DEFAULT_SETTINGS } from '../services/firebase';
import { LanguageSwitcher, useLanguage } from '../utils/i18n';
import { ConfirmModal } from './ConfirmModal';

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
  onImportJsonBackup: (data: {
    students: Student[];
    exams: Exam[];
    results: ExamResult[];
    settings?: TeacherSettings;
  }) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
}

const normalizeSettingsSnapshot = (s?: TeacherSettings): TeacherSettings => ({
  ...DEFAULT_SETTINGS,
  ...(s || {}),
  grades: s?.grades || DEFAULT_SETTINGS.grades,
  groups: s?.groups || DEFAULT_SETTINGS.groups,
  subjects: s?.subjects || DEFAULT_SETTINGS.subjects,
  examTypes: s?.examTypes || DEFAULT_SETTINGS.examTypes,
  gradingScale: s?.gradingScale || DEFAULT_SETTINGS.gradingScale,
});

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
  onDirtyChange,
}) => {
  const { dir, tr } = useLanguage();
  const [formData, setFormData] = useState<TeacherSettings>(() =>
    normalizeSettingsSnapshot(settings)
  );
  const [baselineSnapshot, setBaselineSnapshot] = useState<string>(() =>
    JSON.stringify(normalizeSettingsSnapshot(settings))
  );

  useEffect(() => {
    if (settings) {
      const normalized = normalizeSettingsSnapshot(settings);
      setFormData(normalized);
      setBaselineSnapshot(JSON.stringify(normalized));
    }
  }, [settings]);

  const [newGrade, setNewGrade] = useState('');
  const [newGroup, setNewGroup] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [statusNotice, setStatusNotice] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    null | 'seed' | 'clear' | { type: 'import'; data: any }
  >(null);
  const [settingsConfirmModal, setSettingsConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    isDestructive: boolean;
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: tr('تأكيد الحذف', 'Confirm Delete'),
    isDestructive: true,
    onConfirm: () => {},
  });

  const isDirty = useMemo(() => {
    return (
      JSON.stringify(formData) !== baselineSnapshot ||
      newGrade.trim() !== '' ||
      newGroup.trim() !== '' ||
      newSubject.trim() !== ''
    );
  }, [formData, baselineSnapshot, newGrade, newGroup, newSubject]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    return () => {
      onDirtyChange?.(false);
    };
  }, [onDirtyChange]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (!pendingAction) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      setPendingAction(null);
    };
    document.addEventListener('keydown', handleEsc, { capture: true });
    return () => document.removeEventListener('keydown', handleEsc, { capture: true });
  }, [pendingAction]);

  const showNotice = (
    text: string,
    type: 'success' | 'error' | 'info' = 'success'
  ) => {
    setStatusNotice({ text, type });
    setTimeout(() => setStatusNotice(null), 3500);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await onUpdateSettings(formData);
      setBaselineSnapshot(JSON.stringify(formData));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error(err);
      showNotice(
        tr('حدث خطأ أثناء حفظ الإعدادات', 'Error saving settings'),
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  // Add/Remove Grade
  const handleAddGrade = () => {
    if (!newGrade.trim() || formData.grades.includes(newGrade.trim())) return;
    setFormData((prev) => ({ ...prev, grades: [...prev.grades, newGrade.trim()] }));
    setNewGrade('');
  };

  const handleRemoveGrade = (g: string) => {
    setSettingsConfirmModal({
      isOpen: true,
      title: tr('تحذير: حذف صف دراسي', 'Warning: Delete Grade'),
      message: tr(
        `هل أنت متأكد من حذف الصف الدراسي "${g}" من قائمة الصفوف في الإعدادات؟ تذكّر الضغط على "حفظ الإعدادات" لتثبيت التغيير.`,
        `Are you sure you want to remove grade "${g}" from the list? Remember to click "Save Settings" to persist.`
      ),
      confirmText: tr('تأكيد الحذف', 'Confirm Delete'),
      isDestructive: true,
      onConfirm: () => {
        setFormData((prev) => ({
          ...prev,
          grades: prev.grades.filter((x) => x !== g),
        }));
      },
    });
  };

  // Add/Remove Group
  const handleAddGroup = () => {
    if (!newGroup.trim() || formData.groups.includes(newGroup.trim())) return;
    setFormData((prev) => ({ ...prev, groups: [...prev.groups, newGroup.trim()] }));
    setNewGroup('');
  };

  const handleRemoveGroup = (grp: string) => {
    setSettingsConfirmModal({
      isOpen: true,
      title: tr('تحذير: حذف مجموعة / فصل', 'Warning: Delete Group / Class'),
      message: tr(
        `هل أنت متأكد من حذف المجموعة "${grp}" من قائمة المجموعات؟`,
        `Are you sure you want to remove group "${grp}" from the list?`
      ),
      confirmText: tr('تأكيد الحذف', 'Confirm Delete'),
      isDestructive: true,
      onConfirm: () => {
        setFormData((prev) => ({
          ...prev,
          groups: prev.groups.filter((x) => x !== grp),
        }));
      },
    });
  };

  // Add/Remove Subject
  const handleAddSubject = () => {
    if (!newSubject.trim() || formData.subjects.includes(newSubject.trim())) return;
    setFormData((prev) => ({
      ...prev,
      subjects: [...prev.subjects, newSubject.trim()],
    }));
    setNewSubject('');
  };

  const handleRemoveSubject = (s: string) => {
    setSettingsConfirmModal({
      isOpen: true,
      title: tr('تحذير: حذف مادة دراسية', 'Warning: Delete Subject'),
      message: tr(
        `هل أنت متأكد من حذف المادة الدراسية "${s}" من قائمة المواد؟`,
        `Are you sure you want to remove subject "${s}" from the list?`
      ),
      confirmText: tr('تأكيد الحذف', 'Confirm Delete'),
      isDestructive: true,
      onConfirm: () => {
        setFormData((prev) => ({
          ...prev,
          subjects: prev.subjects.filter((x) => x !== s),
        }));
      },
    });
  };

  const handleRequestRestoreGradingDefaults = () => {
    setSettingsConfirmModal({
      isOpen: true,
      title: tr('تحذير: استعادة نظام التقييم الافتراضي', 'Warning: Restore Default Grading Scale'),
      message: tr(
        'سيتم استبدال كافة تعديلات التقديرات والنسب المئوية الحالية بالقيم الافتراضية للنظام. هل تريد المتابعة؟',
        'All custom grading labels and percentage thresholds will be replaced with defaults. Continue?'
      ),
      confirmText: tr('استعادة الافتراضي', 'Restore Defaults'),
      isDestructive: true,
      onConfirm: () => {
        setFormData((prev) => ({
          ...prev,
          gradingScale: DEFAULT_SETTINGS.gradingScale,
        }));
      },
    });
  };

  // Grading scale adjustments
  const handleScaleChange = (
    index: number,
    field: keyof GradingScaleItem,
    value: any
  ) => {
    const updated = [...formData.gradingScale];
    updated[index] = { ...updated[index], [field]: value };
    setFormData((prev) => ({ ...prev, gradingScale: updated }));
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
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_Mr_Mohammed_Hesham_${
      new Date().toISOString().split('T')[0]
    }.json`;
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
          showNotice(
            tr('ملف النسخة الاحتياطية غير صالح', 'Invalid backup JSON file'),
            'error'
          );
        }
      } catch {
        showNotice(
          tr('حدث خطأ أثناء قراءة ملف النسخة الاحتياطية', 'Error reading backup file'),
          'error'
        );
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div id="settings-view" className="space-y-5 text-start" dir={dir}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-indigo-600 dark:text-amber-400 shrink-0" />
            <span>
              {tr('إعدادات التطبيق وتخصيص النظام', 'Platform Settings & Preferences')}
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {tr(
              'تعديل اللغة، بيانات المدرس، نظام التقييم، الصفوف والمجموعات والنسخ الاحتياطي',
              'Configure platform language, teacher profile, grading scale, grades, groups & backups'
            )}
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-98 rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>
            {saving
              ? tr('جاري الحفظ...', 'Saving...')
              : tr('حفظ الإعدادات', 'Save Settings')}
          </span>
        </button>
      </div>

      {isDirty && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-bold rounded-xl flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              {tr(
                'تنبيه: لديك تعديلات غير محفوظة في الإعدادات — اضغط "حفظ الإعدادات" قبل المغادرة.',
                'Warning: You have unsaved settings changes — click "Save Settings" before leaving.'
              )}
            </span>
          </span>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{tr('حفظ الآن', 'Save Now')}</span>
          </button>
        </div>
      )}

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold rounded-xl flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            {tr(
              'تم حفظ الإعدادات بنجاح في قاعدة بيانات Firestore!',
              'Settings saved successfully to Firestore!'
            )}
          </span>
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

      {/* Platform Language Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <Languages className="w-4 h-4 text-amber-500" />
              <span>{tr('لغة المنصة (عربي / English)', 'Platform Language (Arabic / English)')}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {tr(
                'التبديل الفوري بين الواجهة العربية (RTL) والإنجليزية (LTR) في جميع أقسام المنصة',
                'Switch the entire platform instantly between Arabic (RTL) and English (LTR)'
              )}
            </p>
          </div>
          <LanguageSwitcher variant="card" className="w-full sm:w-80" />
        </div>
      </div>

      {/* Teacher Profile & App Identity */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4">
        <h3 className="font-bold text-slate-900 dark:text-white text-base pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <User className="w-4 h-4 text-indigo-600 dark:text-amber-400" />
          <span>{tr('البيانات الأساسية للمدرس والتطبيق', 'Teacher & Platform Profile')}</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {tr('اسم المدرس', 'Teacher Name')}
            </label>
            <input
              type="text"
              value={formData.teacherName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, teacherName: e.target.value }))
              }
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-950 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-start"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {tr('اسم التطبيق', 'Platform Title')}
            </label>
            <input
              type="text"
              value={formData.appTitle}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, appTitle: e.target.value }))
              }
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-950 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-start"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {tr('المادة الافتراضية', 'Default Subject')}
            </label>
            <input
              type="text"
              value={formData.defaultSubject}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, defaultSubject: e.target.value }))
              }
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-950 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-start"
            />
          </div>
        </div>
      </div>

      {/* Grading Scale Configuration */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600 dark:text-amber-400" />
              <span>{tr('تعديل نظام التقييم والنسب المئوية', 'Grading Scale & Thresholds')}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {tr(
                'تحديد التقديرات بناءً على النسبة المئوية التي يحصل عليها الطالب تلقائياً',
                'Automatically assign grade labels based on percentage thresholds'
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={handleRequestRestoreGradingDefaults}
            className="text-xs text-indigo-600 dark:text-amber-400 hover:underline font-semibold cursor-pointer"
          >
            {tr('استعادة الافتراضي', 'Restore Defaults')}
          </button>
        </div>

        <div className="space-y-3">
          {formData.gradingScale.map((item, idx) => (
            <div
              key={item.id}
              className="grid grid-cols-2 sm:grid-cols-12 items-end gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/70 text-xs"
            >
              <div className="col-span-2 sm:col-span-3">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                  {tr('اسم التقدير', 'Grade Label')}
                </span>
                <input
                  type="text"
                  value={item.label}
                  onChange={(e) => handleScaleChange(idx, 'label', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white text-start"
                />
              </div>

              <div className="col-span-1 sm:col-span-2">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                  {tr('الحد الأدنى %', 'Min %')}
                </span>
                <input
                  type="number"
                  value={item.minPercent}
                  onChange={(e) =>
                    handleScaleChange(idx, 'minPercent', parseFloat(e.target.value) || 0)
                  }
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-center font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="col-span-1 sm:col-span-2">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                  {tr('الحد الأقصى %', 'Max %')}
                </span>
                <input
                  type="number"
                  value={item.maxPercent}
                  onChange={(e) =>
                    handleScaleChange(idx, 'maxPercent', parseFloat(e.target.value) || 0)
                  }
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-center font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="col-span-1 sm:col-span-2 flex items-center h-8">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.isPass}
                    onChange={(e) =>
                      handleScaleChange(idx, 'isPass', e.target.checked)
                    }
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {tr('يعتبر ناجحاً', 'Passing')}
                  </span>
                </label>
              </div>

              <div className="col-span-1 sm:col-span-3 flex justify-end">
                <span
                  className={`px-2.5 py-1 rounded-md text-xs font-bold border ${item.badgeBg}`}
                >
                  {tr('معاينة:', 'Preview:')} {item.label}
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
            <span>{tr('الصفوف الدراسية', 'Grades')}</span>
            <span className="text-xs text-slate-400 font-normal font-mono">
              ({(formData.grades || []).length})
            </span>
          </h4>

          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={newGrade}
              onChange={(e) => setNewGrade(e.target.value)}
              placeholder={tr('صف دراسي جديد...', 'New grade...')}
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
            {(formData.grades || []).map((g) => (
              <div
                key={g}
                className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs"
              >
                <span className="text-slate-700 dark:text-slate-200 font-medium">
                  {g}
                </span>
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
            <span>{tr('المجموعات والفصول', 'Groups & Classes')}</span>
            <span className="text-xs text-slate-400 font-normal font-mono">
              ({(formData.groups || []).length})
            </span>
          </h4>

          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={newGroup}
              onChange={(e) => setNewGroup(e.target.value)}
              placeholder={tr('مجموعة جديدة...', 'New group...')}
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
            {(formData.groups || []).map((grp) => (
              <div
                key={grp}
                className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs"
              >
                <span className="text-slate-700 dark:text-slate-200 font-medium">
                  {grp}
                </span>
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
            <span>{tr('المواد الدراسية', 'Subjects')}</span>
            <span className="text-xs text-slate-400 font-normal font-mono">
              ({(formData.subjects || []).length})
            </span>
          </h4>

          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              placeholder={tr('مادة جديدة...', 'New subject...')}
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
            {(formData.subjects || []).map((s) => (
              <div
                key={s}
                className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs"
              >
                <span className="text-slate-700 dark:text-slate-200 font-medium">
                  {s}
                </span>
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
          <span>{tr('النسخ الاحتياطي وإدارة البيانات', 'Backup & Data Management')}</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Export JSON */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/70 flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">
                {tr('تصدير نسخة احتياطية كاملة', 'Export Full Backup')}
              </h4>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                {tr(
                  'تحميل ملف JSON يحتوي على كافة بيانات الطلاب والامتحانات والنتائج والإعدادات لحفظها في أمان.',
                  'Download a JSON archive of students, exams, results & settings.'
                )}
              </p>
            </div>
            <button
              onClick={handleExportJsonBackup}
              className="mt-4 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white font-bold rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              {tr('تحميل نسخة احتياطية (JSON)', 'Download Backup (JSON)')}
            </button>
          </div>

          {/* Import JSON */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/70 flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">
                {tr('استيراد نسخة احتياطية', 'Restore Backup')}
              </h4>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                {tr(
                  'استعادة البيانات من ملف نسخة احتياطية سابق (JSON) ومزامنتها مع قاعدة البيانات.',
                  'Restore records from a previously exported JSON backup.'
                )}
              </p>
            </div>
            <label className="mt-4 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>{tr('اختيار ملف للاستيراد', 'Choose File to Import')}</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>
          </div>

          {/* Quick Demo Sample Data & Reset */}
          <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/50 flex flex-col justify-between">
            <div>
              <h4 className="font-bold text-indigo-950 dark:text-indigo-200 text-sm mb-1">
                {tr('بيانات تجريبية واختبار', 'Demo & Verification Data')}
              </h4>
              <p className="text-indigo-900/70 dark:text-indigo-300/80 text-[11px] leading-relaxed">
                {tr(
                  'يمكنك ملء التطبيق ببيانات تجريبية أو إدارة إعادة الضبط من خلال النوافذ الآمنة.',
                  'Run verification helpers or safely manage academic reset.'
                )}
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
                {seeding
                  ? tr('جاري التوليد...', 'Generating...')
                  : tr('توليد بيانات تجريبية', 'Seed Sample Data')}
              </button>

              <button
                type="button"
                onClick={() => setPendingAction('clear')}
                className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                title={tr('إفراغ كافة البيانات الأكاديمية', 'Clear academic data')}
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
            {tr('الأمان والحساب الأكاديمي', 'Security & Account')}
          </span>
          <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            {tr('Google SSO محمي', 'Google SSO Protected')}
          </span>
        </h3>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70">
          <div className="space-y-1 min-w-0">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {tr('حساب Google النشط حالياً:', 'Active Google Account:')}
            </div>
            <div
              className="font-mono font-bold text-slate-900 dark:text-white text-sm truncate max-w-full"
              dir="ltr"
            >
              {currentUser?.email || 'mr.mohamed.hesham93@gmail.com'}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {tr(
                'تسجيل الدخول مقتصر على حسابات الأستاذ محمد هشام الرسمية المعتمدة فقط.',
                'Access is restricted to Mr. Mohamed Hesham authorized accounts.'
              )}
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
              <span>{tr('تسجيل الخروج من الحساب', 'Sign Out')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Safe Responsive Confirmation Dialog */}
      {pendingAction && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-hidden"
          onClick={() => setPendingAction(null)}
          dir={dir}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[92dvh] overflow-y-auto"
          >
            <h4 className="font-black text-base text-slate-900 dark:text-white">
              {pendingAction === 'clear'
                ? tr('تأكيد إفراغ البيانات الأكاديمية', 'Confirm Clear Academic Data')
                : pendingAction === 'seed'
                ? tr('توليد بيانات تجريبية', 'Seed Sample Data')
                : tr('تأكيد استيراد النسخة الاحتياطية', 'Confirm Backup Import')}
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {pendingAction === 'clear'
                ? tr(
                    'هل أنت متأكد تماماً من حذف جميع الطلاب والامتحانات والنتائج؟ (سجلات قسم المالية والأوفر تايم محمية ولا تُمس).',
                    'Are you sure you want to delete all students, exams, and results? (Finance & Overtime records remain protected).'
                  )
                : pendingAction === 'seed'
                ? tr(
                    'هل ترغب في تشغيل دالة التحقق من البيانات التجريبية؟',
                    'Do you want to run the sample data verification helper?'
                  )
                : tr(
                    `تم العثور على نسخة احتياطية تحتوي على ${
                      pendingAction.data.students?.length || 0
                    } طالب و ${pendingAction.data.exams?.length || 0} امتحان. هل ترغب في استيرادها؟`,
                    `Backup contains ${pendingAction.data.students?.length || 0} students and ${
                      pendingAction.data.exams?.length || 0
                    } exams. Do you want to import it?`
                  )}
            </p>
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPendingAction(null)}
                className="px-4 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl cursor-pointer text-center"
              >
                {tr('إلغاء', 'Cancel')}
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
                    showNotice(
                      tr(
                        'تم استيراد النسخة الاحتياطية بنجاح!',
                        'Backup imported successfully!'
                      )
                    );
                  }
                }}
                className={`px-4 py-2 text-xs font-black text-white rounded-xl cursor-pointer text-center ${
                  pendingAction === 'clear'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {tr('تأكيد المتابعة', 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal
        isOpen={settingsConfirmModal.isOpen}
        zIndexClass="z-[80]"
        title={settingsConfirmModal.title}
        message={settingsConfirmModal.message}
        confirmText={settingsConfirmModal.confirmText}
        cancelText={tr('تراجع', 'Cancel')}
        isDestructive={settingsConfirmModal.isDestructive}
        onConfirm={async () => {
          await settingsConfirmModal.onConfirm();
          setSettingsConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() =>
          setSettingsConfirmModal((prev) => ({ ...prev, isOpen: false }))
        }
        onClose={() =>
          setSettingsConfirmModal((prev) => ({ ...prev, isOpen: false }))
        }
      />
    </div>
  );
};
