// Centralized API base URL for frontend
// In the browser, use same-origin requests and rely on Next.js rewrites
// to proxy /api/* to the backend (avoids CORS and third‑party cookies).
// On the server (SSR/build), fall back to env.
const isBrowser = typeof window !== 'undefined';
// Optional browser override: if NEXT_PUBLIC_DIRECT_API_URL is set, use it.
// This helps when platform protection blocks rewrites (e.g., protected previews).
const browserOverride = (process.env as any).NEXT_PUBLIC_DIRECT_API_URL;
export const API_BASE = isBrowser
  ? (browserOverride || '')
  : process.env.NEXT_PUBLIC_API_URL ||
    (process.env as any).NEXT_PUBLIC_API_BASE ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    'http://localhost:3001';

export default API_BASE;
