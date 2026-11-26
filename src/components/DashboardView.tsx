import React, { useMemo, useState } from 'react';
import { 
  Users, 
  FileSpreadsheet, 
  Award, 
  TrendingUp, 
  AlertTriangle, 
  UserPlus, 
  Plus, 
  CheckSquare, 
  Search, 
  Download, 
  ArrowRight, 
  Calendar, 
  ChevronLeft, 
  Clock,
  Sparkles,
  BookOpen,
  Zap,
  Flame,
  Activity,
  CheckCircle2,
  RefreshCw,
  GraduationCap,
  Layers,
  Wallet,
  Kanban,
} from 'lucide-react';
import {
  Student,
  Exam,
  ExamResult,
  TeacherSettings,
  ExamStructure,
  StudentStructureProgress,
  TeacherTask,
  TeacherNote,
} from '../types';
import { calculateStudentStats } from '../utils/grading';
import { DEFAULT_SETTINGS } from '../services/firebase';
import { getEffectiveEnrollmentStatus, ENROLLMENT_STATUS_META } from '../utils/studentStatus';
import { saveViewState } from '../utils/activityTracker';
import { DynamicGradesChart } from './DynamicGradesChart';
import { HonorBoardModal } from './HonorBoardModal';
import { StructureSmartAlert } from '../utils/smartAlerts';
import { SmartAlertsDashboardBanner } from './SmartAlertsCenter';
import { TeacherWorkspaceDashboardWidget } from './TeacherWorkspaceView';
import { DashboardStructuresAnalytics } from './DashboardStructuresAnalytics';
import { useLanguage, translateGrade } from '../utils/i18n';

