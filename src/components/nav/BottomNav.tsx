'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  {
    href: '/following',
    label: 'Following',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="2"
        stroke={active ? 'url(#grad)' : 'currentColor'} strokeLinecap="round" strokeLinejoin="round">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: '/discovery',
    label: 'Discovery',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="2"
        stroke={active ? 'url(#grad2)' : 'currentColor'} strokeLinecap="round" strokeLinejoin="round">
        <defs>
          <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    href: '/record',
    label: 'Record',
    icon: (_active: boolean) => (
      <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 shadow-lg shadow-violet-500/40 -mt-5 border-2 border-black/30">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white" strokeWidth="0">
          <circle cx="12" cy="12" r="6" />
        </svg>
      </div>
    ),
  },
  {
    href: '/profile',
    label: 'Profile',
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="2"
        stroke={active ? 'url(#grad3)' : 'currentColor'} strokeLinecap="round" strokeLinejoin="round">
        <defs>
          <linearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around h-16 px-2
                 bg-black/80 backdrop-blur-xl border-t border-white/5"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map((tab) => {
        const isActive =
          tab.href === '/profile'
            ? pathname.startsWith('/profile')
            : pathname === tab.href || pathname.startsWith(tab.href);
        const isRecord = tab.href === '/record';

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center justify-center gap-0.5 min-w-[60px] transition-all duration-200
              ${isRecord ? 'mb-1' : ''}
              ${isActive && !isRecord ? 'opacity-100' : 'opacity-50 hover:opacity-75'}`}
            aria-label={tab.label}
          >
            {tab.icon(isActive)}
            {!isRecord && (
              <span
                className={`text-[10px] font-medium tracking-wide
                  ${isActive ? 'bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent' : 'text-white/60'}`}
              >
                {tab.label}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
