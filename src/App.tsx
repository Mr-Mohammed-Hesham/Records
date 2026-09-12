import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  CheckSquare,
  BarChart3,
  Settings as SettingsIcon,
  Search,
  UserPlus,
  FileDown,
  Download,
  Menu,
  X,
  Sun,
  Moon,
  LogOut,
  RefreshCw,
} from 'lucide-react';

import {
  Student,
  Exam,
  ExamResult,
  TeacherSettings,
  ResultAttachment,
} from './types';

import {
  auth,
  signInWithGoogle,
  signOutTeacher,
  getTeacherSettings,
  saveTeacherSettings,
  subscribeToRealtimeData,
  addStudent,
  updateStudent,
  deleteStudent,
  addExam,
  updateExam,
  deleteExam,
  saveBatchResults,
  deleteResult,
  updateSingleResult,
  seedSampleData,
  clearAllData,
  DEFAULT_SETTINGS,
} from './services/firebase';

import {
  onAuthStateChanged,
  User,
} from 'firebase/auth';

import { exportAllDataExcel } from './utils/excel';

/* =========================================================
   VIEWS
   ========================================================= */

import { DashboardView } from './components/DashboardView';
import { StudentsView } from './components/StudentsView';
import { StudentProfileView } from './components/StudentProfileView';
import { ExamsView } from './components/ExamsView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';

/* =========================================================
   MODALS / UTILITIES / AUTH
   ========================================================= */

import { StudentFormModal } from './components/StudentFormModal';
import { ExamFormModal } from './components/ExamFormModal';
import { ScoreEntryModal } from './components/ScoreEntryModal';
import { QuickSearchModal } from './components/QuickSearchModal';
import { ConfirmModal } from './components/ConfirmModal';

import {
  ToastContainer,
  ToastNotification,
} from './components/Toast';

import { AppLoader } from './components/AppLoader';

import {
  LoginPage,
  OFFICIAL_EMAILS,
} from './components/LoginPage';

/* =========================================================
   TYPES
   ========================================================= */

type ViewMode =
  | 'dashboard'
  | 'students'
  | 'profile'
  | 'exams'
  | 'scoring'
  | 'reports'
  | 'settings';

/* =========================================================
   APP
   ========================================================= */

