import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Record',
  description: 'Record and share a new voice note.',
};

export default function RecordPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-600 to-pink-600 flex items-center justify-center shadow-2xl shadow-violet-900/60">
        <span className="text-white text-3xl">🎙️</span>
      </div>
      <h1 className="text-white font-bold text-xl">Record</h1>
      <p className="text-white/40 text-sm text-center max-w-xs">
        The recording interface will be built in Phase 3.
      </p>
    </div>
  );
}
