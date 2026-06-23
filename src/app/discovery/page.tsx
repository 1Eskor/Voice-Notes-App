'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { NoteWithProfile } from '@/lib/types';
import NoteCard from '@/components/NoteCard';
import { useAudioPlayer } from '@/stores/useAudioPlayer';

export default function DiscoveryPage() {
  const [promotedNotes, setPromotedNotes] = useState<NoteWithProfile[]>([]);
  const [notes, setNotes] = useState<NoteWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFallbackMode, setIsFallbackMode] = useState(false);

  const setQueue = useAudioPlayer((state) => state.setQueue);

  useEffect(() => {
    const fetchDiscoveryData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setIsFallbackMode(false);
        
        const supabase = createClient();
        
        // 1. Fetch Promoted Notes (is_promoted = true)
        let localPromoted: NoteWithProfile[] = [];
        try {
          const { data: promData, error: promError } = await supabase
            .from('notes')
            .select('*, profiles!user_id(username, display_picture, is_premium)')
            .eq('is_promoted', true)
            .order('created_at', { ascending: false })
            .limit(3);

          if (promError) throw promError;

          localPromoted = (promData || []).map((item: any) => {
            const profileData = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
            return {
              ...item,
              profiles: profileData || { username: 'Anonymous', display_picture: null },
            } as NoteWithProfile;
          });
          setPromotedNotes(localPromoted);
        } catch (err) {
          console.error('Error fetching promoted notes:', err);
        }

        // 2. Fetch Trending Notes (Last 48 hours sorted by likes)
        const now = new Date();
        const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

        let { data, error: queryError } = await supabase
          .from('notes')
          .select('*, profiles!user_id(username, display_picture, is_premium)')
          .gte('created_at', fortyEightHoursAgo)
          .order('likes_count', { ascending: false })
          .limit(20);

        if (queryError) throw queryError;

        // Fallback: fetch all-time trending if no recent notes exist
        if (!data || data.length === 0) {
          console.log('No notes found in the last 48 hours. Fetching all-time trending fallback...');
          const fallbackRes = await supabase
            .from('notes')
            .select('*, profiles!user_id(username, display_picture, is_premium)')
            .order('likes_count', { ascending: false })
            .limit(20);

          if (fallbackRes.error) throw fallbackRes.error;
          data = fallbackRes.data;
          setIsFallbackMode(true);
        }

        const formattedNotes: NoteWithProfile[] = (data || []).map((item: any) => {
          const profileData = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
          return {
            ...item,
            profiles: profileData || { username: 'Anonymous', display_picture: null },
          } as NoteWithProfile;
        });

        setNotes(formattedNotes);

        // Update global audio player queue combining promoted and trending notes
        const combinedQueue = [...localPromoted, ...formattedNotes];
        if (combinedQueue.length > 0) {
          setQueue(combinedQueue);
        }
      } catch (err: any) {
        console.error('Error loading discovery data:', err);
        setError(err.message || 'Failed to fetch discovery feed.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDiscoveryData();
  }, [setQueue]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Page Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-white tracking-tight bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
          Discovery
        </h1>
        <p className="text-sm text-neutral-400 mt-1">
          Trending and popular notes across the network.
        </p>
      </header>

      {/* Fallback Notice */}
      {isFallbackMode && notes.length > 0 && (
        <div className="mb-8 p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/20 flex items-center gap-3">
          <span className="text-base">ℹ️</span>
          <p className="text-xs text-cyan-400/95 font-medium">
            No notes were posted in the last 48 hours. Showing overall top trending voice logs instead!
          </p>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading ? (
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <div className="w-32 h-3 bg-neutral-800 rounded animate-pulse" />
            <div className="w-full h-24 bg-neutral-900/20 border border-white/5 rounded-2xl animate-pulse" />
          </div>
          <div className="flex flex-col gap-4">
            <div className="w-32 h-3 bg-neutral-800 rounded animate-pulse" />
            <div className="w-full h-24 bg-neutral-900/20 border border-white/5 rounded-2xl animate-pulse" />
          </div>
        </div>
      ) : error ? (
        /* Error State */
        <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-rose-500/5 border border-rose-500/10 text-center">
          <span className="text-2xl mb-2">⚠️</span>
          <h3 className="text-white font-bold">Failed to load Discovery</h3>
          <p className="text-rose-400/80 text-xs mt-1 max-w-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 rounded-lg bg-neutral-850 hover:bg-neutral-800 border border-white/5 text-xs text-white transition-all font-medium"
          >
            Retry
          </button>
        </div>
      ) : notes.length === 0 && promotedNotes.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center min-h-[45vh] text-center p-6 border border-dashed border-white/5 rounded-3xl bg-neutral-950/20">
          <div className="w-14 h-14 rounded-full bg-neutral-900 border border-white/10 flex items-center justify-center mb-4 shadow-xl">
            <span className="text-2xl text-neutral-400">🔍</span>
          </div>
          <h2 className="text-white font-bold text-lg">Discovery is empty</h2>
          <p className="text-neutral-400 text-sm max-w-xs mt-1">
            No notes have been posted on the platform yet. Be the first to record one!
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Promoted Section */}
          {promotedNotes.length > 0 && (
            <section>
              <h2 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                <span>⚡</span> Promoted Takes
              </h2>
              <div className="flex flex-col gap-4">
                {promotedNotes.map((note) => (
                  <div
                    key={note.id}
                    className="relative rounded-2xl p-[1px] bg-gradient-to-r from-amber-500/15 via-violet-500/15 to-cyan-500/15 hover:from-amber-500/30 hover:to-cyan-500/30 transition-all duration-300 shadow-md shadow-amber-500/[0.01]"
                  >
                    <NoteCard note={note} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Trending Section */}
          {notes.length > 0 && (
            <section>
              <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                <span>📈</span> Trending Now
              </h2>
              <div className="flex flex-col gap-4">
                {notes.map((note) => (
                  <NoteCard key={note.id} note={note} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
