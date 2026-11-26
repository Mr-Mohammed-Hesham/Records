import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Clock,
  Wallet,
  Calculator,
  Calendar,
  Plus,
  Save,
  Edit3,
  Archive,
  RotateCcw,
  Trash2,
  Download,
  Upload,
  FileSpreadsheet,
  TrendingUp,
  Target,
  PiggyBank,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Search,
  BarChart3,
  Receipt,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  OvertimeEntry,
  OvertimeMonthlyConfig,
  OvertimeDayType,
  FinancialAdjustmentItem,
} from '../types';
import { exportOvertimeFinancialExcel } from '../utils/excel';
import { useLanguage, AppLanguage } from '../utils/i18n';

interface OvertimeViewProps {
  entries: OvertimeEntry[];
  monthlyConfigs: OvertimeMonthlyConfig[];
  onSaveEntry: (
    entry: Omit<OvertimeEntry, 'id'> & { id?: string }
  ) => Promise<OvertimeEntry>;
  onArchiveEntry: (entryId: string, archived: boolean) => Promise<void>;
  onDeleteEntryPermanently: (entryId: string) => Promise<void>;
  onSaveMonthlyConfig: (
    config: OvertimeMonthlyConfig
  ) => Promise<OvertimeMonthlyConfig>;
  onImportBackupMerge: (
    entries: OvertimeEntry[],
    configs: OvertimeMonthlyConfig[]
  ) => Promise<{ entriesAdded: number; monthsUpdated: number }>;
  onNotify?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const CURRENCY_OPTIONS = [
  { code: 'AED', labelAr: 'درهم إماراتي (AED)', labelEn: 'UAE Dirham (AED)' },
  { code: 'SAR', labelAr: 'ريال سعودي (SAR)', labelEn: 'Saudi Riyal (SAR)' },
  { code: 'EGP', labelAr: 'جنيه مصري (EGP)', labelEn: 'Egyptian Pound (EGP)' },
  { code: 'KWD', labelAr: 'دينار كويتي (KWD)', labelEn: 'Kuwaiti Dinar (KWD)' },
  { code: 'QAR', labelAr: 'ريال قطري (QAR)', labelEn: 'Qatari Riyal (QAR)' },
  { code: 'OMR', labelAr: 'ريال عماني (OMR)', labelEn: 'Omani Rial (OMR)' },
  { code: 'BHD', labelAr: 'دينار بحريني (BHD)', labelEn: 'Bahraini Dinar (BHD)' },
  { code: 'USD', labelAr: 'دولار أمريكي (USD)', labelEn: 'US Dollar (USD)' },
];

const CURRENCY_SYMBOLS: Record<string, string> = {
  AED: 'د.إ',
  SAR: 'ر.س',
  EGP: 'ج.م',
  KWD: 'د.ك',
  QAR: 'ر.ق',
  OMR: 'ر.ع',
  BHD: 'د.ب',
  USD: '$',
};

const ARABIC_DAYS = [
  'الأحد',
  'الاثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

const ENGLISH_DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const ARABIC_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

const ENGLISH_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WORK_CATEGORIES = [
  'تدريس وحصص إضافية',
  'حصص تقوية ومراجعة',
  'تحضير ومناهج',
  'تصحيح ورصد درجات',
  'مناوبة وإشراف',
  'اجتماعات وتدريب',
  'عمل إضافي عام',
];

const WORK_CATEGORY_EN_MAP: Record<string, string> = {
  'تدريس وحصص إضافية': 'Teaching & Extra Classes',
  'حصص تقوية ومراجعة': 'Remedial & Review Sessions',
  'تحضير ومناهج': 'Lesson Prep & Curriculum',
  'تصحيح ورصد درجات': 'Grading & Score Entry',
  'مناوبة وإشراف': 'Duty & Supervision',
  'اجتماعات وتدريب': 'Meetings & Training',
  'عمل إضافي عام': 'General Overtime',
  'عام': 'General',
};

function translateWorkCategory(cat: string, lang: AppLanguage): string {
  if (lang === 'ar') return cat;
  return WORK_CATEGORY_EN_MAP[cat] || cat;
}

const DAY_TYPE_META: Record<
  OvertimeDayType,
  { label: string; labelEn: string; shortLabel: string; shortLabelEn: string }
> = {
  regular: { label: 'يوم عمل عادي', labelEn: 'Regular Workday', shortLabel: 'عادي', shortLabelEn: 'Regular' },
  late_night: { label: 'عمل إضافي مسائي', labelEn: 'Evening Overtime', shortLabel: 'مسائي', shortLabelEn: 'Evening' },
  weekend: { label: 'عطلة نهاية الأسبوع', labelEn: 'Weekend', shortLabel: 'نهاية أسبوع', shortLabelEn: 'Weekend' },
  holiday: { label: 'عطلة رسمية / إجازة', labelEn: 'Official Holiday', shortLabel: 'عطلة رسمية', shortLabelEn: 'Holiday' },
  custom: { label: 'معامل مخصص', labelEn: 'Custom Multiplier', shortLabel: 'مخصص', shortLabelEn: 'Custom' },
};

function getTodayDateISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getCurrentMonthKey(): string {
  return getTodayDateISO().slice(0, 7);
}

function getArabicDayName(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return ARABIC_DAYS[dt.getDay()] || '';
}

function getDisplayDayName(dateStr: string, lang: AppLanguage, fallbackAr?: string): string {
  if (lang === 'ar') return fallbackAr || getArabicDayName(dateStr);
  if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return ENGLISH_DAYS[dt.getDay()] || fallbackAr || '';
  }
  const idx = fallbackAr ? ARABIC_DAYS.indexOf(fallbackAr) : -1;
  return idx >= 0 ? ENGLISH_DAYS[idx] : (fallbackAr || '');
}

function getDayIndex(dateStr: string): number {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return 1;
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

function formatArabicMonthLabel(monthKey: string, lang: AppLanguage = 'ar'): string {
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) return monthKey;
  const [y, m] = monthKey.split('-').map(Number);
  const list = lang === 'en' ? ENGLISH_MONTHS : ARABIC_MONTHS;
  const name = list[(m || 1) - 1] || '';
  return `${name} ${y}`;
}

function shiftMonthKey(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(y, (m || 1) - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function computeHourlyRate(cfg: OvertimeMonthlyConfig): number {
  if (cfg.calculationMode === 'manual_hourly') {
    return Math.max(0, Number(cfg.manualHourlyRate) || 0);
  }
  const salary = Math.max(0, Number(cfg.totalSalary) || 0);
  const ratio = Math.max(1, Math.min(100, Number(cfg.basicSalaryRatioPct ?? 100))) / 100;
  const days = Math.max(1, Number(cfg.workingDaysPerMonth) || 26);
  const hoursPerDay = Math.max(1, Number(cfg.workingHoursPerDay) || 8);
  return Math.round(((salary * ratio) / (days * hoursPerDay)) * 100) / 100;
}

function buildDefaultMonthConfig(
  monthKey: string,
  allConfigs: OvertimeMonthlyConfig[]
): OvertimeMonthlyConfig {
  // Carry forward previous salary config defaults cleanly if available so user doesn't retype every month
  const sorted = [...allConfigs].sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  const template = sorted.find((c) => c.monthKey < monthKey) || sorted[0];

  return {
    id: monthKey,
    monthKey,
    currency: template?.currency || 'AED',
    totalSalary: template?.totalSalary || 0,
    basicSalaryRatioPct: template?.basicSalaryRatioPct ?? 100,
    calculationMode: template?.calculationMode || 'from_salary',
    workingDaysPerMonth: template?.workingDaysPerMonth || 26,
    workingHoursPerDay: template?.workingHoursPerDay || 8,
    manualHourlyRate: template?.manualHourlyRate || 0,
    regularMultiplier: template?.regularMultiplier || 1.25,
    weekendMultiplier: template?.weekendMultiplier || 1.5,
    holidayMultiplier: template?.holidayMultiplier || 2.0,
    adjustments: [],
    savingsGoalPct: template?.savingsGoalPct ?? 20,
    monthlyTargetIncome: template?.monthlyTargetIncome || 0,
    notes: '',
    updatedAt: new Date().toISOString(),
  };
}

function formatMoney(amount: number, currency: string): string {
  const sym = CURRENCY_SYMBOLS[currency] || currency;
  const formatted = Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatted} ${sym}`;
}

export const OvertimeView: React.FC<OvertimeViewProps> = ({
  entries,
  monthlyConfigs,
  onSaveEntry,
  onArchiveEntry,
  onDeleteEntryPermanently,
  onSaveMonthlyConfig,
  onImportBackupMerge,
  onNotify,
}) => {
  const { lang, dir, tr } = useLanguage();
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(() => getCurrentMonthKey());
  const [activeTab, setActiveTab] = useState<
    'daily' | 'payslip' | 'helpers' | 'analytics' | 'archive'
  >('daily');

  const storedConfig = useMemo(
    () => monthlyConfigs.find((c) => c.monthKey === selectedMonthKey || c.id === selectedMonthKey) || null,
    [monthlyConfigs, selectedMonthKey]
  );

  // Editable draft of the selected month's salary/financial configuration
  const [configDraft, setConfigDraft] = useState<OvertimeMonthlyConfig>(() =>
    storedConfig || buildDefaultMonthConfig(selectedMonthKey, monthlyConfigs)
  );
  const [configDirty, setConfigDirty] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    setConfigDraft(storedConfig || buildDefaultMonthConfig(selectedMonthKey, monthlyConfigs));
    setConfigDirty(false);
  }, [selectedMonthKey, storedConfig]);

  const effectiveHourlyRate = useMemo(() => computeHourlyRate(configDraft), [configDraft]);

  // Active (non-archived) & archived entries
  const activeEntries = useMemo(() => entries.filter((e) => !e.archived), [entries]);
  const archivedEntries = useMemo(
    () =>
      entries
        .filter((e) => Boolean(e.archived))
        .sort((a, b) => (b.archivedAt || b.updatedAt || '').localeCompare(a.archivedAt || a.updatedAt || '')),
    [entries]
  );

  // Entries for selected month
  const monthEntries = useMemo(
    () =>
      activeEntries
        .filter((e) => e.monthKey === selectedMonthKey)
        .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || '')),
    [activeEntries, selectedMonthKey]
  );

  const [entrySearch, setEntrySearch] = useState('');
  const [dayTypeFilter, setDayTypeFilter] = useState<'all' | OvertimeDayType>('all');

  const filteredMonthEntries = useMemo(() => {
    return monthEntries.filter((e) => {
      if (dayTypeFilter !== 'all' && e.dayType !== dayTypeFilter) return false;
      if (entrySearch.trim()) {
        const q = entrySearch.trim().toLowerCase();
        const hit =
          (e.date || '').includes(q) ||
          (e.dayNameAr || '').toLowerCase().includes(q) ||
          (e.category || '').toLowerCase().includes(q) ||
          (e.notes || '').toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [monthEntries, dayTypeFilter, entrySearch]);

  // Monthly Financial Summary Calculations
  const monthStats = useMemo(() => {
    const totalHours = monthEntries.reduce((acc, e) => acc + (Number(e.hours) || 0), 0);
    const totalOvertimePay = monthEntries.reduce((acc, e) => acc + (Number(e.calculatedAmount) || 0), 0);
    const regularHours = monthEntries
      .filter((e) => e.dayType === 'regular' || e.dayType === 'custom')
      .reduce((acc, e) => acc + (Number(e.hours) || 0), 0);
    const regularPay = monthEntries
      .filter((e) => e.dayType === 'regular' || e.dayType === 'custom')
      .reduce((acc, e) => acc + (Number(e.calculatedAmount) || 0), 0);
    const premiumHours = monthEntries
      .filter((e) => e.dayType === 'late_night' || e.dayType === 'weekend' || e.dayType === 'holiday')
      .reduce((acc, e) => acc + (Number(e.hours) || 0), 0);
    const premiumPay = monthEntries
      .filter((e) => e.dayType === 'late_night' || e.dayType === 'weekend' || e.dayType === 'holiday')
      .reduce((acc, e) => acc + (Number(e.calculatedAmount) || 0), 0);

    const uniqueDays = new Set(monthEntries.map((e) => e.date)).size;
    const avgHoursPerDay = uniqueDays > 0 ? totalHours / uniqueDays : 0;

    const adjustments = configDraft.adjustments || [];
    const totalBonuses = adjustments
      .filter((a) => a.type === 'bonus' || a.type === 'allowance')
      .reduce((acc, a) => acc + (Number(a.amount) || 0), 0);
    const totalDeductions = adjustments
      .filter((a) => a.type === 'deduction')
      .reduce((acc, a) => acc + (Number(a.amount) || 0), 0);

    const baseSalary = Number(configDraft.totalSalary) || 0;
    const netTotalPayout = baseSalary + totalOvertimePay + totalBonuses - totalDeductions;
    const overtimeBoostPct = baseSalary > 0 ? (totalOvertimePay / baseSalary) * 100 : 0;

    return {
      totalHours,
      totalOvertimePay,
      regularHours,
      regularPay,
      premiumHours,
      premiumPay,
      uniqueDays,
      avgHoursPerDay,
      totalBonuses,
      totalDeductions,
      baseSalary,
      netTotalPayout,
      overtimeBoostPct,
    };
  }, [monthEntries, configDraft]);

  // Daily Entry Form State
  const defaultEntryDateForMonth = (mk: string) => {
    const today = getTodayDateISO();
    return today.startsWith(mk) ? today : `${mk}-01`;
  };

  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [entryDate, setEntryDate] = useState<string>(() => defaultEntryDateForMonth(selectedMonthKey));
  const [entryHours, setEntryHours] = useState<string>('2');
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [calcHoursInput, setCalcHoursInput] = useState<string>('');
  const [calcMinutesInput, setCalcMinutesInput] = useState<string>('');
  const [entryDayType, setEntryDayType] = useState<OvertimeDayType>('regular');
  const [entryMultiplier, setEntryMultiplier] = useState<string>(String(configDraft.regularMultiplier || 1.25));
  const [useCustomFixedAmount, setUseCustomFixedAmount] = useState(false);
  const [customFixedAmount, setCustomFixedAmount] = useState<string>('');
  const [entryCategory, setEntryCategory] = useState<string>(WORK_CATEGORIES[0]);
  const [entryNotes, setEntryNotes] = useState<string>('');
  const [savingEntry, setSavingEntry] = useState(false);

  // When selectedMonthKey changes and not editing an entry, align entryDate to that month
  useEffect(() => {
    if (!editingEntryId) {
      setEntryDate(defaultEntryDateForMonth(selectedMonthKey));
    }
  }, [selectedMonthKey, editingEntryId]);

  // Auto-update day type & multiplier when date changes for a new entry
  const handleEntryDateChange = (newDate: string) => {
    setEntryDate(newDate);
    if (!editingEntryId && newDate) {
      const dayIdx = getDayIndex(newDate);
      // Friday (5) or Saturday (6) in UAE
      if (dayIdx === 5 || dayIdx === 6) {
        setEntryDayType('weekend');
        setEntryMultiplier(String(configDraft.weekendMultiplier || 1.5));
      } else {
        setEntryDayType('regular');
        setEntryMultiplier(String(configDraft.regularMultiplier || 1.25));
      }
    }
  };

  const handleSelectDayType = (dt: OvertimeDayType) => {
    setEntryDayType(dt);
    if (dt === 'regular') {
      setEntryMultiplier(String(configDraft.regularMultiplier || 1.25));
    } else if (dt === 'late_night' || dt === 'weekend') {
      setEntryMultiplier(String(configDraft.weekendMultiplier || 1.5));
    } else if (dt === 'holiday') {
      setEntryMultiplier(String(configDraft.holidayMultiplier || 2.0));
    }
  };

  // Auto calculate hours when startTime & endTime are both set
  const handleTimeRangeChange = (nextStart: string, nextEnd: string) => {
    setStartTime(nextStart);
    setEndTime(nextEnd);
    if (nextStart && nextEnd) {
      const [sh, sm] = nextStart.split(':').map(Number);
      const [eh, em] = nextEnd.split(':').map(Number);
      let startMin = sh * 60 + sm;
      let endMin = eh * 60 + em;
      if (endMin < startMin) {
        endMin += 24 * 60; // overnight overtime
      }
      const diffHours = Math.round(((endMin - startMin) / 60) * 100) / 100;
      if (diffHours > 0) {
        setEntryHours(String(diffHours));
      }
    }
  };

  // Auto calculate decimal hours from hours + minutes helper
  const handleHoursMinutesChange = (hStr: string, mStr: string) => {
    setCalcHoursInput(hStr);
    setCalcMinutesInput(mStr);
    const h = Math.max(0, Number(hStr) || 0);
    const m = Math.max(0, Number(mStr) || 0);
    const total = Math.round((h + m / 60) * 100) / 100;
    if (total > 0) {
      setEntryHours(String(total));
    }
  };

  const previewHoursNum = Math.max(0, Number(entryHours) || 0);
  const previewMultiplierNum = Math.max(0, Number(entryMultiplier) || 0);
  const previewAmount = useMemo(() => {
    if (useCustomFixedAmount) {
      return Math.max(0, Number(customFixedAmount) || 0);
    }
    return Math.round(previewHoursNum * effectiveHourlyRate * previewMultiplierNum * 100) / 100;
  }, [useCustomFixedAmount, customFixedAmount, previewHoursNum, effectiveHourlyRate, previewMultiplierNum]);

  const resetEntryForm = () => {
    setEditingEntryId(null);
    setEntryDate(defaultEntryDateForMonth(selectedMonthKey));
    setEntryHours('2');
    setStartTime('');
    setEndTime('');
    setCalcHoursInput('');
    setCalcMinutesInput('');
    setEntryDayType('regular');
    setEntryMultiplier(String(configDraft.regularMultiplier || 1.25));
    setUseCustomFixedAmount(false);
    setCustomFixedAmount('');
    setEntryCategory(WORK_CATEGORIES[0]);
    setEntryNotes('');
  };

  const handleSaveSalaryConfig = async (silent = false) => {
    setSavingConfig(true);
    try {
      const saved = await onSaveMonthlyConfig({
        ...configDraft,
        id: selectedMonthKey,
        monthKey: selectedMonthKey,
        updatedAt: new Date().toISOString(),
      });
      setConfigDraft(saved);
      setConfigDirty(false);
      if (!silent) {
        onNotify?.(
          tr(
            `تم حفظ إعدادات الراتب والعمل لشهر ${formatArabicMonthLabel(selectedMonthKey, 'ar')} بنجاح`,
            `Salary and work settings saved for ${formatArabicMonthLabel(selectedMonthKey, 'en')}`
          )
        );
      }
      return saved;
    } finally {
      setSavingConfig(false);
    }
  };

  const handleRecalculateMonthEntries = async () => {
    if (monthEntries.length === 0) return;
    if (configDirty) {
      await handleSaveSalaryConfig(true);
    }
    let updatedCount = 0;
    for (const item of monthEntries) {
      if (item.customFixedAmount !== undefined && item.customFixedAmount > 0) continue;
      const newAmount =
        Math.round((Number(item.hours) || 0) * effectiveHourlyRate * (Number(item.multiplier) || 1) * 100) / 100;
      await onSaveEntry({
        ...item,
        hourlyRateSnapshot: effectiveHourlyRate,
        calculatedAmount: newAmount,
      });
      updatedCount++;
    }
    onNotify?.(
      tr(
        `تم إعادة احتساب ${updatedCount} سجل أوفر تايم وفق أجر الساعة الجديد (${effectiveHourlyRate.toFixed(2)})`,
        `Recalculated ${updatedCount} overtime entries at hourly rate (${effectiveHourlyRate.toFixed(2)})`
      )
    );
  };

  const handleSubmitEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryDate) {
      onNotify?.(tr('يرجى تحديد التاريخ', 'Please select a date'), 'error');
      return;
    }
    const hrs = Number(entryHours);
    if (!Number.isFinite(hrs) || hrs <= 0) {
      onNotify?.(tr('يرجى إدخال عدد ساعات أوفر تايم أكبر من 0', 'Please enter overtime hours greater than 0'), 'error');
      return;
    }

    setSavingEntry(true);
    try {
      // Ensure month config is persisted automatically if user typed salary & immediately logged hours
      if (configDirty || !storedConfig) {
        await handleSaveSalaryConfig(true);
      }

      const targetMonthKey = entryDate.slice(0, 7);
      const dayNameAr = getArabicDayName(entryDate);
      const displayDay = getDisplayDayName(entryDate, lang, dayNameAr);
      const mult = Math.max(0, Number(entryMultiplier) || 1);
      const calcAmt = useCustomFixedAmount
        ? Math.max(0, Number(customFixedAmount) || 0)
        : Math.round(hrs * effectiveHourlyRate * mult * 100) / 100;

      await onSaveEntry({
        id: editingEntryId || undefined,
        date: entryDate,
        monthKey: targetMonthKey,
        dayNameAr,
        hours: hrs,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        dayType: entryDayType,
        multiplier: mult,
        hourlyRateSnapshot: effectiveHourlyRate,
        calculatedAmount: calcAmt,
        customFixedAmount: useCustomFixedAmount ? Math.max(0, Number(customFixedAmount) || 0) : undefined,
        category: entryCategory,
        notes: entryNotes.trim() || undefined,
        archived: false,
        createdAt: editingEntryId
          ? entries.find((x) => x.id === editingEntryId)?.createdAt || new Date().toISOString()
          : new Date().toISOString(),
      });

      if (targetMonthKey !== selectedMonthKey) {
        setSelectedMonthKey(targetMonthKey);
      }
      onNotify?.(
        editingEntryId
          ? tr(
              `تم تحديث سجل يوم ${dayNameAr} (${entryDate}) بنجاح`,
              `Updated ${displayDay} (${entryDate}) entry successfully`
            )
          : tr(
              `تم تسجيل ${hrs} ساعة أوفر تايم ليوم ${dayNameAr} (${entryDate}) بمبلغ ${formatMoney(calcAmt, configDraft.currency)}`,
              `Logged ${hrs}h overtime for ${displayDay} (${entryDate}) — ${formatMoney(calcAmt, configDraft.currency)}`
            )
      );
      resetEntryForm();
    } finally {
      setSavingEntry(false);
    }
  };

  const handleStartEditEntry = (entry: OvertimeEntry) => {
    setEditingEntryId(entry.id);
    setEntryDate(entry.date);
    setEntryHours(String(entry.hours));
    setStartTime(entry.startTime || '');
    setEndTime(entry.endTime || '');
    setEntryDayType(entry.dayType);
    setEntryMultiplier(String(entry.multiplier));
    if (entry.customFixedAmount !== undefined && entry.customFixedAmount > 0) {
      setUseCustomFixedAmount(true);
      setCustomFixedAmount(String(entry.customFixedAmount));
    } else {
      setUseCustomFixedAmount(false);
      setCustomFixedAmount('');
    }
    setEntryCategory(entry.category || WORK_CATEGORIES[0]);
    setEntryNotes(entry.notes || '');
    setActiveTab('daily');
  };

  // Financial Adjustments (Bonuses / Allowances / Deductions) inside Payslip tab
  const [adjType, setAdjType] = useState<'bonus' | 'allowance' | 'deduction'>('allowance');
  const [adjTitle, setAdjTitle] = useState('');
  const [adjAmount, setAdjAmount] = useState('');
  const [adjDate, setAdjDate] = useState('');
  const [adjNotes, setAdjNotes] = useState('');

  const handleAddAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(adjAmount);
    if (!adjTitle.trim() || !Number.isFinite(amt) || amt <= 0) {
      onNotify?.(tr('يرجى كتابة اسم البند المالي والمبلغ بشكل صحيح', 'Please enter a valid item title and amount'), 'error');
      return;
    }
    const newItem: FinancialAdjustmentItem = {
      id: `adj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: adjType,
      title: adjTitle.trim(),
      amount: amt,
      date: adjDate || undefined,
      notes: adjNotes.trim() || undefined,
    };
    const updatedCfg: OvertimeMonthlyConfig = {
      ...configDraft,
      id: selectedMonthKey,
      monthKey: selectedMonthKey,
      adjustments: [...(configDraft.adjustments || []), newItem],
      updatedAt: new Date().toISOString(),
    };
    setConfigDraft(updatedCfg);
    await onSaveMonthlyConfig(updatedCfg);
    setConfigDirty(false);
    setAdjTitle('');
    setAdjAmount('');
    setAdjDate('');
    setAdjNotes('');
    onNotify?.(tr('تمت إضافة البند المالي وحفظه للشهر بنجاح', 'Financial item added and saved for the month'));
  };

