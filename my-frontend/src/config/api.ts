// Centralized API base URL for frontend

/**
 * Automatically detects if running on localhost or production.
 * - Production (Railway): Prefer same-origin API
 * - Development: Defaults to http://localhost:3001
 */
function getApiBaseUrl(): string {
  // 1. Check for explicit environment variable (highest priority)
  if (process.env.NEXT_PUBLIC_API_URL) {
    console.log('🔧 Using NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // 2. Detect if we're in browser and check hostname
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // If running on managed hosting domain (Railway), prefer same-origin API
    if (hostname.includes('railway.app')) {
      const sameOrigin = `${window.location.protocol}//${window.location.host}`;
      console.log('🌐 Managed hosting detected, using same-origin API base:', sameOrigin);
      return sameOrigin;
    }
    
    // If on localhost, use local backend
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      console.log('🏠 Localhost detected, using local backend');
      return 'http://localhost:3001';
    }
  }

  // 3. Server-side default (SSR/SSG): prefer same-process via 127.0.0.1:PORT
  const defaultUrl = process.env.NEXT_PUBLIC_API_URL 
    || (process.env.PORT ? `http://127.0.0.1:${process.env.PORT}` : 'http://localhost:3001');
  console.log('🔄 SSR/SSG fallback, using:', defaultUrl);
  return defaultUrl;
}

const apiBase = getApiBaseUrl();

// Runtime validation and logging
if (typeof window !== 'undefined') {
  console.log('✅ API Base URL:', apiBase);
  
  // Test backend connectivity
  fetch(`${apiBase}/api/health`, {
    method: 'GET',
    credentials: 'include',
  })
    .then(r => {
      if (r.ok) {
        console.log('✅ Backend reachable:', apiBase);
      } else {
        console.error('❌ Backend returned status:', r.status, apiBase);
      }
    })
    .catch(err => {
      console.error('❌ Backend unreachable:', apiBase, err.message);
    });
}

export const API_BASE = apiBase;

export default API_BASE;
