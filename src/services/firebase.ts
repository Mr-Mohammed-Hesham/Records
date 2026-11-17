import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';

import {
  getFirestore,
  type Firestore,
  collection,
  doc,
  getDocs,
  getDoc,
  getDocFromServer,
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
  ExamStructure,
  StudentStructureProgress,
  OvertimeEntry,
  OvertimeMonthlyConfig,
} from '../types';

import { DEFAULT_GRADING_SCALE } from '../utils/grading';

/* =========================================================
   FIREBASE CONFIG (Project: records-2eedd)
   ========================================================= */

export const TARGET_FIREBASE_PROJECT_ID = 'records-2eedd';
export const FIRESTORE_DATABASE_ID = '(default)';

export const firebaseConfig = {
  apiKey: "AIzaSyC2LHHPG7hn27LewZXmpU_PZAbysuL1TUc",
  authDomain: "records-2eedd.firebaseapp.com",
  projectId: "records-2eedd",
  storageBucket: "records-2eedd.firebasestorage.app",
  messagingSenderId: "909170236632",
  appId: "1:909170236632:web:194a138a4e137d20978bad",
  measurementId: "G-3W94L8Y977"
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
   FIREBASE APP & ANALYTICS
   ========================================================= */

export const app =
  getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig);

let analyticsInstance: any = null;
if (typeof window !== 'undefined') {
  isSupported()
    .then((supported) => {
      if (supported) {
        analyticsInstance = getAnalytics(app);
      }
    })
    .catch(() => {});
}
export const analytics = analyticsInstance;

/* =========================================================
   FIREBASE AUTH
   ========================================================= */

export const auth = getAuth(app);

/* =========================================================
   FIRESTORE
   ========================================================= */

export const db = getFirestore(app, FIRESTORE_DATABASE_ID);

// Test Firestore connection on boot
if (typeof window !== 'undefined') {
  getDocFromServer(doc(db, 'test', 'connection')).catch((error) => {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase connection check: client offline or syncing.');
    }
  });
}

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
   ACADEMIC YEARS, TERMS & TRACKS
   ========================================================= */
export const ACADEMIC_YEARS = [
  '2025 - 2026',
  '2026 - 2027',
  '2027 - 2028',
  '2028 - 2029',
  '2029 - 2030',
  '2024 - 2025',
  '2023 - 2024',
  '2022 - 2023',
];

export const ACADEMIC_TERMS = [
  'الفصل الأول',
  'الفصل الثاني',
  'الفصل الثالث',
];

export const ACADEMIC_TRACKS = [
  'عام',
  'متقدم',
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

  // Also authenticate the Hesham-Exam secondary Firebase instance seamlessly with the same Google credential
  try {
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential) {
      const { auth: examAuth } = await import('../hesham-exam/config/firebase');
      const { signInWithCredential } = await import('firebase/auth');
      await signInWithCredential(examAuth, credential);
    }
  } catch (err) {
    console.info('Secondary exam Firebase credential sync notice:', err);
  }

  return user;
}

/* =========================================================
   LOCAL SESSION PERSISTENCE (FALLBACK & SEAMLESS RECOVERY)
   ========================================================= */

const TEACHER_SESSION_STORAGE_KEY = 'mmh_verified_teacher_session';

export interface VerifiedTeacherUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
  isVerifiedTeacher: boolean;
}

export function getStoredTeacherSession(): VerifiedTeacherUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(TEACHER_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data && data.email && isAllowedEmail(data.email)) {
      return data;
    }
  } catch (err) {
    console.warn('Error reading stored teacher session:', err);
  }
  return null;
}

export function saveTeacherSession(user: { email?: string | null; displayName?: string | null; uid?: string; photoURL?: string | null }): VerifiedTeacherUser | null {
  const cleanEmail = (user.email || '').trim().toLowerCase();
  if (!cleanEmail || !isAllowedEmail(cleanEmail)) {
    return null;
  }

  const verifiedUser: VerifiedTeacherUser = {
    uid: user.uid || 'teacher-admin-uid',
    email: cleanEmail,
    displayName: user.displayName || 'Mr. Mohamed Hesham',
    photoURL: user.photoURL || null,
    isVerifiedTeacher: true,
  };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(TEACHER_SESSION_STORAGE_KEY, JSON.stringify(verifiedUser));
    } catch (err) {
      console.warn('Error saving teacher session:', err);
    }
  }
  return verifiedUser;
}

export function clearTeacherSession(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(TEACHER_SESSION_STORAGE_KEY);
    // Also remove any stale auth items
    sessionStorage.removeItem(TEACHER_SESSION_STORAGE_KEY);
  } catch {}
}

/**
 * تسجيل الخروج.
 */
export async function signOutTeacher(): Promise<void> {
  clearTeacherSession();
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('Firebase signOut error:', err);
  }
  clearTeacherSession();
}

/**
 * مراقبة حالة تسجيل الدخول.
 */
export function subscribeToAuth(
  callback: (user: User | VerifiedTeacherUser | null) => void
): () => void {
  const stored = getStoredTeacherSession();
  if (stored) {
    callback(stored);
  }

  return onAuthStateChanged(
    auth,
    (user) => {
      if (!user) {
        const fallback = getStoredTeacherSession();
        callback(fallback);
        return;
      }

      const email =
        user.email?.trim().toLowerCase();

      if (!isAllowedEmail(email)) {
        signOut(auth).catch(() => {});
        const fallback = getStoredTeacherSession();
        callback(fallback);
        return;
      }

      saveTeacherSession(user);
      callback(user);
    }
  );
}

/**
 * الحصول على المستخدم الحالي إذا كان مصرحًا له.
 */
export function getCurrentUser(): User | VerifiedTeacherUser | null {
  const user = auth.currentUser;

  if (user && isAllowedEmail(user.email)) {
    return user;
  }

  return getStoredTeacherSession();
}

/**
 * التأكد من وجود مستخدم مصرح له.
 */
export async function ensureAuthenticated(): Promise<User | VerifiedTeacherUser> {
  const user = auth.currentUser;

  if (user && isAllowedEmail(user.email)) {
    return user;
  }

  const stored = getStoredTeacherSession();
  if (stored) {
    return stored;
  }

  throw new Error('يجب تسجيل الدخول أولاً.');
}

/* =========================================================
   LOCAL STORAGE & DUAL PERSISTENCE CACHE
   ضمان عدم فقدان أي بيانات وحفظ الاختبارات فوراً محلياً وسحابياً
   ========================================================= */

export const CACHE_KEYS = {
  EXAMS: 'mmh_cached_exams',
  STUDENTS: 'mmh_cached_students',
  RESULTS: 'mmh_cached_results',
  SETTINGS: 'mmh_cached_settings',
  STRUCTURES: 'mmh_cached_structures',
  STRUCTURE_PROGRESS: 'mmh_cached_structure_progress',
  OVERTIME_ENTRIES: 'mmh_cached_overtime_entries',
  OVERTIME_MONTHS: 'mmh_cached_overtime_months',
};

export function getCachedData<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setCachedData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn('LocalStorage caching error:', err);
  }
}

/**
 * تطهير الكائنات الموجهة لقاعدة بيانات Firestore
 * يزيل أي خصائص بقيمة undefined لتجنب أخطاء فايربيز القاتلة
 */
