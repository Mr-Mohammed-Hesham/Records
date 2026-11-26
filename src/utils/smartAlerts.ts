import {
  ExamStructure,
  Student,
  StudentStructureProgress,
} from '../types';
import { getEffectiveStructureStatus } from './structureStatus';
import { getEffectiveEnrollmentStatus } from './studentStatus';

export type SmartAlertSeverity =
  | 'critical'
  | 'warning'
  | 'upcoming'
  | 'needs_attention';

export interface AlertStudentSnapshot {
  student: Student;
  latestProgress: StudentStructureProgress | null;
  solvedCount: number;
  totalQuestions: number;
  completionPct: number;
  accuracyPct: number;
  missingQuestionNumbers: number[];
}

export interface StructureSmartAlert {
  id: string;
  structure: ExamStructure;
  severity: SmartAlertSeverity;
  daysUntilExam: number | null;
  countdownLabel: string;
  headline: string;
  reason: string;
  totalEligibleCount: number;
  completedStudentsCount: number;
  incompleteStudents: AlertStudentSnapshot[];
  laggingStudents: AlertStudentSnapshot[]; // <= 50% completion
  notStartedStudents: AlertStudentSnapshot[]; // 0 solved
  avgCompletionPct: number;
  avgAccuracyPct: number;
  progressByStudentMap: Map<string, StudentStructureProgress[]>;
}

const DAILY_ALERT_REVIEW_KEY = 'mmh_daily_alert_review_v1';

export function getTodayLocalDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function diffDaysFromToday(dateStr?: string): number | null {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}/.test(dateStr.trim())) return null;
  const clean = dateStr.trim().slice(0, 10);
  const [y, m, d] = clean.split('-').map(Number);
  if (!y || !m || !d) return null;

  const target = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((target.getTime() - today.getTime()) / msPerDay);
}

export function formatCountdownLabel(days: number | null): string {
  if (days === null) return 'غير محدد الموعد';
  if (days < 0) return `تأخر ${Math.abs(days)} يوم عن الموعد`;
  if (days === 0) return 'الامتحان اليوم';
  if (days === 1) return 'الامتحان غداً';
  if (days === 2) return 'بعد يومين';
  return `متبقي ${days} أيام`;
}

export function isDailyAlertsDismissedToday(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const saved = localStorage.getItem(DAILY_ALERT_REVIEW_KEY);
    return saved === getTodayLocalDateKey();
  } catch {
    return false;
  }
}

