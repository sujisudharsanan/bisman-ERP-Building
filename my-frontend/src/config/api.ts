// Centralized API base URL for frontend

/**
 * Automatically detects if running on localhost or production.
 * - Production (Vercel): Uses NEXT_PUBLIC_API_URL (e.g., https://bisman-erp-xr6f.onrender.com)
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
    
    // If running on Vercel production domain, use production backend
    if (hostname.includes('vercel.app')) {
      // CRITICAL: Use the correct Render backend URL (rr6f for production)
      const backendUrl = 'https://bisman-erp-rr6f.onrender.com';
      console.log('🌐 Vercel deployment detected, using backend:', backendUrl);
      return backendUrl;
    }
    
    // If on localhost, use local backend
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      console.log('🏠 Localhost detected, using local backend');
      return 'http://localhost:3001';
    }
  }

  // 3. Server-side default (SSR/SSG)
  const defaultUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  console.log('🔄 SSR/SSG fallback, using:', defaultUrl);
  return defaultUrl;
}

const apiBase = getApiBaseUrl();

// Runtime validation and logging
if (typeof window !== 'undefined') {
  const isProd = window.location.hostname.includes('vercel.app');
  if (isProd && !process.env.NEXT_PUBLIC_API_URL) {
    console.warn('⚠️  NEXT_PUBLIC_API_URL not set in Vercel dashboard!');
    console.warn('⚠️  Using hardcoded fallback:', apiBase);
    console.warn('⚠️  Add NEXT_PUBLIC_API_URL=https://bisman-erp-rr6f.onrender.com in Vercel settings');
  } else {
    console.log('✅ API Base URL:', apiBase);
  }
  
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