export function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj as Record<string, any>)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

const realtimeSubscribers = new Set<(data: RealtimeData) => void>();

export function notifySubscribers(): void {
  const currentStudents = getCachedData<Student[]>(CACHE_KEYS.STUDENTS, []);
  const currentExams = getCachedData<Exam[]>(CACHE_KEYS.EXAMS, []);
  const currentResults = getCachedData<ExamResult[]>(CACHE_KEYS.RESULTS, []);
  const currentSettings = getCachedData<TeacherSettings>(CACHE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  const currentStructures = getCachedData<ExamStructure[]>(CACHE_KEYS.STRUCTURES, []);
  const currentStructureProgress = getCachedData<StudentStructureProgress[]>(CACHE_KEYS.STRUCTURE_PROGRESS, []);
  const currentOvertimeEntries = getCachedData<OvertimeEntry[]>(CACHE_KEYS.OVERTIME_ENTRIES, []);
  const currentOvertimeMonthlyConfigs = getCachedData<OvertimeMonthlyConfig[]>(CACHE_KEYS.OVERTIME_MONTHS, []);

  const data: RealtimeData = {
    students: currentStudents,
    exams: currentExams,
    results: currentResults,
    settings: currentSettings,
    structures: currentStructures,
    structureProgress: currentStructureProgress,
    overtimeEntries: currentOvertimeEntries,
    overtimeMonthlyConfigs: currentOvertimeMonthlyConfigs,
  };

  realtimeSubscribers.forEach((cb) => {
    try {
      cb(data);
    } catch (err) {
      console.warn('Realtime subscriber notification error:', err);
    }
  });
}

/* =========================================================
   STUDENTS
   ========================================================= */

export async function getStudents(): Promise<Student[]> {
  try {
    const fetchPromise = getDocs(collection(db, 'students'));
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 12000)
    );
    const snapshot = await Promise.race([fetchPromise, timeoutPromise]);

    if (snapshot) {
      const items = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      })) as Student[];

      setCachedData(CACHE_KEYS.STUDENTS, items);
      return items;
    }
  } catch (err) {
    console.warn('getStudents from Firestore failed, fallback to cache:', err);
  }
  return getCachedData<Student[]>(CACHE_KEYS.STUDENTS, []);
}

export async function getStudent(
  studentId: string
): Promise<Student | null> {
  try {
    const snapshot = await getDoc(
      doc(db, 'students', studentId)
    );

    if (snapshot.exists()) {
      return {
        id: snapshot.id,
        ...snapshot.data(),
      } as Student;
    }
  } catch (err) {
    console.warn('getStudent Firestore error:', err);
  }

  const cached = getCachedData<Student[]>(CACHE_KEYS.STUDENTS, []);
  return cached.find(s => s.id === studentId) || null;
}

export async function addStudent(
  student: Omit<Student, 'id'>
): Promise<string> {
  const docRef = doc(collection(db, 'students'));
  const id = docRef.id;
  const newStudent: Student = { id, ...student };

  // حفظ فوري في التخزين المحلي لضمان عدم ضياع أي بيانات
  const current = getCachedData<Student[]>(CACHE_KEYS.STUDENTS, []);
  setCachedData(CACHE_KEYS.STUDENTS, [newStudent, ...current.filter(s => s.id !== id)]);
  notifySubscribers();

  // مزامنة مع Firestore مع تطهير البيانات من أي undefined
  try {
    const cleanData = sanitizeForFirestore(student);
    await setDoc(docRef, cleanData);
  } catch (err) {
    console.error('Firestore addStudent error (preserved in local storage):', err);
  }

  return id;
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
  // تحديث فوري محلي
  const current = getCachedData<Student[]>(CACHE_KEYS.STUDENTS, []);
  setCachedData(
    CACHE_KEYS.STUDENTS,
    current.map(s => s.id === studentId ? { ...s, ...data } : s)
  );
  notifySubscribers();

  // تحديث سحابي
  try {
    const cleanData = sanitizeForFirestore(data);
    await updateDoc(
      doc(db, 'students', studentId),
      cleanData
    );
  } catch (err) {
    console.error('Firestore updateStudent error (updated locally):', err);
  }
}

export async function deleteStudent(
  studentId: string
): Promise<void> {
  // حذف فوري محلي
  const current = getCachedData<Student[]>(CACHE_KEYS.STUDENTS, []);
  setCachedData(
    CACHE_KEYS.STUDENTS,
    current.filter(s => s.id !== studentId)
  );
  notifySubscribers();

  // حذف سحابي
  try {
    await deleteDoc(
      doc(db, 'students', studentId)
    );
  } catch (err) {
    console.error('Firestore deleteStudent error (deleted locally):', err);
  }
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
  try {
    const fetchPromise = getDocs(collection(db, 'exams'));
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 12000)
    );
    const snapshot = await Promise.race([fetchPromise, timeoutPromise]);

    if (snapshot) {
      const items = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      })) as Exam[];

      setCachedData(CACHE_KEYS.EXAMS, items);
      return items;
    }
  } catch (err) {
    console.warn('getExams from Firestore error, fallback to cache:', err);
  }
  return getCachedData<Exam[]>(CACHE_KEYS.EXAMS, []);
}

export async function getExam(
  examId: string
): Promise<Exam | null> {
  try {
    const snapshot = await getDoc(
      doc(db, 'exams', examId)
    );

    if (snapshot.exists()) {
      return {
        id: snapshot.id,
        ...snapshot.data(),
      } as Exam;
    }
  } catch (err) {
    console.warn('getExam Firestore error:', err);
  }

  const cached = getCachedData<Exam[]>(CACHE_KEYS.EXAMS, []);
  return cached.find(e => e.id === examId) || null;
}

export async function addExam(
  exam: Omit<Exam, 'id'>
): Promise<string> {
  const docRef = doc(collection(db, 'exams'));
  const id = docRef.id;
  const newExam: Exam = { id, ...exam };

  // حفظ فوري في التخزين المحلي فوراً حتى لا يضيع الامتحان أبداً
  const current = getCachedData<Exam[]>(CACHE_KEYS.EXAMS, []);
  setCachedData(CACHE_KEYS.EXAMS, [newExam, ...current.filter(e => e.id !== id)]);
  notifySubscribers();

  // حفظ سحابي في Firestore مع تطهير البيانات من أي undefined
  try {
    const cleanData = sanitizeForFirestore(exam);
    await setDoc(docRef, cleanData);
  } catch (err) {
    console.error('Firestore addExam sync error (saved locally):', err);
  }

  return id;
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
  // تحديث فوري محلي
  const current = getCachedData<Exam[]>(CACHE_KEYS.EXAMS, []);
  setCachedData(
    CACHE_KEYS.EXAMS,
    current.map(e => e.id === examId ? { ...e, ...data } : e)
  );
  notifySubscribers();

  // تحديث سحابي
  try {
    const cleanData = sanitizeForFirestore(data);
    await updateDoc(
      doc(db, 'exams', examId),
      cleanData
    );
  } catch (err) {
    console.error('Firestore updateExam warning (updated locally):', err);
  }
}

