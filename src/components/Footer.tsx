import React from 'react';
import { Award, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../utils/i18n';

export const Footer: React.FC = () => {
  const { tr } = useLanguage();

  return (
    <footer className="mt-auto border-t border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md transition-colors py-5 pb-20 lg:pb-6 px-3 sm:px-6">
      <div className="w-full max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-start">
        {/* Left/Start Side: Teacher English Signature & Brand */}
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <img
              src={`${import.meta.env.BASE_URL}teacher-logo.jpg`}
              alt="Mr. Mohamed Hesham"
              className="w-10 h-10 rounded-xl object-cover border border-amber-500/40 shadow-sm"
            />
          </div>

          <div className="text-start">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-black text-slate-900 dark:text-white tracking-wide font-sans">
                Mr. Mohamed Hesham
              </span>
              <span className="text-slate-400" aria-hidden="true">·</span>
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                {tr('المنصة الرسمية', 'Official Platform')}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {tr(
                'منصة إدارة السجلات الأكاديمية والامتحانات الرسمية',
                'Academic Records, Structures & Exam Management Portal'
              )}
            </p>
          </div>
        </div>

        {/* End/Signature Area */}
        <div className="flex flex-col items-center md:items-end">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-mono tracking-tight">
            <Award className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>
              Designed &amp; Developed for{' '}
              <span className="text-amber-600 dark:text-amber-400 font-bold">
                Mr. Mohamed Hesham
              </span>
            </span>
          </p>
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-2 text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              {tr('بوابة أكاديمية موثقة', 'Verified Academic Portal')}
            </span>
            <span>•</span>
            <span>&copy; {new Date().getFullYear()} Mr. Mohamed Hesham. All rights reserved.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
