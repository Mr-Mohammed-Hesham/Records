import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore,
  Firestore,
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
  orderBy, 
  writeBatch,
  onSnapshot 
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { Student, Exam, ExamResult, TeacherSettings } from '../types';
import { DEFAULT_GRADING_SCALE } from '../utils/grading';
import firebaseConfigData from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseConfigData.apiKey,
  authDomain: firebaseConfigData.authDomain,
  projectId: firebaseConfigData.projectId,
  storageBucket: firebaseConfigData.storageBucket,
  messagingSenderId: firebaseConfigData.messagingSenderId,
  appId: firebaseConfigData.appId,
};

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use experimentalForceLongPolling to ensure reliable connectivity in web iframes and proxies
function initFirestore(): Firestore {
  try {
    return initializeFirestore(
      app,
      {
        experimentalForceLongPolling: true,
      },
      firebaseConfigData.firestoreDatabaseId || '(default)'
    );
  } catch {
    return getFirestore(app, firebaseConfigData.firestoreDatabaseId || '(default)');
  }
}

export const db = initFirestore();

// Test connection helper
export async function testConnection(): Promise<boolean> {
  try {
    const testDoc = await getDoc(doc(db, 'settings', 'config'));
    return testDoc.exists();
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client operating in offline mode.');
    }
    return false;
  }
}

// Firestore Error Handling specifications
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Google Auth Helpers
export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function signOutTeacher(): Promise<void> {
  await signOut(auth);
}

// UAE Curriculum Grades (Grades 1 to 12)
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
];

// Default initial settings
export const DEFAULT_SETTINGS: TeacherSettings = {
  teacherName: 'Mr. Mohammed Hesham',
  appTitle: 'Mr Mohammed Hesham Records',
  defaultSubject: 'الفيزياء',
  grades: UAE_GRADES,
  groups: [],
  subjects: [
    'الفيزياء',
    'الرياضيات',
    'الكيمياء',
    'الأحياء',
    'العلوم',
    'اللغة الإنجليزية',
    'اللغة العربية',
    'التربية الإسلامية',
    'الدراسات الاجتماعية',
    'الحاسوب والتكنولوجيا',
  ],
  examTypes: ['Quiz', 'Test', 'Midterm', 'Final Exam', 'Homework', 'Assignment', 'Practice Exam'],
  passPercentage: 60,
  gradingScale: DEFAULT_GRADING_SCALE,
  customLogoUrl: '',
};

// Check authentication session
export async function ensureAuthenticated(): Promise<User | null> {
  if (auth.currentUser) return auth.currentUser;
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user || null);
    });
  });
}

// ----------------- STUDENTS CRUD ----------------- //

export async function getStudents(): Promise<Student[]> {
  try {
    await ensureAuthenticated();
    const studentsCol = collection(db, 'students');
    const snapshot = await getDocs(studentsCol);
    const students: Student[] = [];
    snapshot.forEach((docSnap) => {
      students.push({ id: docSnap.id, ...(docSnap.data() as Omit<Student, 'id'>) });
    });
    // Sort by name or createdAt
    return students.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  } catch (error) {
    console.error('Error fetching students from Firestore:', error);
    // Fallback to local storage if offline
    const local = localStorage.getItem('mmh_students');
    return local ? JSON.parse(local) : [];
  }
}

