import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Layers,
  TrendingUp,
  Users,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  BookOpenCheck,
  Clock,
} from 'lucide-react';
import {
  ExamStructure,
  Student,
  StudentStructureProgress,
} from '../types';
import {
  getEffectiveStructureStatus,
  getStructureStatusLabel,
} from '../utils/structureStatus';
import { getEffectiveEnrollmentStatus } from '../utils/studentStatus';
import {
  StructureCompletionDistributionChart,
  CompletionBucketId,
} from './StructureCompletionDistributionChart';
import { translateGrade, useLanguage } from '../utils/i18n';

interface DashboardStructuresAnalyticsProps {
  structures: ExamStructure[];
  structureProgress: StudentStructureProgress[];
  students: Student[];
  onNavigateToStructures: () => void;
  onRemindBucketFromDashboard?: (
    structure: ExamStructure,
    studentIds: string[],
    label: string
  ) => void;
}

export const DashboardStructuresAnalytics: React.FC<
  DashboardStructuresAnalyticsProps
> = ({
  structures,
  structureProgress,
  students,
  onNavigateToStructures,
  onRemindBucketFromDashboard,
}) => {
  const { lang, tr } = useLanguage();
  const [selectedStructId, setSelectedStructId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'ongoing' | 'studied_not_examined' | 'completed'
  >('all');
  const [bucketFilter, setBucketFilter] = useState<'all' | CompletionBucketId>(
    'all'
  );

  // Latest progress record per (structureId, studentDocId)
  const latestByStruct = useMemo(() => {
    const outer = new Map<string, Map<string, StudentStructureProgress>>();
    structureProgress.forEach((p) => {
      let inner = outer.get(p.structureId);
      if (!inner) {
        inner = new Map<string, StudentStructureProgress>();
        outer.set(p.structureId, inner);
      }
      const prev = inner.get(p.studentDocId);
      if (!prev) {
        inner.set(p.studentDocId, p);
        return;
      }
      const prevAtt = prev.attemptNumber || 1;
      const curAtt = p.attemptNumber || 1;
      if (
        curAtt > prevAtt ||
        (curAtt === prevAtt &&
          new Date(p.updatedAt || p.createdAt || 0).getTime() >=
            new Date(prev.updatedAt || prev.createdAt || 0).getTime())
      ) {
        inner.set(p.studentDocId, p);
      }
    });
    return outer;
  }, [structureProgress]);

  const statusCounts = useMemo(() => {
    let ongoing = 0;
    let studied = 0;
    let completed = 0;
    structures.forEach((s) => {
      const st = getEffectiveStructureStatus(s);
      if (st === 'completed') completed++;
      else if (st === 'studied_not_examined') studied++;
      else ongoing++;
    });
    return { ongoing, studied, completed, total: structures.length };
  }, [structures]);

  const filteredStructures = useMemo(() => {
    return structures.filter((s) => {
      if (statusFilter === 'all') return true;
      return getEffectiveStructureStatus(s) === statusFilter;
    });
  }, [structures, statusFilter]);

  const selectedStructure = useMemo(
    () =>
      selectedStructId === 'all'
        ? null
        : structures.find((s) => s.id === selectedStructId) || null,
    [structures, selectedStructId]
  );

  // Per-structure overall student completion % & accuracy % bar chart data
  const structureComparisonData = useMemo(() => {
    return filteredStructures.slice(0, 10).map((st) => {
      const excluded = new Set(st.excludedStudentIds || []);
      const progMap =
        latestByStruct.get(st.id) ||
        new Map<string, StudentStructureProgress>();
      const totalQ = Math.max(1, st.totalQuestions || st.questions?.length || 1);

      const eligibleIds = new Set<string>();
      progMap.forEach((_rec, sId) => {
        if (!excluded.has(sId)) eligibleIds.add(sId);
      });
      students.forEach((student) => {
        if (excluded.has(student.id) || eligibleIds.has(student.id)) return;
        const eff = getEffectiveEnrollmentStatus(student);
        if (eff === 'completed' || eff === 'withdrawn') return;
        if (student.grade !== st.grade) return;
        if (student.term && st.term && student.term !== st.term) return;
        if (student.track && st.track && student.track !== st.track) return;
        if (
          student.academicYear &&
          st.academicYear &&
          student.academicYear !== st.academicYear
        ) {
          return;
        }
        eligibleIds.add(student.id);
      });

      let sumCompletion = 0;
      let sumAccuracy = 0;
      let recordedCount = 0;

      eligibleIds.forEach((sId) => {
        const rec = progMap.get(sId);
        if (rec) {
          recordedCount++;
          const solved = Math.min(totalQ, Math.max(0, rec.solvedCount || 0));
          sumCompletion +=
            rec.completionPercentage ??
            Math.round((solved / totalQ) * 1000) / 10;
          sumAccuracy += rec.overallAccuracyPercentage || 0;
        }
      });

      const cohortSize = eligibleIds.size;
      const avgCompletion =
        cohortSize > 0 ? Math.round(sumCompletion / cohortSize) : 0;
      const avgAccuracy =
        recordedCount > 0 ? Math.round(sumAccuracy / recordedCount) : 0;

      return {
        id: st.id,
        name:
          st.title.length > 18 ? `${st.title.slice(0, 18)}...` : st.title,
        fullTitle: st.title,
        grade: st.grade,
        statusLabel: getStructureStatusLabel(st, true),
        completion: avgCompletion,
        accuracy: avgAccuracy,
        cohortSize,
        recordedCount,
      };
    });
  }, [filteredStructures, latestByStruct, students]);

  // Student Grade & Enrollment Distribution chart data
  const studentGradeDistribution = useMemo(() => {
    const map = new Map<
      string,
      { grade: string; active: number; completed: number; other: number }
    >();
    students.forEach((s) => {
      const label =
        lang === 'en'
          ? translateGrade(s.grade || 'Other', 'en')
          : (s.grade || 'غير محدد').replace(/\s*\(Grade\s*\d+\)/i, '');
      const curr = map.get(label) || {
        grade: label,
        active: 0,
        completed: 0,
        other: 0,
      };
      const eff = getEffectiveEnrollmentStatus(s);
      if (eff === 'active') curr.active++;
      else if (eff === 'completed') curr.completed++;
      else curr.other++;
      map.set(label, curr);
    });
    return Array.from(map.values()).slice(0, 10);
  }, [students, lang]);

  const statusPieData = [
    { name: tr('مستمر', 'Ongoing'), value: statusCounts.ongoing, color: '#10b981' },
    {
      name: tr('منتهي ولم يُمتحن', 'Studied (No Exam)'),
      value: statusCounts.studied,
      color: '#f59e0b',
    },
    { name: tr('تم الامتحان', 'Examined'), value: statusCounts.completed, color: '#6366f1' },
  ].filter((d) => d.value > 0);

  const ArrowIcon = lang === 'ar' ? ChevronLeft : ChevronRight;

  return (
    <section id="dashboard-structures-analytics" className="space-y-5">
      {/* Section Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
              {tr(
                'لوحات بيانية للهياكل ونسب الإنجاز والطلبة',
                'Structures, Completion & Student Cohort Analytics'
              )}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {tr(
                'متابعة نسب الإنجاز والصحة عبر جميع الهياكل وتوزيع مستويات الطلاب والصفوف',
                'Track completion & accuracy across structures alongside student tier & grade distribution'
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold font-mono tabular-nums">
            <Clock className="w-3.5 h-3.5" />
            {tr('جارية:', 'Ongoing:')} {statusCounts.ongoing}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold font-mono tabular-nums">
            <BookOpenCheck className="w-3.5 h-3.5" />
            {tr('بانتظار الامتحان:', 'Awaiting Exam:')} {statusCounts.studied}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold font-mono tabular-nums">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {tr('منتهية:', 'Done:')} {statusCounts.completed}
          </span>

          <button
            type="button"
            onClick={onNavigateToStructures}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 font-black cursor-pointer whitespace-nowrap"
          >
            <span>{tr('إدارة الهياكل', 'Manage Structures')}</span>
            <ArrowIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Row 1: Structures Comparison Chart + Structure Status & Student Grade Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Per-Structure Completion & Accuracy Comparison */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                <span>{tr('نسب الإنجاز والصحة لكل هيكل (%)', 'Completion & Accuracy per Structure (%)')}</span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {tr(
                  'مقارنة نسبة إتمام الأسئلة (الذهبي) مع متوسط الصحة (الأخضر)',
                  'Comparing question completion rate (Amber) vs accuracy average (Emerald)'
                )}
              </p>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <option value="all">
                {tr(`كل الهياكل (${structures.length})`, `All Structures (${structures.length})`)}
              </option>
              <option value="ongoing">{tr('الجارية فقط', 'Ongoing Only')}</option>
              <option value="studied_not_examined">
                {tr('منتهية الدراسة فقط', 'Studied (No Exam)')}
              </option>
              <option value="completed">{tr('تم الامتحان فقط', 'Examined Only')}</option>
            </select>
          </div>

          {structureComparisonData.length === 0 ? (
            <div className="h-60 flex flex-col items-center justify-center text-xs text-slate-400 gap-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              <Layers className="w-7 h-7 text-slate-300 dark:text-slate-700" />
              <p>
                {tr(
                  'أضف هياكل لعرض الرسم البياني المقارن لنسب الإنجاز والصحة.',
                  'Add structures to display the comparative completion & accuracy chart.'
                )}
              </p>
            </div>
          ) : (
            <div className="h-64 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={structureComparisonData}
                  margin={{ top: 10, right: 12, left: -12, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    interval={0}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                  />
                  <Tooltip
                    formatter={(value: any, name: any) => [
                      `${value}%`,
                      name === 'completion'
                        ? tr('نسبة الإنجاز', 'Completion')
                        : tr('متوسط الصحة', 'Accuracy'),
                    ]}
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid rgba(148,163,184,0.25)',
                      backgroundColor: 'rgba(15,23,42,0.95)',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Legend
                    formatter={(val) =>
                      val === 'completion'
                        ? tr('نسبة الإنجاز %', 'Completion %')
                        : tr('متوسط الصحة %', 'Accuracy %')
                    }
                  />
                  <Bar
                    dataKey="completion"
                    fill="#f59e0b"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={30}
                  />
                  <Bar
                    dataKey="accuracy"
                    fill="#10b981"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={30}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Right Column: Student Grade Cohort Breakdown & Structure Status Pie */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" />
                <span>
                  {tr('توزيع الطلاب حسب الصفوف والحالات', 'Students by Grade & Status')}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {tr(
                  'الفعالون vs المنتهي كورسهم لكل صف دراسي',
                  'Active vs Completed Course per grade'
                )}
              </p>
            </div>
            <span className="font-mono tabular-nums text-xs font-black text-indigo-600 dark:text-indigo-400">
              {students.length} {tr('طالب', 'students')}
            </span>
          </div>

          {studentGradeDistribution.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              {tr('لا توجد بيانات طلاب لعرض التوزيع البياني.', 'No student records available.')}
            </div>
          ) : (
            <div className="h-44 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={studentGradeDistribution}
                  margin={{ top: 5, right: 8, left: -16, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
                  <XAxis
                    dataKey="grade"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    interval={0}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                  />
                  <Tooltip
                    formatter={(value: any, name: any) => [
                      value,
                      name === 'active'
                        ? tr('ملف فعال', 'Active')
                        : name === 'completed'
                        ? tr('منتهي الكورس', 'Course Completed')
                        : tr('متوقف/منقطع', 'Paused/Withdrawn'),
                    ]}
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid rgba(148,163,184,0.25)',
                      backgroundColor: 'rgba(15,23,42,0.95)',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Bar
                    dataKey="active"
                    stackId="st"
                    fill="#10b981"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="completed"
                    stackId="st"
                    fill="#0284c7"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="other"
                    stackId="st"
                    fill="#f59e0b"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Structure Status Breakdown Mini Pie */}
          {statusPieData.length > 0 && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
              <div className="space-y-1.5 text-xs">
                <div className="font-black text-slate-800 dark:text-slate-100">
                  {tr('توزيع حالات الهياكل', 'Structure Status Breakdown')}
                </div>
                {statusPieData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-slate-600 dark:text-slate-300">
                      {item.name}:
                    </span>
                    <span className="font-mono tabular-nums font-black text-slate-900 dark:text-white">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
              <div className="w-28 h-24 shrink-0" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      dataKey="value"
                      innerRadius={22}
                      outerRadius={38}
                      paddingAngle={3}
                    >
                      {statusPieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Student Completion Distribution Tiers (0-25%, 26-50%, 51-75%, 76-100%) */}
      {structures.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
              {tr(
                'تحليل فئات إنجاز الطلاب في الهياكل (يمكنك اختيار هيكل محدد أو عرض المتوسط العام):',
                'Student Completion Tiers (select a specific structure or view aggregate average):'
              )}
            </span>
            <select
              value={selectedStructId}
              onChange={(e) => {
                setSelectedStructId(e.target.value);
                setBucketFilter('all');
              }}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 cursor-pointer"
            >
              <option value="all">
                {tr(
                  `جميع الهياكل المفلترة (${filteredStructures.length})`,
                  `All Filtered Structures (${filteredStructures.length})`
                )}
              </option>
              {structures.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} ({translateGrade(s.grade, lang)})
                </option>
              ))}
            </select>
          </div>

          <StructureCompletionDistributionChart
            key={selectedStructId}
            selectedStructure={selectedStructure}
            allFilteredStructures={filteredStructures}
            students={students}
            structureProgress={structureProgress}
            filterStatus="exclude_completed"
            activeBucketFilter={bucketFilter}
            onSelectBucketFilter={setBucketFilter}
            onRemindStudents={
              onRemindBucketFromDashboard
                ? (ids, label) => {
                    const target =
                      selectedStructure ||
                      filteredStructures.find(
                        (s) => getEffectiveStructureStatus(s) !== 'completed'
                      ) ||
                      filteredStructures[0];
                    if (target) {
                      onRemindBucketFromDashboard(target, ids, label);
                    }
                  }
                : undefined
            }
          />
        </div>
      )}
    </section>
  );
};
