'use client';

import React, { useEffect, useState } from 'react';
import { useAudioPlayer } from '@/stores/useAudioPlayer';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import Waveform from '@/components/Waveform';

// Helpers
function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds === Infinity) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

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

export default function ExpandedPlayer() {
  const {
    isPlayerExpanded,
    setPlayerExpanded,
    currentTrack,
    isPlaying,
    togglePlay,
    currentTime,
    duration,
    seekTo,
  } = useAudioPlayer();

  const [comments, setComments] = useState<any[]>([]);
  const [commentContent, setCommentContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Phase 5 Updates State
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [isTrackLiked, setIsTrackLiked] = useState(false);
  const [trackLikesCount, setTrackLikesCount] = useState(0);

  // Fetch current user details on mount
  useEffect(() => {
    const fetchCurrentUserProfile = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, display_picture')
          .eq('id', user.id)
          .maybeSingle();

        if (profile) {
          setCurrentUserProfile(profile);
        }
      } catch (err) {
        console.error('Failed to fetch current user profile:', err);
      }
    };

    fetchCurrentUserProfile();
  }, []);

  // Fetch track like status when current track changes
  useEffect(() => {
    if (!currentTrack?.id) return;
    
    setTrackLikesCount(currentTrack.likes_count || 0);

    const checkTrackLikeStatus = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: likeRecord } = await supabase
          .from('likes')
          .select('*')
          .eq('user_id', user.id)
          .eq('note_id', currentTrack.id)
          .maybeSingle();

        setIsTrackLiked(!!likeRecord);
      } catch (err) {
        console.error('Failed to check track like status:', err);
      }
    };

    checkTrackLikeStatus();
  }, [currentTrack?.id]);

  // Fetch comments when current track changes
  useEffect(() => {
    if (!currentTrack?.id || !isPlayerExpanded) return;

    const fetchComments = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('comments')
          .select('*, profiles!user_id(username, display_picture, is_premium)')
          .eq('note_id', currentTrack.id)
          .order('created_at', { ascending: false }); // Newest comments first like SoundCloud

        if (error) throw error;
        setComments(data || []);
      } catch (err) {
        console.error('Failed to load comments:', err);
      }
    };

    fetchComments();
  }, [currentTrack?.id, isPlayerExpanded]);

  const handleToggleTrackLike = async () => {
    if (!currentTrack?.id) return;

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('You must be logged in to like voice notes!');
        return;
      }

      const nextLikedState = !isTrackLiked;
      const nextLikesCount = nextLikedState ? trackLikesCount + 1 : Math.max(0, trackLikesCount - 1);

      setIsTrackLiked(nextLikedState);
      setTrackLikesCount(nextLikesCount);

      if (nextLikedState) {
        const { error } = await supabase
          .from('likes')
          .insert({ user_id: user.id, note_id: currentTrack.id });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('note_id', currentTrack.id);
        if (error) throw error;
      }
    } catch (err) {
      console.error('Failed to toggle track like:', err);
      setIsTrackLiked(isTrackLiked);
      setTrackLikesCount(trackLikesCount);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim() || !currentTrack?.id) return;

    try {
      setIsSubmitting(true);
      const supabase = createClient();

      // Retrieve current session details
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('You must be logged in to comment!');
        return;
      }

      // Fetch user profile dynamically
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, display_picture')
        .eq('id', user.id)
        .maybeSingle();

      const newCommentData = {
        note_id: currentTrack.id,
        user_id: user.id,
        content: commentContent.trim(),
      };

      const { data: insertedComment, error } = await supabase
        .from('comments')
        .insert(newCommentData)
        .select()
        .single();

      if (error) throw error;

      // Optimistically prepend comment
      const fullComment = {
        ...insertedComment,
        profiles: profile || { username: user.email?.split('@')[0] || 'Me', display_picture: null },
      };

      setComments((prev) => [fullComment, ...prev]);
      setCommentContent('');
    } catch (err: any) {
      console.error('Failed to submit comment:', err);
      alert(`Failed to post comment: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isPlayerExpanded && currentTrack && (
        <motion.div
          key="expanded-player"
          className="fixed inset-0 z-50 bg-[#060606] flex flex-col"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.3 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 120) setPlayerExpanded(false);
          }}
        >
          {/* Drag Handle */}
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0 cursor-row-resize">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          {/* Modal Header */}
          <div className="flex items-center justify-between px-5 py-2 flex-shrink-0">
            <button
              onClick={() => setPlayerExpanded(false)}
              className="p-2 text-white/50 hover:text-white transition-colors cursor-pointer"
              aria-label="Collapse player"
            >
              <ChevronDown size={24} />
            </button>
            <span className="text-white/40 text-xs font-semibold tracking-widest uppercase">
              Now Playing
            </span>
            <div className="w-10" />
          </div>

          {/* Scrollable Container */}
          <div className="flex-1 flex flex-col overflow-y-auto">
            {/* SoundCloud-style Player Banner */}
            <div className="relative p-6 bg-gradient-to-b from-zinc-800/40 via-neutral-900/60 to-black/80 border-b border-white/5 flex-shrink-0 flex flex-col gap-6">
              {/* Top Row: Play/Pause, Info, Cover Art */}
              <div className="flex items-center gap-4 justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  {/* Play Button */}
                  <button
                    onClick={() => togglePlay()}
                    className="w-14 h-14 flex items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 text-black hover:scale-105 transition-all shadow-lg cursor-pointer"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-6 h-6 text-black">
                        <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25ZM15 4.5h1.5" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-6 h-6 text-black ml-1">
                        <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                  {/* Title & Creator */}
                  <div className="min-w-0">
                    <h2 className="text-white text-xl font-bold truncate tracking-tight">{currentTrack.title}</h2>
                    <Link
                      href={`/profile/${currentTrack.profiles?.username}`}
                      onClick={() => setPlayerExpanded(false)}
                      className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 text-sm mt-1 transition-colors font-medium"
                    >
                      <span>@{currentTrack.profiles?.username || 'Anonymous'}</span>
                      {currentTrack.profiles?.is_premium && (
                        <span className="text-yellow-400 text-xs" title="Premium User">✨</span>
                      )}
                    </Link>
                  </div>
                </div>

                {/* Cover Art */}
                <div className="w-24 h-24 rounded-2xl bg-neutral-900 border border-white/10 flex-shrink-0 flex items-center justify-center overflow-hidden shadow-2xl">
                  {currentTrack.profiles?.display_picture ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={currentTrack.profiles.display_picture}
                      alt={currentTrack.profiles.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-white text-3xl font-bold opacity-30">♪</div>
                  )}
                </div>
              </div>

              {/* Bottom: Waveform Scrubber */}
              <div className="flex flex-col gap-1 w-full mt-2">
                <div
                  className="relative cursor-pointer"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
                    seekTo(percentage * duration);
                  }}
                >
                  {(() => {
                    let waveformArray: number[] = [];
                    try {
                      if (currentTrack.waveform_url) {
                        const trimmed = currentTrack.waveform_url.trim();
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
                        currentTime={currentTime}
                        duration={duration}
                      />
                    );
                  })()}
                </div>
                {/* Time Display */}
                <div className="flex justify-between items-center text-[10px] font-mono text-white/40 px-1 mt-0.5">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            </div>

            {/* SoundCloud-style Comment Input Bar */}
            <div className="px-6 py-4 bg-neutral-900/30 border-b border-white/5 flex items-center gap-3 flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-neutral-950 border border-white/10 flex-shrink-0 flex items-center justify-center overflow-hidden">
                {currentUserProfile?.display_picture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentUserProfile.display_picture}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-[10px] text-cyan-400 font-bold">
                    {currentUserProfile?.username?.slice(0, 2).toUpperCase() || 'ME'}
                  </span>
                )}
              </div>

              <form onSubmit={handlePostComment} className="flex-1 flex gap-2">
                <input
                  type="text"
                  placeholder="Write a comment..."
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  disabled={isSubmitting}
                  required
                  className="flex-1 px-4 py-2 bg-neutral-950 border border-white/10 focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 rounded-lg text-xs text-white placeholder-neutral-500 outline-none transition-all duration-300"
                />
                <button
                  type="submit"
                  disabled={!commentContent.trim() || isSubmitting}
                  className="w-8 h-8 rounded-lg bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-black font-semibold flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none transition-all duration-300 cursor-pointer"
                  title="Post comment"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-4 h-4 text-black transform rotate-45 -translate-x-[1px] translate-y-[1px]"
                  >
                    <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                  </svg>
                </button>
              </form>
            </div>

            {/* SoundCloud-style Action & Stats Bar */}
            <div className="px-6 py-2.5 bg-neutral-950 border-b border-white/5 flex-shrink-0 flex items-center justify-between text-xs text-white/50">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleToggleTrackLike}
                  className={`px-3 py-1.5 rounded-md flex items-center gap-1 border border-white/5 hover:border-rose-500/20 hover:bg-rose-500/5 transition-all cursor-pointer ${
                    isTrackLiked ? 'text-rose-500 border-rose-500/20 bg-rose-500/5' : 'text-white/60 hover:text-rose-500'
                  }`}
                  title="Like track"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill={isTrackLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                  </svg>
                  <span>Like</span>
                </button>
                <button className="px-3 py-1.5 rounded-md flex items-center gap-1 text-white/60 hover:text-white border border-white/5 hover:border-white/10 hover:bg-white/5 transition-all cursor-not-allowed opacity-50">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.678 48.678 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7C4.547 9.547 4.5 10.768 4.5 12s.047 2.453.138 3.662a4.006 4.006 0 0 0 3.7 3.7 48.656 48.656 0 0 0 7.324 0 4.006 4.006 0 0 0 3.7-3.7c.092-1.209.138-2.43.138-3.662Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 10.5 12 7.5m0 0 3 3m-3-3v8.25" />
                  </svg>
                  <span>Repost</span>
                </button>
                <button className="px-3 py-1.5 rounded-md flex items-center gap-1 text-white/60 hover:text-white border border-white/5 hover:border-white/10 hover:bg-white/5 transition-all cursor-not-allowed opacity-50">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186.002-.003.001-.002a2.25 2.25 0 0 1 2.946-2.946l.004-.002M7.217 10.907a2.25 2.25 0 0 0 0 2.186m0 0L9.43 14.8m-2.213-3.893 2.213-1.8m0 5.693a2.25 2.25 0 1 0 0 3.236m0-3.236-.002.003-.001.002a2.25 2.25 0 0 1-2.946 2.946l-.004.002" />
                  </svg>
                  <span>Share</span>
                </button>
              </div>

              <div className="flex items-center gap-3 text-neutral-500 font-medium">
                <span className="flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                  </svg>
                  <span>1.2K</span>
                </span>
                <span className="flex items-center gap-1 text-rose-500/80">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="m11.645 20.91l-.007-.003c-.022-.012-.045-.025-.07-.04a22.42 22.42 0 0 1-1.025-.654c-.664-.455-1.575-1.122-2.483-1.954C6.222 16.488 4 13.91 4 10.75c0-2.43 1.95-4.25 4.1-4.25c1.47 0 2.69.85 3.4 1.83a4.7 4.7 0 0 1 3.4-1.83c2.15 0 4.1 1.82 4.1 4.25c0 3.16-2.222 5.738-4.16 7.512c-.908.832-1.819 1.499-2.483 1.954c-.394.27-.723.486-1.025.655a.86.86 0 0 1-.07.039l-.007.003a.524.524 0 0 1-.61 0z" />
                  </svg>
                  <span>{trackLikesCount}</span>
                </span>
              </div>
            </div>

            {/* Comments Header */}
            <div className="px-6 pt-5 pb-2 flex items-center justify-between flex-shrink-0">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
                {comments.length === 1 ? '1 comment' : `${comments.length} comments`}
              </h3>
              <div className="flex items-center gap-1 text-[10px] text-neutral-500 font-semibold cursor-pointer">
                <span>Sorted by: Newest</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 text-neutral-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
            </div>

            {/* Comments Timeline */}
            <div className="flex-1 px-6 py-4 space-y-4">
              {comments.length === 0 ? (
                <div className="text-center py-8 text-neutral-600 text-xs tracking-wide">
                  No comments yet. Start the conversation!
                </div>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 text-sm items-start border-b border-white/5 pb-3 last:border-0">
                      {/* Commenter Avatar */}
                      <div className="w-8 h-8 rounded-full bg-neutral-900 border border-white/5 flex-shrink-0 flex items-center justify-center overflow-hidden">
                        {comment.profiles?.display_picture ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={comment.profiles.display_picture}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[10px] text-cyan-400 font-bold">
                            {comment.profiles?.username?.slice(0, 2).toUpperCase() || '??'}
                          </span>
                        )}
                      </div>

                      {/* Comment Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <Link
                            href={`/profile/${comment.profiles?.username}`}
                            onClick={() => setPlayerExpanded(false)}
                            className="font-bold text-white/80 text-xs hover:text-cyan-400 transition-colors flex items-center gap-1"
                          >
                            <span>@{comment.profiles?.username || 'Anonymous'}</span>
                            {comment.profiles?.is_premium && (
                              <span className="text-yellow-400 text-[10px]" title="Premium User">✨</span>
                            )}
                          </Link>
                          <span className="text-[9px] text-white/20">
                            {formatTimeAgo(comment.created_at)}
                          </span>
                        </div>
                        <p className="text-white/70 text-xs mt-1 leading-relaxed break-words">
                          {comment.content}
                        </p>
                        
                        {/* Reply / Like row (SoundCloud style) */}
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] text-neutral-600 font-semibold select-none">
                          <button className="hover:text-neutral-400 transition-colors cursor-not-allowed opacity-50">Reply</button>
                          <span className="text-neutral-700 font-normal">|</span>
                          <button className="flex items-center gap-1 hover:text-rose-500/80 transition-colors cursor-not-allowed opacity-50">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-2.5 h-2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
                            </svg>
                            <span>0</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
