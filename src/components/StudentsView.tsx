import React, { useState, useMemo, useEffect } from 'react';
import {
  UserPlus,
  Search,
  FileSpreadsheet,
  Eye,
  Edit3,
  Trash2,
  Users,
  GraduationCap,
  CheckCircle2,
  Clock,
  AlertCircle,
  RotateCcw,
  Award,
} from 'lucide-react';
import { Student, ExamResult, TeacherSettings, StudentEnrollmentStatus } from '../types';
import { calculateStudentStats } from '../utils/grading';
import {
  ENROLLMENT_STATUS_LIST,
  ENROLLMENT_STATUS_META,
  getEffectiveEnrollmentStatus,
  getEffectiveEnrollmentNote,
  saveLocalStudentStatus,
} from '../utils/studentStatus';
import { exportCompletedCourseStudentsExcel } from '../utils/excel';
import { loadViewState, saveViewState, clearViewState } from '../utils/activityTracker';
import { StudentAcademicReportModal } from './StudentAcademicReportModal';

interface StudentsViewProps {
  students: Student[];
  allResults: ExamResult[];
  settings: TeacherSettings;
  onOpenProfile: (student: Student) => void;
  onAddStudent: () => void;
  onEditStudent: (student: Student) => void;
  onDeleteStudent: (student: Student) => void;
  onExportAllExcel: () => void;
  onUpdateStudentStatus?: (student: Student, status: StudentEnrollmentStatus, note?: string) => void;
  initialEnrollmentTab?: 'all' | 'active' | 'completed' | 'inactive';
}

type SortField = 'name' | 'studentId' | 'average' | 'examsCount';
type SortDirection = 'asc' | 'desc';
type EnrollmentTab = 'all' | 'active' | 'completed' | 'inactive';