export async function deleteExam(
  examId: string
): Promise<void> {
  // حذف فوري محلي
  const current = getCachedData<Exam[]>(CACHE_KEYS.EXAMS, []);
  setCachedData(
    CACHE_KEYS.EXAMS,
    current.filter(e => e.id !== examId)
  );
  notifySubscribers();

  // حذف سحابي
  try {
    await deleteDoc(
      doc(db, 'exams', examId)
    );
  } catch (err) {
    console.error('Firestore deleteExam warning (deleted locally):', err);
  }
}

/* =========================================================
   EXAMS REALTIME
   ========================================================= */

export function subscribeToExams(
  callback: (exams: Exam[]) => void
): () => void {
  // بث البيانات المحفوظة محلياً فوراً
  const cached = getCachedData<Exam[]>(CACHE_KEYS.EXAMS, []);
  if (cached.length > 0) {
    callback(cached);
  }

  return onSnapshot(
    collection(db, 'exams'),
    (snapshot) => {
      const exams = snapshot.docs.map(
        (item) => ({
          id: item.id,
          ...item.data(),
        })
      ) as Exam[];

      setCachedData(CACHE_KEYS.EXAMS, exams);
      callback(exams);
    },
    (err) => {
      console.warn('Realtime exams listener error, keeping cached:', err);
    }
  );
}

/* =========================================================
   RESULTS
   ========================================================= */

export async function getResults(): Promise<ExamResult[]> {
  try {
    const fetchPromise = getDocs(collection(db, 'results'));
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 12000)
    );
    const snapshot = await Promise.race([fetchPromise, timeoutPromise]);

    if (snapshot) {
      const items = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      })) as ExamResult[];

      setCachedData(CACHE_KEYS.RESULTS, items);
      return items;
    }
  } catch (err) {
    console.warn('getResults from Firestore failed, fallback to cache:', err);
  }
  return getCachedData<ExamResult[]>(CACHE_KEYS.RESULTS, []);
}

export async function getResult(
  resultId: string
): Promise<ExamResult | null> {
  try {
    const snapshot = await getDoc(
      doc(db, 'results', resultId)
    );

    if (snapshot.exists()) {
      return {
        id: snapshot.id,
        ...snapshot.data(),
      } as ExamResult;
    }
  } catch (err) {
    console.warn('getResult Firestore error:', err);
  }

  const cached = getCachedData<ExamResult[]>(CACHE_KEYS.RESULTS, []);
  return cached.find(r => r.id === resultId) || null;
}

export async function addResult(
  result: Omit<ExamResult, 'id'>
): Promise<string> {
  const docRef = doc(collection(db, 'results'));
  const id = docRef.id;
  const newResult: ExamResult = { id, ...result };

  const current = getCachedData<ExamResult[]>(CACHE_KEYS.RESULTS, []);
  setCachedData(CACHE_KEYS.RESULTS, [newResult, ...current.filter(r => r.id !== id)]);
  notifySubscribers();

  try {
    const cleanData = sanitizeForFirestore(result);
    await setDoc(docRef, cleanData);
  } catch (err) {
    console.error('Firestore addResult error (saved locally):', err);
  }

  return id;
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
  const current = getCachedData<ExamResult[]>(CACHE_KEYS.RESULTS, []);
  setCachedData(
    CACHE_KEYS.RESULTS,
    current.map(r => r.id === resultId ? { ...r, ...data } : r)
  );
  notifySubscribers();

  try {
    const cleanData = sanitizeForFirestore(data);
    await updateDoc(
      doc(db, 'results', resultId),
      cleanData
    );
  } catch (err) {
    console.error('Firestore updateResult error (updated locally):', err);
  }
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
  const current = getCachedData<ExamResult[]>(CACHE_KEYS.RESULTS, []);
  setCachedData(
    CACHE_KEYS.RESULTS,
    current.filter(r => r.id !== resultId)
  );
  notifySubscribers();

  try {
    await deleteDoc(
      doc(db, 'results', resultId)
    );
  } catch (err) {
    console.error('Firestore deleteResult error (deleted locally):', err);
  }
}

/* =========================================================
   SAVE BATCH RESULTS
   ========================================================= */

export async function saveBatchResults(
  results: ExamResult[]
): Promise<ExamResult[]> {
  // 1. إعطاء معرّف فريد لكل نتيجة جديدة لا تملك معرّفاً
  const preparedResults: ExamResult[] = results.map((result) => {
    if (result.id && result.id.trim() !== '') {
      return result;
    }
    const newDocRef = doc(collection(db, 'results'));
    return { ...result, id: newDocRef.id };
  });

  // 2. تحديث التخزين المحلي فوراً لضمان سرعة الاستجابة وعدم الفقدان
  const currentResults = getCachedData<ExamResult[]>(CACHE_KEYS.RESULTS, []);
  const resultMap = new Map<string, ExamResult>();
  currentResults.forEach(r => resultMap.set(r.id, r));
  preparedResults.forEach(r => resultMap.set(r.id, r));
  setCachedData(CACHE_KEYS.RESULTS, Array.from(resultMap.values()));
  notifySubscribers();

  // 3. الحفظ السحابي في Firestore عبر Batch مع تطهير الحقول من أي undefined
  try {
    const batch = writeBatch(db);

    preparedResults.forEach((result) => {
      const { id, ...data } = result;
      const cleanData = sanitizeForFirestore(data);
      const resultRef = doc(db, 'results', id);
      batch.set(resultRef, cleanData, { merge: true });
    });

    await batch.commit();
  } catch (err) {
    console.error('Firestore batch save error (results cached locally):', err);
  }

  return preparedResults;
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
    },
    (error) => {
      console.warn('Realtime results listener offline/warning:', error.message);
      const cached = getCachedData<ExamResult[]>(CACHE_KEYS.RESULTS, []);
      callback(cached);
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
    },
    (error) => {
      console.warn('Realtime student results listener offline/warning:', error.message);
      const cached = getCachedData<ExamResult[]>(CACHE_KEYS.RESULTS, []);
      callback(cached.filter(r => r.studentId === studentId));
    }
  );
}

/* =========================================================
   TEACHER SETTINGS
   ========================================================= */

const SETTINGS_ID = 'teacher';

export async function getTeacherSettings(): Promise<TeacherSettings> {
  const cached = getCachedData<TeacherSettings>(
    CACHE_KEYS.SETTINGS,
    DEFAULT_SETTINGS
  );

  try {
    const fetchPromise = getDoc(doc(db, 'settings', SETTINGS_ID));
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 10000)
    );
    const snapshot = await Promise.race([fetchPromise, timeoutPromise]);

    if (snapshot && snapshot.exists()) {
      const s = {
        ...DEFAULT_SETTINGS,
        ...snapshot.data(),
      } as TeacherSettings;
      setCachedData(CACHE_KEYS.SETTINGS, s);
      return s;
    }
  } catch (err) {
    console.warn('getTeacherSettings Firestore info:', err);
  }

  return cached;
}

