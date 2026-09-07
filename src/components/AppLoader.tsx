import React from 'react';
import { Sparkles, Cloud } from 'lucide-react';

interface AppLoaderProps {
  message?: string;
}

export const AppLoader: React.FC<AppLoaderProps> = ({ 
  message = 'جاري مزامنة السجلات وقاعدة البيانات...' 
}) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-white overflow-hidden selection:bg-amber-500">
      {/* Ambient background glow inspired by the vintage lantern */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-amber-600/20 via-orange-500/15 to-indigo-600/20 rounded-full blur-3xl pointer-events-none animate-pulse" />

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center max-w-sm px-6 text-center">
        {/* Glowing Logo Frame */}
        <div className="relative mb-6">
          <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-300 opacity-75 blur-md animate-spin" style={{ animationDuration: '6s' }} />
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full p-1 bg-gradient-to-br from-amber-400 via-amber-600 to-orange-500 shadow-2xl shadow-amber-500/30 overflow-hidden">
            <img 
              src={`${import.meta.env.BASE_URL}teacher-logo.jpg`} 
              alt="Mr Mohammed Hesham" 
              className="w-full h-full object-cover rounded-full"
              referrerPolicy="no-referrer"
            />
          </div>
          {/* Lantern icon spark */}
          <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg border-2 border-slate-950">
            <Sparkles className="w-4 h-4 fill-current" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-1">
          منصة Mr. Mohamed Hesham
        </h1>
        <p className="text-xs sm:text-sm font-medium text-amber-300/80 mb-6 flex items-center gap-1.5 justify-center">
          <span>نظام السجلات الأكاديمية والمتابعة الشاملة</span>
        </p>

        {/* Dynamic Progress Indicator */}
        <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden mb-3 relative">
          <div className="h-full bg-gradient-to-r from-amber-500 via-orange-400 to-amber-300 rounded-full animate-[shimmer_1.5s_infinite] w-full" />
        </div>

        {/* Live sync text */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Cloud className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>{message}</span>
        </div>
      </div>
    </div>
  );
};
