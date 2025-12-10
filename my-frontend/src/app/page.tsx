import LandingPage from './(public)/landing/page';

// Serve the landing page directly at the root URL "/"
// No redirect needed - faster page load
export default function Home() {
  return <LandingPage />;
}
