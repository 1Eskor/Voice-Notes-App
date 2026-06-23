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

  // Phase 5 Updates State
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [noteTitle, setNoteTitle] = useState(note.title);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(note.title);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

  useEffect(() => {
    const fetchUserAndLikeStatus = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        setCurrentUserId(user.id);

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
        console.error('Error fetching user or checking like status:', err);
      }
    };

    fetchUserAndLikeStatus();
  }, [note.id]);

  // Close dropdown menu when clicking elsewhere
  useEffect(() => {
    if (!isMenuOpen) return;
    const closeMenu = () => setIsMenuOpen(false);
    document.addEventListener('click', closeMenu);
    return () => document.removeEventListener('click', closeMenu);
  }, [isMenuOpen]);

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

  const handleSaveTitle = async () => {
    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('notes')
        .update({ title: trimmedTitle })
        .eq('id', note.id);

      if (error) throw error;

      setNoteTitle(trimmedTitle);
      setIsEditingTitle(false);
    } catch (err: any) {
      console.error('Failed to update note title:', err);
      alert(`Failed to update title: ${err.message || err}`);
    }
  };

  const handleCancelEdit = () => {
    setEditTitle(noteTitle);
    setIsEditingTitle(false);
  };

  const handleDeleteNote = async () => {
    try {
      const supabase = createClient();
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('You must be logged in to delete notes.');
      }

      const { error } = await supabase.functions.invoke('upload-audio', {
        method: 'DELETE',
        body: { 
          noteId: note.id, 
          audioUrl: note.audio_url 
        },
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      // Stop player if we are deleting the playing track
      if (currentTrack?.id === note.id) {
        useAudioPlayer.getState().pause();
      }

      setIsDeleted(true);
    } catch (err: any) {
      console.error('Failed to delete note:', err);
      alert(`Failed to delete note: ${err.message || err}`);
    }
  };

  if (isDeleted) return null;

  if (showDeleteConfirm) {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className="group w-full flex items-center justify-between p-4 rounded-2xl bg-rose-950/20 border border-rose-500/20 transition-all duration-300"
      >
        <div className="flex flex-col gap-1 pr-4">
          <span className="text-sm font-bold text-white">Are you sure?</span>
          <span className="text-xs text-rose-300/80 leading-relaxed">This will permanently delete this note.</span>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={handleDeleteNote}
            className="px-3.5 py-2 bg-rose-500 hover:bg-rose-600 text-black text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            Yes
          </button>
          <button
            onClick={() => setShowDeleteConfirm(false)}
            className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold rounded-lg transition-colors border border-white/5 cursor-pointer"
          >
            No
          </button>
        </div>
      </div>
    );
  }

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

        {isEditingTitle ? (
          <div className="flex items-center gap-2 mb-3" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="flex-1 px-2.5 py-1 text-sm bg-neutral-950 border border-cyan-500/40 rounded-lg text-white font-semibold outline-none focus:border-cyan-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveTitle();
                if (e.key === 'Escape') handleCancelEdit();
              }}
            />
            <button
              onClick={handleSaveTitle}
              className="p-1.5 rounded bg-cyan-500 text-black hover:bg-cyan-400 transition-colors cursor-pointer"
              title="Save title"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </button>
            <button
              onClick={handleCancelEdit}
              className="p-1.5 rounded bg-neutral-800 text-white/60 hover:text-white transition-colors cursor-pointer"
              title="Cancel"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <h3 className="text-sm font-bold text-white mb-3 truncate group-hover:text-cyan-400 transition-colors duration-300">
            {noteTitle}
          </h3>
        )}

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

      {/* Right Actions: Three Dots Menu & Like Button */}
      <div className="flex flex-col items-center gap-1 self-center ml-2 flex-shrink-0">
        {/* Three Dots Contextual Menu */}
        {currentUserId === note.user_id && (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen(!isMenuOpen);
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-all duration-300 border border-transparent hover:border-white/10 cursor-pointer"
              title="More options"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z"
                />
              </svg>
            </button>

            {isMenuOpen && (
              <div
                className="absolute right-0 mt-1 w-20 rounded-xl bg-neutral-950 border border-white/10 shadow-2xl py-1 z-30 flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    setIsEditingTitle(true);
                    setIsMenuOpen(false);
                  }}
                  className="px-3 py-1.5 text-[11px] text-white/80 hover:text-white hover:bg-white/5 transition-colors text-left font-medium cursor-pointer"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(true);
                    setIsMenuOpen(false);
                  }}
                  className="px-3 py-1.5 text-[11px] text-rose-450 hover:text-rose-405 hover:bg-rose-500/10 transition-colors text-left font-medium border-t border-white/5 cursor-pointer"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        )}

        {/* Like Button */}
        <button
          onClick={handleLike}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-rose-500 hover:bg-rose-500/10 transition-all duration-300 border border-transparent hover:border-rose-500/20 cursor-pointer"
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
    </div>
  );
}
