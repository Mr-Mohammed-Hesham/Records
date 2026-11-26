import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import {
  BarChart3,
  PieChart as PieChartIcon,
  BellRing,
  Filter,
  Users,
  CheckCircle2,
} from 'lucide-react';
import {
  ExamStructure,
  Student,
  StudentStructureProgress,
} from '../types';
import { getEffectiveEnrollmentStatus } from '../utils/studentStatus';
import { useLanguage } from '../utils/i18n';

export type CompletionBucketId = '0-25' | '26-50' | '51-75' | '76-100';

export interface CompletionBucketSummary {
  id: CompletionBucketId;
  rangeLabel: string;
  levelLabel: string;
  color: string;
  badgeTextClass: string;
  barBgClass: string;
  count: number;
  percentageOfCohort: number;
  studentIds: string[];
  zeroStartCount: number;
}

interface StructureCompletionDistributionChartProps {
  selectedStructure: ExamStructure | null;
  allFilteredStructures: ExamStructure[];
  students: Student[];
  structureProgress: StudentStructureProgress[];
  filterStatus: string;
  activeBucketFilter: 'all' | CompletionBucketId;
  onSelectBucketFilter: (bucket: 'all' | CompletionBucketId) => void;
  onRemindStudents?: (studentIds: string[], contextTitle: string) => void;
}

const BUCKET_DEFINITIONS: Array<{
  id: CompletionBucketId;
  rangeLabel: string;
  levelLabelAr: string;
  levelLabelEn: string;
  color: string;
  badgeTextClass: string;
  barBgClass: string;
}> = [
  {
    id: '0-25',
    rangeLabel: '0% - 25%',
    levelLabelAr: 'بداية الحل / يحتاج متابعة',
    levelLabelEn: 'Just Started / Needs Follow-up',
    color: '#e11d48',
    badgeTextClass: 'text-rose-700 dark:text-rose-300',
    barBgClass: 'bg-rose-500',
  },
  {
    id: '26-50',
    rangeLabel: '26% - 50%',
    levelLabelAr: 'تقدم مبدئي',
    levelLabelEn: 'Early Progress',
    color: '#d97706',
    badgeTextClass: 'text-amber-700 dark:text-amber-300',
    barBgClass: 'bg-amber-500',
  },
  {
    id: '51-75',
    rangeLabel: '51% - 75%',
    levelLabelAr: 'تقدم جيد',
    levelLabelEn: 'Good Progress',
    color: '#0284c7',
    badgeTextClass: 'text-sky-700 dark:text-sky-300',
    barBgClass: 'bg-sky-500',
  },
  {
    id: '76-100',
    rangeLabel: '76% - 100%',
    levelLabelAr: 'إنجاز مرتفع / مكتمل',
    levelLabelEn: 'High Completion / Done',
    color: '#059669',
    badgeTextClass: 'text-emerald-700 dark:text-emerald-300',
    barBgClass: 'bg-emerald-500',
  },
];

export function resolveCompletionBucket(pct: number): CompletionBucketId {
  if (pct <= 25) return '0-25';
  if (pct <= 50) return '26-50';
  if (pct <= 75) return '51-75';
  return '76-100';
}

export const StructureCompletionDistributionChart: React.FC<
  StructureCompletionDistributionChartProps
