import { redirect } from 'next/navigation';

// Server component: always send users to the login portal by default.
// Role-based redirects happen after login inside protected sections.
export default function Home() {
  redirect('/auth/login');
}