export default function App() {
  /* =======================================================
     NAVIGATION
     ======================================================= */

  const [currentView, setCurrentView] =
    useState<ViewMode>('dashboard');

  const [selectedStudent, setSelectedStudent] =
    useState<Student | null>(null);

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  /* =======================================================
     APP DATA
     ======================================================= */

  const [settings, setSettings] =
    useState<TeacherSettings>(DEFAULT_SETTINGS);

  const [students, setStudents] =
    useState<Student[]>([]);

  const [exams, setExams] =
    useState<Exam[]>([]);

  const [results, setResults] =
    useState<ExamResult[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [authInitialized, setAuthInitialized] =
    useState(false);

  const [currentUser, setCurrentUser] =
    useState<User | null>(null);

  /* =======================================================
     DARK MODE
     ======================================================= */

  const [theme, setTheme] =
    useState<'light' | 'dark'>(() => {
      if (typeof window !== 'undefined') {
        const saved =
          localStorage.getItem('mmh_theme');

        if (
          saved === 'dark' ||
          saved === 'light'
        ) {
          return saved;
        }

        return window.matchMedia(
          '(prefers-color-scheme: dark)'
        ).matches
          ? 'dark'
          : 'light';
      }

      return 'light';
    });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add(
        'dark'
      );
    } else {
      document.documentElement.classList.remove(
        'dark'
      );
    }

    localStorage.setItem(
      'mmh_theme',
      theme
    );
  }, [theme]);

  const toggleTheme = () =>
    setTheme((prev) =>
      prev === 'dark'
        ? 'light'
        : 'dark'
    );

  /* =======================================================
     AUTH LISTENER
     ======================================================= */

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (user) => {
          setCurrentUser(user);
          setAuthInitialized(true);
        }
      );

    return () => unsubscribe();
  }, []);

  const isAuthorized =
    !!currentUser &&
    OFFICIAL_EMAILS.some(
      (email) =>
        email.toLowerCase() ===
        (
          currentUser.email || ''
        )
          .trim()
          .toLowerCase()
    );

  /* =======================================================
     MODALS
     ======================================================= */

  const [isStudentModalOpen, setIsStudentModalOpen] =
    useState(false);

  const [studentToEdit, setStudentToEdit] =
    useState<Student | null>(null);

  const [isExamModalOpen, setIsExamModalOpen] =
    useState(false);

  const [examToEdit, setExamToEdit] =
    useState<Exam | null>(null);

  const [isScoreModalOpen, setIsScoreModalOpen] =
    useState(false);

  const [activeScoringExam, setActiveScoringExam] =
    useState<Exam | null>(null);

  const [
    preselectedStudentForScore,
    setPreselectedStudentForScore,
  ] = useState<Student | null>(null);

  const [isSearchModalOpen, setIsSearchModalOpen] =
    useState(false);

  /* =======================================================
     CONFIRM MODAL
     ======================================================= */

  const [confirmModalConfig, setConfirmModalConfig] =
    useState<{
      isOpen: boolean;
      title: string;
      message: string;
      confirmText?: string;
      cancelText?: string;
      isDestructive?: boolean;
      onConfirm: () => void | Promise<void>;
    }>({
      isOpen: false,
      title: '',
      message: '',
      confirmText: 'تأكيد',
      cancelText: 'إلغاء',
      isDestructive: true,
      onConfirm: () => {},
    });

  /* =======================================================
     TOASTS & AUTO-DISMISS
     ======================================================= */

  const [toasts, setToasts] =
    useState<ToastNotification[]>([]);

  const removeToast = useCallback(
    (id: string) => {
      setToasts((prev) =>
        prev.filter(
          (toast) =>
            toast.id !== id
        )
      );
    },
    []
  );

  const addToast = useCallback(
    (
      message: string,
      type:
        | 'success'
        | 'error'
        | 'info' = 'success',
      duration = 3500
    ) => {
      const id =
        Date.now().toString() +
        Math.random()
          .toString(36)
          .substring(2, 5);

      setToasts((prev) => [
        ...prev,
        {
          id,
          message,
          type,
          duration,
        },
      ]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  /* =======================================================
     PWA DIRECT INSTALLATION (NO EXTRA POPUPS)
     ======================================================= */

  const [deferredInstallPrompt, setDeferredInstallPrompt] =
    useState<any>(() => {
      return typeof window !== 'undefined'
        ? (window as any).__pwaInstallPrompt || null
        : null;
    });
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  useEffect(() => {
    // Detect if already installed / standalone
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean })
        .standalone === true;

    if (isStandalone) {
      setIsAppInstalled(true);
    }

    if ((window as any).__pwaInstallPrompt) {
      setDeferredInstallPrompt((window as any).__pwaInstallPrompt);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      (window as any).__pwaInstallPrompt = e;
      setDeferredInstallPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setDeferredInstallPrompt(null);
      if ((window as any).__pwaInstallPrompt) {
        (window as any).__pwaInstallPrompt = null;
      }
      addToast('تم تثبيت التطبيق بنجاح على جهازك!', 'success', 3000);
    };

    window.addEventListener(
      'beforeinstallprompt',
      handleBeforeInstallPrompt
    );
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
      window.removeEventListener(
        'appinstalled',
        handleAppInstalled
      );
    };
  }, [addToast]);

  const handleTriggerInstall = async () => {
    if (isAppInstalled) {
      addToast('التطبيق مثبت بالفعل على جهازك وهو يعمل بأفضل كفاءة', 'info', 2500);
      return;
    }

    const promptEvent =
      deferredInstallPrompt ||
      (typeof window !== 'undefined'
        ? (window as any).__pwaInstallPrompt
        : null);

    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choiceResult =
          await promptEvent.userChoice;
        if (
          choiceResult &&
          choiceResult.outcome === 'accepted'
        ) {
          setIsAppInstalled(true);
          setDeferredInstallPrompt(null);
          if (typeof window !== 'undefined') {
            (window as any).__pwaInstallPrompt = null;
          }
        }
      } catch (err) {
        console.warn('Direct installation trigger:', err);
      }
      return;
    }

    // Direct feedback without any browser address bar guidance
    addToast('جاري تحضير التثبيت المباشر...', 'info', 2000);
  };

  /* =======================================================
     STEP BACK (PHONE BACK BUTTON & ESC KEY)
     ======================================================= */

  const handleStepBack = useCallback((): boolean => {
    // 1. Confirm dialog
    if (confirmModalConfig.isOpen) {
      setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
      return true;
    }
    // 2. Quick Search modal
    if (isSearchModalOpen) {
      setIsSearchModalOpen(false);
      return true;
    }
    // 3. Score Entry modal
    if (isScoreModalOpen) {
      setIsScoreModalOpen(false);
      setActiveScoringExam(null);
      setPreselectedStudentForScore(null);
      return true;
    }
    // 4. Student form modal
    if (isStudentModalOpen) {
      setIsStudentModalOpen(false);
      setStudentToEdit(null);
      return true;
    }
    // 5. Exam form modal
    if (isExamModalOpen) {
      setIsExamModalOpen(false);
      setExamToEdit(null);
      return true;
    }
    // 6. Mobile sidebar menu
    if (mobileMenuOpen) {
      setMobileMenuOpen(false);
      return true;
    }
    // 7. Student profile view
    if (selectedStudent || currentView === 'profile') {
      setSelectedStudent(null);
      setCurrentView('students');
      return true;
    }
    // 8. If in any other section than dashboard
    if (currentView !== 'dashboard') {
      setCurrentView('dashboard');
      return true;
    }
    return false;
  }, [
    confirmModalConfig.isOpen,
    isSearchModalOpen,
    isScoreModalOpen,
    isStudentModalOpen,
    isExamModalOpen,
    mobileMenuOpen,
    selectedStudent,
    currentView,
  ]);

  /* Keyboard shortcuts: Ctrl+K (Quick Search) & Escape (Step Back) */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === 'k'
      ) {
        event.preventDefault();
        setIsSearchModalOpen((prev) => !prev);
        return;
      }

      if (event.key === 'Escape') {
        const handled = handleStepBack();
        if (handled) {
          event.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleStepBack]);

  /* Mobile / Browser History integration for phone back button */
  useEffect(() => {
    const isStepActive =
      confirmModalConfig.isOpen ||
      isSearchModalOpen ||
      isScoreModalOpen ||
      isStudentModalOpen ||
      isExamModalOpen ||
      mobileMenuOpen ||
      !!selectedStudent ||
      currentView !== 'dashboard';

    if (isStepActive && !window.history.state?.stepActive) {
      window.history.pushState({ stepActive: true }, '');
    }
  }, [
    confirmModalConfig.isOpen,
    isSearchModalOpen,
    isScoreModalOpen,
    isStudentModalOpen,
    isExamModalOpen,
    mobileMenuOpen,
    selectedStudent,
    currentView,
  ]);

  useEffect(() => {
    const handlePopState = () => {
      const handled = handleStepBack();
      if (handled) {
        const stillActive =
          currentView !== 'dashboard' || !!selectedStudent;
        if (stillActive && !window.history.state?.stepActive) {
          window.history.pushState({ stepActive: true }, '');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [handleStepBack, currentView, selectedStudent]);

  /* =======================================================
     INITIAL LOAD + REALTIME FIRESTORE
     ======================================================= */

  useEffect(() => {
    if (!authInitialized) {
      return;
    }

    if (!currentUser || !isAuthorized) {
      setLoading(false);
      return;
    }

    let unsubscribe:
      | (() => void)
      | undefined;

    async function init() {
      try {
        setLoading(true);
        const loadedSettings =
          await getTeacherSettings();

        setSettings(
          loadedSettings
        );

        unsubscribe =
          subscribeToRealtimeData(
            (data) => {
              setStudents(
                data.students
              );

              setExams(
                data.exams
              );

              setResults(
                data.results
              );

              setSettings(
                data.settings
              );
              setLoading(false);
            }
          );

        setLoading(false);
      } catch (err) {
        console.warn(
          'Initialization info:',
          err
        );

        setLoading(false);
      }
    }

    init();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [authInitialized, currentUser, isAuthorized]);

  /* =======================================================
     KEEP SELECTED STUDENT UPDATED
     ======================================================= */

  useEffect(() => {
    if (!selectedStudent) {
      return;
    }

    const updatedStudent =
      students.find(
        (student) =>
          student.id ===
          selectedStudent.id
      );

    if (updatedStudent) {
      setSelectedStudent(
        updatedStudent
      );
    } else {
      setSelectedStudent(null);

      if (currentView === 'profile') {
        setCurrentView(
          'students'
        );
      }
    }
  }, [
    students,
    selectedStudent,
    currentView,
  ]);

  /* =======================================================
     EMPTY DATABASE MESSAGE
     ======================================================= */

  useEffect(() => {
    if (
      !loading &&
      students.length === 0 &&
      exams.length === 0
    ) {
      const hasPrompted =
        localStorage.getItem(
          'mmh_sample_prompted'
        );

      if (!hasPrompted) {
        localStorage.setItem(
          'mmh_sample_prompted',
          'true'
        );

        addToast(
          'Welcome Mr. Mohamed Hesham! النظام جاهز، ويمكنك البدء بإضافة الطلاب والامتحانات.',
          'info'
        );
      }
    }
  }, [
    loading,
    students.length,
    exams.length,
    addToast,
  ]);

  /* =======================================================
     STUDENTS
     ======================================================= */

  const handleOpenAddStudent = () => {
    setStudentToEdit(null);
    setIsStudentModalOpen(true);
  };

  const handleOpenEditStudent = (
    student: Student
  ) => {
    setStudentToEdit(student);
    setIsStudentModalOpen(true);
  };

  const handleSaveStudent = async (
    studentData: Omit<Student, 'id'>
  ) => {
    try {
      if (studentToEdit) {
        await updateStudent(
          studentToEdit.id,
          studentData
        );

        addToast(
          `تم تحديث بيانات الطالب "${studentData.name}" بنجاح`
        );

        if (
          selectedStudent &&
          selectedStudent.id ===
            studentToEdit.id
        ) {
          setSelectedStudent({
            id: studentToEdit.id,
            ...studentData,
          });
        }
      } else {
        await addStudent(
          studentData
        );

        addToast(
          `تمت إضافة الطالب "${studentData.name}" برقم تعريفي (${studentData.studentId})`
        );
      }

      setIsStudentModalOpen(
        false
      );
      setStudentToEdit(null);
    } catch (err) {
      console.error(
        'Save student error:',
        err
      );

      addToast(
        'حدث خطأ أثناء حفظ بيانات الطالب',
        'error'
      );
    }
  };

  const handleDeleteStudent = (
    student: Student
  ) => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'حذف الطالب ونتائجه',
      message:
        `هل أنت متأكد من رغبتك في حذف الطالب "${student.name}" نهائياً؟ سيتم أيضاً إزالة كافة نتائج امتحاناته المسجلة.`,
      onConfirm: async () => {
        try {
          /*
           * حذف نتائج الطالب أولاً.
           * هذا يضمن أن سجل الطالب لا يترك
           * نتائج معلقة داخل Firebase.
           */
          const studentResults =
            results.filter(
              (result) =>
                result.studentDocId ===
                student.id
            );

          for (const result of studentResults) {
            await deleteResult(
              result.id
            );
          }

          await deleteStudent(
            student.id
          );

          addToast(
            `تم حذف الطالب "${student.name}" وجميع نتائجه بنجاح`
          );

          if (
            selectedStudent &&
            selectedStudent.id ===
              student.id
          ) {
            setSelectedStudent(
              null
            );

            setCurrentView(
              'students'
            );
          }
        } catch (err) {
          console.error(
            'Delete student error:',
            err
          );

          addToast(
            'تعذر حذف الطالب أو بعض نتائجه',
            'error'
          );
        }
      },
    });
  };

  const handleOpenStudentProfile = (
    student: Student
  ) => {
    setSelectedStudent(student);
    setCurrentView('profile');
  };

  /* =======================================================
     EXAMS
     ======================================================= */

  const handleOpenAddExam = () => {
    setExamToEdit(null);
    setIsExamModalOpen(true);
  };

  const handleOpenEditExam = (
    exam: Exam
  ) => {
    setExamToEdit(exam);
    setIsExamModalOpen(true);
  };

  const handleSaveExam = async (
    examData: Omit<Exam, 'id'>
  ) => {
    try {
      if (examToEdit) {
        await updateExam(
          examToEdit.id,
          examData
        );

        addToast(
          `تم تحديث بيانات امتحان "${examData.title}"`
        );
      } else {
        const added =
          await addExam(
            examData
          );

        addToast(
          `تم تسجيل امتحان "${examData.title}" بنجاح`
        );

        setActiveScoringExam({
          id: added,
          ...examData,
        });

        setIsExamModalOpen(
          false
        );

        setIsScoreModalOpen(
          true
        );
      }

      setExamToEdit(null);
    } catch (err) {
      console.error(
        'Save exam error:',
        err
      );

      addToast(
        'حدث خطأ أثناء حفظ الامتحان',
        'error'
      );
    }
  };

  const handleDeleteExam = (
    exam: Exam
  ) => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'حذف الامتحان ودرجاته',
      message:
        `هل أنت متأكد من حذف امتحان "${exam.title}"؟ سيتم حذف جميع النتائج المرتبطة بهذا الامتحان.`,
      onConfirm: async () => {
        try {
          /*
           * حذف النتائج المرتبطة بالامتحان أولاً.
           */
          const examResults =
            results.filter(
              (result) =>
                result.examId ===
                exam.id
            );

          for (const result of examResults) {
            await deleteResult(
              result.id
            );
          }

          await deleteExam(
            exam.id
          );

          if (
            activeScoringExam &&
            activeScoringExam.id ===
              exam.id
          ) {
            setActiveScoringExam(
              null
            );

            setIsScoreModalOpen(
              false
            );
          }

          addToast(
            `تم حذف امتحان "${exam.title}" وجميع نتائجه بنجاح`
          );
        } catch (err) {
          console.error(
            'Delete exam error:',
            err
          );

          addToast(
            'تعذر حذف الامتحان أو بعض نتائجه',
            'error'
          );
        }
      },
    });
  };

  /* =======================================================
     SCORING
     ======================================================= */

  const handleOpenScoring = (
    exam: Exam
  ) => {
    setActiveScoringExam(exam);
    setPreselectedStudentForScore(
      null
    );
    setIsScoreModalOpen(true);
  };

  const handleOpenScoringForStudent = (
    student: Student
  ) => {
    if (exams.length === 0) {
      addToast(
        'يجب تسجيل امتحان أولاً لرصد النتائج',
        'info'
      );

      handleOpenAddExam();

      return;
    }

    const sortedExams =
      [...exams].sort(
        (a, b) =>
          new Date(
            b.date
          ).getTime() -
          new Date(
            a.date
          ).getTime()
      );

    setActiveScoringExam(
      sortedExams[0]
    );

    setPreselectedStudentForScore(
      student
    );

    setIsScoreModalOpen(true);
  };

  /* =======================================================
     SAVE BATCH SCORES
     ======================================================= */

  const handleSaveBatchScores = async (
    scores: Array<Omit<ExamResult, 'id'>>
  ) => {
    try {
      if (!scores || scores.length === 0) {
        addToast(
          'لم يتم إدخال أي درجات للحفظ',
          'info'
        );

        return;
      }

      /*
       * نتأكد أن كل نتيجة مرتبطة بطالب وامتحان.
       * هذا مهم جداً لفصل سجل كل طالب عن الآخر.
       */
      const validScores =
        scores.filter(
          (score) =>
            !!score.studentDocId &&
            !!score.examId
        );

      if (
        validScores.length === 0
      ) {
        addToast(
          'بيانات النتائج غير مكتملة: يجب تحديد الطالب والامتحان',
          'error'
        );

        return;
      }

      const resultsToSave: ExamResult[] =
        validScores.map(
          (score) => ({
            ...score,
            id: '',
          })
        );

      await saveBatchResults(
        resultsToSave
      );

      addToast(
        `تم حفظ وتحديث نتائج ${validScores.length} طالب بنجاح!`
      );
    } catch (err) {
      console.error(
        'Save batch scores error:',
        err
      );

      addToast(
        'حدث خطأ أثناء حفظ الدرجات',
        'error'
      );

      throw err;
    }
  };

  /* =======================================================
     DELETE RESULT
     ======================================================= */

  const handleDeleteResult = async (
    resultId: string
  ) => {
    try {
      await deleteResult(
        resultId
      );

      addToast(
        'تم حذف النتيجة'
      );
    } catch (err) {
      console.error(
        'Delete result error:',
        err
      );

      addToast(
        'تعذر حذف النتيجة',
        'error'
      );
    }
  };

  /* =======================================================
     UPDATE RESULT
     ======================================================= */

  const handleUpdateResult = async (
    resultId: string,
    updatedScore: number,
    notes: string
  ) => {
    try {
      const resObj =
        results.find(
          (result) =>
            result.id ===
            resultId
        );

      if (!resObj) {
        addToast(
          'لم يتم العثور على النتيجة',
          'error'
        );

        return;
      }

      const pct =
        Math.round(
          (updatedScore /
            resObj.totalScore) *
            1000
        ) / 10;

      const pass =
        updatedScore >=
        resObj.totalScore *
          (settings.passPercentage /
            100);

      await updateSingleResult(
        resultId,
        {
          score:
            updatedScore,
          percentage:
            pct,
          passed:
            pass,
          notes,
        }
      );

      addToast(
        'تم تحديث نتيجة الطالب'
      );
    } catch (err) {
      console.error(
        'Update result error:',
        err
      );

      addToast(
        'تعذر تحديث النتيجة',
        'error'
      );
    }
  };

  /* =======================================================
     UPDATE RESULT ATTACHMENT
     ======================================================= */

  const handleUpdateResultAttachment = async (
    resultId: string,
    attachment: ResultAttachment | null
  ) => {
    try {
      await updateSingleResult(resultId, {
        attachment: attachment || null,
        updatedAt: new Date().toISOString(),
      });

      addToast(
        attachment
          ? 'تم حفظ وتثبيت مرفق إثبات المصداقية للنتيجة بنجاح'
          : 'تم إزالة مرفق النتيجة بنجاح'
      );
    } catch (err) {
      console.error('Update result attachment error:', err);
      addToast('تعذر حفظ المرفق، يرجى المحاولة لاحقاً', 'error');
    }
  };

  /* =======================================================
     UPDATE EXAM ATTACHMENT
     ======================================================= */

  const handleUpdateExamAttachment = async (
    examId: string,
    attachment: ResultAttachment | null
  ) => {
    try {
      await updateExam(examId, {
        attachment: attachment || null,
      });

      addToast(
        attachment
          ? 'تم حفظ وتثبيت المرفق الرسمي للامتحان بنجاح'
          : 'تم إزالة مرفق الامتحان بنجاح'
      );
    } catch (err) {
      console.error('Update exam attachment error:', err);
      addToast('تعذر حفظ مرفق الامتحان، يرجى المحاولة لاحقاً', 'error');
    }
  };

  /* =======================================================
     SETTINGS
     ======================================================= */

  const handleUpdateSettings = async (
    newSettings: TeacherSettings
  ) => {
    try {
      await saveTeacherSettings(
        newSettings
      );

      setSettings(
        newSettings
      );

      addToast(
        'تم حفظ الإعدادات بنجاح'
      );
    } catch (err) {
      console.error(
        'Save settings error:',
        err
      );

      addToast(
        'تعذر حفظ الإعدادات',
        'error'
      );
    }
  };

  const handleSeedSampleData =
    async () => {
      try {
        await seedSampleData();

        addToast(
          'لا توجد بيانات تجريبية. النظام يعمل ببياناتك الحقيقية فقط.',
          'info'
        );
      } catch (err) {
        console.error(
          'Sample data error:',
          err
        );

        addToast(
          'تعذر تنفيذ العملية',
          'error'
        );
      }
    };

  const handleClearAllData =
    async () => {
      try {
        await clearAllData();

        setStudents([]);
        setExams([]);
        setResults([]);
        setSelectedStudent(null);
        setActiveScoringExam(null);
        setCurrentView(
          'dashboard'
        );

        addToast(
          'تم إفراغ كافة البيانات بنجاح',
          'info'
        );
      } catch (err) {
        console.error(
          'Clear data error:',
          err
        );

        addToast(
          'تعذر إفراغ البيانات',
          'error'
        );
      }
    };

  /* =======================================================
     IMPORT BACKUP
     ======================================================= */

  const handleImportJsonBackup =
    async (data: {
      students: Student[];
      exams: Exam[];
      results: ExamResult[];
      settings?: TeacherSettings;
    }) => {
      try {
        if (data.settings) {
          await saveTeacherSettings(
            data.settings
          );

          setSettings(
            data.settings
          );
        }

        /*
         * استيراد الطلاب
         */
        for (const student of
          data.students || []) {
          const {
            id,
            ...rest
          } = student;

          await addStudent(
            rest
          );
        }

        /*
         * استيراد الامتحانات
         */
        const importedExamIds =
          new Map<
            string,
            string
          >();

        for (const exam of
          data.exams || []) {
          const {
            id,
            ...rest
          } = exam;

          const newExamId =
            await addExam(
              rest
            );

          if (id) {
            importedExamIds.set(
              id,
              newExamId
            );
          }
        }

        /*
         * استيراد النتائج.
         *
         * نستخدم IDs الأصلية إذا كانت متوافقة
         * مع البيانات الحالية، وإلا نحاول
         * ربطها بالامتحان المستورد.
         */
        const importedResults =
          data.results || [];

        if (
          importedResults.length >
          0
        ) {
          const resultsToImport =
            importedResults.map(
              (result) => ({
                ...result,
                id: '',
                examId:
                  importedExamIds.get(
                    result.examId
                  ) ||
                  result.examId,
              })
            );

          await saveBatchResults(
            resultsToImport
          );
        }

        addToast(
          'تم استيراد بيانات النسخة الاحتياطية بنجاح!'
        );
      } catch (err) {
        console.error(
          'Import backup error:',
          err
        );

        addToast(
          'فشل استيراد النسخة الاحتياطية',
          'error'
        );
      }
    };

  /* =======================================================
     GOOGLE LOGIN
     ======================================================= */

  const handleGoogleLogin =
    async () => {
      try {
        const user =
          await signInWithGoogle();

        addToast(
          `مرحباً بك! تم تسجيل الدخول: ${
            user.displayName ||
            user.email ||
            ''
          }`,
          'success'
        );
      } catch (err: any) {
        if (
          err?.code !==
          'auth/popup-closed-by-user'
        ) {
          console.error(
            'Google login error:',
            err
          );

          addToast(
            'تعذر تسجيل الدخول بواسطة Google',
            'error'
          );
        }
      }
    };

  const handleGoogleLogout =
    async () => {
      try {
        await signOutTeacher();

        addToast(
          'تم تسجيل الخروج بنجاح',
          'info'
        );
      } catch (err) {
        console.error(
          'Logout error:',
          err
        );
      }
    };

  const requestGoogleLogout = () => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'تأكيد تسجيل الخروج',
      message:
        'هل أنت متأكد من رغبتك في تسجيل الخروج من حسابك؟ يمكنك تسجيل الدخول مجددًا في أي وقت.',
      confirmText: 'تسجيل الخروج',
      cancelText: 'إلغاء',
      isDestructive: true,
      onConfirm: async () => {
        await handleGoogleLogout();
      },
    });
  };

  /* =======================================================
     EXPORT EXCEL
     ======================================================= */

  const handleExportAllExcel =
    () => {
      try {
        exportAllDataExcel(
          students,
          exams,
          results,
          settings
        );

        addToast(
          'تم تجهيز وتنزيل ملف Excel الشامل بنجاح!'
        );
      } catch (err) {
        console.error(
          'Export Excel error:',
          err
        );

        addToast(
          'تعذر تصدير ملف Excel',
          'error'
        );
      }
    };

  /* =======================================================
     REFRESH PLATFORM (تحديث المنصة)
     ======================================================= */

  const [isRefreshingPlatform, setIsRefreshingPlatform] = useState(false);

  const handleRefreshPlatform = async () => {
    try {
      setIsRefreshingPlatform(true);
      addToast('جاري تحديث المنصة ومزامنة أحدث السجلات...', 'info');

      // Update Service Worker caches if registered
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            await registration.update();
          }
        } catch (swErr) {
          console.debug('Service worker sync:', swErr);
        }
      }

      // Re-sync settings
      try {
        const freshSettings = await getTeacherSettings();
        setSettings(freshSettings);
      } catch (stErr) {
        console.debug('Settings refresh:', stErr);
      }

      // Smooth delay before reload so the user sees the spin & toast
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      console.error('Refresh platform error:', err);
      window.location.reload();
    }
  };

  /* =======================================================
     NAVIGATION
     ======================================================= */

  const navigateTo = (
    view: ViewMode
  ) => {
    setCurrentView(view);
    setMobileMenuOpen(false);
  };

  const navItems = [
    {
      id: 'dashboard',
      label: 'الرئيسية',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'students',
      label: 'إدارة الطلاب',
      icon: Users,
      badge: students.length,
    },
    {
      id: 'exams',
      label: 'إدارة الامتحانات',
      icon: FileSpreadsheet,
      badge: exams.length,
    },
    {
      id: 'scoring',
      label: 'رصد النتائج',
      icon: CheckSquare,
      badge: null,
    },
    {
      id: 'reports',
      label: 'التقارير والإحصائيات',
      icon: BarChart3,
      badge: null,
    },
    {
      id: 'settings',
      label: 'الإعدادات',
      icon: SettingsIcon,
      badge: null,
    },
  ];

  /* =======================================================
     LOADING
     ======================================================= */

  if (
    loading ||
    !authInitialized
  ) {
    return (
      <AppLoader
        message="جاري الاتصال بـ Firebase ومزامنة السجلات الأكاديمية..."
      />
    );
  }

  /* =======================================================
     LOGIN
     ======================================================= */

  if (
    !currentUser ||
    !isAuthorized
  ) {
    return (
      <LoginPage
        currentUser={currentUser}
        onAuthorizedLogin={(user) => {
          if (user) {
            setCurrentUser(user);
          } else {
            handleGoogleLogin();
          }
        }}
      />
    );
  }

  /* =======================================================
     MAIN UI
     ======================================================= */

  return (
    <div
      className="min-h-screen bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 flex flex-col font-sans antialiased selection:bg-amber-500 selection:text-white transition-colors"
      dir="rtl"
    >
      {/* =================================================
          TOASTS
          ================================================= */}

      <ToastContainer
        toasts={toasts}
        onClose={removeToast}
      />

      {/* =================================================
          HEADER
          ================================================= */}

      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs transition-colors w-full overflow-hidden">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-1.5 sm:gap-4 w-full">

          {/* Brand */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 min-w-0">
            <button
              onClick={() =>
                setMobileMenuOpen(
                  (prev) => !prev
                )
              }
              className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl lg:hidden cursor-pointer shrink-0"
              title="القائمة"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>

            <div
              onClick={() =>
                navigateTo(
                  'dashboard'
                )
              }
              className="flex items-center gap-1.5 sm:gap-3 cursor-pointer group min-w-0"
            >
              <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-xl p-0.5 bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 shadow-md shadow-amber-500/20 shrink-0 overflow-hidden">
                <img
                  src={`${import.meta.env.BASE_URL}teacher-logo.jpg`}
                  alt="Mr Mohammed Hesham"
                  className="w-full h-full object-cover rounded-[10px]"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="min-w-0">
                <div className="text-amber-500 font-extrabold text-xs sm:text-base leading-tight font-sans tracking-wide truncate">
                  Mr. Mohamed{' '}
                  <span className="text-slate-900 dark:text-white font-black">
                    Hesham
                  </span>
                </div>

                <p className="text-[10px] text-slate-400 dark:text-slate-400 hidden sm:block tracking-wider font-sans">
                  Academic Records & Management
                </p>
              </div>
            </div>
          </div>

          {/* Header Tools */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">

            {/* Platform Refresh Button (تحديث المنصة) */}
            <button
              id="btn-refresh-platform"
              onClick={handleRefreshPlatform}
              disabled={isRefreshingPlatform}
              className="px-2 py-1.5 sm:px-3 sm:py-2 border border-amber-500/30 dark:border-amber-500/40 rounded-xl text-xs sm:text-sm font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center gap-1 sm:gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
              title="تحديث المنصة ومزامنة أحدث السجلات"
            >
              <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 ${isRefreshingPlatform ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">تحديث المنصة</span>
              <span className="sm:hidden text-[11px] font-bold">تحديث</span>
            </button>

            {/* Install Button */}
            <button
              id="btn-install-pwa-header"
              onClick={handleTriggerInstall}
              className="hidden md:inline-flex px-3 py-2 border border-amber-500/30 dark:border-amber-500/40 rounded-xl text-xs sm:text-sm font-bold hover:bg-amber-500/15 bg-amber-500/10 text-amber-600 dark:text-amber-400 items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
              title="تثبيت التطبيق مباشرة على الهاتف أو سطح المكتب"
            >
              <Download className="w-4 h-4 text-amber-500 animate-pulse" />
              <span>تثبيت</span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={
                toggleTheme
              }
              className="p-1.5 sm:p-2 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 shadow-xs transition cursor-pointer shrink-0"
              title={
                theme === 'dark'
                  ? 'التبديل إلى الوضع الفاتح'
                  : 'التبديل إلى الوضع الليلي'
              }
            >
              {theme ===
              'dark' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>

            {/* Mobile Quick Search Button */}
            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="sm:hidden p-1.5 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 shadow-xs transition cursor-pointer shrink-0"
              title="بحث سريع"
            >
              <Search className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            </button>

            {/* Search Bar on Tablet/Desktop */}
            <div
              onClick={() =>
                setIsSearchModalOpen(
                  true
                )
              }
              className="hidden sm:flex items-center bg-slate-100 dark:bg-slate-800/80 px-3.5 py-1.5 sm:py-2 rounded-full w-36 md:w-52 lg:w-64 border border-transparent hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer transition-colors shrink-0"
            >
              <Search className="w-4 h-4 text-slate-400 shrink-0" />

              <span className="text-xs text-slate-400 dark:text-slate-400 mr-2 flex-1 truncate">
                بحث بالاسم أو ID...
              </span>

              <kbd className="hidden lg:inline font-mono text-[10px] bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600 text-slate-400">
                ⌘K
              </kbd>
            </div>

            {/* Excel (Desktop) */}
            <button
              onClick={
                handleExportAllExcel
              }
              className="hidden md:inline-flex px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 shadow-xs text-slate-700 dark:text-slate-200 items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              title="تصدير جميع البيانات إلى Excel"
            >
              <FileDown className="w-4 h-4 text-amber-500" />

              <span>
                Excel
              </span>
            </button>

            {/* User */}
            {currentUser && (
              <div className="flex items-center gap-1 sm:gap-2 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/50 p-1 sm:py-1.5 sm:px-2.5 rounded-xl text-xs shrink-0">

                {currentUser.photoURL ? (
                  <img
                    src={
                      currentUser.photoURL
                    }
                    alt=""
                    className="w-5 h-5 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                    {currentUser
                      .displayName?.[0] ||
                      currentUser
                        .email?.[0] ||
                        'M'}
                  </div>
                )}

                <span
                  className="font-medium text-amber-950 dark:text-amber-200 hidden md:inline truncate max-w-[110px]"
                  title={
                    currentUser.email ||
                    ''
                  }
                >
                  {currentUser.displayName ||
                    currentUser.email}
                </span>

                <button
                  onClick={
                    requestGoogleLogout
                  }
                  className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer shrink-0"
                  title="تسجيل الخروج"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* =================================================
          MAIN
          ================================================= */}

      <div className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 flex gap-6 overflow-x-hidden">

        {/* Desktop Sidebar */}
        <aside className="w-64 shrink-0 hidden lg:block">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-200 dark:border-slate-800 sticky top-24 space-y-6 transition-colors">

            <div className="pb-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl p-0.5 bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 shadow-md shadow-amber-500/20 shrink-0 overflow-hidden">
                <img
                  src={`${import.meta.env.BASE_URL}teacher-logo.jpg`}
                  alt="Mr Mohammed Hesham"
                  className="w-full h-full object-cover rounded-[14px]"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div>
                <div className="text-amber-500 font-extrabold text-sm leading-snug font-sans tracking-wide">
                  Mr. Mohamed Hesham
                </div>

                <p className="text-[11px] text-slate-400 dark:text-slate-400 font-sans">
                  Academic Records & Management
                </p>
              </div>
            </div>

            <nav className="space-y-1.5">
              {navItems.map(
                (item) => {
                  const Icon =
                    item.icon;

                  const isActive =
                    currentView ===
                      item.id ||
                    (item.id ===
                      'students' &&
                      currentView ===
                        'profile');

                  return (
                    <button
                      key={
                        item.id
                      }
                      onClick={() => {
                        if (
                          item.id ===
                          'scoring'
                        ) {
                          if (
                            exams.length >
                            0
                          ) {
                            handleOpenScoring(
                              exams[0]
                            );
                          } else {
                            navigateTo(
                              'exams'
                            );

                            addToast(
                              'أنشئ أول امتحان لرصد الدرجات',
                              'info'
                            );
                          }
                        } else {
                          navigateTo(
                            item.id as ViewMode
                          );
                        }
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition cursor-pointer ${
                        isActive
                          ? 'bg-gradient-to-r from-amber-500/15 to-orange-500/10 text-amber-700 dark:text-amber-400 border-r-4 border-amber-500 font-bold shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          className={`w-4 h-4 ${
                            isActive
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-400'
                          }`}
                        />

                        <span>
                          {
                            item.label
                          }
                        </span>
                      </div>

                      {item.badge !==
                        null &&
                        item.badge >
                          0 && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                              isActive
                                ? 'bg-amber-200 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {
                              item.badge
                            }
                          </span>
                        )}
                    </button>
                  );
                }
              )}
            </nav>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl flex items-center gap-3 border border-slate-100 dark:border-slate-750">
                <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-amber-400/40">
                  <img
                    src={`${import.meta.env.BASE_URL}teacher-logo.jpg`}
                    alt=""
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold truncate text-slate-900 dark:text-white">
                    {
                      settings.teacherName
                    }
                  </p>

                  <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                    مدرس{' '}
                    {
                      settings.defaultSubject
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs lg:hidden"
            onClick={() =>
              setMobileMenuOpen(
                false
              )
            }
          >
            <div
              className="w-72 bg-white dark:bg-slate-900 h-full p-5 shadow-2xl flex flex-col justify-between"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={`${import.meta.env.BASE_URL}teacher-logo.jpg`}
                      alt=""
                      className="w-8 h-8 rounded-lg object-cover"
                    />

                    <span className="font-extrabold text-sm text-amber-500 font-sans tracking-wide">
                      Mr. Mohamed Hesham
                    </span>
                  </div>

                  <button
                    onClick={() =>
                      setMobileMenuOpen(
                        false
                      )
                    }
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="space-y-1">
                  {navItems.map(
                    (item) => {
                      const Icon =
                        item.icon;

                      const isActive =
                        currentView ===
                        item.id;

                      return (
                        <button
                          key={
                            item.id
                          }
                          onClick={() => {
                            if (
                              item.id ===
                              'scoring'
                            ) {
                              if (
                                exams.length >
                                0
                              ) {
                                handleOpenScoring(
                                  exams[0]
                                );
                              } else {
                                navigateTo(
                                  'exams'
                                );
                              }
                            } else {
                              navigateTo(
                                item.id as ViewMode
                              );
                            }
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm ${
                            isActive
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border-r-4 border-amber-500'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="w-4 h-4" />

                            <span>
                              {
                                item.label
                              }
                            </span>
                          </div>
                        </button>
                      );
                    }
                  )}
                </nav>

                {/* Quick Refresh in Drawer */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 mt-3">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleRefreshPlatform();
                    }}
                    disabled={isRefreshingPlatform}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <RefreshCw className={`w-4 h-4 text-amber-500 ${isRefreshingPlatform ? 'animate-spin' : ''}`} />
                      <span>تحديث ومزامنة المنصة</span>
                    </div>
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <button
                  onClick={
                    toggleTheme
                  }
                  className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {theme ===
                  'dark' ? (
                    <Sun className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Moon className="w-4 h-4" />
                  )}

                  <span>
                    {theme ===
                    'dark'
                      ? 'الوضع النهاري'
                      : 'الوضع الليلي'}
                  </span>
                </button>

                {currentUser && (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      requestGoogleLogout();
                    }}
                    className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>خروج</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 min-w-0 pb-20 lg:pb-8">

          {currentView ===
            'dashboard' && (
            <DashboardView
              students={
                students
              }
              exams={exams}
              allResults={
                results
              }
              settings={
                settings
              }
              onNavigate={(
                view
              ) => {
                if (
                  view ===
                    'scoring' &&
                  exams.length >
                    0
                ) {
                  handleOpenScoring(
                    exams[0]
                  );
                } else {
                  navigateTo(
                    view
                  );
                }
              }}
              onOpenStudentProfile={
                handleOpenStudentProfile
              }
              onAddStudent={
                handleOpenAddStudent
              }
              onAddExam={
                handleOpenAddExam
              }
              onOpenQuickSearch={() =>
                setIsSearchModalOpen(
                  true
                )
              }
              onExportAllExcel={
                handleExportAllExcel
              }
            />
          )}

          {currentView ===
            'students' && (
            <StudentsView
              students={
                students
              }
              allResults={
                results
              }
              settings={
                settings
              }
              onOpenProfile={
                handleOpenStudentProfile
              }
              onAddStudent={
                handleOpenAddStudent
              }
              onEditStudent={
                handleOpenEditStudent
              }
              onDeleteStudent={
                handleDeleteStudent
              }
              onExportAllExcel={
                handleExportAllExcel
              }
            />
          )}

          {currentView ===
            'profile' &&
            selectedStudent && (
              <StudentProfileView
                student={
                  selectedStudent
                }
                exams={exams}
                results={results.filter(
                  (result) =>
                    result.studentDocId ===
                    selectedStudent.id
                )}
                settings={
                  settings
                }
                onBack={() =>
                  navigateTo(
                    'students'
                  )
                }
                onEditStudent={
                  handleOpenEditStudent
                }
                onDeleteResult={
                  handleDeleteResult
                }
                onUpdateResult={
                  handleUpdateResult
                }
                onAddScoreForStudent={
                  handleOpenScoringForStudent
                }
                onUpdateResultAttachment={
                  handleUpdateResultAttachment
                }
              />
            )}

          {currentView ===
            'exams' && (
            <ExamsView
              exams={exams}
              students={
                students
              }
              allResults={
                results
              }
              settings={
                settings
              }
              onAddExam={
                handleOpenAddExam
              }
              onEditExam={
                handleOpenEditExam
              }
              onDeleteExam={
                handleDeleteExam
              }
              onOpenScoring={
                handleOpenScoring
              }
              onUpdateExamAttachment={
                handleUpdateExamAttachment
              }
            />
          )}

          {currentView ===
            'reports' && (
            <ReportsView
              students={
                students
              }
              exams={exams}
              allResults={
                results
              }
              settings={
                settings
              }
              onOpenStudentProfile={
                handleOpenStudentProfile
              }
            />
          )}

          {currentView ===
            'settings' && (
            <SettingsView
              settings={
                settings
              }
              students={
                students
              }
              exams={exams}
              allResults={
                results
              }
              onUpdateSettings={
                handleUpdateSettings
              }
              onSeedSampleData={
                handleSeedSampleData
              }
              onClearAllData={
                handleClearAllData
              }
              onImportJsonBackup={
                handleImportJsonBackup
              }
            />
          )}
        </main>
      </div>

      {/* =================================================
          MODALS
          ================================================= */}

      <StudentFormModal
        isOpen={
          isStudentModalOpen
        }
        onClose={() =>
          setIsStudentModalOpen(
            false
          )
        }
        onSave={
          handleSaveStudent
        }
        student={
          studentToEdit
        }
        studentToEdit={
          studentToEdit
        }
        existingStudents={
          students
        }
        settings={
          settings
        }
      />

      <ExamFormModal
        isOpen={
          isExamModalOpen
        }
        onClose={() =>
          setIsExamModalOpen(
            false
          )
        }
        onSave={
          handleSaveExam
        }
        exam={
          examToEdit
        }
        examToEdit={
          examToEdit
        }
        settings={
          settings
        }
      />

      <ScoreEntryModal
        isOpen={
          isScoreModalOpen
        }
        onClose={() =>
          setIsScoreModalOpen(
            false
          )
        }
        exam={
          activeScoringExam
        }
        students={
          students
        }
        /*
         * مهم جداً:
         * الرصد يعرض فقط نتائج الامتحان
         * الحالي، وليس نتائج جميع الامتحانات.
         */
        existingResults={
          activeScoringExam
            ? results.filter(
                (result) =>
                  result.examId ===
                  activeScoringExam.id
              )
            : []
        }
        settings={
          settings
        }
        onSaveBatch={
          handleSaveBatchScores
        }
        onSaveScores={
          handleSaveBatchScores
        }
        preselectedStudent={
          preselectedStudentForScore
        }
      />

      <QuickSearchModal
        isOpen={
          isSearchModalOpen
        }
        onClose={() =>
          setIsSearchModalOpen(
            false
          )
        }
        students={
          students
        }
        onSelectStudent={
          handleOpenStudentProfile
        }
      />

      <ConfirmModal
        isOpen={
          confirmModalConfig.isOpen
        }
        title={
          confirmModalConfig.title
        }
        message={
          confirmModalConfig.message
        }
        confirmText={
          confirmModalConfig.confirmText
        }
        cancelText={
          confirmModalConfig.cancelText
        }
        isDestructive={
          confirmModalConfig.isDestructive
        }
        onConfirm={
          async () => {
            await confirmModalConfig.onConfirm();

            setConfirmModalConfig(
              (prev) => ({
                ...prev,
                isOpen: false,
              })
            );
          }
        }
        onCancel={() =>
          setConfirmModalConfig(
            (prev) => ({
              ...prev,
              isOpen: false,
            })
          )
        }
        onClose={() =>
          setConfirmModalConfig(
            (prev) => ({
              ...prev,
              isOpen: false,
            })
          )
        }
      />

      {/* Floating Quick Install Button */}
      {!isAppInstalled && (
        <button
          id="btn-floating-install-pwa"
          onClick={handleTriggerInstall}
          aria-label="تثبيت التطبيق مباشرة"
          title="تثبيت التطبيق مباشرة على الهاتف أو سطح المكتب"
          className="fixed bottom-20 left-4 sm:bottom-6 sm:left-6 z-40 w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 shadow-xl shadow-amber-500/30 flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 group cursor-pointer border border-white/20"
        >
          <Download className="w-5 h-5 transition-transform group-hover:translate-y-0.5" />
          <span className="sr-only">تثبيت التطبيق</span>
        </button>
      )}

      {/* Mobile Bottom Navigation Bar (lg:hidden) */}
      <nav
        id="mobile-bottom-nav"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-1 py-1.5 pb-safe flex items-center justify-around shadow-lg"
      >
        {[
          { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
          { id: 'students', label: 'الطلاب', icon: Users, badge: students.length },
          { id: 'exams', label: 'الامتحانات', icon: FileSpreadsheet, badge: exams.length },
          { id: 'scoring', label: 'الدرجات', icon: CheckSquare },
          { id: 'reports', label: 'التقارير', icon: BarChart3 },
          { id: 'settings', label: 'الإعدادات', icon: SettingsIcon },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigateTo(item.id as ViewMode)}
              className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl text-[10px] font-bold transition-all relative cursor-pointer min-w-[48px] ${
                isActive
                  ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                {item.badge !== undefined && item.badge !== null && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 px-1 text-[9px] font-black bg-amber-500 text-slate-950 rounded-full min-w-[14px] h-[14px] flex items-center justify-center">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="mt-0.5 tracking-tight truncate max-w-[50px]">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}