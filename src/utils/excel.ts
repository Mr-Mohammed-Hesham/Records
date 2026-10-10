import * as XLSX from 'xlsx';
import { Student, Exam, ExamResult, StudentStats, TeacherSettings } from '../types';
import { calculateStudentStats } from './grading';
import { getEffectiveEnrollmentStatus, ENROLLMENT_STATUS_META, getEffectiveEnrollmentNote } from './studentStatus';

export interface ExcelLayoutAndChartOptions {
  includeChart?: boolean;       // تضمين الرسم البياني للدرجات في التقرير (افتراضي: true)
  layoutMode?: 'mobile' | 'desktop'; // وضع الهاتف المحمول (مدمج ومتناسق) أو الوضع المكتبي الواسع
  chartType?: 'bars_and_columns' | 'bars_only' | 'distribution' | 'both' | 'bars' | 'columns';
}

const EXCEL_PREFS_KEY = 'mh_excel_export_config_v1';

export function getSavedExcelPreferences(): Required<ExcelLayoutAndChartOptions> {
  try {
    const raw = localStorage.getItem(EXCEL_PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        includeChart: parsed.includeChart !== undefined ? Boolean(parsed.includeChart) : true,
        layoutMode: parsed.layoutMode === 'desktop' ? 'desktop' : 'mobile',
        chartType: parsed.chartType || 'bars_and_columns',
      };
    }
  } catch {
    // ignore
  }
  return {
    includeChart: true,
    layoutMode: 'mobile',
    chartType: 'bars_and_columns',
  };
}

export const loadExcelPreferences = getSavedExcelPreferences;

export function saveExcelPreferences(prefs: Partial<ExcelLayoutAndChartOptions>): void {
  try {
    const current = getSavedExcelPreferences();
    localStorage.setItem(EXCEL_PREFS_KEY, JSON.stringify({ ...current, ...prefs }));
  } catch {
    // ignore
  }
}

/**
 * توليد شريط بياني بصري متناسق مع شاشات الهاتف والكمبيوتر داخل خلية الإكسيل
 */
function buildVisualScoreBar(percentage: number, isMobile: boolean): string {
  const clamped = Math.max(0, Math.min(100, Math.round(percentage)));
  const totalSegments = isMobile ? 10 : 15;
  const filledCount = Math.round((clamped / 100) * totalSegments);
  const emptyCount = Math.max(0, totalSegments - filledCount);

  let fillChar = '🟩';
  if (clamped >= 90) fillChar = '🟩';
  else if (clamped >= 80) fillChar = '🟦';
  else if (clamped >= 70) fillChar = '🟨';
  else if (clamped >= 60) fillChar = '🟧';
  else fillChar = '🟥';

  const bar = fillChar.repeat(filledCount) + '⬜'.repeat(emptyCount);
  return `${bar} ${clamped}%`;
}

/**
 * تطبيق إعدادات الاتجاه من اليمين لليسار (RTL) وارتفاعات الصفوف والمسافات المريحة للقراءة على الهاتف
 */
function applyWorksheetFormatting(
  ws: XLSX.WorkSheet,
  totalRows: number,
  colWidths: number[],
  merges: XLSX.Range[] = [],
  isMobile: boolean = true
) {
  // تفعيل اتجاه الشيت من اليمين إلى اليسار (RTL)
  (ws as any)['!views'] = [{ rightToLeft: true, showGridLines: true }];

  // ضبط عرض الأعمدة مع مراعاة المساحات
  ws['!cols'] = colWidths.map((w) => ({ wch: w }));

  // ضبط ارتفاع الصفوف لإعطاء مساحات مريحة للعين خاصة على شاشة الهاتف
  const rowsConfig: Array<{ hpt: number }> = [];
  for (let r = 0; r < totalRows; r++) {
    if (r === 0) {
      rowsConfig.push({ hpt: isMobile ? 30 : 34 }); // العنوان الرئيسي
    } else {
      rowsConfig.push({ hpt: isMobile ? 23 : 25 }); // صفوف البيانات المريحة
    }
  }
  ws['!rows'] = rowsConfig;

  if (merges.length > 0) {
    ws['!merges'] = merges;
  }

  // إعدادات الصفحة للطباعة والمشاركة كـ PDF من الهاتف
  ws['!margins'] = {
    left: 0.4,
    right: 0.4,
    top: 0.5,
    bottom: 0.5,
    header: 0.3,
    footer: 0.3,
  };
}

/**
 * بناء قسم الرسم البياني للدرجات (أشرطة أفقية + أعمدة رأسية + توزيع تقديرات) لإدراجه في التقرير
 */
