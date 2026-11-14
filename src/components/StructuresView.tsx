import React, { useState, useMemo, useEffect } from 'react';
import {
  Layers,
  Plus,
  Search,
  Edit3,
  Trash2,
  CheckCircle2,
  X,
  Save,
  FileSpreadsheet,
  Users,
  BookOpen,
  Calendar,
  Compass,
  Filter,
  CheckSquare,
  Square,
  Sliders,
  BarChart3,
  ChevronRight,
  ChevronLeft,
  UserCheck,
  AlertCircle,
  Sparkles,
  FileText,
} from 'lucide-react';
import {
  Student,
  TeacherSettings,
  ExamStructure,
  StudentStructureProgress,
  StructureQuestionItem,
  StructureQuestionScore,
} from '../types';
import {
  UAE_GRADES,
  ACADEMIC_YEARS,
  ACADEMIC_TERMS,
  ACADEMIC_TRACKS,
  DEFAULT_SETTINGS,
} from '../services/firebase';
import {
  getEffectiveEnrollmentStatus,
  ENROLLMENT_STATUS_META,
} from '../utils/studentStatus';
import { exportStructuresReportExcel, loadExcelPreferences } from '../utils/excel';
import { ExcelExportModal } from './ExcelExportModal';

interface StructuresViewProps {
  structures: ExamStructure[];
  structureProgress: StudentStructureProgress[];
  students: Student[];
  settings: TeacherSettings;
  onAddStructure: (data: Omit<ExamStructure, 'id'>) => Promise<string>;
  onUpdateStructure: (id: string, data: Partial<ExamStructure>) => Promise<void>;
  onDeleteStructure: (structure: ExamStructure) => void;
  onSaveProgress: (
    data: Omit<StudentStructureProgress, 'id'> & { id?: string }
  ) => Promise<StudentStructureProgress>;
  onDeleteProgress: (progress: StudentStructureProgress) => void;
  onOpenStudentProfile: (student: Student) => void;
}

