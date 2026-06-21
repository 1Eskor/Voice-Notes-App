'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function RecordPage() {
  const [title, setTitle] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ success?: boolean; error?: string } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  // Cleanup recording stream and intervals on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      setAudioBlob(null);
      setTimer(0);
      chunksRef.current = [];
      setUploadStatus(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      let recorder: MediaRecorder;
      let selectedMimeType = 'audio/webm';

      if (MediaRecorder.isTypeSupported('audio/webm')) {
        selectedMimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        selectedMimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/aac')) {
        selectedMimeType = 'audio/aac';
      }

      try {
        recorder = new MediaRecorder(stream, { mimeType: selectedMimeType });
      } catch (err) {
        console.warn('Selected MIME type not supported, falling back to browser default recorder:', err);
        recorder = new MediaRecorder(stream);
      }

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);

        // Stop all track streams to release the mic icon
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      recorder.start(250); // Slice data every 250ms
      setIsRecording(true);

      // Start timer tick
      let count = 0;
      intervalRef.current = setInterval(() => {
        count += 1;
        setTimer(count);

        // Limit recording to 5 minutes (300 seconds)
        if (count >= 300) {
          stopRecording();
        }
      }, 1000);

    } catch (err: any) {
      console.error('Failed to access microphone:', err);
      alert('Could not access microphone. Please verify permission settings.');
    }
  };

  const stopRecording = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    setIsRecording(false);
  };

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleUpload = async () => {
    if (!audioBlob || !title.trim()) return;

    try {
      setIsUploading(true);
      setUploadStatus(null);

      const supabase = createClient();

      // Check if user is authenticated before triggering the upload
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('You must be logged in to upload voice notes.');
      }

      // Generate a mock waveform string (80 points from 0.2 to 1.0)
      const fakeWaveform = JSON.stringify(
        Array.from({ length: 80 }, () => parseFloat((Math.random() * 0.8 + 0.2).toFixed(2)))
      );

      const mimeType = audioBlob.type || 'audio/webm';
      let fileExt = 'webm';
      if (mimeType.includes('mp4') || mimeType.includes('m4a')) {
        fileExt = 'm4a';
      } else if (mimeType.includes('aac')) {
        fileExt = 'aac';
      }

      const formData = new FormData();
      formData.append('file', audioBlob, `recording.${fileExt}`);
      formData.append('title', title.trim());
      formData.append('waveform', fakeWaveform);
      formData.append('duration', timer.toString());

      console.log("DEBUG FRONTEND BLOB:", {
        fileInstance: formData.get('file'),
        mimeType: (formData.get('file') as Blob)?.type,
        sizeBytes: (formData.get('file') as Blob)?.size
      });

      // Invoke the Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('upload-audio', {
        body: formData,
      });

      if (error) throw error;

      alert('Upload successful!');
      setUploadStatus({ success: true });

      // Reset form
      setTitle('');
      setAudioBlob(null);
      setTimer(0);
    } catch (err: any) {
      console.error('Upload error:', err);
      setUploadStatus({ error: err.message || 'Upload failed. Please try again.' });
    } finally {
      setIsUploading(false);
    }
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-md mx-auto px-6 py-12 flex flex-col items-center justify-center min-h-[75vh]">
      {/* Page Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Record Note</h1>
        <p className="text-sm text-neutral-400 mt-1">Keep it short, raw, and unedited (max 5 mins).</p>
      </div>

      {/* Recording Display Container */}
      <div className="w-full bg-neutral-900/40 border border-white/5 rounded-3xl p-8 flex flex-col items-center gap-6 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        {/* Decorative backdrop glow */}
        <div className={`absolute -inset-10 bg-gradient-to-br transition-all duration-1000 blur-3xl opacity-10 pointer-events-none ${isRecording ? 'from-rose-500 to-red-500 scale-110' : 'from-cyan-500 to-violet-500'
          }`} />

        {/* Large Central Mic Button */}
        <button
          onClick={handleMicClick}
          disabled={isUploading}
          className={`w-24 h-24 rounded-full flex items-center justify-center relative transition-all duration-300 ${isRecording
              ? 'bg-rose-500 hover:bg-rose-600 scale-105 shadow-lg shadow-rose-500/20'
              : 'bg-neutral-800 hover:bg-neutral-750 border border-white/10 hover:border-white/20'
            }`}
          aria-label={isRecording ? 'Stop Recording' : 'Start Recording'}
        >
          {isRecording ? (
            <>
              {/* Pulse rings */}
              <span className="absolute inset-0 rounded-full bg-rose-500/30 animate-ping" />
              <span className="absolute -inset-4 rounded-full bg-rose-500/10 animate-pulse" />
              {/* Stop icon */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-white relative z-10">
                <path fillRule="evenodd" d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-9Z" clipRule="evenodd" />
              </svg>
            </>
          ) : (
            // Mic icon
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-neutral-400 hover:text-white transition-colors">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
            </svg>
          )}
        </button>

        {/* Timer display */}
        <div className="flex flex-col items-center">
          <span className={`text-4xl font-mono tracking-wider font-semibold ${isRecording ? 'text-rose-500 animate-pulse' : 'text-neutral-300'}`}>
            {formatTimer(timer)}
          </span>
          <span className="text-xs text-neutral-500 mt-1">
            {isRecording ? 'Recording...' : audioBlob ? 'Recording complete' : 'Ready'}
          </span>
        </div>

        {/* Form Fields */}
        <div className="w-full flex flex-col gap-3 mt-2 relative z-10">
          <label htmlFor="title-input" className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Title
          </label>
          <input
            id="title-input"
            type="text"
            placeholder="Add a catchy title..."
            maxLength={80}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isUploading}
            className="w-full px-4 py-3 bg-neutral-950/50 border border-white/5 focus:border-cyan-500/40 rounded-xl text-sm text-white placeholder-neutral-500 outline-none transition-colors"
          />
          <div className="flex justify-end">
            <span className="text-[10px] text-neutral-500">
              {title.length}/80 characters
            </span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleUpload}
          disabled={!audioBlob || !title.trim() || isUploading}
          className="w-full py-3.5 px-4 bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-white text-sm font-semibold rounded-xl disabled:opacity-30 disabled:pointer-events-none transition-all duration-300 shadow-lg shadow-cyan-500/10 flex items-center justify-center gap-2 relative z-10"
        >
          {isUploading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Uploading note...
            </>
          ) : (
            'Publish Note'
          )}
        </button>

        {/* Upload feedback */}
        {uploadStatus?.error && (
          <div className="text-xs text-rose-400 text-center bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 w-full">
            {uploadStatus.error}
          </div>
        )}
      </div>
    </div>
  );
}
