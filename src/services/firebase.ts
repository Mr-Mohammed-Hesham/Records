import { initializeApp, getApps, getApp } from 'firebase/app';

import {
  getFirestore,
  initializeFirestore,
  type Firestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  onSnapshot,
} from 'firebase/firestore';

import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  type User,
  type Auth,
} from 'firebase/auth';

import {
  Student,
  Exam,
  ExamResult,
  TeacherSettings,
  ExamType,
} from '../types';

import { DEFAULT_GRADING_SCALE } from '../utils/grading';

/* =========================================================
   FIREBASE CONFIG
   Project: records-2eedd (Existing Firebase Project)
   Firestore: (default) Database
   Using ONLY real VITE_FIREBASE_* environment variables
   ========================================================= */

/* =========================================================

   FIREBASE CONFIG

   Project: records-2eedd

   Firestore: (default)

   ========================================================= */



export const TARGET_FIREBASE_PROJECT_ID = 'records-2eedd';

export const FIRESTORE_DATABASE_ID = '(default)';



const firebaseConfig = {

  apiKey: 'AIzaSyC2LHHPG7hn27LewZXmpU_PZAbysuL1TUc'.trim(),

  authDomain: 'records-2eedd.firebaseapp.com',

  projectId: 'records-2eedd',

  storageBucket: 'records-2eedd.firebasestorage.app',

  messagingSenderId: '909170236632',

  appId: '1:909170236632:web:194a138a4e137d20978bad',

  measurementId: 'G-3W94L8Y977',

};

/* =========================================================
   ADMIN ACCESS
   ========================================================= */

export const ALLOWED_ADMIN_EMAILS = [
  'mohammedhesham872@gmail.com',
  'mr.mohamed.hesham93@gmail.com',
  'mohammedhesham872@gmai.com',
];

export function isAllowedEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return ALLOWED_ADMIN_EMAILS.some(
    (allowed) => allowed.toLowerCase() === normalized
  );
}

/* =========================================================
   FIREBASE APP
   ========================================================= */

export const app =
  getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig);

/* =========================================================
   FIREBASE AUTH
   ========================================================= */

export const auth = getAuth(app);

/* =========================================================
   FIRESTORE
   ========================================================= */

function initFirestore(): Firestore {
  try {
    return initializeFirestore(
      app,
      { experimentalForceLongPolling: true },
      FIRESTORE_DATABASE_ID
    );
  } catch {
    return getFirestore(app, FIRESTORE_DATABASE_ID);
  }
}

export const db = initFirestore();

/* =========================================================
   GOOGLE AUTH PROVIDER
   ========================================================= */

const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: 'select_account',
});

/* =========================================================
   UAE GRADES
   ========================================================= */

export const UAE_GRADES = [
  'الصف الأول (Grade 1)',
  'الصف الثاني (Grade 2)',
  'الصف الثالث (Grade 3)',
  'الصف الرابع (Grade 4)',
  'الصف الخامس (Grade 5)',
  'الصف السادس (Grade 6)',
  'الصف السابع (Grade 7)',
  'الصف الثامن (Grade 8)',
  'الصف التاسع (Grade 9)',
  'الصف العاشر (Grade 10)',
  'الصف الحادي عشر (Grade 11)',
  'الصف الثاني عشر (Grade 12)',
  'أخرى',
];

/* =========================================================
   EXAM TYPES
   ========================================================= */

export const DEFAULT_EXAM_TYPES: ExamType[] = [
  'Quiz',
  'Test',
  'Midterm',
  'Final Exam',
  'Homework',
  'Assignment',
  'Practice Exam',
];

/* =========================================================
   DEFAULT SETTINGS
   ========================================================= */

export const DEFAULT_SETTINGS: TeacherSettings = {
  teacherName: 'Mr. Mohamed Hesham',
  appTitle: 'Mr. Mohamed Hesham Records',
  defaultSubject: 'Mathematics',

  grades: UAE_GRADES,

  groups: [],

  subjects: ['Mathematics'],

  examTypes: DEFAULT_EXAM_TYPES,

  passPercentage: 50,

  gradingScale: DEFAULT_GRADING_SCALE,

  customLogoUrl: '',
};

/* =========================================================
   AUTH
   ========================================================= */

/**
 * تسجيل الدخول مسموح فقط للحسابات المعتمدة.
 */