export const StudentsView: React.FC<StudentsViewProps> = ({
  students,
  allResults,
  settings,
  onOpenProfile,
  onAddStudent,
  onEditStudent,
  onDeleteStudent,
  onExportAllExcel,
  onUpdateStudentStatus,
  initialEnrollmentTab,
}) => {
  const savedState = useMemo(
    () =>
      loadViewState('STUDENTS_VIEW_STATE', {
        searchTerm: '',
        gradeFilter: 'الكل',
        groupFilter: 'الكل',
        subjectFilter: 'الكل',
        statusFilter: 'الكل',
        enrollmentTab: 'all' as EnrollmentTab,
        sortField: 'name' as SortField,
        sortDirection: 'asc' as SortDirection,
      }),
    []
  );

  const [searchTerm, setSearchTerm] = useState(savedState.searchTerm);
  const [gradeFilter, setGradeFilter] = useState(savedState.gradeFilter);
  const [groupFilter, setGroupFilter] = useState(savedState.groupFilter);
  const [subjectFilter, setSubjectFilter] = useState(savedState.subjectFilter);
  const [statusFilter, setStatusFilter] = useState(savedState.statusFilter);
  const [enrollmentTab, setEnrollmentTab] = useState<EnrollmentTab>(
    initialEnrollmentTab || savedState.enrollmentTab || 'all'
  );
  const [sortField, setSortField] = useState<SortField>(savedState.sortField);
  const [sortDirection, setSortDirection] = useState<SortDirection>(savedState.sortDirection);
  const [academicModalStudent, setAcademicModalStudent] = useState<Student | null>(null);
  const [statusVersion, setStatusVersion] = useState(0);

  useEffect(() => {
    if (initialEnrollmentTab) {
      setEnrollmentTab(initialEnrollmentTab);
    }
  }, [initialEnrollmentTab]);

  // Persist current view state automatically
  useEffect(() => {
    saveViewState('STUDENTS_VIEW_STATE', {
      searchTerm,
      gradeFilter,
      groupFilter,
      subjectFilter,
      statusFilter,
      enrollmentTab,
      sortField,
      sortDirection,
    });
  }, [
    searchTerm,
    gradeFilter,
    groupFilter,
    subjectFilter,
    statusFilter,
    enrollmentTab,
    sortField,
    sortDirection,
  ]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setGradeFilter('الكل');
    setGroupFilter('الكل');
    setSubjectFilter('الكل');
    setStatusFilter('الكل');
    setEnrollmentTab('all');
    setSortField('name');
    setSortDirection('asc');
    clearViewState('STUDENTS_VIEW_STATE');
  };

  const hasActiveFilters =
    searchTerm !== '' ||
    gradeFilter !== 'الكل' ||
    groupFilter !== 'الكل' ||
    subjectFilter !== 'الكل' ||
    statusFilter !== 'الكل' ||
    enrollmentTab !== 'all';

  const handleQuickStatusChange = (student: Student, newStatus: StudentEnrollmentStatus) => {
    saveLocalStudentStatus(student.id, newStatus);
    setStatusVersion((v) => v + 1);
    if (onUpdateStudentStatus) {
      onUpdateStudentStatus(student, newStatus);
    }
  };

  const getStudentSubjects = (student: Student): string[] => {
    if (Array.isArray(student.subjects) && student.subjects.length > 0) {
      return student.subjects.filter(Boolean);
    }
    return student.subject ? [student.subject] : [];
  };

  // Calculate stats + enrollment status per student
  const studentsWithStats = useMemo(() => {
    return students.map((student) => {
      const studentResults = allResults.filter((result) => result.studentDocId === student.id);

      const filteredResults =
        subjectFilter === 'الكل'
          ? studentResults
          : studentResults.filter((result) => result.subject === subjectFilter);

      const stats = calculateStudentStats(filteredResults, settings.gradingScale);
      const enrollmentStatus = getEffectiveEnrollmentStatus(student);
      const enrollmentNote = getEffectiveEnrollmentNote(student);

      return {
        student,
        stats,
        subjects: getStudentSubjects(student),
        enrollmentStatus,
        enrollmentNote,
      };
    });
  }, [students, allResults, settings.gradingScale, subjectFilter, statusVersion]);

  // Counts per Enrollment Tab
  const tabCounts = useMemo(() => {
    let active = 0;
    let completed = 0;
    let inactive = 0;
    studentsWithStats.forEach(({ enrollmentStatus }) => {
      if (enrollmentStatus === 'active') active++;
      else if (enrollmentStatus === 'completed') completed++;
      else inactive++;
    });
    return {
      all: studentsWithStats.length,
      active,
      completed,
      inactive,
    };
  }, [studentsWithStats]);

  // Filter students
  const filteredStudents = useMemo(() => {
    return studentsWithStats.filter(({ student, stats, subjects, enrollmentStatus }) => {
      // Enrollment Tab Filter
      if (enrollmentTab === 'active' && enrollmentStatus !== 'active') return false;
      if (enrollmentTab === 'completed' && enrollmentStatus !== 'completed') return false;
      if (
        enrollmentTab === 'inactive' &&
        enrollmentStatus !== 'paused' &&
        enrollmentStatus !== 'withdrawn'
      ) {
        return false;
      }

      const searchLower = searchTerm.toLowerCase().trim();
      const matchSearch =
        student.name.toLowerCase().includes(searchLower) ||
        student.studentId.toLowerCase().includes(searchLower) ||
        (student.phone && student.phone.toLowerCase().includes(searchLower)) ||
        (student.parentPhone && student.parentPhone.toLowerCase().includes(searchLower));

      if (!matchSearch) return false;
      if (gradeFilter !== 'الكل' && student.grade !== gradeFilter) return false;
      if (groupFilter !== 'الكل' && student.group !== groupFilter) return false;
      if (subjectFilter !== 'الكل' && !subjects.includes(subjectFilter)) return false;
      if (statusFilter !== 'الكل' && stats.status !== statusFilter) return false;

      return true;
    });
  }, [
    studentsWithStats,
    enrollmentTab,
    searchTerm,
    gradeFilter,
    groupFilter,
    subjectFilter,
    statusFilter,
  ]);

  // Sort students
  const sortedStudents = useMemo(() => {
    return [...filteredStudents].sort((a, b) => {
      let comparison = 0;

      if (sortField === 'name') {
        comparison = a.student.name.localeCompare(b.student.name, 'ar');
      } else if (sortField === 'studentId') {
        comparison = a.student.studentId.localeCompare(b.student.studentId);
      } else if (sortField === 'average') {
        comparison = a.stats.averagePercentage - b.stats.averagePercentage;
      } else if (sortField === 'examsCount') {
        comparison = a.stats.totalExams - b.stats.totalExams;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredStudents, sortField, sortDirection]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'name' ? 'asc' : 'desc');
    }
  };

  const availableGroups = useMemo(() => {
    return Array.from(new Set(students.map((student) => student.group).filter(Boolean)));
  }, [students]);

  return (
    <div id="students-view" className="space-y-5 text-right">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
              <Users className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            {enrollmentTab === 'completed'
              ? `قائمة الطلبة الذين انتهى الكورس لهم (${tabCounts.completed})`
              : enrollmentTab === 'inactive'
              ? `قائمة الطلبة المنقطعين والمتوقفين (${tabCounts.inactive})`
              : enrollmentTab === 'active'
              ? `الطلبة الفعالون بالكورس (${tabCounts.active})`
              : `إدارة الطلاب (${students.length})`}
          </h1>

          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            سجل الطلاب المسجلين، حالة ملف كل طالب بالكورس (فعال / انتهى الكورس / منقطع)، ومعدلات أدائهم
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          {enrollmentTab === 'completed' && tabCounts.completed > 0 && (
            <button
              onClick={() => exportCompletedCourseStudentsExcel(students, allResults, settings)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-indigo-800 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-xl transition-all cursor-pointer shadow-xs"
            >
              <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>تصدير قائمة منتهي الكورس Excel</span>
            </button>
          )}

          <button
            onClick={onExportAllExcel}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 rounded-xl transition-all cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden xs:inline sm:inline">تصدير الكل إلى Excel</span>
            <span className="xs:hidden sm:hidden">Excel</span>
          </button>

          <button
            id="add-student-main-btn"
            onClick={onAddStudent}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-98 rounded-xl shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة طالب جديد</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          تبويبات حالة ملفات الطلبة (تشمل القائمة الخاصة بالطلبة الذين انتهى الكورس لهم)
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white dark:bg-slate-900 p-2.5 rounded-2xl shadow-sm border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 flex-1">
          <button
            type="button"
            onClick={() => setEnrollmentTab('all')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              enrollmentTab === 'all'
                ? 'bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 shadow-sm'
                : 'bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>كافة الطلبة</span>
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-white/20 dark:bg-black/15">
              {tabCounts.all}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setEnrollmentTab('active')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              enrollmentTab === 'active'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                : 'bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/80 border border-emerald-200/60 dark:border-emerald-800/50'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>الطلبة الفعالون (مستمر)</span>
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-black/10 dark:bg-white/10">
              {tabCounts.active}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setEnrollmentTab('completed')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              enrollmentTab === 'completed'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                : 'bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-200/70 dark:border-indigo-800/60'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>قائمة الطلبة الذين انتهى الكورس لهم</span>
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-black/10 dark:bg-white/10">
              {tabCounts.completed}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setEnrollmentTab('inactive')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              enrollmentTab === 'inactive'
                ? 'bg-rose-600 text-white shadow-sm shadow-rose-500/20'
                : 'bg-rose-50/70 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 hover:bg-rose-100/80 border border-rose-200/60 dark:border-rose-800/50'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>منقطع / متوقف مؤقتاً</span>
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-black/10 dark:bg-white/10">
              {tabCounts.inactive}
            </span>
          </button>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition cursor-pointer"
            title="البدء من جديد وإعادة ضبط كافة الفلاتر"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>البدء من جديد (إعادة ضبط)</span>
          </button>
        )}
      </div>

      {/* Dedicated Banner when viewing "قائمة الطلبة الذين انتهى الكورس لهم" */}
      {enrollmentTab === 'completed' && (
        <div className="bg-gradient-to-l from-indigo-950 via-indigo-900 to-slate-900 text-white rounded-2xl p-5 shadow-md border border-indigo-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-amber-400 shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-white flex items-center gap-2">
                <span>سجل وقائمة الطلبة الذين انتهى الكورس لهم</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-extrabold">
                  {tabCounts.completed} طالب
                </span>
              </h3>
              <p className="text-xs text-indigo-200 mt-1 leading-relaxed">
                تضم هذه القائمة كافة الطلبة الذين أتموا الكورس بنجاح. يمكنك استعراض تقاريرهم الختامية، أو تصدير كشفهم الخاص إلى Excel، أو إعادة تفعيل ملف أي طالب لكورس جديد بضغطة زر.
              </p>
            </div>
          </div>

          {tabCounts.completed > 0 && (
            <button
              type="button"
              onClick={() => exportCompletedCourseStudentsExcel(students, allResults, settings)}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition cursor-pointer shrink-0 inline-flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>تصدير كشف منتهي الكورس</span>
            </button>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2.5 sm:gap-3">
          {/* Search */}
          <div className="sm:col-span-2 md:col-span-4 relative">
            <input
              id="student-search-box"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث بالاسم أو ID أو رقم الهاتف..."
              className="w-full pr-9 pl-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-right font-medium text-slate-900 dark:text-white placeholder-slate-400"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
          </div>

          {/* Grade */}
          <div className="md:col-span-2">
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden text-right cursor-pointer text-slate-800 dark:text-slate-200"
            >
              <option value="الكل">كل الصفوف</option>
              {settings.grades.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </div>

          {/* Group */}
          <div className="md:col-span-2">
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden text-right cursor-pointer text-slate-800 dark:text-slate-200"
            >
              <option value="الكل">كل المجموعات</option>
              {availableGroups.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div className="md:col-span-2">
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden text-right cursor-pointer text-slate-800 dark:text-slate-200"
            >
              <option value="الكل">كل المواد</option>
              {settings.subjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>

          {/* Academic Status */}
          <div className="md:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden text-right cursor-pointer font-medium text-slate-800 dark:text-slate-200"
            >
              <option value="الكل">كل المستويات</option>
              <option value="ممتاز">ممتاز (85%+)</option>
              <option value="جيد">جيد (65-84%)</option>
              <option value="يحتاج متابعة">يحتاج متابعة (&lt;65%)</option>
            </select>
          </div>
        </div>

        {/* Sorting */}
        <div className="flex flex-wrap items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 gap-2">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-[11px]">الترتيب:</span>

            <button
              onClick={() => toggleSort('name')}
              className={`px-2.5 py-1 rounded-lg border transition-colors cursor-pointer inline-flex items-center gap-1 ${
                sortField === 'name'
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-400 font-bold'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              الاسم {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
            </button>

            <button
              onClick={() => toggleSort('average')}
              className={`px-2.5 py-1 rounded-lg border transition-colors cursor-pointer inline-flex items-center gap-1 ${
                sortField === 'average'
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-400 font-bold'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              المتوسط {sortField === 'average' && (sortDirection === 'asc' ? '↑' : '↓')}
            </button>

            <button
              onClick={() => toggleSort('examsCount')}
              className={`px-2.5 py-1 rounded-lg border transition-colors cursor-pointer inline-flex items-center gap-1 ${
                sortField === 'examsCount'
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-400 font-bold'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              الامتحانات {sortField === 'examsCount' && (sortDirection === 'asc' ? '↑' : '↓')}
            </button>
          </div>

          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            عرض {sortedStudents.length} من أصل {students.length} طالب
          </span>
        </div>
      </div>

      {/* Mobile Student Cards (md:hidden) */}
      <div className="md:hidden space-y-3">
        {sortedStudents.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center border border-slate-200 dark:border-slate-800 shadow-sm text-slate-400 dark:text-slate-500">
            <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">
              {enrollmentTab === 'completed'
                ? 'لا يوجد طلبة في قائمة منتهي الكورس حالياً'
                : enrollmentTab === 'inactive'
                ? 'لا يوجد طلبة منقطعون أو متوقفون حالياً'
                : students.length === 0
                ? 'لا يوجد طلاب مسجلين حتى الآن'
                : 'لا توجد نتائج مطابقة لشروط البحث'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              يمكنك تغيير حالة ملف أي طالب إلى "انتهى الكورس" أو "منقطع" من أداة الحالة بجانب اسم الطالب أو من ملفه الشخصي.
            </p>
          </div>
        ) : (
          sortedStudents.map(({ student, stats, subjects, enrollmentStatus, enrollmentNote }) => {
            const stMeta = ENROLLMENT_STATUS_META[enrollmentStatus];
            return (
              <div
                key={student.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-3 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div
                    className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                    onClick={() => onOpenProfile(student)}
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold text-sm shrink-0 border border-amber-500/20">
                      {student.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h4 className="font-extrabold text-slate-900 dark:text-slate-50 text-base truncate hover:text-amber-500 dark:hover:text-amber-400 transition-colors">
                          {student.name}
                        </h4>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${stMeta.badgeBg} ${stMeta.badgeText} ${stMeta.badgeBorder}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${stMeta.dotColor}`} />
                          {stMeta.shortLabel}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-200 text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          #{student.studentId}
                        </span>
                        <span>•</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">{student.grade}</span>
                        {student.track && (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              student.track === 'متقدم'
                                ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            }`}
                          >
                            مسار {student.track}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setAcademicModalStudent(student)}
                      className="p-1.5 text-slate-400 hover:text-amber-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="التقرير الأكاديمي للطالب"
                    >
                      <GraduationCap className="w-4 h-4 text-amber-500" />
                    </button>
                    <button
                      onClick={() => onOpenProfile(student)}
                      className="p-1.5 text-slate-400 hover:text-amber-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="فتح ملف الطالب"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEditStudent(student)}
                      className="p-1.5 text-slate-400 hover:text-indigo-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="تعديل بيانات الطالب"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteStudent(student)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="حذف الطالب"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Quick Enrollment Status Switcher on Mobile Card */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                  <span className="text-slate-400 font-medium">حالة ملف الكورس:</span>
                  <select
                    value={enrollmentStatus}
                    onChange={(e) =>
                      handleQuickStatusChange(student, e.target.value as StudentEnrollmentStatus)
                    }
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${stMeta.badgeBg} ${stMeta.badgeText} ${stMeta.badgeBorder}`}
                  >
                    {ENROLLMENT_STATUS_LIST.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {enrollmentNote && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                    ملاحظة الملف: {enrollmentNote}
                  </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-center text-xs border border-slate-100 dark:border-slate-700/60">
                  <div>
                    <span className="text-[10px] text-slate-400 block">المتوسط</span>
                    <span className="font-mono font-black text-amber-600 dark:text-amber-400">
                      {stats.totalExams > 0 ? `${stats.averagePercentage}%` : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">الامتحانات</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {stats.totalExams}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">آخر نتيجة</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {stats.latestPercentage !== null ? `${stats.latestPercentage}%` : '-'}
                    </span>
                  </div>
                </div>

                {subjects.length > 0 && (
                  <div className="flex flex-wrap gap-1 items-center">
                    <span className="text-[11px] text-slate-400 ml-1">المواد:</span>
                    {subjects.map((sub) => (
                      <span
                        key={sub}
                        className="px-2 py-0.5 rounded-md text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium"
                      >
                        {sub}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Students Table (hidden md:block) */}
      <div className="hidden md:block bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3.5 px-4 w-24">الرقم التعريفي</th>
                <th className="py-3.5 px-4">اسم الطالب</th>
                <th className="py-3.5 px-3">حالة الملف بالكورس</th>
                <th className="py-3.5 px-3">الصف الدراسي</th>
                <th className="py-3.5 px-3">المواد</th>
                <th className="py-3.5 px-3">الهاتف</th>
                <th className="py-3.5 px-3 text-center">متوسط الدرجات</th>
                <th className="py-3.5 px-3 text-center">الامتحانات</th>
                <th className="py-3.5 px-3 text-center">المستوى</th>
                <th className="py-3.5 px-4 text-center w-28">إجراءات</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sortedStudents.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    {enrollmentTab === 'completed' ? (
                      <div className="space-y-2">
                        <GraduationCap className="w-8 h-8 text-indigo-400 mx-auto" />
                        <p className="font-bold text-slate-700 dark:text-slate-200">
                          لا يوجد طلبة مدرجون في قائمة منتهي الكورس حالياً
                        </p>
                        <p className="text-xs text-slate-400">
                          لتحديد أن طالب قد أنهى الكورس، اختر "انتهى الكورس" من عمود (حالة الملف بالكورس) أو من ملف الطالب الشخصي.
                        </p>
                      </div>
                    ) : students.length === 0 ? (
                      <div className="space-y-3">
                        <Users className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="font-semibold text-slate-600 dark:text-slate-300">
                          لا يوجد طلاب مسجلين حتى الآن
                        </p>
                        <button
                          onClick={onAddStudent}
                          className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors cursor-pointer"
                        >
                          إضافة أول طالب
                        </button>
                      </div>
                    ) : (
                      'لا توجد نتائج مطابقة لشروط البحث والفلترة'
                    )}
                  </td>
                </tr>
              ) : (
                sortedStudents.map(({ student, stats, subjects, enrollmentStatus, enrollmentNote }) => {
                  const stMeta = ENROLLMENT_STATUS_META[enrollmentStatus];
                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors group cursor-pointer"
                      onClick={() => onOpenProfile(student)}
                    >
                      {/* Student ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700 dark:text-slate-200 text-[11px]">
                        <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                          {student.studentId}
                        </span>
                      </td>

                      {/* Name */}
                      <td className="py-3.5 px-4 font-extrabold text-slate-900 dark:text-slate-50">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0 border border-indigo-200/50 dark:border-indigo-800/50">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <span className="group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors text-sm font-extrabold block">
                              {student.name}
                            </span>
                            {enrollmentNote && (
                              <span className="text-[10px] text-slate-400 font-normal block truncate max-w-[180px]">
                                {enrollmentNote}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Enrollment Status Quick Selector */}
                      <td
                        className="py-3.5 px-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <select
                          value={enrollmentStatus}
                          onChange={(e) =>
                            handleQuickStatusChange(student, e.target.value as StudentEnrollmentStatus)
                          }
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border cursor-pointer transition-colors ${stMeta.badgeBg} ${stMeta.badgeText} ${stMeta.badgeBorder}`}
                          title="تغيير حالة ملف الطالب في الكورس"
                        >
                          {ENROLLMENT_STATUS_LIST.map((opt) => (
                            <option
                              key={opt.id}
                              value={opt.id}
                              className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                            >
                              {opt.shortLabel}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Grade & Track */}
                      <td className="py-3.5 px-3 font-medium text-slate-700 dark:text-slate-200">
                        <div>{student.grade}</div>
                        {(student.track || student.term) && (
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            {student.track && (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                                  student.track === 'متقدم'
                                    ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                }`}
                              >
                                {student.track}
                              </span>
                            )}
                            {student.term && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                {student.term}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Subjects */}
                      <td className="py-3.5 px-3 text-slate-700 dark:text-slate-300">
                        <div className="flex flex-wrap gap-1 justify-end">
                          {subjects.length > 0 ? (
                            subjects.map((subject) => (
                              <span
                                key={subject}
                                className={`px-2 py-0.5 rounded text-[10px] border ${
                                  subjectFilter === subject
                                    ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 font-bold'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                {subject}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 dark:text-slate-600">-</span>
                          )}
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-3 font-mono text-slate-500 text-[11px]" dir="ltr">
                        {student.phone || student.parentPhone || '-'}
                      </td>

                      {/* Average */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                          {stats.totalExams > 0 ? `${stats.averagePercentage}%` : '-'}
                        </span>
                      </td>

                      {/* Exams */}
                      <td className="py-3.5 px-3 text-center font-mono text-slate-700 dark:text-slate-300 font-semibold">
                        {stats.totalExams}
                      </td>

                      {/* Academic Status */}
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[10px] border ${
                            stats.status === 'ممتاز'
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : stats.status === 'جيد'
                              ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                              : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                          }`}
                        >
                          {stats.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td
                        className="py-3.5 px-4 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setAcademicModalStudent(student)}
                            className="p-1.5 text-slate-500 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="التقرير الأكاديمي للطالب"
                          >
                            <GraduationCap className="w-4 h-4 text-amber-500" />
                          </button>

                          <button
                            onClick={() => onOpenProfile(student)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="فتح ملف الطالب"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onEditStudent(student)}
                            className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="تعديل بيانات الطالب"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onDeleteStudent(student)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="حذف الطالب"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Student Academic Report Modal */}
      {academicModalStudent && (
        <StudentAcademicReportModal
          student={academicModalStudent}
          results={allResults.filter((r) => r.studentDocId === academicModalStudent.id)}
          settings={settings}
          onClose={() => setAcademicModalStudent(null)}
        />
      )}
    </div>
  );
};
