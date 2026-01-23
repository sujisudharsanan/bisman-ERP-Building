"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import BismanLoader from './BismanLoader';

// Simple global loader that appears during route transitions
export default function GlobalRouteLoader() {
  const [loading, setLoading] = React.useState(false);
  const pathname = usePathname();
  const beforePath = React.useRef<string | null>(null);

  // When the pathname changes, show loader briefly to cover SSR/CSR gaps
  React.useEffect(() => {
    if (beforePath.current !== null && beforePath.current !== pathname) {
      setLoading(true);
      const t = setTimeout(() => setLoading(false), 300); // shorter duration
      return () => clearTimeout(t);
    }
    beforePath.current = pathname;
  }, [pathname]);

  if (!loading) return null;

  // Minimal overlay - just the spinner, transparent background
  return (
    <div
      className="fixed inset-0 flex items-center justify-center pointer-events-none"
      style={{ zIndex: 9999 }}
      aria-hidden
    >
      <div className="bg-white/80 dark:bg-slate-900/80 rounded-xl p-4 shadow-lg backdrop-blur-sm">
        <BismanLoader size={64} />
      </div>
    </div>
  );
}
