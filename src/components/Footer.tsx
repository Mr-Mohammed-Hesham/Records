import React from 'react';
import { Award, ShieldCheck, Sparkles } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md transition-colors py-6 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-right">
        {/* Left Side: Teacher English Signature & Brand */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={`${import.meta.env.BASE_URL}teacher-logo.jpg`}
              alt="Mr. Mohamed Hesham"
              className="w-10 h-10 rounded-xl object-cover border border-amber-500/40 shadow-sm"
            />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[9px] font-bold shadow">
              <Sparkles className="w-2.5 h-2.5 fill-current" />
            </div>
          </div>

          <div className="text-right">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-900 dark:text-white tracking-wide font-sans">
                Mr. Mohamed Hesham
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                Official Platform
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              منصة إدارة السجلات الأكاديمية والامتحانات الرسمية
            </p>
          </div>
        </div>

        {/* Center/Signature Area */}
        <div className="flex flex-col items-center md:items-end">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-mono tracking-tight">
            <Award className="w-3.5 h-3.5 text-amber-500" />
            <span>Designed &amp; Developed for <span className="text-amber-600 dark:text-amber-400 font-bold">Mr. Mohamed Hesham</span></span>
          </p>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              Verified Academic Portal
            </span>
            <span>•</span>
            <span>&copy; {new Date().getFullYear()} Mr. Mohamed Hesham. All rights reserved.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
