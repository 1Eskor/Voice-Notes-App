import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Profile',
  description: 'Your shared voice notes and statistics.',
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
