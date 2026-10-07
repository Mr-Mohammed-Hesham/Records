/**
 * نظام حفظ التقدم وآخر نشاط في المنصة (Activity & Progress Persistence)
 * يتيح للمعلم الاستمرار من حيث توقف في أي نشاط أو البدء من جديد بضغطة زر
 */

export interface PlatformLastActivity {
  view?: 'dashboard' | 'students' | 'exams' | 'reports' | 'settings' | 'profile';
  tab?: string;
  studentId?: string;
  studentName?: string;
  examId?: string;
  examTitle?: string;
  studentsTab?: 'all' | 'active' | 'completed' | 'inactive';
  reportType?: string;
  description?: string;
  actionLabel?: string;
  timestamp: string;
}

const KEYS: Record<string, string> = {
  LAST_ACTIVITY: 'mh_platform_last_activity_v1',
  MAIN_NAV_STATE: 'mh_main_nav_state_v1',
  STUDENTS_VIEW: 'mh_students_view_state_v1',
  STUDENTS_VIEW_STATE: 'mh_students_view_state_v1',
  EXAMS_VIEW: 'mh_exams_view_state_v1',
  EXAMS_VIEW_STATE: 'mh_exams_view_state_v1',
  REPORTS_VIEW: 'mh_reports_view_state_v1',
  REPORTS_VIEW_STATE: 'mh_reports_view_state_v1',
  HONOR_BOARD_CONFIG: 'mh_honor_board_config_v1',
  EXCEL_EXPORT_CONFIG: 'mh_excel_export_config_v1',
  STUDENT_FORM_DRAFT: 'mh_student_form_draft_v1',
  EXAM_FORM_DRAFT: 'mh_exam_form_draft_v1',
  SCORE_DRAFT_PREFIX: 'mh_score_entry_draft_v1_',
  PROFILE_CHART_TYPE: 'mh_profile_chart_type_v1',
};

export function savePlatformActivity(activity: Omit<PlatformLastActivity, 'timestamp'>): void {
  try {
    const payload: PlatformLastActivity = {
      ...activity,
      view: activity.view || (activity.tab as any) || 'dashboard',
      description: activity.description || activity.actionLabel || '',
      actionLabel: activity.actionLabel || activity.description || '',
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(KEYS.LAST_ACTIVITY, JSON.stringify(payload));
  } catch {
    // ignore storage errors
  }
}

export const recordLastActivity = savePlatformActivity;

export function getPlatformLastActivity(): PlatformLastActivity | null {
  try {
    const raw = localStorage.getItem(KEYS.LAST_ACTIVITY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export const getLastActivity = getPlatformLastActivity;

export function clearPlatformLastActivity(): void {
  try {
    localStorage.removeItem(KEYS.LAST_ACTIVITY);
  } catch {
    // ignore
  }
}

export const clearLastActivity = clearPlatformLastActivity;

export function saveViewState<T>(key: string, state: T): void {
  try {
    const storageKey = KEYS[key] || `mh_view_state_${key}`;
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function loadViewState<T>(key: string, defaultVal: T): T {
  try {
    const storageKey = KEYS[key] || `mh_view_state_${key}`;
    const raw = localStorage.getItem(storageKey);
    if (!raw) return defaultVal;
    const parsed = JSON.parse(raw);
    if (defaultVal && typeof defaultVal === 'object' && !Array.isArray(defaultVal)) {
      return { ...defaultVal, ...parsed };
    }
    return parsed ?? defaultVal;
  } catch {
    return defaultVal;
  }
}

export function clearViewState(key: string): void {
  try {
    const storageKey = KEYS[key] || `mh_view_state_${key}`;
    localStorage.removeItem(storageKey);
  } catch {
    // ignore
  }
}

export function saveScoreEntryDraft(
  examId: string,
  draftRows: Record<string, { score: string; notes: string }>
): void {
  if (!examId) return;
  try {
    localStorage.setItem(
      `${KEYS.SCORE_DRAFT_PREFIX}${examId}`,
      JSON.stringify({
        examId,
        rows: draftRows,
        updatedAt: new Date().toISOString(),
      })
    );
  } catch {
    // ignore
  }
}

export function loadScoreEntryDraft(
  examId: string
): { rows: Record<string, { score: string; notes: string }>; updatedAt: string } | null {
  if (!examId) return null;
  try {
    const raw = localStorage.getItem(`${KEYS.SCORE_DRAFT_PREFIX}${examId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.rows || Object.keys(parsed.rows).length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearScoreEntryDraft(examId: string): void {
  if (!examId) return;
  try {
    localStorage.removeItem(`${KEYS.SCORE_DRAFT_PREFIX}${examId}`);
  } catch {
    // ignore
  }
}

export function clearAllActivityAndDrafts(): void {
  try {
    Object.values(KEYS).forEach((k) => {
      if (k !== KEYS.SCORE_DRAFT_PREFIX) {
        localStorage.removeItem(k);
      }
    });
    // Also remove any score drafts
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(KEYS.SCORE_DRAFT_PREFIX)) {
        toRemove.push(k);
      }
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}
