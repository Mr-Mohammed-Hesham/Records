import React, { useState } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Sparkles,
  LogOut,
  RefreshCw
} from 'lucide-react';
import { 
  signInWithGoogle, 
  signOutTeacher, 
  clearTeacherSession,
  saveTeacherSession, 
  isAllowedEmail,
  ALLOWED_ADMIN_EMAILS
} from '../services/firebase';
import type { User } from 'firebase/auth';

export const OFFICIAL_EMAILS = ALLOWED_ADMIN_EMAILS;

interface LoginPageProps {
  currentUser: User | any | null;
  onAuthorizedLogin: (user?: User | any) => void;
  onSignOut?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ 
  currentUser, 
  onAuthorizedLogin,
  onSignOut 
}) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isEmailAllowed = (emailToCheck?: string | null) => {
    return isAllowedEmail(emailToCheck);
  };

  // If user signed in with unauthorized email
  if (currentUser && !isEmailAllowed(currentUser.email)) {
    return (
      <div className="min-h-screen bg-[#070b14] text-white flex items-center justify-center p-4 selection:bg-amber-500" dir="rtl">
        <div className="max-w-md w-full bg-slate-900 border border-red-500/40 rounded-3xl p-8 text-center shadow-2xl shadow-black/80">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-white">حساب غير مصرح له بالدخول</h2>
          <p className="text-sm text-slate-300 mb-4 leading-relaxed">
            عذراً، البريد الحالي <span className="font-mono text-amber-300 font-semibold dir-ltr">{currentUser.email || 'غير معروف'}</span> غير مسجل ضمن الحسابات المعتمدة.
          </p>
          <div className="p-3.5 bg-slate-800/80 rounded-2xl text-xs text-slate-300 mb-6 border border-slate-700/60 leading-relaxed">
            المنصة مخصصة حصرياً للأستاذ <strong className="text-amber-400 font-bold">محمد هشام</strong> عبر حساب Google الرسمي المعتمد.
          </div>
          <button
            onClick={async () => {
              clearTeacherSession();
              await signOutTeacher();
              if (onSignOut) onSignOut();
              onAuthorizedLogin(null);
            }}
            className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-rose-600/20"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج والتبديل إلى الحساب الرسمي</span>
          </button>
        </div>
      </div>
    );
  }

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await signInWithGoogle();
      if (user && isEmailAllowed(user.email)) {
        saveTeacherSession(user);
        onAuthorizedLogin(user);
      } else {
        clearTeacherSession();
        await signOutTeacher();
        setError(
          `عذراً، البريد (${user?.email || 'المحدد'}) غير مصرح له بالدخول. يرجى اختيار حساب الأستاذ محمد هشام الرسمي.`
        );
      }
    } catch (err: any) {
      console.warn('Google sign-in error:', err);
      if (
        err?.code === 'auth/popup-closed-by-user' || 
        err?.code === 'auth/cancelled-popup-request' ||
        err?.message?.includes('closed-by-user')
      ) {
        // Closed intentionally by user, no loud error needed
        setError(null);
      } else if (err?.code === 'auth/popup-blocked') {
        setError(
          'تم حظر النافذة المنبثقة من قبل المتصفح. يرجى السماح بالنوافذ المنبثقة (Popups) للموقع والمحاولة مرة أخرى.'
        );
      } else if (err?.message?.includes('غير مصرح له')) {
        setError(err.message);
      } else {
        setError(
          'تعذر استكمال تسجيل الدخول عبر Google. يرجى التأكد من اتصال الإنترنت والمحاولة مجدداً.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden selection:bg-amber-500" dir="rtl">
      {/* Background glowing ambiance */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-amber-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-orange-600/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Card */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80">
          <div className="text-center mb-6">
            {/* Teacher Portrait & Glow */}
            <div className="relative inline-block mb-4">
              <div className="absolute -inset-1.5 bg-gradient-to-tr from-amber-500 to-orange-500 rounded-full blur-md opacity-70 animate-pulse" />
              <img 
                src={`${import.meta.env.BASE_URL}teacher-logo.jpg`} 
                alt="Mr Mohamed Hesham" 
                className="relative w-24 h-24 rounded-full object-cover border-2 border-amber-400 shadow-xl"
              />
              <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow font-bold text-xs">
                <Sparkles className="w-3.5 h-3.5 fill-current" />
              </div>
            </div>

            <h1 className="text-2xl font-black text-white tracking-tight">
              منصة Mr. Mohamed Hesham
            </h1>
            <p className="text-xs text-amber-300/90 font-medium mt-1">
              سجلات الطلاب والامتحانات والنتائج الأكاديمية
            </p>
          </div>

          {/* Error notice */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs flex items-start gap-2.5 leading-relaxed">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Google Sign In Button */}
          <button
            id="btn-google-login"
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-4 px-5 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-2xl shadow-xl shadow-white/5 flex items-center justify-center gap-3 transition-all cursor-pointer active:scale-98 disabled:opacity-60 group border border-white/20"
          >
            {loading ? (
              <RefreshCw className="w-5 h-5 text-amber-600 animate-spin" />
            ) : (
              <svg className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
            )}
            <span className="text-sm sm:text-base">
              {loading ? 'جاري التحقق عبر Google...' : 'تسجيل الدخول بحساب Google المعتمد'}
            </span>
          </button>

          {/* Security Guarantee Footer */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 space-y-1.5 text-center">
            <div className="flex items-center justify-center gap-2 text-[11px] text-emerald-400 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>تسجيل دخول رسمي ومحمي للأستاذ محمد هشام</span>
            </div>
            <p className="text-[10px] text-slate-500">
              Google SSO Verified Authentication
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