function buildStudentChartRows(
  results: ExamResult[],
  isMobile: boolean,
  chartType: 'bars_and_columns' | 'bars_only' | 'distribution' | 'both' | 'bars' | 'columns' = 'bars_and_columns'
): any[][] {
  if (results.length === 0) {
    return [
      ['📊 الرسم البياني لتطور الدرجات', 'لا توجد امتحانات مسجلة بعد لرسم المخطط البياني'],
      [''],
    ];
  }

  const sorted = [...results].sort(
    (a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime()
  );

  const rows: any[][] = [];

  // 1. مخطط الأشرطة البيانية لتطور درجات الامتحانات
  rows.push(['📊 أولاً: الرسم البياني لتطور درجات الامتحانات عبر الزمن', '', '', '']);
  rows.push([
    'الامتحان والتاريخ',
    'الدرجة',
    'المؤشر البياني للنسبة المئوية (0% ⟵ 100%)',
    'التقدير واتجاه الأداء',
  ]);

  sorted.forEach((r, idx) => {
    const prev = idx > 0 ? sorted[idx - 1].percentage : null;
    let trendLabel = '⏺ بداية الرصد';
    if (prev !== null) {
      const diff = r.percentage - prev;
      if (diff > 2) trendLabel = `▲ تحسن (+${diff}%)`;
      else if (diff < -2) trendLabel = `▼ تراجع (${diff}%)`;
      else trendLabel = '▬ مستوى مستقر';
    }

    rows.push([
      `${r.examTitle} (${r.examDate ? r.examDate.slice(5) : '-'})`,
      `${r.score} / ${r.totalScore}`,
      buildVisualScoreBar(r.percentage, isMobile),
      `${r.gradeRating} | ${trendLabel}`,
    ]);
  });

  rows.push(['']);

  // 2. مخطط الأعمدة الرأسي داخل الشيت (إذا تم اختيار أعمدة وكان عدد الامتحانات مناسباً لعرض الشاشة)
  if (chartType === 'bars_and_columns' && sorted.length >= 2) {
    const maxCols = isMobile ? Math.min(sorted.length, 5) : Math.min(sorted.length, 8);
    const chartExams = sorted.slice(-maxCols);

    rows.push(['📈 ثانياً: مخطط الأعمدة الرأسي لآخر الامتحانات', '', '', '']);
    const levels = [100, 80, 60, 40, 20];
    levels.forEach((lvl) => {
      const lvlRow: any[] = [`مستوى ${lvl}%`];
      chartExams.forEach((ex) => {
        if (ex.percentage >= lvl) {
          lvlRow.push(ex.percentage >= 85 ? '   🟩🟩   ' : ex.percentage >= 65 ? '   🟦🟦   ' : '   🟨🟨   ');
        } else if (ex.percentage >= lvl - 10) {
          lvlRow.push('   ▄▄▄▄   ');
        } else {
          lvlRow.push('    ..    ');
        }
      });
      rows.push(lvlRow);
    });

    rows.push(['النسبة %', ...chartExams.map((e) => `${e.percentage}% (${e.score}/${e.totalScore})`)]);
    rows.push(['اسم الامتحان', ...chartExams.map((e) => e.examTitle)]);
    rows.push(['']);
  }

  // 3. جدول ومخطط التوزيع الدائري/النسبي للتقديرات
  const ratingCounts = [
    { label: 'ممتاز (90% فأعلى)', count: sorted.filter((r) => r.percentage >= 90).length, icon: '🟩' },
    { label: 'جيد جداً (80% - 89%)', count: sorted.filter((r) => r.percentage >= 80 && r.percentage < 90).length, icon: '🟦' },
    { label: 'جيد (70% - 79%)', count: sorted.filter((r) => r.percentage >= 70 && r.percentage < 80).length, icon: '🟨' },
    { label: 'مقبول (60% - 69%)', count: sorted.filter((r) => r.percentage >= 60 && r.percentage < 70).length, icon: '🟧' },
    { label: 'يحتاج تحسين (<60%)', count: sorted.filter((r) => r.percentage < 60).length, icon: '🟥' },
  ];

  rows.push(['🍩 ثالثاً: توزيع التقديرات ونسب السيطرة الأكاديمية', '', '', '']);
  rows.push(['الفئة والتقدير', 'عدد الامتحانات', 'التمثيل البياني للحصة النسبية', 'النسبة من إجمالي الامتحانات']);

  ratingCounts.forEach((band) => {
    const sharePercent = sorted.length > 0 ? Math.round((band.count / sorted.length) * 100) : 0;
    const blocks = Math.round((sharePercent / 100) * 10);
    const visualShare = band.icon.repeat(blocks) + '⬜'.repeat(Math.max(0, 10 - blocks));
    rows.push([
      band.label,
      `${band.count} امتحان`,
      `${visualShare} ${sharePercent}%`,
      sharePercent > 0 ? `${sharePercent}% من النتائج` : 'لا يوجد',
    ]);
  });

  rows.push(['']);
  return rows;
}

/**
 * تصدير التقرير الأكاديمي لطالب واحد مع دعم كامل للرسم البياني وتنسيق الهاتف المحمول أو الكمبيوتر
 */
export function exportSingleStudentAcademicReport(
  student: Student,
  results: ExamResult[],
  stats: StudentStats,
  customOptions?: ExcelLayoutAndChartOptions
) {
  const prefs = { ...getSavedExcelPreferences(), ...customOptions };
  const isMobile = prefs.layoutMode === 'mobile';
  const includeChart = prefs.includeChart !== false;

  const wb = XLSX.utils.book_new();
  const statusId = getEffectiveEnrollmentStatus(student);
  const statusLabel = ENROLLMENT_STATUS_META[statusId]?.label || 'ملف فعال';
  const statusNote = getEffectiveEnrollmentNote(student);

  const sortedResults = [...results].sort(
    (a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime()
  );

  if (isMobile) {
    // ═══════════════════════════════════════════════════════════════════
    // وضع الهاتف المحمول (4 أعمدة متناسقة جداً لا تحتاج لتمرير أفقي)
    // ═══════════════════════════════════════════════════════════════════
    const sheetRows: any[][] = [
      ['📋 تقرير الأداء الأكاديمي للطالب - سجلات مستر محمد هشام', '', '', ''],
      ['تاريخ الاستخراج:', new Date().toLocaleDateString('ar-EG'), 'وضع العرض:', '📱 متوافق مع الهاتف والطباعة'],
      [''],
      ['👤 أولاً: البيانات الأساسية للطالب', '', '', ''],
      ['اسم الطالب:', student.name, 'كود الطالب:', student.studentId],
      ['الصف الدراسي:', student.grade, 'المسار / الفصل:', `${student.track || 'عام'} - ${student.term || 'الفصل الأول'}`],
      ['المادة الدراسية:', student.subject || 'عام', 'المجموعة:', student.group || '-'],
      ['حالة ملف الطالب:', statusLabel, 'ملاحظة الحالة:', statusNote || 'منتظم'],
      [''],
      ['📈 ثانياً: ملخص المؤشرات الأكاديمية', '', '', ''],
      ['عدد الامتحانات:', `${stats.totalExams} امتحان`, 'المتوسط العام:', `${stats.averagePercentage}% (${stats.averageScore})`],
      ['أعلى نسبة محققة:', `${stats.highestPercentage}% (${stats.highestScore})`, 'نسبة النجاح:', `${stats.passRate}%`],
      ['التقييم العام:', stats.status, 'اتجاه المستوى:', stats.trend === 'improving' ? '📈 في تحسن مستمر' : stats.trend === 'declining' ? '📉 يحتاج متابعة' : '📊 مستوى ثابت'],
      ['ملاحظات التقدم:', stats.trendMessage, '', ''],
      [''],
    ];

    if (includeChart) {
      const chartRows = buildStudentChartRows(sortedResults, true, prefs.chartType);
      sheetRows.push(...chartRows);
    }

    sheetRows.push(['📝 سجل درجات الامتحانات التفصيلي', '', '', '']);
    sheetRows.push([
      'الامتحان والتاريخ',
      'الدرجة والنسبة %',
      'التقدير والنتيجة',
      'المؤشر البصري والملاحظات',
    ]);

    if (sortedResults.length === 0) {
      sheetRows.push(['لا توجد نتائج امتحانات مسجلة لهذا الطالب حتى الآن', '-', '-', '-']);
    } else {
      sortedResults.forEach((r) => {
        sheetRows.push([
          `${r.examTitle} (${r.examDate})`,
          `${r.score} / ${r.totalScore} (${r.percentage}%)`,
          `${r.gradeRating} - ${r.passed ? 'ناجح ✔' : 'راسب ✖'}`,
          `${buildVisualScoreBar(r.percentage, true)}${r.notes ? ` | ${r.notes}` : ''}`,
        ]);
      });
    }

    const ws = XLSX.utils.aoa_to_sheet(sheetRows);
    applyWorksheetFormatting(
      ws,
      sheetRows.length,
      [30, 22, 30, 32], // 4 أعمدة موزعة بعناية فائقة للهاتف
      [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
        { s: { r: 3, c: 0 }, e: { r: 3, c: 3 } },
        { s: { r: 9, c: 0 }, e: { r: 9, c: 3 } },
        { s: { r: 13, c: 1 }, e: { r: 13, c: 3 } },
      ],
      true
    );

    XLSX.utils.book_append_sheet(wb, ws, 'تقرير الطالب');
  } else {
    // ═══════════════════════════════════════════════════════════════════
    // الوضع المكتبي الواسع (8 أعمدة مفصلة للشاشات الكبيرة والطباعة)
    // ═══════════════════════════════════════════════════════════════════
    const headerData: any[][] = [
      ['تقرير الأداء الأكاديمي الشامل للطالب - سجلات مستر محمد هشام', '', '', '', '', '', '', ''],
      ['تاريخ استخراج التقرير:', new Date().toLocaleDateString('ar-EG'), 'حالة ملف الطالب:', statusLabel, 'كود الطالب:', student.studentId, '', ''],
      [''],
      ['بيانات الطالب الأساسية', '', '', '', '', '', '', ''],
      ['اسم الطالب:', student.name, 'الصف الدراسي:', student.grade, 'المادة الدراسية:', student.subject || 'عام', 'المجموعة:', student.group || '-'],
      [''],
      ['ملخص المؤشرات الأكاديمية', '', '', '', '', '', '', ''],
      ['إجمالي الامتحانات:', stats.totalExams, 'المتوسط العام:', `${stats.averagePercentage}%`, 'نسبة النجاح:', `${stats.passRate}%`, 'التقييم العام:', stats.status],
      ['أعلى نسبة محققة:', `${stats.highestPercentage}% (${stats.highestScore})`, 'متوسط الدرجات:', stats.averageScore, 'ملاحظة الملف:', statusNote || '-', '', ''],
      ['ملاحظات التقدم والمستوى العام:', stats.trendMessage, '', '', '', '', '', ''],
      [''],
    ];

    if (includeChart) {
      headerData.push(...buildStudentChartRows(sortedResults, false, prefs.chartType));
    }

    headerData.push(['تفاصيل درجات الامتحانات على حدة', '', '', '', '', '', '', '']);

    const tableHeader = [
      'اسم الامتحان',
      'تاريخ الامتحان',
      'درجة الامتحان',
      'الدرجة الكلية',
      'النسبة المئوية %',
      'الرسم البياني للدرجة',
      'التقدير والنتيجة',
      'ملاحظات الامتحان',
    ];

    const examRows = sortedResults.map((r) => [
      r.examTitle,
      r.examDate,
      r.score,
      r.totalScore,
      `${r.percentage}%`,
      buildVisualScoreBar(r.percentage, false),
      `${r.gradeRating} (${r.passed ? 'ناجح' : 'راسب'})`,
      r.notes || '-',
    ]);

    const allRows = [...headerData, tableHeader, ...examRows];
    const wsReport = XLSX.utils.aoa_to_sheet(allRows);

    applyWorksheetFormatting(
      wsReport,
      allRows.length,
      [28, 16, 15, 15, 16, 28, 20, 32],
      [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }],
      false
    );

    XLSX.utils.book_append_sheet(wb, wsReport, 'التقرير الأكاديمي');
  }

  // إضافة شيت مستقل للرسم البياني التفصيلي عند تفعيل خيار الرسم البياني
  if (includeChart && sortedResults.length > 0) {
    const chartSheetRows = [
      [`📊 لوحة الرسم البياني وتطور الدرجات - الطالب: ${student.name}`, '', '', ''],
      [`الصف: ${student.grade} | المتوسط العام: ${stats.averagePercentage}% | عدد الامتحانات: ${stats.totalExams}`, '', '', ''],
      [''],
      ...buildStudentChartRows(sortedResults, isMobile, 'bars_and_columns'),
    ];
    const wsChart = XLSX.utils.aoa_to_sheet(chartSheetRows);
    applyWorksheetFormatting(
      wsChart,
      chartSheetRows.length,
      [28, 18, 32, 28],
      [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
      ],
      isMobile
    );
    XLSX.utils.book_append_sheet(wb, wsChart, 'الرسم البياني للدرجات');
  }

  const safeName = student.name.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_');
  XLSX.writeFile(wb, `التقرير_الأكاديمي_${safeName}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/**
 * Backward-compatible single student export
 */
export function exportSingleStudentExcel(
  student: Student,
  results: ExamResult[],
  stats: StudentStats,
  options?: ExcelLayoutAndChartOptions
) {
  exportSingleStudentAcademicReport(student, results, stats, options);
}

export interface ExportFilterOptions extends ExcelLayoutAndChartOptions {
  startDate?: string;
  endDate?: string;
  grade?: string;
  subject?: string;
  group?: string;
  enrollmentStatus?: string; // 'الكل' | 'active' | 'completed' | 'paused' | 'withdrawn'
}

/**
 * تصدير التقارير الأكاديمية المخصصة مع الرسم البياني ومراعاة مقاسات الشيت والهاتف
 */
export function exportCustomAcademicExcel(
  students: Student[],
  exams: Exam[],
  allResults: ExamResult[],
  options: ExportFilterOptions = {},
  gradingScale?: TeacherSettings['gradingScale']
) {
  const prefs = { ...getSavedExcelPreferences(), ...options };
  const isMobile = prefs.layoutMode === 'mobile';
  const includeChart = prefs.includeChart !== false;

  const wb = XLSX.utils.book_new();

  // 1. Filter students
  let filteredStudents = [...students];
  if (options.grade && options.grade !== 'الكل') {
    filteredStudents = filteredStudents.filter((s) => s.grade === options.grade);
  }
  if (options.subject && options.subject !== 'الكل') {
    filteredStudents = filteredStudents.filter(
      (s) => s.subject === options.subject || (Array.isArray(s.subjects) && s.subjects.includes(options.subject!))
    );
  }
  if (options.group && options.group !== 'الكل') {
    filteredStudents = filteredStudents.filter((s) => s.group === options.group);
  }
  if (options.enrollmentStatus && options.enrollmentStatus !== 'الكل') {
    filteredStudents = filteredStudents.filter(
      (s) => getEffectiveEnrollmentStatus(s) === options.enrollmentStatus
    );
  }

  const validStudentIds = new Set(filteredStudents.map((s) => s.id));

  // 2. Filter results by date & students
  let filteredResults = allResults.filter((r) => validStudentIds.has(r.studentDocId));
  if (options.startDate) {
    filteredResults = filteredResults.filter((r) => r.examDate >= options.startDate!);
  }
  if (options.endDate) {
    filteredResults = filteredResults.filter((r) => r.examDate <= options.endDate!);
  }

  const periodLabel =
    options.startDate || options.endDate
      ? `الفترة: ${options.startDate || 'البداية'} إلى ${options.endDate || 'الآن'}`
      : 'كافة الفترات';

  // --- SHEET 1: ملخص أداء الطلاب والرسم البياني العام ---
  const filterSummary: any[][] = [
    ['📊 تقرير الأداء الأكاديمي الشامل للطلاب - Mr Mohammed Hesham', '', '', '', '', ''],
    ['تاريخ الاستخراج:', new Date().toLocaleDateString('ar-EG'), 'نطاق التقرير:', periodLabel, 'وضع التنسيق:', isMobile ? '📱 وضع الهاتف المدمج' : '💻 الوضع المكتبي'],
    ['الصف المحدد:', options.grade || 'كافة الصفوف', 'المادة المحددة:', options.subject || 'كافة المواد', 'عدد الطلاب:', `${filteredStudents.length} طالب`],
    [''],
  ];

  const summaryHeader = isMobile
    ? [
        'م',
        'اسم الطالب والصف',
        'حالة الملف',
        'الامتحانات والمتوسط %',
        'الرسم البياني للمستوى العام',
        'التقييم وملاحظات التقدم',
      ]
    : [
        'م',
        'اسم الطالب',
        'الصف الدراسي',
        'حالة الملف بالكورس',
        'عدد الامتحانات',
        'المتوسط العام %',
        'الرسم البياني للمتوسط',
        'نسبة النجاح %',
        'التقييم العام',
        'ملاحظات التقدم ومسار التطور',
      ];

  const summaryRows = filteredStudents.map((st, idx) => {
    const stResults = filteredResults.filter((r) => r.studentDocId === st.id);
    const stats = calculateStudentStats(stResults, gradingScale);
    const stStatus = ENROLLMENT_STATUS_META[getEffectiveEnrollmentStatus(st)]?.shortLabel || 'فعال';

    if (isMobile) {
      return [
        idx + 1,
        `${st.name} (${st.grade})`,
        stStatus,
        `${stats.totalExams} امتحانات | ${stats.averagePercentage}%`,
        stats.totalExams > 0 ? buildVisualScoreBar(stats.averagePercentage, true) : 'لا توجد امتحانات',
        `${stats.status} - ${stats.trendMessage}`,
      ];
    }

    return [
      idx + 1,
      st.name,
      st.grade,
      stStatus,
      stats.totalExams,
      `${stats.averagePercentage}%`,
      stats.totalExams > 0 ? buildVisualScoreBar(stats.averagePercentage, false) : 'لا توجد امتحانات',
      `${stats.passRate}%`,
      stats.status,
      stats.trendMessage,
    ];
  });

  const allSummaryRows = [...filterSummary, summaryHeader, ...summaryRows];
  const wsSummary = XLSX.utils.aoa_to_sheet(allSummaryRows);
  applyWorksheetFormatting(
    wsSummary,
    allSummaryRows.length,
    isMobile ? [5, 26, 14, 20, 26, 34] : [6, 25, 18, 16, 14, 16, 28, 14, 15, 42],
    [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }],
    isMobile
  );
  XLSX.utils.book_append_sheet(wb, wsSummary, 'ملخص أداء الطلاب');

  // --- SHEET 2: تقارير الطلاب المفصلة مع الرسم البياني لكل طالب ---
  const detailedReportRows: any[][] = [
    ['📋 التقارير الأكاديمية المفصلة والرسوم البيانية للطلاب', '', '', ''],
    ['(مصممة بمساحات مريحة للقراءة على الهاتف والكمبيوتر شاملة الرسم البياني للدرجات)', '', '', ''],
    [''],
  ];

  filteredStudents.forEach((st, idx) => {
    const stResults = filteredResults
      .filter((r) => r.studentDocId === st.id)
      .sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime());
    const stats = calculateStudentStats(stResults, gradingScale);
    const stStatus = ENROLLMENT_STATUS_META[getEffectiveEnrollmentStatus(st)]?.label || 'ملف فعال';

    detailedReportRows.push([
      `══════ [ ${idx + 1}. الطالب: ${st.name} ] ══════`,
      `الصف: ${st.grade}`,
      `حالة الملف: ${stStatus}`,
      `المتوسط: ${stats.averagePercentage}%`,
    ]);
    detailedReportRows.push([
      `عدد الامتحانات: ${stats.totalExams}`,
      `نسبة النجاح: ${stats.passRate}%`,
      `التقييم: ${stats.status}`,
      `المادة: ${st.subject || 'عام'}`,
    ]);
    detailedReportRows.push(['ملاحظات التقدم:', stats.trendMessage, '', '']);

    if (includeChart && stResults.length > 0) {
      detailedReportRows.push([
        'الامتحان والتاريخ',
        'الدرجة والنسبة %',
        'الرسم البياني للدرجة (0% ⟵ 100%)',
        'التقدير والملاحظات',
      ]);
      stResults.forEach((r) => {
        detailedReportRows.push([
          `${r.examTitle} (${r.examDate})`,
          `${r.score} / ${r.totalScore} (${r.percentage}%)`,
          buildVisualScoreBar(r.percentage, isMobile),
          `${r.gradeRating} (${r.passed ? 'ناجح' : 'راسب'})${r.notes ? ` - ${r.notes}` : ''}`,
        ]);
      });
    } else if (stResults.length === 0) {
      detailedReportRows.push(['لا توجد امتحانات مسجلة لهذا الطالب خلال هذه الفترة', '-', '-', '-']);
    } else {
      detailedReportRows.push(['اسم الامتحان', 'التاريخ', 'الدرجة والنسبة', 'التقدير والملاحظات']);
      stResults.forEach((r) => {
        detailedReportRows.push([
          r.examTitle,
          r.examDate,
          `${r.score}/${r.totalScore} (${r.percentage}%)`,
          `${r.gradeRating} | ${r.notes || '-'}`,
        ]);
      });
    }

    detailedReportRows.push(['']);
  });

  const wsDetailed = XLSX.utils.aoa_to_sheet(detailedReportRows);
  applyWorksheetFormatting(
    wsDetailed,
    detailedReportRows.length,
    [30, 22, 30, 32],
    [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
    ],
    isMobile
  );
  XLSX.utils.book_append_sheet(wb, wsDetailed, 'تقارير الطلاب المفصلة');

  const gradeTag = options.grade && options.grade !== 'الكل' ? `_${options.grade.replace(/\s+/g, '_')}` : '';
  const subjTag = options.subject && options.subject !== 'الكل' ? `_${options.subject.replace(/\s+/g, '_')}` : '';
  const statusTag =
    options.enrollmentStatus === 'completed'
      ? '_منتهي_الكورس'
      : options.enrollmentStatus === 'withdrawn'
      ? '_المنقطعين'
      : '';
  const dateTag =
    options.startDate || options.endDate
      ? `_من_${options.startDate || 'البداية'}_إلى_${options.endDate || 'الآن'}`
      : '';

  const fileName = `تقارير_الطلاب_الأكاديمية${statusTag}${gradeTag}${subjTag}${dateTag}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * تصدير قائمة خاصة بالطلبة الذين انتهى الكورس لهم مع إحصائياتهم والرسوم البيانية
 */
export function exportCompletedCourseStudentsExcel(
  students: Student[],
  allResults: ExamResult[],
  settings?: TeacherSettings,
  customOptions?: ExcelLayoutAndChartOptions
) {
  const prefs = { ...getSavedExcelPreferences(), ...customOptions };
  const completedStudents = students.filter(
    (s) => getEffectiveEnrollmentStatus(s) === 'completed'
  );
  exportCustomAcademicExcel(
    completedStudents.length > 0 ? completedStudents : students,
    [],
    allResults,
    {
      enrollmentStatus: completedStudents.length > 0 ? 'completed' : 'الكل',
      includeChart: prefs.includeChart,
      layoutMode: prefs.layoutMode,
    },
    settings?.gradingScale
  );
}

export const exportCompletedStudentsExcel = exportCompletedCourseStudentsExcel;

/**
 * Export all students comprehensive workbook with 4 sheets
 */
export function exportAllDataExcel(
  students: Student[],
  exams: Exam[],
  allResults: ExamResult[],
  settings?: TeacherSettings,
  customOptions?: ExcelLayoutAndChartOptions
) {
  const prefs = { ...getSavedExcelPreferences(), ...customOptions };
  const isMobile = prefs.layoutMode === 'mobile';
  const wb = XLSX.utils.book_new();

  // Sheet 1: Students
  const studentsHeader = [
    'الرقم التعريفي ID',
    'اسم الطالب',
    'حالة ملف الطالب بالكورس',
    'ملاحظة حالة الملف',
    'الصف الدراسي',
    'المجموعة / الفصل',
    'المادة',
    'المدرسة',
    'هاتف الطالب',
    'هاتف ولي الأمر',
    'تاريخ التسجيل',
    'ملاحظات',
  ];
  const studentsRows = students.map((s) => {
    const stStatus = ENROLLMENT_STATUS_META[getEffectiveEnrollmentStatus(s)]?.label || 'ملف فعال';
    const stNote = getEffectiveEnrollmentNote(s);
    return [
      s.studentId,
      s.name,
      stStatus,
      stNote || '-',
      s.grade,
      s.group,
      s.subject,
      s.school || '',
      s.phone || '',
      s.parentPhone || '',
      s.createdAt ? new Date(s.createdAt).toLocaleDateString('ar-EG') : '',
      s.notes || '',
    ];
  });
  const wsStudents = XLSX.utils.aoa_to_sheet([studentsHeader, ...studentsRows]);
  applyWorksheetFormatting(
    wsStudents,
    studentsRows.length + 1,
    [15, 25, 22, 24, 20, 16, 16, 20, 16, 16, 16, 30],
    [],
    isMobile
  );
  XLSX.utils.book_append_sheet(wb, wsStudents, 'قائمة الطلاب وحالاتهم');

  // Sheet 2: Exam Results with Visual Bars
  const resultsHeader = [
    'اسم الطالب',
    'معرف الطالب',
    'اسم الامتحان',
    'تاريخ الامتحان',
    'الدرجة',
    'الدرجة الكلية',
    'النسبة المئوية',
    'المؤشر البياني للدرجة',
    'التقدير',
    'الحالة',
    'ملاحظات',
  ];
  const resultsRows = allResults.map((r) => {
    const st = students.find((s) => s.id === r.studentDocId);
    return [
      r.studentName,
      st ? st.studentId : '',
      r.examTitle,
      r.examDate,
      r.score,
      r.totalScore,
      `${r.percentage}%`,
      buildVisualScoreBar(r.percentage, isMobile),
      r.gradeRating,
      r.passed ? 'ناجح' : 'راسب',
      r.notes || '',
    ];
  });
  const wsResults = XLSX.utils.aoa_to_sheet([resultsHeader, ...resultsRows]);
  applyWorksheetFormatting(
    wsResults,
    resultsRows.length + 1,
    [24, 14, 24, 15, 12, 12, 14, 28, 16, 12, 30],
    [],
    isMobile
  );
  XLSX.utils.book_append_sheet(wb, wsResults, 'نتائج الامتحانات والرسوم');

  // Sheet 3: Exams
  const examsHeader = [
    'اسم الامتحان',
    'المادة',
    'الصف الدراسي',
    'المجموعة',
    'تاريخ الامتحان',
    'نوع الامتحان',
    'الدرجة الكلية',
    'درجة النجاح',
    'ملاحظات',
  ];
  const examsRows = exams.map((e) => [
    e.title,
    e.subject,
    e.grade,
    e.group,
    e.date,
    e.type,
    e.totalScore,
    e.passScore,
    e.notes || '',
  ]);
  const wsExams = XLSX.utils.aoa_to_sheet([examsHeader, ...examsRows]);
  applyWorksheetFormatting(
    wsExams,
    examsRows.length + 1,
    [26, 16, 20, 16, 15, 15, 14, 14, 30],
    [],
    isMobile
  );
  XLSX.utils.book_append_sheet(wb, wsExams, 'الامتحانات');

  // Sheet 4: Statistics & Visual Chart
  const statsHeader = [
    'اسم الطالب',
    'حالة الملف بالكورس',
    'الصف',
    'عدد الامتحانات',
    'متوسط النسبة %',
    'الرسم البياني للمستوى العام',
    'أعلى نسبة %',
    'نسبة النجاح %',
    'الحالة العامة',
    'مسار التطور',
  ];
  const statsRows = students.map((s) => {
    const stResults = allResults.filter((r) => r.studentDocId === s.id);
    const stats = calculateStudentStats(stResults, settings?.gradingScale);
    const stStatus = ENROLLMENT_STATUS_META[getEffectiveEnrollmentStatus(s)]?.shortLabel || 'فعال';
    return [
      s.name,
      stStatus,
      s.grade,
      stats.totalExams,
      `${stats.averagePercentage}%`,
      stats.totalExams > 0 ? buildVisualScoreBar(stats.averagePercentage, isMobile) : 'بدون امتحانات',
      `${stats.highestPercentage}%`,
      `${stats.passRate}%`,
      stats.status,
      stats.trendMessage,
    ];
  });
  const wsStats = XLSX.utils.aoa_to_sheet([statsHeader, ...statsRows]);
  applyWorksheetFormatting(
    wsStats,
    statsRows.length + 1,
    [25, 16, 20, 14, 15, 28, 14, 14, 16, 38],
    [],
    isMobile
  );
  XLSX.utils.book_append_sheet(wb, wsStats, 'الإحصائيات والرسوم البيانية');

  XLSX.writeFile(wb, `سجلات_مستر_محمد_هشام_الشاملة_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/**
 * تصدير نتائج امتحان معين مع الرسم البياني لتوزيع الدرجات وتنسيق الهاتف
 */
export function exportExamResultsExcel(
  exam: Exam,
  results: ExamResult[],
  students: Student[],
  customOptions?: ExcelLayoutAndChartOptions
) {
  const prefs = { ...getSavedExcelPreferences(), ...customOptions };
  const isMobile = prefs.layoutMode === 'mobile';
  const includeChart = prefs.includeChart !== false;

  const wb = XLSX.utils.book_new();

  const examInfo: any[][] = [
    [`📊 تقرير نتائج امتحان: ${exam.title} - سجلات مستر محمد هشام`, '', '', ''],
    ['المادة:', exam.subject, 'الصف الدراسي:', exam.grade],
    ['التاريخ:', exam.date, 'الدرجة الكلية / النجاح:', `${exam.totalScore} (النجاح من ${exam.passScore})`],
    ['عدد المتقدمين:', `${results.length} طالب`, 'نسبة النجاح العامة:', results.length > 0 ? `${Math.round((results.filter((r) => r.passed).length / results.length) * 100)}%` : '0%'],
    [''],
  ];

  if (includeChart && results.length > 0) {
    const bands = [
      { label: 'ممتاز (90% - 100%)', count: results.filter((r) => r.percentage >= 90).length, icon: '🟩' },
      { label: 'جيد جداً (80% - 89%)', count: results.filter((r) => r.percentage >= 80 && r.percentage < 90).length, icon: '🟦' },
      { label: 'جيد (70% - 79%)', count: results.filter((r) => r.percentage >= 70 && r.percentage < 80).length, icon: '🟨' },
      { label: 'مقبول (60% - 69%)', count: results.filter((r) => r.percentage >= 60 && r.percentage < 70).length, icon: '🟧' },
      { label: 'يحتاج تحسين (<60%)', count: results.filter((r) => r.percentage < 60).length, icon: '🟥' },
    ];

    examInfo.push(['📈 الرسم البياني لتوزيع شرائح درجات الطلاب في الامتحان', '', '', '']);
    examInfo.push(['شريحة التقدير', 'عدد الطلاب', 'المخطط البياني للتوزيع', 'النسبة المئوية من الطلاب']);

    bands.forEach((b) => {
      const pct = Math.round((b.count / results.length) * 100);
      const blocks = Math.round((pct / 100) * 10);
      examInfo.push([
        b.label,
        `${b.count} طالب`,
        `${b.icon.repeat(blocks)}${'⬜'.repeat(Math.max(0, 10 - blocks))} ${pct}%`,
        `${pct}%`,
      ]);
    });
    examInfo.push(['']);
  }

  const tableHeader = isMobile
    ? ['م', 'اسم الطالب', 'الدرجة والنسبة %', 'الرسم البياني للدرجة والتقدير']
    : [
        'م',
        'اسم الطالب',
        'الرقم التعريفي ID',
        'نوع المحاولة / التحسين',
        'الدرجة',
        'الدرجة الكلية',
        'النسبة المئوية',
        'الرسم البياني للدرجة',
        'التقدير والحالة',
        'ملاحظات',
      ];

  const tableRows = results.map((r, idx) => {
    const student = students.find((s) => s.id === r.studentDocId);
    const attemptText =
      r.attemptLabel || (r.isImprovement ? `تحسين (محاولة ${r.attemptNumber || 2})` : 'المحاولة الأساسية');

    if (isMobile) {
      return [
        idx + 1,
        r.studentName,
        `${r.score} / ${r.totalScore} (${r.percentage}%)`,
        `${buildVisualScoreBar(r.percentage, true)} | ${r.gradeRating} (${r.passed ? 'ناجح' : 'راسب'})`,
      ];
    }

    return [
      idx + 1,
      r.studentName,
      student ? student.studentId : '-',
      attemptText,
      r.score,
      r.totalScore,
      `${r.percentage}%`,
      buildVisualScoreBar(r.percentage, false),
      `${r.gradeRating} (${r.passed ? 'ناجح' : 'راسب'})`,
      r.notes || '',
    ];
  });

  const allRows = [...examInfo, tableHeader, ...tableRows];
  const ws = XLSX.utils.aoa_to_sheet(allRows);
  applyWorksheetFormatting(
    ws,
    allRows.length,
    isMobile ? [6, 26, 20, 36] : [6, 25, 15, 20, 12, 12, 15, 28, 20, 30],
    [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }],
    isMobile
  );

  XLSX.utils.book_append_sheet(wb, ws, 'نتائج الامتحان');

  const safeTitle = exam.title.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_');
  XLSX.writeFile(wb, `نتائج_امتحان_${safeTitle}_${exam.date}.xlsx`);
}