export async function saveTeacherSettings(
  settings: Partial<TeacherSettings>
): Promise<void> {
  const current = getCachedData<TeacherSettings>(CACHE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  const merged = { ...current, ...settings };
  setCachedData(CACHE_KEYS.SETTINGS, merged);
  notifySubscribers();

  try {
    const cleanData = sanitizeForFirestore(settings);
    await setDoc(
      doc(db, 'settings', SETTINGS_ID),
      cleanData,
      {
        merge: true,
      }
    );
  } catch (err) {
    console.error('saveTeacherSettings Firestore error (saved locally):', err);
  }
}

/* =========================================================
   SETTINGS REALTIME
   ========================================================= */

export function subscribeToTeacherSettings(
  callback: (settings: TeacherSettings) => void
): () => void {
  const cached = getCachedData<TeacherSettings>(CACHE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  callback(cached);

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

      setCachedData(CACHE_KEYS.SETTINGS, settings);
      callback(settings);
    },
    (err) => {
      console.warn('Realtime settings error, keeping cached:', err);
    }
  );
}

/* =========================================================
   STRUCTURES (قسم الهياكل وسجلات حل الطلاب)
   ========================================================= */

export async function getStructures(): Promise<ExamStructure[]> {
  try {
    const fetchPromise = getDocs(collection(db, 'structures'));
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 12000)
    );
    const snapshot = await Promise.race([fetchPromise, timeoutPromise]);

    if (snapshot) {
      const items = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      })) as ExamStructure[];

      setCachedData(CACHE_KEYS.STRUCTURES, items);
      return items;
    }
  } catch (err) {
    console.warn('getStructures from Firestore error, fallback to cache:', err);
  }
  return getCachedData<ExamStructure[]>(CACHE_KEYS.STRUCTURES, []);
}

export async function addStructure(
  structure: Omit<ExamStructure, 'id'>
): Promise<string> {
  const docRef = doc(collection(db, 'structures'));
  const id = docRef.id;
  const newStructure: ExamStructure = { id, ...structure };

  const current = getCachedData<ExamStructure[]>(CACHE_KEYS.STRUCTURES, []);
  setCachedData(CACHE_KEYS.STRUCTURES, [newStructure, ...current.filter(s => s.id !== id)]);
  notifySubscribers();

  try {
    const cleanData = sanitizeForFirestore(structure);
    await setDoc(docRef, cleanData, { merge: true });
  } catch (err) {
    console.error('Firestore addStructure error (preserved locally):', err);
  }

  return id;
}

export async function updateStructure(
  structureId: string,
  data: Partial<ExamStructure>
): Promise<void> {
  const current = getCachedData<ExamStructure[]>(CACHE_KEYS.STRUCTURES, []);
  setCachedData(
    CACHE_KEYS.STRUCTURES,
    current.map(s => (s.id === structureId ? { ...s, ...data } : s))
  );
  notifySubscribers();

  try {
    const cleanData = sanitizeForFirestore(data);
    await setDoc(doc(db, 'structures', structureId), cleanData, { merge: true });
  } catch (err) {
    console.error('Firestore updateStructure error (updated locally):', err);
  }
}

export async function deleteStructure(structureId: string): Promise<void> {
  const current = getCachedData<ExamStructure[]>(CACHE_KEYS.STRUCTURES, []);
  setCachedData(
    CACHE_KEYS.STRUCTURES,
    current.filter(s => s.id !== structureId)
  );

  // Also remove associated local progress cache cleanly
  const currentProgress = getCachedData<StudentStructureProgress[]>(CACHE_KEYS.STRUCTURE_PROGRESS, []);
  const linkedProgress = currentProgress.filter(p => p.structureId === structureId);
  setCachedData(
    CACHE_KEYS.STRUCTURE_PROGRESS,
    currentProgress.filter(p => p.structureId !== structureId)
  );
  notifySubscribers();

  try {
    const batch = writeBatch(db);
    linkedProgress.forEach((p) => {
      batch.delete(doc(db, 'structureProgress', p.id));
    });
    batch.delete(doc(db, 'structures', structureId));
    await batch.commit();
  } catch (err) {
    console.error('Firestore deleteStructure error (deleted locally):', err);
  }
}

export async function getStructureProgressList(): Promise<StudentStructureProgress[]> {
  try {
    const fetchPromise = getDocs(collection(db, 'structureProgress'));
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 12000)
    );
    const snapshot = await Promise.race([fetchPromise, timeoutPromise]);

    if (snapshot) {
      const items = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      })) as StudentStructureProgress[];

      setCachedData(CACHE_KEYS.STRUCTURE_PROGRESS, items);
      return items;
    }
  } catch (err) {
    console.warn('getStructureProgressList from Firestore error, fallback to cache:', err);
  }
  return getCachedData<StudentStructureProgress[]>(CACHE_KEYS.STRUCTURE_PROGRESS, []);
}

export async function saveStudentStructureProgress(
  progress: Omit<StudentStructureProgress, 'id'> & { id?: string }
): Promise<StudentStructureProgress> {
  const isImp = Boolean(progress.isImprovement) || (progress.attemptNumber !== undefined && progress.attemptNumber > 1);
  const docId =
    progress.id && progress.id.trim() !== ''
      ? progress.id
      : isImp
      ? `${progress.structureId}__${progress.studentDocId}__attempt_${progress.attemptNumber || 2}_${Date.now()}`
      : `${progress.structureId}__${progress.studentDocId}`;

  const now = new Date().toISOString();
  const fullRecord: StudentStructureProgress = {
    ...progress,
    id: docId,
    attemptNumber: progress.attemptNumber || 1,
    attemptLabel:
      progress.attemptLabel ||
      (isImp ? `تحسين درجة (محاولة ${progress.attemptNumber || 2})` : 'المحاولة الأساسية'),
    isImprovement: isImp,
    createdAt: progress.createdAt || now,
    updatedAt: now,
  };

  const current = getCachedData<StudentStructureProgress[]>(CACHE_KEYS.STRUCTURE_PROGRESS, []);
  const updated = [
    fullRecord,
    ...current.filter((p) => p.id !== docId),
  ];
  setCachedData(CACHE_KEYS.STRUCTURE_PROGRESS, updated);

  // If the student row had been previously removed from this structure, restore it automatically on scoring
  const currentStructures = getCachedData<ExamStructure[]>(CACHE_KEYS.STRUCTURES, []);
  const targetStruct = currentStructures.find((s) => s.id === progress.structureId);
  let nextExcludedIds: string[] | null = null;
  if (targetStruct?.excludedStudentIds?.includes(progress.studentDocId)) {
    nextExcludedIds = targetStruct.excludedStudentIds.filter((id) => id !== progress.studentDocId);
    setCachedData(
      CACHE_KEYS.STRUCTURES,
      currentStructures.map((s) =>
        s.id === progress.structureId ? { ...s, excludedStudentIds: nextExcludedIds!, updatedAt: now } : s
      )
    );
  }
  notifySubscribers();

  try {
    const { id: _ignoreId, ...payload } = fullRecord;
    const cleanData = sanitizeForFirestore(payload);
    await setDoc(doc(db, 'structureProgress', docId), cleanData, { merge: true });
    if (nextExcludedIds !== null) {
      await setDoc(
        doc(db, 'structures', progress.structureId),
        { excludedStudentIds: nextExcludedIds, updatedAt: now },
        { merge: true }
      );
    }
  } catch (err) {
    console.error('Firestore saveStudentStructureProgress error (preserved locally):', err);
  }

  return fullRecord;
}

