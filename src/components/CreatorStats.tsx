'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface CreatorStatsProps {
  userId: string;
  followersCount: number;
}

export default function CreatorStats({ userId, followersCount }: CreatorStatsProps) {
  const [stats, setStats] = useState<{
    totalPlays: number;
    totalSecondsListened: number;
    isLoading: boolean;
  }>({
    totalPlays: 0,
    totalSecondsListened: 0,
    isLoading: true,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const supabase = createClient();
        const { data: notes, error: notesError } = await supabase
          .from('notes')
          .select('id, plays_count, likes_count')
          .eq('user_id', userId);

        if (notesError) throw notesError;

        let totalPlays = 0;
        let totalSecondsListened = 0;

        if (notes && notes.length > 0) {
          notes.forEach((note: any) => {
            totalPlays += (note.plays_count || 0) + (note.likes_count || 0);
          });

          const noteIds = notes.map((n) => n.id);

          const { data: logs, error: logsError } = await supabase
            .from('listen_logs')
            .select('seconds_listened')
            .in('note_id', noteIds);

          if (logsError) throw logsError;

          if (logs) {
            totalSecondsListened = logs.reduce((sum: number, log: any) => sum + (log.seconds_listened || 0), 0);
          }
        }

        setStats({
          totalPlays,
          totalSecondsListened,
          isLoading: false,
        });
      } catch (err) {
        console.error('Error fetching creator stats:', err);
        setStats((prev) => ({ ...prev, isLoading: false }));
      }
    };

    fetchStats();
  }, [userId]);

  const formatSecondsListened = (seconds: number) => {
    if (seconds === 0) return '0m';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes.toLocaleString()}m`;
    }
    const hours = (seconds / 3600).toFixed(1);
    return `${parseFloat(hours).toLocaleString()}h`;
  };

  if (stats.isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4 mb-10">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="h-24 bg-neutral-900/20 border border-white/5 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="mb-10 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1.5">
          <span>📊</span> Creator Dashboard
        </h3>
        <span className="text-[10px] text-cyan-400 font-bold px-2 py-0.5 rounded-full bg-cyan-950/40 border border-cyan-500/20 animate-pulse">
          Live Stats
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Total Plays Card */}
        <div className="p-4 rounded-2xl bg-neutral-900/30 border border-white/5 flex flex-col gap-1 relative overflow-hidden group hover:border-cyan-500/25 transition-all duration-300">
          <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/5 blur-xl group-hover:bg-cyan-500/10 transition-colors duration-300" />
          <span className="text-2xl font-black text-white tracking-tight">
            {stats.totalPlays.toLocaleString()}
          </span>
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">
            Total Plays
          </span>
        </div>

        {/* Total Followers Card */}
        <div className="p-4 rounded-2xl bg-neutral-900/30 border border-white/5 flex flex-col gap-1 relative overflow-hidden group hover:border-violet-500/25 transition-all duration-300">
          <div className="absolute top-0 right-0 w-16 h-16 bg-violet-500/5 blur-xl group-hover:bg-violet-500/10 transition-colors duration-300" />
          <span className="text-2xl font-black text-white tracking-tight">
            {followersCount.toLocaleString()}
          </span>
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">
            Followers
          </span>
        </div>

        {/* Total Seconds Listened Card */}
        <div className="p-4 rounded-2xl bg-neutral-900/30 border border-white/5 flex flex-col gap-1 relative overflow-hidden group hover:border-fuchsia-500/25 transition-all duration-300">
          <div className="absolute top-0 right-0 w-16 h-16 bg-fuchsia-500/5 blur-xl group-hover:bg-fuchsia-500/10 transition-colors duration-300" />
          <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400 tracking-tight">
            {formatSecondsListened(stats.totalSecondsListened)}
          </span>
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide">
            Time Consumed
          </span>
        </div>
      </div>
    </div>
  );
}
