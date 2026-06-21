import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Profile',
};

// /profile with no username — redirect to own profile or login
// In Phase 2 this will redirect to the authenticated user's profile
export default function ProfileRedirect() {
  redirect('/following');
}
