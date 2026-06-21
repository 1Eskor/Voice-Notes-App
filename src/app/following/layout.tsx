import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Following',
  description: 'Voice notes from people you follow.',
};

export default function FollowingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
