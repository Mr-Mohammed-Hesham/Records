import React, { useState, useMemo } from 'react';
import {
  UserPlus,
  Search,
  FileSpreadsheet,
  Eye,
  Edit3,
  Trash2,
  Users,
} from 'lucide-react';
import { Student, ExamResult, TeacherSettings } from '../types';
import { calculateStudentStats } from '../utils/grading';

interface StudentsViewProps {
  students: Student[];
  allResults: ExamResult[];
  settings: TeacherSettings;
  onOpenProfile: (student: Student) => void;
  onAddStudent: () => void;
  onEditStudent: (student: Student) => void;
  onDeleteStudent: (student: Student) => void;
  onExportAllExcel: () => void;
}

type SortField = 'name' | 'studentId' | 'average' | 'examsCount';
type SortDirection = 'asc' | 'desc';

export const StudentsView: React.FC<StudentsViewProps> = ({
  students,
  allResults,
  settings,
  onOpenProfile,
  onAddStudent,
  onEditStudent,
  onDeleteStudent,
  onExportAllExcel,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState('الكل');
  const [groupFilter, setGroupFilter] = useState('الكل');
  const [subjectFilter, setSubjectFilter] = useState('الكل');
  const [statusFilter, setStatusFilter] = useState('الكل');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  /*
   * الحصول على مواد الطالب.
   *
   * الطلاب الجدد:
   *   subjects = ['رياضيات', 'فيزياء']
   *
   * الطلاب القدامى:
   *   subject = 'رياضيات'
   *
   * لذلك نحافظ على التوافق مع النظام القديم.
   */
  const getStudentSubjects = (student: Student): string[] => {
    if (Array.isArray(student.subjects) && student.subjects.length > 0) {
      return student.subjects.filter(Boolean);
    }

    return student.subject ? [student.subject] : [];
  };

  /*
   * حساب إحصائيات كل طالب.
   *
   * لو تم اختيار مادة معينة:
   * نحسب نتائج هذه المادة فقط.
   *
   * لو "كل المواد":
   * نحسب جميع نتائج الطالب.
   */
  const studentsWithStats = useMemo(() => {
    return students.map(student => {
      const studentResults = allResults.filter(
        result => result.studentDocId === student.id
      );

      const filteredResults =
        subjectFilter === 'الكل'
          ? studentResults
          : studentResults.filter(result => {
              /*
               * بعض النتائج القديمة قد تحتوي subject فقط،
               * وبعض النتائج الجديدة قد تستخدم subject.
               *
               * نتحقق من subject بشكل مباشر.
               */
              return result.subject === subjectFilter;
            });

      const stats = calculateStudentStats(
        filteredResults,
        settings.gradingScale
      );

      return {
        student,
        stats,
        subjects: getStudentSubjects(student),
      };
    });
  }, [
    students,
    allResults,
    settings.gradingScale,
    subjectFilter,
  ]);

  /*
   * الفلترة والبحث
   */
  const filteredStudents = useMemo(() => {
    return studentsWithStats.filter(({ student, stats, subjects }) => {
      const searchLower = searchTerm.toLowerCase().trim();

      const matchSearch =
        student.name.toLowerCase().includes(searchLower) ||
        student.studentId.toLowerCase().includes(searchLower) ||
        (student.phone &&
          student.phone.toLowerCase().includes(searchLower)) ||
        (student.parentPhone &&
          student.parentPhone.toLowerCase().includes(searchLower));

      if (!matchSearch) return false;

      // الصف
      if (
        gradeFilter !== 'الكل' &&
        student.grade !== gradeFilter
      ) {
        return false;
      }

      // المجموعة
      if (
        groupFilter !== 'الكل' &&
        student.group !== groupFilter
      ) {
        return false;
      }

      /*
       * المادة:
       *
       * الجديد:
       * subjects.includes(subjectFilter)
       *
       * القديم:
       * subject === subjectFilter
       */
      if (
        subjectFilter !== 'الكل' &&
        !subjects.includes(subjectFilter)
      ) {
        return false;
      }

      // الحالة
      if (
        statusFilter !== 'الكل' &&
        stats.status !== statusFilter
      ) {
        return false;
      }

      return true;
    });
  }, [
    studentsWithStats,
    searchTerm,
    gradeFilter,
    groupFilter,
    subjectFilter,
    statusFilter,
  ]);

  /*
   * الترتيب
   */
  const sortedStudents = useMemo(() => {
    return [...filteredStudents].sort((a, b) => {
      let comparison = 0;

      if (sortField === 'name') {
        comparison = a.student.name.localeCompare(
          b.student.name,
          'ar'
        );
      } else if (sortField === 'studentId') {
        comparison = a.student.studentId.localeCompare(
          b.student.studentId
        );
      } else if (sortField === 'average') {
        comparison =
          a.stats.averagePercentage -
          b.stats.averagePercentage;
      } else if (sortField === 'examsCount') {
        comparison =
          a.stats.totalExams -
          b.stats.totalExams;
      }

      return sortDirection === 'asc'
        ? comparison
        : -comparison;
    });
  }, [
    filteredStudents,
    sortField,
    sortDirection,
  ]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev =>
        prev === 'asc' ? 'desc' : 'asc'
      );
    } else {
      setSortField(field);
      setSortDirection(
        field === 'name' ? 'asc' : 'desc'
      );
    }
  };

  /*
   * المجموعات الموجودة فعلياً
   */
  const availableGroups = useMemo(() => {
    return Array.from(
      new Set(
        students
          .map(student => student.group)
          .filter(Boolean)
      )
    );
  }, [students]);

  return (
    <div
      id="students-view"
      className="space-y-5 text-right"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            إدارة الطلاب ({students.length})
          </h1>

          <p className="text-xs text-slate-500 mt-1">
            سجل الطلاب المسجلين، معدلات أدائهم وحالاتهم الأكاديمية
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onExportAllExcel}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            تصدير الكل إلى Excel
          </button>

          <button
            id="add-student-main-btn"
            onClick={onAddStudent}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-98 rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            إضافة طالب جديد
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">

          {/* Search */}
          <div className="md:col-span-4 relative">
            <input
              id="student-search-box"
              type="text"
              value={searchTerm}
              onChange={e =>
                setSearchTerm(e.target.value)
              }
              placeholder="بحث بالاسم أو ID أو رقم الهاتف..."
              className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-right font-medium"
            />

            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
          </div>

          {/* Grade */}
          <div className="md:col-span-2">
            <select
              value={gradeFilter}
              onChange={e =>
                setGradeFilter(e.target.value)
              }
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden text-right cursor-pointer"
            >
              <option value="الكل">
                كل الصفوف
              </option>

              {settings.grades.map(grade => (
                <option
                  key={grade}
                  value={grade}
                >
                  {grade}
                </option>
              ))}
            </select>
          </div>

          {/* Group */}
          <div className="md:col-span-2">
            <select
              value={groupFilter}
              onChange={e =>
                setGroupFilter(e.target.value)
              }
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden text-right cursor-pointer"
            >
              <option value="الكل">
                كل المجموعات
              </option>

              {availableGroups.map(group => (
                <option
                  key={group}
                  value={group}
                >
                  {group}
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div className="md:col-span-2">
            <select
              value={subjectFilter}
              onChange={e =>
                setSubjectFilter(e.target.value)
              }
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden text-right cursor-pointer"
            >
              <option value="الكل">
                كل المواد
              </option>

              {settings.subjects.map(subject => (
                <option
                  key={subject}
                  value={subject}
                >
                  {subject}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="md:col-span-2">
            <select
              value={statusFilter}
              onChange={e =>
                setStatusFilter(e.target.value)
              }
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden text-right cursor-pointer font-medium"
            >
              <option value="الكل">
                كل الحالات
              </option>

              <option value="ممتاز">
                ممتاز (85%+)
              </option>

              <option value="جيد">
                جيد (65-84%)
              </option>

              <option value="يحتاج متابعة">
                يحتاج متابعة (&lt;65%)
              </option>
            </select>
          </div>
        </div>

        {/* Sorting */}
        <div className="flex flex-wrap items-center justify-between text-xs pt-2 border-t border-slate-100 text-slate-500">
          <div className="flex items-center gap-2">
            <span>الترتيب حسب:</span>

            <button
              onClick={() =>
                toggleSort('name')
              }
              className={`px-2.5 py-1 rounded-lg border transition-colors cursor-pointer inline-flex items-center gap-1 ${
                sortField === 'name'
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              الاسم{' '}
              {sortField === 'name' &&
                (sortDirection === 'asc'
                  ? '↑'
                  : '↓')}
            </button>

            <button
              onClick={() =>
                toggleSort('average')
              }
              className={`px-2.5 py-1 rounded-lg border transition-colors cursor-pointer inline-flex items-center gap-1 ${
                sortField === 'average'
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              متوسط الدرجات{' '}
              {sortField === 'average' &&
                (sortDirection === 'asc'
                  ? '↑'
                  : '↓')}
            </button>

            <button
              onClick={() =>
                toggleSort('examsCount')
              }
              className={`px-2.5 py-1 rounded-lg border transition-colors cursor-pointer inline-flex items-center gap-1 ${
                sortField === 'examsCount'
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              عدد الامتحانات{' '}
              {sortField === 'examsCount' &&
                (sortDirection === 'asc'
                  ? '↑'
                  : '↓')}
            </button>
          </div>

          <span className="text-[11px] text-slate-400">
            عرض {sortedStudents.length} من أصل{' '}
            {students.length} طالب
          </span>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50/80 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4 w-28">
                  الرقم التعريفي
                </th>

                <th className="py-3.5 px-4">
                  اسم الطالب
                </th>

                <th className="py-3.5 px-3">
                  الصف الدراسي
                </th>

                <th className="py-3.5 px-3">
                  المجموعة
                </th>

                <th className="py-3.5 px-3">
                  المواد
                </th>

                <th className="py-3.5 px-3">
                  الهاتف
                </th>

                <th className="py-3.5 px-3 text-center">
                  متوسط الدرجات
                </th>

                <th className="py-3.5 px-3 text-center">
                  الامتحانات
                </th>

                <th className="py-3.5 px-3 text-center">
                  آخر نتيجة
                </th>

                <th className="py-3.5 px-3 text-center">
                  حالة الطالب
                </th>

                <th className="py-3.5 px-4 text-center w-28">
                  إجراءات
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {sortedStudents.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="py-12 text-center text-slate-400"
                  >
                    {students.length === 0 ? (
                      <div className="space-y-3">
                        <Users className="w-8 h-8 text-slate-300 mx-auto" />

                        <p className="font-semibold text-slate-600">
                          لا يوجد طلاب مسجلين حتى الآن
                        </p>

                        <p className="text-xs text-slate-400">
                          ابدأ بإضافة أول طالب أو استيراد البيانات من الإعدادات
                        </p>

                        <button
                          onClick={onAddStudent}
                          className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors cursor-pointer"
                        >
                          إضافة أول طالب
                        </button>
                      </div>
                    ) : (
                      'لا توجد نتائج مطابقة لشروط البحث والفلترة'
                    )}
                  </td>
                </tr>
              ) : (
                sortedStudents.map(
                  ({
                    student,
                    stats,
                    subjects,
                  }) => (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      onClick={() =>
                        onOpenProfile(student)
                      }
                    >
                      {/* Student ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-600 text-[11px]">
                        <span className="bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          {student.studentId}
                        </span>
                      </td>

                      {/* Name */}
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {student.name.charAt(0)}
                          </div>

                          <span className="group-hover:text-indigo-600 transition-colors">
                            {student.name}
                          </span>
                        </div>
                      </td>

                      {/* Grade */}
                      <td className="py-3.5 px-3 text-slate-600">
                        {student.grade}
                      </td>

                      {/* Group */}
                      <td className="py-3.5 px-3 text-slate-600">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px]">
                          {student.group || '-'}
                        </span>
                      </td>

                      {/* Subjects */}
                      <td className="py-3.5 px-3 text-slate-600">
                        <div className="flex flex-wrap gap-1 justify-end">
                          {subjects.length > 0 ? (
                            subjects.map(subject => (
                              <span
                                key={subject}
                                className={`px-2 py-0.5 rounded text-[10px] border ${
                                  subjectFilter === subject
                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold'
                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                                }`}
                              >
                                {subject}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-300">
                              -
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Phone */}
                      <td
                        className="py-3.5 px-3 font-mono text-slate-500 text-[11px]"
                        dir="ltr"
                      >
                        {student.phone ||
                          student.parentPhone ||
                          '-'}
                      </td>

                      {/* Average */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="font-mono font-bold text-indigo-600 text-xs">
                          {stats.totalExams > 0
                            ? `${stats.averagePercentage}%`
                            : '-'}
                        </span>
                      </td>

                      {/* Exams */}
                      <td className="py-3.5 px-3 text-center font-mono text-slate-700 font-semibold">
                        {stats.totalExams}
                      </td>

                      {/* Latest Result */}
                      <td className="py-3.5 px-3 text-center font-mono">
                        {stats.latestPercentage !==
                        null ? (
                          <span className="font-bold text-slate-800">
                            {stats.latestPercentage}%
                          </span>
                        ) : (
                          <span className="text-slate-300">
                            -
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[10px] border ${
                            stats.status === 'ممتاز'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : stats.status === 'جيد'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {stats.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td
                        className="py-3.5 px-4 text-center"
                        onClick={e =>
                          e.stopPropagation()
                        }
                      >
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() =>
                              onOpenProfile(student)
                            }
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="فتح ملف الطالب"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() =>
                              onEditStudent(student)
                            }
                            className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                            title="تعديل بيانات الطالب"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() =>
                              onDeleteStudent(student)
                            }
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="حذف الطالب"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
