import React, { useState, useEffect } from 'react';
import { X, UserPlus, Save, User, Phone, BookOpen, School, Mail, FileText, Hash, Plus, Check } from 'lucide-react';
import { Student, TeacherSettings } from '../types';
import { DEFAULT_SETTINGS, UAE_GRADES } from '../services/firebase';

interface StudentFormModalProps {
  isOpen: boolean;
  student?: Student | null; // If editing
  studentToEdit?: Student | null; // Alternate prop name support
  existingStudents?: Student[];
  settings?: TeacherSettings;
  onClose: () => void;
  onSave: (studentData: Omit<Student, 'id'>, studentId?: string) => Promise<void>;
}

export const StudentFormModal: React.FC<StudentFormModalProps> = ({
  isOpen,
  student,
  studentToEdit,
  existingStudents = [],
  settings = DEFAULT_SETTINGS,
  onClose,
  onSave,
}) => {
  const activeStudent = student || studentToEdit;
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [grade, setGrade] = useState('');
  const [subject, setSubject] = useState('');
  const [isCustomSubject, setIsCustomSubject] = useState(false);
  const [customSubjectText, setCustomSubjectText] = useState('');
  const [school, setSchool] = useState('');
  const [phone, setPhone] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const gradeList = settings?.grades && settings.grades.length > 0 ? settings.grades : UAE_GRADES;

  // Auto-generate next Student ID when creating new
  const generateNextId = () => {
    const count = (existingStudents?.length || 0) + 1;
    const padded = String(count).padStart(3, '0');
    return `STU-${padded}`;
  };

  useEffect(() => {
    if (activeStudent) {
      setName(activeStudent.name);
      setStudentId(activeStudent.studentId);
      setGrade(activeStudent.grade || gradeList[0]);
      
      const availableSubjects = settings?.subjects || [];
      if (availableSubjects.includes(activeStudent.subject)) {
        setSubject(activeStudent.subject);
        setIsCustomSubject(false);
        setCustomSubjectText('');
      } else {
        setSubject(activeStudent.subject);
        setIsCustomSubject(true);
        setCustomSubjectText(activeStudent.subject);
      }

      setSchool(activeStudent.school || '');
      setPhone(activeStudent.phone || '');
      setParentPhone(activeStudent.parentPhone || '');
      setEmail(activeStudent.email || '');
      setNotes(activeStudent.notes || '');
    } else {
      setName('');
      setStudentId(generateNextId());
      setGrade(gradeList[0] || 'الصف العاشر (Grade 10)');
      setSubject(settings?.defaultSubject || settings?.subjects?.[0] || 'الفيزياء');
      setIsCustomSubject(false);
      setCustomSubjectText('');
      setSchool('');
      setPhone('');
      setParentPhone('');
      setEmail('');
      setNotes('');
    }
    setError('');
  }, [activeStudent, isOpen, existingStudents?.length || 0, settings]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('يرجى إدخال اسم الطالب كاملاً');
      return;
    }
    if (!studentId.trim()) {
      setError('يرجى تحديد الرقم التعريفي للطالب (Student ID)');
      return;
    }

    const finalSubject = isCustomSubject ? customSubjectText.trim() : subject.trim();
    if (!finalSubject) {
      setError('يرجى تحديد أو كتابة مادة الطالب');
      return;
    }

    // Check duplicate Student ID if changed
    const duplicate = existingStudents.find(
      s => s.studentId.trim().toLowerCase() === studentId.trim().toLowerCase() && s.id !== student?.id
    );
    if (duplicate) {
      setError(`الرقم التعريفي ${studentId} مستخدم بالفعل لطالب آخر (${duplicate.name})`);
      return;
    }

    try {
      setLoading(true);
      setError('');
      await onSave(
        {
          name: name.trim(),
          studentId: studentId.trim(),
          grade: grade.trim(),
          group: '', // Group field removed as requested
          subject: finalSubject,
          school: school.trim(),
          phone: phone.trim(),
          parentPhone: parentPhone.trim(),
          email: email.trim(),
          notes: notes.trim(),
          createdAt: student ? student.createdAt : new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        student ? student.id : undefined
      );
      onClose();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حفظ بيانات الطالب');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div 
        id="student-form-modal"
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-100 dark:border-slate-800 my-8 text-right animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl">
              {student ? <User className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">
                {student ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                سجل بيانات الطالب (منهج الإمارات - صفوف 1 إلى 12)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                اسم الطالب بالكامل <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="student-name-input"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: زايد راشد المري"
                  className="w-full pr-10 pl-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 dark:text-white transition-all text-right font-medium"
                />
                <User className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
              </div>
            </div>

            {/* Student ID */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  الرقم التعريفي (Student ID) <span className="text-rose-500">*</span>
                </label>
                {!student && (
                  <button
                    type="button"
                    onClick={() => setStudentId(generateNextId())}
                    className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-semibold"
                  >
                    توليد تلقائي
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  id="student-id-input"
                  type="text"
                  required
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="STU-001"
                  className="w-full pr-10 pl-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 dark:text-white transition-all text-right"
                />
                <Hash className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
              </div>
            </div>

            {/* Grade (UAE System: Grades 1 to 12) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                الصف الدراسي (منهج الإمارات 1-12) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  id="student-grade-select"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full pr-10 pl-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 dark:text-white transition-all text-right cursor-pointer"
                >
                  {gradeList.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
                <BookOpen className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
              </div>
            </div>

            {/* Subject (with Manual Entry support) */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  المادة الدراسية <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomSubject(!isCustomSubject);
                    if (!isCustomSubject && !customSubjectText) {
                      setCustomSubjectText('');
                    }
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 transition-colors"
                >
                  {isCustomSubject ? (
                    '← اختيار من المواد المحفوظة'
                  ) : (
                    '+ كتابة اسم المادة يدوياً'
                  )}
                </button>
              </div>

              {isCustomSubject ? (
                <div className="relative">
                  <input
                    id="student-custom-subject-input"
                    type="text"
                    required
                    value={customSubjectText}
                    onChange={(e) => setCustomSubjectText(e.target.value)}
                    placeholder="اكتب اسم المادة يدوياً (مثال: فيزياء متقدمة، علوم عامة...)"
                    className="w-full pr-10 pl-3 py-2.5 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl text-sm focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 dark:text-white transition-all text-right font-medium"
                    autoFocus
                  />
                  <BookOpen className="w-4 h-4 text-amber-500 absolute right-3 top-3.5" />
                </div>
              ) : (
                <div className="relative">
                  <select
                    id="student-subject-select"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full pr-10 pl-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 dark:text-white transition-all text-right cursor-pointer"
                  >
                    {settings.subjects.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <BookOpen className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
                </div>
              )}
            </div>

            {/* School */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                المدرسة (اختياري)
              </label>
              <div className="relative">
                <input
                  id="student-school-input"
                  type="text"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  placeholder="اسم المدرسة في الإمارات"
                  className="w-full pr-10 pl-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 dark:text-white transition-all text-right"
                />
                <School className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
              </div>
            </div>

            {/* Student Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                رقم هاتف الطالب (اختياري)
              </label>
              <div className="relative">
                <input
                  id="student-phone-input"
                  type="tel"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+971 50 123 4567"
                  className="w-full pr-10 pl-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 dark:text-white transition-all text-right font-mono"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
              </div>
            </div>

            {/* Parent Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                رقم هاتف ولي الأمر (اختياري)
              </label>
              <div className="relative">
                <input
                  id="student-parent-phone-input"
                  type="tel"
                  dir="ltr"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  placeholder="+971 50 987 6543"
                  className="w-full pr-10 pl-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 dark:text-white transition-all text-right font-mono"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                البريد الإلكتروني (إن وجد)
              </label>
              <div className="relative">
                <input
                  id="student-email-input"
                  type="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@example.com"
                  className="w-full pr-10 pl-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 dark:text-white transition-all text-right"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              ملاحظات خاصة بالطالب (اختياري)
            </label>
            <div className="relative">
              <textarea
                id="student-notes-input"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ملاحظات حول مستوى الطالب أو ظروف دراسية خاصة..."
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 dark:text-white transition-all text-right"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              id="save-student-btn"
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-slate-950 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-98 rounded-xl shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? 'جاري الحفظ...' : student ? 'حفظ التعديلات' : 'إضافة الطالب'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

