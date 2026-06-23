'use client';

import { useEffect, useRef } from 'react';
import { useAudioPlayer } from '@/stores/useAudioPlayer';
import { createClient } from '@/lib/supabase/client';

/**
 * AudioEngine
 * Owns the real <audio> element in the DOM tree.
 * Updates Zustand playback states and syncs with OS media controls.
 */
export default function AudioEngine() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const {
    currentTrack,
    isPlaying,
    volume,
    setAudioElement,
    setCurrentTime,
    setDuration,
    skipToNext,
    play,
    pause,
  } = useAudioPlayer();

  const currentTrackIdRef = useRef<string | null>(null);
  const accumulatedTimeRef = useRef<number>(0);
  const lastTimeRef = useRef<number | null>(null);

  const flushListenLog = async (trackId: string, seconds: number) => {
    const roundedSeconds = Math.round(seconds);
    if (roundedSeconds <= 3) return;

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('listen_logs')
        .insert({
          user_id: user.id,
          note_id: trackId,
          seconds_listened: roundedSeconds,
        });

      if (error) {
        console.error('[AudioEngine] Failed to log listen time:', error);
      } else {
        console.log(`[AudioEngine] Logged ${roundedSeconds}s listened for note ${trackId}`);
      }
    } catch (err) {
      console.error('[AudioEngine] Error logging listen time:', err);
    }
  };

  // Flush on track changes
  useEffect(() => {
    if (!currentTrack) {
      if (currentTrackIdRef.current) {
        flushListenLog(currentTrackIdRef.current, accumulatedTimeRef.current);
        currentTrackIdRef.current = null;
        accumulatedTimeRef.current = 0;
        lastTimeRef.current = null;
      }
      return;
    }

    if (currentTrackIdRef.current && currentTrackIdRef.current !== currentTrack.id) {
      flushListenLog(currentTrackIdRef.current, accumulatedTimeRef.current);
      accumulatedTimeRef.current = 0;
      lastTimeRef.current = null;
    }

    currentTrackIdRef.current = currentTrack.id;
  }, [currentTrack]);

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (currentTrackIdRef.current) {
        flushListenLog(currentTrackIdRef.current, accumulatedTimeRef.current);
      }
    };
  }, []);

  // ── 1. Register Audio Element with Zustand Store ───────────────────────────
  useEffect(() => {
    if (audioRef.current) {
      setAudioElement(audioRef.current);
    }
    return () => {
      setAudioElement(null);
    };
  }, [setAudioElement]);

  // ── 2. Playback Syncing: currentTrack & isPlaying state ────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    // Load track source if it has changed
    if (audio.src !== currentTrack.audio_url) {
      audio.src = currentTrack.audio_url;
      audio.load();
    }

    // Sync play/pause state
    if (isPlaying) {
      audio.play().catch((err) => {
        console.warn('Playback block or error:', err);
      });
    } else {
      audio.pause();
    }
  }, [currentTrack, isPlaying]);

  // ── 2a. Play Count Tracker effect ──────────────────────────────────────────
  const lastPlayedTrackIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (isPlaying && currentTrack && lastPlayedTrackIdRef.current !== currentTrack.id) {
      lastPlayedTrackIdRef.current = currentTrack.id;
      const supabase = createClient();
      supabase.rpc('increment_plays_count', { p_note_id: currentTrack.id })
        .then(({ error }) => {
          if (error) console.error('Failed to increment play count:', error);
        });
    }
  }, [currentTrack, isPlaying]);

  // ── 3. High-Frequency Event listeners (ended, timeupdate) ────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    let timeUpdateInterval: NodeJS.Timeout | null = null;

    const startTimer = () => {
      if (!timeUpdateInterval) {
        timeUpdateInterval = setInterval(() => {
          setCurrentTime(audio.currentTime);
        }, 100); // 100ms updates for high-resolution waveform movement
      }
    };

    const stopTimer = () => {
      if (timeUpdateInterval) {
        clearInterval(timeUpdateInterval);
        timeUpdateInterval = null;
      }
      lastTimeRef.current = null;
      setCurrentTime(audio.currentTime);
    };

    // Standard events to stay in sync
    const handleTimeUpdate = () => {
      const currentPlayTime = audio.currentTime;
      setCurrentTime(currentPlayTime);

      if (lastTimeRef.current !== null) {
        const dt = currentPlayTime - lastTimeRef.current;
        if (dt > 0 && dt < 1) {
          accumulatedTimeRef.current += dt;
        }
      }
      lastTimeRef.current = currentPlayTime;
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      stopTimer();
      skipToNext();
    };

    audio.addEventListener('play', startTimer);
    audio.addEventListener('playing', startTimer);
    audio.addEventListener('pause', stopTimer);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    // Initial load sync if already metadata is loaded
    if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
      setDuration(audio.duration);
    }

    return () => {
      audio.removeEventListener('play', startTimer);
      audio.removeEventListener('playing', startTimer);
      audio.removeEventListener('pause', stopTimer);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      if (timeUpdateInterval) {
        clearInterval(timeUpdateInterval);
      }
    };
  }, [setCurrentTime, setDuration, skipToNext]);

  // ── 4. Volume Syncing ──────────────────────────────────────────────────────
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // ── 5. Media Session API (OS Lock screen & controls) ──────────────────────
  useEffect(() => {
    if (!currentTrack || typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.profiles?.username ?? 'Anonymous',
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

  return (
    <audio
      id="global-audio"
      ref={audioRef}
      className="hidden"
      preload="metadata"
    />
  );
}
