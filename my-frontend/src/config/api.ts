// Centralized API base URL for frontend

/**
 * Automatically detects if running on localhost or production.
 * - Production (Vercel): Uses NEXT_PUBLIC_API_URL (e.g., https://bisman-erp-xr6f.onrender.com)
 * - Development: Defaults to http://localhost:3001
 */
function getApiBaseUrl(): string {
  // 1. Check for explicit environment variable (highest priority)
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // 2. Detect if we're in browser and check hostname
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // If running on Vercel production domain, use production backend
    if (hostname.includes('vercel.app')) {
      // Fallback to Render backend URL if not set
      return 'https://bisman-erp-xr6f.onrender.com';
    }
    
    // If on localhost, use local backend
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3001';
    }
  }

  // 3. Server-side default (SSR/SSG)
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
}

const apiBase = getApiBaseUrl();

// Runtime validation and logging
if (typeof window !== 'undefined') {
  const isProd = window.location.hostname.includes('vercel.app');
  if (isProd && !process.env.NEXT_PUBLIC_API_URL) {
    console.warn('⚠️  NEXT_PUBLIC_API_URL not set in production. Using fallback:', apiBase);
  } else {
    console.log('✅ API Base URL:', apiBase);
  }
}

export const API_BASE = apiBase;

export default API_BASE;
