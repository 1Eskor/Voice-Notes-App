import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Discovery',
  description: 'Trending voice notes from the last 48 hours.',
};

export default function DiscoveryPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center">
        <span className="text-white text-xl">🔍</span>
      </div>
      <h1 className="text-white font-bold text-xl">Discovery</h1>
      <p className="text-white/40 text-sm text-center max-w-xs">
        Trending notes from the last 48 hours will appear here. Phase 2 coming soon.
      </p>
    </div>
  );
}
