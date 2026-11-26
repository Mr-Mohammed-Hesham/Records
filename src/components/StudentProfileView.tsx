import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowRight,
  ArrowLeft,
  User, 
  Phone, 
  BookOpen, 
  School, 
  Calendar, 
  Award, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  FileSpreadsheet, 
  Edit3, 
  Trash2, 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Clock,
  Sparkles,
  ChevronDown,
  GraduationCap,
  Eye,
  Paperclip,
  ShieldCheck,
  Search,
  X,
  Smartphone,
  Monitor,
  BarChart3,
  Check,
  Layers,
} from 'lucide-react';
import { Student, Exam, ExamResult, TeacherSettings, ResultAttachment, StudentEnrollmentStatus, StudentStructureProgress, ExamStructure } from '../types';
import { calculateStudentStats, getGradeRating } from '../utils/grading';
import {
  exportSingleStudentAcademicReport,
  exportSingleStudentStructuresReport,
  getSavedExcelPreferences,
  saveExcelPreferences,
} from '../utils/excel';
import {
  ENROLLMENT_STATUS_LIST,
  ENROLLMENT_STATUS_META,
  getEffectiveEnrollmentStatus,
  getEffectiveEnrollmentNote,
  saveLocalStudentStatus,
} from '../utils/studentStatus';
import { UAE_GRADES, ACADEMIC_YEARS, ACADEMIC_TRACKS } from '../services/firebase';
import { DynamicGradesChart } from './DynamicGradesChart';
import { StudentAcademicReportModal } from './StudentAcademicReportModal';
import { AttachmentModal } from './AttachmentModal';
import { AttachmentThumbnail } from './AttachmentThumbnail';
import { StudentStructureScoringModal } from './StudentStructureScoringModal';
import { ConfirmModal } from './ConfirmModal';
import {
  useLanguage,
  translateGrade,
  translateTerm,
  translateTrack,
  translateSubject,
} from '../utils/i18n';

interface StudentProfileViewProps {
  student: Student;
  exams: Exam[];
  results: ExamResult[];
  structures?: ExamStructure[];
  structureProgress?: StudentStructureProgress[];
  settings: TeacherSettings;
  onBack: () => void;
  onEditStudent: (student: Student) => void;
  onUpdateStudentStatus?: (student: Student, status: StudentEnrollmentStatus, note?: string) => void;
  onDeleteResult: (resultId: string) => Promise<void>;
  onUpdateResult: (resultId: string, updatedScore: number, notes: string) => Promise<void>;
  onUpdateResultAttachment?: (resultId: string, attachment: ResultAttachment | null) => Promise<void>;
  onAddScoreForStudent: (student: Student, specificExam?: Exam) => void;
  onSaveStructureProgress?: (
    record: Omit<StudentStructureProgress, 'id'> & { id?: string }
  ) => Promise<StudentStructureProgress>;
  onDeleteStructureProgress?: (progress: StudentStructureProgress) => void;
  onOpenStructures?: () => void;
}

