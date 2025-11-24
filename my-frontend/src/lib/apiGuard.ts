// Utility functions for server-only usage in API routes.
// Note: Avoid top-level 'use server' to prevent Next.js treating all exports as Server Actions.

import { cookies, headers } from 'next/headers';

/**
 * Returns the first present cookie among provided names, or null if none.
 */
export async function requireAuthCookie(names: string[] = ['token']): Promise<string | null> {
  const store = await cookies();
  for (const name of names) {
    const v = store.get(name)?.value;
    if (v) return v;
  }
  return null;
}

/**
 * Get best-effort client ip from request headers (for logging/rate limiting).
 */
export async function getClientIp(): Promise<string | null> {
  const h = await headers();
  return (
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    null
  );
}
