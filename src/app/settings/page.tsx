'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/lib/types';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace('/auth');
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        setProfile(profileData);
      } catch (err: any) {
        console.error('Error fetching settings profile:', err);
        setError(err.message || 'Failed to load settings.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  const handleTogglePremium = async () => {
    if (!profile || isUpdating) return;

    try {
      setIsUpdating(true);
      setError(null);
      const supabase = createClient();
      const nextPremiumState = !profile.is_premium;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_premium: nextPremiumState })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      setProfile({
        ...profile,
        is_premium: nextPremiumState,
      });
    } catch (err: any) {
      console.error('Error toggling premium state:', err);
      setError(err.message || 'Failed to update subscription status.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-12 min-h-[75vh] flex flex-col justify-start">
      {/* Back to Profile Link */}
      <div className="mb-6">
        <Link
          href={profile ? `/profile/${profile.username}` : '/profile'}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-white transition-colors"
        >
          <span>←</span> Back to Profile
        </Link>
      </div>

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-sm text-neutral-400 mt-1">Manage your account and preferences.</p>
      </div>

      {isLoading ? (
        <div className="w-full h-48 bg-neutral-900/20 border border-white/5 rounded-3xl animate-pulse" />
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/20 text-xs text-rose-300 font-medium">
          {error}
        </div>
      ) : (
        profile && (
          <div className="flex flex-col gap-6">
            {/* Account Info Section */}
            <div className="w-full bg-neutral-900/40 border border-white/5 rounded-3xl p-6 backdrop-blur-xl">
              <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4">
                Account Details
              </h2>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 p-[2px]">
                  <div className="w-full h-full rounded-full bg-neutral-950 flex items-center justify-center overflow-hidden">
                    {profile.display_picture ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profile.display_picture}
                        alt={profile.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-bold text-cyan-400">
                        {profile.username.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white text-base">@{profile.username}</span>
                    {profile.is_premium && (
                      <span className="text-yellow-400 text-sm" title="Premium Active">✨</span>
                    )}
                  </div>
                  <span className="text-xs text-neutral-500">Joined {new Date(profile.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Premium Tier Subscription Card */}
            <div className="w-full bg-neutral-900/40 border border-white/5 rounded-3xl p-6 backdrop-blur-xl relative overflow-hidden group">
              <div className="absolute -inset-10 bg-gradient-to-br from-amber-500/10 to-yellow-500/10 blur-2xl opacity-40 pointer-events-none group-hover:opacity-60 transition-opacity duration-500" />
              
              <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4 relative z-10">
                Premium Membership
              </h2>

              <div className="flex flex-col gap-4 relative z-10">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-400 tracking-tight">
                      $10
                    </span>
                    <span className="text-xs text-neutral-400">/ month</span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                    Support your favorite creators, unlock exclusive features, and get a golden premium badge next to your name.
                  </p>
                </div>

                <div className="border-t border-white/5 pt-4">
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-2 text-xs text-neutral-300">
                      <span className="text-yellow-400 font-bold">✨</span>
                      <span>Golden star badge next to your profile</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-neutral-300">
                      <span className="text-yellow-400 font-bold">✨</span>
                      <span>Support creators with Micro-Royalties</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-neutral-300">
                      <span className="text-yellow-400 font-bold">✨</span>
                      <span>Ad-free listening experience</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleTogglePremium}
                  disabled={isUpdating}
                  className={`w-full py-3 rounded-xl text-xs font-bold transition-all duration-300 relative overflow-hidden ${
                    profile.is_premium
                      ? 'bg-neutral-800 hover:bg-neutral-750 text-amber-200 border border-amber-500/30'
                      : 'bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-black shadow-lg shadow-yellow-500/10'
                  }`}
                >
                  {isUpdating ? (
                    <span className="inline-block animate-pulse">Updating...</span>
                  ) : profile.is_premium ? (
                    'Cancel Premium Subscription (Test)'
                  ) : (
                    'Upgrade to Premium - $10/mo (Coming Soon)'
                  )}
                </button>

                <p className="text-[10px] text-neutral-500 text-center">
                  * For testing, clicking the button toggles your premium status.
                </p>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