> = ({
  selectedStructure,
  allFilteredStructures,
  students,
  structureProgress,
  filterStatus,
  activeBucketFilter,
  onSelectBucketFilter,
  onRemindStudents,
}) => {
  const { lang, dir, tr } = useLanguage();
  const [scope, setScope] = useState<'selected' | 'all_filtered'>(
    selectedStructure ? 'selected' : 'all_filtered'
  );
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');

  const effectiveScope: 'selected' | 'all_filtered' =
    scope === 'selected' && selectedStructure ? 'selected' : 'all_filtered';

  const studentMap = useMemo(
    () => new Map(students.map((s) => [s.id, s])),
    [students]
  );

  // Latest attempt per (structureId, studentDocId)
  const latestProgressByStructAndStudent = useMemo(() => {
    const map = new Map<string, Map<string, StudentStructureProgress>>();
    structureProgress.forEach((p) => {
      let structMap = map.get(p.structureId);
      if (!structMap) {
        structMap = new Map<string, StudentStructureProgress>();
        map.set(p.structureId, structMap);
      }
      const prev = structMap.get(p.studentDocId);
      if (!prev) {
        structMap.set(p.studentDocId, p);
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
        structMap.set(p.studentDocId, p);
      }
    });
    return map;
  }, [structureProgress]);

  const distribution = useMemo(() => {
    const targetStructures =
      effectiveScope === 'selected' && selectedStructure
        ? [selectedStructure]
        : allFilteredStructures;

    const studentCompletionAcc = new Map<
      string,
      { sumPct: number; structCount: number; hasZeroOnly: boolean }
    >();

    const passesEnrollmentFilter = (studentObj: Student | undefined): boolean => {
      if (!studentObj) return true;
      const eff = getEffectiveEnrollmentStatus(studentObj);
      if (filterStatus === 'exclude_completed' && eff === 'completed') return false;
      if (
        filterStatus !== 'الكل' &&
        filterStatus !== 'exclude_completed' &&
        eff !== filterStatus
      ) {
        return false;
      }
      return true;
    };

    targetStructures.forEach((st) => {
      const excludedSet = new Set(st.excludedStudentIds || []);
      const structProgressMap =
        latestProgressByStructAndStudent.get(st.id) ||
        new Map<string, StudentStructureProgress>();

      const cohortStudentIds = new Set<string>();

      structProgressMap.forEach((_rec, studentDocId) => {
        if (excludedSet.has(studentDocId)) return;
        const stObj = studentMap.get(studentDocId);
        if (!passesEnrollmentFilter(stObj)) return;
        cohortStudentIds.add(studentDocId);
      });

      students.forEach((student) => {
        if (excludedSet.has(student.id)) return;
        if (!passesEnrollmentFilter(student)) return;
        if (cohortStudentIds.has(student.id)) return;
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
        cohortStudentIds.add(student.id);
      });

      cohortStudentIds.forEach((studentDocId) => {
        const rec = structProgressMap.get(studentDocId);
        const totalQ = Math.max(1, st.totalQuestions || st.questions?.length || 1);
        const solvedQ = rec ? Math.min(totalQ, Math.max(0, rec.solvedCount || 0)) : 0;
        const pct = rec
          ? rec.completionPercentage ?? Math.round((solvedQ / totalQ) * 1000) / 10
          : 0;

        const existing = studentCompletionAcc.get(studentDocId);
        if (!existing) {
          studentCompletionAcc.set(studentDocId, {
            sumPct: pct,
            structCount: 1,
            hasZeroOnly: pct === 0,
          });
        } else {
          existing.sumPct += pct;
          existing.structCount += 1;
          existing.hasZeroOnly = existing.hasZeroOnly && pct === 0;
        }
      });
    });

    const bucketMap = new Map<CompletionBucketId, { ids: string[]; zeroCount: number }>([
      ['0-25', { ids: [], zeroCount: 0 }],
      ['26-50', { ids: [], zeroCount: 0 }],
      ['51-75', { ids: [], zeroCount: 0 }],
      ['76-100', { ids: [], zeroCount: 0 }],
    ]);

    let totalPctSum = 0;

    studentCompletionAcc.forEach((entry, studentDocId) => {
      const avgPct = entry.structCount > 0 ? entry.sumPct / entry.structCount : 0;
      totalPctSum += avgPct;
      const bucketId = resolveCompletionBucket(avgPct);
      const bucket = bucketMap.get(bucketId)!;
      bucket.ids.push(studentDocId);
      if (entry.hasZeroOnly) bucket.zeroCount += 1;
    });

    const totalStudents = studentCompletionAcc.size;
    const avgCohortPct =
      totalStudents > 0 ? Math.round((totalPctSum / totalStudents) * 10) / 10 : 0;

    const buckets: CompletionBucketSummary[] = BUCKET_DEFINITIONS.map((def) => {
      const data = bucketMap.get(def.id)!;
      return {
        id: def.id,
        rangeLabel: def.rangeLabel,
        levelLabel: lang === 'ar' ? def.levelLabelAr : def.levelLabelEn,
        color: def.color,
        badgeTextClass: def.badgeTextClass,
        barBgClass: def.barBgClass,
        count: data.ids.length,
        percentageOfCohort:
          totalStudents > 0
            ? Math.round((data.ids.length / totalStudents) * 1000) / 10
            : 0,
        studentIds: data.ids,
        zeroStartCount: data.zeroCount,
      };
    });

    return {
      totalStudents,
      avgCohortPct,
      buckets,
    };
  }, [
    effectiveScope,
    selectedStructure,
    allFilteredStructures,
    latestProgressByStructAndStudent,
    studentMap,
    students,
    filterStatus,
    lang,
  ]);

  const nonZeroPieBuckets = useMemo(
    () => distribution.buckets.filter((b) => b.count > 0),
    [distribution.buckets]
  );

  const needsFollowupIds = useMemo(() => {
    const b1 = distribution.buckets.find((b) => b.id === '0-25')?.studentIds || [];
    const b2 = distribution.buckets.find((b) => b.id === '26-50')?.studentIds || [];
    return [...b1, ...b2];
  }, [distribution.buckets]);

  if (allFilteredStructures.length === 0 && !selectedStructure) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 space-y-4">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-500 shrink-0" />
            <span>{tr('توزيع نسب الإنجاز للطلاب', 'Student Completion Distribution')}</span>
          </h3>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5">
            <span>
              {effectiveScope === 'selected' && selectedStructure
                ? selectedStructure.title
                : tr(
                    `متوسط جميع الهياكل المعروضة (${allFilteredStructures.length} هيكل)`,
                    `Average across ${allFilteredStructures.length} structures`
                  )}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {distribution.totalStudents} {tr('طالب', 'students')}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {tr('متوسط الإنجاز', 'Avg completion')} {distribution.avgCohortPct}%
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Scope Toggle */}
          {selectedStructure && allFilteredStructures.length > 1 && (
            <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px]">
              <button
                type="button"
                onClick={() => setScope('selected')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                  effectiveScope === 'selected'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tr('الهيكل المحدد', 'Selected Structure')}
              </button>
              <button
                type="button"
                onClick={() => setScope('all_filtered')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                  effectiveScope === 'all_filtered'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tr(`كل الهياكل (${allFilteredStructures.length})`, `All (${allFilteredStructures.length})`)}
              </button>
            </div>
          )}

          {/* Chart Type Toggle */}
          <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px]">
            <button
              type="button"
              onClick={() => setChartType('bar')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                chartType === 'bar'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>{tr('أعمدة', 'Bar')}</span>
            </button>
            <button
              type="button"
              onClick={() => setChartType('pie')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                chartType === 'pie'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <PieChartIcon className="w-3.5 h-3.5" />
              <span>{tr('دائري', 'Pie')}</span>
            </button>
          </div>

          {onRemindStudents && needsFollowupIds.length > 0 && (
            <button
              type="button"
              onClick={() =>
                onRemindStudents(
                  needsFollowupIds,
                  tr(
                    'الطلاب الأقل من 50% إنجاز (يحتاجون متابعة)',
                    'Students under 50% completion'
                  )
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[11px] font-bold transition cursor-pointer whitespace-nowrap shrink-0"
              title={tr(
                'فتح نافذة تذكير للطلاب ذوي نسبة الإنجاز 0% - 50%',
                'Send reminder to students in 0%-50% tier'
              )}
            >
              <BellRing className="w-3.5 h-3.5" />
              <span>
                {tr(`تذكير فئة ≤ 50% (${needsFollowupIds.length})`, `Remind ≤ 50% (${needsFollowupIds.length})`)}
              </span>
            </button>
          )}
        </div>
      </div>

      {distribution.totalStudents === 0 ? (
        <div className="py-10 text-center space-y-2">
          <Users className="w-7 h-7 text-slate-300 dark:text-slate-600 mx-auto" />
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
            {tr(
              'لا يوجد طلاب مطابقين لعرض توزيع نسب الإنجاز حالياً',
              'No matching students for completion distribution'
            )}
          </p>
          <p className="text-[11px] text-slate-400">
            {tr(
              'أضف طلاباً مطابقين للصف والمسار أو قم بتسجيل حل الطلاب في هذا الهيكل ليظهر التوزيع البياني هنا.',
              'Add matching students or record solved questions to view the distribution.'
            )}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          {/* Chart Viewport */}
          <div className="lg:col-span-7 h-[240px] sm:h-[260px] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart
                  data={distribution.buckets}
                  margin={{ top: 14, right: 14, left: -16, bottom: 8 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#cbd5e1"
                    opacity={0.45}
                  />
                  <XAxis
                    dataKey="rangeLabel"
                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }}
                    tickLine={false}
                    interval={0}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '12px',
                      border: '1px solid #334155',
                      color: '#fff',
                      fontSize: '12px',
                      direction: dir,
                      textAlign: lang === 'ar' ? 'right' : 'left',
                    }}
                    formatter={(value: any, _name: any, item: any) => {
                      const b: CompletionBucketSummary | undefined = item?.payload;
                      const pctText = b
                        ? ` (${b.percentageOfCohort}% ${tr('من الطلاب', 'of cohort')})`
                        : '';
                      return [`${value} ${tr('طالب', 'students')}${pctText}`, tr('عدد الطلاب', 'Count')];
                    }}
                    labelFormatter={(_label, payload) => {
                      const b: CompletionBucketSummary | undefined = payload?.[0]?.payload;
                      return b ? `${b.rangeLabel} — ${b.levelLabel}` : _label;
                    }}
                  />
                  <Bar
                    dataKey="count"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={56}
                    onClick={(entry: any) => {
                      if (effectiveScope === 'selected' && entry?.id) {
                        onSelectBucketFilter(
                          activeBucketFilter === entry.id ? 'all' : entry.id
                        );
                      }
                    }}
                    className={effectiveScope === 'selected' ? 'cursor-pointer' : ''}
                  >
                    {distribution.buckets.map((bucket) => {
                      const isDimmed =
                        effectiveScope === 'selected' &&
                        activeBucketFilter !== 'all' &&
                        activeBucketFilter !== bucket.id;
                      return (
                        <Cell
                          key={bucket.id}
                          fill={bucket.color}
                          fillOpacity={isDimmed ? 0.35 : 0.95}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              ) : (
                <PieChart>
                  <Pie
                    data={nonZeroPieBuckets}
                    cx="50%"
                    cy="46%"
                    innerRadius={50}
                    outerRadius={82}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="rangeLabel"
                    label={({ rangeLabel, percentageOfCohort }: any) =>
                      `${rangeLabel} (${percentageOfCohort}%)`
                    }
                    onClick={(entry: any) => {
                      if (effectiveScope === 'selected' && entry?.id) {
                        onSelectBucketFilter(
                          activeBucketFilter === entry.id ? 'all' : entry.id
                        );
                      }
                    }}
                    className={effectiveScope === 'selected' ? 'cursor-pointer' : ''}
                  >
                    {nonZeroPieBuckets.map((bucket) => (
                      <Cell key={bucket.id} fill={bucket.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '12px',
                      border: '1px solid #334155',
                      color: '#fff',
                      fontSize: '12px',
                      direction: dir,
                      textAlign: lang === 'ar' ? 'right' : 'left',
                    }}
                    formatter={(value: any, _name: any, item: any) => {
                      const b: CompletionBucketSummary | undefined = item?.payload;
                      return [
                        `${value} ${tr('طالب', 'students')} (${b?.percentageOfCohort || 0}%)`,
                        b?.levelLabel || tr('الفئة', 'Tier'),
                      ];
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={30}
                    formatter={(value) => (
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mx-1">
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Interactive Bucket Breakdown List */}
          <div className="lg:col-span-5 divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            {distribution.buckets.map((bucket) => {
              const isActive =
                effectiveScope === 'selected' && activeBucketFilter === bucket.id;
              return (
                <div
                  key={bucket.id}
                  className={`px-3 py-2.5 flex items-center justify-between gap-2.5 transition ${
                    isActive
                      ? 'bg-amber-50/80 dark:bg-amber-950/30'
                      : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <button
                    type="button"
                    disabled={effectiveScope !== 'selected'}
                    onClick={() =>
                      onSelectBucketFilter(isActive ? 'all' : bucket.id)
                    }
                    className={`flex-1 min-w-0 text-start ${
                      effectiveScope === 'selected'
                        ? 'cursor-pointer'
                        : 'cursor-default'
                    }`}
                    title={
                      effectiveScope === 'selected'
                        ? tr('اضغط لتصفية جدول الطلاب على هذه الفئة', 'Click to filter table')
                        : undefined
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-2.5 h-2.5 rounded-sm shrink-0 ${bucket.barBgClass}`}
                        />
                        <span className="font-mono font-black text-xs text-slate-900 dark:text-white tabular-nums">
                          {bucket.rangeLabel}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {bucket.levelLabel}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 font-mono tabular-nums text-xs">
                        <span className={`font-black ${bucket.badgeTextClass}`}>
                          {bucket.count}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          ({bucket.percentageOfCohort}%)
                        </span>
                      </div>
                    </div>

                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1.5">
                      <div
                        className={`h-full transition-all ${bucket.barBgClass}`}
                        style={{ width: `${Math.min(100, bucket.percentageOfCohort)}%` }}
                      />
                    </div>
                  </button>

                  {onRemindStudents && bucket.count > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        onRemindStudents(
                          bucket.studentIds,
                          `${tr('فئة إنجاز', 'Tier')} ${bucket.rangeLabel}`
                        )
                      }
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-400 transition cursor-pointer shrink-0"
                      title={tr(
                        `تذكير طلاب فئة ${bucket.rangeLabel} (${bucket.count} طالب)`,
                        `Remind ${bucket.count} students in ${bucket.rangeLabel}`
                      )}
                    >
                      <BellRing className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}

            {effectiveScope === 'selected' && activeBucketFilter !== 'all' && (
              <div className="px-3 py-2 bg-amber-50/60 dark:bg-amber-950/20 flex items-center justify-between gap-2 text-[11px]">
                <span className="font-bold text-amber-800 dark:text-amber-200 inline-flex items-center gap-1">
                  <Filter className="w-3 h-3" />
                  <span>
                    {tr(
                      `جدول الطلاب مفلتر على فئة ${activeBucketFilter}%`,
                      `Filtered by ${activeBucketFilter}%`
                    )}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => onSelectBucketFilter('all')}
                  className="font-black text-amber-700 dark:text-amber-300 hover:underline cursor-pointer whitespace-nowrap"
                >
                  {tr('عرض جميع الفئات', 'Show All')}
                </button>
              </div>
            )}

            {effectiveScope === 'selected' &&
              activeBucketFilter === 'all' &&
              distribution.buckets.some((b) => b.id === '76-100' && b.count > 0) && (
                <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>
                      {tr('اضغط على أي فئة لتصفية الجدول مباشرة', 'Click any tier to filter table')}
                    </span>
                  </span>
                  <span className="font-mono tabular-nums">
                    {tr('متوسط:', 'Avg:')} {distribution.avgCohortPct}%
                  </span>
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
};
