import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  Calendar,
  Filter,
  CheckCircle2,
  Download,
  GraduationCap,
  BarChart3,
  Smartphone,
  Monitor,
  RotateCcw,
  Sparkles,
  Users,
  Layers,
  Search,
  Hash,
} from 'lucide-react';
import {
  Student,
  Exam,
  ExamResult,
  TeacherSettings,
  ExamStructure,
  StudentStructureProgress,
} from '../types';
import {
  exportCustomAcademicExcel,
  exportAllDataExcel,
  exportStructuresReportExcel,
  getSavedExcelPreferences,
  saveExcelPreferences,
} from '../utils/excel';
import { getEffectiveEnrollmentStatus } from '../utils/studentStatus';
import {
  StructureStatusFilter,
  getEffectiveStructureStatus,
  STRUCTURE_STATUS_META,
} from '../utils/structureStatus';
import { ACADEMIC_TERMS, ACADEMIC_TRACKS, ACADEMIC_YEARS } from '../services/firebase';
import {
  useLanguage,
  translateGrade,
  translateTerm,
  translateTrack,
  translateSubject,
} from '../utils/i18n';

export type ExcelExportModalMode = 'academic_reports' | 'structures_reports' | 'all_data';
export type SelectionScopeMode = 'all' | 'count' | 'specific';

interface ExcelExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  exams: Exam[];
  allResults: ExamResult[];
  settings: TeacherSettings;
  structures?: ExamStructure[];
  structureProgress?: StudentStructureProgress[];
  defaultGrade?: string;
  defaultSubject?: string;
  defaultTerm?: string;
  defaultStatus?: string;
  defaultExportMode?: ExcelExportModalMode;
  defaultTrack?: string;
  defaultYear?: string;
  defaultStructureId?: string;
  defaultStudentSelectionMode?: SelectionScopeMode;
  defaultStudentLimit?: number;
  defaultSelectedStudentIds?: string[];
  defaultStructureSelectionMode?: SelectionScopeMode;
  defaultStructureLimit?: number;
  defaultSelectedStructureIds?: string[];
  defaultStructureCompletionStatus?: StructureStatusFilter;
}

const MODAL_STATE_KEY = 'mh_excel_modal_saved_filters_v2';

