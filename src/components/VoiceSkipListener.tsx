'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAudioPlayer } from '@/stores/useAudioPlayer';

export default function VoiceSkipListener() {
  const skipToNext = useAudioPlayer((s) => s.skipToNext);
  const triggerVoiceFlash = useAudioPlayer((s) => s.triggerVoiceFlash);

  // Refs are used (not state) so closures always read the latest value
  // without triggering re-renders or re-running the effect.
  const recognitionRef = useRef<any>(null);
  const stoppedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const createAndStartRef = useRef<(() => void) | null>(null);

  const createAndStart = useCallback(() => {
    if (stoppedRef.current) return;
    if (typeof window === 'undefined') return;

    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      console.warn('[VoiceSkipListener] SpeechRecognition not supported in this browser.');
      return;
    }

    // Always create a fresh instance — reusing a stopped instance is unreliable.
    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;   // Walkie-talkie mode: clean onend cycle
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('[VoiceSkipListener] 🎙️ Listening...');
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.trim().toLowerCase();
      console.log('[VoiceSkipListener] Heard:', transcript);

      if (
        transcript.includes('skip') ||
        transcript.includes('next') ||
        transcript.includes('escape')
      ) {
        console.log('[VoiceSkipListener] ✅ Skip triggered!');
        triggerVoiceFlash();
        skipToNext();
      }
    };

    recognition.onerror = (event: any) => {
      // 'no-speech' and 'aborted' are expected — don't log them as errors.
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.error('[VoiceSkipListener] Error:', event.error);
      }
    };

    recognition.onend = () => {
      // Schedule a fresh instance after the current one closes.
      // Check stoppedRef at schedule time AND fire time so cleanup is airtight.
      if (stoppedRef.current) return;
      timerRef.current = setTimeout(() => {
        if (!stoppedRef.current && createAndStartRef.current) {
          createAndStartRef.current();
        }
      }, 250);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (e) {
      // If start() throws (e.g. already running), retry after a short delay
      timerRef.current = setTimeout(() => {
        if (!stoppedRef.current && createAndStartRef.current) createAndStartRef.current();
      }, 500);
    }
  }, [skipToNext, triggerVoiceFlash]);

  createAndStartRef.current = createAndStart;

  useEffect(() => {
    stoppedRef.current = false;
    createAndStart();

    return () => {
      // Signal all pending timers and the onend callback to halt
      stoppedRef.current = true;

      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (recognitionRef.current) {
        // Null out onend FIRST to prevent the restart loop from firing
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onresult = null;
        try {
          recognitionRef.current.abort();
        } catch (_) {}
        recognitionRef.current = null;
      }
    };
  }, [createAndStart]);

  return null;
}
