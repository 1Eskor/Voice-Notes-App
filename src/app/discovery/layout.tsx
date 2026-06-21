import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Discovery',
  description: 'Trending voice notes from the last 48 hours.',
};

export default function DiscoveryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
