import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Profile',
};

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center shadow-2xl shadow-violet-900/60">
        <span className="text-white text-3xl font-bold">
          {username[0]?.toUpperCase() ?? '?'}
        </span>
      </div>
      <h1 className="text-white font-bold text-xl">@{username}</h1>
      <p className="text-white/40 text-sm text-center max-w-xs">
        Full profile (filter buttons, feed, follow) will be built in Phase 2.
      </p>
    </div>
  );
}
