import React, { createContext, useContext, useEffect, useState } from 'react';

export type AppLanguage = 'ar' | 'en';

const STORAGE_KEY = 'mh_platform_lang';

interface LanguageContextValue {
  lang: AppLanguage;
  isRtl: boolean;
  dir: 'rtl' | 'ltr';
  setLang: (next: AppLanguage) => void;
  toggleLang: () => void;
  tr: (arText: string, enText: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'ar',
  isRtl: true,
  dir: 'rtl',
  setLang: () => {},
  toggleLang: () => {},
  tr: (ar) => ar,
});

export const EgyptFlagIcon: React.FC<{ className?: string }> = ({
  className = 'w-4 h-3 rounded-[2px] shrink-0 shadow-2xs border border-black/15',
}) => (
  <svg
    viewBox="0 0 30 20"
    className={className}
    aria-label="علم مصر"
    role="img"
  >
    <rect width="30" height="6.67" y="0" fill="#CE1126" />
    <rect width="30" height="6.67" y="6.66" fill="#FFFFFF" />
    <rect width="30" height="6.67" y="13.33" fill="#000000" />
    {/* Golden Eagle of Saladin */}
    <path
      d="M15 7.4c-.55 0-.9.38-.9.88 0 .28.12.5.3.68l-.9.34v1.95l.9-.24v.95h1.2v-.95l.9.24V9.3l-.9-.34c.18-.18.3-.4.3-.68 0-.5-.35-.88-.9-.88z"
      fill="#C09300"
    />
  </svg>
);

export const UKFlagIcon: React.FC<{ className?: string }> = ({
  className = 'w-4 h-3 rounded-[2px] shrink-0 shadow-2xs border border-black/15',
}) => (
  <svg
    viewBox="0 0 30 20"
    className={className}
    aria-label="English"
    role="img"
  >
    <rect width="30" height="20" fill="#012169" />
    <path d="M0 0L30 20M30 0L0 20" stroke="#FFFFFF" strokeWidth="3.2" />
    <path d="M0 0L30 20M30 0L0 20" stroke="#C8102E" strokeWidth="1.8" />
    <path d="M15 0V20M0 10H30" stroke="#FFFFFF" strokeWidth="5.2" />
    <path d="M15 0V20M0 10H30" stroke="#C8102E" strokeWidth="3.2" />
  </svg>
);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [lang, setLangState] = useState<AppLanguage>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === 'en' ? 'en' : 'ar';
    } catch {
      return 'ar';
    }
  });

  const setLang = (next: AppLanguage) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore storage errors
    }
  };

  const toggleLang = () => setLang(lang === 'ar' ? 'en' : 'ar');

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    }
  }, [lang]);

  const value: LanguageContextValue = {
    lang,
    isRtl: lang === 'ar',
    dir: lang === 'ar' ? 'rtl' : 'ltr',
    setLang,
    toggleLang,
    tr: (arText: string, enText: string) => (lang === 'ar' ? arText : enText),
  };

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}

export const LanguageSwitcher: React.FC<{
  variant?: 'header' | 'compact' | 'card';
  className?: string;
}> = ({ variant = 'header', className = '' }) => {
  const { lang, setLang } = useLanguage();

  if (variant === 'card') {
    return (
      <div className={`grid grid-cols-2 gap-2 ${className}`}>
        <button
          type="button"
          onClick={() => setLang('ar')}
          className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-black transition cursor-pointer ${
            lang === 'ar'
              ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
              : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-amber-400'
          }`}
        >
          <EgyptFlagIcon className="w-5 h-3.5 rounded-[2px] shrink-0 border border-black/20" />
          <span>العربية (مصر)</span>
        </button>
        <button
          type="button"
          onClick={() => setLang('en')}
          className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-black transition cursor-pointer ${
            lang === 'en'
              ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
              : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-amber-400'
          }`}
        >
          <UKFlagIcon className="w-5 h-3.5 rounded-[2px] shrink-0 border border-black/20" />
          <span>English</span>
        </button>
      </div>
    );
  }

  return (
    <div
      id="global-language-switcher"
      className={`inline-flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 ${className}`}
      role="group"
      aria-label="Language Switcher"
    >
      <button
        type="button"
        onClick={() => setLang('ar')}
        title="العربية"
        className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-lg text-[11px] font-black transition cursor-pointer whitespace-nowrap ${
          lang === 'ar'
            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
        }`}
      >
        <EgyptFlagIcon className="w-4 h-3 rounded-[2px] shrink-0 border border-black/15" />
        <span className={variant === 'compact' ? 'hidden sm:inline' : ''}>
          عربي
        </span>
      </button>
      <button
        type="button"
        onClick={() => setLang('en')}
        title="English"
        className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-lg text-[11px] font-black transition cursor-pointer whitespace-nowrap ${
          lang === 'en'
            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
        }`}
      >
        <UKFlagIcon className="w-3.5 h-2.5 rounded-[2px] shrink-0 border border-black/15 hidden sm:inline-block" />
        <span>EN</span>
      </button>
    </div>
  );
};

/* ============================================================================
   DOMAIN LABEL HELPERS (PRESERVES STORED ARABIC DATA, DISPLAYS BILINGUALLY)
   ============================================================================ */

const GRADE_EN_MAP: Record<string, string> = {
  'الصف التاسع (Grade 9)': 'Grade 9',
  'الصف العاشر (Grade 10)': 'Grade 10',
  'الصف الحادي عشر متقدم (Grade 11 Adv)': 'Grade 11 Advanced',
  'الصف الحادي عشر عام (Grade 11 Gen)': 'Grade 11 General',
  'الصف الثاني عشر متقدم (Grade 12 Adv)': 'Grade 12 Advanced',
  'الصف الثاني عشر عام (Grade 12 Gen)': 'Grade 12 General',
  'الصف السادس (Grade 6)': 'Grade 6',
  'الصف السابع (Grade 7)': 'Grade 7',
  'الصف الثامن (Grade 8)': 'Grade 8',
};

export function translateGrade(grade: string, lang: AppLanguage): string {
  if (lang === 'ar') return grade;
  if (GRADE_EN_MAP[grade]) return GRADE_EN_MAP[grade];
  const match = grade.match(/\(([^)]+)\)/);
  if (match?.[1]) return match[1];
  return grade;
}

export function translateTerm(term: string, lang: AppLanguage): string {
  if (lang === 'ar') return term;
  if (term.includes('الأول') || term.includes('1')) return 'Term 1';
  if (term.includes('الثاني') || term.includes('2')) return 'Term 2';
  if (term.includes('الثالث') || term.includes('3')) return 'Term 3';
  return term;
}

export function translateTrack(track: string, lang: AppLanguage): string {
  if (lang === 'ar') return track;
  if (track === 'متقدم') return 'Advanced';
  if (track === 'عام') return 'General';
  if (track === 'نخبة') return 'Elite';
  if (track === 'تأسيس') return 'Foundation';
  return track;
}

export function translateSubject(subject: string, lang: AppLanguage): string {
  if (lang === 'ar') return subject;
  if (subject === 'الفيزياء') return 'Physics';
  if (subject === 'الرياضيات') return 'Mathematics';
  if (subject === 'الكيمياء') return 'Chemistry';
  if (subject === 'العلوم') return 'Science';
  if (subject === 'الأحياء') return 'Biology';
  return subject;
}

export function translateCommonLabel(val: string, lang: AppLanguage): string {
  if (lang === 'ar') return val;
  if (val === 'الكل') return 'All';
  if (val === 'عام') return 'General';
  return val;
}