export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(
    auth,
    googleProvider
  );

  const user = result.user;

  const email =
    user.email?.trim().toLowerCase();

  if (!isAllowedEmail(email)) {
    await signOut(auth);

    throw new Error(
      'هذا الحساب غير مصرح له بالدخول إلى النظام.'
    );
  }

  return user;
}

/**
 * تسجيل الخروج.
 */
export async function signOutTeacher(): Promise<void> {
  await signOut(auth);
}

/**
 * مراقبة حالة تسجيل الدخول.
 */
export function subscribeToAuth(
  callback: (user: User | null) => void
): () => void {
  return onAuthStateChanged(
    auth,
    (user) => {
      if (!user) {
        callback(null);
        return;
      }

      const email =
        user.email?.trim().toLowerCase();

      if (!isAllowedEmail(email)) {
        signOut(auth).catch(() => {});
        callback(null);
        return;
      }

      callback(user);
    }
  );
}

/**
 * الحصول على المستخدم الحالي إذا كان مصرحًا له.
 */
export function getCurrentUser(): User | null {
  const user = auth.currentUser;

  if (!user) {
    return null;
  }

  const email =
    user.email?.trim().toLowerCase();

  if (!isAllowedEmail(email)) {
    return null;
  }

  return user;
}

/**
 * التأكد من وجود مستخدم مصرح له.
 */
export async function ensureAuthenticated(): Promise<User> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error(
      'يجب تسجيل الدخول أولاً.'
    );
  }

  const email =
    user.email?.trim().toLowerCase();

  if (!isAllowedEmail(email)) {
    await signOut(auth);

    throw new Error(
      'هذا الحساب غير مصرح له بالدخول إلى النظام.'
    );
  }

  return user;
}

/* =========================================================
   STUDENTS
   ========================================================= */

export async function getStudents(): Promise<Student[]> {
  const snapshot = await getDocs(
    collection(db, 'students')
  );

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  })) as Student[];
}

export async function getStudent(
  studentId: string
): Promise<Student | null> {
  const snapshot = await getDoc(
    doc(db, 'students', studentId)
  );

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as Student;
}

export async function addStudent(
  student: Omit<Student, 'id'>
): Promise<string> {
  const reference = await addDoc(
    collection(db, 'students'),
    student
  );

  return reference.id;
}

export async function createStudent(
  student: Omit<Student, 'id'>
): Promise<string> {
  return addStudent(student);
}

export async function updateStudent(
  studentId: string,
  data: Partial<Student>
): Promise<void> {
  await updateDoc(
    doc(db, 'students', studentId),
    data
  );
}

export async function deleteStudent(
  studentId: string
): Promise<void> {
  await deleteDoc(
    doc(db, 'students', studentId)
  );
}

/* =========================================================
   STUDENT SEARCH
   ========================================================= */

export async function searchStudents(
  searchTerm: string
): Promise<Student[]> {
  const students = await getStudents();

  const term = searchTerm
    .trim()
    .toLowerCase();

  if (!term) {
    return students;
  }

  return students.filter((student) => {
    const name = String(
      student.name || ''
    ).toLowerCase();

    const phone = String(
      student.phone || ''
    ).toLowerCase();

    const code = String(
      student.studentId || ''
    ).toLowerCase();

    return (
      name.includes(term) ||
      phone.includes(term) ||
      code.includes(term)
    );
  });
}

/* =========================================================
   STUDENTS REALTIME
   ========================================================= */

export function subscribeToStudents(
  callback: (students: Student[]) => void
): () => void {
  return onSnapshot(
    collection(db, 'students'),
    (snapshot) => {
      const students = snapshot.docs.map(
        (item) => ({
          id: item.id,
          ...item.data(),
        })
      ) as Student[];

      callback(students);
    }
  );
}

/* =========================================================
   EXAMS
   ========================================================= */

export async function getExams(): Promise<Exam[]> {
  const snapshot = await getDocs(
    collection(db, 'exams')
  );

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  })) as Exam[];
}

export async function getExam(
  examId: string
): Promise<Exam | null> {
  const snapshot = await getDoc(
    doc(db, 'exams', examId)
  );

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as Exam;
}

export async function addExam(
  exam: Omit<Exam, 'id'>
): Promise<string> {
  const reference = await addDoc(
    collection(db, 'exams'),
    exam
  );

  return reference.id;
}

export async function createExam(
  exam: Omit<Exam, 'id'>
): Promise<string> {
  return addExam(exam);
}

