"use client";

import React from 'react';
import { usePathname } from 'next/navigation';

// Simple global loader that appears during route transitions
// This is now very minimal - just a thin progress bar at the top
export default function GlobalRouteLoader() {
  const [loading, setLoading] = React.useState(false);
  const pathname = usePathname();
  const beforePath = React.useRef<string | null>(null);

  // When the pathname changes, show loader briefly to cover SSR/CSR gaps
  React.useEffect(() => {
    if (beforePath.current !== null && beforePath.current !== pathname) {
      setLoading(true);
      const t = setTimeout(() => setLoading(false), 250); // shorter duration
      return () => clearTimeout(t);
    }
    beforePath.current = pathname;
  }, [pathname]);

  if (!loading) return null;

  // Minimal overlay - thin progress bar at top, no floating box
  return (
    <div
      className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 animate-pulse"
      style={{ zIndex: 9999 }}
      aria-hidden
    />
  );
}
