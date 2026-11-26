import React, { useState, useMemo, useEffect } from 'react';
import {
  Layers,
  Plus,
  Search,
  Edit3,
  Trash2,
  X,
  Save,
  FileSpreadsheet,
  Sliders,
  BarChart3,
  UserCheck,
  Sparkles,
  Award,
  CheckSquare,
  Square,
  Users,
  History,
  RotateCcw,
  AlertTriangle,
  UserMinus,
  CheckCircle2,
  Clock,
  BookOpenCheck,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  BellRing,
} from 'lucide-react';
import {
  Student,
  TeacherSettings,
  ExamStructure,
  StructureCompletionStatus,
  StudentStructureProgress,
  StructureQuestionItem,
  StructureQuestionScore,
} from '../types';
import {
  UAE_GRADES,
  ACADEMIC_YEARS,
  ACADEMIC_TERMS,
  ACADEMIC_TRACKS,
  DEFAULT_SETTINGS,
} from '../services/firebase';
import {
  getEffectiveEnrollmentStatus,
  ENROLLMENT_STATUS_META,
} from '../utils/studentStatus';
import {
  StructureStatusFilter,
  STRUCTURE_STATUS_ORDER,
  STRUCTURE_STATUS_META,
  getEffectiveStructureStatus,
  getNextStructureStatus,
  getStructureStatusLabel,
} from '../utils/structureStatus';
import {
  loadViewState,
  saveViewState,
  recordLastActivity,
  saveStructureFormDraft,
  loadStructureFormDraft,
  clearStructureFormDraft,
} from '../utils/activityTracker';
import { exportStructuresReportExcel, loadExcelPreferences } from '../utils/excel';
import { ExcelExportModal } from './ExcelExportModal';
import { HonorBoardModal } from './HonorBoardModal';
import { StudentStructureScoringModal } from './StudentStructureScoringModal';
import { BatchStructureScoringModal } from './BatchStructureScoringModal';
import { ConfirmModal } from './ConfirmModal';
import {
  StructureCompletionDistributionChart,
  CompletionBucketId,
  resolveCompletionBucket,
} from './StructureCompletionDistributionChart';
import { StructureReminderModal } from './StructureReminderModal';
import {
  useLanguage,
  translateGrade,
  translateTerm,
  translateTrack,
  translateSubject,
} from '../utils/i18n';

interface StructuresViewProps {
  structures: ExamStructure[];
  structureProgress: StudentStructureProgress[];
  students: Student[];
  settings: TeacherSettings;
  onAddStructure: (data: Omit<ExamStructure, 'id'>) => Promise<string>;
  onUpdateStructure: (id: string, data: Partial<ExamStructure>) => Promise<void>;
  onDeleteStructure: (structure: ExamStructure) => void;
  onSaveProgress: (
    data: Omit<StudentStructureProgress, 'id'> & { id?: string }
  ) => Promise<StudentStructureProgress>;
  onSaveBatchProgress?: (
    records: Array<Omit<StudentStructureProgress, 'id'> & { id?: string }>
  ) => Promise<StudentStructureProgress[]>;
  onDeleteProgress: (progress: StudentStructureProgress) => void;
  onDeleteStudentsFromStructure?: (
    structure: ExamStructure,
    studentsToRemove: Student[]
  ) => Promise<void>;
  onRestoreStudentsToStructure?: (
    structure: ExamStructure,
    studentDocIds?: string[]
  ) => Promise<void>;
  onOpenStudentProfile: (student: Student) => void;
  onDirtyChange?: (dirty: boolean) => void;
}

