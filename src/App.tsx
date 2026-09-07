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
} from 'lucide-react';

import {
  Student,
  Exam,
  ExamResult,
  TeacherSettings,
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
      onConfirm: () => void;
    }>({
      isOpen: false,
      title: '',
      message: '',
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
     QUICK SEARCH SHORTCUT
     ======================================================= */

  useEffect(() => {
    const handleKeyDown = (
      event: KeyboardEvent
    ) => {
      if (
        (event.ctrlKey ||
          event.metaKey) &&
        event.key.toLowerCase() ===
          'k'
      ) {
        event.preventDefault();

        setIsSearchModalOpen(
          (prev) => !prev
        );
      }
    };

    window.addEventListener(
      'keydown',
      handleKeyDown
    );

    return () =>
      window.removeEventListener(
        'keydown',
        handleKeyDown
      );
  }, []);

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

      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

          {/* Brand */}
          <div className="flex items-center gap-3">

            <button
              onClick={() =>
                setMobileMenuOpen(
                  (prev) => !prev
                )
              }
              className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg lg:hidden cursor-pointer"
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
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="relative w-10 h-10 rounded-xl p-0.5 bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600 shadow-md shadow-amber-500/20 shrink-0 overflow-hidden">
                <img
                  src={`${import.meta.env.BASE_URL}teacher-logo.jpg`}
                  alt="Mr Mohammed Hesham"
                  className="w-full h-full object-cover rounded-[10px]"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div>
                <div className="text-amber-500 font-extrabold text-base leading-tight font-sans tracking-wide">
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
          <div className="flex items-center gap-2 sm:gap-3">

            {/* Install Button (Matching screenshot header pill) */}
            <button
              id="btn-install-pwa-header"
              onClick={handleTriggerInstall}
              className="px-3 py-2 border border-amber-500/30 dark:border-amber-500/40 rounded-xl text-xs sm:text-sm font-bold hover:bg-amber-500/15 bg-amber-500/10 text-amber-600 dark:text-amber-400 inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
              title="تثبيت التطبيق مباشرة على الهاتف أو سطح المكتب"
            >
              <Download className="w-4 h-4 text-amber-500 animate-pulse" />
              <span>تثبيت</span>
            </button>

            {/* Theme */}
            <button
              onClick={
                toggleTheme
              }
              className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 shadow-xs transition cursor-pointer"
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

            {/* Search */}
            <div
              onClick={() =>
                setIsSearchModalOpen(
                  true
                )
              }
              className="flex items-center bg-slate-100 dark:bg-slate-800/80 px-3.5 py-1.5 sm:py-2 rounded-full w-44 sm:w-64 md:w-72 border border-transparent hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer transition-colors"
            >
              <Search className="w-4 h-4 text-slate-400 shrink-0" />

              <span className="text-xs text-slate-400 dark:text-slate-400 mr-2 flex-1 truncate">
                بحث بالاسم أو ID...
              </span>

              <kbd className="hidden md:inline font-mono text-[10px] bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600 text-slate-400">
                ⌘K
              </kbd>
            </div>

            {/* Excel */}
            <button
              onClick={
                handleExportAllExcel
              }
              className="px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs sm:text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 bg-white dark:bg-slate-900 shadow-xs text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              title="تصدير جميع البيانات إلى Excel"
            >
              <FileDown className="w-4 h-4 text-amber-500" />

              <span className="hidden sm:inline">
                Export Excel
              </span>
            </button>

            {/* User */}
            {currentUser && (
              <div className="flex items-center gap-2 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/50 py-1.5 px-2.5 rounded-lg text-xs">

                {currentUser.photoURL ? (
                  <img
                    src={
                      currentUser.photoURL
                    }
                    alt=""
                    className="w-5 h-5 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-[10px] font-bold">
                    {currentUser
                      .displayName?.[0] ||
                      currentUser
                        .email?.[0] ||
                      'M'}
                  </div>
                )}

                <span
                  className="font-medium text-amber-950 dark:text-amber-200 hidden sm:inline truncate max-w-[120px]"
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
                    handleGoogleLogout
                  }
                  className="text-slate-400 hover:text-red-500 transition-colors p-0.5 cursor-pointer"
                  title="تسجيل الخروج"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Add Student */}
            <button
              onClick={
                handleOpenAddStudent
              }
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold rounded-lg text-xs sm:text-sm shadow-md shadow-amber-500/20 inline-flex items-center gap-1.5 transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />

              <span>
                + Add Student
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* =================================================
          MAIN
          ================================================= */}

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex gap-6">

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
                    onClick={
                      handleGoogleLogout
                    }
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg text-xs font-bold"
                  >
                    خروج
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 min-w-0">

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
        onClose={() =>
          setConfirmModalConfig(
            (prev) => ({
              ...prev,
              isOpen: false,
            })
          )
        }
      />

      {/* Floating Quick Install Button (Matching user screenshot bottom-left) */}
      {!isAppInstalled && (
        <button
          id="btn-floating-install-pwa"
          onClick={handleTriggerInstall}
          aria-label="تثبيت التطبيق مباشرة"
          title="تثبيت التطبيق مباشرة على الهاتف أو سطح المكتب"
          className="fixed bottom-6 left-6 z-40 w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-xl shadow-teal-500/30 hover:shadow-teal-500/50 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 group cursor-pointer border border-white/20"
        >
          <Download className="w-5 h-5 transition-transform group-hover:translate-y-0.5" />
          <span className="sr-only">تثبيت التطبيق</span>
        </button>
      )}
    </div>
  );
}