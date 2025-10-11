'use client';

import { useEffect } from 'react';

export default function GitInfoHydrator() {
  useEffect(() => {
    async function persistGitInfo() {
      try {
        const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
        const res = await fetch(`${base}/api/git/info`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.commit) {
          localStorage.setItem('git:lastCommit', JSON.stringify(data));
        }
      } catch {
        // ignore network errors in hydration helper
      }
    }
    persistGitInfo();
  }, []);
  return null;
}
