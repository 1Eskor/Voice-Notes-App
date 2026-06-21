'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { NoteWithProfile, Profile } from '@/lib/types';
import NoteCard from '@/components/NoteCard';
import { useAudioPlayer } from '@/stores/useAudioPlayer';
import { useRouter } from 'next/navigation';


type DurationFilter = 'All' | 'Quick Hits' | 'Deep Dives';

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notes, setNotes] = useState<NoteWithProfile[]>([]);
  const [activeFilter, setActiveFilter] = useState<DurationFilter>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const setQueue = useAudioPlayer((state) => state.setQueue);

  const handleSignOut = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/auth');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };


  useEffect(() => {
    const fetchProfileAndNotes = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const supabase = createClient();

        // 1. Authenticate user or fall back to mock creator
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user ? user.id : '315b3788-36e3-4298-ba7d-e564d55e160a';

        // 2. Fetch profile details
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (profileError) {
          console.warn('Failed to load profile from database:', profileError);
        }

        // Set state profile, fall back to mock details if row doesn't exist
        const activeProfile: Profile = profileData || {
          id: userId,
          username: user ? user.email?.split('@')[0] || 'MyProfile' : 'TestCreator',
          display_picture: user ? null : 'https://ui-avatars.com/api/?name=Test+Creator&background=0D8ABC&color=fff',
          created_at: new Date().toISOString(),
        };
        setProfile(activeProfile);

        // 3. Fetch notes based on current active duration filter
        let query = supabase
          .from('notes')
          .select('*, profiles!user_id(username, display_picture)')
          .eq('user_id', userId);

        if (activeFilter === 'Quick Hits') {
          query = query.lt('duration_seconds', 60);
        } else if (activeFilter === 'Deep Dives') {
          query = query.gte('duration_seconds', 60);
        }

        const { data: notesData, error: notesError } = await query
          .order('created_at', { ascending: false });

        if (notesError) throw notesError;

        // Map and format note profiles to guarantee correct types
        const formattedNotes: NoteWithProfile[] = (notesData || []).map((item: any) => {
          const noteProfile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
          return {
            ...item,
            profiles: noteProfile || activeProfile,
          } as NoteWithProfile;
        });

        setNotes(formattedNotes);

        // Set queue for skipping
        if (formattedNotes.length > 0) {
          setQueue(formattedNotes);
        }
      } catch (err: any) {
        console.error('Error fetching profile and notes:', err);
        setError(err.message || 'Failed to load profile data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileAndNotes();
  }, [activeFilter, setQueue]);

  const initials = profile?.username?.slice(0, 2).toUpperCase() || '??';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Profile Header */}
      {profile && (
        <section className="flex flex-col items-center text-center mb-10 p-6 rounded-3xl bg-neutral-900/20 border border-white/5 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute -inset-10 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 blur-2xl opacity-50 pointer-events-none" />
          
          {/* Sign Out Button */}
          <button
            onClick={handleSignOut}
            className="absolute top-4 right-4 text-xs font-semibold text-neutral-400 hover:text-rose-500 border border-white/5 hover:border-rose-500/20 px-3 py-1.5 rounded-lg bg-neutral-950/80 transition-colors"
          >
            Log Out
          </button>

          {/* Display picture / Avatar fallback */}
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 p-[2px] shadow-2xl relative mb-4">
            <div className="w-full h-full rounded-full bg-neutral-950 flex items-center justify-center overflow-hidden">
              {profile.display_picture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.display_picture}
                  alt={profile.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-violet-400">
                  {initials}
                </span>
              )}
            </div>
          </div>

          <h1 className="text-2xl font-extrabold text-white">@{profile.username}</h1>
          <p className="text-xs text-neutral-500 mt-1 font-mono">ID: {profile.id}</p>

          {/* Stat count row */}
          <div className="flex gap-8 mt-6 border-t border-white/5 pt-6 w-full justify-center">
            <div className="text-center">
              <span className="block text-lg font-bold text-white">{notes.length}</span>
              <span className="text-xs text-neutral-500">Notes</span>
            </div>
            <div className="text-center">
              <span className="block text-lg font-bold text-white">120</span>
              <span className="text-xs text-neutral-500">Followers</span>
            </div>
            <div className="text-center">
              <span className="block text-lg font-bold text-white">84</span>
              <span className="text-xs text-neutral-500">Following</span>
            </div>
          </div>
        </section>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-6 p-[4px] rounded-xl bg-neutral-950 border border-white/5 max-w-sm">
        {(['All', 'Quick Hits', 'Deep Dives'] as DurationFilter[]).map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 ${
              activeFilter === filter
                ? 'bg-neutral-800 text-white shadow-md'
                : 'text-neutral-500 hover:text-white bg-transparent'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Profile Feed list */}
      {isLoading ? (
        // Loading skeleton
        <div className="flex flex-col gap-4">
          {Array.from({ length: 2 }).map((_, idx) => (
            <div
              key={idx}
              className="w-full flex items-start gap-4 p-4 rounded-2xl bg-neutral-900/20 border border-white/5 animate-pulse"
            >
              <div className="w-10 h-10 rounded-full bg-neutral-800 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex gap-2 mb-2">
                  <div className="w-20 h-3 bg-neutral-800 rounded" />
                  <div className="w-10 h-3 bg-neutral-800 rounded" />
                </div>
                <div className="w-32 h-4 bg-neutral-800 rounded mb-4" />
                <div className="w-full h-8 bg-neutral-800/50 rounded-sm" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        // Error state
        <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-rose-500/5 border border-rose-500/10 text-center">
          <span className="text-2xl mb-2">⚠️</span>
          <h3 className="text-white font-bold">Failed to load feed</h3>
          <p className="text-rose-400/80 text-xs mt-1 max-w-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 rounded-lg bg-neutral-850 hover:bg-neutral-800 border border-white/5 text-xs text-white transition-all font-medium"
          >
            Retry
          </button>
        </div>
      ) : notes.length === 0 ? (
        // Empty feed state
        <div className="flex flex-col items-center justify-center min-h-[30vh] text-center p-6 border border-dashed border-white/5 rounded-3xl bg-neutral-950/20">
          <span className="text-2xl mb-3">📭</span>
          <h2 className="text-white font-bold text-sm">No notes here</h2>
          <p className="text-neutral-500 text-xs max-w-xs mt-1">
            {activeFilter === 'All'
              ? "You haven't uploaded any voice notes yet."
              : `No notes found matching the "${activeFilter}" duration criteria.`}
          </p>
        </div>
      ) : (
        // Render Notes
        <div className="flex flex-col gap-4">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      )}
    </div>
  );
}
