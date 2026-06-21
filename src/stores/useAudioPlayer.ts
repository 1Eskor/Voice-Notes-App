'use client';

import { create } from 'zustand';
import { NoteWithProfile } from '@/lib/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type RepeatMode = 'none' | 'one' | 'all';

interface AudioPlayerState {
  // ── Queue & Current Track ──────────────────────────────────────────────────
  queue: NoteWithProfile[];
  currentIndex: number;
  currentTrack: NoteWithProfile | null;

  // ── Playback State ─────────────────────────────────────────────────────────
  isPlaying: boolean;
  currentTime: number;       // seconds
  duration: number;          // seconds
  volume: number;            // 0–1
  repeatMode: RepeatMode;
  isPlayerExpanded: boolean;

  // ── Voice / Hands-Free ────────────────────────────────────────────────────
  isHandsFreeEnabled: boolean;
  voiceCommandFlash: boolean; // brief flash when a command is detected

  // ── Internal Audio Ref ────────────────────────────────────────────────────
  audioElement: HTMLAudioElement | null;

  // ── Actions ───────────────────────────────────────────────────────────────
  setQueue: (queue: NoteWithProfile[], startIndex?: number) => void;
  setTrack: (track: NoteWithProfile, queue?: NoteWithProfile[]) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  skipToNext: () => void;
  skipToPrev: () => void;
  seekTo: (time: number) => void;
  setVolume: (vol: number) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  cycleRepeat: () => void;
  setPlayerExpanded: (open: boolean) => void;
  toggleHandsFree: () => void;
  triggerVoiceFlash: () => void;
  setAudioElement: (el: HTMLAudioElement | null) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAudioPlayer = create<AudioPlayerState>((set, get) => ({
  // ── Initial State ──────────────────────────────────────────────────────────
  queue: [],
  currentIndex: 0,
  currentTrack: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  repeatMode: 'none',
  isPlayerExpanded: false,
  isHandsFreeEnabled: false,
  voiceCommandFlash: false,
  audioElement: null,

  // ── Internal Helpers ───────────────────────────────────────────────────────

  setAudioElement: (el) => set({ audioElement: el }),

  // ── Queue & Track Management ───────────────────────────────────────────────

  setQueue: (queue, startIndex = 0) => {
    const track = queue[startIndex] ?? null;
    set({
      queue,
      currentIndex: startIndex,
      currentTrack: track,
      currentTime: 0,
      duration: track?.duration_seconds || 0,
    });
  },


  setTrack: (track, queue) => {
    const { audioElement } = get();
    const newQueue = queue ?? get().queue;
    const idx = newQueue.findIndex((n) => n.id === track.id);
    const currentIndex = idx === -1 ? 0 : idx;

    set({
      currentTrack: track,
      currentIndex,
      queue: idx === -1 ? [track, ...newQueue] : newQueue,
      currentTime: 0,
      isPlaying: true,
      duration: track.duration_seconds || 0,
    });


    if (audioElement) {
      audioElement.src = track.audio_url;
      audioElement.load();
      audioElement.play().catch(console.error);
    }
  },

  // ── Playback Controls ──────────────────────────────────────────────────────

  play: () => {
    const { audioElement } = get();
    audioElement?.play().catch(console.error);
    set({ isPlaying: true });
  },

  pause: () => {
    const { audioElement } = get();
    audioElement?.pause();
    set({ isPlaying: false });
  },

  togglePlay: () => {
    const { isPlaying } = get();
    if (isPlaying) {
      get().pause();
    } else {
      get().play();
    }
  },

  skipToNext: () => {
    const { queue, currentIndex, repeatMode, audioElement } = get();
    if (!queue.length) return;

    let nextIndex: number;
    if (repeatMode === 'one') {
      nextIndex = currentIndex;
    } else if (currentIndex < queue.length - 1) {
      nextIndex = currentIndex + 1;
    } else if (repeatMode === 'all') {
      nextIndex = 0;
    } else {
      // end of queue, stop
      get().pause();
      return;
    }

    const nextTrack = queue[nextIndex];
    set({
      currentIndex: nextIndex,
      currentTrack: nextTrack,
      currentTime: 0,
      duration: nextTrack.duration_seconds || 0,
    });


    if (audioElement) {
      audioElement.src = nextTrack.audio_url;
      audioElement.load();
      audioElement.play().catch(console.error);
    }
  },

  skipToPrev: () => {
    const { queue, currentIndex, currentTime, audioElement } = get();
    // If we're >3 seconds in, restart the current track
    if (currentTime > 3) {
      if (audioElement) audioElement.currentTime = 0;
      set({ currentTime: 0 });
      return;
    }
    if (!queue.length) return;

    const prevIndex = Math.max(0, currentIndex - 1);
    const prevTrack = queue[prevIndex];
    set({
      currentIndex: prevIndex,
      currentTrack: prevTrack,
      currentTime: 0,
      duration: prevTrack.duration_seconds || 0,
    });


    if (audioElement) {
      audioElement.src = prevTrack.audio_url;
      audioElement.load();
      audioElement.play().catch(console.error);
    }
  },

  seekTo: (time) => {
    const { audioElement } = get();
    if (audioElement) audioElement.currentTime = time;
    set({ currentTime: time });
  },

  setVolume: (vol) => {
    const { audioElement } = get();
    if (audioElement) audioElement.volume = vol;
    set({ volume: vol });
  },

  // ── Time / Duration Sync (called by the audio element's event listeners) ──

  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),

  // ── Repeat ─────────────────────────────────────────────────────────────────

  cycleRepeat: () => {
    const map: Record<RepeatMode, RepeatMode> = {
      none: 'all',
      all: 'one',
      one: 'none',
    };
    set((s) => ({ repeatMode: map[s.repeatMode] }));
  },

  // ── UI ─────────────────────────────────────────────────────────────────────

  setPlayerExpanded: (open) => set({ isPlayerExpanded: open }),

  // ── Hands-Free / Voice Skip ────────────────────────────────────────────────

  toggleHandsFree: () => set((s) => ({ isHandsFreeEnabled: !s.isHandsFreeEnabled })),

  triggerVoiceFlash: () => {
    set({ voiceCommandFlash: true });
    setTimeout(() => set({ voiceCommandFlash: false }), 600);
  },
}));
