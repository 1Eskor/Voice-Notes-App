'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AuthPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);

      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'https://voice-notes-app-navy.vercel.app/following',
        },
      });

      if (error) throw error;
    } catch (err: any) {
      console.error('Google OAuth failed:', err);
      setErrorMsg(err.message || 'Failed to authenticate via Google.');
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
      <div className="w-full max-w-sm bg-neutral-900/50 border border-white/5 shadow-2xl shadow-black/80 rounded-3xl p-8 backdrop-blur-2xl relative z-10">
        
        {/* Title / Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="w-2.5 h-6 bg-cyan-400 rounded-full animate-[pulse_1s_infinite_100ms]" />
            <span className="w-2.5 h-8 bg-cyan-500 rounded-full animate-[pulse_1s_infinite_300ms]" />
            <span className="w-2.5 h-5 bg-violet-500 rounded-full animate-[pulse_1s_infinite_500ms]" />
            <span className="text-xl font-bold tracking-tight text-white ml-1">VoiceNote</span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Listen and record short voice updates.
          </p>
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div className="text-xs text-rose-400 bg-rose-500/5 border border-rose-500/10 rounded-xl p-3 text-center mb-4">
            {errorMsg}
          </div>
        )}

        {/* OAuth Submit Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full py-3.5 px-4 bg-white hover:bg-neutral-100 text-black text-sm font-bold rounded-xl disabled:opacity-50 disabled:pointer-events-none transition-all duration-300 shadow-xl shadow-white/5 flex items-center justify-center gap-3 cursor-pointer"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Connecting...
            </>
          ) : (
            <>
              {/* Google SVG logo */}
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
