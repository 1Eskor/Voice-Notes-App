import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

import AudioEngine from '@/components/audio/AudioEngine';
import VoiceCommandListener from '@/components/voice/VoiceCommandListener';
import HandsFreeToggle from '@/components/voice/HandsFreeToggle';
import MiniPlayer from '@/components/player/MiniPlayer';
import ExpandedPlayer from '@/components/player/ExpandedPlayer';
import BottomNav from '@/components/nav/BottomNav';

// ─── SEO Metadata ──────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: {
    default: 'VoiceNote — Share What You Say',
    template: '%s · VoiceNote',
  },
  description:
    'Discover and share voice notes. The raw, off-the-cuff social platform for voice — like SoundCloud for spoken thoughts.',
  keywords: ['voice notes', 'audio social', 'soundcloud', 'voice sharing', 'podcast'],
  openGraph: {
    type: 'website',
    siteName: 'VoiceNote',
    title: 'VoiceNote — Share What You Say',
    description: 'Discover and share voice notes.',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'VoiceNote',
  },
};

export const viewport: Viewport = {
  themeColor: '#080808',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

// ─── Root Layout ───────────────────────────────────────────────────────────────
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body className="min-h-dvh bg-[#080808] text-white overflow-x-hidden font-[var(--font-inter),system-ui,sans-serif]">
        {/* ── Invisible global systems ─────────────────────────────────── */}
        {/* Owns the <audio> element and registers Media Session API */}
        <AudioEngine />
        {/* Listens for "skip"/"next" voice commands */}
        <VoiceCommandListener />

        {/* ── Hands-free toggle (top-right, always visible) ────────────── */}
        <HandsFreeToggle />

        {/* ── Page content ─────────────────────────────────────────────── */}
        {/*
          Pages get padding so they don't hide under the MiniPlayer + BottomNav.
          pb-[9rem] = 4rem BottomNav + ~3.5rem MiniPlayer + breathing room.
          pt-safe handles notched phones.
        */}
        <main
          className="relative z-0 pb-[9rem] pt-[env(safe-area-inset-top)]"
          style={{ minHeight: '100dvh' }}
        >
          {children}
        </main>

        {/* ── Global Audio Layer ────────────────────────────────────────── */}
        {/* Order matters: ExpandedPlayer (z-50) > MiniPlayer (z-30) > BottomNav (z-40) */}
        <ExpandedPlayer />
        <MiniPlayer />
        <BottomNav />
      </body>
    </html>
  );
}
