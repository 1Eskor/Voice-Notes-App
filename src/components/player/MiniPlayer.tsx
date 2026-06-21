'use client';

import { useAudioPlayer } from '@/stores/useAudioPlayer';
import { Play, Pause, SkipBack, SkipForward, ChevronUp } from 'lucide-react';

/**
 * MiniPlayer
 * Sits above the BottomNav, always visible when a track is loaded.
 * Full implementation (waveform, volume, follow button) in Phase 2.
 */
export default function MiniPlayer() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    skipToNext,
    skipToPrev,
    setPlayerExpanded,
  } = useAudioPlayer();

  if (!currentTrack) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="fixed left-0 right-0 z-30 bg-[#0f0f0f]/95 backdrop-blur-xl border-t border-white/5"
      style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
    >
      {/* Progress bar */}
      <div className="h-0.5 w-full bg-white/10">
        <div
          className="h-full bg-gradient-to-r from-violet-500 to-pink-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center gap-3 px-4 py-2">
        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-600 to-pink-600 flex-shrink-0 overflow-hidden cursor-pointer"
          onClick={() => setPlayerExpanded(true)}
        >
          {currentTrack.profiles?.display_picture ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentTrack.profiles.display_picture}
              alt={currentTrack.profiles.username}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
              {currentTrack.profiles?.username?.[0]?.toUpperCase() ?? '?'}
            </div>
          )}
        </div>

        {/* Track info */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => setPlayerExpanded(true)}
        >
          <p className="text-white text-sm font-semibold truncate">{currentTrack.title}</p>
          <p className="text-white/50 text-xs truncate">
            {currentTrack.profiles?.username ?? ''}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => skipToPrev()}
            className="p-2 text-white/70 hover:text-white transition-colors"
            aria-label="Previous"
          >
            <SkipBack size={18} />
          </button>
          <button
            onClick={() => togglePlay()}
            className="p-2 w-9 h-9 flex items-center justify-center rounded-full
                       bg-gradient-to-br from-violet-500 to-pink-500 text-white
                       hover:scale-105 transition-transform"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={16} fill="white" /> : <Play size={16} fill="white" />}
          </button>
          <button
            onClick={() => skipToNext()}
            className="p-2 text-white/70 hover:text-white transition-colors"
            aria-label="Next"
          >
            <SkipForward size={18} />
          </button>
        </div>

        {/* Expand chevron */}
        <button
          onClick={() => setPlayerExpanded(true)}
          className="p-1 text-white/40 hover:text-white/80 transition-colors"
          aria-label="Expand player"
        >
          <ChevronUp size={18} />
        </button>
      </div>
    </div>
  );
}
