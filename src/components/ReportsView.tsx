import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart3,
  FileSpreadsheet,
  Calendar,
  Users,
  Award,
  AlertTriangle,
  ArrowLeftRight,
  Filter,
  CheckCircle2,
  Clock,
  BookOpenCheck,
  Printer,
  GraduationCap,
  TrendingUp,
  Download,
  Eye,
  PieChart as PieChartIcon,
  RotateCcw,
  Smartphone,
  Monitor,
  Layers,
  Sparkles,
  Hash,
} from 'lucide-react';
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
  Legend
} from 'recharts';
import { Student, Exam, ExamResult, TeacherSettings, ExamStructure, StudentStructureProgress } from '../types';
import { calculateStudentStats } from '../utils/grading';
import {
  exportSingleStudentAcademicReport,
  exportCustomAcademicExcel,
  exportAllDataExcel,
  exportExamResultsExcel,
  exportCompletedStudentsExcel,
  exportStructuresReportExcel,
  exportSingleStudentStructuresReport,
  loadExcelPreferences,
  saveExcelPreferences,
} from '../utils/excel';
import { getEffectiveEnrollmentStatus, ENROLLMENT_STATUS_META, ENROLLMENT_STATUS_LIST } from '../utils/studentStatus';
import {
  StructureStatusFilter,
  getEffectiveStructureStatus,
  STRUCTURE_STATUS_META,
  getStructureStatusLabel,
} from '../utils/structureStatus';
import { ACADEMIC_TERMS } from '../services/firebase';
import { loadViewState, saveViewState, clearViewState, recordLastActivity } from '../utils/activityTracker';
import { DynamicGradesChart } from './DynamicGradesChart';
import { ExcelExportModal } from './ExcelExportModal';
import { StudentAcademicReportModal } from './StudentAcademicReportModal';
import { AttachmentThumbnail } from './AttachmentThumbnail';
import { AttachmentModal } from './AttachmentModal';
import { HonorBoardModal } from './HonorBoardModal';
import {
  useLanguage,
  translateGrade,
  translateTerm,
  translateTrack,
  translateSubject,
} from '../utils/i18n';