export async function saveBatchStudentStructureProgress(
  records: Array<Omit<StudentStructureProgress, 'id'> & { id?: string }>
): Promise<StudentStructureProgress[]> {
  if (!records || records.length === 0) return [];

  const now = new Date().toISOString();
  const fullRecords: StudentStructureProgress[] = records.map((progress, idx) => {
    const isImp =
      Boolean(progress.isImprovement) ||
      (progress.attemptNumber !== undefined && progress.attemptNumber > 1);
    const docId =
      progress.id && progress.id.trim() !== ''
        ? progress.id
        : isImp
        ? `${progress.structureId}__${progress.studentDocId}__attempt_${progress.attemptNumber || 2}_${Date.now()}_${idx}`
        : `${progress.structureId}__${progress.studentDocId}`;

    return {
      ...progress,
      id: docId,
      attemptNumber: progress.attemptNumber || 1,
      attemptLabel:
        progress.attemptLabel ||
        (isImp ? `تحسين درجة (محاولة ${progress.attemptNumber || 2})` : 'المحاولة الأساسية'),
      isImprovement: isImp,
      createdAt: progress.createdAt || now,
      updatedAt: now,
    };
  });

  const current = getCachedData<StudentStructureProgress[]>(CACHE_KEYS.STRUCTURE_PROGRESS, []);
  const savedIdSet = new Set(fullRecords.map((r) => r.id));
  const updated = [
    ...fullRecords,
    ...current.filter((p) => !savedIdSet.has(p.id)),
  ];
  setCachedData(CACHE_KEYS.STRUCTURE_PROGRESS, updated);

  // Restore any excluded student rows that were explicitly scored in this batch
  const savedStudentIdsByStructure = new Map<string, Set<string>>();
  fullRecords.forEach((r) => {
    const set = savedStudentIdsByStructure.get(r.structureId) || new Set<string>();
    set.add(r.studentDocId);
    savedStudentIdsByStructure.set(r.structureId, set);
  });

  const currentStructures = getCachedData<ExamStructure[]>(CACHE_KEYS.STRUCTURES, []);
  const structuresToUpdate: Array<{ id: string; excludedStudentIds: string[] }> = [];
  const nextStructures = currentStructures.map((s) => {
    const savedStudents = savedStudentIdsByStructure.get(s.id);
    if (savedStudents && s.excludedStudentIds && s.excludedStudentIds.some((id) => savedStudents.has(id))) {
      const nextExcluded = s.excludedStudentIds.filter((id) => !savedStudents.has(id));
      structuresToUpdate.push({ id: s.id, excludedStudentIds: nextExcluded });
      return { ...s, excludedStudentIds: nextExcluded, updatedAt: now };
    }
    return s;
  });
  if (structuresToUpdate.length > 0) {
    setCachedData(CACHE_KEYS.STRUCTURES, nextStructures);
  }
  notifySubscribers();

  try {
    const chunkSize = 400;
    for (let i = 0; i < fullRecords.length; i += chunkSize) {
      const chunk = fullRecords.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      chunk.forEach((rec) => {
        const { id, ...payload } = rec;
        const cleanData = sanitizeForFirestore(payload);
        batch.set(doc(db, 'structureProgress', id), cleanData, { merge: true });
      });
      await batch.commit();
    }
    for (const item of structuresToUpdate) {
      await setDoc(
        doc(db, 'structures', item.id),
        { excludedStudentIds: item.excludedStudentIds, updatedAt: now },
        { merge: true }
      );
    }
  } catch (err) {
    console.error('Firestore saveBatchStudentStructureProgress error (preserved locally):', err);
  }

  return fullRecords;
}

export async function deleteStudentStructureProgress(progressId: string): Promise<void> {
  const current = getCachedData<StudentStructureProgress[]>(CACHE_KEYS.STRUCTURE_PROGRESS, []);
  setCachedData(
    CACHE_KEYS.STRUCTURE_PROGRESS,
    current.filter(p => p.id !== progressId)
  );
  notifySubscribers();

  try {
    await deleteDoc(doc(db, 'structureProgress', progressId));
  } catch (err) {
    console.error('Firestore deleteStudentStructureProgress error (deleted locally):', err);
  }
}

/**
 * حذف سطر طالب (أو مجموعة طلاب) من هيكل محدد فقط، مع حذف سجلاتهم في هذا الهيكل فقط،
 * ودون المساس بملف الطالب الأساسي أو بياناته ودرجاته الأخرى في المنصة.
 */
export async function deleteStudentsFromStructure(
  structureId: string,
  studentDocIds: string[]
): Promise<void> {
  if (!structureId || !studentDocIds || studentDocIds.length === 0) return;
  const targetSet = new Set(studentDocIds);
  const now = new Date().toISOString();

  // 1. Update structure excludedStudentIds locally
  const currentStructures = getCachedData<ExamStructure[]>(CACHE_KEYS.STRUCTURES, []);
  const targetStruct = currentStructures.find((s) => s.id === structureId);
  const mergedExcluded = Array.from(
    new Set([...(targetStruct?.excludedStudentIds || []), ...studentDocIds])
  );
  setCachedData(
    CACHE_KEYS.STRUCTURES,
    currentStructures.map((s) =>
      s.id === structureId
        ? { ...s, excludedStudentIds: mergedExcluded, updatedAt: now }
        : s
    )
  );

  // 2. Remove any structureProgress rows for those students inside THIS structure only
  const currentProgress = getCachedData<StudentStructureProgress[]>(CACHE_KEYS.STRUCTURE_PROGRESS, []);
  const progressToDelete = currentProgress.filter(
    (p) => p.structureId === structureId && targetSet.has(p.studentDocId)
  );
  setCachedData(
    CACHE_KEYS.STRUCTURE_PROGRESS,
    currentProgress.filter(
      (p) => !(p.structureId === structureId && targetSet.has(p.studentDocId))
    )
  );
  notifySubscribers();

  // 3. Persist atomically to Firestore
  try {
    const batch = writeBatch(db);
    batch.set(
      doc(db, 'structures', structureId),
      { excludedStudentIds: mergedExcluded, updatedAt: now },
      { merge: true }
    );
    progressToDelete.forEach((p) => {
      if (p.id) {
        batch.delete(doc(db, 'structureProgress', p.id));
      }
    });
    await batch.commit();
  } catch (err) {
    console.error('Firestore deleteStudentsFromStructure error (preserved locally):', err);
  }
}

/**
 * استعادة سطر طالب (أو جميع السطور المحذوفة) إلى جدول الهيكل مرة أخرى
 */
export async function restoreStudentsToStructure(
  structureId: string,
  studentDocIds?: string[]
): Promise<void> {
  if (!structureId) return;
  const now = new Date().toISOString();
  const currentStructures = getCachedData<ExamStructure[]>(CACHE_KEYS.STRUCTURES, []);
  const targetStruct = currentStructures.find((s) => s.id === structureId);
  if (!targetStruct) return;

  const currentExcluded = targetStruct.excludedStudentIds || [];
  const nextExcluded =
    studentDocIds && studentDocIds.length > 0
      ? currentExcluded.filter((id) => !studentDocIds.includes(id))
      : [];

  setCachedData(
    CACHE_KEYS.STRUCTURES,
    currentStructures.map((s) =>
      s.id === structureId
        ? { ...s, excludedStudentIds: nextExcluded, updatedAt: now }
        : s
    )
  );
  notifySubscribers();

  try {
    await setDoc(
      doc(db, 'structures', structureId),
      { excludedStudentIds: nextExcluded, updatedAt: now },
      { merge: true }
    );
  } catch (err) {
    console.error('Firestore restoreStudentsToStructure error (updated locally):', err);
  }
}

