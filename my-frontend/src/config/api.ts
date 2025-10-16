// Centralized API base URL for frontend
// PRODUCTION FIX: Always use direct backend URL to avoid cookie issues with rewrites
// Cross-origin cookies work with SameSite=None and Secure=true (backend configured)
const isBrowser = typeof window !== 'undefined';

// In production on Vercel, always use direct backend URL for cookies to work
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Determines the API base URL based on the environment.
 */

// Default to localhost for local development
let apiBase = 'http://localhost:3001';

// Vercel environment variables
const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV;
const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL;

// Render backend URL
const renderBackendUrl = 'https://bisman-erp-rr6f.onrender.com';

if (vercelEnv === 'production' || vercelEnv === 'preview') {
  // For production and preview deployments on Vercel, use the Render backend
  apiBase = renderBackendUrl;
} else if (vercelUrl) {
  // For development deployments on Vercel, it's tricky.
  // We'll default to the production backend but log a warning.
  // For a better setup, consider a staging backend.
  apiBase = renderBackendUrl;
  console.warn(
    'Vercel development deployment is using the production backend. ' +
    'For a dedicated staging environment, configure a separate backend and URL.'
  );
}

export const API_BASE = apiBase;

export default API_BASE;
