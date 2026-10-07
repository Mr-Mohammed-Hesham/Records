import React, { useState, useEffect, useMemo } from 'react';
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
  AreaChart,
  Area,
  LineChart,
  Line,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import {
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  Activity,
  AlignLeft,
  Compass,
} from 'lucide-react';
import { ChartDisplayType, ExamResult } from '../types';

export interface ChartDataPoint {
  id?: string;
  name: string;
  shortName?: string;
  value: number; // e.g. percentage or count
  secondaryValue?: string | number; // e.g. "18/20"
  date?: string;
  rating?: string;
  color?: string;
}

interface DynamicGradesChartProps {
  data?: ChartDataPoint[];
  results?: ExamResult[];
  distributionData?: Array<{ label: string; value: number; color?: string }>;
  mode?: 'percentage' | 'count' | 'student_timeline' | 'distribution'; // supports all modes
  storageKey?: string;
  defaultType?: ChartDisplayType;
  title?: string;
  subtitle?: string;
  height?: number;
  valueLabel?: string;
}

export const CHART_TYPE_OPTIONS: {
  id: ChartDisplayType;
  label: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { id: 'bar', label: 'أعمدة', icon: BarChart3 },
  { id: 'pie', label: 'دائري', icon: PieChartIcon },
  { id: 'area', label: 'منحنى مساحي', icon: TrendingUp },
  { id: 'line', label: 'خطي', icon: Activity },
  { id: 'horizontal', label: 'أفقي', icon: AlignLeft },
  { id: 'radar', label: 'شبكي', icon: Compass },
];

function getPointColor(val: number, mode: 'percentage' | 'count', explicitColor?: string): string {
  if (explicitColor) return explicitColor;
  if (mode === 'count') return '#f59e0b';
  if (val >= 90) return '#10b981'; // emerald
  if (val >= 80) return '#3b82f6'; // blue
  if (val >= 70) return '#f59e0b'; // amber
  if (val >= 60) return '#f97316'; // orange
  return '#ef4444'; // rose
}

