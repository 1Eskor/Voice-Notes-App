'use client';

import { useEffect, useRef } from 'react';
import { useAudioPlayer } from '@/stores/useAudioPlayer';

export default function VoiceSkipListener() {
  const { skipToNext, triggerVoiceFlash } = useAudioPlayer();
  const recognitionRef = useRef<any>(null);
  const isExplicitlyStopped = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('[VoiceSkipListener] SpeechRecognition not supported.');
      return;
    }

    const startListening = () => {
      if (isExplicitlyStopped.current) return;
      try {
        if (recognitionRef.current) {
          recognitionRef.current.start();
          console.log('[VoiceSkipListener] Microphone Active.');
        }
      } catch (e) {
        // Already running, safe to ignore
      }
    };

    const recognition = new SpeechRecognition();
    // Setting this to false makes it act like a walkie-talkie: 
    // it processes a sentence, fires the result, stops, and cleanly triggers our restart loop.
    recognition.continuous = false; 
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const last = event.results[event.results.length - 1];
      const transcript = last[0].transcript.trim().toLowerCase();
      
      console.log('[VoiceSkipListener] Heard:', transcript);
      
      // Broader phrasing match so it's easier to trigger
      if (
        transcript.includes('skip') || 
        transcript.includes('next') || 
        transcript.includes('scape')
      ) {
        console.log('[VoiceSkipListener] Triggering Skip Command!');
        triggerVoiceFlash();
        skipToNext();
      }
    };

    recognition.onerror = (event: any) => {
      console.error('[VoiceSkipListener] Error Status:', event.error);
      if (event.error === 'not-allowed') {
        console.error(' Microphone permission denied by browser settings!');
      }
    };

    recognition.onend = () => {
      // Cleanly reboot the microphone context when it idles out
      setTimeout(() => {
        startListening();
      }, 300);
    };

    recognitionRef.current = recognition;
    isExplicitlyStopped.current = false;
    startListening();

    return () => {
      isExplicitlyStopped.current = true;
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        try {
          recognitionRef.current.stop();
        } catch (e) {}
        recognitionRef.current = null;
      }
    };
  }, [skipToNext, triggerVoiceFlash]);

  return null;
}
