import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, LogIn, ArrowLeft, ArrowRight, ShieldCheck, UserCircle, GraduationCap } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export const Login = () => {
  const [loginPath, setLoginPath] = useState<'staff' | 'family' | null>(null);
  const [authMethod, setAuthMethod] = useState<'google' | 'email' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validateRole = async (user: any, expectedPath: 'staff' | 'family') => {
    // 1. Check Custom Claims first (most secure)
    const idTokenResult = await user.getIdTokenResult(true);
    const role = idTokenResult.claims?.role;
    
    if (role) {
      if (expectedPath === 'staff' && role !== 'staff' && role !== 'teacher') {
        throw new Error('Access Denied: This account does not have staff privileges.');
      }
      if (expectedPath === 'family' && (role === 'staff' || role === 'teacher')) {
        throw new Error('Access Denied: This account is registered as staff. Please use the Staff Portal.');
      }
      return;
    }

    // 2. Fallback: Check Firestore Profile
    const profileSnap = await getDoc(doc(db, 'users', user.uid));
    if (profileSnap.exists()) {
      const profileRole = profileSnap.data().role;
      if (expectedPath === 'staff' && profileRole !== 'staff' && profileRole !== 'teacher') {
        throw new Error('Access Denied: This account does not have staff privileges.');
      }
      if (expectedPath === 'family' && (profileRole === 'staff' || profileRole === 'teacher')) {
        throw new Error('Access Denied: This account is registered as staff. Please use the Staff Portal.');
      }
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return setError('Please enter both email and password.');
    
    try {
      setLoading(true);
      setError('');
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      if (loginPath) {
        try {
          await validateRole(userCredential.user, loginPath);
          localStorage.setItem('loginPath', loginPath);
        } catch (roleErr: any) {
          await signOut(auth);
          throw roleErr;
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      setLoading(true);
      setError('');
      
      const userCredential = await signInWithPopup(auth, provider);
      
      if (loginPath) {
        try {
          await validateRole(userCredential.user, loginPath);
          localStorage.setItem('loginPath', loginPath);
        } catch (roleErr: any) {
          await signOut(auth);
          throw roleErr;
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setLoginPath(null);
    setAuthMethod(null);
    setEmail('');
    setPassword('');
    setError('');
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-6 bg-slate-50">
      <AnimatePresence mode="wait">
        {!loginPath ? (
          <motion.div 
            key="selection"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-4xl w-full space-y-10"
          >
            <div className="text-center space-y-4">
               <div className="flex justify-center">
                 <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-200">
                   <BookOpen className="text-white" size={32} />
                 </div>
               </div>
               <h1 className="text-4xl font-black font-display text-slate-900 tracking-tight">EduConnect</h1>
               <p className="text-slate-500 font-medium">Welcome! Please choose your portal to continue.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-4">
              <motion.button 
                whileHover={{ y: -8, scale: 1.02 }}
                onClick={() => setLoginPath('staff')}
                className="bg-white p-10 rounded-[32px] shadow-sm border border-slate-100 text-left space-y-6 hover:shadow-2xl hover:shadow-indigo-100 transition-all group"
              >
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                  <GraduationCap size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-800">Staff Portal</h3>
                  <p className="text-slate-500 mt-2 text-sm">For Teachers, Department Heads, and School Administration.</p>
                </div>
                <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm pt-4">
                  Log in now <ArrowRight size={16} />
                </div>
              </motion.button>

              <motion.button 
                whileHover={{ y: -8, scale: 1.02 }}
                onClick={() => setLoginPath('family')}
                className="bg-white p-10 rounded-[32px] shadow-sm border border-slate-100 text-left space-y-6 hover:shadow-2xl hover:shadow-emerald-100 transition-all group"
              >
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                  <UserCircle size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-800">Student & Parent</h3>
                  <p className="text-slate-500 mt-2 text-sm">Access learning materials, grades, and parent updates.</p>
                </div>
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm pt-4">
                  Access Portal <ArrowRight size={16} />
                </div>
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="login-methods"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-md w-full glass-card p-10 rounded-[36px] text-center space-y-8 relative overflow-hidden bg-white border border-slate-100 shadow-xl"
          >
            <button 
              onClick={reset}
              className="absolute top-6 left-6 p-2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>

            <div className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center text-white shadow-lg ${loginPath === 'staff' ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
              {loginPath === 'staff' ? <GraduationCap size={28} /> : <UserCircle size={28} />}
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold font-display text-slate-800">
                {loginPath === 'staff' ? 'Staff Sign In' : 'Family Access'}
              </h2>
              <p className="text-slate-500 text-sm">Sign in to your account to continue.</p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-2xl flex flex-col gap-2 text-left">
                <div className="flex items-center gap-3">
                  <ShieldCheck size={16} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            {!authMethod ? (
              <div className="space-y-4">
                <button 
                  onClick={() => setAuthMethod('email')}
                  disabled={loading}
                  className="w-full h-14 flex items-center justify-center gap-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95"
                >
                  <LogIn size={20} />
                  Email & Password
                </button>
                <button 
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full h-14 flex items-center justify-center gap-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                >
                  <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
                  Continue with Google
                </button>
              </div>
            ) : (
              <form onSubmit={handleEmailLogin} className="space-y-6">
                <div className="text-left space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Email Address</label>
                    <input 
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full h-14 px-5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Password</label>
                    <input 
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-14 px-5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-xl shadow-blue-100 disabled:opacity-50"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
                <button 
                  type="button"
                  onClick={() => setAuthMethod(null)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600"
                >
                  Back to options
                </button>
              </form>
            )}

            <p className="text-[10px] text-slate-400 leading-relaxed max-w-[280px] mx-auto pt-4">
              Secure authentication powered by Firebase. Access to this portal is logged and monitored for compliance.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
