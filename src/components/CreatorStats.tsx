'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface CreatorStatsProps {
  userId: string;
  followersCount: number; // Retained to ensure page.tsx compatibility
}

export default function CreatorStats({ userId }: CreatorStatsProps) {
  const [activeTab, setActiveTab] = useState<'impact' | 'activity'>('impact');
  
  const [stats, setStats] = useState({
    // Impact stats (Outward)
    totalPlays: 0,
    hoursConsumed: '0.0 Hours',
    avgCompletionRate: 'N/A',

    // Activity stats (Inward)
    myListeningTime: '0m',
    notesLikedCount: 0,
    commentsLeftCount: 0,

    isLoading: true,
  });

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setStats((prev) => ({ ...prev, isLoading: true }));
        const supabase = createClient();

        // 1. Fetch user's own notes (for Outward Impact calculation)
        const { data: notes, error: notesError } = await supabase
          .from('notes')
          .select('id, likes_count, duration_seconds')
          .eq('user_id', userId);

        if (notesError) throw notesError;

        let totalPlays = 0;
        let hoursConsumed = '0.0 Hours';
        let avgCompletionRate = 'N/A';

        if (notes && notes.length > 0) {
          // Use likes_count as a proxy for raw plays for now
          totalPlays = notes.reduce((sum, n) => sum + (n.likes_count || 0), 0);

          const noteIds = notes.map((n) => n.id);
          const noteDurationMap = notes.reduce((acc, n) => {
            acc[n.id] = n.duration_seconds || 0;
            return acc;
          }, {} as Record<string, number>);

          // Fetch listen logs for the notes created by this user
          const { data: logs, error: logsError } = await supabase
            .from('listen_logs')
            .select('seconds_listened, note_id')
            .in('note_id', noteIds);

          if (logsError) throw logsError;

          if (logs && logs.length > 0) {
            let totalSeconds = 0;
            let totalCompletionRatio = 0;
            let validLogsCount = 0;

            logs.forEach((log) => {
              totalSeconds += log.seconds_listened || 0;
              const duration = noteDurationMap[log.note_id] || 0;
              if (duration > 0) {
                totalCompletionRatio += Math.min(1.0, log.seconds_listened / duration);
                validLogsCount++;
              }
            });

            const rawHours = totalSeconds / 3600;
            hoursConsumed = `${rawHours.toFixed(1)} Hours`;

            if (validLogsCount > 0) {
              const avgRatio = totalCompletionRatio / validLogsCount;
              avgCompletionRate = `${Math.round(avgRatio * 100)}%`;
            }
          }
        }

        // 2. Fetch My Activity stats in parallel
        const [myLogsResult, myLikesResult, myCommentsResult] = await Promise.all([
          // My Listening Time logs
          supabase
            .from('listen_logs')
            .select('seconds_listened')
            .eq('user_id', userId),
          // Total Likes given by user
          supabase
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId),
          // Total Comments left by user
          supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId),
        ]);

        if (myLogsResult.error) throw myLogsResult.error;
        if (myLikesResult.error) throw myLikesResult.error;
        if (myCommentsResult.error) throw myCommentsResult.error;

        let myTotalSeconds = 0;
        if (myLogsResult.data) {
          myTotalSeconds = myLogsResult.data.reduce((sum, log) => sum + (log.seconds_listened || 0), 0);
        }

        const myHours = Math.floor(myTotalSeconds / 3600);
        const myMinutes = Math.round((myTotalSeconds % 3600) / 60);
        
        let myListeningTime = '0m';
        if (myHours > 0) {
          myListeningTime = `${myHours}h ${myMinutes}m`;
        } else {
          myListeningTime = `${myMinutes}m`;
        }

        setStats({
          totalPlays,
          hoursConsumed,
          avgCompletionRate,
          myListeningTime,
          notesLikedCount: myLikesResult.count || 0,
          commentsLeftCount: myCommentsResult.count || 0,
          isLoading: false,
        });

      } catch (err) {
        console.error('Error loading dashboard stats:', err);
        setStats((prev) => ({ ...prev, isLoading: false }));
      }
    };

    fetchDashboardStats();
  }, [userId]);

  if (stats.isLoading) {
    return (
      <div className="mb-10">
        <div className="w-48 h-8 bg-neutral-900/30 rounded-xl animate-pulse mb-6" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="h-24 bg-neutral-900/20 border border-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-10 flex flex-col gap-4">
      {/* Title & Tab Switches */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-1.5">
          <span>📊</span> Creator Dashboard
        </h3>

        {/* Impact vs Activity Switcher */}
        <div className="flex items-center gap-1 p-[3px] rounded-xl bg-neutral-950 border border-white/5 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('impact')}
            className={`py-1.5 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              activeTab === 'impact'
                ? 'bg-neutral-800 text-white shadow-md'
                : 'text-neutral-500 hover:text-white bg-transparent'
            }`}
          >
            My Impact
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`py-1.5 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              activeTab === 'activity'
                ? 'bg-neutral-800 text-white shadow-md'
                : 'text-neutral-500 hover:text-white bg-transparent'
            }`}
          >
            My Activity
          </button>
        </div>
      </div>

      {/* Grid Stats Content */}
      {activeTab === 'impact' ? (
        <div className="grid grid-cols-3 gap-4">
          {/* Card 1: Total Plays */}
          <div className="p-4 rounded-2xl bg-neutral-900/30 border border-white/5 flex flex-col gap-1 relative overflow-hidden group hover:border-cyan-500/25 transition-all duration-300">
            <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500/5 blur-xl group-hover:bg-cyan-500/10 transition-colors duration-300" />
            <span className="text-2xl font-black text-white tracking-tight">
              {stats.totalPlays.toLocaleString()}
            </span>
            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
              Total Plays
            </span>
          </div>

          {/* Card 2: Hours Consumed */}
          <div className="p-4 rounded-2xl bg-neutral-900/30 border border-white/5 flex flex-col gap-1 relative overflow-hidden group hover:border-violet-500/25 transition-all duration-300">
            <div className="absolute top-0 right-0 w-16 h-16 bg-violet-500/5 blur-xl group-hover:bg-violet-500/10 transition-colors duration-300" />
            <span className="text-2xl font-black text-white tracking-tight">
              {stats.hoursConsumed}
            </span>
            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
              Hours Consumed
            </span>
          </div>

          {/* Card 3: Avg. Completion Rate */}
          <div className="p-4 rounded-2xl bg-neutral-900/30 border border-white/5 flex flex-col gap-1 relative overflow-hidden group hover:border-fuchsia-500/25 transition-all duration-300">
            <div className="absolute top-0 right-0 w-16 h-16 bg-fuchsia-500/5 blur-xl group-hover:bg-fuchsia-500/10 transition-colors duration-300" />
            <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-400 tracking-tight">
              {stats.avgCompletionRate}
            </span>
            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
              Avg. Completion
            </span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {/* Card 1: Listening Time */}
          <div className="p-4 rounded-2xl bg-neutral-900/30 border border-white/5 flex flex-col gap-1 relative overflow-hidden group hover:border-emerald-500/25 transition-all duration-300">
            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 blur-xl group-hover:bg-emerald-500/10 transition-colors duration-300" />
            <span className="text-2xl font-black text-white tracking-tight">
              {stats.myListeningTime}
            </span>
            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
              My Listening Time
            </span>
          </div>

          {/* Card 2: Notes Liked */}
          <div className="p-4 rounded-2xl bg-neutral-900/30 border border-white/5 flex flex-col gap-1 relative overflow-hidden group hover:border-amber-500/25 transition-all duration-300">
            <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 blur-xl group-hover:bg-amber-500/10 transition-colors duration-300" />
            <span className="text-2xl font-black text-white tracking-tight">
              {stats.notesLikedCount.toLocaleString()}
            </span>
            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
              Notes Liked
            </span>
          </div>

          {/* Card 3: Comments Left */}
          <div className="p-4 rounded-2xl bg-neutral-900/30 border border-white/5 flex flex-col gap-1 relative overflow-hidden group hover:border-rose-500/25 transition-all duration-300">
            <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/5 blur-xl group-hover:bg-rose-500/10 transition-colors duration-300" />
            <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-rose-450 tracking-tight">
              {stats.commentsLeftCount.toLocaleString()}
            </span>
            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
              Comments Left
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
