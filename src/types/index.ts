export type ExamType =
  | 'Quiz'
  | 'Test'
  | 'Midterm'
  | 'Final Exam'
  | 'Homework'
  | 'Assignment'
  | 'Practice Exam';

export type StudentEnrollmentStatus =
  | 'active'      // ملف فعال (مستمر بالكورس)
  | 'completed'   // انتهى الكورس (أتم الكورس)
  | 'paused'      // متوقف مؤقتاً / مؤجل
  | 'withdrawn';  // منقطع عن الكورس

export type ChartDisplayType =
  | 'bar'         // أعمدة رأسية
  | 'horizontal'  // أشرطة أفقية
  | 'pie'         // دائري / حلقي
  | 'area'        // منحنى مساحي
  | 'line'        // خطي
  | 'radar';      // شبكي / راداري

export interface Student {
  id: string; // Firestore doc ID
  studentId: string; // e.g. STU-101
  name: string;
  grade: string; // e.g. الأول الثانوي
  group: string; // e.g. مجموعة A

  // حالة ملف الطالب في الكورس (فعال / انتهى الكورس / متوقف / منقطع)
  enrollmentStatus?: StudentEnrollmentStatus;
  enrollmentStatusNote?: string;
  enrollmentStatusUpdatedAt?: string;

