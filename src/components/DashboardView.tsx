import React, { useMemo } from 'react';
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
  CheckCircle2
} from 'lucide-react';
import { Student, Exam, ExamResult, TeacherSettings } from '../types';
import { calculateStudentStats } from '../utils/grading';
import { DEFAULT_SETTINGS } from '../services/firebase';

interface DashboardViewProps {
  students?: Student[];
  exams?: Exam[];
  allResults?: ExamResult[];
  settings?: TeacherSettings;
  onNavigate: (tab: 'dashboard' | 'students' | 'exams' | 'scoring' | 'reports' | 'settings') => void;
  onOpenStudentProfile: (student: Student) => void;
  onAddStudent: () => void;
  onAddExam: () => void;
  onOpenQuickSearch: () => void;
  onExportAllExcel: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  students = [],
  exams = [],
  allResults = [],
  settings = DEFAULT_SETTINGS,
  onNavigate,
  onOpenStudentProfile,
  onAddStudent,
  onAddExam,
  onOpenQuickSearch,
  onExportAllExcel,
}) => {
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
    <div id="dashboard-view" className="space-y-6 text-right transition-colors">
      {/* Dynamic Vibrant Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-indigo-600/10 dark:from-amber-950/30 dark:via-slate-900 dark:to-indigo-950/40 p-6 sm:p-8 border border-amber-300/30 dark:border-amber-500/20 shadow-sm backdrop-blur-md">
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            {/* Teacher Glowing Portrait */}
            <div className="relative shrink-0">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-amber-400 via-orange-500 to-amber-300 blur-sm opacity-70 animate-pulse" />
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl p-0.5 bg-gradient-to-br from-amber-400 to-orange-500 overflow-hidden shadow-lg shadow-amber-500/20">
                <img 
src={safeSettings.customLogoUrl || `${import.meta.env.BASE_URL}teacher-logo.jpg`}
className="w-full h-full object-cover rounded-[14px]"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 flex items-center justify-center text-white" title="سحابي نشط">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="px-3 py-0.5 rounded-full text-[11px] font-extrabold tracking-wide bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-400/40 inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  منصة السجلات الأكاديمية
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  مرحباً بك، <strong className="text-slate-800 dark:text-slate-200">Mr. Mohammed Hesham</strong>
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                Mr. Mohammed Hesham Records
              </h1>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <button
              id="dash-add-student-btn"
              onClick={onAddStudent}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-amber-500/20 transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ إضافة طالب</span>
            </button>

            <button
              id="dash-add-exam-btn"
              onClick={onAddExam}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-300 dark:border-slate-700 hover:border-amber-400 rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 shadow-xs text-slate-800 dark:text-slate-200 transition cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-500" />
              <span>تسجيل امتحان</span>
            </button>

            <button
              id="dash-quick-grade-btn"
              onClick={() => onNavigate('scoring')}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer"
            >
              <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>رصد النتائج</span>
            </button>

            <button
              id="dash-search-btn"
              onClick={onOpenQuickSearch}
              className="p-2.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 transition cursor-pointer"
              title="البحث عن طالب (Ctrl + K)"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              id="dash-export-btn"
              onClick={onExportAllExcel}
              className="p-2.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 transition cursor-pointer"
              title="تصدير جميع البيانات إلى Excel"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Vibrant 4-Metric Grid with Lively Gradients & Accents */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Total Students Card */}
        <div 
          onClick={() => onNavigate('students')}
          className="group relative overflow-hidden bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500 transition-all cursor-pointer hover:shadow-md"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
              إجمالي الطلاب
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">{safeStudents.length}</h2>
            <span className="text-xs text-amber-600 dark:text-amber-400 font-bold">طالب</span>
          </div>
          <div className="mt-2.5 flex items-center text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
            <span className="ml-1">✓</span> {safeStudents.length > 0 ? 'مسجلون في السجلات' : 'في انتظار الإضافة'}
          </div>
        </div>

        {/* Active Exams Card */}
        <div 
          onClick={() => onNavigate('exams')}
          className="group relative overflow-hidden bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all cursor-pointer hover:shadow-md"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
              الامتحانات المسجلة
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">{safeExams.length}</h2>
            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold">اختبار</span>
          </div>
          <div className="mt-2.5 text-xs text-slate-500 dark:text-slate-400 truncate">
            {lastExam ? `الآخير: ${lastExam.title}` : 'جاهز لإنشاء أول اختبار'}
          </div>
        </div>

        {/* Average Score Card */}
        <div 
          onClick={() => onNavigate('reports')}
          className="group relative overflow-hidden bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500 transition-all cursor-pointer hover:shadow-md"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
              المعدل العام
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
          <div className="mt-2.5 flex items-center text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
            <Activity className="w-3.5 h-3.5 ml-1" />
            <span>متوسط نتائج الامتحانات</span>
          </div>
        </div>

        {/* Top Performers Card */}
        <div 
          onClick={() => onNavigate('students')}
          className="group relative overflow-hidden bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 hover:border-orange-400 dark:hover:border-orange-500 transition-all cursor-pointer hover:shadow-md"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
              المتفوقون (80%+)
            </span>
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">{topPerformers.length}</h2>
            <span className="text-xs text-orange-600 dark:text-orange-400 font-bold">طالب متميز</span>
          </div>
          <div className="mt-2.5 text-xs text-slate-500 dark:text-slate-400">
            أداء ممتاز مستمر
          </div>
        </div>
      </section>

      {/* Charts & Performance Matrix Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Exam Average Trend Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <BarChartVisualIcon />
                <span>مخطط متوسط درجات الامتحانات الأخيرة</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">مقارنة نسب النجاح عبر الامتحانات المنعقدة</p>
            </div>
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3 py-1 rounded-full border border-amber-200/80 dark:border-amber-800/40">
              آخر {recentExamsChart.length} اختبارات
            </span>
          </div>

          {recentExamsChart.length === 0 ? (
            <div className="py-20 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
              <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-700" />
              <p>سجل امتحانات ونتائج لعرض المخطط البياني هنا.</p>
            </div>
          ) : (
            <div className="mt-6">
              <div className="h-52 flex items-end gap-4 px-2">
                {recentExamsChart.map((e, idx) => {
                  const height = Math.max(16, e.avg);
                  const colors = [
                    'from-amber-500 to-orange-500',
                    'from-indigo-500 to-violet-600',
                    'from-emerald-500 to-teal-600',
                    'from-rose-500 to-pink-600',
                    'from-cyan-500 to-blue-600',
                    'from-amber-400 to-amber-600',
                  ];
                  const barGradient = colors[idx % colors.length];

                  return (
                    <div key={e.id} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 bg-slate-950 text-white text-[10px] py-1 px-2.5 rounded-lg whitespace-nowrap shadow-xl border border-slate-800 pointer-events-none z-20">
                        متوسط: <strong>{e.avg}%</strong> ({e.attended} طالب)
                      </div>

                      <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        {e.avg}%
                      </span>

                      <div 
                        style={{ height: `${height}%` }}
                        className={`w-full bg-gradient-to-t ${barGradient} rounded-t-xl transition-all duration-300 shadow-sm group-hover:brightness-110`}
                      />

                      <span className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold truncate w-full text-center mt-2.5" title={e.title}>
                        {e.title}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {e.date.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Performance Matrix Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between transition-colors">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>مؤشرات الكفاءة العامة</span>
            </h3>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">نسبة النجاح العامة</span>
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
                  <span className="text-slate-500 dark:text-slate-400 font-medium">معدل الامتياز والتفوق (80%+)</span>
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
                  <span className="text-slate-500 dark:text-slate-400 font-medium">حضور وتقييم الطلاب</span>
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
              إشعار تحليلي
            </p>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {topPerformers.length > 0
                ? `هناك ${topPerformers.length} طالب يحافظون على تفوق مستمر. يمكنك تصدير تقاريرهم أو طباعة شيت المتابعة بنقرة واحدة.`
                : 'أضف أول امتحانات ورصد الدرجات لمشاهدة التحليل التلقائي وتوصيات المتابعة.'}
            </p>
          </div>
        </div>
      </div>

      {/* Top Performers & Students Needing Follow-up */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <Award className="w-5 h-5" />
              <h3 className="font-bold text-slate-900 dark:text-white text-base">لوحة شرف المتفوقين</h3>
            </div>
            <button
              onClick={() => onNavigate('students')}
              className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-semibold cursor-pointer"
            >
              عرض الجميع
            </button>
          </div>

          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {topPerformers.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                لم يتم تحديد متفوقين بعد (يتطلب رصد درجات امتحانات).
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
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        {student.name}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {student.grade} • {student.group}
                      </p>
                    </div>
                  </div>

                  <div className="text-left">
                    <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm block">
                      {stats.averagePercentage}%
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {stats.totalExams} امتحانات
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Students Needing Follow-up */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-slate-900 dark:text-white text-base">يحتاجون متابعة ودعم</h3>
            </div>
            <button
              onClick={() => onNavigate('students')}
              className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-semibold cursor-pointer"
            >
              عرض الجميع
            </button>
          </div>

          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {needsFollowUp.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                ممتاز! لا يوجد طلاب بدرجات منخفضة حالياً.
              </div>
            ) : (
              needsFollowUp.map(({ student, stats }) => (
                <div 
                  key={student.id} 
                  onClick={() => onOpenStudentProfile(student)}
                  className="py-3 flex items-center justify-between hover:bg-rose-50/40 dark:hover:bg-rose-950/20 px-3 rounded-xl transition cursor-pointer group"
                >
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                      {student.name}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      {student.grade} • {student.group}
                    </p>
                  </div>

                  <div className="text-left">
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-sm block">
                      {stats.averagePercentage}%
                    </span>
                    <span className="bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      {stats.trend === 'declining' ? 'متراجع' : 'متابعة'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
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