/* =========================================================
   OVERTIME & FINANCIAL PERSISTENCE (حماية دائمة للبيانات المالية)
   ========================================================= */

export async function saveOvertimeEntry(
  entry: Omit<OvertimeEntry, 'id'> & { id?: string }
): Promise<OvertimeEntry> {
  const docId =
    entry.id && entry.id.trim() !== ''
      ? entry.id
      : doc(collection(db, 'overtimeEntries')).id;
  const now = new Date().toISOString();

  const fullEntry: OvertimeEntry = {
    ...entry,
    id: docId,
    monthKey: entry.monthKey || entry.date.slice(0, 7),
    archived: Boolean(entry.archived),
    createdAt: entry.createdAt || now,
    updatedAt: now,
  };

  const current = getCachedData<OvertimeEntry[]>(CACHE_KEYS.OVERTIME_ENTRIES, []);
  const updated = [fullEntry, ...current.filter((e) => e.id !== docId)];
  setCachedData(CACHE_KEYS.OVERTIME_ENTRIES, updated);
  notifySubscribers();

  try {
    const { id: _ignoreId, ...payload } = fullEntry;
    const cleanData = sanitizeForFirestore(payload);
    await setDoc(doc(db, 'overtimeEntries', docId), cleanData, { merge: true });
  } catch (err) {
    console.error('Firestore saveOvertimeEntry error (preserved locally):', err);
  }

  return fullEntry;
}

export async function archiveOvertimeEntry(
  entryId: string,
  archived: boolean
): Promise<void> {
  const now = new Date().toISOString();
  const current = getCachedData<OvertimeEntry[]>(CACHE_KEYS.OVERTIME_ENTRIES, []);
  const updated = current.map((e) =>
    e.id === entryId
      ? {
          ...e,
          archived,
          archivedAt: archived ? now : undefined,
          updatedAt: now,
        }
      : e
  );
  setCachedData(CACHE_KEYS.OVERTIME_ENTRIES, updated);
  notifySubscribers();

  try {
    await setDoc(
      doc(db, 'overtimeEntries', entryId),
      sanitizeForFirestore({
        archived,
        archivedAt: archived ? now : null,
        updatedAt: now,
      }),
      { merge: true }
    );
  } catch (err) {
    console.error('Firestore archiveOvertimeEntry error (preserved locally):', err);
  }
}

export async function deleteOvertimeEntryPermanently(entryId: string): Promise<void> {
  const current = getCachedData<OvertimeEntry[]>(CACHE_KEYS.OVERTIME_ENTRIES, []);
  setCachedData(
    CACHE_KEYS.OVERTIME_ENTRIES,
    current.filter((e) => e.id !== entryId)
  );
  notifySubscribers();

  try {
    await deleteDoc(doc(db, 'overtimeEntries', entryId));
  } catch (err) {
    console.error('Firestore deleteOvertimeEntryPermanently error (deleted locally):', err);
  }
}

export async function saveOvertimeMonthlyConfig(
  config: OvertimeMonthlyConfig
): Promise<OvertimeMonthlyConfig> {
  const now = new Date().toISOString();
  const docId = config.id || config.monthKey;
  const fullConfig: OvertimeMonthlyConfig = {
    ...config,
    id: docId,
    monthKey: config.monthKey || docId,
    createdAt: config.createdAt || now,
    updatedAt: now,
  };

  const current = getCachedData<OvertimeMonthlyConfig[]>(CACHE_KEYS.OVERTIME_MONTHS, []);
  const updated = [fullConfig, ...current.filter((c) => c.id !== docId && c.monthKey !== fullConfig.monthKey)];
  setCachedData(CACHE_KEYS.OVERTIME_MONTHS, updated);
  notifySubscribers();

  try {
    const { id: _ignoreId, ...payload } = fullConfig;
    const cleanData = sanitizeForFirestore(payload);
    await setDoc(doc(db, 'overtimeMonthlyConfigs', docId), cleanData, { merge: true });
  } catch (err) {
    console.error('Firestore saveOvertimeMonthlyConfig error (preserved locally):', err);
  }

  return fullConfig;
}

export async function importOvertimeBackupMerge(
  entries: OvertimeEntry[],
  configs: OvertimeMonthlyConfig[]
): Promise<{ entriesAdded: number; monthsUpdated: number }> {
  const currentEntries = getCachedData<OvertimeEntry[]>(CACHE_KEYS.OVERTIME_ENTRIES, []);
  const existingEntryMap = new Map(currentEntries.map((e) => [e.id, e]));
  let entriesAdded = 0;

  entries.forEach((entry) => {
    if (entry && entry.id && !existingEntryMap.has(entry.id)) {
      existingEntryMap.set(entry.id, entry);
      entriesAdded++;
    }
  });

  const currentConfigs = getCachedData<OvertimeMonthlyConfig[]>(CACHE_KEYS.OVERTIME_MONTHS, []);
  const existingConfigMap = new Map(currentConfigs.map((c) => [c.monthKey || c.id, c]));
  let monthsUpdated = 0;

  configs.forEach((cfg) => {
    const key = cfg.monthKey || cfg.id;
    if (key && !existingConfigMap.has(key)) {
      existingConfigMap.set(key, { ...cfg, id: key, monthKey: key });
      monthsUpdated++;
    }
  });

  const mergedEntries = Array.from(existingEntryMap.values());
  const mergedConfigs = Array.from(existingConfigMap.values());
  setCachedData(CACHE_KEYS.OVERTIME_ENTRIES, mergedEntries);
  setCachedData(CACHE_KEYS.OVERTIME_MONTHS, mergedConfigs);
  notifySubscribers();

  try {
    const batch = writeBatch(db);
    entries.forEach((entry) => {
      if (entry?.id) {
        const { id, ...payload } = entry;
        batch.set(doc(db, 'overtimeEntries', id), sanitizeForFirestore(payload), { merge: true });
      }
    });
    configs.forEach((cfg) => {
      const key = cfg.monthKey || cfg.id;
      if (key) {
        const { id: _ignore, ...payload } = cfg;
        batch.set(doc(db, 'overtimeMonthlyConfigs', key), sanitizeForFirestore(payload), { merge: true });
      }
    });
    await batch.commit();
  } catch (err) {
    console.error('Firestore importOvertimeBackupMerge error (merged locally):', err);
  }

  return { entriesAdded, monthsUpdated };
}

/* =========================================================
   ALL DATA REALTIME
   ========================================================= */

export interface RealtimeData {
  students: Student[];
  exams: Exam[];
  results: ExamResult[];
  settings: TeacherSettings;
  structures: ExamStructure[];
  structureProgress: StudentStructureProgress[];
  overtimeEntries: OvertimeEntry[];
  overtimeMonthlyConfigs: OvertimeMonthlyConfig[];
}

/**
 * مزامنة مباشرة وشاملة مع قاعدة بيانات Firestore
 * تجلب أحدث السجلات (طلاب، امتحانات، نتائج، هياكل، أوفر تايم، إعدادات) وتحدث الكاش والمشتركين
 */
