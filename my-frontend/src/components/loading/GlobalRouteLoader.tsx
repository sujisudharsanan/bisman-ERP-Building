"use client";

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
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
      const t = setTimeout(() => setLoading(false), 450); // smooth fade window
      return () => clearTimeout(t);
    }
    beforePath.current = pathname;
  }, [pathname]);

  if (!loading) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        background: 'rgba(255,255,255,0.6)',
        backdropFilter: 'blur(2px)',
        zIndex: 9999,
      }}
      aria-hidden
    >
      <BismanLoader size={128} />
    </div>
  );
}
