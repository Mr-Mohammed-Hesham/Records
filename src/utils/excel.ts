import * as XLSX from 'xlsx';
import { Student, Exam, ExamResult, StudentStats, TeacherSettings } from '../types';
import { calculateStudentStats } from './grading';

/**
 * Export single student complete performance report
 */
export function exportSingleStudentExcel(
  student: Student,
  results: ExamResult[],
  stats: StudentStats
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Student Overview and Stats
  const infoRows = [
    ['تقرير أداء الطالب الأكاديمي - Mr Mohammed Hesham Records', ''],
    ['تاريخ التصدير:', new Date().toLocaleDateString('ar-EG')],
    ['', ''],
    ['البيانات الشخصية والصف', ''],
    ['اسم الطالب:', student.name],
    ['الرقم التعريفي (Student ID):', student.studentId],
    ['الصف الدراسي:', student.grade],
    ['المجموعة / الفصل:', student.group],
    ['المادة:', student.subject],
    ['المدرسة:', student.school || 'غير محدد'],
    ['رقم هاتف الطالب:', student.phone || '-'],
    ['رقم هاتف ولي الأمر:', student.parentPhone || '-'],
    ['تاريخ الإضافة:', student.createdAt ? new Date(student.createdAt).toLocaleDateString('ar-EG') : '-'],
    ['ملاحظات:', student.notes || '-'],
    ['', ''],
    ['المؤشرات الإحصائية العامة', ''],
    ['عدد الامتحانات:', stats.totalExams],
    ['متوسط النسبة المئوية:', `${stats.averagePercentage}%`],
    ['متوسط الدرجات:', stats.averageScore],
    ['أعلى درجة حصل عليها:', `${stats.highestScore} (${stats.highestPercentage}%)`],
    ['أقل درجة حصل عليها:', `${stats.lowestScore} (${stats.lowestPercentage}%)`],
    ['نسبة النجاح:', `${stats.passRate}%`],
    ['التقييم العام للمستوى:', stats.status],
    ['مسار التطور:', stats.trendMessage],
  ];

  const wsInfo = XLSX.utils.aoa_to_sheet(infoRows);
  XLSX.utils.book_append_sheet(wb, wsInfo, 'بيانات وإحصائيات الطالب');

  // Sheet 2: Exam records
  const examHeader = [
    'اسم الامتحان',
    'تاريخ الامتحان',
    'الدرجة الحاصل عليها',
    'الدرجة الكلية',
    'النسبة المئوية',
    'التقدير',
    'حالة النجاح',
    'ملاحظات المدرس'
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

  const wsExams = XLSX.utils.aoa_to_sheet([examHeader, ...examRows]);
  XLSX.utils.book_append_sheet(wb, wsExams, 'سجل الامتحانات');

  // Generate file name
  const safeName = student.name.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_');
  XLSX.writeFile(wb, `تقرير_الطالب_${safeName}_${new Date().toISOString().split('T')[0]}.xlsx`);
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