export async function updateExam(
  examId: string,
  data: Partial<Exam>
): Promise<void> {
  await updateDoc(
    doc(db, 'exams', examId),
    data
  );
}

export async function deleteExam(
  examId: string
): Promise<void> {
  await deleteDoc(
    doc(db, 'exams', examId)
  );
}

/* =========================================================
   EXAMS REALTIME
   ========================================================= */

export function subscribeToExams(
  callback: (exams: Exam[]) => void
): () => void {
  return onSnapshot(
    collection(db, 'exams'),
    (snapshot) => {
      const exams = snapshot.docs.map(
        (item) => ({
          id: item.id,
          ...item.data(),
        })
      ) as Exam[];

      callback(exams);
    }
  );
}

/* =========================================================
   RESULTS
   ========================================================= */

export async function getResults(): Promise<ExamResult[]> {
  const snapshot = await getDocs(
    collection(db, 'results')
  );

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  })) as ExamResult[];
}

export async function getResult(
  resultId: string
): Promise<ExamResult | null> {
  const snapshot = await getDoc(
    doc(db, 'results', resultId)
  );

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as ExamResult;
}

export async function addResult(
  result: Omit<ExamResult, 'id'>
): Promise<string> {
  const reference = await addDoc(
    collection(db, 'results'),
    result
  );

  return reference.id;
}

export async function createResult(
  result: Omit<ExamResult, 'id'>
): Promise<string> {
  return addResult(result);
}

export async function updateResult(
  resultId: string,
  data: Partial<ExamResult>
): Promise<void> {
  await updateDoc(
    doc(db, 'results', resultId),
    data
  );
}

export async function updateSingleResult(
  resultId: string,
  data: Partial<ExamResult>
): Promise<void> {
  await updateResult(resultId, data);
}

export async function deleteResult(
  resultId: string
): Promise<void> {
  await deleteDoc(
    doc(db, 'results', resultId)
  );
}

/* =========================================================
   SAVE BATCH RESULTS
   ========================================================= */

export async function saveBatchResults(
  results: ExamResult[]
): Promise<void> {
  const batch = writeBatch(db);

  results.forEach((result) => {
    const { id, ...data } = result;

    if (id) {
      const resultRef = doc(
        db,
        'results',
        id
      );

      batch.set(
        resultRef,
        data,
        { merge: true }
      );
    } else {
      const resultRef = doc(
        collection(db, 'results')
      );

      batch.set(
        resultRef,
        data
      );
    }
  });

  await batch.commit();
}

/* =========================================================
   RESULTS BY STUDENT
   ========================================================= */

export async function getStudentResults(
  studentId: string
): Promise<ExamResult[]> {
  const resultsQuery = query(
    collection(db, 'results'),
    where('studentId', '==', studentId)
  );

  const snapshot = await getDocs(
    resultsQuery
  );

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  })) as ExamResult[];
}

/* =========================================================
   RESULTS BY EXAM
   ========================================================= */

export async function getExamResults(
  examId: string
): Promise<ExamResult[]> {
  const resultsQuery = query(
    collection(db, 'results'),
    where('examId', '==', examId)
  );

  const snapshot = await getDocs(
    resultsQuery
  );

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  })) as ExamResult[];
}

/* =========================================================
   RESULTS REALTIME
   ========================================================= */

export function subscribeToResults(
  callback: (results: ExamResult[]) => void
): () => void {
  return onSnapshot(
    collection(db, 'results'),
    (snapshot) => {
      const results = snapshot.docs.map(
        (item) => ({
          id: item.id,
          ...item.data(),
        })
      ) as ExamResult[];

      callback(results);
    }
  );
}

/* =========================================================
   STUDENT RESULTS REALTIME
   ========================================================= */

export function subscribeToStudentResults(
  studentId: string,
  callback: (results: ExamResult[]) => void
): () => void {
  const resultsQuery = query(
    collection(db, 'results'),
    where('studentId', '==', studentId)
  );

  return onSnapshot(
    resultsQuery,
    (snapshot) => {
      const results = snapshot.docs.map(
        (item) => ({
          id: item.id,
          ...item.data(),
        })
      ) as ExamResult[];

      callback(results);
    }
  );
}

/* =========================================================
   TEACHER SETTINGS
   ========================================================= */

const SETTINGS_ID = 'teacher';

