'use client';
// Re-export the canonical, server-safe hook from the AuthContext implementation.
// This ensures there is only one source of truth for `useAuth` and avoids
// SSR-time throws when React context is not available during prerender.
export { useAuth } from '@/contexts/AuthContext';
