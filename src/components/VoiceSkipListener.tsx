'use client';

import { useEffect, useRef } from 'react';
import { useAudioPlayer } from '@/stores/useAudioPlayer';

export default function VoiceSkipListener() {
  const { skipToNext, triggerVoiceFlash } = useAudioPlayer();
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('[VoiceSkipListener] SpeechRecognition not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const last = event.results[event.results.length - 1];
      const transcript = last[0].transcript.trim().toLowerCase();
      
      console.log('[VoiceSkipListener] Transcript:', transcript);
      
      if (transcript.includes('skip') || transcript.includes('next')) {
        triggerVoiceFlash();
        skipToNext();
      }
    };

    recognition.onerror = (event: any) => {
      // 'no-speech' is expected when silent; ignore it
      if (event.error !== 'no-speech') {
        console.error('[VoiceSkipListener] Error:', event.error);
      }
    };

    // Keep active listening running continuously even after periods of silence
    recognition.onend = () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          // Ignore start error if already running
        }
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      console.error('[VoiceSkipListener] Start failed:', e);
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null; // Prevent infinite restart on cleanup
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, [skipToNext, triggerVoiceFlash]);

  return null;
}
