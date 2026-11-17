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
  { code: 'AED', label: 'درهم إماراتي (AED)' },
  { code: 'SAR', label: 'ريال سعودي (SAR)' },
  { code: 'EGP', label: 'جنيه مصري (EGP)' },
  { code: 'KWD', label: 'دينار كويتي (KWD)' },
  { code: 'QAR', label: 'ريال قطري (QAR)' },
  { code: 'OMR', label: 'ريال عماني (OMR)' },
  { code: 'BHD', label: 'دينار بحريني (BHD)' },
  { code: 'USD', label: 'دولار أمريكي (USD)' },
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

const WORK_CATEGORIES = [
  'تدريس وحصص إضافية',
  'حصص تقوية ومراجعة',
  'تحضير ومناهج',
  'تصحيح ورصد درجات',
  'مناوبة وإشراف',
  'اجتماعات وتدريب',
  'عمل إضافي عام',
];

const DAY_TYPE_META: Record<
  OvertimeDayType,
  { label: string; shortLabel: string }
> = {
  regular: { label: 'يوم عمل عادي', shortLabel: 'عادي' },
  late_night: { label: 'عمل إضافي مسائي', shortLabel: 'مسائي' },
  weekend: { label: 'عطلة نهاية الأسبوع', shortLabel: 'نهاية أسبوع' },
  holiday: { label: 'عطلة رسمية / إجازة', shortLabel: 'عطلة رسمية' },
  custom: { label: 'معامل مخصص', shortLabel: 'مخصص' },
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

function getDayIndex(dateStr: string): number {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return 1;
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

function formatArabicMonthLabel(monthKey: string): string {
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) return monthKey;
  const [y, m] = monthKey.split('-').map(Number);
  const name = ARABIC_MONTHS[(m || 1) - 1] || '';
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
        onNotify?.(`تم حفظ إعدادات الراتب والعمل لشهر ${formatArabicMonthLabel(selectedMonthKey)} بنجاح`);
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
    onNotify?.(`تم إعادة احتساب ${updatedCount} سجل أوفر تايم وفق أجر الساعة الجديد (${effectiveHourlyRate.toFixed(2)})`);
  };

  const handleSubmitEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryDate) {
      onNotify?.('يرجى تحديد التاريخ', 'error');
      return;
    }
    const hrs = Number(entryHours);
    if (!Number.isFinite(hrs) || hrs <= 0) {
      onNotify?.('يرجى إدخال عدد ساعات أوفر تايم أكبر من 0', 'error');
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
          ? `تم تحديث سجل يوم ${dayNameAr} (${entryDate}) بنجاح`
          : `تم تسجيل ${hrs} ساعة أوفر تايم ليوم ${dayNameAr} (${entryDate}) بمبلغ ${formatMoney(calcAmt, configDraft.currency)}`
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
      onNotify?.('يرجى كتابة اسم البند المالي والمبلغ بشكل صحيح', 'error');
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
    onNotify?.('تمت إضافة البند المالي وحفظه للشهر بنجاح');
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
    onNotify?.('تم تحديث قائمة البدلات والاستقطاعات');
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
        label: formatArabicMonthLabel(mk),
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
  }, [allMonthKeys, activeEntries, monthlyConfigs, selectedMonthKey, configDraft]);

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
    a.download = `نسخة_احتياطية_الأوفر_تايم_والمالية_${getTodayDateISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify?.('تم تنزيل النسخة الاحتياطية الكاملة لبيانات الأوفر تايم والمالية بنجاح');
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
        onNotify?.('الملف لا يحتوي على سجلات أوفر تايم صالحة', 'error');
        return;
      }
      const res = await onImportBackupMerge(importedEntries, importedConfigs);
      onNotify?.(
        `تم الدمج الآمن بنجاح دون حذف أي بيانات: أُضيف ${res.entriesAdded} سجل يومي و ${res.monthsUpdated} إعداد شهر`
      );
    } catch {
      onNotify?.('تعذر قراءة ملف النسخة الاحتياطية، تأكد أنه ملف JSON صحيح', 'error');
    } finally {
      e.target.value = '';
    }
  };

  const handleCopyPayslipSummary = () => {
    const sym = CURRENCY_SYMBOLS[configDraft.currency] || configDraft.currency;
    const text = [
      `كشف المستحقات المالية والأوفر تايم — ${formatArabicMonthLabel(selectedMonthKey)} (${selectedMonthKey})`,
      `• الراتب الكلي: ${monthStats.baseSalary.toFixed(2)} ${sym}`,
      `• أجر الساعة الأساسي: ${effectiveHourlyRate.toFixed(2)} ${sym}`,
      `• إجمالي ساعات الأوفر تايم: ${monthStats.totalHours.toFixed(2)} ساعة (${monthStats.uniqueDays} يوم)`,
      `• قيمة الأوفر تايم المستحقة: ${monthStats.totalOvertimePay.toFixed(2)} ${sym}`,
      `• البدلات والمكافآت: +${monthStats.totalBonuses.toFixed(2)} ${sym}`,
      `• الاستقطاعات: -${monthStats.totalDeductions.toFixed(2)} ${sym}`,
      `• صافي المستحق للشهر: ${monthStats.netTotalPayout.toFixed(2)} ${sym}`,
    ].join('\n');
    navigator.clipboard?.writeText(text).then(
      () => onNotify?.('تم نسخ ملخص الكشف المالي للشهر إلى الحافظة'),
      () => onNotify?.('تعذر النسخ التلقائي إلى الحافظة', 'error')
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
    <div id="overtime-view" className="space-y-5 text-right" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Wallet className="w-6 h-6 text-amber-500 shrink-0" />
            <span>المالية</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
            <span>حساب الأوفر تايم باليوم والشهر من الراتب الكلي مع حفظ دائم ومساعدات مالية متكاملة</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              البيانات محمية ولا تُحذف تلقائياً
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() =>
              exportOvertimeFinancialExcel({
                selectedMonthKey,
                monthLabelAr: formatArabicMonthLabel(selectedMonthKey),
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
            <span>تصدير Excel</span>
          </button>

          <button
            type="button"
            onClick={handleExportJsonBackup}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition cursor-pointer whitespace-nowrap"
            title="تنزيل نسخة احتياطية كاملة بصيغة JSON لحماية سجلات الأوفر تايم"
          >
            <Download className="w-4 h-4 text-amber-500 shrink-0" />
            <span>نسخة احتياطية</span>
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
            title="استيراد ودمج نسخة احتياطية دون حذف أي بيانات حالية"
          >
            <Upload className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>استيراد/دمج آمن</span>
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
              title="الشهر السابق"
            >
              <ChevronRight className="w-4 h-4" />
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
                ({formatArabicMonthLabel(selectedMonthKey)})
              </span>
            </div>

            <button
              type="button"
              onClick={() => setSelectedMonthKey(shiftMonthKey(selectedMonthKey, 1))}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
              title="الشهر التالي"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {selectedMonthKey !== getCurrentMonthKey() && (
              <button
                type="button"
                onClick={() => setSelectedMonthKey(getCurrentMonthKey())}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 cursor-pointer"
              >
                الشهر الحالي
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
                  {m.label} ({m.hours}س)
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
              <span>الراتب الكلي وإعدادات احتساب ساعة الأوفر تايم لشهر {formatArabicMonthLabel(selectedMonthKey)}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              أدخل الراتب الكلي وطريقة حساب أجر الساعة ومعاملات الأوفر تايم، وسيتم حساب كل يوم والشهر بالكامل تلقائياً
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
                <span>نسخ راتب الشهر السابق</span>
              </button>
            )}

            {monthEntries.length > 0 && (
              <button
                type="button"
                onClick={handleRecalculateMonthEntries}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-indigo-700 dark:text-indigo-300 cursor-pointer"
                title="تحديث المبالغ المحسوبة لأيام هذا الشهر بعد تعديل الراتب أو أجر الساعة"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>إعادة احتساب أيام الشهر</span>
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
              <span>{savingConfig ? 'جاري الحفظ...' : configDirty ? 'حفظ إعدادات الراتب' : 'الإعدادات محفوظة'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Total Salary */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              الراتب الكلي للشهر
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
              placeholder="مثال: 12000"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black font-mono tabular-nums text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500"
            />
          </div>

          {/* Currency */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              العملة المالية
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
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Hourly Rate Mode */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              طريقة حساب أجر الساعة
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
                من الراتب الكلي
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
                سعر ساعة يدوي
              </button>
            </div>
          </div>

          {/* Hourly Basis Parameters or Manual Rate */}
          {configDraft.calculationMode === 'from_salary' ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                أيام الشهر × ساعات اليوم × وعاء %
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
                  title="عدد أيام العمل في الشهر"
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
                  title="ساعات العمل اليومية"
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
                  title="نسبة الوعاء المحتسب من الراتب الكلي %"
                  className="px-2 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-center text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                {[
                  { d: 22, h: 8, label: '22ي×8س' },
                  { d: 26, h: 8, label: '26ي×8س' },
                  { d: 30, h: 8, label: '30ي×8س' },
                ].map((preset) => (
                  <button
                    key={preset.label}
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
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                أجر الساعة الأساسي ({CURRENCY_SYMBOLS[currencyCode] || currencyCode})
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
                placeholder="مثال: 65"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black font-mono tabular-nums text-slate-900 dark:text-white"
              />
            </div>
          )}
        </div>

        {/* Multipliers & Live Hourly Rate Readout */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-bold">
              <span>معامل العادي:</span>
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
              <span>معامل الويكند/المسائي:</span>
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
              <span>معامل العطلة الرسمية:</span>
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
              أجر الساعة الأساسي:{' '}
              <strong className="text-slate-900 dark:text-white">
                {formatMoney(effectiveHourlyRate, currencyCode)}
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              ساعة العادي ({configDraft.regularMultiplier}x):{' '}
              <strong className="text-amber-600 dark:text-amber-400">
                {formatMoney(effectiveHourlyRate * configDraft.regularMultiplier, currencyCode)}
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              ساعة العطلة ({configDraft.weekendMultiplier}x):{' '}
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
            <span>إجمالي ساعات الأوفر تايم</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tabular-nums mt-1.5">
            {monthStats.totalHours.toFixed(2)} <span className="text-xs font-bold text-slate-400">ساعة</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
            {monthStats.uniqueDays} يوم مسجل · متوسط {monthStats.avgHoursPerDay.toFixed(1)} س/يوم
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
            <span>قيمة الأوفر تايم هذا الشهر</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-1.5">
            {formatMoney(monthStats.totalOvertimePay, currencyCode)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
            {monthStats.baseSalary > 0
              ? `زيادة +${monthStats.overtimeBoostPct.toFixed(1)}% عن الراتب الكلي`
              : 'أدخل الراتب الكلي لحساب النسبة'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
            <span>الراتب الكلي والبدلات / الخصم</span>
            <Receipt className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tabular-nums mt-1.5">
            {formatMoney(monthStats.baseSalary, currencyCode)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
            بدلات: +{monthStats.totalBonuses.toFixed(0)} · استقطاعات: -{monthStats.totalDeductions.toFixed(0)}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-amber-400/70 dark:border-amber-600/60">
          <div className="flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-300">
            <span>صافي المستحق الكلي للشهر</span>
            <Wallet className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono tabular-nums mt-1.5">
            {formatMoney(monthStats.netTotalPayout, currencyCode)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            الراتب الكلي + الأوفر تايم + البدلات − الاستقطاعات
          </div>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex sm:flex-wrap items-center gap-1.5 p-1.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
        {[
          { id: 'daily', label: 'السجل اليومي وساعات الأوفر تايم', icon: Clock },
          { id: 'payslip', label: 'البدلات والمكافآت وكشف الراتب', icon: Receipt },
          { id: 'helpers', label: 'المساعدات والتخطيط المالي', icon: PiggyBank },
          { id: 'analytics', label: 'التحليل والمقارنة الشهرية', icon: BarChart3 },
          { id: 'archive', label: `الأرشيف الآمن (${archivedEntries.length})`, icon: Archive },
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
                <span>{editingEntryId ? 'تعديل سجل أوفر تايم' : 'تسجيل ساعات أوفر تايم ليوم'}</span>
              </h3>
              {editingEntryId && (
                <button
                  type="button"
                  onClick={resetEntryForm}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                >
                  إلغاء التعديل
                </button>
              )}
            </div>

            {/* Date + Auto Arabic Day & Month */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                التاريخ (اليوم والشهر والسنة)
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
                  <span>اليوم: <strong className="text-amber-600 dark:text-amber-400">{getArabicDayName(entryDate)}</strong></span>
                  <span aria-hidden="true">·</span>
                  <span>الشهر: <strong className="text-slate-800 dark:text-slate-200">{formatArabicMonthLabel(entryDate.slice(0, 7))}</strong></span>
                </div>
              )}
            </div>

            {/* Hours Input + Start/End Time Helper */}
            <div className="space-y-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  عدد الساعات الأوفر لهذا اليوم
                </label>
                <input
                  type="number"
                  required
                  min={0.1}
                  max={24}
                  step="any"
                  value={entryHours}
                  onChange={(e) => setEntryHours(e.target.value)}
                  placeholder="مثال: 2.5"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black font-mono tabular-nums text-slate-900 dark:text-white"
                />
              </div>

              {/* Optional Time Range & Hours+Minutes converters */}
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  مساعد حساب الساعات (اختياري): من وقت ← إلى وقت أو ساعات + دقائق
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">من الساعة</span>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => handleTimeRangeChange(e.target.value, endTime)}
                      className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">إلى الساعة</span>
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
                    placeholder="ساعات (مثال 1)"
                    value={calcHoursInput}
                    onChange={(e) => handleHoursMinutesChange(e.target.value, calcMinutesInput)}
                    className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-mono text-slate-900 dark:text-white"
                  />
                  <input
                    type="number"
                    min={0}
                    max={59}
                    placeholder="دقائق (مثال 30)"
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
                نوع اليوم ومعامل الأوفر تايم
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
                    {DAY_TYPE_META[dt].shortLabel}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">المعامل:</span>
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
                <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 cursor-pointer mr-auto">
                  <input
                    type="checkbox"
                    checked={useCustomFixedAmount}
                    onChange={(e) => setUseCustomFixedAmount(e.target.checked)}
                    className="rounded border-slate-300 text-amber-500"
                  />
                  <span>مبلغ مقطوع مخصص</span>
                </label>
              </div>
              {useCustomFixedAmount && (
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={customFixedAmount}
                  onChange={(e) => setCustomFixedAmount(e.target.value)}
                  placeholder={`المبلغ المخصص (${CURRENCY_SYMBOLS[currencyCode] || currencyCode})`}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white"
                />
              )}
            </div>

            {/* Category & Notes */}
            <div className="space-y-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  تصنيف العمل الإضافي
                </label>
                <select
                  value={entryCategory}
                  onChange={(e) => setEntryCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
                >
                  {WORK_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  ملاحظات (اختياري)
                </label>
                <textarea
                  rows={2}
                  value={entryNotes}
                  onChange={(e) => setEntryNotes(e.target.value)}
                  placeholder="تفاصيل العمل في هذا اليوم..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Live Payout Preview */}
            <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/70 flex items-center justify-between text-xs">
              <div>
                <span className="text-emerald-800 dark:text-emerald-200 font-bold block">المستحق المحسوب لهذا اليوم</span>
                {!useCustomFixedAmount && (
                  <span className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80 font-mono tabular-nums">
                    {previewHoursNum} س × {effectiveHourlyRate.toFixed(2)} × {previewMultiplierNum}
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
              <span>{savingEntry ? 'جاري الحفظ...' : editingEntryId ? 'تحديث السجل وحفظه' : 'تسجيل وحفظ ساعات اليوم'}</span>
            </button>
          </form>

          {/* Daily Overtime Table for Selected Month */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  سجل ساعات الأوفر تايم اليومي — {formatArabicMonthLabel(selectedMonthKey)} ({filteredMonthEntries.length} سجل)
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  يظهر هنا كل يوم سُجل فيه أوفر تايم مع الحساب المالي الدقيق، ويمكنك الأرشفة الآمنة دون حذف نهائي
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={entrySearch}
                    onChange={(e) => setEntrySearch(e.target.value)}
                    placeholder="بحث بالتاريخ أو اليوم أو الملاحظة..."
                    className="pr-8 pl-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  />
                </div>
                <select
                  value={dayTypeFilter}
                  onChange={(e) => setDayTypeFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <option value="all">كل الأيام</option>
                  <option value="regular">عادي</option>
                  <option value="late_night">مسائي</option>
                  <option value="weekend">نهاية أسبوع</option>
                  <option value="holiday">عطلة رسمية</option>
                  <option value="custom">مخصص</option>
                </select>
              </div>
            </div>

            {filteredMonthEntries.length === 0 ? (
              <div className="py-12 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                <Clock className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  لا توجد ساعات أوفر تايم مسجلة في {formatArabicMonthLabel(selectedMonthKey)} حتى الآن
                </p>
                <p className="text-[11px] text-slate-400">
                  استخدم النموذج الجانبي لاختيار التاريخ وإدخال عدد الساعات الأوفر وحفظها فوراً.
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
                            {item.dayNameAr || getArabicDayName(item.date)}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                            {item.date} · {DAY_TYPE_META[item.dayType]?.shortLabel || item.dayType}{' '}
                            ({item.customFixedAmount ? 'مبلغ ثابت' : `${item.multiplier}x`})
                          </div>
                        </div>
                        <div className="text-left font-mono tabular-nums">
                          <div className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                            {formatMoney(item.calculatedAmount, currencyCode)}
                          </div>
                          <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                            {Number(item.hours).toFixed(2)} س
                          </div>
                        </div>
                      </div>

                      {(item.category || item.notes || (item.startTime && item.endTime)) && (
                        <div className="text-[11px] text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-200/70 dark:border-slate-700/70 flex flex-wrap items-center justify-between gap-1.5">
                          <span className="truncate">
                            {item.category || 'عام'}{item.notes ? ` — ${item.notes}` : ''}
                          </span>
                          {item.startTime && item.endTime && (
                            <span className="font-mono text-[10px] text-slate-400">
                              {item.startTime} ← {item.endTime}
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
                          <span>تعديل</span>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await onArchiveEntry(item.id, true);
                            onNotify?.('تم نقل السجل إلى الأرشيف الآمن ويمكن استعادته في أي وقت');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-lg cursor-pointer"
                        >
                          <Archive className="w-3.5 h-3.5" />
                          <span>أرشفة آمنة</span>
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-center justify-between text-xs font-black">
                    <span className="text-slate-900 dark:text-white">
                      الإجمالي ({filteredMonthEntries.length} سجل ·{' '}
                      {filteredMonthEntries.reduce((a, b) => a + (Number(b.hours) || 0), 0).toFixed(2)} س)
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
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">التاريخ واليوم</th>
                        <th className="py-2.5 px-3 text-center">الساعات</th>
                        <th className="py-2.5 px-3 text-center">النوع / المعامل</th>
                        <th className="py-2.5 px-3 text-center">أجر الساعة</th>
                        <th className="py-2.5 px-3 text-center">المستحق</th>
                        <th className="py-2.5 px-3">التصنيف والملاحظات</th>
                        <th className="py-2.5 px-3 text-center">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {filteredMonthEntries.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="font-bold text-slate-900 dark:text-white">{item.dayNameAr || getArabicDayName(item.date)}</div>
                            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                              {item.date}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono tabular-nums whitespace-nowrap">
                            <span className="font-black text-slate-900 dark:text-white">
                              {Number(item.hours).toFixed(2)} س
                            </span>
                            {item.startTime && item.endTime && (
                              <div className="text-[10px] text-slate-400">
                                {item.startTime} ← {item.endTime}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <div className="font-bold text-slate-800 dark:text-slate-200">
                              {DAY_TYPE_META[item.dayType]?.shortLabel || item.dayType}
                            </div>
                            <div className="text-[10px] font-mono text-amber-600 dark:text-amber-400">
                              {item.customFixedAmount ? 'مبلغ ثابت' : `${item.multiplier}x`}
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
                              {item.category || '-'}
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
                                title="تعديل هذا اليوم"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  await onArchiveEntry(item.id, true);
                                  onNotify?.('تم نقل السجل إلى الأرشيف الآمن ويمكن استعادته في أي وقت');
                                }}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg cursor-pointer"
                                title="نقل إلى الأرشيف الآمن (بدون فقدان البيانات)"
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
                          الإجمالي ({filteredMonthEntries.length} سجل)
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono tabular-nums text-amber-600 dark:text-amber-400">
                          {filteredMonthEntries.reduce((a, b) => a + (Number(b.hours) || 0), 0).toFixed(2)} س
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
              إضافة بدل أو مكافأة أو استقطاع لشهر {formatArabicMonthLabel(selectedMonthKey)}
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                نوع البند المالي
              </label>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                {[
                  { id: 'allowance', label: 'بدل (+)' },
                  { id: 'bonus', label: 'مكافأة (+)' },
                  { id: 'deduction', label: 'استقطاع (-)' },
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
                  اسم البند
                </label>
                <input
                  type="text"
                  required
                  value={adjTitle}
                  onChange={(e) => setAdjTitle(e.target.value)}
                  placeholder="مثال: بدل مواصلات / سلفة"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  المبلغ ({CURRENCY_SYMBOLS[currencyCode] || currencyCode})
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
                  التاريخ (اختياري)
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
                  ملاحظات (اختياري)
                </label>
                <input
                  type="text"
                  value={adjNotes}
                  onChange={(e) => setAdjNotes(e.target.value)}
                  placeholder="سبب البند..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl cursor-pointer flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة إلى كشف الشهر</span>
            </button>

            {(configDraft.adjustments || []).length > 0 && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  البنود المضافة لهذا الشهر ({configDraft.adjustments.length}):
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl">
                  {configDraft.adjustments.map((adj) => (
                    <div
                      key={adj.id}
                      className="px-3 py-2 flex items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white">{adj.title}</span>
                        <span className="text-[11px] text-slate-400 mr-2">
                          ({adj.type === 'deduction' ? 'استقطاع' : adj.type === 'bonus' ? 'مكافأة' : 'بدل'})
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
                          title="إزالة البند"
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
                  كشف المستحقات والراتب التفصيلي — {formatArabicMonthLabel(selectedMonthKey)}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  ملخص مالي شامل للراتب الكلي + تفصيل الأوفر تايم + البدلات والاستقطاعات
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopyPayslipSummary}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-amber-500" />
                <span>نسخ الكشف نصياً</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs sm:text-sm">
              <div className="py-3 flex items-center justify-between">
                <span className="font-bold text-slate-700 dark:text-slate-300">الراتب الكلي الأساسي للشهر</span>
                <span className="font-mono font-black tabular-nums text-slate-900 dark:text-white">
                  {formatMoney(monthStats.baseSalary, currencyCode)}
                </span>
              </div>

              <div className="py-3 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-300">أوفر تايم الأيام العادية والمخصصة</span>
                  <span className="text-xs text-slate-400 mr-2 font-mono">({monthStats.regularHours.toFixed(2)} س)</span>
                </div>
                <span className="font-mono font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  +{formatMoney(monthStats.regularPay, currencyCode)}
                </span>
              </div>

              <div className="py-3 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-300">أوفر تايم المسائي والعطلات الرسمية</span>
                  <span className="text-xs text-slate-400 mr-2 font-mono">({monthStats.premiumHours.toFixed(2)} س)</span>
                </div>
                <span className="font-mono font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  +{formatMoney(monthStats.premiumPay, currencyCode)}
                </span>
              </div>

              <div className="py-3 flex items-center justify-between">
                <span className="font-bold text-slate-700 dark:text-slate-300">البدلات والمكافآت الإضافية</span>
                <span className="font-mono font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  +{formatMoney(monthStats.totalBonuses, currencyCode)}
                </span>
              </div>

              <div className="py-3 flex items-center justify-between">
                <span className="font-bold text-slate-700 dark:text-slate-300">الاستقطاعات والسلف</span>
                <span className="font-mono font-bold tabular-nums text-rose-600 dark:text-rose-400">
                  -{formatMoney(monthStats.totalDeductions, currencyCode)}
                </span>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <span className="text-base font-black text-slate-900 dark:text-white">
                  صافي الإجمالي المستحق للدفع
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
              <span>حاسبة الهدف المالي (كم ساعة أوفر تايم أحتاج؟)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  مبلغ أوفر تايم إضافي مستهدف ({CURRENCY_SYMBOLS[currencyCode] || currencyCode})
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
                  الهدف الإجمالي للدخل الشهري (يحفظ بالشهر)
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
                  placeholder="مثال: 15000"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  ساعات مطلوبة بالمعامل العادي ({configDraft.regularMultiplier}x)
                </div>
                <div className="text-xl font-black font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-1">
                  {hoursNeededForExtraReg.toFixed(1)} ساعة
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  ساعات مطلوبة بمعامل العطلة ({configDraft.weekendMultiplier}x)
                </div>
                <div className="text-xl font-black font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
                  {hoursNeededForExtraWknd.toFixed(1)} ساعة
                </div>
              </div>
            </div>

            {targetMonthlyIncome > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 space-y-2 text-xs">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-slate-800 dark:text-slate-200">التقدم نحو الهدف الشهري ({formatMoney(targetMonthlyIncome, currencyCode)})</span>
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
                    ? 'تم تحقيق الهدف المالي للشهر بالكامل!'
                    : `المتبقي للهدف: ${formatMoney(remainingToTargetIncome, currencyCode)} (≈ ${hoursRemainingToTarget.toFixed(1)} ساعة أوفر تايم عادي)`}
                </div>
              </div>
            )}
          </div>

          {/* Helper 2: Budget & Savings Allocation */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <PiggyBank className="w-5 h-5 text-emerald-500" />
              <span>مساعد الميزانية وتخطيط الادخار الشهري (50 / 30 / 20)</span>
            </h3>

            <div className="grid grid-cols-3 gap-2.5 text-xs">
              <div>
                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">الأساسيات %</label>
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
                <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">الشخصية %</label>
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
                <label className="block font-bold text-emerald-600 dark:text-emerald-400 mb-1">الادخار %</label>
                <div className="px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl font-mono font-black text-center text-emerald-700 dark:text-emerald-300">
                  {budgetSavingsPct}%
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300 font-bold">مخصص الالتزامات والأساسيات ({budgetEssentialsPct}%)</span>
                <span className="font-mono font-black tabular-nums text-slate-900 dark:text-white">
                  {formatMoney((monthStats.netTotalPayout * budgetEssentialsPct) / 100, currencyCode)}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300 font-bold">مخصص النفقات الشخصية ({budgetPersonalPct}%)</span>
                <span className="font-mono font-black tabular-nums text-slate-900 dark:text-white">
                  {formatMoney((monthStats.netTotalPayout * budgetPersonalPct) / 100, currencyCode)}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-emerald-700 dark:text-emerald-300 font-bold">صافي الادخار المقترح لهذا الشهر ({budgetSavingsPct}%)</span>
                <span className="font-mono font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatMoney((monthStats.netTotalPayout * budgetSavingsPct) / 100, currencyCode)}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
              <div className="font-bold text-slate-800 dark:text-slate-200">
                توقعات الادخار لو استمررت بنفس متوسط هذا الشهر:
              </div>
              <div className="text-slate-600 dark:text-slate-400 font-mono tabular-nums">
                خلال 6 شهور: <strong className="text-emerald-600 dark:text-emerald-400">{formatMoney(((monthStats.netTotalPayout * budgetSavingsPct) / 100) * 6, currencyCode)}</strong>
                {' · '}
                خلال سنة: <strong className="text-emerald-600 dark:text-emerald-400">{formatMoney(((monthStats.netTotalPayout * budgetSavingsPct) / 100) * 12, currencyCode)}</strong>
              </div>
            </div>
          </div>

          {/* Helper 3: Cumulative Year-to-Date Summary & Real Hourly Worth */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-black text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              المؤشرات المالية التراكمية لعام {selectedYear}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">إجمالي ساعات الأوفر تايم ({selectedYear})</span>
                <span className="text-xl font-black font-mono tabular-nums text-slate-900 dark:text-white mt-1 block">
                  {ytdStats.totalHours.toFixed(2)} س
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">تراكمي مبالغ الأوفر تايم ({selectedYear})</span>
                <span className="text-xl font-black font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1 block">
                  {formatMoney(ytdStats.totalOvertimePay, currencyCode)}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">صافي الدخل السنوي التراكمي</span>
                <span className="text-xl font-black font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-1 block">
                  {formatMoney(ytdStats.totalNet, currencyCode)}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">العائد الفعلي للساعة هذا الشهر</span>
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
              مقارنة ساعات الأوفر تايم والعائد المالي عبر الشهور
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
                  <Bar yAxisId="left" dataKey="overtimePay" name="قيمة الأوفر تايم" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar yAxisId="right" dataKey="hours" name="ساعات الأوفر تايم" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              السجل المالي التراكمي لجميع الشهور
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
                        {row.label}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {row.monthKey} · {row.daysCount} يوم
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
                      فتح الشهر
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-700/60 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block">الساعات</span>
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                        {row.hours.toFixed(2)} س
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">قيمة الأوفر تايم</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {formatMoney(row.overtimePay, row.currency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">الراتب + بدلات/خصم</span>
                      <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {formatMoney(row.salary, row.currency)} (+{row.bonuses.toFixed(0)}/-{row.deductions.toFixed(0)})
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">الصافي المستحق</span>
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
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">الشهر</th>
                    <th className="py-2.5 px-3 text-center">الأيام</th>
                    <th className="py-2.5 px-3 text-center">الساعات</th>
                    <th className="py-2.5 px-3 text-center">الراتب الكلي</th>
                    <th className="py-2.5 px-3 text-center">قيمة الأوفر تايم</th>
                    <th className="py-2.5 px-3 text-center">البدلات / الاستقطاعات</th>
                    <th className="py-2.5 px-3 text-center">الصافي المستحق</th>
                    <th className="py-2.5 px-3 text-center">عرض</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {multiMonthSummary.map((row) => (
                    <tr
                      key={row.monthKey}
                      className={row.monthKey === selectedMonthKey ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}
                    >
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                        {row.label} <span className="font-mono text-[10px] text-slate-400">({row.monthKey})</span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono tabular-nums">{row.daysCount}</td>
                      <td className="py-2.5 px-3 text-center font-mono tabular-nums font-bold text-amber-600 dark:text-amber-400">
                        {row.hours.toFixed(2)} س
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
                          فتح
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
                  نظام الحماية الدائمة للبيانات المالية والأوفر تايم
                </div>
                <p className="text-emerald-800/90 dark:text-emerald-300/90 leading-relaxed">
                  يتم حفظ كافة سجلات ساعات الأوفر تايم وإعدادات الرواتب في طبقتين معاً (ذاكرة المتصفح + قاعدة بيانات Firestore السحابية) ولا تُحذف أي بيانات تلقائياً أو مع عمليات تنظيف البيانات العامة. أي سجل تنقله للأرشيف يبقى محفوظاً هنا ويمكنك استعادته في أي لحظة.
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
                <span>تصدير نسخة احتياطية JSON</span>
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              السجلات المؤرشفة ({archivedEntries.length})
            </h3>
            {archivedEntries.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                لا توجد سجلات مؤرشفة حالياً. جميع سجلاتك نشطة ومحفوظة بأمان.
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
                            {item.dayNameAr} — <span className="font-mono text-slate-500">{item.date}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {item.notes || item.category || 'بدون ملاحظات'}
                          </div>
                        </div>
                        <div className="text-left shrink-0">
                          <div className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                            {Number(item.hours).toFixed(2)} س
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
                            onNotify?.('تمت استعادة السجل إلى السجل النشط بنجاح');
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-xs cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>استعادة</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmPermanentDeleteEntry(item)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 font-bold text-xs cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف نهائي</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Archive Table */}
                <div className="hidden md:block overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">التاريخ واليوم</th>
                        <th className="py-2.5 px-3 text-center">الساعات</th>
                        <th className="py-2.5 px-3 text-center">المستحق</th>
                        <th className="py-2.5 px-3">الملاحظات</th>
                        <th className="py-2.5 px-3 text-center">استعادة / حذف نهائي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {archivedEntries.map((item) => (
                        <tr key={item.id}>
                          <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                            {item.dayNameAr} — <span className="font-mono text-slate-500">{item.date}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono tabular-nums">{Number(item.hours).toFixed(2)} س</td>
                          <td className="py-2.5 px-3 text-center font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                            {formatMoney(item.calculatedAmount, currencyCode)}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">{item.notes || item.category || '-'}</td>
                          <td className="py-2.5 px-3 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={async () => {
                                  await onArchiveEntry(item.id, false);
                                  onNotify?.('تمت استعادة السجل إلى السجل النشط بنجاح');
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold cursor-pointer"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>استعادة</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmPermanentDeleteEntry(item)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                                title="حذف نهائي من الأرشيف"
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
          dir="rtl"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 max-h-[92dvh] overflow-y-auto"
          >
            <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400 font-black text-base">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>تأكيد الحذف النهائي من الأرشيف</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              هل أنت متأكد تماماً من الحذف النهائي لسجل يوم{' '}
              <strong>{confirmPermanentDeleteEntry.dayNameAr} ({confirmPermanentDeleteEntry.date})</strong>{' '}
              بعدد <strong>{confirmPermanentDeleteEntry.hours} ساعة</strong>؟ لن يمكن التراجع عن الحذف النهائي بعد التأكيد.
            </p>
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmPermanentDeleteEntry(null)}
                className="px-4 py-2.5 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl cursor-pointer text-center"
              >
                إلغاء والاحتفاظ بالسجل
              </button>
              <button
                type="button"
                onClick={async () => {
                  const targetId = confirmPermanentDeleteEntry.id;
                  setConfirmPermanentDeleteEntry(null);
                  await onDeleteEntryPermanently(targetId);
                  onNotify?.('تم حذف السجل نهائياً من الأرشيف');
                }}
                className="px-4 py-2.5 text-xs font-black bg-rose-600 hover:bg-rose-700 text-white rounded-xl cursor-pointer text-center"
              >
                تأكيد الحذف النهائي
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
