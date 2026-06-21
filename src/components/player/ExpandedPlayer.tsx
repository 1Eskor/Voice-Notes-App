'use client';

import React, { useEffect, useState } from 'react';
import { useAudioPlayer } from '@/stores/useAudioPlayer';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function ExpandedPlayer() {
  const { isPlayerExpanded, setPlayerExpanded, currentTrack } = useAudioPlayer();
  const [comments, setComments] = useState<any[]>([]);
  const [commentContent, setCommentContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch comments when current track changes
  useEffect(() => {
    if (!currentTrack?.id || !isPlayerExpanded) return;

    const fetchComments = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('comments')
          .select('*, profiles!user_id(username, display_picture)')
          .eq('note_id', currentTrack.id)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setComments(data || []);
      } catch (err) {
        console.error('Failed to load comments:', err);
      }
    };

    fetchComments();
  }, [currentTrack?.id, isPlayerExpanded]);

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

      // Optimistically append comment
      const fullComment = {
        ...insertedComment,
        profiles: profile || { username: user.email?.split('@')[0] || 'Me', display_picture: null },
      };

      setComments((prev) => [...prev, fullComment]);
      setCommentContent('');
    } catch (err) {
      console.error('Failed to submit comment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isPlayerExpanded && currentTrack && (
        <motion.div
          key="expanded-player"
          className="fixed inset-0 z-50 bg-[#0a0a0a] flex flex-col"
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
              className="p-2 text-white/50 hover:text-white transition-colors"
              aria-label="Collapse player"
            >
              <ChevronDown size={24} />
            </button>
            <span className="text-white/40 text-xs font-semibold tracking-widest uppercase">
              Now Playing
            </span>
            <div className="w-10" />
          </div>

          {/* Scrollable Main Area (Tracks details + Comments list) */}
          <div className="flex-1 flex flex-col overflow-y-auto">
            {/* Track Info Banner */}
            <div className="flex flex-col items-center justify-center py-6 px-6 border-b border-white/5 flex-shrink-0 gap-4">
              <div className="w-40 h-40 rounded-3xl bg-gradient-to-br from-cyan-500 to-violet-500 p-[2px] shadow-2xl relative">
                <div className="w-full h-full rounded-[22px] bg-neutral-950 flex items-center justify-center overflow-hidden">
                  {currentTrack.profiles?.display_picture ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={currentTrack.profiles.display_picture}
                      alt={currentTrack.profiles.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-white text-5xl font-bold opacity-30">♪</div>
                  )}
                </div>
              </div>

              <div className="text-center">
                <h2 className="text-white text-lg font-bold truncate max-w-xs">{currentTrack.title}</h2>
                <Link
                  href={`/profile/${currentTrack.profiles?.username}`}
                  onClick={() => setPlayerExpanded(false)}
                  className="inline-block text-cyan-400/80 hover:text-cyan-400 text-xs mt-1 transition-colors"
                >
                  @{currentTrack.profiles?.username || 'Anonymous'}
                </Link>
              </div>
            </div>

            {/* Comments Timeline */}
            <div className="flex-1 px-6 py-4 space-y-4">
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Comments</h3>
              
              {comments.length === 0 ? (
                <div className="text-center py-8 text-neutral-600 text-xs tracking-wide">
                  No comments yet. Start the conversation!
                </div>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 text-sm items-start">
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
                            className="font-bold text-white/80 text-xs hover:text-cyan-400 transition-colors"
                          >
                            @{comment.profiles?.username || 'Anonymous'}
                          </Link>
                          <span className="text-[9px] text-white/20">
                            {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-white/70 text-xs mt-1 leading-relaxed break-words">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sticky Comment Form Footer */}
          <div className="p-4 border-t border-white/5 bg-[#080808]/90 backdrop-blur-md flex-shrink-0 pb-[calc(1rem + env(safe-area-inset-bottom))]">
            <form onSubmit={handlePostComment} className="flex gap-2">
              <input
                type="text"
                placeholder="Join the discussion..."
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                disabled={isSubmitting}
                required
                className="flex-1 px-4 py-2.5 bg-neutral-900/50 border border-white/5 focus:border-cyan-500/40 rounded-xl text-xs text-white placeholder-neutral-500 outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={!commentContent.trim() || isSubmitting}
                className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-black font-semibold text-xs rounded-xl disabled:opacity-30 disabled:pointer-events-none transition-all duration-300"
              >
                Post
              </button>
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
