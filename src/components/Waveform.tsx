'use client';

import { useEffect, useRef, useState } from 'react';

interface WaveformProps {
  waveformData?: number[];
  currentTime: number;
  duration: number;
}

export default function Waveform({ waveformData = [], currentTime, duration }: WaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  // Monitor the container size to keep the clipped overlay aligned
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Generate fallback pattern if waveformData is empty
  const data = waveformData.length > 0
    ? waveformData
    : Array.from({ length: 50 }, (_, i) => {
        // Generate a smooth wave pattern using sine/cosine combinations
        const val = 0.15 + 0.35 * Math.sin(i * 0.15) + 0.25 * Math.cos(i * 0.35) + 0.15 * Math.sin(i * 0.8);
        return Math.max(0.1, Math.min(1.0, Math.abs(val)));
      });

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-10 select-none cursor-pointer"
    >
      {/* 1. Base / Unplayed Waveform (bg-gray-700) */}
      <div className="absolute inset-0 flex items-end justify-between gap-[2px] w-full h-full">
        {data.map((value, index) => (
          <div
            key={index}
            className="flex-1 bg-gray-700 rounded-sm transition-colors duration-200"
            style={{ height: `${value * 100}%` }}
          />
        ))}
      </div>

      {/* 2. Played Overlay (Clipped using width & overflow-hidden) */}
      <div
        className="absolute left-0 top-0 bottom-0 overflow-hidden transition-all duration-75 pointer-events-none"
        style={{ width: `${progress}%` }}
      >
        {/* Fix the width of the inner flex container to match the parent's actual width */}
        <div
          className="flex items-end justify-between gap-[2px] h-full"
          style={{ width: width > 0 ? `${width}px` : '100%' }}
        >
          {data.map((value, index) => (
            <div
              key={index}
              className="flex-1 bg-cyan-500 rounded-sm"
              style={{ height: `${value * 100}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