  // الحقول الأكاديمية الجديدة
  academicYear?: string; // e.g. 2025 - 2026
  term?: string; // e.g. الفصل الأول / الفصل الثاني / الفصل الثالث
  track?: string; // e.g. عام / متقدم

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

export interface ResultAttachment {
  name: string;
  type: string; // e.g. image/jpeg, image/png, application/pdf, message/rfc822, text/plain, etc.
  size?: number; // size in bytes
  dataUrl: string; // base64 / data URL
  uploadedAt: string;
  notes?: string;
}

export interface Exam {
  id: string;
  title: string;
  subject: string;
  grade: string;
  academicYear?: string;
  term?: string;
  track?: string;
  group: string;
  date: string;
  totalScore: number;
  passScore: number;
  type: ExamType;
  notes?: string;
  attachment?: ResultAttachment | null;
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
  attachment?: ResultAttachment | null;
  attemptNumber?: number; // 1 للمحاولة الأساسية، 2 للتحسين، 3، إلخ
  attemptLabel?: string; // e.g. "المحاولة 1" أو "تحسين درجة"
  isImprovement?: boolean; // هل هي درجة تحسين؟
  previousScore?: number; // الدرجة السابقة قبل التحسين
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
  improvementsCount?: number; // عدد الامتحانات التي تم تحسينها
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

/* =========================================================
   STRUCTURES (قسم الهياكل ومتابعة حل الأسئلة ونسب صحتها)
   ========================================================= */

export interface StructureQuestionItem {
  questionNumber: number; // رقم السؤال (1, 2, 3...)
  title?: string; // عنوان السؤال / الدرس / الناتج التعليمي
  topic?: string; // المهارة أو الوحدة
  maxScore?: number; // الوزن أو الدرجة المرجعية الاختيارية
  notes?: string;
}

export type StructureCompletionStatus = 'ongoing' | 'studied_not_examined' | 'completed';

export interface ExamStructure {
  id: string;
  title: string; // اسم / عنوان الهيكل
  code?: string; // كود اختياري للهيكل (مثل STR-001)
  grade: string; // الصف الدراسي
  term: string; // الفصل الدراسي (الفصل الأول / الثاني / الثالث)
  track: string; // المسار (عام / متقدم / إلخ)
  academicYear: string; // السنة الدراسية
  subject: string; // المادة
  group?: string; // الشعبة / المجموعة أو الكل
  date?: string; // تاريخ اعتماد أو إضافة الهيكل
  completionStatus?: StructureCompletionStatus; // 'ongoing' = مستمر وجاري الدراسة | 'studied_not_examined' = منتهي دراسته ولم يُمتحن بعد | 'completed' = انتهى وتم امتحان المادة
  completedAt?: string; // تاريخ انتهاء دراسة الهيكل أو امتحان المادة (اختياري)
  totalQuestions: number; // إجمالي عدد الأسئلة في الهيكل
  questions: StructureQuestionItem[]; // تفاصيل أسئلة الهيكل (س1 .. سN)
  excludedStudentIds?: string[]; // معرفات الطلاب المحذوف سطرهم من هذا الهيكل فقط (دون حذف ملفهم من المنصة)
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface StructureQuestionAttempt {
  attemptNumber: number; // 1 للمحاولة الأساسية، 2 للتحسين، 3، إلخ
  attemptLabel?: string; // e.g. "المحاولة الأساسية" أو "تحسين درجة (محاولة 2)"
  accuracyPercentage: number;
  previousAccuracy?: number;
  date?: string;
  notes?: string;
}

export interface StructureQuestionScore {
  questionNumber: number;
  solved: boolean; // هل قام الطالب بحل السؤال؟
  accuracyPercentage: number; // نسبة صحة السؤال (0 إلى 100)
  notes?: string;
  // حقول تحسين الدرجات على مستوى السؤال
  attemptNumber?: number; // 1 للمحاولة الأساسية، 2 للتحسين، 3، إلخ
  attemptLabel?: string;
  isImprovement?: boolean;
  previousAccuracy?: number; // نسبة الصحة السابقة قبل التحسين
  attempts?: StructureQuestionAttempt[]; // سجل محاولات التحسين التفصيلي لهذا السؤال
}

export interface StudentStructureProgress {
  id: string; // `${structureId}__${studentDocId}` للمحاولة الأساسية أو `${structureId}__${studentDocId}__attempt_N` للتحسين
  structureId: string;
  structureTitle: string;
  studentDocId: string; // Firestore doc ID للطالب
  studentId: string; // كود الطالب مثل STU-101
  studentName: string;
  grade: string;
  term: string;
  track: string;
  academicYear: string;
  subject: string;
  group?: string;
  date?: string; // تاريخ التقييم أو الرصد
  totalQuestions: number;
  solvedCount: number; // عدد الأسئلة التي قام الطالب بحلها من الهيكل
  completionPercentage: number; // نسبة إتمام الحل من الهيكل %
  overallAccuracyPercentage: number; // متوسط نسبة صحة الأسئلة المحلولة %
  questionScores: StructureQuestionScore[]; // نسبة صحة وحل كل سؤال على حدة
  // حقول تحسين الدرجات على مستوى الطالب في الهيكل (مثل الامتحانات العادية تماماً)
  attemptNumber?: number; // 1 للمحاولة الأساسية، 2 للتحسين، 3، إلخ
  attemptLabel?: string; // e.g. "المحاولة الأساسية" أو "تحسين درجة (محاولة 2)"
  isImprovement?: boolean; // هل هذه محاولة تحسين للهيكل؟
  previousAccuracy?: number; // متوسط الصحة السابق قبل التحسين %
  previousSolvedCount?: number; // عدد الأسئلة المحلولة في المحاولة السابقة
  improvementsCount?: number; // عدد الأسئلة المحسّنة داخل هذا السجل
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

/* =========================================================
   OVERTIME & FINANCIAL MANAGEMENT (قسم الأوفر تايم والمالية)
   ========================================================= */

export type OvertimeDayType =
  | 'regular'
  | 'late_night'
  | 'weekend'
  | 'holiday'
  | 'custom';

export interface OvertimeEntry {
  id: string;
  date: string; // YYYY-MM-DD
  monthKey: string; // YYYY-MM
  dayNameAr: string; // اسم اليوم بالعربي (مثلاً: الثلاثاء)
  hours: number; // عدد ساعات الأوفر تايم لهذا اليوم
  startTime?: string; // وقت البداية الاختياري (HH:mm)
  endTime?: string; // وقت النهاية الاختياري (HH:mm)
  dayType: OvertimeDayType;
  multiplier: number; // معامل احتساب الأوفر تايم (مثلاً 1.25 / 1.5 / 2.0)
  hourlyRateSnapshot: number; // أجر الساعة الأساسي وقت الحساب
  calculatedAmount: number; // قيمة الأوفر تايم المستحقة لهذا السجل
  customFixedAmount?: number; // مبلغ ثابت اختياري بدلاً من الحساب التلقائي
  category?: string; // تصنيف العمل (تدريس إضافي، تصحيح، تحضير، إشراف...)
  notes?: string;
  archived?: boolean; // أرشفة آمنة لحماية السجلات من الفقدان
  archivedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface FinancialAdjustmentItem {
  id: string;
  type: 'bonus' | 'allowance' | 'deduction'; // مكافأة / بدل / استقطاع
  title: string;
  amount: number;
  date?: string;
  notes?: string;
}

export interface OvertimeMonthlyConfig {
  id: string; // monthKey (YYYY-MM)
  monthKey: string; // YYYY-MM
  currency: string; // e.g. AED, SAR, EGP, USD
  totalSalary: number; // الراتب الكلي للشهر
  basicSalaryRatioPct?: number; // نسبة الوعاء المحتسب للأوفر تايم (افتراضي 100% من الراتب الكلي)
  calculationMode: 'from_salary' | 'manual_hourly';
  workingDaysPerMonth: number; // أيام العمل الشهرية لحساب أجر الساعة (مثلاً 22 أو 26 أو 30)
  workingHoursPerDay: number; // ساعات العمل اليومية (مثلاً 8)
  manualHourlyRate?: number;
  regularMultiplier: number; // معامل الأيام العادية (افتراضي 1.25)
  weekendMultiplier: number; // معامل نهاية الأسبوع (افتراضي 1.5)
  holidayMultiplier: number; // معامل العطل الرسمية (افتراضي 2.0)
  adjustments: FinancialAdjustmentItem[]; // بدلات ومكافآت واستقطاعات الشهر
  savingsGoalPct?: number; // نسبة الادخار المستهدفة %
  monthlyTargetIncome?: number; // الهدف المالي الشهري
  notes?: string;
  createdAt?: string;
  updatedAt: string;
}

