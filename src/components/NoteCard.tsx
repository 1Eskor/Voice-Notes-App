'use client';

import React from 'react';
import { NoteWithProfile } from '@/lib/types';
import { useAudioPlayer } from '@/stores/useAudioPlayer';
import Waveform from './Waveform';

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

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Like logic placeholder (will be fully integrated in Phase 3+)
    console.log('Liked note:', note.id);
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
          <span className="font-medium text-white/60 hover:text-cyan-400 transition-colors">
            @{username}
          </span>
          <span>•</span>
          <span>{formatTimeAgo(note.created_at)}</span>
        </div>

        <h3 className="text-sm font-bold text-white mb-3 truncate group-hover:text-cyan-400 transition-colors duration-300">
          {note.title}
        </h3>

        {/* Waveform component. For now, pass empty array per user spec. */}
        <Waveform
          waveformData={[]}
          currentTime={isCurrentTrack ? currentTime : 0}
          duration={isCurrentTrack ? duration : note.duration_seconds}
        />
      </div>

      {/* Right: Like Button */}
      <button
        onClick={handleLike}
        className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-rose-500 hover:bg-rose-500/10 transition-all duration-300 flex-shrink-0 self-center ml-2 border border-transparent hover:border-rose-500/20"
        title="Like note"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill={note.is_liked ? 'currentColor' : 'none'}
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className={`w-4 h-4 transition-transform duration-200 ${
            note.is_liked ? 'text-rose-500 scale-110' : 'group-hover:scale-105'
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