  const handleRemoveAdjustment = async (adjId: string) => {
    const updatedCfg: OvertimeMonthlyConfig = {
      ...configDraft,
      id: selectedMonthKey,
      monthKey: selectedMonthKey,
      adjustments: (configDraft.adjustments || []).filter((a) => a.id !== adjId),
      updatedAt: new Date().toISOString(),
    };
    setConfigDraft(updatedCfg);
    await onSaveMonthlyConfig(updatedCfg);
    setConfigDirty(false);
    onNotify?.(tr('تم تحديث قائمة البدلات والاستقطاعات', 'Allowances & deductions updated'));
  };

  // Goal Seek & Budget Helpers
  const [desiredExtraOvertimeInput, setDesiredExtraOvertimeInput] = useState<string>('1500');
  const [budgetEssentialsPct, setBudgetEssentialsPct] = useState<number>(50);
  const [budgetPersonalPct, setBudgetPersonalPct] = useState<number>(30);
  const budgetSavingsPct = Math.max(0, 100 - budgetEssentialsPct - budgetPersonalPct);

  // Permanent deletion double-check state (only inside Archive tab)
  const [confirmPermanentDeleteEntry, setConfirmPermanentDeleteEntry] = useState<OvertimeEntry | null>(null);
  const backupFileInputRef = useRef<HTMLInputElement | null>(null);

