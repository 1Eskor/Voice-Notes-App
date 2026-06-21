'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    try {
      setIsLoading(true);
      setErrorMsg(null);
      setSignUpSuccess(false);

      const supabase = createClient();

      if (isLogin) {
        // Sign In logic
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (error) throw error;

        // Redirect on successful login
        if (data.session) {
          router.push('/following');
        }
      } else {
        // Sign Up logic
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
        });

        if (error) throw error;

        if (data.session) {
          // Signed up and logged in automatically
          router.push('/following');
        } else {
          // Signed up but requires email validation
          setSignUpSuccess(true);
          setEmail('');
          setPassword('');
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 relative">
      {/* Decorative background glows */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />

      {/* Card container */}
      <div className="w-full max-w-md bg-neutral-900/50 border border-white/5 shadow-2xl shadow-black/80 rounded-3xl p-8 backdrop-blur-2xl relative z-10">
        
        {/* Title / Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="w-2.5 h-6 bg-cyan-400 rounded-full animate-[pulse_1s_infinite_100ms]" />
            <span className="w-2.5 h-8 bg-cyan-500 rounded-full animate-[pulse_1s_infinite_300ms]" />
            <span className="w-2.5 h-5 bg-violet-500 rounded-full animate-[pulse_1s_infinite_500ms]" />
            <span className="text-xl font-bold tracking-tight text-white ml-1">VoiceNote</span>
          </div>
          <p className="text-xs text-neutral-400">
            {isLogin ? 'Log in to listen and record voice updates.' : 'Create an account to start sharing voice notes.'}
          </p>
        </div>

        {/* Success Alert (Signup validation) */}
        {signUpSuccess && (
          <div className="mb-6 p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-xs text-cyan-400">
            💡 <strong>Check your inbox!</strong> A verification link has been sent to your email to activate your account.
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {/* Email input */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email-input" className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
              Email Address
            </label>
            <input
              id="email-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
              className="w-full px-4 py-3 bg-neutral-950/50 border border-white/5 focus:border-cyan-500/40 rounded-xl text-sm text-white placeholder-neutral-600 outline-none transition-colors"
            />
          </div>

          {/* Password input */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password-input" className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
              Password
            </label>
            <input
              id="password-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
              className="w-full px-4 py-3 bg-neutral-950/50 border border-white/5 focus:border-cyan-500/40 rounded-xl text-sm text-white placeholder-neutral-600 outline-none transition-colors"
            />
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="text-xs text-rose-400 bg-rose-500/5 border border-rose-500/10 rounded-xl p-3 text-center">
              {errorMsg}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 mt-2 bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-white text-sm font-semibold rounded-xl disabled:opacity-50 disabled:pointer-events-none transition-all duration-300 shadow-lg shadow-cyan-500/10 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : isLogin ? (
              'Log In'
            ) : (
              'Sign Up'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-white/5" />
          <span className="px-3 text-[10px] uppercase font-bold text-neutral-600 tracking-widest">or</span>
          <div className="flex-1 border-t border-white/5" />
        </div>

        {/* Toggle between Login and Signup */}
        <div className="text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setErrorMsg(null);
              setSignUpSuccess(false);
            }}
            disabled={isLoading}
            className="text-xs text-neutral-400 hover:text-white transition-colors"
          >
            {isLogin ? (
              <>
                Need an account? <span className="text-cyan-400 font-semibold hover:underline">Sign Up</span>
              </>
            ) : (
              <>
                Already have an account? <span className="text-cyan-400 font-semibold hover:underline">Log In</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
