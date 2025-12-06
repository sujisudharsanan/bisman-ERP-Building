import { redirect } from 'next/navigation';

// Server component: redirect to the public landing page.
// Users can access login from the landing page CTA buttons.
export default function Home() {
  redirect('/landing');
}
