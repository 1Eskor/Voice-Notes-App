import { redirect } from 'next/navigation';

// Redirect root to the Following feed
export default function Home() {
  redirect('/following');
}
