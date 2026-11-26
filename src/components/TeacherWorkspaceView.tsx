import React, { useMemo, useState } from 'react';
import {
  Kanban,
  ListTodo,
  StickyNote,
  Plus,
  CheckCircle2,
  Circle,
  Pin,
  PinOff,
  Trash2,
  Edit3,
  Calendar,
  Search,
  Layers,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Filter,
  Download,
} from 'lucide-react';
import {
  ExamStructure,
  TeacherNote,
  TeacherNoteChecklistItem,
  TeacherNoteColor,
  TeacherTask,
  TeacherTaskCategory,
  TeacherTaskPriority,
  TeacherTaskStatus,
  TeacherTaskSubtask,
} from '../types';
import { getTodayLocalDateKey } from '../utils/smartAlerts';
import { EgyptFlagIcon, UKFlagIcon, useLanguage } from '../utils/i18n';
import {
  WorkspaceExportScope,
  WorkspaceNotesFilter,
  WorkspaceTaskStatusFilter,
  WorkspaceTodoFilter,
  exportTeacherWorkspaceExcel,
  filterNotesForWorkspaceExport,
  filterTasksForWorkspaceExport,
  filterTodoItemsForWorkspaceExport,
} from '../utils/excel';

interface TeacherWorkspaceViewProps {
  tasks: TeacherTask[];
  notes: TeacherNote[];
  structures: ExamStructure[];
  teacherName?: string;
  onSaveTask: (task: Omit<TeacherTask, 'id'> & { id?: string }) => Promise<TeacherTask>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onSaveNote: (note: Omit<TeacherNote, 'id'> & { id?: string }) => Promise<TeacherNote>;
  onDeleteNote: (noteId: string) => Promise<void>;
  onNotify?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const PRIORITY_META: Record<
  TeacherTaskPriority,
  { labelAr: string; labelEn: string; badgeClass: string; order: number }
> = {
  high: {
    labelAr: 'عاجلة',
    labelEn: 'Urgent',
    badgeClass:
      'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    order: 0,
  },
  medium: {
    labelAr: 'متوسطة',
    labelEn: 'Medium',
    badgeClass:
      'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    order: 1,
  },
  low: {
    labelAr: 'عادية',
    labelEn: 'Normal',
    badgeClass:
      'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    order: 2,
  },
};

const CATEGORY_META: Record<TeacherTaskCategory, { ar: string; en: string }> = {
  structures: { ar: 'الهياكل', en: 'Structures' },
  exams: { ar: 'الامتحانات', en: 'Exams' },
  students: { ar: 'الطلاب', en: 'Students' },
  finance: { ar: 'المالية', en: 'Finance' },
  general: { ar: 'عام', en: 'General' },
};

const NOTE_COLOR_CLASSES: Record<
  TeacherNoteColor,
  { card: string; dot: string; labelAr: string; labelEn: string }
> = {
  amber: {
    card: 'bg-amber-50/70 dark:bg-amber-950/25 border-amber-200 dark:border-amber-800/60',
    dot: 'bg-amber-500',
    labelAr: 'ذهبي',
    labelEn: 'Amber',
  },
  sky: {
    card: 'bg-sky-50/70 dark:bg-sky-950/25 border-sky-200 dark:border-sky-800/60',
    dot: 'bg-sky-500',
    labelAr: 'أزرق',
    labelEn: 'Sky',
  },
  emerald: {
    card: 'bg-emerald-50/70 dark:bg-emerald-950/25 border-emerald-200 dark:border-emerald-800/60',
    dot: 'bg-emerald-500',
    labelAr: 'أخضر',
    labelEn: 'Emerald',
  },
  rose: {
    card: 'bg-rose-50/70 dark:bg-rose-950/25 border-rose-200 dark:border-rose-800/60',
    dot: 'bg-rose-500',
    labelAr: 'وردي',
    labelEn: 'Rose',
  },
  slate: {
    card: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
    dot: 'bg-slate-500',
    labelAr: 'كلاسيك',
    labelEn: 'Classic',
  },
};

const KANBAN_COLUMNS: Array<{
  id: TeacherTaskStatus;
  titleAr: string;
  titleEn: string;
  subtitleAr: string;
  subtitleEn: string;
  headerClass: string;
}> = [
  {
    id: 'todo',
    titleAr: 'المطلوبة (للتنفيذ)',
    titleEn: 'Required (To-Do)',
    subtitleAr: 'مهام بانتظار البدء',
    subtitleEn: 'Tasks waiting to start',
    headerClass: 'text-slate-800 dark:text-slate-100',
  },
  {
    id: 'in_progress',
    titleAr: 'قيد التنفيذ',
    titleEn: 'In Progress',
    subtitleAr: 'يعمل عليها المعلم حالياً',
    subtitleEn: 'Currently in progress',
    headerClass: 'text-amber-700 dark:text-amber-300',
  },
  {
    id: 'done',
    titleAr: 'مكتملة',
    titleEn: 'Completed',
    subtitleAr: 'تم إنجازها بنجاح',
    subtitleEn: 'Finished tasks',
    headerClass: 'text-emerald-700 dark:text-emerald-300',
  },
];

export const TeacherWorkspaceView: React.FC<TeacherWorkspaceViewProps> = ({
  tasks,
  notes,
  structures,
  teacherName = 'Mr. Mohamed Hesham',
  onSaveTask,
  onDeleteTask,
  onSaveNote,
  onDeleteNote,
  onNotify,
}) => {
  const { lang, dir, tr } = useLanguage();
  const [activeTab, setActiveTab] = useState<'kanban' | 'todo' | 'notes'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TeacherTaskPriority>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | TeacherTaskCategory>('all');
  const [mobileKanbanCol, setMobileKanbanCol] = useState<TeacherTaskStatus>('todo');

  // Task Modal State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TeacherTask | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskStatus, setTaskStatus] = useState<TeacherTaskStatus>('todo');
  const [taskPriority, setTaskPriority] = useState<TeacherTaskPriority>('medium');
  const [taskCategory, setTaskCategory] = useState<TeacherTaskCategory>('general');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskLinkedStructId, setTaskLinkedStructId] = useState('');
  const [taskSubtasks, setTaskSubtasks] = useState<TeacherTaskSubtask[]>([]);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [savingTask, setSavingTask] = useState(false);

  // Dragging state
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

  // To-Do Quick Add State
  const [quickTodoText, setQuickTodoText] = useState('');
  const [quickTodoPriority, setQuickTodoPriority] = useState<TeacherTaskPriority>('medium');
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [creatingChecklist, setCreatingChecklist] = useState(false);
  const [perListInput, setPerListInput] = useState<Record<string, string>>({});