export async function addStudent(studentData: Omit<Student, 'id'>): Promise<Student> {
  try {
    await ensureAuthenticated();
    const studentsCol = collection(db, 'students');
    const docRef = await addDoc(studentsCol, {
      ...studentData,
      createdAt: studentData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const newStudent: Student = { id: docRef.id, ...studentData };
    
    // Update local cache
    const current = await getStudents();
    localStorage.setItem('mmh_students', JSON.stringify([...current, newStudent]));
    return newStudent;
  } catch (error) {
    console.error('Error adding student:', error);
    // Fallback save locally
    const id = 'local_' + Date.now();
    const fallback: Student = { id, ...studentData };
    const current = await getStudents();
    localStorage.setItem('mmh_students', JSON.stringify([...current, fallback]));
    return fallback;
  }
}

export async function updateStudent(id: string, studentData: Partial<Student>): Promise<void> {
  try {
    await ensureAuthenticated();
    const docRef = doc(db, 'students', id);
    await updateDoc(docRef, {
      ...studentData,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating student in Firestore:', error);
  }
  // Sync local cache
  const local = localStorage.getItem('mmh_students');
  if (local) {
    const list: Student[] = JSON.parse(local);
    const updated = list.map(s => s.id === id ? { ...s, ...studentData, updatedAt: new Date().toISOString() } : s);
    localStorage.setItem('mmh_students', JSON.stringify(updated));
  }
}

export async function deleteStudent(id: string): Promise<void> {
  try {
    await ensureAuthenticated();
    const docRef = doc(db, 'students', id);
    await deleteDoc(docRef);

    // Also delete any results for this student
    const resultsCol = collection(db, 'results');
    const q = query(resultsCol, where('studentDocId', '==', id));
    const snaps = await getDocs(q);
    const batch = writeBatch(db);
    snaps.forEach(resDoc => batch.delete(resDoc.ref));
    await batch.commit();
  } catch (error) {
    console.error('Error deleting student:', error);
  }
  // Sync local cache
  const local = localStorage.getItem('mmh_students');
  if (local) {
    const list: Student[] = JSON.parse(local);
    localStorage.setItem('mmh_students', JSON.stringify(list.filter(s => s.id !== id)));
  }
}

// ----------------- EXAMS CRUD ----------------- //

export async function getExams(): Promise<Exam[]> {
  try {
    await ensureAuthenticated();
    const examsCol = collection(db, 'exams');
    const snapshot = await getDocs(examsCol);
    const exams: Exam[] = [];
    snapshot.forEach((docSnap) => {
      exams.push({ id: docSnap.id, ...(docSnap.data() as Omit<Exam, 'id'>) });
    });
    return exams.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error('Error fetching exams from Firestore:', error);
    const local = localStorage.getItem('mmh_exams');
    return local ? JSON.parse(local) : [];
  }
}

export async function addExam(examData: Omit<Exam, 'id'>): Promise<Exam> {
  try {
    await ensureAuthenticated();
    const examsCol = collection(db, 'exams');
    const docRef = await addDoc(examsCol, {
      ...examData,
      createdAt: examData.createdAt || new Date().toISOString(),
    });
    const newExam: Exam = { id: docRef.id, ...examData };
    return newExam;
  } catch (error) {
    console.error('Error adding exam:', error);
    const id = 'local_exam_' + Date.now();
    const fallback: Exam = { id, ...examData };
    return fallback;
  }
}

export async function updateExam(id: string, examData: Partial<Exam>): Promise<void> {
  try {
    await ensureAuthenticated();
    const docRef = doc(db, 'exams', id);
    await updateDoc(docRef, examData);
  } catch (error) {
    console.error('Error updating exam:', error);
  }
}

export async function deleteExam(id: string): Promise<void> {
  try {
    await ensureAuthenticated();
    const docRef = doc(db, 'exams', id);
    await deleteDoc(docRef);

    // Also delete all results associated with this exam
    const resultsCol = collection(db, 'results');
    const q = query(resultsCol, where('examId', '==', id));
    const snaps = await getDocs(q);
    const batch = writeBatch(db);
    snaps.forEach(resDoc => batch.delete(resDoc.ref));
    await batch.commit();
  } catch (error) {
    console.error('Error deleting exam and results:', error);
  }
}

// ----------------- RESULTS CRUD ----------------- //

export function subscribeToRealtimeData(
  onStudentsChange: (students: Student[]) => void,
  onExamsChange: (exams: Exam[]) => void,
  onResultsChange: (results: ExamResult[]) => void
): () => void {
  // Initial load
  getStudents().then(onStudentsChange);
  getExams().then(onExamsChange);
  getAllResults().then(onResultsChange);

  try {
    const unsubStudents = onSnapshot(collection(db, 'students'), (snap) => {
      const list: Student[] = [];
      snap.forEach(d => list.push({ id: d.id, ...(d.data() as Omit<Student, 'id'>) }));
      list.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
      onStudentsChange(list);
      localStorage.setItem('mmh_students', JSON.stringify(list));
    }, (err) => console.warn('Students listener fallback:', err));

    const unsubExams = onSnapshot(collection(db, 'exams'), (snap) => {
      const list: Exam[] = [];
      snap.forEach(d => list.push({ id: d.id, ...(d.data() as Omit<Exam, 'id'>) }));
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      onExamsChange(list);
      localStorage.setItem('mmh_exams', JSON.stringify(list));
    }, (err) => console.warn('Exams listener fallback:', err));

    const unsubResults = onSnapshot(collection(db, 'results'), (snap) => {
      const list: ExamResult[] = [];
      snap.forEach(d => list.push({ id: d.id, ...(d.data() as Omit<ExamResult, 'id'>) }));
      onResultsChange(list);
      localStorage.setItem('mmh_results', JSON.stringify(list));
    }, (err) => console.warn('Results listener fallback:', err));

    return () => {
      unsubStudents();
      unsubExams();
      unsubResults();
    };
  } catch (err) {
    console.warn('Realtime subscription error:', err);
    return () => {};
  }
}

export async function getAllResults(): Promise<ExamResult[]> {
  try {
    await ensureAuthenticated();
    const resultsCol = collection(db, 'results');
    const snapshot = await getDocs(resultsCol);
    const results: ExamResult[] = [];
    snapshot.forEach((docSnap) => {
      results.push({ id: docSnap.id, ...(docSnap.data() as Omit<ExamResult, 'id'>) });
    });
    return results;
  } catch (error) {
    console.error('Error fetching results:', error);
    const local = localStorage.getItem('mmh_results');
    return local ? JSON.parse(local) : [];
  }
}

export async function getResultsByExam(examId: string): Promise<ExamResult[]> {
  try {
    await ensureAuthenticated();
    const resultsCol = collection(db, 'results');
    const q = query(resultsCol, where('examId', '==', examId));
    const snapshot = await getDocs(q);
    const results: ExamResult[] = [];
    snapshot.forEach((docSnap) => {
      results.push({ id: docSnap.id, ...(docSnap.data() as Omit<ExamResult, 'id'>) });
    });
    return results;
  } catch (error) {
    console.error('Error fetching exam results:', error);
    const all = await getAllResults();
    return all.filter(r => r.examId === examId);
  }
}

export async function getResultsByStudent(studentDocId: string): Promise<ExamResult[]> {
  try {
    await ensureAuthenticated();
    const resultsCol = collection(db, 'results');
    const q = query(resultsCol, where('studentDocId', '==', studentDocId));
    const snapshot = await getDocs(q);
    const results: ExamResult[] = [];
    snapshot.forEach((docSnap) => {
      results.push({ id: docSnap.id, ...(docSnap.data() as Omit<ExamResult, 'id'>) });
    });
    return results.sort((a, b) => new Date(b.examDate).getTime() - new Date(a.examDate).getTime());
  } catch (error) {
    console.error('Error fetching student results:', error);
    const all = await getAllResults();
    return all.filter(r => r.studentDocId === studentDocId);
  }
}

export async function saveBatchResults(
  examId: string, 
  results: Array<Omit<ExamResult, 'id'>>
): Promise<void> {
  try {
    await ensureAuthenticated();
    const resultsCol = collection(db, 'results');
    
    // Existing results for this exam
    const existingSnaps = await getDocs(query(resultsCol, where('examId', '==', examId)));
    const existingMap = new Map<string, string>(); // studentDocId -> resultId
    existingSnaps.forEach(docSnap => {
      const data = docSnap.data();
      existingMap.set(data.studentDocId, docSnap.id);
    });

    const batch = writeBatch(db);

    for (const res of results) {
      if (existingMap.has(res.studentDocId)) {
        const docId = existingMap.get(res.studentDocId)!;
        const ref = doc(db, 'results', docId);
        batch.update(ref, {
          ...res,
          updatedAt: new Date().toISOString(),
        });
      } else {
        const newRef = doc(resultsCol);
        batch.set(newRef, {
          ...res,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    await batch.commit();
  } catch (error) {
    console.error('Error saving batch results in Firestore:', error);
  }
}

export async function deleteResult(resultId: string): Promise<void> {
  try {
    await ensureAuthenticated();
    const docRef = doc(db, 'results', resultId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting result:', error);
  }
}

export async function updateSingleResult(resultId: string, data: Partial<ExamResult>): Promise<void> {
  try {
    await ensureAuthenticated();
    const docRef = doc(db, 'results', resultId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating result:', error);
  }
}

// ----------------- SETTINGS ----------------- //

export async function getTeacherSettings(): Promise<TeacherSettings> {
  try {
    await ensureAuthenticated();
    const docRef = doc(db, 'settings', 'config');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { ...DEFAULT_SETTINGS, ...(docSnap.data() as TeacherSettings) };
    }
  } catch (error) {
    console.error('Error fetching settings:', error);
  }
  const local = localStorage.getItem('mmh_settings');
  return local ? JSON.parse(local) : DEFAULT_SETTINGS;
}

export async function saveTeacherSettings(settings: TeacherSettings): Promise<void> {
  try {
    await ensureAuthenticated();
    const docRef = doc(db, 'settings', 'config');
    await setDoc(docRef, settings, { merge: true });
  } catch (error) {
    console.error('Error saving settings to Firestore:', error);
  }
  localStorage.setItem('mmh_settings', JSON.stringify(settings));
}

// ----------------- SAMPLE DATA SEEDER ----------------- //

export async function seedSampleData(): Promise<void> {
  const sampleStudents: Array<Omit<Student, 'id'>> = [
    {
      studentId: 'STU-1001',
      name: 'أحمد محمود العطار',
      grade: 'الأول الثانوي',
      group: 'المجموعة A (السبت - الثلاثاء)',
      subject: 'الفيزياء',
      phone: '01012345678',
      parentPhone: '01212345678',
      school: 'مدرسة المتفوقين الثانوية',
      notes: 'طالب ممتاز ومشارك دائم في الحصص ومهتم بالتجارب العملية',
      createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    },
    {
      studentId: 'STU-1002',
      name: 'سارة إبراهيم الشناوي',
      grade: 'الأول الثانوي',
      group: 'المجموعة A (السبت - الثلاثاء)',
      subject: 'الفيزياء',
      phone: '01123456789',
      parentPhone: '01098765432',
      school: 'مدرسة الزهراء التجريبية',
      notes: 'دقيقة في حل المسائل الرياضية وتحافظ على تسليم الواجبات',
      createdAt: new Date(Date.now() - 28 * 24 * 3600 * 1000).toISOString(),
    },
    {
      studentId: 'STU-1003',
      name: 'عمر خالد الدسوقي',
      grade: 'الثاني الثانوي',
      group: 'المجموعة B (الأحد - الأربعاء)',
      subject: 'الفيزياء',
      phone: '01055551234',
      parentPhone: '01255551234',
      school: 'مدرسة الأورمان الثانوية',
      notes: 'يحتاج تركيزاً أكبر في مسائل الحركة وقوانين نيوتن',
      createdAt: new Date(Date.now() - 25 * 24 * 3600 * 1000).toISOString(),
    },
    {
      studentId: 'STU-1004',
      name: 'مريم طارق الفقي',
      grade: 'الثاني الثانوي',
      group: 'المجموعة B (الأحد - الأربعاء)',
      subject: 'الفيزياء',
      phone: '01144445555',
      parentPhone: '01044445555',
      school: 'مدرسة النصر القومية',
      notes: 'مستواها في تطور مستمر وأداؤها في الامتحانات الأخيرة مشرق',
      createdAt: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString(),
    },
    {
      studentId: 'STU-1005',
      name: 'يوسف مصطفى النجار',
      grade: 'الثالث الثانوي',
      group: 'مجموعة المتفوقين',
      subject: 'الفيزياء',
      phone: '01277778888',
      parentPhone: '01177778888',
      school: 'مدرسة جمال عبد الناصر الثانوية',
      notes: 'طالب عبقري في الفيزياء الحديثة والدوائر الكهربية',
      createdAt: new Date(Date.now() - 18 * 24 * 3600 * 1000).toISOString(),
    },
    {
      studentId: 'STU-1006',
      name: 'نور الدين شريف رضوان',
      grade: 'الثالث الثانوي',
      group: 'مجموعة المتفوقين',
      subject: 'الفيزياء',
      phone: '01088889999',
      parentPhone: '01288889999',
      school: 'مدرسة الأندلس الخاصة',
      notes: 'سريع البديهة ويحتاج متابعة لتجنب أخطاء السرعة',
      createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
    }
  ];

  const addedStudents: Student[] = [];
  for (const s of sampleStudents) {
    const added = await addStudent(s);
    addedStudents.push(added);
  }

  // Sample Exams
  const sampleExams: Array<Omit<Exam, 'id'>> = [
    {
      title: 'امتحان الباب الأول: الحركة الخطية ومعادلات الحركة',
      subject: 'الفيزياء',
      grade: 'الأول الثانوي',
      group: 'الكل',
      date: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString().split('T')[0],
      totalScore: 50,
      passScore: 30,
      type: 'Test',
      notes: 'امتحان شامل 20 سؤال اختياري و 3 مسائل مقالية',
    },
    {
      title: 'كويز سريع: قوانين كيرشوف وتوصيل المقاومات',
      subject: 'الفيزياء',
      grade: 'الثالث الثانوي',
      group: 'مجموعة المتفوقين',
      date: new Date(Date.now() - 12 * 24 * 3600 * 1000).toISOString().split('T')[0],
      totalScore: 20,
      passScore: 12,
      type: 'Quiz',
      notes: 'اختبار مدته 30 دقيقة لقياس دقة حساب التيارات وفرق الجهد',
    },
    {
      title: 'امتحان منتصف الفصل الدراسي: الميكانيكا والطاقة',
      subject: 'الفيزياء',
      grade: 'الأول الثانوي',
      group: 'المجموعة A (السبت - الثلاثاء)',
      date: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString().split('T')[0],
      totalScore: 100,
      passScore: 60,
      type: 'Midterm',
      notes: 'امتحان الميدتيرم الرئيسي',
    },
  ];

  const addedExams: Exam[] = [];
  for (const e of sampleExams) {
    const added = await addExam(e);
    addedExams.push(added);
  }

  // Results for Exam 1 (Movement)
  const exam1 = addedExams[0];
  const exam1Scores = [
    { studentIndex: 0, score: 48, notes: 'إجابة نموذجية ممتازة' },
    { studentIndex: 1, score: 46, notes: 'ممتازة جداً' },
    { studentIndex: 2, score: 28, notes: 'يحتاج لمراجعة معادلات الحركة بعناية' },
    { studentIndex: 3, score: 39, notes: 'مستوى جيد جداً' },
  ];

  const resultsBatch1: Array<Omit<ExamResult, 'id'>> = exam1Scores.map(sc => {
    const student = addedStudents[sc.studentIndex];
    const pct = Math.round((sc.score / exam1.totalScore) * 1000) / 10;
    return {
      studentDocId: student.id,
      studentId: student.studentId,
      studentName: student.name,
      examId: exam1.id,
      examTitle: exam1.title,
      examDate: exam1.date,
      subject: exam1.subject,
      score: sc.score,
      totalScore: exam1.totalScore,
      percentage: pct,
      gradeRating: pct >= 90 ? 'ممتاز' : pct >= 80 ? 'جيد جداً' : pct >= 70 ? 'جيد' : pct >= 60 ? 'مقبول' : 'يحتاج تحسين',
      passed: sc.score >= exam1.passScore,
      notes: sc.notes,
      createdAt: new Date().toISOString(),
    };
  });
  await saveBatchResults(exam1.id, resultsBatch1);

  // Results for Exam 2 (Kirchhoff)
  const exam2 = addedExams[1];
  const exam2Scores = [
    { studentIndex: 4, score: 20, notes: 'الدرجة النهائية، تفوق رائع' },
    { studentIndex: 5, score: 18.5, notes: 'ممتاز جداً مع خطأ بسيط في الإشارة' },
  ];

  const resultsBatch2: Array<Omit<ExamResult, 'id'>> = exam2Scores.map(sc => {
    const student = addedStudents[sc.studentIndex];
    const pct = Math.round((sc.score / exam2.totalScore) * 1000) / 10;
    return {
      studentDocId: student.id,
      studentId: student.studentId,
      studentName: student.name,
      examId: exam2.id,
      examTitle: exam2.title,
      examDate: exam2.date,
      subject: exam2.subject,
      score: sc.score,
      totalScore: exam2.totalScore,
      percentage: pct,
      gradeRating: pct >= 90 ? 'ممتاز' : pct >= 80 ? 'جيد جداً' : pct >= 70 ? 'جيد' : pct >= 60 ? 'مقبول' : 'يحتاج تحسين',
      passed: sc.score >= exam2.passScore,
      notes: sc.notes,
      createdAt: new Date().toISOString(),
    };
  });
  await saveBatchResults(exam2.id, resultsBatch2);

  // Results for Exam 3 (Midterm)
  const exam3 = addedExams[2];
  const exam3Scores = [
    { studentIndex: 0, score: 98, notes: 'الأول على المجموعة بجدارة' },
    { studentIndex: 1, score: 94, notes: 'أداء راقٍ ومتميز' },
  ];

  const resultsBatch3: Array<Omit<ExamResult, 'id'>> = exam3Scores.map(sc => {
    const student = addedStudents[sc.studentIndex];
    const pct = Math.round((sc.score / exam3.totalScore) * 1000) / 10;
    return {
      studentDocId: student.id,
      studentId: student.studentId,
      studentName: student.name,
      examId: exam3.id,
      examTitle: exam3.title,
      examDate: exam3.date,
      subject: exam3.subject,
      score: sc.score,
      totalScore: exam3.totalScore,
      percentage: pct,
      gradeRating: pct >= 90 ? 'ممتاز' : pct >= 80 ? 'جيد جداً' : pct >= 70 ? 'جيد' : pct >= 60 ? 'مقبول' : 'يحتاج تحسين',
      passed: sc.score >= exam3.passScore,
      notes: sc.notes,
      createdAt: new Date().toISOString(),
    };
  });
  await saveBatchResults(exam3.id, resultsBatch3);
}

export async function clearAllData(): Promise<void> {
  try {
    await ensureAuthenticated();
    const studentsCol = collection(db, 'students');
    const examsCol = collection(db, 'exams');
    const resultsCol = collection(db, 'results');

    const sSnap = await getDocs(studentsCol);
    for (const d of sSnap.docs) {
      await deleteDoc(d.ref);
    }

    const eSnap = await getDocs(examsCol);
    for (const d of eSnap.docs) {
      await deleteDoc(d.ref);
    }

    const rSnap = await getDocs(resultsCol);
    for (const d of rSnap.docs) {
      await deleteDoc(d.ref);
    }

    localStorage.removeItem('mmh_students');
    localStorage.removeItem('mmh_exams');
    localStorage.removeItem('mmh_results');
  } catch (error) {
    console.error('Error clearing data:', error);
  }
}