export function setDailyAlertsDismissedToday(dismissed: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (dismissed) {
      localStorage.setItem(DAILY_ALERT_REVIEW_KEY, getTodayLocalDateKey());
    } else {
      localStorage.removeItem(DAILY_ALERT_REVIEW_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

function resolveLatestAttempt(
  attempts: StudentStructureProgress[]
): StudentStructureProgress | null {
  if (!attempts || attempts.length === 0) return null;
  const sorted = [...attempts].sort((a, b) => {
    const attA = a.attemptNumber || 1;
    const attB = b.attemptNumber || 1;
    if (attA !== attB) return attA - attB;
    return (
      new Date(a.updatedAt || a.createdAt || 0).getTime() -
      new Date(b.updatedAt || b.createdAt || 0).getTime()
    );
  });
  return sorted[sorted.length - 1];
}

export function computeStructureExamAlerts(
  structures: ExamStructure[],
  structureProgress: StudentStructureProgress[],
  students: Student[]
): StructureSmartAlert[] {
  const alerts: StructureSmartAlert[] = [];

  for (const structure of structures) {
    const status = getEffectiveStructureStatus(structure);
    if (status === 'completed') continue;

    const totalQ = Math.max(
      1,
      structure.totalQuestions || structure.questions?.length || 1
    );
    const excludedSet = new Set(structure.excludedStudentIds || []);

    const progressByStudentMap = new Map<string, StudentStructureProgress[]>();
    structureProgress.forEach((p) => {
      if (p.structureId !== structure.id) return;
      const list = progressByStudentMap.get(p.studentDocId) || [];
      list.push(p);
      progressByStudentMap.set(p.studentDocId, list);
    });

    // Sort each student's attempts chronologically so the last entry is latest
    progressByStudentMap.forEach((list, studentDocId) => {
      list.sort((a, b) => {
        const attA = a.attemptNumber || 1;
        const attB = b.attemptNumber || 1;
        if (attA !== attB) return attA - attB;
        return (
          new Date(a.updatedAt || a.createdAt || 0).getTime() -
          new Date(b.updatedAt || b.createdAt || 0).getTime()
        );
      });
      progressByStudentMap.set(studentDocId, list);
    });

    const eligibleStudents = students.filter((st) => {
      if (excludedSet.has(st.id)) return false;
      const hasProg = progressByStudentMap.has(st.id);
      if (hasProg) return true;
      const eff = getEffectiveEnrollmentStatus(st);
      if (eff === 'completed' || eff === 'withdrawn') return false;
      if (st.grade !== structure.grade) return false;
      if (st.term && structure.term && st.term !== structure.term) return false;
      if (st.track && structure.track && st.track !== structure.track) return false;
      if (
        st.academicYear &&
        structure.academicYear &&
        st.academicYear !== structure.academicYear
      ) {
        return false;
      }
      if (
        structure.group &&
        structure.group !== 'الكل' &&
        st.group &&
        st.group !== structure.group
      ) {
        return false;
      }
      return true;
    });

    if (eligibleStudents.length === 0) continue;

    const snapshots: AlertStudentSnapshot[] = eligibleStudents.map((student) => {
      const attempts = progressByStudentMap.get(student.id) || [];
      const latest = resolveLatestAttempt(attempts);
      const solvedCount = latest
        ? Math.min(totalQ, Math.max(0, latest.solvedCount || 0))
        : 0;
      const completionPct = latest
        ? latest.completionPercentage ??
          Math.round((solvedCount / totalQ) * 1000) / 10
        : 0;
      const accuracyPct = latest ? latest.overallAccuracyPercentage || 0 : 0;

      const solvedNumbersSet = new Set<number>(
        (latest?.questionScores || [])
          .filter((q) => q.solved)
          .map((q) => q.questionNumber)
      );
      const missingQuestionNumbers: number[] = [];
      for (let q = 1; q <= totalQ; q++) {
        if (!solvedNumbersSet.has(q)) missingQuestionNumbers.push(q);
      }

      return {
        student,
        latestProgress: latest,
        solvedCount,
        totalQuestions: totalQ,
        completionPct,
        accuracyPct,
        missingQuestionNumbers,
      };
    });

    const incompleteStudents = snapshots
      .filter((s) => s.completionPct < 100)
      .sort((a, b) => a.completionPct - b.completionPct);

    if (incompleteStudents.length === 0) continue;

    const laggingStudents = incompleteStudents.filter((s) => s.completionPct <= 50);
    const notStartedStudents = incompleteStudents.filter((s) => s.solvedCount === 0);
    const completedStudentsCount = snapshots.length - incompleteStudents.length;

    const avgCompletionPct = Math.round(
      snapshots.reduce((acc, s) => acc + s.completionPct, 0) / snapshots.length
    );

    const recordedSnapshots = snapshots.filter((s) => s.latestProgress !== null);
    const avgAccuracyPct =
      recordedSnapshots.length > 0
        ? Math.round(
            recordedSnapshots.reduce((acc, s) => acc + s.accuracyPct, 0) /
              recordedSnapshots.length
          )
        : 0;

    const daysUntilExam = diffDaysFromToday(structure.examDate);

    let severity: SmartAlertSeverity | null = null;
    if (daysUntilExam !== null) {
      if (daysUntilExam <= 2) {
        severity = 'critical';
      } else if (daysUntilExam <= 7) {
        severity = 'warning';
      } else if (daysUntilExam <= 14) {
        severity = 'upcoming';
      }
    } else if (status === 'studied_not_examined' || laggingStudents.length > 0) {
      severity = 'needs_attention';
    }

    if (!severity) continue;

    const countdownLabel = formatCountdownLabel(daysUntilExam);

    let headline = '';
    let reason = '';
    if (daysUntilExam !== null) {
      if (daysUntilExam <= 0) {
        headline = `${countdownLabel}: هيكل «${structure.title}» (${incompleteStudents.length} طالب غير مكتمل)`;
        reason =
          daysUntilExam === 0
            ? `موعد الامتحان اليوم، وما زال ${incompleteStudents.length} من أصل ${snapshots.length} طالب لم يكملوا حل أسئلة الهيكل.`
            : `تجاوز موعد الامتحان (${structure.examDate}) وما زال ${incompleteStudents.length} طالب لم يكملوا الهيكل.`;
      } else if (daysUntilExam <= 2) {
        headline = `تنبيه عاجل (${countdownLabel}): هيكل «${structure.title}»`;
        reason = `اقترب الامتحان جداً ولم يكمل ${incompleteStudents.length} طالب الحل بعد (منهم ${laggingStudents.length} طالب دون 50%).`;
      } else if (daysUntilExam <= 7) {
        headline = `استعداد للامتحان (${countdownLabel}): هيكل «${structure.title}»`;
        reason = `يوجد ${incompleteStudents.length} طالب غير مكتمل في هذا الهيكل بمتوسط إنجاز عام ${avgCompletionPct}%.`;
      } else {
        headline = `تنبيه مبكر (${countdownLabel}): هيكل «${structure.title}»`;
        reason = `تذكير وقائي لمتابعة ${incompleteStudents.length} طالب لاستكمال الأسئلة قبل موعد الامتحان (${structure.examDate}).`;
      }
    } else if (status === 'studied_not_examined') {
      headline = `انتهت الدراسة وبانتظار الامتحان: «${structure.title}»`;
      reason = `تم الانتهاء من شرح الهيكل ولم يُعقد الامتحان بعد، وهناك ${incompleteStudents.length} طالب لم يكتمل حلهم.`;
    } else {
      headline = `متابعة طلاب متأخرين في هيكل «${structure.title}»`;
      reason = `يوجد ${laggingStudents.length} طالب إنجازهم أقل من 50% (يمكنك تحديد موعد الامتحان لتفعيل العد التنازلي اليومي).`;
    }

    alerts.push({
      id: `alert_${structure.id}`,
      structure,
      severity,
      daysUntilExam,
      countdownLabel,
      headline,
      reason,
      totalEligibleCount: snapshots.length,
      completedStudentsCount,
      incompleteStudents,
      laggingStudents,
      notStartedStudents,
      avgCompletionPct,
      avgAccuracyPct,
      progressByStudentMap,
    });
  }

  const severityOrder: Record<SmartAlertSeverity, number> = {
    critical: 0,
    warning: 1,
    needs_attention: 2,
    upcoming: 3,
  };

  return alerts.sort((a, b) => {
    const sDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (sDiff !== 0) return sDiff;
    if (a.daysUntilExam !== null && b.daysUntilExam !== null) {
      return a.daysUntilExam - b.daysUntilExam;
    }
    if (a.daysUntilExam !== null) return -1;
    if (b.daysUntilExam !== null) return 1;
    return a.avgCompletionPct - b.avgCompletionPct;
  });
}
