'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { NoteWithProfile } from '@/lib/types';
import NoteCard from '@/components/NoteCard';
import { useAudioPlayer } from '@/stores/useAudioPlayer';
import VoiceSkipListener from '@/components/VoiceSkipListener';

export default function FollowingPage() {
  const [notes, setNotes] = useState<NoteWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setQueue = useAudioPlayer((state) => state.setQueue);
  const isHandsFreeEnabled = useAudioPlayer((state) => state.isHandsFreeEnabled);
  const toggleHandsFree = useAudioPlayer((state) => state.toggleHandsFree);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        setIsLoading(true);
        const supabase = createClient();

        const { data, error: queryError } = await supabase
          .from('notes')
          .select('*, profiles!user_id(username, display_picture, is_premium)')
          .order('created_at', { ascending: false })
          .limit(20);

        if (queryError) throw queryError;

        // Map and format incoming data to guarantee correct types
        const formattedNotes: NoteWithProfile[] = (data || []).map((item: any) => {
          const profileData = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
          return {
            ...item,
            profiles: profileData || { username: 'Anonymous', display_picture: null },
          } as NoteWithProfile;
        });

        setNotes(formattedNotes);
        // Set these notes as the active queue for background play skipping
        if (formattedNotes.length > 0) {
          setQueue(formattedNotes);
        }
      } catch (err: any) {
        console.error('Error loading notes:', err);
        setError(err.message || 'Failed to fetch notes.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotes();
  }, [setQueue]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {isHandsFreeEnabled && <VoiceSkipListener />}

      {/* Feed Header */}
      <header className="mb-8 flex justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
            Following
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Stay updated with audio logs from people you follow.
          </p>
        </div>

        {/* Hands-Free Mode Toggle */}
        <button
          onClick={toggleHandsFree}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all duration-300 cursor-pointer border ${
            isHandsFreeEnabled
              ? 'bg-gradient-to-r from-violet-500 to-pink-500 text-white border-transparent shadow-lg shadow-violet-500/20'
              : 'bg-neutral-900/40 text-neutral-400 hover:text-white border-white/5 hover:bg-neutral-900/80'
          }`}
          title={isHandsFreeEnabled ? 'Disable Hands-Free Mode' : 'Enable Hands-Free Mode'}
        >
          {isHandsFreeEnabled ? (
            <>
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span>Hands-Free On</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
              </svg>
              <span>Hands-Free Off</span>
            </>
          )}
        </button>
      </header>

      {/* Feed Content */}
      {isLoading ? (
        // Sleek skeleton list while fetching
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
        // Error Display
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
        // Empty State
        <div className="flex flex-col items-center justify-center min-h-[45vh] text-center p-6 border border-dashed border-white/5 rounded-3xl bg-neutral-950/20">
          <div className="w-14 h-14 rounded-full bg-neutral-900 border border-white/10 flex items-center justify-center mb-4 shadow-xl">
            <span className="text-2xl text-neutral-400">🎙️</span>
          </div>
          <h2 className="text-white font-bold text-lg">No notes yet</h2>
          <p className="text-neutral-400 text-sm max-w-xs mt-1">
            Follow someone to hear their voice updates in this feed!
          </p>
        </div>
      ) : (
        // Note Feed list
        <div className="flex flex-col gap-4">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      )}
    </div>
  );
}
