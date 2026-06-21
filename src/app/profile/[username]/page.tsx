'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { NoteWithProfile, Profile } from '@/lib/types';
import NoteCard from '@/components/NoteCard';
import { useAudioPlayer } from '@/stores/useAudioPlayer';
import { useRouter } from 'next/navigation';

type DurationFilter = 'All' | 'Quick Hits' | 'Deep Dives';

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export default function UserProfilePage({ params }: ProfilePageProps) {
  const resolvedParams = React.use(params);
  const username = resolvedParams.username;
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notes, setNotes] = useState<NoteWithProfile[]>([]);
  const [activeFilter, setActiveFilter] = useState<DurationFilter>('All');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Follow/Social States
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isFollowMutating, setIsFollowMutating] = useState(false);

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

  const handleFollowToggle = async () => {
    if (!currentUserId || !profile || isFollowMutating) return;

    try {
      setIsFollowMutating(true);
      const supabase = createClient();

      if (isFollowing) {
        // Optimistic UI updates
        setIsFollowing(false);
        setFollowersCount((prev) => Math.max(0, prev - 1));

        const { error: deleteError } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', profile.id);

        if (deleteError) throw deleteError;
      } else {
        // Optimistic UI updates
        setIsFollowing(true);
        setFollowersCount((prev) => prev + 1);

        const { error: insertError } = await supabase
          .from('follows')
          .insert({
            follower_id: currentUserId,
            following_id: profile.id,
          });

        if (insertError) throw insertError;
      }
    } catch (err) {
      console.error('Failed to toggle follow status:', err);
      // Revert states on error
      setIsFollowing(!isFollowing);
      setFollowersCount((prev) => isFollowing ? prev + 1 : Math.max(0, prev - 1));
    } finally {
      setIsFollowMutating(false);
    }
  };

  useEffect(() => {
    const fetchProfileAndNotes = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const supabase = createClient();

        // 1. Get authenticated user
        const { data: { user } } = await supabase.auth.getUser();
        const loggedInId = user?.id || null;
        setCurrentUserId(loggedInId);

        // 2. Fetch targeted profile
        const { data: targetProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username)
          .maybeSingle();

        if (profileError) throw profileError;

        if (!targetProfile) {
          setError(`User @${username} does not exist.`);
          setIsLoading(false);
          return;
        }

        setProfile(targetProfile);
        const targetUserId = targetProfile.id;
        const selfProfile = loggedInId === targetUserId;
        setIsOwnProfile(selfProfile);

        // 3. Fetch Follow Statistics
        const { count: followers } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', targetUserId);

        const { count: following } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', targetUserId);

        setFollowersCount(followers || 0);
        setFollowingCount(following || 0);

        // 4. Check if currently following
        if (loggedInId && !selfProfile) {
          const { data: followRecord } = await supabase
            .from('follows')
            .select('*')
            .eq('follower_id', loggedInId)
            .eq('following_id', targetUserId)
            .maybeSingle();

          setIsFollowing(!!followRecord);
        }

        // 5. Fetch Target user's Notes
        let query = supabase
          .from('notes')
          .select('*, profiles!user_id(username, display_picture)')
          .eq('user_id', targetUserId);

        if (activeFilter === 'Quick Hits') {
          query = query.lt('duration_seconds', 60);
        } else if (activeFilter === 'Deep Dives') {
          query = query.gte('duration_seconds', 60);
        }

        const { data: notesData, error: notesError } = await query
          .order('created_at', { ascending: false });

        if (notesError) throw notesError;

        const formattedNotes: NoteWithProfile[] = (notesData || []).map((item: any) => {
          const noteProfile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
          return {
            ...item,
            profiles: noteProfile || targetProfile,
          } as NoteWithProfile;
        });

        setNotes(formattedNotes);

        if (formattedNotes.length > 0) {
          setQueue(formattedNotes);
        }
      } catch (err: any) {
        console.error('Error fetching dynamic user profile:', err);
        setError(err.message || 'Failed to load profile details.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileAndNotes();
  }, [username, activeFilter, setQueue]);

  const initials = profile?.username?.slice(0, 2).toUpperCase() || '??';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {isLoading ? (
        // Loading Skeletons
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-neutral-800 animate-pulse mb-4" />
          <div className="w-32 h-6 bg-neutral-800 animate-pulse rounded mb-8" />
          <div className="w-full flex flex-col gap-4">
            {Array.from({ length: 2 }).map((_, idx) => (
              <div key={idx} className="w-full h-24 bg-neutral-900/40 rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      ) : error ? (
        // Error Display
        <div className="flex flex-col items-center justify-center min-h-[45vh] text-center p-6 bg-rose-500/5 border border-rose-500/10 rounded-3xl">
          <span className="text-3xl mb-3">⚠️</span>
          <h2 className="text-white font-bold text-lg">Failed to load profile</h2>
          <p className="text-rose-400 text-sm mt-1 max-w-sm">{error}</p>
          <button
            onClick={() => router.replace('/following')}
            className="mt-6 px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-xs font-semibold text-white border border-white/5"
          >
            Back to Feed
          </button>
        </div>
      ) : (
        profile && (
          <>
            {/* Profile Header Card */}
            <section className="flex flex-col items-center text-center mb-10 p-6 rounded-3xl bg-neutral-900/20 border border-white/5 backdrop-blur-xl relative overflow-hidden">
              <div className="absolute -inset-10 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 blur-2xl opacity-50 pointer-events-none" />
              
              {/* Sign Out Button (Only for own profiles) */}
              {isOwnProfile && (
                <button
                  onClick={handleSignOut}
                  className="absolute top-4 right-4 text-xs font-semibold text-neutral-400 hover:text-rose-500 border border-white/5 hover:border-rose-500/20 px-3 py-1.5 rounded-lg bg-neutral-950/80 transition-colors"
                >
                  Log Out
                </button>
              )}

              {/* Avatar picture */}
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
              
              {/* Follow / Edit Button */}
              <div className="mt-4">
                {isOwnProfile ? (
                  <button className="px-5 py-2 bg-neutral-800 hover:bg-neutral-750 border border-white/10 text-xs font-bold text-white rounded-full transition-all cursor-not-allowed opacity-60">
                    Edit Profile
                  </button>
                ) : (
                  <button
                    onClick={handleFollowToggle}
                    disabled={!currentUserId || isFollowMutating}
                    className={`px-6 py-2 text-xs font-bold rounded-full transition-all duration-300 ${
                      isFollowing
                        ? 'bg-neutral-800 hover:bg-rose-950/30 hover:text-rose-400 border border-white/10 hover:border-rose-500/20 text-white'
                        : 'bg-white hover:bg-neutral-200 text-black shadow-lg shadow-white/5'
                    }`}
                  >
                    {isFollowing ? 'Unfollow' : 'Follow'}
                  </button>
                )}
              </div>

              {/* Stat count row */}
              <div className="flex gap-8 mt-6 border-t border-white/5 pt-6 w-full justify-center">
                <div className="text-center">
                  <span className="block text-lg font-bold text-white">{notes.length}</span>
                  <span className="text-xs text-neutral-500">Notes</span>
                </div>
                <div className="text-center">
                  <span className="block text-lg font-bold text-white">{followersCount}</span>
                  <span className="text-xs text-neutral-500">Followers</span>
                </div>
                <div className="text-center">
                  <span className="block text-lg font-bold text-white">{followingCount}</span>
                  <span className="text-xs text-neutral-500">Following</span>
                </div>
              </div>
            </section>

            {/* Filter Tabs */}
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
            {notes.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[25vh] text-center p-6 border border-dashed border-white/5 rounded-3xl bg-neutral-950/20">
                <span className="text-2xl mb-3">📭</span>
                <h2 className="text-white font-bold text-sm">No notes here</h2>
                <p className="text-neutral-500 text-xs max-w-xs mt-1">
                  {activeFilter === 'All'
                    ? `@${profile.username} hasn't uploaded any voice notes yet.`
                    : `No notes found matching the "${activeFilter}" duration criteria.`}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {notes.map((note) => (
                  <NoteCard key={note.id} note={note} />
                ))}
              </div>
            )}
          </>
        )
      )}
    </div>
  );
}
