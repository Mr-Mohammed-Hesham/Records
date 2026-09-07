import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  LogIn, 
  ShieldCheck, 
  AlertTriangle, 
  Sparkles,
  ArrowRight,
  LogOut
} from 'lucide-react';
import { auth, signInWithGoogle, signOutTeacher } from '../services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, User } from 'firebase/auth';

export const OFFICIAL_EMAILS = [
  'mohammedhesham872@gmai.com',
  'mohammedhesham872@gmail.com',
  'mr.mohamed.hesham93@gmail.com'
];

interface LoginPageProps {
  currentUser: User | null;
  onAuthorizedLogin: (user?: User | any) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ currentUser, onAuthorizedLogin }) => {
  const [email, setEmail] = useState('mohammedhesham872@gmai.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isEmailAllowed = (emailToCheck?: string | null) => {
    if (!emailToCheck) return false;
    const lower = emailToCheck.trim().toLowerCase();
    return OFFICIAL_EMAILS.some(e => e.toLowerCase() === lower);
  };

  // If user signed in with unauthorized email
  if (currentUser && !isEmailAllowed(currentUser.email)) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-md w-full bg-slate-900 border border-red-500/40 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold mb-2">حساب غير مصرح له بالدخول</h2>
          <p className="text-sm text-slate-300 mb-4">
            عذراً، البريد الحالي <span className="font-mono text-amber-300 font-semibold dir-ltr">{currentUser.email}</span> غير مصرح له بالوصول إلى هذه المنصة.
          </p>
          <div className="p-3 bg-slate-800 rounded-xl text-xs text-slate-400 mb-6">
            المنصة مخصصة حصرياً للأستاذ محمد هشام عبر البريد المعتمد:
            <div className="font-mono text-amber-400 font-bold mt-1 dir-ltr">mohammedhesham872@gmai.com</div>
          </div>
          <button
            onClick={async () => {
              await signOutTeacher();
            }}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
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
      if (isEmailAllowed(user.email)) {
        onAuthorizedLogin(user);
      }
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        setError('تعذر تسجيل الدخول بواسطة Google. يرجى تجربة البريد وكلمة المرور.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    if (!isEmailAllowed(email)) {
      setError('هذا البريد غير مصرح له بالدخول. البريد المسموح هو mohammedhesham872@gmai.com فقط');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let authenticatedUser: any = null;
      try {
        const userCred = await signInWithEmailAndPassword(auth, email.trim(), password);
        authenticatedUser = userCred.user;
      } catch (signInErr: any) {
        // If user not found, create account with official email
        if (signInErr?.code === 'auth/user-not-found' || signInErr?.code === 'auth/invalid-credential') {
          const newCred = await createUserWithEmailAndPassword(auth, email.trim(), password || 'MrHesham2026!');
          authenticatedUser = newCred.user;
        } else {
          throw signInErr;
        }
      }
      onAuthorizedLogin(authenticatedUser);
    } catch (err: any) {
      setError(err?.message?.includes('password') ? 'كلمة المرور غير صحيحة أو قصيرة' : 'فشل تسجيل الدخول بالبريد الإلكتروني');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden selection:bg-amber-500" dir="rtl">
      {/* Lantern glowing ambiance */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-amber-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-orange-600/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Header Branding Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl shadow-black/80">
          <div className="text-center mb-6">
            {/* Teacher Portrait & Lantern Glow */}
            <div className="relative inline-block mb-4">
              <div className="absolute -inset-1.5 bg-gradient-to-tr from-amber-500 to-orange-500 rounded-full blur-md opacity-70 animate-pulse" />
              <img 
  src={`${import.meta.env.BASE_URL}teacher-logo.jpg`} 
  alt="Mr Mohammed Hesham" 
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
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Google Sign In */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3.5 px-4 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-xl shadow flex items-center justify-center gap-3 transition cursor-pointer mb-4 disabled:opacity-60"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>دخول سريع بحساب Google</span>
          </button>

          <div className="relative my-5 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <span className="relative px-3 bg-slate-900 text-slate-500 text-xs">أو بالبريد وكلمة المرور</span>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                البريد الإلكتروني الرسمي
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="mohammedhesham872@gmai.com"
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 dir-ltr text-left"
                  required
                />
                <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 dir-ltr text-left"
                  required
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60 mt-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'جاري التحقق...' : 'تسجيل الدخول للمنصة'}</span>
            </button>
          </form>

          {/* Security Badge */}
          <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>محمي ببروتوكول Firebase والبريد الرسمي المعتمد</span>
          </div>
        </div>
      </div>
    </div>
  );
};