export const StructuresView: React.FC<StructuresViewProps> = ({
  structures,
  structureProgress,
  students,
  settings = DEFAULT_SETTINGS,
  onAddStructure,
  onUpdateStructure,
  onDeleteStructure,
  onSaveProgress,
  onSaveBatchProgress,
  onDeleteProgress,
  onDeleteStudentsFromStructure,
  onRestoreStudentsToStructure,
  onOpenStudentProfile,
  onDirtyChange,
}) => {
  const { lang, dir, tr } = useLanguage();

  const initialPersisted = useMemo(
    () =>
      loadViewState('STRUCTURES_VIEW_STATE', {
        searchQuery: '',
        filterGrade: 'الكل',
        filterTerm: 'الكل',
        filterTrack: 'الكل',
        filterYear: 'الكل',
        filterSubject: 'الكل',
        filterStatus: 'exclude_completed',
        filterCompletionStatus: 'all' as StructureStatusFilter,
        filterProgressLevel: 'all' as 'all' | 'completed_100' | 'in_progress' | 'not_started',
        structureSortBy: 'newest' as
          | 'newest'
          | 'completion_desc'
          | 'completion_asc'
          | 'accuracy_desc'
          | 'students_desc',
        studentListScope: 'matching' as 'matching' | 'all' | 'recorded_only',
        selectedStructureId: structures[0]?.id || '',
      }),
    []
  );

  // Global filters for الهياكل (with automatic persistence)
  const [searchQuery, setSearchQuery] = useState(initialPersisted.searchQuery);
  const [filterGrade, setFilterGrade] = useState(initialPersisted.filterGrade);
  const [filterTerm, setFilterTerm] = useState(initialPersisted.filterTerm);
  const [filterTrack, setFilterTrack] = useState(initialPersisted.filterTrack);
  const [filterYear, setFilterYear] = useState(initialPersisted.filterYear);
  const [filterSubject, setFilterSubject] = useState(initialPersisted.filterSubject);
  const [filterStatus, setFilterStatus] = useState(initialPersisted.filterStatus);
  const [filterCompletionStatus, setFilterCompletionStatus] = useState<StructureStatusFilter>(
    initialPersisted.filterCompletionStatus === 'ongoing' ||
      initialPersisted.filterCompletionStatus === 'studied_not_examined' ||
      initialPersisted.filterCompletionStatus === 'completed'
      ? initialPersisted.filterCompletionStatus
      : 'all'
  );
  const [filterProgressLevel, setFilterProgressLevel] = useState<
    'all' | 'completed_100' | 'in_progress' | 'not_started'
  >(
    initialPersisted.filterProgressLevel === 'completed_100' ||
      initialPersisted.filterProgressLevel === 'in_progress' ||
      initialPersisted.filterProgressLevel === 'not_started'
      ? initialPersisted.filterProgressLevel
      : 'all'
  );
  const [structureSortBy, setStructureSortBy] = useState<
    'newest' | 'completion_desc' | 'completion_asc' | 'accuracy_desc' | 'students_desc'
  >(
    initialPersisted.structureSortBy === 'completion_desc' ||
      initialPersisted.structureSortBy === 'completion_asc' ||
      initialPersisted.structureSortBy === 'accuracy_desc' ||
      initialPersisted.structureSortBy === 'students_desc'
      ? initialPersisted.structureSortBy
      : 'newest'
  );
  const [showCompletionBreakdownPanel, setShowCompletionBreakdownPanel] = useState(false);
  const [togglingStructureId, setTogglingStructureId] = useState<string | null>(null);
  const [studentListScope, setStudentListScope] = useState<'matching' | 'all' | 'recorded_only'>(
    initialPersisted.studentListScope
  );

  // Selected Structure ID
  const [selectedStructureId, setSelectedStructureId] = useState<string>(
    initialPersisted.selectedStructureId || structures[0]?.id || ''
  );

  // Multi-student batch selection states
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [selectCountInput, setSelectCountInput] = useState<number>(5);
  const [isBatchScoringOpen, setIsBatchScoringOpen] = useState(false);

  // Create/Edit Structure Modal
  const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);
  const [editingStructure, setEditingStructure] = useState<ExamStructure | null>(null);
  const [isExcelExportModalOpen, setIsExcelExportModalOpen] = useState(false);
  const [isHonorBoardOpen, setIsHonorBoardOpen] = useState(false);
  const [filterCompletionBucket, setFilterCompletionBucket] = useState<
    'all' | CompletionBucketId
  >('all');
  const [reminderModalState, setReminderModalState] = useState<{
    isOpen: boolean;
    studentIds?: string[];
    audienceLabel?: string;
  }>({
    isOpen: false,
  });

  // Student Question Scoring & Improvement Modal
  const [scoringModalState, setScoringModalState] = useState<{
    isOpen: boolean;
    structure: ExamStructure | null;
    student: Student | null;
    existingProgress: StudentStructureProgress | null;
    isNewImprovementAttempt?: boolean;
    baselineProgress?: StudentStructureProgress | null;
    nextAttemptNumber?: number;
  }>({
    isOpen: false,
    structure: null,
    student: null,
    existingProgress: null,
    isNewImprovementAttempt: false,
    baselineProgress: null,
    nextAttemptNumber: 2,
  });

  // Add Student Quick Picker inside Selected Structure
  const [studentPickerSearch, setStudentPickerSearch] = useState('');
  const [showAddAnyStudentPicker, setShowAddAnyStudentPicker] = useState(false);

  // Structure-only Student Row Delete & Restore Modals
  const [rowDeleteModal, setRowDeleteModal] = useState<{
    isOpen: boolean;
    studentsToDelete: Student[];
    progressToClearOnly: StudentStructureProgress | null;
  }>({
    isOpen: false,
    studentsToDelete: [],
    progressToClearOnly: null,
  });
  const [isDeletingRows, setIsDeletingRows] = useState(false);
  const [isExcludedModalOpen, setIsExcludedModalOpen] = useState(false);
  const [isStructureFormDirty, setIsStructureFormDirty] = useState(false);
  const [isSingleScoringDirty, setIsSingleScoringDirty] = useState(false);
  const [isBatchScoringDirty, setIsBatchScoringDirty] = useState(false);
  const [isReminderDirty, setIsReminderDirty] = useState(false);

  const anyStructureModalDirty =
    isStructureFormDirty || isSingleScoringDirty || isBatchScoringDirty || isReminderDirty;

  useEffect(() => {
    onDirtyChange?.(anyStructureModalDirty);
  }, [anyStructureModalDirty, onDirtyChange]);

  useEffect(() => {
    return () => {
      onDirtyChange?.(false);
    };
  }, [onDirtyChange]);

  useEffect(() => {
    if (!rowDeleteModal.isOpen && !isExcludedModalOpen && !isExcelExportModalOpen && !isHonorBoardOpen) {
      return;
    }
    const handleModalEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (rowDeleteModal.isOpen) {
        e.preventDefault();
        e.stopPropagation();
        if (!isDeletingRows) {
          setRowDeleteModal({ isOpen: false, studentsToDelete: [], progressToClearOnly: null });
        }
        return;
      }
      if (isExcludedModalOpen) {
        e.preventDefault();
        e.stopPropagation();
        setIsExcludedModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleModalEsc, { capture: true });
    return () => window.removeEventListener('keydown', handleModalEsc, { capture: true });
  }, [rowDeleteModal.isOpen, isDeletingRows, isExcludedModalOpen, isExcelExportModalOpen, isHonorBoardOpen]);

  // Persist StructuresView filters & selected structure whenever they change
  useEffect(() => {
    saveViewState('STRUCTURES_VIEW_STATE', {
      searchQuery,
      filterGrade,
      filterTerm,
      filterTrack,
      filterYear,
      filterSubject,
      filterStatus,
      filterCompletionStatus,
      filterProgressLevel,
      structureSortBy,
      studentListScope,
      selectedStructureId,
    });
  }, [
    searchQuery,
    filterGrade,
    filterTerm,
    filterTrack,
    filterYear,
    filterSubject,
    filterStatus,
    filterCompletionStatus,
    filterProgressLevel,
    structureSortBy,
    studentListScope,
    selectedStructureId,
  ]);

  const gradesList = useMemo(() => {
    const base = settings?.grades && settings.grades.length > 0 ? settings.grades : UAE_GRADES;
    const fromData = structures.map((s) => s.grade).filter(Boolean);
    return Array.from(new Set([...base, ...fromData]));
  }, [settings?.grades, structures]);

  const subjectsList = useMemo(() => {
    const base = settings?.subjects && settings.subjects.length > 0 ? settings.subjects : ['Mathematics'];
    const fromData = structures.map((s) => s.subject).filter(Boolean);
    return Array.from(new Set([...base, ...fromData]));
  }, [settings?.subjects, structures]);

  const tracksList = useMemo(() => {
    const fromData = structures.map((s) => s.track).filter(Boolean);
    return Array.from(new Set([...ACADEMIC_TRACKS, ...fromData]));
  }, [structures]);

  const yearsList = useMemo(() => {
    const fromData = structures.map((s) => s.academicYear).filter(Boolean);
    return Array.from(new Set([...ACADEMIC_YEARS, ...fromData]));
  }, [structures]);

  // Student map for quick lookups
  const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

  // Per-structure cohort completion & accuracy analytics (respecting excludedStudentIds + filterStatus)
  const structureCohortStatsMap = useMemo(() => {
    const map = new Map<
      string,
      {
        totalQuestions: number;
        eligibleCount: number;
        recordedCount: number;
        denominatorStudents: number;
        totalSolvedQuestions: number;
        totalExpectedQuestions: number;
        overallCompletionPct: number;
        recordedAvgCompletionPct: number;
        avgAccuracyPct: number;
      }
    >();

    // Group latest progress per structureId -> studentDocId
    const progressByStruct = new Map<string, Map<string, StudentStructureProgress>>();
    structureProgress.forEach((p) => {
      let stProgMap = progressByStruct.get(p.structureId);
      if (!stProgMap) {
        stProgMap = new Map<string, StudentStructureProgress>();
        progressByStruct.set(p.structureId, stProgMap);
      }
      const prev = stProgMap.get(p.studentDocId);
      if (!prev) {
        stProgMap.set(p.studentDocId, p);
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
        stProgMap.set(p.studentDocId, p);
      }
    });

    structures.forEach((st) => {
      const totalQ = Math.max(1, st.totalQuestions || st.questions?.length || 1);
      const excludedSet = new Set(st.excludedStudentIds || []);
      const rawLatestMap = progressByStruct.get(st.id) || new Map<string, StudentStructureProgress>();

      const activeLatestRecords: StudentStructureProgress[] = [];
      const activeRecordedStudentIds = new Set<string>();

      rawLatestMap.forEach((rec, studentDocId) => {
        if (excludedSet.has(studentDocId)) return;
        const studentObj = studentMap.get(studentDocId);
        if (studentObj) {
          const eff = getEffectiveEnrollmentStatus(studentObj);
          if (filterStatus === 'exclude_completed' && eff === 'completed') return;
          if (filterStatus !== 'الكل' && filterStatus !== 'exclude_completed' && eff !== filterStatus) {
            return;
          }
        }
        activeLatestRecords.push(rec);
        activeRecordedStudentIds.add(studentDocId);
      });

      let eligibleCount = 0;
      students.forEach((student) => {
        if (excludedSet.has(student.id)) return;
        const eff = getEffectiveEnrollmentStatus(student);
        if (filterStatus === 'exclude_completed' && eff === 'completed') return;
        if (filterStatus !== 'الكل' && filterStatus !== 'exclude_completed' && eff !== filterStatus) {
          return;
        }
        if (activeRecordedStudentIds.has(student.id)) {
          eligibleCount += 1;
          return;
        }
        if (student.grade !== st.grade) return;
        if (student.term && st.term && student.term !== st.term) return;
        if (student.track && st.track && student.track !== st.track) return;
        if (student.academicYear && st.academicYear && student.academicYear !== st.academicYear) return;
        eligibleCount += 1;
      });

      const recordedCount = activeLatestRecords.length;
      const denominatorStudents = Math.max(eligibleCount, recordedCount);
      const totalSolvedQuestions = activeLatestRecords.reduce(
        (sum, r) => sum + Math.min(totalQ, Math.max(0, r.solvedCount || 0)),
        0
      );
      const totalExpectedQuestions = denominatorStudents * totalQ;
      const overallCompletionPct =
        totalExpectedQuestions > 0
          ? Math.min(100, Math.round((totalSolvedQuestions / totalExpectedQuestions) * 1000) / 10)
          : 0;
      const recordedAvgCompletionPct =
        recordedCount > 0
          ? Math.round(
              (activeLatestRecords.reduce((a, b) => a + (b.completionPercentage || 0), 0) /
                recordedCount) *
                10
            ) / 10
          : 0;
      const avgAccuracyPct =
        recordedCount > 0
          ? Math.round(
              (activeLatestRecords.reduce((a, b) => a + (b.overallAccuracyPercentage || 0), 0) /
                recordedCount) *
                10
            ) / 10
          : 0;

      map.set(st.id, {
        totalQuestions: totalQ,
        eligibleCount,
        recordedCount,
        denominatorStudents,
        totalSolvedQuestions,
        totalExpectedQuestions,
        overallCompletionPct,
        recordedAvgCompletionPct,
        avgAccuracyPct,
      });
    });

    return map;
  }, [structures, structureProgress, students, studentMap, filterStatus]);

  // Structures matching metadata & search filters (before completion status split)
  const metadataFilteredStructures = useMemo(() => {
    return [...structures]
      .filter((st) => {
        if (filterGrade !== 'الكل' && st.grade !== filterGrade) return false;
        if (filterTerm !== 'الكل' && st.term !== filterTerm) return false;
        if (filterTrack !== 'الكل' && st.track !== filterTrack) return false;
        if (filterYear !== 'الكل' && st.academicYear !== filterYear) return false;
        if (filterSubject !== 'الكل' && st.subject !== filterSubject) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          const inTitle = (st.title || '').toLowerCase().includes(q);
          const inSubj = (st.subject || '').toLowerCase().includes(q);
          const inGrade = (st.grade || '').toLowerCase().includes(q);
          const inCode = (st.code || '').toLowerCase().includes(q);
          if (!inTitle && !inSubj && !inGrade && !inCode) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [structures, filterGrade, filterTerm, filterTrack, filterYear, filterSubject, searchQuery]);

  const structureCompletionCounts = useMemo(() => {
    let ongoing = 0;
    let studiedNotExamined = 0;
    let completed = 0;
    metadataFilteredStructures.forEach((st) => {
      const eff = getEffectiveStructureStatus(st);
      if (eff === 'completed') completed += 1;
      else if (eff === 'studied_not_examined') studiedNotExamined += 1;
      else ongoing += 1;
    });
    return {
      all: metadataFilteredStructures.length,
      ongoing,
      studiedNotExamined,
      completed,
    };
  }, [metadataFilteredStructures]);

  // Filtered Structures (completion status filter + progress level filter + sorting)
  const filteredStructures = useMemo(() => {
    const list = metadataFilteredStructures.filter((st) => {
      if (
        filterCompletionStatus !== 'all' &&
        getEffectiveStructureStatus(st) !== filterCompletionStatus
      ) {
        return false;
      }
      if (filterProgressLevel !== 'all') {
        const stats = structureCohortStatsMap.get(st.id);
        const pct = stats?.overallCompletionPct || 0;
        const recCount = stats?.recordedCount || 0;
        if (filterProgressLevel === 'completed_100' && pct < 100) return false;
        if (filterProgressLevel === 'in_progress' && (recCount === 0 || pct <= 0 || pct >= 100)) {
          return false;
        }
        if (filterProgressLevel === 'not_started' && recCount > 0) return false;
      }
      return true;
    });

    if (structureSortBy === 'newest') return list;

    return [...list].sort((a, b) => {
      const sa = structureCohortStatsMap.get(a.id);
      const sb = structureCohortStatsMap.get(b.id);
      if (structureSortBy === 'completion_desc') {
        return (sb?.overallCompletionPct || 0) - (sa?.overallCompletionPct || 0);
      }
      if (structureSortBy === 'completion_asc') {
        return (sa?.overallCompletionPct || 0) - (sb?.overallCompletionPct || 0);
      }
      if (structureSortBy === 'accuracy_desc') {
        return (sb?.avgAccuracyPct || 0) - (sa?.avgAccuracyPct || 0);
      }
      if (structureSortBy === 'students_desc') {
        return (sb?.recordedCount || 0) - (sa?.recordedCount || 0);
      }
      return 0;
    });
  }, [
    metadataFilteredStructures,
    filterCompletionStatus,
    filterProgressLevel,
    structureSortBy,
    structureCohortStatsMap,
  ]);

  // Global summary KPIs across structures for the 4 top statistical cards
  const globalStructuresSummary = useMemo(() => {
    let totalSolvedAll = 0;
    let totalExpectedAll = 0;
    let totalRecordedStudents = 0;
    let totalDenominatorStudents = 0;
    let accSum = 0;
    let accCount = 0;

    filteredStructures.forEach((st) => {
      const s = structureCohortStatsMap.get(st.id);
      if (!s) return;
      totalSolvedAll += s.totalSolvedQuestions;
      totalExpectedAll += s.totalExpectedQuestions;
      totalRecordedStudents += s.recordedCount;
      totalDenominatorStudents += s.denominatorStudents;
      if (s.recordedCount > 0) {
        accSum += s.avgAccuracyPct;
        accCount += 1;
      }
    });

    const overallCompletionPct =
      totalExpectedAll > 0
        ? Math.min(100, Math.round((totalSolvedAll / totalExpectedAll) * 1000) / 10)
        : 0;
    const avgAccuracyPct = accCount > 0 ? Math.round((accSum / accCount) * 10) / 10 : 0;

    return {
      totalAllStructures: structures.length,
      matchingMetadataCount: structureCompletionCounts.all,
      ongoingCount: structureCompletionCounts.ongoing,
      studiedNotExaminedCount: structureCompletionCounts.studiedNotExamined,
      completedCount: structureCompletionCounts.completed,
      filteredCount: filteredStructures.length,
      overallCompletionPct,
      totalRecordedStudents,
      totalDenominatorStudents,
      avgAccuracyPct,
    };
  }, [structures.length, structureCompletionCounts, filteredStructures, structureCohortStatsMap]);

  const hasAnyActiveStructureFilter =
    filterGrade !== 'الكل' ||
    filterTerm !== 'الكل' ||
    filterTrack !== 'الكل' ||
    filterYear !== 'الكل' ||
    filterSubject !== 'الكل' ||
    filterCompletionStatus !== 'all' ||
    filterProgressLevel !== 'all' ||
    structureSortBy !== 'newest' ||
    Boolean(searchQuery.trim());

  const handleResetStructureFilters = () => {
    setSearchQuery('');
    setFilterGrade('الكل');
    setFilterTerm('الكل');
    setFilterTrack('الكل');
    setFilterYear('الكل');
    setFilterSubject('الكل');
    setFilterCompletionStatus('all');
    setFilterProgressLevel('all');
    setFilterCompletionBucket('all');
    setStructureSortBy('newest');
  };

  const handleChangeStructureCompletionStatus = async (
    st: ExamStructure,
    nextStatus: StructureCompletionStatus
  ) => {
    if (togglingStructureId === st.id) return;
    if (getEffectiveStructureStatus(st) === nextStatus) return;
    const today = new Date().toISOString().split('T')[0];
    setTogglingStructureId(st.id);
    try {
      await onUpdateStructure(st.id, {
        completionStatus: nextStatus,
        completedAt: nextStatus === 'ongoing' ? '' : st.completedAt || today,
        updatedAt: new Date().toISOString(),
      });
    } finally {
      setTogglingStructureId(null);
    }
  };

  // Keep valid selectedStructureId
  useEffect(() => {
    if (filteredStructures.length === 0) {
      setSelectedStructureId('');
      return;
    }
    if (!filteredStructures.some((s) => s.id === selectedStructureId)) {
      setSelectedStructureId(filteredStructures[0].id);
    }
  }, [filteredStructures, selectedStructureId]);

  const selectedStructure = useMemo(
    () => filteredStructures.find((s) => s.id === selectedStructureId) || null,
    [filteredStructures, selectedStructureId]
  );

  // Reset multi-selection & bucket filter when switching structure and record latest activity
  useEffect(() => {
    setSelectedStudentIds(new Set());
    setFilterCompletionBucket('all');
    if (selectedStructure) {
      recordLastActivity({
        view: 'structures',
        tab: 'structures',
        structureId: selectedStructure.id,
        structureTitle: selectedStructure.title,
        actionLabel: tr(`قسم الهياكل: ${selectedStructure.title}`, `Structures: ${selectedStructure.title}`),
      });
    }
  }, [selectedStructure?.id, lang]);

  // Progress records for selected structure
  const selectedStructureProgress = useMemo(() => {
    if (!selectedStructure) return [];
    return structureProgress.filter((p) => p.structureId === selectedStructure.id);
  }, [structureProgress, selectedStructure]);

  // Latest progress per student for cohort analytics (uses most recent improved attempt)
  const latestStructureProgress = useMemo(() => {
    const map = new Map<string, StudentStructureProgress>();
    selectedStructureProgress.forEach((p) => {
      const prev = map.get(p.studentDocId);
      if (!prev) {
        map.set(p.studentDocId, p);
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
        map.set(p.studentDocId, p);
      }
    });
    return Array.from(map.values());
  }, [selectedStructureProgress]);

  // Progress attempts grouped by studentDocId (ascending by attemptNumber, then timestamp)
  const progressByStudentMap = useMemo(() => {
    const map = new Map<string, StudentStructureProgress[]>();
    selectedStructureProgress.forEach((p) => {
      const list = map.get(p.studentDocId) || [];
      list.push(p);
      map.set(p.studentDocId, list);
    });
    map.forEach((list) => {
      list.sort((a, b) => {
        const diff = (a.attemptNumber || 1) - (b.attemptNumber || 1);
        if (diff !== 0) return diff;
        return (
          new Date(a.updatedAt || a.createdAt || 0).getTime() -
          new Date(b.updatedAt || b.createdAt || 0).getTime()
        );
      });
    });
    return map;
  }, [selectedStructureProgress]);

  const excludedStudentIdSet = useMemo(
    () => new Set(selectedStructure?.excludedStudentIds || []),
    [selectedStructure]
  );

  const excludedStudentsInStructure = useMemo(
    () => students.filter((st) => excludedStudentIdSet.has(st.id)),
    [students, excludedStudentIdSet]
  );

  // Filtered students visible in the selected structure workspace (expanding multiple attempts like ScoreEntryModal)
  const workspaceStudentRows = useMemo(() => {
    if (!selectedStructure) return [];

    // Combine registered students with multi-attempt expansion
    const matchingStudents = students.filter((st) => {
      if (excludedStudentIdSet.has(st.id)) return false;

      const effStatus = getEffectiveEnrollmentStatus(st);
      if (filterStatus === 'exclude_completed' && effStatus === 'completed') return false;
      if (filterStatus !== 'الكل' && filterStatus !== 'exclude_completed' && effStatus !== filterStatus) {
        return false;
      }

      const hasProgress = progressByStudentMap.has(st.id);
      if (studentListScope === 'recorded_only') {
        return hasProgress;
      }
      if (studentListScope === 'all') {
        return true;
      }

      if (hasProgress) return true;
      if (st.grade !== selectedStructure.grade) return false;
      if (st.term && selectedStructure.term && st.term !== selectedStructure.term) return false;
      if (st.track && selectedStructure.track && st.track !== selectedStructure.track) return false;
      if (
        st.academicYear &&
        selectedStructure.academicYear &&
        st.academicYear !== selectedStructure.academicYear
      ) {
        return false;
      }
      return true;
    });

    const filteredBySearch = matchingStudents.filter((st) => {
      if (filterCompletionBucket !== 'all') {
        const attempts = progressByStudentMap.get(st.id) || [];
        const latest = attempts[attempts.length - 1];
        const totalQ = Math.max(
          1,
          selectedStructure.totalQuestions || selectedStructure.questions?.length || 1
        );
        const pct = latest
          ? latest.completionPercentage ??
            Math.round(((latest.solvedCount || 0) / totalQ) * 1000) / 10
          : 0;
        if (resolveCompletionBucket(pct) !== filterCompletionBucket) return false;
      }
      if (!studentPickerSearch.trim()) return true;
      const q = studentPickerSearch.trim().toLowerCase();
      return (
        st.name.toLowerCase().includes(q) ||
        st.studentId.toLowerCase().includes(q) ||
        (st.group || '').toLowerCase().includes(q)
      );
    });

    const sortedStudents = [...filteredBySearch].sort((a, b) => {
      const listA = progressByStudentMap.get(a.id);
      const listB = progressByStudentMap.get(b.id);
      if (listA && !listB) return -1;
      if (!listA && listB) return 1;
      if (listA && listB) {
        const latestA = listA[listA.length - 1];
        const latestB = listB[listB.length - 1];
        if (latestB.overallAccuracyPercentage !== latestA.overallAccuracyPercentage) {
          return latestB.overallAccuracyPercentage - latestA.overallAccuracyPercentage;
        }
      }
      return a.name.localeCompare(b.name, lang === 'en' ? 'en' : 'ar');
    });

    const expandedRows: Array<{
      rowKey: string;
      student: Student;
      progress: StudentStructureProgress | null;
      maxAttempt: number;
      latestAttempt: StudentStructureProgress | null;
    }> = [];

    sortedStudents.forEach((student) => {
      const attempts = progressByStudentMap.get(student.id) || [];
      if (attempts.length === 0) {
        expandedRows.push({
          rowKey: `${student.id}__empty`,
          student,
          progress: null,
          maxAttempt: 0,
          latestAttempt: null,
        });
      } else {
        const maxAttempt = Math.max(...attempts.map((a) => a.attemptNumber || 1), 1);
        const latestAttempt = attempts[attempts.length - 1];
        attempts.forEach((rec, idx) => {
          expandedRows.push({
            rowKey: rec.id || `${student.id}_attempt_${idx + 1}`,
            student,
            progress: rec,
            maxAttempt,
            latestAttempt,
          });
        });
      }
    });

    return expandedRows;
  }, [
    selectedStructure,
    excludedStudentIdSet,
    progressByStudentMap,
    students,
    filterStatus,
    studentListScope,
    filterCompletionBucket,
    studentPickerSearch,
  ]);

  // Unique visible students (preserving table order) for multi-selection & batch entry
  const uniqueVisibleStudents = useMemo(() => {
    const seen = new Set<string>();
    const list: Student[] = [];
    workspaceStudentRows.forEach(({ student }) => {
      if (!seen.has(student.id)) {
        seen.add(student.id);
        list.push(student);
      }
    });
    return list;
  }, [workspaceStudentRows]);

  const selectedBatchStudents = useMemo(
    () => students.filter((st) => selectedStudentIds.has(st.id)),
    [students, selectedStudentIds]
  );

  const allVisibleSelected =
    uniqueVisibleStudents.length > 0 &&
    uniqueVisibleStudents.every((st) => selectedStudentIds.has(st.id));

  const toggleSelectStudent = (studentDocId: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentDocId)) next.delete(studentDocId);
      else next.add(studentDocId);
      return next;
    });
  };

  const handleSelectAllVisibleStudents = () => {
    setSelectedStudentIds(new Set(uniqueVisibleStudents.map((s) => s.id)));
  };

  const handleSelectUnrecordedVisibleStudents = () => {
    setSelectedStudentIds(
      new Set(
        uniqueVisibleStudents
          .filter((s) => !progressByStudentMap.has(s.id))
          .map((s) => s.id)
      )
    );
  };

  const handleSelectSpecificStudentCount = (countRaw: number) => {
    const count = Math.max(1, Math.min(uniqueVisibleStudents.length, Math.floor(countRaw || 1)));
    setSelectedStudentIds(new Set(uniqueVisibleStudents.slice(0, count).map((s) => s.id)));
  };

  const handleClearStudentSelection = () => {
    setSelectedStudentIds(new Set());
  };

  // Cohort Question-by-Question Accuracy Analytics for Selected Structure (using latest attempt per student)
  const questionAnalytics = useMemo(() => {
    if (!selectedStructure) return [];
    const totalQ = Math.max(1, selectedStructure.totalQuestions || selectedStructure.questions?.length || 1);
    const activeProgress = latestStructureProgress.filter((p) => {
      const st = studentMap.get(p.studentDocId);
      if (!st) return true;
      const effStatus = getEffectiveEnrollmentStatus(st);
      if (filterStatus === 'exclude_completed' && effStatus === 'completed') return false;
      if (filterStatus !== 'الكل' && filterStatus !== 'exclude_completed' && effStatus !== filterStatus) {
        return false;
      }
      return true;
    });

    const list: Array<{
      questionNumber: number;
      title?: string;
      topic?: string;
      solvedByCount: number;
      totalStudents: number;
      avgAccuracy: number;
    }> = [];

    for (let q = 1; q <= totalQ; q++) {
      const qMeta = selectedStructure.questions?.find((item) => item.questionNumber === q);
      const solvedRecords = activeProgress
        .map((p) => (p.questionScores || []).find((qs) => qs.questionNumber === q))
        .filter((qs): qs is StructureQuestionScore => Boolean(qs && qs.solved));

      const avgAccuracy =
        solvedRecords.length > 0
          ? Math.round(
              (solvedRecords.reduce((acc, item) => acc + (Number(item.accuracyPercentage) || 0), 0) /
                solvedRecords.length) *
                10
            ) / 10
          : 0;

      list.push({
        questionNumber: q,
        title: qMeta?.title,
        topic: qMeta?.topic,
        solvedByCount: solvedRecords.length,
        totalStudents: activeProgress.length,
        avgAccuracy,
      });
    }
    return list;
  }, [selectedStructure, latestStructureProgress, studentMap, filterStatus]);

  // Summary metrics for selected structure (using latest attempt per student)
  const structureSummary = useMemo(() => {
    if (!selectedStructure) {
      return { recordedCount: 0, avgSolved: 0, avgCompletion: 0, avgAccuracy: 0 };
    }
    const relevantProgress = latestStructureProgress.filter((p) => {
      const st = studentMap.get(p.studentDocId);
      if (!st) return true;
      const eff = getEffectiveEnrollmentStatus(st);
      if (filterStatus === 'exclude_completed' && eff === 'completed') return false;
      if (filterStatus !== 'الكل' && filterStatus !== 'exclude_completed' && eff !== filterStatus) {
        return false;
      }
      return true;
    });

    const count = relevantProgress.length;
    if (count === 0) {
      return { recordedCount: 0, avgSolved: 0, avgCompletion: 0, avgAccuracy: 0 };
    }

    const avgSolved =
      Math.round((relevantProgress.reduce((a, b) => a + (b.solvedCount || 0), 0) / count) * 10) / 10;
    const avgCompletion =
      Math.round(
        (relevantProgress.reduce((a, b) => a + (b.completionPercentage || 0), 0) / count) * 10
      ) / 10;
    const avgAccuracy =
      Math.round(
        (relevantProgress.reduce((a, b) => a + (b.overallAccuracyPercentage || 0), 0) / count) * 10
      ) / 10;

    return { recordedCount: count, avgSolved, avgCompletion, avgAccuracy };
  }, [selectedStructure, latestStructureProgress, studentMap, filterStatus]);

  const handleExportCurrentStructuresExcel = () => {
    const prefs = loadExcelPreferences();
    const chosenStudentIds: string[] | undefined =
      selectedStudentIds.size > 0 ? Array.from<string>(selectedStudentIds) : undefined;
    exportStructuresReportExcel(structures, structureProgress, students, {
      ...prefs,
      structureCompletionStatus: filterCompletionStatus,
      structureId: selectedStructure ? selectedStructure.id : 'الكل',
      structureIds: selectedStructure ? [selectedStructure.id] : undefined,
      studentIds: chosenStudentIds,
      grade: filterGrade,
      term: filterTerm,
      track: filterTrack,
      academicYear: filterYear,
      subject: filterSubject,
      enrollmentStatus: filterStatus,
      filterLabel: selectedStructure
        ? `${selectedStructure.title} (${selectedStructure.grade} - ${selectedStructure.term} - ${selectedStructure.track})`
        : `الصف: ${filterGrade} | الفصل: ${filterTerm} | المسار: ${filterTrack}`,
    });
  };

  return (
    <div id="structures-view" dir={dir} className="space-y-5 text-start">
      {/* Page Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-amber-500" />
            <span>{tr('قسم الهياكل ومتابعة حل الأسئلة ونسب الصحة', 'Structures & Question Accuracy Tracking')}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {tr(
              'تسجيل الهياكل بالصف والفصل والمسار والسنة والمادة، ورصد عدد الأسئلة المحلولة ونسبة صحة كل سؤال لكل طالب',
              'Register exam structures by grade, term, track, year, and subject, and track solved questions and per-question accuracy for every student'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-structures-honor-board"
            type="button"
            onClick={() => setIsHonorBoardOpen(true)}
            disabled={structures.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-black text-slate-950 bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 hover:from-amber-200 hover:to-orange-300 rounded-xl transition cursor-pointer shadow-md shadow-amber-500/20 disabled:opacity-50 whitespace-nowrap shrink-0"
            title={tr(
              'تصميم وتصدير لوحات شرف قسم الهياكل باللوجو وشعار المعلم وكافة التقسيمات',
              'Design and export Structures Honor Boards with logo and breakdowns'
            )}
          >
            <Award className="w-4 h-4 text-slate-950" />
            <span>{tr('لوحة شرف الهياكل 📸', 'Structures Honor Board 📸')}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExcelExportModalOpen(true)}
            disabled={structures.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
            title={tr(
              'فتح مركز تصدير Excel المخصص للهياكل (وضع الهاتف / الكمبيوتر / الرسوم البيانية / اللوجو / الفلاتر)',
              'Open custom Excel export center for structures (mobile/desktop/charts/logo/filters)'
            )}
          >
            <Sliders className="w-4 h-4 text-amber-500" />
            <span>{tr('تصدير Excel مخصص للهياكل', 'Custom Structures Excel')}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCurrentStructuresExcel}
            disabled={structures.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 rounded-xl transition cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>
              {selectedStudentIds.size > 0
                ? tr(`تصدير شيت الهياكل (${selectedStudentIds.size} محدد)`, `Export Structures Sheet (${selectedStudentIds.size} selected)`)
                : tr('تصدير شيت الهياكل', 'Export Structures Sheet')}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              selectedStructure &&
              setReminderModalState({
                isOpen: true,
                studentIds:
                  selectedStudentIds.size > 0
                    ? Array.from<string>(selectedStudentIds)
                    : undefined,
                audienceLabel:
                  selectedStudentIds.size > 0
                    ? tr(`الطلاب المحددون (${selectedStudentIds.size})`, `Selected Students (${selectedStudentIds.size})`)
                    : undefined,
              })
            }
            disabled={!selectedStructure}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-rose-700 dark:text-rose-200 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 rounded-xl transition cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
            title={tr(
              'فتح مركز تذكير ومتابعة الطلاب عبر الواتساب أو البريد أو نسخ الرسائل',
              'Open student reminder and follow-up center via WhatsApp, email, or copy'
            )}
          >
            <BellRing className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span>
              {selectedStudentIds.size > 0
                ? tr(`تذكير الطلاب (${selectedStudentIds.size})`, `Remind Students (${selectedStudentIds.size})`)
                : tr('تذكير الطلاب', 'Remind Students')}
            </span>
          </button>

          <button
            id="btn-add-structure"
            type="button"
            onClick={() => {
              setEditingStructure(null);
              setIsStructureModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-black text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl transition cursor-pointer shadow-md shadow-amber-500/20 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{tr('إضافة هيكل جديد', 'Add New Structure')}</span>
          </button>
        </div>
      </div>

      {/* Overview Statistical Cards (Interactive KPI Strip for Structures Tab) */}
      {structures.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <button
              type="button"
              onClick={() => setFilterCompletionStatus('all')}
              className={`p-3.5 sm:p-4 rounded-2xl border text-start transition cursor-pointer ${
                filterCompletionStatus === 'all'
                  ? 'bg-amber-50/70 dark:bg-amber-950/25 border-amber-400 dark:border-amber-700'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {tr('إجمالي الهياكل', 'Total Structures')}
                </span>
                <Layers className="w-4 h-4 text-amber-500 shrink-0" />
              </div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white font-mono tabular-nums">
                  {globalStructuresSummary.matchingMetadataCount}
                </span>
                {globalStructuresSummary.matchingMetadataCount !==
                  globalStructuresSummary.totalAllStructures && (
                  <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                    {tr('من', 'of')} {globalStructuresSummary.totalAllStructures}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                {tr(
                  `المعروض حسب الفلاتر: ${globalStructuresSummary.filteredCount} هيكل`,
                  `Shown by filters: ${globalStructuresSummary.filteredCount} structures`
                )}
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                setFilterCompletionStatus((prev) => (prev === 'ongoing' ? 'all' : 'ongoing'))
              }
              className={`p-3.5 sm:p-4 rounded-2xl border text-start transition cursor-pointer ${
                filterCompletionStatus === 'ongoing'
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500 dark:border-emerald-700'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-800'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {tr('الهياكل الجارية', 'Ongoing Structures')}
                </span>
                <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              </div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                  {globalStructuresSummary.ongoingCount}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  (
                  {globalStructuresSummary.matchingMetadataCount > 0
                    ? Math.round(
                        (globalStructuresSummary.ongoingCount /
                          globalStructuresSummary.matchingMetadataCount) *
                          100
                      )
                    : 0}
                  %)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                {tr('مستمر وجاري الدراسة · اضغط للفرز', 'Ongoing study · Click to filter')}
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                setFilterCompletionStatus((prev) =>
                  prev === 'studied_not_examined' ? 'all' : 'studied_not_examined'
                )
              }
              className={`p-3.5 sm:p-4 rounded-2xl border text-start transition cursor-pointer ${
                filterCompletionStatus === 'studied_not_examined'
                  ? 'bg-amber-50/90 dark:bg-amber-950/35 border-amber-500 dark:border-amber-700'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-800'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {tr('منتهي دراسة (لم يُمتحن)', 'Studied (Pending Exam)')}
                </span>
                <BookOpenCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              </div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                  {globalStructuresSummary.studiedNotExaminedCount}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  (
                  {globalStructuresSummary.matchingMetadataCount > 0
                    ? Math.round(
                        (globalStructuresSummary.studiedNotExaminedCount /
                          globalStructuresSummary.matchingMetadataCount) *
                          100
                      )
                    : 0}
                  %)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                {tr('بانتظار الامتحان · اضغط للفرز', 'Awaiting exam · Click to filter')}
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                setFilterCompletionStatus((prev) => (prev === 'completed' ? 'all' : 'completed'))
              }
              className={`p-3.5 sm:p-4 rounded-2xl border text-start transition cursor-pointer ${
                filterCompletionStatus === 'completed'
                  ? 'bg-indigo-50/80 dark:bg-indigo-950/30 border-indigo-500 dark:border-indigo-700'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {tr('منتهي وتم الامتحان', 'Completed & Examined')}
                </span>
                <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              </div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono tabular-nums">
                  {globalStructuresSummary.completedCount}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  (
                  {globalStructuresSummary.matchingMetadataCount > 0
                    ? Math.round(
                        (globalStructuresSummary.completedCount /
                          globalStructuresSummary.matchingMetadataCount) *
                          100
                      )
                    : 0}
                  %)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                {tr('انتهى وتم امتحان المادة · اضغط للفرز', 'Completed & examined · Click to filter')}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setShowCompletionBreakdownPanel((prev) => !prev)}
              className={`col-span-2 sm:col-span-2 lg:col-span-1 p-3.5 sm:p-4 rounded-2xl border text-start transition cursor-pointer ${
                showCompletionBreakdownPanel
                  ? 'bg-slate-100/90 dark:bg-slate-800 border-amber-500'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-700'
              }`}
              title={tr(
                'عرض أو إخفاء جدول نسبة الإنجاز الكلية لجميع الطلاب في كل هيكل',
                'Show or hide overall student completion rate breakdown per structure'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  {tr('نسبة الإنجاز الكلية للطلاب', 'Overall Student Completion')}
                </span>
                <TrendingUp className="w-4 h-4 text-amber-500 shrink-0" />
              </div>
              <div className="mt-1.5 flex items-baseline justify-between gap-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white font-mono tabular-nums">
                  {globalStructuresSummary.overallCompletionPct}%
                </span>
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 inline-flex items-center gap-0.5 whitespace-nowrap">
                  <span>{tr('كل هيكل', 'Per Structure')}</span>
                  {showCompletionBreakdownPanel ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-amber-500 transition-all"
                  style={{ width: `${Math.min(100, globalStructuresSummary.overallCompletionPct)}%` }}
                />
              </div>
            </button>
          </div>

          {/* Expandable Per-Structure Student Completion Summary Table */}
          {showCompletionBreakdownPanel && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-amber-500 shrink-0" />
                  <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                    {tr(
                      `ملخص نسبة الإنجاز الكلية لجميع الطلاب في كل هيكل (${filteredStructures.length} هيكل)`,
                      `Overall Student Completion Summary per Structure (${filteredStructures.length} structures)`
                    )}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCompletionBreakdownPanel(false)}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
                >
                  {tr('إغلاق الملخص', 'Close Summary')}
                </button>
              </div>

              {filteredStructures.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  {tr('لا توجد هياكل مطابقة لمعايير الفلترة الحالية', 'No structures match the current filters')}
                </div>
              ) : (
                <div className="overflow-x-auto max-h-72 overflow-y-auto">
                  <table className="w-full text-start text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/70 text-[11px] font-bold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">{tr('الهيكل', 'Structure')}</th>
                        <th className="py-2.5 px-3">{tr('الحالة', 'Status')}</th>
                        <th className="py-2.5 px-3">{tr('الطلاب المرصودون', 'Recorded Students')}</th>
                        <th className="py-2.5 px-3 min-w-[170px]">{tr('نسبة الإنجاز الكلية لجميع الطلاب', 'Overall Completion Rate')}</th>
                        <th className="py-2.5 px-3">{tr('متوسط الصحة', 'Avg Accuracy')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredStructures.map((st) => {
                        const stats = structureCohortStatsMap.get(st.id);
                        const pct = stats?.overallCompletionPct || 0;
                        const effStatus = getEffectiveStructureStatus(st);
                        const isSelectedRow = selectedStructure?.id === st.id;
                        return (
                          <tr
                            key={`summary-row-${st.id}`}
                            onClick={() => setSelectedStructureId(st.id)}
                            className={`cursor-pointer transition ${
                              isSelectedRow
                                ? 'bg-amber-50/70 dark:bg-amber-950/20'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900 dark:text-white">
                                {st.title}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {translateGrade(st.grade, lang)} · {translateTrack(st.track, lang)} · {translateSubject(st.subject, lang)} · {translateTerm(st.term, lang)}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                                  effStatus === 'completed'
                                    ? 'text-indigo-600 dark:text-indigo-400'
                                    : effStatus === 'studied_not_examined'
                                    ? 'text-amber-600 dark:text-amber-400'
                                    : 'text-emerald-600 dark:text-emerald-400'
                                }`}
                              >
                                {effStatus === 'completed' ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                ) : effStatus === 'studied_not_examined' ? (
                                  <BookOpenCheck className="w-3.5 h-3.5 shrink-0" />
                                ) : (
                                  <Clock className="w-3.5 h-3.5 shrink-0" />
                                )}
                                <span>{lang === 'en' ? STRUCTURE_STATUS_META[effStatus].shortLabelEn : STRUCTURE_STATUS_META[effStatus].shortLabel}</span>
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono tabular-nums whitespace-nowrap text-slate-700 dark:text-slate-300">
                              {stats?.recordedCount || 0} / {stats?.denominatorStudents || 0} {tr('طالب', 'students')}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full transition-all ${
                                      pct >= 80
                                        ? 'bg-emerald-500'
                                        : pct >= 40
                                        ? 'bg-amber-500'
                                        : 'bg-slate-400'
                                    }`}
                                    style={{ width: `${Math.min(100, pct)}%` }}
                                  />
                                </div>
                                <span className="font-mono tabular-nums font-black text-slate-900 dark:text-white w-12 text-end">
                                  {pct}%
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                              {(stats?.recordedCount || 0) > 0 ? `${stats?.avgAccuracyPct}%` : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-8 gap-2 sm:gap-2.5">
          <div className="relative col-span-2 sm:col-span-3 lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={tr('ابحث باسم الهيكل أو الكود أو المادة...', 'Search by structure title, code, or subject...')}
              className="w-full ps-9 pe-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-amber-500"
            />
          </div>

          <select
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
            title={tr('الصف الدراسي', 'Grade')}
          >
            <option value="الكل">{tr('كل الصفوف', 'All Grades')}</option>
            {gradesList.map((g) => (
              <option key={g} value={g}>{translateGrade(g, lang)}</option>
            ))}
          </select>

          <select
            value={filterTerm}
            onChange={(e) => setFilterTerm(e.target.value)}
            className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
            title={tr('الفصل الدراسي', 'Term')}
          >
            <option value="الكل">{tr('كل الفصول', 'All Terms')}</option>
            {ACADEMIC_TERMS.map((t) => (
              <option key={t} value={t}>{translateTerm(t, lang)}</option>
            ))}
          </select>

          <select
            value={filterTrack}
            onChange={(e) => setFilterTrack(e.target.value)}
            className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
            title={tr('المسار', 'Track')}
          >
            <option value="الكل">{tr('كل المسارات', 'All Tracks')}</option>
            {tracksList.map((trackOpt) => (
              <option key={trackOpt} value={trackOpt}>{translateTrack(trackOpt, lang)}</option>
            ))}
          </select>

          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
            title={tr('السنة الدراسية', 'Academic Year')}
          >
            <option value="الكل">{tr('كل السنوات', 'All Years')}</option>
            {yearsList.map((yr) => (
              <option key={yr} value={yr}>{yr}</option>
            ))}
          </select>

          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
            title={tr('المادة', 'Subject')}
          >
            <option value="الكل">{tr('كل المواد', 'All Subjects')}</option>
            {subjectsList.map((sb) => (
              <option key={sb} value={sb}>{translateSubject(sb, lang)}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
            title={tr('حالة ملف الطالب', 'Student Enrollment Status')}
          >
            <option value="exclude_completed">{tr('استبعاد منتهي الملف', 'Exclude Completed Files')}</option>
            <option value="active">{tr('ملف فعال فقط', 'Active Only')}</option>
            <option value="completed">{tr('منتهي الكورس فقط', 'Completed Course Only')}</option>
            <option value="paused">{tr('متوقف مؤقتاً', 'Paused')}</option>
            <option value="withdrawn">{tr('منقطع', 'Withdrawn')}</option>
            <option value="الكل">{tr('جميع حالات الملف', 'All Enrollment Statuses')}</option>
          </select>
        </div>

        {/* Structure Completion Status Segmented Filter + Progress Level + Sort */}
        <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-bold">
              <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" />
              <span>{tr('حالة الهيكل:', 'Structure Status:')}</span>
            </div>

            <div className="inline-flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px]">
              <button
                type="button"
                onClick={() => setFilterCompletionStatus('all')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer whitespace-nowrap ${
                  filterCompletionStatus === 'all'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60'
                }`}
              >
                {tr(`جميع الهياكل (${structureCompletionCounts.all})`, `All Structures (${structureCompletionCounts.all})`)}
              </button>
              <button
                type="button"
                onClick={() => setFilterCompletionStatus('ongoing')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer whitespace-nowrap ${
                  filterCompletionStatus === 'ongoing'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60'
                }`}
              >
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>{tr(`مستمر وجاري الدراسة (${structureCompletionCounts.ongoing})`, `Ongoing (${structureCompletionCounts.ongoing})`)}</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterCompletionStatus('studied_not_examined')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer whitespace-nowrap ${
                  filterCompletionStatus === 'studied_not_examined'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60'
                }`}
              >
                <BookOpenCheck className="w-3.5 h-3.5 shrink-0" />
                <span>{tr(`منتهي دراسته ولم يُمتحن (${structureCompletionCounts.studiedNotExamined})`, `Studied / Pending Exam (${structureCompletionCounts.studiedNotExamined})`)}</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterCompletionStatus('completed')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer whitespace-nowrap ${
                  filterCompletionStatus === 'completed'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{tr(`انتهى وتم امتحان المادة (${structureCompletionCounts.completed})`, `Completed & Examined (${structureCompletionCounts.completed})`)}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterProgressLevel}
              onChange={(e) =>
                setFilterProgressLevel(
                  e.target.value as 'all' | 'completed_100' | 'in_progress' | 'not_started'
                )
              }
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
              title={tr('فلترة حسب مستوى إنجاز الطلاب', 'Filter by student completion level')}
            >
              <option value="all">{tr('كل مستويات الإنجاز', 'All Completion Levels')}</option>
              <option value="completed_100">{tr('مكتمل الإنجاز (100%)', 'Completed (100%)')}</option>
              <option value="in_progress">{tr('قيد الإنجاز (مرصود جزئياً)', 'In Progress (Partial)')}</option>
              <option value="not_started">{tr('لم يبدأ الرصد بعد (0%)', 'Not Started (0%)')}</option>
            </select>

            <div className="inline-flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={structureSortBy}
                onChange={(e) =>
                  setStructureSortBy(
                    e.target.value as
                      | 'newest'
                      | 'completion_desc'
                      | 'completion_asc'
                      | 'accuracy_desc'
                      | 'students_desc'
                  )
                }
                className="bg-transparent text-[11px] font-bold text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-hidden"
                title={tr('ترتيب قائمة الهياكل', 'Sort structures list')}
              >
                <option value="newest">{tr('الترتيب: الأحدث', 'Sort: Newest')}</option>
                <option value="completion_desc">{tr('الأعلى نسبة إنجاز', 'Highest Completion')}</option>
                <option value="completion_asc">{tr('الأقل نسبة إنجاز', 'Lowest Completion')}</option>
                <option value="accuracy_desc">{tr('الأعلى نسبة صحة', 'Highest Accuracy')}</option>
                <option value="students_desc">{tr('الأكثر طلاباً مرصودين', 'Most Recorded Students')}</option>
              </select>
            </div>

            {hasAnyActiveStructureFilter && (
              <button
                type="button"
                onClick={handleResetStructureFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-100 cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{tr('إعادة ضبط الفلاتر', 'Reset Filters')}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Empty State when no structures exist */}
      {structures.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Layers className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              {tr('لم يتم تسجيل أي هياكل بعد', 'No Structures Registered Yet')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
              {tr(
                'ابدأ بإضافة أول هيكل مع تحديد الصف والفصل والمسار والسنة الدراسية والمادة وعدد الأسئلة، ثم رصد حل كل طالب ونسبة صحة كل سؤال بسهولة.',
                'Start by adding your first structure with grade, term, track, academic year, subject, and question count, then easily track student progress and per-question accuracy.'
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingStructure(null);
              setIsStructureModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-black text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{tr('تسجيل أول هيكل', 'Register First Structure')}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left/Right Column 1: List of Structures */}
          <div className="lg:col-span-4 space-y-2.5">
            <div className="flex items-center justify-between px-1 text-xs">
              <span className="font-black text-slate-700 dark:text-slate-200">
                {tr(`قائمة الهياكل المسجلة (${filteredStructures.length})`, `Registered Structures (${filteredStructures.length})`)}
              </span>
              {hasAnyActiveStructureFilter && (
                <button
                  type="button"
                  onClick={handleResetStructureFilters}
                  className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  {tr('إعادة ضبط الفلاتر', 'Reset Filters')}
                </button>
              )}
            </div>

            {filteredStructures.length === 0 ? (
              <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                {tr('لا توجد هياكل تطابق معايير البحث الحالية', 'No structures match the current search criteria')}
              </div>
            ) : (
              <div className="space-y-2 max-h-[680px] overflow-y-auto pe-0.5">
                {filteredStructures.map((st) => {
                  const isSelected = selectedStructure?.id === st.id;
                  const cardCohortStats = structureCohortStatsMap.get(st.id);
                  const countRecorded = cardCohortStats?.recordedCount ?? 0;
                  const avgAcc = Math.round(cardCohortStats?.avgAccuracyPct ?? 0);
                  const effCompStatus = getEffectiveStructureStatus(st);
                  const compMeta = STRUCTURE_STATUS_META[effCompStatus];
                  const nextCompStatus = getNextStructureStatus(effCompStatus);

                  return (
                    <div
                      key={st.id}
                      onClick={() => setSelectedStructureId(st.id)}
                      className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                        isSelected
                          ? 'bg-amber-50/70 dark:bg-amber-950/25 border-amber-500 ring-1 ring-amber-500/30'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="font-black text-sm text-slate-900 dark:text-white truncate">
                              {st.title}
                            </h3>
                            {st.code && (
                              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
                                {st.code}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold ${compMeta.badgeClass}`}
                            >
                              {effCompStatus === 'completed' ? (
                                <CheckCircle2 className="w-3 h-3 shrink-0" />
                              ) : effCompStatus === 'studied_not_examined' ? (
                                <BookOpenCheck className="w-3 h-3 shrink-0" />
                              ) : (
                                <Clock className="w-3 h-3 shrink-0" />
                              )}
                              <span>{getStructureStatusLabel(st, true, lang)}</span>
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                            {translateGrade(st.grade, lang)} • {translateTerm(st.term, lang)} • {tr('مسار', 'Track')} {translateTrack(st.track, lang)}
                          </p>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 font-medium">
                            {translateSubject(st.subject, lang)} · <span className="font-mono tabular-nums">{st.academicYear}</span>
                            {st.examDate && effCompStatus !== 'completed' && (
                              <>
                                {' '}·{' '}
                                <span className="font-mono tabular-nums text-rose-600 dark:text-rose-400 font-bold">
                                  {tr('امتحان:', 'Exam:')} {st.examDate}
                                </span>
                              </>
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            disabled={togglingStructureId === st.id}
                            onClick={() => handleChangeStructureCompletionStatus(st, nextCompStatus)}
                            className={`p-1.5 rounded-lg cursor-pointer transition disabled:opacity-50 ${
                              effCompStatus === 'completed'
                                ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60'
                                : effCompStatus === 'studied_not_examined'
                                ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60'
                                : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                            }`}
                            title={
                              lang === 'en'
                                ? `${compMeta.labelEn} — Click to switch to "${STRUCTURE_STATUS_META[nextCompStatus].labelEn}"`
                                : `${compMeta.label} — اضغط للتبديل إلى «${STRUCTURE_STATUS_META[nextCompStatus].label}»`
                            }
                          >
                            {effCompStatus === 'completed' ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : effCompStatus === 'studied_not_examined' ? (
                              <BookOpenCheck className="w-3.5 h-3.5" />
                            ) : (
                              <Clock className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingStructure(st);
                              setIsStructureModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                            title={tr('تعديل الهيكل', 'Edit Structure')}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteStructure(st)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg cursor-pointer"
                            title={tr('حذف الهيكل', 'Delete Structure')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {(() => {
                        const cardCohortStats = structureCohortStatsMap.get(st.id);
                        const overallPct = cardCohortStats?.overallCompletionPct ?? 0;
                        const recStu = cardCohortStats?.recordedCount ?? countRecorded;
                        const totalStu = cardCohortStats?.denominatorStudents ?? countRecorded;
                        return (
                          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                            <div>
                              <div className="flex items-center justify-between text-[11px] mb-1">
                                <span className="text-slate-500 dark:text-slate-400 font-bold">
                                  {tr('نسبة الإنجاز الكلية للطلاب', 'Overall Student Completion')}
                                </span>
                                <span className="font-mono tabular-nums font-black text-slate-900 dark:text-white">
                                  {overallPct}%
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all ${
                                    overallPct >= 80
                                      ? 'bg-emerald-500'
                                      : overallPct >= 40
                                      ? 'bg-amber-500'
                                      : 'bg-slate-400'
                                  }`}
                                  style={{ width: `${Math.min(100, overallPct)}%` }}
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                              <span className="text-slate-600 dark:text-slate-300">
                                {tr('الأسئلة:', 'Questions:')} <strong className="text-slate-900 dark:text-white">{st.totalQuestions}</strong>
                              </span>
                              <span className="text-slate-600 dark:text-slate-300">
                                {tr('مرصود:', 'Recorded:')} <strong className="text-amber-600 dark:text-amber-400">{recStu}/{totalStu}</strong>
                              </span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                {recStu > 0 ? tr(`${avgAcc}% صحة`, `${avgAcc}% Acc.`) : tr('جديد', 'New')}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Column 2: Selected Structure Details, Question Accuracy Analytics & Student Records */}
          <div className="lg:col-span-8 space-y-4">
            {selectedStructure && (
              <>
                {/* Selected Structure Header & Summary Metrics */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-black text-slate-900 dark:text-white">
                          {selectedStructure.title}
                        </h2>
                        {selectedStructure.code && (
                          <span className="font-mono text-[11px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700">
                            {selectedStructure.code}
                          </span>
                        )}
                        {(() => {
                          const selStatus = getEffectiveStructureStatus(selectedStructure);
                          const selMeta = STRUCTURE_STATUS_META[selStatus];
                          return (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg border text-[11px] font-bold ${selMeta.badgeClass}`}
                            >
                              {selStatus === 'completed' ? (
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              ) : selStatus === 'studied_not_examined' ? (
                                <BookOpenCheck className="w-3.5 h-3.5 shrink-0" />
                              ) : (
                                <Clock className="w-3.5 h-3.5 shrink-0" />
                              )}
                              <span>{getStructureStatusLabel(selectedStructure, false, lang)}</span>
                            </span>
                          );
                        })()}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>{tr('الصف:', 'Grade:')} <strong className="text-slate-800 dark:text-slate-200">{translateGrade(selectedStructure.grade, lang)}</strong></span>
                        <span>•</span>
                        <span>{tr('الفصل:', 'Term:')} <strong className="text-slate-800 dark:text-slate-200">{translateTerm(selectedStructure.term, lang)}</strong></span>
                        <span>•</span>
                        <span>{tr('المسار:', 'Track:')} <strong className="text-amber-600 dark:text-amber-400">{translateTrack(selectedStructure.track, lang)}</strong></span>
                        <span>•</span>
                        <span>{tr('السنة:', 'Year:')} <strong className="font-mono text-slate-800 dark:text-slate-200">{selectedStructure.academicYear}</strong></span>
                        <span>•</span>
                        <span>{tr('المادة:', 'Subject:')} <strong className="text-slate-800 dark:text-slate-200">{translateSubject(selectedStructure.subject, lang)}</strong></span>
                        {selectedStructure.group && selectedStructure.group !== 'الكل' && (
                          <>
                            <span>•</span>
                            <span>{tr('الشعبة:', 'Group:')} <strong className="text-slate-800 dark:text-slate-200">{selectedStructure.group}</strong></span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <div className="inline-flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px]">
                        {STRUCTURE_STATUS_ORDER.map((statusKey) => {
                          const meta = STRUCTURE_STATUS_META[statusKey];
                          const isCurrent = getEffectiveStructureStatus(selectedStructure) === statusKey;
                          return (
                            <button
                              key={statusKey}
                              type="button"
                              disabled={togglingStructureId === selectedStructure.id}
                              onClick={() =>
                                handleChangeStructureCompletionStatus(selectedStructure, statusKey)
                              }
                              title={lang === 'en' ? meta.descriptionEn : meta.description}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold transition cursor-pointer disabled:opacity-60 whitespace-nowrap ${
                                isCurrent
                                  ? meta.activeBtnClass
                                  : 'text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-700/70'
                              }`}
                            >
                              {statusKey === 'completed' ? (
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              ) : statusKey === 'studied_not_examined' ? (
                                <BookOpenCheck className="w-3.5 h-3.5 shrink-0" />
                              ) : (
                                <Clock className="w-3.5 h-3.5 shrink-0" />
                              )}
                              <span>{lang === 'en' ? meta.shortLabelEn : meta.shortLabel}</span>
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setReminderModalState({
                            isOpen: true,
                            studentIds:
                              selectedStudentIds.size > 0
                                ? Array.from<string>(selectedStudentIds)
                                : undefined,
                            audienceLabel:
                              selectedStudentIds.size > 0
                                ? tr(`الطلاب المحددون (${selectedStudentIds.size})`, `Selected Students (${selectedStudentIds.size})`)
                                : undefined,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-700 dark:text-rose-200 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 rounded-xl transition cursor-pointer shrink-0 whitespace-nowrap"
                        title={tr('إرسال تذكير أو متابعة للطلاب أو أولياء الأمور', 'Send reminder or follow-up to students or parents')}
                      >
                        <BellRing className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                        <span>{tr('تذكير الطلاب', 'Remind Students')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowAddAnyStudentPicker((prev) => !prev)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-black text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition cursor-pointer shrink-0 whitespace-nowrap"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>{tr('تسجيل حل طالب بالهيكل', 'Record Student Progress')}</span>
                      </button>
                    </div>
                  </div>

                  {/* Quick Summary KPIs (flat tabular cards, no heavy shadows) */}
                  {(() => {
                    const selectedCohortStats = structureCohortStatsMap.get(selectedStructure.id);
                    const overallCohortPct = selectedCohortStats?.overallCompletionPct ?? 0;
                    const eligibleTotal = selectedCohortStats?.denominatorStudents ?? structureSummary.recordedCount;
                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800">
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                            {tr('إجمالي أسئلة الهيكل', 'Total Questions')}
                          </span>
                          <span className="text-xl font-black text-slate-900 dark:text-white font-mono tabular-nums mt-0.5 block">
                            {selectedStructure.totalQuestions} {tr('سؤال', 'Q')}
                          </span>
                        </div>

                        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800">
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                            {tr('الطلاب المرصودين', 'Recorded Students')}
                          </span>
                          <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono tabular-nums mt-0.5 block">
                            {structureSummary.recordedCount} / {eligibleTotal} {tr('طالب', 'students')}
                          </span>
                        </div>

                        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800">
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                            {tr('نسبة الإنجاز الكلية للطلاب', 'Overall Completion Rate')}
                          </span>
                          <span className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono tabular-nums mt-0.5 block">
                            {overallCohortPct}%
                          </span>
                          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-1.5">
                            <div
                              className="h-full bg-amber-500 transition-all"
                              style={{ width: `${Math.min(100, overallCohortPct)}%` }}
                            />
                          </div>
                        </div>

                        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800">
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                            {tr('متوسط الأسئلة المحلولة', 'Avg Solved Questions')}
                          </span>
                          <span className="text-xl font-black text-slate-900 dark:text-white font-mono tabular-nums mt-0.5 block">
                            {structureSummary.avgSolved} / {selectedStructure.totalQuestions}
                          </span>
                        </div>

                        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-800">
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                            {tr('متوسط نسبة الصحة العامة', 'Average Overall Accuracy')}
                          </span>
                          <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-0.5 block">
                            {structureSummary.avgAccuracy}%
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Quick Any-Student Picker Dropdown when clicking "تسجيل حل طالب بالهيكل" */}
                  {showAddAnyStudentPicker && (
                    <div className="p-3.5 bg-amber-50/60 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800/60 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-slate-900 dark:text-white">
                          {tr(
                            'اختر طالباً من القائمة لرصد حل الأسئلة ونسبة صحة كل سؤال:',
                            'Select a student from the list to record solved questions and per-question accuracy:'
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowAddAnyStudentPicker(false)}
                          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={studentPickerSearch}
                        onChange={(e) => setStudentPickerSearch(e.target.value)}
                        placeholder={tr('اكتب اسم الطالب أو رقمه التعريفي...', 'Type student name or ID...')}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                      />
                      <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        {students
                          .filter((st) => {
                            if (!studentPickerSearch.trim()) return true;
                            const q = studentPickerSearch.trim().toLowerCase();
                            return (
                              st.name.toLowerCase().includes(q) ||
                              st.studentId.toLowerCase().includes(q)
                            );
                          })
                          .slice(0, 25)
                          .map((st) => {
                            const stAttempts = progressByStudentMap.get(st.id) || [];
                            const existing = stAttempts[stAttempts.length - 1] || null;
                            const nextAtt = stAttempts.length > 0
                              ? Math.max(...stAttempts.map((a) => a.attemptNumber || 1), 1) + 1
                              : 2;
                            const isExcludedFromStruct = excludedStudentIdSet.has(st.id);
                            return (
                              <div
                                key={st.id}
                                className="w-full px-3 py-2 text-start hover:bg-amber-50 dark:hover:bg-amber-950/30 flex items-center justify-between gap-2 text-xs"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowAddAnyStudentPicker(false);
                                    setScoringModalState({
                                      isOpen: true,
                                      structure: selectedStructure,
                                      student: st,
                                      existingProgress: existing,
                                      isNewImprovementAttempt: false,
                                      baselineProgress: null,
                                      nextAttemptNumber: nextAtt,
                                    });
                                  }}
                                  className="flex-1 text-start flex items-center justify-between gap-2 cursor-pointer"
                                >
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-slate-900 dark:text-white">{st.name}</span>
                                    <span className="text-[11px] text-slate-400">
                                      ({translateGrade(st.grade, lang)}{st.track ? ` • ${translateTrack(st.track, lang)}` : ''})
                                    </span>
                                    {isExcludedFromStruct && (
                                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                        {tr('محذوف من هذا الهيكل', 'Removed from this structure')}
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-mono text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                                    {existing
                                      ? `${existing.solvedCount}/${existing.totalQuestions} (${existing.overallAccuracyPercentage}%)`
                                      : isExcludedFromStruct
                                      ? tr('رصد وإعادة للهيكل ←', 'Record & Restore →')
                                      : tr('رصد جديد ←', 'New Entry →')}
                                  </span>
                                </button>
                                {isExcludedFromStruct && onRestoreStudentsToStructure && (
                                  <button
                                    type="button"
                                    onClick={() => onRestoreStudentsToStructure(selectedStructure, [st.id])}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 rounded-lg cursor-pointer shrink-0"
                                    title={tr('استعادة سطر الطالب إلى جدول هذا الهيكل', 'Restore student row to this structure table')}
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    {tr('إرجاع للجدول', 'Restore Row')}
                                  </button>
                                )}
                                {existing && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setShowAddAnyStudentPicker(false);
                                      setScoringModalState({
                                        isOpen: true,
                                        structure: selectedStructure,
                                        student: st,
                                        existingProgress: null,
                                        isNewImprovementAttempt: true,
                                        baselineProgress: existing,
                                        nextAttemptNumber: nextAtt,
                                      });
                                    }}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-lg cursor-pointer shrink-0"
                                  >
                                    <Plus className="w-3 h-3" />
                                    {tr('تحسين', 'Improve')}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Per-Question Average Accuracy Grid */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <BarChart3 className="w-4 h-4 text-amber-500" />
                        <span>
                          {tr(
                            `متوسط نسبة صحة كل سؤال على مستوى الطلاب (${selectedStructure.totalQuestions} سؤال)`,
                            `Average Per-Question Accuracy Across Students (${selectedStructure.totalQuestions} questions)`
                          )}
                        </span>
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {tr('مرتبط بالطلاب المرصودين بالهيكل', 'Linked to recorded students in this structure')}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2">
                      {questionAnalytics.map((qa) => {
                        const accColor =
                          qa.solvedByCount === 0
                            ? 'text-slate-400 border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40'
                            : qa.avgAccuracy >= 80
                            ? 'text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/60 dark:bg-emerald-950/30'
                            : qa.avgAccuracy >= 60
                            ? 'text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/70 bg-amber-50/60 dark:bg-amber-950/30'
                            : 'text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/70 bg-rose-50/60 dark:bg-rose-950/30';

                        return (
                          <div
                            key={qa.questionNumber}
                            className={`p-2 rounded-xl border text-center ${accColor}`}
                            title={
                              qa.title
                                ? `${tr('س', 'Q')}${qa.questionNumber}: ${qa.title}`
                                : `${tr('سؤال', 'Question')} ${qa.questionNumber}`
                            }
                          >
                            <div className="text-[10px] font-bold truncate">
                              {tr('س', 'Q')}{qa.questionNumber}{qa.title ? ` • ${qa.title}` : ''}
                            </div>
                            <div className="text-sm font-black font-mono tabular-nums mt-0.5">
                              {qa.solvedByCount > 0 ? `${qa.avgAccuracy}%` : '-'}
                            </div>
                            <div className="text-[9px] opacity-75 font-mono">
                              {qa.solvedByCount} {tr('طالب', 'students')}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Student Completion Distribution Chart (0-25%, 26-50%, 51-75%, 76-100%) */}
                <StructureCompletionDistributionChart
                  selectedStructure={selectedStructure}
                  allFilteredStructures={filteredStructures}
                  students={students}
                  structureProgress={structureProgress}
                  filterStatus={filterStatus}
                  activeBucketFilter={filterCompletionBucket}
                  onSelectBucketFilter={setFilterCompletionBucket}
                  onRemindStudents={(ids, label) =>
                    setReminderModalState({
                      isOpen: true,
                      studentIds: ids,
                      audienceLabel: label,
                    })
                  }
                />

                {/* Student Progress Table for Selected Structure */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                        {tr('سجل الطلاب في هذا الهيكل ونسبة صحة كل سؤال', 'Student Records & Per-Question Accuracy')}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {tr(
                          'اضغط على «رصد / تعديل الأسئلة» لتسجيل عدد الأسئلة التي حلّها الطالب ونسبة صحة كل سؤال بالتفصيل',
                          'Click "Record / Edit Questions" to log solved questions and per-question accuracy in detail'
                        )}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {excludedStudentsInStructure.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setIsExcludedModalOpen(true)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-800/70 text-rose-700 dark:text-rose-300 font-bold text-[11px] cursor-pointer transition"
                          title={tr(
                            'عرض أو استعادة سطور الطلاب المحذوفين من هذا الهيكل فقط',
                            'View or restore student rows removed from this structure only'
                          )}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>
                            {tr(
                              `سطور محذوفة من الهيكل (${excludedStudentsInStructure.length})`,
                              `Removed Rows (${excludedStudentsInStructure.length})`
                            )}
                          </span>
                        </button>
                      )}
                      <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => setStudentListScope('matching')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                            studentListScope === 'matching'
                              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {tr('المطابقين للهيكل', 'Matching')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setStudentListScope('recorded_only')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                            studentListScope === 'recorded_only'
                              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {tr(`المرصودين فقط (${latestStructureProgress.length})`, `Recorded Only (${latestStructureProgress.length})`)}
                        </button>
                        <button
                          type="button"
                          onClick={() => setStudentListScope('all')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                            studentListScope === 'all'
                              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {tr('كل الطلاب', 'All Students')}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Quick filter input inside table */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute start-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      value={studentPickerSearch}
                      onChange={(e) => setStudentPickerSearch(e.target.value)}
                      placeholder={tr('ابحث داخل قائمة طلاب هذا الهيكل بالاسم أو الكود...', 'Search students in this structure by name or ID...')}
                      className="w-full ps-9 pe-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  {/* Multi-Student Selection & One-Click Batch Score Toolbar */}
                  {uniqueVisibleStudents.length > 0 && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 me-1">
                          <Users className="w-3.5 h-3.5 text-amber-500" />
                          <span>{tr('تحديد الطلاب للرصد الجماعي:', 'Select Students for Batch Entry:')}</span>
                        </span>

                        <button
                          type="button"
                          onClick={handleSelectAllVisibleStudents}
                          className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] hover:border-amber-500 cursor-pointer"
                        >
                          {tr(`تحديد الكل (${uniqueVisibleStudents.length})`, `Select All (${uniqueVisibleStudents.length})`)}
                        </button>

                        <button
                          type="button"
                          onClick={handleSelectUnrecordedVisibleStudents}
                          className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] hover:border-amber-500 cursor-pointer"
                        >
                          {tr('تحديد غير المرصودين', 'Select Unrecorded')}
                        </button>

                        <div className="inline-flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-1.5 py-0.5">
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">{tr('تحديد عدد:', 'Select count:')}</span>
                          <input
                            type="number"
                            min={1}
                            max={Math.max(1, uniqueVisibleStudents.length)}
                            value={selectCountInput}
                            onChange={(e) =>
                              setSelectCountInput(Math.max(1, Number(e.target.value) || 1))
                            }
                            className="w-12 px-1 py-0.5 text-center font-mono font-bold text-[11px] bg-slate-50 dark:bg-slate-800 rounded text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700"
                          />
                          <button
                            type="button"
                            onClick={() => handleSelectSpecificStudentCount(selectCountInput)}
                            className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] cursor-pointer"
                          >
                            {tr('تحديد', 'Select')}
                          </button>
                        </div>

                        {selectedStudentIds.size > 0 && (
                          <button
                            type="button"
                            onClick={handleClearStudentSelection}
                            className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold text-[11px] cursor-pointer hover:bg-rose-100"
                          >
                            {tr(`إلغاء التحديد (${selectedStudentIds.size})`, `Clear Selection (${selectedStudentIds.size})`)}
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 font-mono">
                          {tr('المحدد:', 'Selected:')}{' '}
                          <strong className="text-amber-600 dark:text-amber-400">
                            {selectedStudentIds.size}
                          </strong>
                        </span>

                        {selectedStudentIds.size > 0 && (
                          <>
                            <button
                              type="button"
                              onClick={handleExportCurrentStructuresExcel}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 font-bold text-[11px] cursor-pointer whitespace-nowrap"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>{tr(`تصدير المحددين Excel (${selectedStudentIds.size})`, `Export Selected Excel (${selectedStudentIds.size})`)}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setIsBatchScoringOpen(true)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-[11px] shadow-sm cursor-pointer whitespace-nowrap"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>
                                {tr(
                                  `تسجيل ورصد الدرجة للمحددين مرة واحدة (${selectedStudentIds.size})`,
                                  `Batch Score Selected (${selectedStudentIds.size})`
                                )}
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setReminderModalState({
                                  isOpen: true,
                                  studentIds: Array.from<string>(selectedStudentIds),
                                  audienceLabel: tr(`الطلاب المحددون (${selectedStudentIds.size})`, `Selected Students (${selectedStudentIds.size})`),
                                })
                              }
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200 font-bold text-[11px] cursor-pointer whitespace-nowrap"
                              title={tr('تذكير الطلاب المحددين في هذا الهيكل', 'Remind selected students in this structure')}
                            >
                              <BellRing className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                              <span>{tr(`تذكير المحددين (${selectedStudentIds.size})`, `Remind Selected (${selectedStudentIds.size})`)}</span>
                            </button>

                            {onDeleteStudentsFromStructure && (
                              <button
                                type="button"
                                onClick={() =>
                                  setRowDeleteModal({
                                    isOpen: true,
                                    studentsToDelete: selectedBatchStudents,
                                    progressToClearOnly: null,
                                  })
                                }
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold text-[11px] cursor-pointer whitespace-nowrap"
                                title={tr(
                                  'حذف سطور الطلاب المحددين من هذا الهيكل فقط دون حذف ملفاتهم من المنصة',
                                  'Remove selected student rows from this structure only without deleting their platform profiles'
                                )}
                              >
                                <UserMinus className="w-3.5 h-3.5" />
                                <span>{tr(`حذف من الهيكل فقط (${selectedStudentIds.size})`, `Remove from Structure (${selectedStudentIds.size})`)}</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {filterCompletionBucket !== 'all' && (
                    <div className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-amber-900 dark:text-amber-200">
                        {tr(
                          `يتم عرض طلاب فئة الإنجاز (${filterCompletionBucket}%) فقط — (${uniqueVisibleStudents.length} طالب)`,
                          `Showing students in completion bucket (${filterCompletionBucket}%) only — (${uniqueVisibleStudents.length} students)`
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        {uniqueVisibleStudents.length > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setReminderModalState({
                                isOpen: true,
                                studentIds: uniqueVisibleStudents.map((s) => s.id),
                                audienceLabel: tr(`فئة إنجاز ${filterCompletionBucket}%`, `Completion bucket ${filterCompletionBucket}%`),
                              })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] cursor-pointer"
                          >
                            <BellRing className="w-3 h-3" />
                            <span>{tr('تذكير هذه الفئة', 'Remind This Group')}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setFilterCompletionBucket('all')}
                          className="text-[11px] font-black text-amber-700 dark:text-amber-300 hover:underline cursor-pointer"
                        >
                          {tr('إلغاء فلتر الفئة', 'Clear Bucket Filter')}
                        </button>
                      </div>
                    </div>
                  )}

                  {workspaceStudentRows.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        {tr('لا يوجد طلاب مطابقين في هذا النطاق حالياً', 'No matching students in this scope')}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {tr(
                          'يمكنك اختيار «كل الطلاب» أعلى الجدول أو الضغط على «تسجيل حل طالب بالهيكل» لربط أي طالب مباشرة.',
                          'Select "All Students" above the table or click "Record Student Progress" to link any student directly.'
                        )}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                      <table className="w-full text-start text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-800">
                          <tr>
                            <th className="py-2.5 px-2.5 w-10 text-center">
                              <button
                                type="button"
                                onClick={() =>
                                  allVisibleSelected
                                    ? handleClearStudentSelection()
                                    : handleSelectAllVisibleStudents()
                                }
                                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer inline-flex items-center justify-center"
                                title={allVisibleSelected ? tr('إلغاء تحديد الكل', 'Deselect All') : tr('تحديد الكل', 'Select All')}
                              >
                                {allVisibleSelected ? (
                                  <CheckSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-400" />
                                )}
                              </button>
                            </th>
                            <th className="py-2.5 px-3">{tr('الطالب', 'Student')}</th>
                            <th className="py-2.5 px-3">{tr('الصف / الفصل / المسار / المادة', 'Grade / Term / Track / Subject')}</th>
                            <th className="py-2.5 px-3 text-center">{tr('الأسئلة المحلولة', 'Solved Qs')}</th>
                            <th className="py-2.5 px-3 text-center">{tr('متوسط الصحة %', 'Avg Accuracy %')}</th>
                            <th className="py-2.5 px-3">{tr('نسب صحة كل سؤال', 'Per-Question Accuracy')}</th>
                            <th className="py-2.5 px-3 text-center">{tr('إجراءات', 'Actions')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                          {workspaceStudentRows.map(({ rowKey, student, progress, maxAttempt, latestAttempt }) => {
                            const effStatus = getEffectiveEnrollmentStatus(student);
                            const stMeta = ENROLLMENT_STATUS_META[effStatus];
                            const totalQ = progress?.totalQuestions || selectedStructure.totalQuestions;
                            const solvedCount = progress?.solvedCount || 0;
                            const completionPct = progress?.completionPercentage || 0;
                            const accuracyPct = progress?.overallAccuracyPercentage || 0;
                            const isAttemptImprovement =
                              Boolean(progress?.isImprovement) ||
                              Boolean(progress?.attemptNumber && progress.attemptNumber > 1);
                            const prevAcc = progress?.previousAccuracy;
                            const accDiff =
                              isAttemptImprovement && prevAcc !== undefined
                                ? Math.round((accuracyPct - prevAcc) * 10) / 10
                                : null;
                            const qImpCount =
                              progress?.improvementsCount ??
                              (progress?.questionScores || []).filter(
                                (qs) => qs.isImprovement || (qs.attemptNumber !== undefined && qs.attemptNumber > 1)
                              ).length;
                            const isStudentSelected = selectedStudentIds.has(student.id);

                            return (
                              <tr
                                key={rowKey}
                                className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                                  isStudentSelected
                                    ? 'bg-amber-100/45 dark:bg-amber-900/25'
                                    : isAttemptImprovement
                                    ? 'bg-amber-50/40 dark:bg-amber-950/20 border-s-4 border-s-amber-500'
                                    : ''
                                }`}
                              >
                                <td className="py-2.5 px-2.5 text-center">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleSelectStudent(student.id);
                                    }}
                                    className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer inline-flex items-center justify-center"
                                    title={isStudentSelected ? tr('إلغاء تحديد الطالب', 'Deselect Student') : tr('تحديد الطالب', 'Select Student')}
                                  >
                                    {isStudentSelected ? (
                                      <CheckSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                    ) : (
                                      <Square className="w-4 h-4 text-slate-400" />
                                    )}
                                  </button>
                                </td>
                                <td className="py-2.5 px-3">
                                  <button
                                    type="button"
                                    onClick={() => onOpenStudentProfile(student)}
                                    className="font-extrabold text-slate-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 text-start cursor-pointer block"
                                  >
                                    {student.name}
                                  </button>
                                  <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5 flex-wrap">
                                    <span>{student.studentId}</span>
                                    <span>•</span>
                                    <span>{lang === 'en' ? stMeta?.shortLabelEn : stMeta?.shortLabel}</span>
                                  </div>
                                  {progress && (
                                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                      {isAttemptImprovement ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                                          <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                                          {tr(`تحسين (محاولة ${progress.attemptNumber || 2})`, `Improved (Attempt ${progress.attemptNumber || 2})`)}
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                          {tr('المحاولة الأساسية', 'Baseline Attempt')}
                                        </span>
                                      )}
                                      {prevAcc !== undefined && (
                                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                                          ({tr('السابقة:', 'Prev:')} {prevAcc}%)
                                        </span>
                                      )}
                                      {accDiff !== null && (
                                        <span
                                          className={`text-[10px] font-mono font-bold ${
                                            accDiff > 0
                                              ? 'text-emerald-600 dark:text-emerald-400'
                                              : accDiff < 0
                                              ? 'text-rose-600 dark:text-rose-400'
                                              : 'text-slate-500'
                                          }`}
                                        >
                                          {accDiff > 0 ? `+${accDiff}% ↑` : `${accDiff}%`}
                                        </span>
                                      )}
                                      {qImpCount > 0 && (
                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                          <Sparkles className="w-2.5 h-2.5" />
                                          {tr(`${qImpCount} سؤال محسّن`, `${qImpCount} improved Qs`)}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </td>

                                <td className="py-2.5 px-3 text-[11px] text-slate-600 dark:text-slate-300">
                                  <div>{translateGrade(progress?.grade || student.grade, lang)} • {translateTrack(progress?.track || student.track || selectedStructure.track, lang)}</div>
                                  <div className="text-slate-400">
                                    {translateTerm(progress?.term || student.term || selectedStructure.term, lang)} • {translateSubject(progress?.subject || selectedStructure.subject, lang)} ({progress?.academicYear || student.academicYear || selectedStructure.academicYear})
                                  </div>
                                </td>

                                <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                                  {progress ? (
                                    <div>
                                      <span className="font-black text-slate-900 dark:text-white">
                                        {solvedCount} / {totalQ}
                                      </span>
                                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                        {tr('إنجاز', 'Completion')} {completionPct}%
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 text-[11px]">{tr('لم يُرصد', 'Not Recorded')}</span>
                                  )}
                                </td>

                                <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                                  {progress ? (
                                    <span
                                      className={`font-black text-sm ${
                                        accuracyPct >= 80
                                          ? 'text-emerald-600 dark:text-emerald-400'
                                          : accuracyPct >= 60
                                          ? 'text-amber-600 dark:text-amber-400'
                                          : 'text-rose-600 dark:text-rose-400'
                                      }`}
                                    >
                                      {accuracyPct}%
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </td>

                                <td className="py-2.5 px-3 max-w-[280px]">
                                  {progress && progress.questionScores && progress.questionScores.length > 0 ? (
                                    <div className="flex flex-wrap gap-1 font-mono tabular-nums">
                                      {progress.questionScores.slice(0, 12).map((qs) => {
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
                                                ? tr(
                                                    `سؤال ${qs.questionNumber}: ${qs.accuracyPercentage}% (تحسين من ${qs.previousAccuracy}% • محاولة ${qs.attemptNumber || 2})`,
                                                    `Q${qs.questionNumber}: ${qs.accuracyPercentage}% (Improved from ${qs.previousAccuracy}% • Attempt ${qs.attemptNumber || 2})`
                                                  )
                                                : tr(
                                                    `سؤال ${qs.questionNumber}: ${qs.solved ? `${qs.accuracyPercentage}%` : 'لم يُحل'}`,
                                                    `Q${qs.questionNumber}: ${qs.solved ? `${qs.accuracyPercentage}%` : 'Unsolved'}`
                                                  )
                                            }
                                          >
                                            {tr('س', 'Q')}{qs.questionNumber}:{qs.solved ? `${qs.accuracyPercentage}%${isQImp ? '↑' : ''}` : '—'}
                                          </span>
                                        );
                                      })}
                                      {progress.questionScores.length > 12 && (
                                        <span className="text-[10px] text-slate-400 px-1">
                                          +{progress.questionScores.length - 12}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-[11px] text-slate-400">{tr('بانتظار رصد الأسئلة', 'Awaiting question scores')}</span>
                                  )}
                                </td>

                                <td className="py-2.5 px-3 text-center">
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setScoringModalState({
                                          isOpen: true,
                                          structure: selectedStructure,
                                          student,
                                          existingProgress: progress,
                                          isNewImprovementAttempt: false,
                                          baselineProgress: null,
                                          nextAttemptNumber: maxAttempt + 1,
                                        })
                                      }
                                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-[11px] transition cursor-pointer whitespace-nowrap"
                                    >
                                      {progress ? tr('تعديل / تحسين الأسئلة', 'Edit / Improve') : tr('رصد الحل', 'Record')}
                                    </button>
                                    {progress && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setScoringModalState({
                                            isOpen: true,
                                            structure: selectedStructure,
                                            student,
                                            existingProgress: null,
                                            isNewImprovementAttempt: true,
                                            baselineProgress: latestAttempt || progress,
                                            nextAttemptNumber: maxAttempt + 1,
                                          })
                                        }
                                        className="inline-flex items-center gap-1 px-2 py-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-300/80 dark:border-amber-700/80 rounded-lg transition-all cursor-pointer shadow-2xs whitespace-nowrap"
                                        title={tr('إضافة محاولة تحسين جديدة لنفس الطالب في هذا الهيكل', 'Add a new improvement attempt for this student in this structure')}
                                      >
                                        <Plus className="w-3 h-3" />
                                        {tr('تحسين', 'Improve')}
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setReminderModalState({
                                          isOpen: true,
                                          studentIds: [student.id],
                                          audienceLabel: student.name,
                                        })
                                      }
                                      className="p-1.5 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg cursor-pointer transition"
                                      title={tr('تذكير الطالب أو ولي أمره بمتابعة هذا الهيكل', 'Remind student or parent about this structure')}
                                    >
                                      <BellRing className="w-3.5 h-3.5" />
                                    </button>
                                    {progress && isAttemptImprovement ? (
                                      <button
                                        type="button"
                                        onClick={() => onDeleteProgress(progress)}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg cursor-pointer transition"
                                        title={tr('حذف محاولة التحسين من هذا الهيكل فقط (لا يحذف ملف الطالب من المنصة)', 'Delete this improvement attempt from this structure only (keeps student profile)')}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (onDeleteStudentsFromStructure) {
                                            setRowDeleteModal({
                                              isOpen: true,
                                              studentsToDelete: [student],
                                              progressToClearOnly: progress,
                                            });
                                          } else if (progress) {
                                            onDeleteProgress(progress);
                                          }
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg cursor-pointer transition"
                                        title={tr('حذف سطر الطالب من هذا الهيكل فقط (لا يحذف ملف الطالب من المنصة)', 'Remove student row from this structure only (keeps student profile)')}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal 1: Create / Edit Structure */}
      <StructureFormModal
        isOpen={isStructureModalOpen}
        structureToEdit={editingStructure}
        settings={settings}
        gradesList={gradesList}
        subjectsList={subjectsList}
        tracksList={tracksList}
        yearsList={yearsList}
        onDirtyChange={setIsStructureFormDirty}
        onClose={() => {
          setIsStructureModalOpen(false);
          setEditingStructure(null);
        }}
        onSave={async (payload, id) => {
          if (id) {
            await onUpdateStructure(id, payload);
          } else {
            const newId = await onAddStructure(payload);
            setSelectedStructureId(newId);
          }
          setIsStructureModalOpen(false);
          setEditingStructure(null);
        }}
      />

      {/* Modal 2: Student Structure Question-by-Question Scoring & Improvement Modal */}
      {scoringModalState.isOpen && scoringModalState.structure && scoringModalState.student && (
        <StudentStructureScoringModal
          isOpen={scoringModalState.isOpen}
          structure={scoringModalState.structure}
          student={scoringModalState.student}
          existingProgress={scoringModalState.existingProgress}
          isNewImprovementAttempt={scoringModalState.isNewImprovementAttempt}
          baselineProgress={scoringModalState.baselineProgress}
          nextAttemptNumber={scoringModalState.nextAttemptNumber}
          settings={settings}
          gradesList={gradesList}
          subjectsList={subjectsList}
          tracksList={tracksList}
          yearsList={yearsList}
          onDirtyChange={setIsSingleScoringDirty}
          onClose={() =>
            setScoringModalState({
              isOpen: false,
              structure: null,
              student: null,
              existingProgress: null,
              isNewImprovementAttempt: false,
              baselineProgress: null,
              nextAttemptNumber: 2,
            })
          }
          onSave={async (record) => {
            await onSaveProgress(record);
            setScoringModalState({
              isOpen: false,
              structure: null,
              student: null,
              existingProgress: null,
              isNewImprovementAttempt: false,
              baselineProgress: null,
              nextAttemptNumber: 2,
            });
          }}
        />
      )}

      {/* Modal 3: Custom Structures Excel Export Modal (exact Academic Report export engine) */}
      <ExcelExportModal
        isOpen={isExcelExportModalOpen}
        onClose={() => setIsExcelExportModalOpen(false)}
        students={students}
        exams={[]}
        allResults={[]}
        settings={settings}
        structures={structures}
        structureProgress={structureProgress}
        defaultExportMode="structures_reports"
        defaultGrade={filterGrade}
        defaultTerm={filterTerm}
        defaultTrack={filterTrack}
        defaultYear={filterYear}
        defaultSubject={filterSubject}
        defaultStatus={filterStatus}
        defaultStructureCompletionStatus={filterCompletionStatus}
        defaultStructureId={selectedStructure?.id || 'الكل'}
        defaultSelectedStructureIds={selectedStructure ? [selectedStructure.id] : undefined}
        defaultStructureSelectionMode={selectedStructure ? 'specific' : 'all'}
        defaultSelectedStudentIds={selectedStudentIds.size > 0 ? Array.from<string>(selectedStudentIds) : undefined}
        defaultStudentSelectionMode={selectedStudentIds.size > 0 ? 'specific' : 'all'}
      />

      {/* Modal 4: Structures Honor Board Modal */}
      <HonorBoardModal
        isOpen={isHonorBoardOpen}
        onClose={() => setIsHonorBoardOpen(false)}
        students={students}
        exams={[]}
        allResults={[]}
        settings={settings}
        structures={structures}
        structureProgress={structureProgress}
        initialDataSource="structures"
        initialStructureId={selectedStructure?.id}
        initialGrade={filterGrade !== 'الكل' ? filterGrade : 'all'}
        initialTrack={filterTrack !== 'الكل' ? filterTrack : 'all'}
        initialTerm={filterTerm !== 'الكل' ? filterTerm : 'all'}
        initialSubject={filterSubject !== 'الكل' ? filterSubject : 'all'}
        initialYear={filterYear !== 'الكل' ? filterYear : 'all'}
      />

      {/* Modal 5: Batch Student Structure Scoring Modal */}
      {isBatchScoringOpen && selectedStructure && selectedBatchStudents.length > 0 && (
        <BatchStructureScoringModal
          isOpen={isBatchScoringOpen}
          structure={selectedStructure}
          selectedStudents={selectedBatchStudents}
          existingProgressByStudent={progressByStudentMap}
          gradesList={gradesList}
          subjectsList={subjectsList}
          tracksList={tracksList}
          yearsList={yearsList}
          onDirtyChange={setIsBatchScoringDirty}
          onClose={() => setIsBatchScoringOpen(false)}
          onSaveBatch={async (records) => {
            if (onSaveBatchProgress) {
              await onSaveBatchProgress(records);
            } else {
              for (const rec of records) {
                await onSaveProgress(rec);
              }
            }
            setIsBatchScoringOpen(false);
            setSelectedStudentIds(new Set());
          }}
        />
      )}

      {/* Modal 6: Confirm Structure-Only Student Row Deletion */}
      {rowDeleteModal.isOpen && selectedStructure && rowDeleteModal.studentsToDelete.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-hidden"
          onClick={() =>
            !isDeletingRows &&
            setRowDeleteModal({ isOpen: false, studentsToDelete: [], progressToClearOnly: null })
          }
          dir={dir}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-start space-y-4 max-h-[92dvh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
                <div className="p-2 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="font-black text-slate-900 dark:text-white text-base">
                  {rowDeleteModal.studentsToDelete.length === 1
                    ? tr('حذف سطر الطالب من قسم الهياكل فقط', 'Remove Student Row from Structures Only')
                    : tr(
                        `حذف سطور (${rowDeleteModal.studentsToDelete.length}) طلاب من الهيكل فقط`,
                        `Remove (${rowDeleteModal.studentsToDelete.length}) Student Rows from Structure Only`
                      )}
                </h3>
              </div>
              <button
                type="button"
                disabled={isDeletingRows}
                onClick={() =>
                  setRowDeleteModal({ isOpen: false, studentsToDelete: [], progressToClearOnly: null })
                }
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {rowDeleteModal.studentsToDelete.length === 1 ? (
                <p>
                  {tr('هل أنت متأكد من حذف سطر الطالب', 'Are you sure you want to remove the row for student')}{' '}
                  <strong className="text-slate-900 dark:text-white">
                    "{rowDeleteModal.studentsToDelete[0].name}"
                  </strong>{' '}
                  {tr('من هيكل', 'from structure')}{' '}
                  <strong className="text-amber-600 dark:text-amber-400">
                    "{selectedStructure.title}"
                  </strong>
                  {tr('؟', '?')}
                </p>
              ) : (
                <p>
                  {tr('هل أنت متأكد من حذف سطور عدد', 'Are you sure you want to remove rows for')}{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {rowDeleteModal.studentsToDelete.length} {tr('طلاب', 'students')}
                  </strong>{' '}
                  {tr('من هيكل', 'from structure')}{' '}
                  <strong className="text-amber-600 dark:text-amber-400">
                    "{selectedStructure.title}"
                  </strong>
                  {tr('؟', '?')}
                </p>
              )}

              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/70 text-emerald-900 dark:text-emerald-200 text-xs font-bold leading-relaxed">
                {tr(
                  'تنبيه مطمئن: الحذف يتم لسطر الطالب (وسجله داخل هذا الهيكل فقط) ولن يتم حذف ملف الطالب الأساسي أو درجاته وبياناته الأخرى الموجودة على المنصة، ويمكنك استعادة السطر لاحقاً في أي وقت.',
                  'Reassurance: This only removes the student row (and record within this structure). Their main student profile, grades, and other platform data remain intact, and you can restore the row anytime.'
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={isDeletingRows}
                  onClick={() =>
                    setRowDeleteModal({ isOpen: false, studentsToDelete: [], progressToClearOnly: null })
                  }
                  className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl cursor-pointer"
                >
                  {tr('تراجع / إلغاء', 'Cancel')}
                </button>

                {rowDeleteModal.studentsToDelete.length === 1 && rowDeleteModal.progressToClearOnly && (
                  <button
                    type="button"
                    disabled={isDeletingRows}
                    onClick={() => {
                      const prog = rowDeleteModal.progressToClearOnly!;
                      setRowDeleteModal({ isOpen: false, studentsToDelete: [], progressToClearOnly: null });
                      onDeleteProgress(prog);
                    }}
                    className="px-3.5 py-2 text-xs font-bold text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-300 dark:border-amber-700 rounded-xl cursor-pointer"
                  >
                    {tr('مسح الدرجات فقط (إبقاء السطر)', 'Clear Scores Only (Keep Row)')}
                  </button>
                )}

                <button
                  type="button"
                  disabled={isDeletingRows}
                  onClick={async () => {
                    if (!onDeleteStudentsFromStructure) return;
                    setIsDeletingRows(true);
                    try {
                      const idsToRemove = new Set(rowDeleteModal.studentsToDelete.map((s) => s.id));
                      await onDeleteStudentsFromStructure(
                        selectedStructure,
                        rowDeleteModal.studentsToDelete
                      );
                      setSelectedStudentIds((prev) => {
                        const next = new Set(prev);
                        idsToRemove.forEach((id) => next.delete(id));
                        return next;
                      });
                      setRowDeleteModal({ isOpen: false, studentsToDelete: [], progressToClearOnly: null });
                    } finally {
                      setIsDeletingRows(false);
                    }
                  }}
                  className="px-4 py-2 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-600/20 cursor-pointer disabled:opacity-60"
                >
                  {isDeletingRows ? tr('جاري الحذف...', 'Removing...') : tr('حذف السطر من الهيكل فقط', 'Remove Row from Structure Only')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 7: Excluded / Removed Student Rows Restore Modal */}
      {isExcludedModalOpen && selectedStructure && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-hidden"
          onClick={() => setIsExcludedModalOpen(false)}
          dir={dir}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-start space-y-4 max-h-[92dvh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-amber-500" />
                  <span>{tr(`السطور المحذوفة من هيكل "${selectedStructure.title}"`, `Removed Rows from Structure "${selectedStructure.title}"`)}</span>
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {tr('ملفات هؤلاء الطلاب ما زالت محفوظة بالكامل على المنصة، ويمكنك استعادة سطر أي طالب لهذا الهيكل بنقرة واحدة', 'These student profiles remain intact on the platform, and you can restore any row to this structure with one click')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsExcludedModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {excludedStudentsInStructure.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                {tr('لا توجد سطور محذوفة حالياً من هذا الهيكل.', 'There are currently no removed rows in this structure.')}
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl">
                {excludedStudentsInStructure.map((st) => (
                  <div
                    key={st.id}
                    className="px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs bg-white dark:bg-slate-900"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white truncate">{st.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {st.studentId} • {translateGrade(st.grade, lang)}{st.track ? ` • ${translateTrack(st.track, lang)}` : ''}
                      </div>
                    </div>
                    {onRestoreStudentsToStructure && (
                      <button
                        type="button"
                        onClick={async () => {
                          await onRestoreStudentsToStructure(selectedStructure, [st.id]);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] cursor-pointer shrink-0"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>{tr('استعادة للهيكل', 'Restore to Structure')}</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              {excludedStudentsInStructure.length > 0 && onRestoreStudentsToStructure ? (
                <button
                  type="button"
                  onClick={async () => {
                    await onRestoreStudentsToStructure(selectedStructure);
                    setIsExcludedModalOpen(false);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{tr(`استعادة كل السطور (${excludedStudentsInStructure.length})`, `Restore All Rows (${excludedStudentsInStructure.length})`)}</span>
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={() => setIsExcludedModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl cursor-pointer"
              >
                {tr('إغلاق', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal 8: Structure Student Reminder & Follow-up Center */}
      {reminderModalState.isOpen && selectedStructure && (
        <StructureReminderModal
          isOpen={reminderModalState.isOpen}
          onClose={() => setReminderModalState({ isOpen: false })}
          structure={selectedStructure}
          students={students}
          progressByStudentMap={progressByStudentMap}
          teacherName={settings?.teacherName}
          initialStudentIds={reminderModalState.studentIds}
          initialAudienceLabel={reminderModalState.audienceLabel}
          onDirtyChange={setIsReminderDirty}
        />
      )}
    </div>
  );
};

/* ============================================================================
   SUBCOMPONENT: Structure Create / Edit Modal
   ============================================================================ */

interface StructureFormModalProps {
  isOpen: boolean;
  structureToEdit: ExamStructure | null;
  settings: TeacherSettings;
  gradesList: string[];
  subjectsList: string[];
  tracksList: string[];
  yearsList: string[];
  onClose: () => void;
  onSave: (data: Omit<ExamStructure, 'id'>, editId?: string) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
}

const StructureFormModal: React.FC<StructureFormModalProps> = ({
  isOpen,
  structureToEdit,
  settings,
  gradesList,
  subjectsList,
  tracksList,
  yearsList,
  onClose,
  onSave,
  onDirtyChange,
}) => {
  const { lang, dir, tr } = useLanguage();
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [grade, setGrade] = useState(gradesList[0] || UAE_GRADES[0]);
  const [term, setTerm] = useState(ACADEMIC_TERMS[0]);
  const [track, setTrack] = useState(tracksList[0] || ACADEMIC_TRACKS[0]);
  const [customTrack, setCustomTrack] = useState('');
  const [academicYear, setAcademicYear] = useState(yearsList[0] || ACADEMIC_YEARS[0]);
  const [subject, setSubject] = useState(settings?.defaultSubject || subjectsList[0] || 'Mathematics');
  const [customSubject, setCustomSubject] = useState('');
  const [group, setGroup] = useState('الكل');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [examDate, setExamDate] = useState('');
  const [completionStatus, setCompletionStatus] = useState<StructureCompletionStatus>('ongoing');
  const [completedAt, setCompletedAt] = useState('');
  const [totalQuestions, setTotalQuestions] = useState<number>(10);
  const [questions, setQuestions] = useState<StructureQuestionItem[]>([]);
  const [showQuestionTitlesEditor, setShowQuestionTitlesEditor] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  const formDraftKey = structureToEdit?.id || 'new';
  interface StructureFormDraftPayload {
    title: string;
    code: string;
    grade: string;
    term: string;
    track: string;
    customTrack: string;
    academicYear: string;
    subject: string;
    customSubject: string;
    group: string;
    date: string;
    examDate?: string;
    completionStatus?: StructureCompletionStatus;
    completedAt?: string;
    totalQuestions: number;
    questions: StructureQuestionItem[];
    notes: string;
  }

  const [pendingDraft, setPendingDraft] = useState<{
    payload: StructureFormDraftPayload;
    updatedAt: string;
  } | null>(null);

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    isDestructive: boolean;
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: tr('تأكيد', 'Confirm'),
    cancelText: tr('تراجع', 'Cancel'),
    isDestructive: true,
    onConfirm: () => {},
  });

  useEffect(() => {
    if (!isOpen) return;
    if (structureToEdit) {
      setTitle(structureToEdit.title || '');
      setCode(structureToEdit.code || '');
      setGrade(structureToEdit.grade || gradesList[0] || UAE_GRADES[0]);
      setTerm(structureToEdit.term || ACADEMIC_TERMS[0]);
      const isKnownTrack = tracksList.includes(structureToEdit.track);
      setTrack(isKnownTrack ? structureToEdit.track : '__custom__');
      setCustomTrack(isKnownTrack ? '' : structureToEdit.track || '');
      setAcademicYear(structureToEdit.academicYear || yearsList[0] || ACADEMIC_YEARS[0]);
      const isKnownSubj = subjectsList.includes(structureToEdit.subject);
      setSubject(isKnownSubj ? structureToEdit.subject : '__custom__');
      setCustomSubject(isKnownSubj ? '' : structureToEdit.subject || '');
      setGroup(structureToEdit.group || 'الكل');
      setDate(structureToEdit.date || new Date().toISOString().split('T')[0]);
      setExamDate(structureToEdit.examDate || '');
      setCompletionStatus(getEffectiveStructureStatus(structureToEdit));
      setCompletedAt(structureToEdit.completedAt || '');
      const count = Math.max(1, structureToEdit.totalQuestions || structureToEdit.questions?.length || 10);
      setTotalQuestions(count);
      setQuestions(
        Array.from({ length: count }, (_, idx) => {
          const found = structureToEdit.questions?.find((q) => q.questionNumber === idx + 1);
          return found || { questionNumber: idx + 1, title: '', topic: '' };
        })
      );
      setNotes(structureToEdit.notes || '');
      setShowQuestionTitlesEditor(
        Boolean(structureToEdit.questions?.some((q) => (q.title || '').trim() || (q.topic || '').trim()))
      );
    } else {
      setTitle('');
      setCode('');
      setGrade(gradesList[0] || UAE_GRADES[0]);
      setTerm(ACADEMIC_TERMS[0]);
      setTrack(tracksList[0] || ACADEMIC_TRACKS[0]);
      setCustomTrack('');
      setAcademicYear(yearsList[0] || ACADEMIC_YEARS[0]);
      setSubject(settings?.defaultSubject || subjectsList[0] || 'Mathematics');
      setCustomSubject('');
      setGroup('الكل');
      setDate(new Date().toISOString().split('T')[0]);
      setExamDate('');
      setCompletionStatus('ongoing');
      setCompletedAt('');
      setTotalQuestions(10);
      setQuestions(
        Array.from({ length: 10 }, (_, idx) => ({
          questionNumber: idx + 1,
          title: '',
          topic: '',
        }))
      );
      setNotes('');
      setShowQuestionTitlesEditor(false);
    }
    setError('');
    setIsDirty(false);
    const savedDraft = loadStructureFormDraft<StructureFormDraftPayload>(formDraftKey);
    if (savedDraft && savedDraft.payload) {
      setPendingDraft(savedDraft);
    } else {
      setPendingDraft(null);
    }
  }, [isOpen, structureToEdit]);

  useEffect(() => {
    onDirtyChange?.(isOpen && isDirty);
  }, [isOpen, isDirty, onDirtyChange]);

  useEffect(() => {
    return () => {
      onDirtyChange?.(false);
    };
  }, [onDirtyChange]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isOpen && isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isOpen, isDirty]);

  // Auto-save form draft whenever dirty
  useEffect(() => {
    if (!isOpen || !isDirty) return;
    saveStructureFormDraft<StructureFormDraftPayload>(formDraftKey, {
      title,
      code,
      grade,
      term,
      track,
      customTrack,
      academicYear,
      subject,
      customSubject,
      group,
      date,
      examDate,
      completionStatus,
      completedAt,
      totalQuestions,
      questions,
      notes,
    });
  }, [
    isOpen,
    isDirty,
    formDraftKey,
    title,
    code,
    grade,
    term,
    track,
    customTrack,
    academicYear,
    subject,
    customSubject,
    group,
    date,
    examDate,
    completionStatus,
    completedAt,
    totalQuestions,
    questions,
    notes,
  ]);

  const requestSafeClose = () => {
    if (!isDirty) {
      onClose();
      return;
    }
    setConfirmState({
      isOpen: true,
      title: tr('تحذير: بيانات غير محفوظة للهيكل', 'Warning: Unsaved Structure Changes'),
      message: tr(
        `لديك تعديلات غير محفوظة في نموذج "${title.trim() || 'الهيكل'}". في حال الخروج الآن سيتم تجاهل التعديلات غير المحفوظة. هل تريد الخروج دون حفظ؟`,
        `You have unsaved changes in "${title.trim() || 'Structure'}". Closing now will discard unsaved edits. Exit without saving?`
      ),
      confirmText: tr('تجاهل التعديلات والخروج', 'Discard Changes & Exit'),
      cancelText: tr('البقاء وحفظ البيانات', 'Stay & Save Data'),
      isDestructive: true,
      onConfirm: () => {
        clearStructureFormDraft(formDraftKey);
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
        onClose();
      },
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      if (confirmState.isOpen) {
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
      } else {
        requestSafeClose();
      }
    };
    window.addEventListener('keydown', handleEsc, { capture: true });
    return () => window.removeEventListener('keydown', handleEsc, { capture: true });
  });

  const markDirty = () => {
    if (!isDirty) setIsDirty(true);
  };

  const handleRestoreDraft = () => {
    if (!pendingDraft) return;
    const p = pendingDraft.payload;
    setTitle(p.title || '');
    setCode(p.code || '');
    setGrade(p.grade || grade);
    setTerm(p.term || term);
    setTrack(p.track || track);
    setCustomTrack(p.customTrack || '');
    setAcademicYear(p.academicYear || academicYear);
    setSubject(p.subject || subject);
    setCustomSubject(p.customSubject || '');
    setGroup(p.group || 'الكل');
    setDate(p.date || date);
    setExamDate(p.examDate || '');
    setCompletionStatus(
      p.completionStatus === 'completed' ||
        p.completionStatus === 'studied_not_examined' ||
        p.completionStatus === 'ongoing'
        ? p.completionStatus
        : 'ongoing'
    );
    setCompletedAt(p.completedAt || '');
    setTotalQuestions(p.totalQuestions || 10);
    setQuestions(p.questions || []);
    setNotes(p.notes || '');
    setShowQuestionTitlesEditor(
      Boolean(p.questions?.some((q) => (q.title || '').trim() || (q.topic || '').trim()))
    );
    setPendingDraft(null);
    setIsDirty(true);
  };

  const handleDiscardDraft = () => {
    clearStructureFormDraft(formDraftKey);
    setPendingDraft(null);
  };

  const handleTotalQuestionsChange = (nextCountRaw: number) => {
    const nextCount = Math.max(1, Math.min(100, Math.round(nextCountRaw || 1)));
    const willDropNamedQuestions =
      nextCount < questions.length &&
      questions.slice(nextCount).some((q) => (q.title || '').trim() || (q.topic || '').trim());

    const applyResize = () => {
      markDirty();
      setTotalQuestions(nextCount);
      setQuestions((prev) =>
        Array.from({ length: nextCount }, (_, idx) => {
          const existing = prev.find((item) => item.questionNumber === idx + 1);
          return existing || { questionNumber: idx + 1, title: '', topic: '' };
        })
      );
    };

    if (willDropNamedQuestions) {
      setConfirmState({
        isOpen: true,
        title: tr('تحذير: تقليص عدد أسئلة الهيكل', 'Warning: Reducing Structure Questions'),
        message: tr(
          `تقليص العدد إلى (${nextCount}) سؤال سيحذف عناوين الأسئلة من س${nextCount + 1} إلى س${questions.length}. هل تريد المتابعة؟`,
          `Reducing count to (${nextCount}) questions will delete titles for Q${nextCount + 1} to Q${questions.length}. Continue?`
        ),
        confirmText: tr('تقليص العدد', 'Reduce Count'),
        cancelText: tr('تراجع', 'Cancel'),
        isDestructive: true,
        onConfirm: () => {
          applyResize();
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
        },
      });
      return;
    }

    applyResize();
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError(tr('يرجى إدخال اسم / عنوان الهيكل', 'Please enter the structure title / name'));
      return;
    }
    const finalTrack = track === '__custom__' ? customTrack.trim() : track.trim();
    const finalSubject = subject === '__custom__' ? customSubject.trim() : subject.trim();
    if (!finalTrack) {
      setError(tr('يرجى تحديد المسار الدراسي', 'Please select an academic track'));
      return;
    }
    if (!finalSubject) {
      setError(tr('يرجى تحديد المادة الدراسية', 'Please select a subject'));
      return;
    }

    try {
      setSaving(true);
      setError('');
      const now = new Date().toISOString();
      const payload: Omit<ExamStructure, 'id'> = {
        title: title.trim(),
        code: code.trim() || undefined,
        grade,
        term,
        track: finalTrack,
        academicYear,
        subject: finalSubject,
        group: group || 'الكل',
        date,
        examDate: examDate.trim() || '',
        completionStatus,
        completedAt:
          completionStatus !== 'ongoing'
            ? completedAt || new Date().toISOString().split('T')[0]
            : '',
        totalQuestions,
        questions: questions.slice(0, totalQuestions).map((q, idx) => ({
          questionNumber: idx + 1,
          title: q.title?.trim() || '',
          topic: q.topic?.trim() || '',
        })),
        notes: notes.trim() || '',
        createdAt: structureToEdit?.createdAt || now,
        updatedAt: now,
      };
      await onSave(payload, structureToEdit?.id);
      clearStructureFormDraft(formDraftKey);
      setIsDirty(false);
    } catch (err) {
      console.error('Save structure error:', err);
      setError(tr('حدث خطأ أثناء حفظ بيانات الهيكل', 'An error occurred while saving the structure'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <div
      dir={dir}
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 overflow-hidden"
      onClick={(e) => {
        if (e.target === e.currentTarget) requestSafeClose();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[94dvh] sm:max-h-[90vh] text-start"
      >
        <div className="shrink-0 px-4 sm:px-5 py-3.5 sm:py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Layers className="w-5 h-5 text-amber-500" />
            <h3 className="font-black text-base text-slate-900 dark:text-white">
              {structureToEdit ? tr('تعديل بيانات الهيكل', 'Edit Structure Details') : tr('إضافة هيكل جديد', 'Add New Structure')}
            </h3>
            {isDirty && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                <History className="w-3 h-3" />
                {tr('مسودة تقدم محفوظة', 'Progress draft saved')}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={requestSafeClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {pendingDraft && (
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="font-bold text-amber-900 dark:text-amber-100">
                  {tr('توجد مسودة تقدم محفوظة تلقائياً لهذا الهيكل من جلسة سابقة', 'An auto-saved draft for this structure exists from a previous session')}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleRestoreDraft}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{tr('استعادة البيانات', 'Restore Data')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDiscardDraft}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold cursor-pointer"
                >
                  {tr('تجاهل', 'Discard')}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl font-bold">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {tr('اسم / عنوان الهيكل *', 'Structure Title / Name *')}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  markDirty();
                  setTitle(e.target.value);
                }}
                placeholder={tr('مثال: هيكل الفيزياء النهائي - الفصل الثاني', 'e.g. Final Physics Structure - Term 2')}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {tr('كود الهيكل (اختياري)', 'Structure Code (Optional)')}
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  markDirty();
                  setCode(e.target.value);
                }}
                placeholder="STR-01"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">{tr('الصف الدراسي *', 'Grade *')}</label>
              <select
                value={grade}
                onChange={(e) => {
                  markDirty();
                  setGrade(e.target.value);
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold cursor-pointer"
              >
                {gradesList.map((g) => (
                  <option key={g} value={g}>{translateGrade(g, lang)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">{tr('الفصل الدراسي *', 'Academic Term *')}</label>
              <select
                value={term}
                onChange={(e) => {
                  markDirty();
                  setTerm(e.target.value);
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold cursor-pointer"
              >
                {ACADEMIC_TERMS.map((t) => (
                  <option key={t} value={t}>{translateTerm(t, lang)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">{tr('السنة الدراسية *', 'Academic Year *')}</label>
              <select
                value={academicYear}
                onChange={(e) => {
                  markDirty();
                  setAcademicYear(e.target.value);
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-semibold cursor-pointer"
              >
                {yearsList.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">{tr('المسار *', 'Track *')}</label>
              <select
                value={track}
                onChange={(e) => {
                  markDirty();
                  setTrack(e.target.value);
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold cursor-pointer"
              >
                {tracksList.map((trackOpt) => (
                  <option key={trackOpt} value={trackOpt}>{translateTrack(trackOpt, lang)}</option>
                ))}
                <option value="__custom__">{tr('+ مسار مخصص...', '+ Custom track...')}</option>
              </select>
              {track === '__custom__' && (
                <input
                  type="text"
                  value={customTrack}
                  onChange={(e) => {
                    markDirty();
                    setCustomTrack(e.target.value);
                  }}
                  placeholder={tr('اكتب اسم المسار...', 'Enter track name...')}
                  className="mt-1.5 w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-amber-400 rounded-xl"
                />
              )}
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">{tr('المادة *', 'Subject *')}</label>
              <select
                value={subject}
                onChange={(e) => {
                  markDirty();
                  setSubject(e.target.value);
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold cursor-pointer"
              >
                {subjectsList.map((s) => (
                  <option key={s} value={s}>{translateSubject(s, lang)}</option>
                ))}
                <option value="__custom__">{tr('+ مادة مخصصة...', '+ Custom subject...')}</option>
              </select>
              {subject === '__custom__' && (
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => {
                    markDirty();
                    setCustomSubject(e.target.value);
                  }}
                  placeholder={tr('اكتب اسم المادة...', 'Enter subject name...')}
                  className="mt-1.5 w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-amber-400 rounded-xl"
                />
              )}
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">{tr('الشعبة / المجموعة', 'Section / Group')}</label>
              <select
                value={group}
                onChange={(e) => {
                  markDirty();
                  setGroup(e.target.value);
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold cursor-pointer"
              >
                <option value="الكل">{tr('كل الشعب', 'All Groups')}</option>
                {(settings?.groups || []).map((grp) => (
                  <option key={grp} value={grp}>{grp}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {tr('عدد أسئلة الهيكل الكلي (1 - 100) *', 'Total Structure Questions (1 - 100) *')}
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={totalQuestions}
                onChange={(e) => handleTotalQuestionsChange(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono font-bold"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">{tr('تاريخ الهيكل', 'Structure Date')}</label>
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  markDirty();
                  setDate(e.target.value);
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {tr('موعد الامتحان (للتنبيهات الذكية)', 'Exam Date (Smart Alerts)')}
              </label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => {
                  markDirty();
                  setExamDate(e.target.value);
                }}
                className="w-full px-3 py-2 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          {/* Structure Completion / Exam Status Section */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
            <label className="block font-extrabold text-slate-800 dark:text-slate-100">
              {tr('حالة تدريس الهيكل وامتحان المادة', 'Structure Teaching & Exam Status')}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  markDirty();
                  setCompletionStatus('ongoing');
                }}
                className={`p-3 rounded-xl border text-start transition cursor-pointer flex items-start gap-2.5 ${
                  completionStatus === 'ongoing'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 ring-1 ring-emerald-500/30'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <Clock
                  className={`w-4 h-4 mt-0.5 shrink-0 ${
                    completionStatus === 'ongoing' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                  }`}
                />
                <div>
                  <span className="font-black text-slate-900 dark:text-white block">
                    {tr('مستمر وجاري الدراسة', 'Ongoing & In Study')}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    {tr('الهيكل ما زال قيد التدريس ولم تنتهِ دراسته', 'Structure is still being taught and studied')}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  markDirty();
                  setCompletionStatus('studied_not_examined');
                  if (!completedAt) {
                    setCompletedAt(new Date().toISOString().split('T')[0]);
                  }
                }}
                className={`p-3 rounded-xl border text-start transition cursor-pointer flex items-start gap-2.5 ${
                  completionStatus === 'studied_not_examined'
                    ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500 ring-1 ring-amber-500/30'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <BookOpenCheck
                  className={`w-4 h-4 mt-0.5 shrink-0 ${
                    completionStatus === 'studied_not_examined'
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-slate-400'
                  }`}
                />
                <div>
                  <span className="font-black text-slate-900 dark:text-white block">
                    {tr('منتهي دراسته ولم يُمتحن بعد', 'Studied - Pending Exam')}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    {tr('انتهى شرح الهيكل وبانتظار عقد امتحان المادة', 'Teaching finished, awaiting subject exam')}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  markDirty();
                  setCompletionStatus('completed');
                  if (!completedAt) {
                    setCompletedAt(new Date().toISOString().split('T')[0]);
                  }
                }}
                className={`p-3 rounded-xl border text-start transition cursor-pointer flex items-start gap-2.5 ${
                  completionStatus === 'completed'
                    ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 ring-1 ring-indigo-500/30'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <CheckCircle2
                  className={`w-4 h-4 mt-0.5 shrink-0 ${
                    completionStatus === 'completed' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
                  }`}
                />
                <div>
                  <span className="font-black text-slate-900 dark:text-white block">
                    {tr('انتهى وتم امتحان المادة', 'Completed & Examined')}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    {tr('تم الانتهاء من الهيكل وأُجري اختبار المادة', 'Structure finished and exam has been held')}
                  </span>
                </div>
              </button>
            </div>

            {completionStatus !== 'ongoing' && (
              <div className="pt-1 flex flex-wrap items-center gap-2">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  {completionStatus === 'studied_not_examined'
                    ? tr('تاريخ انتهاء دراسة الهيكل (اختياري):', 'Study Completion Date (Optional):')
                    : tr('تاريخ انتهاء الهيكل / امتحان المادة (اختياري):', 'Completion / Exam Date (Optional):')}
                </label>
                <input
                  type="date"
                  value={completedAt}
                  onChange={(e) => {
                    markDirty();
                    setCompletedAt(e.target.value);
                  }}
                  className={`px-2.5 py-1.5 bg-white dark:bg-slate-900 border rounded-lg text-slate-900 dark:text-white font-mono text-xs ${
                    completionStatus === 'studied_not_examined'
                      ? 'border-amber-300 dark:border-amber-800'
                      : 'border-indigo-200 dark:border-indigo-800'
                  }`}
                />
              </div>
            )}
          </div>

          {/* Optional Question Titles Editor */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {tr('تسمية أسئلة الهيكل والمهارات (اختياري لسهولة المتابعة)', 'Name Structure Questions & Skills (Optional)')}
              </span>
              <button
                type="button"
                onClick={() => setShowQuestionTitlesEditor((prev) => !prev)}
                className="text-amber-600 dark:text-amber-400 font-bold hover:underline cursor-pointer"
              >
                {showQuestionTitlesEditor
                  ? tr('إخفاء القائمة', 'Hide List')
                  : tr(`تحديد عناوين الـ ${totalQuestions} سؤال`, `Set Titles for ${totalQuestions} Questions`)}
              </button>
            </div>

            {showQuestionTitlesEditor && (
              <div className="max-h-52 overflow-y-auto space-y-2 pt-1 pe-1">
                {questions.map((qItem, idx) => (
                  <div key={qItem.questionNumber} className="flex items-center gap-2">
                    <span className="w-10 text-center font-mono font-bold text-amber-600 dark:text-amber-400 shrink-0">
                      {tr('س', 'Q')}{qItem.questionNumber}
                    </span>
                    <input
                      type="text"
                      value={qItem.title || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        markDirty();
                        setQuestions((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, title: val } : item))
                        );
                      }}
                      placeholder={tr(`عنوان أو موضوع السؤال ${qItem.questionNumber} (اختياري)`, `Title or topic for Q${qItem.questionNumber} (optional)`)}
                      className="flex-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">{tr('ملاحظات عامة', 'General Notes')}</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => {
                markDirty();
                setNotes(e.target.value);
              }}
              placeholder={tr('أي ملاحظات أو تعليمات خاصة بهذا الهيكل...', 'Any notes or instructions for this structure...')}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
            />
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={requestSafeClose}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
            >
              {tr('إلغاء', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black cursor-pointer disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? tr('جاري الحفظ...', 'Saving...') : structureToEdit ? tr('حفظ التعديلات', 'Save Changes') : tr('حفظ الهيكل', 'Save Structure')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <ConfirmModal
      isOpen={confirmState.isOpen}
      zIndexClass="z-[70]"
      title={confirmState.title}
      message={confirmState.message}
      confirmText={confirmState.confirmText}
      cancelText={confirmState.cancelText}
      isDestructive={confirmState.isDestructive}
      onConfirm={confirmState.onConfirm}
      onCancel={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
    />
    </>
  );
};