  // Rich Note Modal State
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<TeacherNote | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteColor, setNoteColor] = useState<TeacherNoteColor>('amber');
  const [noteCategory, setNoteCategory] = useState('');
  const [notePinned, setNotePinned] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  // Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportScope, setExportScope] = useState<WorkspaceExportScope>('all');
  const [exportTaskStatus, setExportTaskStatus] = useState<WorkspaceTaskStatusFilter>('all');
  const [exportPriority, setExportPriority] = useState<'all' | TeacherTaskPriority>('all');
  const [exportCategory, setExportCategory] = useState<'all' | TeacherTaskCategory>('all');
  const [exportTodoFilter, setExportTodoFilter] = useState<WorkspaceTodoFilter>('all');
  const [exportNotesFilter, setExportNotesFilter] = useState<WorkspaceNotesFilter>('all');
  const [exportLang, setExportLang] = useState<'ar' | 'en'>(lang);

  const todayKey = getTodayLocalDateKey();

  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tasks
      .filter((t) => {
        if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
        if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
        if (q) {
          const hay = `${t.title} ${t.description || ''} ${t.linkedStructureTitle || ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const pDiff =
          PRIORITY_META[a.priority].order - PRIORITY_META[b.priority].order;
        if (pDiff !== 0) return pDiff;
        return (
          new Date(b.updatedAt || b.createdAt).getTime() -
          new Date(a.updatedAt || a.createdAt).getTime()
        );
      });
  }, [tasks, priorityFilter, categoryFilter, searchQuery]);

  const todoLists = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return notes
      .filter((n) => n.noteType === 'todo_list')
      .filter((n) => {
        if (!q) return true;
        const itemsText = (n.checklistItems || []).map((i) => i.text).join(' ');
        return `${n.title} ${itemsText}`.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
        return (
          new Date(b.updatedAt || b.createdAt).getTime() -
          new Date(a.updatedAt || a.createdAt).getTime()
        );
      });
  }, [notes, searchQuery]);

  const richNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return notes
      .filter((n) => n.noteType !== 'todo_list')
      .filter((n) => {
        if (!q) return true;
        return `${n.title} ${n.content} ${n.category || ''}`
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => {
        if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
        return (
          new Date(b.updatedAt || b.createdAt).getTime() -
          new Date(a.updatedAt || a.createdAt).getTime()
        );
      });
  }, [notes, searchQuery]);

  const stats = useMemo(() => {
    const todoCount = tasks.filter((t) => t.status === 'todo').length;
    const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
    const doneCount = tasks.filter((t) => t.status === 'done').length;
    const totalTodoItems = todoLists.reduce(
      (acc, l) => acc + (l.checklistItems?.length || 0),
      0
    );
    const doneTodoItems = todoLists.reduce(
      (acc, l) => acc + (l.checklistItems || []).filter((i) => i.done).length,
      0
    );
    return {
      todoCount,
      inProgressCount,
      doneCount,
      totalTodoItems,
      doneTodoItems,
      notesCount: richNotes.length,
    };
  }, [tasks, todoLists, richNotes]);

  const exportPreview = useMemo(() => {
    const tCount =
      exportScope === 'all' || exportScope === 'tasks_only'
        ? filterTasksForWorkspaceExport(tasks, {
            taskStatusFilter: exportTaskStatus,
            priorityFilter: exportPriority,
            categoryFilter: exportCategory,
          }).length
        : 0;
    const tdCount =
      exportScope === 'all' || exportScope === 'todo_only'
        ? filterTodoItemsForWorkspaceExport(notes, exportTodoFilter).length
        : 0;
    const nCount =
      exportScope === 'all' || exportScope === 'notes_only'
        ? filterNotesForWorkspaceExport(notes, exportNotesFilter).length
        : 0;
    return { tCount, tdCount, nCount };
  }, [
    exportScope,
    exportTaskStatus,
    exportPriority,
    exportCategory,
    exportTodoFilter,
    exportNotesFilter,
    tasks,
    notes,
  ]);

  const openExportModal = () => {
    setExportLang(lang);
    setIsExportModalOpen(true);
  };

  const handleRunWorkspaceExport = () => {
    exportTeacherWorkspaceExcel({
      tasks,
      notes,
      teacherName,
      options: {
        scope: exportScope,
        taskStatusFilter: exportTaskStatus,
        priorityFilter: exportPriority,
        categoryFilter: exportCategory,
        todoFilter: exportTodoFilter,
        notesFilter: exportNotesFilter,
        exportLang,
      },
    });
    setIsExportModalOpen(false);
    onNotify?.(
      tr('تم تصدير شيت مساحة عمل المعلم إلى Excel بنجاح', 'Teacher Workspace Excel exported successfully'),
      'success'
    );
  };

  const openNewTaskModal = (initialStatus: TeacherTaskStatus = 'todo') => {
    setEditingTask(null);
    setTaskTitle('');
    setTaskDesc('');
    setTaskStatus(initialStatus);
    setTaskPriority('medium');
    setTaskCategory('general');
    setTaskDueDate('');
    setTaskLinkedStructId('');
    setTaskSubtasks([]);
    setNewSubtaskText('');
    setIsTaskModalOpen(true);
  };

  const openEditTaskModal = (task: TeacherTask) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDesc(task.description || '');
    setTaskStatus(task.status);
    setTaskPriority(task.priority);
    setTaskCategory(task.category);
    setTaskDueDate(task.dueDate || '');
    setTaskLinkedStructId(task.linkedStructureId || '');
    setTaskSubtasks(task.subtasks || []);
    setNewSubtaskText('');
    setIsTaskModalOpen(true);
  };

  const handleSaveTaskForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    setSavingTask(true);
    try {
      const linkedStruct = structures.find((s) => s.id === taskLinkedStructId);
      await onSaveTask({
        ...(editingTask ? { id: editingTask.id, createdAt: editingTask.createdAt } : {}),
        title: taskTitle.trim(),
        description: taskDesc.trim() || undefined,
        status: taskStatus,
        priority: taskPriority,
        category: taskCategory,
        dueDate: taskDueDate || undefined,
        linkedStructureId: linkedStruct?.id || undefined,
        linkedStructureTitle: linkedStruct?.title || undefined,
        subtasks: taskSubtasks,
        createdAt: editingTask?.createdAt || new Date().toISOString(),
      });
      setIsTaskModalOpen(false);
      onNotify?.(
        editingTask
          ? tr('تم تحديث المهمة بنجاح', 'Task updated successfully')
          : tr('تمت إضافة المهمة إلى مساحة عمل المعلم', 'Task added to Teacher Workspace'),
        'success'
      );
    } finally {
      setSavingTask(false);
    }
  };

  const handleMoveTaskStatus = async (
    task: TeacherTask,
    nextStatus: TeacherTaskStatus
  ) => {
    if (task.status === nextStatus) return;
    await onSaveTask({
      ...task,
      status: nextStatus,
    });
  };

  const handleToggleSubtask = async (
    task: TeacherTask,
    subtaskId: string
  ) => {
    const nextSubs = (task.subtasks || []).map((st) =>
      st.id === subtaskId ? { ...st, done: !st.done } : st
    );
    await onSaveTask({ ...task, subtasks: nextSubs });
  };

  // Instant Daily Quick To-Do List helpers
  const primaryDailyTodoList = todoLists[0] || null;

  const handleQuickAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = quickTodoText.trim();
    if (!text) return;

    const newItem: TeacherNoteChecklistItem = {
      id: `td_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text,
      done: false,
      priority: quickTodoPriority,
      dueDate: todayKey,
    };

    if (primaryDailyTodoList) {
      await onSaveNote({
        ...primaryDailyTodoList,
        checklistItems: [newItem, ...(primaryDailyTodoList.checklistItems || [])],
      });
    } else {
      await onSaveNote({
        title: tr('قائمة المهام اليومية (To-Do)', 'Daily To-Do List'),
        content: '',
        noteType: 'todo_list',
        color: 'amber',
        pinned: true,
        checklistItems: [newItem],
        createdAt: new Date().toISOString(),
      });
    }
    setQuickTodoText('');
    onNotify?.(tr('تمت إضافة البند إلى قائمة To-Do', 'Item added to To-Do list'), 'success');
  };

  const handleAddItemToSpecificList = async (list: TeacherNote) => {
    const text = (perListInput[list.id] || '').trim();
    if (!text) return;
    const newItem: TeacherNoteChecklistItem = {
      id: `td_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text,
      done: false,
      priority: 'medium',
    };
    await onSaveNote({
      ...list,
      checklistItems: [...(list.checklistItems || []), newItem],
    });
    setPerListInput((prev) => ({ ...prev, [list.id]: '' }));
  };

  const handleToggleChecklistItem = async (
    list: TeacherNote,
    itemId: string
  ) => {
    const nextItems = (list.checklistItems || []).map((item) =>
      item.id === itemId ? { ...item, done: !item.done } : item
    );
    await onSaveNote({ ...list, checklistItems: nextItems });
  };

  const handleDeleteChecklistItem = async (
    list: TeacherNote,
    itemId: string
  ) => {
    const nextItems = (list.checklistItems || []).filter(
      (item) => item.id !== itemId
    );
    await onSaveNote({ ...list, checklistItems: nextItems });
  };

  const handlePromoteTodoToBoard = async (
    list: TeacherNote,
    item: TeacherNoteChecklistItem
  ) => {
    await onSaveTask({
      title: item.text,
      description: `${tr('محوّل من قائمة:', 'Promoted from list:')} ${list.title}`,
      status: item.done ? 'done' : 'todo',
      priority: item.priority || 'medium',
      category: 'general',
      dueDate: item.dueDate,
      createdAt: new Date().toISOString(),
    });
    onNotify?.(
      tr('تم تحويل البند إلى بطاقة في لوحة المهام', 'Promoted item to Tasks Board'),
      'success'
    );
  };

  const handleCreateCustomChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistTitle.trim()) return;
    setCreatingChecklist(true);
    try {
      await onSaveNote({
        title: newChecklistTitle.trim(),
        content: '',
        noteType: 'todo_list',
        color: 'sky',
        pinned: false,
        checklistItems: [],
        createdAt: new Date().toISOString(),
      });
      setNewChecklistTitle('');
      onNotify?.(
        tr('تم إنشاء قائمة To-Do جديدة بنجاح', 'New To-Do list created successfully'),
        'success'
      );
    } finally {
      setCreatingChecklist(false);
    }
  };

  // Rich Notes handlers
  const openNewNoteModal = () => {
    setEditingNote(null);
    setNoteTitle('');
    setNoteContent('');
    setNoteColor('amber');
    setNoteCategory(tr('عام', 'General'));
    setNotePinned(false);
    setIsNoteModalOpen(true);
  };

  const openEditNoteModal = (note: TeacherNote) => {
    setEditingNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteColor(note.color || 'amber');
    setNoteCategory(note.category || tr('عام', 'General'));
    setNotePinned(Boolean(note.pinned));
    setIsNoteModalOpen(true);
  };

  const handleSaveNoteForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() && !noteContent.trim()) return;
    setSavingNote(true);
    try {
      await onSaveNote({
        ...(editingNote ? { id: editingNote.id, createdAt: editingNote.createdAt } : {}),
        title: noteTitle.trim() || tr('ملاحظة سريعة', 'Quick Note'),
        content: noteContent.trim(),
        noteType: 'note',
        color: noteColor,
        category: noteCategory.trim() || tr('عام', 'General'),
        pinned: notePinned,
        createdAt: editingNote?.createdAt || new Date().toISOString(),
      });
      setIsNoteModalOpen(false);
      onNotify?.(
        editingNote
          ? tr('تم تحديث الملاحظة', 'Note updated')
          : tr('تم حفظ ملاحظة المعلم بنجاح', 'Teacher note saved'),
        'success'
      );
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <div id="teacher-workspace-view" className="space-y-5 text-start" dir={dir}>
      {/* Header & Summary Strip */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-slate-950 flex items-center justify-center shadow-sm shrink-0">
              <Kanban className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                {tr('مساحة عمل المعلم', 'Teacher Workspace')}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {tr(
                  'إدارة المهام اليومية وقوائم To-Do والملاحظات الخاصة وتصدير التقارير، محفوظة ومتزامنة عبر السحابة',
                  'Manage daily tasks, To-Do checklists, private teacher notes, and filtered Excel exports synced to cloud'
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              id="btn-workspace-export-excel"
              onClick={openExportModal}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-black text-xs cursor-pointer transition whitespace-nowrap"
              title={tr('تصدير شيتات Excel للمهام والملاحظات مع فلترة', 'Export filtered Tasks & Notes Excel sheets')}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{tr('تصدير Excel', 'Export Excel')}</span>
            </button>

            <button
              type="button"
              id="btn-workspace-add-task"
              onClick={() => openNewTaskModal('todo')}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer transition whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>{tr('إضافة مهمة جديدة', 'Add New Task')}</span>
            </button>

            <button
              type="button"
              onClick={openNewNoteModal}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 cursor-pointer transition whitespace-nowrap"
            >
              <StickyNote className="w-4 h-4 text-amber-400" />
              <span>{tr('ملاحظة جديدة', 'New Note')}</span>
            </button>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              {tr('المطلوبة (للتنفيذ)', 'Required (To-Do)')}
            </div>
            <div className="text-2xl font-black font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
              {stats.todoCount}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-800/60">
            <div className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
              {tr('قيد العمل حالياً', 'In Progress')}
            </div>
            <div className="text-2xl font-black font-mono tabular-nums text-amber-800 dark:text-amber-200 mt-0.5">
              {stats.inProgressCount}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-800/60">
            <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
              {tr('مهام مكتملة', 'Completed Tasks')}
            </div>
            <div className="text-2xl font-black font-mono tabular-nums text-emerald-800 dark:text-emerald-200 mt-0.5">
              {stats.doneCount}
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-sky-50/70 dark:bg-sky-950/25 border border-sky-200 dark:border-sky-800/60">
            <div className="text-[11px] font-bold text-sky-700 dark:text-sky-300">
              {tr('To-Do والملاحظات', 'To-Do & Notes')}
            </div>
            <div className="text-2xl font-black font-mono tabular-nums text-sky-800 dark:text-sky-200 mt-0.5">
              {stats.doneTodoItems}/{stats.totalTodoItems} · {stats.notesCount}
            </div>
          </div>
        </div>

        {/* Sub-Tabs + Search Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-x-auto no-scrollbar max-w-full">
            <button
              type="button"
              onClick={() => setActiveTab('kanban')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer whitespace-nowrap ${
                activeTab === 'kanban'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <Kanban className="w-4 h-4 text-amber-500" />
              <span>{tr('لوحة المهام', 'Tasks Board')}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('todo')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer whitespace-nowrap ${
                activeTab === 'todo'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <ListTodo className="w-4 h-4 text-sky-500" />
              <span>To-Do List</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('notes')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer whitespace-nowrap ${
                activeTab === 'notes'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <StickyNote className="w-4 h-4 text-emerald-500" />
              <span>
                {tr(`ملاحظات المعلم (${richNotes.length})`, `Teacher Notes (${richNotes.length})`)}
              </span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-56">
              <Search
                className={`w-4 h-4 text-slate-400 absolute ${
                  lang === 'ar' ? 'right-3' : 'left-3'
                } top-2.5 pointer-events-none`}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={tr('بحث في المهام والملاحظات...', 'Search tasks & notes...')}
                className={`w-full ${
                  lang === 'ar' ? 'pr-9 pl-3' : 'pl-9 pr-3'
                } py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white`}
              />
            </div>

            {activeTab === 'kanban' && (
              <>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as any)}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <option value="all">{tr('كل الأولويات', 'All Priorities')}</option>
                  <option value="high">{tr('عاجلة فقط', 'Urgent Only')}</option>
                  <option value="medium">{tr('متوسطة', 'Medium')}</option>
                  <option value="low">{tr('عادية', 'Normal')}</option>
                </select>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as any)}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <option value="all">{tr('كل التصنيفات', 'All Categories')}</option>
                  {Object.entries(CATEGORY_META).map(([k, v]) => (
                    <option key={k} value={k}>
                      {lang === 'ar' ? v.ar : v.en}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
        </div>
      </div>

      {/* TAB 1: TASK BOARD */}
      {activeTab === 'kanban' && (
        <div className="space-y-4">
          {/* Mobile column selector */}
          <div className="lg:hidden grid grid-cols-3 gap-1.5 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
            {KANBAN_COLUMNS.map((col) => {
              const count = filteredTasks.filter((t) => t.status === col.id).length;
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => setMobileKanbanCol(col.id)}
                  className={`py-2 px-2 rounded-xl text-xs font-black transition cursor-pointer ${
                    mobileKanbanCol === col.id
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {lang === 'ar' ? col.titleAr : col.titleEn} ({count})
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            {KANBAN_COLUMNS.map((col) => {
              const colTasks = filteredTasks.filter((t) => t.status === col.id);
              const hiddenOnMobile = mobileKanbanCol !== col.id;
              const colTitle = lang === 'ar' ? col.titleAr : col.titleEn;

              return (
                <div
                  key={col.id}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={async (e) => {
                    e.preventDefault();
                    if (!draggingTaskId) return;
                    const dragged = tasks.find((t) => t.id === draggingTaskId);
                    setDraggingTaskId(null);
                    if (dragged && dragged.status !== col.id) {
                      await handleMoveTaskStatus(dragged, col.id);
                    }
                  }}
                  className={`${
                    hiddenOnMobile ? 'hidden lg:flex' : 'flex'
                  } flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 min-h-[360px]`}
                >
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <h3 className={`text-sm font-black ${col.headerClass}`}>
                        {colTitle}{' '}
                        <span className="font-mono tabular-nums text-xs opacity-75">
                          ({colTasks.length})
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {lang === 'ar' ? col.subtitleAr : col.subtitleEn}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openNewTaskModal(col.id)}
                      className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                      title={tr(`إضافة مهمة في ${colTitle}`, `Add task in ${colTitle}`)}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {colTasks.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                      <p>{tr('لا توجد مهام في هذا العمود', 'No tasks in this column')}</p>
                      <button
                        type="button"
                        onClick={() => openNewTaskModal(col.id)}
                        className="mt-2 text-amber-600 dark:text-amber-400 font-bold hover:underline cursor-pointer"
                      >
                        + {tr('إضافة مهمة جديدة', 'Add New Task')}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {colTasks.map((task) => {
                        const pri = PRIORITY_META[task.priority];
                        const subs = task.subtasks || [];
                        const doneSubs = subs.filter((s) => s.done).length;
                        const isOverdue =
                          task.status !== 'done' &&
                          task.dueDate &&
                          task.dueDate < todayKey;

                        return (
                          <div
                            key={task.id}
                            draggable
                            onDragStart={() => setDraggingTaskId(task.id)}
                            onDragEnd={() => setDraggingTaskId(null)}
                            className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2.5 hover:border-amber-400 dark:hover:border-amber-500 transition cursor-grab active:cursor-grabbing"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                                <span
                                  className={`px-2 py-0.5 rounded-lg border font-bold ${pri.badgeClass}`}
                                >
                                  {lang === 'ar' ? pri.labelAr : pri.labelEn}
                                </span>
                                <span className="text-slate-500 dark:text-slate-400 font-bold">
                                  {lang === 'ar'
                                    ? CATEGORY_META[task.category].ar
                                    : CATEGORY_META[task.category].en}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => openEditTaskModal(task)}
                                  className="p-1 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 rounded-lg cursor-pointer"
                                  title={tr('تعديل المهمة', 'Edit Task')}
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteTask(task.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg cursor-pointer"
                                  title={tr('حذف المهمة', 'Delete Task')}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <div>
                              <h4
                                className={`text-sm font-black leading-snug ${
                                  task.status === 'done'
                                    ? 'line-through text-slate-400 dark:text-slate-500'
                                    : 'text-slate-900 dark:text-white'
                                }`}
                              >
                                {task.title}
                              </h4>
                              {task.description && (
                                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-3 leading-relaxed">
                                  {task.description}
                                </p>
                              )}
                            </div>

                            {task.linkedStructureTitle && (
                              <div className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                                <Layers className="w-3 h-3 shrink-0" />
                                <span className="truncate">{task.linkedStructureTitle}</span>
                              </div>
                            )}

                            {subs.length > 0 && (
                              <div className="space-y-1.5 pt-1 border-t border-slate-200/70 dark:border-slate-700/60">
                                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                  <span>{tr('الخطوات الفرعية', 'Subtasks')}</span>
                                  <span className="font-mono tabular-nums">
                                    {doneSubs}/{subs.length}
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  {subs.slice(0, 4).map((st) => (
                                    <button
                                      key={st.id}
                                      type="button"
                                      onClick={() => handleToggleSubtask(task, st.id)}
                                      className="w-full flex items-center gap-1.5 text-start text-[11px] cursor-pointer group"
                                    >
                                      {st.done ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                      ) : (
                                        <Circle className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-500 shrink-0" />
                                      )}
                                      <span
                                        className={`truncate ${
                                          st.done
                                            ? 'line-through text-slate-400'
                                            : 'text-slate-700 dark:text-slate-200'
                                        }`}
                                      >
                                        {st.text}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/70 dark:border-slate-700/60">
                              <span
                                className={`text-[11px] font-mono tabular-nums flex items-center gap-1 ${
                                  isOverdue
                                    ? 'text-rose-600 dark:text-rose-400 font-black'
                                    : 'text-slate-500 dark:text-slate-400'
                                }`}
                              >
                                <Calendar className="w-3 h-3" />
                                {task.dueDate
                                  ? isOverdue
                                    ? `${tr('متأخر:', 'Overdue:')} ${task.dueDate}`
                                    : task.dueDate
                                  : tr('بدون موعد', 'No due date')}
                              </span>

                              <div className="flex items-center gap-1">
                                {task.status !== 'todo' && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleMoveTaskStatus(
                                        task,
                                        task.status === 'done' ? 'in_progress' : 'todo'
                                      )
                                    }
                                    className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-200 hover:border-amber-400 cursor-pointer"
                                  >
                                    {task.status === 'done'
                                      ? tr('إرجاع', 'Reopen')
                                      : tr('للتنفيذ', 'Required')}
                                  </button>
                                )}
                                {task.status !== 'in_progress' && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleMoveTaskStatus(task, 'in_progress')
                                    }
                                    className="px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 text-[10px] font-bold cursor-pointer"
                                  >
                                    {tr('قيد العمل', 'In Progress')}
                                  </button>
                                )}
                                {task.status !== 'done' && (
                                  <button
                                    type="button"
                                    onClick={() => handleMoveTaskStatus(task, 'done')}
                                    className="px-2 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold cursor-pointer"
                                  >
                                    {tr('تم ✓', 'Done ✓')}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: QUICK TO-DO LISTS */}
      {activeTab === 'todo' && (
        <div className="space-y-4">
          {/* Ultra-fast Quick Add Bar */}
          <form
            onSubmit={handleQuickAddTodo}
            className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
          >
            <input
              type="text"
              value={quickTodoText}
              onChange={(e) => setQuickTodoText(e.target.value)}
              placeholder={tr(
                'أضف مهمة سريعة إلى To-Do (مثال: مراجعة أسئلة هيكل عاشر قبل الغد)...',
                'Add a quick To-Do item (e.g., review Grade 10 structure questions)...'
              )}
              className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white"
            />
            <select
              value={quickTodoPriority}
              onChange={(e) =>
                setQuickTodoPriority(e.target.value as TeacherTaskPriority)
              }
              className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <option value="high">{tr('أولوية عاجلة', 'Urgent Priority')}</option>
              <option value="medium">{tr('أولوية متوسطة', 'Medium Priority')}</option>
              <option value="low">{tr('عادية', 'Normal')}</option>
            </select>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer transition whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>{tr('إضافة سريعة', 'Quick Add')}</span>
            </button>
          </form>

          {/* Create additional checklist */}
          <form
            onSubmit={handleCreateCustomChecklist}
            className="flex flex-wrap items-center gap-2 px-1"
          >
            <input
              type="text"
              value={newChecklistTitle}
              onChange={(e) => setNewChecklistTitle(e.target.value)}
              placeholder={tr(
                'أو أنشئ قائمة To-Do مستقلة جديدة (مثلاً: تجهيزات الامتحان النهائي)...',
                'Or create a separate To-Do list (e.g., Final Exam Prep)...'
              )}
              className="flex-1 min-w-[220px] px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white"
            />
            <button
              type="submit"
              disabled={creatingChecklist || !newChecklistTitle.trim()}
              className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              + {tr('قائمة To-Do جديدة', 'New To-Do List')}
            </button>
          </form>

          {todoLists.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-2 text-slate-400">
              <ListTodo className="w-10 h-10 mx-auto text-sky-500" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                {tr('قائمة To-Do فارغة حالياً', 'Your To-Do list is currently empty')}
              </p>
              <p className="text-xs">
                {tr(
                  'اكتب أول بند في الخانة أعلاه ليتم حفظه ومزامنته مباشرة مع حسابك.',
                  'Type your first item above to save and sync it directly to your account.'
                )}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {todoLists.map((list) => {
                const items = list.checklistItems || [];
                const doneCount = items.filter((i) => i.done).length;
                const pct =
                  items.length > 0
                    ? Math.round((doneCount / items.length) * 100)
                    : 0;

                return (
                  <div
                    key={list.id}
                    className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white truncate">
                            {list.title}
                          </h3>
                          <span className="font-mono tabular-nums text-xs font-bold text-sky-600 dark:text-sky-400">
                            {doneCount}/{items.length} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1.5">
                          <div
                            style={{ width: `${pct}%` }}
                            className="h-full bg-sky-500 rounded-full transition-all"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            onSaveNote({ ...list, pinned: !list.pinned })
                          }
                          className={`p-1.5 rounded-lg cursor-pointer ${
                            list.pinned
                              ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
                              : 'text-slate-400 hover:text-amber-500'
                          }`}
                          title={
                            list.pinned
                              ? tr('إلغاء التثبيت', 'Unpin')
                              : tr('تثبيت بالرئيسية', 'Pin to Dashboard')
                          }
                        >
                          {list.pinned ? (
                            <Pin className="w-4 h-4" />
                          ) : (
                            <PinOff className="w-4 h-4" />
                          )}
                        </button>
                        {doneCount > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              onSaveNote({
                                ...list,
                                checklistItems: items.filter((i) => !i.done),
                              })
                            }
                            className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer hover:text-rose-600"
                          >
                            {tr(`حذف المنجز (${doneCount})`, `Clear Done (${doneCount})`)}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onDeleteNote(list.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                          title={tr('حذف القائمة', 'Delete List')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Add item directly inside this list */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={perListInput[list.id] || ''}
                        onChange={(e) =>
                          setPerListInput((prev) => ({
                            ...prev,
                            [list.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddItemToSpecificList(list);
                          }
                        }}
                        placeholder={tr('أضف بنداً هنا واضغط Enter...', 'Add item & press Enter...')}
                        className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddItemToSpecificList(list)}
                        className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold cursor-pointer"
                      >
                        {tr('أضف', 'Add')}
                      </button>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto">
                      {items.length === 0 ? (
                        <p className="py-5 text-center text-xs text-slate-400">
                          {tr('لا توجد بنود داخل هذه القائمة بعد.', 'No items in this list yet.')}
                        </p>
                      ) : (
                        items.map((item) => (
                          <div
                            key={item.id}
                            className="py-2 flex items-center justify-between gap-2 text-xs group"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                handleToggleChecklistItem(list, item.id)
                              }
                              className="flex items-center gap-2 text-start flex-1 min-w-0 cursor-pointer"
                            >
                              {item.done ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                              ) : (
                                <Circle className="w-4 h-4 text-slate-400 group-hover:text-amber-500 shrink-0" />
                              )}
                              <span
                                className={`truncate ${
                                  item.done
                                    ? 'line-through text-slate-400'
                                    : 'text-slate-800 dark:text-slate-100 font-semibold'
                                }`}
                              >
                                {item.text}
                              </span>
                              {item.priority === 'high' && !item.done && (
                                <span className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px] font-bold shrink-0">
                                  {tr('عاجل', 'Urgent')}
                                </span>
                              )}
                            </button>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  handlePromoteTodoToBoard(list, item)
                                }
                                className="px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[10px] font-bold cursor-pointer hover:bg-amber-100"
                                title={tr('نسخ كبطاقة في لوحة المهام', 'Send to Tasks Board')}
                              >
                                {tr('لوحة المهام', 'To Board')}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteChecklistItem(list, item.id)
                                }
                                className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: TEACHER PERSONAL NOTES */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          {richNotes.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-3">
              <StickyNote className="w-10 h-10 mx-auto text-amber-500" />
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  {tr('مفكرة المعلم فارغة حالياً', 'Teacher notes are empty')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {tr(
                    'دوّن ملاحظات الحصص، أفكار الاختبارات، أو تذكيرات أولياء الأمور وثبّت المهم منها.',
                    'Write class notes, exam ideas, or parent follow-ups and pin the most important ones.'
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={openNewNoteModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{tr('كتابة أول ملاحظة', 'Write First Note')}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {richNotes.map((note) => {
                const clr = NOTE_COLOR_CLASSES[note.color || 'amber'];
                return (
                  <div
                    key={note.id}
                    className={`rounded-3xl p-4 sm:p-5 border flex flex-col justify-between gap-3 ${clr.card}`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${clr.dot}`}
                          />
                          <h4 className="font-black text-sm text-slate-900 dark:text-white truncate">
                            {note.title}
                          </h4>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              onSaveNote({ ...note, pinned: !note.pinned })
                            }
                            className={`p-1 rounded-lg cursor-pointer ${
                              note.pinned
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-slate-400 hover:text-amber-600'
                            }`}
                            title={
                              note.pinned
                                ? tr('إلغاء التثبيت', 'Unpin')
                                : tr('تثبيت الملاحظة', 'Pin Note')
                            }
                          >
                            {note.pinned ? (
                              <Pin className="w-4 h-4" />
                            ) : (
                              <PinOff className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditNoteModal(note)}
                            className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteNote(note.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {note.content || tr('بدون محتوى نصي إضافي', 'No additional text')}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/50 text-[10px] text-slate-500 dark:text-slate-400">
                      <span className="font-bold">{note.category || tr('عام', 'General')}</span>
                      <span className="font-mono tabular-nums">
                        {(note.updatedAt || note.createdAt).slice(0, 10)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal: Export Tasks & Notes Excel with Filtering */}
      {isExportModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4"
          onClick={() => setIsExportModalOpen(false)}
          dir={dir}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]"
          >
            <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                <span>
                  {tr('تصدير شيتات مساحة عمل المعلم (Excel)', 'Export Teacher Workspace Excel')}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Export Scope */}
              <div className="space-y-1.5">
                <label className="font-black text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-amber-500" />
                  <span>{tr('اختر المحتوى المراد تصديره:', 'Select Content to Export:')}</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      { id: 'all', ar: 'الكل (شامل)', en: 'All Combined' },
                      { id: 'tasks_only', ar: 'المهام فقط', en: 'Tasks Only' },
                      { id: 'todo_only', ar: 'قوائم To-Do فقط', en: 'To-Do Only' },
                      { id: 'notes_only', ar: 'الملاحظات فقط', en: 'Notes Only' },
                    ] as Array<{ id: WorkspaceExportScope; ar: string; en: string }>
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setExportScope(item.id)}
                      className={`px-3 py-2 rounded-xl border font-bold text-center transition cursor-pointer ${
                        exportScope === item.id
                          ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                      }`}
                    >
                      {lang === 'ar' ? item.ar : item.en}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tasks Filter Section */}
              {(exportScope === 'all' || exportScope === 'tasks_only') && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="font-black text-slate-800 dark:text-slate-100">
                    {tr('فلترة المهام حسب الحالة والأولوية:', 'Filter Tasks by Status & Priority:')}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        { id: 'all', ar: 'جميع المهام', en: 'All Tasks' },
                        { id: 'todo', ar: 'المطلوبة فقط', en: 'Required Only' },
                        { id: 'in_progress', ar: 'قيد التنفيذ فقط', en: 'In Progress Only' },
                        { id: 'active', ar: 'المطلوبة + قيد التنفيذ', en: 'Active (Incomplete)' },
                        { id: 'done', ar: 'المنتهية فقط', en: 'Completed Only' },
                      ] as Array<{ id: WorkspaceTaskStatusFilter; ar: string; en: string }>
                    ).map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setExportTaskStatus(st.id)}
                        className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition cursor-pointer ${
                          exportTaskStatus === st.id
                            ? 'bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 border-slate-900 dark:border-amber-500'
                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {lang === 'ar' ? st.ar : st.en}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                        {tr('الأولوية', 'Priority')}
                      </label>
                      <select
                        value={exportPriority}
                        onChange={(e) => setExportPriority(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-100 cursor-pointer"
                      >
                        <option value="all">{tr('كل الأولويات', 'All Priorities')}</option>
                        <option value="high">{tr('عاجلة فقط', 'Urgent Only')}</option>
                        <option value="medium">{tr('متوسطة فقط', 'Medium Only')}</option>
                        <option value="low">{tr('عادية فقط', 'Normal Only')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                        {tr('التصنيف', 'Category')}
                      </label>
                      <select
                        value={exportCategory}
                        onChange={(e) => setExportCategory(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-100 cursor-pointer"
                      >
                        <option value="all">{tr('كل التصنيفات', 'All Categories')}</option>
                        {Object.entries(CATEGORY_META).map(([k, v]) => (
                          <option key={k} value={k}>
                            {lang === 'ar' ? v.ar : v.en}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* To-Do & Notes Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(exportScope === 'all' || exportScope === 'todo_only') && (
                  <div className="p-3 rounded-2xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800/60 space-y-2">
                    <div className="font-black text-sky-800 dark:text-sky-200">
                      {tr('فلترة بنود To-Do:', 'Filter To-Do Items:')}
                    </div>
                    <select
                      value={exportTodoFilter}
                      onChange={(e) => setExportTodoFilter(e.target.value as WorkspaceTodoFilter)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-sky-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-100 cursor-pointer"
                    >
                      <option value="all">{tr('كل بنود To-Do', 'All To-Do Items')}</option>
                      <option value="pending">{tr('المطلوبة غير المنجزة فقط', 'Pending Items Only')}</option>
                      <option value="done">{tr('المنجزة فقط', 'Done Items Only')}</option>
                    </select>
                  </div>
                )}

                {(exportScope === 'all' || exportScope === 'notes_only') && (
                  <div className="p-3 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 space-y-2">
                    <div className="font-black text-amber-800 dark:text-amber-200">
                      {tr('فلترة الملاحظات:', 'Filter Notes:')}
                    </div>
                    <select
                      value={exportNotesFilter}
                      onChange={(e) => setExportNotesFilter(e.target.value as WorkspaceNotesFilter)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-100 cursor-pointer"
                    >
                      <option value="all">{tr('جميع الملاحظات', 'All Notes')}</option>
                      <option value="pinned">{tr('الملاحظات المثبتة فقط', 'Pinned Notes Only')}</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Export Sheet Language */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  {tr('لغة وتنسيق ملف Excel:', 'Excel Sheet Language & Layout:')}
                </span>
                <div className="inline-flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setExportLang('ar')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold cursor-pointer ${
                      exportLang === 'ar'
                        ? 'bg-amber-500 text-slate-950 border-amber-500'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <EgyptFlagIcon className="w-4 h-3 rounded-[2px]" />
                    <span>العربية (RTL)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportLang('en')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold cursor-pointer ${
                      exportLang === 'en'
                        ? 'bg-amber-500 text-slate-950 border-amber-500'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <UKFlagIcon className="w-4 h-3 rounded-[2px]" />
                    <span>English (LTR)</span>
                  </button>
                </div>
              </div>

              {/* Live Preview Bar */}
              <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex flex-wrap items-center justify-between gap-2 text-emerald-900 dark:text-emerald-200">
                <span className="font-bold">
                  {tr('معاينة البيانات الجاهزة للتصدير:', 'Ready to export:')}
                </span>
                <span className="font-mono tabular-nums font-black">
                  {exportPreview.tCount} {tr('مهام', 'tasks')} · {exportPreview.tdCount} To-Do ·{' '}
                  {exportPreview.nCount} {tr('ملاحظات', 'notes')}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                >
                  {tr('إلغاء', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleRunWorkspaceExport}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black cursor-pointer shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>{tr('تحميل ملف Excel الآن', 'Download Excel Now')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create / Edit Task */}
      {isTaskModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4"
          onClick={() => setIsTaskModalOpen(false)}
          dir={dir}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]"
          >
            <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Kanban className="w-5 h-5 text-amber-500" />
                <span>
                  {editingTask
                    ? tr('تعديل مهمة', 'Edit Task')
                    : tr('إضافة مهمة جديدة', 'Add New Task')}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setIsTaskModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSaveTaskForm}
              className="p-5 overflow-y-auto space-y-4 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {tr('عنوان المهمة *', 'Task Title *')}
                </label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder={tr(
                    'مثال: مراجعة أسئلة هيكل الحادي عشر قبل الامتحان',
                    'e.g., Review Grade 11 structure questions before exam'
                  )}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {tr('تفاصيل المهمة (اختياري)', 'Task Details (Optional)')}
                </label>
                <textarea
                  rows={2}
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder={tr('ملاحظات أو تفاصيل إضافية...', 'Additional notes or details...')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {tr('الحالة', 'Status')}
                  </label>
                  <select
                    value={taskStatus}
                    onChange={(e) =>
                      setTaskStatus(e.target.value as TeacherTaskStatus)
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold cursor-pointer"
                  >
                    <option value="todo">{tr('المطلوبة (للتنفيذ)', 'Required (To-Do)')}</option>
                    <option value="in_progress">{tr('قيد التنفيذ', 'In Progress')}</option>
                    <option value="done">{tr('مكتملة', 'Completed')}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {tr('الأولوية', 'Priority')}
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) =>
                      setTaskPriority(e.target.value as TeacherTaskPriority)
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold cursor-pointer"
                  >
                    <option value="high">{tr('عاجلة', 'Urgent')}</option>
                    <option value="medium">{tr('متوسطة', 'Medium')}</option>
                    <option value="low">{tr('عادية', 'Normal')}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {tr('التصنيف', 'Category')}
                  </label>
                  <select
                    value={taskCategory}
                    onChange={(e) =>
                      setTaskCategory(e.target.value as TeacherTaskCategory)
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold cursor-pointer"
                  >
                    {Object.entries(CATEGORY_META).map(([k, v]) => (
                      <option key={k} value={k}>
                        {lang === 'ar' ? v.ar : v.en}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {tr('تاريخ الاستحقاق (اختياري)', 'Due Date (Optional)')}
                  </label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {tr('ربط بهيكل معين (اختياري)', 'Link to Structure (Optional)')}
                  </label>
                  <select
                    value={taskLinkedStructId}
                    onChange={(e) => setTaskLinkedStructId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-bold cursor-pointer"
                  >
                    <option value="">{tr('بدون ربط', 'None')}</option>
                    {structures.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.title} ({st.grade})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Subtasks editor */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <label className="block font-bold text-slate-700 dark:text-slate-200">
                  {tr('خطوات فرعية (Subtasks)', 'Subtasks')}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newSubtaskText}
                    onChange={(e) => setNewSubtaskText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (!newSubtaskText.trim()) return;
                        setTaskSubtasks((prev) => [
                          ...prev,
                          {
                            id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                            text: newSubtaskText.trim(),
                            done: false,
                          },
                        ]);
                        setNewSubtaskText('');
                      }
                    }}
                    placeholder={tr('أضف خطوة فرعية واضغط إلحاق...', 'Add a subtask...')}
                    className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newSubtaskText.trim()) return;
                      setTaskSubtasks((prev) => [
                        ...prev,
                        {
                          id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                          text: newSubtaskText.trim(),
                          done: false,
                        },
                      ]);
                      setNewSubtaskText('');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-700 text-white font-bold cursor-pointer"
                  >
                    {tr('إلحاق', 'Add')}
                  </button>
                </div>
                {taskSubtasks.length > 0 && (
                  <div className="space-y-1 max-h-32 overflow-y-auto pt-1">
                    {taskSubtasks.map((st) => (
                      <div
                        key={st.id}
                        className="flex items-center justify-between gap-2 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                      >
                        <span className="truncate text-slate-700 dark:text-slate-200">
                          {st.text}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setTaskSubtasks((prev) =>
                              prev.filter((item) => item.id !== st.id)
                            )
                          }
                          className="text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                >
                  {tr('إلغاء', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={savingTask}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black cursor-pointer disabled:opacity-60"
                >
                  {savingTask
                    ? tr('جاري الحفظ...', 'Saving...')
                    : tr('حفظ المهمة', 'Save Task')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create / Edit Rich Note */}
      {isNoteModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4"
          onClick={() => setIsNoteModalOpen(false)}
          dir={dir}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]"
          >
            <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <StickyNote className="w-5 h-5 text-amber-500" />
                <span>
                  {editingNote
                    ? tr('تعديل ملاحظة', 'Edit Note')
                    : tr('إضافة ملاحظة جديدة', 'Add New Note')}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setIsNoteModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSaveNoteForm}
              className="p-5 overflow-y-auto space-y-4 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {tr('عنوان الملاحظة *', 'Note Title *')}
                </label>
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder={tr('مثال: خطة مراجعة الأسبوع القادم...', 'e.g., Next week review plan...')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {tr('محتوى الملاحظة', 'Note Content')}
                </label>
                <textarea
                  rows={5}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder={tr('اكتب ملاحظاتك هنا بحرية...', 'Write your notes here...')}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {tr('التصنيف / الوسم', 'Category / Tag')}
                  </label>
                  <input
                    type="text"
                    value={noteCategory}
                    onChange={(e) => setNoteCategory(e.target.value)}
                    placeholder={tr('عام / طلاب / هياكل...', 'General / Students / Structures...')}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {tr('لون البطاقة', 'Card Color')}
                  </label>
                  <div className="flex items-center gap-2 py-1.5">
                    {(Object.keys(NOTE_COLOR_CLASSES) as TeacherNoteColor[]).map(
                      (cKey) => (
                        <button
                          key={cKey}
                          type="button"
                          onClick={() => setNoteColor(cKey)}
                          className={`w-7 h-7 rounded-full flex items-center justify-center border-2 cursor-pointer transition ${
                            noteColor === cKey
                              ? 'border-slate-900 dark:border-white scale-110'
                              : 'border-transparent opacity-70 hover:opacity-100'
                          } ${NOTE_COLOR_CLASSES[cKey].dot}`}
                          title={
                            lang === 'ar'
                              ? NOTE_COLOR_CLASSES[cKey].labelAr
                              : NOTE_COLOR_CLASSES[cKey].labelEn
                          }
                        >
                          {noteColor === cKey && (
                            <Check className="w-3.5 h-3.5 text-white" />
                          )}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-200 font-bold">
                <input
                  type="checkbox"
                  checked={notePinned}
                  onChange={(e) => setNotePinned(e.target.checked)}
                  className="rounded text-amber-500"
                />
                <span>
                  {tr(
                    'تثبيت الملاحظة في أعلى المفكرة ولوحة التحكم',
                    'Pin note to top & dashboard'
                  )}
                </span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNoteModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold cursor-pointer"
                >
                  {tr('إلغاء', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={savingNote}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black cursor-pointer disabled:opacity-60"
                >
                  {savingNote
                    ? tr('جاري الحفظ...', 'Saving...')
                    : tr('حفظ الملاحظة', 'Save Note')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

/* ============================================================================
   DASHBOARD WIDGET: Compact Tasks, Quick To-Do & Pinned Notes Preview
   ============================================================================ */

interface TeacherWorkspaceDashboardWidgetProps {
  tasks: TeacherTask[];
  notes: TeacherNote[];
  onSaveTask: (task: Omit<TeacherTask, 'id'> & { id?: string }) => Promise<TeacherTask>;
  onSaveNote: (note: Omit<TeacherNote, 'id'> & { id?: string }) => Promise<TeacherNote>;
  onOpenFullWorkspace: () => void;
}

export const TeacherWorkspaceDashboardWidget: React.FC<
  TeacherWorkspaceDashboardWidgetProps
> = ({ tasks, notes, onSaveTask, onSaveNote, onOpenFullWorkspace }) => {
  const { lang, tr } = useLanguage();
  const [quickTodo, setQuickTodo] = useState('');

  const activeTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.status !== 'done')
        .sort(
          (a, b) =>
            PRIORITY_META[a.priority].order - PRIORITY_META[b.priority].order
        )
        .slice(0, 4),
    [tasks]
  );

  const primaryTodoList = useMemo(
    () => notes.find((n) => n.noteType === 'todo_list') || null,
    [notes]
  );

  const todoItems = useMemo(
    () => (primaryTodoList?.checklistItems || []).slice(0, 5),
    [primaryTodoList]
  );

  const pinnedNotes = useMemo(
    () =>
      notes
        .filter((n) => n.noteType !== 'todo_list')
        .sort((a, b) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1))
        .slice(0, 2),
    [notes]
  );

  const handleQuickAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    const txt = quickTodo.trim();
    if (!txt) return;
    const item: TeacherNoteChecklistItem = {
      id: `td_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text: txt,
      done: false,
      priority: 'medium',
      dueDate: getTodayLocalDateKey(),
    };
    if (primaryTodoList) {
      await onSaveNote({
        ...primaryTodoList,
        checklistItems: [item, ...(primaryTodoList.checklistItems || [])],
      });
    } else {
      await onSaveNote({
        title: tr('قائمة المهام اليومية (To-Do)', 'Daily To-Do List'),
        content: '',
        noteType: 'todo_list',
        color: 'amber',
        pinned: true,
        checklistItems: [item],
        createdAt: new Date().toISOString(),
      });
    }
    setQuickTodo('');
  };

  const ArrowIcon = lang === 'ar' ? ChevronLeft : ChevronRight;

  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Card: Tasks Summary */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Kanban className="w-5 h-5 text-amber-500" />
              <h3 className="font-black text-slate-900 dark:text-white text-base">
                {tr(
                  `مهام المعلم (${tasks.filter((t) => t.status !== 'done').length} نشطة)`,
                  `Teacher Tasks (${tasks.filter((t) => t.status !== 'done').length} active)`
                )}
              </h3>
            </div>
            <button
              type="button"
              onClick={onOpenFullWorkspace}
              className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
            >
              <span>{tr('مساحة عمل المعلم', 'Open Workspace')}</span>
              <ArrowIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          {activeTasks.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 space-y-2">
              <p>{tr('لا توجد مهام نشطة حالياً في مساحة عمل المعلم.', 'No active tasks in Teacher Workspace.')}</p>
              <button
                type="button"
                onClick={onOpenFullWorkspace}
                className="text-amber-600 dark:text-amber-400 font-bold hover:underline cursor-pointer"
              >
                + {tr('إضافة مهمة جديدة', 'Add New Task')}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {activeTasks.map((task) => {
                const pri = PRIORITY_META[task.priority];
                return (
                  <div
                    key={task.id}
                    className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className={`px-1.5 py-0.5 rounded border font-bold ${pri.badgeClass}`}>
                          {lang === 'ar' ? pri.labelAr : pri.labelEn}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 font-bold">
                          {task.status === 'in_progress'
                            ? tr('قيد التنفيذ', 'In Progress')
                            : tr('مطلوبة', 'Required')}
                        </span>
                        {task.dueDate && (
                          <span className="font-mono tabular-nums text-slate-400">
                            · {task.dueDate}
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate mt-1">
                        {task.title}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSaveTask({ ...task, status: 'done' })}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-600 text-emerald-700 dark:text-emerald-300 hover:text-white border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold cursor-pointer transition shrink-0"
                    >
                      {tr('إتمام ✓', 'Complete ✓')}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Card: Quick To-Do & Pinned Notes */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-sky-500" />
              <h3 className="font-black text-slate-900 dark:text-white text-base">
                {tr('To-Do السريعة وملاحظات المعلم', 'Quick To-Do & Teacher Notes')}
              </h3>
            </div>
            <button
              type="button"
              onClick={onOpenFullWorkspace}
              className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
            >
              <span>{tr('المفكرة الكاملة', 'Full Notes')}</span>
              <ArrowIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          <form onSubmit={handleQuickAddTodo} className="flex items-center gap-2">
            <input
              type="text"
              value={quickTodo}
              onChange={(e) => setQuickTodo(e.target.value)}
              placeholder={tr(
                'أضف بنداً إلى To-Do واضغط Enter...',
                'Add To-Do item & press Enter...'
              )}
              className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shrink-0"
            >
              {tr('إضافة', 'Add')}
            </button>
          </form>

          {todoItems.length > 0 && primaryTodoList && (
            <div className="space-y-1.5">
              {todoItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    onSaveNote({
                      ...primaryTodoList,
                      checklistItems: (primaryTodoList.checklistItems || []).map(
                        (it) => (it.id === item.id ? { ...it, done: !it.done } : it)
                      ),
                    })
                  }
                  className="w-full flex items-center gap-2 text-start px-2.5 py-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 text-xs cursor-pointer"
                >
                  {item.done ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  <span
                    className={`truncate ${
                      item.done
                        ? 'line-through text-slate-400'
                        : 'text-slate-800 dark:text-slate-100 font-semibold'
                    }`}
                  >
                    {item.text}
                  </span>
                </button>
              ))}
            </div>
          )}

          {pinnedNotes.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              {pinnedNotes.map((note) => {
                const clr = NOTE_COLOR_CLASSES[note.color || 'amber'];
                return (
                  <div
                    key={note.id}
                    onClick={onOpenFullWorkspace}
                    className={`p-3 rounded-2xl border cursor-pointer hover:opacity-95 transition ${clr.card}`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-white truncate">
                      {note.pinned && <Pin className="w-3 h-3 text-amber-500 shrink-0" />}
                      <span className="truncate">{note.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                      {note.content || tr('ملاحظة نصية', 'Text note')}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
