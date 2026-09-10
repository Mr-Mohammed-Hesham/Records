import * as XLSX from 'xlsx';
import { Student, Exam, ExamResult, StudentStats, TeacherSettings } from '../types';
import { calculateStudentStats } from './grading';

/**
 * Export single student academic performance report
 * Strictly contains: Student Name, Grade, Exams count, Individual exam scores, General average, Success rate, and Progress notes
 */
export function exportSingleStudentAcademicReport(
  student: Student,
  results: ExamResult[],
  stats: StudentStats
) {
  const wb = XLSX.utils.book_new();

  // Academic Report Header & Summary
  const headerData = [
    ['تقرير الأداء الأكاديمي للطالب - سجلات مستر محمد هشام', ''],
    ['تاريخ استخراج التقرير:', new Date().toLocaleDateString('ar-EG')],
    ['', ''],
    ['بيانات الطالب الأساسية', ''],
    ['اسم الطالب:', student.name],
    ['الصف الدراسي:', student.grade],
    ['المادة الدراسية:', student.subject || 'عام'],
    ['المجموعة / الشعبة:', student.group || '-'],
    ['', ''],
    ['ملخص المؤشرات الأكاديمية', ''],
    ['إجمالي عدد الامتحانات:', stats.totalExams],
    ['المتوسط العام للنسبة المئوية:', `${stats.averagePercentage}%`],
    ['متوسط الدرجات:', stats.averageScore],
    ['أعلى نسبة تم تحقيقها:', `${stats.highestPercentage}% (${stats.highestScore} درجة)`],
    ['نسبة النجاح العامة:', `${stats.passRate}%`],
    ['التقييم العام للمستوى:', stats.status],
    ['ملاحظات التقدم والمستوى العام:', stats.trendMessage],
    ['', ''],
    ['تفاصيل درجات الامتحانات على حدة', '']
  ];

  // Exam rows
  const tableHeader = [
    'اسم الامتحان',
    'تاريخ الامتحان',
    'درجة الامتحان',
    'الدرجة الكلية',
    'النسبة المئوية %',
    'التقدير الأكاديمي',
    'النتيجة',
    'ملاحظات الامتحان'
  ];

  const examRows = results.map(r => [
    r.examTitle,
    r.examDate,
    r.score,
    r.totalScore,
    `${r.percentage}%`,
    r.gradeRating,
    r.passed ? 'ناجح' : 'راسب',
    r.notes || '-'
  ]);

  const wsReport = XLSX.utils.aoa_to_sheet([...headerData, tableHeader, ...examRows]);
  
  // Set basic column widths
  wsReport['!cols'] = [
    { wch: 30 }, // اسم الامتحان / الحقول
    { wch: 18 }, // التاريخ
    { wch: 14 }, // الدرجة
    { wch: 14 }, // الدرجة الكلية
    { wch: 16 }, // النسبة
    { wch: 16 }, // التقدير
    { wch: 14 }, // النتيجة
    { wch: 35 }, // ملاحظات
  ];

  XLSX.utils.book_append_sheet(wb, wsReport, 'التقرير الأكاديمي');

  const safeName = student.name.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_');
  XLSX.writeFile(wb, `التقرير_الأكاديمي_${safeName}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/**
 * Backward-compatible single student export
 */
export function exportSingleStudentExcel(
  student: Student,
  results: ExamResult[],
  stats: StudentStats
) {
  exportSingleStudentAcademicReport(student, results, stats);
}

export interface ExportFilterOptions {
  startDate?: string;
  endDate?: string;
  grade?: string;
  subject?: string;
  group?: string;
}

/**
 * Export customized Excel report filtered by:
 * - Specific Time Period (من تاريخ إلى تاريخ)
 * - Grade (الصف)
 * - Subject (المادة)
 * Contains student academic reports in the exact student format specified by the user:
 * Student Name, Grade, Exams Count, Individual Exam scores, General Average, Success Rate, and Progress Notes.
 */
export function exportCustomAcademicExcel(
  students: Student[],
  exams: Exam[],
  allResults: ExamResult[],
  options: ExportFilterOptions = {},
  gradingScale?: TeacherSettings['gradingScale']
) {
  const wb = XLSX.utils.book_new();

  // 1. Filter students
  let filteredStudents = [...students];
  if (options.grade && options.grade !== 'الكل') {
    filteredStudents = filteredStudents.filter(s => s.grade === options.grade);
  }
  if (options.subject && options.subject !== 'الكل') {
    filteredStudents = filteredStudents.filter(s => s.subject === options.subject);
  }
  if (options.group && options.group !== 'الكل') {
    filteredStudents = filteredStudents.filter(s => s.group === options.group);
  }

  const validStudentIds = new Set(filteredStudents.map(s => s.id));

  // 2. Filter results by date & students
  let filteredResults = allResults.filter(r => validStudentIds.has(r.studentDocId));
  if (options.startDate) {
    filteredResults = filteredResults.filter(r => r.examDate >= options.startDate!);
  }
  if (options.endDate) {
    filteredResults = filteredResults.filter(r => r.examDate <= options.endDate!);
  }

  // --- SHEET 1: ملخص أداء الطلاب الأكاديمي ---
  const periodLabel = (options.startDate || options.endDate)
    ? `الفترة: ${options.startDate || 'البداية'} إلى ${options.endDate || 'الآن'}`
    : 'كافة الفترات';

  const filterSummary = [
    ['تقرير الأداء الأكاديمي الشامل للطلاب - Mr Mohammed Hesham', ''],
    ['تاريخ الاستخراج:', new Date().toLocaleDateString('ar-EG')],
    ['نطاق التقرير:', periodLabel],
    ['الصف المحدد:', options.grade || 'كافة الصفوف'],
    ['المادة المحددة:', options.subject || 'كافة المواد'],
    ['عدد الطلاب المشمولين:', filteredStudents.length],
    ['', '']
  ];

  const summaryHeader = [
    'م',
    'اسم الطالب',
    'الصف الدراسي',
    'المادة',
    'عدد الامتحانات',
    'المتوسط العام للنسبة %',
    'متوسط الدرجات',
    'نسبة النجاح %',
    'التقييم العام',
    'ملاحظات التقدم ومسار التطور'
  ];

  const summaryRows = filteredStudents.map((st, idx) => {
    const stResults = filteredResults.filter(r => r.studentDocId === st.id);
    const stats = calculateStudentStats(stResults, gradingScale);
    return [
      idx + 1,
      st.name,
      st.grade,
      st.subject || 'عام',
      stats.totalExams,
      `${stats.averagePercentage}%`,
      stats.averageScore,
      `${stats.passRate}%`,
      stats.status,
      stats.trendMessage
    ];
  });

  const wsSummary = XLSX.utils.aoa_to_sheet([...filterSummary, summaryHeader, ...summaryRows]);
  wsSummary['!cols'] = [
    { wch: 6 },
    { wch: 25 },
    { wch: 18 },
    { wch: 15 },
    { wch: 15 },
    { wch: 20 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 45 }
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'ملخص أداء الطلاب');

  // --- SHEET 2: تقارير الطلاب المفصلة (بنفس تنسيق تقرير كل طالب) ---
  const detailedReportRows: any[][] = [
    ['التقارير الأكاديمية المفصلة للطلاب', ''],
    ['(تحتوي على: اسم الطالب، الصف، عدد الامتحانات، درجات كل امتحان على حدة، المتوسط العام، نسبة النجاح، ملاحظات التقدم)', ''],
    ['', '']
  ];

  filteredStudents.forEach((st, idx) => {
    const stResults = filteredResults.filter(r => r.studentDocId === st.id);
    const stats = calculateStudentStats(stResults, gradingScale);

    // Student Header Card
    detailedReportRows.push([`═══════════════════════════════════════════ [ طالب رقم ${idx + 1} ] ═══════════════════════════════════════════`]);
    detailedReportRows.push(['اسم الطالب:', st.name, 'الصف الدراسي:', st.grade, 'المادة:', st.subject || 'عام']);
    detailedReportRows.push([
      'عدد الامتحانات:', stats.totalExams,
      'المتوسط العام:', `${stats.averagePercentage}% (${stats.averageScore})`,
      'نسبة النجاح:', `${stats.passRate}%`,
      'التقييم:', stats.status
    ]);
    detailedReportRows.push(['ملاحظات التقدم والمستوى العام:', stats.trendMessage]);
    
    // Student individual exam details
    detailedReportRows.push(['--- تفاصيل الامتحانات ---']);
    detailedReportRows.push([
      'اسم الامتحان',
      'تاريخ الامتحان',
      'درجة الامتحان',
      'الدرجة الكلية',
      'النسبة المئوية %',
      'التقدير',
      'النتيجة',
      'ملاحظات الامتحان'
    ]);

    if (stResults.length === 0) {
      detailedReportRows.push(['لا توجد امتحانات مسجلة لهذا الطالب خلال هذه الفترة المحدد']);
    } else {
      stResults.forEach(r => {
        detailedReportRows.push([
          r.examTitle,
          r.examDate,
          r.score,
          r.totalScore,
          `${r.percentage}%`,
          r.gradeRating,
          r.passed ? 'ناجح' : 'راسب',
          r.notes || '-'
        ]);
      });
    }

    // Spacing between students
    detailedReportRows.push(['']);
    detailedReportRows.push(['']);
  });

  const wsDetailed = XLSX.utils.aoa_to_sheet(detailedReportRows);
  wsDetailed['!cols'] = [
    { wch: 30 },
    { wch: 20 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
    { wch: 16 },
    { wch: 14 },
    { wch: 35 }
  ];
  XLSX.utils.book_append_sheet(wb, wsDetailed, 'تقارير الطلاب المفصلة');

  // Generate expressive filename
  const gradeTag = options.grade && options.grade !== 'الكل' ? `_${options.grade.replace(/\s+/g, '_')}` : '';
  const subjTag = options.subject && options.subject !== 'الكل' ? `_${options.subject.replace(/\s+/g, '_')}` : '';
  const dateTag = options.startDate || options.endDate ? `_من_${options.startDate || 'البداية'}_إلى_${options.endDate || 'الآن'}` : '';

  const fileName = `تقارير_الطلاب_الأكاديمية${gradeTag}${subjTag}${dateTag}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Export all students comprehensive workbook with 4 sheets:
 * Sheet 1: Students
 * Sheet 2: Exam Results
 * Sheet 3: Exams
 * Sheet 4: Statistics
 */
export function exportAllDataExcel(
  students: Student[],
  exams: Exam[],
  allResults: ExamResult[],
  settings?: TeacherSettings
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Students
  const studentsHeader = [
    'الرقم التعريفي ID',
    'اسم الطالب',
    'الصف الدراسي',
    'المجموعة / الفصل',
    'المادة',
    'المدرسة',
    'هاتف الطالب',
    'هاتف ولي الأمر',
    'البريد الإلكتروني',
    'تاريخ التسجيل',
    'ملاحظات'
  ];
  const studentsRows = students.map(s => [
    s.studentId,
    s.name,
    s.grade,
    s.group,
    s.subject,
    s.school || '',
    s.phone || '',
    s.parentPhone || '',
    s.email || '',
    s.createdAt ? new Date(s.createdAt).toLocaleDateString('ar-EG') : '',
    s.notes || ''
  ]);
  const wsStudents = XLSX.utils.aoa_to_sheet([studentsHeader, ...studentsRows]);
  XLSX.utils.book_append_sheet(wb, wsStudents, 'Students');

  // Sheet 2: Exam Results
  const resultsHeader = [
    'اسم الطالب',
    'معرف الطالب',
    'اسم الامتحان',
    'تاريخ الامتحان',
    'الدرجة',
    'الدرجة الكلية',
    'النسبة المئوية',
    'التقدير',
    'الحالة',
    'ملاحظات'
  ];
  const resultsRows = allResults.map(r => {
    const st = students.find(s => s.id === r.studentDocId);
    return [
      r.studentName,
      st ? st.studentId : '',
      r.examTitle,
      r.examDate,
      r.score,
      r.totalScore,
      `${r.percentage}%`,
      r.gradeRating,
      r.passed ? 'ناجح' : 'راسب',
      r.notes || ''
    ];
  });
  const wsResults = XLSX.utils.aoa_to_sheet([resultsHeader, ...resultsRows]);
  XLSX.utils.book_append_sheet(wb, wsResults, 'Exam Results');

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
    'ملاحظات'
  ];
  const examsRows = exams.map(e => [
    e.title,
    e.subject,
    e.grade,
    e.group,
    e.date,
    e.type,
    e.totalScore,
    e.passScore,
    e.notes || ''
  ]);
  const wsExams = XLSX.utils.aoa_to_sheet([examsHeader, ...examsRows]);
  XLSX.utils.book_append_sheet(wb, wsExams, 'Exams');

  // Sheet 4: Statistics
  const statsHeader = [
    'اسم الطالب',
    'الرقم التعريفي',
    'الصف',
    'المجموعة',
    'عدد الامتحانات',
    'متوسط الدرجات',
    'متوسط النسبة %',
    'أعلى نسبة %',
    'أقل نسبة %',
    'نسبة النجاح %',
    'الحالة العامة',
    'مسار التطور'
  ];
  const statsRows = students.map(s => {
    const stResults = allResults.filter(r => r.studentDocId === s.id);
    const stats = calculateStudentStats(stResults, settings?.gradingScale);
    return [
      s.name,
      s.studentId,
      s.grade,
      s.group,
      stats.totalExams,
      stats.averageScore,
      `${stats.averagePercentage}%`,
      `${stats.highestPercentage}%`,
      `${stats.lowestPercentage}%`,
      `${stats.passRate}%`,
      stats.status,
      stats.trendMessage
    ];
  });
  const wsStats = XLSX.utils.aoa_to_sheet([statsHeader, ...statsRows]);
  XLSX.utils.book_append_sheet(wb, wsStats, 'Statistics');

  XLSX.writeFile(wb, `سجلات_مستر_محمد_هشام_الشاملة_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/**
 * Export specific exam results
 */
export function exportExamResultsExcel(
  exam: Exam,
  results: ExamResult[],
  students: Student[]
) {
  const wb = XLSX.utils.book_new();

  // Header info
  const examInfo = [
    ['تقرير نتائج امتحان - Mr Mohammed Hesham Records', ''],
    ['اسم الامتحان:', exam.title],
    ['المادة:', exam.subject],
    ['الصف الدراسي:', exam.grade],
    ['المجموعة / الفصل:', exam.group || 'الكل'],
    ['التاريخ:', exam.date],
    ['الدرجة الكلية:', exam.totalScore],
    ['درجة النجاح:', exam.passScore],
    ['نوع الامتحان:', exam.type],
    ['عدد الطلاب الذين دخلوا الامتحان:', results.length],
    ['', ''],
  ];

  // Table
  const tableHeader = [
    'م',
    'اسم الطالب',
    'الرقم التعريفي ID',
    'الدرجة',
    'الدرجة الكلية',
    'النسبة المئوية',
    'التقدير',
    'حالة النجاح',
    'ملاحظات'
  ];

  const tableRows = results.map((r, idx) => {
    const student = students.find(s => s.id === r.studentDocId);
    return [
      idx + 1,
      r.studentName,
      student ? student.studentId : '-',
      r.score,
      r.totalScore,
      `${r.percentage}%`,
      r.gradeRating,
      r.passed ? 'ناجح' : 'راسب',
      r.notes || ''
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([...examInfo, tableHeader, ...tableRows]);
  XLSX.utils.book_append_sheet(wb, ws, 'نتائج الامتحان');

  const safeTitle = exam.title.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_');
  XLSX.writeFile(wb, `نتائج_امتحان_${safeTitle}_${exam.date}.xlsx`);
}