interface ReportsViewProps {
  students: Student[];
  exams: Exam[];
  allResults: ExamResult[];
  settings: TeacherSettings;
  structures?: ExamStructure[];
  structureProgress?: StudentStructureProgress[];
  onOpenStudentProfile: (student: Student) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  students,
  exams,
  allResults,
  settings,
  structures = [],
  structureProgress = [],
  onOpenStudentProfile,
}) => {
  const { lang, isRtl, dir, tr } = useLanguage();
  const savedReportState = useMemo(
    () =>
      loadViewState('REPORTS_VIEW', {
        reportType: 'single_student' as
          | 'all_students'
          | 'single_student'
          | 'single_exam'
          | 'by_grade'
          | 'by_group'
          | 'completed_course'
          | 'exam_comparison'
          | 'structures',
        selectedStudentId: students?.[0]?.id || '',
        selectedExamId: exams?.[0]?.id || '',
        selectedGrade: settings?.grades?.[0] || 'الأول الثانوي',
        selectedGroup: settings?.groups?.[0] || 'المجموعة A',
        selectedTerm: 'الكل',
        selectedEnrollmentStatus: 'exclude_completed',
        compareExamIds: [] as string[],
        startDate: '',
        endDate: '',
      }),
    []
  );

  const [reportType, setReportType] = useState<
    'all_students' | 'single_student' | 'single_exam' | 'by_grade' | 'by_group' | 'completed_course' | 'exam_comparison' | 'structures'
  >(savedReportState.reportType);

  // Excel Preferences
  const initialExcelPrefs = useMemo(() => loadExcelPreferences(), []);
  const [excelLayoutMode, setExcelLayoutMode] = useState<'mobile' | 'desktop'>(initialExcelPrefs.layoutMode);
  const [excelIncludeChart, setExcelIncludeChart] = useState<boolean>(initialExcelPrefs.includeChart);

  // Logo in reports toggle state (include or exclude logo in exported reports)
  const [showReportLogo, setShowReportLogo] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('mh_reports_view_show_logo');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const handleToggleReportLogo = () => {
    const nextVal = !showReportLogo;
    setShowReportLogo(nextVal);
    try {
      localStorage.setItem('mh_reports_view_show_logo', String(nextVal));
    } catch {}
  };

  // Selected Term filter (الفصل الدراسي) & File status filter (حالة ملف الطالب)
  const [selectedTerm, setSelectedTerm] = useState<string>(
    savedReportState.selectedTerm || 'الكل'
  );
  const [selectedEnrollmentStatus, setSelectedEnrollmentStatus] = useState<string>(
    savedReportState.selectedEnrollmentStatus || 'exclude_completed'
  );

  const getExportOptions = () => {
    saveExcelPreferences({ layoutMode: excelLayoutMode, includeChart: excelIncludeChart, includeLogoHeader: showReportLogo });
    return {
      layoutMode: excelLayoutMode,
      includeChart: excelIncludeChart,
      includeLogoHeader: showReportLogo,
      chartType: 'both' as const,
      term: selectedTerm,
      enrollmentStatus: selectedEnrollmentStatus,
    };
  };

  // Modals state
  const [showExportModal, setShowExportModal] = useState(false);
  const [showHonorBoardModal, setShowHonorBoardModal] = useState(false);
  const [academicModalStudent, setAcademicModalStudent] = useState<Student | null>(null);
  const [previewAttachmentResult, setPreviewAttachmentResult] = useState<ExamResult | null>(null);

  // Selected student for single student report
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    savedReportState.selectedStudentId || students?.[0]?.id || ''
  );
  // Selected exam for single exam report
  const [selectedExamId, setSelectedExamId] = useState<string>(
    savedReportState.selectedExamId || exams?.[0]?.id || ''
  );
  // Selected grade & group
  const [selectedGrade, setSelectedGrade] = useState<string>(
    savedReportState.selectedGrade || settings?.grades?.[0] || 'الأول الثانوي'
  );
  const [selectedGroup, setSelectedGroup] = useState<string>(
    savedReportState.selectedGroup || settings?.groups?.[0] || 'المجموعة A'
  );

  // Multi-exam comparison selection (array of exam IDs)
  const [compareExamIds, setCompareExamIds] = useState<string[]>(savedReportState.compareExamIds || []);

  // Date range filter
  const [startDate, setStartDate] = useState<string>(savedReportState.startDate || '');
  const [endDate, setEndDate] = useState<string>(savedReportState.endDate || '');

  // Export Multi-Selection & Count Scope (Students & Structures)
  const [selectedExportStudentIds, setSelectedExportStudentIds] = useState<string[]>([]);
  const [studentQuickCountInput, setStudentQuickCountInput] = useState<number>(5);
  const [selectedExportStructureIds, setSelectedExportStructureIds] = useState<string[]>([]);
  const [structureQuickCountInput, setStructureQuickCountInput] = useState<number>(3);

  const toggleExportStudentId = (id: string) => {
    setSelectedExportStudentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAllExportStudents = (list: Student[]) => {
    setSelectedExportStudentIds(list.map((s) => s.id));
  };

  const selectCountExportStudents = (list: Student[], countRaw: number) => {
    const cnt = Math.max(1, Math.min(list.length, Math.floor(countRaw || 1)));
    setSelectedExportStudentIds(list.slice(0, cnt).map((s) => s.id));
  };

  const toggleExportStructureId = (id: string) => {
    setSelectedExportStructureIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // 1. فلترة قائمة الطلاب حسب الفصل الدراسي وحالة الملف لمنع ظهور منتهي الملف عند طلب الفعالين فقط
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // فلترة الترم / الفصل الدراسي
      if (selectedTerm !== 'الكل' && s.term && s.term !== selectedTerm) return false;
      // فلترة حالة الملف
      const effStatus = getEffectiveEnrollmentStatus(s);
      if (selectedEnrollmentStatus === 'exclude_completed') {
        if (effStatus === 'completed') return false;
      } else if (selectedEnrollmentStatus === 'active') {
        if (effStatus !== 'active') return false;
      } else if (selectedEnrollmentStatus !== 'الكل') {
        if (effStatus !== selectedEnrollmentStatus) return false;
      }
      return true;
    });
  }, [students, selectedTerm, selectedEnrollmentStatus]);

  // 2. فلترة الامتحانات حسب الفصل الدراسي
  const filteredExams = useMemo(() => {
    if (selectedTerm === 'الكل') return exams;
    return exams.filter((e) => !e.term || e.term === selectedTerm);
  }, [exams, selectedTerm]);

  // Ensure valid student/exam selection when data or filters change
  useEffect(() => {
    if (filteredStudents.length > 0 && !filteredStudents.some((s) => s.id === selectedStudentId)) {
      setSelectedStudentId(filteredStudents[0].id);
    }
  }, [filteredStudents, selectedStudentId]);

  useEffect(() => {
    if (filteredExams.length > 0 && !filteredExams.some((e) => e.id === selectedExamId)) {
      setSelectedExamId(filteredExams[0].id);
    }
  }, [filteredExams, selectedExamId]);

  // Persist Reports View state automatically
  useEffect(() => {
    saveViewState('REPORTS_VIEW', {
      reportType,
      selectedStudentId,
      selectedExamId,
      selectedGrade,
      selectedGroup,
      selectedTerm,
      selectedEnrollmentStatus,
      compareExamIds,
      startDate,
      endDate,
    });
    recordLastActivity({
      tab: 'reports',
      actionLabel: tr('استعراض التقارير الأكاديمية والرسوم البيانية', 'Viewing academic reports & charts'),
    });
  }, [reportType, selectedStudentId, selectedExamId, selectedGrade, selectedGroup, selectedTerm, selectedEnrollmentStatus, compareExamIds, startDate, endDate, lang]);

  const handleResetReportActivity = () => {
    clearViewState('REPORTS_VIEW');
    setReportType('single_student');
    setSelectedTerm('الكل');
    setSelectedEnrollmentStatus('exclude_completed');
    setSelectedStudentId(students?.[0]?.id || '');
    setSelectedExamId(exams?.[0]?.id || '');
    setSelectedGrade(settings?.grades?.[0] || 'الأول الثانوي');
    setSelectedGroup(settings?.groups?.[0] || 'المجموعة A');
    setCompareExamIds([]);
    setStartDate('');
    setEndDate('');
    setSelectedExportStudentIds([]);
    setSelectedExportStructureIds([]);
  };

  const examMap = useMemo(() => new Map(exams.map(e => [e.id, e])), [exams]);

  // Filtered results based on date range and selected term
  const dateFilteredResults = useMemo(() => {
    return allResults.filter(r => {
      if (startDate && r.examDate < startDate) return false;
      if (endDate && r.examDate > endDate) return false;
      if (selectedTerm !== 'الكل') {
        const ex = examMap.get(r.examId);
        if (ex && ex.term && ex.term !== selectedTerm) return false;
      }
      return true;
    });
  }, [allResults, startDate, endDate, selectedTerm, examMap]);

  // Selected student data
  const currentStudent = useMemo(() => {
    return filteredStudents.find(s => s.id === selectedStudentId) || filteredStudents[0] || students.find(s => s.id === selectedStudentId);
  }, [filteredStudents, students, selectedStudentId]);

  const currentStudentResults = useMemo(() => {
    if (!currentStudent) return [];
    return dateFilteredResults.filter(r => r.studentDocId === currentStudent.id);
  }, [dateFilteredResults, currentStudent]);

  const currentStudentStats = useMemo(() => {
    return calculateStudentStats(currentStudentResults, settings.gradingScale);
  }, [currentStudentResults, settings.gradingScale]);

  // Selected exam data
  const currentExam = useMemo(() => {
    return filteredExams.find(e => e.id === selectedExamId) || filteredExams[0] || exams.find(e => e.id === selectedExamId);
  }, [filteredExams, exams, selectedExamId]);

  const currentExamResults = useMemo(() => {
    if (!currentExam) return [];
    return dateFilteredResults.filter(r => r.examId === currentExam.id);
  }, [dateFilteredResults, currentExam]);

  // Grade rating distribution for selected exam (Recharts data)
  const examRatingDistribution = useMemo(() => {
    if (!currentExamResults.length) return [];

    // Default standard rating buckets
    const ratingBuckets: Record<string, { label: string; count: number; color: string; order: number }> = {
      'ممتاز مرتفع (A+)': { label: tr('A+ ممتاز مرتفع', 'A+ High Distinction'), count: 0, color: '#10b981', order: 1 },
      'ممتاز (A)': { label: tr('A ممتاز', 'A Excellent'), count: 0, color: '#059669', order: 2 },
      'جيد جداً (B)': { label: tr('B جيد جداً', 'B Very Good'), count: 0, color: '#0284c7', order: 3 },
      'جيد (C)': { label: tr('C جيد', 'C Good'), count: 0, color: '#f59e0b', order: 4 },
      'مقبول (D)': { label: tr('D مقبول', 'D Pass'), count: 0, color: '#f97316', order: 5 },
      'راسب (F)': { label: tr('F راسب', 'F Fail'), count: 0, color: '#ef4444', order: 6 },
    };

    currentExamResults.forEach(r => {
      const rating = r.gradeRating || tr('غير محدد', 'Unspecified');
      if (ratingBuckets[rating]) {
        ratingBuckets[rating].count += 1;
      } else {
        // Look up by partial match or fallback
        const matchedKey = Object.keys(ratingBuckets).find(k => k.includes(rating) || rating.includes(k));
        if (matchedKey) {
          ratingBuckets[matchedKey].count += 1;
        } else {
          ratingBuckets[rating] = { label: rating, count: 1, color: '#64748b', order: 99 };
        }
      }
    });

    return Object.values(ratingBuckets)
      .filter(b => b.count > 0 || b.order <= 6)
      .sort((a, b) => a.order - b.order);
  }, [currentExamResults, lang]);

  // Pass / Fail distribution for pie chart
  const examPassFailDistribution = useMemo(() => {
    if (!currentExamResults.length) return [];
    const passed = currentExamResults.filter(r => r.passed).length;
    const failed = currentExamResults.length - passed;
    return [
      { name: tr('ناجح', 'Passed'), value: passed, color: '#10b981' },
      { name: tr('راسب / يحتاج تحسين', 'Failed / Needs Improvement'), value: failed, color: '#f43f5e' },
    ];
  }, [currentExamResults, lang]);

  // Score intervals distribution for score bands (e.g., 90-100%, 80-89%, etc.)
  const examScoreBands = useMemo(() => {
    if (!currentExamResults.length) return [];
    const bands = [
      { range: '90% - 100%', count: 0, color: '#10b981' },
      { range: '80% - 89%', count: 0, color: '#0ea5e9' },
      { range: '70% - 79%', count: 0, color: '#f59e0b' },
      { range: '60% - 69%', count: 0, color: '#f97316' },
      { range: tr('أقل من 60%', 'Below 60%'), count: 0, color: '#ef4444' },
    ];

    currentExamResults.forEach(r => {
      const p = r.percentage;
      if (p >= 90) bands[0].count += 1;
      else if (p >= 80) bands[1].count += 1;
      else if (p >= 70) bands[2].count += 1;
      else if (p >= 60) bands[3].count += 1;
      else bands[4].count += 1;
    });

    return bands;
  }, [currentExamResults, lang]);

  // Grade reports
  const gradeStudents = useMemo(() => {
    return filteredStudents.filter(s => s.grade === selectedGrade);
  }, [filteredStudents, selectedGrade]);

  // Group reports
  const groupStudents = useMemo(() => {
    return filteredStudents.filter(s => s.group === selectedGroup);
  }, [filteredStudents, selectedGroup]);

  // Exam comparison data
  const comparedExamsData = useMemo(() => {
    return (compareExamIds || []).map(id => {
      const ex = exams.find(e => e.id === id);
      const res = dateFilteredResults.filter(r => r.examId === id);
      const attended = res.length;
      const avg = attended > 0 ? Math.round(res.reduce((a, b) => a + b.percentage, 0) / attended) : 0;
      const passed = res.filter(r => r.passed).length;
      const passRate = attended > 0 ? Math.round((passed / attended) * 100) : 0;
      return { exam: ex, res, attended, avg, passRate };
    }).filter(d => d.exam !== undefined);
  }, [compareExamIds, exams, dateFilteredResults]);

  const toggleCompareExam = (id: string) => {
    setCompareExamIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Structures filters & analytics inside Reports
  const [selectedStructureFilterId, setSelectedStructureFilterId] = useState<string>('الكل');
  const [selectedStructureTrack, setSelectedStructureTrack] = useState<string>('الكل');
  const [selectedStructureGrade, setSelectedStructureGrade] = useState<string>('الكل');
  const [selectedStructureSubject, setSelectedStructureSubject] = useState<string>('الكل');
  const [selectedStructureYear, setSelectedStructureYear] = useState<string>('الكل');
  const [selectedStructureCompletionStatus, setSelectedStructureCompletionStatus] =
    useState<StructureStatusFilter>('all');

  const studentByIdMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const structureByIdMap = useMemo(() => new Map(structures.map((s) => [s.id, s])), [structures]);

  const reportStructuresBeforeCompletionFilter = useMemo(() => {
    return structures.filter((st) => {
      if (selectedTerm !== 'الكل' && st.term !== selectedTerm) return false;
      if (selectedStructureTrack !== 'الكل' && st.track !== selectedStructureTrack) return false;
      if (selectedStructureGrade !== 'الكل' && st.grade !== selectedStructureGrade) return false;
      if (selectedStructureSubject !== 'الكل' && st.subject !== selectedStructureSubject) return false;
      if (selectedStructureYear !== 'الكل' && st.academicYear !== selectedStructureYear) return false;
      return true;
    });
  }, [
    structures,
    selectedTerm,
    selectedStructureTrack,
    selectedStructureGrade,
    selectedStructureSubject,
    selectedStructureYear,
  ]);

  const reportStructureCompletionCounts = useMemo(() => {
    let ongoing = 0;
    let studiedNotExamined = 0;
    let completed = 0;
    reportStructuresBeforeCompletionFilter.forEach((st) => {
      const eff = getEffectiveStructureStatus(st);
      if (eff === 'completed') completed += 1;
      else if (eff === 'studied_not_examined') studiedNotExamined += 1;
      else ongoing += 1;
    });
    return {
      all: reportStructuresBeforeCompletionFilter.length,
      ongoing,
      studiedNotExamined,
      completed,
    };
  }, [reportStructuresBeforeCompletionFilter]);

  const filteredStructuresForReport = useMemo(() => {
    if (selectedStructureCompletionStatus === 'all') return reportStructuresBeforeCompletionFilter;
    return reportStructuresBeforeCompletionFilter.filter(
      (st) => getEffectiveStructureStatus(st) === selectedStructureCompletionStatus
    );
  }, [reportStructuresBeforeCompletionFilter, selectedStructureCompletionStatus]);

  const filteredStructureProgressForReport = useMemo(() => {
    return structureProgress.filter((rec) => {
      if (selectedStructureCompletionStatus !== 'all') {
        const parentStruct = structureByIdMap.get(rec.structureId);
        if (getEffectiveStructureStatus(parentStruct) !== selectedStructureCompletionStatus) {
          return false;
        }
      }
      if (selectedTerm !== 'الكل' && rec.term !== selectedTerm) return false;
      if (selectedStructureFilterId !== 'الكل' && rec.structureId !== selectedStructureFilterId) {
        return false;
      }
      if (selectedStructureTrack !== 'الكل' && rec.track !== selectedStructureTrack) return false;
      if (selectedStructureGrade !== 'الكل' && rec.grade !== selectedStructureGrade) return false;
      if (selectedStructureSubject !== 'الكل' && rec.subject !== selectedStructureSubject) return false;
      if (selectedStructureYear !== 'الكل' && rec.academicYear !== selectedStructureYear) return false;

      const recDate = rec.date || (rec.updatedAt ? rec.updatedAt.split('T')[0] : '');
      if (startDate && recDate && recDate < startDate) return false;
      if (endDate && recDate && recDate > endDate) return false;

      const st = studentByIdMap.get(rec.studentDocId);
      if (st) {
        const eff = getEffectiveEnrollmentStatus(st);
        if (selectedEnrollmentStatus === 'exclude_completed' && eff === 'completed') return false;
        if (selectedEnrollmentStatus === 'active' && eff !== 'active') return false;
        if (
          selectedEnrollmentStatus !== 'الكل' &&
          selectedEnrollmentStatus !== 'exclude_completed' &&
          eff !== selectedEnrollmentStatus
        ) {
          return false;
        }
      }
      return true;
    });
  }, [
    structureProgress,
    structureByIdMap,
    selectedStructureCompletionStatus,
    selectedTerm,
    selectedStructureFilterId,
    selectedStructureTrack,
    selectedStructureGrade,
    selectedStructureSubject,
    selectedStructureYear,
    startDate,
    endDate,
    studentByIdMap,
    selectedEnrollmentStatus,
  ]);

  // Chart data: Per-question accuracy for selected structure (or first matching structure with data)
  const activeChartStructure = useMemo(() => {
    if (selectedStructureFilterId !== 'الكل') {
      return structures.find((s) => s.id === selectedStructureFilterId) || null;
    }
    return (
      filteredStructuresForReport.find((st) =>
        filteredStructureProgressForReport.some((p) => p.structureId === st.id)
      ) ||
      filteredStructuresForReport[0] ||
      null
    );
  }, [
    selectedStructureFilterId,
    structures,
    filteredStructuresForReport,
    filteredStructureProgressForReport,
  ]);

  const structureQuestionChartData = useMemo(() => {
    if (!activeChartStructure) return [];
    const relRaw = filteredStructureProgressForReport.filter(
      (p) => p.structureId === activeChartStructure.id
    );
    const latestByStudent = new Map<string, StudentStructureProgress>();
    relRaw.forEach((p) => {
      const prev = latestByStudent.get(p.studentDocId);
      if (!prev || (p.attemptNumber || 1) >= (prev.attemptNumber || 1)) {
        latestByStudent.set(p.studentDocId, p);
      }
    });
    const relRecords = Array.from(latestByStudent.values());
    const totalQ = Math.max(
      1,
      activeChartStructure.totalQuestions || activeChartStructure.questions?.length || 1
    );
    const rows: Array<{
      name: string;
      avgAccuracy: number;
      solvedCount: number;
      fill: string;
    }> = [];
    for (let q = 1; q <= totalQ; q++) {
      const solvedEntries = relRecords
        .map((p) => (p.questionScores || []).find((qs) => qs.questionNumber === q))
        .filter((qs): qs is NonNullable<typeof qs> => Boolean(qs && qs.solved));
      const avg =
        solvedEntries.length > 0
          ? Math.round(
              solvedEntries.reduce((acc, item) => acc + (Number(item.accuracyPercentage) || 0), 0) /
                solvedEntries.length
            )
          : 0;
      const fill = avg >= 80 ? '#10b981' : avg >= 60 ? '#f59e0b' : '#ef4444';
      rows.push({
        name: `${tr('س', 'Q')}${q}`,
        avgAccuracy: avg,
        solvedCount: solvedEntries.length,
        fill,
      });
    }
    return rows;
  }, [activeChartStructure, filteredStructureProgressForReport, lang]);

  const currentStudentStructures = useMemo(() => {
    if (!currentStudent) return [];
    return structureProgress.filter((rec) => {
      if (rec.studentDocId !== currentStudent.id) return false;
      if (selectedTerm !== 'الكل' && rec.term && rec.term !== selectedTerm) return false;
      return true;
    });
  }, [structureProgress, currentStudent, selectedTerm]);

  return (
    <div id="reports-view" dir={dir} className="space-y-6 text-start">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-amber-500" />
            {tr('التقارير الأكاديمية وسجلات الدرجات', 'Academic Reports & Grade Records')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {tr(
              'تقارير تفصيلية لكل طالب مع استخراج وتصدير ملفات Excel مخصصة حسب الصف أو المادة أو الفترة الزمنية',
              'Detailed per-student reports with custom Excel exports by grade, subject, or date range'
            )}
          </p>
        </div>

        {/* Global Export Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowHonorBoardModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-black text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl transition-all cursor-pointer shadow-md shadow-amber-500/20 active:scale-98"
          >
            <Award className="w-4 h-4 text-slate-950" />
            <span>{tr('تصدير لوحة الشرف 📸', 'Export Honor Board 📸')}</span>
          </button>

          <button
            onClick={() => setShowExportModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-xl transition-all cursor-pointer shadow-md shadow-amber-500/20 active:scale-98"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {tr('تصدير Excel مخصص (صف / مادة / فترة)', 'Custom Excel Export (Grade / Subject / Period)')}
          </button>

          <button
            onClick={() =>
              exportAllDataExcel(filteredStudents, filteredExams, dateFilteredResults, settings, {
                ...getExportOptions(),
                studentIds:
                  selectedExportStudentIds.length > 0 ? selectedExportStudentIds : undefined,
              })
            }
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            {selectedExportStudentIds.length > 0
              ? tr(`تصدير المحددين (${selectedExportStudentIds.length} طالب)`, `Export Selected (${selectedExportStudentIds.length})`)
              : tr(`تصدير الكل (${filteredStudents.length} طالب)`, `Export All (${filteredStudents.length})`)}
          </button>

          {/* Quick Logo Toggle for Reports */}
          <button
            type="button"
            onClick={handleToggleReportLogo}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
              showReportLogo
                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40 hover:bg-amber-500/25'
                : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
            title={tr('إمكانية إضافة أو عدم إضافة شعار الهوية (اللوجو) في التقارير المصدرة', 'Toggle brand logo inclusion in exported reports')}
          >
            <span>
              {showReportLogo
                ? tr('🖼️ اللوجو مفعّل بالتقارير ✔', '🖼️ Report Logo Enabled ✔')
                : tr('🖼️ التقارير بدون لوجو', '🖼️ Reports Without Logo')}
            </span>
          </button>
        </div>
      </div>

      {/* Quick Excel Layout & Chart Bar */}
      <div className="bg-slate-50 dark:bg-slate-900/80 px-4 py-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>{tr('إعدادات تصدير شيت Excel السريعة:', 'Quick Excel Export Settings:')}</span>
          </span>
          <div className="flex items-center bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setExcelLayoutMode('mobile')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                excelLayoutMode === 'mobile'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>{tr('وضع الهاتف', 'Mobile Layout')}</span>
            </button>
            <button
              type="button"
              onClick={() => setExcelLayoutMode('desktop')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                excelLayoutMode === 'desktop'
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>{tr('شاشة كاملة', 'Desktop Layout')}</span>
            </button>
          </div>
          <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={excelIncludeChart}
              onChange={(e) => setExcelIncludeChart(e.target.checked)}
              className="w-3.5 h-3.5 accent-emerald-600 rounded cursor-pointer"
            />
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
              {tr('إدراج الرسم البياني للدرجات داخل الشيت', 'Include grades chart in Excel sheet')}
            </span>
          </label>
          <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={showReportLogo}
              onChange={() => handleToggleReportLogo()}
              className="w-3.5 h-3.5 accent-amber-500 rounded cursor-pointer"
            />
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
              {tr('إظهار شعار الهوية (اللوجو)', 'Show Brand Logo')}
            </span>
          </label>
        </div>

        <button
          type="button"
          onClick={handleResetReportActivity}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{tr('البدء من جديد في التقارير', 'Reset Reports View')}</span>
        </button>
      </div>

      {/* Report Type Tabs & Filters Container */}
      <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4">
        <div className="flex sm:flex-wrap items-center gap-2 overflow-x-auto no-scrollbar border-b border-slate-100 dark:border-slate-800 pb-3 -mx-1 px-1">
          <button
            onClick={() => setReportType('single_student')}
            className={`shrink-0 whitespace-nowrap px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              reportType === 'single_student'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80'
            }`}
          >
            {tr('تقرير طالب مخصص', 'Student Report')}
          </button>
          <button
            onClick={() => setReportType('all_students')}
            className={`shrink-0 whitespace-nowrap px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              reportType === 'all_students'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80'
            }`}
          >
            {tr('تقرير جميع الطلاب', 'All Students Report')}
          </button>
          <button
            onClick={() => setReportType('single_exam')}
            className={`shrink-0 whitespace-nowrap px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              reportType === 'single_exam'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80'
            }`}
          >
            {tr('تقرير امتحان معين', 'Single Exam Report')}
          </button>
          <button
            onClick={() => setReportType('by_grade')}
            className={`shrink-0 whitespace-nowrap px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              reportType === 'by_grade'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80'
            }`}
          >
            {tr('تقرير حسب الصف الدراسي', 'By Grade Report')}
          </button>
          <button
            onClick={() => setReportType('by_group')}
            className={`shrink-0 whitespace-nowrap px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              reportType === 'by_group'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80'
            }`}
          >
            {tr('تقرير حسب الشعبة', 'By Group Report')}
          </button>
          <button
            onClick={() => setReportType('completed_course')}
            className={`shrink-0 whitespace-nowrap px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              reportType === 'completed_course'
                ? 'bg-sky-500 text-white font-black shadow-md shadow-sky-500/20'
                : 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60 hover:bg-sky-100'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>
              {tr('قائمة منتهي الكورس', 'Course Completed')} ({students.filter(s => getEffectiveEnrollmentStatus(s) === 'completed').length})
            </span>
          </button>
          <button
            onClick={() => setReportType('exam_comparison')}
            className={`shrink-0 whitespace-nowrap px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              reportType === 'exam_comparison'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80'
            }`}
          >
            {tr('مقارنة امتحانات', 'Compare Exams')}
          </button>
          <button
            id="btn-report-tab-structures"
            onClick={() => setReportType('structures')}
            className={`shrink-0 whitespace-nowrap px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              reportType === 'structures'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                : 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/40'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{tr('تقرير قسم الهياكل', 'Structures Report')} ({structures.length})</span>
          </button>
        </div>

        {/* Filters bar: Term, File Status, Date Range & Selectors */}
        <div className="space-y-3 pt-1">
          {/* Top row: Term selector and Student File Status selector */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              {/* Term Filter */}
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-700 dark:text-slate-300">{tr('الفصل الدراسي (الترم):', 'Academic Term:')}</span>
                <select
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-slate-900 dark:text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  <option value="الكل">{tr('كافة الفصول الثلاثة', 'All 3 Terms')}</option>
                  {ACADEMIC_TERMS.map((t) => (
                    <option key={t} value={t}>{translateTerm(t, lang)}</option>
                  ))}
                </select>
              </div>

              {/* Student File Status Filter */}
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-700 dark:text-slate-300">{tr('حالة ملف الطالب:', 'Student File Status:')}</span>
                <select
                  value={selectedEnrollmentStatus}
                  onChange={(e) => setSelectedEnrollmentStatus(e.target.value)}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-slate-900 dark:text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  <option value="exclude_completed">{tr('🚫 استبعاد منتهي الملف (الفعال فقط) [موصى به]', '🚫 Exclude Completed (Active Only) [Recommended]')}</option>
                  <option value="active">{tr('🟢 ملف فعال (مستمر بالكورس فقط)', '🟢 Active File (Enrolled Only)')}</option>
                  <option value="completed">{tr('🎓 منتهي الكورس فقط (الخريجون)', '🎓 Course Completed Only')}</option>
                  <option value="paused">{tr('🟡 متوقف مؤقتاً / مؤجل', '🟡 Paused / On Hold')}</option>
                  <option value="withdrawn">{tr('🔴 منقطع عن الكورس', '🔴 Withdrawn')}</option>
                  <option value="الكل">{tr('🌐 كافة الطلاب (يشمل منتهي الملف)', '🌐 All Students (Includes Completed)')}</option>
                </select>
              </div>
            </div>

            {/* Quick chips & stats summary */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => setSelectedEnrollmentStatus(selectedEnrollmentStatus === 'exclude_completed' ? 'الكل' : 'exclude_completed')}
                className={`px-2.5 py-1 rounded-xl font-bold border transition cursor-pointer ${
                  selectedEnrollmentStatus === 'exclude_completed'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-emerald-600 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50'
                }`}
                title={tr('منع تصدير وعرض تقارير للطلبة منتهي الملف', 'Exclude completed-file students from reports & exports')}
              >
                {tr('🚫 استبعاد منتهي الملف', '🚫 Exclude Completed')}
              </button>
              <button
                type="button"
                onClick={() => setSelectedTerm(selectedTerm === 'الفصل الأول' ? 'الكل' : 'الفصل الأول')}
                className={`px-2 py-1 rounded-xl font-bold border transition cursor-pointer ${
                  selectedTerm === 'الفصل الأول'
                    ? 'bg-amber-500 text-slate-950 border-amber-600'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                {translateTerm('الفصل الأول', lang)}
              </button>
              <button
                type="button"
                onClick={() => setSelectedTerm(selectedTerm === 'الفصل الثاني' ? 'الكل' : 'الفصل الثاني')}
                className={`px-2 py-1 rounded-xl font-bold border transition cursor-pointer ${
                  selectedTerm === 'الفصل الثاني'
                    ? 'bg-amber-500 text-slate-950 border-amber-600'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                {translateTerm('الفصل الثاني', lang)}
              </button>
              <button
                type="button"
                onClick={() => setSelectedTerm(selectedTerm === 'الفصل الثالث' ? 'الكل' : 'الفصل الثالث')}
                className={`px-2 py-1 rounded-xl font-bold border transition cursor-pointer ${
                  selectedTerm === 'الفصل الثالث'
                    ? 'bg-amber-500 text-slate-950 border-amber-600'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                {translateTerm('الفصل الثالث', lang)}
              </button>
              <span className="text-slate-400 font-mono text-[10px] me-1">
                ({filteredStudents.length} {tr('طالب مشمول', 'included')})
              </span>
            </div>
          </div>

          {/* Bottom row: Date range & Context selector */}
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-bold">
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                <span>{tr('فترة التقرير:', 'Report Period:')}</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs"
                  placeholder={tr('من', 'From')}
                />
                <span className="text-slate-400">{tr('إلى', 'to')}</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs"
                  placeholder={tr('إلى', 'To')}
                />
                {(startDate || endDate) && (
                  <button
                    onClick={() => { setStartDate(''); setEndDate(''); }}
                    className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline cursor-pointer font-bold"
                  >
                    {tr('إعادة ضبط', 'Reset')}
                  </button>
                )}
              </div>
            </div>

            {/* Conditional dropdown based on report type */}
            {reportType === 'single_student' && (
              <div className="flex items-center gap-2">
                <span className="text-slate-600 dark:text-slate-300 font-bold">{tr('اختر الطالب:', 'Select Student:')}</span>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-medium cursor-pointer max-w-xs"
                >
                  {filteredStudents.length === 0 ? (
                    <option value="">{tr('لا يوجد طلاب يطابقون الفلاتر', 'No students match filters')}</option>
                  ) : (
                    filteredStudents.map(s => {
                      const stMeta = ENROLLMENT_STATUS_META[getEffectiveEnrollmentStatus(s)];
                      return (
                        <option key={s.id} value={s.id}>
                          {s.name} ({translateGrade(s.grade, lang)}{s.term ? ` - ${translateTerm(s.term, lang)}` : ''} - {lang === 'en' ? stMeta?.shortLabelEn || 'Active' : stMeta?.shortLabel || 'فعال'})
                        </option>
                      );
                    })
                  )}
                </select>
              </div>
            )}

            {reportType === 'single_exam' && (
              <div className="flex items-center gap-2">
                <span className="text-slate-600 dark:text-slate-300 font-bold">{tr('اختر الامتحان:', 'Select Exam:')}</span>
                <select
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-medium cursor-pointer max-w-xs"
                >
                  {filteredExams.length === 0 ? (
                    <option value="">{tr('لا توجد امتحانات في هذا الفصل', 'No exams in this term')}</option>
                  ) : (
                    filteredExams.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.title} ({e.date}{e.term ? ` - ${translateTerm(e.term, lang)}` : ''})
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}

            {reportType === 'by_grade' && (
              <div className="flex items-center gap-2">
                <span className="text-slate-600 dark:text-slate-300 font-bold">{tr('اختر الصف:', 'Select Grade:')}</span>
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-medium cursor-pointer"
                >
                  {(settings?.grades || []).map(g => (
                    <option key={g} value={g}>{translateGrade(g, lang)}</option>
                  ))}
                </select>
              </div>
            )}

            {reportType === 'by_group' && (
              <div className="flex items-center gap-2">
                <span className="text-slate-600 dark:text-slate-300 font-bold">{tr('اختر الشعبة:', 'Select Group:')}</span>
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-medium cursor-pointer"
                >
                  {(settings?.groups || []).map(grp => (
                    <option key={grp} value={grp}>{grp}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* REPORT CONTENT SECTIONS */}

      {/* 1. Single Student Report (Strictly: Student Name, Grade, and Exam Specifications) */}
      {reportType === 'single_student' && currentStudent && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-6">

          {/* Header Card: Strictly Student Name & Grade with Optional Logo */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3.5">
              {showReportLogo && (
                <div className="w-16 h-12 rounded-xl overflow-hidden border border-amber-500/30 shadow-xs shrink-0 bg-black/30">
                  <img
                    src={`${import.meta.env.BASE_URL}teacher-logo.jpg`}
                    alt={tr('شعار الهوية', 'Brand Logo')}
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (!target.src.endsWith('/teacher-logo.jpg')) {
                        target.src = '/teacher-logo.jpg';
                      }
                    }}
                  />
                </div>
              )}
              <div>
                <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider block mb-1">
                  {tr('تقرير الطالب الأكاديمي', 'Student Academic Report')}
                </span>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                  {currentStudent.name}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {tr('الصف الدراسي:', 'Grade:')} <strong className="text-slate-800 dark:text-slate-200">{translateGrade(currentStudent.grade, lang)}</strong>
                  {currentStudent.subject && <span> • {tr('المادة:', 'Subject:')} <strong className="text-slate-800 dark:text-slate-200">{translateSubject(currentStudent.subject, lang)}</strong></span>}
                  {currentStudent.group && <span> • {tr('الشعبة:', 'Group:')} <strong className="text-slate-800 dark:text-slate-200">{currentStudent.group}</strong></span>}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setAcademicModalStudent(currentStudent)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer"
              >
                <Eye className="w-4 h-4 text-amber-500" />
                {tr('عرض التقرير الكامل والطباعة', 'View Full Report & Print')}
              </button>

              <button
                onClick={() => exportSingleStudentAcademicReport(currentStudent, currentStudentResults, currentStudentStats, getExportOptions())}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 rounded-xl transition-all cursor-pointer shadow-xs"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                {tr('تصدير التقرير لـ Excel (مع الرسم البياني)', 'Export Report to Excel (with Chart)')}
              </button>
            </div>
          </div>

          {/* Quick Stats: Total Exams, Average, Pass Rate, Status */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-center">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">{tr('عدد الامتحانات', 'Total Exams')}</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">{currentStudentStats.totalExams}</span>
            </div>

            <div className="p-3.5 bg-amber-500/10 dark:bg-amber-500/15 rounded-2xl border border-amber-500/20 text-center">
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 block mb-1">{tr('المتوسط العام', 'Overall Average')}</span>
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">{currentStudentStats.averagePercentage}%</span>
            </div>

            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 text-center">
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 block mb-1">{tr('نسبة النجاح', 'Pass Rate')}</span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{currentStudentStats.passRate}%</span>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-center">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">{tr('التقييم العام', 'Overall Rating')}</span>
              <span className="text-base font-black text-slate-900 dark:text-white block mt-1">
                {currentStudentStats.status === 'ممتاز'
                  ? tr('ممتاز', 'Excellent')
                  : currentStudentStats.status === 'جيد'
                  ? tr('جيد', 'Good')
                  : currentStudentStats.status === 'يحتاج متابعة'
                  ? tr('يحتاج متابعة', 'Needs Follow-up')
                  : currentStudentStats.status}
              </span>
            </div>
          </div>

          {/* Progress Notes */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            <div className="flex items-center gap-2 mb-1 font-bold text-slate-900 dark:text-white text-sm">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              <span>{tr('ملاحظات التقدم ومسار التطور:', 'Progress & Trend Notes:')}</span>
            </div>
            <p className="font-medium text-slate-600 dark:text-slate-300">
              {currentStudentStats.trendMessage}
            </p>
          </div>

          {/* Interactive Dynamic Chart Switcher for Single Student */}
          {currentStudentResults.length > 0 && (
            <DynamicGradesChart
              mode="student_timeline"
              results={currentStudentResults}
              title={tr(`الرسم البياني لدرجات الطالب: ${currentStudent.name}`, `Grades Chart for Student: ${currentStudent.name}`)}
              subtitle={tr(
                'يمكنك التبديل بين الأعمدة، الدائرة، المساحة، المنحنى، أو الرادار (يتم حفظ اختيارك تلقائياً)',
                'Switch between bar, pie, area, line, or radar charts (preference saved automatically)'
              )}
              storageKey="REPORTS_SINGLE_STUDENT"
              height={260}
            />
          )}

          {/* Exam Results Table (Score of each exam individually) */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>{tr(`درجة كل امتحان على حدة (${currentStudentResults.length} امتحان)`, `Individual Exam Scores (${currentStudentResults.length} exams)`)}</span>
            </h4>

            {currentStudentResults.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 text-xs">
                {tr('لا توجد امتحانات مسجلة لهذا الطالب خلال الفترة المحددة', 'No exams recorded for this student in the selected period')}
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-700/80 rounded-2xl">
                <table className="w-full text-start text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-3 px-3.5">{tr('اسم الامتحان', 'Exam Title')}</th>
                      <th className="py-3 px-3 text-center">{tr('التاريخ', 'Date')}</th>
                      <th className="py-3 px-3 text-center">{tr('الدرجة', 'Score')}</th>
                      <th className="py-3 px-3 text-center">{tr('النسبة', 'Percentage')}</th>
                      <th className="py-3 px-3 text-center">{tr('التقدير', 'Rating')}</th>
                      <th className="py-3 px-3 text-center">{tr('النتيجة', 'Result')}</th>
                      <th className="py-3 px-3 text-center">{tr('إثبات ومرفق', 'Attachment')}</th>
                      <th className="py-3 px-3.5">{tr('ملاحظات الامتحان', 'Notes')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {currentStudentResults.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-3.5 font-bold text-slate-900 dark:text-white">{r.examTitle}</td>
                        <td className="py-3 px-3 text-center text-slate-500 dark:text-slate-400 font-mono text-[11px]">{r.examDate}</td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-800 dark:text-slate-100">
                          {r.score} <span className="text-slate-400 dark:text-slate-500 font-normal">/ {r.totalScore}</span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-amber-600 dark:text-amber-400">{r.percentage}%</td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {r.gradeRating}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.passed
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50'
                              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50'
                          }`}>
                            {r.passed ? tr('ناجح', 'Passed') : tr('راسب', 'Failed')}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center">
                            <AttachmentThumbnail
                              attachment={r.attachment}
                              size="sm"
                              readOnly={true}
                              tooltipPrefix={`${tr('امتحان:', 'Exam:')} ${r.examTitle}`}
                              onClick={() => setPreviewAttachmentResult(r)}
                            />
                          </div>
                        </td>
                        <td className="py-3 px-3.5 text-slate-500 dark:text-slate-400 text-[11px]">{r.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Student Structures (الهياكل) Progress inside Single Student Report */}
          {currentStudentStructures.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-500" />
                  <span>{tr(`سجل الطالب في قسم الهياكل (${currentStudentStructures.length} هيكل)`, `Student Structures Record (${currentStudentStructures.length})`)}</span>
                </h4>
                <button
                  type="button"
                  onClick={() =>
                    exportSingleStudentStructuresReport(
                      currentStudent,
                      currentStudentStructures,
                      structures,
                      getExportOptions()
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 rounded-xl transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{tr('تصدير هياكل الطالب (Excel بنفس تنسيق التقرير)', 'Export Student Structures (Excel)')}</span>
                </button>
              </div>
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-700/80 rounded-2xl">
                <table className="w-full text-start text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3">{tr('الهيكل', 'Structure')}</th>
                      <th className="py-2.5 px-3">{tr('الصف / الفصل / المسار / السنة / المادة', 'Grade / Term / Track / Year / Subject')}</th>
                      <th className="py-2.5 px-3 text-center">{tr('الأسئلة المحلولة', 'Solved Questions')}</th>
                      <th className="py-2.5 px-3 text-center">{tr('متوسط الصحة %', 'Avg Accuracy %')}</th>
                      <th className="py-2.5 px-3">{tr('نسبة صحة كل سؤال', 'Per-Question Accuracy')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {currentStudentStructures.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-2.5 px-3 font-extrabold text-slate-900 dark:text-white">
                          {rec.structureTitle}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-600 dark:text-slate-300">
                          {translateGrade(rec.grade, lang)} • {translateTerm(rec.term, lang)} • {translateTrack(rec.track, lang)} • {rec.academicYear} • {translateSubject(rec.subject, lang)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                          {rec.solvedCount} / {rec.totalQuestions} ({rec.completionPercentage}%)
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-black text-emerald-600 dark:text-emerald-400">
                          {rec.overallAccuracyPercentage}%
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex flex-wrap gap-1 font-mono tabular-nums">
                            {(rec.questionScores || []).map((qs) => (
                              <span
                                key={qs.questionNumber}
                                className={`px-1.5 py-0.5 rounded text-[10px] border ${
                                  !qs.solved
                                    ? 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                                    : qs.accuracyPercentage >= 80
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                    : qs.accuracyPercentage >= 50
                                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                                }`}
                              >
                                {tr('س', 'Q')}{qs.questionNumber}: {qs.solved ? `${qs.accuracyPercentage}%` : '—'}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. All Students Report */}
      {reportType === 'all_students' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">{tr('تقرير أداء الطلاب المشمولين بالفلاتر', 'Filtered Students Performance Report')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {tr('إجمالي الطلاب المعروضين:', 'Total Displayed Students:')} {filteredStudents.length} ({tr('الفصل:', 'Term:')} {translateTerm(selectedTerm, lang)} | {tr('الحالة:', 'Status:')} {selectedEnrollmentStatus === 'exclude_completed' ? tr('استبعاد منتهي الملف', 'Exclude Completed') : selectedEnrollmentStatus === 'الكل' ? tr('الكل', 'All') : (ENROLLMENT_STATUS_META[selectedEnrollmentStatus as keyof typeof ENROLLMENT_STATUS_META] ? (lang === 'en' ? ENROLLMENT_STATUS_META[selectedEnrollmentStatus as keyof typeof ENROLLMENT_STATUS_META].shortLabelEn : ENROLLMENT_STATUS_META[selectedEnrollmentStatus as keyof typeof ENROLLMENT_STATUS_META].shortLabel) : selectedEnrollmentStatus)})
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() =>
                  exportCustomAcademicExcel(
                    students,
                    exams,
                    allResults,
                    {
                      ...getExportOptions(),
                      term: selectedTerm,
                      enrollmentStatus: selectedEnrollmentStatus,
                      startDate: startDate || undefined,
                      endDate: endDate || undefined,
                      studentIds:
                        selectedExportStudentIds.length > 0 ? selectedExportStudentIds : undefined,
                    },
                    settings.gradingScale
                  )
                }
                disabled={filteredStudents.length === 0}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                {selectedExportStudentIds.length > 0
                  ? tr(`تصدير المحددين Excel (${selectedExportStudentIds.length})`, `Export Selected Excel (${selectedExportStudentIds.length})`)
                  : tr(`تصدير جميع الظاهرين Excel (${filteredStudents.length})`, `Export All Visible Excel (${filteredStudents.length})`)}
              </button>

              <button
                onClick={() => setShowExportModal(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer"
              >
                <Filter className="w-3.5 h-3.5 text-amber-500" />
                <span>{tr('تصدير مخصص / عدد معين', 'Custom / Count Export')}</span>
              </button>
            </div>
          </div>

          {/* Multi-Selection Toolbar for Export */}
          {filteredStudents.length > 0 && (
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 me-1">
                  <Users className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{tr('تحديد للتصدير:', 'Select for Export:')}</span>
                </span>
                <button
                  type="button"
                  onClick={() => selectAllExportStudents(filteredStudents)}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-[11px] hover:border-emerald-500 cursor-pointer"
                >
                  {tr(`تحديد الكل (${filteredStudents.length})`, `Select All (${filteredStudents.length})`)}
                </button>
                <div className="inline-flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-1.5 py-0.5">
                  <Hash className="w-3 h-3 text-slate-400" />
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">{tr('عدد:', 'Count:')}</span>
                  <input
                    type="number"
                    min={1}
                    max={Math.max(1, filteredStudents.length)}
                    value={studentQuickCountInput}
                    onChange={(e) => setStudentQuickCountInput(Math.max(1, Number(e.target.value) || 1))}
                    className="w-12 text-center font-mono font-bold text-[11px] bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => selectCountExportStudents(filteredStudents, studentQuickCountInput)}
                    className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] cursor-pointer"
                  >
                    {tr('تحديد', 'Select')}
                  </button>
                </div>
                {selectedExportStudentIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedExportStudentIds([])}
                    className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold text-[11px] cursor-pointer"
                  >
                    {tr(`إلغاء التحديد (${selectedExportStudentIds.length})`, `Clear Selection (${selectedExportStudentIds.length})`)}
                  </button>
                )}
              </div>
              <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
                {tr('المحدد للتصدير:', 'Selected for Export:')} <strong className="text-emerald-600 dark:text-emerald-400">{selectedExportStudentIds.length}</strong>
              </span>
            </div>
          )}

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-700/80 rounded-2xl">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-2.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredStudents.length > 0 &&
                        filteredStudents.every((s) => selectedExportStudentIds.includes(s.id))
                      }
                      onChange={(e) =>
                        e.target.checked
                          ? selectAllExportStudents(filteredStudents)
                          : setSelectedExportStudentIds([])
                      }
                      className="w-4 h-4 rounded accent-emerald-600 cursor-pointer"
                      title={tr('تحديد / إلغاء تحديد الكل', 'Select / Deselect All')}
                    />
                  </th>
                  <th className="py-3 px-3 w-10 text-center">#</th>
                  <th className="py-3 px-3">{tr('اسم الطالب', 'Student Name')}</th>
                  <th className="py-3 px-3">{tr('الصف', 'Grade')}</th>
                  <th className="py-3 px-3">{tr('المجموعة', 'Group')}</th>
                  <th className="py-3 px-3">{tr('حالة الملف', 'File Status')}</th>
                  <th className="py-3 px-3 text-center">{tr('الامتحانات', 'Exams')}</th>
                  <th className="py-3 px-3 text-center">{tr('المتوسط %', 'Avg %')}</th>
                  <th className="py-3 px-3 text-center">{tr('أعلى %', 'High %')}</th>
                  <th className="py-3 px-3 text-center">{tr('نسبة النجاح', 'Pass Rate')}</th>
                  <th className="py-3 px-3 text-center">{tr('التقييم', 'Rating')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-slate-400 text-xs">
                      {tr(
                        'لا يوجد طلاب يطابقون الفلاتر المحددة (يمكنك تغيير الفصل الدراسي أو حالة الملف)',
                        'No students match the selected filters (try changing the term or file status)'
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((st, i) => {
                    const res = dateFilteredResults.filter(r => r.studentDocId === st.id);
                    const stStats = calculateStudentStats(res, settings.gradingScale);
                    const stMeta = ENROLLMENT_STATUS_META[getEffectiveEnrollmentStatus(st)];
                    const isChecked = selectedExportStudentIds.includes(st.id);
                    return (
                      <tr
                        key={st.id}
                        onClick={() => onOpenStudentProfile(st)}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${
                          isChecked ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''
                        }`}
                      >
                        <td
                          className="py-2.5 px-2.5 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleExportStudentId(st.id)}
                            className="w-4 h-4 rounded accent-emerald-600 cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">{i + 1}</td>
                        <td className="py-2.5 px-3 font-extrabold text-slate-900 dark:text-slate-50">{st.name}</td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{translateGrade(st.grade, lang)}</td>
                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{st.group}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${stMeta?.badgeBg} ${stMeta?.badgeText} ${stMeta?.badgeBorder}`}>
                            {lang === 'en' ? stMeta?.shortLabelEn || 'Active' : stMeta?.shortLabel || 'فعال'}
                          </span>
                        </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-700 dark:text-slate-200">{stStats.totalExams}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-600 dark:text-amber-400">{stStats.averagePercentage}%</td>
                      <td className="py-2.5 px-3 text-center font-mono text-emerald-600 dark:text-emerald-400">{stStats.highestPercentage}%</td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-700 dark:text-slate-200">{stStats.passRate}%</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          stStats.status === 'ممتاز' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' :
                          stStats.status === 'جيد' ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' :
                          'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                        }`}>
                          {stStats.status === 'ممتاز'
                            ? tr('ممتاز', 'Excellent')
                            : stStats.status === 'جيد'
                            ? tr('جيد', 'Good')
                            : stStats.status === 'يحتاج متابعة'
                            ? tr('يحتاج متابعة', 'Needs Follow-up')
                            : stStats.status}
                        </span>
                      </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Single Exam Report */}
      {reportType === 'single_exam' && currentExam && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                {tr('تقرير نتائج امتحان:', 'Exam Results Report:')} {currentExam.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {tr('التاريخ:', 'Date:')} {currentExam.date} | {tr('الدرجة الكلية:', 'Total Score:')} {currentExam.totalScore} | {tr('درجة النجاح:', 'Pass Score:')} {currentExam.passScore} | {tr('إجمالي الطلاب المتقدمين:', 'Total Attendees:')} {currentExamResults.length}
              </p>
            </div>
            <button
              onClick={() =>
                exportExamResultsExcel(currentExam, currentExamResults, students, {
                  ...getExportOptions(),
                  studentIds:
                    selectedExportStudentIds.length > 0 ? selectedExportStudentIds : undefined,
                })
              }
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 rounded-xl transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              {selectedExportStudentIds.length > 0
                ? tr(
                    `تصدير نتائج المحددين Excel (${
                      currentExamResults.filter((r) =>
                        selectedExportStudentIds.includes(r.studentDocId)
                      ).length
                    })`,
                    `Export Selected Excel (${
                      currentExamResults.filter((r) =>
                        selectedExportStudentIds.includes(r.studentDocId)
                      ).length
                    })`
                  )
                : tr('تصدير نتائج الامتحان إلى Excel (مع الرسم البياني)', 'Export Exam Results to Excel (with Chart)')}
            </button>
          </div>

          {/* Dynamic Multi-Shape Grade Distribution Chart */}
          {currentExamResults.length > 0 && (
            <DynamicGradesChart
              mode="distribution"
              distributionData={examRatingDistribution.map(b => ({
                label: b.label,
                value: b.count,
                color: b.color,
              }))}
              title={tr(`الرسم البياني التفاعلي لتوزيع تقديرات الامتحان (${currentExam.title})`, `Interactive Exam Ratings Distribution (${currentExam.title})`)}
              subtitle={tr('بدّل شكل الرسم البياني بين أعمدة أو دائرة أو أفقي أو مساحة أو خطي أو رادار', 'Switch chart style between bar, pie, horizontal, area, line, or radar')}
              storageKey="REPORTS_EXAM_DISTRIBUTION"
              height={270}
            />
          )}

          {/* Recharts Visual Grade Distribution Section */}
          {currentExamResults.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-500" />
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  {tr('توزيع درجات الطلاب ونسب النجاح بصرياً (Recharts)', 'Visual Score & Pass Rate Distribution (Recharts)')}
                </h4>
              </div>

              {/* Visual Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* 1. Bar Chart: Rating Distribution (A+, A, B, C, D, F) */}
                <div className="lg:col-span-7 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {tr('توزيع الطلاب حسب التقدير الأكاديمي', 'Students by Academic Rating')}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {tr('إجمالي:', 'Total:')} {currentExamResults.length} {tr('طالب', 'students')}
                    </span>
                  </div>

                  <div className="h-64 w-full" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={examRatingDistribution}
                        margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 11, fill: '#64748b' }}
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
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderRadius: '12px',
                            border: 'none',
                            color: '#fff',
                            fontSize: '12px',
                            direction: dir,
                            textAlign: isRtl ? 'right' : 'left'
                          }}
                          formatter={(value: any) => [`${value} ${tr('طالب', 'students')}`, tr('العدد', 'Count')]}
                          labelFormatter={(label) => `${tr('التقدير:', 'Rating:')} ${label}`}
                        />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                          {examRatingDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 2. Pie Chart & Score Bands breakdown */}
                <div className="lg:col-span-5 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <PieChartIcon className="w-3.5 h-3.5 text-amber-500" />
                      {tr('نسبة النجاح ونطاقات الدرجات', 'Pass Rate & Score Bands')}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      {tr('نجاح', 'Pass')} {Math.round((currentExamResults.filter(r => r.passed).length / currentExamResults.length) * 100)}%
                    </span>
                  </div>

                  <div className="h-44 w-full" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={examPassFailDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {examPassFailDistribution.map((entry, index) => (
                            <Cell key={`pie-cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderRadius: '12px',
                            border: 'none',
                            color: '#fff',
                            fontSize: '12px',
                            direction: dir,
                            textAlign: isRtl ? 'right' : 'left'
                          }}
                          formatter={(value: any, name: any) => [`${value} ${tr('طالب', 'students')} (${Math.round((Number(value) / currentExamResults.length) * 100)}%)`, name]}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={30}
                          formatter={(value) => <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 me-2">{value}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Percentage bands summary bar */}
                  <div className="pt-2 border-t border-slate-200/70 dark:border-slate-700/60 space-y-1.5 mt-1">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                      {tr('توزيع الشرائح المئوية:', 'Score Band Breakdown:')}
                    </span>
                    <div className="grid grid-cols-5 gap-1 text-center">
                      {examScoreBands.map((band, i) => (
                        <div key={i} className="p-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60">
                          <div className="text-[10px] text-slate-400 font-medium truncate">{band.range}</div>
                          <div className="text-xs font-mono font-black" style={{ color: band.color }}>
                            {band.count}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              {tr('لا توجد درجات مرصودة لهذا الامتحان بعد لإظهار الرسم البياني.', 'No scores recorded for this exam yet to display charts.')}
            </div>
          )}

          {currentExamResults.length > 0 && (
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 me-1">
                  <Users className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{tr('تحديد طلاب للتصدير:', 'Select Students for Export:')}</span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedExportStudentIds(
                      Array.from(new Set(currentExamResults.map((r) => r.studentDocId)))
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-[11px] hover:border-emerald-500 cursor-pointer"
                >
                  {tr(`تحديد الكل (${currentExamResults.length})`, `Select All (${currentExamResults.length})`)}
                </button>
                <div className="inline-flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-1.5 py-0.5">
                  <Hash className="w-3 h-3 text-slate-400" />
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">{tr('عدد:', 'Count:')}</span>
                  <input
                    type="number"
                    min={1}
                    max={Math.max(1, currentExamResults.length)}
                    value={studentQuickCountInput}
                    onChange={(e) => setStudentQuickCountInput(Math.max(1, Number(e.target.value) || 1))}
                    className="w-12 text-center font-mono font-bold text-[11px] bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedExportStudentIds(
                        Array.from(
                          new Set(
                            currentExamResults
                              .slice(0, Math.max(1, studentQuickCountInput))
                              .map((r) => r.studentDocId)
                          )
                        )
                      )
                    }
                    className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] cursor-pointer"
                  >
                    {tr('تحديد', 'Select')}
                  </button>
                </div>
                {selectedExportStudentIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedExportStudentIds([])}
                    className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold text-[11px] cursor-pointer"
                  >
                    {tr(`إلغاء التحديد (${selectedExportStudentIds.length})`, `Clear Selection (${selectedExportStudentIds.length})`)}
                  </button>
                )}
              </div>
              <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
                {tr('المحدد:', 'Selected:')} <strong className="text-emerald-600 dark:text-emerald-400">{selectedExportStudentIds.length}</strong>
              </span>
            </div>
          )}

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-700/80 rounded-2xl">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-2.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        currentExamResults.length > 0 &&
                        currentExamResults.every((r) =>
                          selectedExportStudentIds.includes(r.studentDocId)
                        )
                      }
                      onChange={(e) =>
                        e.target.checked
                          ? setSelectedExportStudentIds(
                              Array.from(new Set(currentExamResults.map((r) => r.studentDocId)))
                            )
                          : setSelectedExportStudentIds([])
                      }
                      className="w-4 h-4 rounded accent-emerald-600 cursor-pointer"
                    />
                  </th>
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">{tr('اسم الطالب', 'Student Name')}</th>
                  <th className="py-2.5 px-3 text-center">{tr('الدرجة', 'Score')}</th>
                  <th className="py-2.5 px-3 text-center">{tr('النسبة', 'Percentage')}</th>
                  <th className="py-2.5 px-3 text-center">{tr('التقدير', 'Rating')}</th>
                  <th className="py-2.5 px-3 text-center">{tr('الحالة', 'Status')}</th>
                  <th className="py-2.5 px-3 text-center">{tr('مرفق / إثبات', 'Attachment')}</th>
                  <th className="py-2.5 px-3">{tr('ملاحظات', 'Notes')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {currentExamResults.map((r, i) => {
                  const isChecked = selectedExportStudentIds.includes(r.studentDocId);
                  return (
                  <tr
                    key={r.id}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                      isChecked ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''
                    }`}
                  >
                    <td className="py-2 px-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleExportStudentId(r.studentDocId)}
                        className="w-4 h-4 rounded accent-emerald-600 cursor-pointer"
                      />
                    </td>
                    <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">{i + 1}</td>
                    <td className="py-2 px-3 font-extrabold text-slate-900 dark:text-slate-50">{r.studentName}</td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-slate-800 dark:text-slate-100">{r.score}/{r.totalScore}</td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-amber-600 dark:text-amber-400">{r.percentage}%</td>
                    <td className="py-2 px-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {r.gradeRating}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={`text-[11px] font-bold ${r.passed ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-400'}`}>
                        {r.passed ? tr('ناجح', 'Passed') : tr('راسب', 'Failed')}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center">
                        <AttachmentThumbnail
                          attachment={r.attachment}
                          size="sm"
                          readOnly={true}
                          tooltipPrefix={`${tr('طالب:', 'Student:')} ${r.studentName}`}
                          onClick={() => setPreviewAttachmentResult(r)}
                        />
                      </div>
                    </td>
                    <td className="py-2 px-3 text-slate-500 dark:text-slate-400">{r.notes || '-'}</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Grade & Group Reports */}
      {(reportType === 'by_grade' || reportType === 'by_group') && (() => {
        const listForTab = reportType === 'by_grade' ? gradeStudents : groupStudents;
        const selectedForTab = listForTab
          .filter((s) => selectedExportStudentIds.includes(s.id))
          .map((s) => s.id);
        return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {reportType === 'by_grade'
                  ? tr(`تقرير طلاب صف: ${translateGrade(selectedGrade, lang)}`, `Students Report for Grade: ${translateGrade(selectedGrade, lang)}`)
                  : tr(`تقرير طلاب شعبة: ${selectedGroup}`, `Students Report for Group: ${selectedGroup}`)}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {tr('إجمالي الطلاب في هذا التصنيف:', 'Total students in this category:')} {listForTab.length} {tr('طالب', 'students')}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={listForTab.length === 0}
                onClick={() =>
                  exportCustomAcademicExcel(
                    students,
                    exams,
                    allResults,
                    {
                      ...getExportOptions(),
                      grade: reportType === 'by_grade' ? selectedGrade : 'الكل',
                      group: reportType === 'by_group' ? selectedGroup : 'الكل',
                      startDate: startDate || undefined,
                      endDate: endDate || undefined,
                      studentIds: selectedForTab.length > 0 ? selectedForTab : undefined,
                    },
                    settings.gradingScale
                  )
                }
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>
                  {selectedForTab.length > 0
                    ? tr(`تصدير المحددين Excel (${selectedForTab.length})`, `Export Selected Excel (${selectedForTab.length})`)
                    : tr(`تصدير القائمة Excel (${listForTab.length})`, `Export List Excel (${listForTab.length})`)}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setShowExportModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition cursor-pointer"
              >
                <Filter className="w-3.5 h-3.5 text-amber-500" />
                <span>{tr('تصدير مخصص', 'Custom Export')}</span>
              </button>
            </div>
          </div>

          {listForTab.length > 0 && (
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 me-1">
                  <Users className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{tr('تحديد طلاب للتصدير:', 'Select Students for Export:')}</span>
                </span>
                <button
                  type="button"
                  onClick={() => selectAllExportStudents(listForTab)}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-[11px] hover:border-emerald-500 cursor-pointer"
                >
                  {tr(`تحديد الكل (${listForTab.length})`, `Select All (${listForTab.length})`)}
                </button>
                <div className="inline-flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-1.5 py-0.5">
                  <Hash className="w-3 h-3 text-slate-400" />
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">{tr('عدد:', 'Count:')}</span>
                  <input
                    type="number"
                    min={1}
                    max={Math.max(1, listForTab.length)}
                    value={studentQuickCountInput}
                    onChange={(e) => setStudentQuickCountInput(Math.max(1, Number(e.target.value) || 1))}
                    className="w-12 text-center font-mono font-bold text-[11px] bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => selectCountExportStudents(listForTab, studentQuickCountInput)}
                    className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] cursor-pointer"
                  >
                    {tr('تحديد', 'Select')}
                  </button>
                </div>
                {selectedExportStudentIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedExportStudentIds([])}
                    className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold text-[11px] cursor-pointer"
                  >
                    {tr(`إلغاء التحديد (${selectedExportStudentIds.length})`, `Clear Selection (${selectedExportStudentIds.length})`)}
                  </button>
                )}
              </div>
              <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
                {tr('المحدد:', 'Selected:')} <strong className="text-emerald-600 dark:text-emerald-400">{selectedForTab.length}</strong>
              </span>
            </div>
          )}

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-700/80 rounded-2xl">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-2.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        listForTab.length > 0 &&
                        listForTab.every((s) => selectedExportStudentIds.includes(s.id))
                      }
                      onChange={(e) =>
                        e.target.checked
                          ? selectAllExportStudents(listForTab)
                          : setSelectedExportStudentIds([])
                      }
                      className="w-4 h-4 rounded accent-emerald-600 cursor-pointer"
                    />
                  </th>
                  <th className="py-2.5 px-3">{tr('اسم الطالب', 'Student Name')}</th>
                  <th className="py-2.5 px-3">{tr('الرقم التعريفي', 'Student ID')}</th>
                  <th className="py-2.5 px-3 text-center">{tr('عدد الامتحانات', 'Exams Count')}</th>
                  <th className="py-2.5 px-3 text-center">{tr('متوسط النسبة', 'Average %')}</th>
                  <th className="py-2.5 px-3 text-center">{tr('نسبة النجاح', 'Pass Rate')}</th>
                  <th className="py-2.5 px-3 text-center">{tr('التقييم', 'Rating')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {listForTab.map((st) => {
                  const res = dateFilteredResults.filter(r => r.studentDocId === st.id);
                  const stStats = calculateStudentStats(res, settings.gradingScale);
                  const isChecked = selectedExportStudentIds.includes(st.id);
                  return (
                    <tr
                      key={st.id}
                      onClick={() => onOpenStudentProfile(st)}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${
                        isChecked ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''
                      }`}
                    >
                      <td className="py-2.5 px-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleExportStudentId(st.id)}
                          className="w-4 h-4 rounded accent-emerald-600 cursor-pointer"
                        />
                      </td>
                      <td className="py-2.5 px-3 font-extrabold text-slate-900 dark:text-slate-50">{st.name}</td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-mono">{st.studentId}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-700 dark:text-slate-200">{stStats.totalExams}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-600 dark:text-amber-400">{stStats.averagePercentage}%</td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-700 dark:text-slate-200">{stStats.passRate}%</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          stStats.status === 'ممتاز' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' :
                          stStats.status === 'جيد' ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' :
                          'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                        }`}>
                          {stStats.status === 'ممتاز'
                            ? tr('ممتاز', 'Excellent')
                            : stStats.status === 'جيد'
                            ? tr('جيد', 'Good')
                            : stStats.status === 'يحتاج متابعة'
                            ? tr('يحتاج متابعة', 'Needs Follow-up')
                            : stStats.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        );
      })()}

      {/* 4.5 Completed Course Students Report */}
      {reportType === 'completed_course' && (() => {
        const completedList = students.filter(s => getEffectiveEnrollmentStatus(s) === 'completed');
        const selectedCompletedIds = completedList
          .filter(s => selectedExportStudentIds.includes(s.id))
          .map(s => s.id);
        return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 shadow-sm border border-sky-200 dark:border-sky-800/70 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-sky-500" />
                <span>{tr('قائمة وسجل الطلبة الذين انتهى الكورس لهم', 'Course-Completed Students Record')}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {tr('إجمالي الخريجين ومنتهي الكورس:', 'Total graduates & course-completed:')} {completedList.length} {tr('طالب — محفوظة سجلاتهم بالكامل', 'students — full records preserved')}
              </p>
            </div>
            <button
              onClick={() =>
                exportCompletedStudentsExcel(students, allResults, settings, {
                  ...getExportOptions(),
                  studentIds:
                    selectedCompletedIds.length > 0 ? selectedCompletedIds : undefined,
                })
              }
              disabled={completedList.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-xl transition-all cursor-pointer shadow-sm disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>
                {selectedCompletedIds.length > 0
                  ? tr(`تصدير المحددين Excel (${selectedCompletedIds.length})`, `Export Selected Excel (${selectedCompletedIds.length})`)
                  : tr('تصدير قائمة منتهي الكورس Excel (مع الرسم البياني)', 'Export Completed List Excel (with Chart)')}
              </span>
            </button>
          </div>

          {completedList.length > 0 && (
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 me-1">
                  <Users className="w-3.5 h-3.5 text-sky-500" />
                  <span>{tr('تحديد للتصدير:', 'Select for Export:')}</span>
                </span>
                <button
                  type="button"
                  onClick={() => selectAllExportStudents(completedList)}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-[11px] hover:border-sky-500 cursor-pointer"
                >
                  {tr(`تحديد الكل (${completedList.length})`, `Select All (${completedList.length})`)}
                </button>
                <div className="inline-flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-1.5 py-0.5">
                  <Hash className="w-3 h-3 text-slate-400" />
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">{tr('عدد:', 'Count:')}</span>
                  <input
                    type="number"
                    min={1}
                    max={Math.max(1, completedList.length)}
                    value={studentQuickCountInput}
                    onChange={(e) => setStudentQuickCountInput(Math.max(1, Number(e.target.value) || 1))}
                    className="w-12 text-center font-mono font-bold text-[11px] bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => selectCountExportStudents(completedList, studentQuickCountInput)}
                    className="px-2 py-0.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-black text-[11px] cursor-pointer"
                  >
                    {tr('تحديد', 'Select')}
                  </button>
                </div>
                {selectedExportStudentIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedExportStudentIds([])}
                    className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold text-[11px] cursor-pointer"
                  >
                    {tr(`إلغاء التحديد (${selectedExportStudentIds.length})`, `Clear Selection (${selectedExportStudentIds.length})`)}
                  </button>
                )}
              </div>
              <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
                {tr('المحدد:', 'Selected:')} <strong className="text-sky-600 dark:text-sky-400">{selectedCompletedIds.length}</strong>
              </span>
            </div>
          )}

          {completedList.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              {tr(
                'لا يوجد طلبة محددة حالتهم كـ «انتهى الكورس» حالياً. يمكنك تحديد حالة الطالب من ملفه الشخصي أو من قائمة الطلاب.',
                'No students currently marked as "Course Completed". You can update student status from their profile or the students list.'
              )}
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-700/80 rounded-2xl">
              <table className="w-full text-start text-xs">
                <thead className="bg-sky-50/70 dark:bg-sky-950/40 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-2.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          completedList.length > 0 &&
                          completedList.every((s) => selectedExportStudentIds.includes(s.id))
                        }
                        onChange={(e) =>
                          e.target.checked
                            ? selectAllExportStudents(completedList)
                            : setSelectedExportStudentIds([])
                        }
                        className="w-4 h-4 rounded accent-sky-600 cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-3 w-10 text-center">#</th>
                    <th className="py-3 px-3">{tr('اسم الطالب', 'Student Name')}</th>
                    <th className="py-3 px-3">{tr('الصف الدراسي', 'Grade')}</th>
                    <th className="py-3 px-3 text-center">{tr('حالة الملف', 'File Status')}</th>
                    <th className="py-3 px-3 text-center">{tr('الامتحانات المنجزة', 'Completed Exams')}</th>
                    <th className="py-3 px-3 text-center">{tr('المعدل النهائي %', 'Final Average %')}</th>
                    <th className="py-3 px-3 text-center">{tr('التقييم النهائي', 'Final Rating')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {completedList.map((st, idx) => {
                      const res = dateFilteredResults.filter(r => r.studentDocId === st.id);
                      const stStats = calculateStudentStats(res, settings.gradingScale);
                      const statusMeta = ENROLLMENT_STATUS_META['completed'];
                      const isChecked = selectedExportStudentIds.includes(st.id);
                      return (
                        <tr
                          key={st.id}
                          onClick={() => onOpenStudentProfile(st)}
                          className={`hover:bg-sky-50/30 dark:hover:bg-sky-950/20 cursor-pointer transition-colors ${
                            isChecked ? 'bg-sky-50/50 dark:bg-sky-950/25' : ''
                          }`}
                        >
                          <td className="py-2.5 px-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleExportStudentId(st.id)}
                              className="w-4 h-4 rounded accent-sky-600 cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-extrabold text-slate-900 dark:text-white">{st.name}</td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">{translateGrade(st.grade, lang)}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${statusMeta.badgeBg} ${statusMeta.badgeText} ${statusMeta.badgeBorder}`}>
                              {lang === 'en' ? statusMeta.shortLabelEn : statusMeta.shortLabel}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold">{stStats.totalExams}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-black text-amber-600 dark:text-amber-400">{stStats.averagePercentage}%</td>
                          <td className="py-2.5 px-3 text-center font-bold">
                            {stStats.status === 'ممتاز'
                              ? tr('ممتاز', 'Excellent')
                              : stStats.status === 'جيد'
                              ? tr('جيد', 'Good')
                              : stStats.status === 'يحتاج متابعة'
                              ? tr('يحتاج متابعة', 'Needs Follow-up')
                              : stStats.status}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        );
      })()}

      {/* 5. Exam Comparison Tool */}
      {reportType === 'exam_comparison' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">{tr('مقارنة نتائج امتحانين أو أكثر', 'Compare Two or More Exams')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{tr('حدد الامتحانات التي ترغب في وضعها جنباً إلى جنب لمقارنة النتائج', 'Select exams to compare their results side by side')}</p>
          </div>

          {/* Exam Selection Checkboxes */}
          <div className="flex flex-wrap gap-2 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
            {exams.map(e => (
              <button
                key={e.id}
                type="button"
                onClick={() => toggleCompareExam(e.id)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  compareExamIds.includes(e.id)
                    ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {e.title} ({e.date})
              </button>
            ))}
          </div>

          {/* Comparison Cards */}
          {comparedExamsData.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              {tr('حدد امتحانين على الأقل من القائمة أعلاه للمقارنة بينهما', 'Select at least two exams above to compare')}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {comparedExamsData.map(({ exam, attended, avg, passRate }) => (
                <div key={exam?.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm truncate">{exam?.title}</h4>
                  <p className="text-[11px] text-slate-400 font-mono">{exam?.date} | {translateGrade(exam?.grade || '', lang)}</p>

                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block">{tr('المتوسط العام', 'Overall Average')}</span>
                      <span className="font-black text-amber-600 dark:text-amber-400 font-mono text-base">{avg}%</span>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block">{tr('نسبة النجاح', 'Pass Rate')}</span>
                      <span className="font-black text-emerald-600 dark:text-emerald-400 font-mono text-base">{passRate}%</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
                    {tr('الطلاب الحاضرين:', 'Attendees:')} <strong className="text-slate-800 dark:text-slate-200">{attended}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 6. Structures (قسم الهياكل) Comprehensive Report */}
      {reportType === 'structures' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-500" />
                <span>{tr('تقرير قسم الهياكل وإنجاز الطلاب ونسب صحة الأسئلة', 'Structures Report, Student Completion & Question Accuracy')}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {tr('تحليل متكامل لعدد الأسئلة المحلولة ونسبة صحة كل سؤال مصنفاً بالصف والفصل والمسار والسنة والمادة وحالة الملف', 'Comprehensive analysis of solved questions and per-question accuracy grouped by grade, term, track, year, subject, and enrollment status')}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowHonorBoardModal(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-black text-slate-950 bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 hover:from-amber-200 hover:to-orange-300 rounded-xl transition cursor-pointer shadow-md shadow-amber-500/20"
                title={tr('تصميم وتصدير لوحة شرف لقسم الهياكل بنفس اللوجو والشعار والتقسيمات', 'Design & export Structures Honor Board with custom branding and layout')}
              >
                <Award className="w-4 h-4 text-slate-950" />
                <span>{tr('لوحة شرف الهياكل 📸', 'Structures Honor Board 📸')}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowExportModal(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition cursor-pointer"
              >
                <Filter className="w-3.5 h-3.5 text-amber-500" />
                <span>{tr('مركز تصدير Excel المخصص للهياكل', 'Custom Structures Excel Export Center')}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  exportStructuresReportExcel(
                    structures,
                    structureProgress,
                    students,
                    {
                      ...getExportOptions(),
                      structureCompletionStatus: selectedStructureCompletionStatus,
                      structureId:
                        selectedExportStructureIds.length === 1
                          ? selectedExportStructureIds[0]
                          : selectedStructureFilterId,
                      structureIds:
                        selectedExportStructureIds.length > 0
                          ? selectedExportStructureIds
                          : selectedStructureFilterId !== 'الكل'
                          ? [selectedStructureFilterId]
                          : undefined,
                      studentIds:
                        selectedExportStudentIds.length > 0
                          ? selectedExportStudentIds
                          : undefined,
                      grade: selectedStructureGrade,
                      track: selectedStructureTrack,
                      academicYear: selectedStructureYear,
                      subject: selectedStructureSubject,
                      startDate: startDate || undefined,
                      endDate: endDate || undefined,
                      filterLabel: `${tr('الفصل:', 'Term:')} ${translateTerm(selectedTerm, lang)} | ${tr('الحالة:', 'Status:')} ${selectedEnrollmentStatus} | ${tr('المسار:', 'Track:')} ${translateTrack(selectedStructureTrack, lang)} | ${tr('الصف:', 'Grade:')} ${translateGrade(selectedStructureGrade, lang)}`,
                    }
                  )
                }
                disabled={filteredStructureProgressForReport.length === 0 && filteredStructuresForReport.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>
                  {selectedExportStudentIds.length > 0 || selectedExportStructureIds.length > 0
                    ? tr(
                        `تصدير المحددين Excel (${selectedExportStructureIds.length || 'كل'} هيكل • ${selectedExportStudentIds.length || 'كل'} طالب)`,
                        `Export Selected Excel (${selectedExportStructureIds.length || 'All'} structures • ${selectedExportStudentIds.length || 'All'} students)`
                      )
                    : tr('تصدير تقرير الهياكل إلى Excel', 'Export Structures Report to Excel')}
                </span>
              </button>
            </div>
          </div>

          {/* Sub-filters for Structures Report */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
            <select
              value={selectedStructureFilterId}
              onChange={(e) => setSelectedStructureFilterId(e.target.value)}
              className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
              title={tr('تصفية حسب الهيكل', 'Filter by structure')}
            >
              <option value="الكل">{tr('كل الهياكل', 'All Structures')} ({filteredStructuresForReport.length})</option>
              {filteredStructuresForReport.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.title} ({translateGrade(st.grade, lang)})
                </option>
              ))}
            </select>

            <select
              value={selectedStructureGrade}
              onChange={(e) => setSelectedStructureGrade(e.target.value)}
              className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <option value="الكل">{tr('كل الصفوف', 'All Grades')}</option>
              {Array.from(new Set(structures.map((s) => s.grade).filter(Boolean))).map((g) => (
                <option key={g} value={g}>{translateGrade(g, lang)}</option>
              ))}
            </select>

            <select
              value={selectedStructureTrack}
              onChange={(e) => setSelectedStructureTrack(e.target.value)}
              className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <option value="الكل">{tr('كل المسارات', 'All Tracks')}</option>
              {Array.from(new Set(structures.map((s) => s.track).filter(Boolean))).map((trackOpt) => (
                <option key={trackOpt} value={trackOpt}>{translateTrack(trackOpt, lang)}</option>
              ))}
            </select>

            <select
              value={selectedStructureYear}
              onChange={(e) => setSelectedStructureYear(e.target.value)}
              className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <option value="الكل">{tr('كل السنوات', 'All Years')}</option>
              {Array.from(new Set(structures.map((s) => s.academicYear).filter(Boolean))).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <select
              value={selectedStructureSubject}
              onChange={(e) => setSelectedStructureSubject(e.target.value)}
              className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <option value="الكل">{tr('كل المواد', 'All Subjects')}</option>
              {Array.from(new Set(structures.map((s) => s.subject).filter(Boolean))).map((sb) => (
                <option key={sb} value={sb}>{translateSubject(sb, lang)}</option>
              ))}
            </select>

            <div className="col-span-2 sm:col-span-5 pt-2 border-t border-slate-200/80 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />
                <span>{tr('تصفية حسب حالة الهيكل:', 'Filter by Structure Status:')}</span>
              </span>
              <div className="inline-flex flex-wrap items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px]">
                <button
                  type="button"
                  onClick={() => setSelectedStructureCompletionStatus('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    selectedStructureCompletionStatus === 'all'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {tr('الكل', 'All')} ({reportStructureCompletionCounts.all})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStructureCompletionStatus('ongoing')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    selectedStructureCompletionStatus === 'ongoing'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>{tr('مستمر وجاري الدراسة', 'Ongoing / Studying')} ({reportStructureCompletionCounts.ongoing})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStructureCompletionStatus('studied_not_examined')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    selectedStructureCompletionStatus === 'studied_not_examined'
                      ? 'bg-amber-600 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <BookOpenCheck className="w-3 h-3" />
                  <span>{tr('منتهي دراسة ولم يُمتحن', 'Studied / Pending Exam')} ({reportStructureCompletionCounts.studiedNotExamined})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedStructureCompletionStatus('completed')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    selectedStructureCompletionStatus === 'completed'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{tr('انتهى وتم الامتحان', 'Completed & Examined')} ({reportStructureCompletionCounts.completed})</span>
                </button>
              </div>
            </div>
          </div>

          {/* Multi-Structure Selection & Count Toolbar */}
          {filteredStructuresForReport.length > 0 && (
            <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-200/80 dark:border-amber-800/50 space-y-2.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 me-1">
                    <Layers className="w-3.5 h-3.5 text-amber-500" />
                    <span>{tr('تحديد الهياكل للتصدير:', 'Select Structures to Export:')}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedExportStructureIds(filteredStructuresForReport.map((s) => s.id))}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-[11px] hover:border-amber-500 cursor-pointer"
                  >
                    {tr('تحديد الكل', 'Select All')} ({filteredStructuresForReport.length})
                  </button>
                  <div className="inline-flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-1.5 py-0.5">
                    <Hash className="w-3 h-3 text-slate-400" />
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{tr('عدد هياكل:', 'Count:')}</span>
                    <input
                      type="number"
                      min={1}
                      max={Math.max(1, filteredStructuresForReport.length)}
                      value={structureQuickCountInput}
                      onChange={(e) => setStructureQuickCountInput(Math.max(1, Number(e.target.value) || 1))}
                      className="w-12 text-center font-mono font-bold text-[11px] bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedExportStructureIds(
                          filteredStructuresForReport
                            .slice(0, Math.max(1, structureQuickCountInput))
                            .map((s) => s.id)
                        )
                      }
                      className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] cursor-pointer"
                    >
                      {tr('تحديد', 'Select')}
                    </button>
                  </div>
                  {selectedExportStructureIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedExportStructureIds([])}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold text-[11px] cursor-pointer"
                    >
                      {tr('إلغاء تحديد الهياكل', 'Clear Structures')} ({selectedExportStructureIds.length})
                    </button>
                  )}
                </div>
                <span className="text-[11px] font-mono font-bold text-amber-700 dark:text-amber-300">
                  {selectedExportStructureIds.length > 0
                    ? `${selectedExportStructureIds.length} ${tr('هيكل محدد', 'structures selected')}`
                    : tr('الكل مشمول', 'All included')}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {filteredStructuresForReport.map((st) => {
                  const active = selectedExportStructureIds.includes(st.id);
                  const stStatus = getEffectiveStructureStatus(st);
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => toggleExportStructureId(st.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-bold transition cursor-pointer ${
                        active
                          ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                      }`}
                    >
                      <span>{st.title} ({translateGrade(st.grade, lang)})</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${
                          active
                            ? 'bg-slate-950/15 border-slate-950/20 text-slate-950'
                            : STRUCTURE_STATUS_META[stStatus].badgeClass
                        }`}
                      >
                        {getStructureStatusLabel(st, true, lang)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-center">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                {tr('عدد الهياكل المطابقة', 'Matching Structures')}
              </span>
              <span className="text-2xl font-black text-slate-900 dark:text-white font-mono tabular-nums">
                {filteredStructuresForReport.length}
              </span>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-center">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                {tr('سجلات الطلاب المرصودة', 'Recorded Student Entries')}
              </span>
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono tabular-nums">
                {filteredStructureProgressForReport.length}
              </span>
            </div>

            <div className="p-3.5 bg-amber-500/10 dark:bg-amber-500/15 rounded-2xl border border-amber-500/20 text-center">
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 block mb-1">
                {tr('متوسط الإنجاز (الأسئلة المحلولة)', 'Avg Completion (Solved Questions)')}
              </span>
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                {filteredStructureProgressForReport.length > 0
                  ? `${Math.round(
                      filteredStructureProgressForReport.reduce(
                        (a, b) => a + (b.completionPercentage || 0),
                        0
                      ) / filteredStructureProgressForReport.length
                    )}%`
                  : '0%'}
              </span>
            </div>

            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 text-center">
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 block mb-1">
                {tr('متوسط نسبة الصحة العامة', 'Avg Overall Accuracy')}
              </span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                {filteredStructureProgressForReport.length > 0
                  ? `${Math.round(
                      filteredStructureProgressForReport.reduce(
                        (a, b) => a + (b.overallAccuracyPercentage || 0),
                        0
                      ) / filteredStructureProgressForReport.length
                    )}%`
                  : '0%'}
              </span>
            </div>
          </div>

          {/* Per-Question Accuracy BarChart */}
          {activeChartStructure && structureQuestionChartData.length > 0 && (
            <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {tr('مخطط متوسط نسبة صحة كل سؤال لهيكل:', 'Per-Question Average Accuracy Chart:')} {activeChartStructure.title}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  ({translateGrade(activeChartStructure.grade, lang)} • {translateTerm(activeChartStructure.term, lang)} • {translateTrack(activeChartStructure.track, lang)})
                </span>
              </div>
              <div className="h-56 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={structureQuestionChartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.4} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderRadius: '10px',
                        border: 'none',
                        color: '#fff',
                        fontSize: '12px',
                        direction: dir,
                        textAlign: isRtl ? 'right' : 'left',
                      }}
                      formatter={(value: any, _name: any, props: any) => [
                        `${value}% (${props?.payload?.solvedCount || 0} ${tr('طالب', 'students')})`,
                        tr('متوسط الصحة', 'Avg Accuracy'),
                      ]}
                    />
                    <Bar dataKey="avgAccuracy" radius={[6, 6, 0, 0]}>
                      {structureQuestionChartData.map((entry, idx) => (
                        <Cell key={`struct-q-${idx}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Detailed Structures Student Records Table */}
          {filteredStructureProgressForReport.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 text-xs">
              {tr('لا توجد سجلات طلاب مسجلة في قسم الهياكل ضمن الفلاتر الحالية. يمكنك رصد حلول الطلاب من تبويب «قسم الهياكل».', 'No student records found in the Structures section matching the current filters. You can log solutions from the Structures tab.')}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 me-1">
                    <Users className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{tr('تحديد الطلاب للتصدير:', 'Select Students to Export:')}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedExportStudentIds(
                        Array.from(new Set(filteredStructureProgressForReport.map((r) => r.studentDocId)))
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-[11px] hover:border-emerald-500 cursor-pointer"
                  >
                    {tr('تحديد الكل', 'Select All')} ({new Set(filteredStructureProgressForReport.map((r) => r.studentDocId)).size})
                  </button>
                  <div className="inline-flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-1.5 py-0.5">
                    <Hash className="w-3 h-3 text-slate-400" />
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{tr('عدد:', 'Count:')}</span>
                    <input
                      type="number"
                      min={1}
                      max={Math.max(1, new Set(filteredStructureProgressForReport.map((r) => r.studentDocId)).size)}
                      value={studentQuickCountInput}
                      onChange={(e) => setStudentQuickCountInput(Math.max(1, Number(e.target.value) || 1))}
                      className="w-12 text-center font-mono font-bold text-[11px] bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const uniqIds = Array.from(
                          new Set(filteredStructureProgressForReport.map((r) => r.studentDocId))
                        );
                        setSelectedExportStudentIds(
                          uniqIds.slice(0, Math.max(1, studentQuickCountInput))
                        );
                      }}
                      className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] cursor-pointer"
                    >
                      {tr('تحديد', 'Select')}
                    </button>
                  </div>
                  {selectedExportStudentIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedExportStudentIds([])}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold text-[11px] cursor-pointer"
                    >
                      {tr('إلغاء التحديد', 'Clear Selection')} ({selectedExportStudentIds.length})
                    </button>
                  )}
                </div>
                <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
                  {tr('المحدد:', 'Selected:')} <strong className="text-emerald-600 dark:text-emerald-400">{selectedExportStudentIds.length}</strong>
                </span>
              </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-700/80 rounded-2xl">
              <table className="w-full text-start text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2.5 px-2.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          filteredStructureProgressForReport.length > 0 &&
                          filteredStructureProgressForReport.every((r) =>
                            selectedExportStudentIds.includes(r.studentDocId)
                          )
                        }
                        onChange={(e) =>
                          e.target.checked
                            ? setSelectedExportStudentIds(
                                Array.from(
                                  new Set(filteredStructureProgressForReport.map((r) => r.studentDocId))
                                )
                              )
                            : setSelectedExportStudentIds([])
                        }
                        className="w-4 h-4 rounded accent-emerald-600 cursor-pointer"
                      />
                    </th>
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3">{tr('اسم الطالب', 'Student Name')}</th>
                    <th className="py-2.5 px-3">{tr('الهيكل والمادة', 'Structure & Subject')}</th>
                    <th className="py-2.5 px-3">{tr('الصف / الفصل / المسار / السنة', 'Grade / Term / Track / Year')}</th>
                    <th className="py-2.5 px-3 text-center">{tr('حالة الملف', 'Status')}</th>
                    <th className="py-2.5 px-3 text-center">{tr('الأسئلة المحلولة', 'Solved Questions')}</th>
                    <th className="py-2.5 px-3 text-center">{tr('متوسط الصحة %', 'Avg Accuracy %')}</th>
                    <th className="py-2.5 px-3">{tr('نسبة صحة كل سؤال', 'Per-Question Accuracy')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {filteredStructureProgressForReport.map((rec, idx) => {
                    const studentObj = studentByIdMap.get(rec.studentDocId);
                    const statusMeta = studentObj
                      ? ENROLLMENT_STATUS_META[getEffectiveEnrollmentStatus(studentObj)]
                      : ENROLLMENT_STATUS_META['active'];
                    const isImp =
                      Boolean(rec.isImprovement) ||
                      (rec.attemptNumber !== undefined && rec.attemptNumber > 1);
                    const prevAcc = rec.previousAccuracy;
                    const accDiff =
                      isImp && prevAcc !== undefined
                        ? Math.round((rec.overallAccuracyPercentage - prevAcc) * 10) / 10
                        : null;
                    const qImpCount =
                      rec.improvementsCount ??
                      (rec.questionScores || []).filter(
                        (qs) => qs.isImprovement || (qs.attemptNumber !== undefined && qs.attemptNumber > 1)
                      ).length;
                    const isChecked = selectedExportStudentIds.includes(rec.studentDocId);

                    return (
                      <tr
                        key={rec.id}
                        onClick={() => studentObj && onOpenStudentProfile(studentObj)}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-emerald-50/40 dark:bg-emerald-950/20'
                            : isImp
                            ? 'bg-amber-50/40 dark:bg-amber-950/20 border-s-4 border-s-amber-500'
                            : ''
                        }`}
                      >
                        <td className="py-2.5 px-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleExportStudentId(rec.studentDocId)}
                            className="w-4 h-4 rounded accent-emerald-600 cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-extrabold text-slate-900 dark:text-white">
                          {rec.studentName}
                          <div className="text-[10px] font-mono text-slate-400">{rec.studentId}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900 dark:text-slate-100">{rec.structureTitle}</div>
                          <div className="text-[11px] text-amber-600 dark:text-amber-400">{translateSubject(rec.subject, lang)}</div>
                          {(isImp || qImpCount > 0) && (
                            <div className="flex items-center gap-1 flex-wrap mt-1">
                              {isImp && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                                  <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                                  {rec.attemptLabel || `${tr('تحسين (محاولة', 'Improvement (Attempt')} ${rec.attemptNumber || 2})`}
                                </span>
                              )}
                              {prevAcc !== undefined && (
                                <span className="text-[10px] font-mono text-slate-400">
                                  ({tr('السابقة:', 'Prev:')} {prevAcc}%)
                                </span>
                              )}
                              {accDiff !== null && (
                                <span
                                  className={`text-[10px] font-mono font-bold ${
                                    accDiff > 0
                                      ? 'text-emerald-600'
                                      : accDiff < 0
                                      ? 'text-rose-600'
                                      : 'text-slate-500'
                                  }`}
                                >
                                  {accDiff > 0 ? `+${accDiff}% ↑` : `${accDiff}%`}
                                </span>
                              )}
                              {qImpCount > 0 && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  {qImpCount} {tr('سؤال محسّن', 'improved')}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-600 dark:text-slate-300">
                          <div>{translateGrade(rec.grade, lang)} • {translateTrack(rec.track, lang)}</div>
                          <div className="text-slate-400">{translateTerm(rec.term, lang)} • {rec.academicYear}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusMeta?.badgeBg} ${statusMeta?.badgeText} ${statusMeta?.badgeBorder}`}
                          >
                            {lang === 'en' ? statusMeta?.shortLabelEn || 'Active' : statusMeta?.shortLabel || 'فعال'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                          {rec.solvedCount} / {rec.totalQuestions}
                          <div className="text-[10px] text-slate-400">{rec.completionPercentage}%</div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono tabular-nums font-black text-emerald-600 dark:text-emerald-400">
                          {rec.overallAccuracyPercentage}%
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex flex-wrap gap-1 font-mono tabular-nums max-w-[300px]">
                            {(rec.questionScores || []).map((qs) => {
                              const isQImp =
                                Boolean(qs.isImprovement) ||
                                (qs.attemptNumber !== undefined && qs.attemptNumber > 1);
                              return (
                                <span
                                  key={qs.questionNumber}
                                  className={`px-1.5 py-0.5 rounded text-[10px] border ${
                                    isQImp ? 'ring-1 ring-amber-400 dark:ring-amber-600 ' : ''
                                  }${
                                    !qs.solved
                                      ? 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                                      : qs.accuracyPercentage >= 80
                                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                      : qs.accuracyPercentage >= 50
                                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                                  }`}
                                  title={
                                    isQImp && qs.previousAccuracy !== undefined
                                      ? `${tr('سؤال', 'Question')} ${qs.questionNumber}: ${qs.accuracyPercentage}% (${tr('تحسين من', 'improved from')} ${qs.previousAccuracy}% • ${tr('محاولة', 'attempt')} ${qs.attemptNumber || 2})`
                                      : `${tr('سؤال', 'Question')} ${qs.questionNumber}: ${qs.solved ? `${qs.accuracyPercentage}%` : tr('لم يُحل', 'Not solved')}`
                                  }
                                >
                                  {tr('س', 'Q')}{qs.questionNumber}:{qs.solved ? `${qs.accuracyPercentage}%${isQImp ? '↑' : ''}` : '—'}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </div>
          )}
        </div>
      )}

      {/* Excel Custom Filter Export Modal */}
      <ExcelExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        students={students}
        exams={exams}
        allResults={allResults}
        settings={settings}
        structures={structures}
        structureProgress={structureProgress}
        defaultExportMode={reportType === 'structures' ? 'structures_reports' : 'academic_reports'}
        defaultGrade={reportType === 'structures' ? selectedStructureGrade : selectedGrade}
        defaultTerm={selectedTerm}
        defaultTrack={selectedStructureTrack}
        defaultYear={selectedStructureYear}
        defaultSubject={selectedStructureSubject}
        defaultStructureCompletionStatus={selectedStructureCompletionStatus}
        defaultStructureId={selectedStructureFilterId}
        defaultSelectedStructureIds={
          selectedExportStructureIds.length > 0
            ? selectedExportStructureIds
            : selectedStructureFilterId !== 'الكل'
            ? [selectedStructureFilterId]
            : undefined
        }
        defaultStructureSelectionMode={
          selectedExportStructureIds.length > 0 || selectedStructureFilterId !== 'الكل'
            ? 'specific'
            : 'all'
        }
        defaultSelectedStudentIds={
          selectedExportStudentIds.length > 0 ? selectedExportStudentIds : undefined
        }
        defaultStudentSelectionMode={selectedExportStudentIds.length > 0 ? 'specific' : 'all'}
        defaultStatus={selectedEnrollmentStatus}
      />

      {/* Student Academic Report Modal */}
      {academicModalStudent && (
        <StudentAcademicReportModal
          student={academicModalStudent}
          results={dateFilteredResults.filter(r => r.studentDocId === academicModalStudent.id)}
          settings={settings}
          structures={structures}
          structureProgress={structureProgress.filter(sp => sp.studentDocId === academicModalStudent.id)}
          onClose={() => setAcademicModalStudent(null)}
        />
      )}

      {/* Attachment Proof Quick Viewer Modal */}
      {previewAttachmentResult && (
        <AttachmentModal
          isOpen={true}
          title={`${tr('إثبات نتيجة امتحان:', 'Exam Result Proof:')} ${previewAttachmentResult.examTitle}`}
          subtitle={`${tr('الطالب:', 'Student:')} ${previewAttachmentResult.studentName} | ${tr('الدرجة:', 'Score:')} ${previewAttachmentResult.score}/${previewAttachmentResult.totalScore}`}
          attachment={previewAttachmentResult.attachment}
          readOnly={true}
          onClose={() => setPreviewAttachmentResult(null)}
        />
      )}

      {/* Honor Board Export Modal */}
      <HonorBoardModal
        isOpen={showHonorBoardModal}
        onClose={() => setShowHonorBoardModal(false)}
        students={students}
        exams={exams}
        allResults={allResults}
        settings={settings}
        structures={structures}
        structureProgress={structureProgress}
        initialDataSource={reportType === 'structures' ? 'structures' : 'academic'}
        initialStructureId={
          reportType === 'structures' && selectedStructureFilterId !== 'الكل'
            ? selectedStructureFilterId
            : undefined
        }
        initialGrade={reportType === 'structures' ? selectedStructureGrade : selectedGrade}
        initialTrack={selectedStructureTrack}
        initialTerm={selectedTerm}
        initialSubject={selectedStructureSubject}
        initialYear={selectedStructureYear}
        initialStartDate={startDate}
        initialEndDate={endDate}
      />
    </div>
  );
};