export async function syncAllDataFromFirestore(): Promise<RealtimeData> {
  try {
    const [
      studentsSnap,
      examsSnap,
      resultsSnap,
      settingsSnap,
      structuresSnap,
      progressSnap,
      overtimeEntriesSnap,
      overtimeMonthsSnap,
    ] = await Promise.allSettled([
      getDocs(collection(db, 'students')),
      getDocs(collection(db, 'exams')),
      getDocs(collection(db, 'results')),
      getDoc(doc(db, 'settings', SETTINGS_ID)),
      getDocs(collection(db, 'structures')),
      getDocs(collection(db, 'structureProgress')),
      getDocs(collection(db, 'overtimeEntries')),
      getDocs(collection(db, 'overtimeMonthlyConfigs')),
    ]);

    let students = getCachedData<Student[]>(CACHE_KEYS.STUDENTS, []);
    if (studentsSnap.status === 'fulfilled') {
      const items = studentsSnap.value.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      })) as Student[];
      // دمج أو تحديث مع الحفاظ على البيانات
      if (items.length > 0 || students.length === 0) {
        students = items;
        setCachedData(CACHE_KEYS.STUDENTS, students);
      }
    }

    let exams = getCachedData<Exam[]>(CACHE_KEYS.EXAMS, []);
    if (examsSnap.status === 'fulfilled') {
      const items = examsSnap.value.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      })) as Exam[];
      if (items.length > 0 || exams.length === 0) {
        exams = items;
        setCachedData(CACHE_KEYS.EXAMS, exams);
      }
    }

    let results = getCachedData<ExamResult[]>(CACHE_KEYS.RESULTS, []);
    if (resultsSnap.status === 'fulfilled') {
      const items = resultsSnap.value.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      })) as ExamResult[];
      if (items.length > 0 || results.length === 0) {
        results = items;
        setCachedData(CACHE_KEYS.RESULTS, results);
      }
    }

    let settings = getCachedData<TeacherSettings>(CACHE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    if (settingsSnap.status === 'fulfilled' && settingsSnap.value.exists()) {
      settings = {
        ...DEFAULT_SETTINGS,
        ...settingsSnap.value.data(),
      } as TeacherSettings;
      setCachedData(CACHE_KEYS.SETTINGS, settings);
    }

    let structures = getCachedData<ExamStructure[]>(CACHE_KEYS.STRUCTURES, []);
    if (structuresSnap.status === 'fulfilled') {
      const items = structuresSnap.value.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      })) as ExamStructure[];
      if (items.length > 0 || structures.length === 0) {
        structures = items;
        setCachedData(CACHE_KEYS.STRUCTURES, structures);
      }
    }

    let structureProgress = getCachedData<StudentStructureProgress[]>(CACHE_KEYS.STRUCTURE_PROGRESS, []);
    if (progressSnap.status === 'fulfilled') {
      const items = progressSnap.value.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      })) as StudentStructureProgress[];
      if (items.length > 0 || structureProgress.length === 0) {
        structureProgress = items;
        setCachedData(CACHE_KEYS.STRUCTURE_PROGRESS, structureProgress);
      }
    }

    let overtimeEntries = getCachedData<OvertimeEntry[]>(CACHE_KEYS.OVERTIME_ENTRIES, []);
    if (overtimeEntriesSnap.status === 'fulfilled') {
      const items = overtimeEntriesSnap.value.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      })) as OvertimeEntry[];
      if (items.length > 0 || overtimeEntries.length === 0) {
        overtimeEntries = items;
        setCachedData(CACHE_KEYS.OVERTIME_ENTRIES, overtimeEntries);
      }
    }

    let overtimeMonthlyConfigs = getCachedData<OvertimeMonthlyConfig[]>(CACHE_KEYS.OVERTIME_MONTHS, []);
    if (overtimeMonthsSnap.status === 'fulfilled') {
      const items = overtimeMonthsSnap.value.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      })) as OvertimeMonthlyConfig[];
      if (items.length > 0 || overtimeMonthlyConfigs.length === 0) {
        overtimeMonthlyConfigs = items;
        setCachedData(CACHE_KEYS.OVERTIME_MONTHS, overtimeMonthlyConfigs);
      }
    }

    notifySubscribers();

    return {
      students,
      exams,
      results,
      settings,
      structures,
      structureProgress,
      overtimeEntries,
      overtimeMonthlyConfigs,
    };
  } catch (err) {
    console.warn('syncAllDataFromFirestore fallback to cache:', err);
    return {
      students: getCachedData<Student[]>(CACHE_KEYS.STUDENTS, []),
      exams: getCachedData<Exam[]>(CACHE_KEYS.EXAMS, []),
      results: getCachedData<ExamResult[]>(CACHE_KEYS.RESULTS, []),
      settings: getCachedData<TeacherSettings>(CACHE_KEYS.SETTINGS, DEFAULT_SETTINGS),
      structures: getCachedData<ExamStructure[]>(CACHE_KEYS.STRUCTURES, []),
      structureProgress: getCachedData<StudentStructureProgress[]>(CACHE_KEYS.STRUCTURE_PROGRESS, []),
      overtimeEntries: getCachedData<OvertimeEntry[]>(CACHE_KEYS.OVERTIME_ENTRIES, []),
      overtimeMonthlyConfigs: getCachedData<OvertimeMonthlyConfig[]>(CACHE_KEYS.OVERTIME_MONTHS, []),
    };
  }
}

