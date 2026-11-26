import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  UserPlus,
  Save,
  User,
  Phone,
  BookOpen,
  School,
  Mail,
  Hash,
  Check,
  AlertTriangle,
  Calendar,
  Layers,
  Compass,
  GraduationCap,
  RotateCcw,
} from 'lucide-react';
import { Student, TeacherSettings, StudentEnrollmentStatus } from '../types';
import { 
  DEFAULT_SETTINGS, 
  UAE_GRADES,
  ACADEMIC_YEARS,
  ACADEMIC_TERMS,
  ACADEMIC_TRACKS,
} from '../services/firebase';
import {
  ENROLLMENT_STATUS_LIST,
  getEffectiveEnrollmentStatus,
  getEffectiveEnrollmentNote,
  saveLocalStudentStatus,
} from '../utils/studentStatus';
import { loadViewState, saveViewState, clearViewState } from '../utils/activityTracker';
import { ConfirmModal } from './ConfirmModal';
import { useLanguage, translateGrade, translateTerm, translateTrack, translateSubject } from '../utils/i18n';

interface StudentFormModalProps {
  isOpen: boolean;
  student?: Student | null;
  studentToEdit?: Student | null;
  existingStudents?: Student[];
  settings?: TeacherSettings;
  onClose: () => void;
  onSave: (
    studentData: Omit<Student, 'id'>,
    studentId?: string
  ) => Promise<void>;
}

