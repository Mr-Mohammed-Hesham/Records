import { ExamStructure, StructureCompletionStatus } from '../types';

export type StructureStatusFilter = 'all' | StructureCompletionStatus;

export interface StructureStatusMeta {
  id: StructureCompletionStatus;
  label: string;
  shortLabel: string;
  description: string;
  badgeClass: string;
  dotColor: string;
  activeBtnClass: string;
}

export const STRUCTURE_STATUS_META: Record<StructureCompletionStatus, StructureStatusMeta> = {
  ongoing: {
    id: 'ongoing',
    label: 'مستمر وجاري الدراسة',
    shortLabel: 'مستمر / جاري الدراسة',
    description: 'الهيكل ما زال قيد التدريس والمراجعة ولم يُعقد امتحان المادة النهائي بعد',
    badgeClass:
      'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    dotColor: 'bg-emerald-500',
    activeBtnClass:
      'bg-emerald-600 text-white border-emerald-600 shadow-xs shadow-emerald-500/20',
  },
  completed: {
    id: 'completed',
    label: 'انتهى وتم امتحان المادة',
    shortLabel: 'منتهي / تم الامتحان',
    description: 'تم الانتهاء من تدريس الهيكل وأُجري امتحان المادة الخاص به',
    badgeClass:
      'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    dotColor: 'bg-indigo-500',
    activeBtnClass:
      'bg-indigo-600 text-white border-indigo-600 shadow-xs shadow-indigo-500/20',
  },
};

export function getEffectiveStructureStatus(
  structure?: Pick<ExamStructure, 'completionStatus'> | null
): StructureCompletionStatus {
  return structure?.completionStatus === 'completed' ? 'completed' : 'ongoing';
}

export function getStructureStatusLabel(
  structure?: Pick<ExamStructure, 'completionStatus' | 'completedAt'> | null,
  short = false
): string {
  const eff = getEffectiveStructureStatus(structure);
  const base = short ? STRUCTURE_STATUS_META[eff].shortLabel : STRUCTURE_STATUS_META[eff].label;
  if (eff === 'completed' && structure?.completedAt) {
    return `${base} (${structure.completedAt})`;
  }
  return base;
}

export function getStructureCompletionFilterLabel(
  filter: StructureStatusFilter | undefined
): string {
  if (filter === 'ongoing') return 'الهياكل المستمرة وجاري دراستها فقط';
  if (filter === 'completed') return 'الهياكل المنتهية وتم امتحانها فقط';
  return 'جميع الهياكل (المستمرة والمنتهية)';
}