export const StructuresView: React.FC<StructuresViewProps> = ({
  structures,
  structureProgress,
  students,
  settings = DEFAULT_SETTINGS,
  onAddStructure,
  onUpdateStructure,
  onDeleteStructure,
  onSaveProgress,
  onDeleteProgress,
  onOpenStudentProfile,
}) => {
  // Global filters for الهياكل
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGrade, setFilterGrade] = useState('الكل');
  const [filterTerm, setFilterTerm] = useState('الكل');
  const [filterTrack, setFilterTrack] = useState('الكل');
  const [filterYear, setFilterYear] = useState('الكل');
  const [filterSubject, setFilterSubject] = useState('الكل');
  const [filterStatus, setFilterStatus] = useState('exclude_completed');
  const [studentListScope, setStudentListScope] = useState<'matching' | 'all' | 'recorded_only'>('matching');

  // Selected Structure ID
  const [selectedStructureId, setSelectedStructureId] = useState<string>(
    structures[0]?.id || ''
  );

  // Create/Edit Structure Modal
  const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);
  const [editingStructure, setEditingStructure] = useState<ExamStructure | null>(null);
  const [isExcelExportModalOpen, setIsExcelExportModalOpen] = useState(false);

  // Student Question Scoring Modal
  const [scoringModalState, setScoringModalState] = useState<{
    isOpen: boolean;
    structure: ExamStructure | null;
    student: Student | null;
    existingProgress: StudentStructureProgress | null;
  }>({
    isOpen: false,
    structure: null,
    student: null,
    existingProgress: null,
  });

  // Add Student Quick Picker inside Selected Structure
  const [studentPickerSearch, setStudentPickerSearch] = useState('');
  const [showAddAnyStudentPicker, setShowAddAnyStudentPicker] = useState(false);

  const gradesList = useMemo(() => {
    const base = settings?.grades && settings.grades.length > 0 ? settings.grades : UAE_GRADES;
    const fromData = structures.map((s) => s.grade).filter(Boolean);
    return Array.from(new Set([...base, ...fromData]));
  }, [settings?.grades, structures]);

  const subjectsList = useMemo(() => {
    const base = settings?.subjects && settings.subjects.length > 0 ? settings.subjects : ['Mathematics'];
    const fromData = structures.map((s) => s.subject).filter(Boolean);
    return Array.from(new Set([...base, ...fromData]));
  }, [settings?.subjects, structures]);

  const tracksList = useMemo(() => {
    const fromData = structures.map((s) => s.track).filter(Boolean);
    return Array.from(new Set([...ACADEMIC_TRACKS, ...fromData]));
  }, [structures]);

  const yearsList = useMemo(() => {
    const fromData = structures.map((s) => s.academicYear).filter(Boolean);
    return Array.from(new Set([...ACADEMIC_YEARS, ...fromData]));
  }, [structures]);

  // Filtered Structures
  const filteredStructures = useMemo(() => {
    return [...structures]
      .filter((st) => {
        if (filterGrade !== 'الكل' && st.grade !== filterGrade) return false;
        if (filterTerm !== 'الكل' && st.term !== filterTerm) return false;
        if (filterTrack !== 'الكل' && st.track !== filterTrack) return false;
        if (filterYear !== 'الكل' && st.academicYear !== filterYear) return false;
        if (filterSubject !== 'الكل' && st.subject !== filterSubject) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          const inTitle = (st.title || '').toLowerCase().includes(q);
          const inSubj = (st.subject || '').toLowerCase().includes(q);
          const inGrade = (st.grade || '').toLowerCase().includes(q);
          const inCode = (st.code || '').toLowerCase().includes(q);
          if (!inTitle && !inSubj && !inGrade && !inCode) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [structures, filterGrade, filterTerm, filterTrack, filterYear, filterSubject, searchQuery]);

  // Keep valid selectedStructureId
  useEffect(() => {
    if (filteredStructures.length === 0) {
      setSelectedStructureId('');
      return;
    }
    if (!filteredStructures.some((s) => s.id === selectedStructureId)) {
      setSelectedStructureId(filteredStructures[0].id);
    }
  }, [filteredStructures, selectedStructureId]);

  const selectedStructure = useMemo(
    () => filteredStructures.find((s) => s.id === selectedStructureId) || null,
    [filteredStructures, selectedStructureId]
  );

  // Student map for quick lookups
  const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

  // Progress records for selected structure
  const selectedStructureProgress = useMemo(() => {
    if (!selectedStructure) return [];
    return structureProgress.filter((p) => p.structureId === selectedStructure.id);
  }, [structureProgress, selectedStructure]);

  // Filtered students visible in the selected structure workspace
  const workspaceStudentRows = useMemo(() => {
    if (!selectedStructure) return [];

    const progressByStudentId = new Map<string, StudentStructureProgress>();
    selectedStructureProgress.forEach((p) => {
      progressByStudentId.set(p.studentDocId, p);
    });

    // Combine registered students + any orphaned progress records safely
    const matchingStudents = students.filter((st) => {
      // Status filter
      const effStatus = getEffectiveEnrollmentStatus(st);
      if (filterStatus === 'exclude_completed' && effStatus === 'completed') return false;
      if (filterStatus !== 'الكل' && filterStatus !== 'exclude_completed' && effStatus !== filterStatus) {
        return false;
      }

      const hasProgress = progressByStudentId.has(st.id);
      if (studentListScope === 'recorded_only') {
        return hasProgress;
      }
      if (studentListScope === 'all') {
        return true;
      }

      // 'matching' scope: if student already has progress for this structure, always include;
      // otherwise match grade (and optionally term/track/year if defined on student)
      if (hasProgress) return true;
      if (st.grade !== selectedStructure.grade) return false;
      if (st.term && selectedStructure.term && st.term !== selectedStructure.term) return false;
      if (st.track && selectedStructure.track && st.track !== selectedStructure.track) return false;
      if (
        st.academicYear &&
        selectedStructure.academicYear &&
        st.academicYear !== selectedStructure.academicYear
      ) {
        return false;
      }
      return true;
    });

    const filteredBySearch = matchingStudents.filter((st) => {
      if (!studentPickerSearch.trim()) return true;
      const q = studentPickerSearch.trim().toLowerCase();
      return (
        st.name.toLowerCase().includes(q) ||
        st.studentId.toLowerCase().includes(q) ||
        (st.group || '').toLowerCase().includes(q)
      );
    });

    return filteredBySearch
      .map((student) => ({
        student,
        progress: progressByStudentId.get(student.id) || null,
      }))
      .sort((a, b) => {
        if (a.progress && !b.progress) return -1;
        if (!a.progress && b.progress) return 1;
        if (a.progress && b.progress) {
          return b.progress.overallAccuracyPercentage - a.progress.overallAccuracyPercentage;
        }
        return a.student.name.localeCompare(b.student.name, 'ar');
      });
  }, [
    selectedStructure,
    selectedStructureProgress,
    students,
    filterStatus,
    studentListScope,
    studentPickerSearch,
  ]);

  // Cohort Question-by-Question Accuracy Analytics for Selected Structure
  const questionAnalytics = useMemo(() => {
    if (!selectedStructure) return [];
    const totalQ = Math.max(1, selectedStructure.totalQuestions || selectedStructure.questions?.length || 1);
    const activeProgress = selectedStructureProgress.filter((p) => {
      const st = studentMap.get(p.studentDocId);
      if (!st) return true;
      const effStatus = getEffectiveEnrollmentStatus(st);
      if (filterStatus === 'exclude_completed' && effStatus === 'completed') return false;
      if (filterStatus !== 'الكل' && filterStatus !== 'exclude_completed' && effStatus !== filterStatus) {
        return false;
      }
      return true;
    });

    const list: Array<{
      questionNumber: number;
      title?: string;
      topic?: string;
      solvedByCount: number;
      totalStudents: number;
      avgAccuracy: number;
    }> = [];

    for (let q = 1; q <= totalQ; q++) {
      const qMeta = selectedStructure.questions?.find((item) => item.questionNumber === q);
      const solvedRecords = activeProgress
        .map((p) => (p.questionScores || []).find((qs) => qs.questionNumber === q))
        .filter((qs): qs is StructureQuestionScore => Boolean(qs && qs.solved));

      const avgAccuracy =
        solvedRecords.length > 0
          ? Math.round(
              (solvedRecords.reduce((acc, item) => acc + (Number(item.accuracyPercentage) || 0), 0) /
                solvedRecords.length) *
                10
            ) / 10
          : 0;

      list.push({
        questionNumber: q,
        title: qMeta?.title,
        topic: qMeta?.topic,
        solvedByCount: solvedRecords.length,
        totalStudents: activeProgress.length,
        avgAccuracy,
      });
    }
    return list;
  }, [selectedStructure, selectedStructureProgress, studentMap, filterStatus]);

  // Summary metrics for selected structure
  const structureSummary = useMemo(() => {
    if (!selectedStructure) {
      return { recordedCount: 0, avgSolved: 0, avgCompletion: 0, avgAccuracy: 0 };
    }
    const relevantProgress = selectedStructureProgress.filter((p) => {
      const st = studentMap.get(p.studentDocId);
      if (!st) return true;
      const eff = getEffectiveEnrollmentStatus(st);
      if (filterStatus === 'exclude_completed' && eff === 'completed') return false;
      if (filterStatus !== 'الكل' && filterStatus !== 'exclude_completed' && eff !== filterStatus) {
        return false;
      }
      return true;
    });

    const count = relevantProgress.length;
    if (count === 0) {
      return { recordedCount: 0, avgSolved: 0, avgCompletion: 0, avgAccuracy: 0 };
    }

    const avgSolved =
      Math.round((relevantProgress.reduce((a, b) => a + (b.solvedCount || 0), 0) / count) * 10) / 10;
    const avgCompletion =
      Math.round(
        (relevantProgress.reduce((a, b) => a + (b.completionPercentage || 0), 0) / count) * 10
      ) / 10;
    const avgAccuracy =
      Math.round(
        (relevantProgress.reduce((a, b) => a + (b.overallAccuracyPercentage || 0), 0) / count) * 10
      ) / 10;

    return { recordedCount: count, avgSolved, avgCompletion, avgAccuracy };
  }, [selectedStructure, selectedStructureProgress, studentMap, filterStatus]);

  const handleExportCurrentStructuresExcel = () => {
    const prefs = loadExcelPreferences();
    exportStructuresReportExcel(structures, structureProgress, students, {
      ...prefs,
      structureId: selectedStructure ? selectedStructure.id : 'الكل',
      grade: filterGrade,
      term: filterTerm,
      track: filterTrack,
      academicYear: filterYear,
      subject: filterSubject,
      enrollmentStatus: filterStatus,
      filterLabel: selectedStructure
        ? `${selectedStructure.title} (${selectedStructure.grade} - ${selectedStructure.term} - ${selectedStructure.track})`
        : `الصف: ${filterGrade} | الفصل: ${filterTerm} | المسار: ${filterTrack}`,
    });
  };

  return (
    <div id="structures-view" className="space-y-5 text-right">
      {/* Page Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-amber-500" />
            <span>قسم الهياكل ومتابعة حل الأسئلة ونسب الصحة</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            تسجيل الهياكل بالصف والفصل والمسار والسنة والمادة، ورصد عدد الأسئلة المحلولة ونسبة صحة كل سؤال لكل طالب
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExcelExportModalOpen(true)}
            disabled={structures.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
            title="فتح مركز تصدير Excel المخصص للهياكل (وضع الهاتف / الكمبيوتر / الرسوم البيانية / اللوجو / الفلاتر)"
          >
            <Sliders className="w-4 h-4 text-amber-500" />
            <span>تصدير Excel مخصص للهياكل</span>
          </button>

          <button
            type="button"
            onClick={handleExportCurrentStructuresExcel}
            disabled={structures.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 rounded-xl transition cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>تصدير شيت الهياكل</span>
          </button>

          <button
            id="btn-add-structure"
            type="button"
            onClick={() => {
              setEditingStructure(null);
              setIsStructureModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-black text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl transition cursor-pointer shadow-md shadow-amber-500/20 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة هيكل جديد</span>
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم الهيكل أو الكود أو المادة..."
              className="w-full pr-9 pl-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-amber-500"
            />
          </div>

          <select
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
            title="الصف الدراسي"
          >
            <option value="الكل">كل الصفوف</option>
            {gradesList.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          <select
            value={filterTerm}
            onChange={(e) => setFilterTerm(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
            title="الفصل الدراسي"
          >
            <option value="الكل">كل الفصول</option>
            {ACADEMIC_TERMS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <select
            value={filterTrack}
            onChange={(e) => setFilterTrack(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
            title="المسار"
          >
            <option value="الكل">كل المسارات</option>
            {tracksList.map((tr) => (
              <option key={tr} value={tr}>{tr}</option>
            ))}
          </select>

          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
            title="السنة الدراسية"
          >
            <option value="الكل">كل السنوات</option>
            {yearsList.map((yr) => (
              <option key={yr} value={yr}>{yr}</option>
            ))}
          </select>

          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
            title="المادة"
          >
            <option value="الكل">كل المواد</option>
            {subjectsList.map((sb) => (
              <option key={sb} value={sb}>{sb}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
            title="حالة ملف الطالب"
          >
            <option value="exclude_completed">استبعاد منتهي الملف</option>
            <option value="active">ملف فعال فقط</option>
            <option value="completed">منتهي الكورس فقط</option>
            <option value="paused">متوقف مؤقتاً</option>
            <option value="withdrawn">منقطع</option>
            <option value="الكل">جميع حالات الملف</option>
          </select>
        </div>
      </div>

      {/* Empty State when no structures exist */}
      {structures.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Layers className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              لم يتم تسجيل أي هياكل بعد
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
              ابدأ بإضافة أول هيكل مع تحديد الصف والفصل والمسار والسنة الدراسية والمادة وعدد الأسئلة، ثم رصد حل كل طالب ونسبة صحة كل سؤال بسهولة.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingStructure(null);
              setIsStructureModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-black text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل أول هيكل</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left/Right Column 1: List of Structures */}
          <div className="lg:col-span-4 space-y-2.5">
            <div className="flex items-center justify-between px-1 text-xs">
              <span className="font-black text-slate-700 dark:text-slate-200">
                قائمة الهياكل المسجلة ({filteredStructures.length})
              </span>
              {(filterGrade !== 'الكل' ||
                filterTerm !== 'الكل' ||
                filterTrack !== 'الكل' ||
                filterYear !== 'الكل' ||
                filterSubject !== 'الكل' ||
                searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterGrade('الكل');
                    setFilterTerm('الكل');
                    setFilterTrack('الكل');
                    setFilterYear('الكل');
                    setFilterSubject('الكل');
                  }}
                  className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  إعادة ضبط الفلاتر
                </button>
              )}
            </div>

            {filteredStructures.length === 0 ? (
              <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                لا توجد هياكل تطابق معايير البحث الحالية
              </div>
            ) : (
              <div className="space-y-2 max-h-[680px] overflow-y-auto pl-0.5">
                {filteredStructures.map((st) => {
                  const isSelected = selectedStructure?.id === st.id;
                  const countRecorded = structureProgress.filter((p) => p.structureId === st.id).length;
                  const stProgress = structureProgress.filter((p) => p.structureId === st.id);
                  const avgAcc =
                    stProgress.length > 0
                      ? Math.round(
                          stProgress.reduce((a, b) => a + (b.overallAccuracyPercentage || 0), 0) /
                            stProgress.length
                        )
                      : 0;

                  return (
                    <div
                      key={st.id}
                      onClick={() => setSelectedStructureId(st.id)}
                      className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                        isSelected
                          ? 'bg-amber-50/70 dark:bg-amber-950/25 border-amber-500 ring-1 ring-amber-500/30'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-black text-sm text-slate-900 dark:text-white truncate">
                              {st.title}
                            </h3>
                            {st.code && (
                              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
                                {st.code}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                            {st.grade} • {st.term} • مسار {st.track}
                          </p>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 font-medium">
                            {st.subject} • <span className="font-mono">{st.academicYear}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingStructure(st);
                              setIsStructureModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                            title="تعديل الهيكل"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteStructure(st)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg cursor-pointer"
                            title="حذف الهيكل"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono tabular-nums">
                        <span className="text-slate-600 dark:text-slate-300">
                          الأسئلة: <strong className="text-slate-900 dark:text-white">{st.totalQuestions}</strong>
                        </span>
                        <span className="text-slate-600 dark:text-slate-300">
                          طلاب مرصودين: <strong className="text-amber-600 dark:text-amber-400">{countRecorded}</strong>
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          {countRecorded > 0 ? `${avgAcc}% صحة` : 'جديد'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Column 2: Selected Structure Details, Question Accuracy Analytics & Student Records */}
          <div className="lg:col-span-8 space-y-4">
            {selectedStructure && (
              <>
                {/* Selected Structure Header & Summary Metrics */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-black text-slate-900 dark:text-white">
                          {selectedStructure.title}
                        </h2>
                        {selectedStructure.code && (
                          <span className="font-mono text-[11px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700">
                            {selectedStructure.code}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>الصف: <strong className="text-slate-800 dark:text-slate-200">{selectedStructure.grade}</strong></span>
                        <span>•</span>
                        <span>الفصل: <strong className="text-slate-800 dark:text-slate-200">{selectedStructure.term}</strong></span>
                        <span>•</span>
                        <span>المسار: <strong className="text-amber-600 dark:text-amber-400">{selectedStructure.track}</strong></span>
                        <span>•</span>
                        <span>السنة: <strong className="font-mono text-slate-800 dark:text-slate-200">{selectedStructure.academicYear}</strong></span>
                        <span>•</span>
                        <span>المادة: <strong className="text-slate-800 dark:text-slate-200">{selectedStructure.subject}</strong></span>
                        {selectedStructure.group && selectedStructure.group !== 'الكل' && (
                          <>
                            <span>•</span>
                            <span>الشعبة: <strong className="text-slate-800 dark:text-slate-200">{selectedStructure.group}</strong></span>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAddAnyStudentPicker((prev) => !prev)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-black text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition cursor-pointer shrink-0"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>تسجيل حل طالب بالهيكل</span>
                    </button>
                  </div>

                  {/* Quick Summary KPIs (flat tabular cards, no heavy shadows) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                        إجمالي أسئلة الهيكل
                      </span>
                      <span className="text-xl font-black text-slate-900 dark:text-white font-mono tabular-nums mt-0.5 block">
                        {selectedStructure.totalQuestions} سؤال
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                        الطلاب المرصودين
                      </span>
                      <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono tabular-nums mt-0.5 block">
                        {structureSummary.recordedCount} طالب
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                        متوسط الأسئلة المحلولة
                      </span>
                      <span className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono tabular-nums mt-0.5 block">
                        {structureSummary.avgSolved} / {selectedStructure.totalQuestions}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                        متوسط نسبة الصحة العامة
                      </span>
                      <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-0.5 block">
                        {structureSummary.avgAccuracy}%
                      </span>
                    </div>
                  </div>

                  {/* Quick Any-Student Picker Dropdown when clicking "تسجيل حل طالب بالهيكل" */}
                  {showAddAnyStudentPicker && (
                    <div className="p-3.5 bg-amber-50/60 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800/60 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          اختر طالباً من القائمة لرصد حل الأسئلة ونسبة صحة كل سؤال:
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowAddAnyStudentPicker(false)}
                          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={studentPickerSearch}
                        onChange={(e) => setStudentPickerSearch(e.target.value)}
                        placeholder="اكتب اسم الطالب أو رقمه التعريفي..."
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                      />
                      <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        {students
                          .filter((st) => {
                            if (!studentPickerSearch.trim()) return true;
                            const q = studentPickerSearch.trim().toLowerCase();
                            return (
                              st.name.toLowerCase().includes(q) ||
                              st.studentId.toLowerCase().includes(q)
                            );
                          })
                          .slice(0, 25)
                          .map((st) => {
                            const existing = selectedStructureProgress.find(
                              (p) => p.studentDocId === st.id
                            ) || null;
                            return (
                              <button
                                key={st.id}
                                type="button"
                                onClick={() => {
                                  setShowAddAnyStudentPicker(false);
                                  setScoringModalState({
                                    isOpen: true,
                                    structure: selectedStructure,
                                    student: st,
                                    existingProgress: existing,
                                  });
                                }}
                                className="w-full px-3 py-2 text-right hover:bg-amber-50 dark:hover:bg-amber-950/30 flex items-center justify-between gap-2 text-xs cursor-pointer"
                              >
                                <div>
                                  <span className="font-bold text-slate-900 dark:text-white">{st.name}</span>
                                  <span className="text-[11px] text-slate-400 mr-2">
                                    ({st.grade}{st.track ? ` • ${st.track}` : ''})
                                  </span>
                                </div>
                                <span className="font-mono text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                                  {existing ? `${existing.solvedCount}/${existing.totalQuestions} (${existing.overallAccuracyPercentage}%)` : 'رصد جديد ←'}
                                </span>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Per-Question Average Accuracy Grid */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <BarChart3 className="w-4 h-4 text-amber-500" />
                        <span>متوسط نسبة صحة كل سؤال على مستوى الطلاب ({selectedStructure.totalQuestions} سؤال)</span>
                      </span>
                      <span className="text-[11px] text-slate-400">
                        مرتبط بالطلاب المرصودين بالهيكل
                      </span>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2">
                      {questionAnalytics.map((qa) => {
                        const accColor =
                          qa.solvedByCount === 0
                            ? 'text-slate-400 border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40'
                            : qa.avgAccuracy >= 80
                            ? 'text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/60 dark:bg-emerald-950/30'
                            : qa.avgAccuracy >= 60
                            ? 'text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/70 bg-amber-50/60 dark:bg-amber-950/30'
                            : 'text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/70 bg-rose-50/60 dark:bg-rose-950/30';

                        return (
                          <div
                            key={qa.questionNumber}
                            className={`p-2 rounded-xl border text-center ${accColor}`}
                            title={qa.title ? `س${qa.questionNumber}: ${qa.title}` : `سؤال ${qa.questionNumber}`}
                          >
                            <div className="text-[10px] font-bold truncate">
                              س{qa.questionNumber}{qa.title ? ` • ${qa.title}` : ''}
                            </div>
                            <div className="text-sm font-black font-mono tabular-nums mt-0.5">
                              {qa.solvedByCount > 0 ? `${qa.avgAccuracy}%` : '-'}
                            </div>
                            <div className="text-[9px] opacity-75 font-mono">
                              {qa.solvedByCount} طالب
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Student Progress Table for Selected Structure */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                        سجل الطلاب في هذا الهيكل ونسبة صحة كل سؤال
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        اضغط على «رصد / تعديل الأسئلة» لتسجيل عدد الأسئلة التي حلّها الطالب ونسبة صحة كل سؤال بالتفصيل
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => setStudentListScope('matching')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                            studentListScope === 'matching'
                              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          المطابقين للهيكل
                        </button>
                        <button
                          type="button"
                          onClick={() => setStudentListScope('recorded_only')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                            studentListScope === 'recorded_only'
                              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          المرصودين فقط ({selectedStructureProgress.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setStudentListScope('all')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                            studentListScope === 'all'
                              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          كل الطلاب
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Quick filter input inside table */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      value={studentPickerSearch}
                      onChange={(e) => setStudentPickerSearch(e.target.value)}
                      placeholder="ابحث داخل قائمة طلاب هذا الهيكل بالاسم أو الكود..."
                      className="w-full pr-9 pl-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  {workspaceStudentRows.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        لا يوجد طلاب مطابقين في هذا النطاق حالياً
                      </p>
                      <p className="text-[11px] text-slate-400">
                        يمكنك اختيار «كل الطلاب» أعلى الجدول أو الضغط على «تسجيل حل طالب بالهيكل» لربط أي طالب مباشرة.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-800">
                          <tr>
                            <th className="py-2.5 px-3">الطالب</th>
                            <th className="py-2.5 px-3">الصف / الفصل / المسار / المادة</th>
                            <th className="py-2.5 px-3 text-center">الأسئلة المحلولة</th>
                            <th className="py-2.5 px-3 text-center">متوسط الصحة %</th>
                            <th className="py-2.5 px-3">نسب صحة كل سؤال</th>
                            <th className="py-2.5 px-3 text-center">إجراءات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                          {workspaceStudentRows.map(({ student, progress }) => {
                            const effStatus = getEffectiveEnrollmentStatus(student);
                            const stMeta = ENROLLMENT_STATUS_META[effStatus];
                            const totalQ = progress?.totalQuestions || selectedStructure.totalQuestions;
                            const solvedCount = progress?.solvedCount || 0;
                            const completionPct = progress?.completionPercentage || 0;
                            const accuracyPct = progress?.overallAccuracyPercentage || 0;

                            return (
                              <tr
                                key={student.id}
                                className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                              >
                                <td className="py-2.5 px-3">
                                  <button
                                    type="button"
                                    onClick={() => onOpenStudentProfile(student)}
                                    className="font-extrabold text-slate-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 text-right cursor-pointer block"
                                  >
                                    {student.name}
                                  </button>
                                  <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                                    <span>{student.studentId}</span>
                                    <span>•</span>
                                    <span>{stMeta?.shortLabel}</span>
                                  </div>
                                </td>

                                <td className="py-2.5 px-3 text-[11px] text-slate-600 dark:text-slate-300">
                                  <div>{progress?.grade || student.grade} • {progress?.track || student.track || selectedStructure.track}</div>
                                  <div className="text-slate-400">
                                    {progress?.term || student.term || selectedStructure.term} • {progress?.subject || selectedStructure.subject} ({progress?.academicYear || student.academicYear || selectedStructure.academicYear})
                                  </div>
                                </td>

                                <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                                  {progress ? (
                                    <div>
                                      <span className="font-black text-slate-900 dark:text-white">
                                        {solvedCount} / {totalQ}
                                      </span>
                                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                        إنجاز {completionPct}%
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 text-[11px]">لم يُرصد</span>
                                  )}
                                </td>

                                <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                                  {progress ? (
                                    <span
                                      className={`font-black text-sm ${
                                        accuracyPct >= 80
                                          ? 'text-emerald-600 dark:text-emerald-400'
                                          : accuracyPct >= 60
                                          ? 'text-amber-600 dark:text-amber-400'
                                          : 'text-rose-600 dark:text-rose-400'
                                      }`}
                                    >
                                      {accuracyPct}%
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </td>

                                <td className="py-2.5 px-3 max-w-[260px]">
                                  {progress && progress.questionScores && progress.questionScores.length > 0 ? (
                                    <div className="flex flex-wrap gap-1 font-mono tabular-nums">
                                      {progress.questionScores.slice(0, 12).map((qs) => (
                                        <span
                                          key={qs.questionNumber}
                                          className={`px-1.5 py-0.5 rounded text-[10px] border ${
                                            !qs.solved
                                              ? 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                                              : qs.accuracyPercentage >= 80
                                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                              : qs.accuracyPercentage >= 50
                                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                                          }`}
                                          title={`سؤال ${qs.questionNumber}: ${qs.solved ? `${qs.accuracyPercentage}%` : 'لم يُحل'}`}
                                        >
                                          س{qs.questionNumber}:{qs.solved ? `${qs.accuracyPercentage}%` : '—'}
                                        </span>
                                      ))}
                                      {progress.questionScores.length > 12 && (
                                        <span className="text-[10px] text-slate-400 px-1">
                                          +{progress.questionScores.length - 12}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-[11px] text-slate-400">بانتظار رصد الأسئلة</span>
                                  )}
                                </td>

                                <td className="py-2.5 px-3 text-center">
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setScoringModalState({
                                          isOpen: true,
                                          structure: selectedStructure,
                                          student,
                                          existingProgress: progress,
                                        })
                                      }
                                      className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 font-bold text-[11px] transition cursor-pointer whitespace-nowrap"
                                    >
                                      {progress ? 'تعديل الأسئلة' : 'رصد الحل'}
                                    </button>
                                    {progress && (
                                      <button
                                        type="button"
                                        onClick={() => onDeleteProgress(progress)}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg cursor-pointer"
                                        title="حذف سجل الطالب من هذا الهيكل"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal 1: Create / Edit Structure */}
      <StructureFormModal
        isOpen={isStructureModalOpen}
        structureToEdit={editingStructure}
        settings={settings}
        gradesList={gradesList}
        subjectsList={subjectsList}
        tracksList={tracksList}
        yearsList={yearsList}
        onClose={() => {
          setIsStructureModalOpen(false);
          setEditingStructure(null);
        }}
        onSave={async (payload, id) => {
          if (id) {
            await onUpdateStructure(id, payload);
          } else {
            const newId = await onAddStructure(payload);
            setSelectedStructureId(newId);
          }
          setIsStructureModalOpen(false);
          setEditingStructure(null);
        }}
      />

      {/* Modal 2: Student Structure Question-by-Question Scoring Modal */}
      {scoringModalState.isOpen && scoringModalState.structure && scoringModalState.student && (
        <StudentStructureScoringModal
          isOpen={scoringModalState.isOpen}
          structure={scoringModalState.structure}
          student={scoringModalState.student}
          existingProgress={scoringModalState.existingProgress}
          settings={settings}
          gradesList={gradesList}
          subjectsList={subjectsList}
          tracksList={tracksList}
          yearsList={yearsList}
          onClose={() =>
            setScoringModalState({
              isOpen: false,
              structure: null,
              student: null,
              existingProgress: null,
            })
          }
          onSave={async (record) => {
            await onSaveProgress(record);
            setScoringModalState({
              isOpen: false,
              structure: null,
              student: null,
              existingProgress: null,
            });
          }}
        />
      )}

      {/* Modal 3: Custom Structures Excel Export Modal (exact Academic Report export engine) */}
      <ExcelExportModal
        isOpen={isExcelExportModalOpen}
        onClose={() => setIsExcelExportModalOpen(false)}
        students={students}
        exams={[]}
        allResults={[]}
        settings={settings}
        structures={structures}
        structureProgress={structureProgress}
        defaultExportMode="structures_reports"
        defaultGrade={filterGrade}
        defaultTerm={filterTerm}
        defaultTrack={filterTrack}
        defaultYear={filterYear}
        defaultSubject={filterSubject}
        defaultStatus={filterStatus}
        defaultStructureId={selectedStructure?.id || 'الكل'}
      />
    </div>
  );
};

/* ============================================================================
   SUBCOMPONENT: Structure Create / Edit Modal
   ============================================================================ */

interface StructureFormModalProps {
  isOpen: boolean;
  structureToEdit: ExamStructure | null;
  settings: TeacherSettings;
  gradesList: string[];
  subjectsList: string[];
  tracksList: string[];
  yearsList: string[];
  onClose: () => void;
  onSave: (data: Omit<ExamStructure, 'id'>, editId?: string) => Promise<void>;
}

const StructureFormModal: React.FC<StructureFormModalProps> = ({
  isOpen,
  structureToEdit,
  settings,
  gradesList,
  subjectsList,
  tracksList,
  yearsList,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [grade, setGrade] = useState(gradesList[0] || UAE_GRADES[0]);
  const [term, setTerm] = useState(ACADEMIC_TERMS[0]);
  const [track, setTrack] = useState(tracksList[0] || ACADEMIC_TRACKS[0]);
  const [customTrack, setCustomTrack] = useState('');
  const [academicYear, setAcademicYear] = useState(yearsList[0] || ACADEMIC_YEARS[0]);
  const [subject, setSubject] = useState(settings?.defaultSubject || subjectsList[0] || 'Mathematics');
  const [customSubject, setCustomSubject] = useState('');
  const [group, setGroup] = useState('الكل');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [totalQuestions, setTotalQuestions] = useState<number>(10);
  const [questions, setQuestions] = useState<StructureQuestionItem[]>([]);
  const [showQuestionTitlesEditor, setShowQuestionTitlesEditor] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (structureToEdit) {
      setTitle(structureToEdit.title || '');
      setCode(structureToEdit.code || '');
      setGrade(structureToEdit.grade || gradesList[0] || UAE_GRADES[0]);
      setTerm(structureToEdit.term || ACADEMIC_TERMS[0]);
      const isKnownTrack = tracksList.includes(structureToEdit.track);
      setTrack(isKnownTrack ? structureToEdit.track : '__custom__');
      setCustomTrack(isKnownTrack ? '' : structureToEdit.track || '');
      setAcademicYear(structureToEdit.academicYear || yearsList[0] || ACADEMIC_YEARS[0]);
      const isKnownSubj = subjectsList.includes(structureToEdit.subject);
      setSubject(isKnownSubj ? structureToEdit.subject : '__custom__');
      setCustomSubject(isKnownSubj ? '' : structureToEdit.subject || '');
      setGroup(structureToEdit.group || 'الكل');
      setDate(structureToEdit.date || new Date().toISOString().split('T')[0]);
      const count = Math.max(1, structureToEdit.totalQuestions || structureToEdit.questions?.length || 10);
      setTotalQuestions(count);
      setQuestions(
        Array.from({ length: count }, (_, idx) => {
          const found = structureToEdit.questions?.find((q) => q.questionNumber === idx + 1);
          return found || { questionNumber: idx + 1, title: '', topic: '' };
        })
      );
      setNotes(structureToEdit.notes || '');
      setShowQuestionTitlesEditor(
        Boolean(structureToEdit.questions?.some((q) => (q.title || '').trim() || (q.topic || '').trim()))
      );
    } else {
      setTitle('');
      setCode('');
      setGrade(gradesList[0] || UAE_GRADES[0]);
      setTerm(ACADEMIC_TERMS[0]);
      setTrack(tracksList[0] || ACADEMIC_TRACKS[0]);
      setCustomTrack('');
      setAcademicYear(yearsList[0] || ACADEMIC_YEARS[0]);
      setSubject(settings?.defaultSubject || subjectsList[0] || 'Mathematics');
      setCustomSubject('');
      setGroup('الكل');
      setDate(new Date().toISOString().split('T')[0]);
      setTotalQuestions(10);
      setQuestions(
        Array.from({ length: 10 }, (_, idx) => ({
          questionNumber: idx + 1,
          title: '',
          topic: '',
        }))
      );
      setNotes('');
      setShowQuestionTitlesEditor(false);
    }
    setError('');
  }, [isOpen, structureToEdit]);

  const handleTotalQuestionsChange = (nextCountRaw: number) => {
    const nextCount = Math.max(1, Math.min(100, Math.round(nextCountRaw || 1)));
    setTotalQuestions(nextCount);
    setQuestions((prev) =>
      Array.from({ length: nextCount }, (_, idx) => {
        const existing = prev.find((item) => item.questionNumber === idx + 1);
        return existing || { questionNumber: idx + 1, title: '', topic: '' };
      })
    );
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('يرجى إدخال اسم / عنوان الهيكل');
      return;
    }
    const finalTrack = track === '__custom__' ? customTrack.trim() : track.trim();
    const finalSubject = subject === '__custom__' ? customSubject.trim() : subject.trim();
    if (!finalTrack) {
      setError('يرجى تحديد المسار الدراسي');
      return;
    }
    if (!finalSubject) {
      setError('يرجى تحديد المادة الدراسية');
      return;
    }

    try {
      setSaving(true);
      setError('');
      const now = new Date().toISOString();
      const payload: Omit<ExamStructure, 'id'> = {
        title: title.trim(),
        code: code.trim() || undefined,
        grade,
        term,
        track: finalTrack,
        academicYear,
        subject: finalSubject,
        group: group || 'الكل',
        date,
        totalQuestions,
        questions: questions.slice(0, totalQuestions).map((q, idx) => ({
          questionNumber: idx + 1,
          title: q.title?.trim() || '',
          topic: q.topic?.trim() || '',
        })),
        notes: notes.trim() || '',
        createdAt: structureToEdit?.createdAt || now,
        updatedAt: now,
      };
      await onSave(payload, structureToEdit?.id);
    } catch (err) {
      console.error('Save structure error:', err);
      setError('حدث خطأ أثناء حفظ بيانات الهيكل');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-right">
        <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-amber-500" />
            <h3 className="font-black text-base text-slate-900 dark:text-white">
              {structureToEdit ? 'تعديل بيانات الهيكل' : 'إضافة هيكل جديد'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl font-bold">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                اسم / عنوان الهيكل *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: هيكل الفيزياء النهائي - الفصل الثاني"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                كود الهيكل (اختياري)
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="STR-01"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">الصف الدراسي *</label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold cursor-pointer"
              >
                {gradesList.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">الفصل الدراسي *</label>
              <select
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold cursor-pointer"
              >
                {ACADEMIC_TERMS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">السنة الدراسية *</label>
              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-semibold cursor-pointer"
              >
                {yearsList.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">المسار *</label>
              <select
                value={track}
                onChange={(e) => setTrack(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold cursor-pointer"
              >
                {tracksList.map((tr) => (
                  <option key={tr} value={tr}>{tr}</option>
                ))}
                <option value="__custom__">+ مسار مخصص...</option>
              </select>
              {track === '__custom__' && (
                <input
                  type="text"
                  value={customTrack}
                  onChange={(e) => setCustomTrack(e.target.value)}
                  placeholder="اكتب اسم المسار..."
                  className="mt-1.5 w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-amber-400 rounded-xl"
                />
              )}
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">المادة *</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold cursor-pointer"
              >
                {subjectsList.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
                <option value="__custom__">+ مادة مخصصة...</option>
              </select>
              {subject === '__custom__' && (
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder="اكتب اسم المادة..."
                  className="mt-1.5 w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-amber-400 rounded-xl"
                />
              )}
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">الشعبة / المجموعة</label>
              <select
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold cursor-pointer"
              >
                <option value="الكل">كل الشعب</option>
                {(settings?.groups || []).map((grp) => (
                  <option key={grp} value={grp}>{grp}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                عدد أسئلة الهيكل الكلي (1 - 100) *
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={totalQuestions}
                onChange={(e) => handleTotalQuestionsChange(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">تاريخ الهيكل</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          {/* Optional Question Titles Editor */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                تسمية أسئلة الهيكل والمهارات (اختياري لسهولة المتابعة)
              </span>
              <button
                type="button"
                onClick={() => setShowQuestionTitlesEditor((prev) => !prev)}
                className="text-amber-600 dark:text-amber-400 font-bold hover:underline cursor-pointer"
              >
                {showQuestionTitlesEditor ? 'إخفاء القائمة' : `تحديد عناوين الـ ${totalQuestions} سؤال`}
              </button>
            </div>

            {showQuestionTitlesEditor && (
              <div className="max-h-52 overflow-y-auto space-y-2 pt-1 pl-1">
                {questions.map((qItem, idx) => (
                  <div key={qItem.questionNumber} className="flex items-center gap-2">
                    <span className="w-10 text-center font-mono font-bold text-amber-600 dark:text-amber-400 shrink-0">
                      س{qItem.questionNumber}
                    </span>
                    <input
                      type="text"
                      value={qItem.title || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setQuestions((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, title: val } : item))
                        );
                      }}
                      placeholder={`عنوان أو موضوع السؤال ${qItem.questionNumber} (اختياري)`}
                      className="flex-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">ملاحظات عامة</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي ملاحظات أو تعليمات خاصة بهذا الهيكل..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
            />
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black cursor-pointer disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'جاري الحفظ...' : structureToEdit ? 'حفظ التعديلات' : 'حفظ الهيكل'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ============================================================================
   SUBCOMPONENT: Student Question-by-Question Structure Scoring Modal
   ============================================================================ */

interface StudentStructureScoringModalProps {
  isOpen: boolean;
  structure: ExamStructure;
  student: Student;
  existingProgress: StudentStructureProgress | null;
  settings: TeacherSettings;
  gradesList: string[];
  subjectsList: string[];
  tracksList: string[];
  yearsList: string[];
  onClose: () => void;
  onSave: (record: Omit<StudentStructureProgress, 'id'> & { id?: string }) => Promise<void>;
}

const StudentStructureScoringModal: React.FC<StudentStructureScoringModalProps> = ({
  isOpen,
  structure,
  student,
  existingProgress,
  gradesList,
  subjectsList,
  tracksList,
  yearsList,
  onClose,
  onSave,
}) => {
  const totalQ = Math.max(1, structure.totalQuestions || structure.questions?.length || 1);

  const [grade, setGrade] = useState(existingProgress?.grade || structure.grade || student.grade);
  const [term, setTerm] = useState(existingProgress?.term || structure.term || student.term || ACADEMIC_TERMS[0]);
  const [track, setTrack] = useState(existingProgress?.track || structure.track || student.track || ACADEMIC_TRACKS[0]);
  const [academicYear, setAcademicYear] = useState(
    existingProgress?.academicYear || structure.academicYear || student.academicYear || ACADEMIC_YEARS[0]
  );
  const [subject, setSubject] = useState(
    existingProgress?.subject || structure.subject || student.subject
  );
  const [group, setGroup] = useState(existingProgress?.group || student.group || structure.group || 'الكل');
  const [date, setDate] = useState(existingProgress?.date || new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState(existingProgress?.notes || '');
  const [questionScores, setQuestionScores] = useState<StructureQuestionScore[]>(() => {
    const existingMap = new Map(
      (existingProgress?.questionScores || []).map((item) => [item.questionNumber, item])
    );
    return Array.from({ length: totalQ }, (_, idx) => {
      const qNum = idx + 1;
      const found = existingMap.get(qNum);
      return (
        found || {
          questionNumber: qNum,
          solved: false,
          accuracyPercentage: 0,
          notes: '',
        }
      );
    });
  });
  const [saving, setSaving] = useState(false);

  // Computed live stats
  const liveStats = useMemo(() => {
    const solvedItems = questionScores.filter((q) => q.solved);
    const solvedCount = solvedItems.length;
    const completionPercentage = Math.round((solvedCount / totalQ) * 1000) / 10;
    const overallAccuracyPercentage =
      solvedCount > 0
        ? Math.round(
            (solvedItems.reduce((acc, q) => acc + (Number(q.accuracyPercentage) || 0), 0) /
              solvedCount) *
              10
          ) / 10
        : 0;
    return { solvedCount, completionPercentage, overallAccuracyPercentage };
  }, [questionScores, totalQ]);

  if (!isOpen) return null;

  const setAllQuestionsState = (solved: boolean, accuracy: number) => {
    setQuestionScores((prev) =>
      prev.map((q) => ({
        ...q,
        solved,
        accuracyPercentage: solved ? accuracy : 0,
      }))
    );
  };

  const applyAccuracyToSolved = (accuracy: number) => {
    setQuestionScores((prev) =>
      prev.map((q) => (q.solved ? { ...q, accuracyPercentage: accuracy } : q))
    );
  };

  const toggleQuestionSolved = (qNum: number) => {
    setQuestionScores((prev) =>
      prev.map((q) => {
        if (q.questionNumber !== qNum) return q;
        const nextSolved = !q.solved;
        return {
          ...q,
          solved: nextSolved,
          accuracyPercentage: nextSolved ? (q.accuracyPercentage > 0 ? q.accuracyPercentage : 100) : 0,
        };
      })
    );
  };

  const updateQuestionAccuracy = (qNum: number, rawVal: number) => {
    const clamped = Math.max(0, Math.min(100, isNaN(rawVal) ? 0 : rawVal));
    setQuestionScores((prev) =>
      prev.map((q) =>
        q.questionNumber === qNum
          ? {
              ...q,
              solved: true,
              accuracyPercentage: clamped,
            }
          : q
      )
    );
  };

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await onSave({
        id: existingProgress?.id || `${structure.id}__${student.id}`,
        structureId: structure.id,
        structureTitle: structure.title,
        studentDocId: student.id,
        studentId: student.studentId,
        studentName: student.name,
        grade,
        term,
        track,
        academicYear,
        subject,
        group,
        date,
        totalQuestions: totalQ,
        solvedCount: liveStats.solvedCount,
        completionPercentage: liveStats.completionPercentage,
        overallAccuracyPercentage: liveStats.overallAccuracyPercentage,
        questionScores,
        notes: notes.trim() || '',
        createdAt: existingProgress?.createdAt || new Date().toISOString(),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-right">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-base text-slate-900 dark:text-white">
              رصد حل أسئلة الهيكل للطالب: {student.name}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              الهيكل: <strong className="text-amber-600 dark:text-amber-400">{structure.title}</strong> • إجمالي الأسئلة: <strong className="font-mono">{totalQ}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSaveRecord} className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {/* Live Summary Banner */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">قام بحل</span>
              <span className="text-xl font-black font-mono tabular-nums text-slate-900 dark:text-white">
                {liveStats.solvedCount} / {totalQ} سؤال
              </span>
            </div>
            <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/70 text-center">
              <span className="text-[11px] text-amber-700 dark:text-amber-400 block">نسبة إنجاز الهيكل</span>
              <span className="text-xl font-black font-mono tabular-nums text-amber-600 dark:text-amber-400">
                {liveStats.completionPercentage}%
              </span>
            </div>
            <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/70 text-center">
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block">متوسط نسبة الصحة</span>
              <span className="text-xl font-black font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                {liveStats.overallAccuracyPercentage}%
              </span>
            </div>
          </div>

          {/* Complete Academic Metadata per Student-Haykal Record */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
            <span className="font-bold text-slate-700 dark:text-slate-300 block">
              بيانات القيد الأكاديمي لهذا السجل (الصف / الفصل / المسار / السنة / المادة):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
                title="الصف"
              >
                {Array.from(new Set([...gradesList, grade])).map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>

              <select
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
                title="الفصل"
              >
                {ACADEMIC_TERMS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              <select
                value={track}
                onChange={(e) => setTrack(e.target.value)}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
                title="المسار"
              >
                {Array.from(new Set([...tracksList, track])).map((tr) => (
                  <option key={tr} value={tr}>{tr}</option>
                ))}
              </select>

              <select
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-semibold"
                title="السنة الدراسية"
              >
                {Array.from(new Set([...yearsList, academicYear])).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
                title="المادة"
              >
                {Array.from(new Set([...subjectsList, subject])).map((sb) => (
                  <option key={sb} value={sb}>{sb}</option>
                ))}
              </select>

              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                title="تاريخ التقييم"
              />
            </div>
          </div>

          {/* Quick Bulk Presets */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="font-bold text-slate-600 dark:text-slate-300">إجراءات سريعة للأسئلة:</span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setAllQuestionsState(true, 100)}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] cursor-pointer hover:bg-emerald-500"
              >
                حل الكل (100%)
              </button>
              <button
                type="button"
                onClick={() => applyAccuracyToSolved(100)}
                className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-[11px] cursor-pointer"
              >
                تعيين 100% للمحلول
              </button>
              <button
                type="button"
                onClick={() => applyAccuracyToSolved(50)}
                className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold text-[11px] cursor-pointer"
              >
                تعيين 50% للمحلول
              </button>
              <button
                type="button"
                onClick={() => setAllQuestionsState(false, 0)}
                className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] cursor-pointer"
              >
                تفريغ الكل
              </button>
            </div>
          </div>

          {/* Per-Question List */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-3 w-20 text-center">السؤال</th>
                  <th className="py-2.5 px-3">حالة الحل</th>
                  <th className="py-2.5 px-3">نسبة صحة السؤال (0% - 100%)</th>
                  <th className="py-2.5 px-3 hidden sm:table-cell">تحديد سريع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {questionScores.map((qs) => {
                  const qMeta = structure.questions?.find(
                    (item) => item.questionNumber === qs.questionNumber
                  );
                  return (
                    <tr
                      key={qs.questionNumber}
                      className={
                        qs.solved
                          ? 'bg-emerald-50/20 dark:bg-emerald-950/10'
                          : 'bg-white dark:bg-slate-900'
                      }
                    >
                      <td className="py-2 px-3 text-center">
                        <span className="font-mono font-black text-slate-900 dark:text-white">
                          س{qs.questionNumber}
                        </span>
                        {qMeta?.title && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[110px] mx-auto">
                            {qMeta.title}
                          </div>
                        )}
                      </td>

                      <td className="py-2 px-3">
                        <button
                          type="button"
                          onClick={() => toggleQuestionSolved(qs.questionNumber)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-[11px] border cursor-pointer transition ${
                            qs.solved
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {qs.solved ? (
                            <>
                              <CheckSquare className="w-3.5 h-3.5" />
                              <span>تم الحل</span>
                            </>
                          ) : (
                            <>
                              <Square className="w-3.5 h-3.5" />
                              <span>لم يُحل</span>
                            </>
                          )}
                        </button>
                      </td>

                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                            value={qs.accuracyPercentage}
                            onChange={(e) =>
                              updateQuestionAccuracy(qs.questionNumber, Number(e.target.value))
                            }
                            className="w-20 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-center text-slate-900 dark:text-white"
                          />
                          <span className="font-mono font-bold text-slate-500">%</span>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            value={qs.accuracyPercentage}
                            onChange={(e) =>
                              updateQuestionAccuracy(qs.questionNumber, Number(e.target.value))
                            }
                            className="hidden md:block w-28 accent-amber-500 cursor-pointer"
                          />
                        </div>
                      </td>

                      <td className="py-2 px-3 hidden sm:table-cell">
                        <div className="inline-flex items-center gap-1 font-mono">
                          {[100, 75, 50, 25, 0].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => updateQuestionAccuracy(qs.questionNumber, val)}
                              className={`px-2 py-1 rounded text-[10px] font-bold border cursor-pointer ${
                                qs.solved && qs.accuracyPercentage === val
                                  ? val >= 75
                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                    : val >= 50
                                    ? 'bg-amber-500 text-slate-950 border-amber-500'
                                    : 'bg-rose-600 text-white border-rose-600'
                                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {val}%
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              ملاحظات على أداء الطالب في هذا الهيكل
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: متقن لأسئلة الرسم البياني ويحتاج مراجعة في السؤال 4..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
            />
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black cursor-pointer disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'جاري الحفظ...' : 'حفظ رصد الهيكل للطالب'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