export const StudentProfileView: React.FC<StudentProfileViewProps> = ({
  student,
  exams,
  results,
  structures = [],
  structureProgress = [],
  settings,
  onBack,
  onEditStudent,
  onUpdateStudentStatus,
  onDeleteResult,
  onUpdateResult,
  onUpdateResultAttachment,
  onAddScoreForStudent,
  onSaveStructureProgress,
  onDeleteStructureProgress,
  onOpenStructures,
}) => {
  const { lang, dir, isRtl, tr } = useLanguage();
  const [editingResultId, setEditingResultId] = useState<string | null>(null);
  const [editScoreVal, setEditScoreVal] = useState<string>('');
  const [editNotesVal, setEditNotesVal] = useState<string>('');
  const [showAcademicReportModal, setShowAcademicReportModal] = useState(false);
  const [activeAttachmentResult, setActiveAttachmentResult] = useState<ExamResult | null>(null);
  const [pendingDeleteResult, setPendingDeleteResult] = useState<ExamResult | null>(null);
  const [structureModalState, setStructureModalState] = useState<{
    isOpen: boolean;
    structure: ExamStructure | null;
    existingProgress: StudentStructureProgress | null;
    isNewImprovementAttempt: boolean;
    baselineProgress: StudentStructureProgress | null;
    nextAttemptNumber: number;
  }>({
    isOpen: false,
    structure: null,
    existingProgress: null,
    isNewImprovementAttempt: false,
    baselineProgress: null,
    nextAttemptNumber: 2,
  });

  // Enrollment Status Tool State
  const [currentEnrollmentStatus, setCurrentEnrollmentStatus] = useState<StudentEnrollmentStatus>(
    () => getEffectiveEnrollmentStatus(student)
  );
  const [enrollmentNote, setEnrollmentNote] = useState<string>(
    () => getEffectiveEnrollmentNote(student)
  );
  const [statusSavedToast, setStatusSavedToast] = useState<string | null>(null);

  // Excel Export Quick Preferences
  const initialExcelPrefs = getSavedExcelPreferences();
  const [excelLayoutMode, setExcelLayoutMode] = useState<'mobile' | 'desktop'>(initialExcelPrefs.layoutMode);
  const [excelIncludeChart, setExcelIncludeChart] = useState<boolean>(initialExcelPrefs.includeChart);

  useEffect(() => {
    setCurrentEnrollmentStatus(getEffectiveEnrollmentStatus(student));
    setEnrollmentNote(getEffectiveEnrollmentNote(student));
  }, [student]);

  const handleSelectEnrollmentStatus = (newStatus: StudentEnrollmentStatus, customNote?: string) => {
    const noteToSave = customNote !== undefined ? customNote : enrollmentNote;
    setCurrentEnrollmentStatus(newStatus);
    saveLocalStudentStatus(student.id, newStatus, noteToSave);
    if (onUpdateStudentStatus) {
      onUpdateStudentStatus(student, newStatus, noteToSave);
    }
    const statusText = lang === 'en' ? ENROLLMENT_STATUS_META[newStatus].labelEn : ENROLLMENT_STATUS_META[newStatus].label;
    setStatusSavedToast(tr(`تم تحديث حالة الملف إلى: ${statusText}`, `File status updated to: ${statusText}`));
    setTimeout(() => setStatusSavedToast(null), 3000);
  };

  const handleSaveEnrollmentNote = () => {
    saveLocalStudentStatus(student.id, currentEnrollmentStatus, enrollmentNote);
    if (onUpdateStudentStatus) {
      onUpdateStudentStatus(student, currentEnrollmentStatus, enrollmentNote);
    }
    setStatusSavedToast(tr('تم حفظ ملاحظة حالة الملف بنجاح', 'File status note saved successfully'));
    setTimeout(() => setStatusSavedToast(null), 2500);
  };

  // Dropdown state for "رصد نتيجة امتحان جديد لهذا الطالب"
  const [isExamDropdownOpen, setIsExamDropdownOpen] = useState(false);
  const [examSearchQuery, setExamSearchQuery] = useState('');
  const [dropdownGradeFilter, setDropdownGradeFilter] = useState<'student' | 'all'>('student');
  const examDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (examDropdownRef.current && !examDropdownRef.current.contains(event.target as Node)) {
        setIsExamDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsExamDropdownOpen(false);
      }
    };
    if (isExamDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExamDropdownOpen]);

  const stats = calculateStudentStats(results, settings.gradingScale);

  // Count of exams matching student's grade
  const studentGradeExamsCount = exams.filter((e) => !e.grade || e.grade === student.grade).length;

  // Filtered exams for dropdown selection
  const sortedExams = [...exams].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredDropdownExams = sortedExams.filter((exam) => {
    if (dropdownGradeFilter === 'student' && studentGradeExamsCount > 0) {
      if (exam.grade && exam.grade !== student.grade) {
        return false;
      }
    }
    if (!examSearchQuery.trim()) return true;
    const q = examSearchQuery.trim().toLowerCase();
    return (
      exam.title.toLowerCase().includes(q) ||
      (exam.subject && exam.subject.toLowerCase().includes(q)) ||
      (exam.grade && exam.grade.toLowerCase().includes(q))
    );
  });

  // Chronological results for chart
  const timelineResults = [...results].sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime());

  const handleStartEdit = (res: ExamResult) => {
    setEditingResultId(res.id);
    setEditScoreVal(String(res.score));
    setEditNotesVal(res.notes || '');
  };

  const handleSaveEdit = async (res: ExamResult) => {
    const num = parseFloat(editScoreVal);
    if (isNaN(num)) return;
    const clamped = Math.max(0, Math.min(res.totalScore, num));
    await onUpdateResult(res.id, clamped, editNotesVal);
    setEditingResultId(null);
  };

  const handleExportExcel = () => {
    saveExcelPreferences({
      layoutMode: excelLayoutMode,
      includeChart: excelIncludeChart,
    });
    exportSingleStudentAcademicReport(student, results, stats, {
      layoutMode: excelLayoutMode,
      includeChart: excelIncludeChart,
    });
  };

  const activeStatusMeta = ENROLLMENT_STATUS_META[currentEnrollmentStatus];
  const formatAcademicStatus = (status: string) => {
    if (lang === 'ar') return status;
    if (status === 'ممتاز') return 'Excellent';
    if (status === 'جيد') return 'Good';
    if (status === 'يحتاج متابعة') return 'Needs Follow-up';
    return status;
  };
  const timelineChartData = timelineResults.map((r) => ({
    id: r.id,
    name: r.examTitle,
    value: r.percentage,
    secondaryValue: `${r.score}/${r.totalScore}`,
    date: r.examDate,
    rating: r.gradeRating,
  }));

  return (
    <div id="student-profile-view" dir={dir} className="space-y-6 text-start animate-in fade-in duration-200">
      {/* Top Bar with Back Button and Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer flex items-center gap-1 font-semibold text-sm"
          >
            {isRtl ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            {tr('العودة لقائمة الطلاب', 'Back to Students')}
          </button>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
          <span className="text-xs text-slate-400">{tr('ملف الطالب الشخصي', 'Student Profile')}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowAcademicReportModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer shadow-xs"
          >
            <Eye className="w-4 h-4 text-amber-500" />
            {tr('التقرير الأكاديمي الشامل', 'Full Academic Report')}
          </button>

          {/* Excel Export + Quick Mobile/Chart Toggles */}
          <div className="flex flex-wrap items-center gap-1.5 bg-emerald-50/70 dark:bg-emerald-950/30 p-1 rounded-xl border border-emerald-200 dark:border-emerald-800/70">
            <button
              id="export-student-excel-btn"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-900 dark:text-emerald-200 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{tr('تصدير التقرير لـ Excel', 'Export Report to Excel')}</span>
            </button>

            <button
              type="button"
              onClick={() => setExcelLayoutMode(excelLayoutMode === 'mobile' ? 'desktop' : 'mobile')}
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 rounded-lg border border-emerald-200 dark:border-emerald-800 cursor-pointer"
              title={tr('تبديل مقاس الشيت بين وضع الهاتف المحمول والكمبيوتر', 'Switch sheet layout between mobile and desktop')}
            >
              {excelLayoutMode === 'mobile' ? (
                <>
                  <Smartphone className="w-3 h-3 text-emerald-600" />
                  <span>{tr('وضع الهاتف', 'Mobile')}</span>
                </>
              ) : (
                <>
                  <Monitor className="w-3 h-3 text-indigo-600" />
                  <span>{tr('وضع الكمبيوتر', 'Desktop')}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setExcelIncludeChart(!excelIncludeChart)}
              className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded-lg border cursor-pointer transition-colors ${
                excelIncludeChart
                  ? 'bg-amber-500 text-slate-950 border-amber-500'
                  : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
              title={tr('تضمين الرسم البياني للدرجات في ملف الإكسيل', 'Include grade chart in Excel file')}
            >
              <BarChart3 className="w-3 h-3" />
              <span>{excelIncludeChart ? tr('مع الرسم البياني ✔', 'With Chart ✔') : tr('بدون رسم', 'No Chart')}</span>
            </button>
          </div>

          <button
            onClick={() => onEditStudent(student)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            {tr('تعديل البيانات', 'Edit Profile')}
          </button>
        </div>
      </div>

      {/* Basic Student Info Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200/80 dark:border-slate-800">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {/* Avatar / Photo */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-600 text-white flex items-center justify-center text-xl font-black shadow-md shadow-indigo-500/20 shrink-0">
              {student.photoUrl ? (
                <img 
                  src={student.photoUrl} 
                  alt={student.name} 
                  className="w-full h-full object-cover rounded-2xl" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                student.name.charAt(0) || 'ط'
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-black text-slate-900 dark:text-slate-50">{student.name}</h1>
                <span className="font-mono text-xs px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold rounded-lg border border-indigo-100 dark:border-indigo-800">
                  {student.studentId}
                </span>
                <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                  stats.status === 'ممتاز'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : stats.status === 'جيد'
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}>
                  {tr('مستوى الطالب:', 'Student Level:')} {formatAcademicStatus(stats.status)}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-bold border ${activeStatusMeta.badgeBg} ${activeStatusMeta.badgeText} ${activeStatusMeta.badgeBorder}`}
                >
                  <span className={`w-2 h-2 rounded-full ${activeStatusMeta.dotColor}`} />
                  {lang === 'en' ? activeStatusMeta.labelEn : activeStatusMeta.label}
                </span>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 flex flex-wrap items-center gap-3">
                <span>{tr('الصف:', 'Grade:')} <strong className="text-slate-700 dark:text-slate-200">{translateGrade(student.grade, lang)}</strong></span>
                {student.track && (
                  <>
                    <span>•</span>
                    <span>{tr('المسار:', 'Track:')} <strong className="text-amber-600 dark:text-amber-400 font-bold">{translateTrack(student.track, lang)}</strong></span>
                  </>
                )}
                {student.term && (
                  <>
                    <span>•</span>
                    <span>{tr('الفصل:', 'Term:')} <strong className="text-slate-700 dark:text-slate-200">{translateTerm(student.term, lang)}</strong></span>
                  </>
                )}
                {student.academicYear && (
                  <>
                    <span>•</span>
                    <span>{tr('السنة الدراسية:', 'Year:')} <strong className="text-slate-700 dark:text-slate-200">{student.academicYear}</strong></span>
                  </>
                )}
                {student.group && (
                  <>
                    <span>•</span>
                    <span>{tr('المجموعة:', 'Group:')} <strong className="text-slate-700 dark:text-slate-200">{student.group}</strong></span>
                  </>
                )}
                <span>•</span>
                <span>{tr('المادة:', 'Subject:')} <strong className="text-slate-700 dark:text-slate-200">{translateSubject(student.subject, lang)}</strong></span>
                {student.school && (
                  <>
                    <span>•</span>
                    <span>{tr('المدرسة:', 'School:')} <strong className="text-slate-700 dark:text-slate-200">{student.school}</strong></span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-100 dark:border-slate-700/80 w-full md:w-auto">
            <div>
              <span className="text-slate-400 dark:text-slate-500 block mb-0.5">{tr('هاتف الطالب:', 'Student Phone:')}</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-100" dir="ltr">
                {student.phone || tr('غير مسجل', 'Not registered')}
              </span>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500 block mb-0.5">{tr('هاتف ولي الأمر:', 'Parent Phone:')}</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-100" dir="ltr">
                {student.parentPhone || tr('غير مسجل', 'Not registered')}
              </span>
            </div>
            {student.email && (
              <div className="sm:col-span-2">
                <span className="text-slate-400 dark:text-slate-500 block mb-0.5">{tr('البريد الإلكتروني:', 'Email:')}</span>
                <span className="font-mono text-slate-700 dark:text-slate-200" dir="ltr">
                  {student.email}
                </span>
              </div>
            )}
            <div className="sm:col-span-2 text-[11px] text-slate-400 dark:text-slate-500">
              {tr('تاريخ الإضافة:', 'Added On:')} {student.createdAt ? new Date(student.createdAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'ar-EG') : '-'}
            </div>
          </div>
        </div>

        {student.notes && (
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 bg-amber-50/40 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-100 dark:border-amber-800/60">
            <strong className="text-amber-900 dark:text-amber-300 block mb-1">{tr('ملاحظات المدرس الخاصة:', 'Private Teacher Notes:')}</strong>
            <p>{student.notes}</p>
          </div>
        )}

        <div className="mt-5 pt-4 border-t border-slate-200/80 dark:border-slate-800">
          <div className="bg-slate-50/90 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/80 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                    {tr('أداة تحديد حالة ملف الطالب في الكورس', 'Student Course Enrollment Status')}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {tr('حدد ما إذا كان ملف الطالب فعالاً ومستمراً، أو انتهى الكورس له، أو متوقفاً/منقطعاً', 'Set whether the student file is active, course completed, paused, or withdrawn')}
                  </p>
                </div>
              </div>

              {statusSavedToast && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold animate-in fade-in duration-150">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{statusSavedToast}</span>
                </span>
              )}
            </div>

            {/* 4 Status Selection Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ENROLLMENT_STATUS_LIST.map((stOpt) => {
                const isSelected = currentEnrollmentStatus === stOpt.id;
                return (
                  <button
                    key={stOpt.id}
                    type="button"
                    onClick={() => handleSelectEnrollmentStatus(stOpt.id)}
                    className={`p-3 rounded-xl border text-start transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                      isSelected
                        ? stOpt.activeBtnClass
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-amber-400'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-extrabold text-xs">{lang === 'en' ? stOpt.shortLabelEn : stOpt.shortLabel}</span>
                      {isSelected ? (
                        <Check className="w-4 h-4 shrink-0" />
                      ) : (
                        <span className={`w-2.5 h-2.5 rounded-full ${stOpt.dotColor}`} />
                      )}
                    </div>
                    <span
                      className={`text-[10px] leading-tight ${
                        isSelected ? 'opacity-90' : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {lang === 'en' ? stOpt.descriptionEn : stOpt.description}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Optional Note for Status */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
              <input
                type="text"
                value={enrollmentNote}
                onChange={(e) => setEnrollmentNote(e.target.value)}
                placeholder={tr('ملاحظة عن حالة الكورس (مثال: أتم كورس الفصل الأول بنجاح / تاريخ انتهاء الكورس / سبب التوقف...)', 'Status note (e.g. Completed Term 1 / end date / reason...)')}
                className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:border-amber-500"
              />
              <button
                type="button"
                onClick={handleSaveEnrollmentNote}
                className="px-4 py-2 bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 font-bold text-xs rounded-xl hover:opacity-90 transition cursor-pointer shrink-0"
              >
                {tr('حفظ ملاحظة الحالة', 'Save Status Note')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Student Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">{tr('الامتحانات المسجلة', 'Recorded Exams')}</span>
          <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">{stats.totalExams}</span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-0.5">{tr('امتحان مكتمل', 'Completed')}</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">{tr('متوسط الدرجات', 'Average Score')}</span>
          <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
            {stats.averagePercentage}%
          </span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-0.5">
            {tr(`معدل ${stats.averageScore} درجات`, `Avg ${stats.averageScore} pts`)}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">{tr('أعلى درجة', 'Highest Score')}</span>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {stats.highestPercentage}%
          </span>
          <span className="text-[11px] text-emerald-700/70 dark:text-emerald-400/80 block mt-0.5 font-mono">
            ({stats.highestScore} {tr('درجة', 'pts')})
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">{tr('أقل درجة', 'Lowest Score')}</span>
          <span className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
            {stats.lowestPercentage}%
          </span>
          <span className="text-[11px] text-rose-700/70 dark:text-rose-400/80 block mt-0.5 font-mono">
            ({stats.lowestScore} {tr('درجة', 'pts')})
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">{tr('آخر نتيجة', 'Latest Result')}</span>
          <span className="text-2xl font-black text-sky-600 dark:text-sky-400 font-mono">
            {stats.latestPercentage !== null ? `${stats.latestPercentage}%` : '-'}
          </span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-0.5 truncate" title={stats.latestExamTitle || ''}>
            {stats.latestExamTitle || tr('لا يوجد', 'None')}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">{tr('نسبة النجاح', 'Pass Rate')}</span>
          <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
            {stats.passRate}%
          </span>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-0.5">{tr('في جميع الامتحانات', 'Across all exams')}</span>
        </div>
      </div>

      {/* Student Level Analysis & Progress Chart */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200/80 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${
              stats.trend === 'improving' 
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400' 
                : stats.trend === 'declining'
                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
            }`}>
              {stats.trend === 'improving' && <TrendingUp className="w-5 h-5" />}
              {stats.trend === 'declining' && <TrendingDown className="w-5 h-5" />}
              {stats.trend === 'steady' && <Minus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">{tr('تحليل مستوى الطالب ومسار التطور', 'Student Level & Progress Analysis')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{tr('متابعة درجات الطالب عبر الوقت وتحديد مؤشر التحسن', 'Track scores over time and monitor improvement trajectory')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(stats.improvementsCount ?? 0) > 0 && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 inline-flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                {stats.improvementsCount} {tr('تحسين درجات', 'Improvements')}
              </span>
            )}
            <span className="text-xs text-slate-400">{tr('حالة المسار:', 'Trend:')}</span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 ${
              stats.trend === 'improving'
                ? 'bg-emerald-100 text-emerald-800'
                : stats.trend === 'declining'
                ? 'bg-rose-100 text-rose-800'
                : 'bg-slate-100 text-slate-800'
            }`}>
              {stats.trend === 'improving' && tr('📈 في تحسن مستمر', '📈 Improving Steadily')}
              {stats.trend === 'declining' && tr('📉 يتراجع ويحتاج متابعة', '📉 Declining (Needs Follow-up)')}
              {stats.trend === 'steady' && tr('📊 مستوى ثابت', '📊 Steady Performance')}
            </span>
          </div>
        </div>

        {/* Analytical Trajectory Message */}
        <div className={`mt-4 p-4 rounded-xl border text-xs sm:text-sm font-medium flex items-start gap-3 ${
          stats.trend === 'improving'
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
            : stats.trend === 'declining'
            ? 'bg-rose-50/70 border-rose-200 text-rose-950'
            : 'bg-indigo-50/70 border-indigo-200 text-indigo-950'
        }`}>
          <Sparkles className="w-5 h-5 shrink-0 mt-0.5 text-indigo-600" />
          <div>
            <span className="font-bold block mb-0.5">{tr('التقييم التحليلي لـ Mr. Mohamed Hesham:', "Mr. Mohamed Hesham's Analytical Assessment:")}</span>
            <p className="leading-relaxed">{stats.trendMessage}</p>
          </div>
        </div>

        {/* Interactive Responsive Score Progression Visual Chart */}
        <div className="mt-6">
          {timelineResults.length === 0 ? (
            <div className="py-12 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-xs">
              {tr('لم يتم رصد نتائج امتحانات لهذا الطالب حتى الآن لعرض الرسم البياني.', 'No exam results recorded for this student yet to display chart.')}
            </div>
          ) : (
            <DynamicGradesChart
              data={timelineChartData}
              mode="percentage"
              storageKey="mh_profile_chart_type_v1"
              title={tr('رسم بياني لتطور نتائج الامتحانات عبر الزمن', 'Exam Score Progression Over Time')}
              subtitle={tr('اختر الشكل البياني المفضل (أعمدة، دائري، منحنى مساحي، خطي، أفقي، أو شبكي)', 'Choose your preferred chart type (bar, pie, area, line, horizontal, or radar)')}
              height={270}
            />
          )}
        </div>
      </div>

      {/* Exam History Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200/80 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">{tr('سجل الامتحانات والنتائج التفصيلي', 'Detailed Exam & Results History')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{tr('جميع الامتحانات التي شارك بها الطالب مع إمكانية تعديل أو حذف أي نتيجة', 'All exams taken by this student with edit and delete options')}</p>
          </div>

          <div className="w-full sm:w-auto" ref={examDropdownRef}>
            <button
              id="student-add-score-dropdown-btn"
              type="button"
              onClick={() => {
                if (exams.length === 0) {
                  onAddScoreForStudent(student);
                  return;
                }
                setIsExamDropdownOpen(!isExamDropdownOpen);
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/70 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-xl transition-all cursor-pointer border border-indigo-200 dark:border-indigo-800 shadow-xs active:scale-98"
              aria-expanded={isExamDropdownOpen}
              title={tr('اختيار الامتحان المطلوب رصد درجاته لهذا الطالب', 'Choose an exam to record a score for this student')}
            >
              <Plus className="w-4 h-4" />
              <span>{tr('رصد نتيجة امتحان جديد لهذا الطالب', 'Record New Exam Score')}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExamDropdownOpen ? 'rotate-180 text-indigo-900 dark:text-indigo-100' : ''}`} />
            </button>

            {/* Modal / Bottom Sheet for selecting exam (متجاوب تماماً مع شاشات الهواتف واللابتوب) */}
            {isExamDropdownOpen && (
              <div 
                className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
                onClick={(e) => {
                  if (e.target === e.currentTarget) setIsExamDropdownOpen(false);
                }}
              >
                <div 
                  id="exam-select-dropdown-menu"
                  dir={dir}
                  className="w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[80vh] text-start animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
                >
                  {/* Mobile Grab Handle */}
                  <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

                  {/* Header */}
                  <div className="px-4 py-3 bg-slate-50/90 dark:bg-slate-800/90 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-slate-900 dark:text-slate-100">
                          {tr('اختر الامتحان المطلوب رصده', 'Select Exam to Record Score')}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {student.name} • {translateGrade(student.grade, lang)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/90 text-indigo-700 dark:text-indigo-300 font-mono">
                        {exams.length} {tr('امتحان', 'exams')}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsExamDropdownOpen(false)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
                        title={tr('إغلاق', 'Close')}
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Quick Grade Filter Tabs */}
                  {studentGradeExamsCount > 0 && exams.length > studentGradeExamsCount && (
                    <div className="flex items-center p-2 gap-1.5 bg-slate-100/70 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-xs shrink-0">
                      <button
                        type="button"
                        onClick={() => setDropdownGradeFilter('student')}
                        className={`flex-1 py-1.5 px-2.5 rounded-xl font-bold transition-all text-center cursor-pointer ${
                          dropdownGradeFilter === 'student'
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        {tr('صف الطالب', 'Student Grade')} ({translateGrade(student.grade, lang)})
                      </button>
                      <button
                        type="button"
                        onClick={() => setDropdownGradeFilter('all')}
                        className={`flex-1 py-1.5 px-2.5 rounded-xl font-bold transition-all text-center cursor-pointer ${
                          dropdownGradeFilter === 'all'
                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        {tr('جميع الصفوف', 'All Grades')} ({exams.length})
                      </button>
                    </div>
                  )}

                  {/* Search if > 3 exams */}
                  {exams.length > 3 && (
                    <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 relative shrink-0">
                      <input
                        type="text"
                        value={examSearchQuery}
                        onChange={(e) => setExamSearchQuery(e.target.value)}
                        placeholder={tr('ابحث عن امتحان بالاسم أو المادة...', 'Search exams by title or subject...')}
                        className="w-full ps-9 pe-7 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-500"
                      />
                      <Search className="w-4 h-4 text-slate-400 absolute start-5 top-4 pointer-events-none" />
                      {examSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setExamSearchQuery('')}
                          className="absolute end-5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* List of Exams */}
                  <div className="overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800/60 flex-1">
                    {filteredDropdownExams.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                        {exams.length === 0 ? (
                          <>
                            <AlertCircle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                            <p className="font-bold text-slate-700 dark:text-slate-300">{tr('لا توجد امتحانات مسجلة حتى الآن', 'No exams recorded yet')}</p>
                            <p className="text-[11px] mt-0.5">{tr('يرجى إضافة امتحان أولاً من قسم الامتحانات', 'Please add an exam first in the Exams tab')}</p>
                          </>
                        ) : (
                          <p>{tr(`لا توجد امتحانات مطابقة لـ "${examSearchQuery}"`, `No exams matching "${examSearchQuery}"`)}</p>
                        )}
                      </div>
                    ) : (
                      filteredDropdownExams.map((exam) => {
                        const studentExamResults = results.filter((r) => r.examId === exam.id);
                        const hasResults = studentExamResults.length > 0;
                        const latestRes = hasResults ? studentExamResults[studentExamResults.length - 1] : null;

                        return (
                          <button
                            key={exam.id}
                            type="button"
                            onClick={() => {
                              setIsExamDropdownOpen(false);
                              onAddScoreForStudent(student, exam);
                            }}
                            className="w-full p-3 rounded-xl text-start hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40 transition-colors flex items-start justify-between gap-3 group cursor-pointer"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                  {exam.title}
                                </span>
                                {exam.grade && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                    {translateGrade(exam.grade, lang)}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                                <span>{translateSubject(exam.subject, lang)}</span>
                                <span>•</span>
                                <span className="font-mono">{exam.date}</span>
                                <span>•</span>
                                <span className="font-mono font-semibold">{tr('من', 'Out of')} {exam.totalScore}</span>
                              </div>
                            </div>

                            <div className="shrink-0 text-end pt-0.5">
                              {hasResults ? (
                                <div className="flex flex-col items-end gap-0.5">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                    <Sparkles className="w-2.5 h-2.5" />
                                    {tr('تحسين', 'Retake')} ({latestRes?.score}/{exam.totalScore})
                                  </span>
                                  <span className="text-[9px] text-slate-400 font-medium">
                                    {studentExamResults.length} {studentExamResults.length === 1 ? tr('محاولة', 'attempt') : tr('محاولات', 'attempts')}
                                  </span>
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                  {tr('لم يُرصد بعد', 'Not recorded')}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* Footer hint */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 shrink-0">
                    <span>{tr('اضغط على أي امتحان لفتح نافذة الرصد مباشرة', 'Click any exam to open score entry directly')}</span>
                    <button
                      type="button"
                      onClick={() => setIsExamDropdownOpen(false)}
                      className="px-3 py-1 rounded-lg bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors font-medium text-xs cursor-pointer"
                    >
                      {tr('إغلاق', 'Close')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-3.5">{tr('اسم الامتحان', 'Exam Title')}</th>
                <th className="py-3 px-3.5">{tr('التاريخ', 'Date')}</th>
                <th className="py-3 px-3.5 text-center">{tr('الدرجة', 'Score')}</th>
                <th className="py-3 px-3.5 text-center">{tr('الدرجة الكلية', 'Max Score')}</th>
                <th className="py-3 px-3.5 text-center">{tr('النسبة %', 'Percent %')}</th>
                <th className="py-3 px-3.5 text-center">{tr('التقدير', 'Grade')}</th>
                <th className="py-3 px-3.5 text-center">{tr('الحالة', 'Status')}</th>
                <th className="py-3 px-3 text-center">{tr('مرفق / إثبات', 'Proof')}</th>
                <th className="py-3 px-3.5">{tr('ملاحظات المدرس', 'Teacher Notes')}</th>
                <th className="py-3 px-3.5 text-center">{tr('إجراءات', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {results.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 dark:text-slate-500">
                    {tr('لم يتم تسجيل نتائج امتحانات لهذا الطالب بعد. اضغط "رصد نتيجة امتحان جديد" للإضافة.', 'No exam results recorded for this student yet. Click "Record New Exam Score" to add.')}
                  </td>
                </tr>
              ) : (
                results.map((res) => {
                  const isEditing = editingResultId === res.id;
                  const rating = getGradeRating(res.percentage, settings.gradingScale);

                  return (
                    <tr key={res.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      {/* Exam Title */}
                      <td className="py-3 px-3.5 font-bold text-slate-900 dark:text-slate-100">
                        <div className="flex flex-col gap-1">
                          <span>{res.examTitle}</span>
                          {(res.isImprovement || (res.attemptNumber && res.attemptNumber > 1)) && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                                <Sparkles className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                                {res.attemptLabel || tr(`تحسين (محاولة ${res.attemptNumber})`, `Retake (Attempt ${res.attemptNumber})`)}
                              </span>
                              {res.previousScore !== undefined && (
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                                  ({tr('السابقة:', 'Prev:')} {res.previousScore})
                                </span>
                              )}
                              {res.previousScore !== undefined && (
                                <span className={`text-[10px] font-mono font-bold ${
                                  res.score > res.previousScore
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : res.score < res.previousScore
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : 'text-slate-500 dark:text-slate-400'
                                }`}>
                                  {res.score > res.previousScore
                                    ? `+${(res.score - res.previousScore).toFixed(1)} ↑`
                                    : `${(res.score - res.previousScore).toFixed(1)}`}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-3.5 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                        {res.examDate}
                      </td>

                      {/* Score Obtained */}
                      <td className="py-3 px-3.5 text-center">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max={res.totalScore}
                            value={editScoreVal}
                            onChange={(e) => setEditScoreVal(e.target.value)}
                            className="w-16 px-1.5 py-1 border border-indigo-400 dark:border-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded text-center font-bold text-xs"
                          />
                        ) : (
                          <span className="font-extrabold text-slate-900 dark:text-slate-50 text-sm font-mono">
                            {res.score}
                          </span>
                        )}
                      </td>

                      {/* Total Score */}
                      <td className="py-3 px-3.5 text-center font-mono text-slate-500 dark:text-slate-400">
                        {res.totalScore}
                      </td>

                      {/* Percentage */}
                      <td className="py-3 px-3.5 text-center font-bold font-mono text-slate-800 dark:text-slate-200">
                        {res.percentage}%
                      </td>

                      {/* Rating */}
                      <td className="py-3 px-3.5 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-md font-bold text-[11px] border ${rating.badgeBg}`}>
                          {res.gradeRating}
                        </span>
                      </td>

                      {/* Pass/Fail */}
                      <td className="py-3 px-3.5 text-center">
                        <span className={`inline-flex items-center gap-1 font-bold text-[11px] ${
                          res.passed ? 'text-emerald-700' : 'text-rose-600'
                        }`}>
                          {res.passed ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" /> {tr('ناجح', 'Passed')}
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3.5 h-3.5" /> {tr('راسب', 'Failed')}
                            </>
                          )}
                        </span>
                      </td>

                      {/* Attachment Proof Thumbnail & Quick Preview */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center">
                          <AttachmentThumbnail
                            attachment={res.attachment}
                            size="sm"
                            tooltipPrefix={`${tr('امتحان:', 'Exam:')} ${res.examTitle}`}
                            onClick={() => setActiveAttachmentResult(res)}
                            onAttach={() => setActiveAttachmentResult(res)}
                          />
                        </div>
                      </td>

                      {/* Notes */}
                      <td className="py-3 px-3.5 text-slate-600 dark:text-slate-300">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editNotesVal}
                            onChange={(e) => setEditNotesVal(e.target.value)}
                            placeholder={tr('ملاحظات...', 'Notes...')}
                            className="w-full px-2 py-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded text-xs text-start"
                          />
                        ) : (
                          res.notes || <span className="text-slate-300 dark:text-slate-600">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleSaveEdit(res)}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold cursor-pointer"
                              >
                                {tr('حفظ', 'Save')}
                              </button>
                              <button
                                onClick={() => setEditingResultId(null)}
                                className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[11px] cursor-pointer"
                              >
                                {tr('إلغاء', 'Cancel')}
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  const examObj = exams.find((e) => e.id === res.examId);
                                  onAddScoreForStudent(student, examObj);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 rounded-lg border border-amber-200 transition cursor-pointer"
                                title={tr('إضافة محاولة تحسين جديدة لهذا الامتحان', 'Add new retake attempt for this exam')}
                              >
                                <Plus className="w-3 h-3" />
                                {tr('تحسين', 'Retake')}
                              </button>
                              <button
                                onClick={() => handleStartEdit(res)}
                                className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                                title={tr('تعديل النتيجة', 'Edit score')}
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setPendingDeleteResult(res)}
                                className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                title={tr('حذف النتيجة', 'Delete score')}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Structures Progress Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-500" />
              <span>{tr(`سجل الطالب في قسم الهياكل ونسب صحة كل سؤال (${structureProgress.length})`, `Student Structures & Per-Question Accuracy (${structureProgress.length})`)}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {tr('متابعة الهياكل المسجلة للطالب وعدد الأسئلة المحلولة ونسبة صحة كل سؤال', 'Track recorded structures, solved questions, and accuracy per question')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {structureProgress.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  saveExcelPreferences({
                    layoutMode: excelLayoutMode,
                    includeChart: excelIncludeChart,
                  });
                  exportSingleStudentStructuresReport(student, structureProgress, [], {
                    layoutMode: excelLayoutMode,
                    includeChart: excelIncludeChart,
                  });
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 rounded-xl transition cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{tr('تصدير تقرير الهياكل (Excel)', 'Export Structures Report (Excel)')}</span>
              </button>
            )}
            {onOpenStructures && (
              <button
                type="button"
                onClick={onOpenStructures}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800 rounded-xl transition cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{tr('إدارة ورصد في قسم الهياكل', 'Manage in Structures Section')}</span>
              </button>
            )}
          </div>
        </div>

        {structureProgress.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
            {tr('لا توجد هياكل مرصودة لهذا الطالب حتى الآن.', 'No structures recorded for this student yet.')}
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-2.5 px-3">{tr('الهيكل والمحاولة', 'Structure & Attempt')}</th>
                  <th className="py-2.5 px-3">{tr('الصف / الفصل / المسار / السنة / المادة', 'Grade / Term / Track / Year / Subject')}</th>
                  <th className="py-2.5 px-3 text-center">{tr('الأسئلة المحلولة', 'Solved Questions')}</th>
                  <th className="py-2.5 px-3 text-center">{tr('متوسط الصحة %', 'Avg Accuracy %')}</th>
                  <th className="py-2.5 px-3">{tr('نسبة صحة كل سؤال', 'Per-Question Accuracy')}</th>
                  {onSaveStructureProgress && (
                    <th className="py-2.5 px-3 text-center">{tr('التحسين والإجراءات', 'Actions & Retake')}</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {[...structureProgress]
                  .sort((a, b) => {
                    const cmp = a.structureTitle.localeCompare(b.structureTitle, lang === 'en' ? 'en' : 'ar');
                    if (cmp !== 0) return cmp;
                    return (a.attemptNumber || 1) - (b.attemptNumber || 1);
                  })
                  .map((rec) => {
                    const isImp =
                      Boolean(rec.isImprovement) || (rec.attemptNumber !== undefined && rec.attemptNumber > 1);
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

                    const resolveStructureObj = (): ExamStructure => {
                      const found = structures.find((s) => s.id === rec.structureId);
                      if (found) return found;
                      return {
                        id: rec.structureId,
                        title: rec.structureTitle,
                        grade: rec.grade,
                        term: rec.term,
                        track: rec.track,
                        academicYear: rec.academicYear,
                        subject: rec.subject,
                        group: rec.group,
                        date: rec.date,
                        totalQuestions: rec.totalQuestions,
                        questions: Array.from({ length: rec.totalQuestions || 1 }, (_, i) => ({
                          questionNumber: i + 1,
                          title: '',
                          topic: '',
                        })),
                        createdAt: rec.createdAt,
                      };
                    };

                    const sameStructRecords = structureProgress.filter((sp) => sp.structureId === rec.structureId);
                    const maxAttemptForStruct = Math.max(
                      ...sameStructRecords.map((sp) => sp.attemptNumber || 1),
                      1
                    );
                    const latestForStruct =
                      [...sameStructRecords].sort((a, b) => (a.attemptNumber || 1) - (b.attemptNumber || 1)).pop() || rec;

                    return (
                      <tr
                        key={rec.id}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                          isImp ? 'bg-amber-50/40 dark:bg-amber-950/20 border-s-4 border-s-amber-500' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 font-extrabold text-slate-900 dark:text-white">
                          <div className="flex flex-col gap-1">
                            <span>{rec.structureTitle}</span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {isImp && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                                  <Sparkles className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                                  {rec.attemptLabel || tr(`تحسين (محاولة ${rec.attemptNumber || 2})`, `Retake (Attempt ${rec.attemptNumber || 2})`)}
                                </span>
                              )}
                              {prevAcc !== undefined && (
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
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
                                      : 'text-slate-500 dark:text-slate-400'
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
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-600 dark:text-slate-300">
                          {translateGrade(rec.grade, lang)} • {translateTerm(rec.term, lang)} • {translateTrack(rec.track, lang)} • {rec.academicYear} • {translateSubject(rec.subject, lang)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                          {rec.solvedCount} / {rec.totalQuestions} ({rec.completionPercentage}%)
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono tabular-nums font-black text-emerald-600 dark:text-emerald-400">
                          {rec.overallAccuracyPercentage}%
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex flex-wrap gap-1 font-mono tabular-nums">
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
                                      ? `${tr('سؤال', 'Q')} ${qs.questionNumber}: ${qs.accuracyPercentage}% (${tr('تحسين من', 'improved from')} ${qs.previousAccuracy}% • ${tr('محاولة', 'attempt')} ${qs.attemptNumber || 2})`
                                      : `${tr('سؤال', 'Q')} ${qs.questionNumber}: ${qs.solved ? `${qs.accuracyPercentage}%` : tr('لم يُحل', 'Unsolved')}`
                                  }
                                >
                                  {tr('س', 'Q')}{qs.questionNumber}:{qs.solved ? `${qs.accuracyPercentage}%${isQImp ? '↑' : ''}` : '—'}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        {onSaveStructureProgress && (
                          <td className="py-2.5 px-3 text-center">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setStructureModalState({
                                    isOpen: true,
                                    structure: resolveStructureObj(),
                                    existingProgress: null,
                                    isNewImprovementAttempt: true,
                                    baselineProgress: latestForStruct,
                                    nextAttemptNumber: maxAttemptForStruct + 1,
                                  })
                                }
                                className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 rounded-lg border border-amber-200 transition cursor-pointer"
                                title={tr('إضافة محاولة تحسين جديدة لهذا الهيكل', 'Add new improvement attempt for this structure')}
                              >
                                <Plus className="w-3 h-3" />
                                {tr('تحسين', 'Retake')}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setStructureModalState({
                                    isOpen: true,
                                    structure: resolveStructureObj(),
                                    existingProgress: rec,
                                    isNewImprovementAttempt: false,
                                    baselineProgress: null,
                                    nextAttemptNumber: maxAttemptForStruct + 1,
                                  })
                                }
                                className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                                title={tr('تعديل / تحسين أسئلة هذا السجل', 'Edit / improve questions in this record')}
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              {onDeleteStructureProgress && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteStructureProgress(rec)}
                                  className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                  title={tr('حذف السجل', 'Delete record')}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAcademicReportModal && (
        <StudentAcademicReportModal
          student={student}
          results={results}
          settings={settings}
          structureProgress={structureProgress}
          onClose={() => setShowAcademicReportModal(false)}
        />
      )}

      {activeAttachmentResult && (
        <AttachmentModal
          isOpen={!!activeAttachmentResult}
          title={tr('إثبات ومرفق مصداقية الامتحان', 'Exam Verification Attachment')}
          subtitle={`${tr('طالب:', 'Student:')} ${student.name} | ${tr('امتحان:', 'Exam:')} ${activeAttachmentResult.examTitle} | ${tr('الدرجة:', 'Score:')} ${activeAttachmentResult.score} / ${activeAttachmentResult.totalScore}`}
          attachment={activeAttachmentResult.attachment || null}
          onSave={async (attachment) => {
            if (onUpdateResultAttachment) {
              await onUpdateResultAttachment(activeAttachmentResult.id, attachment);
            }
            setActiveAttachmentResult(null);
          }}
          onClose={() => setActiveAttachmentResult(null)}
        />
      )}

      {structureModalState.isOpen && structureModalState.structure && onSaveStructureProgress && (
        <StudentStructureScoringModal
          isOpen={structureModalState.isOpen}
          structure={structureModalState.structure}
          student={student}
          existingProgress={structureModalState.existingProgress}
          isNewImprovementAttempt={structureModalState.isNewImprovementAttempt}
          baselineProgress={structureModalState.baselineProgress}
          nextAttemptNumber={structureModalState.nextAttemptNumber}
          settings={settings}
          gradesList={settings.grades && settings.grades.length > 0 ? settings.grades : UAE_GRADES}
          subjectsList={settings.subjects && settings.subjects.length > 0 ? settings.subjects : ['Mathematics']}
          tracksList={ACADEMIC_TRACKS}
          yearsList={ACADEMIC_YEARS}
          onClose={() =>
            setStructureModalState({
              isOpen: false,
              structure: null,
              existingProgress: null,
              isNewImprovementAttempt: false,
              baselineProgress: null,
              nextAttemptNumber: 2,
            })
          }
          onSave={async (record) => {
            await onSaveStructureProgress(record);
            setStructureModalState({
              isOpen: false,
              structure: null,
              existingProgress: null,
              isNewImprovementAttempt: false,
              baselineProgress: null,
              nextAttemptNumber: 2,
            });
          }}
        />
      )}

      <ConfirmModal
        isOpen={!!pendingDeleteResult}
        zIndexClass="z-[70]"
        title={tr('حذف نتيجة الامتحان', 'Delete Exam Result')}
        message={
          pendingDeleteResult
            ? tr(
                `هل أنت متأكد من حذف نتيجة امتحان "${pendingDeleteResult.examTitle}" (${pendingDeleteResult.score}/${pendingDeleteResult.totalScore}) للطالب "${student.name}" نهائياً؟`,
                `Are you sure you want to permanently delete exam result "${pendingDeleteResult.examTitle}" (${pendingDeleteResult.score}/${pendingDeleteResult.totalScore}) for "${student.name}"?`
              )
            : ''
        }
        confirmText={tr('تأكيد الحذف', 'Confirm Delete')}
        cancelText={tr('تراجع', 'Cancel')}
        isDestructive={true}
        onConfirm={async () => {
          if (pendingDeleteResult) {
            await onDeleteResult(pendingDeleteResult.id);
          }
          setPendingDeleteResult(null);
        }}
        onCancel={() => setPendingDeleteResult(null)}
      />
    </div>
  );
};