  // Multi-month analytics & comparisons
  const allMonthKeys = useMemo(() => {
    const keys = new Set<string>([selectedMonthKey]);
    activeEntries.forEach((e) => {
      if (e.monthKey) keys.add(e.monthKey);
    });
    monthlyConfigs.forEach((c) => {
      if (c.monthKey) keys.add(c.monthKey);
    });
    return Array.from(keys).sort();
  }, [activeEntries, monthlyConfigs, selectedMonthKey]);

  const multiMonthSummary = useMemo(() => {
    return allMonthKeys.map((mk) => {
      const cfg =
        mk === selectedMonthKey
          ? configDraft
          : monthlyConfigs.find((c) => c.monthKey === mk || c.id === mk) ||
            buildDefaultMonthConfig(mk, monthlyConfigs);
      const list = activeEntries.filter((e) => e.monthKey === mk);
      const hours = Math.round(list.reduce((a, b) => a + (Number(b.hours) || 0), 0) * 100) / 100;
      const overtimePay = Math.round(list.reduce((a, b) => a + (Number(b.calculatedAmount) || 0), 0) * 100) / 100;
      const salary = Number(cfg.totalSalary) || 0;
      const adj = cfg.adjustments || [];
      const bonuses = adj.filter((a) => a.type !== 'deduction').reduce((a, b) => a + (Number(b.amount) || 0), 0);
      const deductions = adj.filter((a) => a.type === 'deduction').reduce((a, b) => a + (Number(b.amount) || 0), 0);
      const netTotal = Math.round((salary + overtimePay + bonuses - deductions) * 100) / 100;

      return {
        monthKey: mk,
        label: formatArabicMonthLabel(mk, lang),
        daysCount: new Set(list.map((e) => e.date)).size,
        entriesCount: list.length,
        hours,
        salary,
        overtimePay,
        bonuses,
        deductions,
        netTotal,
        currency: cfg.currency || configDraft.currency || 'AED',
      };
    });
  }, [allMonthKeys, activeEntries, monthlyConfigs, selectedMonthKey, configDraft, lang]);

  const selectedYear = selectedMonthKey.slice(0, 4);
  const ytdStats = useMemo(() => {
    const yearMonths = multiMonthSummary.filter((m) => m.monthKey.startsWith(selectedYear));
    return {
      totalHours: yearMonths.reduce((a, b) => a + b.hours, 0),
      totalOvertimePay: yearMonths.reduce((a, b) => a + b.overtimePay, 0),
      totalSalary: yearMonths.reduce((a, b) => a + b.salary, 0),
      totalNet: yearMonths.reduce((a, b) => a + b.netTotal, 0),
      monthsActive: yearMonths.filter((m) => m.hours > 0 || m.salary > 0).length,
    };
  }, [multiMonthSummary, selectedYear]);