export const StudentFormModal: React.FC<StudentFormModalProps> = ({
  isOpen,
  student,
  studentToEdit,
  existingStudents = [],
  settings = DEFAULT_SETTINGS,
  onClose,
  onSave,
}) => {
  const { lang, dir, tr } = useLanguage();
  const activeStudent = student || studentToEdit;

  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [grade, setGrade] = useState('');
  const [academicYear, setAcademicYear] = useState(ACADEMIC_YEARS[0] || '2025 - 2026');
  const [term, setTerm] = useState(ACADEMIC_TERMS[0] || 'الفصل الأول');
  const [track, setTrack] = useState(ACADEMIC_TRACKS[0] || 'عام');

  // Multiple subjects support
  const [subjects, setSubjects] = useState<string[]>([]);
  const [isCustomSubject, setIsCustomSubject] = useState(false);
  const [customSubjectText, setCustomSubjectText] = useState('');

  const [school, setSchool] = useState('');
  const [phone, setPhone] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [enrollmentStatus, setEnrollmentStatus] = useState<StudentEnrollmentStatus>('active');
  const [enrollmentStatusNote, setEnrollmentStatusNote] = useState('');
  const [restoredFromDraft, setRestoredFromDraft] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  // Snapshot of initial values to compute isDirty
  const [initialSnapshot, setInitialSnapshot] = useState({
    name: '',
    studentId: '',
    grade: '',
    academicYear: '',
    term: '',
    track: '',
    subjects: [] as string[],
    isCustomSubject: false,
    customSubjectText: '',
    school: '',
    phone: '',
    parentPhone: '',
    email: '',
    notes: '',
  });

  const configuredGrades =
    settings?.grades && settings.grades.length > 0
      ? settings.grades
      : UAE_GRADES;

  const baseGrades = configuredGrades.includes('أخرى')
    ? configuredGrades
    : [...configuredGrades, 'أخرى'];

  const gradeList =
    grade && !baseGrades.includes(grade)
      ? [grade, ...baseGrades]
      : baseGrades;

  const availableSubjects = settings?.subjects || [];

  // Auto-generate next Student ID when creating new
  const generateNextId = () => {
    const count = (existingStudents?.length || 0) + 1;
    const padded = String(count).padStart(3, '0');
    return `STU-${padded}`;
  };

  // Toggle a saved subject
  const toggleSubject = (selectedSubject: string) => {
    setSubjects((current) => {
      if (current.includes(selectedSubject)) {
        return current.filter((s) => s !== selectedSubject);
      }

      return [...current, selectedSubject];
    });
  };

  useEffect(() => {
    if (!isOpen) return;

    if (activeStudent) {
      setName(activeStudent.name || '');
      setStudentId(activeStudent.studentId || '');
      setGrade(activeStudent.grade || gradeList[0] || '');

      /*
       * Compatibility:
       * New students use subjects[]
       * Old students only have subject
       */
      let existingSubjects: string[] = [];

      if (
        Array.isArray(activeStudent.subjects) &&
        activeStudent.subjects.length > 0
      ) {
        existingSubjects = activeStudent.subjects.filter(
          (s): s is string => typeof s === 'string' && s.trim().length > 0
        );
      } else if (activeStudent.subject?.trim()) {
        existingSubjects = [activeStudent.subject.trim()];
      }

      setSubjects(existingSubjects);

      // If an old/custom subject is not in saved subjects
      const customExistingSubject = existingSubjects.find(
        (s) => !availableSubjects.includes(s)
      );

      if (customExistingSubject) {
        setIsCustomSubject(true);
        setCustomSubjectText(customExistingSubject);
      } else {
        setIsCustomSubject(false);
        setCustomSubjectText('');
      }

      setSchool(activeStudent.school || '');
      setPhone(activeStudent.phone || '');
      setParentPhone(activeStudent.parentPhone || '');
      setEmail(activeStudent.email || '');
      setNotes(activeStudent.notes || '');

      const loadedYear = activeStudent.academicYear || ACADEMIC_YEARS[0] || '2025 - 2026';
      const loadedTerm = activeStudent.term || ACADEMIC_TERMS[0] || 'الفصل الأول';
      const loadedTrack = activeStudent.track || ACADEMIC_TRACKS[0] || 'عام';
      const loadedStatus = getEffectiveEnrollmentStatus(activeStudent);
      const loadedStatusNote = getEffectiveEnrollmentNote(activeStudent);

      setAcademicYear(loadedYear);
      setTerm(loadedTerm);
      setTrack(loadedTrack);
      setEnrollmentStatus(loadedStatus);
      setEnrollmentStatusNote(loadedStatusNote);
      setRestoredFromDraft(false);

      setInitialSnapshot({
        name: activeStudent.name || '',
        studentId: activeStudent.studentId || '',
        grade: activeStudent.grade || '',
        academicYear: loadedYear,
        term: loadedTerm,
        track: loadedTrack,
        subjects: existingSubjects,
        isCustomSubject: !!customExistingSubject,
        customSubjectText: customExistingSubject || '',
        school: activeStudent.school || '',
        phone: activeStudent.phone || '',
        parentPhone: activeStudent.parentPhone || '',
        email: activeStudent.email || '',
        notes: activeStudent.notes || '',
      });
    } else {
      const generatedId = generateNextId();
      const initialGrade = gradeList[0] || 'الصف العاشر (Grade 10)';
      const defaultSubject =
        settings?.defaultSubject ||
        availableSubjects?.[0] ||
        'الفيزياء';
      const initialSubs = defaultSubject ? [defaultSubject] : [];
      const defaultYear = ACADEMIC_YEARS[0] || '2025 - 2026';
      const defaultTerm = ACADEMIC_TERMS[0] || 'الفصل الأول';
      const defaultTrack = ACADEMIC_TRACKS[0] || 'عام';

      // Check for saved draft
      const savedDraft = loadViewState<any>('STUDENT_FORM_DRAFT', null);
      if (savedDraft && savedDraft.name) {
        setName(savedDraft.name || '');
        setStudentId(savedDraft.studentId || generatedId);
        setGrade(savedDraft.grade || initialGrade);
        setAcademicYear(savedDraft.academicYear || defaultYear);
        setTerm(savedDraft.term || defaultTerm);
        setTrack(savedDraft.track || defaultTrack);
        setSubjects(Array.isArray(savedDraft.subjects) && savedDraft.subjects.length > 0 ? savedDraft.subjects : initialSubs);
        setIsCustomSubject(Boolean(savedDraft.isCustomSubject));
        setCustomSubjectText(savedDraft.customSubjectText || '');
        setSchool(savedDraft.school || '');
        setPhone(savedDraft.phone || '');
        setParentPhone(savedDraft.parentPhone || '');
        setEmail(savedDraft.email || '');
        setNotes(savedDraft.notes || '');
        setEnrollmentStatus(savedDraft.enrollmentStatus || 'active');
        setEnrollmentStatusNote(savedDraft.enrollmentStatusNote || '');
        setRestoredFromDraft(true);
      } else {
        setName('');
        setStudentId(generatedId);
        setGrade(initialGrade);
        setAcademicYear(defaultYear);
        setTerm(defaultTerm);
        setTrack(defaultTrack);
        setSubjects(initialSubs);
        setIsCustomSubject(false);
        setCustomSubjectText('');
        setSchool('');
        setPhone('');
        setParentPhone('');
        setEmail('');
        setNotes('');
        setEnrollmentStatus('active');
        setEnrollmentStatusNote('');
        setRestoredFromDraft(false);
      }

      setInitialSnapshot({
        name: '',
        studentId: generatedId,
        grade: initialGrade,
        academicYear: defaultYear,
        term: defaultTerm,
        track: defaultTrack,
        subjects: initialSubs,
        isCustomSubject: false,
        customSubjectText: '',
        school: '',
        phone: '',
        parentPhone: '',
        email: '',
        notes: '',
      });
    }

    setError('');
    setShowConfirmClose(false);
  }, [
    activeStudent,
    isOpen,
    existingStudents?.length,
    settings,
  ]);

  // Determine if form has unsaved modifications
  const isDirty = useMemo(() => {
    if (!isOpen) return false;
    if (name !== initialSnapshot.name) return true;
    if (studentId !== initialSnapshot.studentId) return true;
    if (grade !== initialSnapshot.grade) return true;
    if (academicYear !== initialSnapshot.academicYear) return true;
    if (term !== initialSnapshot.term) return true;
    if (track !== initialSnapshot.track) return true;
    if (school !== initialSnapshot.school) return true;
    if (phone !== initialSnapshot.phone) return true;
    if (parentPhone !== initialSnapshot.parentPhone) return true;
    if (email !== initialSnapshot.email) return true;
    if (notes !== initialSnapshot.notes) return true;
    if (isCustomSubject !== initialSnapshot.isCustomSubject) return true;
    if (customSubjectText !== initialSnapshot.customSubjectText) return true;
    if (
      subjects.length !== initialSnapshot.subjects.length ||
      subjects.some((s, idx) => s !== initialSnapshot.subjects[idx])
    ) {
      return true;
    }
    return false;
  }, [
    isOpen,
    name,
    studentId,
    grade,
    academicYear,
    term,
    track,
    school,
    phone,
    parentPhone,
    email,
    notes,
    isCustomSubject,
    customSubjectText,
    subjects,
    initialSnapshot,
  ]);

  // Prevent accidental tab/browser closure if form has unsaved edits
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

  // Safe close handler that checks for unsaved changes
  const handleRequestClose = () => {
    if (isDirty) {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  };

  const handleForceClose = () => {
    setShowConfirmClose(false);
    onClose();
  };

  // Auto-save draft when adding a new student
  useEffect(() => {
    if (!isOpen || activeStudent) return;
    if (name.trim() || phone.trim() || parentPhone.trim() || school.trim() || notes.trim()) {
      saveViewState('STUDENT_FORM_DRAFT', {
        name,
        studentId,
        grade,
        academicYear,
        term,
        track,
        subjects,
        isCustomSubject,
        customSubjectText,
        school,
        phone,
        parentPhone,
        email,
        notes,
        enrollmentStatus,
        enrollmentStatusNote,
      });
    }
  }, [
    isOpen,
    activeStudent,
    name,
    studentId,
    grade,
    academicYear,
    term,
    track,
    subjects,
    isCustomSubject,
    customSubjectText,
    school,
    phone,
    parentPhone,
    email,
    notes,
    enrollmentStatus,
    enrollmentStatusNote,
  ]);

  const handleStartFresh = () => {
    clearViewState('STUDENT_FORM_DRAFT');
    setName('');
    setStudentId(generateNextId());
    setGrade(gradeList[0] || 'الصف العاشر (Grade 10)');
    setAcademicYear(ACADEMIC_YEARS[0] || '2025 - 2026');
    setTerm(ACADEMIC_TERMS[0] || 'الفصل الأول');
    setTrack(ACADEMIC_TRACKS[0] || 'عام');
    const defaultSubject = settings?.defaultSubject || availableSubjects?.[0] || 'الفيزياء';
    setSubjects(defaultSubject ? [defaultSubject] : []);
    setIsCustomSubject(false);
    setCustomSubjectText('');
    setSchool('');
    setPhone('');
    setParentPhone('');
    setEmail('');
    setNotes('');
    setEnrollmentStatus('active');
    setEnrollmentStatusNote('');
    setRestoredFromDraft(false);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError(tr('يرجى إدخال اسم الطالب كاملاً', 'Please enter student full name'));
      return;
    }

    if (!studentId.trim()) {
      setError(tr('يرجى تحديد الرقم التعريفي للطالب (Student ID)', 'Please enter Student ID'));
      return;
    }

    /*
     * Add manually entered subject if the user typed one.
     */
    let finalSubjects = [...subjects];

    if (isCustomSubject) {
      const customSubject = customSubjectText.trim();

      if (!customSubject) {
        setError(tr('يرجى كتابة اسم المادة', 'Please enter subject name'));
        return;
      }

      if (!finalSubjects.includes(customSubject)) {
        finalSubjects.push(customSubject);
      }
    }

    /*
     * Remove duplicates and empty values.
     */
    finalSubjects = Array.from(
      new Set(
        finalSubjects
          .map((s) => s.trim())
          .filter(Boolean)
      )
    );

    if (finalSubjects.length === 0) {
      setError(tr('يرجى اختيار مادة واحدة على الأقل', 'Please select at least one subject'));
      return;
    }

    // Check duplicate Student ID if changed
    const duplicate = existingStudents.find(
      (s) =>
        s.studentId.trim().toLowerCase() ===
          studentId.trim().toLowerCase() &&
        s.id !== activeStudent?.id
    );

    if (duplicate) {
      setError(
        tr(
          `الرقم التعريفي ${studentId} مستخدم بالفعل لطالب آخر (${duplicate.name})`,
          `Student ID ${studentId} is already assigned to ${duplicate.name}`
        )
      );
      return;
    }

    try {
      setLoading(true);
      setError('');

      if (activeStudent) {
        saveLocalStudentStatus(activeStudent.id, enrollmentStatus, enrollmentStatusNote.trim());
      } else {
        clearViewState('STUDENT_FORM_DRAFT');
      }

      await onSave(
        {
          name: name.trim(),
          studentId: studentId.trim(),
          grade: grade.trim(),
          academicYear: academicYear.trim(),
          term: term.trim(),
          track: track.trim(),
          group: '',
          enrollmentStatus,
          enrollmentStatusNote: enrollmentStatusNote.trim(),
          enrollmentStatusUpdatedAt: new Date().toISOString(),

          // Backward-compatible primary subject
          subject: finalSubjects[0],

          // New multiple-subject field
          subjects: finalSubjects,

          school: school.trim(),
          phone: phone.trim(),
          parentPhone: parentPhone.trim(),
          email: email.trim(),
          notes: notes.trim(),

          createdAt: activeStudent
            ? activeStudent.createdAt
            : new Date().toISOString(),

          updatedAt: new Date().toISOString(),
        },
        activeStudent ? activeStudent.id : undefined
      );

      onClose();
    } catch (err: any) {
      setError(
        err?.message || tr('حدث خطأ أثناء حفظ بيانات الطالب', 'Error saving student profile')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div 
        dir={dir}
        className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-hidden"
        onClick={handleRequestClose}
      >
        <div
          id="student-form-modal"
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-w-2xl w-full flex flex-col max-h-[92dvh] sm:max-h-[90vh] shadow-2xl border border-slate-200 dark:border-slate-800 text-start overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        >
          {/* Header */}
          <div className="shrink-0 p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl">
                {activeStudent ? (
                  <User className="w-5 h-5" />
                ) : (
                  <UserPlus className="w-5 h-5" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg">
                    {activeStudent
                      ? tr('تعديل بيانات الطالب', 'Edit Student Profile')
                      : tr('إضافة طالب جديد', 'Add New Student')}
                  </h3>
                  {isDirty && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse">
                      {tr('تعديلات غير محفوظة', 'Unsaved changes')}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {tr('سجل بيانات الطالب (منهج الإمارات - صفوف 1 إلى 12)', 'Student Profile Record (UAE Curriculum Grades 1–12)')}
                </p>
              </div>
            </div>

            <button
              onClick={handleRequestClose}
              type="button"
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        {/* Error */}
        {error && (
          <div className="mx-4 sm:mx-6 mt-4 p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs sm:text-sm rounded-xl">
            {error}
          </div>
        )}

        {/* Restored Draft Notice */}
        {restoredFromDraft && !activeStudent && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl flex items-center justify-between gap-2 text-xs">
            <span className="font-bold text-indigo-800 dark:text-indigo-200">
              {tr('تم استرجاع آخر بيانات كنت تدخلها تلقائياً — يمكنك المتابعة أو البدء من جديد', 'Auto-restored your last draft — continue or start fresh')}
            </span>
            <button
              type="button"
              onClick={handleStartFresh}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 rounded-lg font-bold hover:bg-indigo-100 cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{tr('البدء من جديد', 'Start Fresh')}</span>
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {/* Enrollment Status Selector in Form */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-amber-500" />
                <span>{tr('حالة ملف الطالب في الكورس:', 'Course Enrollment Status:')}</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ENROLLMENT_STATUS_LIST.map((stOpt) => {
                  const isSel = enrollmentStatus === stOpt.id;
                  const statusLabel =
                    stOpt.id === 'active'
                      ? tr('ملف فعال', 'Active')
                      : stOpt.id === 'completed'
                        ? tr('منتهي الكورس', 'Completed')
                        : stOpt.id === 'paused'
                          ? tr('متوقف مؤقتاً', 'Paused')
                          : tr('منقطع', 'Withdrawn');
                  return (
                    <button
                      key={stOpt.id}
                      type="button"
                      onClick={() => setEnrollmentStatus(stOpt.id)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                        isSel
                          ? stOpt.activeBtnClass
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>{lang === 'ar' ? stOpt.shortLabel : statusLabel}</span>
                      <span className={`w-2 h-2 rounded-full ${isSel ? 'bg-white' : stOpt.dotColor}`} />
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                value={enrollmentStatusNote}
                onChange={(e) => setEnrollmentStatusNote(e.target.value)}
                placeholder={tr('ملاحظة عن حالة الكورس (اختياري: مثال تاريخ انتهاء الكورس أو سبب الانقطاع)', 'Enrollment status note (optional: e.g. course end date or reason)')}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 text-start"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Full Name */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {tr('اسم الطالب بالكامل', 'Student Full Name')}{' '}
                <span className="text-rose-500">*</span>
              </label>

              <div className="relative">
                <input
                  id="student-name-input"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={tr('مثال: زايد راشد المري', 'e.g. Zayed Rashid Al Marri')}
                  className="w-full ps-10 pe-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 dark:text-white transition-all text-start font-medium"
                />

                <User className="w-4 h-4 text-slate-400 absolute start-3 top-3.5" />
              </div>
            </div>

            {/* Student ID */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {tr('الرقم التعريفي (Student ID)', 'Student ID')}{' '}
                  <span className="text-rose-500">*</span>
                </label>

                {!activeStudent && (
                  <button
                    type="button"
                    onClick={() => setStudentId(generateNextId())}
                    className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-semibold cursor-pointer"
                  >
                    {tr('توليد تلقائي', 'Auto Generate')}
                  </button>
                )}
              </div>

              <div className="relative">
                <input
                  id="student-id-input"
                  type="text"
                  required
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="STU-001"
                  className="w-full ps-10 pe-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 dark:text-white transition-all text-start"
                />

                <Hash className="w-4 h-4 text-slate-400 absolute start-3 top-3.5" />
              </div>
            </div>

            {/* Grade */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {tr('الصف الدراسي (منهج الإمارات 1-12)', 'Grade (UAE Curriculum 1–12)')}{' '}
                <span className="text-rose-500">*</span>
              </label>

              <div className="relative">
                <select
                  id="student-grade-select"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full ps-10 pe-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 dark:text-white transition-all text-start cursor-pointer"
                >
                  {gradeList.map((g) => (
                    <option key={g} value={g}>
                      {translateGrade(g, lang)}
                    </option>
                  ))}
                </select>

                <BookOpen className="w-4 h-4 text-slate-400 absolute start-3 top-3.5 pointer-events-none" />
              </div>
            </div>

            {/* Academic Info Dropdowns: Academic Year, Term, and Track */}
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-amber-500/5 dark:bg-amber-500/[0.03] p-3.5 rounded-2xl border border-amber-500/20">
              {/* Academic Year */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-500" />
                  <span>{tr('السنة الدراسية', 'Academic Year')}</span>
                </label>
                <div className="relative">
                  <select
                    id="student-academic-year-select"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 dark:text-white transition-all text-start cursor-pointer"
                  >
                    {ACADEMIC_YEARS.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Term */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-500" />
                  <span>{tr('الفصل الدراسي', 'Term')}</span>
                </label>
                <div className="relative">
                  <select
                    id="student-term-select"
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 dark:text-white transition-all text-start cursor-pointer"
                  >
                    {ACADEMIC_TERMS.map((t) => (
                      <option key={t} value={t}>
                        {translateTerm(t, lang)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Track */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-amber-500" />
                  <span>{tr('المسار', 'Track')}</span>
                </label>
                <div className="relative">
                  <select
                    id="student-track-select"
                    value={track}
                    onChange={(e) => setTrack(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 dark:text-white transition-all text-start cursor-pointer"
                  >
                    {ACADEMIC_TRACKS.map((trk) => (
                      <option key={trk} value={trk}>
                        {translateTrack(trk, lang)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Subjects */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {tr('المواد الدراسية', 'Subjects')}{' '}
                  <span className="text-rose-500">*</span>
                </label>

                <span className="text-[11px] text-slate-400">
                  {tr('يمكن اختيار أكثر من مادة', 'Multiple subjects allowed')}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableSubjects.map((availableSubject) => {
                    const selected =
                      subjects.includes(availableSubject);

                    return (
                      <button
                        key={availableSubject}
                        type="button"
                        onClick={() =>
                          toggleSubject(availableSubject)
                        }
                        className={`flex items-center justify-between gap-2 w-full px-3 py-2.5 rounded-lg border text-sm font-medium transition-all text-start cursor-pointer ${
                          selected
                            ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-400 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-amber-300 hover:bg-amber-50/50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span>{translateSubject(availableSubject, lang)}</span>

                        {selected ? (
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Subject */}
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomSubject(!isCustomSubject);

                      if (!isCustomSubject) {
                        setCustomSubjectText('');
                      }
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 transition-colors cursor-pointer"
                  >
                    {isCustomSubject
                      ? tr('− إلغاء المادة اليدوية', '− Cancel Custom Subject')
                      : tr('+ إضافة مادة غير موجودة', '+ Add Custom Subject')}
                  </button>

                  {isCustomSubject && (
                    <div className="relative mt-2">
                      <input
                        id="student-custom-subject-input"
                        type="text"
                        value={customSubjectText}
                        onChange={(e) =>
                          setCustomSubjectText(e.target.value)
                        }
                        placeholder={tr('اكتب اسم المادة يدوياً', 'Enter subject name')}
                        className="w-full ps-10 pe-3 py-2.5 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl text-sm focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 dark:text-white transition-all text-start font-medium"
                        autoFocus
                      />

                      <BookOpen className="w-4 h-4 text-amber-500 absolute start-3 top-3.5" />
                    </div>
                  )}
                </div>

                {/* Selected subjects */}
                {subjects.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {subjects.map((selectedSubject) => (
                      <span
                        key={selectedSubject}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-xs font-bold"
                      >
                        <Check className="w-3 h-3" />
                        {translateSubject(selectedSubject, lang)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* School */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {tr('المدرسة (اختياري)', 'School (optional)')}
              </label>

              <div className="relative">
                <input
                  id="student-school-input"
                  type="text"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  placeholder={tr('اسم المدرسة في الإمارات', 'School name in UAE')}
                  className="w-full ps-10 pe-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 dark:text-white transition-all text-start"
                />

                <School className="w-4 h-4 text-slate-400 absolute start-3 top-3.5" />
              </div>
            </div>

            {/* Student Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {tr('رقم هاتف الطالب (اختياري)', 'Student Phone (optional)')}
              </label>

              <div className="relative">
                <input
                  id="student-phone-input"
                  type="tel"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+971 50 123 4567"
                  className="w-full ps-10 pe-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 dark:text-white transition-all text-start font-mono"
                />

                <Phone className="w-4 h-4 text-slate-400 absolute start-3 top-3.5" />
              </div>
            </div>

            {/* Parent Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {tr('رقم هاتف ولي الأمر (اختياري)', 'Parent Phone (optional)')}
              </label>

              <div className="relative">
                <input
                  id="student-parent-phone-input"
                  type="tel"
                  dir="ltr"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  placeholder="+971 50 987 6543"
                  className="w-full ps-10 pe-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 dark:text-white transition-all text-start font-mono"
                />

                <Phone className="w-4 h-4 text-slate-400 absolute start-3 top-3.5" />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {tr('البريد الإلكتروني (إن وجد)', 'Email (optional)')}
              </label>

              <div className="relative">
                <input
                  id="student-email-input"
                  type="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@example.com"
                  className="w-full ps-10 pe-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 dark:text-white transition-all text-start"
                />

                <Mail className="w-4 h-4 text-slate-400 absolute start-3 top-3.5" />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {tr('ملاحظات خاصة بالطالب (اختياري)', 'Student Notes (optional)')}
            </label>

            <textarea
              id="student-notes-input"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={tr('ملاحظات حول مستوى الطالب أو ظروف دراسية خاصة...', 'Notes on student progress or special study circumstances...')}
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 dark:text-white transition-all text-start"
            />
          </div>

          </div>

          {/* Action buttons footer */}
          <div className="shrink-0 p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm flex items-center justify-end gap-3 pb-safe">
            <button
              type="button"
              onClick={handleRequestClose}
              className="px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              {tr('إلغاء', 'Cancel')}
            </button>

            <button
              id="save-student-btn"
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-bold text-slate-950 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-98 rounded-xl shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />

              {loading
                ? tr('جاري الحفظ...', 'Saving...')
                : activeStudent
                  ? tr('حفظ التعديلات', 'Save Changes')
                  : tr('إضافة الطالب', 'Add Student')}
            </button>
          </div>
        </form>
      </div>
    </div>

    {/* Confirmation dialog for unsaved changes */}
    <ConfirmModal
      isOpen={showConfirmClose}
      title={tr('تنبيه: تعديلات غير محفوظة', 'Unsaved Changes')}
      message={tr(
        `هناك بيانات أو تعديلات تم إدخالها لطالب "${name.trim() || 'بدون اسم'}" ولم يتم حفظها بعد. هل أنت متأكد من رغبتك في إغلاق النموذج وتجاهل التعديلات؟`,
        `There are unsaved changes for "${name.trim() || 'Unnamed'}". Are you sure you want to close and discard them?`
      )}
      confirmText={tr('نعم، تجاهل التغييرات وأغلق', 'Discard & Close')}
      cancelText={tr('الرجوع ومتابعة الحفظ', 'Keep Editing')}
      isDestructive={true}
      onConfirm={handleForceClose}
      onCancel={() => setShowConfirmClose(false)}
      onClose={() => setShowConfirmClose(false)}
    />
  </>
  );
};
