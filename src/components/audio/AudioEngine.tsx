'use client';

import { useEffect, useRef } from 'react';
import { useAudioPlayer } from '@/stores/useAudioPlayer';

/**
 * AudioEngine
 * Invisible component that owns the real <audio> DOM element.
 * Registers Media Session API handlers for lock-screen / notification controls.
 * Wires all HTML audio events back into the Zustand store.
 */
export default function AudioEngine() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const {
    currentTrack,
    volume,
    setAudioElement,
    setCurrentTime,
    setDuration,
    skipToNext,
    isPlaying,
    play,
    pause,
  } = useAudioPlayer();

  // ── Mount: create audio element and register it ───────────────────────────
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audioRef.current = audio;
    setAudioElement(audio);

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => skipToNext();

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.pause();
      setAudioElement(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync volume ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // ── Media Session API (lock-screen controls) ──────────────────────────────
  useEffect(() => {
    if (!currentTrack || typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.profiles?.username ?? 'Unknown',
      artwork: currentTrack.profiles?.display_picture
        ? [{ src: currentTrack.profiles.display_picture, sizes: '512x512', type: 'image/jpeg' }]
        : [],
    });

    navigator.mediaSession.setActionHandler('play', () => play());
    navigator.mediaSession.setActionHandler('pause', () => pause());
    navigator.mediaSession.setActionHandler('nexttrack', () => skipToNext());
    navigator.mediaSession.setActionHandler('previoustrack', () =>
      useAudioPlayer.getState().skipToPrev()
    );
  }, [currentTrack, play, pause, skipToNext]);

  // ── Sync play/pause state (e.g. external pause from Media Session) ─────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying && audio.paused) {
      audio.play().catch(console.error);
    } else if (!isPlaying && !audio.paused) {
      audio.pause();
    }
  }, [isPlaying]);

  return null; // renders nothing
}
