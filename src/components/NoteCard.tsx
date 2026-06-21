'use client';

import React, { useState, useEffect } from 'react';
import { NoteWithProfile } from '@/lib/types';
import { useAudioPlayer } from '@/stores/useAudioPlayer';
import Waveform from './Waveform';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface NoteCardProps {
  note: NoteWithProfile;
}

// Simple local relative time formatter to avoid heavy dependencies
function formatTimeAgo(dateString: string): string {
  try {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export default function NoteCard({ note }: NoteCardProps) {
  const currentTrack = useAudioPlayer((state) => state.currentTrack);
  const currentTime = useAudioPlayer((state) => state.currentTime);
  const duration = useAudioPlayer((state) => state.duration);
  const isPlaying = useAudioPlayer((state) => state.isPlaying);
  const setTrack = useAudioPlayer((state) => state.setTrack);

  const isCurrentTrack = currentTrack?.id === note.id;
  const isNotePlaying = isCurrentTrack && isPlaying;

  const [isLiked, setIsLiked] = useState(note.is_liked || false);
  const [likesCount, setLikesCount] = useState(note.likes_count || 0);

  useEffect(() => {
    const checkLikeStatus = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: likeRecord } = await supabase
          .from('likes')
          .select('*')
          .eq('user_id', user.id)
          .eq('note_id', note.id)
          .maybeSingle();

        if (likeRecord) {
          setIsLiked(true);
        }
      } catch (err) {
        console.error('Error checking like status:', err);
      }
    };

    checkLikeStatus();
  }, [note.id]);

  const handlePlayCard = () => {
    // If it's already playing, clicking again toggles play/pause
    if (isCurrentTrack) {
      if (isPlaying) {
        useAudioPlayer.getState().pause();
      } else {
        useAudioPlayer.getState().play();
      }
    } else {
      setTrack(note);
    }
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('You must be logged in to like voice notes!');
        return;
      }

      const nextLikedState = !isLiked;
      const nextLikesCount = nextLikedState ? likesCount + 1 : Math.max(0, likesCount - 1);

      // Optimistically update frontend UI states
      setIsLiked(nextLikedState);
      setLikesCount(nextLikesCount);

      if (nextLikedState) {
        const { error } = await supabase
          .from('likes')
          .insert({ user_id: user.id, note_id: note.id });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('note_id', note.id);
        if (error) throw error;
      }
    } catch (err) {
      console.error('Failed to toggle like record:', err);
      // Revert optimistic state values
      setIsLiked(isLiked);
      setLikesCount(likesCount);
    }
  };

  const username = note.profiles?.username ?? 'Anonymous';
  const displayPicture = note.profiles?.display_picture;
  const initials = username.slice(0, 2).toUpperCase();

  return (
    <div
      onClick={handlePlayCard}
      className={`group w-full flex items-start gap-4 p-4 rounded-2xl bg-neutral-900/40 hover:bg-neutral-900/80 border border-white/5 hover:border-white/10 transition-all duration-300 cursor-pointer ${
        isCurrentTrack ? 'bg-neutral-900/90 border-cyan-500/30' : ''
      }`}
    >
      {/* Left: Avatar */}
      <div className="w-10 h-10 rounded-full flex-shrink-0 bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-white/10 flex items-center justify-center overflow-hidden relative">
        {displayPicture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayPicture}
            alt={username}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-xs font-semibold text-cyan-400">{initials}</span>
        )}
        
        {/* Playing Indicator Overlay */}
        {isNotePlaying && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="flex gap-[2px] items-end h-3">
              <span className="w-[2px] bg-cyan-400 animate-[bounce_1s_infinite_100ms] h-full" />
              <span className="w-[2px] bg-cyan-400 animate-[bounce_1s_infinite_300ms] h-2/3" />
              <span className="w-[2px] bg-cyan-400 animate-[bounce_1s_infinite_500ms] h-full" />
            </span>
          </div>
        )}
      </div>

      {/* Middle: Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-xs text-white/40 mb-1">
          <Link
            href={`/profile/${username}`}
            onClick={(e) => e.stopPropagation()}
            className="font-medium text-white/60 hover:text-cyan-400 transition-colors"
          >
            @{username}
          </Link>
          <span>•</span>
          <span>{formatTimeAgo(note.created_at)}</span>
        </div>

        <h3 className="text-sm font-bold text-white mb-3 truncate group-hover:text-cyan-400 transition-colors duration-300">
          {note.title}
        </h3>

        {/* Parse waveform data from note.waveform_url (handles JSON array or comma-separated list fallbacks) */}
        {(() => {
          let waveformArray: number[] = [];
          try {
            if (note.waveform_url) {
              const trimmed = note.waveform_url.trim();
              if (trimmed.startsWith('[')) {
                waveformArray = JSON.parse(trimmed);
              } else if (trimmed.length > 0) {
                waveformArray = trimmed.split(',').map(Number).filter((n) => !isNaN(n));
              }
            }
          } catch (e) {
            console.warn('Failed to parse waveform_url:', e);
          }

          return (
            <Waveform
              waveformData={waveformArray}
              currentTime={isCurrentTrack ? currentTime : 0}
              duration={isCurrentTrack ? duration : note.duration_seconds}
            />
          );
        })()}
      </div>

      {/* Right: Like Button */}
      <button
        onClick={handleLike}
        className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-rose-500 hover:bg-rose-500/10 transition-all duration-300 flex-shrink-0 self-center ml-2 border border-transparent hover:border-rose-500/20"
        title="Like note"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill={isLiked ? 'currentColor' : 'none'}
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className={`w-4 h-4 transition-transform duration-200 ${
            isLiked ? 'text-rose-500 scale-110' : 'group-hover:scale-105'
          }`}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
          />
        </svg>
      </button>
    </div>
  );
}