export function subscribeToRealtimeData(
  callback: (data: RealtimeData) => void
): () => void {
  // 1. إضافة إلى المشتركين المباشرين للتحديث الفوري
  realtimeSubscribers.add(callback);

  // 2. بث فوري للبيانات المحفوظة محلياً لبدء الواجهة فوراً
  const emitCurrent = () => {
    callback({
      students: getCachedData<Student[]>(CACHE_KEYS.STUDENTS, []),
      exams: getCachedData<Exam[]>(CACHE_KEYS.EXAMS, []),
      results: getCachedData<ExamResult[]>(CACHE_KEYS.RESULTS, []),
      settings: getCachedData<TeacherSettings>(CACHE_KEYS.SETTINGS, DEFAULT_SETTINGS),
      structures: getCachedData<ExamStructure[]>(CACHE_KEYS.STRUCTURES, []),
      structureProgress: getCachedData<StudentStructureProgress[]>(CACHE_KEYS.STRUCTURE_PROGRESS, []),
      overtimeEntries: getCachedData<OvertimeEntry[]>(CACHE_KEYS.OVERTIME_ENTRIES, []),
      overtimeMonthlyConfigs: getCachedData<OvertimeMonthlyConfig[]>(CACHE_KEYS.OVERTIME_MONTHS, []),
    });
  };
  emitCurrent();

  // 3. مزامنة فورية مباشرة في الخلفية لضمان وصول كافة السجلات من السحابة حتى لو تعثر الـ Realtime
  syncAllDataFromFirestore().catch((err) => {
    console.debug('Initial sync from Firestore:', err);
  });

  let isSubscribed = true;
  let activeUnsubscribers: Array<() => void> = [];
  let retryTimers: ReturnType<typeof setTimeout>[] = [];

  const setupRealtimeListeners = () => {
    if (!isSubscribed) return;

    // تنظيف أي مستمعين سابقين قبل إعادة الربط
    activeUnsubscribers.forEach((unsub) => {
      try {
        unsub();
      } catch {}
    });
    activeUnsubscribers = [];

    // مستمع الطلاب Students Listener
    try {
      const unsubStudents = onSnapshot(
        collection(db, 'students'),
        (snapshot) => {
          const firestoreStudents = snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          })) as Student[];
          setCachedData(CACHE_KEYS.STUDENTS, firestoreStudents);
          notifySubscribers();
        },
        (err) => {
          console.warn('Realtime students listener warning:', err.message);
          // في حال حدوث خطأ أو انقطاع، جلب مباشر ثم محاولة إعادة ربط تلقائية
          if (isSubscribed) {
            syncAllDataFromFirestore().catch(() => {});
            const timer = setTimeout(() => {
              if (isSubscribed) setupRealtimeListeners();
            }, 5000);
            retryTimers.push(timer);
          }
        }
      );
      activeUnsubscribers.push(unsubStudents);
    } catch (e) {
      console.warn('Error setting up students listener:', e);
    }

    // مستمع الامتحانات Exams Listener
    try {
      const unsubExams = onSnapshot(
        collection(db, 'exams'),
        (snapshot) => {
          const firestoreExams = snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          })) as Exam[];
          setCachedData(CACHE_KEYS.EXAMS, firestoreExams);
          notifySubscribers();
        },
        (err) => {
          console.warn('Realtime exams listener warning:', err.message);
          if (isSubscribed) {
            syncAllDataFromFirestore().catch(() => {});
            const timer = setTimeout(() => {
              if (isSubscribed) setupRealtimeListeners();
            }, 5000);
            retryTimers.push(timer);
          }
        }
      );
      activeUnsubscribers.push(unsubExams);
    } catch (e) {
      console.warn('Error setting up exams listener:', e);
    }

    // مستمع النتائج Results Listener
    try {
      const unsubResults = onSnapshot(
        collection(db, 'results'),
        (snapshot) => {
          const firestoreResults = snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          })) as ExamResult[];
          setCachedData(CACHE_KEYS.RESULTS, firestoreResults);
          notifySubscribers();
        },
        (err) => {
          console.warn('Realtime results listener warning:', err.message);
          if (isSubscribed) {
            syncAllDataFromFirestore().catch(() => {});
            const timer = setTimeout(() => {
              if (isSubscribed) setupRealtimeListeners();
            }, 5000);
            retryTimers.push(timer);
          }
        }
      );
      activeUnsubscribers.push(unsubResults);
    } catch (e) {
      console.warn('Error setting up results listener:', e);
    }

    // مستمع الإعدادات Settings Listener
    try {
      const unsubSettings = onSnapshot(
        doc(db, 'settings', SETTINGS_ID),
        (snapshot) => {
          if (snapshot.exists()) {
            const freshSettings = {
              ...DEFAULT_SETTINGS,
              ...snapshot.data(),
            } as TeacherSettings;
            setCachedData(CACHE_KEYS.SETTINGS, freshSettings);
            notifySubscribers();
          }
        },
        (err) => {
          console.warn('Realtime settings listener warning:', err.message);
        }
      );
      activeUnsubscribers.push(unsubSettings);
    } catch (e) {
      console.warn('Error setting up settings listener:', e);
    }
    // مستمع الهياكل Structures Listener
    try {
      const unsubStructures = onSnapshot(
        collection(db, 'structures'),
        (snapshot) => {
          const firestoreStructures = snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          })) as ExamStructure[];
          setCachedData(CACHE_KEYS.STRUCTURES, firestoreStructures);
          notifySubscribers();
        },
        (err) => {
          console.warn('Realtime structures listener warning:', err.message);
          if (isSubscribed) {
            syncAllDataFromFirestore().catch(() => {});
            const timer = setTimeout(() => {
              if (isSubscribed) setupRealtimeListeners();
            }, 5000);
            retryTimers.push(timer);
          }
        }
      );
      activeUnsubscribers.push(unsubStructures);
    } catch (e) {
      console.warn('Error setting up structures listener:', e);
    }

    // مستمع تقدم الطلاب بالهياكل StructureProgress Listener
    try {
      const unsubStructureProgress = onSnapshot(
        collection(db, 'structureProgress'),
        (snapshot) => {
          const firestoreProgress = snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          })) as StudentStructureProgress[];
          setCachedData(CACHE_KEYS.STRUCTURE_PROGRESS, firestoreProgress);
          notifySubscribers();
        },
        (err) => {
          console.warn('Realtime structureProgress listener warning:', err.message);
          if (isSubscribed) {
            syncAllDataFromFirestore().catch(() => {});
            const timer = setTimeout(() => {
              if (isSubscribed) setupRealtimeListeners();
            }, 5000);
            retryTimers.push(timer);
          }
        }
      );
      activeUnsubscribers.push(unsubStructureProgress);
    } catch (e) {
      console.warn('Error setting up structureProgress listener:', e);
    }

    // مستمع سجلات الأوفر تايم OvertimeEntries Listener (مع حماية البيانات المحلية)
    try {
      const unsubOvertimeEntries = onSnapshot(
        collection(db, 'overtimeEntries'),
        (snapshot) => {
          const firestoreEntries = snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          })) as OvertimeEntry[];
          const localCached = getCachedData<OvertimeEntry[]>(CACHE_KEYS.OVERTIME_ENTRIES, []);
          if (firestoreEntries.length > 0 || localCached.length === 0) {
            setCachedData(CACHE_KEYS.OVERTIME_ENTRIES, firestoreEntries);
            notifySubscribers();
          }
        },
        (err) => {
          console.warn('Realtime overtimeEntries listener warning:', err.message);
        }
      );
      activeUnsubscribers.push(unsubOvertimeEntries);
    } catch (e) {
      console.warn('Error setting up overtimeEntries listener:', e);
    }

    // مستمع إعدادات الشهور المالية OvertimeMonthlyConfigs Listener
    try {
      const unsubOvertimeMonths = onSnapshot(
        collection(db, 'overtimeMonthlyConfigs'),
        (snapshot) => {
          const firestoreMonths = snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          })) as OvertimeMonthlyConfig[];
          const localCached = getCachedData<OvertimeMonthlyConfig[]>(CACHE_KEYS.OVERTIME_MONTHS, []);
          if (firestoreMonths.length > 0 || localCached.length === 0) {
            setCachedData(CACHE_KEYS.OVERTIME_MONTHS, firestoreMonths);
            notifySubscribers();
          }
        },
        (err) => {
          console.warn('Realtime overtimeMonthlyConfigs listener warning:', err.message);
        }
      );
      activeUnsubscribers.push(unsubOvertimeMonths);
    } catch (e) {
      console.warn('Error setting up overtimeMonthlyConfigs listener:', e);
    }
  };

  setupRealtimeListeners();

  return () => {
    isSubscribed = false;
    realtimeSubscribers.delete(callback);
    retryTimers.forEach((t) => clearTimeout(t));
    activeUnsubscribers.forEach((unsub) => {
      try {
        unsub();
      } catch {}
    });
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
    'structures',
    'structureProgress',
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