import { Student, StudentEnrollmentStatus } from '../types';

export interface EnrollmentStatusMeta {
  id: StudentEnrollmentStatus;
  label: string;
  shortLabel: string;
  description: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotColor: string;
  activeBtnClass: string;
}

export const ENROLLMENT_STATUS_META: Record<StudentEnrollmentStatus, EnrollmentStatusMeta> = {
  active: {
    id: 'active',
    label: 'ملف فعال (مستمر بالكورس)',
    shortLabel: 'ملف فعال',
    description: 'الطالب منتظم حالياً ومستمر في حضور الكورس والامتحانات',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    badgeBorder: 'border-emerald-200 dark:border-emerald-800',
    dotColor: 'bg-emerald-500',
    activeBtnClass: 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-500/20',
  },
  completed: {
    id: 'completed',
    label: 'انتهى الكورس (أتم الكورس)',
    shortLabel: 'انتهى الكورس',
    description: 'أنهى الطالب الكورس بنجاح ويُدرج في قائمة الطلبة المنتهي الكورس لهم',
    badgeBg: 'bg-indigo-50 dark:bg-indigo-950/60',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
    badgeBorder: 'border-indigo-200 dark:border-indigo-800',
    dotColor: 'bg-indigo-500',
    activeBtnClass: 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-500/20',
  },
  paused: {
    id: 'paused',
    label: 'متوقف مؤقتاً / مؤجل',
    shortLabel: 'متوقف مؤقتاً',
    description: 'الطالب متوقف لفترة مؤقتة مع إمكانية استئناف الكورس لاحقاً',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/60',
    badgeText: 'text-amber-700 dark:text-amber-300',
    badgeBorder: 'border-amber-200 dark:border-amber-800',
    dotColor: 'bg-amber-500',
    activeBtnClass: 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm shadow-amber-500/20',
  },
  withdrawn: {
    id: 'withdrawn',
    label: 'منقطع عن الكورس',
    shortLabel: 'منقطع',
    description: 'الطالب منقطع عن الحضور أو اعتذر عن استكمال الكورس',
    badgeBg: 'bg-rose-50 dark:bg-rose-950/60',
    badgeText: 'text-rose-700 dark:text-rose-300',
    badgeBorder: 'border-rose-200 dark:border-rose-800',
    dotColor: 'bg-rose-500',
    activeBtnClass: 'bg-rose-600 text-white border-rose-600 shadow-sm shadow-rose-500/20',
  },
};

export const ENROLLMENT_STATUS_LIST: EnrollmentStatusMeta[] = [
  ENROLLMENT_STATUS_META.active,
  ENROLLMENT_STATUS_META.completed,
  ENROLLMENT_STATUS_META.paused,
  ENROLLMENT_STATUS_META.withdrawn,
];

const LOCAL_STATUS_KEY = 'mh_student_enrollment_status_map_v1';

export interface StoredStudentStatusRecord {
  status: StudentEnrollmentStatus;
  note?: string;
  updatedAt: string;
}

function getLocalStatusMap(): Record<string, StoredStudentStatusRecord> {
  try {
    const raw = localStorage.getItem(LOCAL_STATUS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

export function saveLocalStudentStatus(
  studentId: string,
  status: StudentEnrollmentStatus,
  note?: string
): StoredStudentStatusRecord {
  const map = getLocalStatusMap();
  const record: StoredStudentStatusRecord = {
    status,
    note: note !== undefined ? note : map[studentId]?.note,
    updatedAt: new Date().toISOString(),
  };
  map[studentId] = record;
  try {
    localStorage.setItem(LOCAL_STATUS_KEY, JSON.stringify(map));
  } catch (err) {
    console.warn('Could not save student status locally:', err);
  }
  return record;
}

export function getEffectiveEnrollmentStatus(student: Student): StudentEnrollmentStatus {
  const map = getLocalStatusMap();
  const localRecord = map[student.id] || (student.studentId ? map[student.studentId] : undefined);
  if (localRecord?.status) {
    return localRecord.status;
  }
  if (
    student.enrollmentStatus &&
    ['active', 'completed', 'paused', 'withdrawn'].includes(student.enrollmentStatus)
  ) {
    return student.enrollmentStatus;
  }
  return 'active';
}

export function getEffectiveEnrollmentNote(student: Student): string {
  const map = getLocalStatusMap();
  const localRecord = map[student.id] || (student.studentId ? map[student.studentId] : undefined);
  if (localRecord?.note !== undefined) {
    return localRecord.note;
  }
  return student.enrollmentStatusNote || '';
}

export function getEffectiveEnrollmentUpdatedAt(student: Student): string | undefined {
  const map = getLocalStatusMap();
  const localRecord = map[student.id] || (student.studentId ? map[student.studentId] : undefined);
  return localRecord?.updatedAt || student.enrollmentStatusUpdatedAt;
}

export function enrichStudentWithLocalStatus(student: Student): Student {
  const status = getEffectiveEnrollmentStatus(student);
  const note = getEffectiveEnrollmentNote(student);
  const updatedAt = getEffectiveEnrollmentUpdatedAt(student);
  return {
    ...student,
    enrollmentStatus: status,
    enrollmentStatusNote: note,
    enrollmentStatusUpdatedAt: updatedAt,
  };
}
