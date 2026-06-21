'use client';

import { useAudioPlayer } from '@/stores/useAudioPlayer';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

/**
 * ExpandedPlayer
 * Full-screen sliding modal. Full implementation (massive waveform,
 * comments list, follow button) in Phase 2.
 */
export default function ExpandedPlayer() {
  const { isPlayerExpanded, setPlayerExpanded, currentTrack } = useAudioPlayer();

  return (
    <AnimatePresence>
      {isPlayerExpanded && (
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
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3">
            <button
              onClick={() => setPlayerExpanded(false)}
              className="p-2 text-white/50 hover:text-white transition-colors"
              aria-label="Collapse player"
            >
              <ChevronDown size={24} />
            </button>
            <span className="text-white/40 text-xs font-medium tracking-widest uppercase">
              Now Playing
            </span>
            <div className="w-10" />
          </div>

          {/* Placeholder body — Phase 2 will fill this */}
          <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
            {/* Large artwork */}
            <div className="w-56 h-56 rounded-3xl bg-gradient-to-br from-violet-700 to-pink-700 shadow-2xl shadow-violet-900/60 overflow-hidden">
              {currentTrack?.profiles?.display_picture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentTrack.profiles.display_picture}
                  alt={currentTrack.profiles.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-6xl font-bold opacity-40">
                  ♪
                </div>
              )}
            </div>

            <div className="text-center">
              <h2 className="text-white text-xl font-bold">{currentTrack?.title}</h2>
              <p className="text-white/50 text-sm mt-1">
                @{currentTrack?.profiles?.username}
              </p>
            </div>

            {/* Waveform + Controls slot — Phase 2 */}
            <div className="w-full h-16 flex items-center justify-center text-white/20 text-xs tracking-widest uppercase">
              Waveform · Phase 2
            </div>
          </div>

          {/* Comments slot — Phase 2 */}
          <div className="px-5 py-4 border-t border-white/5 text-white/20 text-xs text-center tracking-widest uppercase">
            Comments · Phase 2
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
