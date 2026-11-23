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

export const STRUCTURE_STATUS_ORDER: StructureCompletionStatus[] = [
  'ongoing',
  'studied_not_examined',
  'completed',
];

export const STRUCTURE_STATUS_META: Record<StructureCompletionStatus, StructureStatusMeta> = {
  ongoing: {
    id: 'ongoing',
    label: 'مستمر وجاري الدراسة',
    shortLabel: 'مستمر / جاري الدراسة',
    description: 'الهيكل ما زال قيد التدريس والمراجعة ولم تنتهِ دراسته بعد',
    badgeClass:
      'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    dotColor: 'bg-emerald-500',
    activeBtnClass:
      'bg-emerald-600 text-white border-emerald-600 shadow-xs shadow-emerald-500/20',
  },
  studied_not_examined: {
    id: 'studied_not_examined',
    label: 'منتهي دراسته ولم يتم الامتحان بعد',
    shortLabel: 'منتهي دراسة / لم يُمتحن',
    description: 'تم الانتهاء من دراسة وشرح الهيكل بالكامل وبانتظار عقد امتحان المادة',
    badgeClass:
      'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    dotColor: 'bg-amber-500',
    activeBtnClass:
      'bg-amber-600 text-white border-amber-600 shadow-xs shadow-amber-500/20',
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
  if (structure?.completionStatus === 'completed') return 'completed';
  if (structure?.completionStatus === 'studied_not_examined') return 'studied_not_examined';
  return 'ongoing';
}

export function getNextStructureStatus(
  current: StructureCompletionStatus
): StructureCompletionStatus {
  if (current === 'ongoing') return 'studied_not_examined';
  if (current === 'studied_not_examined') return 'completed';
  return 'ongoing';
}

export function getStructureStatusLabel(
  structure?: Pick<ExamStructure, 'completionStatus' | 'completedAt'> | null,
  short = false
): string {
  const eff = getEffectiveStructureStatus(structure);
  const base = short ? STRUCTURE_STATUS_META[eff].shortLabel : STRUCTURE_STATUS_META[eff].label;
  if (eff !== 'ongoing' && structure?.completedAt) {
    return `${base} (${structure.completedAt})`;
  }
  return base;
}

export function getStructureCompletionFilterLabel(
  filter: StructureStatusFilter | undefined
): string {
  if (filter === 'ongoing') return 'الهياكل المستمرة وجاري دراستها فقط';
  if (filter === 'studied_not_examined') {
    return 'الهياكل المنتهية دراستها ولم يُمتحن فيها بعد فقط';
  }
  if (filter === 'completed') return 'الهياكل المنتهية وتم امتحانها فقط';
  return 'جميع الهياكل (كافة الحالات)';
}
