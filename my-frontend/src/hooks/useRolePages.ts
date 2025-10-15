"use client";
import { useEffect, useState } from 'react';

export interface RolePageInfo {
  label: string;
  href: string;
  slug: string;
}

interface UseRolePagesResult {
  pages: RolePageInfo[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useRolePages(roleDir: string): UseRolePagesResult {
  const [pages, setPages] = useState<RolePageInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/role-pages?dir=${encodeURIComponent(roleDir)}`, { cache: 'no-store' });
        const json = await res.json();
        if (!cancelled) {
          if (!res.ok) {
            setError(json.error || 'Failed to load');
            setPages([]);
          } else {
            setPages(json.pages || []);
          }
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (roleDir) run();
    return () => { cancelled = true; };
  }, [roleDir, nonce]);

  return {
    pages,
    loading,
    error,
    refresh: () => setNonce(n => n + 1)
  };
}

export default useRolePages;