'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AuthRedirect({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const activeSession = !!session;
        setHasSession(activeSession);
        
        if (!activeSession && pathname !== '/auth') {
          router.push('/auth');
        } else if (activeSession && pathname === '/auth') {
          router.push('/following');
        }
      } catch (err) {
        console.error('Session verification error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    // Subscribe to auth state updates (handling logouts/logins in other tabs or sessions)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const activeSession = !!session;
      setHasSession(activeSession);
      
      if (!activeSession && pathname !== '/auth') {
        router.push('/auth');
      } else if (activeSession && pathname === '/auth') {
        router.push('/following');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  // Immediately render the auth page content without blocking (avoid redirect loops)
  if (pathname === '/auth') {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center gap-4">
        {/* Sleek animated loading indicator */}
        <div className="relative w-10 h-10 flex items-center justify-center">
          <span className="absolute inset-0 rounded-full border-2 border-white/5" />
          <span className="absolute inset-0 rounded-full border-t-2 border-cyan-400 animate-spin" />
        </div>
        <span className="text-xs text-neutral-500 font-medium tracking-wide">Syncing session...</span>
      </div>
    );
  }

  // Render children only if session is confirmed active
  return hasSession ? <>{children}</> : null;
}
