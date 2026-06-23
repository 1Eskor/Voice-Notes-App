'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { NoteWithProfile } from '@/lib/types';
import NoteCard from '@/components/NoteCard';
import { useAudioPlayer } from '@/stores/useAudioPlayer';

export default function DiscoveryPage() {
  const [notes, setNotes] = useState<NoteWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setQueue = useAudioPlayer((state) => state.setQueue);

  useEffect(() => {
    const fetchDiscoveryData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const supabase = createClient();
        
        const { data, error: queryError } = await supabase
          .from('notes_with_score')
          .select('*, profiles!user_id(username, display_picture, is_premium)')
          .order('note_score', { ascending: false })
          .limit(20);

        if (queryError) throw queryError;

        const formattedNotes: NoteWithProfile[] = (data || []).map((item: any) => {
          const profileData = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
          return {
            ...item,
            profiles: profileData || { username: 'Anonymous', display_picture: null },
          } as NoteWithProfile;
        });

        setNotes(formattedNotes);

        // Update global audio player queue
        if (formattedNotes.length > 0) {
          setQueue(formattedNotes);
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



      {/* Loading Skeletons */}
      {isLoading ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, idx) => (
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
      ) : notes.length === 0 ? (
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
        /* Discovery Feed List */
        <div className="flex flex-col gap-4">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      )}
    </div>
  );
}
