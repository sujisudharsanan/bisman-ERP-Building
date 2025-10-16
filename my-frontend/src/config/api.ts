// Centralized API base URL for frontend
// PRODUCTION FIX: Always use direct backend URL to avoid cookie issues with rewrites
// Cross-origin cookies work with SameSite=None and Secure=true (backend configured)
const isBrowser = typeof window !== 'undefined';

// In production on Vercel, always use direct backend URL for cookies to work
const isProduction = process.env.NODE_ENV === 'production';

export const API_BASE = 
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env as any).NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'http://localhost:3001';

export default API_BASE;
