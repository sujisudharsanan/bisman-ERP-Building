"use client";

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import LogoMaskLoader from './LogoMaskLoader';

// Simple global loader that appears during route transitions
export default function GlobalRouteLoader() {
  const [loading, setLoading] = React.useState(false);
  const pathname = usePathname();
  const beforePath = React.useRef<string | null>(null);

  // When the pathname changes, show loader briefly to cover SSR/CSR gaps
  React.useEffect(() => {
    if (beforePath.current !== null && beforePath.current !== pathname) {
      setLoading(true);
      const t = setTimeout(() => setLoading(false), 1500); // smooth fade window
      return () => clearTimeout(t);
    }
    beforePath.current = pathname;
  }, [pathname]);

  if (!loading) return null;

  return (
    <LogoMaskLoader 
      fillDuration={1000} 
      fadeDuration={400}
      onLoadComplete={() => setLoading(false)}
    />
  );
}