export async function getTeacherSettings(): Promise<TeacherSettings> {
  const snapshot = await getDoc(
    doc(db, 'settings', SETTINGS_ID)
  );

  if (!snapshot.exists()) {
    return DEFAULT_SETTINGS;
  }

  return {
    ...DEFAULT_SETTINGS,
    ...snapshot.data(),
  } as TeacherSettings;
}

export async function saveTeacherSettings(
  settings: Partial<TeacherSettings>
): Promise<void> {
  await setDoc(
    doc(db, 'settings', SETTINGS_ID),
    settings,
    {
      merge: true,
    }
  );
}

/* =========================================================
   SETTINGS REALTIME
   ========================================================= */

export function subscribeToTeacherSettings(
  callback: (settings: TeacherSettings) => void
): () => void {
  return onSnapshot(
    doc(db, 'settings', SETTINGS_ID),
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(DEFAULT_SETTINGS);
        return;
      }

      const settings: TeacherSettings = {
        ...DEFAULT_SETTINGS,
        ...snapshot.data(),
      };

      callback(settings);
    }
  );
}

/* =========================================================
   ALL DATA REALTIME
   ========================================================= */

export interface RealtimeData {
  students: Student[];
  exams: Exam[];
  results: ExamResult[];
  settings: TeacherSettings;
}

export function subscribeToRealtimeData(
  callback: (data: RealtimeData) => void
): () => void {
  let students: Student[] = [];
  let exams: Exam[] = [];
  let results: ExamResult[] = [];
  let settings: TeacherSettings = DEFAULT_SETTINGS;

  let studentsReady = false;
  let examsReady = false;
  let resultsReady = false;
  let settingsReady = false;

  const emit = () => {
    callback({
      students,
      exams,
      results,
      settings,
    });
  };

  const unsubscribeStudents = onSnapshot(
    collection(db, 'students'),
    (snapshot) => {
      students = snapshot.docs.map(
        (item) => ({
          id: item.id,
          ...item.data(),
        })
      ) as Student[];

      studentsReady = true;
      emit();
    },
    (err) => {
      console.warn('Realtime students listener:', err.message);
      studentsReady = true;
      emit();
    }
  );

  const unsubscribeExams = onSnapshot(
    collection(db, 'exams'),
    (snapshot) => {
      exams = snapshot.docs.map(
        (item) => ({
          id: item.id,
          ...item.data(),
        })
      ) as Exam[];

      examsReady = true;
      emit();
    },
    (err) => {
      console.warn('Realtime exams listener:', err.message);
      examsReady = true;
      emit();
    }
  );

  const unsubscribeResults = onSnapshot(
    collection(db, 'results'),
    (snapshot) => {
      results = snapshot.docs.map(
        (item) => ({
          id: item.id,
          ...item.data(),
        })
      ) as ExamResult[];

      resultsReady = true;
      emit();
    },
    (err) => {
      console.warn('Realtime results listener:', err.message);
      resultsReady = true;
      emit();
    }
  );

  const unsubscribeSettings = onSnapshot(
    doc(db, 'settings', SETTINGS_ID),
    (snapshot) => {
      if (!snapshot.exists()) {
        settings = DEFAULT_SETTINGS;
      } else {
        settings = {
          ...DEFAULT_SETTINGS,
          ...snapshot.data(),
        } as TeacherSettings;
      }

      settingsReady = true;
      emit();
    },
    (err) => {
      console.warn('Realtime settings listener:', err.message);
      settingsReady = true;
      emit();
    }
  );

  return () => {
    unsubscribeStudents();
    unsubscribeExams();
    unsubscribeResults();
    unsubscribeSettings();
  };
}

/* =========================================================
   CLEAR ALL DATA
   ========================================================= */

export async function clearAllData(): Promise<void> {
  const batch = writeBatch(db);

  const collectionNames = [
    'students',
    'exams',
    'results',
    'settings',
  ];

  for (const collectionName of collectionNames) {
    const snapshot = await getDocs(
      collection(db, collectionName)
    );

    snapshot.docs.forEach((item) => {
      batch.delete(item.ref);
    });
  }

  await batch.commit();
}

/* =========================================================
   SAMPLE DATA
   ========================================================= */

/**
 * لا يتم إنشاء أي بيانات وهمية.
 * التطبيق يبدأ فارغًا بالكامل.
 */
export async function seedSampleData(): Promise<void> {
  return;
}