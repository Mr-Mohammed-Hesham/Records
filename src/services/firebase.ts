import { initializeApp, getApps, getApp } from 'firebase/app';

import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
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
      {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
        experimentalAutoDetectLongPolling: true,
        ignoreUndefinedProperties: true,
      },
      FIRESTORE_DATABASE_ID
    );
  } catch {
    try {
      return initializeFirestore(
        app,
        {
          ignoreUndefinedProperties: true,
        },
        FIRESTORE_DATABASE_ID
      );
    } catch {
      return getFirestore(app, FIRESTORE_DATABASE_ID);
    }
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

  const data: RealtimeData = {
    students: currentStudents,
    exams: currentExams,
    results: currentResults,
    settings: currentSettings,
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
      setTimeout(() => resolve(null), 3000)
    );
    const snapshot = await Promise.race([fetchPromise, timeoutPromise]);

    if (snapshot) {
      const items = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      })) as Student[];

      if (items.length > 0) {
        setCachedData(CACHE_KEYS.STUDENTS, items);
      }
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
      setTimeout(() => resolve(null), 3000)
    );
    const snapshot = await Promise.race([fetchPromise, timeoutPromise]);

    if (snapshot) {
      const items = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      })) as Exam[];

      if (items.length > 0) {
        setCachedData(CACHE_KEYS.EXAMS, items);
      }
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
      setTimeout(() => resolve(null), 3000)
    );
    const snapshot = await Promise.race([fetchPromise, timeoutPromise]);

    if (snapshot) {
      const items = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      })) as ExamResult[];

      if (items.length > 0) {
        setCachedData(CACHE_KEYS.RESULTS, items);
      }
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
      setTimeout(() => resolve(null), 2500)
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
  // إضافة إلى المشتركين المباشرين للتحديث الفوري بدون انتظار
  realtimeSubscribers.add(callback);

  // 1. تحميل فوري للبيانات المحفوظة محلياً لبدء التطبيق فوراً بدون أي تأخير أو فقدان
  let students: Student[] = getCachedData<Student[]>(CACHE_KEYS.STUDENTS, []);
  let exams: Exam[] = getCachedData<Exam[]>(CACHE_KEYS.EXAMS, []);
  let results: ExamResult[] = getCachedData<ExamResult[]>(CACHE_KEYS.RESULTS, []);
  let settings: TeacherSettings = getCachedData<TeacherSettings>(CACHE_KEYS.SETTINGS, DEFAULT_SETTINGS);

  const emit = () => {
    callback({
      students: getCachedData<Student[]>(CACHE_KEYS.STUDENTS, []),
      exams: getCachedData<Exam[]>(CACHE_KEYS.EXAMS, []),
      results: getCachedData<ExamResult[]>(CACHE_KEYS.RESULTS, []),
      settings: getCachedData<TeacherSettings>(CACHE_KEYS.SETTINGS, DEFAULT_SETTINGS),
    });
  };

  // بث البيانات المخبأة محلياً فوراً
  emit();

  const unsubscribeStudents = onSnapshot(
    collection(db, 'students'),
    (snapshot) => {
      const firestoreStudents = snapshot.docs.map(
        (item) => ({
          id: item.id,
          ...item.data(),
        })
      ) as Student[];

      const localStudents = getCachedData<Student[]>(CACHE_KEYS.STUDENTS, []);
      const studentMap = new Map<string, Student>();
      firestoreStudents.forEach(s => studentMap.set(s.id, s));
      localStudents.forEach(s => {
        if (!studentMap.has(s.id)) {
          studentMap.set(s.id, s);
        }
      });
      students = Array.from(studentMap.values());
      setCachedData(CACHE_KEYS.STUDENTS, students);
      notifySubscribers();
    },
    (err) => {
      console.warn('Realtime students listener:', err.message);
      emit();
    }
  );

  const unsubscribeExams = onSnapshot(
    collection(db, 'exams'),
    (snapshot) => {
      const firestoreExams = snapshot.docs.map(
        (item) => ({
          id: item.id,
          ...item.data(),
        })
      ) as Exam[];

      const localExams = getCachedData<Exam[]>(CACHE_KEYS.EXAMS, []);
      const examMap = new Map<string, Exam>();
      firestoreExams.forEach(e => examMap.set(e.id, e));
      localExams.forEach(e => {
        if (!examMap.has(e.id)) {
          examMap.set(e.id, e);
        }
      });
      exams = Array.from(examMap.values());
      setCachedData(CACHE_KEYS.EXAMS, exams);
      notifySubscribers();
    },
    (err) => {
      console.warn('Realtime exams listener:', err.message);
      emit();
    }
  );

  const unsubscribeResults = onSnapshot(
    collection(db, 'results'),
    (snapshot) => {
      const firestoreResults = snapshot.docs.map(
        (item) => ({
          id: item.id,
          ...item.data(),
        })
      ) as ExamResult[];

      const localResults = getCachedData<ExamResult[]>(CACHE_KEYS.RESULTS, []);
      const resultMap = new Map<string, ExamResult>();
      firestoreResults.forEach(r => resultMap.set(r.id, r));
      localResults.forEach(r => {
        if (!resultMap.has(r.id)) {
          resultMap.set(r.id, r);
        }
      });
      results = Array.from(resultMap.values());
      setCachedData(CACHE_KEYS.RESULTS, results);
      notifySubscribers();
    },
    (err) => {
      console.warn('Realtime results listener:', err.message);
      emit();
    }
  );

  const unsubscribeSettings = onSnapshot(
    doc(db, 'settings', SETTINGS_ID),
    (snapshot) => {
      if (snapshot.exists()) {
        settings = {
          ...DEFAULT_SETTINGS,
          ...snapshot.data(),
        } as TeacherSettings;
        setCachedData(CACHE_KEYS.SETTINGS, settings);
        notifySubscribers();
      }
    },
    (err) => {
      console.warn('Realtime settings listener:', err.message);
      emit();
    }
  );

  return () => {
    realtimeSubscribers.delete(callback);
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