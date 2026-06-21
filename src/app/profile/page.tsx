'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ProfileRedirect() {
  const router = useRouter();

  useEffect(() => {
    const redirectSelf = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace('/auth');
          return;
        }

        // Fetch user's username
        const { data: profileData } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .maybeSingle();

        const username = profileData?.username || user.email?.split('@')[0] || 'MyProfile';
        router.replace(`/profile/${username}`);
      } catch (err) {
        console.error('Failed to redirect user to profile:', err);
        router.replace('/following');
      }
    };

    redirectSelf();
  }, [router]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
      <div className="w-8 h-8 rounded-full border-t-2 border-cyan-400 animate-spin" />
      <span className="text-xs text-neutral-500 font-medium">Loading profile...</span>
    </div>
  );
}
