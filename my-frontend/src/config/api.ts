// Centralized API base URL for frontend

/**
 * Determines the API base URL based on the environment.
 * When deployed on Vercel, it uses a relative path to leverage Vercel's rewrites,
 * which proxies /api/* to the backend. This solves cross-domain cookie issues.
 * For local development, it uses the absolute URL to the local backend.
 */
const apiBase = process.env.NEXT_PUBLIC_VERCEL_URL
  ? '' // Use relative path on Vercel
  : 'http://localhost:3001'; // Use absolute path for local dev

export const API_BASE = apiBase;

export default API_BASE;
