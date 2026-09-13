import React, { useState, useEffect } from 'react';
import { Search, X, User, ArrowRight } from 'lucide-react';
import { Student } from '../types';

interface QuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  onSelectStudent: (student: Student) => void;
}

export const QuickSearchModal: React.FC<QuickSearchModalProps> = ({
  isOpen,
  onClose,
  students,
  onSelectStudent,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = students.filter(s => {
    const q = query.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.studentId.toLowerCase().includes(q) ||
      (s.phone && s.phone.includes(q)) ||
      (s.parentPhone && s.parentPhone.includes(q)) ||
      s.grade.toLowerCase().includes(q) ||
      s.group.toLowerCase().includes(q)
    );
  }).slice(0, 8);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-right animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative p-3 border-b border-slate-200 dark:border-slate-800">
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث بالاسم، ID، رقم الهاتف، أو الصف..."
            className="w-full pr-10 pl-8 py-2.5 bg-slate-50 dark:bg-slate-800 border-0 rounded-xl text-sm font-medium focus:bg-white dark:focus:bg-slate-950 focus:outline-hidden text-slate-900 dark:text-white text-right placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          <Search className="w-5 h-5 text-slate-400 absolute right-6 top-5 pointer-events-none" />
          <button
            onClick={onClose}
            className="absolute left-5 top-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800/60">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
              لا يوجد طلاب مطابقين لـ "{query}"
            </div>
          ) : (
            filtered.map(s => (
              <div
                key={s.id}
                onClick={() => {
                  onSelectStudent(s);
                  onClose();
                }}
                className="p-3 flex items-center justify-between hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 rounded-xl cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0 border border-indigo-200/50 dark:border-indigo-800/50">
                    {s.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {s.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      <span className="font-semibold text-slate-600 dark:text-slate-300">{s.grade}</span> • <span>{s.group}</span> • <span className="font-mono text-slate-500 dark:text-slate-400">#{s.studentId}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>فتح الملف</span>
                  <ArrowRight className="w-3 h-3 rotate-180" />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/70 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 text-center">
          اضغط على أي طالب للانتقال المباشر لملفه الشخصي وسجل امتحاناته
        </div>
      </div>
    </div>
  );
};