export const ExcelExportModal: React.FC<ExcelExportModalProps> = ({
  isOpen,
  onClose,
  students,
  exams,
  allResults,
  settings,
  structures = [],
  structureProgress = [],
  defaultGrade,
  defaultSubject,
  defaultTerm,
  defaultStatus,
  defaultExportMode,
  defaultTrack,
  defaultYear,
  defaultStructureId,
  defaultStudentSelectionMode,
  defaultStudentLimit,
  defaultSelectedStudentIds,
  defaultStructureSelectionMode,
  defaultStructureLimit,
  defaultSelectedStructureIds,
  defaultStructureCompletionStatus,
}) => {
  const { lang, dir, tr } = useLanguage();
  const initialPrefs = useMemo(() => getSavedExcelPreferences(), []);

  const [selectedGrade, setSelectedGrade] = useState<string>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(MODAL_STATE_KEY) || '{}');
      return defaultGrade || saved.selectedGrade || 'الكل';
    } catch {
      return defaultGrade || 'الكل';
    }
  });

  const [selectedTerm, setSelectedTerm] = useState<string>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(MODAL_STATE_KEY) || '{}');
      return defaultTerm || saved.selectedTerm || 'الكل';
    } catch {
      return defaultTerm || 'الكل';
    }
  });

  const [selectedSubject, setSelectedSubject] = useState<string>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(MODAL_STATE_KEY) || '{}');
      return defaultSubject || saved.selectedSubject || 'الكل';
    } catch {
      return defaultSubject || 'الكل';
    }
  });

  const [selectedGroup, setSelectedGroup] = useState<string>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(MODAL_STATE_KEY) || '{}');
      return saved.selectedGroup || 'الكل';
    } catch {
      return 'الكل';
    }
  });

  const [enrollmentStatusFilter, setEnrollmentStatusFilter] = useState<string>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(MODAL_STATE_KEY) || '{}');
      return defaultStatus || saved.enrollmentStatusFilter || 'exclude_completed';
    } catch {
      return defaultStatus || 'exclude_completed';
    }
  });

  const [startDate, setStartDate] = useState<string>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(MODAL_STATE_KEY) || '{}');
      return saved.startDate || '';
    } catch {
      return '';
    }
  });

  const [endDate, setEndDate] = useState<string>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(MODAL_STATE_KEY) || '{}');
      return saved.endDate || '';
    } catch {
      return '';
    }
  });

  const [selectedTrack, setSelectedTrack] = useState<string>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(MODAL_STATE_KEY) || '{}');
      return defaultTrack || saved.selectedTrack || 'الكل';
    } catch {
      return defaultTrack || 'الكل';
    }
  });

  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(MODAL_STATE_KEY) || '{}');
      return defaultYear || saved.selectedAcademicYear || 'الكل';
    } catch {
      return defaultYear || 'الكل';
    }
  });

  // Student Selection Scope (All / Count / Specific 1..N)
  const [studentSelectionMode, setStudentSelectionMode] = useState<SelectionScopeMode>(() => {
    if (defaultStudentSelectionMode) return defaultStudentSelectionMode;
    if (defaultSelectedStudentIds && defaultSelectedStudentIds.length > 0) return 'specific';
    if (defaultStudentLimit && defaultStudentLimit > 0) return 'count';
    try {
      const saved = JSON.parse(localStorage.getItem(MODAL_STATE_KEY) || '{}');
      if (saved.studentSelectionMode === 'count' || saved.studentSelectionMode === 'specific') {
        return saved.studentSelectionMode;
      }
      return 'all';
    } catch {
      return 'all';
    }
  });

  const [studentLimit, setStudentLimit] = useState<number>(() => {
    if (defaultStudentLimit && defaultStudentLimit > 0) return defaultStudentLimit;
    try {
      const saved = JSON.parse(localStorage.getItem(MODAL_STATE_KEY) || '{}');
      return saved.studentLimit > 0 ? Number(saved.studentLimit) : 5;
    } catch {
      return 5;
    }
  });

  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(() => {
    if (defaultSelectedStudentIds && defaultSelectedStudentIds.length > 0) {
      return defaultSelectedStudentIds;
    }
    try {
      const saved = JSON.parse(localStorage.getItem(MODAL_STATE_KEY) || '{}');
      return Array.isArray(saved.selectedStudentIds) ? saved.selectedStudentIds : [];
    } catch {
      return [];
    }
  });

  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentQuickSelectCount, setStudentQuickSelectCount] = useState<number>(5);

  // Structure Selection Scope (All / Count / Specific 1..N)
  const [structureSelectionMode, setStructureSelectionMode] = useState<SelectionScopeMode>(() => {
    if (defaultStructureSelectionMode) return defaultStructureSelectionMode;
    if (defaultSelectedStructureIds && defaultSelectedStructureIds.length > 0) return 'specific';
    if (defaultStructureId && defaultStructureId !== 'الكل') return 'specific';
    if (defaultStructureLimit && defaultStructureLimit > 0) return 'count';
    return 'all';
  });

  const [structureLimit, setStructureLimit] = useState<number>(() => {
    if (defaultStructureLimit && defaultStructureLimit > 0) return defaultStructureLimit;
    try {
      const saved = JSON.parse(localStorage.getItem(MODAL_STATE_KEY) || '{}');
      return saved.structureLimit > 0 ? Number(saved.structureLimit) : 3;
    } catch {
      return 3;
    }
  });

  const [selectedStructureIds, setSelectedStructureIds] = useState<string[]>(() => {
    if (defaultSelectedStructureIds && defaultSelectedStructureIds.length > 0) {
      return defaultSelectedStructureIds;
    }
    if (defaultStructureId && defaultStructureId !== 'الكل') {
      return [defaultStructureId];
    }
    return [];
  });

  const [structureSearchQuery, setStructureSearchQuery] = useState('');
  const [structureQuickSelectCount, setStructureQuickSelectCount] = useState<number>(3);
  const [structureCompletionFilter, setStructureCompletionFilter] = useState<StructureStatusFilter>(() => {
    if (defaultStructureCompletionStatus) return defaultStructureCompletionStatus;
    try {
      const saved = JSON.parse(localStorage.getItem(MODAL_STATE_KEY) || '{}');
      if (
        saved.structureCompletionFilter === 'ongoing' ||
        saved.structureCompletionFilter === 'studied_not_examined' ||
        saved.structureCompletionFilter === 'completed'
      ) {
        return saved.structureCompletionFilter;
      }
      return 'all';
    } catch {
      return 'all';
    }
  });

  const [exportMode, setExportMode] = useState<ExcelExportModalMode>(() => {
    if (defaultExportMode) return defaultExportMode;
    try {
      const saved = JSON.parse(localStorage.getItem(MODAL_STATE_KEY) || '{}');
      if (saved.exportMode === 'all_data' || saved.exportMode === 'structures_reports') {
        return saved.exportMode;
      }
      return 'academic_reports';
    } catch {
      return 'academic_reports';
    }
  });

  useEffect(() => {
    if (!isOpen) return;
    if (defaultExportMode) setExportMode(defaultExportMode);
    if (defaultGrade) setSelectedGrade(defaultGrade);
    if (defaultTerm) setSelectedTerm(defaultTerm);
    if (defaultSubject) setSelectedSubject(defaultSubject);
    if (defaultStatus) setEnrollmentStatusFilter(defaultStatus);
    if (defaultTrack) setSelectedTrack(defaultTrack);
    if (defaultYear) setSelectedAcademicYear(defaultYear);

    if (defaultSelectedStudentIds && defaultSelectedStudentIds.length > 0) {
      setSelectedStudentIds(defaultSelectedStudentIds);
      setStudentSelectionMode(defaultStudentSelectionMode || 'specific');
    } else if (defaultStudentSelectionMode) {
      setStudentSelectionMode(defaultStudentSelectionMode);
    }
    if (defaultStudentLimit && defaultStudentLimit > 0) {
      setStudentLimit(defaultStudentLimit);
    }

    if (defaultSelectedStructureIds && defaultSelectedStructureIds.length > 0) {
      setSelectedStructureIds(defaultSelectedStructureIds);
      setStructureSelectionMode(defaultStructureSelectionMode || 'specific');
    } else if (defaultStructureId && defaultStructureId !== 'الكل') {
      setSelectedStructureIds([defaultStructureId]);
      setStructureSelectionMode(defaultStructureSelectionMode || 'specific');
    } else if (defaultStructureId === 'الكل' && !defaultStructureSelectionMode) {
      setStructureSelectionMode('all');
      setSelectedStructureIds([]);
    } else if (defaultStructureSelectionMode) {
      setStructureSelectionMode(defaultStructureSelectionMode);
    }
    if (defaultStructureLimit && defaultStructureLimit > 0) {
      setStructureLimit(defaultStructureLimit);
    }
    if (defaultStructureCompletionStatus) {
      setStructureCompletionFilter(defaultStructureCompletionStatus);
    }
  }, [
    isOpen,
    defaultExportMode,
    defaultGrade,
    defaultTerm,
    defaultSubject,
    defaultStatus,
    defaultTrack,
    defaultYear,
    defaultStructureId,
    defaultStudentSelectionMode,
    defaultStudentLimit,
    defaultSelectedStudentIds,
    defaultStructureSelectionMode,
    defaultStructureLimit,
    defaultSelectedStructureIds,
    defaultStructureCompletionStatus,
  ]);

  // Chart & Layout preferences
  const [includeChart, setIncludeChart] = useState<boolean>(initialPrefs.includeChart);
  const [layoutMode, setLayoutMode] = useState<'mobile' | 'desktop'>(initialPrefs.layoutMode);
  const [chartType, setChartType] = useState<'bars_and_columns' | 'bars_only' | 'distribution'>(
    initialPrefs.chartType
  );
  const [includeLogoHeader, setIncludeLogoHeader] = useState<boolean>(
    initialPrefs.includeLogoHeader !== undefined ? initialPrefs.includeLogoHeader : true
  );

  const [isExporting, setIsExporting] = useState(false);

  // Persist changes automatically
  useEffect(() => {
    saveExcelPreferences({
      includeChart,
      layoutMode,
      chartType,
      includeLogoHeader,
    });
  }, [includeChart, layoutMode, chartType, includeLogoHeader]);

  useEffect(() => {
    try {
      localStorage.setItem(
        MODAL_STATE_KEY,
        JSON.stringify({
          selectedGrade,
          selectedTerm,
          selectedSubject,
          selectedGroup,
          selectedTrack,
          selectedAcademicYear,
          enrollmentStatusFilter,
          startDate,
          endDate,
          exportMode,
          studentSelectionMode,
          studentLimit,
          selectedStudentIds,
          structureSelectionMode,
          structureLimit,
          selectedStructureIds,
          structureCompletionFilter,
        })
      );
    } catch {
      // ignore
    }
  }, [
    selectedGrade,
    selectedTerm,
    selectedSubject,
    selectedGroup,
    selectedTrack,
    selectedAcademicYear,
    enrollmentStatusFilter,
    startDate,
    endDate,
    exportMode,
    studentSelectionMode,
    studentLimit,
    selectedStudentIds,
    structureSelectionMode,
    structureLimit,
    selectedStructureIds,
    structureCompletionFilter,
  ]);

  const handleResetAll = () => {
    setSelectedGrade('الكل');
    setSelectedTerm('الكل');
    setSelectedSubject('الكل');
    setSelectedGroup('الكل');
    setSelectedTrack('الكل');
    setSelectedAcademicYear('الكل');
    setStudentSelectionMode('all');
    setStudentLimit(5);
    setSelectedStudentIds([]);
    setStudentSearchQuery('');
    setStructureSelectionMode('all');
    setStructureLimit(3);
    setSelectedStructureIds([]);
    setStructureSearchQuery('');
    setStructureCompletionFilter('all');
    setEnrollmentStatusFilter('exclude_completed');
    setStartDate('');
    setEndDate('');
    setExportMode(defaultExportMode || 'academic_reports');
    setIncludeChart(true);
    setLayoutMode('mobile');
    setChartType('bars_and_columns');
    setIncludeLogoHeader(true);
    try {
      localStorage.removeItem(MODAL_STATE_KEY);
    } catch {
      // ignore
    }
  };

  // Available subjects, tracks, years from settings, students & structures
  const availableSubjects = useMemo(() => {
    const set = new Set<string>();
    settings.subjects?.forEach(s => set.add(s));
    students.forEach(s => { if (s.subject) set.add(s.subject); });
    structures.forEach(st => { if (st.subject) set.add(st.subject); });
    return Array.from(set);
  }, [settings.subjects, students, structures]);

  const availableTracks = useMemo(() => {
    const set = new Set<string>(ACADEMIC_TRACKS);
    structures.forEach(st => { if (st.track) set.add(st.track); });
    students.forEach(s => { if (s.track) set.add(s.track); });
    return Array.from(set);
  }, [structures, students]);

  const availableYears = useMemo(() => {
    const set = new Set<string>(ACADEMIC_YEARS);
    structures.forEach(st => { if (st.academicYear) set.add(st.academicYear); });
    return Array.from(set);
  }, [structures]);

  // Base filtered students (before count/specific slice)
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (selectedGrade !== 'الكل' && s.grade !== selectedGrade) return false;
      if (selectedTerm !== 'الكل' && s.term && s.term !== selectedTerm) return false;
      if (selectedSubject !== 'الكل' && s.subject !== selectedSubject && !(Array.isArray(s.subjects) && s.subjects.includes(selectedSubject))) return false;
      if (selectedGroup !== 'الكل' && s.group !== selectedGroup) return false;

      const effStatus = getEffectiveEnrollmentStatus(s);
      if (enrollmentStatusFilter === 'exclude_completed') {
        if (effStatus === 'completed') return false;
      } else if (enrollmentStatusFilter !== 'الكل') {
        if (effStatus !== enrollmentStatusFilter) return false;
      }
      return true;
    });
  }, [students, selectedGrade, selectedTerm, selectedSubject, selectedGroup, enrollmentStatusFilter]);

  const studentByIdMap = useMemo(() => new Map(students.map(s => [s.id, s])), [students]);
  const examMap = useMemo(() => new Map(exams.map(e => [e.id, e])), [exams]);

  // Base structures matching metadata filters (before structureCompletionFilter & count/specific)
  const metadataMatchingStructures = useMemo(() => {
    return structures.filter(st => {
      if (selectedGrade !== 'الكل' && st.grade !== selectedGrade) return false;
      if (selectedTerm !== 'الكل' && st.term !== selectedTerm) return false;
      if (selectedTrack !== 'الكل' && st.track !== selectedTrack) return false;
      if (selectedAcademicYear !== 'الكل' && st.academicYear !== selectedAcademicYear) return false;
      if (selectedSubject !== 'الكل' && st.subject !== selectedSubject) return false;
      return true;
    });
  }, [structures, selectedGrade, selectedTerm, selectedTrack, selectedAcademicYear, selectedSubject]);

  const structureCompletionCounts = useMemo(() => {
    let ongoing = 0;
    let studiedNotExamined = 0;
    let completed = 0;
    metadataMatchingStructures.forEach(st => {
      const eff = getEffectiveStructureStatus(st);
      if (eff === 'completed') completed += 1;
      else if (eff === 'studied_not_examined') studiedNotExamined += 1;
      else ongoing += 1;
    });
    return {
      all: metadataMatchingStructures.length,
      ongoing,
      studiedNotExamined,
      completed,
    };
  }, [metadataMatchingStructures]);

  // Base structures matching metadata filters + structureCompletionFilter (all / ongoing / studied_not_examined / completed)
  const baseMatchingStructures = useMemo(() => {
    if (structureCompletionFilter === 'all') return metadataMatchingStructures;
    return metadataMatchingStructures.filter(
      st => getEffectiveStructureStatus(st) === structureCompletionFilter
    );
  }, [metadataMatchingStructures, structureCompletionFilter]);

  // Effective structures after applying structureSelectionMode (all / count / specific)
  const effectiveStructuresList = useMemo(() => {
    let list = baseMatchingStructures;
    if (structureSelectionMode === 'specific') {
      const idSet = new Set(selectedStructureIds);
      list = list.filter(st => idSet.has(st.id));
    } else if (structureSelectionMode === 'count') {
      const limit = Math.max(1, Math.floor(structureLimit || 1));
      list = list.slice(0, limit);
    }
    return list;
  }, [baseMatchingStructures, structureSelectionMode, selectedStructureIds, structureLimit]);

  const effectiveStructureIdsSet = useMemo(
    () => new Set(effectiveStructuresList.map(st => st.id)),
    [effectiveStructuresList]
  );

  // Base structure progress matching metadata filters + effective structures
  const baseMatchingStructureProgress = useMemo(() => {
    return structureProgress.filter(rec => {
      if (!effectiveStructureIdsSet.has(rec.structureId)) return false;
      if (selectedGrade !== 'الكل' && rec.grade !== selectedGrade) return false;
      if (selectedTerm !== 'الكل' && rec.term !== selectedTerm) return false;
      if (selectedTrack !== 'الكل' && rec.track !== selectedTrack) return false;
      if (selectedAcademicYear !== 'الكل' && rec.academicYear !== selectedAcademicYear) return false;
      if (selectedSubject !== 'الكل' && rec.subject !== selectedSubject) return false;

      const recDate = rec.date || (rec.updatedAt ? rec.updatedAt.split('T')[0] : '');
      if (startDate && recDate && recDate < startDate) return false;
      if (endDate && recDate && recDate > endDate) return false;

      const st = studentByIdMap.get(rec.studentDocId);
      if (st) {
        if (selectedGroup !== 'الكل' && st.group !== selectedGroup) return false;
        const effStatus = getEffectiveEnrollmentStatus(st);
        if (enrollmentStatusFilter === 'exclude_completed' && effStatus === 'completed') return false;
        if (enrollmentStatusFilter !== 'الكل' && enrollmentStatusFilter !== 'exclude_completed' && effStatus !== enrollmentStatusFilter) {
          return false;
        }
      }
      return true;
    });
  }, [
    structureProgress,
    effectiveStructureIdsSet,
    selectedGrade,
    selectedTerm,
    selectedTrack,
    selectedAcademicYear,
    selectedSubject,
    selectedGroup,
    startDate,
    endDate,
    studentByIdMap,
    enrollmentStatusFilter,
  ]);

  // Candidate students for checklist picker (sorted so structure-recorded students come first in structures mode)
  const candidateStudentsForPicker = useMemo(() => {
    if (exportMode !== 'structures_reports') return filteredStudents;
    const recordedSet = new Set(baseMatchingStructureProgress.map(p => p.studentDocId));
    const list = [...filteredStudents];
    // Include any recorded student even if track/term differs slightly on profile
    baseMatchingStructureProgress.forEach(p => {
      if (!list.some(s => s.id === p.studentDocId)) {
        const stObj = studentByIdMap.get(p.studentDocId);
        if (stObj) {
          const eff = getEffectiveEnrollmentStatus(stObj);
          if (enrollmentStatusFilter === 'exclude_completed' && eff === 'completed') return;
          if (enrollmentStatusFilter !== 'الكل' && enrollmentStatusFilter !== 'exclude_completed' && eff !== enrollmentStatusFilter) return;
          list.push(stObj);
        }
      }
    });
    return list.sort((a, b) => {
      const aHas = recordedSet.has(a.id) ? 0 : 1;
      const bHas = recordedSet.has(b.id) ? 0 : 1;
      if (aHas !== bHas) return aHas - bHas;
      return a.name.localeCompare(b.name, 'ar');
    });
  }, [exportMode, filteredStudents, baseMatchingStructureProgress, studentByIdMap, enrollmentStatusFilter]);

  const searchableStudentsList = useMemo(() => {
    const q = studentSearchQuery.trim().toLowerCase();
    if (!q) return candidateStudentsForPicker;
    return candidateStudentsForPicker.filter(
      s =>
        s.name.toLowerCase().includes(q) ||
        s.studentId.toLowerCase().includes(q) ||
        (s.grade || '').toLowerCase().includes(q) ||
        (s.group || '').toLowerCase().includes(q)
    );
  }, [candidateStudentsForPicker, studentSearchQuery]);

  const searchableStructuresList = useMemo(() => {
    const q = structureSearchQuery.trim().toLowerCase();
    if (!q) return baseMatchingStructures;
    return baseMatchingStructures.filter(
      st =>
        st.title.toLowerCase().includes(q) ||
        (st.grade || '').toLowerCase().includes(q) ||
        (st.subject || '').toLowerCase().includes(q) ||
        (st.track || '').toLowerCase().includes(q)
    );
  }, [baseMatchingStructures, structureSearchQuery]);

  // Effective filteredStudents after applying studentSelectionMode (all / count / specific)
  const effectiveStudentsList = useMemo(() => {
    let list = filteredStudents;
    if (studentSelectionMode === 'specific') {
      const idSet = new Set(selectedStudentIds);
      list = list.filter(s => idSet.has(s.id));
    } else if (studentSelectionMode === 'count') {
      const limit = Math.max(1, Math.floor(studentLimit || 1));
      list = list.slice(0, limit);
    }
    return list;
  }, [filteredStudents, studentSelectionMode, selectedStudentIds, studentLimit]);

  const effectiveStudentIdsSet = useMemo(
    () => new Set(effectiveStudentsList.map(s => s.id)),
    [effectiveStudentsList]
  );

  const filteredResults = useMemo(() => {
    return allResults.filter(r => {
      if (!effectiveStudentIdsSet.has(r.studentDocId)) return false;
      if (startDate && r.examDate < startDate) return false;
      if (endDate && r.examDate > endDate) return false;
      if (selectedTerm !== 'الكل') {
        const ex = examMap.get(r.examId);
        if (ex && ex.term && ex.term !== selectedTerm) return false;
      }
      return true;
    });
  }, [allResults, effectiveStudentIdsSet, startDate, endDate, selectedTerm, examMap]);

  // Effective Structure Progress after applying studentSelectionMode
  const effectiveStructureProgressList = useMemo(() => {
    let list = baseMatchingStructureProgress;
    if (studentSelectionMode === 'specific') {
      const idSet = new Set(selectedStudentIds);
      list = list.filter(p => idSet.has(p.studentDocId));
    } else if (studentSelectionMode === 'count') {
      const limit = Math.max(1, Math.floor(studentLimit || 1));
      const allowedUniqueStudentIds: string[] = [];
      const seen = new Set<string>();
      for (const rec of list) {
        if (!seen.has(rec.studentDocId)) {
          seen.add(rec.studentDocId);
          allowedUniqueStudentIds.push(rec.studentDocId);
          if (allowedUniqueStudentIds.length >= limit) break;
        }
      }
      const allowedSet = new Set(allowedUniqueStudentIds);
      list = list.filter(p => allowedSet.has(p.studentDocId));
    }
    return list;
  }, [baseMatchingStructureProgress, studentSelectionMode, selectedStudentIds, studentLimit]);

  const uniqueStructureStudentsCount = useMemo(
    () => new Set(effectiveStructureProgressList.map(p => p.studentDocId)).size,
    [effectiveStructureProgressList]
  );

  // Selection toggles & batch helpers
  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleStructureSelection = (id: string) => {
    setSelectedStructureIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  if (!isOpen) return null;

  const hasValidStudentSelection =
    studentSelectionMode !== 'specific' || selectedStudentIds.length > 0;
  const hasValidStructureSelection =
    exportMode !== 'structures_reports' ||
    structureSelectionMode !== 'specific' ||
    selectedStructureIds.length > 0;

  const canExport =
    hasValidStudentSelection &&
    hasValidStructureSelection &&
    (exportMode === 'structures_reports'
      ? effectiveStructuresList.length > 0 || effectiveStructureProgressList.length > 0
      : effectiveStudentsList.length > 0);

  const handleExport = () => {
    if (!canExport) return;
    setIsExporting(true);
    try {
      const exportStudentIds =
        studentSelectionMode === 'specific' ? selectedStudentIds : undefined;
      const exportStudentLimit =
        studentSelectionMode === 'count' ? Math.max(1, Math.floor(studentLimit || 1)) : undefined;

      const exportStructureIds =
        structureSelectionMode === 'specific' ? selectedStructureIds : undefined;
      const exportStructureLimit =
        structureSelectionMode === 'count'
          ? Math.max(1, Math.floor(structureLimit || 1))
          : undefined;

      if (exportMode === 'academic_reports') {
        exportCustomAcademicExcel(
          students,
          exams,
          allResults,
          {
            grade: selectedGrade,
            term: selectedTerm,
            subject: selectedSubject,
            group: selectedGroup,
            enrollmentStatus: enrollmentStatusFilter,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            studentIds: exportStudentIds,
            studentLimit: exportStudentLimit,
            includeChart,
            layoutMode,
            chartType,
            includeLogoHeader,
          },
          settings.gradingScale
        );
      } else if (exportMode === 'structures_reports') {
        exportStructuresReportExcel(structures, structureProgress, students, {
          grade: selectedGrade,
          term: selectedTerm,
          track: selectedTrack,
          academicYear: selectedAcademicYear,
          subject: selectedSubject,
          group: selectedGroup,
          structureCompletionStatus: structureCompletionFilter,
          structureId:
            exportStructureIds && exportStructureIds.length === 1
              ? exportStructureIds[0]
              : 'الكل',
          structureIds: exportStructureIds,
          structureLimit: exportStructureLimit,
          studentIds: exportStudentIds,
          studentLimit: exportStudentLimit,
          enrollmentStatus: enrollmentStatusFilter,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          includeChart,
          layoutMode,
          chartType,
          includeLogoHeader,
        });
      } else {
        exportAllDataExcel(filteredStudents, exams, allResults, settings, {
          studentIds: exportStudentIds,
          studentLimit: exportStudentLimit,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          term: selectedTerm,
          includeChart,
          layoutMode,
          chartType,
          includeLogoHeader,
        });
      }
      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 400);
    } catch (err) {
      console.error('Export failed:', err);
      setIsExporting(false);
    }
  };

  // Quick date presets
  const handleQuickPreset = (type: 'this_month' | 'last_30' | 'all') => {
    const today = new Date();
    if (type === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (type === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    } else if (type === 'last_30') {
      const priorDate = new Date();
      priorDate.setDate(today.getDate() - 30);
      setStartDate(priorDate.toISOString().split('T')[0]);
      setEndDate(today.toISOString().split('T')[0]);
    }
  };

  return (
    <div
      dir={dir}
      className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-hidden"
      onClick={onClose}
    >
      <div
        id="excel-export-modal"
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-2xl w-full flex flex-col max-h-[92dvh] sm:max-h-[90vh] shadow-2xl border border-slate-200 dark:border-slate-800 text-start overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="shrink-0 p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg">
                {tr('مركز تصدير Excel والرسوم البيانية', 'Excel & Charts Export Center')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {tr('إعداداتك محفوظة تلقائياً — يمكنك المتابعة أو البدء بإعدادات جديدة', 'Your preferences are auto-saved — continue or reset filters')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetAll}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              title={tr('البدء من جديد وإعادة ضبط إعدادات التصدير', 'Reset all export filters')}
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
              <span>{tr('البدء من جديد', 'Reset')}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">

          {/* Format Type Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              {tr('تنسيق ونوع التقرير المطلوب:', 'Report Format & Type:')}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setExportMode('academic_reports')}
                className={`p-3.5 rounded-2xl border text-start transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                  exportMode === 'academic_reports'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-200 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-bold text-xs">{tr('تقارير الطلاب الأكاديمية (مع الرسم البياني)', 'Academic Student Reports (with Chart)')}</span>
                  <CheckCircle2 className={`w-4 h-4 shrink-0 ${exportMode === 'academic_reports' ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'}`} />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  {tr('ملخص أداء الطلاب + تقارير مفصلة لكل طالب ودرجة كل امتحان وملاحظات التقدم', 'Student performance summary + per-student exam breakdown & notes')}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setExportMode('structures_reports')}
                className={`p-3.5 rounded-2xl border text-start transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                  exportMode === 'structures_reports'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-200 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-bold text-xs">{tr('تقارير قسم الهياكل ونسب الأسئلة', 'Structures & Question Mastery Reports')}</span>
                  <CheckCircle2 className={`w-4 h-4 shrink-0 ${exportMode === 'structures_reports' ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'}`} />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  {tr('ملخص الهياكل + تقارير مفصلة لكل طالب وسؤال + مصفوفة النسب + الرسم البياني', 'Structures summary + student question matrix + completion chart')}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setExportMode('all_data')}
                className={`p-3.5 rounded-2xl border text-start transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                  exportMode === 'all_data'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-200 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-bold text-xs">{tr('سجل الجداول الشامل (جميع الشيتات)', 'Complete Workbook (All Sheets)')}</span>
                  <CheckCircle2 className={`w-4 h-4 shrink-0 ${exportMode === 'all_data' ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'}`} />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  {tr('ملف شامل بـ 4 شيتات: قائمة الطلاب وحالاتهم، سجل الدرجات، بيانات الامتحانات، والإحصائيات', '4-sheet workbook: students, grades ledger, exams directory & stats')}
                </p>
              </button>
            </div>
          </div>

          {/* Chart & Sheet Layout / Mobile Sizing Options */}
          <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200/80 dark:border-indigo-800/60 space-y-3.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>{tr('إعدادات الرسم البياني ومقاسات الشيت (وضع الهاتف والكمبيوتر):', 'Chart & Sheet Sizing Settings (Mobile / Desktop):')}</span>
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                {tr('محفوظ تلقائياً', 'Auto-saved')}
              </span>
            </div>

            {/* Layout Mode: Mobile vs Desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setLayoutMode('mobile')}
                className={`p-3 rounded-xl border text-start transition-all cursor-pointer flex items-start gap-2.5 ${
                  layoutMode === 'mobile'
                    ? 'bg-white dark:bg-slate-900 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'bg-white/60 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 hover:bg-white'
                }`}
              >
                <Smartphone className={`w-5 h-5 shrink-0 mt-0.5 ${layoutMode === 'mobile' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>{tr('وضع الهاتف المحمول (موصى به)', 'Mobile Layout (Recommended)')}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    {tr('ضبط مساحات وأبعاد الشيت ودمج الأعمدة ليظهر التقرير والرسم البياني بوضوح تام على شاشة الهاتف بدون تمرير مزعج', 'Compact columns and merged cells optimized for crystal-clear mobile viewing')}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setLayoutMode('desktop')}
                className={`p-3 rounded-xl border text-start transition-all cursor-pointer flex items-start gap-2.5 ${
                  layoutMode === 'desktop'
                    ? 'bg-white dark:bg-slate-900 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'bg-white/60 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 hover:bg-white'
                }`}
              >
                <Monitor className={`w-5 h-5 shrink-0 mt-0.5 ${layoutMode === 'desktop' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                <div>
                  <div className="font-bold text-xs text-slate-900 dark:text-white">
                    {tr('الوضع المكتبي الواسع (كمبيوتر)', 'Desktop Wide Layout')}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    {tr('جداول عريضة بـ 8 أعمدة منفصلة مع مساحات واسعة للشاشات الكبيرة والطباعة المكتبية', 'Wide tables with 8 separate columns tailored for large monitors and printing')}
                  </p>
                </div>
              </button>
            </div>

            {/* Include Visual Chart Toggle & Style */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-indigo-200/60 dark:border-indigo-800/50">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeChart}
                  onChange={(e) => setIncludeChart(e.target.checked)}
                  className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  {tr('إضافة الرسم البياني للدرجات والتقديرات داخل التقرير', 'Include scores & grade distribution chart in workbook')}
                </span>
              </label>

              {includeChart && (
                <select
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value as any)}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-700 text-slate-800 dark:text-slate-200 rounded-xl text-[11px] font-bold cursor-pointer"
                >
                  <option value="bars_and_columns">{tr('أشرطة تقدم + مخطط أعمدة رأسي + توزيع نسبي', 'Progress Bars + Column Chart + Distribution')}</option>
                  <option value="bars_only">{tr('أشرطة تقدم الدرجات وتوزيع التقديرات (مدمج)', 'Score Progress Bars & Bands (Compact)')}</option>
                  <option value="distribution">{tr('توزيع التقديرات والنسب فقط', 'Distribution Breakdown Only')}</option>
                </select>
              )}
            </div>

            {/* Include Identity Logo / Brand Header Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-indigo-200/60 dark:border-indigo-800/50">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeLogoHeader}
                  onChange={(e) => setIncludeLogoHeader(e.target.checked)}
                  className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span>🖼️</span>
                  {tr('تضمين هوية وترويسة الشعار المعتمد في شيت الإكسيل', 'Include official brand header & logo in Excel sheet')}
                </span>
              </label>

              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
                includeLogoHeader
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}>
                {includeLogoHeader ? tr('مع الشعار ✔', 'With Logo ✔') : tr('بدون إضافة', 'No Logo')}
              </span>
            </div>
          </div>

          {/* Filtering Options */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-amber-500" />
                <span>{tr('فلاتر الاستخراج (الصف / الترم / المادة / حالة ملف الطالب / الفترة):', 'Export Filters (Grade / Term / Subject / Status / Date):')}</span>
              </h4>

              {/* Quick status chips */}
              <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => setEnrollmentStatusFilter('exclude_completed')}
                  className={`px-2 py-0.5 rounded-lg font-bold border transition cursor-pointer ${
                    enrollmentStatusFilter === 'exclude_completed'
                      ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-emerald-600 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50'
                  }`}
                  title={tr('منع تصدير تقارير للطلبة الذين انتهى الكورس لهم', 'Exclude students who completed the course')}
                >
                  🚫 {tr('استبعاد منتهي الملف', 'Exclude Completed')}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTerm(selectedTerm === 'الفصل الأول' ? 'الكل' : 'الفصل الأول')}
                  className={`px-2 py-0.5 rounded-lg font-bold border transition cursor-pointer ${
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
                  className={`px-2 py-0.5 rounded-lg font-bold border transition cursor-pointer ${
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
                  className={`px-2 py-0.5 rounded-lg font-bold border transition cursor-pointer ${
                    selectedTerm === 'الفصل الثالث'
                      ? 'bg-amber-500 text-slate-950 border-amber-600'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {translateTerm('الفصل الثالث', lang)}
                </button>
              </div>
            </div>

            {/* Grade, Term, Subject & Student File Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  {tr('الصف الدراسي:', 'Grade:')}
                </label>
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="w-full px-2.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-medium cursor-pointer"
                >
                  <option value="الكل">{tr('كافة الصفوف', 'All Grades')}</option>
                  {settings.grades.map((g) => (
                    <option key={g} value={g}>{translateGrade(g, lang)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>{tr('الفصل الدراسي (الترم):', 'Academic Term:')}</span>
                  {selectedTerm !== 'الكل' && (
                    <span className="text-[10px] text-amber-500 font-bold">{tr('محدد', 'Selected')}</span>
                  )}
                </label>
                <select
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                  className="w-full px-2.5 py-2 bg-white dark:bg-slate-900 border border-amber-300/80 dark:border-amber-700/80 text-slate-900 dark:text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  <option value="الكل">{tr('كافة الفصول الثلاثة', 'All Three Terms')}</option>
                  {ACADEMIC_TERMS.map((t) => (
                    <option key={t} value={t}>{translateTerm(t, lang)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  {tr('المادة الدراسية:', 'Subject:')}
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-2.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-medium cursor-pointer"
                >
                  <option value="الكل">{tr('كافة المواد', 'All Subjects')}</option>
                  {availableSubjects.map((s) => (
                    <option key={s} value={s}>{translateSubject(s, lang)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>{tr('حالة ملف الطالب:', 'Student Status:')}</span>
                  {enrollmentStatusFilter === 'exclude_completed' && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">{tr('استبعاد المنتهي', 'Exclude Completed')}</span>
                  )}
                </label>
                <select
                  value={enrollmentStatusFilter}
                  onChange={(e) => setEnrollmentStatusFilter(e.target.value)}
                  className="w-full px-2.5 py-2 bg-white dark:bg-slate-900 border border-emerald-300/80 dark:border-emerald-700/80 text-slate-900 dark:text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  <option value="exclude_completed">{tr('🚫 استبعاد منتهي الملف (الفعال فقط) [موصى به]', '🚫 Exclude Completed (Active Only) [Recommended]')}</option>
                  <option value="active">{tr('🟢 ملف فعال (مستمر بالكورس فقط)', '🟢 Active (Currently Enrolled)')}</option>
                  <option value="completed">{tr('🎓 منتهي الكورس فقط (الخريجون)', '🎓 Completed Course Only')}</option>
                  <option value="paused">{tr('🟡 متوقف مؤقتاً / مؤجل', '🟡 Paused / Deferred')}</option>
                  <option value="withdrawn">{tr('🔴 منقطع عن الكورس', '🔴 Withdrawn')}</option>
                  <option value="الكل">{tr('🌐 كافة الطلاب (يشمل منتهي الملف)', '🌐 All Students (Includes Completed)')}</option>
                </select>
              </div>
            </div>

            {/* Extra Filters for Structures (Track, Year, Completion Status) */}
            {exportMode === 'structures_reports' && (
              <div className="space-y-3 pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      {tr('المسار الدراسي:', 'Academic Track:')}
                    </label>
                    <select
                      value={selectedTrack}
                      onChange={(e) => setSelectedTrack(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-medium cursor-pointer"
                    >
                      <option value="الكل">{tr('كافة المسارات', 'All Tracks')}</option>
                      {availableTracks.map((trk) => (
                        <option key={trk} value={trk}>{translateTrack(trk, lang)}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                      {tr('السنة الدراسية:', 'Academic Year:')}
                    </label>
                    <select
                      value={selectedAcademicYear}
                      onChange={(e) => setSelectedAcademicYear(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-mono font-bold cursor-pointer"
                    >
                      <option value="الكل">{tr('كل السنوات', 'All Years')}</option>
                      {availableYears.map((yr) => (
                        <option key={yr} value={yr}>{yr}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Structure Completion Status Filter */}
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>{tr('تصفية الهياكل حسب الحالة:', 'Filter Structures by Status:')}</span>
                  </span>
                  <div className="inline-flex flex-wrap bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setStructureCompletionFilter('all')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer whitespace-nowrap ${
                        structureCompletionFilter === 'all'
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60'
                      }`}
                    >
                      {tr('جميع الهياكل', 'All Structures')} ({structureCompletionCounts.all})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStructureCompletionFilter('ongoing');
                        setSelectedStructureIds(prev => {
                          const kept = prev.filter(id => {
                            const st = metadataMatchingStructures.find(s => s.id === id);
                            return st ? getEffectiveStructureStatus(st) === 'ongoing' : false;
                          });
                          if (kept.length === 0 && structureSelectionMode === 'specific') {
                            setStructureSelectionMode('all');
                          }
                          return kept;
                        });
                      }}
                      className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer whitespace-nowrap ${
                        structureCompletionFilter === 'ongoing'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60'
                      }`}
                    >
                      {tr('مستمرة وجاري الدراسة', 'Ongoing')} ({structureCompletionCounts.ongoing})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStructureCompletionFilter('studied_not_examined');
                        setSelectedStructureIds(prev => {
                          const kept = prev.filter(id => {
                            const st = metadataMatchingStructures.find(s => s.id === id);
                            return st
                              ? getEffectiveStructureStatus(st) === 'studied_not_examined'
                              : false;
                          });
                          if (kept.length === 0 && structureSelectionMode === 'specific') {
                            setStructureSelectionMode('all');
                          }
                          return kept;
                        });
                      }}
                      className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer whitespace-nowrap ${
                        structureCompletionFilter === 'studied_not_examined'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60'
                      }`}
                    >
                      {tr('منتهية دراسة ولم تُمتحن', 'Studied • Not Examined')} ({structureCompletionCounts.studiedNotExamined})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStructureCompletionFilter('completed');
                        setSelectedStructureIds(prev => {
                          const kept = prev.filter(id => {
                            const st = metadataMatchingStructures.find(s => s.id === id);
                            return st ? getEffectiveStructureStatus(st) === 'completed' : false;
                          });
                          if (kept.length === 0 && structureSelectionMode === 'specific') {
                            setStructureSelectionMode('all');
                          }
                          return kept;
                        });
                      }}
                      className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer whitespace-nowrap ${
                        structureCompletionFilter === 'completed'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60'
                      }`}
                    >
                      {tr('منتهية وتم الامتحان', 'Completed & Examined')} ({structureCompletionCounts.completed})
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Structure Selection Scope */}
            {exportMode === 'structures_reports' && (
              <div className="pt-3 border-t border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-amber-500" />
                    <span>{tr('نطاق الهياكل المشمولة بالتصدير', 'Structures Included in Export')} ({baseMatchingStructures.length} {tr('مطابق', 'matching')}):</span>
                  </label>
                  <div className="inline-flex bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setStructureSelectionMode('all')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer whitespace-nowrap ${
                        structureSelectionMode === 'all'
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {tr('كل الهياكل', 'All Structures')} ({baseMatchingStructures.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStructureSelectionMode('count')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer whitespace-nowrap ${
                        structureSelectionMode === 'count'
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {tr('عدد معين من الهياكل', 'Specific Count')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setStructureSelectionMode('specific')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer whitespace-nowrap ${
                        structureSelectionMode === 'specific'
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {tr('هيكل محدد / عدة هياكل', 'Pick Structures')} ({selectedStructureIds.length})
                    </button>
                  </div>
                </div>

                {structureSelectionMode === 'count' && (
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-300/70 dark:border-amber-800/70 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                    <div className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="font-bold text-slate-700 dark:text-slate-200">
                        {tr('تصدير أول', 'Export top')}
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={Math.max(1, baseMatchingStructures.length)}
                        value={structureLimit}
                        onChange={(e) => setStructureLimit(Math.max(1, Number(e.target.value) || 1))}
                        className="w-16 px-2 py-1 text-center font-mono tabular-nums font-black bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      />
                      <span className="font-bold text-slate-700 dark:text-slate-200">
                        {tr(`هيكل من أصل ${baseMatchingStructures.length}`, `of ${baseMatchingStructures.length} structures`)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1">
                      {[1, 2, 3, 5, 10].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setStructureLimit(preset)}
                          className={`px-2 py-1 rounded-lg font-mono font-bold text-[11px] border transition cursor-pointer ${
                            structureLimit === preset
                              ? 'bg-amber-500 text-slate-950 border-amber-600'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {structureSelectionMode === 'specific' && (
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-300/70 dark:border-amber-800/70 space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative flex-1 min-w-[160px]">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute start-2.5 top-2 pointer-events-none" />
                        <input
                          type="text"
                          value={structureSearchQuery}
                          onChange={(e) => setStructureSearchQuery(e.target.value)}
                          placeholder={tr('بحث باسم الهيكل أو الصف أو المادة...', 'Search by structure title, grade or subject...')}
                          className="w-full ps-8 pe-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white text-start"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-1 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setSelectedStructureIds(searchableStructuresList.map(s => s.id))}
                          className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-500/20 text-slate-700 dark:text-slate-200 font-bold cursor-pointer whitespace-nowrap"
                        >
                          {tr('تحديد الكل', 'Select All')} ({searchableStructuresList.length})
                        </button>

                        <div className="inline-flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-1.5 py-0.5">
                          <input
                            type="number"
                            min={1}
                            max={Math.max(1, searchableStructuresList.length)}
                            value={structureQuickSelectCount}
                            onChange={(e) => setStructureQuickSelectCount(Math.max(1, Number(e.target.value) || 1))}
                            className="w-10 text-center font-mono font-bold text-[11px] bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedStructureIds(
                                searchableStructuresList.slice(0, Math.max(1, structureQuickSelectCount)).map(s => s.id)
                              )
                            }
                            className="px-1.5 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-black cursor-pointer whitespace-nowrap"
                          >
                            {tr('تحديد عدد', 'Pick N')}
                          </button>
                        </div>

                        {selectedStructureIds.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setSelectedStructureIds([])}
                            className="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold cursor-pointer whitespace-nowrap"
                          >
                            {tr('إلغاء التحديد', 'Clear')}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
                      {searchableStructuresList.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">
                          {tr('لا توجد هياكل مطابقة للبحث والفلاتر', 'No structures match current filters')}
                        </div>
                      ) : (
                        searchableStructuresList.map((st) => {
                          const checked = selectedStructureIds.includes(st.id);
                          const stStatus = getEffectiveStructureStatus(st);
                          const stMeta = STRUCTURE_STATUS_META[stStatus];
                          const stShortLabel =
                            stStatus === 'ongoing'
                              ? tr('جاري', 'Ongoing')
                              : stStatus === 'studied_not_examined'
                                ? tr('دُرس • لم يُمتحن', 'Studied')
                                : tr('تم الامتحان', 'Done');
                          return (
                            <label
                              key={st.id}
                              className={`flex items-center justify-between gap-2 px-3 py-2 text-xs cursor-pointer transition ${
                                checked
                                  ? 'bg-amber-500/10 dark:bg-amber-500/15'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleStructureSelection(st.id)}
                                  className="w-4 h-4 rounded accent-amber-500 cursor-pointer shrink-0"
                                />
                                <span className="font-bold text-slate-900 dark:text-white truncate">
                                  {st.title}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded border text-[9px] font-bold shrink-0 ${stMeta.badgeClass}`}
                                >
                                  {lang === 'ar' ? stMeta.shortLabel : stShortLabel}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 shrink-0">
                                {translateGrade(st.grade, lang)} • {translateTrack(st.track, lang)} • {translateTerm(st.term, lang)}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>

                    {selectedStructureIds.length === 0 && (
                      <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                        {tr('يرجى تحديد هيكل واحد على الأقل أو اختيار «كل الهياكل» أو «عدد معين».', 'Please select at least one structure or choose All/Count.')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Student Selection Scope */}
            <div className="pt-3 border-t border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-500" />
                  <span>{tr('نطاق الطلاب المشمولين بالتصدير', 'Students Included in Export')} ({candidateStudentsForPicker.length} {tr('متاح', 'available')}):</span>
                </label>

                <div className="inline-flex bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setStudentSelectionMode('all')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer whitespace-nowrap ${
                      studentSelectionMode === 'all'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {tr('كل الطلاب', 'All Students')} ({candidateStudentsForPicker.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentSelectionMode('count')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer whitespace-nowrap ${
                      studentSelectionMode === 'count'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {tr('عدد معين من الطلاب', 'Specific Count')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentSelectionMode('specific')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer whitespace-nowrap ${
                      studentSelectionMode === 'specific'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {tr('طالب محدد / طلاب', 'Pick Students')} ({selectedStudentIds.length})
                  </button>
                </div>
              </div>

              {studentSelectionMode === 'count' && (
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-300/70 dark:border-emerald-800/70 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <Hash className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      {tr('تصدير أول', 'Export top')}
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={Math.max(1, candidateStudentsForPicker.length)}
                      value={studentLimit}
                      onChange={(e) => setStudentLimit(Math.max(1, Number(e.target.value) || 1))}
                      className="w-16 px-2 py-1 text-center font-mono tabular-nums font-black bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      {tr(`طالب من أصل ${candidateStudentsForPicker.length}`, `of ${candidateStudentsForPicker.length} students`)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1">
                    {[1, 3, 5, 10, 15, 20].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setStudentLimit(preset)}
                        className={`px-2 py-1 rounded-lg font-mono font-bold text-[11px] border transition cursor-pointer ${
                          studentLimit === preset
                            ? 'bg-emerald-600 text-white border-emerald-700'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {studentSelectionMode === 'specific' && (
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-300/70 dark:border-emerald-800/70 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[160px]">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute start-2.5 top-2 pointer-events-none" />
                      <input
                        type="text"
                        value={studentSearchQuery}
                        onChange={(e) => setStudentSearchQuery(e.target.value)}
                        placeholder={tr('ابحث باسم الطالب أو الكود أو الصف...', 'Search by student name, ID or grade...')}
                        className="w-full ps-8 pe-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white text-start"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-1 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setSelectedStudentIds(searchableStudentsList.map(s => s.id))}
                        className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500/20 text-slate-700 dark:text-slate-200 font-bold cursor-pointer whitespace-nowrap"
                      >
                        {tr('تحديد الكل', 'Select All')} ({searchableStudentsList.length})
                      </button>

                      <div className="inline-flex items-center gap-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-1.5 py-0.5">
                        <input
                          type="number"
                          min={1}
                          max={Math.max(1, searchableStudentsList.length)}
                          value={studentQuickSelectCount}
                          onChange={(e) => setStudentQuickSelectCount(Math.max(1, Number(e.target.value) || 1))}
                          className="w-10 text-center font-mono font-bold text-[11px] bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedStudentIds(
                              searchableStudentsList.slice(0, Math.max(1, studentQuickSelectCount)).map(s => s.id)
                            )
                          }
                          className="px-1.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-black cursor-pointer whitespace-nowrap"
                        >
                          {tr('تحديد عدد', 'Pick N')}
                        </button>
                      </div>

                      {selectedStudentIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedStudentIds([])}
                          className="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold cursor-pointer whitespace-nowrap"
                        >
                          {tr('إلغاء التحديد', 'Clear')}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-44 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
                    {searchableStudentsList.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">
                        {tr('لا يوجد طلاب مطابقين للبحث والفلاتر الحالية', 'No students match current filters')}
                      </div>
                    ) : (
                      searchableStudentsList.map((st) => {
                        const checked = selectedStudentIds.includes(st.id);
                        return (
                          <label
                            key={st.id}
                            className={`flex items-center justify-between gap-2 px-3 py-2 text-xs cursor-pointer transition ${
                              checked
                                ? 'bg-emerald-500/10 dark:bg-emerald-500/15'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleStudentSelection(st.id)}
                                className="w-4 h-4 rounded accent-emerald-600 cursor-pointer shrink-0"
                              />
                              <span className="font-bold text-slate-900 dark:text-white truncate">
                                {st.name}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
                              {translateGrade(st.grade, lang)}{st.group ? ` • ${st.group}` : ''} • #{st.studentId}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>

                  {selectedStudentIds.length === 0 && (
                    <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                      {tr('يرجى تحديد طالب واحد على الأقل أو اختيار «كل الطلاب» أو «عدد معين».', 'Please select at least one student or choose All/Count.')}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Date Range Filtering */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>
                    {exportMode === 'structures_reports'
                      ? tr('تحديد الفترة الزمنية لرصد الهياكل:', 'Structures Date Range:')
                      : tr('تحديد الفترة الزمنية للامتحانات:', 'Exams Date Range:')}
                  </span>
                </label>
                <div className="flex items-center gap-2 text-[10px]">
                  <button
                    type="button"
                    onClick={() => handleQuickPreset('this_month')}
                    className="text-amber-600 dark:text-amber-400 hover:underline cursor-pointer font-bold"
                  >
                    {tr('هذا الشهر', 'This Month')}
                  </button>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <button
                    type="button"
                    onClick={() => handleQuickPreset('last_30')}
                    className="text-amber-600 dark:text-amber-400 hover:underline cursor-pointer font-bold"
                  >
                    {tr('آخر 30 يوم', 'Last 30 Days')}
                  </button>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <button
                    type="button"
                    onClick={() => handleQuickPreset('all')}
                    className="text-slate-500 dark:text-slate-400 hover:underline cursor-pointer"
                  >
                    {tr('كافة الفترات', 'All Time')}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs"
                    placeholder={tr('من تاريخ', 'From date')}
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5 ps-1">{tr('من تاريخ', 'From Date')}</span>
                </div>
                <div>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl text-xs"
                    placeholder={tr('إلى تاريخ', 'To date')}
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5 ps-1">{tr('إلى تاريخ', 'To Date')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Live Data Count Preview */}
          <div className="bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
              <GraduationCap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>{tr('بيانات التقرير المستخرج:', 'Report Summary:')}</span>
            </div>
            {exportMode === 'structures_reports' ? (
              <div className="flex flex-wrap items-center gap-3 font-mono tabular-nums font-bold text-amber-800 dark:text-amber-300">
                <span>{effectiveStructuresList.length} {tr('هيكل', 'structures')}</span>
                <span>•</span>
                <span>{uniqueStructureStudentsCount} {tr('طالب', 'students')}</span>
                <span>•</span>
                <span>{effectiveStructureProgressList.length} {tr('سجل رصد', 'records')}</span>
                <span>•</span>
                <span>{layoutMode === 'mobile' ? tr('📱 مقاس الهاتف', '📱 Mobile') : tr('💻 مقاس الكمبيوتر', '💻 Desktop')}</span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3 font-mono tabular-nums font-bold text-amber-800 dark:text-amber-300">
                <span>{effectiveStudentsList.length} {tr('طالب', 'students')}</span>
                <span>•</span>
                <span>{filteredResults.length} {tr('نتيجة امتحان', 'exam scores')}</span>
                <span>•</span>
                <span>{layoutMode === 'mobile' ? tr('📱 مقاس الهاتف', '📱 Mobile') : tr('💻 مقاس الكمبيوتر', '💻 Desktop')}</span>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="shrink-0 p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm flex items-center justify-end gap-3 pb-safe">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            {tr('إلغاء', 'Cancel')}
          </button>

          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting || !canExport}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-98 rounded-xl shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isExporting ? tr('جاري تجهيز Excel...', 'Generating Excel...') : tr('تصدير ملف Excel الآن', 'Export Excel Now')}
          </button>
        </div>
      </div>
    </div>
  );
};