interface DashboardViewProps {
  students?: Student[];
  exams?: Exam[];
  allResults?: ExamResult[];
  settings?: TeacherSettings;
  structuresCount?: number;
  structures?: ExamStructure[];
  structureProgress?: StudentStructureProgress[];
  smartAlerts?: StructureSmartAlert[];
  dailyAlertsDismissed?: boolean;
  onToggleDailyAlertsDismiss?: (dismissed: boolean) => void;
  onOpenAlertsDrawer?: () => void;
  onOpenBulkReminder?: (
    alert: StructureSmartAlert,
    targetMode: 'lagging' | 'incomplete'
  ) => void;
  onRemindStructureBucket?: (
    structure: ExamStructure,
    studentIds: string[],
    label: string
  ) => void;
  onUpdateStructureExamDate?: (
    structureId: string,
    examDate: string
  ) => Promise<void>;
  onCreateTaskFromAlert?: (alert: StructureSmartAlert) => Promise<void>;
  teacherTasks?: TeacherTask[];
  teacherNotes?: TeacherNote[];
  onSaveTask?: (task: Omit<TeacherTask, 'id'> & { id?: string }) => Promise<TeacherTask>;
  onSaveNote?: (note: Omit<TeacherNote, 'id'> & { id?: string }) => Promise<TeacherNote>;
  onNavigate: (tab: 'dashboard' | 'students' | 'exams' | 'structures' | 'scoring' | 'reports' | 'overtime' | 'workspace' | 'settings') => void;
  onOpenStudentProfile: (student: Student) => void;
  onAddStudent: () => void;
  onAddExam: () => void;
  onOpenQuickSearch: () => void;
  onExportAllExcel: () => void;
  onRefreshPlatform?: () => void;
  isRefreshing?: boolean;
  onOpenExamGenerator?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  students = [],
  exams = [],
  allResults = [],
  settings = DEFAULT_SETTINGS,
  structuresCount = 0,
  structures = [],
  structureProgress = [],
  smartAlerts = [],
  dailyAlertsDismissed = false,
  onToggleDailyAlertsDismiss,
  onOpenAlertsDrawer,
  onOpenBulkReminder,
  onRemindStructureBucket,
  onUpdateStructureExamDate,
  onCreateTaskFromAlert,
  teacherTasks = [],
  teacherNotes = [],
  onSaveTask,
  onSaveNote,
  onNavigate,
  onOpenStudentProfile,
  onAddStudent,
  onAddExam,
  onOpenQuickSearch,
  onExportAllExcel,
  onRefreshPlatform,
  isRefreshing = false,
  onOpenExamGenerator,
}) => {
  const { lang, dir, isRtl, tr } = useLanguage();
  const [isHonorBoardOpen, setIsHonorBoardOpen] = useState(false);
  const safeStudents = students || [];
  const safeExams = exams || [];
  const safeResults = allResults || [];
  const safeSettings = settings || DEFAULT_SETTINGS;

  // Pre-calculate students stats
  const studentsWithStats = useMemo(() => {
    return safeStudents.map(st => {
      const results = safeResults.filter(r => r.studentDocId === st.id);
      const stats = calculateStudentStats(results, safeSettings.gradingScale);
      return { student: st, stats };
    });
  }, [safeStudents, safeResults, safeSettings.gradingScale]);

  // Overall average percentage
  const overallAvgPercentage = useMemo(() => {
    if (safeResults.length === 0) return 0;
    const sum = safeResults.reduce((acc, r) => acc + r.percentage, 0);
    return Math.round((sum / safeResults.length) * 10) / 10;
  }, [safeResults]);

  // Last recorded exam
  const lastExam = useMemo(() => {
    if (safeExams.length === 0) return null;
    return [...safeExams].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  }, [safeExams]);

  // Students per grade
  const gradeDistribution = useMemo(() => {
    const map: { [grade: string]: number } = {};
    const gradesList = safeSettings.grades || [];
    gradesList.forEach(g => { map[g] = 0; });
    safeStudents.forEach(s => {
      map[s.grade] = (map[s.grade] || 0) + 1;
    });
    return Object.entries(map).filter(([_, count]) => count > 0 || gradesList.includes(_));
  }, [safeStudents, safeSettings.grades]);

  // Top performing students (highest average with at least 1 exam)
  const topPerformers = useMemo(() => {
    return studentsWithStats
      .filter(s => s.stats.totalExams > 0 && s.stats.averagePercentage >= 80)
      .sort((a, b) => b.stats.averagePercentage - a.stats.averagePercentage)
      .slice(0, 5);
  }, [studentsWithStats]);

  // Most active students (solved most exams)
  const mostActivePerformers = useMemo(() => {
    return [...studentsWithStats]
      .filter(s => s.stats.totalExams > 0)
      .sort((a, b) => {
        if (b.stats.totalExams !== a.stats.totalExams) return b.stats.totalExams - a.stats.totalExams;
        return b.stats.averagePercentage - a.stats.averagePercentage;
      })
      .slice(0, 3);
  }, [studentsWithStats]);

  // Enrollment status counts
  const enrollmentCounts = useMemo(() => {
    const counts = { active: 0, completed: 0, paused: 0, withdrawn: 0 };
    safeStudents.forEach(s => {
      const st = getEffectiveEnrollmentStatus(s);
      counts[st] = (counts[st] || 0) + 1;
    });
    return counts;
  }, [safeStudents]);

  const handleOpenStudentsWithTab = (tab: 'active' | 'completed' | 'inactive' | 'all') => {
    saveViewState('STUDENTS_VIEW', {
      enrollmentTab: tab,
      searchTerm: '',
      gradeFilter: 'الكل',
      yearFilter: 'الكل',
      termFilter: 'الكل',
      trackFilter: 'الكل',
      subjectFilter: 'الكل',
      statusFilter: 'الكل',
      sortBy: 'name',
    });
    onNavigate('students');
  };

  // Students needing follow up (< 60% or declining trend)
  const needsFollowUp = useMemo(() => {
    return studentsWithStats
      .filter(s => s.stats.totalExams > 0 && (s.stats.averagePercentage < 60 || s.stats.trend === 'declining'))
      .sort((a, b) => a.stats.averagePercentage - b.stats.averagePercentage)
      .slice(0, 5);
  }, [studentsWithStats]);

  // Recent exams for trend visualization
  const recentExamsChart = useMemo(() => {
    const sorted = [...safeExams].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-6);
    return sorted.map(e => {
      const examRes = safeResults.filter(r => r.examId === e.id);
      const attended = examRes.length;
      const avg = attended > 0 ? Math.round(examRes.reduce((a, b) => a + b.percentage, 0) / attended) : 0;
      return {
        id: e.id,
        title: e.title,
        date: e.date,
        avg,
        attended,
      };
    });
  }, [safeExams, safeResults]);

  // Recently updated results
  const recentActivity = useMemo(() => {
    const list = [...safeResults].sort((a, b) => new Date(b.updatedAt || b.examDate).getTime() - new Date(a.updatedAt || a.examDate).getTime()).slice(0, 6);
    return list;
  }, [safeResults]);

  return (
    <div id="dashboard-view" dir={dir} className="space-y-5 text-start transition-colors">
      {/* Dynamic Vibrant Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-indigo-600/10 dark:from-amber-950/30 dark:via-slate-900 dark:to-indigo-950/40 p-4 sm:p-6 border border-amber-300/30 dark:border-amber-500/20 shadow-sm backdrop-blur-md">
        <div className="relative z-10 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 sm:gap-5">
          <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
            {/* Teacher Portrait */}
            <div className="relative shrink-0">
              <div className="relative w-14 h-14 sm:w-18 sm:h-18 rounded-2xl p-0.5 bg-gradient-to-br from-amber-400 to-orange-500 overflow-hidden shadow-md shadow-amber-500/20">
                <img 
                  src={safeSettings.customLogoUrl || `${import.meta.env.BASE_URL}teacher-logo.jpg`}
                  alt="Mr. Mohammed Hesham"
                  className="w-full h-full object-cover rounded-[14px]"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap text-xs text-slate-600 dark:text-slate-300">
                <span className="font-extrabold text-amber-700 dark:text-amber-300">
                  {tr('منصة السجلات الأكاديمية', 'Academic Records Platform')}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-medium">
                  {tr('مرحباً بك،', 'Welcome,')} <strong className="text-slate-900 dark:text-white">Mr. Mohammed Hesham</strong>
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-900 dark:text-white truncate">
                Mr. Mohammed Hesham Records
              </h1>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
            <button
              id="dash-add-student-btn"
              onClick={onAddStudent}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-amber-500/20 transition cursor-pointer whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4 shrink-0" />
              <span>{tr('+ إضافة طالب', '+ Add Student')}</span>
            </button>

            <button
              id="dash-add-exam-btn"
              onClick={onAddExam}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 border border-slate-300 dark:border-slate-700 hover:border-amber-400 rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 shadow-xs text-slate-800 dark:text-slate-200 transition cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4 text-amber-500 shrink-0" />
              <span>{tr('تسجيل امتحان', 'Add Exam')}</span>
            </button>

            {onOpenExamGenerator && (
              <button
                id="dash-open-exam-generator-btn"
                onClick={onOpenExamGenerator}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-gradient-to-r from-slate-900 to-slate-800 dark:from-amber-500/20 dark:to-orange-500/20 hover:from-slate-800 hover:to-slate-700 text-amber-400 dark:text-amber-300 border border-amber-500/40 rounded-xl text-xs sm:text-sm font-black shadow-sm transition cursor-pointer whitespace-nowrap"
                title={tr('فتح منصة صناعة وتوليد الامتحانات الذكية (Hesham-Exam)', 'Open Smart Exam Builder (Hesham-Exam)')}
              >
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{tr('توليد امتحان ذكي', 'AI Exam Builder')}</span>
              </button>
            )}

            <button
              id="dash-quick-grade-btn"
              onClick={() => onNavigate('scoring')}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer whitespace-nowrap"
            >
              <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>{tr('رصد النتائج', 'Score Entry')}</span>
            </button>

            <button
              id="dash-structures-btn"
              onClick={() => onNavigate('structures')}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap"
              title={tr('فتح قسم الهياكل ومتابعة حل الأسئلة ونسب صحتها', 'Open Structures & Accuracy Tracking')}
            >
              <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>{tr(`الهياكل (${structuresCount})`, `Structures (${structuresCount})`)}</span>
            </button>

            <button
              id="dash-finance-btn"
              onClick={() => onNavigate('overtime')}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap"
              title={tr('فتح قسم المالية وحساب ساعات الأوفر تايم', 'Open Finance & Overtime Calculator')}
            >
              <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{tr('المالية', 'Finance')}</span>
            </button>

            <button
              id="dash-workspace-btn"
              onClick={() => onNavigate('workspace')}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap"
              title={tr('مساحة عمل المعلم: المهام والملاحظات و To-Do List', 'Teacher Workspace: Tasks, Notes & To-Do List')}
            >
              <Kanban className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
              <span>{tr('مساحة عمل المعلم', 'Teacher Workspace')}</span>
            </button>

            {onRefreshPlatform && (
              <button
                id="dash-sync-btn"
                onClick={onRefreshPlatform}
                disabled={isRefreshing}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap"
                title={tr('مزامنة وجلب كافة السجلات من فايربيز مباشرة', 'Sync all records directly from Firebase')}
              >
                <RefreshCw className={`w-4 h-4 text-amber-500 shrink-0 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>
                  {isRefreshing
                    ? tr('جاري المزامنة...', 'Syncing...')
                    : tr('مزامنة فايربيز', 'Sync Firebase')}
                </span>
              </button>
            )}

            <button
              id="dash-search-btn"
              onClick={onOpenQuickSearch}
              className="p-2.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 transition cursor-pointer"
              title={tr('البحث عن طالب (Ctrl + K)', 'Search Student (Ctrl + K)')}
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              id="dash-export-btn"
              onClick={onExportAllExcel}
              className="p-2.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 transition cursor-pointer"
              title={tr('تصدير جميع البيانات إلى Excel', 'Export all data to Excel')}
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Empty State / Initial Cloud Fetch Assistant */}
      {safeStudents.length === 0 && safeExams.length === 0 && (
        <div className="p-4 sm:p-5 rounded-3xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm shadow-xs">
          <div className="flex items-center gap-3 text-slate-800 dark:text-amber-100">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white">
                {tr('هل توجد بيانات سابقة على حسابك في Firebase؟', 'Do you have previous data on your Firebase account?')}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                {tr('يمكنك جلب ومزامنة كافة السجلات السحابية فوراً دون الحاجة لإعادة تحميل الصفحة.', 'Fetch and sync all cloud records immediately without reloading.')}
              </p>
            </div>
          </div>
          {onRefreshPlatform && (
            <button
              onClick={onRefreshPlatform}
              disabled={isRefreshing}
              className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black rounded-xl text-xs sm:text-sm inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-md shadow-amber-500/20 transition active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>
                {isRefreshing
                  ? tr('جاري الاتصال والتحميل...', 'Connecting & loading...')
                  : tr('مزامنة السجلات من السحابة الآن', 'Sync Cloud Records Now')}
              </span>
            </button>
          )}
        </div>
      )}

      {/* Smart Daily Structure Exam Alerts & Bulk WhatsApp Reminders */}
      <SmartAlertsDashboardBanner
        alerts={smartAlerts}
        dismissedToday={dailyAlertsDismissed}
        onToggleDismissToday={(dismiss) => onToggleDailyAlertsDismiss?.(dismiss)}
        onOpenAlertsDrawer={() => onOpenAlertsDrawer?.()}
        onOpenBulkReminder={(alert, mode) => onOpenBulkReminder?.(alert, mode)}
        onUpdateStructureExamDate={onUpdateStructureExamDate}
        onCreateTaskFromAlert={onCreateTaskFromAlert}
        onOpenStructures={() => onNavigate('structures')}
      />

      {/* Vibrant 4-Metric Grid with Lively Gradients & Accents */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {/* Total Students Card */}
        <div 
          onClick={() => onNavigate('students')}
          className="group relative overflow-hidden bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500 transition-all cursor-pointer hover:shadow-md"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
              {tr('إجمالي الطلاب', 'Total Students')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">{safeStudents.length}</h2>
            <span className="text-xs text-amber-600 dark:text-amber-400 font-bold">{tr('طالب', 'students')}</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
            <span>✓</span>
            <span>
              {safeStudents.length > 0
                ? tr('مسجلون في السجلات', 'Enrolled in records')
                : tr('في انتظار الإضافة', 'Waiting to add')}
            </span>
          </div>
        </div>

        {/* Active Exams Card */}
        <div 
          onClick={() => onNavigate('exams')}
          className="group relative overflow-hidden bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all cursor-pointer hover:shadow-md"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
              {tr('الامتحانات المسجلة', 'Recorded Exams')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">{safeExams.length}</h2>
            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold">{tr('اختبار', 'exams')}</span>
          </div>
          <div className="mt-2.5 text-xs text-slate-500 dark:text-slate-400 truncate">
            {lastExam
              ? tr(`الأخير: ${lastExam.title}`, `Latest: ${lastExam.title}`)
              : tr('جاهز لإنشاء أول اختبار', 'Ready for first exam')}
          </div>
        </div>

        {/* Average Score Card */}
        <div 
          onClick={() => onNavigate('reports')}
          className="group relative overflow-hidden bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500 transition-all cursor-pointer hover:shadow-md"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
              {tr('المعدل العام', 'Overall Average')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
              {overallAvgPercentage}
            </h2>
            <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">%</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
            <Activity className="w-3.5 h-3.5 shrink-0" />
            <span>{tr('متوسط نتائج الامتحانات', 'Average exam scores')}</span>
          </div>
        </div>

        {/* Top Performers Card */}
        <div 
          onClick={() => onNavigate('students')}
          className="group relative overflow-hidden bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 hover:border-orange-400 dark:hover:border-orange-500 transition-all cursor-pointer hover:shadow-md"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
              {tr('المتفوقون (80%+)', 'Top Performers (80%+)')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">{topPerformers.length}</h2>
            <span className="text-xs text-orange-600 dark:text-orange-400 font-bold">{tr('طالب متميز', 'achievers')}</span>
          </div>
          <div className="mt-2.5 text-xs text-slate-500 dark:text-slate-400">
            {tr('أداء ممتاز مستمر', 'Consistent excellence')}
          </div>
        </div>
      </section>

      {/* Course Enrollment Status Summary Strip (Active / Completed Course / Paused / Withdrawn) */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
              {tr('حالة ملفات الطلاب في الكورس', 'Student Course Enrollment Status')}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {tr('تصنيف الملفات الفعالة وقائمة الطلبة الذين انتهى الكورس لهم', 'Filter active, completed-course, and paused/withdrawn profiles')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenStudentsWithTab('active')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 transition cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>{tr(`ملف فعال (${enrollmentCounts.active})`, `Active (${enrollmentCounts.active})`)}</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenStudentsWithTab('completed')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60 hover:bg-sky-100 transition cursor-pointer"
          >
            <GraduationCap className="w-3.5 h-3.5 text-sky-500" />
            <span>{tr(`قائمة منتهي الكورس (${enrollmentCounts.completed})`, `Completed Course (${enrollmentCounts.completed})`)}</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenStudentsWithTab('inactive')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 transition cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>
              {tr(
                `متوقف / منقطع (${enrollmentCounts.paused + enrollmentCounts.withdrawn})`,
                `Paused / Withdrawn (${enrollmentCounts.paused + enrollmentCounts.withdrawn})`
              )}
            </span>
          </button>
        </div>
      </div>

      {/* Charts & Performance Matrix Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Exam Average Trend Chart with Interactive Shape Switcher */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-800 transition-colors overflow-hidden flex flex-col justify-between">
          {recentExamsChart.length === 0 ? (
            <div className="py-20 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
              <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-700" />
              <p>{tr('سجل امتحانات ونتائج لعرض المخطط البياني هنا.', 'Add exams and scores to display the chart here.')}</p>
            </div>
          ) : (
            <DynamicGradesChart
              mode="distribution"
              distributionData={recentExamsChart.map((e, idx) => {
                const palette = ['#f59e0b', '#6366f1', '#10b981', '#ec4899', '#06b6d4', '#8b5cf6'];
                return {
                  label: e.title,
                  value: e.avg,
                  color: palette[idx % palette.length],
                };
              })}
              title={tr('مخطط متوسط درجات الامتحانات الأخيرة (%)', 'Recent Exams Average Score Chart (%)')}
              subtitle={tr(
                'يمكنك التبديل بين شكل الأعمدة، الدائرة، الأفقي، المساحة، المنحنى، أو الرادار',
                'Switch between column, pie, horizontal bar, area, line, or radar chart modes'
              )}
              storageKey="DASHBOARD_RECENT_EXAMS_CHART"
              height={240}
            />
          )}
        </div>

        {/* Performance Matrix Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 sm:p-6 flex flex-col justify-between transition-colors overflow-hidden">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>{tr('مؤشرات الكفاءة العامة', 'Overall Efficiency Metrics')}</span>
            </h3>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">{tr('نسبة النجاح العامة', 'Overall Pass Rate')}</span>
                  <span className="font-black text-slate-900 dark:text-white">{overallAvgPercentage}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    style={{ width: `${Math.min(100, overallAvgPercentage)}%` }} 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">{tr('معدل الامتياز والتفوق (80%+)', 'Excellence Rate (80%+)')}</span>
                  <span className="font-black text-slate-900 dark:text-white">
                    {safeStudents.length > 0 ? Math.round((topPerformers.length / safeStudents.length) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    style={{ width: `${safeStudents.length > 0 ? (topPerformers.length / safeStudents.length) * 100 : 0}%` }} 
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">{tr('حضور وتقييم الطلاب', 'Attendance & Evaluation Rate')}</span>
                  <span className="font-black text-slate-900 dark:text-white">
                    {safeExams.length > 0 && safeStudents.length > 0 
                      ? Math.min(100, Math.round((safeResults.length / (safeExams.length * safeStudents.length)) * 100)) 
                      : 100}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    style={{ width: `${safeExams.length > 0 && safeStudents.length > 0 ? Math.min(100, Math.round((safeResults.length / (safeExams.length * safeStudents.length)) * 100)) : 100}%` }} 
                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Clean Guidance Box */}
          <div className="mt-6 p-4 bg-amber-500/10 dark:bg-amber-950/30 rounded-2xl border border-amber-300/40 dark:border-amber-700/30">
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-amber-700 dark:text-amber-400 mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              {tr('إشعار تحليلي', 'Analytical Insight')}
            </p>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {topPerformers.length > 0
                ? tr(
                    `هناك ${topPerformers.length} طالب يحافظون على تفوق مستمر. يمكنك تصدير تقاريرهم أو طباعة شيت المتابعة بنقرة واحدة.`,
                    `${topPerformers.length} students are maintaining top performance. Export their reports or follow-up sheets in one click.`
                  )
                : tr(
                    'أضف أول امتحانات ورصد الدرجات لمشاهدة التحليل التلقائي وتوصيات المتابعة.',
                    'Add exams and record grades to unlock automatic analysis and follow-up insights.'
                  )}
            </p>
          </div>
        </div>
      </div>

      {/* Structures, Completion Tiers & Students Cohort Charts */}
      <DashboardStructuresAnalytics
        structures={structures}
        structureProgress={structureProgress}
        students={safeStudents}
        onNavigateToStructures={() => onNavigate('structures')}
        onRemindBucketFromDashboard={onRemindStructureBucket}
      />

      {/* Teacher Kanban Tasks, Quick To-Do & Pinned Notes Widget */}
      {onSaveTask && onSaveNote && (
        <TeacherWorkspaceDashboardWidget
          tasks={teacherTasks}
          notes={teacherNotes}
          onSaveTask={onSaveTask}
          onSaveNote={onSaveNote}
          onOpenFullWorkspace={() => onNavigate('workspace')}
        />
      )}

      {/* Top Performers & Students Needing Follow-up */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <Award className="w-5 h-5" />
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {tr('لوحة شرف المتفوقين', 'Top Achievers Honor Board')}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                id="open-honor-board-modal-btn"
                type="button"
                onClick={() => setIsHonorBoardOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                title={tr('تصدير لوحة الشرف كصورة عالية الدقة مع توقيع المعلم لإرسالها لأولياء الأمور', 'Export HD Honor Board image to share with parents')}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{tr('تصدير كصورة 📸', 'Export Image 📸')}</span>
              </button>
              <button
                onClick={() => onNavigate('students')}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 font-semibold cursor-pointer"
              >
                {tr('عرض الجميع', 'View All')}
              </button>
            </div>
          </div>

          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {topPerformers.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                {tr('لم يتم تحديد متفوقين بعد (يتطلب رصد درجات امتحانات).', 'No top achievers yet (requires recorded exam scores).')}
              </div>
            ) : (
              topPerformers.map(({ student, stats }, idx) => (
                <div 
                  key={student.id} 
                  onClick={() => onOpenStudentProfile(student)}
                  className="py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 px-3 rounded-xl transition cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center font-black text-xs font-mono shadow-xs">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-50 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        {student.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {translateGrade(student.grade, lang)} • {student.group}
                      </p>
                    </div>
                  </div>

                  <div className="text-end">
                    <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm block">
                      {stats.averagePercentage}%
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {stats.totalExams} {tr('امتحانات', 'exams')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Most Active Students (Solved Most Exams) Section in Dashboard Honor Card */}
          {mostActivePerformers.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-500" />
                  <span>{tr('مراكز أكثر الطلبة حلاً للامتحانات (فرسان المثابرة)', 'Most Active Exam Solvers')}</span>
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {mostActivePerformers.map(({ student, stats }, idx) => (
                  <div
                    key={student.id}
                    onClick={() => onOpenStudentProfile(student)}
                    className="p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/50 flex items-center justify-between cursor-pointer hover:bg-amber-100/50 transition"
                  >
                    <div className="min-w-0">
                      <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 block">
                        {tr(`المركز ${idx + 1} ⚡`, `Rank #${idx + 1} ⚡`)}
                      </span>
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate block">
                        {student.name}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg bg-amber-500 text-slate-950 font-mono font-black text-[11px] shrink-0">
                      {stats.totalExams} {tr('اختبار', 'exams')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Honor Board Quick Export Banner */}
          {topPerformers.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{tr('لوحة شرف وتكريم رسمي لأولياء الأمور', 'Official Honor Board for Parents')}</span>
              </span>
              <button
                type="button"
                onClick={() => setIsHonorBoardOpen(true)}
                className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>{tr('تخصيص وتصدير اللوحة', 'Customize & Export')}</span>
                {isRtl ? <ChevronLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>

        {/* Students Needing Follow-up */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {tr('يحتاجون متابعة ودعم', 'Needs Follow-Up & Support')}
              </h3>
            </div>
            <button
              onClick={() => onNavigate('students')}
              className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-semibold cursor-pointer"
            >
              {tr('عرض الجميع', 'View All')}
            </button>
          </div>

          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {needsFollowUp.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                {tr('ممتاز! لا يوجد طلاب بدرجات منخفضة حالياً.', 'Great! No students currently need urgent follow-up.')}
              </div>
            ) : (
              needsFollowUp.map(({ student, stats }) => (
                <div 
                  key={student.id} 
                  onClick={() => onOpenStudentProfile(student)}
                  className="py-3 flex items-center justify-between hover:bg-rose-50/40 dark:hover:bg-rose-950/20 px-3 rounded-xl transition cursor-pointer group"
                >
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-50 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                      {student.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {translateGrade(student.grade, lang)} • {student.group}
                    </p>
                  </div>

                  <div className="text-end">
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-sm block">
                      {stats.averagePercentage}%
                    </span>
                    <span className="bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      {stats.trend === 'declining'
                        ? tr('متراجع', 'Declining')
                        : tr('متابعة', 'Follow-Up')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Honor Board Export Modal */}
      <HonorBoardModal
        isOpen={isHonorBoardOpen}
        onClose={() => setIsHonorBoardOpen(false)}
        students={safeStudents}
        exams={safeExams}
        allResults={safeResults}
        settings={safeSettings}
        structures={structures}
        structureProgress={structureProgress}
      />
    </div>
  );
};

function BarChartVisualIcon() {
  return (
    <div className="w-5 h-5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs">
      <TrendingUp className="w-3.5 h-3.5" />
    </div>
  );
}
