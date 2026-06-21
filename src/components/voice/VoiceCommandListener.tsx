'use client';

import { useEffect, useRef } from 'react';
import { useAudioPlayer } from '@/stores/useAudioPlayer';

// ─── Browser Speech API type shims ───────────────────────────────────────────
interface SpeechRecognitionResult {
  readonly [index: number]: SpeechRecognitionAlternative;
  readonly isFinal: boolean;
  readonly length: number;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResultList {
  readonly [index: number]: SpeechRecognitionResult;
  readonly length: number;
}

interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionConstructor {
  new (): ISpeechRecognition;
}

/**
 * VoiceCommandListener
 * Invisible component. When isHandsFreeEnabled is true, it initialises
 * webkitSpeechRecognition in continuous mode and calls skipToNext() when
 * it hears "skip" or "next".
 */
export default function VoiceCommandListener() {
  const { isHandsFreeEnabled, skipToNext, triggerVoiceFlash } = useAudioPlayer();
  const recognitionRef = useRef<ISpeechRecognition | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Browser support check — webkit prefix or standard
    const SpeechRecognition: SpeechRecognitionConstructor | undefined =
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition as SpeechRecognitionConstructor
      ?? (window as unknown as Record<string, unknown>).SpeechRecognition as SpeechRecognitionConstructor;

    if (!SpeechRecognition) {
      console.warn('[VoiceCommand] SpeechRecognition not supported in this browser.');
      return;
    }

    if (isHandsFreeEnabled) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const last = event.results[event.results.length - 1];
        const transcript = last[0].transcript.trim().toLowerCase();
        if (transcript.includes('skip') || transcript.includes('next')) {
          triggerVoiceFlash();
          skipToNext();
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        // 'no-speech' is expected when the user is silent; ignore it
        if (event.error !== 'no-speech') {
          console.error('[VoiceCommand] error:', event.error);
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } else {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    }

    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, [isHandsFreeEnabled, skipToNext, triggerVoiceFlash]);

  return null;
}