  // Export JSON backup (non-destructive safety archive)
  const handleExportJsonBackup = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      version: 1,
      type: 'hesham_records_overtime_financial_backup',
      overtimeEntries: entries,
      overtimeMonthlyConfigs: monthlyConfigs,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download =
      lang === 'en'
        ? `finance_overtime_backup_${getTodayDateISO()}.json`
        : `نسخة_احتياطية_الأوفر_تايم_والمالية_${getTodayDateISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify?.(
      tr(
        'تم تنزيل النسخة الاحتياطية الكاملة لبيانات الأوفر تايم والمالية بنجاح',
        'Full finance & overtime JSON backup downloaded'
      )
    );
  };

  const handleImportJsonBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const importedEntries = Array.isArray(parsed?.overtimeEntries) ? parsed.overtimeEntries : [];
      const importedConfigs = Array.isArray(parsed?.overtimeMonthlyConfigs) ? parsed.overtimeMonthlyConfigs : [];
      if (importedEntries.length === 0 && importedConfigs.length === 0) {
        onNotify?.(tr('الملف لا يحتوي على سجلات أوفر تايم صالحة', 'File does not contain valid overtime records'), 'error');
        return;
      }
      const res = await onImportBackupMerge(importedEntries, importedConfigs);
      onNotify?.(
        tr(
          `تم الدمج الآمن بنجاح دون حذف أي بيانات: أُضيف ${res.entriesAdded} سجل يومي و ${res.monthsUpdated} إعداد شهر`,
          `Merged safely without deleting data: added ${res.entriesAdded} entries and updated ${res.monthsUpdated} month configs`
        )
      );
    } catch {
      onNotify?.(
        tr('تعذر قراءة ملف النسخة الاحتياطية، تأكد أنه ملف JSON صحيح', 'Could not read backup file; ensure it is valid JSON'),
        'error'
      );
    } finally {
      e.target.value = '';
    }
  };

  const handleCopyPayslipSummary = () => {
    const sym = CURRENCY_SYMBOLS[configDraft.currency] || configDraft.currency;
    const mLabel = formatArabicMonthLabel(selectedMonthKey, lang);
    const text =
      lang === 'en'
        ? [
            `Financial & Overtime Statement — ${mLabel} (${selectedMonthKey})`,
            `• Base Monthly Salary: ${monthStats.baseSalary.toFixed(2)} ${sym}`,
            `• Base Hourly Rate: ${effectiveHourlyRate.toFixed(2)} ${sym}`,
            `• Total Overtime Hours: ${monthStats.totalHours.toFixed(2)} hrs (${monthStats.uniqueDays} days)`,
            `• Total Overtime Pay: ${monthStats.totalOvertimePay.toFixed(2)} ${sym}`,
            `• Allowances & Bonuses: +${monthStats.totalBonuses.toFixed(2)} ${sym}`,
            `• Deductions: -${monthStats.totalDeductions.toFixed(2)} ${sym}`,
            `• Net Monthly Payout: ${monthStats.netTotalPayout.toFixed(2)} ${sym}`,
          ].join('\n')
        : [
            `كشف المستحقات المالية والأوفر تايم — ${mLabel} (${selectedMonthKey})`,
            `• الراتب الكلي: ${monthStats.baseSalary.toFixed(2)} ${sym}`,
            `• أجر الساعة الأساسي: ${effectiveHourlyRate.toFixed(2)} ${sym}`,
            `• إجمالي ساعات الأوفر تايم: ${monthStats.totalHours.toFixed(2)} ساعة (${monthStats.uniqueDays} يوم)`,
            `• قيمة الأوفر تايم المستحقة: ${monthStats.totalOvertimePay.toFixed(2)} ${sym}`,
            `• البدلات والمكافآت: +${monthStats.totalBonuses.toFixed(2)} ${sym}`,
            `• الاستقطاعات: -${monthStats.totalDeductions.toFixed(2)} ${sym}`,
            `• صافي المستحق للشهر: ${monthStats.netTotalPayout.toFixed(2)} ${sym}`,
          ].join('\n');
    navigator.clipboard?.writeText(text).then(
      () => onNotify?.(tr('تم نسخ ملخص الكشف المالي للشهر إلى الحافظة', 'Monthly statement copied to clipboard')),
      () => onNotify?.(tr('تعذر النسخ التلقائي إلى الحافظة', 'Could not copy automatically'), 'error')
    );
  };

  const previousMonthConfig = useMemo(() => {
    const prevKey = shiftMonthKey(selectedMonthKey, -1);
    return monthlyConfigs.find((c) => c.monthKey === prevKey || c.id === prevKey) || null;
  }, [monthlyConfigs, selectedMonthKey]);

  const currencyCode = configDraft.currency || 'AED';

  // Goal Seek computations
  const desiredExtraVal = Math.max(0, Number(desiredExtraOvertimeInput) || 0);
  const regRate = effectiveHourlyRate * (Number(configDraft.regularMultiplier) || 1.25);
  const wkndRate = effectiveHourlyRate * (Number(configDraft.weekendMultiplier) || 1.5);
  const hoursNeededForExtraReg = regRate > 0 ? desiredExtraVal / regRate : 0;
  const hoursNeededForExtraWknd = wkndRate > 0 ? desiredExtraVal / wkndRate : 0;
  const targetMonthlyIncome = Number(configDraft.monthlyTargetIncome) || 0;
  const remainingToTargetIncome = Math.max(0, targetMonthlyIncome - monthStats.netTotalPayout);
  const hoursRemainingToTarget = regRate > 0 ? remainingToTargetIncome / regRate : 0;

  return (
    <div id="overtime-view" className="space-y-5 text-start" dir={dir}>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Wallet className="w-6 h-6 text-amber-500 shrink-0" />
            <span>{tr('المالية', 'Finance & Overtime')}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
            <span>{tr('حساب الأوفر تايم باليوم والشهر من الراتب الكلي مع حفظ دائم ومساعدات مالية متكاملة', 'Calculate daily & monthly overtime from total salary with permanent backup and financial tools')}</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              {tr('البيانات محمية ولا تُحذف تلقائياً', 'Data is protected and never auto-deleted')}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() =>
              exportOvertimeFinancialExcel({
                selectedMonthKey,
                monthLabelAr: formatArabicMonthLabel(selectedMonthKey, lang),
                config: configDraft,
                monthEntries,
                allEntries: activeEntries,
                allConfigs: monthlyConfigs,
                effectiveHourlyRate,
              })
            }
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 rounded-xl transition cursor-pointer whitespace-nowrap"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{tr('تصدير Excel', 'Export Excel')}</span>
          </button>

          <button
            type="button"
            onClick={handleExportJsonBackup}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition cursor-pointer whitespace-nowrap"
            title={tr('تنزيل نسخة احتياطية كاملة بصيغة JSON لحماية سجلات الأوفر تايم', 'Download a full JSON backup of all overtime records')}
          >
            <Download className="w-4 h-4 text-amber-500 shrink-0" />
            <span>{tr('نسخة احتياطية', 'JSON Backup')}</span>
          </button>

          <input
            ref={backupFileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportJsonBackup}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => backupFileInputRef.current?.click()}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition cursor-pointer whitespace-nowrap"
            title={tr('استيراد ودمج نسخة احتياطية دون حذف أي بيانات حالية', 'Import and merge a backup without deleting existing records')}
          >
            <Upload className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>{tr('استيراد/دمج آمن', 'Safe Import / Merge')}</span>
          </button>
        </div>
      </div>

      {/* Month Switcher Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedMonthKey(shiftMonthKey(selectedMonthKey, -1))}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
              title={tr('الشهر السابق', 'Previous month')}
            >
              <ChevronRight className="w-4 h-4 ltr:rotate-180" />
            </button>

            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <Calendar className="w-4 h-4 text-amber-500" />
              <input
                type="month"
                value={selectedMonthKey}
                onChange={(e) => e.target.value && setSelectedMonthKey(e.target.value)}
                className="bg-transparent text-xs sm:text-sm font-black font-mono text-slate-900 dark:text-white focus:outline-hidden cursor-pointer"
              />
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                ({formatArabicMonthLabel(selectedMonthKey, lang)})
              </span>
            </div>

            <button
              type="button"
              onClick={() => setSelectedMonthKey(shiftMonthKey(selectedMonthKey, 1))}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
              title={tr('الشهر التالي', 'Next month')}
            >
              <ChevronLeft className="w-4 h-4 ltr:rotate-180" />
            </button>

            {selectedMonthKey !== getCurrentMonthKey() && (
              <button
                type="button"
                onClick={() => setSelectedMonthKey(getCurrentMonthKey())}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 cursor-pointer"
              >
                {tr('الشهر الحالي', 'Current Month')}
              </button>
            )}
          </div>

          {/* Quick Jump to Recorded Months */}
          <div className="flex flex-wrap items-center gap-1.5">
            {multiMonthSummary.slice(-6).map((m) => {
              const active = m.monthKey === selectedMonthKey;
              return (
                <button
                  key={m.monthKey}
                  type="button"
                  onClick={() => setSelectedMonthKey(m.monthKey)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition cursor-pointer font-mono tabular-nums ${
                    active
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {formatArabicMonthLabel(m.monthKey, lang)} ({m.hours}{tr('س', 'h')})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Salary & Hourly Rate Configuration Panel */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Calculator className="w-5 h-5 text-amber-500" />
              <span>
                {tr(
                  `الراتب الكلي وإعدادات احتساب ساعة الأوفر تايم لشهر ${formatArabicMonthLabel(selectedMonthKey, 'ar')}`,
                  `Total Salary & Overtime Rate Settings — ${formatArabicMonthLabel(selectedMonthKey, 'en')}`
                )}
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {tr(
                'أدخل الراتب الكلي وطريقة حساب أجر الساعة ومعاملات الأوفر تايم، وسيتم حساب كل يوم والشهر بالكامل تلقائياً',
                'Enter total salary, hourly rate mode, and overtime multipliers to automatically calculate daily and monthly payouts'
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {previousMonthConfig && (
              <button
                type="button"
                onClick={() => {
                  setConfigDraft((prev) => ({
                    ...prev,
                    currency: previousMonthConfig.currency,
                    totalSalary: previousMonthConfig.totalSalary,
                    basicSalaryRatioPct: previousMonthConfig.basicSalaryRatioPct ?? 100,
                    calculationMode: previousMonthConfig.calculationMode,
                    workingDaysPerMonth: previousMonthConfig.workingDaysPerMonth,
                    workingHoursPerDay: previousMonthConfig.workingHoursPerDay,
                    manualHourlyRate: previousMonthConfig.manualHourlyRate,
                    regularMultiplier: previousMonthConfig.regularMultiplier,
                    weekendMultiplier: previousMonthConfig.weekendMultiplier,
                    holidayMultiplier: previousMonthConfig.holidayMultiplier,
                  }));
                  setConfigDirty(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-amber-500" />
                <span>{tr('نسخ راتب الشهر السابق', 'Copy Previous Month')}</span>
              </button>
            )}

            {monthEntries.length > 0 && (
              <button
                type="button"
                onClick={handleRecalculateMonthEntries}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-indigo-700 dark:text-indigo-300 cursor-pointer"
                title={tr('تحديث المبالغ المحسوبة لأيام هذا الشهر بعد تعديل الراتب أو أجر الساعة', 'Update calculated amounts for this month after changing salary or hourly rate')}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{tr('إعادة احتساب أيام الشهر', 'Recalculate Month')}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleSaveSalaryConfig(false)}
              disabled={savingConfig}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                configDirty
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              }`}
            >
              {configDirty ? <Save className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>
                {savingConfig
                  ? tr('جاري الحفظ...', 'Saving...')
                  : configDirty
                  ? tr('حفظ إعدادات الراتب', 'Save Salary Settings')
                  : tr('الإعدادات محفوظة', 'Settings Saved')}
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Total Salary */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              {tr('الراتب الكلي للشهر', 'Total Monthly Salary')}
            </label>
            <input
              type="number"
              min={0}
              step="any"
              value={configDraft.totalSalary || ''}
              onChange={(e) => {
                setConfigDraft((prev) => ({
                  ...prev,
                  totalSalary: Math.max(0, Number(e.target.value) || 0),
                }));
                setConfigDirty(true);
              }}
              placeholder={tr('مثال: 12000', 'e.g. 12000')}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black font-mono tabular-nums text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500"
            />
          </div>

          {/* Currency */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              {tr('العملة المالية', 'Currency')}
            </label>
            <select
              value={configDraft.currency}
              onChange={(e) => {
                setConfigDraft((prev) => ({ ...prev, currency: e.target.value }));
                setConfigDirty(true);
              }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>
                  {lang === 'en' ? c.labelEn : c.labelAr}
                </option>
              ))}
            </select>
          </div>

          {/* Hourly Rate Mode */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              {tr('طريقة حساب أجر الساعة', 'Hourly Rate Calculation')}
            </label>
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => {
                  setConfigDraft((prev) => ({ ...prev, calculationMode: 'from_salary' }));
                  setConfigDirty(true);
                }}
                className={`py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                  configDraft.calculationMode === 'from_salary'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {tr('من الراتب الكلي', 'From Total Salary')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfigDraft((prev) => ({ ...prev, calculationMode: 'manual_hourly' }));
                  setConfigDirty(true);
                }}
                className={`py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                  configDraft.calculationMode === 'manual_hourly'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {tr('سعر ساعة يدوي', 'Manual Hourly Rate')}
              </button>
            </div>
          </div>

          {/* Hourly Basis Parameters or Manual Rate */}
          {configDraft.calculationMode === 'from_salary' ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                {tr('أيام الشهر × ساعات اليوم × وعاء %', 'Days/mo × Hrs/day × Basis %')}
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={configDraft.workingDaysPerMonth}
                  onChange={(e) => {
                    setConfigDraft((prev) => ({
                      ...prev,
                      workingDaysPerMonth: Math.max(1, Number(e.target.value) || 26),
                    }));
                    setConfigDirty(true);
                  }}
                  title={tr('عدد أيام العمل في الشهر', 'Working days per month')}
                  className="px-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-center text-slate-900 dark:text-white"
                />
                <input
                  type="number"
                  min={1}
                  max={24}
                  step="0.5"
                  value={configDraft.workingHoursPerDay}
                  onChange={(e) => {
                    setConfigDraft((prev) => ({
                      ...prev,
                      workingHoursPerDay: Math.max(1, Number(e.target.value) || 8),
                    }));
                    setConfigDirty(true);
                  }}
                  title={tr('ساعات العمل اليومية', 'Working hours per day')}
                  className="px-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-center text-slate-900 dark:text-white"
                />
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={configDraft.basicSalaryRatioPct ?? 100}
                  onChange={(e) => {
                    setConfigDraft((prev) => ({
                      ...prev,
                      basicSalaryRatioPct: Math.max(1, Math.min(100, Number(e.target.value) || 100)),
                    }));
                    setConfigDirty(true);
                  }}
                  title={tr('نسبة الوعاء المحتسب من الراتب الكلي %', 'Basic salary basis percentage %')}
                  className="px-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-center text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                {[
                  { d: 22, h: 8, labelAr: '22ي×8س', labelEn: '22d×8h' },
                  { d: 26, h: 8, labelAr: '26ي×8س', labelEn: '26d×8h' },
                  { d: 30, h: 8, labelAr: '30ي×8س', labelEn: '30d×8h' },
                ].map((preset) => (
                  <button
                    key={preset.labelEn}
                    type="button"
                    onClick={() => {
                      setConfigDraft((prev) => ({
                        ...prev,
                        workingDaysPerMonth: preset.d,
                        workingHoursPerDay: preset.h,
                      }));
                      setConfigDirty(true);
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer border ${
                      configDraft.workingDaysPerMonth === preset.d &&
                      configDraft.workingHoursPerDay === preset.h
                        ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {lang === 'en' ? preset.labelEn : preset.labelAr}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                {tr('أجر الساعة الأساسي', 'Base Hourly Rate')} ({CURRENCY_SYMBOLS[currencyCode] || currencyCode})
              </label>
              <input
                type="number"
                min={0}
                step="any"
                value={configDraft.manualHourlyRate || ''}
                onChange={(e) => {
                  setConfigDraft((prev) => ({
                    ...prev,
                    manualHourlyRate: Math.max(0, Number(e.target.value) || 0),
                  }));
                  setConfigDirty(true);
                }}
                placeholder={tr('مثال: 65', 'e.g. 65')}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black font-mono tabular-nums text-slate-900 dark:text-white"
              />
            </div>
          )}
        </div>

        {/* Multipliers & Live Hourly Rate Readout */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-bold">
              <span>{tr('معامل العادي:', 'Regular Mult:')}</span>
              <input
                type="number"
                step="0.05"
                min={0.5}
                value={configDraft.regularMultiplier}
                onChange={(e) => {
                  const val = Math.max(0.5, Number(e.target.value) || 1.25);
                  setConfigDraft((prev) => ({ ...prev, regularMultiplier: val }));
                  if (entryDayType === 'regular') setEntryMultiplier(String(val));
                  setConfigDirty(true);
                }}
                className="w-16 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-center text-slate-900 dark:text-white"
              />
            </label>

            <label className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-bold">
              <span>{tr('معامل الويكند/المسائي:', 'Weekend/Evening Mult:')}</span>
              <input
                type="number"
                step="0.05"
                min={0.5}
                value={configDraft.weekendMultiplier}
                onChange={(e) => {
                  const val = Math.max(0.5, Number(e.target.value) || 1.5);
                  setConfigDraft((prev) => ({ ...prev, weekendMultiplier: val }));
                  if (entryDayType === 'weekend' || entryDayType === 'late_night') {
                    setEntryMultiplier(String(val));
                  }
                  setConfigDirty(true);
                }}
                className="w-16 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-center text-slate-900 dark:text-white"
              />
            </label>

            <label className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-bold">
              <span>{tr('معامل العطلة الرسمية:', 'Holiday Mult:')}</span>
              <input
                type="number"
                step="0.05"
                min={0.5}
                value={configDraft.holidayMultiplier}
                onChange={(e) => {
                  const val = Math.max(0.5, Number(e.target.value) || 2.0);
                  setConfigDraft((prev) => ({ ...prev, holidayMultiplier: val }));
                  if (entryDayType === 'holiday') setEntryMultiplier(String(val));
                  setConfigDirty(true);
                }}
                className="w-16 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-center text-slate-900 dark:text-white"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300">
            <span>
              {tr('أجر الساعة الأساسي:', 'Base Hourly Rate:')}{' '}
              <strong className="text-slate-900 dark:text-white">
                {formatMoney(effectiveHourlyRate, currencyCode)}
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {tr('ساعة العادي', 'Regular Hr')} ({configDraft.regularMultiplier}x):{' '}
              <strong className="text-amber-600 dark:text-amber-400">
                {formatMoney(effectiveHourlyRate * configDraft.regularMultiplier, currencyCode)}
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {tr('ساعة العطلة', 'Weekend Hr')} ({configDraft.weekendMultiplier}x):{' '}
              <strong className="text-emerald-600 dark:text-emerald-400">
                {formatMoney(effectiveHourlyRate * configDraft.weekendMultiplier, currencyCode)}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* 4 Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
            <span>{tr('إجمالي ساعات الأوفر تايم', 'Total Overtime Hours')}</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tabular-nums mt-1.5">
            {monthStats.totalHours.toFixed(2)}{' '}
            <span className="text-xs font-bold text-slate-400">{tr('ساعة', 'hrs')}</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
            {tr(
              `${monthStats.uniqueDays} يوم مسجل · متوسط ${monthStats.avgHoursPerDay.toFixed(1)} س/يوم`,
              `${monthStats.uniqueDays} logged days · avg ${monthStats.avgHoursPerDay.toFixed(1)} h/day`
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
            <span>{tr('قيمة الأوفر تايم هذا الشهر', 'Monthly Overtime Pay')}</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-1.5">
            {formatMoney(monthStats.totalOvertimePay, currencyCode)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
            {monthStats.baseSalary > 0
              ? tr(
                  `زيادة +${monthStats.overtimeBoostPct.toFixed(1)}% عن الراتب الكلي`,
                  `+${monthStats.overtimeBoostPct.toFixed(1)}% boost over base salary`
                )
              : tr('أدخل الراتب الكلي لحساب النسبة', 'Enter total salary to compute ratio')}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
            <span>{tr('الراتب الكلي والبدلات / الخصم', 'Base Salary & Adjustments')}</span>
            <Receipt className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tabular-nums mt-1.5">
            {formatMoney(monthStats.baseSalary, currencyCode)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
            {tr(
              `بدلات: +${monthStats.totalBonuses.toFixed(0)} · استقطاعات: -${monthStats.totalDeductions.toFixed(0)}`,
              `Bonuses: +${monthStats.totalBonuses.toFixed(0)} · Deductions: -${monthStats.totalDeductions.toFixed(0)}`
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-amber-400/70 dark:border-amber-600/60">
          <div className="flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-300">
            <span>{tr('صافي المستحق الكلي للشهر', 'Net Monthly Payout')}</span>
            <Wallet className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono tabular-nums mt-1.5">
            {formatMoney(monthStats.netTotalPayout, currencyCode)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {tr('الراتب الكلي + الأوفر تايم + البدلات − الاستقطاعات', 'Base Salary + Overtime + Bonuses − Deductions')}
          </div>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex sm:flex-wrap items-center gap-1.5 p-1.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
        {[
          { id: 'daily', label: tr('السجل اليومي وساعات الأوفر تايم', 'Daily Overtime Log'), icon: Clock },
          { id: 'payslip', label: tr('البدلات والمكافآت وكشف الراتب', 'Bonuses & Payslip'), icon: Receipt },
          { id: 'helpers', label: tr('المساعدات والتخطيط المالي', 'Financial Helpers & Planning'), icon: PiggyBank },
          { id: 'analytics', label: tr('التحليل والمقارنة الشهرية', 'Monthly Analytics'), icon: BarChart3 },
          { id: 'archive', label: tr(`الأرشيف الآمن (${archivedEntries.length})`, `Safe Archive (${archivedEntries.length})`), icon: Archive },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                active
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: DAILY OVERTIME LOGGER & TABLE */}
      {activeTab === 'daily' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Add / Edit Overtime Day Form */}
          <form
            onSubmit={handleSubmitEntry}
            className="lg:col-span-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                {editingEntryId ? <Edit3 className="w-4 h-4 text-amber-500" /> : <Plus className="w-4 h-4 text-amber-500" />}
                <span>
                  {editingEntryId
                    ? tr('تعديل سجل أوفر تايم', 'Edit Overtime Entry')
                    : tr('تسجيل ساعات أوفر تايم ليوم', 'Log Daily Overtime Hours')}
                </span>
              </h3>
              {editingEntryId && (
                <button
                  type="button"
                  onClick={resetEntryForm}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                >
                  {tr('إلغاء التعديل', 'Cancel Edit')}
                </button>
              )}
            </div>

            {/* Date + Auto Day & Month */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                {tr('التاريخ (اليوم والشهر والسنة)', 'Date (Day, Month, Year)')}
              </label>
              <input
                type="date"
                required
                value={entryDate}
                onChange={(e) => handleEntryDateChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white"
              />
              {entryDate && (
                <div className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <span>
                    {tr('اليوم:', 'Day:')}{' '}
                    <strong className="text-amber-600 dark:text-amber-400">
                      {getDisplayDayName(entryDate, lang)}
                    </strong>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {tr('الشهر:', 'Month:')}{' '}
                    <strong className="text-slate-800 dark:text-slate-200">
                      {formatArabicMonthLabel(entryDate.slice(0, 7), lang)}
                    </strong>
                  </span>
                </div>
              )}
            </div>

            {/* Hours Input + Start/End Time Helper */}
            <div className="space-y-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  {tr('عدد الساعات الأوفر لهذا اليوم', 'Overtime Hours for This Day')}
                </label>
                <input
                  type="number"
                  required
                  min={0.1}
                  max={24}
                  step="any"
                  value={entryHours}
                  onChange={(e) => setEntryHours(e.target.value)}
                  placeholder={tr('مثال: 2.5', 'e.g. 2.5')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black font-mono tabular-nums text-slate-900 dark:text-white"
                />
              </div>

              {/* Optional Time Range & Hours+Minutes converters */}
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  {tr('مساعد حساب الساعات (اختياري): من وقت ← إلى وقت أو ساعات + دقائق', 'Hours Helper (optional): From/To time or Hours + Minutes')}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">{tr('من الساعة', 'From')}</span>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => handleTimeRangeChange(e.target.value, endTime)}
                      className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">{tr('إلى الساعة', 'To')}</span>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => handleTimeRangeChange(startTime, e.target.value)}
                      className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min={0}
                    max={24}
                    placeholder={tr('ساعات (مثال 1)', 'Hours (e.g. 1)')}
                    value={calcHoursInput}
                    onChange={(e) => handleHoursMinutesChange(e.target.value, calcMinutesInput)}
                    className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-mono text-slate-900 dark:text-white"
                  />
                  <input
                    type="number"
                    min={0}
                    max={59}
                    placeholder={tr('دقائق (مثال 30)', 'Minutes (e.g. 30)')}
                    value={calcMinutesInput}
                    onChange={(e) => handleHoursMinutesChange(calcHoursInput, e.target.value)}
                    className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Day Type & Multiplier */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                {tr('نوع اليوم ومعامل الأوفر تايم', 'Day Type & Overtime Multiplier')}
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(['regular', 'late_night', 'weekend', 'holiday'] as OvertimeDayType[]).map((dt) => (
                  <button
                    key={dt}
                    type="button"
                    onClick={() => handleSelectDayType(dt)}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border cursor-pointer transition ${
                      entryDayType === dt
                        ? 'bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300 font-black'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {lang === 'en' ? DAY_TYPE_META[dt].shortLabelEn : DAY_TYPE_META[dt].shortLabel}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">{tr('المعامل:', 'Multiplier:')}</span>
                <input
                  type="number"
                  step="0.05"
                  min={0.5}
                  value={entryMultiplier}
                  onChange={(e) => {
                    setEntryMultiplier(e.target.value);
                    setEntryDayType('custom');
                  }}
                  className="w-24 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white"
                />
                <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 cursor-pointer ms-auto">
                  <input
                    type="checkbox"
                    checked={useCustomFixedAmount}
                    onChange={(e) => setUseCustomFixedAmount(e.target.checked)}
                    className="rounded border-slate-300 text-amber-500"
                  />
                  <span>{tr('مبلغ مقطوع مخصص', 'Custom Fixed Amount')}</span>
                </label>
              </div>
              {useCustomFixedAmount && (
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={customFixedAmount}
                  onChange={(e) => setCustomFixedAmount(e.target.value)}
                  placeholder={`${tr('المبلغ المخصص', 'Custom Amount')} (${CURRENCY_SYMBOLS[currencyCode] || currencyCode})`}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white"
                />
              )}
            </div>

            {/* Category & Notes */}
            <div className="space-y-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  {tr('تصنيف العمل الإضافي', 'Overtime Category')}
                </label>
                <select
                  value={entryCategory}
                  onChange={(e) => setEntryCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
                >
                  {WORK_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {translateWorkCategory(cat, lang)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  {tr('ملاحظات (اختياري)', 'Notes (Optional)')}
                </label>
                <textarea
                  rows={2}
                  value={entryNotes}
                  onChange={(e) => setEntryNotes(e.target.value)}
                  placeholder={tr('تفاصيل العمل في هذا اليوم...', 'Details about this day’s overtime work...')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Live Payout Preview */}
            <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/70 flex items-center justify-between text-xs">
              <div>
                <span className="text-emerald-800 dark:text-emerald-200 font-bold block">
                  {tr('المستحق المحسوب لهذا اليوم', 'Calculated Payout for Day')}
                </span>
                {!useCustomFixedAmount && (
                  <span className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80 font-mono tabular-nums">
                    {previewHoursNum} {tr('س', 'h')} × {effectiveHourlyRate.toFixed(2)} × {previewMultiplierNum}
                  </span>
                )}
              </div>
              <span className="text-lg font-black text-emerald-700 dark:text-emerald-300 font-mono tabular-nums">
                {formatMoney(previewAmount, currencyCode)}
              </span>
            </div>

            <button
              type="submit"
              disabled={savingEntry}
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-sm transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>
                {savingEntry
                  ? tr('جاري الحفظ...', 'Saving...')
                  : editingEntryId
                  ? tr('تحديث السجل وحفظه', 'Update & Save Entry')
                  : tr('تسجيل وحفظ ساعات اليوم', 'Log & Save Day Hours')}
              </span>
            </button>
          </form>

          {/* Daily Overtime Table for Selected Month */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {tr('سجل ساعات الأوفر تايم اليومي', 'Daily Overtime Log')} — {formatArabicMonthLabel(selectedMonthKey, lang)} ({filteredMonthEntries.length} {tr('سجل', 'entries')})
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {tr(
                    'يظهر هنا كل يوم سُجل فيه أوفر تايم مع الحساب المالي الدقيق، ويمكنك الأرشفة الآمنة دون حذف نهائي',
                    'Every day with recorded overtime appears here with exact pay calculations and safe archiving without permanent loss'
                  )}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute start-2.5 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={entrySearch}
                    onChange={(e) => setEntrySearch(e.target.value)}
                    placeholder={tr('بحث بالتاريخ أو اليوم أو الملاحظة...', 'Search by date, day, or notes...')}
                    className="ps-8 pe-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <select
                  value={dayTypeFilter}
                  onChange={(e) => setDayTypeFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <option value="all">{tr('كل الأيام', 'All Days')}</option>
                  <option value="regular">{tr('عادي', 'Regular')}</option>
                  <option value="late_night">{tr('مسائي', 'Evening / Night')}</option>
                  <option value="weekend">{tr('نهاية أسبوع', 'Weekend')}</option>
                  <option value="holiday">{tr('عطلة رسمية', 'Public Holiday')}</option>
                  <option value="custom">{tr('مخصص', 'Custom')}</option>
                </select>
              </div>
            </div>

            {filteredMonthEntries.length === 0 ? (
              <div className="py-12 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                <Clock className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {tr('لا توجد ساعات أوفر تايم مسجلة في', 'No overtime hours recorded in')} {formatArabicMonthLabel(selectedMonthKey, lang)} {tr('حتى الآن', 'yet')}
                </p>
                <p className="text-[11px] text-slate-400">
                  {tr(
                    'استخدم النموذج الجانبي لاختيار التاريخ وإدخال عدد الساعات الأوفر وحفظها فوراً.',
                    'Use the side form to pick a date, enter overtime hours, and save immediately.'
                  )}
                </p>
              </div>
            ) : (
              <>
                {/* Mobile Cards for Daily Entries */}
                <div className="md:hidden space-y-2.5">
                  {filteredMonthEntries.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-black text-slate-900 dark:text-white text-sm">
                            {getDisplayDayName(item.date, lang, item.dayNameAr)}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                            {item.date} · {(lang === 'en' ? DAY_TYPE_META[item.dayType]?.shortLabelEn : DAY_TYPE_META[item.dayType]?.shortLabel) || item.dayType}{' '}
                            ({item.customFixedAmount ? tr('مبلغ ثابت', 'Fixed') : `${item.multiplier}x`})
                          </div>
                        </div>
                        <div className="text-end font-mono tabular-nums">
                          <div className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                            {formatMoney(item.calculatedAmount, currencyCode)}
                          </div>
                          <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                            {Number(item.hours).toFixed(2)} {tr('س', 'h')}
                          </div>
                        </div>
                      </div>

                      {(item.category || item.notes || (item.startTime && item.endTime)) && (
                        <div className="text-[11px] text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-200/70 dark:border-slate-700/70 flex flex-wrap items-center justify-between gap-1.5">
                          <span className="truncate">
                            {translateWorkCategory(item.category || 'عام', lang)}{item.notes ? ` — ${item.notes}` : ''}
                          </span>
                          {item.startTime && item.endTime && (
                            <span className="font-mono text-[10px] text-slate-400" dir="ltr">
                              {item.startTime} → {item.endTime}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleStartEditEntry(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{tr('تعديل', 'Edit')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await onArchiveEntry(item.id, true);
                            onNotify?.(
                              tr(
                                'تم نقل السجل إلى الأرشيف الآمن ويمكن استعادته في أي وقت',
                                'Entry moved to safe archive and can be restored anytime'
                              )
                            );
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-lg cursor-pointer"
                        >
                          <Archive className="w-3.5 h-3.5" />
                          <span>{tr('أرشفة آمنة', 'Safe Archive')}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-center justify-between text-xs font-black">
                    <span className="text-slate-900 dark:text-white">
                      {tr('الإجمالي', 'Total')} ({filteredMonthEntries.length} {tr('سجل', 'entries')} ·{' '}
                      {filteredMonthEntries.reduce((a, b) => a + (Number(b.hours) || 0), 0).toFixed(2)} {tr('س', 'h')})
                    </span>
                    <span className="font-mono tabular-nums text-emerald-700 dark:text-emerald-300">
                      {formatMoney(
                        filteredMonthEntries.reduce((a, b) => a + (Number(b.calculatedAmount) || 0), 0),
                        currencyCode
                      )}
                    </span>
                  </div>
                </div>

                {/* Desktop Table for Daily Entries */}
                <div className="hidden md:block overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-start text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">{tr('التاريخ واليوم', 'Date & Day')}</th>
                        <th className="py-2.5 px-3 text-center">{tr('الساعات', 'Hours')}</th>
                        <th className="py-2.5 px-3 text-center">{tr('النوع / المعامل', 'Type / Multiplier')}</th>
                        <th className="py-2.5 px-3 text-center">{tr('أجر الساعة', 'Hourly Rate')}</th>
                        <th className="py-2.5 px-3 text-center">{tr('المستحق', 'Earnings')}</th>
                        <th className="py-2.5 px-3">{tr('التصنيف والملاحظات', 'Category & Notes')}</th>
                        <th className="py-2.5 px-3 text-center">{tr('إجراءات', 'Actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {filteredMonthEntries.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {getDisplayDayName(item.date, lang, item.dayNameAr)}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                              {item.date}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono tabular-nums whitespace-nowrap">
                            <span className="font-black text-slate-900 dark:text-white">
                              {Number(item.hours).toFixed(2)} {tr('س', 'h')}
                            </span>
                            {item.startTime && item.endTime && (
                              <div className="text-[10px] text-slate-400" dir="ltr">
                                {item.startTime} → {item.endTime}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <div className="font-bold text-slate-800 dark:text-slate-200">
                              {(lang === 'en' ? DAY_TYPE_META[item.dayType]?.shortLabelEn : DAY_TYPE_META[item.dayType]?.shortLabel) || item.dayType}
                            </div>
                            <div className="text-[10px] font-mono text-amber-600 dark:text-amber-400">
                              {item.customFixedAmount ? tr('مبلغ ثابت', 'Fixed') : `${item.multiplier}x`}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {Number(item.hourlyRateSnapshot || 0).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono tabular-nums font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                            {formatMoney(item.calculatedAmount, currencyCode)}
                          </td>
                          <td className="py-2.5 px-3 max-w-[220px]">
                            <div className="font-bold text-slate-800 dark:text-slate-200 truncate">
                              {item.category ? translateWorkCategory(item.category, lang) : '-'}
                            </div>
                            {item.notes && (
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate" title={item.notes}>
                                {item.notes}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleStartEditEntry(item)}
                                className="p-1.5 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                                title={tr('تعديل هذا اليوم', 'Edit this day')}
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  await onArchiveEntry(item.id, true);
                                  onNotify?.(
                                    tr(
                                      'تم نقل السجل إلى الأرشيف الآمن ويمكن استعادته في أي وقت',
                                      'Entry moved to safe archive and can be restored anytime'
                                    )
                                  );
                                }}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg cursor-pointer"
                                title={tr('نقل إلى الأرشيف الآمن (بدون فقدان البيانات)', 'Move to safe archive (no data loss)')}
                              >
                                <Archive className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 font-black">
                      <tr>
                        <td className="py-2.5 px-3 text-slate-900 dark:text-white">
                          {tr('الإجمالي', 'Total')} ({filteredMonthEntries.length} {tr('سجل', 'entries')})
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono tabular-nums text-amber-600 dark:text-amber-400">
                          {filteredMonthEntries.reduce((a, b) => a + (Number(b.hours) || 0), 0).toFixed(2)} {tr('س', 'h')}
                        </td>
                        <td className="py-2.5 px-3" />
                        <td className="py-2.5 px-3" />
                        <td className="py-2.5 px-3 text-center font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                          {formatMoney(
                            filteredMonthEntries.reduce((a, b) => a + (Number(b.calculatedAmount) || 0), 0),
                            currencyCode
                          )}
                        </td>
                        <td colSpan={2} className="py-2.5 px-3" />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ALLOWANCES, BONUSES, DEDUCTIONS & PAYSLIP */}
      {activeTab === 'payslip' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Add Financial Adjustment Form */}
          <form
            onSubmit={handleAddAdjustment}
            className="lg:col-span-5 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4"
          >
            <h3 className="text-base font-black text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800">
              {tr('إضافة بدل أو مكافأة أو استقطاع لشهر', 'Add Allowance, Bonus, or Deduction for')}{' '}
              {formatArabicMonthLabel(selectedMonthKey, lang)}
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                {tr('نوع البند المالي', 'Adjustment Type')}
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                {[
                  { id: 'allowance', label: tr('بدل (+)', 'Allowance (+)') },
                  { id: 'bonus', label: tr('مكافأة (+)', 'Bonus (+)') },
                  { id: 'deduction', label: tr('استقطاع (-)', 'Deduction (-)') },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setAdjType(opt.id as typeof adjType)}
                    className={`py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
                      adjType === opt.id
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  {tr('اسم البند', 'Item Name')}
                </label>
                <input
                  type="text"
                  required
                  value={adjTitle}
                  onChange={(e) => setAdjTitle(e.target.value)}
                  placeholder={tr('مثال: بدل مواصلات / سلفة', 'e.g. Transport allowance / Advance')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  {tr('المبلغ', 'Amount')} ({CURRENCY_SYMBOLS[currencyCode] || currencyCode})
                </label>
                <input
                  type="number"
                  required
                  min={0.01}
                  step="any"
                  value={adjAmount}
                  onChange={(e) => setAdjAmount(e.target.value)}
                  placeholder="500"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  {tr('التاريخ (اختياري)', 'Date (Optional)')}
                </label>
                <input
                  type="date"
                  value={adjDate}
                  onChange={(e) => setAdjDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  {tr('ملاحظات (اختياري)', 'Notes (Optional)')}
                </label>
                <input
                  type="text"
                  value={adjNotes}
                  onChange={(e) => setAdjNotes(e.target.value)}
                  placeholder={tr('سبب البند...', 'Reason / details...')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl cursor-pointer flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{tr('إضافة إلى كشف الشهر', 'Add to Monthly Payslip')}</span>
            </button>

            {(configDraft.adjustments || []).length > 0 && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  {tr('البنود المضافة لهذا الشهر', 'Items added for this month')} ({configDraft.adjustments.length}):
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl">
                  {configDraft.adjustments.map((adj) => (
                    <div
                      key={adj.id}
                      className="px-3 py-2 flex items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">{adj.title}</span>
                        <span className="text-[11px] text-slate-400 ms-2">
                          ({adj.type === 'deduction' ? tr('استقطاع', 'Deduction') : adj.type === 'bonus' ? tr('مكافأة', 'Bonus') : tr('بدل', 'Allowance')})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono font-bold tabular-nums ${
                            adj.type === 'deduction'
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {adj.type === 'deduction' ? '-' : '+'}
                          {formatMoney(adj.amount, currencyCode)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAdjustment(adj.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                          title={tr('إزالة البند', 'Remove Item')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </form>

          {/* Payslip Breakdown Statement */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {tr('كشف المستحقات والراتب التفصيلي', 'Detailed Payslip & Earnings Statement')} — {formatArabicMonthLabel(selectedMonthKey, lang)}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {tr(
                    'ملخص مالي شامل للراتب الكلي + تفصيل الأوفر تايم + البدلات والاستقطاعات',
                    'Full financial summary of total salary + overtime breakdown + allowances & deductions'
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopyPayslipSummary}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-amber-500" />
                <span>{tr('نسخ الكشف نصياً', 'Copy Payslip Text')}</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs sm:text-sm">
              <div className="py-3 flex items-center justify-between">
                <span className="font-bold text-slate-700 dark:text-slate-300">{tr('الراتب الكلي الأساسي للشهر', 'Base Total Monthly Salary')}</span>
                <span className="font-mono font-black tabular-nums text-slate-900 dark:text-white">
                  {formatMoney(monthStats.baseSalary, currencyCode)}
                </span>
              </div>

              <div className="py-3 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{tr('أوفر تايم الأيام العادية والمخصصة', 'Regular & Custom Overtime')}</span>
                  <span className="text-xs text-slate-400 ms-2 font-mono">({monthStats.regularHours.toFixed(2)} {tr('س', 'h')})</span>
                </div>
                <span className="font-mono font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  +{formatMoney(monthStats.regularPay, currencyCode)}
                </span>
              </div>

              <div className="py-3 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{tr('أوفر تايم المسائي والعطلات الرسمية', 'Evening, Weekend & Holiday Overtime')}</span>
                  <span className="text-xs text-slate-400 ms-2 font-mono">({monthStats.premiumHours.toFixed(2)} {tr('س', 'h')})</span>
                </div>
                <span className="font-mono font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  +{formatMoney(monthStats.premiumPay, currencyCode)}
                </span>
              </div>

              <div className="py-3 flex items-center justify-between">
                <span className="font-bold text-slate-700 dark:text-slate-300">{tr('البدلات والمكافآت الإضافية', 'Additional Allowances & Bonuses')}</span>
                <span className="font-mono font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  +{formatMoney(monthStats.totalBonuses, currencyCode)}
                </span>
              </div>

              <div className="py-3 flex items-center justify-between">
                <span className="font-bold text-slate-700 dark:text-slate-300">{tr('الاستقطاعات والسلف', 'Deductions & Advances')}</span>
                <span className="font-mono font-bold tabular-nums text-rose-600 dark:text-rose-400">
                  -{formatMoney(monthStats.totalDeductions, currencyCode)}
                </span>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <span className="text-base font-black text-slate-900 dark:text-white">
                  {tr('صافي الإجمالي المستحق للدفع', 'Net Total Payout')}
                </span>
                <span className="text-xl font-black font-mono tabular-nums text-amber-600 dark:text-amber-400">
                  {formatMoney(monthStats.netTotalPayout, currencyCode)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FINANCIAL HELPERS & PLANNING */}
      {activeTab === 'helpers' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Helper 1: Overtime Goal-Seek Calculator */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Target className="w-5 h-5 text-amber-500" />
              <span>{tr('حاسبة الهدف المالي (كم ساعة أوفر تايم أحتاج؟)', 'Financial Goal Calculator (How many OT hours do I need?)')}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  {tr('مبلغ أوفر تايم إضافي مستهدف', 'Target Extra Overtime Pay')} ({CURRENCY_SYMBOLS[currencyCode] || currencyCode})
                </label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={desiredExtraOvertimeInput}
                  onChange={(e) => setDesiredExtraOvertimeInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  {tr('الهدف الإجمالي للدخل الشهري (يحفظ بالشهر)', 'Target Total Monthly Income (Saved per month)')}
                </label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={configDraft.monthlyTargetIncome || ''}
                  onChange={(e) => {
                    setConfigDraft((prev) => ({
                      ...prev,
                      monthlyTargetIncome: Math.max(0, Number(e.target.value) || 0),
                    }));
                    setConfigDirty(true);
                  }}
                  placeholder={tr('مثال: 15000', 'e.g. 15000')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {tr('ساعات مطلوبة بالمعامل العادي', 'Hours needed at regular rate')} ({configDraft.regularMultiplier}x)
                </div>
                <div className="text-xl font-black font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-1">
                  {hoursNeededForExtraReg.toFixed(1)} {tr('ساعة', 'hrs')}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {tr('ساعات مطلوبة بمعامل العطلة', 'Hours needed at weekend rate')} ({configDraft.weekendMultiplier}x)
                </div>
                <div className="text-xl font-black font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
                  {hoursNeededForExtraWknd.toFixed(1)} {tr('ساعة', 'hrs')}
                </div>
              </div>
            </div>

            {targetMonthlyIncome > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 space-y-2 text-xs">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-slate-800 dark:text-slate-200">
                    {tr('التقدم نحو الهدف الشهري', 'Progress toward monthly goal')} ({formatMoney(targetMonthlyIncome, currencyCode)})
                  </span>
                  <span className="font-mono text-amber-700 dark:text-amber-300">
                    {Math.min(100, Math.round((monthStats.netTotalPayout / targetMonthlyIncome) * 100))}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-all"
                    style={{
                      width: `${Math.min(100, Math.round((monthStats.netTotalPayout / targetMonthlyIncome) * 100))}%`,
                    }}
                  />
                </div>
                <div className="text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                  {remainingToTargetIncome === 0
                    ? tr('تم تحقيق الهدف المالي للشهر بالكامل!', 'Monthly financial goal fully achieved!')
                    : tr(
                        `المتبقي للهدف: ${formatMoney(remainingToTargetIncome, currencyCode)} (≈ ${hoursRemainingToTarget.toFixed(1)} ساعة أوفر تايم عادي)`,
                        `Remaining to target: ${formatMoney(remainingToTargetIncome, currencyCode)} (≈ ${hoursRemainingToTarget.toFixed(1)} regular OT hrs)`
                      )}
                </div>
              </div>
            )}
          </div>

          {/* Helper 2: Budget & Savings Allocation */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <PiggyBank className="w-5 h-5 text-emerald-500" />
              <span>{tr('مساعد الميزانية وتخطيط الادخار الشهري (50 / 30 / 20)', 'Monthly Budget & Savings Planner (50 / 30 / 20)')}</span>
            </h3>

            <div className="grid grid-cols-3 gap-2.5 text-xs">
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">{tr('الأساسيات %', 'Essentials %')}</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={budgetEssentialsPct}
                  onChange={(e) => setBudgetEssentialsPct(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-center text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">{tr('الشخصية %', 'Personal %')}</label>
                <input
                  type="number"
                  min={0}
                  max={100 - budgetEssentialsPct}
                  value={budgetPersonalPct}
                  onChange={(e) =>
                    setBudgetPersonalPct(Math.max(0, Math.min(100 - budgetEssentialsPct, Number(e.target.value) || 0)))
                  }
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-center text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block font-bold text-emerald-600 dark:text-emerald-400 mb-1">{tr('الادخار %', 'Savings %')}</label>
                <div className="px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl font-mono font-black text-center text-emerald-700 dark:text-emerald-300">
                  {budgetSavingsPct}%
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300 font-bold">
                  {tr('مخصص الالتزامات والأساسيات', 'Essentials & Obligations')} ({budgetEssentialsPct}%)
                </span>
                <span className="font-mono font-black tabular-nums text-slate-900 dark:text-white">
                  {formatMoney((monthStats.netTotalPayout * budgetEssentialsPct) / 100, currencyCode)}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300 font-bold">
                  {tr('مخصص النفقات الشخصية', 'Personal Expenses')} ({budgetPersonalPct}%)
                </span>
                <span className="font-mono font-black tabular-nums text-slate-900 dark:text-white">
                  {formatMoney((monthStats.netTotalPayout * budgetPersonalPct) / 100, currencyCode)}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-emerald-700 dark:text-emerald-300 font-bold">
                  {tr('صافي الادخار المقترح لهذا الشهر', 'Recommended Net Savings This Month')} ({budgetSavingsPct}%)
                </span>
                <span className="font-mono font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatMoney((monthStats.netTotalPayout * budgetSavingsPct) / 100, currencyCode)}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
              <div className="font-bold text-slate-800 dark:text-slate-200">
                {tr('توقعات الادخار لو استمررت بنفس متوسط هذا الشهر:', 'Savings forecast at this month’s pace:')}
              </div>
              <div className="text-slate-600 dark:text-slate-400 font-mono tabular-nums">
                {tr('خلال 6 شهور:', 'In 6 months:')} <strong className="text-emerald-600 dark:text-emerald-400">{formatMoney(((monthStats.netTotalPayout * budgetSavingsPct) / 100) * 6, currencyCode)}</strong>
                {' · '}
                {tr('خلال سنة:', 'In 1 year:')} <strong className="text-emerald-600 dark:text-emerald-400">{formatMoney(((monthStats.netTotalPayout * budgetSavingsPct) / 100) * 12, currencyCode)}</strong>
              </div>
            </div>
          </div>

          {/* Helper 3: Cumulative Year-to-Date Summary & Real Hourly Worth */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-black text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              {tr(`المؤشرات المالية التراكمية لعام ${selectedYear}`, `Cumulative Year-to-Date Metrics (${selectedYear})`)}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                  {tr(`إجمالي ساعات الأوفر تايم (${selectedYear})`, `Total OT Hours (${selectedYear})`)}
                </span>
                <span className="text-xl font-black font-mono tabular-nums text-slate-900 dark:text-white mt-1 block">
                  {ytdStats.totalHours.toFixed(2)} {tr('س', 'h')}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                  {tr(`تراكمي مبالغ الأوفر تايم (${selectedYear})`, `YTD Overtime Earnings (${selectedYear})`)}
                </span>
                <span className="text-xl font-black font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1 block">
                  {formatMoney(ytdStats.totalOvertimePay, currencyCode)}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                  {tr('صافي الدخل السنوي التراكمي', 'YTD Net Total Income')}
                </span>
                <span className="text-xl font-black font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-1 block">
                  {formatMoney(ytdStats.totalNet, currencyCode)}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                  {tr('العائد الفعلي للساعة هذا الشهر', 'Effective Hourly Worth (This Month)')}
                </span>
                <span className="text-xl font-black font-mono tabular-nums text-indigo-600 dark:text-indigo-400 mt-1 block">
                  {(() => {
                    const totalWorkHours =
                      (configDraft.workingDaysPerMonth || 26) * (configDraft.workingHoursPerDay || 8) +
                      monthStats.totalHours;
                    return formatMoney(totalWorkHours > 0 ? monthStats.netTotalPayout / totalWorkHours : 0, currencyCode);
                  })()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: MULTI-MONTH ANALYTICS & COMPARISON */}
      {activeTab === 'analytics' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              {tr('مقارنة ساعات الأوفر تايم والعائد المالي عبر الشهور', 'Overtime Hours & Earnings Comparison Across Months')}
            </h3>
            <div className="h-72 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={multiMonthSummary}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="monthKey" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="overtimePay" name={tr('قيمة الأوفر تايم', 'Overtime Pay')} fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar yAxisId="right" dataKey="hours" name={tr('ساعات الأوفر تايم', 'Overtime Hours')} fill="#f59e0b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              {tr('السجل المالي التراكمي لجميع الشهور', 'Cumulative Financial Ledger (All Months)')}
            </h3>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-2.5">
              {multiMonthSummary.map((row) => (
                <div
                  key={`mobile-${row.monthKey}`}
                  className={`p-3.5 rounded-xl border space-y-2 ${
                    row.monthKey === selectedMonthKey
                      ? 'bg-amber-50/70 dark:bg-amber-950/25 border-amber-300 dark:border-amber-700'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-black text-slate-900 dark:text-white">
                        {formatArabicMonthLabel(row.monthKey, lang)}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {row.monthKey} · {row.daysCount} {tr('يوم', 'days')}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMonthKey(row.monthKey);
                        setActiveTab('daily');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-white font-bold text-xs cursor-pointer transition shrink-0"
                    >
                      {tr('فتح الشهر', 'Open Month')}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-700/60 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block">{tr('الساعات', 'Hours')}</span>
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                        {row.hours.toFixed(2)} {tr('س', 'h')}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">{tr('قيمة الأوفر تايم', 'OT Earnings')}</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {formatMoney(row.overtimePay, row.currency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">{tr('الراتب + بدلات/خصم', 'Salary + Adj')}</span>
                      <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {formatMoney(row.salary, row.currency)} (+{row.bonuses.toFixed(0)}/-{row.deductions.toFixed(0)})
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">{tr('الصافي المستحق', 'Net Payout')}</span>
                      <span className="font-mono font-black text-slate-900 dark:text-white tabular-nums">
                        {formatMoney(row.netTotal, row.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-start text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">{tr('الشهر', 'Month')}</th>
                    <th className="py-2.5 px-3 text-center">{tr('الأيام', 'Days')}</th>
                    <th className="py-2.5 px-3 text-center">{tr('الساعات', 'Hours')}</th>
                    <th className="py-2.5 px-3 text-center">{tr('الراتب الكلي', 'Base Salary')}</th>
                    <th className="py-2.5 px-3 text-center">{tr('قيمة الأوفر تايم', 'OT Pay')}</th>
                    <th className="py-2.5 px-3 text-center">{tr('البدلات / الاستقطاعات', 'Allowances / Deductions')}</th>
                    <th className="py-2.5 px-3 text-center">{tr('الصافي المستحق', 'Net Payout')}</th>
                    <th className="py-2.5 px-3 text-center">{tr('عرض', 'View')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {multiMonthSummary.map((row) => (
                    <tr
                      key={row.monthKey}
                      className={row.monthKey === selectedMonthKey ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}
                    >
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                        {formatArabicMonthLabel(row.monthKey, lang)} <span className="font-mono text-[10px] text-slate-400">({row.monthKey})</span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono tabular-nums">{row.daysCount}</td>
                      <td className="py-2.5 px-3 text-center font-mono tabular-nums font-bold text-amber-600 dark:text-amber-400">
                        {row.hours.toFixed(2)} {tr('س', 'h')}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                        {formatMoney(row.salary, row.currency)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                        {formatMoney(row.overtimePay, row.currency)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        +{row.bonuses.toFixed(0)} / -{row.deductions.toFixed(0)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono tabular-nums font-black text-slate-900 dark:text-white">
                        {formatMoney(row.netTotal, row.currency)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMonthKey(row.monthKey);
                            setActiveTab('daily');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 hover:text-slate-950 font-bold text-[11px] cursor-pointer transition"
                        >
                          {tr('فتح', 'Open')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SAFETY ARCHIVE & BACKUP PROTECTION */}
      {activeTab === 'archive' && (
        <div className="space-y-5">
          <div className="bg-emerald-50/70 dark:bg-emerald-950/25 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/70 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-black text-emerald-900 dark:text-emerald-200 text-sm">
                  {tr('نظام الحماية الدائمة للبيانات المالية والأوفر تايم', 'Permanent Financial & Overtime Data Protection')}
                </div>
                <p className="text-emerald-800/90 dark:text-emerald-300/90 leading-relaxed">
                  {tr(
                    'يتم حفظ كافة سجلات ساعات الأوفر تايم وإعدادات الرواتب في طبقتين معاً (ذاكرة المتصفح + قاعدة بيانات Firestore السحابية) ولا تُحذف أي بيانات تلقائياً أو مع عمليات تنظيف البيانات العامة. أي سجل تنقله للأرشيف يبقى محفوظاً هنا ويمكنك استعادته في أي لحظة.',
                    'All overtime logs and salary configurations are saved in dual layers (browser storage + Firestore cloud) and are never auto-deleted or wiped by general cleanup. Any entry you archive remains safely stored here and can be restored anytime.'
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportJsonBackup}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 font-bold cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{tr('تصدير نسخة احتياطية JSON', 'Export JSON Backup')}</span>
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              {tr('السجلات المؤرشفة', 'Archived Entries')} ({archivedEntries.length})
            </h3>
            {archivedEntries.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                {tr(
                  'لا توجد سجلات مؤرشفة حالياً. جميع سجلاتك نشطة ومحفوظة بأمان.',
                  'No archived entries currently. All your records are active and safely stored.'
                )}
              </div>
            ) : (
              <>
                {/* Mobile Archive Cards */}
                <div className="md:hidden space-y-2.5">
                  {archivedEntries.map((item) => (
                    <div
                      key={`arch-mob-${item.id}`}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-black text-slate-900 dark:text-white">
                            {getDisplayDayName(item.date, lang, item.dayNameAr)} — <span className="font-mono text-slate-500">{item.date}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {item.notes || (item.category ? translateWorkCategory(item.category, lang) : '') || tr('بدون ملاحظات', 'No notes')}
                          </div>
                        </div>
                        <div className="text-end shrink-0">
                          <div className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                            {Number(item.hours).toFixed(2)} {tr('س', 'h')}
                          </div>
                          <div className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {formatMoney(item.calculatedAmount, currencyCode)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-700/60">
                        <button
                          type="button"
                          onClick={async () => {
                            await onArchiveEntry(item.id, false);
                            onNotify?.(tr('تمت استعادة السجل إلى السجل النشط بنجاح', 'Entry restored to active log successfully'));
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-xs cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{tr('استعادة', 'Restore')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmPermanentDeleteEntry(item)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 font-bold text-xs cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{tr('حذف نهائي', 'Delete Permanently')}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Archive Table */}
                <div className="hidden md:block overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-start text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">{tr('التاريخ واليوم', 'Date & Day')}</th>
                        <th className="py-2.5 px-3 text-center">{tr('الساعات', 'Hours')}</th>
                        <th className="py-2.5 px-3 text-center">{tr('المستحق', 'Earnings')}</th>
                        <th className="py-2.5 px-3">{tr('الملاحظات', 'Notes')}</th>
                        <th className="py-2.5 px-3 text-center">{tr('استعادة / حذف نهائي', 'Restore / Delete')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {archivedEntries.map((item) => (
                        <tr key={item.id}>
                          <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                            {getDisplayDayName(item.date, lang, item.dayNameAr)} — <span className="font-mono text-slate-500">{item.date}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono tabular-nums">{Number(item.hours).toFixed(2)} {tr('س', 'h')}</td>
                          <td className="py-2.5 px-3 text-center font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                            {formatMoney(item.calculatedAmount, currencyCode)}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                            {item.notes || (item.category ? translateWorkCategory(item.category, lang) : '-')}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={async () => {
                                  await onArchiveEntry(item.id, false);
                                  onNotify?.(tr('تمت استعادة السجل إلى السجل النشط بنجاح', 'Entry restored to active log successfully'));
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold cursor-pointer"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>{tr('استعادة', 'Restore')}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmPermanentDeleteEntry(item)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                                title={tr('حذف نهائي من الأرشيف', 'Permanently delete from archive')}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Double-check modal ONLY when permanently deleting an already-archived item */}
      {confirmPermanentDeleteEntry && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-hidden"
          onClick={() => setConfirmPermanentDeleteEntry(null)}
          dir={dir}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[92dvh] overflow-y-auto text-start"
          >
            <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400 font-black text-base">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{tr('تأكيد الحذف النهائي من الأرشيف', 'Confirm Permanent Deletion')}</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {tr('هل أنت متأكد تماماً من الحذف النهائي لسجل يوم', 'Are you sure you want to permanently delete the entry for')}{' '}
              <strong>
                {getDisplayDayName(confirmPermanentDeleteEntry.date, lang, confirmPermanentDeleteEntry.dayNameAr)} ({confirmPermanentDeleteEntry.date})
              </strong>{' '}
              {tr('بعدد', 'with')} <strong>{confirmPermanentDeleteEntry.hours} {tr('ساعة', 'hours')}</strong>؟{' '}
              {tr('لن يمكن التراجع عن الحذف النهائي بعد التأكيد.', 'This action cannot be undone once confirmed.')}
            </p>
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmPermanentDeleteEntry(null)}
                className="px-4 py-2.5 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl cursor-pointer text-center"
              >
                {tr('إلغاء والاحتفاظ بالسجل', 'Cancel & Keep Record')}
              </button>
              <button
                type="button"
                onClick={async () => {
                  const targetId = confirmPermanentDeleteEntry.id;
                  setConfirmPermanentDeleteEntry(null);
                  await onDeleteEntryPermanently(targetId);
                  onNotify?.(tr('تم حذف السجل نهائياً من الأرشيف', 'Entry permanently deleted from archive'));
                }}
                className="px-4 py-2.5 text-xs font-black bg-rose-600 hover:bg-rose-700 text-white rounded-xl cursor-pointer text-center"
              >
                {tr('تأكيد الحذف النهائي', 'Confirm Delete Permanently')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