export const DynamicGradesChart: React.FC<DynamicGradesChartProps> = ({
  data,
  results,
  distributionData,
  mode = 'percentage',
  storageKey = 'mh_default_chart_type_v1',
  defaultType = 'bar',
  title,
  subtitle,
  height = 270,
  valueLabel,
}) => {
  const effectiveMode: 'percentage' | 'count' =
    mode === 'count' || mode === 'distribution' ? 'count' : 'percentage';

  const resolvedValueLabel =
    valueLabel || (effectiveMode === 'percentage' ? 'النسبة المئوية' : 'القيمة / العدد');

  const [chartType, setChartType] = useState<ChartDisplayType>(() => {
    try {
      const saved = localStorage.getItem(storageKey) as ChartDisplayType | null;
      if (saved && ['bar', 'pie', 'area', 'line', 'horizontal', 'radar'].includes(saved)) {
        return saved;
      }
    } catch {
      // ignore
    }
    return defaultType;
  });

  const [pieSubMode, setPieSubMode] = useState<'ratings' | 'items'>('ratings');

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, chartType);
    } catch {
      // ignore
    }
  }, [chartType, storageKey]);

  const normalizedData = useMemo<ChartDataPoint[]>(() => {
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    if (Array.isArray(results) && results.length > 0) {
      const sorted = [...results].sort(
        (a, b) => new Date(a.examDate || 0).getTime() - new Date(b.examDate || 0).getTime()
      );
      return sorted.map((r) => ({
        id: r.id,
        name: r.examTitle || 'امتحان',
        value: Number(r.percentage) || 0,
        secondaryValue: `${r.score}/${r.totalScore}`,
        date: r.examDate,
        rating: r.gradeRating,
      }));
    }
    if (Array.isArray(distributionData) && distributionData.length > 0) {
      return distributionData.map((item, idx) => ({
        id: String(idx),
        name: item.label || '',
        value: Number(item.value) || 0,
        color: item.color,
      }));
    }
    return [];
  }, [data, results, distributionData]);

  const enrichedData = useMemo(() => {
    return (normalizedData || []).map((d) => {
      const safeName = String(d?.name || '');
      return {
        ...d,
        name: safeName,
        shortLabel: d?.shortName || (safeName.length > 16 ? safeName.slice(0, 15) + '…' : safeName),
        fillColor: getPointColor(Number(d?.value) || 0, effectiveMode, d?.color),
      };
    });
  }, [normalizedData, effectiveMode]);

  // When effectiveMode === 'percentage' and user selects 'pie', we can show either Rating Distribution or Individual Exam Slices
  const pieData = useMemo(() => {
    if (effectiveMode === 'count' || pieSubMode === 'items') {
      return enrichedData
        .filter((d) => d.value > 0)
        .map((d) => ({
          name: d.name,
          value: d.value,
          color: d.fillColor,
          extra: d.secondaryValue,
        }));
    }

    // Group percentages into academic rating bands for meaningful pie chart
    const bands = [
      { name: 'ممتاز (90% فأعلى)', value: 0, color: '#10b981' },
      { name: 'جيد جداً (80% - 89%)', value: 0, color: '#3b82f6' },
      { name: 'جيد (70% - 79%)', value: 0, color: '#f59e0b' },
      { name: 'مقبول (60% - 69%)', value: 0, color: '#f97316' },
      { name: 'يحتاج تحسين (أقل من 60%)', value: 0, color: '#ef4444' },
    ];

    enrichedData.forEach((d) => {
      if (d.value >= 90) bands[0].value += 1;
      else if (d.value >= 80) bands[1].value += 1;
      else if (d.value >= 70) bands[2].value += 1;
      else if (d.value >= 60) bands[3].value += 1;
      else bands[4].value += 1;
    });

    return bands.filter((b) => b.value > 0);
  }, [enrichedData, effectiveMode, pieSubMode]);

  return (
    <div className="bg-slate-50/90 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4">
      {/* Top Bar: Title + Chart Type Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {title && (
            <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-amber-500" />
              <span>{title}</span>
            </h4>
          )}
          {subtitle && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>

        {/* Chart Shape Switcher Buttons */}
        <div className="flex flex-wrap items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs print:hidden">
          <span className="text-[10px] font-bold text-slate-400 px-2 hidden sm:inline">
            الشكل البياني:
          </span>
          {CHART_TYPE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isActive = chartType === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setChartType(opt.id)}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title={`تبديل إلى رسم بياني ${opt.label}`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-toggle when Pie chart is active in percentage mode */}
      {chartType === 'pie' && effectiveMode === 'percentage' && (
        <div className="flex items-center justify-end gap-1.5 text-[11px] print:hidden">
          <span className="text-slate-400">عرض الدائرة حسب:</span>
          <button
            type="button"
            onClick={() => setPieSubMode('ratings')}
            className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-colors ${
              pieSubMode === 'ratings'
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            توزيع التقديرات
          </button>
          <button
            type="button"
            onClick={() => setPieSubMode('items')}
            className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-colors ${
              pieSubMode === 'items'
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            مقارنة الامتحانات
          </button>
        </div>
      )}

      {/* Chart Canvas */}
      <div style={{ height: `${height}px` }} className="w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'bar' ? (
            <BarChart
              data={enrichedData}
              margin={{ top: 12, right: 12, left: -18, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.45} />
              <XAxis
                dataKey="shortLabel"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                interval={0}
              />
              <YAxis
                domain={effectiveMode === 'percentage' ? [0, 100] : ['auto', 'auto']}
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '12px',
                  border: '1px solid #334155',
                  color: '#fff',
                  fontSize: '12px',
                  direction: 'rtl',
                  textAlign: 'right',
                }}
                formatter={(value: any, _name: any, item: any) => {
                  const extra = item?.payload?.secondaryValue ? ` (${item.payload.secondaryValue})` : '';
                  const unit = effectiveMode === 'percentage' ? '%' : '';
                  return [`${value}${unit}${extra}`, resolvedValueLabel];
                }}
                labelFormatter={(_label, payload) => payload?.[0]?.payload?.name || _label}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={48}>
                {enrichedData.map((entry, idx) => (
                  <Cell key={`bar-cell-${idx}`} fill={entry.fillColor} />
                ))}
              </Bar>
            </BarChart>
          ) : chartType === 'horizontal' ? (
            <BarChart
              layout="vertical"
              data={enrichedData}
              margin={{ top: 8, right: 24, left: 20, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#cbd5e1" opacity={0.45} />
              <XAxis
                type="number"
                domain={effectiveMode === 'percentage' ? [0, 100] : ['auto', 'auto']}
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <YAxis
                type="category"
                dataKey="shortLabel"
                width={95}
                tick={{ fontSize: 11, fill: '#64748b' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '12px',
                  border: '1px solid #334155',
                  color: '#fff',
                  fontSize: '12px',
                  direction: 'rtl',
                  textAlign: 'right',
                }}
                formatter={(value: any, _name: any, item: any) => {
                  const extra = item?.payload?.secondaryValue ? ` (${item.payload.secondaryValue})` : '';
                  const unit = effectiveMode === 'percentage' ? '%' : '';
                  return [`${value}${unit}${extra}`, resolvedValueLabel];
                }}
                labelFormatter={(_label, payload) => payload?.[0]?.payload?.name || _label}
              />
              <Bar dataKey="value" radius={[0, 8, 8, 0]} maxBarSize={28}>
                {enrichedData.map((entry, idx) => (
                  <Cell key={`hbar-cell-${idx}`} fill={entry.fillColor} />
                ))}
              </Bar>
            </BarChart>
          ) : chartType === 'pie' ? (
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="46%"
                innerRadius={52}
                outerRadius={84}
                paddingAngle={3}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name.length > 14 ? name.slice(0, 14) + '…' : name} (${Math.round((percent || 0) * 100)}%)`
                }
                labelLine={true}
              >
                {pieData.map((entry, idx) => (
                  <Cell key={`pie-cell-${idx}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '12px',
                  border: '1px solid #334155',
                  color: '#fff',
                  fontSize: '12px',
                  direction: 'rtl',
                  textAlign: 'right',
                }}
                formatter={(value: any, name: any) => {
                  if (effectiveMode === 'percentage' && pieSubMode === 'items') {
                    return [`${value}%`, name];
                  }
                  return [`${value} امتحان/طالب`, name];
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={32}
                formatter={(value) => (
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mx-1">
                    {value}
                  </span>
                )}
              />
            </PieChart>
          ) : chartType === 'area' ? (
            <AreaChart
              data={enrichedData}
              margin={{ top: 12, right: 16, left: -18, bottom: 20 }}
            >
              <defs>
                <linearGradient id="colorScoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.55} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.45} />
              <XAxis dataKey="shortLabel" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
              <YAxis
                domain={effectiveMode === 'percentage' ? [0, 100] : ['auto', 'auto']}
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '12px',
                  border: '1px solid #334155',
                  color: '#fff',
                  fontSize: '12px',
                  direction: 'rtl',
                  textAlign: 'right',
                }}
                formatter={(value: any, _name: any, item: any) => {
                  const extra = item?.payload?.secondaryValue ? ` (${item.payload.secondaryValue})` : '';
                  const unit = effectiveMode === 'percentage' ? '%' : '';
                  return [`${value}${unit}${extra}`, resolvedValueLabel];
                }}
                labelFormatter={(_label, payload) => payload?.[0]?.payload?.name || _label}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#6366f1"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorScoreGrad)"
                activeDot={{ r: 6, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          ) : chartType === 'line' ? (
            <LineChart
              data={enrichedData}
              margin={{ top: 12, right: 16, left: -18, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.45} />
              <XAxis dataKey="shortLabel" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
              <YAxis
                domain={effectiveMode === 'percentage' ? [0, 100] : ['auto', 'auto']}
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '12px',
                  border: '1px solid #334155',
                  color: '#fff',
                  fontSize: '12px',
                  direction: 'rtl',
                  textAlign: 'right',
                }}
                formatter={(value: any, _name: any, item: any) => {
                  const extra = item?.payload?.secondaryValue ? ` (${item.payload.secondaryValue})` : '';
                  const unit = effectiveMode === 'percentage' ? '%' : '';
                  return [`${value}${unit}${extra}`, resolvedValueLabel];
                }}
                labelFormatter={(_label, payload) => payload?.[0]?.payload?.name || _label}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 5, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
                activeDot={{ r: 7, fill: '#f59e0b' }}
              />
            </LineChart>
          ) : (
            <RadarChart cx="50%" cy="50%" outerRadius="72%" data={enrichedData}>
              <PolarGrid stroke="#94a3b8" opacity={0.4} />
              <PolarAngleAxis dataKey="shortLabel" tick={{ fontSize: 11, fill: '#64748b' }} />
              <PolarRadiusAxis
                angle={30}
                domain={effectiveMode === 'percentage' ? [0, 100] : ['auto', 'auto']}
                tick={{ fontSize: 10, fill: '#64748b' }}
              />
              <Radar
                name={resolvedValueLabel}
                dataKey="value"
                stroke="#f59e0b"
                strokeWidth={2.5}
                fill="#f59e0b"
                fillOpacity={0.35}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '12px',
                  border: '1px solid #334155',
                  color: '#fff',
                  fontSize: '12px',
                  direction: 'rtl',
                  textAlign: 'right',
                }}
                formatter={(value: any) => [`${value}${effectiveMode === 'percentage' ? '%' : ''}`, resolvedValueLabel]}
              />
            </RadarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Legend for Percentage Mode */}
      {effectiveMode === 'percentage' && (
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 pt-3 border-t border-slate-200/80 dark:border-slate-700/70 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> ممتاز (90%+)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> جيد جداً (80-89%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> جيد (70-79%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> مقبول (60-69%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> يحتاج تحسين (&lt;60%)
          </span>
        </div>
      )}
    </div>
  );
};
