'use client';

import { useAudioPlayer } from '@/stores/useAudioPlayer';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff } from 'lucide-react';

/**
 * HandsFreeToggle
 * Top-right button to enable/disable voice-activated skip.
 * Renders the full-screen flash overlay when a voice command is detected.
 */
export default function HandsFreeToggle() {
  const { isHandsFreeEnabled, toggleHandsFree, voiceCommandFlash } = useAudioPlayer();

  return (
    <>
      {/* Toggle button */}
      <button
        id="hands-free-toggle"
        onClick={toggleHandsFree}
        title={isHandsFreeEnabled ? 'Disable Hands-Free' : 'Enable Hands-Free'}
        className={`fixed top-4 right-4 z-50 p-2.5 rounded-full backdrop-blur-md transition-all duration-300
          ${isHandsFreeEnabled
            ? 'bg-gradient-to-br from-violet-500 to-pink-500 text-white shadow-lg shadow-violet-500/40 scale-105'
            : 'bg-white/10 text-white/50 hover:bg-white/20 hover:text-white/80'
          }`}
        aria-label={isHandsFreeEnabled ? 'Disable Hands-Free mode' : 'Enable Hands-Free mode'}
        aria-pressed={isHandsFreeEnabled}
        style={{ top: 'calc(1rem + env(safe-area-inset-top))' }}
      >
        {isHandsFreeEnabled ? <Mic size={18} /> : <MicOff size={18} />}
      </button>

      {/* Voice-detected flash overlay */}
      <AnimatePresence>
        {voiceCommandFlash && (
          <motion.div
            key="voice-flash"
            className="fixed inset-0 z-[60] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-pink-500/20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.2, opacity: 0 }}
                className="bg-white/10 backdrop-blur-xl rounded-2xl px-8 py-4 flex items-center gap-3 border border-white/20"
              >
                <Mic size={22} className="text-violet-400" />
                <span className="text-white font-semibold text-lg">Skipping…</span>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
