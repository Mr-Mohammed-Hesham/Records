export type ExamType =
  | 'Quiz'
  | 'Test'
  | 'Midterm'
  | 'Final Exam'
  | 'Homework'
  | 'Assignment'
  | 'Practice Exam';

export interface Student {
  id: string; // Firestore doc ID
  studentId: string; // e.g. STU-101
  name: string;
  grade: string; // e.g. الأول الثانوي
  group: string; // e.g. مجموعة A

  // المادة القديمة - نحافظ عليها للتوافق مع البيانات الموجودة
  subject: string;

  // المواد التي يدرسها الطالب - يمكن أن تكون أكثر من مادة
  subjects?: string[];

  school?: string;
  phone?: string;
  parentPhone?: string;
  email?: string;
  notes?: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Exam {
  id: string;
  title: string;
  subject: string;
  grade: string;
  group: string;
  date: string;
  totalScore: number;
  passScore: number;
  type: ExamType;
  notes?: string;
  createdAt?: string;
}

export interface ExamResult {
  id: string;
  examId: string;

  // Student ID
  studentId: string;

  // Firestore document ID للطالب
  studentDocId: string;

  studentName: string;
  examTitle: string;
  examDate: string;
  score: number;
  totalScore: number;
  percentage: number;
  gradeRating: string; // ممتاز / جيد جدا / جيد / مقبول / يحتاج تحسين
  passed: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GradingScaleItem {
  id: string;
  minPercent: number;
  maxPercent: number;
  label: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  isPass: boolean;
}

export interface TeacherSettings {
  teacherName: string;
  appTitle: string;
  defaultSubject: string;
  grades: string[];
  groups: string[];
  subjects: string[];
  examTypes: ExamType[];
  passPercentage: number;
  gradingScale: GradingScaleItem[];
  customLogoUrl?: string;
}

export interface StudentStats {
  totalExams: number;
  highestScore: number;
  highestPercentage: number;
  lowestScore: number;
  lowestPercentage: number;
  averageScore: number;
  averagePercentage: number;
  passRate: number;
  latestScore: number | null;
  latestPercentage: number | null;
  latestExamTitle: string | null;
  status: 'ممتاز' | 'جيد' | 'يحتاج متابعة';
  trend: 'improving' | 'steady' | 'declining';
  trendMessage: string;
}

export interface ExamStats {
  attendedCount: number;
  averageScore: number;
  averagePercentage: number;
  highestScore: number;
  lowestScore: number;
  passCount: number;
  failCount: number;
  passRate: number;
}
